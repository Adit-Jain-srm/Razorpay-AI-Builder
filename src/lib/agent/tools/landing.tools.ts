import { z } from "zod";

import { createLandingPage, deployLandingPage, type LandingPageView } from "@/lib/landing/studio";
import { landingTemplateSchema, type HeroSection, type LandingTemplate } from "@/lib/landing/types";

import { defineTool, type AgentTool } from "../types";
import type { LandingPageArtifactData } from "./artifacts";
import { MODULE_TOOL_CATEGORY, OPERATOR_DEMO_CONTENT_CAMPAIGN_ID, ok, resolveCampaignId, runToolSafely } from "./shared";

/**
 * Landing page tools - generate a research-informed, conversion-structured page
 * for a campaign and deploy it to a public `/lp/[slug]` URL that captures leads.
 * Both run through the Landing Page Engine the editor uses.
 */

function pageToArtifactData(page: LandingPageView, source?: "ai" | "seeded"): LandingPageArtifactData {
  const hero = page.document.sections.find((section): section is HeroSection => section.type === "hero");
  const headline = hero?.headline?.trim() || page.document.meta.title || page.document.meta.brandName || page.slug;
  return {
    id: page.id,
    slug: page.slug,
    url: page.url,
    template: page.template,
    status: page.status,
    deployed: page.status === "deployed",
    headline,
    sections: page.document.sections.map((section) => ({ type: section.type, label: section.label || section.type })),
    source,
    stats: { views: page.stats.views, leads: page.stats.leads, cvr: page.stats.cvr },
  };
}

export function createLandingTools(): AgentTool[] {
  const build = defineTool<{ campaignId?: string; template: LandingTemplate; angle?: string }, LandingPageArtifactData>({
    name: "build_landing_page",
    description:
      "Generate a research-informed landing page for a campaign from a template (squeeze, long_form_sales, quiz_funnel, advertorial, listicle). Produces conversion-structured sections (hero, proof, lead form, etc.) grounded in the campaign's pain points. Returns a DRAFT - call deploy_landing_page to make it live.",
    category: MODULE_TOOL_CATEGORY.landing,
    parameters: z.object({
      campaignId: z.string().max(100).optional().describe("Campaign the page belongs to (defaults to the demo campaign)"),
      template: landingTemplateSchema.describe("Template: squeeze | long_form_sales | quiz_funnel | advertorial | listicle"),
      angle: z.string().max(160).optional().describe("Positioning angle for the page, e.g. 'inflation protection'"),
    }),
    execute: async (params, ctx) =>
      runToolSafely("build_landing_page", async () => {
        const campaignId = resolveCampaignId(params.campaignId, ctx, OPERATOR_DEMO_CONTENT_CAMPAIGN_ID);
        const result = await createLandingPage({ campaignId, template: params.template, angle: params.angle });
        const data = pageToArtifactData(result.page, result.source);
        return ok(data, { type: "landing-page", title: `Landing page: ${data.headline}`, data });
      }),
  });

  const deploy = defineTool<{ pageId: string }, LandingPageArtifactData>({
    name: "deploy_landing_page",
    description:
      "Deploy a draft landing page to its public URL (/lp/{slug}), where it captures leads and page views. Returns the live page with its URL.",
    category: MODULE_TOOL_CATEGORY.landing,
    parameters: z.object({
      pageId: z.string().min(1).max(100).describe("The landing page id to deploy"),
    }),
    execute: async (params) =>
      runToolSafely("deploy_landing_page", async () => {
        const page = await deployLandingPage(params.pageId);
        const data = pageToArtifactData(page);
        return ok(data, { type: "landing-page", title: `Live: ${data.url}`, data });
      }),
  });

  return [build, deploy];
}
