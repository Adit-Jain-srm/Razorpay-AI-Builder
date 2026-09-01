"use client";

import {
  Brain,
  Heart,
  Target,
  TrendUp,
  UsersThree,
  Warning,
} from "@phosphor-icons/react";

import type { AudienceSegment } from "@/lib/research/standard-models";
import { Badge } from "@/components/ui/badge";
import { TiltCard } from "@/components/motion";
import { cn } from "@/lib/utils";

import { Citations } from "./citations";
import { platformLabel } from "./provider-meta";

function TagList({ items, tone = "muted" }: { items: string[]; tone?: "muted" | "primary" | "danger" }) {
  if (items.length === 0) return <span className="text-xs text-muted-foreground/60">-</span>;
  const toneClass =
    tone === "primary"
      ? "border-primary/30 bg-primary/10 text-primary"
      : tone === "danger"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border bg-muted/50 text-muted-foreground";
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className={cn("rounded-md border px-1.5 py-0.5 text-xs", toneClass)}>
          {item}
        </span>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="font-mono text-xs text-foreground">{value || "-"}</div>
    </div>
  );
}

export interface PersonaCardProps {
  persona: AudienceSegment;
  className?: string;
}

/** Rich, citation-backed audience persona card. */
export function PersonaCard({ persona, className }: PersonaCardProps) {
  const confidence = persona.sizeEstimate.confidence;

  return (
    <TiltCard className={className} maxTilt={1.5}>
      <article className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 card-hover">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <UsersThree weight="fill" className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-sm font-semibold text-foreground">{persona.name}</h3>
            {persona.sizeEstimate.range ? (
              <p className="font-mono text-xs text-muted-foreground">{persona.sizeEstimate.range}</p>
            ) : null}
          </div>
        </div>
        {typeof confidence === "number" ? (
          <Badge variant="outline" className="shrink-0 font-mono">
            {Math.round(confidence * 100)}% conf
          </Badge>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Age" value={persona.demographics.ageRange} />
        <Field label="Income" value={persona.demographics.incomeBracket} />
        <Field label="Education" value={persona.demographics.education} />
        <Field label="Gender" value={persona.demographics.genderSplit} />
        <Field label="Location" value={persona.demographics.location} />
      </div>

      <div className="grid gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Warning weight="duotone" className="size-3.5 text-destructive" /> Pain points
          </div>
          <TagList items={persona.psychographics.painPoints} tone="danger" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Heart weight="duotone" className="size-3.5 text-primary" /> Values
            </div>
            <TagList items={persona.psychographics.values} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Brain weight="duotone" className="size-3.5 text-primary" /> Interests
            </div>
            <TagList items={persona.psychographics.interests} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Target weight="duotone" className="size-3.5 text-primary" /> Aspirations
          </div>
          <TagList items={persona.psychographics.aspirations} tone="primary" />
        </div>
      </div>

      {persona.behaviors.platforms.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <TrendUp weight="duotone" className="size-3.5 text-primary" /> Where they are
          </div>
          <div className="flex flex-wrap gap-1">
            {persona.behaviors.platforms.map((p, i) => (
              <Badge key={`${p}-${i}`} variant="secondary" className="font-mono">
                {platformLabel(p)}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <footer className="mt-auto border-t border-border pt-3">
        <Citations sources={persona.sources} />
      </footer>
    </article>
    </TiltCard>
  );
}
