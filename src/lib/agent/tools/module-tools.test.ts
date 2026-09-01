import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_CAMPAIGN_ID } from "@/lib/seed/constants";

/**
 * Module-tool tests. CI-safe + offline: every upstream module service (research,
 * campaign, creative, landing, analytics) is mocked, so no network, no AI, and no
 * database is touched. We assert each tool maps its mocked service output to the
 * right artifact (happy path), fails safe to a structured `{ ok: false }` instead
 * of throwing (error path), that registration wires every tool, and that the
 * runtime drives the full multi-tool chain with artifacts accumulating in order.
 */

/* ------------------------------- module mocks ----------------------------- */

vi.mock("@/lib/research/orchestrator", () => ({ runResearchPipeline: vi.fn() }));
vi.mock("@/lib/research/service", () => ({ listResearchProjects: vi.fn(), getResearchProjectWithReport: vi.fn() }));
vi.mock("@/lib/campaign/assistant", () => ({ getCampaignBriefAssistant: vi.fn() }));
vi.mock("@/lib/creative/studio", () => ({ generateCreatives: vi.fn(), regenerateCreative: vi.fn() }));
vi.mock("@/lib/landing/studio", () => ({ createLandingPage: vi.fn(), deployLandingPage: vi.fn() }));
vi.mock("@/lib/analytics/brief", () => ({ generateDailyBrief: vi.fn() }));
vi.mock("@/lib/services", () => ({
  campaignService: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn() },
  creativeService: { get: vi.fn() },
  analyticsService: { metrics: vi.fn(), summary: vi.fn(), anomalies: vi.fn(), insights: vi.fn() },
  landingService: {},
}));

import { runResearchPipeline } from "@/lib/research/orchestrator";
import { getResearchProjectWithReport, listResearchProjects } from "@/lib/research/service";
import { getCampaignBriefAssistant, type CampaignBriefAssistant } from "@/lib/campaign/assistant";
import { generateCreatives, regenerateCreative, type CreativeView } from "@/lib/creative/studio";
import { createLandingPage, deployLandingPage, type LandingPageView } from "@/lib/landing/studio";
import { generateDailyBrief } from "@/lib/analytics/brief";
import { campaignService, creativeService, analyticsService } from "@/lib/services";

import { assembleVariant } from "@/lib/creative/assemble";
import type { ResearchProjectRecord } from "@/lib/research/store";
import { researchReportSchema, type ResearchReport } from "@/lib/research/standard-models";
import { landingDocumentSchema } from "@/lib/landing/types";
import type { Campaign, Json, PerformanceMetric } from "@/types/database";

import { runOperator } from "../runtime";
import { registerBuiltinTools } from "../tools";
import { ToolRegistry, type AgentTool, type ToolExecutionContext } from "../types";
import type { OperatorEvent } from "../events";
import { registerModuleTools } from "./index";

/* ------------------------------- fixtures --------------------------------- */

const ctx: ToolExecutionContext = { userId: "u" };

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function buildReport(): ResearchReport {
  return researchReportSchema.parse({
    query: { query: "near-retirees worried about inflation" },
    segments: [
      {
        name: "Inflation-anxious near-retirees",
        demographics: { ageRange: "55-67", incomeBracket: "$80k-150k", location: "US" },
        psychographics: { painPoints: ["Inflation eroding savings", "Distrust of upsell newsletters"] },
        behaviors: { platforms: ["meta", "taboola"] },
        sizeEstimate: { range: "2.1M" },
      },
    ],
    painPoints: [{ summary: "Inflation eroding savings", quote: "my nest egg is shrinking" }],
    competitorAds: [{ platform: "meta", advertiser: "RivalCo", hooksUsed: ["fear", "urgency"], copy: "Beat inflation now" }],
    opportunities: [{ title: "No-upsell trust gap", type: "messaging_gap", rationale: "Competitors over-use greed hooks." }],
    sources: [{ provider: "search_intent", title: "SERP result", url: "https://example.com/a" }],
    providerRuns: [{ provider: "search_intent", status: "success", itemCount: 5 }],
  });
}

