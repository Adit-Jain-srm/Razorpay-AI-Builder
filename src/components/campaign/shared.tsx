"use client";

import type { ComponentType } from "react";
import {
  Browsers,
  FacebookLogo,
  GoogleLogo,
  type Icon,
  LinkedinLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { platformLabel, type CampaignStatus } from "@/lib/campaign/brief";
import type { AdPlatform } from "@/lib/research/standard-models";
import { cn } from "@/lib/utils";

/** Per-platform icon + accent, kept in one place so chips/cards never drift. */
const PLATFORM_META: Record<AdPlatform, { icon: Icon; accent: string }> = {
  meta: { icon: FacebookLogo, accent: "text-sky-400" },
  google: { icon: GoogleLogo, accent: "text-amber-400" },
  tiktok: { icon: TiktokLogo, accent: "text-pink-400" },
  taboola: { icon: Browsers, accent: "text-orange-400" },
  youtube: { icon: YoutubeLogo, accent: "text-red-400" },
  linkedin: { icon: LinkedinLogo, accent: "text-blue-400" },
  x: { icon: XLogo, accent: "text-foreground" },
};

const FALLBACK_META = { icon: Browsers, accent: "text-muted-foreground" } as const;

/** Stable platform glyph rendered via member access (no dynamic component var). */
export function PlatformGlyph({ platform, className }: { platform: string; className?: string }) {
  const meta = PLATFORM_META[platform as AdPlatform] ?? FALLBACK_META;
  return <meta.icon weight="fill" className={cn(meta.accent, className)} />;
}

export function PlatformChip({ platform, className }: { platform: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1 font-mono", className)}>
      <PlatformGlyph platform={platform} className="size-3" />
      {platformLabel(platform)}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  if (status === "active") {
    return (
      <Badge variant="outline" className={cn("gap-1 font-mono text-success", className)}>
        <span className="size-1.5 rounded-full bg-success" /> active
      </Badge>
    );
  }
  if (status === "archived") {
    return (
      <Badge variant="secondary" className={cn("font-mono text-muted-foreground", className)}>
        archived
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("font-mono text-muted-foreground", className)}>
      draft
    </Badge>
  );
}

/** Thin 0-100 fit/allocation bar with a label, mono-numeric. */
export function FitBar({
  value,
  label,
  tone = "primary",
  className,
}: {
  value: number;
  label?: string;
  tone?: "primary" | "muted";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", tone === "primary" ? "bg-primary" : "bg-muted-foreground/50")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {label ?? `${pct}`}
      </span>
    </div>
  );
}

export function SectionLabel({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
      <Icon className="size-4 text-primary" />
      {children}
    </div>
  );
}
