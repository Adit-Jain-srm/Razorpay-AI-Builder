"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { CountdownSection, FaqSection, QuizSection } from "@/lib/landing/types";

/**
 * Interactive landing-page section islands: FAQ accordion, urgency countdown,
 * and the quiz-funnel stepper. Each is reduced-motion safe and renders a stable
 * first paint (no `Date.now()` during initial render) to avoid hydration drift.
 */

/* -------------------------------------- FAQ ------------------------------- */

export function FaqAccordion({ section }: { section: FaqSection }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-2xl divide-y divide-[var(--lp-border)] overflow-hidden rounded-[var(--lp-radius)] border border-[var(--lp-border)] bg-[var(--lp-card)]">
      {section.items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[var(--lp-card-fg)]"
              aria-expanded={isOpen}
            >
              <span className="font-medium">{item.q}</span>
              <CaretDown
                weight="bold"
                className={cn("size-4 shrink-0 text-[var(--lp-muted)] transition-transform motion-reduce:transition-none", isOpen && "rotate-180")}
              />
            </button>
            {isOpen ? <p className="px-4 pb-4 text-sm text-[var(--lp-muted)]">{item.a}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------- Countdown ---------------------------- */

function formatRemaining(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export function CountdownTimer({ section }: { section: CountdownSection }) {
  const initialSeconds = section.durationMinutes * 60;
  const [remaining, setRemaining] = useState(initialSeconds);
  const deadlineRef = useRef<number | null>(null);

  useEffect(() => {
    deadlineRef.current = Date.now() + initialSeconds * 1000;
    const tick = () => {
      if (deadlineRef.current == null) return;
      setRemaining(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [initialSeconds]);

  return (
    <div className="mx-auto max-w-xl rounded-[var(--lp-radius)] bg-[var(--lp-soft)] px-6 py-6 text-center text-[var(--lp-soft-fg)]">
      {section.title ? <h2 className="text-xl font-semibold">{section.title}</h2> : null}
      {section.subtitle ? <p className="mt-1 text-sm opacity-80">{section.subtitle}</p> : null}
      <div className="my-4 font-mono text-4xl font-bold tabular-nums" aria-live="off">
        {remaining > 0 ? formatRemaining(remaining) : "Last chance"}
      </div>
      <AnchorButton anchor={section.ctaAnchor}>{section.ctaLabel}</AnchorButton>
    </div>
  );
}

/* ------------------------------------- Quiz ------------------------------- */

export function QuizFunnel({ section }: { section: QuizSection }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const total = section.questions.length;
  const done = step >= total;

  const choose = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setStep((prev) => prev + 1);
  };

  if (total === 0) return null;

  return (
    <div className="mx-auto max-w-xl rounded-[var(--lp-radius)] border border-[var(--lp-border)] bg-[var(--lp-card)] p-6">
      {section.title ? <h2 className="text-center text-xl font-semibold text-[var(--lp-card-fg)]">{section.title}</h2> : null}
      {section.subtitle ? <p className="mt-1 text-center text-sm text-[var(--lp-muted)]">{section.subtitle}</p> : null}

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--lp-border)]">
        <div
          className="h-full rounded-full bg-[var(--lp-accent)] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${Math.round((Math.min(step, total) / total) * 100)}%` }}
        />
      </div>

      {!done ? (
        <div className="mt-5">
          <p className="text-center text-base font-medium text-[var(--lp-card-fg)]">{section.questions[step].prompt}</p>
          <div className="mt-4 grid gap-2.5">
            {section.questions[step].options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => choose(section.questions[step].id, option.id)}
                className="rounded-[calc(var(--lp-radius)-4px)] border border-[var(--lp-border)] bg-[var(--lp-bg)] px-4 py-3 text-left text-[var(--lp-fg)] transition-colors hover:border-[var(--lp-accent)] hover:bg-[var(--lp-soft)]"
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-[var(--lp-muted)]">
            Question {step + 1} of {total}
          </p>
        </div>
      ) : (
        <div className="mt-5 text-center">
          <h3 className="text-lg font-semibold text-[var(--lp-card-fg)]">{section.resultTitle}</h3>
          <p className="mt-1 text-sm text-[var(--lp-muted)]">{section.resultBody}</p>
          <div className="mt-4">
            <AnchorButton anchor={section.ctaAnchor}>{section.ctaLabel}</AnchorButton>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setAnswers({});
            }}
            className="mt-3 text-xs text-[var(--lp-muted)] underline-offset-2 hover:underline"
          >
            Retake the quiz
          </button>
        </div>
      )}
      <span className="sr-only">{Object.keys(answers).length} answered</span>
    </div>
  );
}

/* --------------------------------- Anchor CTA ----------------------------- */

export function AnchorButton({ anchor, children }: { anchor: string; children: React.ReactNode }) {
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!anchor.startsWith("#")) return;
    const target = typeof document !== "undefined" ? document.getElementById(anchor.slice(1)) : null;
    if (!target) return;
    event.preventDefault();
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  return (
    <a
      href={anchor}
      onClick={onClick}
      className="inline-block rounded-[var(--lp-radius)] bg-[var(--lp-accent)] px-6 py-3 text-base font-semibold text-[var(--lp-accent-fg)] transition-colors hover:bg-[var(--lp-accent-hover)]"
    >
      {children}
    </a>
  );
}
