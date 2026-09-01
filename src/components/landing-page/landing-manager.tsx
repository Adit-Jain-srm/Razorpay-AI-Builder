"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOut,
  Browsers,
  ChartBar,
  Flask,
  PencilSimple,
  RocketLaunch,
  Sparkle,
  Trash,
  Trophy,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/states";
import { Stagger, StaggerItem } from "@/components/motion";
import { cn } from "@/lib/utils";
import { TEMPLATE_LIBRARY, TEMPLATE_ORDER, type LandingTemplate } from "@/lib/landing";
import type { ExperimentGroup, LandingHubData, LandingPageView } from "@/lib/landing/studio";

import {
  createLandingPageAction,
  deployLandingAction,
  promoteWinnerAction,
  removeLandingAction,
} from "@/app/(dashboard)/landing-pages/actions";

interface LandingManagerProps {
  campaignId: string;
  campaignName: string;
  campaigns: { id: string; name: string }[];
  azureConfigured: boolean;
  initialData: LandingHubData;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export function LandingManager({ campaignId, campaignName, campaigns, azureConfigured, initialData }: LandingManagerProps) {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageView[]>(initialData.pages);
  const [experiments, setExperiments] = useState<ExperimentGroup[]>(initialData.experiments);
  const [template, setTemplate] = useState<LandingTemplate>("squeeze");
  const [angle, setAngle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const experimentKeys = new Set(experiments.map((e) => e.key));
  const standalone = pages.filter((p) => !p.experiment || !experimentKeys.has(p.experiment.key));

  const refresh = () => router.refresh();

  const onCreate = () =>
    startTransition(async () => {
      setBusy("create");
      try {
        const result = await createLandingPageAction({ campaignId, template, angle: angle.trim() || undefined });
        if (result.ok) {
          toast.success(result.data.source === "ai" ? "Landing page generated" : "Seeded page created (configure Azure for live AI)");
          router.push(`/landing-pages/${result.data.page.id}`);
        } else {
          toast.error(result.error);
        }
      } finally {
        setBusy(null);
      }
    });

  const onDeploy = (id: string) =>
    startTransition(async () => {
      setBusy(`deploy:${id}`);
      try {
        const result = await deployLandingAction(id);
        if (result.ok) {
          setPages((prev) => prev.map((p) => (p.id === id ? result.data : p)));
          toast.success("Deployed - your page is live");
          refresh();
        } else {
          toast.error(result.error);
        }
      } finally {
        setBusy(null);
      }
    });

  const onRemove = (id: string) =>
    startTransition(async () => {
      setBusy(`remove:${id}`);
      try {
        const result = await removeLandingAction(id);
        if (result.ok) {
          setPages((prev) => prev.filter((p) => p.id !== id));
          setExperiments((prev) =>
            prev
              .map((e) => ({ ...e, variants: e.variants.filter((v) => v.id !== id) }))
              .filter((e) => e.variants.length >= 2),
          );
          toast.success("Landing page deleted");
        } else {
          toast.error(result.error);
        }
      } finally {
        setBusy(null);
      }
    });

  const onPromote = (key: string) =>
    startTransition(async () => {
      setBusy(`promote:${key}`);
      try {
        const result = await promoteWinnerAction({ campaignId, experimentKey: key });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const { result: winner } = result.data;
        if (winner.winnerId) {
          toast.success(`Winner promoted (+${pct(winner.relativeLift)} lift) - losing variants paused`);
          refresh();
        } else if (winner.reason === "insufficient_data") {
          toast.message("Not enough traffic yet to call a winner with confidence.");
        } else {
          toast.message("No clear winner yet - keep the test running.");
        }
      } finally {
        setBusy(null);
      }
    });

  const StatusBadge = ({ status }: { status: string }) => (
    <Badge variant={status === "deployed" ? "default" : status === "paused" ? "outline" : "secondary"} className="font-mono text-[10px] uppercase">
      {status}
    </Badge>
  );

  const PageCard = ({ page }: { page: LandingPageView }) => (
    <div className="card-hover flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-foreground">{TEMPLATE_LIBRARY[page.template].name}</h3>
            <StatusBadge status={page.status} />
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">/lp/{page.slug}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 px-3 py-2">
        <StatPill label="Views" value={page.stats.views} />
        <StatPill label="Leads" value={page.stats.leads} />
        <StatPill label="CVR" value={pct(page.stats.cvr)} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => router.push(`/landing-pages/${page.id}`)}>
          <PencilSimple /> Edit
        </Button>
        {page.status === "deployed" ? (
          <a href={page.url} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" render={<span />}>
              <ArrowSquareOut /> Open
            </Button>
          </a>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onDeploy(page.id)} disabled={isPending}>
            <RocketLaunch weight="fill" /> Deploy
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(page.id)}
          disabled={isPending}
          aria-label="Delete landing page"
        >
          <Trash />
        </Button>
      </div>
    </div>
  );

  const ExperimentCard = ({ group }: { group: ExperimentGroup }) => {
    const totalViews = group.variants.reduce((s, v) => s + v.stats.views, 0);
    const totalLeads = group.variants.reduce((s, v) => s + v.stats.leads, 0);
    return (
      <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flask weight="duotone" className="size-4 text-primary" />
            <h3 className="font-heading text-sm font-medium text-foreground">A/B experiment</h3>
            <Badge variant="secondary" className="font-mono text-[10px]">{group.variants.length} variants</Badge>
          </div>
          <Button size="sm" onClick={() => onPromote(group.key)} disabled={isPending}>
            <Trophy weight={group.winner.winnerId ? "fill" : "regular"} /> Promote winner
          </Button>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {group.winner.reason === "winner" ? (
            <span className="text-foreground">
              Leading variant converts at <strong className="font-mono">{pct(group.winner.bestCvr)}</strong> ({pct(group.winner.relativeLift)} relative lift). Ready to promote.
            </span>
          ) : group.winner.reason === "insufficient_data" ? (
            <span>Gathering data: each variant needs 100+ views before a winner can be called.</span>
          ) : (
            <span>No clear winner yet. Leading CVR {pct(group.winner.bestCvr)}, lift below the 10% threshold.</span>
          )}
          <span className="ml-1 text-muted-foreground">
            ({totalViews} views, {totalLeads} leads total)
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {group.variants.map((variant) => {
            const isWinner = group.winner.winnerId === variant.id;
            return (
              <div
                key={variant.id}
                className={cn(
                  "rounded-lg border p-3",
                  isWinner ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{variant.experiment?.label ?? variant.slug}</span>
                  {isWinner ? <Trophy weight="fill" className="size-3.5 text-primary" /> : null}
                  <StatusBadge status={variant.status} />
                </div>
                <p className="truncate font-mono text-[11px] text-muted-foreground">/lp/{variant.slug}</p>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  <StatPill label="Views" value={variant.stats.views} />
                  <StatPill label="Leads" value={variant.stats.leads} />
                  <StatPill label="CVR" value={pct(variant.stats.cvr)} />
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Button variant="outline" size="xs" onClick={() => router.push(`/landing-pages/${variant.id}`)}>
                    <PencilSimple /> Edit
                  </Button>
                  {variant.status === "deployed" ? (
                    <a href={variant.url} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="xs" render={<span />}>
                        <ArrowSquareOut /> Open
                      </Button>
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">Landing Pages</h2>
            {campaigns.length > 1 ? (
              <Select value={campaignId} onValueChange={(id) => router.push(`/landing-pages?campaign=${id}`)}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary" className="font-mono">{campaignName}</Badge>
            )}
          </div>
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
            AI-generated, deployable landing pages with live lead capture, UTM tracking, and A/B testing - grounded in the
            campaign brief and research the engine surfaced.
          </p>
        </div>
      </header>

      {!azureConfigured ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/80">
          <Warning weight="fill" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Azure OpenAI is not configured, so pages generate from <strong>seeded demo copy</strong>. Set
            <code className="mx-1 font-mono text-xs">AZURE_OPENAI_*</code> to write live, research-informed pages.
          </span>
        </div>
      ) : null}

      <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h3 className="flex items-center gap-1.5 font-heading text-sm font-medium text-foreground">
          <Sparkle weight="duotone" className="size-4 text-primary" /> New landing page
        </h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={template} onValueChange={(v) => setTemplate(v as LandingTemplate)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TEMPLATE_LIBRARY[t].name} · {TEMPLATE_LIBRARY[t].framework}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="angle">Angle (optional)</Label>
            <Input id="angle" value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="e.g. beat inflation, no-upsell trust" />
          </div>
          <Button onClick={onCreate} disabled={isPending}>
            <Sparkle weight="fill" className={busy === "create" ? "shimmer" : ""} />
            Generate page
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{TEMPLATE_LIBRARY[template].description}</p>
      </section>

      {pages.length === 0 ? (
        <EmptyState
          icon={<Browsers weight="duotone" className="size-5" />}
          title="No landing pages yet"
          description="Generate your first page above. Pick a template, add an angle, and deploy a public page with lead capture in one click."
        />
      ) : (
        <div className="space-y-5">
          {experiments.length > 0 ? (
            <div className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <ChartBar weight="duotone" className="size-4 text-muted-foreground" /> Experiments
              </h3>
              {experiments.map((group) => (
                <ExperimentCard key={group.key} group={group} />
              ))}
            </div>
          ) : null}

          {standalone.length > 0 ? (
            <div className="space-y-3">
              {experiments.length > 0 ? <h3 className="text-sm font-medium text-foreground">Pages</h3> : null}
              <Stagger className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" stagger={0.04}>
                {standalone.map((page) => (
                  <StaggerItem key={page.id}>
                    <PageCard page={page} />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
