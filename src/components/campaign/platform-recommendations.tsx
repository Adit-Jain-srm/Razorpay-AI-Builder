"use client";

import { Check, Sparkle } from "@phosphor-icons/react";

import type { PlatformRecommendation } from "@/lib/campaign/brief";
import { platformLabel } from "@/lib/campaign/brief";
import { AD_PLATFORMS, type AdPlatform } from "@/lib/research/standard-models";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

import { FitBar, PlatformGlyph } from "./shared";

export interface PlatformRecommendationsProps {
  recommendations: PlatformRecommendation[];
  selected: AdPlatform[];
  onToggle: (platform: AdPlatform) => void;
  onRecommend?: () => void;
  recommending?: boolean;
}

/**
 * The platform recommendation engine surface: every channel ranked by a 0-100
 * fit score with reasoning, and a one-click toggle to include it in the campaign.
 */
export function PlatformRecommendations({
  recommendations,
  selected,
  onToggle,
  onRecommend,
  recommending,
}: PlatformRecommendationsProps) {
  const byPlatform = new Map(recommendations.map((rec) => [rec.platform, rec]));
  const selectedSet = new Set(selected);

  const rows = AD_PLATFORMS.map((platform) => ({
    platform,
    rec: byPlatform.get(platform),
    fit: byPlatform.get(platform)?.fit ?? 0,
  })).sort((a, b) => b.fit - a.fit);

  return (
    <div className="space-y-3">
      {onRecommend ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onRecommend} disabled={recommending}>
            <Sparkle weight="fill" className={cn(recommending && "shimmer")} />
            {recommending ? "Analyzing…" : "AI recommend channels"}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-2.5">
        {rows.map(({ platform, rec, fit }, index) => {
          const isSelected = selectedSet.has(platform);
          return (
            <FadeIn key={platform} delay={index * 0.03}>
              <button
                type="button"
                onClick={() => onToggle(platform)}
                aria-pressed={isSelected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left ring-1 transition-all hover:bg-card/70 hover:scale-[1.005] motion-reduce:hover:scale-100",
                  isSelected ? "ring-primary/50" : "ring-foreground/10",
                )}
              >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  isSelected ? "bg-primary/15" : "bg-muted/60",
                )}
              >
                <PlatformGlyph platform={platform} className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-sm font-medium text-foreground">{platformLabel(platform)}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{fit} fit</span>
                </div>
                <FitBar value={fit} label={`${fit}`} />
                {rec?.rationale ? (
                  <p className="line-clamp-2 text-xs text-pretty text-muted-foreground">{rec.rationale}</p>
                ) : null}
              </div>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
                )}
              >
                <Check weight="bold" className="size-3" />
              </span>
            </button>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
