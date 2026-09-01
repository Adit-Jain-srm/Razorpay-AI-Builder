import type { ReactNode } from "react";
import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

export interface MetricProps {
  label: string;
  /** HTML title attribute for the label (expands abbreviations for accessibility). */
  labelTitle?: string;
  /** Pre-formatted value (e.g. "$12.4k", "3.2%", "1,204"). Rendered in mono. */
  value: ReactNode;
  /** Signed change. Sign drives the delta color and arrow. */
  delta?: number;
  /** Override the delta text (e.g. "+12.4%"). Defaults to a percentage. */
  deltaLabel?: string;
  /**
   * For metrics where a decrease is good (CPA, CPC, bounce rate), set this so a
   * negative delta renders as success (emerald) and a positive delta as danger.
   */
  invertDelta?: boolean;
  /** Optional leading icon element. */
  icon?: ReactNode;
  hint?: string;
  className?: string;
}

/**
 * Single metric tile. Numerics use mono + tabular figures so columns of metrics
 * align. Delta coloring uses the semantic success/danger tokens.
 */
export function Metric({ label, labelTitle, value, delta, deltaLabel, invertDelta = false, icon, hint, className }: MetricProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const direction = !hasDelta ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const isGood = invertDelta ? direction === "down" : direction === "up";
  const isBad = invertDelta ? direction === "up" : direction === "down";

  const deltaColor = direction === "flat" ? "text-muted-foreground" : isGood ? "text-success" : isBad ? "text-destructive" : "text-muted-foreground";

  const ArrowIcon = direction === "up" ? TrendUp : direction === "down" ? TrendDown : Minus;
  const deltaText = deltaLabel ?? (hasDelta ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%` : null);

  return (
    <div className={cn("card-hover flex flex-col gap-1.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase" title={labelTitle}>{label}</span>
        {icon ? <span className="text-muted-foreground [&_svg]:size-4">{icon}</span> : null}
      </div>
      <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</div>
      <div className="flex items-center gap-1.5">
        {deltaText ? (
          <span className={cn("inline-flex items-center gap-1 font-mono text-xs tabular-nums", deltaColor)}>
            <ArrowIcon className="size-3.5" weight="bold" />
            {deltaText}
          </span>
        ) : null}
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
