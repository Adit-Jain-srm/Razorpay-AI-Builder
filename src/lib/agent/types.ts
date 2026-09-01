import type { ReactNode } from "react";
import type { ZodType } from "zod";

/**
 * Operator agent contracts. Every platform capability is exposed to the agent as
 * a typed `AgentTool` (Zod-validated params + `execute` + optional artifact
 * renderer). Feature teams author tools with `defineTool` (full type safety) and
 * register them on the shared `agentToolRegistry`.
 */

/** Context passed to every tool execution (server-side). */
export interface ToolExecutionContext {
  userId: string;
  conversationId?: string;
  campaignId?: string;
  signal?: AbortSignal;
}

/** A renderable artifact a tool produced (persona, creative set, page, report). */
export interface AgentArtifact<T = unknown> {
  type: string;
  title: string;
  data: T;
}

/** Uniform tool result. `ok: false` carries a structured, recoverable error. */
export interface AgentToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  artifact?: AgentArtifact;
}

/** Authoring shape (fully typed). Pass to `defineTool`. */
export interface AgentToolConfig<TParams, TResult> {
  name: string;
  description: string;
  /** Grouping for the UI + command palette (e.g. "research", "creative"). */
  category?: string;
  parameters: ZodType<TParams>;
  execute: (params: TParams, ctx: ToolExecutionContext) => Promise<AgentToolResult<TResult>>;
  /** Optional custom artifact renderer (returns a React node for the chat). */
  renderArtifact?: (result: AgentToolResult<TResult>) => ReactNode;
}

/** Type-erased tool stored in the registry and handed to the AI SDK. */
export interface AgentTool {
  name: string;
  description: string;
  category?: string;
  parameters: ZodType<unknown>;
  execute: (params: unknown, ctx: ToolExecutionContext) => Promise<AgentToolResult>;
  renderArtifact?: (result: AgentToolResult) => ReactNode;
}

/**
 * Wraps a typed tool config into a registry-safe `AgentTool`. Validates raw
 * arguments against the Zod schema before invoking the typed `execute`, so
 * hallucinated/invalid arguments fail safe with a structured error the agent can
 * recover from.
 */
export function defineTool<TParams, TResult>(config: AgentToolConfig<TParams, TResult>): AgentTool {
  const renderArtifact = config.renderArtifact;
  return {
    name: config.name,
    description: config.description,
    category: config.category,
    parameters: config.parameters as unknown as ZodType<unknown>,
    async execute(rawParams: unknown, ctx: ToolExecutionContext): Promise<AgentToolResult> {
      const parsed = config.parameters.safeParse(rawParams);
      if (!parsed.success) {
        return { ok: false, error: `Invalid arguments for "${config.name}": ${parsed.error.message}` };
      }
      return config.execute(parsed.data, ctx);
    },
    renderArtifact: renderArtifact ? (result) => renderArtifact(result as AgentToolResult<TResult>) : undefined,
  };
}

/** Registry of agent tools. Feature teams import the singleton and register. */
export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Agent tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  registerMany(tools: AgentTool[]): void {
    for (const tool of tools) this.register(tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): AgentTool[] {
    return [...this.tools.values()];
  }

  byCategory(category: string): AgentTool[] {
    return this.list().filter((tool) => tool.category === category);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  clear(): void {
    this.tools.clear();
  }
}

/* -------------------------------------------------------------------------- */
/* Conversation / plan / run shapes (persisted as jsonb)                      */
/* -------------------------------------------------------------------------- */

export type AgentRole = "user" | "assistant" | "system" | "tool";

export interface AgentToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface AgentToolResultRecord {
  id: string;
  name: string;
  result: AgentToolResult;
}

export interface AgentMessage {
  id?: string;
  role: AgentRole;
  content: string;
  toolCalls?: AgentToolCall[];
  toolResults?: AgentToolResultRecord[];
  createdAt?: string;
}

export type PlanStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface AgentPlanStep {
  id: string;
  title: string;
  description?: string;
  /** Tool this step intends to call, if any. */
  tool?: string;
  status: PlanStepStatus;
  result?: AgentToolResult;
}

export interface AgentPlan {
  goal: string;
  steps: AgentPlanStep[];
  createdAt?: string;
}

export type AgentRunStatus = "pending" | "planning" | "executing" | "completed" | "failed" | "cancelled";

export interface AgentRun {
  id?: string;
  conversationId?: string;
  goal: string;
  plan?: AgentPlan;
  status: AgentRunStatus;
  artifacts?: AgentArtifact[];
  createdAt?: string;
  updatedAt?: string;
}
