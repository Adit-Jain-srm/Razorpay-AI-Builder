import { describe, expect, it } from "vitest";

import type { CampaignRow } from "@/types/database";

import {
  allocationAmount,
  briefCompleteness,
  coerceStatus,
  decodeCampaign,
  formatCurrency,
  normalizeAllocations,
  personaIdsFromBrief,
  platformLabel,
  totalAllocationPercent,
  type BudgetAllocation,
} from "./brief";

function row(overrides: Partial<CampaignRow> = {}): CampaignRow {
  return {
    id: "c1",
    user_id: "u1",
    name: "Test campaign",
    status: "active",
    brief: {},
    platform_config: {},
    budget: {},
    persona_ids: [],
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("coerceStatus", () => {
  it("passes through known statuses", () => {
    expect(coerceStatus("active")).toBe("active");
    expect(coerceStatus("archived")).toBe("archived");
    expect(coerceStatus("draft")).toBe("draft");
  });

  it("defaults unknown/empty values to draft", () => {
    expect(coerceStatus("paused")).toBe("draft");
    expect(coerceStatus(null)).toBe("draft");
    expect(coerceStatus(undefined)).toBe("draft");
  });
});

describe("decodeCampaign", () => {
  it("decodes a rich row into the validated view", () => {
    const view = decodeCampaign(
      row({
        brief: {
          objective: "leads",
          product: "Newsletter",
          valueProps: ["a", "b"],
          personas: [{ id: "p1", name: "Persona One", painPoints: ["x"] }],
        },
        platform_config: { platforms: ["meta", "google"] },
        budget: { total: 5000, currency: "USD", allocations: [{ platform: "meta", percent: 100 }] },
        persona_ids: ["p1"],
      }),
    );

    expect(view.status).toBe("active");
    expect(view.brief.objective).toBe("leads");
    expect(view.brief.valueProps).toEqual(["a", "b"]);
    expect(view.brief.personas[0].name).toBe("Persona One");
    expect(view.platformConfig.platforms).toEqual(["meta", "google"]);
    expect(view.budget.total).toBe(5000);
    expect(view.personaIds).toEqual(["p1"]);
  });

  it("falls back to defaults for empty/garbage jsonb without throwing", () => {
    const view = decodeCampaign(row({ brief: null, platform_config: "nope", budget: 42, persona_ids: { bad: 1 } }));
    expect(view.brief.objective).toBe("");
    expect(view.brief.personas).toEqual([]);
    expect(view.platformConfig.platforms).toEqual([]);
    expect(view.budget.currency).toBe("USD");
    expect(view.personaIds).toEqual([]);
  });

  it("drops invalid platforms / personas during decode (lenient)", () => {
    const view = decodeCampaign(
      row({
        platform_config: { platforms: ["meta", "myspace"] },
        brief: { personas: [{ name: "missing id" }] },
      }),
    );
    // An invalid enum/array fails the whole field parse -> safe default.
    expect(view.platformConfig.platforms).toEqual([]);
    expect(view.brief.personas).toEqual([]);
  });
});

describe("normalizeAllocations", () => {
  const alloc = (platform: BudgetAllocation["platform"], percent: number): BudgetAllocation => ({
    platform,
    percent,
    rationale: "",
  });

  it("normalizes to exactly 100 preserving relative weight", () => {
    const out = normalizeAllocations([alloc("meta", 60), alloc("google", 30), alloc("tiktok", 10)]);
    expect(totalAllocationPercent(out)).toBe(100);
    expect(out[0].percent).toBeGreaterThan(out[1].percent);
  });

  it("splits an all-zero input evenly to 100", () => {
    const out = normalizeAllocations([alloc("meta", 0), alloc("google", 0)]);
    expect(totalAllocationPercent(out)).toBe(100);
    expect(out[0].percent).toBe(50);
    expect(out[1].percent).toBe(50);
  });

  it("folds rounding drift into the largest allocation", () => {
    const out = normalizeAllocations([alloc("meta", 1), alloc("google", 1), alloc("tiktok", 1)]);
    expect(totalAllocationPercent(out)).toBe(100);
  });

  it("returns empty for empty input", () => {
    expect(normalizeAllocations([])).toEqual([]);
  });
});

describe("helpers", () => {
  it("platformLabel maps known + unknown platforms", () => {
    expect(platformLabel("meta")).toBe("Meta");
    expect(platformLabel("tiktok")).toBe("TikTok");
    expect(platformLabel("snap")).toBe("Snap");
  });

  it("allocationAmount derives spend from total or null when unknown", () => {
    expect(allocationAmount({ platform: "meta", percent: 25, rationale: "" }, 4000)).toBe(1000);
    expect(allocationAmount({ platform: "meta", percent: 25, rationale: "" }, undefined)).toBeNull();
    expect(allocationAmount({ platform: "meta", percent: 25, rationale: "" }, 0)).toBeNull();
  });

  it("formatCurrency renders a rounded currency string", () => {
    expect(formatCurrency(6000, "USD")).toContain("6,000");
  });

  it("personaIdsFromBrief reads ids off the snapshots", () => {
    const view = decodeCampaign(
      row({ brief: { personas: [{ id: "a", name: "A" }, { id: "b", name: "B" }] } }),
    );
    expect(personaIdsFromBrief(view.brief)).toEqual(["a", "b"]);
  });

  it("briefCompleteness rewards a fuller brief", () => {
    const empty = decodeCampaign(row({ brief: {}, platform_config: {}, budget: {} }));
    const full = decodeCampaign(
      row({
        brief: {
          objective: "leads",
          product: "p",
          offer: "o",
          valueProps: ["v"],
          personas: [{ id: "p1", name: "P1" }],
        },
        platform_config: { platforms: ["meta"] },
        budget: { total: 5000 },
      }),
    );
    expect(briefCompleteness(empty)).toBeLessThan(briefCompleteness(full));
    expect(briefCompleteness(full)).toBe(100);
  });
});
