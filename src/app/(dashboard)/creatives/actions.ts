"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { creativeFieldSchema } from "@/lib/creative";
import { exportCreativesCsv, exportFilename, type ExportFormat } from "@/lib/creative/export";
import {
  applyCreativeEdit,
  generateCreatives,
  generateImages,
  getCampaignHint,
  regenerateCreative,
  removeBrandVoice,
  saveBrandVoice,
  type BrandVoiceView,
  type CreativeView,
  type GenerateImagesResult,
  type GeneratedCreatives,
} from "@/lib/creative/studio";
import { parseCreativeContent } from "@/lib/creative/types";
import { creativeRequestSchema, imageRequestSchema } from "@/lib/validators";
import { creativeService, getCreativeStore } from "@/lib/services/creative.service";

/**
 * Server actions for the Creative Studio. The studio prefers the streaming
 * `/api/creative/generate` route for live generation; these power the
 * non-streaming fallback plus every non-streaming mutation (rate, favorite, edit,
 * regenerate, images, export, brand voice). Each returns a discriminated
 * `ActionResult` so the client renders precise errors.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function revalidate(): void {
  revalidatePath("/creatives");
}

export async function generateCreativesAction(input: unknown): Promise<ActionResult<GeneratedCreatives>> {
  const parsed = creativeRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  try {
    const data = await generateCreatives(parsed.data);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("generateCreativesAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function regenerateCreativeAction(creativeId: string): Promise<ActionResult<CreativeView>> {
  if (!creativeId) return { ok: false, error: "Missing creative id" };
  try {
    const data = await regenerateCreative(creativeId);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("regenerateCreativeAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

const editSchema = z.object({
  creativeId: z.string().min(1),
  fields: z.array(creativeFieldSchema).min(1),
});

export async function editCreativeAction(input: unknown): Promise<ActionResult<CreativeView>> {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid edit" };
  try {
    const data = await applyCreativeEdit(parsed.data.creativeId, parsed.data.fields);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("editCreativeAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

const ratingSchema = z.object({
  creativeId: z.string().min(1),
  rating: z.number().int().min(0).max(5).nullable(),
});

export async function rateCreativeAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid rating" };
  try {
    await creativeService.setRating(parsed.data.creativeId, parsed.data.rating);
    revalidate();
    return { ok: true, data: null };
  } catch (error) {
    logger.error("rateCreativeAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function favoriteCreativeAction(creativeId: string, isFavorite: boolean): Promise<ActionResult<null>> {
  if (!creativeId) return { ok: false, error: "Missing creative id" };
  try {
    await creativeService.setFavorite(creativeId, isFavorite);
    revalidate();
    return { ok: true, data: null };
  } catch (error) {
    logger.error("favoriteCreativeAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function removeCreativeAction(creativeId: string): Promise<ActionResult<null>> {
  if (!creativeId) return { ok: false, error: "Missing creative id" };
  try {
    await creativeService.remove(creativeId);
    revalidate();
    return { ok: true, data: null };
  } catch (error) {
    logger.error("removeCreativeAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function generateImagesAction(input: unknown): Promise<ActionResult<GenerateImagesResult>> {
  const parsed = imageRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid image request" };
  try {
    const data = await generateImages(parsed.data);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("generateImagesAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

const brandVoiceSchema = z.object({
  name: z.string().trim().min(1, "Name the brand voice").max(120),
  sampleAds: z.array(z.string().trim().min(1)).min(1, "Add at least one sample ad").max(20),
});

export async function saveBrandVoiceAction(input: unknown): Promise<ActionResult<BrandVoiceView>> {
  const parsed = brandVoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid brand voice" };
  try {
    const data = await saveBrandVoice(parsed.data);
    revalidate();
    return { ok: true, data };
  } catch (error) {
    logger.error("saveBrandVoiceAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function removeBrandVoiceAction(id: string): Promise<ActionResult<null>> {
  if (!id) return { ok: false, error: "Missing id" };
  try {
    await removeBrandVoice(id);
    revalidate();
    return { ok: true, data: null };
  } catch (error) {
    logger.error("removeBrandVoiceAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

const exportSchema = z.object({
  campaignId: z.string().min(1),
  format: z.enum(["google", "meta"]),
});

export interface ExportResult {
  filename: string;
  csv: string;
  count: number;
}

export async function exportCreativesAction(input: unknown): Promise<ActionResult<ExportResult>> {
  const parsed = exportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid export request" };
  try {
    const store = await getCreativeStore();
    const rows = await store.listByCampaign(parsed.data.campaignId);
    const contents = rows.flatMap((row) => {
      const content = parseCreativeContent(row.content);
      return content ? [content] : [];
    });
    const hint = await getCampaignHint(parsed.data.campaignId);
    const format = parsed.data.format as ExportFormat;
    const matching = contents.filter((c) => c.platform === format);
    const csv = exportCreativesCsv(format, contents, { campaignName: hint.name ?? "MediaOS Campaign" });
    return { ok: true, data: { filename: exportFilename(format, hint.name ?? "campaign"), csv, count: matching.length } };
  } catch (error) {
    logger.error("exportCreativesAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}
