import {
  type ComplianceSection,
  type ExperimentMeta,
  type LandingAccent,
  type LandingCopySpec,
  type LandingDocument,
  type LandingSection,
  type LandingTemplate,
  type LandingTheme,
} from "./types";

/**
 * The 5 landing-page templates, each expressed as a deterministic section
 * builder that applies a direct-response framework:
 *
 *   - squeeze         - AIDA, single-CTA email capture (minimal)
 *   - long_form_sales - PAS -> AIDA VSL (problem/agitate, proof, urgency)
 *   - quiz_funnel     - micro-commitment quiz -> gated lead capture
 *   - advertorial     - editorial/native story with a soft PAS arc
 *   - listicle        - numbered value stack -> CTA
 *
 * PURE + client-safe. The builder maps an optional `LandingCopySpec` (AI output)
 * onto the section structure and falls back to high-quality deterministic copy
 * derived from the campaign context, so the SEEDED path looks compelling with
 * zero credentials. Finance verticals auto-receive a compliance/disclaimer block.
 */

export interface LandingContext {
  brandName: string;
  vertical: string;
  /** Product/offer name, e.g. "Retirement Income Weekly". */
  productName?: string;
  /** Positioning angle, e.g. "no-upsell trust". */
  angle?: string;
  /** Audience/persona descriptor, e.g. "near-retirees worried about inflation". */
  audience?: string;
  painPoints: string[];
  benefits: string[];
  /** The lead-magnet/offer, e.g. "the free 2026 income guide". */
  offer?: string;
}

export interface TemplateInfo {
  template: LandingTemplate;
  name: string;
  description: string;
  framework: "AIDA" | "PAS" | "PAS + AIDA";
  /** Default accent for a fresh page of this template. */
  accent: LandingAccent;
  bestFor: string;
}

export const TEMPLATE_LIBRARY: Record<LandingTemplate, TemplateInfo> = {
  squeeze: {
    template: "squeeze",
    name: "Squeeze page",
    description: "One promise, one form. The fastest path from click to email.",
    framework: "AIDA",
    accent: "emerald",
    bestFor: "Lead magnets, newsletter signups, webinar registrations",
  },
  long_form_sales: {
    template: "long_form_sales",
    name: "Long-form sales (VSL)",
    description: "A full direct-response narrative: problem, proof, urgency, ask.",
    framework: "PAS + AIDA",
    accent: "blue",
    bestFor: "Higher-intent offers that need to overcome skepticism",
  },
  quiz_funnel: {
    template: "quiz_funnel",
    name: "Quiz funnel",
    description: "Micro-commitments earn the email - interactive and personalized.",
    framework: "AIDA",
    accent: "violet",
    bestFor: "Segmentation, personalization, high engagement",
  },
  advertorial: {
    template: "advertorial",
    name: "Advertorial",
    description: "An editorial-style story that warms cold traffic before the ask.",
    framework: "PAS",
    accent: "amber",
    bestFor: "Native/Taboola traffic, cold audiences",
  },
  listicle: {
    template: "listicle",
    name: "Listicle",
    description: "A scannable numbered value stack that builds to a single CTA.",
    framework: "AIDA",
    accent: "teal",
    bestFor: "Curiosity-driven clicks, content-style ads",
  },
};

export const TEMPLATE_ORDER: LandingTemplate[] = [
  "squeeze",
  "long_form_sales",
  "quiz_funnel",
  "advertorial",
  "listicle",
];

/* -------------------------------------------------------------------------- */
/* Context helpers                                                            */
/* -------------------------------------------------------------------------- */

const FINANCE_HINTS = [
  "financ",
  "invest",
  "retire",
  "money",
  "income",
  "wealth",
  "stock",
  "trading",
  "crypto",
  "dividend",
  "newsletter",
  "portfolio",
  "savings",
  "annuit",
  "pension",
];

/** Heuristic: does this content need financial compliance disclaimers? */
export function detectFinance(vertical: string, painPoints: string[] = []): boolean {
  const haystack = `${vertical} ${painPoints.join(" ")}`.toLowerCase();
  return FINANCE_HINTS.some((hint) => haystack.includes(hint));
}

