"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  createResearchProject,
  deleteResearchProject,
  runResearchForProject,
} from "@/lib/research/service";
import { queryParamsSchema, type ResearchReport } from "@/lib/research/standard-models";

/**
 * Server actions for the research workspace. Project CRUD + a non-streaming run
 * fallback (the workspace prefers the streaming `/api/research/run` route, but
 * this keeps the flow working without client-side streaming and gives the
 * Operator agent a simple callable).
 */

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  query: z.string().trim().min(3, "Describe the audience to research").max(400),
  industry: z.string().trim().max(120).optional(),
  product: z.string().trim().max(160).optional(),
  audienceHint: z.string().trim().max(200).optional(),
  region: z.string().trim().max(8).optional(),
  competitors: z.array(z.string().trim().min(1)).max(10).optional(),
});

export type CreateResearchInput = z.input<typeof createSchema>;

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createResearchProjectAction(input: CreateResearchInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, ...rest } = parsed.data;
  const params = queryParamsSchema.parse({
    query: rest.query,
    industry: rest.industry,
    product: rest.product,
    audienceHint: rest.audienceHint,
    region: rest.region,
    competitors: rest.competitors,
  });

  try {
    const project = await createResearchProject({ name, params });
    revalidatePath("/research");
    return { ok: true, data: { id: project.id } };
  } catch (error) {
    logger.error("createResearchProjectAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteResearchProjectAction(id: string): Promise<ActionResult<null>> {
  try {
    await deleteResearchProject(id);
    revalidatePath("/research");
    return { ok: true, data: null };
  } catch (error) {
    logger.error("deleteResearchProjectAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function runResearchProjectAction(
  projectId: string,
  params: unknown,
): Promise<ActionResult<ResearchReport>> {
  const parsed = queryParamsSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Invalid research parameters" };

  try {
    const report = await runResearchForProject(projectId, parsed.data);
    revalidatePath(`/research/${projectId}`);
    revalidatePath("/research");
    return { ok: true, data: report };
  } catch (error) {
    logger.error("runResearchProjectAction failed", error);
    return { ok: false, error: toErrorMessage(error) };
  }
}
