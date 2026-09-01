import Link from "next/link";
import { ArrowRight, ChartLineUp } from "@phosphor-icons/react/dist/ssr";

import {
  formatCompact,
  formatCurrency,
  formatMultiplier,
  type MetricSummary,
} from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { AnalyticsMetricsGrid } from "./analytics-metrics-grid";

export interface CampaignAnalyticsRow {
  id: string;
  name: string;
  status: string;
  summary: MetricSummary;
  hasData: boolean;
}

interface AnalyticsOverviewProps {
  portfolio: MetricSummary;
  campaigns: CampaignAnalyticsRow[];
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-success/15 text-success",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

/** Portfolio-level analytics overview: blended metrics + a per-campaign table. */
export function AnalyticsOverview({ portfolio, campaigns }: AnalyticsOverviewProps) {
  const withData = campaigns.filter((c) => c.hasData);

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={<ChartLineUp weight="duotone" className="size-5" />}
        title="No campaigns yet"
        description="Create a campaign and seed analytics to see cross-platform performance, anomalies, and an AI daily brief here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <AnalyticsMetricsGrid
        spend={portfolio.spend}
        conversions={portfolio.conversions}
        cpa={portfolio.cpa}
        roas={portfolio.roas}
      />

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2.5 font-medium">Campaign</th>
              <th className="px-3 py-2.5 text-right font-medium">Spend</th>
              <th className="px-3 py-2.5 text-right font-medium">Conv.</th>
              <th className="px-3 py-2.5 text-right font-medium">CPA</th>
              <th className="px-3 py-2.5 text-right font-medium">ROAS</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="group transition-colors hover:bg-card/60">
                <td className="px-4 py-3">
                  <Link href={`/analytics/${campaign.id}`} className="flex items-center gap-2 font-medium text-foreground">
                    {campaign.name}
                    <Badge className={cn("font-mono text-[10px] uppercase", STATUS_STYLE[campaign.status] ?? STATUS_STYLE.draft)}>
                      {campaign.status}
                    </Badge>
                  </Link>
                </td>
                {campaign.hasData ? (
                  <>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">{formatCurrency(campaign.summary.spend)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">{formatCompact(campaign.summary.conversions)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">{formatCurrency(campaign.summary.cpa)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">{formatMultiplier(campaign.summary.roas)}</td>
                  </>
                ) : (
                  <td colSpan={4} className="px-3 py-3 text-right text-xs text-muted-foreground">
                    No performance data yet
                  </td>
                )}
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/analytics/${campaign.id}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground"
                  >
                    Open
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {withData.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No metrics yet. Open a campaign to view its (auto-seeded) demo analytics, or run the seeder against your data.
        </p>
      ) : null}
    </div>
  );
}