function title(text: string): string {
  return text.length ? text[0].toUpperCase() + text.slice(1) : text;
}

function firstSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const match = trimmed.match(/^(.*?[.!?])(\s|$)/);
  return (match ? match[1] : trimmed).trim();
}

/** Standard financial-services disclaimers, used when the vertical is finance. */
export const FINANCE_DISCLAIMERS = [
  "This is marketing content, not financial advice. It does not consider your personal circumstances.",
  "Investing involves risk, including the possible loss of principal. Past performance does not guarantee future results.",
  "Any figures or examples are illustrative estimates, clearly labeled as estimates, and are not a promise of results.",
  "Consult a licensed financial professional before making investment decisions.",
];

/* -------------------------------------------------------------------------- */
/* Deterministic copy derivation                                             */
/* -------------------------------------------------------------------------- */

interface DerivedCopy {
  brand: string;
  product: string;
  offer: string;
  audience: string;
  angle: string;
  topPain: string;
  pains: string[];
  benefits: string[];
}

function derive(ctx: LandingContext): DerivedCopy {
  const brand = ctx.brandName?.trim() || "Your brand";
  const product = ctx.productName?.trim() || brand;
  const audience = ctx.audience?.trim() || "people like you";
  const angle = ctx.angle?.trim() || "";
  const pains = ctx.painPoints.map((p) => p.trim()).filter(Boolean);
  const benefits =
    ctx.benefits.length > 0
      ? ctx.benefits.map((b) => b.trim()).filter(Boolean)
      : pains.slice(0, 3).map((p) => `A clear plan for ${p.toLowerCase()}`);
  return {
    brand,
    product,
    offer: ctx.offer?.trim() || "the free guide",
    audience,
    angle,
    topPain: pains[0] ?? "the problem keeping you up at night",
    pains,
    benefits: benefits.length ? benefits : ["A clear, jargon-free plan", "Built on proven fundamentals", "No hype, no upsell"],
  };
}

/* -------------------------------------------------------------------------- */
/* Section factories (apply copy spec over derived defaults)                 */
/* -------------------------------------------------------------------------- */

let SECTION_SEQ = 0;
/** Deterministic-per-build id; stable enough for tests, unique within a doc. */
function sectionId(type: string): string {
  SECTION_SEQ += 1;
  return `sec_${type}_${SECTION_SEQ}`;
}

function pick<T>(value: T | undefined | null, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") return (value.trim() ? value : fallback) as T;
  if (Array.isArray(value)) return (value.length ? value : fallback) as T;
  return value;
}

function heroSection(d: DerivedCopy, copy: LandingCopySpec, ctaLabel: string): LandingSection {
  const headline = pick(
    copy.heroHeadline,
    d.angle ? `${title(d.angle)}: ${d.product} for ${d.audience}` : `${d.product} for ${d.audience}`,
  );
  return {
    id: sectionId("hero"),
    type: "hero",
    label: "Hero",
    framework: "aida",
    eyebrow: pick(copy.heroEyebrow, d.brand),
    headline,
    subheadline: pick(
      copy.heroSubheadline,
      `Get ${d.offer} - the plain-English way to tackle ${d.topPain.toLowerCase()} without the hype.`,
    ),
    bullets: pick(copy.heroBullets, d.benefits.slice(0, 3)),
    ctaLabel,
    ctaAnchor: "#lead",
    media: "none",
    badgeText: "",
  };
}

function problemSection(d: DerivedCopy, copy: LandingCopySpec): LandingSection {
  return {
    id: sectionId("rich_text"),
    type: "rich_text",
    label: "Problem / agitate",
    framework: "pas",
    eyebrow: "The real problem",
    title: pick(copy.problemTitle, `Why ${d.audience} keep getting this wrong`),
    byline: "",
    paragraphs: pick(copy.problemParagraphs, [
      `If you're worried about ${d.topPain.toLowerCase()}, you're not imagining it. The advice out there is either too complicated, too conflicted, or too late.`,
      `Most ${d.audience} are sold hype instead of a plan. ${d.brand} was built to fix exactly that.`,
    ]),
    bullets: pick(copy.problemBullets, d.pains.slice(0, 4)),
  };
}

