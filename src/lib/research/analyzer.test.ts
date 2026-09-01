import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/azure", () => ({ generateChat: vi.fn() }));
vi.mock("@/lib/env", () => ({ isAzureConfigured: vi.fn(() => false) }));

import { generateChat } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";

import { AiResearchAnalyzer, extractJsonBlock, type AnalyzeInput } from "./analyzer";
import { buildSeededReport } from "./fixtures";

const mockedGenerate = vi.mocked(generateChat);
const mockedAzure = vi.mocked(isAzureConfigured);

const result = buildSeededReport();
const input: AnalyzeInput = { params: result.query, result };

const VALID_PERSONA_JSON = JSON.stringify([
  {
    name: "Synth Persona",
    demographics: { ageRange: "58-64" },
    psychographics: { values: ["security"], interests: ["dividends"], painPoints: ["inflation"], aspirations: ["retire on time"] },
    behaviors: { platforms: ["facebook"], contentConsumption: [], purchasePatterns: [] },
    sizeEstimate: { range: "1M", confidence: 0.5 },
  },
]);

describe("AiResearchAnalyzer.synthesizePersonas", () => {
  beforeEach(() => {
    mockedAzure.mockReturnValue(false);
    mockedGenerate.mockReset();
  });

  it("uses seeded fallback (no model call) when Azure is unconfigured", async () => {
    const personas = await new AiResearchAnalyzer().synthesizePersonas(input);
    expect(personas.length).toBeGreaterThan(0);
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it("parses + validates valid model JSON and attaches real citations", async () => {
    mockedAzure.mockReturnValue(true);
    mockedGenerate.mockResolvedValue({ text: VALID_PERSONA_JSON });

    const personas = await new AiResearchAnalyzer().synthesizePersonas(input);
    expect(personas).toHaveLength(1);
    expect(personas[0].name).toBe("Synth Persona");
    // Model must not fabricate sources; the analyzer attaches provider citations.
    expect(personas[0].sources.length).toBeGreaterThan(0);
  });

  it("falls back when the model returns non-JSON", async () => {
    mockedAzure.mockReturnValue(true);
    mockedGenerate.mockResolvedValue({ text: "I'm sorry, I cannot do that." });

    const personas = await new AiResearchAnalyzer().synthesizePersonas(input);
    expect(personas.length).toBeGreaterThan(0);
    expect(personas[0].name).not.toBe("Synth Persona");
  });

  it("falls back when the model call throws", async () => {
    mockedAzure.mockReturnValue(true);
    mockedGenerate.mockRejectedValue(new Error("rate limited"));

    const personas = await new AiResearchAnalyzer().synthesizePersonas(input);
    expect(personas.length).toBeGreaterThan(0);
  });
});

describe("AiResearchAnalyzer.detectOpportunities", () => {
  it("returns heuristic opportunities when Azure is off", async () => {
    mockedAzure.mockReturnValue(false);
    const ops = await new AiResearchAnalyzer().detectOpportunities(input);
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.every((o) => typeof o.type === "string")).toBe(true);
  });
});

describe("extractJsonBlock", () => {
  it("parses fenced JSON arrays", () => {
    expect(extractJsonBlock("```json\n[{\"a\":1}]\n```")).toEqual([{ a: 1 }]);
  });

  it("parses JSON embedded in prose", () => {
    expect(extractJsonBlock('here you go: {"a":1} done')).toEqual({ a: 1 });
  });

  it("throws on input without JSON", () => {
    expect(() => extractJsonBlock("no json here")).toThrow();
  });
});
