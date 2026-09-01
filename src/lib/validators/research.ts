import { z } from "zod";

import { queryParamsSchema } from "@/lib/research/standard-models";

/** Re-export the provider-agnostic query as the form-facing research query. */
export const researchQuerySchema = queryParamsSchema;
export type ResearchQueryInput = z.infer<typeof researchQuerySchema>;

export const createResearchProjectSchema = z.object({
  name: z.string().min(1, "Name your research project").max(160),
  query: z.string().min(1, "What audience do you want to research?"),
  campaignId: z.uuid().optional(),
  /** Provider names to run; defaults to all available when omitted. */
  providers: z.array(z.string()).optional(),
});
export type CreateResearchProjectInput = z.infer<typeof createResearchProjectSchema>;
