import { describe, expect, it } from "vitest";

import { cleanReferrer, parseUtm } from "./utm";

describe("parseUtm", () => {
  it("extracts UTM params + click ids from a query string", () => {
    const utm = parseUtm("?utm_source=facebook&utm_medium=cpc&utm_campaign=retire&gclid=abc123");
    expect(utm).toEqual({
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "retire",
      gclid: "abc123",
    });
  });

  it("parses a full URL", () => {
    const utm = parseUtm("https://example.com/lp/x?utm_source=newsletter&utm_content=hero");
    expect(utm).toEqual({ utm_source: "newsletter", utm_content: "hero" });
  });

  it("accepts URLSearchParams and plain objects", () => {
    expect(parseUtm(new URLSearchParams("utm_term=inflation"))).toEqual({ utm_term: "inflation" });
    expect(parseUtm({ utm_source: "x", unrelated: "drop-me" })).toEqual({ utm_source: "x" });
  });

  it("ignores non-UTM keys and drops blank values", () => {
    expect(parseUtm("?ref=spam&utm_source=&utm_medium=email")).toEqual({ utm_medium: "email" });
  });

  it("returns an empty object for empty / nullish input", () => {
    expect(parseUtm("")).toEqual({});
    expect(parseUtm(null)).toEqual({});
    expect(parseUtm(undefined)).toEqual({});
  });

  it("caps absurdly long values", () => {
    const long = "x".repeat(1000);
    expect(parseUtm(`?utm_source=${long}`).utm_source?.length).toBe(256);
  });
});

describe("cleanReferrer", () => {
  it("strips query + hash, keeping origin + path", () => {
    expect(cleanReferrer("https://google.com/search?q=retirement#top")).toBe("https://google.com/search");
  });

  it("returns null for empty / nullish referrers", () => {
    expect(cleanReferrer(null)).toBeNull();
    expect(cleanReferrer("")).toBeNull();
    expect(cleanReferrer(undefined)).toBeNull();
  });

  it("passes through non-URL strings (trimmed + capped)", () => {
    expect(cleanReferrer("  android-app://com.example  ")).toBe("android-app://com.example");
  });
});
