"use client";

import { useCallback } from "react";
import { DownloadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import type { PerformanceMetricRow } from "@/types/database";

interface ExportButtonProps {
  rows: readonly PerformanceMetricRow[];
  filename?: string;
}

const COLUMNS: Array<keyof PerformanceMetricRow> = [
  "date",
  "platform",
  "creative_id",
  "impressions",
  "clicks",
  "conversions",
  "spend",
  "revenue",
  "cpa",
  "ctr",
  "cvr",
  "roas",
];

/** Escape a CSV cell (quote when it contains a comma, quote, or newline). */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(rows: readonly PerformanceMetricRow[]): string {
  const header = COLUMNS.join(",");
  const lines = rows.map((row) => COLUMNS.map((col) => csvCell(row[col])).join(","));
  return [header, ...lines].join("\n");
}

/**
 * Client-side CSV export of the current (filtered) metric rows. PDF export is a
 * documented follow-up (would require a new dependency, intentionally avoided).
 */
export function ExportButton({ rows, filename = "mediaos-analytics.csv" }: ExportButtonProps) {
  const onExport = useCallback(() => {
    if (typeof window === "undefined" || rows.length === 0) return;
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rows, filename]);

  return (
    <Button variant="outline" size="sm" onClick={onExport} disabled={rows.length === 0}>
      <DownloadSimple />
      Export CSV
    </Button>
  );
}
