"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";

import type { SourceCitation } from "@/lib/research/standard-models";
import { cn } from "@/lib/utils";

import { getProviderMeta } from "./provider-meta";

export interface CitationsProps {
  sources: SourceCitation[];
  /** Max chips to render before collapsing into a "+N" counter. */
  max?: number;
  className?: string;
  label?: string;
}

/**
 * Inline citation chips. Every research-derived insight renders these so each
 * claim links to the real source it came from (the engine's trust contract).
 */
export function Citations({ sources, max = 4, className, label = "Sources" }: CitationsProps) {
  if (!sources || sources.length === 0) return null;
  const shown = sources.slice(0, max);
  const extra = sources.length - shown.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      {shown.map((source, i) => {
        const meta = getProviderMeta(source.provider);
        const title = source.title ?? source.snippet ?? meta.label;
        const inner = (
          <>
            <meta.icon weight="bold" className="size-2.5" />
            <span className="max-w-32 truncate">{meta.label}</span>
            {source.url ? <ArrowSquareOut weight="bold" className="size-2.5 opacity-60" /> : null}
          </>
        );
        const chipClass =
          "inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors";

        return source.url ? (
          <a
            key={`${source.url}-${i}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
            className={cn(chipClass, "hover:border-primary/40 hover:text-foreground")}
          >
            {inner}
          </a>
        ) : (
          <span key={`${source.provider}-${i}`} title={title} className={chipClass}>
            {inner}
          </span>
        );
      })}
      {extra > 0 ? <span className="font-mono text-[10px] text-muted-foreground">+{extra}</span> : null}
    </div>
  );
}
