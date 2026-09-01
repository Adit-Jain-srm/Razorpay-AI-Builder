"use client";

import Link from "next/link";
import { ArrowRight, Bank, type Icon, ShoppingBag, Stack } from "@phosphor-icons/react";

import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaign/templates";

const VERTICAL_ICON: Record<CampaignTemplate["vertical"], Icon> = {
  finance: Bank,
  ecommerce: ShoppingBag,
  saas: Stack,
};

export function TemplateGallery() {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="font-heading text-sm font-medium text-foreground">Start from a template</h3>
        <p className="text-xs text-muted-foreground">Pre-filled briefs you can edit - or start from a blank brief.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {CAMPAIGN_TEMPLATES.map((template) => {
          const Icon = VERTICAL_ICON[template.vertical];
          return (
            <Link
              key={template.id}
              href={`/campaigns/new?template=${template.id}`}
              className="group flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-card/70"
            >
              <div className="flex items-center justify-between">
                <div className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Icon weight="duotone" className="size-5" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <div>
                <div className="font-heading text-sm font-medium text-foreground">{template.name}</div>
                <p className="mt-0.5 text-xs text-pretty text-muted-foreground">{template.tagline}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
