"use client";

import {
  ArrowsOutCardinal,
  ChatCenteredText,
  Lightbulb,
  RocketLaunch,
  Target,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import type { Opportunity, OpportunityType } from "@/lib/research/standard-models";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

import { Citations } from "./citations";

const TYPE_META: Record<OpportunityType, { label: string; icon: Icon }> = {
  high_pain_low_competition: { label: "High pain · low competition", icon: Target },
  pre_saturation_trend: { label: "Pre-saturation trend", icon: RocketLaunch },
  messaging_gap: { label: "Messaging gap", icon: ChatCenteredText },
  audience_expansion: { label: "Audience expansion", icon: ArrowsOutCardinal },
};

export function OpportunitiesPanel({ opportunities }: { opportunities: Opportunity[] }) {
  if (opportunities.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb weight="duotone" className="size-5" />}
        title="No opportunities yet"
        description="Run the engine to detect high-value openings the competition is missing."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {opportunities.map((op, i) => {
        const meta = TYPE_META[op.type];
        return (
          <article key={i} className="space-y-2.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <header className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <meta.icon weight="fill" className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-sm font-semibold text-foreground">{op.title}</h3>
                  <Badge variant="outline" className="mt-1 font-mono">{meta.label}</Badge>
                </div>
              </div>
              {typeof op.confidence === "number" ? (
                <Badge variant="secondary" className="shrink-0 font-mono">{Math.round(op.confidence * 100)}%</Badge>
              ) : null}
            </header>
            <p className="text-sm text-pretty text-muted-foreground">{op.rationale}</p>
            <Citations sources={op.sources} max={3} />
          </article>
        );
      })}
    </div>
  );
}
