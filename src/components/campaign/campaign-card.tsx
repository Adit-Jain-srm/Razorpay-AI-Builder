"use client";

import Link from "next/link";
import { Megaphone, UsersThree } from "@phosphor-icons/react";

import { briefCompleteness, formatCurrency, type CampaignView } from "@/lib/campaign/brief";
import { cn } from "@/lib/utils";

import { CampaignActionsMenu } from "./campaign-actions-menu";
import { PlatformChip, StatusBadge } from "./shared";

export function CampaignCard({ campaign }: { campaign: CampaignView }) {
  const completeness = briefCompleteness(campaign);
  const platforms = campaign.platformConfig.platforms;
  const headline = campaign.brief.product || campaign.brief.objective || "No brief yet";

  return (
    <div className="group relative">
      <Link
        href={`/campaigns/${campaign.id}`}
        className="card-hover block h-full rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-card/70 hover:ring-foreground/20"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Megaphone weight="duotone" className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-heading text-sm font-medium text-foreground">{campaign.name}</div>
              <p className="mt-0.5 line-clamp-2 text-xs text-pretty text-muted-foreground">{headline}</p>
            </div>
          </div>
          {/* Spacer so the absolutely-positioned actions button doesn't overlap. */}
          <div className="size-7 shrink-0" aria-hidden />
        </div>

        {platforms.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {platforms.slice(0, 4).map((platform) => (
              <PlatformChip key={platform} platform={platform} />
            ))}
            {platforms.length > 4 ? (
              <span className="font-mono text-[10px] text-muted-foreground">+{platforms.length - 4}</span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <StatusBadge status={campaign.status} />
          <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <UsersThree weight="duotone" className="size-3" />
              {campaign.brief.personas.length}
            </span>
            <span>{campaign.budget.total ? formatCurrency(campaign.budget.total, campaign.budget.currency) : "-"}</span>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", completeness === 100 ? "bg-success" : "bg-primary")}
              style={{ width: `${completeness}%` }}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{completeness}%</span>
        </div>
      </Link>

      <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
        <CampaignActionsMenu id={campaign.id} status={campaign.status} />
      </div>
    </div>
  );
}