function buildCreativeView(id = "cr-1"): CreativeView {
  const content = assembleVariant(
    "meta",
    { primary_text: ["Tired of upsell-heavy retirement newsletters?"], headline: ["The No-Upsell Plan"], description: ["No hype, just income"] },
    { angle: "no-upsell trust", painPointsTargeted: ["Inflation eroding savings"] },
  );
  return {
    id,
    campaignId: "camp-1",
    platform: "meta",
    content,
    isFavorite: false,
    rating: null,
    version: 1,
    createdAt: "2026-06-30T00:00:00Z",
    updatedAt: "2026-06-30T00:00:00Z",
    images: [],
  };
}

function buildLandingPageView(status: "draft" | "deployed" = "draft"): LandingPageView {
  const document = landingDocumentSchema.parse({
    template: "squeeze",
    meta: { title: "Beat Inflation", brandName: "Retirement Income Weekly" },
    sections: [
      { id: "s1", type: "hero", label: "Hero", headline: "Beat Inflation in Retirement" },
      { id: "s2", type: "lead_form", label: "Get the guide" },
    ],
  });
  return {
    id: "lp-1",
    campaignId: "camp-1",
    slug: "beat-inflation",
    url: "/lp/beat-inflation",
    template: "squeeze",
    status,
    deployedAt: status === "deployed" ? "2026-06-30T00:00:00Z" : null,
    document,
    experiment: null,
    stats: { views: status === "deployed" ? 1200 : 0, leads: status === "deployed" ? 48 : 0, cvr: status === "deployed" ? 0.04 : 0 },
    createdAt: "2026-06-30T00:00:00Z",
    updatedAt: "2026-06-30T00:00:00Z",
  };
}

function buildCampaignRow(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "camp-1",
    user_id: "u",
    name: "Retirement Income Weekly",
    status: "active",
    brief: toJson({ objective: "leads", product: "newsletter", offer: "free guide", valueProps: ["No upsells"], personas: [] }),
    platform_config: toJson({ platforms: ["meta", "taboola"], recommendations: [], source: "seeded" }),
    budget: toJson({ total: 6000, currency: "USD", allocations: [], source: "seeded" }),
    persona_ids: toJson([]),
    created_at: "2026-06-22T12:00:00Z",
    updated_at: "2026-06-22T12:00:00Z",
    ...overrides,
  };
}

function buildMetricRow(overrides: Partial<PerformanceMetric> = {}): PerformanceMetric {
  return {
    id: `pm-${Math.random().toString(36).slice(2, 8)}`,
    campaign_id: DEMO_CAMPAIGN_ID,
    creative_id: "cr-1",
    user_id: "u",
    platform: "meta",
    date: "2026-06-20",
    impressions: 10_000,
    clicks: 240,
    conversions: 18,
    spend: 420,
    revenue: 2100,
    cpa: null,
    ctr: null,
    cvr: null,
    roas: null,
    created_at: "2026-06-20T00:00:00Z",
    ...overrides,
  };
}

function buildMetricRows(): PerformanceMetric[] {
  const rows: PerformanceMetric[] = [];
  for (let day = 1; day <= 20; day++) {
    const date = `2026-06-${String(day).padStart(2, "0")}`;
    rows.push(buildMetricRow({ id: `m-${day}`, date, platform: "meta", creative_id: "cr-1" }));
    rows.push(buildMetricRow({ id: `t-${day}`, date, platform: "taboola", creative_id: "cr-2", spend: 300, conversions: 9, revenue: 900 }));
  }
  return rows;
}

const assistantStub: CampaignBriefAssistant = {
  assist: vi.fn(),
  suggestPersonas: vi.fn(),
  recommendPlatforms: vi.fn(),
  allocateBudget: vi.fn(),
};

const briefResult = {
  objective: "leads",
  valueProps: ["No jargon, no upsells", "Income that keeps pace with inflation"],
  tone: "trustworthy, plain-English",
  personas: [
    { id: "ai:near-retirees:0", name: "Inflation-anxious near-retirees", summary: "Worried inflation outlasts savings", painPoints: ["Inflation eroding savings"], platforms: ["meta"], source: "ai" as const },
  ],
  platforms: [
    { platform: "meta" as const, fit: 88, rationale: "Detailed targeting reaches 55+." },
    { platform: "taboola" as const, fit: 80, rationale: "Native advertorials convert." },
    { platform: "google" as const, fit: 70, rationale: "Captures high-intent search." },
  ],
  budget: {
    total: 6000,
    currency: "USD",
    allocations: [
      { platform: "meta" as const, percent: 50, rationale: "Primary workhorse" },
      { platform: "taboola" as const, percent: 30, rationale: "Native scale" },
      { platform: "google" as const, percent: 20, rationale: "Intent capture" },
    ],
    source: "ai" as const,
  },
  source: "ai" as const,
};

