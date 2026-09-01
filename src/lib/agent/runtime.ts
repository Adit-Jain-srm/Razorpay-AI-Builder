import { stepCountIs, streamText, tool, type ModelMessage, type TextStreamPart, type ToolSet } from "ai";

import { generateChat, getChatModel } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";
import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { encodeEvent, type OperatorEvent, type OperatorMode, type SuggestedAction } from "./events";
import {
  buildPlanningPrompt,
  buildSuggestedActions,
  deriveConversationTitle,
  fallbackPlan,
  parsePlan,
  pickPendingStepForTool,
  PLANNER_SYSTEM_PROMPT,
} from "./plan";
import { noopPersistence, type OperatorPersistence } from "./persistence";
import { buildOperatorSystemPrompt } from "./prompts";
import { agentToolRegistry } from "./registry";
import type {
  AgentArtifact,
  AgentPlan,
  AgentPlanStep,
  AgentRunStatus,
  AgentTool,
  AgentToolCall,
  AgentToolResult,
  AgentToolResultRecord,
  PlanStepStatus,
  ToolExecutionContext,
  ToolRegistry,
} from "./types";

/**
 * The Operator runtime: a plan -> execute -> observe loop.
 *
 * 1. **Plan** - decompose the goal into a visible, ordered plan (a dedicated model
 *    pass in live mode; a deterministic fallback offline).
 * 2. **Execute** - drive Azure GPT-4o tool-calling via the Vercel AI SDK
 *    (`streamText` + the registry's tools, multi-step), streaming reasoning,
 *    tool calls, and tool results as they happen.
 * 3. **Observe** - feed each tool result back into the model's context, reconcile
 *    it to a plan step, collect artifacts, then summarize + suggest next actions.
 *
 * Everything is emitted as a stream of typed `OperatorEvent`s. When Azure is
 * unconfigured the runtime returns a scripted run that still executes the real
 * built-in tools, so the UI is fully demoable offline (clearly marked "demo").
 *
 * The model stream and persistence are injected (`OperatorRuntimeDeps`) so the
 * loop is unit-testable with no network and no database.
 */

/**
 * Step budget for the multi-step tool loop. Sized for the full golden path -
 * research -> personas -> campaign -> creatives -> landing page -> deploy ->
 * analytics + a final summary turn - each tool call consuming a step. Kept
 * generous (vs. the original demo's 6) so a long autonomous chain isn't cut off
 * mid-run; the planner still keeps plans short.
 */
const DEFAULT_MAX_STEPS = 16;

const DEMO_SUMMARY =
  "I drafted a plan and ran the available built-in tools to prove the loop end to end. " +
  "Connect Azure OpenAI (set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY) to unlock live " +
  "reasoning, real audience research, creative generation, and landing pages.";

/* -------------------------------------------------------------------------- */
/* Model-stream abstraction (decouples the loop from the AI SDK wire format)   */
/* -------------------------------------------------------------------------- */

/** The subset of streamed model parts the runtime consumes. */
export type ModelStreamPart =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; input: unknown }
  | { type: "tool-result"; toolCallId: string; toolName: string; output: unknown }
  | { type: "tool-error"; toolCallId: string; toolName: string; error: unknown }
  | { type: "error"; error: unknown }
  | { type: "finish" };

export interface ModelStream {
  parts: AsyncIterable<ModelStreamPart>;
}

export interface ModelStreamArgs {
  system: string;
  messages: ModelMessage[];
  tools: ToolSet;
  maxSteps: number;
  signal?: AbortSignal;
}

export type ModelStreamFactory = (args: ModelStreamArgs) => ModelStream;

/* -------------------------------------------------------------------------- */
/* Public run API                                                             */
/* -------------------------------------------------------------------------- */

export interface OperatorRunInput {
  message: string;
  history?: { role: "user" | "assistant" | "system" | "tool"; content: string }[];
  conversationId?: string;
  campaignId?: string;
  campaignName?: string;
  currentPath?: string;
}

export interface OperatorRunContext {
  userId: string;
  signal?: AbortSignal;
}

export interface OperatorRuntimeDeps {
  registry?: ToolRegistry;
  persistence?: OperatorPersistence;
  /** Override planning (tests / alternate planners). */
  generatePlan?: (goal: string, toolNames: string[], signal?: AbortSignal) => Promise<AgentPlan>;
  /** Override the model stream (tests inject a mocked stream). */
  createModelStream?: ModelStreamFactory;
  /** Deterministic id generator (tests). */
  idGen?: () => string;
  /** Force "live" or "demo" regardless of Azure config (tests). */
  forceMode?: OperatorMode;
  maxSteps?: number;
}

