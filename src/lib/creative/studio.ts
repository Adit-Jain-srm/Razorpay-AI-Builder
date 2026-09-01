import { generateImage } from "@/lib/ai/azure";
import { isAzureConfigured } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AdPlatform } from "@/lib/research/standard-models";
import { campaignService } from "@/lib/services";
import {
  getCreativeImageUrl,
  getCreativeStore,
  type CreativeStore,
} from "@/lib/services/creative.service";
import type { CreativeRequest, ImageRequest } from "@/lib/validators";
import type { Creative, CreativeImage, Json } from "@/types/database";

import { assembleFromFields } from "./assemble";
import {
  deriveToneProfile,
  summarizeToneForPrompt,
  toneProfileSchema,
  type ToneProfile,
} from "./brand-voice";
import { generateCopy } from "./copy";
import { DEMO_CAMPAIGN_ID, DEMO_CAMPAIGN_NAME } from "./fixtures";
import { getResearchContextForCampaign } from "./research-bridge";
import { buildImagePrompt, buildPlaceholderImage, aspectRatioToImageSize } from "./visuals";
import { parseCreativeContent, type CreativeContent, type CreativeField } from "./types";

/**
 * SERVER-ONLY Creative Studio orchestration. Ties generation (copy + visuals),
 * the research bridge, brand voice, scoring, and persistence together so the API
 * route, server actions, and (later) the Operator agent all share one path.
 */

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

/* -------------------------------------------------------------------------- */
/* View models                                                                */
/* -------------------------------------------------------------------------- */

export interface CreativeImageView {
  id: string;
  url: string;
  aspectRatio: string | null;
  promptUsed: string | null;
  createdAt: string;
}

export interface CreativeView {
  id: string;
  campaignId: string;
  platform: AdPlatform;
  content: CreativeContent;
  isFavorite: boolean;
  rating: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  images: CreativeImageView[];
}

export interface BrandVoiceView {
  id: string;
  name: string;
  sampleAds: string[];
  profile: ToneProfile;
  createdAt: string;
}

export interface StudioData {
  creatives: CreativeView[];
  brandVoices: BrandVoiceView[];
}

function rowToView(row: Creative, images: CreativeImage[]): CreativeView | null {
  const content = parseCreativeContent(row.content);
  if (!content) {
    logger.warn("Skipping creative with unparseable content", { id: row.id });
    return null;
  }
  return {
    id: row.id,
    campaignId: row.campaign_id,
    platform: content.platform,
    content,
    isFavorite: row.is_favorite,
    rating: row.rating,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images: images.map((img) => ({
      id: img.id,
      url: getCreativeImageUrl(img),
      aspectRatio: img.aspect_ratio,
      promptUsed: img.prompt_used,
      createdAt: img.created_at,
    })),
  };
}

function brandVoiceView(input: { id: string; name: string; sample_ads: Json; tone_profile: Json; created_at: string }): BrandVoiceView {
  const sampleAds = Array.isArray(input.sample_ads)
    ? input.sample_ads.filter((s): s is string => typeof s === "string")
    : [];
  const parsed = toneProfileSchema.safeParse(input.tone_profile);
  return {
    id: input.id,
    name: input.name,
    sampleAds,
    profile: parsed.success ? parsed.data : deriveToneProfile(sampleAds),
    createdAt: input.created_at,
  };
}

/** Loads the full studio view model for a campaign (creatives + images + voices). */
export async function getStudioData(campaignId: string): Promise<StudioData> {
  const store = await getCreativeStore();
  const [rows, voices] = await Promise.all([store.listByCampaign(campaignId), store.listBrandVoices()]);

  const withImages = await Promise.all(
    rows.map(async (row) => rowToView(row, await store.listImages(row.id))),
  );

  return {
    creatives: withImages.filter((v): v is CreativeView => v !== null),
    brandVoices: voices.map(brandVoiceView),
  };
}

/* -------------------------------------------------------------------------- */
/* Campaign + brand-voice hints                                               */
/* -------------------------------------------------------------------------- */

export interface CampaignHint {
  name?: string;
  product?: string;
  industry?: string;
}

/** Best-effort campaign context. The campaign module is built in parallel, so
 * the service may be a stub - we degrade silently to demo/empty hints. */
export async function getCampaignHint(campaignId: string): Promise<CampaignHint> {
  if (campaignId === DEMO_CAMPAIGN_ID) {
    return { name: DEMO_CAMPAIGN_NAME, product: "retirement income newsletter", industry: "financial newsletters" };
  }
  try {
    const campaign = await campaignService.get(campaignId);
    if (!campaign) return {};
    const brief =
      campaign.brief && typeof campaign.brief === "object" && !Array.isArray(campaign.brief)
        ? (campaign.brief as Record<string, unknown>)
        : {};
    return {
      name: campaign.name,
      product: typeof brief.product === "string" ? brief.product : undefined,
      industry: typeof brief.industry === "string" ? brief.industry : undefined,
    };
  } catch {
    return {};
  }
}

