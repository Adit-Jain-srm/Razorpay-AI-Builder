"use client";

import { useMemo } from "react";
import { ArrowSquareOut, Database } from "@phosphor-icons/react";

import type { SourceCitation } from "@/lib/research/standard-models";
import { EmptyState } from "@/components/ui/states";
import { ScrollArea } from "@/components/ui/scroll-area";

import { getProviderMeta } from "./provider-meta";

/**
 * The Sources panel - the engine's trust surface. Lists every citation behind the
 * report, deduplicated, grouped by provider, with outbound links. Internal
 * snapshot rows are filtered out.
 */
export function SourcesPanel({ sources }: { sources: SourceCitation[] }) {
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    const out: SourceCitation[] = [];
    for (const source of sources) {
      if (source.provider.startsWith("_")) continue;
      const key = source.url ?? source.title ?? `${source.provider}:${source.snippet ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(source);
    }
    return out;
  }, [sources]);

  if (deduped.length === 0) {
    return (
      <EmptyState
        icon={<Database weight="duotone" className="size-5" />}
        title="No sources yet"
        description="Every insight will cite the real page it came from here."
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5 font-heading text-sm font-medium text-foreground">
          <Database weight="duotone" className="size-4 text-primary" />
          Sources
        </div>
        <span className="font-mono text-xs text-muted-foreground">{deduped.length}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ol className="divide-y divide-border">
          {deduped.map((source, i) => {
            const meta = getProviderMeta(source.provider);
            const body = (
              <div className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded bg-muted font-mono text-[10px] text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <meta.icon weight="bold" className="size-3 text-muted-foreground" />
                    <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">{meta.label}</span>
                    {typeof source.confidence === "number" ? (
                      <span className="font-mono text-[10px] text-muted-foreground">· {Math.round(source.confidence * 100)}%</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs font-medium text-foreground">{source.title ?? source.url ?? "Source"}</div>
                  {source.snippet ? <p className="line-clamp-2 text-xs text-muted-foreground">{source.snippet}</p> : null}
                </div>
                {source.url ? <ArrowSquareOut weight="bold" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> : null}
              </div>
            );
            return (
              <li key={`${source.url ?? source.title}-${i}`}>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="block transition-colors hover:bg-muted/40">
                    {body}
                  </a>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
      </ScrollArea>
    </div>
  );
}
