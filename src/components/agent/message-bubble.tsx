"use client";

import { Robot, User } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { SlideUp } from "@/components/motion";

import type { UiMessage } from "./use-operator";
import { PlanPanel } from "./plan-panel";
import { ToolCallCard } from "./tool-call-card";
import { TypingDots } from "./typing-dots";

/**
 * One conversation turn. Assistant turns carry the run's plan, streamed
 * narration, and the live tool-call cards; user turns are a simple prompt.
 */
export function MessageBubble({ message, compact }: { message: UiMessage; compact?: boolean }) {
  const isAssistant = message.role === "assistant";

  return (
    <SlideUp
      className="flex gap-2.5"
      y={12}
      duration={0.2}
    >
      <Avatar role={message.role} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {isAssistant ? "Operator" : "You"}
        </div>

        {isAssistant && message.plan ? <PlanPanel plan={message.plan} /> : null}

        {message.content ? (
          <div className="text-sm leading-relaxed text-pretty whitespace-pre-wrap text-foreground/90">
            {message.content}
            {message.streaming ? <Caret /> : null}
          </div>
        ) : isAssistant && message.streaming && message.tools.length === 0 ? (
          <div className="flex items-center gap-1 text-muted-foreground" aria-label="Operator is thinking">
            <TypingDots />
          </div>
        ) : null}

        {message.tools.length > 0 ? (
          <div className={cn("space-y-1.5", compact && "space-y-1")}>{message.tools.map((tool) => <ToolCallCard key={tool.callId} tool={tool} />)}</div>
        ) : null}
      </div>
    </SlideUp>
  );
}

function Avatar({ role }: { role: UiMessage["role"] }) {
  const isAssistant = role === "assistant";
  return (
    <div
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-md [&_svg]:size-3.5",
        isAssistant ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {isAssistant ? <Robot weight="fill" /> : <User weight="fill" />}
    </div>
  );
}

function Caret() {
  return <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 shimmer bg-primary/70 align-baseline" aria-hidden />;
}
