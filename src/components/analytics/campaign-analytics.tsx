"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  ChartBar,
  ChartLineUp,
  Funnel as FunnelIcon,
  ImagesSquare,
  Lightbulb,
  Warning,
} from "@phosphor-icons/react/dist/ssr";

import {
  dailySeries,
  funnel,
  metricLabel,
  periodDeltas,
  platformLabel,
  summarize,
  summarizeByCreative,
  summarizeByPlatform,
  trendlineSeries,
  type CreativeMeta,
  type DailyBriefResult,
  type MetricKey,
  type Recommendation,
} from "@/lib/analytics";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import type { PerformanceMetricRow } from "@/types/database";

import type { AnomalyView } from "./anomalies-feed";
import { AnomaliesFeed } from "./anomalies-feed";
import { CreativeCorrelation } from "./creative-correlation";
import { DailyBriefPanel } from "./daily-brief-panel";
import { ExportButton } from "./export-button";
import { FunnelChart } from "./funnel-chart";
import { MetricCards } from "./metric-cards";
import { PlatformComparison } from "./platform-comparison";
import { RecommendationsPanel } from "./recommendations-panel";
import { SectionLabel } from "./shared";
import { TimeSeriesChart } from "./time-series-chart";

export interface CampaignAnalyticsProps {
  campaignName: string;
  rows: PerformanceMetricRow[];
  creativeMeta: CreativeMeta[];
  anomalies: AnomalyView[];
  recommendations: Recommendation[];
  brief: DailyBriefResult;
  rangeDays: number;
}

const TIME_SERIES_METRICS: MetricKey[] = ["spend", "cpa", "ctr", "cvr", "roas", "conversions"];

function Panel({ title, icon, action, children }: { title: string; icon: Icon; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <SectionLabel icon={icon} action={action}>
        {title}
      </SectionLabel>
      {children}
    </section>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: Array<{ value: T; label: ReactNode }>; value: T; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-[3px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium transition-colors",
            value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Client orchestrator for the campaign deep-dive. Receives the full (serializable)
 * dataset + server-computed intelligence and derives the filtered views with pure
 * functions, so the platform filter and metric selector stay instant and offline.
 */
export function CampaignAnalytics({ campaignName, rows, creativeMeta, anomalies, recommendations, brief, rangeDays }: CampaignAnalyticsProps) {
  const [platform, setPlatform] = useState<string>("all");
  const [metric, setMetric] = useState<MetricKey>("spend");

  const platforms = useMemo(() => [...new Set(rows.map((r) => r.platform))].sort(), [rows]);
  const filteredRows = useMemo(() => (platform === "all" ? rows : rows.filter((r) => r.platform === platform)), [rows, platform]);

  const summary = useMemo(() => summarize(filteredRows), [filteredRows]);
  const deltas = useMemo(() => periodDeltas(filteredRows, 7), [filteredRows]);
  const series = useMemo(() => dailySeries(filteredRows, metric), [filteredRows, metric]);
  const trend = useMemo(() => trendlineSeries(series), [series]);
  const metaMap = useMemo(() => new Map(creativeMeta.map((m) => [m.id, m])), [creativeMeta]);
  const creatives = useMemo(() => summarizeByCreative(filteredRows, metaMap), [filteredRows, metaMap]);
  const platformSummaries = useMemo(() => summarizeByPlatform(rows), [rows]);
  const funnelStages = useMemo(() => funnel(filteredRows), [filteredRows]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ChartLineUp weight="duotone" className="size-5" />}
        title="No performance data yet"
        description="This campaign has no metrics. Run the analytics seeder or connect a live ad platform to populate the dashboard."
      />
    );
  }

  const platformOptions = [{ value: "all", label: "All platforms" }, ...platforms.map((p) => ({ value: p, label: platformLabel(p) }))];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented options={platformOptions} value={platform} onChange={setPlatform} />
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">Last {rangeDays} days</span>
        </div>
        <ExportButton rows={filteredRows} filename={`${campaignName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-analytics.csv`} />
      </div>

      <MetricCards summary={summary} deltas={deltas} />

      <DailyBriefPanel brief={brief} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Panel
            title="Performance over time"
            icon={ChartLineUp}
            action={
              <Segmented
                options={TIME_SERIES_METRICS.map((m) => ({ value: m, label: metricLabel(m) }))}
                value={metric}
                onChange={setMetric}
              />
            }
          >
            <TimeSeriesChart series={series} trend={trend} metric={metric} />
          </Panel>

          <Panel title="Platform comparison" icon={ChartBar}>
            <PlatformComparison platforms={platformSummaries} />
          </Panel>

          <Panel title="Creative performance" icon={ImagesSquare}>
            <CreativeCorrelation creatives={creatives} />
          </Panel>
        </div>

        <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <Panel title="Conversion funnel" icon={FunnelIcon}>
            <FunnelChart stages={funnelStages} />
          </Panel>
          <Panel title="Anomalies" icon={Warning}>
            <AnomaliesFeed anomalies={anomalies} />
          </Panel>
          <Panel title="Recommendations" icon={Lightbulb}>
            <RecommendationsPanel recommendations={recommendations} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
