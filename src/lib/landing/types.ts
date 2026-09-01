import { z } from "zod";

import { LANDING_TEMPLATES, landingTemplateSchema, type LandingTemplate } from "@/lib/validators/landing";

/**
 * Landing Page Engine domain model - the contract shared by generation, the
 * persistence layer, the section renderer, the editor, and the public route.
 *
 * Zod schemas are the source of truth: AI output is parsed/validated before it
 * is trusted, and the DB `sections` jsonb is re-validated on read. Everything
 * here is PURE and client-safe (no server-only imports) so the editor preview
 * and the public page render from one model without pulling Azure/Supabase into
 * the client bundle.
 */

export { LANDING_TEMPLATES, landingTemplateSchema };
export type { LandingTemplate };

/** Direct-response copy framework a section advances (for the editor + docs). */
export const DR_FRAMEWORKS = ["aida", "pas"] as const;
export const drFrameworkSchema = z.enum(DR_FRAMEWORKS);
export type DrFramework = z.infer<typeof drFrameworkSchema>;

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */

export const LANDING_ACCENTS = ["emerald", "blue", "violet", "amber", "rose", "teal"] as const;
export const landingAccentSchema = z.enum(LANDING_ACCENTS);
export type LandingAccent = z.infer<typeof landingAccentSchema>;

export const landingThemeSchema = z.object({
  accent: landingAccentSchema.default("emerald"),
  mode: z.enum(["light", "dark"]).default("light"),
  /** Corner radius scale for cards/buttons. */
  radius: z.enum(["sm", "md", "lg", "xl"]).default("lg"),
  /** Headline font family preference (mapped to a stack in the renderer). */
  font: z.enum(["geist", "serif", "grotesk"]).default("geist"),
});
export type LandingTheme = z.infer<typeof landingThemeSchema>;

/* -------------------------------------------------------------------------- */
/* Sections (discriminated union on `type`)                                   */
/* -------------------------------------------------------------------------- */

/** Fields shared by every section so the editor can address + label them. */
const sectionMeta = {
  id: z.string(),
  /** Human label shown in the editor outline. */
  label: z.string().default(""),
  framework: drFrameworkSchema.optional(),
};

export const SECTION_TYPES = [
  "hero",
  "rich_text",
  "features",
  "social_proof",
  "testimonials",
  "listicle",
  "faq",
  "countdown",
  "quiz",
  "lead_form",
  "exit_intent",
  "cta",
  "compliance",
] as const;
export const sectionTypeSchema = z.enum(SECTION_TYPES);
export type SectionType = z.infer<typeof sectionTypeSchema>;

export const heroSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("hero"),
  eyebrow: z.string().default(""),
  headline: z.string().default(""),
  subheadline: z.string().default(""),
  bullets: z.array(z.string()).default([]),
  ctaLabel: z.string().default("Get instant access"),
  ctaAnchor: z.string().default("#lead"),
  /** Optional supporting media treatment. */
  media: z.enum(["none", "badge", "video"]).default("none"),
  badgeText: z.string().default(""),
});
export type HeroSection = z.infer<typeof heroSectionSchema>;

export const richTextSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("rich_text"),
  eyebrow: z.string().default(""),
  title: z.string().default(""),
  /** Byline for advertorial/editorial templates. */
  byline: z.string().default(""),
  paragraphs: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
});
export type RichTextSection = z.infer<typeof richTextSectionSchema>;

export const featureItemSchema = z.object({
  title: z.string().default(""),
  body: z.string().default(""),
  /** Phosphor icon name hint (renderer maps to a safe default if unknown). */
  icon: z.string().default("CheckCircle"),
});
export type FeatureItem = z.infer<typeof featureItemSchema>;

export const featuresSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("features"),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  items: z.array(featureItemSchema).default([]),
  layout: z.enum(["grid", "list"]).default("grid"),
});
export type FeaturesSection = z.infer<typeof featuresSectionSchema>;

export const socialProofItemSchema = z.object({
  value: z.string().default(""),
  label: z.string().default(""),
});
export type SocialProofItem = z.infer<typeof socialProofItemSchema>;

