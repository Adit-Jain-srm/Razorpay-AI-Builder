import { z } from "zod";

export const LANDING_TEMPLATES = ["squeeze", "long_form_sales", "quiz_funnel", "advertorial", "listicle"] as const;
export const landingTemplateSchema = z.enum(LANDING_TEMPLATES);
export type LandingTemplate = z.infer<typeof landingTemplateSchema>;

export const leadCaptureSchema = z.object({
  landingPageId: z.uuid(),
  email: z.email("Enter a valid email address"),
  name: z.string().max(120).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});
export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;

export const pageViewSchema = z.object({
  landingPageId: z.uuid(),
  visitorId: z.string().optional(),
  utm: z.record(z.string(), z.string()).optional(),
  referrer: z.string().optional(),
});
export type PageViewInput = z.infer<typeof pageViewSchema>;
