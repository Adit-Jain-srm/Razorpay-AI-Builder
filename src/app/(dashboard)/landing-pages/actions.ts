"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { landingDocumentSchema, landingTemplateSchema } from "@/lib/landing/types";
import {
  createLandingPage,
  createLandingVariant,
  deployLandingPage,
  promoteExperimentWinner,
  regenerateLandingPage,
  regenerateLandingSection,
  removeLandingPage,
  saveLandingDocument,
  setLandingTemplate,
  type GeneratedLandingResult,
  type LandingPageView,
  type PromoteWinnerResult,
} from "@/lib/landing/studio";

/**
 * Server actions for the Landing Page editor + hub. Each validates its input and
 * returns a discriminated `ActionResult` so the client renders precise errors,
 * then revalidates the hub. The public capture path lives in the route handlers
 * (`/api/leads`, `/api/page-views`), not here.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function revalidate(): void {
  revalidatePath("/landing-pages");
}

const createSchema = z.object({
  campaignId: z.string().min(1),
  template: landingTemplateSchema,
  angle: z.string().trim().max(120).optional(),
});

export async function createLandingPageAction(input: unknown): Promise<ActionResult<GeneratedLandingResult>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  try {
    const data = await createLandingPage(parsed.data);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("createLandingPageAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function regenerateLandingPageAction(pageId: string): Promise<ActionResult<GeneratedLandingResult>> {
  if (!pageId) return { ok: false, error: "Missing page id" };
  try {
    const data = await regenerateLandingPage(pageId);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("regenerateLandingPageAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

const sectionSchema = z.object({ pageId: z.string().min(1), sectionId: z.string().min(1) });

export async function regenerateSectionAction(input: unknown): Promise<ActionResult<LandingPageView>> {
  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  try {
    const data = await regenerateLandingSection(parsed.data.pageId, parsed.data.sectionId);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("regenerateSectionAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

const templateActionSchema = z.object({ pageId: z.string().min(1), template: landingTemplateSchema });

export async function setLandingTemplateAction(input: unknown): Promise<ActionResult<LandingPageView>> {
  const parsed = templateActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  try {
    const data = await setLandingTemplate(parsed.data.pageId, parsed.data.template);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("setLandingTemplateAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

const saveSchema = z.object({ pageId: z.string().min(1), document: landingDocumentSchema });

export async function saveLandingDocumentAction(input: unknown): Promise<ActionResult<LandingPageView>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid document" };
  try {
    const data = await saveLandingDocument(parsed.data.pageId, parsed.data.document);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("saveLandingDocumentAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deployLandingAction(pageId: string): Promise<ActionResult<LandingPageView>> {
  if (!pageId) return { ok: false, error: "Missing page id" };
  try {
    const data = await deployLandingPage(pageId);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("deployLandingAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function removeLandingAction(pageId: string): Promise<ActionResult<null>> {
  if (!pageId) return { ok: false, error: "Missing page id" };
  try {
    await removeLandingPage(pageId);
    revalidate();
    return { ok: true, data: null };
  } catch (error) {
    logger.error("removeLandingAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function createVariantAction(
  pageId: string,
): Promise<ActionResult<{ control: LandingPageView; variant: LandingPageView }>> {
  if (!pageId) return { ok: false, error: "Missing page id" };
  try {
    const data = await createLandingVariant(pageId);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("createVariantAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

const promoteSchema = z.object({ campaignId: z.string().min(1), experimentKey: z.string().min(1) });

export async function promoteWinnerAction(input: unknown): Promise<ActionResult<PromoteWinnerResult>> {
  const parsed = promoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  try {
    const data = await promoteExperimentWinner(parsed.data.campaignId, parsed.data.experimentKey);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("promoteWinnerAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}
