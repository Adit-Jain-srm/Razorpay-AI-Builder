"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardText,
  CurrencyDollar,
  type Icon,
  Megaphone,
  Rocket,
  Sparkle,
  Target,
  UsersThree,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  assistBriefAction,
  allocateBudgetAction,
  createCampaignAction,
  recommendPlatformsAction,
  suggestPersonasAction,
  type AssistInput,
} from "@/app/(dashboard)/campaigns/actions";
import {
  briefSchema,
  budgetPlanSchema,
  CAMPAIGN_OBJECTIVES,
  formatCurrency,
  personaIdsFromBrief,
  platformConfigSchema,
  totalAllocationPercent,
  type BriefAssistResult,
  type BudgetPlan,
  type CampaignBriefData,
  type CampaignObjective,
  type PersonaSnapshot,
  type PlatformConfig,
} from "@/lib/campaign/brief";
import type { CampaignSeed } from "@/lib/campaign/templates";
import type { AdPlatform } from "@/lib/research/standard-models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { BudgetAllocator } from "./budget-allocator";
import { PersonaImport } from "./persona-import";
import { PersonaSnapshotCard } from "./persona-snapshot-card";
import { PlatformRecommendations } from "./platform-recommendations";
import { PlatformChip, StatusBadge } from "./shared";

interface Draft {
  name: string;
  brief: CampaignBriefData;
  platformConfig: PlatformConfig;
  budget: BudgetPlan;
}

const STEPS: { id: string; label: string; icon: Icon }[] = [
  { id: "offer", label: "Offer", icon: Megaphone },
  { id: "audience", label: "Audience", icon: UsersThree },
  { id: "channels", label: "Channels", icon: Target },
  { id: "budget", label: "Budget", icon: CurrencyDollar },
  { id: "review", label: "Review", icon: ClipboardText },
];

const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  leads: "Lead generation",
  sales: "Sales / conversions",
  traffic: "Traffic",
  awareness: "Awareness",
  engagement: "Engagement",
  app_installs: "App installs",
};

function emptyDraft(seed: CampaignSeed | null, researchProjectId?: string): Draft {
  if (seed) {
    return {
      name: seed.name,
      brief: { ...seed.brief, researchProjectId: researchProjectId ?? seed.brief.researchProjectId },
      platformConfig: seed.platformConfig,
      budget: seed.budget,
    };
  }
  return {
    name: "",
    brief: briefSchema.parse({ researchProjectId }),
    platformConfig: platformConfigSchema.parse({}),
    budget: budgetPlanSchema.parse({ currency: "USD" }),
  };
}

export interface BriefBuilderProps {
  initialSeed?: CampaignSeed | null;
  initialResearchProjectId?: string;
}

