import {
  ChartLineUp,
  CursorClick,
  CurrencyDollar,
  Funnel,
  Receipt,
  Target,
} from "@phosphor-icons/react/dist/ssr";

import {
  formatChangePct,
  formatCompact,
  formatCurrency,
  formatMultiplier,
  formatPercent,
  type MetricSummary,
  type SummaryDeltas,
} from "@/lib/analytics";
import { Metric } from "@/components/ui/states";
import { CountUp } from "@/components/motion";

interface MetricCardsProps {
  summary: MetricSummary;
  deltas: SummaryDeltas;
}

/** Headline metric cards with period-over-period deltas (mono, semantic colors). */
export function MetricCards({ summary, deltas }: MetricCardsProps) {
  const change = (key: keyof SummaryDeltas): number | undefined => {
    const pct = deltas[key]?.changePct;
    return pct === null || pct === undefined ? undefined : pct;
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <Metric label="Spend" value={<CountUp value={summary.spend} format={formatCurrency} />} delta={change("spend")} deltaLabel={formatChangePct(deltas.spend.changePct)} icon={<CurrencyDollar weight="duotone" />} />
      <Metric label="Conversions" value={<CountUp value={summary.conversions} format={formatCompact} />} delta={change("conversions")} deltaLabel={formatChangePct(deltas.conversions.changePct)} icon={<Target weight="duotone" />} />
      <Metric label="CPA" labelTitle="Cost per Acquisition" value={<CountUp value={summary.cpa} format={formatCurrency} />} delta={change("cpa")} deltaLabel={formatChangePct(deltas.cpa.changePct)} invertDelta icon={<Receipt weight="duotone" />} />
      <Metric label="CTR" labelTitle="Click-through Rate" value={<CountUp value={summary.ctr} format={formatPercent} />} delta={change("ctr")} deltaLabel={formatChangePct(deltas.ctr.changePct)} icon={<CursorClick weight="duotone" />} />
      <Metric label="CVR" labelTitle="Conversion Rate" value={<CountUp value={summary.cvr} format={formatPercent} />} delta={change("cvr")} deltaLabel={formatChangePct(deltas.cvr.changePct)} icon={<Funnel weight="duotone" />} />
      <Metric label="ROAS" labelTitle="Return on Ad Spend" value={<CountUp value={summary.roas} format={formatMultiplier} />} delta={change("roas")} deltaLabel={formatChangePct(deltas.roas.changePct)} icon={<ChartLineUp weight="duotone" />} />
    </div>
  );
}
