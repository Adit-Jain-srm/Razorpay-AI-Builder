import { describe, expect, it } from "vitest";

import { ensureUniqueSlug, slugify } from "./slug";

describe("slugify", () => {
  it("produces a url-safe, lowercase, hyphenated slug", () => {
    expect(slugify("Retirement Income Weekly!")).toBe("retirement-income-weekly");
  });

  it("strips diacritics", () => {
    expect(slugify("Über Café")).toBe("uber-cafe");
  });

  it("collapses punctuation and trims hyphens", () => {
    expect(slugify("  --Beat   Inflation?? --  ")).toBe("beat-inflation");
  });

  it("falls back to 'page' for empty input", () => {
    expect(slugify("")).toBe("page");
    expect(slugify("!!!")).toBe("page");
  });
});

describe("ensureUniqueSlug", () => {
  it("returns the base slug when it is free", async () => {
    const slug = await ensureUniqueSlug("Fresh Page", async () => false);
    expect(slug).toBe("fresh-page");
  });

  it("appends an incrementing suffix on collision", async () => {
    const taken = new Set(["fresh-page", "fresh-page-2"]);
    const slug = await ensureUniqueSlug("Fresh Page", (candidate) => taken.has(candidate));
    expect(slug).toBe("fresh-page-3");
  });

  it("falls back to a random suffix if it cannot find a free slug in bounds", async () => {
    const slug = await ensureUniqueSlug("Taken", async () => true, 5);
    expect(slug.startsWith("taken-")).toBe(true);
    expect(slug).not.toBe("taken");
  });
});
