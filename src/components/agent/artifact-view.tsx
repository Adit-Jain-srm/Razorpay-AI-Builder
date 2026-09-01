"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ChartBar,
  CurrencyDollar,
  Gauge,
  Globe,
  Lightbulb,
  MagnifyingGlass,
  Megaphone,
  Newspaper,
  Sparkle,
  Stack,
  TextAlignLeft,
  UsersThree,
  WarningCircle,
  Wrench,
} from "@phosphor-icons/react";

import type { AgentArtifact } from "@/lib/agent/types";
import type {
  CapabilitiesArtifactData,
  ContextSummaryArtifactData,
  NavigationArtifactData,
} from "@/lib/agent/tools";
import type {
  AnalyticsSummaryArtifactData,
  AnomaliesArtifactData,
  BudgetPlanArtifactData,
  CampaignArtifactData,
  CampaignListArtifactData,
  CreativeScoreArtifactData,
  CreativeSetArtifactData,
  CreativeVariantCard,
  DailyBriefArtifactData,
  LandingPageArtifactData,
  PersonasArtifactData,
  PlatformRecommendationsArtifactData,
  ProactiveBriefingArtifactData,
  RecommendationCard,
  RecommendationsArtifactData,
  ResearchPersonaCard,
  ResearchReportArtifactData,
} from "@/lib/agent/tools/artifacts";
import { formatCurrency, formatMultiplier, formatPercent, platformLabel } from "@/lib/analytics/format";
import { HOOK_LABELS, type HookType } from "@/lib/creative/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

/**
 * Renders a tool's artifact by `type`. Acts as the client-side artifact registry:
 * each module tool maps its rich domain output to a flat, render-ready shape
 * (`@/lib/agent/tools/artifacts`) and gets a purpose-built card here. Unknown
 * types fall back to a readable JSON view.
 */
export function ArtifactView({ artifact }: { artifact: AgentArtifact }) {
  switch (artifact.type) {
    case "navigation":
      return <NavigationArtifact data={artifact.data as NavigationArtifactData} />;
    case "capabilities":
      return <CapabilitiesArtifact data={artifact.data as CapabilitiesArtifactData} />;
    case "context-summary":
      return <ContextSummaryArtifact data={artifact.data as ContextSummaryArtifactData} />;
    case "research-report":
      return <ResearchReportArtifact data={artifact.data as ResearchReportArtifactData} />;
    case "personas":
      return <PersonasArtifact data={artifact.data as PersonasArtifactData} />;
    case "campaign":
      return <CampaignArtifact data={artifact.data as CampaignArtifactData} />;
    case "campaign-list":
      return <CampaignListArtifact data={artifact.data as CampaignListArtifactData} />;
    case "platform-recommendations":
      return <PlatformRecommendationsArtifact data={artifact.data as PlatformRecommendationsArtifactData} />;
    case "budget-plan":
      return <BudgetPlanArtifact data={artifact.data as BudgetPlanArtifactData} />;
    case "creative-set":
      return <CreativeSetArtifact data={artifact.data as CreativeSetArtifactData} />;
    case "creative-score":
      return <CreativeScoreArtifact data={artifact.data as CreativeScoreArtifactData} />;
    case "landing-page":
      return <LandingPageArtifact data={artifact.data as LandingPageArtifactData} />;
    case "analytics-summary":
      return <AnalyticsSummaryArtifact data={artifact.data as AnalyticsSummaryArtifactData} />;
    case "anomalies":
      return <AnomaliesArtifact data={artifact.data as AnomaliesArtifactData} />;
    case "recommendations":
      return <RecommendationsArtifact data={artifact.data as RecommendationsArtifactData} />;
    case "daily-brief":
      return <DailyBriefArtifact data={artifact.data as DailyBriefArtifactData} />;
    case "proactive-briefing":
      return <ProactiveBriefingArtifact data={artifact.data as ProactiveBriefingArtifactData} />;
    default:
      return <JsonArtifact title={artifact.title} data={artifact.data} />;
  }
}

/* -------------------------------------------------------------------------- */
/* Shared frame + primitives                                                  */
/* -------------------------------------------------------------------------- */

