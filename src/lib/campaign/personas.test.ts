import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/research/service", () => ({
  getResearchProjectWithReport: vi.fn(),
  listResearchProjects: vi.fn(),
}));

import { getResearchProjectWithReport, listResearchProjects } from "@/lib/research/service";
import type { AudienceSegment } from "@/lib/research/standard-models";

import { listImportablePersonas, listResearchProjectOptions, segmentToSnapshot } from "./personas";

const mockedReport = vi.mocked(getResearchProjectWithReport);
const mockedList = vi.mocked(listResearchProjects);

const segment: AudienceSegment = {
  name: "Inflation-Anxious Pre-Retiree",
  demographics: { ageRange: "58-64", incomeBracket: "$75k-$150k", location: "US" },
  psychographics: {
    values: ["security"],
    interests: ["personal finance"],
    painPoints: ["Inflation eroding savings", "Distrust of newsletters"],
    aspirations: ["Retire on time"],
  },
  behaviors: { platforms: ["facebook", "youtube"], contentConsumption: [], purchasePatterns: [] },
  sizeEstimate: { range: "4M-5M", confidence: 0.55 },
  sources: [],
};

describe("segmentToSnapshot", () => {
  it("maps a research segment into a brief persona snapshot", () => {
    const snapshot = segmentToSnapshot(segment, "proj-1", 0);
    expect(snapshot.id).toBe("proj-1:inflation-anxious-pre-retiree:0");
    expect(snapshot.name).toBe("Inflation-Anxious Pre-Retiree");
    expect(snapshot.summary).toBe("Inflation eroding savings");
    expect(snapshot.ageRange).toBe("58-64");
    expect(snapshot.painPoints).toEqual(["Inflation eroding savings", "Distrust of newsletters"]);
    expect(snapshot.platforms).toEqual(["facebook", "youtube"]);
    expect(snapshot.source).toBe("research");
    expect(snapshot.researchProjectId).toBe("proj-1");
  });

  it("produces stable, index-suffixed ids for dedup", () => {
    expect(segmentToSnapshot(segment, "p", 0).id).not.toBe(segmentToSnapshot(segment, "p", 1).id);
  });
});

describe("listImportablePersonas", () => {
  beforeEach(() => {
    mockedReport.mockReset();
  });

  it("maps every report segment to a snapshot", async () => {
    mockedReport.mockResolvedValue({
      project: null,
      report: {
        query: { query: "x" },
        segments: [segment, { ...segment, name: "Self-Directed Dividend Seeker" }],
        competitorAds: [],
        trends: [],
        communityInsights: [],
        painPoints: [],
        buyingTriggers: [],
        opportunities: [],
        sources: [],
        providerRuns: [],
      },
    });

    const personas = await listImportablePersonas("proj-1");
    expect(personas).toHaveLength(2);
    expect(personas[1].name).toBe("Self-Directed Dividend Seeker");
    expect(personas.every((p) => p.source === "research")).toBe(true);
  });

  it("returns [] when the project has no report", async () => {
    mockedReport.mockResolvedValue({ project: null, report: null });
    expect(await listImportablePersonas("missing")).toEqual([]);
  });
});

describe("listResearchProjectOptions", () => {
  it("maps research projects to lightweight options", async () => {
    mockedList.mockResolvedValue([
      {
        id: "p1",
        name: "Retirement Income Weekly",
        params: { query: "near-retirees and inflation" },
        status: "complete",
        campaignId: null,
        createdAt: "2026-06-01",
        updatedAt: "2026-06-02",
        hasReport: true,
      },
    ]);

    const options = await listResearchProjectOptions();
    expect(options).toEqual([
      {
        id: "p1",
        name: "Retirement Income Weekly",
        query: "near-retirees and inflation",
        status: "complete",
        hasReport: true,
      },
    ]);
  });
});
