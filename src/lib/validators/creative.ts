import { z } from "zod";

import { adPlatformSchema } from "@/lib/research/standard-models";

/** Platform aspect ratios for generated visuals. */
export const ASPECT_RATIOS = ["1:1", "9:16", "16:9", "1.91:1"] as const;
export const aspectRatioSchema = z.enum(ASPECT_RATIOS);
export type AspectRatio = z.infer<typeof aspectRatioSchema>;

export const creativeRequestSchema = z.object({
  campaignId: z.uuid(),
  platform: adPlatformSchema,
  format: z.string().optional(),
  angle: z.string().optional(),
  personaId: z.uuid().optional(),
  painPoints: z.array(z.string()).default([]),
  count: z.number().int().min(1).max(10).default(3),
  brandVoiceId: z.uuid().optional(),
});
export type CreativeRequest = z.infer<typeof creativeRequestSchema>;

export const imageRequestSchema = z.object({
  creativeId: z.uuid().optional(),
  prompt: z.string().min(1, "Provide an image prompt"),
  aspectRatio: aspectRatioSchema.default("1:1"),
  platform: adPlatformSchema.optional(),
  count: z.number().int().min(1).max(4).default(1),
});
export type ImageRequest = z.infer<typeof imageRequestSchema>;
