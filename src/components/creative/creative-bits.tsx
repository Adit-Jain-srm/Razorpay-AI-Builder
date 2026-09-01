"use client";

import { useState } from "react";
import {
  Clock,
  Crown,
  type Icon,
  Lightning,
  Question,
  Star,
  UsersThree,
  Warning,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { HOOK_LABELS, scoreGrade, type HookAnalysis, type HookType } from "@/lib/creative";
import { cn } from "@/lib/utils";

const HOOK_ICON: Record<HookType, Icon> = {
  fear: Warning,
  curiosity: Question,
  fomo: Lightning,
  social_proof: UsersThree,
  urgency: Clock,
  exclusivity: Crown,
};

/** Hook mechanism badge with confidence. */
export function HookBadge({ hook, className }: { hook: HookAnalysis; className?: string }) {
  const HookIcon = HOOK_ICON[hook.type];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 border-primary/30 bg-primary/10 text-primary", className)}
      title={hook.rationale}
    >
      <HookIcon weight="fill" />
      {HOOK_LABELS[hook.type]}
      <span className="font-mono text-[10px] opacity-70">{Math.round(hook.confidence * 100)}%</span>
    </Badge>
  );
}

/** Compact 0-100 score bar with grade coloring. */
export function ScoreMeter({ total, className }: { total: number; className?: string }) {
  const grade = scoreGrade(total);
  const color =
    grade === "A" ? "text-success" : grade === "D" ? "text-destructive" : "text-foreground";
  const bar =
    grade === "A" ? "bg-success" : grade === "D" ? "bg-destructive" : "bg-primary";

  return (
    <div className={cn("flex items-center gap-2", className)} title={`Direct-response score: ${total}/100 (grade ${grade})`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${Math.max(4, total)}%` }} />
      </div>
      <span className={cn("font-mono text-xs font-semibold tabular-nums", color)}>{total}</span>
    </div>
  );
}

/** Quality flag pills (truncated / over limit / incomplete). */
export function FlagBadges({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  const label: Record<string, string> = {
    truncated: "trimmed to fit",
    over_limit: "over limit",
    incomplete: "incomplete",
  };
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((flag) => (
        <Badge key={flag} variant="destructive" className="font-mono text-[10px]">
          {label[flag] ?? flag}
        </Badge>
      ))}
    </div>
  );
}

/** Character counter that turns red when over the platform limit. */
export function CharMeter({ length, limit }: { length: number; limit: number }) {
  const over = length > limit;
  return (
    <span className={cn("font-mono text-[10px] tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
      {length}/{limit}
    </span>
  );
}

/** Interactive 1-5 star rating (0 clears). */
export function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (rating: number | null) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-50"
          onMouseEnter={() => setHover(star)}
          onClick={() => onChange(value === star ? null : star)}
        >
          <Star weight={star <= active ? "fill" : "regular"} className={cn("size-3.5", star <= active ? "text-primary" : "")} />
        </button>
      ))}
    </div>
  );
}
