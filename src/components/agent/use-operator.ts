"use client";

import { useCallback, useRef, useState } from "react";

import {
  decodeEvents,
  type NoticeLevel,
  type OperatorEvent,
  type OperatorMode,
  type SuggestedAction,
} from "@/lib/agent/events";
import type { AgentMessage, AgentPlan, AgentToolResult } from "@/lib/agent/types";

/**
 * Client controller for an Operator conversation. Owns the fetch + SSE stream
 * decode and reduces `OperatorEvent`s into render-ready state: a transcript of
 * messages (each assistant turn carrying its plan + live tool calls), suggested
 * next actions, notices, and the live/demo mode badge.
 */

export interface UiToolEvent {
  callId: string;
  name: string;
  args: unknown;
  stepId?: string;
  status: "running" | "completed" | "failed";
  result?: AgentToolResult;
}

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools: UiToolEvent[];
  /** The plan for this run, attached to the assistant turn. */
  plan?: AgentPlan;
  streaming: boolean;
}

export interface OperatorNotice {
  level: NoticeLevel;
  message: string;
}

export type OperatorStatus = "idle" | "streaming" | "done" | "error";

export interface UseOperatorOptions {
  campaignId?: string;
  campaignName?: string;
  currentPath?: string;
}

export interface OperatorController {
  messages: UiMessage[];
  status: OperatorStatus;
  isStreaming: boolean;
  mode?: OperatorMode;
  suggestions: SuggestedAction[];
  notices: OperatorNotice[];
  error?: string;
  conversationId?: string;
  send: (message: string) => void;
  stop: () => void;
  reset: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
}

const ENDPOINT = "/api/operator/chat";
const MAX_HISTORY = 20;

