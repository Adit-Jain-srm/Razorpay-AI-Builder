import { describe, expect, it } from "vitest";

import { runOperator, streamOperatorRun, type ModelStreamFactory, type ModelStreamPart } from "./runtime";
import { registerBuiltinTools } from "./tools";
import { ToolRegistry, type AgentMessage, type AgentPlan } from "./types";
import { decodeEvents, type OperatorEvent } from "./events";
import type {
  CreateRunInput,
  EnsureConversationInput,
  FinishRunPatch,
  OperatorPersistence,
} from "./persistence";

/* ------------------------------- test doubles ----------------------------- */

interface Recording extends OperatorPersistence {
  ensured: EnsureConversationInput[];
  messages: AgentMessage[];
  createRuns: CreateRunInput[];
  finishRuns: FinishRunPatch[];
}

function recordingPersistence(): Recording {
  const ensured: EnsureConversationInput[] = [];
  const messages: AgentMessage[] = [];
  const createRuns: CreateRunInput[] = [];
  const finishRuns: FinishRunPatch[] = [];
  return {
    ensured,
    messages,
    createRuns,
    finishRuns,
    async ensureConversation(input) {
      ensured.push(input);
      return input.conversationId ?? "conv-rec";
    },
    async saveMessage(_conversationId, message) {
      messages.push(message);
    },
    async createRun(input) {
      createRuns.push(input);
      return "run-rec";
    },
    async finishRun(_runId, patch) {
      finishRuns.push(patch);
    },
    async listConversations() {
      return [];
    },
    async listMessages() {
      return [];
    },
    async deleteConversation() {
      /* no-op */
    },
  };
}

