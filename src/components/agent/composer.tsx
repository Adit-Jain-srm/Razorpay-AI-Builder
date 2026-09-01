"use client";

import { useState, type KeyboardEvent } from "react";
import { PaperPlaneTilt, Stop } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * The Operator composer. Enter sends, Shift+Enter inserts a newline. While the
 * agent is streaming, the send button becomes a stop control.
 */
export function Composer({
  onSend,
  onStop,
  isStreaming,
  placeholder = "Give the Operator a goal…",
  compact,
}: {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const message = value.trim();
    if (!message || isStreaming) return;
    onSend(message);
    setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        aria-label="Message the Operator"
        className={cn("resize-none pr-12", compact ? "min-h-[2.75rem] text-sm" : "min-h-[3.5rem]")}
      />
      <div className="absolute right-2 bottom-2">
        {isStreaming ? (
          <Button type="button" size="icon-sm" variant="outline" aria-label="Stop the Operator" onClick={onStop}>
            <Stop weight="fill" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon-sm"
            aria-label="Send message"
            disabled={!value.trim()}
            onClick={submit}
          >
            <PaperPlaneTilt weight="fill" />
          </Button>
        )}
      </div>
    </div>
  );
}