async function loadToneSummary(store: CreativeStore, brandVoiceId?: string): Promise<string | undefined> {
  if (!brandVoiceId) return undefined;
  try {
    const voices = await store.listBrandVoices();
    const voice = voices.find((v) => v.id === brandVoiceId);
    if (!voice) return undefined;
    const view = brandVoiceView(voice);
    return summarizeToneForPrompt(view.profile);
  } catch {
    return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/* Copy generation                                                            */
/* -------------------------------------------------------------------------- */

export interface GenerateCreativesOptions {
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}

export interface GeneratedCreatives {
  creatives: CreativeView[];
  source: "ai" | "seeded";
  batchId: string;
}

/** Generates, scores, and persists a set of creative variants for a campaign. */
export async function generateCreatives(
  request: CreativeRequest,
  options: GenerateCreativesOptions = {},
): Promise<GeneratedCreatives> {
  const store = await getCreativeStore();

  const context =
    request.painPoints.length > 0
      ? { painPoints: request.painPoints, vocabulary: [] as string[], personaName: undefined as string | undefined }
      : await getResearchContextForCampaign(request.campaignId);

  const [hint, toneSummary] = await Promise.all([
    getCampaignHint(request.campaignId),
    loadToneSummary(store, request.brandVoiceId),
  ]);

  const batchId = globalThis.crypto?.randomUUID?.() ?? `batch_${Date.now().toString(36)}`;

  const { variants, source } = await generateCopy({
    platform: request.platform,
    count: request.count,
    angle: request.angle,
    painPoints: context.painPoints,
    vocabulary: context.vocabulary,
    personaName: context.personaName,
    product: hint.product,
    industry: hint.industry,
    toneSummary,
    batchId,
    signal: options.signal,
    onDelta: options.onDelta,
  });

  const created = await Promise.all(variants.map((content) => persistVariant(store, request.campaignId, content)));

  return {
    creatives: created.flatMap((row) => {
      const view = rowToView(row, []);
      return view ? [view] : [];
    }),
    source,
    batchId,
  };
}

async function persistVariant(store: CreativeStore, campaignId: string, content: CreativeContent): Promise<Creative> {
  return store.create({
    campaign_id: campaignId,
    user_id: store.userId,
    platform: content.platform,
    type: content.format,
    content: toJson(content),
    hook_type: content.hook.type,
    hook_confidence: content.hook.confidence,
    score: content.score.total,
    version: 1,
  });
}

/** Regenerates a single variant in place (same platform + angle), bumping version. */
export async function regenerateCreative(creativeId: string, options: GenerateCreativesOptions = {}): Promise<CreativeView> {
  const store = await getCreativeStore();
  const existing = await store.get(creativeId);
  if (!existing) throw new ValidationError("Creative not found");

  const prev = parseCreativeContent(existing.content);
  const platform = (prev?.platform ?? existing.platform) as AdPlatform;
  const hint = await getCampaignHint(existing.campaign_id);
  const context = prev?.painPointsTargeted?.length
    ? { painPoints: prev.painPointsTargeted, vocabulary: [] as string[], personaName: undefined as string | undefined }
    : await getResearchContextForCampaign(existing.campaign_id);

  const { variants } = await generateCopy({
    platform,
    count: 1,
    angle: prev?.angle,
    painPoints: context.painPoints,
    vocabulary: context.vocabulary,
    personaName: context.personaName,
    product: hint.product,
    industry: hint.industry,
    batchId: prev?.batchId,
    signal: options.signal,
    onDelta: options.onDelta,
  });

  const next = variants[0];
  if (!next) throw new ValidationError("Regeneration produced no variant");

  const updated = await store.update(creativeId, {
    content: toJson(next),
    hook_type: next.hook.type,
    hook_confidence: next.hook.confidence,
    score: next.score.total,
    version: existing.version + 1,
  });
  const view = rowToView(updated, await store.listImages(creativeId));
  if (!view) throw new ValidationError("Failed to read regenerated creative");
  return view;
}

/** Applies an inline edit: re-enforce limits, re-classify hook, re-score, persist. */
export async function applyCreativeEdit(creativeId: string, fields: CreativeField[]): Promise<CreativeView> {
  const store = await getCreativeStore();
  const existing = await store.get(creativeId);
  if (!existing) throw new ValidationError("Creative not found");

  const prev = parseCreativeContent(existing.content);
  const platform = (prev?.platform ?? existing.platform) as AdPlatform;
  const content = assembleFromFields(platform, fields, {
    angle: prev?.angle,
    painPointsTargeted: prev?.painPointsTargeted,
    batchId: prev?.batchId,
  });

  const updated = await store.update(creativeId, {
    content: toJson(content),
    hook_type: content.hook.type,
    hook_confidence: content.hook.confidence,
    score: content.score.total,
  });
  const view = rowToView(updated, await store.listImages(creativeId));
  if (!view) throw new ValidationError("Failed to read edited creative");
  return view;
}

/* -------------------------------------------------------------------------- */
/* Visual generation                                                          */
/* -------------------------------------------------------------------------- */

export interface GenerateImagesResult {
  images: CreativeImageView[];
  source: "ai" | "seeded";
}

const MAX_IMAGES_PER_REQUEST = 4;

/** Generates images for a creative (GPT-Image), uploading to Storage. Degrades
 * to branded placeholders when Azure is unconfigured or image gen fails. */
export async function generateImages(request: ImageRequest, options: { signal?: AbortSignal } = {}): Promise<GenerateImagesResult> {
  const store = await getCreativeStore();
  if (!request.creativeId) throw new ValidationError("A creativeId is required to attach generated images.");

  const creative = await store.get(request.creativeId);
  if (!creative) throw new ValidationError("Creative not found");

  const content = parseCreativeContent(creative.content);
  const platform = (request.platform ?? content?.platform ?? creative.platform) as AdPlatform;
  const count = Math.min(Math.max(1, request.count), MAX_IMAGES_PER_REQUEST);
  const label = content?.headline || request.prompt;

  const toView = (img: CreativeImage): CreativeImageView => ({
    id: img.id,
    url: getCreativeImageUrl(img),
    aspectRatio: img.aspect_ratio,
    promptUsed: img.prompt_used,
    createdAt: img.created_at,
  });

  const seedPlaceholders = async (): Promise<GenerateImagesResult> => {
    const images: CreativeImageView[] = [];
    for (let i = 0; i < count; i += 1) {
      const dataUrl = buildPlaceholderImage(request.aspectRatio, label, "Add Azure to generate");
      const row = await store.addImage({
        creative_id: request.creativeId!,
        user_id: store.userId,
        storage_path: dataUrl,
        aspect_ratio: request.aspectRatio,
        platform,
        prompt_used: request.prompt,
      });
      images.push(toView(row));
    }
    return { images, source: "seeded" };
  };

  if (!isAzureConfigured()) return seedPlaceholders();

  try {
    const prompt = buildImagePrompt({
      platform,
      angle: request.prompt,
      headline: content?.headline,
      painPoints: content?.painPointsTargeted,
    });
    const size = aspectRatioToImageSize(request.aspectRatio);
    const generated = await generateImage({ prompt, size, n: count, signal: options.signal });

    const images: CreativeImageView[] = [];
    for (const image of generated) {
      const row = await store.uploadImage({
        creativeId: request.creativeId,
        base64: image.b64,
        contentType: image.mimeType,
        aspectRatio: request.aspectRatio,
        platform,
        promptUsed: prompt,
      });
      images.push(toView(row));
    }
    if (images.length === 0) return seedPlaceholders();
    return { images, source: "ai" };
  } catch (error) {
    logger.warn("Image generation failed - seeding placeholders", { error: String(error) });
    return seedPlaceholders();
  }
}

/* -------------------------------------------------------------------------- */
/* Brand voice                                                                */
/* -------------------------------------------------------------------------- */

export interface SaveBrandVoiceInput {
  name: string;
  sampleAds: string[];
}

/** Derives a tone profile from winning ads and persists the brand voice. */
export async function saveBrandVoice(input: SaveBrandVoiceInput): Promise<BrandVoiceView> {
  const store = await getCreativeStore();
  const samples = input.sampleAds.map((s) => s.trim()).filter((s) => s.length > 0);
  if (samples.length === 0) throw new ValidationError("Add at least one sample ad to learn a brand voice.");

  const profile = deriveToneProfile(samples);
  const row = await store.createBrandVoice({
    user_id: store.userId,
    name: input.name.trim() || "Brand voice",
    sample_ads: toJson(samples),
    tone_profile: toJson(profile),
  });
  return brandVoiceView(row);
}

export async function listBrandVoices(): Promise<BrandVoiceView[]> {
  const store = await getCreativeStore();
  const voices = await store.listBrandVoices();
  return voices.map(brandVoiceView);
}

export async function removeBrandVoice(id: string): Promise<void> {
  const store = await getCreativeStore();
  await store.removeBrandVoice(id);
}
