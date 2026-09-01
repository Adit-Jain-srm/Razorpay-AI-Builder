"use client";

import { useState, type FormEvent } from "react";

import { parseUtm } from "@/lib/landing/utm";
import type { LeadFormSection } from "@/lib/landing/types";

/**
 * Conversion lead-capture form used by both the public route and the exit-intent
 * popup. Posts JSON to `/api/leads` (anonymous-safe) with the visitor's UTM +
 * visitor id, then shows an inline success state. In editor mode it renders but
 * never submits, so the preview is faithful without writing demo leads.
 */

export type LeadFormMode = "live" | "editor";

interface LeadFormProps {
  pageId: string;
  visitorId?: string;
  section: Pick<LeadFormSection, "title" | "subtitle" | "collectName" | "ctaLabel" | "disclaimer" | "successTitle" | "successMessage">;
  mode?: LeadFormMode;
  /** Compact layout for the exit-intent popup. */
  compact?: boolean;
}

export function LeadForm({ pageId, visitorId, section, mode = "live", compact = false }: LeadFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "editor") return;
    if (!email.trim()) {
      setError("Enter your email address.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const utm = typeof window !== "undefined" ? parseUtm(window.location.search) : {};
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ landingPageId: pageId, email: email.trim(), name: name.trim() || undefined, utm, visitorId }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        className="rounded-[var(--lp-radius)] border border-[var(--lp-border)] bg-[var(--lp-card)] p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[var(--lp-soft)] text-[var(--lp-soft-fg)] text-xl">
          ✓
        </div>
        <h3 className="text-lg font-semibold text-[var(--lp-card-fg)]">{section.successTitle}</h3>
        <p className="mt-1 text-sm text-[var(--lp-muted)]">{section.successMessage}</p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-[calc(var(--lp-radius)-6px)] border border-[var(--lp-border)] bg-[var(--lp-card)] px-3 py-3 text-base text-[var(--lp-card-fg)] outline-none transition-shadow placeholder:text-[var(--lp-muted)] focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]";

  return (
    <form onSubmit={submit} className={compact ? "space-y-2.5" : "space-y-3"} noValidate>
      {section.collectName ? (
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          autoComplete="given-name"
          className={inputClass}
          aria-label="First name"
        />
      ) : null}
      <input
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        required
        className={inputClass}
        aria-label="Email address"
        aria-invalid={status === "error"}
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-[var(--lp-radius)] bg-[var(--lp-accent)] px-5 py-3 text-base font-semibold text-[var(--lp-accent-fg)] transition-colors hover:bg-[var(--lp-accent-hover)] disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : section.ctaLabel}
      </button>
      {status === "error" && error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {section.disclaimer ? <p className="text-center text-xs text-[var(--lp-muted)]">{section.disclaimer}</p> : null}
      {mode === "editor" ? (
        <p className="text-center text-[11px] text-[var(--lp-muted)]">Preview only - submissions are disabled in the editor.</p>
      ) : null}
    </form>
  );
}
