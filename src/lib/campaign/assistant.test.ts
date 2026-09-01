import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/azure", () => ({ generateChat: vi.fn() }));
vi.mock("@/lib/env", () => ({ isAzureConfigured: vi.fn(() => false) }));

import { generateChat } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";

import { totalAllocationPercent } from "./brief";
import {
  AiCampaignBriefAssistant,
  detectVertical,
  extractJson,
  seededAllocations,
  seededPlatforms,
  type BriefAssistInput,
} from "./assistant";

const mockedGenerate = vi.mocked(generateChat);
const mockedAzure = vi.mocked(isAzureConfigured);

const financeInput: BriefAssistInput = {
  product: "A retirement income newsletter for near-retirees worried about inflation",
  offer: "Free inflation-proof income blueprint",
  audience: "US near-retirees aged 58-67",
  goal: "leads",
};

const VALID_ASSIST_JSON = JSON.stringify({
  objective: "leads",
  valueProps: ["No jargon", "Inflation-protected income"],
  tone: "trustworthy",
  personas: [
    {
      name: "Inflation-Anxious Pre-Retiree",
      summary: "Fears inflation erodes savings",
      ageRange: "58-64",
      painPoints: ["inflation"],
      platforms: ["facebook"],
    },
  ],
  platforms: [
    { platform: "meta", fit: 88, rationale: "reach" },
    { platform: "google", fit: 76, rationale: "intent" },
  ],
  budget: {
    total: 6000,
    currency: "USD",
    allocations: [
      { platform: "meta", percent: 70, rationale: "primary" },
      { platform: "google", percent: 30, rationale: "intent" },
    ],
  },
});

describe("AiCampaignBriefAssistant.assist", () => {
  beforeEach(() => {
    mockedAzure.mockReturnValue(false);
    mockedGenerate.mockReset();
  });

  it("uses the seeded fallback (no model call) when Azure is unconfigured", async () => {
    const result = await new AiCampaignBriefAssistant().assist(financeInput);
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(result.source).toBe("seeded");
    expect(result.platforms.length).toBeGreaterThan(0);
    expect(result.personas.length).toBeGreaterThan(0);
    expect(totalAllocationPercent(result.budget.allocations)).toBe(100);
  });

  it("parses + validates valid model JSON and normalizes the budget", async () => {
    mockedAzure.mockReturnValue(true);
    mockedGenerate.mockResolvedValue({ text: VALID_ASSIST_JSON });

    const result = await new AiCampaignBriefAssistant().assist(financeInput);
    expect(result.source).toBe("ai");
    expect(result.objective).toBe("leads");
    expect(result.personas[0].name).toBe("Inflation-Anxious Pre-Retiree");
    expect(result.personas[0].source).toBe("ai");
    expect(result.personas[0].id.startsWith("ai:")).toBe(true);
    // Platforms ranked highest-fit first; budget normalized to 100.
    expect(result.platforms[0].platform).toBe("meta");
    expect(totalAllocationPercent(result.budget.allocations)).toBe(100);
  });

  it("falls back to seeded when the model returns non-JSON", async () => {
    mockedAzure.mockReturnValue(true);
    mockedGenerate.mockResolvedValue({ text: "Sorry, I can't help with that." });

    const result = await new AiCampaignBriefAssistant().assist(financeInput);
    expect(result.source).toBe("seeded");
    expect(result.platforms.length).toBeGreaterThan(0);
  });

  it("falls back to seeded when the model call throws", async () => {
    mockedAzure.mockReturnValue(true);
    mockedGenerate.mockRejectedValue(new Error("rate limited"));

    const result = await new AiCampaignBriefAssistant().assist(financeInput);
    expect(result.source).toBe("seeded");
  });

  it("never calls the model without a product description", async () => {
    mockedAzure.mockReturnValue(true);
    const result = await new AiCampaignBriefAssistant().assist({ product: "  " });
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(result.source).toBe("seeded");
  });
});

describe("seeded heuristics", () => {
  it("detects the finance vertical and favors Meta/Taboola over TikTok", () => {
    expect(detectVertical(financeInput)).toBe("finance");
    const recs = seededPlatforms(financeInput);
    const fit = (platform: string) => recs.find((r) => r.platform === platform)?.fit ?? 0;
    expect(fit("taboola")).toBeGreaterThan(fit("tiktok"));
    expect(fit("meta")).toBeGreaterThan(fit("tiktok"));
  });

  it("detects the saas vertical and favors LinkedIn/Google", () => {
    const recs = seededPlatforms({ product: "A B2B SaaS platform with an API for enterprise teams" });
    const fit = (platform: string) => recs.find((r) => r.platform === platform)?.fit ?? 0;
    expect(fit("linkedin")).toBeGreaterThan(fit("tiktok"));
    expect(fit("google")).toBeGreaterThan(fit("taboola"));
  });

  it("ranks recommendations highest-fit first and clamps to <= 98", () => {
    const recs = seededPlatforms(financeInput);
    const fits = recs.map((r) => r.fit);
    expect(fits).toEqual([...fits].sort((a, b) => b - a));
    expect(Math.max(...fits)).toBeLessThanOrEqual(98);
  });

  it("allocates budget across explicit platforms summing to 100", () => {
    const allocations = seededAllocations({ product: "thing", platforms: ["meta", "google", "tiktok"] });
    expect(allocations.map((a) => a.platform)).toEqual(["meta", "google", "tiktok"]);
    expect(totalAllocationPercent(allocations)).toBe(100);
  });
});

describe("extractJson", () => {
  it("parses fenced JSON objects", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("parses JSON embedded in prose", () => {
    expect(extractJson('result: {"a":1} thanks')).toEqual({ a: 1 });
  });

  it("throws when there is no JSON", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});
