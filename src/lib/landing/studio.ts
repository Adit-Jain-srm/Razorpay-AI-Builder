import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getResearchContextForCampaign } from "@/lib/creative/research-bridge";
import { campaignService } from "@/lib/services";
import {
  getLandingStore,
  getPublicLandingStore,
  type LandingStats,
  type LandingStore,
} from "@/lib/services/landing.service";
import type { Json, LandingPage } from "@/types/database";

import { assignVariant, conversionRate, pickWinner, type VariantPerformance, type WinnerResult } from "./ab";
import { DEMO_CAMPAIGN_ID, DEMO_FINANCE_CONTEXT } from "./fixtures";
import { generateLandingDocument } from "./generate";
import { ensureUniqueSlug } from "./slug";
import {
  buildLandingDocument,
  detectFinance,
  TEMPLATE_LIBRARY,
  varySectionCopy,
  type LandingContext,
} from "./templates";
import {
  landingTemplateSchema,
  parseLandingDocument,
  type ExperimentMeta,
  type LandingDocument,
  type LandingSection,
  type LandingTemplate,
  type LandingTheme,
} from "./types";

/**
 * SERVER-ONLY Landing Page Engine orchestration. Ties generation, the research
 * bridge, persistence, A/B experiments, and the public render path together so
 * the editor actions, the public route, and (later) the Operator agent share one
 * code path. Mirrors the Creative Studio's `studio.ts`.
 */

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

function randomId(prefix = "sec"): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/* -------------------------------------------------------------------------- */
/* View models                                                                */
/* -------------------------------------------------------------------------- */

export interface LandingStatsView extends LandingStats {
  cvr: number;
}

