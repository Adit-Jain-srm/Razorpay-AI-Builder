"use client";

import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";

import {
  formatCurrency,
  formatMultiplier,
  formatPercent,
  platformLabel,
  type PlatformSummary,
} from "@/lib/analytics";

import { AXIS_LINE, AXIS_TICK, ChartFrame, ChartTooltip, GRID_STROKE, useReducedMotion } from "./chart-kit";
import { PlatformDot } from "./shared";

interface PlatformComparisonProps {
  platforms: readonly PlatformSummary[];
}

/**
 * Normalized cross-platform comparison: CTR / CVR / ROAS indexed to the strongest
 * platform (100 = best) so channels are comparable despite different scales, plus
 * a detail table with the absolute numbers.
 */
export function PlatformComparison({ platforms }: PlatformComparisonProps) {
  const reduced = useReducedMotion();
  if (platforms.length === 0) return null;

  const maxCtr = Math.max(...platforms.map((p) => p.ctr), 1e-9);
  const maxCvr = Math.max(...platforms.map((p) => p.cvr), 1e-9);
  const maxRoas = Math.max(...platforms.map((p) => p.roas), 1e-9);

  const data = platforms.map((p) => ({
    platform: platformLabel(p.platform),
    CTR: Math.round((p.ctr / maxCtr) * 100),
    CVR: Math.round((p.cvr / maxCvr) * 100),
    ROAS: Math.round((p.roas / maxRoas) * 100),
  }));

  return (
    <div className="space-y-3">
      <ChartFrame height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="platform" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} domain={[0, 100]} tickFormatter={(v: number) => `${v}`} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
            content={<ChartTooltip format={(value) => `${value} / 100`} />}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Bar dataKey="CTR" fill="var(--chart-2)" radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={400} animationEasing="ease-out" />
          <Bar dataKey="CVR" fill="var(--chart-3)" radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={400} animationEasing="ease-out" />
          <Bar dataKey="ROAS" fill="var(--chart-1)" radius={[3, 3, 0, 0]} isAnimationActive={!reduced} animationDuration={400} animationEasing="ease-out" />
        </BarChart>
      </ChartFrame>

      <p className="text-[11px] text-muted-foreground">Bars indexed to the strongest platform (100 = best). Absolute figures below.</p>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-3 py-2 font-medium">Platform</th>
              <th className="px-3 py-2 text-right font-medium">Spend</th>
              <th className="px-3 py-2 text-right font-medium">Share</th>
              <th className="px-3 py-2 text-right font-medium">CPA</th>
              <th className="px-3 py-2 text-right font-medium">CTR</th>
              <th className="px-3 py-2 text-right font-medium">CVR</th>
              <th className="px-3 py-2 text-right font-medium">ROAS</th>
              <th className="px-3 py-2 text-right font-medium">Conv.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {platforms.map((p) => (
              <tr key={p.platform} className="text-foreground">
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <PlatformDot platform={p.platform} />
                    {platformLabel(p.platform)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(p.spend)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{formatPercent(p.spendShare, 0)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(p.cpa)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(p.ctr)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(p.cvr)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatMultiplier(p.roas)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{p.conversions.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
