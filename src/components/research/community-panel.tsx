"use client";

import { ArrowFatUp, ChatsCircle, Quotes } from "@phosphor-icons/react";

import type { CommunityInsight } from "@/lib/research/standard-models";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

import { Citations } from "./citations";
import { platformLabel } from "./provider-meta";

function sentimentTone(sentiment: number | undefined): { label: string; className: string } {
  if (sentiment === undefined) return { label: "neutral", className: "text-muted-foreground" };
  if (sentiment <= -0.3) return { label: "negative", className: "text-destructive" };
  if (sentiment >= 0.3) return { label: "positive", className: "text-success" };
  return { label: "mixed", className: "text-muted-foreground" };
}

export function CommunityPanel({ insights }: { insights: CommunityInsight[] }) {
  if (insights.length === 0) {
    return (
      <EmptyState
        icon={<ChatsCircle weight="duotone" className="size-5" />}
        title="No community voices yet"
        description="Run the engine to surface what the audience says in their own words."
      />
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, i) => {
        const tone = sentimentTone(insight.sentiment);
        return (
          <article key={i} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-start gap-3">
              <Quotes weight="fill" className="mt-0.5 size-4 shrink-0 text-primary/60" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm text-pretty text-foreground/90">{insight.content}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-mono">{platformLabel(insight.platform)}</Badge>
                  <span className={cn("font-mono text-[10px] uppercase", tone.className)}>{tone.label}</span>
                  {typeof insight.upvotes === "number" ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                      <ArrowFatUp weight="fill" className="size-3" />
                      {insight.upvotes.toLocaleString()}
                    </span>
                  ) : null}
                  {insight.painPointExtracted ? (
                    <span className="font-mono text-[10px] text-muted-foreground">→ {insight.painPointExtracted}</span>
                  ) : null}
                </div>
                <Citations sources={insight.sources} max={2} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
