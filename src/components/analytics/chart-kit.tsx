"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

/**
 * Recharts theming kit for the analytics dashboard: chart colors wired to the
 * design-system CSS variables (emerald-led, zinc base), a styled tooltip, and a
 * reduced-motion hook so animations honor the user's OS preference.
 */

/** Platform → chart color (CSS variable references resolve in SVG fill/stroke). */
export const PLATFORM_COLORS: Record<string, string> = {
  meta: "var(--chart-1)",
  google: "var(--chart-2)",
  tiktok: "var(--chart-5)",
  taboola: "var(--chart-3)",
  youtube: "var(--chart-4)",
  linkedin: "var(--info)",
  x: "var(--muted-foreground)",
};

export function platformColor(platform: string): string {
  return PLATFORM_COLORS[platform] ?? "var(--muted-foreground)";
}

/** Per-metric line color. */
export const METRIC_COLORS: Record<string, string> = {
  spend: "var(--chart-1)",
  revenue: "var(--chart-1)",
  cpa: "var(--chart-5)",
  ctr: "var(--chart-2)",
  cvr: "var(--chart-3)",
  roas: "var(--chart-1)",
  conversions: "var(--chart-1)",
  clicks: "var(--chart-2)",
  impressions: "var(--chart-4)",
};

export const GRID_STROKE = "var(--border)";
export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;
export const AXIS_LINE = { stroke: "var(--border)" } as const;

/** Respect `prefers-reduced-motion` for chart animations. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** A fixed-height responsive frame so charts never cause layout shift. */
export function ChartFrame({ height = 280, className, children }: { height?: number; className?: string; children: ReactNode }) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as never}
      </ResponsiveContainer>
    </div>
  );
}

export interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Format a value for display (e.g. currency / percent). */
  format?: (value: number, entry: TooltipEntry) => string;
  /** Format the tooltip header label. */
  labelFormat?: (label: string | number) => string;
  /** Hide the colored series swatch (single-series charts). */
  hideSwatch?: boolean;
}

/** Branded tooltip styled with the popover tokens + mono numerics. */
export function ChartTooltip({ active, payload, label, format, labelFormat, hideSwatch }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      {label !== undefined ? (
        <div className="mb-1 font-medium text-foreground">{labelFormat ? labelFormat(label) : label}</div>
      ) : null}
      <div className="space-y-0.5">
        {payload.map((entry, i) => {
          const numeric = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
          const display = format ? format(numeric, entry) : String(entry.value ?? "");
          return (
            <div key={`${entry.dataKey ?? entry.name ?? i}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                {!hideSwatch && entry.color ? (
                  <span className="inline-block size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                ) : null}
                {entry.name}
              </span>
              <span className="font-mono tabular-nums text-foreground">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