function benefitsSection(d: DerivedCopy, copy: LandingCopySpec): LandingSection {
  const items = pick(
    copy.benefits,
    d.benefits.map((b) => ({ title: title(b), body: "" })),
  );
  return {
    id: sectionId("features"),
    type: "features",
    label: "Benefits",
    framework: "aida",
    title: "What you'll get",
    subtitle: `Everything ${d.audience} need - and nothing they don't.`,
    items: items.map((item) => ({
      title: item.title,
      body: item.body || `Concrete, do-this-next guidance you can act on today.`,
      icon: "CheckCircle",
    })),
    layout: "grid",
  };
}

function socialProofSection(d: DerivedCopy, copy: LandingCopySpec): LandingSection {
  const items = pick(copy.socialProof, [
    { value: "27,000+", label: `${title(d.audience)} subscribed` },
    { value: "4.8/5", label: "Average reader rating" },
    { value: "12 yrs", label: "Track record" },
  ]);
  return {
    id: sectionId("social_proof"),
    type: "social_proof",
    label: "Social proof",
    framework: "aida",
    variant: "stats",
    title: "",
    items,
    note: "Trusted by readers who were tired of the hype.",
  };
}

function testimonialsSection(d: DerivedCopy, copy: LandingCopySpec): LandingSection {
  const items = pick(copy.testimonials, [
    {
      quote: `Finally, ${d.brand} explains it without the jargon. I actually feel in control for the first time.`,
      name: "Margaret T.",
      role: d.audience,
      rating: 5,
    },
    {
      quote: `No upsell, no fear-mongering - just a plan I could follow. Worth every minute.`,
      name: "David R.",
      role: "Subscriber",
      rating: 5,
    },
  ]);
  return {
    id: sectionId("testimonials"),
    type: "testimonials",
    label: "Testimonials",
    framework: "aida",
    title: "What readers say",
    items: items.map((t) => ({ quote: t.quote, name: t.name, role: t.role, rating: t.rating ?? 5 })),
  };
}

function faqSection(d: DerivedCopy, copy: LandingCopySpec): LandingSection {
  const items = pick(copy.faq, [
    { q: "Is this really free?", a: `Yes - ${d.offer} is completely free. We earn trust first.` },
    { q: "Will you spam me?", a: "Never. One useful email, unsubscribe anytime, no games." },
    { q: `Is this right for ${d.audience}?`, a: `It's built specifically for ${d.audience}.` },
  ]);
  return {
    id: sectionId("faq"),
    type: "faq",
    label: "FAQ",
    title: "Questions, answered",
    items,
  };
}

function leadFormSection(d: DerivedCopy, copy: LandingCopySpec, ctaLabel: string): LandingSection {
  return {
    id: sectionId("lead_form"),
    type: "lead_form",
    label: "Lead form",
    framework: "aida",
    title: pick(copy.formTitle, `Get ${d.offer}`),
    subtitle: pick(copy.formSubtitle, "Enter your email and it's on its way - free."),
    collectName: true,
    ctaLabel: pick(copy.formCta, ctaLabel),
    disclaimer: "We respect your inbox. Unsubscribe anytime.",
    successTitle: "You're in.",
    successMessage: pick(copy.successMessage, `Check your inbox - ${d.offer} is on the way.`),
  };
}

function countdownSection(copy: LandingCopySpec): LandingSection {
  return {
    id: sectionId("countdown"),
    type: "countdown",
    label: "Urgency",
    framework: "aida",
    title: pick(copy.urgencyTitle, "This offer closes soon"),
    subtitle: pick(copy.urgencySubtitle, "Secure your free guide before enrollment pauses."),
    durationMinutes: 30,
    ctaLabel: "Claim my spot",
    ctaAnchor: "#lead",
  };
}

