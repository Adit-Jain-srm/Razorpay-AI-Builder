import { describe, expect, it } from "vitest";

import { assembleVariant } from "./assemble";
import {
  creativesToGoogleCsv,
  creativesToMetaCsv,
  escapeCsvCell,
  exportFilename,
  imageFilename,
  rowsToCsv,
  slugify,
} from "./export";

const googleCreative = assembleVariant(
  "google",
  {
    headline: ["Beat inflation, today", "Plain-English plan", "Protect your nest egg"],
    description: ["A clear description, with a comma.", "Income that keeps up with prices"],
    path: ["income"],
  },
  { angle: "Inflation protection" },
);

const metaCreative = assembleVariant(
  "meta",
  {
    primary_text: ['He said "no hype" and meant it'],
    headline: ["The No-Upsell Plan"],
    description: ["No jargon"],
  },
  { angle: "Trust" },
);

describe("escapeCsvCell", () => {
  it("quotes cells with commas, quotes, or newlines and doubles quotes", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("rowsToCsv", () => {
  it("joins rows with CRLF", () => {
    expect(rowsToCsv([["a", "b"], ["c", "d"]])).toBe("a,b\r\nc,d");
  });
});

describe("creativesToGoogleCsv", () => {
  const csv = creativesToGoogleCsv([googleCreative, metaCreative], { campaignName: "Retirement Income Weekly" });
  const lines = csv.split("\r\n");

  it("emits the RSA header and one row per google creative only", () => {
    expect(lines[0]).toContain("Headline 1");
    expect(lines[0]).toContain("Headline 15");
    expect(lines[0]).toContain("Description 4");
    expect(lines[0]).toContain("Final URL");
    expect(lines).toHaveLength(2); // header + 1 google creative (meta excluded)
  });

  it("includes the campaign + ad group and quotes commas in copy", () => {
    expect(lines[1]).toContain("Retirement Income Weekly");
    expect(lines[1]).toContain("Inflation protection");
    expect(csv).toContain('"A clear description, with a comma."');
    expect(csv).toContain("Responsive search ad");
  });
});

describe("creativesToMetaCsv", () => {
  const csv = creativesToMetaCsv([googleCreative, metaCreative], { campaignName: "Retirement Income Weekly" });
  const lines = csv.split("\r\n");

  it("emits the Meta header and one row per meta creative only", () => {
    expect(lines[0]).toBe("Campaign Name,Ad Set Name,Ad Name,Title,Body,Link Description,Website URL,Call to Action");
    expect(lines).toHaveLength(2);
  });

  it("maps headline -> Title and primary text -> Body, escaping quotes", () => {
    expect(lines[1]).toContain("The No-Upsell Plan");
    expect(csv).toContain('"He said ""no hype"" and meant it"');
    expect(lines[1]).toContain("LEARN_MORE");
  });
});

describe("filenames", () => {
  it("slugifies safely", () => {
    expect(slugify("Retirement Income Weekly!")).toBe("retirement-income-weekly");
    expect(slugify("")).toBe("export");
  });

  it("builds csv + image filenames", () => {
    expect(exportFilename("google", "Retirement Income")).toBe("retirement-income-google-ads.csv");
    expect(exportFilename("meta", "Retirement Income")).toBe("retirement-income-meta-ads.csv");
    expect(imageFilename("Retirement Income", "9:16", 0)).toBe("retirement-income-9x16-1.png");
  });
});