function counter(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

function fromParts(parts: ModelStreamPart[]): ModelStreamFactory {
  return () => ({
    parts: (async function* generate() {
      for (const part of parts) yield part;
    })(),
  });
}

async function collect(generator: AsyncGenerator<OperatorEvent>): Promise<OperatorEvent[]> {
  const events: OperatorEvent[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

function pick<T extends OperatorEvent["type"]>(events: OperatorEvent[], type: T): Extract<OperatorEvent, { type: T }>[] {
  return events.filter((event): event is Extract<OperatorEvent, { type: T }> => event.type === type);
}

function builtinRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registerBuiltinTools(registry);
  return registry;
}

const PROVIDED_PLAN: AgentPlan = {
  goal: "g",
  steps: [
    { id: "step-1", title: "Look", tool: "list_capabilities", status: "pending" },
    { id: "step-2", title: "Wrap", status: "pending" },
  ],
};

/* ---------------------------------- tests --------------------------------- */

describe("runOperator - mocked model stream", () => {
  it("emits plan -> tool calls -> results -> summary and persists the turn", async () => {
    const persistence = recordingPersistence();
    const factory = fromParts([
      { type: "text-delta", text: "Working. " },
      { type: "tool-call", toolCallId: "call-1", toolName: "list_capabilities", input: {} },
      {
        type: "tool-result",
        toolCallId: "call-1",
        toolName: "list_capabilities",
        output: { ok: true, data: { total: 3 }, artifact: { type: "capabilities", title: "x", data: { total: 3, categories: [] } } },
      },
      { type: "text-delta", text: "Done." },
      { type: "finish" },
    ]);

    const events = await collect(
      runOperator(
        { message: "g" },
        { userId: "u" },
        {
          registry: builtinRegistry(),
          persistence,
          generatePlan: async () => PROVIDED_PLAN,
          createModelStream: factory,
          idGen: counter(),
          forceMode: "live",
        },
      ),
    );

    const types = events.map((event) => event.type);

    // First event is run-start, carrying mode + goal.
    expect(events[0]).toMatchObject({ type: "run-start", mode: "live", goal: "g" });

    // Plan is shown before any tool runs; tool result before the run finishes.
    expect(types.indexOf("plan")).toBeGreaterThan(-1);
    expect(types.indexOf("plan")).toBeLessThan(types.indexOf("tool-call"));
    expect(types.indexOf("tool-call")).toBeLessThan(types.indexOf("tool-result"));
    expect(types.indexOf("tool-result")).toBeLessThan(types.indexOf("run-finish"));

    // Exactly one plan with the two provided steps.
    const plans = pick(events, "plan");
    expect(plans).toHaveLength(1);
    expect(plans[0].plan.steps).toHaveLength(2);

    // Tool call is reconciled to the matching plan step.
    const toolCall = pick(events, "tool-call")[0];
    expect(toolCall).toMatchObject({ name: "list_capabilities", stepId: "step-1" });

    // Step transitions running -> completed for step-1.
    const stepStatuses = pick(events, "step").filter((s) => s.stepId === "step-1").map((s) => s.status);
    expect(stepStatuses).toContain("running");
    expect(stepStatuses).toContain("completed");

    // Tool result carries the artifact + ok result.
    const toolResult = pick(events, "tool-result")[0];
    expect(toolResult.result.ok).toBe(true);
    expect(toolResult.result.artifact?.type).toBe("capabilities");

    // Suggestions + a successful finish.
    expect(pick(events, "suggestions")[0].suggestions.length).toBeGreaterThan(0);
    const last = events[events.length - 1];
    expect(last).toMatchObject({ type: "run-finish", status: "completed" });

    // Persistence: user + assistant messages, one run created + finished.
    expect(persistence.messages).toHaveLength(2);
    expect(persistence.messages[0]).toMatchObject({ role: "user", content: "g" });
    expect(persistence.messages[1]).toMatchObject({ role: "assistant", content: "Working. Done." });
    expect(persistence.messages[1].toolCalls).toHaveLength(1);
    expect(persistence.createRuns).toHaveLength(1);
    expect(persistence.finishRuns).toHaveLength(1);
    expect(persistence.finishRuns[0].status).toBe("completed");
  });

  it("surfaces a stream error as a notice and fails the run", async () => {
    const factory = fromParts([
      { type: "error", error: new Error("boom") },
      { type: "finish" },
    ]);
    const persistence = recordingPersistence();

    const events = await collect(
      runOperator(
        { message: "g" },
        { userId: "u" },
        {
          registry: builtinRegistry(),
          persistence,
          generatePlan: async () => PROVIDED_PLAN,
          createModelStream: factory,
          idGen: counter(),
          forceMode: "live",
        },
      ),
    );

    const errorNotices = pick(events, "notice").filter((n) => n.level === "error");
    expect(errorNotices.some((n) => n.message.includes("boom"))).toBe(true);
    expect(events[events.length - 1]).toMatchObject({ type: "run-finish", status: "failed" });
    expect(persistence.finishRuns[0].status).toBe("failed");
  });

  it("reuses a provided conversation id", async () => {
    const persistence = recordingPersistence();
    const events = await collect(
      runOperator(
        { message: "g", conversationId: "existing-conv" },
        { userId: "u" },
        {
          registry: builtinRegistry(),
          persistence,
          generatePlan: async () => PROVIDED_PLAN,
          createModelStream: fromParts([{ type: "text-delta", text: "ok" }, { type: "finish" }]),
          idGen: counter(),
          forceMode: "live",
        },
      ),
    );
    expect(pick(events, "run-start")[0].conversationId).toBe("existing-conv");
  });
});

describe("runOperator - demo mode (offline, real built-in tools)", () => {
  it("runs the built-in tools end to end and warns about demo mode", async () => {
    const persistence = recordingPersistence();
    const events = await collect(
      runOperator(
        { message: "hello" },
        { userId: "u" },
        { registry: builtinRegistry(), persistence, idGen: counter(), forceMode: "demo" },
      ),
    );

    expect(pick(events, "run-start")[0].mode).toBe("demo");

    // Real tool executions produced real artifacts - proves the loop offline.
    const okResults = pick(events, "tool-result").filter((r) => r.result.ok);
    expect(okResults.length).toBeGreaterThanOrEqual(2);
    const artifactTypes = okResults.map((r) => r.result.artifact?.type);
    expect(artifactTypes).toContain("capabilities");
    expect(artifactTypes).toContain("context-summary");

    // Plan was generated (fallback) and wired to the built-in tools.
    const plan = pick(events, "plan")[0].plan;
    expect(plan.steps.some((step) => step.tool === "list_capabilities")).toBe(true);

    // Demo warning + successful finish.
    expect(pick(events, "notice").some((n) => n.level === "warning")).toBe(true);
    expect(events[events.length - 1]).toMatchObject({ type: "run-finish", status: "completed" });
    expect(pick(events, "suggestions")[0].suggestions.length).toBeGreaterThan(0);

    // Assistant turn was persisted with the scripted narration.
    expect(persistence.messages[1].content).toContain("Running list_capabilities");
  });
});

describe("streamOperatorRun - HTTP byte stream", () => {
  it("emits cleanly decodable NDJSON for a full run", async () => {
    const stream = streamOperatorRun(
      { message: "hello" },
      { userId: "u" },
      { registry: builtinRegistry(), idGen: counter(), forceMode: "demo" },
    );

    const text = await readStream(stream);
    const { events, rest } = decodeEvents(text);

    expect(rest).toBe(""); // every event is a complete line
    const types = events.map((event) => event.type);
    expect(types[0]).toBe("run-start");
    expect(types).toContain("plan");
    expect(types).toContain("tool-result");
    expect(types[types.length - 1]).toBe("run-finish");
  });
});

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}