/* ------------------------------- helpers ---------------------------------- */

let tools: Map<string, AgentTool>;

function getTool(name: string): AgentTool {
  const tool = tools.get(name);
  if (!tool) throw new Error(`tool not registered: ${name}`);
  return tool;
}

beforeAll(() => {
  const registry = new ToolRegistry();
  registerModuleTools(registry);
  tools = new Map(registry.list().map((tool) => [tool.name, tool]));
});

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(runResearchPipeline).mockResolvedValue(buildReport());
  vi.mocked(listResearchProjects).mockResolvedValue([
    { id: "proj-1", name: "Retirement Income Weekly", params: { query: "near-retirees" }, status: "complete", campaignId: null, createdAt: "", updatedAt: "", hasReport: true } satisfies ResearchProjectRecord,
  ]);
  vi.mocked(getResearchProjectWithReport).mockResolvedValue({ project: null, report: buildReport() });

  vi.mocked(getCampaignBriefAssistant).mockReturnValue(assistantStub);
  vi.mocked(assistantStub.assist).mockResolvedValue(briefResult);
  vi.mocked(assistantStub.recommendPlatforms).mockResolvedValue(briefResult.platforms);
  vi.mocked(assistantStub.allocateBudget).mockResolvedValue(briefResult.budget);
  vi.mocked(assistantStub.suggestPersonas).mockResolvedValue(briefResult.personas);

  vi.mocked(campaignService.create).mockImplementation(async (input) =>
    buildCampaignRow({
      id: "camp-new",
      name: input.name,
      status: input.status ?? "draft",
      brief: input.brief ?? {},
      platform_config: input.platform_config ?? {},
      budget: input.budget ?? {},
      persona_ids: input.persona_ids ?? [],
    }),
  );
  vi.mocked(campaignService.list).mockResolvedValue([buildCampaignRow()]);
  vi.mocked(campaignService.get).mockResolvedValue(buildCampaignRow());

  vi.mocked(generateCreatives).mockResolvedValue({ creatives: [buildCreativeView("cr-1"), buildCreativeView("cr-2")], source: "ai", batchId: "b1" });
  vi.mocked(regenerateCreative).mockResolvedValue(buildCreativeView("cr-1"));
  vi.mocked(creativeService.get).mockResolvedValue(null);

  vi.mocked(createLandingPage).mockResolvedValue({ page: buildLandingPageView("draft"), source: "ai" });
  vi.mocked(deployLandingPage).mockResolvedValue(buildLandingPageView("deployed"));

  vi.mocked(analyticsService.metrics).mockResolvedValue(buildMetricRows());
  vi.mocked(generateDailyBrief).mockResolvedValue({ content: "Spend $7.2k, 540 conversions, 5.0x ROAS.", source: "templated", confidence: 0.55, generatedAt: "2026-06-30T00:00:00Z" });
});

/* ------------------------------- registry --------------------------------- */

describe("registerModuleTools", () => {
  it("registers all module tools and is idempotent", () => {
    const registry = new ToolRegistry();
    registerModuleTools(registry);
    const names = registry.list().map((tool) => tool.name).sort();
    expect(names).toEqual(
      [
        "build_landing_page",
        "create_campaign",
        "daily_brief",
        "deploy_landing_page",
        "detect_anomalies",
        "generate_creatives",
        "get_campaign",
        "get_performance_summary",
        "get_personas",
        "get_recommendations",
        "list_campaigns",
        "proactive_briefing",
        "recommend_platforms",
        "regenerate_creative",
        "research_audience",
        "score_creative",
        "suggest_budget",
      ].sort(),
    );
    expect(() => registerModuleTools(registry)).not.toThrow();
    expect(registry.list()).toHaveLength(names.length);
  });

  it("lists built-ins + module tools together on one registry", () => {
    const registry = new ToolRegistry();
    registerBuiltinTools(registry);
    registerModuleTools(registry);
    expect(registry.has("navigate")).toBe(true);
    expect(registry.has("research_audience")).toBe(true);
    expect(registry.byCategory("research").map((t) => t.name).sort()).toEqual(["get_personas", "research_audience"]);
    expect(registry.list().length).toBeGreaterThanOrEqual(20);
  });
});

