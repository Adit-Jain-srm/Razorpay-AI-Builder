import { describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/errors";
import { DEMO_CAMPAIGN_ID } from "@/lib/landing/fixtures";
import { ensureUniqueSlug } from "@/lib/landing/slug";
import { buildLandingDocument } from "@/lib/landing/templates";
import type { Json, LandingPage } from "@/types/database";

import { InMemoryLandingStore } from "./landing.service";

const CAMPAIGN = "22222222-2222-4222-8222-222222222222";

function demoDocJson(): Json {
  const doc = buildLandingDocument("squeeze", {
    brandName: "Acme",
    vertical: "saas",
    painPoints: ["slow"],
    benefits: ["fast"],
  });
  return JSON.parse(JSON.stringify(doc)) as Json;
}

async function createDraft(store: InMemoryLandingStore, slug: string): Promise<LandingPage> {
  return store.create({
    campaign_id: CAMPAIGN,
    user_id: store.userId,
    slug,
    template_type: "squeeze",
    sections: demoDocJson(),
  });
}

describe("InMemoryLandingStore", () => {
  it("creates a draft that is not yet publicly readable by slug", async () => {
    const store = new InMemoryLandingStore();
    const page = await createDraft(store, "draft-page");
    expect(page.status).toBe("draft");
    expect(page.deployed_at).toBeNull();
    expect(await store.getBySlug("draft-page")).toBeNull();
  });

  it("deploy transitions status, stamps deployed_at, and renders an HTML snapshot", async () => {
    const store = new InMemoryLandingStore();
    const page = await createDraft(store, "deploy-me");

    const deployed = await store.deploy(page.id);
    expect(deployed.status).toBe("deployed");
    expect(deployed.deployed_at).toBeTruthy();
    expect(typeof deployed.html_content).toBe("string");
    expect(deployed.html_content).toContain("<form");

    // Now publicly readable by slug.
    const bySlug = await store.getBySlug("deploy-me");
    expect(bySlug?.id).toBe(page.id);
  });

  it("detects slug collisions so the studio can generate unique slugs", async () => {
    const store = new InMemoryLandingStore();
    await createDraft(store, "taken");
    expect(await store.slugExists("taken")).toBe(true);
    expect(await store.slugExists("free-slug")).toBe(false);

    const unique = await ensureUniqueSlug("taken", (candidate) => store.slugExists(candidate));
    expect(unique).toBe("taken-2");
  });

  it("rejects lead capture for a non-deployed page", async () => {
    const store = new InMemoryLandingStore();
    const page = await createDraft(store, "not-deployed");
    await expect(
      store.captureLead({ landing_page_id: page.id, user_id: store.userId, email: "a@b.com" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("captures a lead for a deployed page and resolves the owner id", async () => {
    const store = new InMemoryLandingStore();
    const page = await createDraft(store, "lead-page");
    await store.deploy(page.id);

    const lead = await store.captureLead({
      landing_page_id: page.id,
      user_id: "some-other-user", // should be overridden with the page owner
      email: "lead@example.com",
      name: "Lead",
      utm: { utm_source: "facebook" },
    });

    expect(lead.email).toBe("lead@example.com");
    expect(lead.user_id).toBe(store.userId);
    expect(lead.landing_page_id).toBe(page.id);
  });

  it("records a view with UTM + visitor id and increments conversion stats", async () => {
    const store = new InMemoryLandingStore();
    const page = await createDraft(store, "stats-page");
    await store.deploy(page.id);

    await store.recordView({
      landing_page_id: page.id,
      user_id: store.userId,
      visitor_id: "visitor-1",
      utm: { utm_source: "google", utm_campaign: "spring" },
      referrer: "https://google.com/search",
    });

    const afterView = await store.getStats(page.id);
    expect(afterView.views).toBe(1);
    expect(afterView.leads).toBe(0);

    await store.captureLead({ landing_page_id: page.id, user_id: store.userId, email: "x@y.com" });
    const afterLead = await store.getStats(page.id);
    expect(afterLead.leads).toBe(1);
  });

  it("seeds a deployed A/B experiment for the demo finance campaign", async () => {
    const store = new InMemoryLandingStore();
    const deployed = await store.listDeployedByCampaign(DEMO_CAMPAIGN_ID);
    expect(deployed.length).toBeGreaterThanOrEqual(2);
    expect(deployed.every((p) => p.status === "deployed")).toBe(true);
  });
});
