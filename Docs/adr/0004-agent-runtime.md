# ADR 0004: Agent Runtime (plan -> execute -> observe loop)

- **Status:** Accepted (implemented in the agent-core phase)
- **Date:** 2026-06-28
- **Deciders:** Foundation build, agent-core phase

## Context

The Operator is the primary product surface. It must decompose a natural-language goal into a
visible plan, execute it by calling real platform capabilities, stream its reasoning, and produce
real artifacts. Two failure modes had to be designed out from the start:

1. **Hallucinated / malformed tool arguments** breaking actions mid-run.
2. **Drift** between what the agent can do and what the manual screens can do.

Two operational realities also had to be respected:

3. The app must **boot and demo without credentials** (Azure may be unset).
4. The runtime must be **testable offline** (no network, deterministic) per the verification strategy.

## Decision

### Capabilities are typed tools (unchanged from the foundation contract)

Every platform capability is an `AgentTool` (`src/lib/agent/types.ts`): a name, description, category,
a **Zod** `parameters` schema, an `execute(params, ctx)` function, and an optional artifact renderer.
Feature teams author tools with `defineTool` and register them on the shared `agentToolRegistry`.
`defineTool` `safeParse`s raw arguments before invoking `execute`, so a hallucinated argument returns
a structured `{ ok: false, error }` the agent can recover from instead of throwing.

### The runtime is a streamed plan -> execute -> observe loop

`src/lib/agent/runtime.ts` implements `runOperator(input, ctx, deps)`, an async generator of typed
`OperatorEvent`s:

1. **Plan.** A dedicated planning pass (Azure GPT-4o via `generateChat`) decomposes the goal into an
   ordered `AgentPlan`; the model output is parsed tolerantly (`parsePlan`: raw JSON, fenced block,
   or embedded object) and validated with Zod. If parsing fails or Azure is unavailable, a
   deterministic `fallbackPlan` is used. The plan is streamed to the UI **before any tool runs** -
   this is the "intelligently planning" perception.
2. **Execute.** The runtime drives Azure GPT-4o tool-calling through the Vercel AI SDK
   (`streamText` + the registry's tools wrapped via `tool()`, multi-step via
   `stopWhen: stepCountIs(n)`). The SDK executes each tool's `execute`; the result (an
   `AgentToolResult`, including any artifact) is the tool output fed back into the model's context.
3. **Observe.** Each streamed part is reconciled to a plan step (`pickPendingStepForTool`; unmatched
   calls append a dynamic step), statuses transition pending -> running -> completed/failed, artifacts
   are collected, and the run ends with a summary + deterministic suggested next actions.

The AI SDK's wire format is adapted into a small internal `ModelStreamPart` union so the loop is
decoupled from the provider and **injectable** for tests.

### Streaming protocol: typed events over NDJSON

