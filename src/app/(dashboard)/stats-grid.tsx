"use client";

import { CountUp, Stagger, StaggerItem } from "@/components/motion";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

interface StatsGridProps {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

export function StatsGrid({ impressions, clicks, conversions, spend }: StatsGridProps) {
  const cells: { label: string; value: number; prefix?: string; format: (n: number) => string }[] = [
    { label: "Impressions", value: impressions, format: formatNumber },
    { label: "Clicks", value: clicks, format: formatNumber },
    { label: "Conversions", value: conversions, format: formatNumber },
    { label: "Spend", value: spend, prefix: "$", format: formatNumber },
  ];

  return (
    <Stagger className="grid grid-cols-2 gap-px bg-border/30 sm:grid-cols-4" stagger={0.06}>
      {cells.map((cell) => (
        <StaggerItem key={cell.label} className="bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{cell.label}</p>
          <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">
            {cell.prefix}
            <CountUp value={cell.value} format={cell.format} />
          </p>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
