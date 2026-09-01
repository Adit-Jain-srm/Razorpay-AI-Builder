import { z } from "zod";

import { adPlatformSchema } from "@/lib/research/standard-models";

export const campaignBriefSchema = z.object({
  objective: z.string().min(1, "Describe the campaign objective"),
  audience: z.string().optional(),
  product: z.string().optional(),
  valueProps: z.array(z.string()).default([]),
  offer: z.string().optional(),
  tone: z.string().optional(),
  platforms: z.array(adPlatformSchema).default([]),
  notes: z.string().optional(),
});
export type CampaignBrief = z.infer<typeof campaignBriefSchema>;

export const campaignBudgetSchema = z.object({
  total: z.number().nonnegative().optional(),
  daily: z.number().nonnegative().optional(),
  currency: z.string().default("USD"),
});
export type CampaignBudget = z.infer<typeof campaignBudgetSchema>;

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Name your campaign").max(120),
  brief: campaignBriefSchema.optional(),
  budget: campaignBudgetSchema.optional(),
  personaIds: z.array(z.uuid()).default([]),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
