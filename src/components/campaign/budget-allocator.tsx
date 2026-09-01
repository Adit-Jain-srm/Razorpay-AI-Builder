"use client";

import { useMemo } from "react";
import { ArrowsClockwise, Sparkle, Warning } from "@phosphor-icons/react";

import {
  allocationAmount,
  formatCurrency,
  normalizeAllocations,
  platformLabel,
  totalAllocationPercent,
  type BudgetAllocation,
  type BudgetPlan,
} from "@/lib/campaign/brief";
import type { AdPlatform } from "@/lib/research/standard-models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import { PlatformGlyph } from "./shared";

export interface BudgetAllocatorProps {
  budget: BudgetPlan;
  selected: AdPlatform[];
  onChange: (budget: BudgetPlan) => void;
  onAllocate?: () => void;
  allocating?: boolean;
}

/**
 * Budget plan editor: total + currency, plus a per-channel allocation split that
 * always covers exactly the selected platforms. Sliders are editable; one click
 * normalizes the split to 100%, and AI can suggest a starting allocation.
 */
export function BudgetAllocator({ budget, selected, onChange, onAllocate, allocating }: BudgetAllocatorProps) {
  // Working allocations: one row per selected platform (existing percent or 0).
  const allocations = useMemo<BudgetAllocation[]>(() => {
    const byPlatform = new Map(budget.allocations.map((a) => [a.platform, a]));
    return selected.map(
      (platform) => byPlatform.get(platform) ?? { platform, percent: 0, rationale: "" },
    );
  }, [budget.allocations, selected]);

  const sum = totalAllocationPercent(allocations);
  const balanced = sum === 100;

  const setAllocations = (next: BudgetAllocation[]) => onChange({ ...budget, allocations: next });

  const setPercent = (platform: AdPlatform, percent: number) => {
    setAllocations(allocations.map((a) => (a.platform === platform ? { ...a, percent } : a)));
  };

  const setTotal = (value: string) => {
    const total = Number.parseFloat(value);
    onChange({ ...budget, total: Number.isFinite(total) && total >= 0 ? total : undefined });
  };

  const setCurrency = (value: string) => onChange({ ...budget, currency: value.toUpperCase().slice(0, 6) || "USD" });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="budget-total">Total budget</Label>
          <Input
            id="budget-total"
            inputMode="decimal"
            value={budget.total ?? ""}
            onChange={(event) => setTotal(event.target.value)}
            placeholder="6000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="budget-currency">Currency</Label>
          <Input
            id="budget-currency"
            value={budget.currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="w-24"
            placeholder="USD"
          />
        </div>
      </div>

      {onAllocate ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Split your spend across the selected channels.</span>
          <Button type="button" variant="outline" size="sm" onClick={onAllocate} disabled={allocating || selected.length === 0}>
            <Sparkle weight="fill" className={cn(allocating && "shimmer")} />
            {allocating ? "Allocating…" : "AI allocate"}
          </Button>
        </div>
      ) : null}

      {selected.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/30 px-4 py-6 text-center text-xs text-muted-foreground">
          Select at least one channel to allocate budget.
        </p>
      ) : (
        <div className="space-y-3 rounded-xl bg-card/50 p-4 ring-1 ring-foreground/10">
          {allocations.map((allocation) => {
            const amount = allocationAmount(allocation, budget.total);
            return (
              <div key={allocation.platform} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <PlatformGlyph platform={allocation.platform} className="size-3.5" />
                    {platformLabel(allocation.platform)}
                  </span>
                  <span className="flex items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
                    {amount !== null ? <span className="text-foreground">{formatCurrency(amount, budget.currency)}</span> : null}
                    <span className="w-9 text-right">{Math.round(allocation.percent)}%</span>
                  </span>
                </div>
                <Slider
                  value={[Math.round(allocation.percent)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) =>
                    setPercent(allocation.platform, Number(Array.isArray(value) ? value[0] : value))
                  }
                  aria-label={`${platformLabel(allocation.platform)} budget percent`}
                />
              </div>
            );
          })}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-xs tabular-nums",
                balanced ? "text-success" : "text-amber-400",
              )}
            >
              {balanced ? null : <Warning weight="fill" className="size-3.5" />}
              {Math.round(sum)}% allocated
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAllocations(normalizeAllocations(allocations))}
              disabled={balanced || allocations.length === 0}
            >
              <ArrowsClockwise /> Normalize to 100%
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
