"use client";

import { Lightning, Warning } from "@phosphor-icons/react";

import type { BuyingTrigger, PainPoint } from "@/lib/research/standard-models";
import { EmptyState } from "@/components/ui/states";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { cn } from "@/lib/utils";

import { Citations } from "./citations";

function Meter({ label, value }: { label: string; value: number | undefined }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] tracking-wide text-muted-foreground uppercase">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{pct}</span>
    </div>
  );
}

export function PainPointsPanel({ painPoints }: { painPoints: PainPoint[] }) {
  if (painPoints.length === 0) {
    return (
      <EmptyState
        icon={<Warning weight="duotone" className="size-5" />}
        title="No pain points yet"
        description="Run the engine to extract and rank the audience's strongest pain points."
      />
    );
  }

  return (
    <Stagger className="space-y-3" stagger={0.04}>
      {painPoints.map((pain, i) => (
        <StaggerItem key={i}>
          <article className="space-y-2.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-start gap-2.5">
              <div className="grid size-6 shrink-0 place-items-center rounded-md bg-destructive/10 font-mono text-xs text-destructive">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{pain.summary}</p>
              {pain.quote ? <p className="mt-1 text-xs text-pretty text-muted-foreground italic">“{pain.quote}”</p> : null}
            </div>
          </div>
          <div className="grid gap-1.5 pl-8">
            <Meter label="Intensity" value={pain.intensity} />
            <Meter label="Frequency" value={pain.frequency} />
          </div>
          <div className="pl-8">
            <Citations sources={pain.sources} max={3} />
          </div>
          </article>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

const URGENCY_TONE: Record<string, string> = {
  high: "border-destructive/30 bg-destructive/10 text-destructive",
  medium: "border-warning/30 bg-warning/10 text-warning",
  low: "border-border bg-muted/50 text-muted-foreground",
};

export function BuyingTriggersPanel({ triggers }: { triggers: BuyingTrigger[] }) {
  if (triggers.length === 0) {
    return (
      <FadeIn>
        <EmptyState
          icon={<Lightning weight="duotone" className="size-5" />}
          title="No buying triggers yet"
          description="Run the engine to detect the moments that push this audience to act."
        />
      </FadeIn>
    );
  }

  return (
    <div className="space-y-2.5">
      {triggers.map((trigger, i) => (
        <article key={i} className="flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <Lightning weight="fill" className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{trigger.trigger}</p>
              {trigger.urgency ? (
                <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase", URGENCY_TONE[trigger.urgency])}>
                  {trigger.urgency}
                </span>
              ) : null}
            </div>
            {trigger.context ? <p className="text-xs text-pretty text-muted-foreground">{trigger.context}</p> : null}
            <Citations sources={trigger.sources} max={2} />
          </div>
        </article>
      ))}
    </div>
  );
}