export function BriefBuilder({ initialSeed = null, initialResearchProjectId }: BriefBuilderProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(initialSeed, initialResearchProjectId));
  const [step, setStep] = useState(0);
  const [drafting, startDrafting] = useTransition();
  const [working, startWorking] = useTransition();
  const [creating, startCreating] = useTransition();

  const setBrief = (patch: Partial<CampaignBriefData>) => setDraft((d) => ({ ...d, brief: { ...d.brief, ...patch } }));
  const setBudget = (budget: BudgetPlan) => setDraft((d) => ({ ...d, budget }));

  const assistInput = (): AssistInput => ({
    product: draft.brief.product.trim() || draft.name.trim(),
    offer: draft.brief.offer || undefined,
    audience: draft.brief.audience || undefined,
    goal: draft.brief.objective || undefined,
    personas: draft.brief.personas.slice(0, 8),
    platforms: draft.platformConfig.platforms,
    budgetTotal: draft.budget.total,
    currency: draft.budget.currency,
  });

  const requireProduct = (): boolean => {
    if (!assistInput().product) {
      toast.error("Describe the product or offer first");
      return false;
    }
    return true;
  };

  const mergePersonas = (incoming: PersonaSnapshot[]) => {
    setDraft((d) => {
      const merged = [...d.brief.personas];
      for (const persona of incoming) {
        if (!merged.some((p) => p.id === persona.id)) merged.push(persona);
      }
      return { ...d, brief: { ...d.brief, personas: merged } };
    });
  };

  const applyAssist = (result: BriefAssistResult) => {
    setDraft((d) => {
      const personas = [...d.brief.personas];
      for (const persona of result.personas) {
        if (!personas.some((p) => p.id === persona.id)) personas.push(persona);
      }
      const selected = result.platforms.filter((rec) => rec.fit >= 55).map((rec) => rec.platform);
      const platforms = [...new Set([...d.platformConfig.platforms, ...selected])];
      return {
        ...d,
        brief: {
          ...d.brief,
          objective: d.brief.objective || result.objective,
          valueProps: result.valueProps.length ? result.valueProps : d.brief.valueProps,
          tone: result.tone || d.brief.tone,
          personas,
          source: "ai",
        },
        platformConfig: {
          platforms,
          recommendations: result.platforms,
          source: result.source,
          generatedAt: new Date().toISOString(),
        },
        budget: {
          ...d.budget,
          total: result.budget.total ?? d.budget.total,
          currency: result.budget.currency || d.budget.currency,
          allocations: result.budget.allocations.length ? result.budget.allocations : d.budget.allocations,
          source: result.source,
          generatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const onDraftWithAi = () => {
    if (!requireProduct()) return;
    startDrafting(async () => {
      const result = await assistBriefAction(assistInput());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      applyAssist(result.data);
      toast.success(result.data.source === "ai" ? "Drafted with AI" : "Drafted (seeded - add Azure for live AI)");
    });
  };

  const onSuggestPersonas = () => {
    if (!requireProduct()) return;
    startWorking(async () => {
      const result = await suggestPersonasAction(assistInput());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      mergePersonas(result.data);
      toast.success(`Suggested ${result.data.length} persona${result.data.length === 1 ? "" : "s"}`);
    });
  };

  const onRecommendPlatforms = () => {
    if (!requireProduct()) return;
    startWorking(async () => {
      const result = await recommendPlatformsAction(assistInput());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const recommendations = result.data;
      const top = recommendations.filter((rec) => rec.fit >= 55).map((rec) => rec.platform);
      setDraft((d) => ({
        ...d,
        platformConfig: {
          platforms: [...new Set([...d.platformConfig.platforms, ...top])],
          recommendations,
          source: "ai",
          generatedAt: new Date().toISOString(),
        },
      }));
      toast.success("Channels recommended");
    });
  };

  const onAllocateBudget = () => {
    if (!requireProduct()) return;
    startWorking(async () => {
      const result = await allocateBudgetAction(assistInput());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBudget({
        ...draft.budget,
        total: result.data.total ?? draft.budget.total,
        currency: result.data.currency || draft.budget.currency,
        allocations: result.data.allocations,
        source: result.data.source,
        generatedAt: new Date().toISOString(),
      });
      toast.success("Budget allocated");
    });
  };

  const togglePlatform = (platform: AdPlatform) => {
    setDraft((d) => {
      const has = d.platformConfig.platforms.includes(platform);
      const platforms = has
        ? d.platformConfig.platforms.filter((p) => p !== platform)
        : [...d.platformConfig.platforms, platform];
      return { ...d, platformConfig: { ...d.platformConfig, platforms } };
    });
  };

  const canCreate = draft.name.trim().length > 0 && assistInput().product.length > 0;

  const onCreate = () => {
    if (!canCreate) {
      toast.error("Add a campaign name and product description");
      setStep(0);
      return;
    }
    startCreating(async () => {
      const cleanedBrief: CampaignBriefData = {
        ...draft.brief,
        valueProps: draft.brief.valueProps.map((v) => v.trim()).filter(Boolean),
      };
      const result = await createCampaignAction({
        name: draft.name.trim(),
        status: "draft",
        brief: cleanedBrief,
        platformConfig: draft.platformConfig,
        budget: draft.budget,
        personaIds: personaIdsFromBrief(cleanedBrief),
      });
      if (result.ok) {
        toast.success("Campaign created");
        router.push(`/campaigns/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  };

  const next = () => {
    if (step === 0 && (!draft.name.trim() || !assistInput().product)) {
      toast.error("Add a campaign name and product description");
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const budgetSum = totalAllocationPercent(
    draft.budget.allocations.filter((a) => draft.platformConfig.platforms.includes(a.platform)),
  );

  const summary = useMemo(
    () => ({
      personas: draft.brief.personas.length,
      platforms: draft.platformConfig.platforms,
      total: draft.budget.total,
    }),
    [draft],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-5">
        {/* Stepper */}
        <ol className="flex flex-wrap items-center gap-1.5">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={s.id} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : done
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-md font-mono text-[11px]",
                      active ? "bg-primary text-primary-foreground" : done ? "bg-success/20 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check weight="bold" className="size-3" /> : i + 1}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 ? <span className="text-muted-foreground/40">/</span> : null}
              </li>
            );
          })}
        </ol>

        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:p-5">
          {/* Step 1: Offer */}
          {step === 0 ? (
            <div className="space-y-4">
              <StepHeading
                icon={Megaphone}
                title="What are you advertising?"
                description="Describe the offer. The AI assistant uses this to draft personas, channels, and budget."
                action={
                  <Button type="button" size="sm" onClick={onDraftWithAi} disabled={drafting}>
                    <Sparkle weight="fill" className={cn(drafting && "shimmer")} />
                    {drafting ? "Drafting…" : "AI draft brief"}
                  </Button>
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Campaign name</Label>
                  <Input
                    id="name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Retirement Income Weekly"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="product">Product / what you&apos;re promoting</Label>
                  <Textarea
                    id="product"
                    rows={2}
                    value={draft.brief.product}
                    onChange={(e) => setBrief({ product: e.target.value })}
                    placeholder="A plain-English retirement income newsletter for near-retirees"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offer">Offer / hook</Label>
                  <Input
                    id="offer"
                    value={draft.brief.offer}
                    onChange={(e) => setBrief({ offer: e.target.value })}
                    placeholder="Free 2026 Income Blueprint"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="objective">Objective</Label>
                  <Select
                    value={draft.brief.objective || "leads"}
                    onValueChange={(v) => setBrief({ objective: typeof v === "string" ? v : "leads" })}
                  >
                    <SelectTrigger id="objective" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_OBJECTIVES.map((objective) => (
                        <SelectItem key={objective} value={objective}>
                          {OBJECTIVE_LABELS[objective]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="audience">Audience (optional)</Label>
                  <Input
                    id="audience"
                    value={draft.brief.audience}
                    onChange={(e) => setBrief({ audience: e.target.value })}
                    placeholder="US near-retirees aged 58-67 worried about inflation"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tone">Tone (optional)</Label>
                  <Input
                    id="tone"
                    value={draft.brief.tone}
                    onChange={(e) => setBrief({ tone: e.target.value })}
                    placeholder="trustworthy, plain-English"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="valueProps">Value props (one per line)</Label>
                  <Textarea
                    id="valueProps"
                    rows={3}
                    value={draft.brief.valueProps.join("\n")}
                    onChange={(e) => setBrief({ valueProps: e.target.value.split("\n") })}
                    placeholder={"No jargon, no upsells\nInflation-protected income"}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Step 2: Audience */}
          {step === 1 ? (
            <div className="space-y-4">
              <StepHeading
                icon={UsersThree}
                title="Who are we targeting?"
                description="Import cited personas from a research project, or let the assistant suggest some."
                action={
                  <Button type="button" variant="outline" size="sm" onClick={onSuggestPersonas} disabled={working}>
                    <Sparkle weight="fill" className={cn(working && "shimmer")} /> AI suggest
                  </Button>
                }
              />
              <PersonaImport
                selected={draft.brief.personas}
                onChange={(personas) => setBrief({ personas })}
                initialProjectId={draft.brief.researchProjectId}
              />
              {draft.brief.personas.length > 0 ? (
                <div className="space-y-2">
                  <Label>In this brief ({draft.brief.personas.length})</Label>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {draft.brief.personas.map((persona) => (
                      <PersonaSnapshotCard
                        key={persona.id}
                        persona={persona}
                        onRemove={() => setBrief({ personas: draft.brief.personas.filter((p) => p.id !== persona.id) })}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Step 3: Channels */}
          {step === 2 ? (
            <div className="space-y-4">
              <StepHeading
                icon={Target}
                title="Where should it run?"
                description="Each channel is scored 0-100 for this offer. Toggle the ones you want to run."
              />
              <PlatformRecommendations
                recommendations={draft.platformConfig.recommendations}
                selected={draft.platformConfig.platforms}
                onToggle={togglePlatform}
                onRecommend={onRecommendPlatforms}
                recommending={working}
              />
            </div>
          ) : null}

          {/* Step 4: Budget */}
          {step === 3 ? (
            <div className="space-y-4">
              <StepHeading
                icon={CurrencyDollar}
                title="How much, and where?"
                description="Set a total and split it across your selected channels."
              />
              <BudgetAllocator
                budget={draft.budget}
                selected={draft.platformConfig.platforms}
                onChange={setBudget}
                onAllocate={onAllocateBudget}
                allocating={working}
              />
            </div>
          ) : null}

          {/* Step 5: Review */}
          {step === 4 ? (
            <div className="space-y-4">
              <StepHeading icon={ClipboardText} title="Review & launch" description="Confirm the brief, then create the campaign as a draft." />
              <ReviewRow label="Campaign">{draft.name || <span className="text-muted-foreground">Unnamed</span>}</ReviewRow>
              <ReviewRow label="Objective">{OBJECTIVE_LABELS[(draft.brief.objective as CampaignObjective)] ?? draft.brief.objective ?? "-"}</ReviewRow>
              <ReviewRow label="Product">{draft.brief.product || "-"}</ReviewRow>
              {draft.brief.offer ? <ReviewRow label="Offer">{draft.brief.offer}</ReviewRow> : null}
              <ReviewRow label="Personas">{summary.personas > 0 ? `${summary.personas} selected` : "None"}</ReviewRow>
              <ReviewRow label="Channels">
                {summary.platforms.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {summary.platforms.map((p) => (
                      <PlatformChip key={p} platform={p} />
                    ))}
                  </div>
                ) : (
                  "None"
                )}
              </ReviewRow>
              <ReviewRow label="Budget">
                {summary.total ? `${formatCurrency(summary.total, draft.budget.currency)} · ${Math.round(budgetSum)}% allocated` : "Not set"}
              </ReviewRow>
            </div>
          ) : null}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" size="sm" onClick={next}>
              Next <ArrowRight />
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={onCreate} disabled={creating || !canCreate}>
              <Rocket weight="fill" />
              {creating ? "Creating…" : "Create campaign"}
            </Button>
          )}
        </div>
      </div>

      {/* Live summary rail */}
      <aside className="hidden xl:block">
        <div className="sticky top-4 space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Draft</span>
            <StatusBadge status="draft" />
          </div>
          <div className="font-heading text-sm font-medium text-foreground">{draft.name || "Untitled campaign"}</div>
          {draft.brief.product ? <p className="line-clamp-3 text-xs text-pretty text-muted-foreground">{draft.brief.product}</p> : null}
          <dl className="space-y-2 border-t border-border pt-3 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Personas</dt>
              <dd className="font-mono tabular-nums text-foreground">{summary.personas}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Channels</dt>
              <dd className="font-mono tabular-nums text-foreground">{summary.platforms.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Budget</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {summary.total ? formatCurrency(summary.total, draft.budget.currency) : "-"}
              </dd>
            </div>
          </dl>
          {summary.platforms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
              {summary.platforms.map((p) => (
                <PlatformChip key={p} platform={p} />
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function StepHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: Icon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon weight="duotone" className="size-5" />
        </div>
        <div className="space-y-0.5">
          <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
          <p className="max-w-md text-xs text-pretty text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-border pb-2.5 text-sm last:border-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  );
}
