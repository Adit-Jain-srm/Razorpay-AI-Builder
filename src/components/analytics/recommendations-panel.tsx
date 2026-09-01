import { Lightbulb } from "@phosphor-icons/react/dist/ssr";

import type { Recommendation } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";

import { PriorityBadge, RecommendationIcon } from "./shared";

interface RecommendationsPanelProps {
  recommendations: readonly Recommendation[];
}

/** Recommendation engine output - actionable next steps tied to real ids. */
export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  if (recommendations.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/30 px-4 py-6 text-sm text-muted-foreground">
        <Lightbulb weight="duotone" className="size-4" />
        No actions needed - performance is steady across creatives.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {recommendations.map((rec) => (
        <li key={rec.id} className="space-y-1.5 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                <RecommendationIcon type={rec.type} className="size-3.5" />
              </span>
              <span className="text-sm font-medium text-pretty text-foreground">{rec.title}</span>
            </div>
            <PriorityBadge priority={rec.priority} />
          </div>
          <p className="pl-8 text-xs text-pretty text-muted-foreground">{rec.rationale}</p>
          {rec.metricLabel ? (
            <div className="pl-8">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {rec.metricLabel}
              </Badge>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