export const socialProofSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("social_proof"),
  variant: z.enum(["stats", "logos", "rating"]).default("stats"),
  title: z.string().default(""),
  items: z.array(socialProofItemSchema).default([]),
  note: z.string().default(""),
});
export type SocialProofSection = z.infer<typeof socialProofSectionSchema>;

export const testimonialItemSchema = z.object({
  quote: z.string().default(""),
  name: z.string().default(""),
  role: z.string().default(""),
  rating: z.number().int().min(0).max(5).default(5),
});
export type TestimonialItem = z.infer<typeof testimonialItemSchema>;

export const testimonialsSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("testimonials"),
  title: z.string().default(""),
  items: z.array(testimonialItemSchema).default([]),
});
export type TestimonialsSection = z.infer<typeof testimonialsSectionSchema>;

export const listicleItemSchema = z.object({
  title: z.string().default(""),
  body: z.string().default(""),
});
export type ListicleItem = z.infer<typeof listicleItemSchema>;

export const listicleSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("listicle"),
  title: z.string().default(""),
  intro: z.string().default(""),
  items: z.array(listicleItemSchema).default([]),
});
export type ListicleSection = z.infer<typeof listicleSectionSchema>;

export const faqItemSchema = z.object({
  q: z.string().default(""),
  a: z.string().default(""),
});
export type FaqItem = z.infer<typeof faqItemSchema>;

export const faqSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("faq"),
  title: z.string().default("Questions, answered"),
  items: z.array(faqItemSchema).default([]),
});
export type FaqSection = z.infer<typeof faqSectionSchema>;

export const countdownSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("countdown"),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  /** Minutes from first view; a stable per-session deadline (no fake dates). */
  durationMinutes: z.number().int().positive().max(20160).default(30),
  ctaLabel: z.string().default("Claim your spot"),
  ctaAnchor: z.string().default("#lead"),
});
export type CountdownSection = z.infer<typeof countdownSectionSchema>;

export const quizOptionSchema = z.object({
  id: z.string(),
  label: z.string().default(""),
});
export type QuizOption = z.infer<typeof quizOptionSchema>;

export const quizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string().default(""),
  options: z.array(quizOptionSchema).default([]),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const quizSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("quiz"),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  questions: z.array(quizQuestionSchema).default([]),
  ctaLabel: z.string().default("See my result"),
  resultTitle: z.string().default("Your personalized plan is ready"),
  resultBody: z.string().default("Enter your email to unlock the recommendation built from your answers."),
  ctaAnchor: z.string().default("#lead"),
});
export type QuizSection = z.infer<typeof quizSectionSchema>;

export const leadFormSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("lead_form"),
  title: z.string().default("Get the free guide"),
  subtitle: z.string().default(""),
  collectName: z.boolean().default(true),
  ctaLabel: z.string().default("Send it to me"),
  disclaimer: z.string().default("We respect your inbox. Unsubscribe anytime."),
  successTitle: z.string().default("You're in."),
  successMessage: z.string().default("Check your inbox - your guide is on the way."),
});
export type LeadFormSection = z.infer<typeof leadFormSectionSchema>;

export const exitIntentSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("exit_intent"),
  headline: z.string().default("Wait - don't leave empty-handed"),
  body: z.string().default("Grab the free guide before you go."),
  incentive: z.string().default(""),
  ctaLabel: z.string().default("Send my free guide"),
});
export type ExitIntentSection = z.infer<typeof exitIntentSectionSchema>;

export const ctaSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("cta"),
  headline: z.string().default(""),
  subtitle: z.string().default(""),
  ctaLabel: z.string().default("Get started"),
  ctaAnchor: z.string().default("#lead"),
});
export type CtaSection = z.infer<typeof ctaSectionSchema>;

export const complianceSectionSchema = z.object({
  ...sectionMeta,
  type: z.literal("compliance"),
  title: z.string().default("Important disclosures"),
  disclaimers: z.array(z.string()).default([]),
});
export type ComplianceSection = z.infer<typeof complianceSectionSchema>;

export const landingSectionSchema = z.discriminatedUnion("type", [
  heroSectionSchema,
  richTextSectionSchema,
  featuresSectionSchema,
  socialProofSectionSchema,
  testimonialsSectionSchema,
  listicleSectionSchema,
  faqSectionSchema,
  countdownSectionSchema,
  quizSectionSchema,
  leadFormSectionSchema,
  exitIntentSectionSchema,
  ctaSectionSchema,
  complianceSectionSchema,
]);
export type LandingSection = z.infer<typeof landingSectionSchema>;

