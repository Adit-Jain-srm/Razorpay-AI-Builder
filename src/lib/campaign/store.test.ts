import { describe, expect, it } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Campaign, CampaignInsert, Database } from "@/types/database";

import {
  DEMO_CAMPAIGN_ID,
  InMemoryCampaignStore,
  SupabaseCampaignStore,
  getCampaignStore,
} from "./store";

/* -------------------------------------------------------------------------- */
/* Minimal chainable Supabase fake (mirrors agent/persistence.test pattern)    */
/* -------------------------------------------------------------------------- */

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

  insert(...a: unknown[]): this {
    return this.rec("insert", a);
  }
  update(...a: unknown[]): this {
    return this.rec("update", a);
  }
  delete(...a: unknown[]): this {
    return this.rec("delete", a);
  }
  select(...a: unknown[]): this {
    return this.rec("select", a);
  }
  eq(...a: unknown[]): this {
    return this.rec("eq", a);
  }
  order(...a: unknown[]): this {
    return this.rec("order", a);
  }
  single(): this {
    return this.rec("single", []);
  }
  maybeSingle(): this {
    return this.rec("maybeSingle", []);
  }
  then<T>(onFulfilled: (value: unknown) => T): T {
    return onFulfilled(this.result);
  }
  find(method: string): RecordedCall | undefined {
    return this.calls.find((c) => c.method === method);
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

function asClient(fake: FakeClient): SupabaseClient<Database> {
  return fake as unknown as SupabaseClient<Database>;
}

function sampleRow(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "c1",
    user_id: "user-7",
    name: "Test",
    status: "draft",
    brief: {},
    platform_config: {},
    budget: {},
    persona_ids: [],
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

const insert: CampaignInsert = { user_id: "ignored-by-store", name: "New campaign" };

/* -------------------------------------------------------------------------- */
/* In-memory store                                                            */
/* -------------------------------------------------------------------------- */

describe("InMemoryCampaignStore", () => {
  it("seeds the demo campaign and resolves it by id", async () => {
    const store = new InMemoryCampaignStore();
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(DEMO_CAMPAIGN_ID);
    expect(await store.get(DEMO_CAMPAIGN_ID)).not.toBeNull();
  });

  it("can be constructed without the demo seed", async () => {
    const store = new InMemoryCampaignStore(false);
    expect(await store.list()).toEqual([]);
  });

  it("creates, updates, sets status, and removes", async () => {
    const store = new InMemoryCampaignStore(false);

    const created = await store.create({ user_id: "x", name: "Launch", status: "draft" });
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Launch");
    expect(created.status).toBe("draft");

    const updated = await store.update(created.id, { name: "Launch v2" });
    expect(updated.name).toBe("Launch v2");
    expect(updated.id).toBe(created.id);

    const archived = await store.setStatus(created.id, "archived");
    expect(archived.status).toBe("archived");

    await store.remove(created.id);
    expect(await store.get(created.id)).toBeNull();
  });

  it("throws when updating a missing campaign", async () => {
    const store = new InMemoryCampaignStore(false);
    await expect(store.update("nope", { name: "x" })).rejects.toThrow(/not found/i);
  });
});

/* -------------------------------------------------------------------------- */
/* Supabase store                                                             */
/* -------------------------------------------------------------------------- */

describe("SupabaseCampaignStore", () => {
  it("inserts with the session user_id (never the caller's)", async () => {
    const fake = new FakeClient(() => ({ data: sampleRow({ name: "New campaign" }), error: null }));
    const store = new SupabaseCampaignStore(asClient(fake), "user-7");

    const created = await store.create(insert);
    expect(created.name).toBe("New campaign");

    const args = fake.builders[0].find("insert")?.args[0] as Record<string, unknown>;
    expect(args.user_id).toBe("user-7");
    expect(args.user_id).not.toBe("ignored-by-store");
    expect(args.name).toBe("New campaign");
    expect(args.status).toBe("draft");
  });

  it("lists rows ordered by updated_at desc", async () => {
    const fake = new FakeClient(() => ({ data: [sampleRow(), sampleRow({ id: "c2" })], error: null }));
    const store = new SupabaseCampaignStore(asClient(fake), "user-7");

    const rows = await store.list();
    expect(rows).toHaveLength(2);
    expect(fake.builders[0].find("order")?.args).toEqual(["updated_at", { ascending: false }]);
  });

  it("returns [] from list on a DB error (resilient read)", async () => {
    const fake = new FakeClient(() => ({ data: null, error: { message: "boom" } }));
    const store = new SupabaseCampaignStore(asClient(fake), "user-7");
    expect(await store.list()).toEqual([]);
  });

  it("gets a single row by id", async () => {
    const fake = new FakeClient(() => ({ data: sampleRow(), error: null }));
    const store = new SupabaseCampaignStore(asClient(fake), "user-7");

    const row = await store.get("c1");
    expect(row?.id).toBe("c1");
    expect(fake.builders[0].find("eq")?.args).toEqual(["id", "c1"]);
    expect(fake.builders[0].find("maybeSingle")).toBeDefined();
  });

  it("setStatus updates status without leaking user_id/id and stamps updated_at", async () => {
    const fake = new FakeClient(() => ({ data: sampleRow({ status: "archived" }), error: null }));
    const store = new SupabaseCampaignStore(asClient(fake), "user-7");

    const row = await store.setStatus("c1", "archived");
    expect(row.status).toBe("archived");

    const args = fake.builders[0].find("update")?.args[0] as Record<string, unknown>;
    expect(args.status).toBe("archived");
    expect(args).not.toHaveProperty("user_id");
    expect(args).not.toHaveProperty("id");
    expect(args.updated_at).toEqual(expect.any(String));
    expect(fake.builders[0].find("eq")?.args).toEqual(["id", "c1"]);
  });

  it("throws a typed error when create fails", async () => {
    const fake = new FakeClient(() => ({ data: null, error: { message: "rls denied" } }));
    const store = new SupabaseCampaignStore(asClient(fake), "user-7");
    await expect(store.create(insert)).rejects.toThrow(/create campaign/i);
  });

  it("deletes by id and throws on error", async () => {
    const ok = new FakeClient(() => ({ error: null }));
    const okStore = new SupabaseCampaignStore(asClient(ok), "user-7");
    await expect(okStore.remove("c1")).resolves.toBeUndefined();
    expect(ok.builders[0].find("delete")).toBeDefined();
    expect(ok.builders[0].find("eq")?.args).toEqual(["id", "c1"]);

    const fail = new FakeClient(() => ({ error: { message: "nope" } }));
    const failStore = new SupabaseCampaignStore(asClient(fail), "user-7");
    await expect(failStore.remove("c1")).rejects.toThrow(/delete campaign/i);
  });
});

/* -------------------------------------------------------------------------- */
/* Store resolution                                                           */
/* -------------------------------------------------------------------------- */

describe("getCampaignStore", () => {
  it("falls back to the in-memory demo store when Supabase is unconfigured", async () => {
    // Default test env has no Supabase credentials -> in-memory store.
    const store = await getCampaignStore();
    const list = await store.list();
    expect(list.some((c) => c.id === DEMO_CAMPAIGN_ID)).toBe(true);
  });
});
