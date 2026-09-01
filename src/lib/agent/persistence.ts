import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import { toErrorMessage } from "@/lib/errors";
import type { Database, Json } from "@/types/database";

import type {
  AgentArtifact,
  AgentMessage,
  AgentPlan,
  AgentRunStatus,
  AgentRole,
  AgentToolCall,
  AgentToolResultRecord,
} from "./types";

/**
 * Operator persistence: writes conversations, messages, and runs to Supabase and
 * reads campaign-scoped history back.
 *
 * Two design rules:
 * 1. **Fail-safe.** Every method swallows DB errors (logged) and returns a safe
 *    fallback. Persistence must never break the live agent stream or a demo.
 * 2. **Injectable.** The runtime depends on the `OperatorPersistence` interface,
 *    not on Supabase directly, so it can be tested with a fake and degrades to
 *    `noopPersistence` when Supabase is unconfigured.
 */

/** The client type callers pass in (the foundation's `createClient()` result). */
export type OperatorDbClient = SupabaseClient<Database>;

export interface AgentConversationSummary {
  id: string;
  title: string;
  campaignId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnsureConversationInput {
  /** Reuse an existing conversation if provided; otherwise a new one is created. */
  conversationId?: string;
  title: string;
  campaignId?: string;
}

export interface CreateRunInput {
  conversationId: string;
  goal: string;
}

export interface FinishRunPatch {
  status: AgentRunStatus;
  plan: AgentPlan;
  artifacts: AgentArtifact[];
}

export interface OperatorPersistence {
  ensureConversation(input: EnsureConversationInput): Promise<string>;
  saveMessage(conversationId: string, message: AgentMessage): Promise<void>;
  createRun(input: CreateRunInput): Promise<string | null>;
  finishRun(runId: string | null, patch: FinishRunPatch): Promise<void>;
  listConversations(campaignId?: string): Promise<AgentConversationSummary[]>;
  listMessages(conversationId: string): Promise<AgentMessage[]>;
  deleteConversation(conversationId: string): Promise<void>;
}

/** Supabase-backed implementation, scoped to a single authenticated user (RLS still applies). */
export function createSupabasePersistence(client: OperatorDbClient, userId: string): OperatorPersistence {
  const db = client;
  return {
    async ensureConversation({ conversationId, title, campaignId }) {
      if (conversationId) return conversationId;
      try {
        const { data, error } = await db.from("agent_conversations")
          .insert({ user_id: userId, title, campaign_id: campaignId ?? null, status: "active" })
          .select("id")
          .single();
        if (error || !data) throw error ?? new Error("No conversation id returned");
        return data.id;
      } catch (error) {
        logger.error("operator.persistence ensureConversation failed", error);
        return generateId();
      }
    },

    async saveMessage(conversationId, message) {
      try {
        const { error } = await db.from("agent_messages").insert({
          conversation_id: conversationId,
          user_id: userId,
          role: message.role,
          content: message.content,
          tool_calls: message.toolCalls ? toJson(message.toolCalls) : null,
          tool_results: message.toolResults ? toJson(message.toolResults) : null,
        });
        if (error) throw error;
      } catch (error) {
        logger.error("operator.persistence saveMessage failed", error, { conversationId, role: message.role });
      }
    },

    async createRun({ conversationId, goal }) {
      try {
        const { data, error } = await db.from("agent_runs")
          .insert({ conversation_id: conversationId, user_id: userId, goal, status: "planning" })
          .select("id")
          .single();
        if (error || !data) throw error ?? new Error("No run id returned");
        return data.id;
      } catch (error) {
        logger.error("operator.persistence createRun failed", error, { conversationId });
        return null;
      }
    },

    async finishRun(runId, patch) {
      if (!runId) return;
      try {
        const { error } = await db.from("agent_runs")
          .update({
            status: patch.status,
            plan: toJson(patch.plan),
            artifacts: toJson(patch.artifacts),
            updated_at: new Date().toISOString(),
          })
          .eq("id", runId);
        if (error) throw error;
      } catch (error) {
        logger.error("operator.persistence finishRun failed", error, { runId });
      }
    },

    async listConversations(campaignId) {
      try {
        let query = db
          .from("agent_conversations")
          .select("id, title, campaign_id, status, created_at, updated_at")
          .order("updated_at", { ascending: false })
          .limit(50);
        if (campaignId) query = query.eq("campaign_id", campaignId);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          campaignId: row.campaign_id,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      } catch (error) {
        logger.error("operator.persistence listConversations failed", error);
        return [];
      }
    },

    async listMessages(conversationId) {
      try {
        const { data, error } = await db.from("agent_messages")
          .select("id, role, content, tool_calls, tool_results, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data ?? []).map((row) => ({
          id: row.id,
          role: row.role as AgentRole,
          content: row.content,
          toolCalls: (row.tool_calls as unknown as AgentToolCall[] | null) ?? undefined,
          toolResults: (row.tool_results as unknown as AgentToolResultRecord[] | null) ?? undefined,
          createdAt: row.created_at,
        }));
      } catch (error) {
        logger.error("operator.persistence listMessages failed", error, { conversationId });
        return [];
      }
    },

    async deleteConversation(conversationId) {
      try {
        await db.from("agent_messages").delete().eq("conversation_id", conversationId);
        await db.from("agent_runs").delete().eq("conversation_id", conversationId);
        await db.from("agent_conversations").delete().eq("id", conversationId).eq("user_id", userId);
      } catch (error) {
        logger.error("operator.persistence deleteConversation failed", error, { conversationId });
      }
    },
  };
}

/** No-op persistence used offline / when Supabase is unconfigured. Keeps the runtime identical. */
export const noopPersistence: OperatorPersistence = {
  async ensureConversation({ conversationId }) {
    return conversationId ?? generateId();
  },
  async saveMessage() {
    /* no-op */
  },
  async createRun() {
    return null;
  },
  async finishRun() {
    /* no-op */
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

/** JSON-clones a value into a `Json`-safe shape; returns null if it cannot serialize. */
function toJson(value: unknown): Json {
  try {
    return JSON.parse(JSON.stringify(value ?? null)) as Json;
  } catch (error) {
    logger.warn("operator.persistence toJson failed", { error: toErrorMessage(error) });
    return null;
  }
}

function generateId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