export function useOperator(options: UseOperatorOptions = {}): OperatorController {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<OperatorStatus>("idle");
  const [mode, setMode] = useState<OperatorMode | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [notices, setNotices] = useState<OperatorNotice[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const conversationRef = useRef<string | undefined>(undefined);

  const patchActive = useCallback((updater: (message: UiMessage) => UiMessage) => {
    const activeId = activeIdRef.current;
    if (!activeId) return;
    setMessages((prev) => prev.map((message) => (message.id === activeId ? updater(message) : message)));
  }, []);

  const reduce = useCallback(
    (event: OperatorEvent) => {
      switch (event.type) {
        case "run-start":
          setMode(event.mode);
          setConversationId(event.conversationId);
          conversationRef.current = event.conversationId;
          break;
        case "plan":
          patchActive((message) => ({ ...message, plan: event.plan }));
          break;
        case "step":
          patchActive((message) =>
            message.plan
              ? {
                  ...message,
                  plan: {
                    ...message.plan,
                    steps: message.plan.steps.map((step) =>
                      step.id === event.stepId ? { ...step, status: event.status } : step,
                    ),
                  },
                }
              : message,
          );
          break;
        case "message":
          patchActive((message) => ({ ...message, content: message.content + event.delta }));
          break;
        case "tool-call":
          patchActive((message) => ({
            ...message,
            tools: [
              ...message.tools,
              { callId: event.callId, name: event.name, args: event.args, stepId: event.stepId, status: "running" },
            ],
          }));
          break;
        case "tool-result":
          patchActive((message) => ({
            ...message,
            tools: message.tools.map((tool) =>
              tool.callId === event.callId
                ? { ...tool, result: event.result, status: event.result.ok ? "completed" : "failed" }
                : tool,
            ),
          }));
          break;
        case "suggestions":
          setSuggestions(event.suggestions);
          break;
        case "notice":
          setNotices((prev) => [...prev, { level: event.level, message: event.message }]);
          break;
        case "run-finish":
          break;
        case "error":
          setError(event.message);
          break;
        default:
          break;
      }
    },
    [patchActive],
  );

  const send = useCallback(
    (raw: string) => {
      const message = raw.trim();
      if (!message || status === "streaming") return;

      const userMessage: UiMessage = { id: localId(), role: "user", content: message, tools: [], streaming: false };
      const assistantMessage: UiMessage = { id: localId(), role: "assistant", content: "", tools: [], streaming: true };
      activeIdRef.current = assistantMessage.id;

      const history = [...messages]
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setStatus("streaming");
      setSuggestions([]);
      setNotices([]);
      setError(undefined);

      const controller = new AbortController();
      abortRef.current = controller;

      void runStream({
        body: {
          message,
          conversationId: conversationRef.current,
          campaignId: options.campaignId,
          campaignName: options.campaignName,
          currentPath: options.currentPath,
          history,
        },
        signal: controller.signal,
        onEvent: reduce,
      })
        .then((outcome) => {
          if (outcome.type === "http-error") {
            setError(outcome.message);
            setStatus("error");
          } else if (outcome.type === "error") {
            // Aborts are intentional, not errors.
            if (!controller.signal.aborted) {
              setError(outcome.message);
              setStatus("error");
            } else {
              setStatus("idle");
            }
          } else {
            setStatus("done");
          }
        })
        .finally(() => {
          patchActive((m) => ({ ...m, streaming: false }));
          abortRef.current = null;
        });
    },
    [messages, options.campaignId, options.campaignName, options.currentPath, reduce, patchActive, status],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    patchActive((m) => ({ ...m, streaming: false }));
    setStatus("idle");
  }, [patchActive]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    activeIdRef.current = null;
    conversationRef.current = undefined;
    setMessages([]);
    setStatus("idle");
    setMode(undefined);
    setSuggestions([]);
    setNotices([]);
    setError(undefined);
    setConversationId(undefined);
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      abortRef.current?.abort();
      abortRef.current = null;
      activeIdRef.current = null;
      setStatus("idle");
      setSuggestions([]);
      setNotices([]);
      setError(undefined);
      setConversationId(id);
      conversationRef.current = id;

      try {
        const res = await fetch(`${ENDPOINT}?conversationId=${encodeURIComponent(id)}`, { method: "GET" });
        if (!res.ok) throw new Error(`History request failed (${res.status})`);
        const data = (await res.json()) as { messages?: AgentMessage[] };
        setMessages((data.messages ?? []).flatMap(toUiMessages));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load conversation");
      }
    },
    [],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`${ENDPOINT}?conversationId=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
      } catch {
        // swallow - UI will refresh via query invalidation
      }
      if (conversationRef.current === id) {
        reset();
      }
    },
    [reset],
  );

  return {
    messages,
    status,
    isStreaming: status === "streaming",
    mode,
    suggestions,
    notices,
    error,
    conversationId,
    send,
    stop,
    reset,
    loadConversation,
    deleteConversation,
  };
}

/* -------------------------------------------------------------------------- */

interface RunStreamArgs {
  body: unknown;
  signal: AbortSignal;
  onEvent: (event: OperatorEvent) => void;
}

type RunOutcome =
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "http-error"; message: string };

async function runStream({ body, signal, onEvent }: RunStreamArgs): Promise<RunOutcome> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok || !res.body) {
      const message = await extractError(res);
      return { type: "http-error", message };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = decodeEvents(buffer);
      buffer = rest;
      for (const event of events) onEvent(event);
    }

    // Flush any trailing buffered event.
    if (buffer.trim()) {
      const tail = decodeEvents(`${buffer}\n\n`);
      for (const event of tail.events) onEvent(event);
    }

    return { type: "done" };
  } catch (cause) {
    return { type: "error", message: cause instanceof Error ? cause.message : "Stream failed" };
  }
}

async function extractError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/** Reconstructs displayable UI messages from a persisted conversation. */
function toUiMessages(message: AgentMessage): UiMessage[] {
  if (message.role !== "user" && message.role !== "assistant") return [];
  const results = message.toolResults ?? [];
  const tools: UiToolEvent[] = (message.toolCalls ?? []).map((call) => {
    const match = results.find((r) => r.id === call.id);
    return {
      callId: call.id,
      name: call.name,
      args: call.args,
      result: match?.result,
      status: match ? (match.result.ok ? "completed" : "failed") : "completed",
    };
  });
  return [
    {
      id: message.id ?? localId(),
      role: message.role,
      content: message.content,
      tools,
      streaming: false,
    },
  ];
}

function localId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