/* ------------------------------- research --------------------------------- */

describe("research tools", () => {
  it("research_audience returns a citation-rich report artifact", async () => {
    const result = await getTool("research_audience").execute({ query: "near-retirees worried about inflation" }, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("research-report");
    const data = result.artifact?.data as { personas: unknown[]; painPoints: unknown[]; sourceCount: number };
    expect(data.personas.length).toBeGreaterThan(0);
    expect(data.painPoints.length).toBeGreaterThan(0);
    expect(data.sourceCount).toBe(1);
  });

  it("research_audience fails safe when the pipeline throws", async () => {
    vi.mocked(runResearchPipeline).mockRejectedValueOnce(new Error("brightdata down"));
    const result = await getTool("research_audience").execute({ query: "near-retirees" }, ctx);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("brightdata down");
  });

  it("get_personas reads the latest project's personas", async () => {
    const result = await getTool("get_personas").execute({}, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("personas");
    expect((result.artifact?.data as { personas: unknown[] }).personas.length).toBeGreaterThan(0);
  });

  it("get_personas fails safe when no project has a report", async () => {
    vi.mocked(listResearchProjects).mockResolvedValueOnce([]);
    const result = await getTool("get_personas").execute({}, ctx);
    expect(result.ok).toBe(false);
  });
});

/* ------------------------------- campaign --------------------------------- */

describe("campaign tools", () => {
  it("create_campaign drafts + persists a campaign and returns a campaign artifact", async () => {
    const result = await getTool("create_campaign").execute(
      { name: "Retirement Income Weekly", product: "retirement income newsletter", painPoints: ["Inflation eroding savings"] },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("campaign");
    const data = result.artifact?.data as { id: string; objective: string; platforms: string[] };
    expect(data.id).toBe("camp-new");
    expect(data.objective).toBe("leads");
    expect(data.platforms.length).toBeGreaterThan(0);
    expect(vi.mocked(assistantStub.assist)).toHaveBeenCalled();
    expect(vi.mocked(campaignService.create)).toHaveBeenCalled();
  });

  it("create_campaign fails safe when persistence throws", async () => {
    vi.mocked(campaignService.create).mockRejectedValueOnce(new Error("db offline"));
    const result = await getTool("create_campaign").execute({ name: "Campaign", product: "newsletter" }, ctx);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("db offline");
  });

  it("recommend_platforms returns ranked platform fit", async () => {
    const result = await getTool("recommend_platforms").execute({ product: "newsletter" }, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("platform-recommendations");
    expect((result.artifact?.data as { recommendations: unknown[] }).recommendations.length).toBe(3);
  });

  it("recommend_platforms fails safe when the assistant throws", async () => {
    vi.mocked(assistantStub.recommendPlatforms).mockRejectedValueOnce(new Error("nope"));
    const result = await getTool("recommend_platforms").execute({ product: "newsletter" }, ctx);
    expect(result.ok).toBe(false);
  });

  it("suggest_budget returns allocations with computed amounts", async () => {
    const result = await getTool("suggest_budget").execute({ product: "newsletter", budgetTotal: 6000 }, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("budget-plan");
    const data = result.artifact?.data as { allocations: { amount: number | null }[] };
    expect(data.allocations[0].amount).toBe(3000);
  });

  it("suggest_budget fails safe when the assistant throws", async () => {
    vi.mocked(assistantStub.allocateBudget).mockRejectedValueOnce(new Error("nope"));
    const result = await getTool("suggest_budget").execute({ product: "newsletter" }, ctx);
    expect(result.ok).toBe(false);
  });

  it("list_campaigns returns the roster", async () => {
    const result = await getTool("list_campaigns").execute({}, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("campaign-list");
    expect((result.artifact?.data as { total: number }).total).toBe(1);
  });

  it("list_campaigns fails safe when the service throws", async () => {
    vi.mocked(campaignService.list).mockRejectedValueOnce(new Error("boom"));
    const result = await getTool("list_campaigns").execute({}, ctx);
    expect(result.ok).toBe(false);
  });

  it("get_campaign returns a campaign, and errors on a missing id", async () => {
    const ok = await getTool("get_campaign").execute({ campaignId: "camp-1" }, ctx);
    expect(ok.ok).toBe(true);
    expect(ok.artifact?.type).toBe("campaign");

    vi.mocked(campaignService.get).mockResolvedValueOnce(null);
    const missing = await getTool("get_campaign").execute({ campaignId: "nope" }, ctx);
    expect(missing.ok).toBe(false);
  });
});

/* ------------------------------- creative --------------------------------- */

describe("creative tools", () => {
  it("generate_creatives returns hook-analyzed scored variants", async () => {
    const result = await getTool("generate_creatives").execute({ platform: "meta", painPoints: ["Inflation eroding savings"], count: 2 }, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("creative-set");
    const data = result.artifact?.data as { variants: { hookType: string; score: number; grade: string }[]; source: string };
    expect(data.variants).toHaveLength(2);
    expect(data.variants[0].grade).toMatch(/[A-D]/);
    expect(data.source).toBe("ai");
  });

  it("generate_creatives fails safe when generation throws", async () => {
    vi.mocked(generateCreatives).mockRejectedValueOnce(new Error("azure down"));
    const result = await getTool("generate_creatives").execute({ platform: "meta" }, ctx);
    expect(result.ok).toBe(false);
  });

  it("score_creative scores ad-hoc copy", async () => {
    const result = await getTool("score_creative").execute(
      { platform: "meta", headline: "Beat Inflation in Retirement", body: "Get the plain-English income plan. Download free.", cta: "Get the guide" },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("creative-score");
    const data = result.artifact?.data as { total: number; breakdown: Record<string, number> };
    expect(data.total).toBeGreaterThanOrEqual(0);
    expect(data.total).toBeLessThanOrEqual(100);
    expect(Object.keys(data.breakdown)).toContain("hookStrength");
  });

  it("score_creative scores an existing creative by id", async () => {
    const view = buildCreativeView("cr-9");
    vi.mocked(creativeService.get).mockResolvedValueOnce(buildCampaignToCreativeRow(view));
    const result = await getTool("score_creative").execute({ creativeId: "cr-9" }, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("creative-score");
  });

  it("score_creative errors without a creativeId or copy", async () => {
    const result = await getTool("score_creative").execute({ platform: "meta" }, ctx);
    expect(result.ok).toBe(false);
  });

  it("score_creative errors on a missing creative", async () => {
    vi.mocked(creativeService.get).mockResolvedValueOnce(null);
    const result = await getTool("score_creative").execute({ creativeId: "ghost" }, ctx);
    expect(result.ok).toBe(false);
  });

  it("regenerate_creative returns a single regenerated variant", async () => {
    const result = await getTool("regenerate_creative").execute({ creativeId: "cr-1" }, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("creative-set");
    const data = result.artifact?.data as { variants: unknown[]; regenerated: boolean };
    expect(data.variants).toHaveLength(1);
    expect(data.regenerated).toBe(true);
  });

  it("regenerate_creative fails safe when the studio throws", async () => {
    vi.mocked(regenerateCreative).mockRejectedValueOnce(new Error("not found"));
    const result = await getTool("regenerate_creative").execute({ creativeId: "x" }, ctx);
    expect(result.ok).toBe(false);
  });
});

/* ------------------------------- landing ---------------------------------- */

describe("landing tools", () => {
  it("build_landing_page returns a draft page artifact", async () => {
    const result = await getTool("build_landing_page").execute({ template: "squeeze", angle: "inflation protection" }, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("landing-page");
    const data = result.artifact?.data as { deployed: boolean; sections: unknown[]; headline: string };
    expect(data.deployed).toBe(false);
    expect(data.sections.length).toBe(2);
    expect(data.headline).toContain("Inflation");
  });

  it("build_landing_page fails safe when generation throws", async () => {
    vi.mocked(createLandingPage).mockRejectedValueOnce(new Error("template missing"));
    const result = await getTool("build_landing_page").execute({ template: "squeeze" }, ctx);
    expect(result.ok).toBe(false);
  });

  it("deploy_landing_page returns a live page with its URL", async () => {
    const result = await getTool("deploy_landing_page").execute({ pageId: "lp-1" }, ctx);
    expect(result.ok).toBe(true);
    const data = result.artifact?.data as { deployed: boolean; url: string };
    expect(data.deployed).toBe(true);
    expect(data.url).toBe("/lp/beat-inflation");
  });

  it("deploy_landing_page fails safe when deploy throws", async () => {
    vi.mocked(deployLandingPage).mockRejectedValueOnce(new Error("not found"));
    const result = await getTool("deploy_landing_page").execute({ pageId: "ghost" }, ctx);
    expect(result.ok).toBe(false);
  });
});

/* ------------------------------- analytics -------------------------------- */

describe("analytics tools", () => {
  it("get_performance_summary rolls up totals + platforms", async () => {
    const result = await getTool("get_performance_summary").execute({}, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("analytics-summary");
    const data = result.artifact?.data as { summary: { spend: number }; platforms: unknown[] };
    expect(data.summary.spend).toBeGreaterThan(0);
    expect(data.platforms.length).toBe(2);
  });

  it("get_performance_summary fails safe when metrics throw", async () => {
    vi.mocked(analyticsService.metrics).mockRejectedValueOnce(new Error("db"));
    const result = await getTool("get_performance_summary").execute({}, ctx);
    expect(result.ok).toBe(false);
  });

  it("detect_anomalies returns a (possibly empty) findings artifact", async () => {
    const result = await getTool("detect_anomalies").execute({}, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("anomalies");
    expect(typeof (result.artifact?.data as { total: number }).total).toBe("number");
  });

  it("detect_anomalies fails safe when metrics throw", async () => {
    vi.mocked(analyticsService.metrics).mockRejectedValueOnce(new Error("db"));
    const result = await getTool("detect_anomalies").execute({}, ctx);
    expect(result.ok).toBe(false);
  });

  it("get_recommendations returns ranked actions", async () => {
    vi.mocked(creativeService.get).mockResolvedValue(buildCampaignToCreativeRow(buildCreativeView("cr-1")));
    const result = await getTool("get_recommendations").execute({}, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("recommendations");
  });

  it("get_recommendations fails safe when metrics throw", async () => {
    vi.mocked(analyticsService.metrics).mockRejectedValueOnce(new Error("db"));
    const result = await getTool("get_recommendations").execute({}, ctx);
    expect(result.ok).toBe(false);
  });

  it("daily_brief produces a brief from metrics", async () => {
    vi.mocked(creativeService.get).mockResolvedValue(buildCampaignToCreativeRow(buildCreativeView("cr-1")));
    const result = await getTool("daily_brief").execute({}, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("daily-brief");
    expect((result.artifact?.data as { content: string }).content.length).toBeGreaterThan(0);
    expect(vi.mocked(generateDailyBrief)).toHaveBeenCalled();
  });

  it("daily_brief errors when there are no metrics", async () => {
    vi.mocked(analyticsService.metrics).mockResolvedValueOnce([]);
    const result = await getTool("daily_brief").execute({}, ctx);
    expect(result.ok).toBe(false);
  });

  it("proactive_briefing fuses brief + anomalies + recommendations + next actions", async () => {
    vi.mocked(creativeService.get).mockResolvedValue(buildCampaignToCreativeRow(buildCreativeView("cr-1")));
    const result = await getTool("proactive_briefing").execute({}, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("proactive-briefing");
    const data = result.artifact?.data as { brief: { content: string }; nextActions: unknown[] };
    expect(data.brief.content.length).toBeGreaterThan(0);
    expect(Array.isArray(data.nextActions)).toBe(true);
  });

  it("proactive_briefing fails safe when metrics throw", async () => {
    vi.mocked(analyticsService.metrics).mockRejectedValueOnce(new Error("db"));
    const result = await getTool("proactive_briefing").execute({}, ctx);
    expect(result.ok).toBe(false);
  });
});

/* ------------------------------- e2e runtime ------------------------------ */

describe("runtime - full module-tool chain", () => {
  function collect(events: OperatorEvent[], type: OperatorEvent["type"]): OperatorEvent[] {
    return events.filter((event) => event.type === type);
  }

  it("demo mode walks the golden path: research -> creatives -> landing -> analytics, artifacts in order", async () => {
    const registry = new ToolRegistry();
    registerBuiltinTools(registry);
    registerModuleTools(registry);

    let counter = 0;
    const events: OperatorEvent[] = [];
    for await (const event of runOperator(
      { message: "Launch a campaign for near-retirees worried about inflation" },
      { userId: "u" },
      { registry, forceMode: "demo", idGen: () => `id-${++counter}` },
    )) {
      events.push(event);
    }

    // Tools executed for real (mocked services) and produced ok results in order.
    const toolResults = collect(events, "tool-result") as Extract<OperatorEvent, { type: "tool-result" }>[];
    const toolOrder = toolResults.map((event) => event.name);
    expect(toolOrder).toEqual(["research_audience", "generate_creatives", "build_landing_page", "get_performance_summary"]);
    expect(toolResults.every((event) => event.result.ok)).toBe(true);

    // Artifacts accumulated in the same order.
    const artifactTypes = (collect(events, "artifact") as Extract<OperatorEvent, { type: "artifact" }>[]).map((event) => event.artifact.type);
    expect(artifactTypes).toEqual(["research-report", "creative-set", "landing-page", "analytics-summary"]);

    // The run completed successfully end to end.
    expect(events[events.length - 1]).toMatchObject({ type: "run-finish", status: "completed" });

    // The research pain points were threaded into creative generation.
    const generateArgs = (collect(events, "tool-call") as Extract<OperatorEvent, { type: "tool-call" }>[]).find((event) => event.name === "generate_creatives")?.args as { painPoints?: string[] };
    expect(generateArgs.painPoints).toContain("Inflation eroding savings");
  });

  it("executes an explicit multi-tool plan from an injected model stream", async () => {
    const registry = new ToolRegistry();
    registerModuleTools(registry);

    const script = [
      { name: "research_audience", input: { query: "near-retirees" } },
      { name: "create_campaign", input: { name: "RIW", product: "newsletter" } },
      { name: "generate_creatives", input: { platform: "meta", count: 1 } },
    ];

    const events: OperatorEvent[] = [];
    for await (const event of runOperator(
      { message: "build it" },
      { userId: "u" },
      {
        registry,
        forceMode: "live",
        idGen: counterGen(),
        generatePlan: async () => ({
          goal: "build it",
          steps: script.map((step, index) => ({ id: `step-${index + 1}`, title: step.name, tool: step.name, status: "pending" as const })),
        }),
        createModelStream: () => ({
          parts: (async function* generate() {
            for (const { name, input } of script) {
              const id = `call-${name}`;
              yield { type: "tool-call" as const, toolCallId: id, toolName: name, input };
              const output = await registry.get(name)!.execute(input, { userId: "u" });
              yield { type: "tool-result" as const, toolCallId: id, toolName: name, output };
            }
            yield { type: "finish" as const };
          })(),
        }),
      },
    )) {
      events.push(event);
    }

    const order = (events.filter((e) => e.type === "tool-result") as Extract<OperatorEvent, { type: "tool-result" }>[]).map((e) => e.name);
    expect(order).toEqual(["research_audience", "create_campaign", "generate_creatives"]);
    const artifactTypes = (events.filter((e) => e.type === "artifact") as Extract<OperatorEvent, { type: "artifact" }>[]).map((e) => e.artifact.type);
    expect(artifactTypes).toEqual(["research-report", "campaign", "creative-set"]);
    expect(events[events.length - 1]).toMatchObject({ type: "run-finish", status: "completed" });
  });
});

function counterGen(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

/** Wrap a CreativeView's content into a `creatives` row for `creativeService.get`. */
function buildCampaignToCreativeRow(view: CreativeView) {
  return {
    id: view.id,
    campaign_id: view.campaignId,
    user_id: "u",
    platform: view.platform,
    type: view.content.format,
    content: toJson(view.content),
    hook_type: view.content.hook.type,
    hook_confidence: view.content.hook.confidence,
    score: view.content.score.total,
    is_favorite: false,
    rating: null,
    version: view.version,
    created_at: view.createdAt,
    updated_at: view.updatedAt,
  };
}
