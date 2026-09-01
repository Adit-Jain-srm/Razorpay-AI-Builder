"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { formatDateLabel, formatMetric, metricLabel, type MetricKey, type SeriesPoint } from "@/lib/analytics";

import { AXIS_LINE, AXIS_TICK, ChartFrame, ChartTooltip, GRID_STROKE, METRIC_COLORS, useReducedMotion } from "./chart-kit";

interface TimeSeriesChartProps {
  series: readonly SeriesPoint[];
  trend: readonly SeriesPoint[];
  metric: MetricKey;
  height?: number;
}

/** Daily time-series for one metric with an OLS trendline overlay. */
export function TimeSeriesChart({ series, trend, metric, height = 280 }: TimeSeriesChartProps) {
  const reduced = useReducedMotion();
  const color = METRIC_COLORS[metric] ?? "var(--chart-1)";
  const data = series.map((point, i) => ({ date: point.date, value: point.value, trend: trend[i]?.value ?? null }));

  return (
    <ChartFrame height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          axisLine={AXIS_LINE}
          tickLine={false}
          minTickGap={28}
          tickFormatter={(value: string) => formatDateLabel(value)}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(value: number) => formatMetric(metric, value)}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltip
              hideSwatch
              labelFormat={(label) => formatDateLabel(String(label))}
              format={(value, entry) => `${entry.dataKey === "trend" ? "Trend " : metricLabel(metric)}: ${formatMetric(metric, value)}`}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="value"
          name={metricLabel(metric)}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
          isAnimationActive={!reduced}
          animationDuration={400}
          animationEasing="ease-out"
        />
        <Line
          type="monotone"
          dataKey="trend"
          name="Trend"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartFrame>
  );
}
