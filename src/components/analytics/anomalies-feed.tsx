import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

import { formatDateLabel, platformLabel } from "@/lib/analytics";
import type { AnomalySeverity } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { Stagger, StaggerItem } from "@/components/motion";

import { SeverityBadge } from "./shared";

export interface AnomalyView {
  id: string;
  /** Raw metric key, optionally platform-scoped (e.g. "cpa:taboola"). */
  metric: string;
  severity: AnomalySeverity;
  description: string | null;
  detectedAt: string;
  resolvedAt: string | null;
}

function metricTitle(metric: string): string {
  const [key, platform] = metric.split(":");
  const base = key.toUpperCase();
  return platform ? `${base} · ${platformLabel(platform)}` : base;
}

interface AnomaliesFeedProps {
  anomalies: readonly AnomalyView[];
}

/** Anomaly feed - z-score detections sorted by severity/recency. */
export function AnomaliesFeed({ anomalies }: AnomaliesFeedProps) {
  if (anomalies.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/30 px-4 py-6 text-sm text-muted-foreground">
        <CheckCircle weight="duotone" className="size-4 text-success" />
        No anomalies detected; delivery is within normal variance.
      </div>
    );
  }
  return (
    <Stagger className="space-y-2" stagger={0.04}>
      {anomalies.map((anomaly) => (
        <StaggerItem key={anomaly.id}>
          <li
            className={cn(
              "space-y-1 rounded-lg bg-card p-3 ring-1 ring-foreground/10",
              anomaly.resolvedAt ? "opacity-60" : null,
            )}
          >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-medium text-foreground">{metricTitle(anomaly.metric)}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">{formatDateLabel(anomaly.detectedAt)}</span>
              <SeverityBadge severity={anomaly.severity} />
            </div>
          </div>
          {anomaly.description ? <p className="text-xs text-pretty text-muted-foreground">{anomaly.description}</p> : null}
          {anomaly.resolvedAt ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-success">
              <CheckCircle weight="fill" className="size-3" /> Resolved
            </span>
          ) : null}
        </li>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
