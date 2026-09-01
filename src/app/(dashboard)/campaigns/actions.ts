"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getCampaignBriefAssistant,
  type BriefAssistResult,
  type BudgetSuggestion,
} from "@/lib/campaign/assistant";
import {
  briefSchema,
  budgetPlanSchema,
  campaignStatusSchema,
  personaIdsFromBrief,
  personaSnapshotSchema,
  platformConfigSchema,
  type PersonaSnapshot,
  type PlatformRecommendation,
} from "@/lib/campaign/brief";
import {
  listImportablePersonas,
  listResearchProjectOptions,
  type ResearchProjectOption,
} from "@/lib/campaign/personas";
import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { adPlatformSchema } from "@/lib/research/standard-models";
import { campaignService } from "@/lib/services";
import type { CampaignInsert, CampaignUpdate, Json } from "@/types/database";

/**
 * Server actions for the Campaign System. The builder (client) and the campaign
 * hub call these; they validate input, drive `campaignService`, and run the AI
 * brief assistant + research persona import. Every action returns a discriminated
 * `ActionResult` so the UI can branch without try/catch.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

/* -------------------------------------------------------------------------- */
/* Input schemas                                                              */
/* -------------------------------------------------------------------------- */

const draftSchema = z.object({
  name: z.string().trim().min(1, "Name your campaign").max(120),
  status: campaignStatusSchema.optional(),
  brief: briefSchema.optional(),
  platformConfig: platformConfigSchema.optional(),
  budget: budgetPlanSchema.optional(),
  personaIds: z.array(z.string()).optional(),
});
export type CampaignDraftInput = z.input<typeof draftSchema>;

const patchSchema = draftSchema.partial();
export type CampaignPatchInput = z.input<typeof patchSchema>;

const assistInputSchema = z.object({
  product: z.string().trim().min(1, "Describe the product or offer").max(600),
  offer: z.string().trim().max(400).optional(),
  audience: z.string().trim().max(400).optional(),
  goal: z.string().trim().max(120).optional(),
  personas: z.array(personaSnapshotSchema).max(8).optional(),
  platforms: z.array(adPlatformSchema).max(7).optional(),
  budgetTotal: z.number().nonnegative().optional(),
  currency: z.string().max(8).optional(),
});
export type AssistInput = z.input<typeof assistInputSchema>;

/* -------------------------------------------------------------------------- */
/* CRUD + lifecycle                                                           */
/* -------------------------------------------------------------------------- */

function buildInsert(input: z.infer<typeof draftSchema>): CampaignInsert {
  const brief = input.brief ?? briefSchema.parse({});
  const platformConfig = input.platformConfig ?? platformConfigSchema.parse({});
  const budget = input.budget ?? budgetPlanSchema.parse({});
  const personaIds = input.personaIds ?? personaIdsFromBrief(brief);
  return {
    // `user_id` is authoritative from the session inside the store (RLS); this
    // placeholder is intentionally ignored by both the Supabase and demo stores.
    user_id: "",
    name: input.name,
    status: input.status ?? "draft",
    brief: toJson(brief),
    platform_config: toJson(platformConfig),
    budget: toJson(budget),
    persona_ids: toJson(personaIds),
  };
}

