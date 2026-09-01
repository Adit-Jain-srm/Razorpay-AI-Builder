import Link from "next/link";
import {
  ArrowRight,
  Lightning,
  Sparkle,
  Warning,
} from "@phosphor-icons/react/dist/ssr";

import {
  buildRecommendations,
  detectCampaignAnomalies,
  summarize,
  type Recommendation,
} from "@/lib/analytics";
import { DEMO_CAMPAIGN_ID } from "@/lib/seed/constants";
import { analyticsService, creativeService } from "@/lib/services";
import type { CreativeMeta } from "@/lib/analytics";
import { Card } from "@/components/ui/card";

async function buildMeta(rows: { creative_id: string | null }[]): Promise<Map<string, CreativeMeta>> {
  const ids = [...new Set(rows.map((r) => r.creative_id).filter((id): id is string => Boolean(id)))];
  const creatives = await Promise.all(ids.map((id) => creativeService.get(id)));
  return new Map(
    creatives
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => {
        const content = c.content as Record<string, unknown> | null;
        const fields = Array.isArray(content?.fields) ? content.fields as { text?: string }[] : [];
        const label = fields[0]?.text?.slice(0, 30) ?? `${c.platform} ${c.type}`;
        return [c.id, { id: c.id, label, platform: c.platform }];
      }),
  );
}

function ActionChip({ rec }: { rec: Recommendation }) {
  const colors: Record<string, string> = {
    scale: "bg-success/10 text-success",
    pause: "bg-destructive/10 text-destructive",
    refresh: "bg-warning/10 text-warning-foreground dark:text-warning",
    reallocate: "bg-info/10 text-info",
    investigate: "bg-warning/10 text-warning-foreground dark:text-warning",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${colors[rec.type] ?? "bg-muted text-muted-foreground"}`}>
      {rec.title}
      {rec.metricLabel ? <span className="font-mono opacity-70">{rec.metricLabel}</span> : null}
    </span>
  );
}

export async function MorningBrief() {
  const rows = await analyticsService.metrics({ campaignId: DEMO_CAMPAIGN_ID });
  if (rows.length === 0) return null;

  const meta = await buildMeta(rows);
  const anomalies = detectCampaignAnomalies(rows);
  const recommendations = buildRecommendations({ rows, campaignId: DEMO_CAMPAIGN_ID, meta, anomalies });
  const stats = summarize(rows);
  const topRecs = recommendations.slice(0, 3);
  const hasAnomalies = anomalies.length > 0;

  const headline = hasAnomalies
    ? `${anomalies.length} anomal${anomalies.length === 1 ? "y" : "ies"} detected across your campaign.`
    : stats.roas > 2
      ? "Campaign performing above target. Recommendations ready."
      : "Campaign is live with actionable next steps.";

  return (
    <Card className="overflow-hidden ring-1 ring-foreground/10">
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${hasAnomalies ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"}`}>
          {hasAnomalies ? <Warning className="size-4" weight="fill" /> : <Sparkle className="size-4" weight="fill" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Lightning className="size-3.5 text-primary" weight="fill" />
            Morning Brief
          </div>
          <p className="text-xs text-muted-foreground">{headline}</p>
        </div>
        <Link
          href={`/analytics/${DEMO_CAMPAIGN_ID}`}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Full report <ArrowRight className="size-3" />
        </Link>
      </div>
      {topRecs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Next actions</span>
          {topRecs.map((rec) => (
            <ActionChip key={rec.id} rec={rec} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
