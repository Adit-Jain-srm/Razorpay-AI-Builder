import type { ReactNode } from "react";
import { CheckCircle, Play, ShieldCheck, Star } from "@phosphor-icons/react/dist/ssr";

import { resolveThemeVars } from "@/lib/landing/theme";
import type {
  CtaSection,
  FeaturesSection,
  HeroSection,
  LandingDocument,
  LandingSection,
  ListicleSection,
  RichTextSection,
  SocialProofSection,
  TestimonialsSection,
  ComplianceSection,
  ExitIntentSection,
} from "@/lib/landing/types";

import { AnchorButton, CountdownTimer, FaqAccordion, QuizFunnel } from "./interactive";
import { LeadForm } from "./lead-form";

/**
 * The shared landing-page section renderer. Static sections are server-rendered
 * (fast, mobile-first, indexable); interactive sections (lead form, FAQ,
 * countdown, quiz) are client islands. Used by BOTH the public `/lp/[slug]`
 * route and the editor's live preview, so what you edit is what deploys.
 *
 * `RenderContext` is fully serializable, so the public Server Component can call
 * `renderSection` directly without crossing the Server/Client function boundary.
 */

export interface RenderContext {
  mode: "live" | "editor";
  pageId: string;
  visitorId?: string;
}

/* ------------------------------- Static parts ----------------------------- */