/* -------------------------------------------------------------------------- */
/* Experiment (A/B) metadata                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A/B experiment grouping stored in the page document. Deployed pages sharing an
 * `experiment.key` within a campaign form one experiment; traffic is split by a
 * stable per-visitor assignment weighted by `weight`. `weight = 0` removes a
 * variant from rotation (used by auto-promote-winner). See `ab.ts`.
 */
export const experimentMetaSchema = z.object({
  key: z.string(),
  label: z.string().default("Variant"),
  weight: z.number().min(0).max(100).default(50),
  isControl: z.boolean().default(false),
  promotedAt: z.string().nullable().default(null),
});
export type ExperimentMeta = z.infer<typeof experimentMetaSchema>;

/* -------------------------------------------------------------------------- */
/* Document                                                                   */
/* -------------------------------------------------------------------------- */

export const landingMetaSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  brandName: z.string().default(""),
  vertical: z.string().default(""),
  angle: z.string().default(""),
  /** Finance content auto-includes a compliance/disclaimer block. */
  isFinance: z.boolean().default(false),
});
export type LandingMeta = z.infer<typeof landingMetaSchema>;

/**
 * The full landing-page document persisted to `landing_pages.sections` (jsonb).
 * The `template_type` column mirrors `template`; `html_content` stores an
 * optional static snapshot rendered on deploy.
 */
export const landingDocumentSchema = z.object({
  version: z.literal(1).default(1),
  template: landingTemplateSchema,
  // Zod v4 `.default()` takes the OUTPUT type; build the full default via parse.
  meta: landingMetaSchema.default(() => landingMetaSchema.parse({})),
  theme: landingThemeSchema.default(() => landingThemeSchema.parse({})),
  sections: z.array(landingSectionSchema).default([]),
  experiment: experimentMetaSchema.nullable().default(null),
  source: z.enum(["ai", "seeded", "manual"]).default("seeded"),
});
export type LandingDocument = z.infer<typeof landingDocumentSchema>;

/**
 * Safe-parse the `sections` jsonb back into a typed `LandingDocument`. Tolerates
 * legacy/partial shapes by returning null so callers can fall back to a freshly
 * generated document instead of throwing.
 */
export function parseLandingDocument(value: unknown): LandingDocument | null {
  const parsed = landingDocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/* -------------------------------------------------------------------------- */
/* Copy spec (what the AI model returns)                                      */
/* -------------------------------------------------------------------------- */

/**
 * The flat copy specification we ask the model to return as strict JSON. Every
 * field is optional so partial/garbled output still validates; the template
 * builder maps present fields onto sections and falls back to deterministic copy
 * for the rest. This guarantees a valid document regardless of model behavior.
 */
export const landingCopySpecSchema = z
  .object({
    metaTitle: z.string(),
    metaDescription: z.string(),
    heroEyebrow: z.string(),
    heroHeadline: z.string(),
    heroSubheadline: z.string(),
    heroBullets: z.array(z.string()),
    ctaLabel: z.string(),
    problemTitle: z.string(),
    problemParagraphs: z.array(z.string()),
    problemBullets: z.array(z.string()),
    benefits: z.array(z.object({ title: z.string(), body: z.string() })),
    socialProof: z.array(z.object({ value: z.string(), label: z.string() })),
    testimonials: z.array(
      z.object({ quote: z.string(), name: z.string(), role: z.string(), rating: z.number().optional() }),
    ),
    listicle: z.array(z.object({ title: z.string(), body: z.string() })),
    quiz: z.array(z.object({ prompt: z.string(), options: z.array(z.string()) })),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    urgencyTitle: z.string(),
    urgencySubtitle: z.string(),
    formTitle: z.string(),
    formSubtitle: z.string(),
    formCta: z.string(),
    successMessage: z.string(),
    exitHeadline: z.string(),
    exitBody: z.string(),
    exitCta: z.string(),
    disclaimers: z.array(z.string()),
  })
  .partial();
export type LandingCopySpec = z.infer<typeof landingCopySpecSchema>;
