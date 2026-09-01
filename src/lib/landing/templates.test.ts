import { beforeEach, describe, expect, it } from "vitest";

import {
  buildLandingDocument,
  detectFinance,
  resetSectionSequence,
  varySectionCopy,
  TEMPLATE_ORDER,
  type LandingContext,
} from "./templates";
import { landingDocumentSchema, type LandingSection } from "./types";

const FINANCE_CTX: LandingContext = {
  brandName: "Retirement Income Weekly",
  vertical: "financial newsletter for near-retirees",
  productName: "Retirement Income Weekly",
  angle: "no-upsell trust",
  audience: "near-retirees",
  painPoints: ["Inflation eroding savings", "Distrust of upsell-heavy newsletters"],
  benefits: ["A plain-English plan", "Beat inflation"],
  offer: "the free 2026 guide",
};

const SAAS_CTX: LandingContext = {
  brandName: "Shipfast",
  vertical: "developer tooling",
  painPoints: ["Slow CI pipelines"],
  benefits: ["10x faster builds"],
};

beforeEach(() => resetSectionSequence(0));

describe("buildLandingDocument", () => {
  it("produces a schema-valid document for all 5 templates", () => {
    for (const template of TEMPLATE_ORDER) {
      const doc = buildLandingDocument(template, FINANCE_CTX);
      const parsed = landingDocumentSchema.safeParse(doc);
      expect(parsed.success, `${template} should be valid`).toBe(true);
      expect(doc.template).toBe(template);
      // Every template captures leads.
      expect(doc.sections.some((s) => s.type === "lead_form")).toBe(true);
      // Every template opens with a hero.
      expect(doc.sections[0].type).toBe("hero");
    }
  });

  it("auto-includes a compliance block for finance verticals", () => {
    const doc = buildLandingDocument("squeeze", FINANCE_CTX);
    const compliance = doc.sections.find((s) => s.type === "compliance");
    expect(compliance).toBeDefined();
    expect(doc.meta.isFinance).toBe(true);
    if (compliance && compliance.type === "compliance") {
      expect(compliance.disclaimers.length).toBeGreaterThan(0);
    }
  });

  it("omits compliance for non-finance verticals", () => {
    const doc = buildLandingDocument("squeeze", SAAS_CTX);
    expect(doc.sections.some((s) => s.type === "compliance")).toBe(false);
    expect(doc.meta.isFinance).toBe(false);
  });

  it("maps an AI copy spec onto the sections", () => {
    const doc = buildLandingDocument("squeeze", FINANCE_CTX, {
      copy: { heroHeadline: "Custom AI headline", ctaLabel: "Grab it now" },
      source: "ai",
    });
    const hero = doc.sections.find((s): s is Extract<LandingSection, { type: "hero" }> => s.type === "hero");
    expect(hero?.headline).toBe("Custom AI headline");
    expect(doc.source).toBe("ai");
  });

  it("gives the VSL template a video hero + urgency + testimonials", () => {
    const doc = buildLandingDocument("long_form_sales", FINANCE_CTX);
    const hero = doc.sections.find((s) => s.type === "hero");
    expect(hero && hero.type === "hero" ? hero.media : null).toBe("video");
    expect(doc.sections.some((s) => s.type === "countdown")).toBe(true);
    expect(doc.sections.some((s) => s.type === "testimonials")).toBe(true);
  });

  it("gives the quiz funnel an interactive quiz", () => {
    const doc = buildLandingDocument("quiz_funnel", FINANCE_CTX);
    const quiz = doc.sections.find((s) => s.type === "quiz");
    expect(quiz).toBeDefined();
    if (quiz && quiz.type === "quiz") expect(quiz.questions.length).toBeGreaterThan(0);
  });
});

describe("detectFinance", () => {
  it("flags finance content from the vertical or pain points", () => {
    expect(detectFinance("financial newsletter", [])).toBe(true);
    expect(detectFinance("general", ["worried about my retirement savings"])).toBe(true);
    expect(detectFinance("developer tooling", ["slow builds"])).toBe(false);
  });
});

describe("varySectionCopy", () => {
  it("changes the hero copy deterministically per nonce", () => {
    const doc = buildLandingDocument("squeeze", FINANCE_CTX);
    const hero = doc.sections.find((s) => s.type === "hero")!;
    const varied = varySectionCopy(hero, FINANCE_CTX, 1);
    expect(varied.type).toBe("hero");
    if (hero.type === "hero" && varied.type === "hero") {
      expect(varied.headline).not.toBe(hero.headline);
      expect(varied.id).toBe(hero.id);
    }
  });
});
