import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Binoculars,
  ChartLineUp,
  Lightning,
  MagicWand,
  Robot,
  Rows,
} from "@phosphor-icons/react/dist/ssr";

import { summarize } from "@/lib/analytics";
import { DEMO_CAMPAIGN_ID, DEMO_CAMPAIGN_NAME } from "@/lib/seed/constants";
import { analyticsService, campaignService } from "@/lib/services";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, TiltCard } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { StatsGrid } from "./stats-grid";
import { MorningBrief } from "./morning-brief";

export const metadata: Metadata = { title: "Command Center" };

export default async function CommandCenterPage() {
  const [campaign, metrics] = await Promise.all([
    campaignService.get(DEMO_CAMPAIGN_ID),
    analyticsService.metrics({ campaignId: DEMO_CAMPAIGN_ID }),
  ]);

  const stats = summarize(metrics);
  const hasCampaign = campaign !== null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Command Center"
        description="Hire the Operator to plan and run campaigns end to end, or drop into a control surface to take the wheel yourself."
      />

      {/* Quick actions */}
      <FadeIn className="grid gap-3 sm:grid-cols-2">
        <Link href="/operator" className="group cursor-pointer">
          <TiltCard className="h-full">
            <Card className="h-full p-4 ring-1 ring-foreground/10 transition-all duration-200 hover:bg-card/70 hover:ring-foreground/20 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Robot className="size-5" weight="fill" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-heading text-sm font-medium text-foreground">
                    Open the Operator
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Give the agent a goal and watch it research, create, and deploy with cited sources.
                  </p>
                </div>
              </div>
            </Card>
          </TiltCard>
        </Link>

        <Link href="/research" className="group cursor-pointer">
          <TiltCard className="h-full">
            <Card className="h-full p-4 ring-1 ring-foreground/10 transition-all duration-200 hover:bg-card/70 hover:ring-foreground/20 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Binoculars className="size-5" weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-heading text-sm font-medium text-foreground">
                    Run audience research
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aggregate live web data into personas, pain points, and competitor angles.
                  </p>
                </div>
              </div>
            </Card>
          </TiltCard>
        </Link>
      </FadeIn>

      {/* Morning Brief - proactive intelligence without opening the Operator */}
      <FadeIn>
        <Suspense fallback={null}>
          <MorningBrief />
        </Suspense>
      </FadeIn>

      {/* Demo campaign card */}
      {hasCampaign ? (
        <FadeIn>
          <Card className="overflow-hidden ring-1 ring-foreground/10 card-hover">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Lightning className="size-4 text-primary" weight="fill" />
                <h2 className="font-heading text-sm font-medium">{DEMO_CAMPAIGN_NAME}</h2>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-500">
                  Active
                </span>
                <span className="text-[10px] text-muted-foreground">(sample data)</span>
              </div>
              <Link
                href={`/campaigns/${DEMO_CAMPAIGN_ID}`}
                className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "gap-1 text-xs")}
              >
                View <ArrowRight className="size-3" />
              </Link>
            </div>

            {/* Stats row */}
            <StatsGrid
              impressions={stats.impressions}
              clicks={stats.clicks}
              conversions={stats.conversions}
              spend={stats.spend}
            />

            {/* Quick links */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-4 py-3">
              <QuickLink href={`/research`} icon={<Binoculars className="size-3.5" weight="duotone" />} label="Research" />
              <QuickLink href={`/creatives?campaign=${DEMO_CAMPAIGN_ID}`} icon={<MagicWand className="size-3.5" weight="duotone" />} label="Creatives" />
              <QuickLink href={`/landing-pages?campaign=${DEMO_CAMPAIGN_ID}`} icon={<Rows className="size-3.5" weight="duotone" />} label="Landing Pages" />
              <QuickLink href={`/analytics/${DEMO_CAMPAIGN_ID}`} icon={<ChartLineUp className="size-3.5" weight="duotone" />} label="Analytics" />
            </div>
          </Card>
        </FadeIn>
      ) : null}
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:scale-[1.02] hover:bg-muted hover:text-foreground motion-reduce:hover:scale-100"
    >
      {icon}
      {label}
    </Link>
  );
}