export interface LandingPageView {
  id: string;
  campaignId: string;
  slug: string;
  url: string;
  template: LandingTemplate;
  status: string;
  deployedAt: string | null;
  document: LandingDocument;
  experiment: ExperimentMeta | null;
  stats: LandingStatsView;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentGroup {
  key: string;
  label: string;
  variants: LandingPageView[];
  winner: WinnerResult;
}

export interface LandingHubData {
  campaignId: string;
  pages: LandingPageView[];
  experiments: ExperimentGroup[];
}

/** Builds a renderable document for a row, tolerating legacy/empty `sections`. */
function documentFor(page: LandingPage): LandingDocument {
  const parsed = parseLandingDocument(page.sections);
  if (parsed) return parsed;
  const template = landingTemplateSchema.safeParse(page.template_type);
  return buildLandingDocument(template.success ? template.data : "squeeze", fallbackContext(), { source: "manual" });
}

function fallbackContext(): LandingContext {
  return { brandName: "Your brand", vertical: "general", painPoints: [], benefits: [] };
}

function toView(page: LandingPage, stats: LandingStats): LandingPageView {
  const document = documentFor(page);
  return {
    id: page.id,
    campaignId: page.campaign_id,
    slug: page.slug,
    url: `/lp/${page.slug}`,
    template: document.template,
    status: page.status,
    deployedAt: page.deployed_at,
    document,
    experiment: document.experiment,
    stats: { ...stats, cvr: conversionRate(stats.views, stats.leads) },
    createdAt: page.created_at,
    updatedAt: page.updated_at,
  };
}

async function viewWithStats(store: LandingStore, page: LandingPage): Promise<LandingPageView> {
  const stats = await store.getStats(page.id).catch(() => ({ views: 0, leads: 0 }));
  return toView(page, stats);
}

/* -------------------------------------------------------------------------- */
/* Campaign context (research-informed)                                       */
/* -------------------------------------------------------------------------- */

function briefField(brief: unknown, key: string): string | undefined {
  if (brief && typeof brief === "object" && !Array.isArray(brief)) {
    const value = (brief as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/**
 * Resolves a research-informed landing context for a campaign. Demo campaign
 * uses the seeded finance context; otherwise pulls the campaign brief + the
 * research engine's pain points/persona (read-only bridge), degrading to a
 * minimal context so generation always works.
 */
export async function getLandingContextForCampaign(campaignId: string): Promise<LandingContext> {
  if (campaignId === DEMO_CAMPAIGN_ID) return { ...DEMO_FINANCE_CONTEXT };

  const ctx: LandingContext = { brandName: "Your brand", vertical: "general", painPoints: [], benefits: [] };
  try {
    const campaign = await campaignService.get(campaignId);
    if (campaign) {
      ctx.brandName = campaign.name;
      ctx.productName = campaign.name;
      ctx.vertical = briefField(campaign.brief, "industry") ?? briefField(campaign.brief, "product") ?? "general";
      ctx.audience = briefField(campaign.brief, "audience");
      ctx.offer = briefField(campaign.brief, "offer") ?? "the free guide";
    }
  } catch (error) {
    logger.warn("landing context: campaign lookup failed", { campaignId, error: String(error) });
  }

  try {
    const research = await getResearchContextForCampaign(campaignId);
    ctx.painPoints = research.painPoints;
    if (research.personaName && !ctx.audience) ctx.audience = research.personaName;
  } catch (error) {
    logger.warn("landing context: research bridge failed", { campaignId, error: String(error) });
  }

  return ctx;
}

/* -------------------------------------------------------------------------- */
/* Hub + editor reads                                                         */
/* -------------------------------------------------------------------------- */

function groupExperiments(pages: LandingPageView[]): ExperimentGroup[] {
  const byKey = new Map<string, LandingPageView[]>();
  for (const page of pages) {
    const key = page.experiment?.key;
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(page);
  }

  const groups: ExperimentGroup[] = [];
  for (const [key, variants] of byKey) {
    if (variants.length < 2) continue;
    const deployed = variants.filter((v) => v.status === "deployed");
    const performance: VariantPerformance[] = deployed.map((v) => ({
      id: v.id,
      label: v.experiment?.label ?? v.slug,
      views: v.stats.views,
      leads: v.stats.leads,
      isControl: v.experiment?.isControl ?? false,
    }));
    groups.push({
      key,
      label: variants[0].experiment?.label?.split(" - ")[0] ?? "Experiment",
      variants: variants.sort((a, b) => a.slug.localeCompare(b.slug)),
      winner: pickWinner(performance, { minViewsPerVariant: 100, minRelativeLift: 0.1 }),
    });
  }
  return groups;
}

/** Loads the landing hub: every page for a campaign with conversion stats + A/B groups. */
export async function getLandingHubData(campaignId: string): Promise<LandingHubData> {
  const store = await getLandingStore();
  const pages = await store.listByCampaign(campaignId);
  const views = await Promise.all(pages.map((page) => viewWithStats(store, page)));
  return { campaignId, pages: views, experiments: groupExperiments(views) };
}

/** Loads a single page for the editor. */
export async function getLandingPageView(pageId: string): Promise<LandingPageView | null> {
  const store = await getLandingStore();
  const page = await store.get(pageId);
  if (!page) return null;
  return viewWithStats(store, page);
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export interface CreateLandingInput {
  campaignId: string;
  template: LandingTemplate;
  angle?: string;
  /** When false, skip AI and seed deterministically (faster, demo-safe). */
  useAi?: boolean;
  signal?: AbortSignal;
}

export interface GeneratedLandingResult {
  page: LandingPageView;
  source: "ai" | "seeded";
}

async function persistDocument(
  store: LandingStore,
  page: LandingPage,
  document: LandingDocument,
): Promise<LandingPageView> {
  const updated = await store.update(page.id, {
    sections: toJson(document),
    template_type: document.template,
  });
  return viewWithStats(store, updated);
}

/** Creates a new draft landing page (generated or seeded) with a unique slug. */
export async function createLandingPage(input: CreateLandingInput): Promise<GeneratedLandingResult> {
  const store = await getLandingStore();
  const baseContext = await getLandingContextForCampaign(input.campaignId);
  const context: LandingContext = { ...baseContext, angle: input.angle?.trim() || baseContext.angle };

  const { document, source } =
    input.useAi === false
      ? { document: buildLandingDocument(input.template, context, { source: "seeded" }), source: "seeded" as const }
      : await generateLandingDocument({ template: input.template, context, signal: input.signal });

  const base = `${context.brandName} ${context.angle || TEMPLATE_LIBRARY[input.template].name}`;
  const slug = await ensureUniqueSlug(base, (candidate) => store.slugExists(candidate));

  const page = await store.create({
    campaign_id: input.campaignId,
    user_id: store.userId,
    slug,
    template_type: document.template,
    sections: toJson(document),
    status: "draft",
  });

  return { page: await viewWithStats(store, page), source };
}

/** Regenerates the entire document for a page (preserving slug + experiment). */
export async function regenerateLandingPage(pageId: string, options: { signal?: AbortSignal } = {}): Promise<GeneratedLandingResult> {
  const store = await getLandingStore();
  const page = await store.get(pageId);
  if (!page) throw new ValidationError("Landing page not found");
  const current = documentFor(page);

  const context = await contextForPage(page, current);
  const { document, source } = await generateLandingDocument({
    template: current.template,
    context,
    experiment: current.experiment,
    signal: options.signal,
  });

  return { page: await persistDocument(store, page, { ...document, theme: current.theme }), source };
}

/** Switches a page to a different template, preserving campaign context + theme accent. */
export async function setLandingTemplate(pageId: string, template: LandingTemplate): Promise<LandingPageView> {
  const store = await getLandingStore();
  const page = await store.get(pageId);
  if (!page) throw new ValidationError("Landing page not found");
  const current = documentFor(page);
  const context = await contextForPage(page, current);

  const document = buildLandingDocument(template, context, {
    source: current.source,
    experiment: current.experiment,
    theme: { accent: current.theme.accent },
  });
  return persistDocument(store, page, document);
}

/** Persists a full document edit from the editor (manual edits). */
export async function saveLandingDocument(pageId: string, document: LandingDocument): Promise<LandingPageView> {
  const store = await getLandingStore();
  const page = await store.get(pageId);
  if (!page) throw new ValidationError("Landing page not found");
  return persistDocument(store, page, { ...document, source: "manual" });
}

/** Patches a single section (inline edit). */
export async function updateLandingSection(
  pageId: string,
  sectionId: string,
  patch: Partial<LandingSection>,
): Promise<LandingPageView> {
  const store = await getLandingStore();
  const page = await store.get(pageId);
  if (!page) throw new ValidationError("Landing page not found");
  const document = documentFor(page);
  const sections = document.sections.map((section) =>
    section.id === sectionId ? ({ ...section, ...patch, id: section.id, type: section.type } as LandingSection) : section,
  );
  return persistDocument(store, page, { ...document, sections, source: "manual" });
}

/** Updates the page theme (accent / mode / radius / font). */
export async function updateLandingTheme(pageId: string, patch: Partial<LandingTheme>): Promise<LandingPageView> {
  const store = await getLandingStore();
  const page = await store.get(pageId);
  if (!page) throw new ValidationError("Landing page not found");
  const document = documentFor(page);
  return persistDocument(store, page, { ...document, theme: { ...document.theme, ...patch } });
}

/**
 * Regenerates ONE section. With Azure configured, regenerates the full document
 * and splices in the freshly written section of the same type/position; without
 * Azure, applies a deterministic copy variation so the demo still visibly changes.
 */
export async function regenerateLandingSection(pageId: string, sectionId: string): Promise<LandingPageView> {
  const store = await getLandingStore();
  const page = await store.get(pageId);
  if (!page) throw new ValidationError("Landing page not found");
  const document = documentFor(page);
  const target = document.sections.find((s) => s.id === sectionId);
  if (!target) throw new ValidationError("Section not found");

  const context = await contextForPage(page, document);
  const { document: fresh, source } = await generateLandingDocument({ template: document.template, context });

  let nextSection: LandingSection;
  if (source === "ai") {
    nextSection = spliceSection(document, fresh, target) ?? varySectionCopy(target, context, Date.now());
  } else {
    nextSection = varySectionCopy(target, context, Date.now());
  }

  const sections = document.sections.map((s) => (s.id === sectionId ? { ...nextSection, id: s.id } : s));
  return persistDocument(store, page, { ...document, sections });
}

/** Finds the fresh-document section matching `target` (same type + ordinal). */
function spliceSection(oldDoc: LandingDocument, newDoc: LandingDocument, target: LandingSection): LandingSection | null {
  const sameTypeOld = oldDoc.sections.filter((s) => s.type === target.type);
  const ordinal = sameTypeOld.findIndex((s) => s.id === target.id);
  const sameTypeNew = newDoc.sections.filter((s) => s.type === target.type);
  const match = sameTypeNew[ordinal] ?? sameTypeNew[0];
  return match ?? null;
}

/** Deploys a page (status -> deployed, renders the HTML snapshot). */
export async function deployLandingPage(pageId: string): Promise<LandingPageView> {
  const store = await getLandingStore();
  const page = await store.deploy(pageId);
  return viewWithStats(store, page);
}

/** Pauses a deployed page (removes it from public rotation; keeps the data). */
export async function pauseLandingPage(pageId: string): Promise<LandingPageView> {
  const store = await getLandingStore();
  const page = await store.update(pageId, { status: "paused" });
  return viewWithStats(store, page);
}

export async function removeLandingPage(pageId: string): Promise<void> {
  const store = await getLandingStore();
  await store.remove(pageId);
}

/* -------------------------------------------------------------------------- */
/* A/B experiments                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Creates an A/B variant of a page. If the source isn't in an experiment yet, it
 * becomes the control and a new experiment is formed; the new variant shares the
 * experiment key with an even traffic split and a fresh slug.
 */
export async function createLandingVariant(pageId: string): Promise<{ control: LandingPageView; variant: LandingPageView }> {
  const store = await getLandingStore();
  const source = await store.get(pageId);
  if (!source) throw new ValidationError("Landing page not found");
  const sourceDoc = documentFor(source);

  const key = sourceDoc.experiment?.key ?? `exp-${randomId("ab")}`;

  // Ensure the source is part of the experiment as control.
  let control = source;
  if (!sourceDoc.experiment) {
    const controlDoc: LandingDocument = {
      ...sourceDoc,
      experiment: { key, label: "A - Control", weight: 50, isControl: true, promotedAt: null },
    };
    control = await store.update(source.id, { sections: toJson(controlDoc) });
  }

  // Build the variant with a different angle for a meaningful test.
  const context = await contextForPage(source, sourceDoc);
  const { document } = await generateLandingDocument({
    template: sourceDoc.template,
    context: { ...context, angle: context.angle ? `${context.angle} (variant)` : "fresh angle" },
    experiment: { key, label: "B - Variant", weight: 50, isControl: false, promotedAt: null },
  });

  const slug = await ensureUniqueSlug(`${context.brandName} ${sourceDoc.template} b`, (c) => store.slugExists(c));
  const variantRow = await store.create({
    campaign_id: source.campaign_id,
    user_id: store.userId,
    slug,
    template_type: document.template,
    sections: toJson(document),
    status: "draft",
  });

  return {
    control: await viewWithStats(store, control),
    variant: await viewWithStats(store, variantRow),
  };
}

export interface PromoteWinnerResult {
  experimentKey: string;
  result: WinnerResult;
  /** The promoted variant (when a winner was confidently chosen). */
  promoted: LandingPageView | null;
}

/**
 * Auto-promotes the winning variant of an experiment using the documented CVR
 * heuristic (`pickWinner`). The winner keeps 100% weight; losers are set to
 * weight 0 and `paused` so they leave public rotation. When no confident winner
 * exists, nothing is changed and the reason is returned for the UI.
 */
export async function promoteExperimentWinner(
  campaignId: string,
  experimentKey: string,
  options: { minViewsPerVariant?: number; minRelativeLift?: number } = {},
): Promise<PromoteWinnerResult> {
  const store = await getLandingStore();
  const pages = await store.listByCampaign(campaignId);
  const variants = pages
    .map((page) => ({ page, doc: documentFor(page) }))
    .filter((v) => v.doc.experiment?.key === experimentKey);

  if (variants.length < 2) {
    return { experimentKey, result: { winnerId: null, reason: "insufficient_data", bestCvr: 0, relativeLift: 0 }, promoted: null };
  }

  const performance: VariantPerformance[] = [];
  for (const v of variants) {
    if (v.page.status !== "deployed") continue;
    const stats = await store.getStats(v.page.id);
    performance.push({
      id: v.page.id,
      label: v.doc.experiment?.label ?? v.page.slug,
      views: stats.views,
      leads: stats.leads,
      isControl: v.doc.experiment?.isControl ?? false,
    });
  }

  const result = pickWinner(performance, {
    minViewsPerVariant: options.minViewsPerVariant ?? 100,
    minRelativeLift: options.minRelativeLift ?? 0.1,
  });

  if (!result.winnerId) return { experimentKey, result, promoted: null };

  const promotedAt = new Date().toISOString();
  let promoted: LandingPageView | null = null;
  for (const v of variants) {
    const isWinner = v.page.id === result.winnerId;
    const experiment: ExperimentMeta = {
      ...(v.doc.experiment as ExperimentMeta),
      weight: isWinner ? 100 : 0,
      isControl: isWinner,
      promotedAt,
    };
    const nextDoc: LandingDocument = { ...v.doc, experiment };
    const updated = await store.update(v.page.id, {
      sections: toJson(nextDoc),
      status: isWinner ? "deployed" : "paused",
    });
    if (isWinner) promoted = await viewWithStats(store, updated);
  }

  return { experimentKey, result, promoted };
}

/* -------------------------------------------------------------------------- */
/* Public render + capture                                                    */
/* -------------------------------------------------------------------------- */

export interface PublicLandingResult {
  /** The page actually rendered (after A/B assignment). */
  page: LandingPage;
  document: LandingDocument;
  /** True when A/B assignment routed to a sibling variant. */
  assignedByExperiment: boolean;
}

/**
 * Resolves the page to render for a public visit. When the slug belongs to an
 * experiment with 2+ deployed variants, it stably assigns the visitor to one
 * variant (by `assignVariant`) and returns THAT variant - so conversions and
 * views are recorded against the experience the visitor actually saw. A
 * `?preview` / `?ab=off` flag bypasses assignment to render the exact slug.
 */
export async function resolvePublicLanding(
  slug: string,
  visitorId: string,
  options: { bypassExperiment?: boolean } = {},
): Promise<PublicLandingResult | null> {
  const store = await getPublicLandingStore();
  const page = await store.getBySlug(slug);
  if (!page) return null;

  const document = parseLandingDocument(page.sections);
  if (!document) return { page, document: documentFor(page), assignedByExperiment: false };

  const experiment = document.experiment;
  if (options.bypassExperiment || !experiment) return { page, document, assignedByExperiment: false };

  const siblings = await store.listDeployedByCampaign(page.campaign_id);
  const variants = siblings
    .map((p) => ({ page: p, doc: parseLandingDocument(p.sections) }))
    .filter((v): v is { page: LandingPage; doc: LandingDocument } => Boolean(v.doc && v.doc.experiment?.key === experiment.key));

  if (variants.length < 2) return { page, document, assignedByExperiment: false };

  const assigned = assignVariant(
    visitorId,
    experiment.key,
    variants.map((v) => ({ id: v.page.id, weight: v.doc.experiment?.weight ?? 0 })),
  );
  if (!assigned) return { page, document, assignedByExperiment: false };

  const chosen = variants.find((v) => v.page.id === assigned.id);
  if (!chosen || chosen.page.id === page.id) return { page, document, assignedByExperiment: false };
  return { page: chosen.page, document: chosen.doc, assignedByExperiment: true };
}

export interface CaptureLeadInput {
  landingPageId: string;
  email: string;
  name?: string;
  utm?: Record<string, string>;
  ipAddress?: string | null;
}

/** Captures a lead from the public route (anonymous-safe). */
export async function captureLandingLead(input: CaptureLeadInput) {
  const store = await getPublicLandingStore();
  return store.captureLead({
    landing_page_id: input.landingPageId,
    user_id: store.userId,
    email: input.email,
    name: input.name ?? null,
    utm: toJson(input.utm ?? {}),
    ip_address: input.ipAddress ?? null,
  });
}

export interface RecordViewInput {
  landingPageId: string;
  visitorId?: string;
  utm?: Record<string, string>;
  referrer?: string | null;
}

/** Records a page view from the public route (anonymous-safe). */
export async function recordLandingView(input: RecordViewInput) {
  const store = await getPublicLandingStore();
  return store.recordView({
    landing_page_id: input.landingPageId,
    user_id: store.userId,
    visitor_id: input.visitorId ?? null,
    utm: toJson(input.utm ?? {}),
    referrer: input.referrer ?? null,
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Best campaign context for a page: research-informed, overlaid with doc meta. */
async function contextForPage(page: LandingPage, document: LandingDocument): Promise<LandingContext> {
  const context = await getLandingContextForCampaign(page.campaign_id);
  const meta = document.meta;
  return {
    ...context,
    brandName: meta.brandName || context.brandName,
    vertical: meta.vertical || context.vertical,
    angle: meta.angle || context.angle,
  };
}

/** Re-export for the editor (template metadata) without a server boundary. */
export { TEMPLATE_LIBRARY, detectFinance };
