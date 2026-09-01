import { describe, expect, it } from "vitest";

import { briefSchema, budgetPlanSchema, platformConfigSchema, totalAllocationPercent } from "./brief";
import { applyTemplate, CAMPAIGN_TEMPLATES, getTemplate } from "./templates";

describe("CAMPAIGN_TEMPLATES", () => {
  it("ships the three required verticals", () => {
    expect(CAMPAIGN_TEMPLATES.map((t) => t.id).sort()).toEqual(["ecommerce", "financial-newsletter", "saas"]);
  });

  for (const template of CAMPAIGN_TEMPLATES) {
    describe(template.id, () => {
      it("has a schema-valid brief, platform config, and budget", () => {
        expect(briefSchema.safeParse(template.brief).success).toBe(true);
        expect(platformConfigSchema.safeParse(template.platformConfig).success).toBe(true);
        expect(budgetPlanSchema.safeParse(template.budget).success).toBe(true);
      });

      it("budget allocations sum to 100", () => {
        expect(totalAllocationPercent(template.budget.allocations)).toBe(100);
      });

      it("only allocates to selected platforms", () => {
        const selected = new Set(template.platformConfig.platforms);
        for (const allocation of template.budget.allocations) {
          expect(selected.has(allocation.platform)).toBe(true);
        }
      });

      it("recommendations are ranked highest-fit first", () => {
        const fits = template.platformConfig.recommendations.map((r) => r.fit);
        const sorted = [...fits].sort((a, b) => b - a);
        expect(fits).toEqual(sorted);
      });
    });
  }
});

describe("applyTemplate", () => {
  it("returns a deep-cloned, ready-to-edit seed", () => {
    const seed = applyTemplate("financial-newsletter");
    expect(seed).not.toBeNull();
    expect(seed?.name).toBe("Retirement Income Weekly");
    expect(seed?.brief.personas.length).toBeGreaterThan(0);

    // Mutating the seed must not corrupt the shared template constant.
    seed!.brief.objective = "mutated";
    expect(getTemplate("financial-newsletter")?.brief.objective).toBe("leads");
  });

  it("returns null for an unknown template id", () => {
    expect(applyTemplate("does-not-exist")).toBeNull();
  });
});
