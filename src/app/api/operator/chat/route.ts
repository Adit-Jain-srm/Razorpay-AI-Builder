import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { toErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  createSupabasePersistence,
  noopPersistence,
  type OperatorPersistence,
} from "@/lib/agent/persistence";
import { registerBuiltinTools } from "@/lib/agent/tools";
import { registerModuleTools } from "@/lib/agent/tools/index";
import { streamOperatorRun, type OperatorRunInput } from "@/lib/agent/runtime";

/**
 * Operator chat endpoint.
 *
 * - `POST` drives the runtime and streams the run back as SSE
 *   (`OperatorEvent`s the UI reduces into a live plan, tool calls, and messages).
 * - `GET`  returns campaign-scoped history (conversation list, or one
 *   conversation's messages) so the Operator has memory across sessions.
 * - `DELETE` removes a conversation and all its messages/runs.
 *
 * Auth is enforced via the Supabase server client when configured. When Supabase
 * is unconfigured the endpoint degrades to an offline demo user (no persistence)
 * so the surface is fully demoable without any credentials.
 *
 * Runs on the Node.js runtime: it uses server-only Azure + Supabase clients.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Ensure the full tool set exists for this server instance (idempotent): the
// dependency-free built-ins plus every module tool (research, campaign, creative,
// landing, analytics) so the Operator can plan + execute a full campaign.
registerBuiltinTools();
registerModuleTools();

const DEMO_USER_ID = "demo-operator";

const messageRoleSchema = z.enum(["user", "assistant", "system", "tool"]);

const postBodySchema = z.object({
  message: z.string().min(1, "Message is required").max(4000),
  conversationId: z.string().min(1).max(100).optional(),
  campaignId: z.string().min(1).max(100).optional(),
  campaignName: z.string().max(200).optional(),
  currentPath: z.string().max(200).optional(),
  history: z
    .array(z.object({ role: messageRoleSchema, content: z.string().max(8000) }))
    .max(50)
    .optional(),
});

export async function POST(req: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = postBodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const auth = await resolveAuth();
  if (!auth.ok) return auth.response;

  const input: OperatorRunInput = {
    message: parsed.data.message,
    conversationId: parsed.data.conversationId,
    campaignId: parsed.data.campaignId,
    campaignName: parsed.data.campaignName,
    currentPath: parsed.data.currentPath,
    history: parsed.data.history,
  };

  const stream = streamOperatorRun(input, { userId: auth.userId, signal: req.signal }, { persistence: auth.persistence });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
      "connection": "keep-alive",
    },
  });
}

export async function GET(req: Request): Promise<Response> {
  const auth = await resolveAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    if (conversationId) {
      const messages = await auth.persistence.listMessages(conversationId);
      return Response.json({ messages });
    }
    const campaignId = url.searchParams.get("campaignId") ?? undefined;
    const conversations = await auth.persistence.listConversations(campaignId);
    return Response.json({ conversations });
  } catch (error) {
    logger.error("operator.route GET failed", error);
    return Response.json({ conversations: [], messages: [] });
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const auth = await resolveAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  if (!conversationId) {
    return jsonError(400, "Missing conversationId parameter");
  }

  try {
    await auth.persistence.deleteConversation(conversationId);
    return Response.json({ ok: true });
  } catch (error) {
    logger.error("operator.route DELETE failed", error);
    return jsonError(500, "Failed to delete conversation");
  }
}

/* -------------------------------------------------------------------------- */

type AuthResult =
  | { ok: true; userId: string; persistence: OperatorPersistence }
  | { ok: false; response: Response };

/**
 * Resolves the caller. When Supabase is configured, a valid session is required
 * (401 otherwise) and writes are persisted. When it is not configured, the route
 * degrades to an unauthenticated demo user with no persistence.
 */
async function resolveAuth(): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, userId: DEMO_USER_ID, persistence: noopPersistence };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, response: jsonError(401, "Sign in to use the Operator.") };
    }

    return { ok: true, userId: user.id, persistence: createSupabasePersistence(supabase, user.id) };
  } catch (error) {
    logger.error("operator.route auth failed", error);
    return { ok: false, response: jsonError(500, toErrorMessage(error)) };
  }
}

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
