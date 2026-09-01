import { afterEach, describe, expect, it, vi } from "vitest";

// Shared, hoisted mock state (vi.mock factories are hoisted above imports).
const mockState = vi.hoisted(() => ({ azureOn: false, streamText: "" }));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, isAzureConfigured: () => mockState.azureOn };
});

vi.mock("@/lib/ai/azure", () => ({
  streamChat: vi.fn(() => ({
    textStream: (async function* () {
      yield mockState.streamText;
    })(),
  })),
  generateChat: vi.fn(),
  generateImage: vi.fn(),
}));

import { generateCopy } from "./copy";

afterEach(() => {
  mockState.azureOn = false;
  mockState.streamText = "";
});

describe("generateCopy - seeded fallback (no Azure)", () => {
  it("returns seeded variants for the platform when Azure is unconfigured", async () => {
    const result = await generateCopy({ platform: "meta", count: 3 });
    expect(result.source).toBe("seeded");
    expect(result.variants.length).toBeGreaterThan(0);
    expect(result.variants.every((v) => v.platform === "meta")).toBe(true);
  });
});

describe("generateCopy - AI path (mocked stream)", () => {
  it("parses streamed JSON, enforces limits, and streams deltas", async () => {
    mockState.azureOn = true;
    mockState.streamText = JSON.stringify([
      {
        primaryText: "Inflation is eating your savings. Get the plain-English plan.",
        headline: "This headline is far too long to fit inside the forty character cap",
        description: "No hype",
      },
      { primaryText: "Join thousands of near-retirees who ditched the hype.", headline: "Protect Your Nest Egg", description: "Free guide" },
    ]);

    const deltas: string[] = [];
    const result = await generateCopy({ platform: "meta", count: 2, onDelta: (d) => deltas.push(d) });

    expect(result.source).toBe("ai");
    expect(result.variants).toHaveLength(2);
    expect(deltas.join("")).toContain("Protect Your Nest Egg");

    const headline = result.variants[0].fields.find((f) => f.role === "headline")!;
    expect(headline.length).toBeLessThanOrEqual(40);
    expect(headline.withinLimit).toBe(true);
    expect(headline.truncated).toBe(true);
  });

  it("caps the number of variants at the requested count", async () => {
    mockState.azureOn = true;
    mockState.streamText = JSON.stringify(
      Array.from({ length: 5 }, (_, i) => ({ primaryText: `Body ${i}`, headline: `Headline ${i}`, description: "" })),
    );
    const result = await generateCopy({ platform: "meta", count: 2 });
    expect(result.variants).toHaveLength(2);
  });

  it("falls back to seeded variants when the model returns no JSON", async () => {
    mockState.azureOn = true;
    mockState.streamText = "Sorry, I cannot help with that.";
    const result = await generateCopy({ platform: "meta", count: 2 });
    expect(result.source).toBe("seeded");
    expect(result.variants.length).toBeGreaterThan(0);
  });
});
