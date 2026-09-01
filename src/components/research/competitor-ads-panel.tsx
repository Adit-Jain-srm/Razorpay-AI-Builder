"use client";

import { CurrencyDollar, Megaphone } from "@phosphor-icons/react";

import type { CompetitorAd } from "@/lib/research/standard-models";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

import { Citations } from "./citations";
import { platformLabel } from "./provider-meta";

const HOOK_TONES: Record<string, string> = {
  fear: "border-destructive/30 bg-destructive/10 text-destructive",
  urgency: "border-warning/30 bg-warning/10 text-warning",
  greed: "border-warning/30 bg-warning/10 text-warning",
  curiosity: "border-info/30 bg-info/10 text-info",
  fomo: "border-info/30 bg-info/10 text-info",
  trust: "border-primary/30 bg-primary/10 text-primary",
  authority: "border-primary/30 bg-primary/10 text-primary",
  social_proof: "border-primary/30 bg-primary/10 text-primary",
};

function HookBadge({ hook }: { hook: string }) {
  return (
    <span className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[10px]", HOOK_TONES[hook] ?? "border-border bg-muted/50 text-muted-foreground")}>
      {hook.replace(/_/g, " ")}
    </span>
  );
}

export function CompetitorAdsPanel({ ads }: { ads: CompetitorAd[] }) {
  if (ads.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone weight="duotone" className="size-5" />}
        title="No competitor ads yet"
        description="Run the engine to pull active competitor creatives and the hooks they lean on."
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {ads.map((ad, i) => (
        <article key={i} className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <header className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-heading text-sm font-medium text-foreground">{ad.advertiser ?? "Unknown advertiser"}</div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge variant="secondary" className="font-mono">{platformLabel(ad.platform)}</Badge>
                {ad.creativeType ? <Badge variant="outline" className="font-mono">{ad.creativeType.replace(/_/g, " ")}</Badge> : null}
              </div>
            </div>
            {ad.estimatedSpend ? (
              <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground">
                <CurrencyDollar weight="bold" className="size-3.5" />
                {ad.estimatedSpend}
              </span>
            ) : null}
          </header>

          {ad.copy ? <p className="text-sm text-pretty text-foreground/90">{ad.copy}</p> : null}

          {ad.hooksUsed.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {ad.hooksUsed.map((hook, hi) => (
                <HookBadge key={`${hook}-${hi}`} hook={hook} />
              ))}
            </div>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            {ad.dateRange ? <span className="font-mono text-[10px] text-muted-foreground">{ad.dateRange}</span> : <span />}
            <Citations sources={ad.sources} max={2} />
          </div>
        </article>
      ))}
    </div>
  );
}
