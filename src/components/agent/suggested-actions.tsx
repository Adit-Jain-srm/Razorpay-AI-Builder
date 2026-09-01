"use client";

import { ArrowRight, Lightning } from "@phosphor-icons/react";

import type { SuggestedAction } from "@/lib/agent/events";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion";

/** Suggested next-action chips. Clicking one dispatches its prompt to the Operator. */
export function SuggestedActions({
  suggestions,
  onPick,
  disabled,
  className,
}: {
  suggestions: SuggestedAction[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (suggestions.length === 0) return null;

  return (
    <FadeIn className={cn("space-y-1.5", className)} y={6}>
      <div className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <Lightning weight="fill" className="size-3 text-primary" />
        Suggested next
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(suggestion.prompt)}
            title={suggestion.prompt}
            className="group inline-flex items-center gap-1 rounded-full border border-border bg-card/50 px-2.5 py-1 text-xs text-foreground/90 transition-all hover:scale-[1.02] hover:border-primary/40 hover:bg-primary/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 motion-reduce:hover:scale-100"
          >
            {suggestion.label}
            <ArrowRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>
    </FadeIn>
  );
}
