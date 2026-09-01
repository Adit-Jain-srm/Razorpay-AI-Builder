"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { TrendUp } from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendSignal } from "@/lib/research/standard-models";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

import { Citations } from "./citations";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function truncate(text: string, max = 28): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function TrendsPanel({ trends }: { trends: TrendSignal[] }) {
  const reduceMotion = useReducedMotion();

  const chartData = useMemo(
    () =>
      [...trends]
        .sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))
        .slice(0, 8)
        .map((t) => ({ topic: truncate(t.topic), velocity: Number(((t.velocity ?? 0) * 100).toFixed(0)), volume: t.volume ?? 0 })),
    [trends],
  );

  if (trends.length === 0) {
    return (
      <EmptyState
        icon={<TrendUp weight="duotone" className="size-5" />}
        title="No trend signals yet"
        description="Run the engine to chart rising topics and demand momentum."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h3 className="mb-3 font-heading text-sm font-medium text-foreground">Topic momentum (velocity)</h3>
        <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 34)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="topic"
              width={170}
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--foreground)" }}
              itemStyle={{ color: "var(--muted-foreground)" }}
            />
            <Bar dataKey="velocity" radius={[0, 4, 4, 0]} isAnimationActive={!reduceMotion} animationDuration={800} animationEasing="ease-out" name="Velocity">
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5">
        {trends.map((trend, i) => (
          <article key={i} className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{trend.topic}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {typeof trend.velocity === "number" ? (
                  <Badge variant="outline" className="font-mono">▲ {(trend.velocity * 100).toFixed(0)} velocity</Badge>
                ) : null}
                {typeof trend.volume === "number" && trend.volume > 0 ? (
                  <span className="font-mono text-[10px] text-muted-foreground">{trend.volume.toLocaleString()} vol</span>
                ) : null}
                <Citations sources={trend.sources} max={1} label="" />
              </div>
            </div>
            {trend.timeSeries.length > 1 ? (
              <div className="h-9 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.timeSeries}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={!reduceMotion}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
