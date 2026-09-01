"use client";

import { CartesianGrid, Legend, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";

import {
  formatCompact,
  formatCurrency,
  formatMultiplier,
  formatPercent,
  platformLabel,
  type CreativePerformance,
} from "@/lib/analytics";

import { AXIS_LINE, AXIS_TICK, ChartFrame, GRID_STROKE, platformColor, useReducedMotion, type TooltipEntry } from "./chart-kit";
import { PlatformDot } from "./shared";

interface CreativeCorrelationProps {
  creatives: readonly CreativePerformance[];
}

interface ScatterPoint {
  x: number;
  y: number;
  z: number;
  label: string;
  platform: string;
  ctr: number;
  roas: number;
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as ScatterPoint | undefined;
  if (!point) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
        <PlatformDot platform={point.platform} />
        {point.label}
      </div>
      <div className="space-y-0.5 font-mono tabular-nums text-muted-foreground">
        <div className="flex justify-between gap-4"><span>Spend</span><span className="text-foreground">{formatCurrency(point.x)}</span></div>
        <div className="flex justify-between gap-4"><span>CPA</span><span className="text-foreground">{formatCurrency(point.y)}</span></div>
        <div className="flex justify-between gap-4"><span>Conv.</span><span className="text-foreground">{formatCompact(point.z)}</span></div>
        <div className="flex justify-between gap-4"><span>ROAS</span><span className="text-foreground">{formatMultiplier(point.roas)}</span></div>
      </div>
    </div>
  );
}

/**
 * Creative-performance correlation: a bubble chart of spend (x) vs CPA (y) sized
 * by conversions and colored by platform, so over- and under-performers separate
 * visually. A ranked table gives the exact numbers.
 */
export function CreativeCorrelation({ creatives }: CreativeCorrelationProps) {
  const reduced = useReducedMotion();
  if (creatives.length === 0) return null;

  const avgCtr = creatives.length > 0
    ? creatives.reduce((sum, c) => sum + c.ctr, 0) / creatives.length
    : 0;

  const byPlatform = new Map<string, ScatterPoint[]>();
  for (const c of creatives) {
    const point: ScatterPoint = { x: c.spend, y: c.cpa, z: Math.max(c.conversions, 1), label: c.label, platform: c.platform, ctr: c.ctr, roas: c.roas };
    const bucket = byPlatform.get(c.platform);
    if (bucket) bucket.push(point);
    else byPlatform.set(c.platform, [point]);
  }

  return (
    <div className="space-y-3">
      <ChartFrame height={260}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Spend"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            tickFormatter={(v: number) => formatCurrency(v)}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="CPA"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) => formatCurrency(v)}
          />
          <ZAxis type="number" dataKey="z" range={[60, 460]} name="Conversions" />
          <Tooltip cursor={{ strokeDasharray: "3 3", stroke: "var(--border)" }} content={<ScatterTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          {[...byPlatform.entries()].map(([platform, points]) => (
            <Scatter
              key={platform}
              name={platformLabel(platform)}
              data={points}
              fill={platformColor(platform)}
              fillOpacity={0.7}
              isAnimationActive={!reduced}
              animationDuration={400}
            />
          ))}
        </ScatterChart>
      </ChartFrame>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-3 py-2 font-medium">Creative</th>
              <th className="px-3 py-2 text-right font-medium">Spend</th>
              <th className="px-3 py-2 text-right font-medium">Conv.</th>
              <th className="px-3 py-2 text-right font-medium">CPA</th>
              <th className="px-3 py-2 text-right font-medium">CTR</th>
              <th className="px-3 py-2 text-right font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {creatives.map((c) => (
              <tr key={c.creativeId} className="text-foreground">
                <td className="max-w-[20rem] px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    <PlatformDot platform={c.platform} />
                    <span className="truncate">{c.label}</span>
                    {c.ctr < avgCtr * 0.6 && c.spend > 0 ? (
                      <span className="shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-warning uppercase" title="CTR significantly below average - possible creative fatigue">
                        Fatigue risk
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(c.spend)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{c.conversions.toLocaleString("en-US")}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(c.cpa)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(c.ctr)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatMultiplier(c.roas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
