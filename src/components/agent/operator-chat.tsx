"use client";

import { useEffect, useRef } from "react";
import { Robot, Warning } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { OperatorController } from "./use-operator";
import { MessageBubble } from "./message-bubble";
import { SuggestedActions } from "./suggested-actions";
import { Composer } from "./composer";

const STARTER_PROMPTS = [
  { id: "launch", label: "Launch a campaign", prompt: "Launch a campaign for a retirement income newsletter targeting near-retirees worried about inflation." },
  { id: "angle", label: "Find a fresh angle", prompt: "Find a fresh angle for near-retirees worried about inflation and outline 3 Meta ad concepts." },
  { id: "abilities", label: "What can you do?", prompt: "What can you do right now, and what is coming soon?" },
];

/**
 * The Operator chat surface, driven by a `useOperator` controller. Used full-size
 * on the Operator page and in `compact` mode inside the persistent agent rail.
 */
export function OperatorChat({
  controller,
  variant = "full",
}: {
  controller: OperatorController;
  variant?: "full" | "compact";
}) {
  const compact = variant === "compact";
  const { messages, isStreaming, mode, suggestions, error, send, stop } = controller;

  const bottomRef = useRef<HTMLDivElement>(null);
  const last = messages.at(-1);
  const scrollSignal = `${messages.length}:${last?.content.length ?? 0}:${last?.tools.length ?? 0}`;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [scrollSignal]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className={cn("flex flex-col gap-4", compact ? "p-2.5" : "p-4")}>
          {messages.length === 0 ? (
            <EmptyOperator onPick={send} compact={compact} />
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} compact={compact} />)
          )}

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive">
              <Warning weight="fill" className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className={cn("space-y-2 border-t border-border bg-sidebar/40", compact ? "p-2.5" : "p-3")}>
        {mode === "demo" ? <DemoBanner /> : null}
        {!isStreaming && suggestions.length > 0 ? (
          <SuggestedActions suggestions={suggestions} onPick={send} disabled={isStreaming} />
        ) : null}
        <Composer onSend={send} onStop={stop} isStreaming={isStreaming} compact={compact} />
      </div>
    </div>
  );
}

function EmptyOperator({ onPick, compact }: { onPick: (prompt: string) => void; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 text-center", compact ? "py-8" : "py-14")}>
      <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
        <Robot weight="fill" className="size-5" />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading text-sm font-medium text-foreground">Hire the Operator</h3>
        <p className="mx-auto max-w-xs text-xs text-pretty text-muted-foreground">
          Give it a goal. It plans, runs tools live, cites its sources, and produces real artifacts.
        </p>
      </div>
      <SuggestedActions
        suggestions={STARTER_PROMPTS}
        onPick={onPick}
        className="items-center"
      />
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
      <Warning weight="fill" className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Demo mode - responses are scripted and run the built-in tools only. Set <span className="font-mono">AZURE_OPENAI_*</span>{" "}
        for live reasoning.
      </span>
    </div>
  );
}
