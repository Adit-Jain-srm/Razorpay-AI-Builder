import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/azure", () => ({ generateChat: vi.fn() }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, isAzureConfigured: vi.fn() };
});

import { generateChat } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";

import { generateLandingDocument } from "./generate";
import type { LandingContext } from "./templates";
import type { HeroSection } from "./types";

const mockChat = vi.mocked(generateChat);
const mockConfigured = vi.mocked(isAzureConfigured);

const ctx: LandingContext = {
  brandName: "Acme",
  vertical: "developer tooling",
  painPoints: ["Slow CI pipelines"],
  benefits: ["10x faster builds"],
};

function heroOf(sections: { type: string }[]): HeroSection | undefined {
  return sections.find((s): s is HeroSection => s.type === "hero");
}

describe("generateLandingDocument", () => {
  beforeEach(() => {
    mockConfigured.mockReset();
    mockChat.mockReset();
  });

  it("returns a seeded document (no AI call) when Azure is unconfigured", async () => {
    mockConfigured.mockReturnValue(false);
    const result = await generateLandingDocument({ template: "squeeze", context: ctx });
    expect(result.source).toBe("seeded");
    expect(mockChat).not.toHaveBeenCalled();
    expect(result.document.sections.length).toBeGreaterThan(0);
  });

  it("parses strict-JSON model output and applies it (source = ai)", async () => {
    mockConfigured.mockReturnValue(true);
    mockChat.mockResolvedValue({ text: JSON.stringify({ heroHeadline: "From the model", ctaLabel: "Start now" }) });

    const result = await generateLandingDocument({ template: "squeeze", context: ctx });
    expect(result.source).toBe("ai");
    expect(heroOf(result.document.sections)?.headline).toBe("From the model");
  });

  it("tolerates fenced JSON with surrounding prose", async () => {
    mockConfigured.mockReturnValue(true);
    mockChat.mockResolvedValue({ text: 'Here you go:\n```json\n{ "heroHeadline": "Fenced headline" }\n```\nThanks!' });

    const result = await generateLandingDocument({ template: "squeeze", context: ctx });
    expect(result.source).toBe("ai");
    expect(heroOf(result.document.sections)?.headline).toBe("Fenced headline");
  });

  it("falls back to seeded copy when the model output has no JSON", async () => {
    mockConfigured.mockReturnValue(true);
    mockChat.mockResolvedValue({ text: "I cannot help with that." });

    const result = await generateLandingDocument({ template: "squeeze", context: ctx });
    expect(result.source).toBe("seeded");
  });

  it("falls back to seeded copy when the AI call throws", async () => {
    mockConfigured.mockReturnValue(true);
    mockChat.mockRejectedValue(new Error("Azure timeout"));

    const result = await generateLandingDocument({ template: "long_form_sales", context: ctx });
    expect(result.source).toBe("seeded");
    expect(result.document.template).toBe("long_form_sales");
  });
});
