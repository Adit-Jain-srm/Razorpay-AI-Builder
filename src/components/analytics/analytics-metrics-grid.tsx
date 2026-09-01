"use client";

import { ChartLineUp, CurrencyDollar, Receipt, Target } from "@phosphor-icons/react";

import { formatCompact, formatCurrency, formatMultiplier } from "@/lib/analytics";
import { Metric } from "@/components/ui/states";
import { Stagger, StaggerItem } from "@/components/motion";

interface AnalyticsMetricsGridProps {
  spend: number;
  conversions: number;
  cpa: number;
  roas: number;
}

export function AnalyticsMetricsGrid({ spend, conversions, cpa, roas }: AnalyticsMetricsGridProps) {
  return (
    <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4" stagger={0.06}>
      <StaggerItem>
        <Metric label="Spend (all campaigns)" value={formatCurrency(spend)} icon={<CurrencyDollar weight="duotone" />} />
      </StaggerItem>
      <StaggerItem>
        <Metric label="Conversions" value={formatCompact(conversions)} icon={<Target weight="duotone" />} />
      </StaggerItem>
      <StaggerItem>
        <Metric label="Blended CPA" value={formatCurrency(cpa)} icon={<Receipt weight="duotone" />} />
      </StaggerItem>
      <StaggerItem>
        <Metric label="Blended ROAS" value={formatMultiplier(roas)} icon={<ChartLineUp weight="duotone" />} />
      </StaggerItem>
    </Stagger>
  );
}