function Hero({ section }: { section: HeroSection }) {
  return (
    <section className="px-5 pb-10 pt-14 text-center sm:pt-20">
      {section.media === "badge" && section.badgeText ? (
        <span className="mb-4 inline-block rounded-full border border-[var(--lp-border)] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[var(--lp-muted)]">
          {section.badgeText}
        </span>
      ) : null}
      {section.eyebrow ? (
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--lp-accent)]">{section.eyebrow}</p>
      ) : null}
      <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-[var(--lp-fg)] sm:text-5xl">
        {section.headline}
      </h1>
      {section.subheadline ? (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-[var(--lp-muted)]">{section.subheadline}</p>
      ) : null}
      {section.media === "video" ? (
        <div className="mx-auto mt-8 flex aspect-video max-w-2xl items-center justify-center rounded-[var(--lp-radius)] border border-[var(--lp-border)] bg-[var(--lp-subtle)]">
          <span className="grid size-16 place-items-center rounded-full bg-[var(--lp-accent)] text-[var(--lp-accent-fg)]">
            <Play weight="fill" className="size-7" />
          </span>
        </div>
      ) : null}
      {section.bullets.length ? (
        <ul className="mx-auto mt-6 grid max-w-xl gap-2 text-left">
          {section.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[var(--lp-fg)]">
              <CheckCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-[var(--lp-accent)]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-8">
        <AnchorButton anchor={section.ctaAnchor}>{section.ctaLabel}</AnchorButton>
      </div>
    </section>
  );
}

function RichText({ section }: { section: RichTextSection }) {
  return (
    <section className="px-5 py-8">
      <div className="mx-auto max-w-2xl">
        {section.eyebrow ? (
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--lp-accent)]">{section.eyebrow}</p>
        ) : null}
        {section.title ? <h2 className="text-2xl font-bold text-[var(--lp-fg)]">{section.title}</h2> : null}
        {section.byline ? <p className="mt-1 text-sm italic text-[var(--lp-muted)]">{section.byline}</p> : null}
        <div className="mt-4 space-y-3 text-[var(--lp-fg)]">
          {section.paragraphs.map((p, i) => (
            <p key={i} className="text-pretty leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        {section.bullets.length ? (
          <ul className="mt-4 grid gap-2">
            {section.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[var(--lp-fg)]">
                <CheckCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-[var(--lp-accent)]" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function Features({ section }: { section: FeaturesSection }) {
  return (
    <section className="px-5 py-10">
      <div className="mx-auto max-w-3xl text-center">
        {section.title ? <h2 className="text-2xl font-bold text-[var(--lp-fg)] sm:text-3xl">{section.title}</h2> : null}
        {section.subtitle ? <p className="mx-auto mt-2 max-w-xl text-[var(--lp-muted)]">{section.subtitle}</p> : null}
      </div>
      <div className={section.layout === "list" ? "mx-auto mt-7 grid max-w-2xl gap-4" : "mx-auto mt-7 grid max-w-4xl gap-4 sm:grid-cols-2"}>
        {section.items.map((item, i) => (
          <div key={i} className="rounded-[var(--lp-radius)] border border-[var(--lp-border)] bg-[var(--lp-card)] p-5">
            <CheckCircle weight="duotone" className="size-6 text-[var(--lp-accent)]" />
            <h3 className="mt-3 font-semibold text-[var(--lp-card-fg)]">{item.title}</h3>
            {item.body ? <p className="mt-1 text-sm text-[var(--lp-muted)]">{item.body}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function SocialProof({ section }: { section: SocialProofSection }) {
  return (
    <section className="px-5 py-9">
      <div className="mx-auto max-w-3xl rounded-[var(--lp-radius)] bg-[var(--lp-subtle)] px-6 py-7 text-center">
        {section.title ? <h2 className="mb-4 text-lg font-semibold text-[var(--lp-fg)]">{section.title}</h2> : null}
        <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-5">
          {section.items.map((item, i) => (
            <div key={i}>
              <div className="font-mono text-3xl font-bold text-[var(--lp-accent)]">{item.value}</div>
              <div className="mt-1 text-sm text-[var(--lp-muted)]">{item.label}</div>
            </div>
          ))}
        </div>
        {section.note ? <p className="mt-5 text-sm text-[var(--lp-muted)]">{section.note}</p> : null}
      </div>
    </section>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} weight="fill" className={i < rating ? "size-4 text-amber-400" : "size-4 text-[var(--lp-border)]"} />
      ))}
    </div>
  );
}

function Testimonials({ section }: { section: TestimonialsSection }) {
  return (
    <section className="px-5 py-10">
      {section.title ? <h2 className="mb-6 text-center text-2xl font-bold text-[var(--lp-fg)]">{section.title}</h2> : null}
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
        {section.items.map((item, i) => (
          <figure key={i} className="rounded-[var(--lp-radius)] border border-[var(--lp-border)] bg-[var(--lp-card)] p-5">
            <StarRow rating={item.rating} />
            <blockquote className="mt-3 text-pretty text-[var(--lp-card-fg)]">“{item.quote}”</blockquote>
            <figcaption className="mt-3 text-sm font-medium text-[var(--lp-muted)]">
              {item.name}
              {item.role ? <span className="font-normal"> · {item.role}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Listicle({ section }: { section: ListicleSection }) {
  return (
    <section className="px-5 py-10">
      <div className="mx-auto max-w-2xl">
        {section.title ? <h2 className="text-2xl font-bold text-[var(--lp-fg)] sm:text-3xl">{section.title}</h2> : null}
        {section.intro ? <p className="mt-2 text-[var(--lp-muted)]">{section.intro}</p> : null}
        <ol className="mt-6 space-y-5">
          {section.items.map((item, i) => (
            <li key={i} className="flex gap-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--lp-soft)] font-mono text-sm font-bold text-[var(--lp-soft-fg)]">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-[var(--lp-fg)]">{item.title.replace(/^\d+\.\s*/, "")}</h3>
                {item.body ? <p className="mt-1 text-sm text-[var(--lp-muted)]">{item.body}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Cta({ section }: { section: CtaSection }) {
  return (
    <section className="px-5 py-10">
      <div className="mx-auto max-w-2xl rounded-[var(--lp-radius)] bg-[var(--lp-soft)] px-6 py-9 text-center text-[var(--lp-soft-fg)]">
        {section.headline ? <h2 className="text-2xl font-bold">{section.headline}</h2> : null}
        {section.subtitle ? <p className="mx-auto mt-2 max-w-lg opacity-90">{section.subtitle}</p> : null}
        <div className="mt-5">
          <AnchorButton anchor={section.ctaAnchor}>{section.ctaLabel}</AnchorButton>
        </div>
      </div>
    </section>
  );
}

function Compliance({ section }: { section: ComplianceSection }) {
  return (
    <section className="border-t border-[var(--lp-border)] px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--lp-muted)]">
          <ShieldCheck weight="duotone" className="size-4" />
          {section.title}
        </p>
        <div className="mt-2 space-y-1.5">
          {section.disclaimers.map((line, i) => (
            <p key={i} className="text-xs leading-relaxed text-[var(--lp-muted)]">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function EditorExitIntentCard({ section }: { section: ExitIntentSection }) {
  return (
    <section className="px-5 py-6">
      <div className="mx-auto max-w-2xl rounded-[var(--lp-radius)] border border-dashed border-[var(--lp-border)] bg-[var(--lp-subtle)] p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lp-muted)]">Exit-intent popup</p>
        <h3 className="mt-1 font-semibold text-[var(--lp-fg)]">{section.headline}</h3>
        <p className="mt-1 text-sm text-[var(--lp-muted)]">{section.body}</p>
        <p className="mt-2 text-[11px] text-[var(--lp-muted)]">Shown automatically on the live page when a visitor goes to leave.</p>
      </div>
    </section>
  );
}

/* ------------------------------ Section switch ---------------------------- */

/** Renders a single section. Returns null for sections handled at page level. */
export function renderSection(section: LandingSection, ctx: RenderContext): ReactNode {
  switch (section.type) {
    case "hero":
      return <Hero section={section} />;
    case "rich_text":
      return <RichText section={section} />;
    case "features":
      return <Features section={section} />;
    case "social_proof":
      return <SocialProof section={section} />;
    case "testimonials":
      return <Testimonials section={section} />;
    case "listicle":
      return <Listicle section={section} />;
    case "faq":
      return (
        <section className="px-5 py-10">
          {section.title ? <h2 className="mb-6 text-center text-2xl font-bold text-[var(--lp-fg)]">{section.title}</h2> : null}
          <FaqAccordion section={section} />
        </section>
      );
    case "countdown":
      return (
        <section className="px-5 py-8">
          <CountdownTimer section={section} />
        </section>
      );
    case "quiz":
      return (
        <section className="px-5 py-10">
          <QuizFunnel section={section} />
        </section>
      );
    case "lead_form":
      return (
        <section id="lead" className="scroll-mt-6 px-5 py-10">
          <div className="mx-auto max-w-md rounded-[var(--lp-radius)] border border-[var(--lp-border)] bg-[var(--lp-subtle)] p-6">
            <h2 className="text-center text-2xl font-bold text-[var(--lp-fg)]">{section.title}</h2>
            {section.subtitle ? <p className="mt-1 mb-4 text-center text-[var(--lp-muted)]">{section.subtitle}</p> : <div className="mb-4" />}
            <LeadForm pageId={ctx.pageId} visitorId={ctx.visitorId} section={section} mode={ctx.mode} />
          </div>
        </section>
      );
    case "cta":
      return <Cta section={section} />;
    case "compliance":
      return <Compliance section={section} />;
    case "exit_intent":
      // Live: rendered as a popup at page level. Editor: show a config card.
      return ctx.mode === "editor" ? <EditorExitIntentCard section={section} /> : null;
    default:
      return null;
  }
}

/* --------------------------------- Frame ---------------------------------- */

/** Applies the page's self-contained theme (CSS vars) + base layout. */
export function LandingFrame({ document, children }: { document: LandingDocument; children: ReactNode }) {
  return (
    <div
      style={resolveThemeVars(document.theme)}
      className="min-h-dvh bg-[var(--lp-bg)] text-[var(--lp-fg)] [font-family:var(--lp-font)] [scroll-behavior:smooth] motion-reduce:[scroll-behavior:auto]"
    >
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  );
}

/** Finds the exit-intent section in a document (mounted as a popup on the live page). */
export function findExitIntent(document: LandingDocument): ExitIntentSection | null {
  const section = document.sections.find((s) => s.type === "exit_intent");
  return section && section.type === "exit_intent" ? section : null;
}
