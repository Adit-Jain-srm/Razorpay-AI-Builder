import { describe, expect, it } from "vitest";

import {
  createSupabasePersistence,
  noopPersistence,
  type OperatorDbClient,
} from "./persistence";
import type { AgentMessage } from "./types";

/**
 * Minimal fake of the supabase query builder: every method is chainable and the
 * builder is awaitable (PromiseLike) to a preconfigured `result`. Records calls
 * for assertions. Cast to `OperatorDbClient` at the boundary - production code
 * stays strictly typed.
 */
interface RecordedCall {
  method: string;
  args: unknown[];
}

class FakeBuilder {
  readonly calls: RecordedCall[] = [];
  constructor(private readonly result: unknown) {}

  private rec(method: string, args: unknown[]): this {
    this.calls.push({ method, args });
    return this;
  }

  insert(...args: unknown[]): this {
    return this.rec("insert", args);
  }
  update(...args: unknown[]): this {
    return this.rec("update", args);
  }
  select(...args: unknown[]): this {
    return this.rec("select", args);
  }
  eq(...args: unknown[]): this {
    return this.rec("eq", args);
  }
  order(...args: unknown[]): this {
    return this.rec("order", args);
  }
  limit(...args: unknown[]): this {
    return this.rec("limit", args);
  }
  single(): this {
    return this.rec("single", []);
  }
  then<TResult>(onFulfilled: (value: unknown) => TResult): TResult {
    return onFulfilled(this.result);
  }

  find(method: string): RecordedCall | undefined {
    return this.calls.find((call) => call.method === method);
  }
}

class FakeClient {
  readonly builders: FakeBuilder[] = [];
  constructor(private readonly resultFor: (table: string) => unknown) {}

  from(table: string): FakeBuilder {
    const builder = new FakeBuilder(this.resultFor(table));
    this.builders.push(builder);
    return builder;
  }
}

function asClient(fake: FakeClient): OperatorDbClient {
  return fake as unknown as OperatorDbClient;
}

describe("createSupabasePersistence", () => {
  it("reuses an existing conversation id without a DB call", async () => {
    const fake = new FakeClient(() => ({ data: null, error: null }));
    const persistence = createSupabasePersistence(asClient(fake), "user-1");

    const id = await persistence.ensureConversation({ conversationId: "existing", title: "t" });
    expect(id).toBe("existing");
    expect(fake.builders).toHaveLength(0);
  });

  it("creates a new conversation and returns its id", async () => {
    const fake = new FakeClient(() => ({ data: { id: "conv-1" }, error: null }));
    const persistence = createSupabasePersistence(asClient(fake), "user-1");

    const id = await persistence.ensureConversation({ title: "Retirement", campaignId: "camp-9" });
    expect(id).toBe("conv-1");

    const insert = fake.builders[0].find("insert");
    expect(insert?.args[0]).toMatchObject({ user_id: "user-1", title: "Retirement", campaign_id: "camp-9" });
  });

  it("persists a message with mapped, JSON-safe tool data", async () => {
    const fake = new FakeClient(() => ({ error: null }));
    const persistence = createSupabasePersistence(asClient(fake), "user-1");

    const message: AgentMessage = {
      role: "assistant",
      content: "done",
      toolCalls: [{ id: "c1", name: "navigate", args: { route: "/research" } }],
      toolResults: [{ id: "c1", name: "navigate", result: { ok: true, data: { href: "/research" } } }],
    };
    await persistence.saveMessage("conv-1", message);

    const insert = fake.builders[0].find("insert");
    expect(insert?.args[0]).toMatchObject({
      conversation_id: "conv-1",
      user_id: "user-1",
      role: "assistant",
      content: "done",
    });
    const row = insert?.args[0] as { tool_calls: unknown };
    expect(row.tool_calls).toEqual([{ id: "c1", name: "navigate", args: { route: "/research" } }]);
  });

  it("never throws when the DB returns an error", async () => {
    const fake = new FakeClient(() => ({ error: { message: "boom" } }));
    const persistence = createSupabasePersistence(asClient(fake), "user-1");
    await expect(persistence.saveMessage("conv-1", { role: "user", content: "hi" })).resolves.toBeUndefined();
  });

  it("never throws when the client itself throws", async () => {
    const throwing = { from() { throw new Error("db down"); } } as unknown as OperatorDbClient;
    const persistence = createSupabasePersistence(throwing, "user-1");
    await expect(persistence.saveMessage("conv-1", { role: "user", content: "hi" })).resolves.toBeUndefined();
  });

  it("creates and finishes a run", async () => {
    const fake = new FakeClient(() => ({ data: { id: "run-1" }, error: null }));
    const persistence = createSupabasePersistence(asClient(fake), "user-1");

    const runId = await persistence.createRun({ conversationId: "conv-1", goal: "g" });
    expect(runId).toBe("run-1");

    await persistence.finishRun(runId, {
      status: "completed",
      plan: { goal: "g", steps: [] },
      artifacts: [],
    });

    const updateBuilder = fake.builders[1];
    expect(updateBuilder.find("update")?.args[0]).toMatchObject({ status: "completed" });
    expect(updateBuilder.find("eq")?.args).toEqual(["id", "run-1"]);
  });

  it("returns null from createRun on error and no-ops finishRun(null)", async () => {
    const fake = new FakeClient(() => ({ data: null, error: { message: "nope" } }));
    const persistence = createSupabasePersistence(asClient(fake), "user-1");

    expect(await persistence.createRun({ conversationId: "c", goal: "g" })).toBeNull();
    await persistence.finishRun(null, { status: "failed", plan: { goal: "g", steps: [] }, artifacts: [] });
    // finishRun(null) must not issue an update.
    expect(fake.builders).toHaveLength(1);
  });

  it("lists conversations mapped to summaries", async () => {
    const fake = new FakeClient(() => ({
      data: [
        { id: "c1", title: "First", campaign_id: null, status: "active", created_at: "2026-01-01", updated_at: "2026-01-02" },
      ],
      error: null,
    }));
    const persistence = createSupabasePersistence(asClient(fake), "user-1");

    const conversations = await persistence.listConversations();
    expect(conversations).toEqual([
      { id: "c1", title: "First", campaignId: null, status: "active", createdAt: "2026-01-01", updatedAt: "2026-01-02" },
    ]);
  });

  it("lists messages mapped to AgentMessages", async () => {
    const fake = new FakeClient(() => ({
      data: [
        { id: "m1", role: "user", content: "hi", tool_calls: null, tool_results: null, created_at: "2026-01-01" },
      ],
      error: null,
    }));
    const persistence = createSupabasePersistence(asClient(fake), "user-1");

    const messages = await persistence.listMessages("conv-1");
    expect(messages).toEqual([
      { id: "m1", role: "user", content: "hi", toolCalls: undefined, toolResults: undefined, createdAt: "2026-01-01" },
    ]);
  });
});

describe("noopPersistence", () => {
  it("returns safe defaults and never persists", async () => {
    expect(await noopPersistence.ensureConversation({ conversationId: "x", title: "t" })).toBe("x");
    expect(await noopPersistence.ensureConversation({ title: "t" })).toEqual(expect.any(String));
    expect(await noopPersistence.createRun({ conversationId: "c", goal: "g" })).toBeNull();
    expect(await noopPersistence.listConversations()).toEqual([]);
    expect(await noopPersistence.listMessages("c")).toEqual([]);
    await expect(noopPersistence.saveMessage("c", { role: "user", content: "hi" })).resolves.toBeUndefined();
  });
});