The runtime emits a discriminated `OperatorEvent` union (`src/lib/agent/events.ts`):
`run-start | status | plan | step | message | tool-call | tool-result | artifact | suggestions |
notice | run-finish | error`. `streamOperatorRun` serializes these as newline-delimited JSON into a
`ReadableStream`. The client (`useOperator`) decodes incrementally (`decodeEvents`, tolerant of
partial/garbled frames) and reduces them into render state: a transcript where each assistant turn
carries its live plan and tool-call cards, plus suggestion chips and a live/demo badge. Owning the
protocol (instead of the SDK's UI-message format) keeps the client decoupled and fully demoable.

### Graceful degradation (demo mode)

Mode is `live` when Azure is configured, else `demo`. In `demo` mode the runtime returns a **scripted
stream that still executes the real built-in tools**, so the full loop (plan -> tool calls -> real
artifacts -> summary) renders offline, clearly marked "demo" with a hint to set `AZURE_OPENAI_*`.
Nothing crashes when credentials are absent.

### Built-in tools (prove the loop now)

`src/lib/agent/tools.ts` registers three safe, dependency-free tools so the loop works end to end
today: `navigate` (returns a navigation artifact), `list_capabilities` (introspects the registry),
and `summarize_context` (grounds the run in the conversation/campaign). Real module tools (research,
creative, landing, analytics, campaign) are added in the `agent-tools` phase by registering more tools
on the same registry - **the runtime never changes**.

### Module tools (agent-tools / agent-integration phase — realized)

The full capability set now lives in `src/lib/agent/tools/` and is registered idempotently by
`registerModuleTools()` (`tools/index.ts`), which the route bootstraps alongside `registerBuiltinTools()`.
17 typed tools wrap the module services (research, campaign, creative, landing, analytics); each is
Zod-validated and **fail-safe** (every `execute` body runs inside `runToolSafely`, returning a
structured `{ ok: false }` rather than throwing). Tools map their rich domain output to **flat,
render-ready artifact shapes** in the PURE `tools/artifacts.ts`, which the client artifact registry
(`artifact-view.tsx`) renders as per-type cards — keeping the server/client boundary clean. The
system prompt (`OPERATOR_WORKFLOW`) teaches the end-to-end **golden path** (research → campaign →
creatives → landing → analytics), the step budget was raised to 16 to fit the full chain, and a
`proactive_briefing` tool plus `suggestionsFromArtifacts` wire the analytics-driven improvement loop
to one-tap follow-up chips. Two notes were respected, not changed: the runtime, streaming protocol,
and UI registry are unchanged (adding a tool is still local); and the demo divergence of the two
seeded demo-campaign ids (campaign/analytics vs. creative/landing) is documented in `tools/shared.ts`
and surfaced as two fallback constants. Full catalog, workflow, artifact types, and the "add a tool"
guide: **[operator-tools](../operator-tools.md)**.

### Persistence (fail-safe, injectable)

`src/lib/agent/persistence.ts` writes conversations, messages, and runs to
`agent_conversations` / `agent_messages` / `agent_runs` and reads campaign-scoped history back. Every
method is fail-safe (errors are logged, never thrown) so persistence can never break the live stream,
and it is injected behind the `OperatorPersistence` interface (`noopPersistence` offline) so the
runtime is unit-testable. (Note: the foundation types DB rows as `interface`s, which lack an implicit
index signature and so resolve `SupabaseClient<Database>` tables to `never`; persistence re-maps the
table shapes through a homomorphic mapped type purely for querying, with zero runtime effect.)

### Endpoint

`POST /api/operator/chat` validates input with Zod, authenticates via the Supabase server client
(401 when configured but unauthenticated; an offline demo user with no persistence when Supabase is
unset), and streams the run as `application/x-ndjson`. `GET /api/operator/chat` returns campaign-scoped
history (the conversation list, or one conversation's messages) so the agent has memory across
sessions. The endpoint runs on the Node.js runtime (server-only Azure + Supabase clients). _(Route
contracts are consolidated in `Docs/api.md` in a later phase; recorded here per the agent-core scope.)_

### One service layer for agent and cockpit (unchanged)

Tools wrap the same `src/lib/services` / `src/lib/research` functions the manual screens call, so the
agent and the cockpit cannot diverge.

## Consequences

- **Positive:** Zod-validated boundaries make hallucinated arguments a recoverable event. Adding a
  capability = registering a tool; the runtime, streaming protocol, and UI are untouched. Streaming +
  visible plans create the "planning/executing" perception. Demo mode keeps the hero surface fully
  demoable with zero credentials. The injectable model stream + persistence make the loop unit-tested
  offline (`runtime.test.ts`, `tools.test.ts`, `plan.test.ts`, `persistence.test.ts`, `events.test.ts`),
  alongside the foundation's `registry.test.ts`.
- **Negative:** Every capability must be expressed as a tool with a schema + artifact strategy, and
  the streaming tool-call UI is non-trivial. Mitigation: `defineTool` + the registry standardize
  authoring, and the runtime/protocol are covered by tests. A dedicated planning pass adds one extra
  model call per run (in live mode) in exchange for a reliably structured, visible plan.
