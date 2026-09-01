"use client";

import Link from "next/link";
import {
  ArrowRight,
  Binoculars,
  Browsers,
  ChartLineUp,
  CheckCircle,
  CurrencyDollar,
  type Icon,
  ImagesSquare,
  Megaphone,
  Sparkle,
  Target,
  UsersThree,
} from "@phosphor-icons/react";

import {
  allocationAmount,
  briefCompleteness,
  formatCurrency,
  platformLabel,
  type CampaignView,
} from "@/lib/campaign/brief";
import { Badge } from "@/components/ui/badge";
import { Metric } from "@/components/ui/states";
import { cn } from "@/lib/utils";

import { CampaignActionsMenu } from "./campaign-actions-menu";
import { PersonaSnapshotCard } from "./persona-snapshot-card";
import { FitBar, PlatformChip, PlatformGlyph, SectionLabel, StatusBadge } from "./shared";

interface LinkedModule {
  href: string;
  label: string;
  description: string;
  icon: Icon;
}

function linkedModules(campaign: CampaignView): LinkedModule[] {
  const research = campaign.brief.researchProjectId
    ? `/research/${campaign.brief.researchProjectId}`
    : "/research";
  return [
    { href: research, label: "Research", description: "Audience intelligence powering this brief", icon: Binoculars },
    { href: `/creatives?campaign=${campaign.id}`, label: "Creatives", description: "Generate platform-ready ad copy + visuals", icon: ImagesSquare },
    { href: `/landing-pages?campaign=${campaign.id}`, label: "Landing Pages", description: "Build and deploy a page for this offer", icon: Browsers },
    { href: `/analytics?campaign=${campaign.id}`, label: "Analytics", description: "Track cross-platform performance", icon: ChartLineUp },
  ];
}

export function CampaignHub({ campaign }: { campaign: CampaignView }) {
  const { brief, platformConfig, budget } = campaign;
  const completeness = briefCompleteness(campaign);
  const selectedAllocations = budget.allocations.filter((a) => platformConfig.platforms.includes(a.platform));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">{campaign.name}</h2>
            <StatusBadge status={campaign.status} />
            {brief.source === "ai" ? (
              <Badge variant="outline" className="gap-1 font-mono text-muted-foreground">
                <Sparkle className="size-3" /> AI-assisted
              </Badge>
            ) : null}
          </div>
          {brief.product ? <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{brief.product}</p> : null}
        </div>
        <CampaignActionsMenu id={campaign.id} status={campaign.status} redirectOnDelete />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Personas" value={brief.personas.length} icon={<UsersThree weight="duotone" />} />
        <Metric label="Channels" value={platformConfig.platforms.length} icon={<Target weight="duotone" />} />
        <Metric
          label="Budget"
          value={budget.total ? formatCurrency(budget.total, budget.currency) : "-"}
          icon={<CurrencyDollar weight="duotone" />}
        />
        <Metric label="Brief complete" value={`${completeness}%`} icon={<CheckCircle weight="duotone" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          {/* Brief */}
          <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <SectionLabel icon={Megaphone}>Brief</SectionLabel>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Objective" value={brief.objective || "-"} />
              <Field label="Offer" value={brief.offer || "-"} />
              <Field label="Audience" value={brief.audience || "-"} className="sm:col-span-2" />
              <Field label="Tone" value={brief.tone || "-"} className="sm:col-span-2" />
            </dl>
            {brief.valueProps.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Value props</div>
                <ul className="space-y-1">
                  {brief.valueProps.map((prop, i) => (
                    <li key={`${prop}-${i}`} className="flex items-start gap-1.5 text-sm text-foreground">
                      <CheckCircle weight="fill" className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      {prop}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {brief.notes ? (
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-pretty text-muted-foreground">
                {brief.notes}
              </p>
            ) : null}
          </section>

          {/* Personas */}
          <section className="space-y-3">
            <SectionLabel icon={UsersThree}>Audience personas</SectionLabel>
            {brief.personas.length > 0 ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {brief.personas.map((persona) => (
                  <PersonaSnapshotCard key={persona.id} persona={persona} />
                ))}
              </div>
            ) : (
              <EmptyHint>No personas attached. Import cited personas from Research to sharpen targeting.</EmptyHint>
            )}
          </section>

          {/* Channels */}
          <section className="space-y-3">
            <SectionLabel icon={Target}>Channels</SectionLabel>
            {platformConfig.platforms.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {platformConfig.platforms.map((platform) => (
                  <PlatformChip key={platform} platform={platform} />
                ))}
              </div>
            ) : (
              <EmptyHint>No channels selected yet.</EmptyHint>
            )}
            {platformConfig.recommendations.length > 0 ? (
              <div className="space-y-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Platform fit</div>
                {platformConfig.recommendations.slice(0, 5).map((rec) => (
                  <div key={rec.platform} className="flex items-center gap-3">
                    <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs text-foreground">
                      <PlatformGlyph platform={rec.platform} className="size-3.5" />
                      {platformLabel(rec.platform)}
                    </span>
                    <FitBar value={rec.fit} label={`${rec.fit}`} />
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* Budget */}
          <section className="space-y-3">
            <SectionLabel icon={CurrencyDollar}>Budget allocation</SectionLabel>
            {selectedAllocations.length > 0 ? (
              <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                {budget.total ? (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Total budget</span>
                    <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                      {formatCurrency(budget.total, budget.currency)}
                    </span>
                  </div>
                ) : null}
                {selectedAllocations.map((allocation) => {
                  const amount = allocationAmount(allocation, budget.total);
                  return (
                    <div key={allocation.platform} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{platformLabel(allocation.platform)}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {amount !== null ? `${formatCurrency(amount, budget.currency)} · ` : ""}
                          {Math.round(allocation.percent)}%
                        </span>
                      </div>
                      <FitBar value={allocation.percent} label={`${Math.round(allocation.percent)}`} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyHint>No budget set yet.</EmptyHint>
            )}
          </section>
        </div>

        {/* Linked modules */}
        <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <SectionLabel icon={ArrowRight}>Campaign hub</SectionLabel>
          <p className="text-xs text-muted-foreground">This campaign links every module - jump to the next step.</p>
          <div className="space-y-2.5">
            {linkedModules(campaign).map((module) => (
              <Link
                key={module.href}
                href={module.href}
                className="group flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-colors hover:bg-card/70"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <module.icon weight="duotone" className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-sm font-medium text-foreground">{module.label}</div>
                  <p className="truncate text-xs text-muted-foreground">{module.description}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="text-sm text-pretty text-foreground">{value}</div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}