function exitIntentSection(d: DerivedCopy, copy: LandingCopySpec): LandingSection {
  return {
    id: sectionId("exit_intent"),
    type: "exit_intent",
    label: "Exit-intent popup",
    headline: pick(copy.exitHeadline, "Wait - don't leave empty-handed"),
    body: pick(copy.exitBody, `Grab ${d.offer} before you go. It's free and takes 10 seconds.`),
    incentive: "",
    ctaLabel: pick(copy.exitCta, "Send my free guide"),
  };
}

function complianceSection(disclaimers: string[]): ComplianceSection {
  return {
    id: sectionId("compliance"),
    type: "compliance",
    label: "Disclosures",
    title: "Important disclosures",
    disclaimers,
  };
}

function ctaSection(d: DerivedCopy, ctaLabel: string): LandingSection {
  return {
    id: sectionId("cta"),
    type: "cta",
    label: "Closing CTA",
    framework: "aida",
    headline: `Ready when you are`,
    subtitle: `Join thousands of ${d.audience} who chose clarity over hype.`,
    ctaLabel,
    ctaAnchor: "#lead",
  };
}

function listicleSection(d: DerivedCopy, copy: LandingCopySpec): LandingSection {
  const items = pick(
    copy.listicle,
    d.benefits.map((b, i) => ({ title: `${i + 1}. ${title(b)}`, body: "Here's exactly why it matters and what to do." })),
  );
  return {
    id: sectionId("listicle"),
    type: "listicle",
    label: "The list",
    framework: "aida",
    title: pick(copy.heroHeadline, `${items.length} things ${d.audience} should know`),
    intro: `We cut through the noise. Here is what actually matters for ${d.topPain.toLowerCase()}.`,
    items: items.map((item, i) => ({ title: item.title.match(/^\d/) ? item.title : `${i + 1}. ${item.title}`, body: item.body })),
  };
}

function quizSection(d: DerivedCopy, copy: LandingCopySpec): LandingSection {
  const fromSpec = (copy.quiz ?? []).map((q, i) => ({
    id: `q${i + 1}`,
    prompt: q.prompt,
    options: q.options.map((label, j) => ({ id: `q${i + 1}o${j + 1}`, label })),
  }));
  const questions =
    fromSpec.length > 0
      ? fromSpec
      : [
          {
            id: "q1",
            prompt: `What worries you most about ${d.topPain.toLowerCase()}?`,
            options: [
              { id: "q1o1", label: "Running out of time to fix it" },
              { id: "q1o2", label: "Not knowing who to trust" },
              { id: "q1o3", label: "Feeling overwhelmed by the jargon" },
            ],
          },
          {
            id: "q2",
            prompt: "How would you describe your current plan?",
            options: [
              { id: "q2o1", label: "I don't really have one" },
              { id: "q2o2", label: "A rough idea, but no confidence" },
              { id: "q2o3", label: "Solid - I just want to optimize" },
            ],
          },
        ];
  return {
    id: sectionId("quiz"),
    type: "quiz",
    label: "Quiz",
    framework: "aida",
    title: pick(copy.heroHeadline, `Find your ${d.brand} plan in 30 seconds`),
    subtitle: "Answer 2 quick questions and we'll tailor your free recommendation.",
    questions,
    ctaLabel: "See my result",
    resultTitle: "Your personalized plan is ready",
    resultBody: `Enter your email to unlock the ${d.offer} matched to your answers.`,
    ctaAnchor: "#lead",
  };
}

/* -------------------------------------------------------------------------- */
/* Template assembly                                                          */
/* -------------------------------------------------------------------------- */

function defaultTheme(template: LandingTemplate): LandingTheme {
  const info = TEMPLATE_LIBRARY[template];
  return {
    accent: info.accent,
    mode: template === "long_form_sales" ? "dark" : "light",
    radius: "lg",
    font: template === "advertorial" ? "serif" : "geist",
  };
}