/**
 * Runs the Operator loop, yielding a stream of `OperatorEvent`s. This is the
 * canonical entry point; `streamOperatorRun` wraps it as an HTTP byte stream.
 */
export async function* runOperator(
  input: OperatorRunInput,
  ctx: OperatorRunContext,
  deps: OperatorRuntimeDeps = {},
): AsyncGenerator<OperatorEvent> {
  const registry = deps.registry ?? agentToolRegistry;
  const persistence = deps.persistence ?? noopPersistence;
  const idGen = deps.idGen ?? generateId;
  const maxSteps = deps.maxSteps ?? DEFAULT_MAX_STEPS;
  const mode: OperatorMode = deps.forceMode ?? (isAzureConfigured() ? "live" : "demo");

  const goal = input.message.trim();
  const runId = idGen();

  // --- Setup + persistence (fail-safe) -------------------------------------
  const conversationId = await persistence.ensureConversation({
    conversationId: input.conversationId,
    title: deriveConversationTitle(goal),
    campaignId: input.campaignId,
  });

  yield { type: "run-start", runId, conversationId, goal, mode };
  yield { type: "status", status: "planning" };

  await persistence.saveMessage(conversationId, { role: "user", content: goal });
  const dbRunId = await persistence.createRun({ conversationId, goal });

  // --- Plan ----------------------------------------------------------------
  const toolDefs = registry.list();
  const toolNames = toolDefs.map((t) => t.name);

  let plan: AgentPlan;
  try {
    if (deps.generatePlan) plan = await deps.generatePlan(goal, toolNames, ctx.signal);
    else if (mode === "live") plan = await generatePlanLive(goal, toolDefs, ctx.signal);
    else plan = fallbackPlan(goal, toolNames);
  } catch (error) {
    logger.warn("operator.runtime plan generation failed; using fallback", { error: toErrorMessage(error) });
    plan = fallbackPlan(goal, toolNames);
  }

  // Working copy whose step statuses we mutate + re-emit as the run progresses.
  const steps: AgentPlanStep[] = plan.steps.map((step) => ({ ...step }));
  const workingPlan: AgentPlan = { ...plan, steps };
  yield { type: "plan", plan: workingPlan };
  yield { type: "status", status: "executing" };

  // --- Execute (stream + observe) ------------------------------------------
  const execCtx: ToolExecutionContext = {
    userId: ctx.userId,
    conversationId,
    campaignId: input.campaignId,
    signal: ctx.signal,
  };

  const factory: ModelStreamFactory =
    deps.createModelStream ??
    (mode === "live" ? defaultLiveModelStream : () => createMockModelStream(registry, execCtx, goal, idGen));

  const system = buildSystemPrompt(input, toolDefs, workingPlan);
  const messages = buildModelMessages(input, goal);
  const tools = buildModelTools(toolDefs, execCtx);

  const consumed = new Set<string>();
  const callToStep = new Map<string, string>();
  const toolCalls: AgentToolCall[] = [];
  const toolResults: AgentToolResultRecord[] = [];
  const artifacts: AgentArtifact[] = [];
  let assistantText = "";
  let finalStatus: AgentRunStatus = "completed";

  try {
    const stream = factory({ system, messages, tools, maxSteps, signal: ctx.signal });

    for await (const part of stream.parts) {
      if (ctx.signal?.aborted) {
        finalStatus = "cancelled";
        break;
      }

      switch (part.type) {
        case "text-delta": {
          assistantText += part.text;
          if (part.text) yield { type: "message", delta: part.text };
          break;
        }
        case "tool-call": {
          // Reconcile the streamed call to a plan step; append a dynamic step
          // (and re-emit the plan) if nothing fits.
          let step = pickPendingStepForTool(steps, part.toolName, consumed);
          if (!step) {
            step = { id: `step-${steps.length + 1}`, title: `Run ${part.toolName}`, tool: part.toolName, status: "pending" };
            steps.push(step);
            yield { type: "plan", plan: workingPlan };
          }
          consumed.add(step.id);
          step.status = "running";
          callToStep.set(part.toolCallId, step.id);
          toolCalls.push({ id: part.toolCallId, name: part.toolName, args: part.input });
          yield { type: "tool-call", callId: part.toolCallId, name: part.toolName, args: part.input, stepId: step.id };
          yield { type: "step", stepId: step.id, status: "running" };
          break;
        }
        case "tool-result": {
          const result = coerceToolResult(part.output);
          toolResults.push({ id: part.toolCallId, name: part.toolName, result });
          if (result.artifact) {
            artifacts.push(result.artifact);
            yield { type: "artifact", artifact: result.artifact };
          }
          const stepId = callToStep.get(part.toolCallId);
          if (stepId) {
            const status: PlanStepStatus = result.ok ? "completed" : "failed";
            setStepStatus(stepId, status);
            yield { type: "step", stepId, status };
          }
          yield { type: "tool-result", callId: part.toolCallId, name: part.toolName, result, stepId };
          break;
        }
        case "tool-error": {
          const result: AgentToolResult = { ok: false, error: toErrorMessage(part.error) };
          toolResults.push({ id: part.toolCallId, name: part.toolName, result });
          const stepId = callToStep.get(part.toolCallId);
          if (stepId) {
            setStepStatus(stepId, "failed");
            yield { type: "step", stepId, status: "failed" };
          }
          yield { type: "tool-result", callId: part.toolCallId, name: part.toolName, result, stepId };
          break;
        }
        case "error": {
          finalStatus = "failed";
          yield { type: "notice", level: "error", message: toErrorMessage(part.error) };
          break;
        }
        case "finish":
          break;
      }
    }
  } catch (error) {
    finalStatus = ctx.signal?.aborted ? "cancelled" : "failed";
    logger.error("operator.runtime execution failed", error, { conversationId });
    yield { type: "notice", level: "error", message: toErrorMessage(error) };
  }

  // --- Finalize plan steps + summary ---------------------------------------
  for (const step of steps) {
    if (step.status === "running") {
      step.status = "completed";
      yield { type: "step", stepId: step.id, status: "completed" };
    } else if (step.status === "pending") {
      const status: PlanStepStatus = finalStatus === "completed" ? "completed" : "skipped";
      step.status = status;
      yield { type: "step", stepId: step.id, status };
    }
  }

  if (!assistantText.trim()) {
    assistantText = mode === "demo" ? DEMO_SUMMARY : "Done. Review the steps above and tell me how you'd like to proceed.";
    yield { type: "message", delta: assistantText };
  }

  if (mode === "demo") {
    yield {
      type: "notice",
      level: "warning",
      message: "Demo mode - set AZURE_OPENAI_* to enable live reasoning and tool selection.",
    };
  }

  // Prefer the proactive briefing's own next-actions (the improvement loop's
  // real follow-up prompts) when one was produced; otherwise fall back to the
  // deterministic, tool-aware chips.
  const suggestions = suggestionsFromArtifacts(artifacts) ?? buildSuggestedActions({ goal, toolNames, mode });
  yield { type: "suggestions", suggestions };

  // --- Persist outcome (fail-safe) -----------------------------------------
  await persistence.saveMessage(conversationId, {
    role: "assistant",
    content: assistantText,
    toolCalls: toolCalls.length ? toolCalls : undefined,
    toolResults: toolResults.length ? toolResults : undefined,
  });
  await persistence.finishRun(dbRunId, { status: finalStatus, plan: workingPlan, artifacts });

  yield { type: "run-finish", status: finalStatus };

  /* --- inner helper (closes over the working plan steps) ----------------- */
  function setStepStatus(stepId: string, status: PlanStepStatus): void {
    const step = steps.find((s) => s.id === stepId);
    if (step) step.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/* HTTP byte stream                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Wraps `runOperator` as a UTF-8 SSE `ReadableStream` for a route handler.
 * Errors thrown by the generator are converted into a trailing `error` event so
 * the client always sees a clean end-of-stream. A keepalive comment is emitted
 * every 15 seconds to prevent proxy timeouts.
 */
export function streamOperatorRun(
  input: OperatorRunInput,
  ctx: OperatorRunContext,
  deps: OperatorRuntimeDeps = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const generator = runOperator(input, ctx, deps);
  let eventId = 0;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      keepaliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          // Controller may already be closed
        }
      }, 15_000);

      try {
        for await (const event of generator) {
          controller.enqueue(encoder.encode(encodeEvent(event, eventId++)));
        }
      } catch (error) {
        controller.enqueue(encoder.encode(encodeEvent({ type: "error", message: toErrorMessage(error) }, eventId++)));
      } finally {
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        controller.close();
      }
    },
    async cancel() {
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      await generator.return(undefined);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Default (live) implementations                                            */
/* -------------------------------------------------------------------------- */

const defaultLiveModelStream: ModelStreamFactory = ({ system, messages, tools, maxSteps, signal }) => {
  const result = streamText({
    model: getChatModel(),
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    abortSignal: signal,
    maxRetries: 2,
  });
  return { parts: mapFullStream(result.fullStream) };
};

async function* mapFullStream(stream: AsyncIterable<TextStreamPart<ToolSet>>): AsyncGenerator<ModelStreamPart> {
  for await (const part of stream) {
    switch (part.type) {
      case "text-delta":
        yield { type: "text-delta", text: part.text };
        break;
      case "tool-call":
        yield { type: "tool-call", toolCallId: part.toolCallId, toolName: part.toolName, input: part.input };
        break;
      case "tool-result":
        yield { type: "tool-result", toolCallId: part.toolCallId, toolName: part.toolName, output: part.output };
        break;
      case "tool-error":
        yield { type: "tool-error", toolCallId: part.toolCallId, toolName: part.toolName, error: part.error };
        break;
      case "error":
        yield { type: "error", error: part.error };
        break;
      default:
        break;
    }
  }
}

async function generatePlanLive(goal: string, toolDefs: AgentTool[], signal?: AbortSignal): Promise<AgentPlan> {
  const { text } = await generateChat({
    system: PLANNER_SYSTEM_PROMPT,
    prompt: buildPlanningPrompt(goal, toolDefs.map((t) => ({ name: t.name, description: t.description }))),
    temperature: 0.2,
    maxOutputTokens: 700,
    signal,
  });
  return parsePlan(text, goal) ?? fallbackPlan(goal, toolDefs.map((t) => t.name));
}

/* -------------------------------------------------------------------------- */
/* Default (demo) implementation - scripted, runs real built-in tools         */
/* -------------------------------------------------------------------------- */

function createMockModelStream(
  registry: ToolRegistry,
  ctx: ToolExecutionContext,
  goal: string,
  idGen: () => string,
): ModelStream {
  return { parts: mockParts(registry, ctx, goal, idGen) };
}

async function* mockParts(
  registry: ToolRegistry,
  ctx: ToolExecutionContext,
  goal: string,
  idGen: () => string,
): AsyncGenerator<ModelStreamPart> {
  yield { type: "text-delta", text: "Here is how I'll approach this. " };

  // When the real module tools are registered, the offline demo walks the golden
  // path end to end (research -> creatives -> landing -> analytics), threading the
  // research pain points into creative generation - so the hero feature is fully
  // demoable with zero credentials. Otherwise it runs the dependency-free
  // built-ins to prove the loop.
  if (registry.has("research_audience") && registry.has("generate_creatives")) {
    yield* mockGoldenPath(registry, ctx, goal, idGen);
  } else {
    yield* mockBuiltins(registry, ctx, goal, idGen);
  }

  yield { type: "text-delta", text: DEMO_SUMMARY };
  yield { type: "finish" };
}

/** Runs one tool, streaming its narration + call + result, and returns the output. */
async function* execMockTool(
  registry: ToolRegistry,
  ctx: ToolExecutionContext,
  name: string,
  input: unknown,
  idGen: () => string,
): AsyncGenerator<ModelStreamPart, AgentToolResult | undefined> {
  const def = registry.get(name);
  if (!def) return undefined;

  const toolCallId = idGen();
  yield { type: "text-delta", text: `Running ${name}. ` };
  yield { type: "tool-call", toolCallId, toolName: name, input };

  let output: AgentToolResult;
  try {
    output = await def.execute(input, ctx);
  } catch (error) {
    output = { ok: false, error: toErrorMessage(error) };
  }
  yield { type: "tool-result", toolCallId, toolName: name, output };
  return output;
}

/** The dependency-free built-in script (no module tools registered). */
async function* mockBuiltins(
  registry: ToolRegistry,
  ctx: ToolExecutionContext,
  goal: string,
  idGen: () => string,
): AsyncGenerator<ModelStreamPart> {
  const script: { name: string; input: unknown }[] = [
    { name: "list_capabilities", input: {} },
    { name: "summarize_context", input: { focus: goal } },
  ];
  for (const { name, input } of script) {
    if (ctx.signal?.aborted) break;
    yield* execMockTool(registry, ctx, name, input, idGen);
  }
}

/** Scripted golden-path run that executes the real module tools offline. */
async function* mockGoldenPath(
  registry: ToolRegistry,
  ctx: ToolExecutionContext,
  goal: string,
  idGen: () => string,
): AsyncGenerator<ModelStreamPart> {
  const research = yield* execMockTool(registry, ctx, "research_audience", { query: goal }, idGen);
  if (ctx.signal?.aborted) return;

  const painPoints = extractDemoPainPoints(research);
  yield* execMockTool(registry, ctx, "generate_creatives", { platform: "meta", painPoints, count: 3 }, idGen);
  if (ctx.signal?.aborted) return;

  if (registry.has("build_landing_page")) {
    yield* execMockTool(registry, ctx, "build_landing_page", { template: "squeeze", angle: "inflation protection" }, idGen);
    if (ctx.signal?.aborted) return;
  }
  if (registry.has("get_performance_summary")) {
    yield* execMockTool(registry, ctx, "get_performance_summary", {}, idGen);
  }
}

/** Pulls pain-point summaries out of a research_audience result (best-effort). */
function extractDemoPainPoints(result: AgentToolResult | undefined): string[] {
  const data = result?.ok ? (result.data as { painPoints?: { summary?: string }[] } | undefined) : undefined;
  if (!data?.painPoints) return [];
  return data.painPoints
    .map((point) => point.summary)
    .filter((summary): summary is string => Boolean(summary))
    .slice(0, 4);
}

/* -------------------------------------------------------------------------- */
/* Shared builders                                                            */
/* -------------------------------------------------------------------------- */

function buildModelTools(defs: AgentTool[], ctx: ToolExecutionContext): ToolSet {
  const tools: ToolSet = {};
  for (const def of defs) {
    tools[def.name] = tool({
      description: def.description,
      inputSchema: def.parameters,
      execute: async (input: unknown): Promise<AgentToolResult> => {
        try {
          return await def.execute(input, ctx);
        } catch (error) {
          return { ok: false, error: toErrorMessage(error) };
        }
      },
    });
  }
  return tools;
}

function buildModelMessages(input: OperatorRunInput, goal: string): ModelMessage[] {
  const messages: ModelMessage[] = [];
  for (const message of input.history ?? []) {
    if (message.role === "user") messages.push({ role: "user", content: message.content });
    else if (message.role === "assistant") messages.push({ role: "assistant", content: message.content });
    else if (message.role === "system") messages.push({ role: "system", content: message.content });
  }
  messages.push({ role: "user", content: goal });
  return messages;
}

function buildSystemPrompt(input: OperatorRunInput, toolDefs: AgentTool[], plan: AgentPlan): string {
  const planText = plan.steps.map((step, index) => `${index + 1}. ${step.title}${step.tool ? ` (tool: ${step.tool})` : ""}`).join("\n");
  const extraContext = [
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    "",
    "Follow this plan unless the user changes course:",
    planText,
    "",
    "Only call tools that are actually registered. If a capability you need is not yet a tool, say so plainly and proceed with what you can. Keep responses tight and skimmable.",
  ].join("\n");

  return buildOperatorSystemPrompt({
    tools: toolDefs.map((t) => ({ name: t.name, description: t.description })),
    campaignName: input.campaignName,
    currentPath: input.currentPath,
    extraContext,
  });
}

/**
 * Derives suggestion chips from produced artifacts. A `proactive_briefing`
 * artifact carries `nextActions` (real follow-up prompts that drive the
 * improvement loop, e.g. regenerate the weakest creative), so we surface those
 * as the run's chips. Returns `null` when no artifact supplies actions.
 */
function suggestionsFromArtifacts(artifacts: AgentArtifact[]): SuggestedAction[] | null {
  for (const artifact of artifacts) {
    if (artifact.type !== "proactive-briefing") continue;
    const data = artifact.data as { nextActions?: unknown };
    const actions = data?.nextActions;
    if (Array.isArray(actions) && actions.length > 0) {
      const valid = actions.filter(
        (action): action is SuggestedAction =>
          Boolean(action) &&
          typeof (action as SuggestedAction).id === "string" &&
          typeof (action as SuggestedAction).label === "string" &&
          typeof (action as SuggestedAction).prompt === "string",
      );
      if (valid.length > 0) return valid.slice(0, 4);
    }
  }
  return null;
}

/** Accepts whatever a tool returned and normalizes it to an `AgentToolResult`. */
function coerceToolResult(output: unknown): AgentToolResult {
  if (output && typeof output === "object" && "ok" in output && typeof (output as { ok: unknown }).ok === "boolean") {
    return output as AgentToolResult;
  }
  return { ok: true, data: output };
}

function generateId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
