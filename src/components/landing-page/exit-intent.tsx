"use client";

import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";

import type { ExitIntentSection } from "@/lib/landing/types";

import { LeadForm } from "./lead-form";

/**
 * Exit-intent popup. Fires once per session when the visitor moves to leave
 * (cursor exits the viewport top on desktop) or after a dwell timer (mobile
 * fallback). Reuses the conversion `LeadForm`. Honors reduced motion (fade only)
 * and is fully dismissible/escapable.
 */

interface ExitIntentProps {
  pageId: string;
  visitorId?: string;
  section: ExitIntentSection;
}

export function ExitIntentPopup({ pageId, visitorId, section }: ExitIntentProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `lp_exit_${pageId}`;
    let shown = false;
    try {
      shown = sessionStorage.getItem(key) === "1";
    } catch {
      shown = false;
    }
    if (shown) return;

    const trigger = () => {
      if (shown) return;
      shown = true;
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // ignore (private mode)
      }
      setOpen(true);
      cleanup();
    };

    const onMouseOut = (event: MouseEvent) => {
      if (event.clientY <= 0 && !event.relatedTarget) trigger();
    };
    const timer = window.setTimeout(trigger, 30000);
    document.addEventListener("mouseout", onMouseOut);
    const cleanup = () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", onMouseOut);
    };
    return cleanup;
  }, [pageId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label={section.headline}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-[var(--lp-radius)] bg-[var(--lp-card)] p-6 text-[var(--lp-card-fg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-[var(--lp-muted)] hover:bg-[var(--lp-soft)]"
          aria-label="Close"
        >
          <X weight="bold" className="size-4" />
        </button>
        <h2 className="pr-6 text-xl font-semibold">{section.headline}</h2>
        <p className="mt-1 text-sm text-[var(--lp-muted)]">{section.body}</p>
        {section.incentive ? (
          <p className="mt-2 inline-block rounded-full bg-[var(--lp-soft)] px-3 py-1 text-xs font-medium text-[var(--lp-soft-fg)]">
            {section.incentive}
          </p>
        ) : null}
        <div className="mt-4">
          <LeadForm
            pageId={pageId}
            visitorId={visitorId}
            compact
            section={{
              title: section.headline,
              subtitle: section.body,
              collectName: false,
              ctaLabel: section.ctaLabel,
              disclaimer: "",
              successTitle: "You're in.",
              successMessage: "Check your inbox - it's on the way.",
            }}
          />
        </div>
      </div>
    </div>
  );
}
