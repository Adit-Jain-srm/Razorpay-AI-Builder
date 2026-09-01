"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus } from "@phosphor-icons/react";

import type { CampaignStatus, CampaignView } from "@/lib/campaign/brief";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { Stagger, StaggerItem } from "@/components/motion";

import { CampaignCard } from "./campaign-card";
import { TemplateGallery } from "./template-gallery";

type Filter = "all" | CampaignStatus;

const FILTERS: Filter[] = ["all", "draft", "active", "archived"];

export function CampaignsList({ campaigns }: { campaigns: CampaignView[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const base: Record<Filter, number> = { all: campaigns.length, draft: 0, active: 0, archived: 0 };
    for (const campaign of campaigns) base[campaign.status] += 1;
    return base;
  }, [campaigns]);

  const visible = filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);

  if (campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <TemplateGallery />
        <EmptyState
          icon={<Megaphone weight="duotone" className="size-5" />}
          title="No campaigns yet"
          description="Spin up your first campaign from a template above, or build a research-powered brief from scratch."
          action={
            <Button size="sm" render={<Link href="/campaigns/new" />}>
              <Plus weight="bold" /> New campaign
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TemplateGallery />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            {FILTERS.map((value) => (
              <TabsTrigger key={value} value={value} className="capitalize">
                {value}
                <span className="ml-1 font-mono text-[10px] text-muted-foreground">{counts[value]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button size="sm" render={<Link href="/campaigns/new" />}>
          <Plus weight="bold" /> New campaign
        </Button>
      </div>

      {visible.length > 0 ? (
        <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((campaign) => (
            <StaggerItem key={campaign.id}>
              <CampaignCard campaign={campaign} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card/30 px-6 py-10 text-center text-sm text-muted-foreground">
          No {filter} campaigns.
        </p>
      )}
    </div>
  );
}
