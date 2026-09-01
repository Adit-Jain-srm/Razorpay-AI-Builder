import { describe, expect, it } from "vitest";

import { assembleFromFields, assembleVariant } from "./assemble";
import { getPlatformSpec } from "./platforms";

describe("assembleVariant", () => {
  it("enforces limits, denormalizes display fields, and classifies + scores", () => {
    const content = assembleVariant(
      "meta",
      {
        primary_text: ["Warning: inflation is quietly destroying your nest egg. Get the plain-English plan."],
        headline: ["This headline is intentionally far longer than forty characters to force truncation"],
        description: ["No hype"],
      },
      { angle: "Trust", painPointsTargeted: ["Inflation fear"] },
    );

    const headline = content.fields.find((f) => f.role === "headline")!;
    expect(headline.length).toBeLessThanOrEqual(40);
    expect(headline.truncated).toBe(true);
    expect(content.flags).toContain("truncated");

    expect(content.headline).toBe(headline.text);
    expect(content.body).toContain("inflation");
    expect(content.hook.type).toBe("fear");
    expect(content.score.total).toBeGreaterThan(0);
    expect(content.angle).toBe("Trust");
  });

  it("flags an incomplete variant when required fields are missing", () => {
    const content = assembleVariant("meta", { primary_text: [""], headline: [""] });
    expect(content.flags).toContain("incomplete");
  });

  it("respects per-role max counts for RSA", () => {
    const headlines = Array.from({ length: 20 }, (_, i) => `Headline option ${i}`);
    const content = assembleVariant("google", { headline: headlines, description: ["One", "Two"] });
    const max = getPlatformSpec("google").roles.find((r) => r.role === "headline")!.max;
    expect(content.fields.filter((f) => f.role === "headline").length).toBeLessThanOrEqual(max);
  });
});

describe("assembleFromFields", () => {
  it("re-enforces limits on edited fields", () => {
    const original = assembleVariant("meta", {
      primary_text: ["Original primary text"],
      headline: ["Original headline"],
    });
    const edited = original.fields.map((f) =>
      f.role === "headline" ? { ...f, text: "An edited headline that is now far too long to fit within the limit" } : f,
    );
    const next = assembleFromFields("meta", edited);
    const headline = next.fields.find((f) => f.role === "headline")!;
    expect(headline.length).toBeLessThanOrEqual(headline.limit);
    expect(headline.truncated).toBe(true);
  });
});
