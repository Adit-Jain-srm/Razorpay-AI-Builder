import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsClockwise,
  ArrowsLeftRight,
  MagnifyingGlass,
  PauseCircle,
  TrendUp,
  Warning,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import type { AnomalySeverity, RecommendationType } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

/**
 * Shared, presentation-only analytics primitives (no hooks, no client state) so
 * both server and client components can render platform pills, severity badges,
 * and section labels consistently.
 */

const PLATFORM_DOT: Record<string, string> = {
  meta: "bg-[var(--chart-1)]",
  google: "bg-[var(--chart-2)]",
  tiktok: "bg-[var(--chart-5)]",
  taboola: "bg-[var(--chart-3)]",
  youtube: "bg-[var(--chart-4)]",
  linkedin: "bg-info",
  x: "bg-muted-foreground",
};

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  taboola: "Taboola",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
};

function label(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** Small colored dot keyed to a platform's chart color. */
export function PlatformDot({ platform, className }: { platform: string; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", PLATFORM_DOT[platform] ?? "bg-muted-foreground", className)} />;
}

/** Platform pill: dot + label. */
export function PlatformPill({ platform, className }: { platform: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-foreground", className)}>
      <PlatformDot platform={platform} />
      {label(platform)}
    </span>
  );
}

const SEVERITY_STYLES: Record<AnomalySeverity, string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/15 text-warning",
  low: "bg-muted text-muted-foreground",
};

/** Severity badge for anomalies. */
export function SeverityBadge({ severity, className }: { severity: AnomalySeverity; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium tracking-wide uppercase", SEVERITY_STYLES[severity], className)}>
      {severity}
    </span>
  );
}

const REC_ICON: Record<RecommendationType, Icon> = {
  scale: TrendUp,
  pause: PauseCircle,
  refresh: ArrowsClockwise,
  reallocate: ArrowsLeftRight,
  investigate: MagnifyingGlass,
};

/** Icon for a recommendation type. */
export function RecommendationIcon({ type, className }: { type: RecommendationType; className?: string }) {
  const RecIcon = REC_ICON[type] ?? Warning;
  return <RecIcon weight="duotone" className={cn("size-4", className)} />;
}

/** Section label with a leading icon (matches the campaign hub style). */
export function SectionLabel({ icon: SectionIcon, children, action }: { icon: Icon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <SectionIcon weight="duotone" className="size-4" />
        {children}
      </div>
      {action}
    </div>
  );
}

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  high: "default",
  medium: "secondary",
  low: "outline",
};

/** Priority chip for recommendations. */
export function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]} className="font-mono text-[10px] uppercase">
      {priority}
    </Badge>
  );
}
