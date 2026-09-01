import { TEMPLATE_LIBRARY } from "./templates";
import type { LandingContext } from "./templates";
import type { LandingTemplate } from "./types";

/**
 * Prompt builders for AI landing-page copy generation. PURE + client-safe (no
 * server imports). The model is asked to return a single strict-JSON object
 * matching `LandingCopySpec`; `generate.ts` extracts, zod-validates, and maps it
 * onto the chosen template. Keeping prompts here makes them reviewable and
 * testable without touching the Azure client.
 */

const FRAMEWORK_GUIDANCE: Record<LandingTemplate, string> = {
  squeeze:
    "Use AIDA. The hero must land one specific promise tied to the offer. Keep it tight - attention, interest, then a single clear call to action. No fluff.",
  long_form_sales:
    "Use PAS then AIDA. Open by naming the reader's problem and agitating the cost of inaction, then pivot to the solution with proof, benefits, urgency, and a confident ask.",
  quiz_funnel:
    "Use AIDA with micro-commitments. Write 2-3 short diagnostic questions whose answers make the reader feel understood, then frame the email capture as unlocking their personalized result.",
  advertorial:
    "Use PAS in an editorial, third-person 'story' voice (like a journalist who found a solution). It must read as helpful content, not an ad, while staying truthful. Mark it as sponsored.",
  listicle:
    "Use AIDA in a numbered-list voice. Each item is a curiosity-driven, skimmable point that builds toward a single call to action at the end.",
};

/** System prompt: role, framework, and strict-JSON contract for a template. */
export function buildLandingSystemPrompt(template: LandingTemplate): string {
  const info = TEMPLATE_LIBRARY[template];
  return [
    "You are a senior direct-response copywriter and conversion strategist.",
    `You are writing a "${info.name}" landing page. ${info.description}`,
    `Framework: ${FRAMEWORK_GUIDANCE[template]}`,
    "Write specific, concrete, benefit-led copy in the audience's own language. Avoid hype, avoid em-dashes, avoid vague claims, and never fabricate statistics, prices, or endorsements.",
    "Return ONE JSON object only - no prose, no markdown fences. Use only these optional keys (omit any you don't need):",
    "{",
    '  "metaTitle": string, "metaDescription": string,',
    '  "heroEyebrow": string, "heroHeadline": string, "heroSubheadline": string, "heroBullets": string[], "ctaLabel": string,',
    '  "problemTitle": string, "problemParagraphs": string[], "problemBullets": string[],',
    '  "benefits": [{ "title": string, "body": string }],',
    '  "socialProof": [{ "value": string, "label": string }],',
    '  "testimonials": [{ "quote": string, "name": string, "role": string, "rating": number }],',
    '  "listicle": [{ "title": string, "body": string }],',
    '  "quiz": [{ "prompt": string, "options": string[] }],',
    '  "faq": [{ "q": string, "a": string }],',
    '  "urgencyTitle": string, "urgencySubtitle": string,',
    '  "formTitle": string, "formSubtitle": string, "formCta": string, "successMessage": string,',
    '  "exitHeadline": string, "exitBody": string, "exitCta": string,',
    '  "disclaimers": string[]',
    "}",
    "Testimonials must be plausible but clearly illustrative; do not invent real people or brands. If the vertical is financial, keep all claims compliant and never promise returns.",
  ].join("\n");
}

/** User prompt: the campaign context the model should ground its copy in. */
export function buildLandingUserPrompt(template: LandingTemplate, ctx: LandingContext): string {
  const lines: string[] = [
    `Brand: ${ctx.brandName || "(unnamed)"}`,
    `Vertical: ${ctx.vertical || "(general)"}`,
  ];
  if (ctx.productName) lines.push(`Product/offer name: ${ctx.productName}`);
  if (ctx.offer) lines.push(`Lead magnet / offer: ${ctx.offer}`);
  if (ctx.audience) lines.push(`Audience: ${ctx.audience}`);
  if (ctx.angle) lines.push(`Positioning angle (lead with this): ${ctx.angle}`);
  if (ctx.painPoints.length) {
    lines.push("Audience pain points (use their exact language where possible):");
    for (const pain of ctx.painPoints.slice(0, 8)) lines.push(`  - ${pain}`);
  }
  if (ctx.benefits.length) {
    lines.push("Key benefits to feature:");
    for (const benefit of ctx.benefits.slice(0, 8)) lines.push(`  - ${benefit}`);
  }
  lines.push("");
  lines.push(`Write the ${TEMPLATE_LIBRARY[template].name} copy now as a single JSON object.`);
  return lines.join("\n");
}
