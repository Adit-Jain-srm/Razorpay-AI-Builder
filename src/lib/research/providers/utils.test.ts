import { describe, expect, it } from "vitest";

import {
  classifyHooks,
  dedupeBy,
  estimateVolumeFromRank,
  extractMarkdownBullets,
  extractMarkdownHeading,
  firstParagraph,
  firstSentence,
  inferCreativeType,
  inferPlatformFromUrl,
  roughSentiment,
  summarizePain,
} from "./utils";

describe("inferPlatformFromUrl", () => {
  it("maps known domains to platforms", () => {
    expect(inferPlatformFromUrl("https://www.facebook.com/ads/library/?q=x")).toBe("meta");
    expect(inferPlatformFromUrl("https://www.reddit.com/r/retirement")).toBe("reddit");
    expect(inferPlatformFromUrl("https://www.tiktok.com/@x")).toBe("tiktok");
    expect(inferPlatformFromUrl("https://x.com/x")).toBe("x");
    expect(inferPlatformFromUrl("https://www.cnbc.com/article")).toBe("news");
    expect(inferPlatformFromUrl(undefined)).toBe("web");
  });
});

describe("inferCreativeType", () => {
  it("classifies by URL", () => {
    expect(inferCreativeType("https://youtube.com/watch?v=1")).toBe("video");
    expect(inferCreativeType("https://www.taboola.com/x")).toBe("native");
    expect(inferCreativeType("https://www.google.com/search?q=x")).toBe("search");
  });
});

describe("classifyHooks", () => {
  it("detects direct-response hooks from copy", () => {
    const hooks = classifyHooks("Warning: inflation will destroy your nest egg before you retire");
    expect(hooks).toContain("fear");
  });

  it("detects trust + social proof", () => {
    const hooks = classifyHooks("Plain-English guide. Join 250,000 readers you can trust.");
    expect(hooks).toEqual(expect.arrayContaining(["trust"]));
  });

  it("returns empty for empty input and caps the list", () => {
    expect(classifyHooks(undefined)).toEqual([]);
    expect(classifyHooks("$5,000/month income secret revealed now before everyone", 2).length).toBeLessThanOrEqual(2);
  });
});

describe("roughSentiment", () => {
  it("is negative for distress language and positive for reassurance", () => {
    expect(roughSentiment("I'm terrified and anxious about losing my savings")).toBeLessThan(0);
    expect(roughSentiment("a safe, simple plan I can trust")).toBeGreaterThan(0);
    expect(roughSentiment("the meeting is at noon")).toBe(0);
  });
});

describe("text helpers", () => {
  it("firstSentence clips to one sentence", () => {
    expect(firstSentence("This is one. This is two.")).toBe("This is one.");
  });

  it("summarizePain strips first-person framing", () => {
    const summary = summarizePain("I'm terrified inflation will eat my savings.");
    expect(summary.toLowerCase()).not.toMatch(/^i'm/);
    expect(summary.length).toBeGreaterThan(0);
  });
});

describe("markdown helpers", () => {
  const md = `# Title\n\n## Subtitle\n\nA paragraph here.\n\n- bullet one (312 upvotes)\n- "quoted bullet" (97 upvotes)`;

  it("extracts headings by level", () => {
    expect(extractMarkdownHeading(md, 1)).toBe("Title");
    expect(extractMarkdownHeading(md, 2)).toBe("Subtitle");
  });

  it("extracts the first paragraph", () => {
    expect(firstParagraph(md)).toBe("A paragraph here.");
  });

  it("extracts bullets with upvote counts and strips quotes", () => {
    const bullets = extractMarkdownBullets(md);
    expect(bullets).toHaveLength(2);
    expect(bullets[0]).toEqual({ text: "bullet one", upvotes: 312 });
    expect(bullets[1]).toEqual({ text: "quoted bullet", upvotes: 97 });
  });
});

describe("estimateVolumeFromRank + dedupeBy", () => {
  it("volume decreases with rank", () => {
    expect(estimateVolumeFromRank(1)).toBeGreaterThan(estimateVolumeFromRank(5));
  });

  it("dedupes by key preserving first", () => {
    const out = dedupeBy([{ k: "a" }, { k: "a" }, { k: "b" }], (x) => x.k);
    expect(out).toHaveLength(2);
  });
});