export async function createCampaignAction(input: CampaignDraftInput): Promise<ActionResult<{ id: string }>> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid campaign" };

  try {
    const campaign = await campaignService.create(buildInsert(parsed.data));
    revalidatePath("/campaigns");
    return { ok: true, data: { id: campaign.id } };
  } catch (error) {
    logger.error("createCampaignAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updateCampaignAction(id: string, patch: CampaignPatchInput): Promise<ActionResult<{ id: string }>> {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid changes" };

  const update: CampaignUpdate = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.brief !== undefined) update.brief = toJson(parsed.data.brief);
  if (parsed.data.platformConfig !== undefined) update.platform_config = toJson(parsed.data.platformConfig);
  if (parsed.data.budget !== undefined) update.budget = toJson(parsed.data.budget);
  if (parsed.data.personaIds !== undefined) update.persona_ids = toJson(parsed.data.personaIds);
  else if (parsed.data.brief !== undefined) update.persona_ids = toJson(personaIdsFromBrief(parsed.data.brief));

  try {
    await campaignService.update(id, update);
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${id}`);
    return { ok: true, data: { id } };
  } catch (error) {
    logger.error("updateCampaignAction failed", error, { id });
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function setCampaignStatusAction(id: string, status: string): Promise<ActionResult<{ id: string }>> {
  const parsed = campaignStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status" };

  try {
    await campaignService.setStatus(id, parsed.data);
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${id}`);
    return { ok: true, data: { id } };
  } catch (error) {
    logger.error("setCampaignStatusAction failed", error, { id });
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function duplicateCampaignAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const original = await campaignService.get(id);
    if (!original) return { ok: false, error: "Campaign not found" };

    const copy = await campaignService.create({
      user_id: "",
      name: `${original.name} (copy)`.slice(0, 120),
      status: "draft",
      brief: original.brief,
      platform_config: original.platform_config,
      budget: original.budget,
      persona_ids: original.persona_ids,
    });
    revalidatePath("/campaigns");
    return { ok: true, data: { id: copy.id } };
  } catch (error) {
    logger.error("duplicateCampaignAction failed", error, { id });
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteCampaignAction(id: string): Promise<ActionResult<null>> {
  try {
    await campaignService.remove(id);
    revalidatePath("/campaigns");
    return { ok: true, data: null };
  } catch (error) {
    logger.error("deleteCampaignAction failed", error, { id });
    return { ok: false, error: toErrorMessage(error) };
  }
}

/* -------------------------------------------------------------------------- */
/* AI brief assistant                                                         */
/* -------------------------------------------------------------------------- */

export async function assistBriefAction(input: AssistInput): Promise<ActionResult<BriefAssistResult>> {
  const parsed = assistInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Describe the offer first" };

  try {
    const result = await getCampaignBriefAssistant().assist(parsed.data);
    return { ok: true, data: result };
  } catch (error) {
    logger.error("assistBriefAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function recommendPlatformsAction(input: AssistInput): Promise<ActionResult<PlatformRecommendation[]>> {
  const parsed = assistInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Describe the offer first" };

  try {
    const recommendations = await getCampaignBriefAssistant().recommendPlatforms(parsed.data);
    return { ok: true, data: recommendations };
  } catch (error) {
    logger.error("recommendPlatformsAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function suggestPersonasAction(input: AssistInput): Promise<ActionResult<PersonaSnapshot[]>> {
  const parsed = assistInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Describe the offer first" };

  try {
    const personas = await getCampaignBriefAssistant().suggestPersonas(parsed.data);
    return { ok: true, data: personas };
  } catch (error) {
    logger.error("suggestPersonasAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function allocateBudgetAction(input: AssistInput): Promise<ActionResult<BudgetSuggestion>> {
  const parsed = assistInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Describe the offer first" };

  try {
    const budget = await getCampaignBriefAssistant().allocateBudget(parsed.data);
    return { ok: true, data: budget };
  } catch (error) {
    logger.error("allocateBudgetAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

/* -------------------------------------------------------------------------- */
/* Research-first persona import                                              */
/* -------------------------------------------------------------------------- */

export async function listResearchProjectOptionsAction(): Promise<ActionResult<ResearchProjectOption[]>> {
  try {
    return { ok: true, data: await listResearchProjectOptions() };
  } catch (error) {
    logger.error("listResearchProjectOptionsAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function listImportablePersonasAction(projectId: string): Promise<ActionResult<PersonaSnapshot[]>> {
  if (!projectId.trim()) return { ok: false, error: "Pick a research project" };
  try {
    return { ok: true, data: await listImportablePersonas(projectId) };
  } catch (error) {
    logger.error("listImportablePersonasAction failed", error, { projectId });
    return { ok: false, error: toErrorMessage(error) };
  }
}