function ArtifactFrame({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-2.5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <span className="text-primary [&_svg]:size-3.5">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function PlatformBadges({ platforms }: { platforms: string[] }) {
  if (platforms.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {platforms.map((platform) => (
        <Badge key={platform} variant="outline" className="text-[10px]">
          {platformLabel(platform)}
        </Badge>
      ))}
    </div>
  );
}

function FitBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Built-in artifacts (unchanged)                                             */
/* -------------------------------------------------------------------------- */

function NavigationArtifact({ data }: { data: NavigationArtifactData }) {
  return (
    <ArtifactFrame icon={<ArrowUpRight weight="bold" />} title="Navigate">
      <Link href={data.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-between")}>
        <span>Open {data.label}</span>
        <ArrowUpRight />
      </Link>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{data.href}</p>
    </ArtifactFrame>
  );
}

function CapabilitiesArtifact({ data }: { data: CapabilitiesArtifactData }) {
  return (
    <ArtifactFrame icon={<Wrench weight="fill" />} title={`${data.total} capabilities`}>
      <div className="space-y-2">
        {data.categories.map((category) => (
          <div key={category.name}>
            <div className="mb-1 text-[11px] font-medium text-muted-foreground capitalize">{category.name}</div>
            <div className="flex flex-wrap gap-1">
              {category.tools.map((tool) => (
                <Badge key={tool.name} variant="outline" className="font-mono text-[10px]" title={tool.description}>
                  {tool.name}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ArtifactFrame>
  );
}

function ContextSummaryArtifact({ data }: { data: ContextSummaryArtifactData }) {
  return (
    <ArtifactFrame icon={<Stack weight="fill" />} title="Working context">
      <p className="text-sm text-foreground/90">{data.note}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <Row label="Campaign" value={data.campaignId ?? "none"} />
        <Row label="Conversation" value={data.conversationId ?? "new"} />
        {data.focus ? <Row label="Focus" value={data.focus} /> : null}
      </dl>
    </ArtifactFrame>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-foreground/80" title={value}>
        {value}
      </dd>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Research                                                                   */
/* -------------------------------------------------------------------------- */

function PersonaCard({ persona }: { persona: ResearchPersonaCard }) {
  const meta = [persona.ageRange, persona.incomeBracket, persona.location].filter(Boolean).join(" · ");
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-foreground">{persona.name}</span>
        {persona.sizeRange ? <span className="shrink-0 text-[10px] text-muted-foreground">{persona.sizeRange}</span> : null}
      </div>
      {meta ? <p className="mt-0.5 text-[10px] text-muted-foreground">{meta}</p> : null}
      {persona.summary ? <p className="mt-1 text-[11px] text-foreground/80">{persona.summary}</p> : null}
      {persona.painPoints.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {persona.painPoints.slice(0, 3).map((pain, index) => (
            <li key={index} className="text-[11px] text-foreground/70">
              • {pain}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-1.5">
        <PlatformBadges platforms={persona.platforms} />
      </div>
    </div>
  );
}

function ResearchReportArtifact({ data }: { data: ResearchReportArtifactData }) {
  return (
    <ArtifactFrame icon={<MagnifyingGlass weight="fill" />} title={`Research · ${data.sourceCount} sources`}>
      <p className="mb-2 text-[11px] text-muted-foreground">&ldquo;{data.query}&rdquo;</p>

      {data.personas.length > 0 ? (
        <Section label="Personas">
          <div className="space-y-1.5">
            {data.personas.map((persona, index) => (
              <PersonaCard key={index} persona={persona} />
            ))}
          </div>
        </Section>
      ) : null}

      {data.painPoints.length > 0 ? (
        <Section label="Top pain points">
          <ul className="space-y-0.5">
            {data.painPoints.map((pain, index) => (
              <li key={index} className="text-[11px] text-foreground/80">
                • {pain.summary}
                {pain.quote ? <span className="text-muted-foreground"> - &ldquo;{pain.quote}&rdquo;</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.opportunities.length > 0 ? (
        <Section label="Opportunities">
          <ul className="space-y-0.5">
            {data.opportunities.map((opp, index) => (
              <li key={index} className="text-[11px] text-foreground/80">
                • <span className="font-medium">{opp.title}</span>: {opp.rationale}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.sources.length > 0 ? (
        <Section label="Sources">
          <div className="flex flex-wrap gap-1">
            {data.sources.map((source, index) =>
              source.url ? (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={source.title ?? source.url}
                  className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {source.provider}
                  <ArrowUpRight className="size-2.5" />
                </a>
              ) : (
                <Badge key={index} variant="outline" className="text-[10px]" title={source.title}>
                  {source.provider}
                </Badge>
              ),
            )}
          </div>
        </Section>
      ) : null}
    </ArtifactFrame>
  );
}

function PersonasArtifact({ data }: { data: PersonasArtifactData }) {
  return (
    <ArtifactFrame icon={<UsersThree weight="fill" />} title={data.projectName ? `Personas · ${data.projectName}` : "Personas"}>
      {data.personas.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No personas synthesized yet.</p>
      ) : (
        <div className="space-y-1.5">
          {data.personas.map((persona, index) => (
            <PersonaCard key={index} persona={persona} />
          ))}
        </div>
      )}
    </ArtifactFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Campaign                                                                   */
/* -------------------------------------------------------------------------- */

function CampaignArtifact({ data }: { data: CampaignArtifactData }) {
  return (
    <ArtifactFrame icon={<Megaphone weight="fill" />} title="Campaign">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">{data.name}</span>
        <Badge variant="outline" className="text-[10px] capitalize">
          {data.status}
        </Badge>
      </div>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <Row label="Objective" value={data.objective || "-"} />
        {data.offer ? <Row label="Offer" value={data.offer} /> : null}
        <Row label="Personas" value={String(data.personaCount)} />
        {typeof data.budgetTotal === "number" ? <Row label="Budget" value={formatCurrency(data.budgetTotal)} /> : null}
        <Row label="ID" value={data.id} />
      </dl>
      {data.valueProps.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5">
          {data.valueProps.slice(0, 3).map((prop, index) => (
            <li key={index} className="text-[11px] text-foreground/80">
              • {prop}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-1.5">
        <PlatformBadges platforms={data.platforms} />
      </div>
    </ArtifactFrame>
  );
}

function CampaignListArtifact({ data }: { data: CampaignListArtifactData }) {
  return (
    <ArtifactFrame icon={<Stack weight="fill" />} title={`Campaigns (${data.total})`}>
      {data.campaigns.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No campaigns yet.</p>
      ) : (
        <div className="space-y-1">
          {data.campaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 px-2 py-1.5">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">{campaign.name}</div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">{campaign.id}</div>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                {campaign.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </ArtifactFrame>
  );
}

function PlatformRecommendationsArtifact({ data }: { data: PlatformRecommendationsArtifactData }) {
  return (
    <ArtifactFrame icon={<ChartBar weight="fill" />} title="Platform fit">
      <div className="space-y-1.5">
        {data.recommendations.map((rec) => (
          <div key={rec.platform}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">{platformLabel(rec.platform)}</span>
              <span className="font-mono text-muted-foreground">{rec.fit}/100</span>
            </div>
            <div className="mt-0.5">
              <FitBar value={rec.fit} />
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{rec.rationale}</p>
          </div>
        ))}
      </div>
    </ArtifactFrame>
  );
}

function BudgetPlanArtifact({ data }: { data: BudgetPlanArtifactData }) {
  return (
    <ArtifactFrame icon={<CurrencyDollar weight="fill" />} title={data.total ? `Budget · ${formatCurrency(data.total)}` : "Budget split"}>
      <div className="space-y-1.5">
        {data.allocations.map((allocation) => (
          <div key={allocation.platform}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">{platformLabel(allocation.platform)}</span>
              <span className="font-mono text-muted-foreground">
                {allocation.percent}%{allocation.amount !== null ? ` · ${formatCurrency(allocation.amount)}` : ""}
              </span>
            </div>
            <div className="mt-0.5">
              <FitBar value={allocation.percent} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">Estimated split ({data.source}).</p>
    </ArtifactFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Creative                                                                   */
/* -------------------------------------------------------------------------- */

function hookLabel(type: string): string {
  return HOOK_LABELS[type as HookType] ?? type;
}

function gradeClass(grade: string): string {
  if (grade === "A") return "text-emerald-600 dark:text-emerald-400";
  if (grade === "B") return "text-primary";
  if (grade === "C") return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function VariantCard({ variant }: { variant: CreativeVariantCard }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{variant.headline || "(no headline)"}</span>
        <span className={cn("shrink-0 font-mono text-xs font-semibold", gradeClass(variant.grade))} title="Direct-response score">
          {variant.score}
          <span className="ml-0.5 text-[10px]">{variant.grade}</span>
        </span>
      </div>
      {variant.body ? <p className="mt-0.5 line-clamp-2 text-[11px] text-foreground/75">{variant.body}</p> : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Badge variant="secondary" className="text-[10px]" title="Psychological hook">
          {hookLabel(variant.hookType)} · {Math.round(variant.hookConfidence * 100)}%
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {platformLabel(variant.platform)}
        </Badge>
        {variant.flags.map((flag) => (
          <Badge key={flag} variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400">
            {flag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function CreativeSetArtifact({ data }: { data: CreativeSetArtifactData }) {
  const title = data.regenerated ? `Regenerated · ${platformLabel(data.platform)}` : `${data.variants.length} ${platformLabel(data.platform)} creatives`;
  return (
    <ArtifactFrame icon={<Sparkle weight="fill" />} title={title}>
      <div className="space-y-1.5">
        {data.variants.map((variant, index) => (
          <VariantCard key={variant.id ?? index} variant={variant} />
        ))}
      </div>
      {data.source ? <p className="mt-1.5 text-[10px] text-muted-foreground">Generated by {data.source === "ai" ? "AI" : "seeded fallback"}.</p> : null}
    </ArtifactFrame>
  );
}

function CreativeScoreArtifact({ data }: { data: CreativeScoreArtifactData }) {
  const bars: { label: string; value: number }[] = [
    { label: "Hook", value: data.breakdown.hookStrength },
    { label: "Clarity", value: data.breakdown.clarity },
    { label: "Specificity", value: data.breakdown.specificity },
    { label: "CTA", value: data.breakdown.ctaStrength },
  ];
  return (
    <ArtifactFrame icon={<Gauge weight="fill" />} title="Creative score">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-foreground">{data.headline || platformLabel(data.platform)}</span>
        <span className={cn("shrink-0 font-mono text-sm font-semibold", gradeClass(data.grade))}>
          {data.total}
          <span className="ml-0.5 text-[10px]">{data.grade}</span>
        </span>
      </div>
      <div className="mt-1">
        <Badge variant="secondary" className="text-[10px]">
          {hookLabel(data.hookType)} · {Math.round(data.hookConfidence * 100)}%
        </Badge>
      </div>
      <div className="mt-2 space-y-1">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[10px] text-muted-foreground">{bar.label}</span>
            <div className="flex-1">
              <FitBar value={bar.value} />
            </div>
            <span className="w-7 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{bar.value}</span>
          </div>
        ))}
      </div>
      {data.notes.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5">
          {data.notes.slice(0, 3).map((note, index) => (
            <li key={index} className="text-[10px] text-muted-foreground">
              • {note}
            </li>
          ))}
        </ul>
      ) : null}
    </ArtifactFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Landing page                                                               */
/* -------------------------------------------------------------------------- */

function LandingPageArtifact({ data }: { data: LandingPageArtifactData }) {
  return (
    <ArtifactFrame icon={<Globe weight="fill" />} title={data.deployed ? "Landing page · live" : "Landing page · draft"}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">{data.headline}</span>
        <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
          {data.template.replace(/_/g, " ")}
        </Badge>
      </div>
      {data.deployed ? (
        <Link
          href={data.url}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1.5 w-full justify-between")}
        >
          <span>Open {data.url}</span>
          <ArrowUpRight />
        </Link>
      ) : (
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{data.url} (deploy to go live)</p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {data.sections.map((section, index) => (
          <Badge key={index} variant="secondary" className="text-[10px] capitalize">
            {section.type.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>
      {data.stats && (data.stats.views > 0 || data.stats.leads > 0) ? (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {data.stats.views.toLocaleString()} views · {data.stats.leads.toLocaleString()} leads · {formatPercent(data.stats.cvr)} CVR
        </p>
      ) : null}
    </ArtifactFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-xs font-medium text-foreground">{value}</div>
    </div>
  );
}

function AnalyticsSummaryArtifact({ data }: { data: AnalyticsSummaryArtifactData }) {
  const s = data.summary;
  return (
    <ArtifactFrame icon={<ChartBar weight="fill" />} title={`Performance · ${data.rangeDays}d`}>
      <div className="grid grid-cols-3 gap-1">
        <Metric label="Spend" value={formatCurrency(s.spend)} />
        <Metric label="Conv." value={s.conversions.toLocaleString()} />
        <Metric label="CPA" value={formatCurrency(s.cpa)} />
        <Metric label="ROAS" value={formatMultiplier(s.roas)} />
        <Metric label="CTR" value={formatPercent(s.ctr)} />
        <Metric label="CVR" value={formatPercent(s.cvr)} />
      </div>
      {data.platforms.length > 0 ? (
        <div className="mt-2 space-y-1">
          {data.platforms.map((platform) => (
            <div key={platform.platform} className="flex items-center justify-between text-[11px]">
              <span className="text-foreground">{platformLabel(platform.platform)}</span>
              <span className="font-mono text-muted-foreground">
                {formatMultiplier(platform.roas)} · {formatCurrency(platform.cpa)} CPA · {formatPercent(platform.spendShare)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </ArtifactFrame>
  );
}

function severityClass(severity: string): string {
  if (severity === "critical" || severity === "high") return "text-destructive";
  if (severity === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function AnomaliesArtifact({ data }: { data: AnomaliesArtifactData }) {
  return (
    <ArtifactFrame icon={<WarningCircle weight="fill" />} title={`Anomalies (${data.total})`}>
      {data.anomalies.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No anomalies detected; delivery is within normal variance.</p>
      ) : (
        <ul className="space-y-1">
          {data.anomalies.slice(0, 6).map((anomaly, index) => (
            <li key={index} className="flex items-start gap-1.5">
              <Badge variant="outline" className={cn("shrink-0 text-[9px] uppercase", severityClass(anomaly.severity))}>
                {anomaly.severity}
              </Badge>
              <span className="text-[11px] text-foreground/80">{anomaly.description}</span>
            </li>
          ))}
        </ul>
      )}
    </ArtifactFrame>
  );
}

function priorityClass(priority: string): string {
  if (priority === "high") return "text-destructive";
  if (priority === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function RecommendationRow({ rec }: { rec: RecommendationCard }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{rec.title}</span>
        <div className="flex shrink-0 items-center gap-1">
          {rec.metricLabel ? <span className="font-mono text-[10px] text-muted-foreground">{rec.metricLabel}</span> : null}
          <Badge variant="outline" className={cn("text-[9px] uppercase", priorityClass(rec.priority))}>
            {rec.priority}
          </Badge>
        </div>
      </div>
      <p className="mt-0.5 text-[11px] text-foreground/75">{rec.rationale}</p>
    </div>
  );
}

function RecommendationsArtifact({ data }: { data: RecommendationsArtifactData }) {
  return (
    <ArtifactFrame icon={<Lightbulb weight="fill" />} title={`Recommendations (${data.total})`}>
      {data.recommendations.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No recommendations yet. Needs more performance history.</p>
      ) : (
        <div className="space-y-1.5">
          {data.recommendations.map((rec) => (
            <RecommendationRow key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </ArtifactFrame>
  );
}

function DailyBriefArtifact({ data }: { data: DailyBriefArtifactData }) {
  return (
    <ArtifactFrame icon={<Newspaper weight="fill" />} title={`Daily brief · ${data.campaignName}`}>
      <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/85">{data.content}</p>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {data.source === "ai" ? "AI-written" : "Auto-generated"} · {data.rangeDays}d window
      </p>
    </ArtifactFrame>
  );
}

function ProactiveBriefingArtifact({ data }: { data: ProactiveBriefingArtifactData }) {
  return (
    <ArtifactFrame icon={<Newspaper weight="fill" />} title={`Briefing · ${data.campaignName}`}>
      <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/85">{data.brief.content}</p>

      {data.anomalies.length > 0 ? (
        <Section label="Anomalies">
          <ul className="space-y-0.5">
            {data.anomalies.slice(0, 3).map((anomaly, index) => (
              <li key={index} className="text-[11px] text-foreground/80">
                <span className={cn("uppercase", severityClass(anomaly.severity))}>{anomaly.severity}</span> · {anomaly.description}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.recommendations.length > 0 ? (
        <Section label="Recommended actions">
          <div className="space-y-1">
            {data.recommendations.slice(0, 4).map((rec) => (
              <RecommendationRow key={rec.id} rec={rec} />
            ))}
          </div>
        </Section>
      ) : null}
    </ArtifactFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 first:mt-0">
      <div className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      {children}
    </div>
  );
}

function JsonArtifact({ title, data }: { title: string; data: unknown }) {
  return (
    <ArtifactFrame icon={<TextAlignLeft weight="fill" />} title={title}>
      <pre className="max-h-48 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] leading-relaxed text-foreground/80">
        {safeStringify(data)}
      </pre>
    </ArtifactFrame>
  );
}

function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}