function buildSections(template: LandingTemplate, d: DerivedCopy, copy: LandingCopySpec, isFinance: boolean): LandingSection[] {
  const ctaLabel = pick(copy.ctaLabel, d.offer === "the free guide" ? "Get the free guide" : `Get ${d.offer}`);
  const compliance = isFinance ? [complianceSection(FINANCE_DISCLAIMERS)] : [];

  switch (template) {
    case "squeeze":
      return [
        heroSection(d, copy, ctaLabel),
        socialProofSection(d, copy),
        leadFormSection(d, copy, ctaLabel),
        exitIntentSection(d, copy),
        ...compliance,
      ];
    case "long_form_sales":
      return [
        { ...heroSection(d, copy, ctaLabel), media: "video" } as LandingSection,
        problemSection(d, copy),
        benefitsSection(d, copy),
        socialProofSection(d, copy),
        testimonialsSection(d, copy),
        countdownSection(copy),
        leadFormSection(d, copy, ctaLabel),
        faqSection(d, copy),
        exitIntentSection(d, copy),
        ...compliance,
      ];
    case "quiz_funnel":
      return [
        heroSection(d, copy, ctaLabel),
        quizSection(d, copy),
        leadFormSection(d, copy, ctaLabel),
        socialProofSection(d, copy),
        ...compliance,
      ];
    case "advertorial":
      return [
        { ...heroSection(d, copy, ctaLabel), eyebrow: "Advertisement", media: "badge", badgeText: "Sponsored" } as LandingSection,
        problemSection(d, copy),
        benefitsSection(d, copy),
        testimonialsSection(d, copy),
        ctaSection(d, ctaLabel),
        leadFormSection(d, copy, ctaLabel),
        exitIntentSection(d, copy),
        ...compliance,
      ];
    case "listicle":
      return [
        heroSection(d, copy, ctaLabel),
        listicleSection(d, copy),
        ctaSection(d, ctaLabel),
        leadFormSection(d, copy, ctaLabel),
        ...compliance,
      ];
    default:
      return [heroSection(d, copy, ctaLabel), leadFormSection(d, copy, ctaLabel), ...compliance];
  }
}

export interface BuildDocumentOptions {
  copy?: LandingCopySpec;
  source?: LandingDocument["source"];
  experiment?: ExperimentMeta | null;
  theme?: Partial<LandingTheme>;
}

/**
 * Builds a complete, valid `LandingDocument` for a template. Maps an optional AI
 * `copy` spec over deterministic context-derived defaults so the result is
 * always renderable; finance verticals get a compliance block automatically.
 */
export function buildLandingDocument(
  template: LandingTemplate,
  ctx: LandingContext,
  options: BuildDocumentOptions = {},
): LandingDocument {
  const copy = options.copy ?? {};
  const d = derive(ctx);
  const isFinance = detectFinance(ctx.vertical, ctx.painPoints);
  const sections = buildSections(template, d, copy, isFinance);

  const metaTitle = pick(copy.metaTitle, `${d.product} - ${d.angle ? title(d.angle) : "Get the free guide"}`);
  const heroSub = sections.find((s) => s.type === "hero");
  const metaDescription = pick(
    copy.metaDescription,
    firstSentence(heroSub && "subheadline" in heroSub ? heroSub.subheadline : `${d.product} for ${d.audience}.`),
  );

  return {
    version: 1,
    template,
    meta: {
      title: metaTitle,
      description: metaDescription,
      brandName: d.brand,
      vertical: ctx.vertical,
      angle: d.angle,
      isFinance,
    },
    theme: { ...defaultTheme(template), ...options.theme },
    sections,
    experiment: options.experiment ?? null,
    source: options.source ?? (options.copy ? "ai" : "seeded"),
  };
}

/** Resets the section-id sequence (used by deterministic tests/fixtures). */
export function resetSectionSequence(seed = 0): void {
  SECTION_SEQ = seed;
}

/* -------------------------------------------------------------------------- */
/* Per-section regeneration (deterministic alternates)                       */
/* -------------------------------------------------------------------------- */

