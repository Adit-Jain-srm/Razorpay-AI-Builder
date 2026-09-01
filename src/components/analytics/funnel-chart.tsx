import { ArrowDown } from "@phosphor-icons/react/dist/ssr";

import { formatCompact, formatPercent, type FunnelStage } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface FunnelChartProps {
  stages: readonly FunnelStage[];
}

const BAR_TINT = ["bg-[var(--chart-1)]", "bg-[var(--chart-1)]/85", "bg-[var(--chart-1)]/70", "bg-[var(--chart-1)]/55", "bg-[var(--chart-1)]/40"];

/**
 * Conversion funnel (Impression → Click → LP View → Lead → Conversion). Bar width
 * is proportional to each stage's share of impressions; the chips show the
 * step-over-step conversion rate. Pure markup (no client state).
 */
export function FunnelChart({ stages }: FunnelChartProps) {
  if (stages.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const width = Math.max(stage.overallRate * 100, 3);
        return (
          <div key={stage.stage}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-foreground">{stage.stage}</span>
              <span className="flex items-center gap-2 font-mono tabular-nums text-muted-foreground">
                {stage.stepRate !== null ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px]">
                    <ArrowDown className="size-2.5" weight="bold" />
                    {formatPercent(stage.stepRate, 1)}
                  </span>
                ) : null}
                <span className="text-foreground">{formatCompact(stage.value)}</span>
              </span>
            </div>
            <div className="mt-1 h-7 w-full overflow-hidden rounded-md bg-muted/40">
              <div
                className={cn("flex h-full items-center rounded-md transition-[width] duration-700 ease-out motion-reduce:transition-none", BAR_TINT[i] ?? BAR_TINT[BAR_TINT.length - 1])}
                style={{ width: `${width}%` }}
              >
                <span className="px-2 font-mono text-[10px] tabular-nums text-primary-foreground/90">{formatPercent(stage.overallRate, 1)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