function rotate<T>(pool: readonly T[], nonce: number, current?: T): T {
  if (pool.length === 0) return current as T;
  // Skip the current value when possible so a "regenerate" visibly changes copy.
  const filtered = current === undefined ? pool : pool.filter((v) => v !== current);
  const choices = filtered.length > 0 ? filtered : pool;
  return choices[Math.abs(nonce) % choices.length];
}

const HERO_HEADLINE_ALTS = [
  "The plain-English plan {audience} actually trust",
  "Finally - {offer}, without the hype",
  "What every {audience} should know before it's too late",
  "Stop guessing. Start with {offer}.",
];
const HERO_SUB_ALTS = [
  "No jargon, no upsells, no fear-mongering. Just the plan.",
  "Built for {audience} who want clarity over noise.",
  "Get it free in under 60 seconds.",
];
const CTA_ALTS = ["Get the free guide", "Send it to me", "Show me the plan", "Claim my free copy"];

/**
 * Produces a deterministic copy variation of a section (used by per-section
 * "regenerate" in the credential-free demo, and as the seeded path when Azure is
 * unavailable). Keeps the section id + structure; only rotates copy. PURE.
 */
export function varySectionCopy(section: LandingSection, ctx: LandingContext, nonce: number): LandingSection {
  const d = derive(ctx);
  const fill = (text: string): string =>
    text.replace(/\{audience\}/g, d.audience).replace(/\{offer\}/g, d.offer).replace(/\{brand\}/g, d.brand);

  switch (section.type) {
    case "hero":
      return {
        ...section,
        headline: fill(rotate(HERO_HEADLINE_ALTS, nonce, undefined)),
        subheadline: fill(rotate(HERO_SUB_ALTS, nonce + 1, undefined)),
        ctaLabel: rotate(CTA_ALTS, nonce + 2, section.ctaLabel),
      };
    case "lead_form":
      return { ...section, ctaLabel: rotate(CTA_ALTS, nonce, section.ctaLabel) };
    case "cta":
      return {
        ...section,
        headline: rotate(
          ["Ready when you are", "Your plan is one click away", "Join thousands who chose clarity"],
          nonce,
          section.headline,
        ),
        ctaLabel: rotate(CTA_ALTS, nonce + 1, section.ctaLabel),
      };
    case "features":
      return {
        ...section,
        subtitle: rotate(
          [
            `Everything ${d.audience} need - and nothing they don't.`,
            "The essentials, explained in plain English.",
            "No filler. Just what moves the needle.",
          ],
          nonce,
          section.subtitle,
        ),
      };
    case "rich_text":
      return {
        ...section,
        title: rotate(
          [`Why ${d.audience} keep getting this wrong`, "The mistake almost everyone makes", "Here's what nobody tells you"],
          nonce,
          section.title,
        ),
      };
    case "listicle":
      return {
        ...section,
        intro: rotate(
          [
            `We cut through the noise. Here's what actually matters for ${d.topPain.toLowerCase()}.`,
            "Skim these in two minutes. Each one can save you real money.",
            "The shortlist we wish someone had handed us years ago.",
          ],
          nonce,
          section.intro,
        ),
      };
    case "countdown":
      return {
        ...section,
        title: rotate(["This offer closes soon", "Enrollment pauses shortly", "Don't miss this window"], nonce, section.title),
      };
    case "quiz":
      return {
        ...section,
        title: rotate(
          [`Find your ${d.brand} plan in 30 seconds`, "Answer 2 questions, get your plan", "What's your retirement readiness?"],
          nonce,
          section.title,
        ),
      };
    case "exit_intent":
      return {
        ...section,
        headline: rotate(
          ["Wait - don't leave empty-handed", "Before you go...", "One last thing"],
          nonce,
          section.headline,
        ),
      };
    case "social_proof":
      return {
        ...section,
        note: rotate(
          ["Trusted by readers who were tired of the hype.", "Join a community that values straight talk.", ""],
          nonce,
          section.note,
        ),
      };
    default:
      return section;
  }
}
