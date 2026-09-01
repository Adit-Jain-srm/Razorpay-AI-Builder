import { Fragment } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

import { ExitIntentPopup } from "@/components/landing-page/exit-intent";
import { findExitIntent, LandingFrame, renderSection } from "@/components/landing-page/section-renderer";
import { ViewBeacon } from "@/components/landing-page/view-beacon";
import { landingService } from "@/lib/services";
import { parseLandingDocument } from "@/lib/landing/types";
import { resolvePublicLanding } from "@/lib/landing/studio";

/**
 * Public deployed landing page. Server-renders the stored sections for a
 * DEPLOYED page (404 otherwise), runs stable A/B assignment per visitor, and
 * mounts the anonymous lead-capture form + view beacon + exit-intent popup.
 * Lives outside the (dashboard) group so it has no app chrome and stays public.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "mos_vid";

type SearchParams = Promise<{ preview?: string; ab?: string; lead?: string }>;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await landingService.getBySlug(slug);
    const doc = page ? parseLandingDocument(page.sections) : null;
    if (doc?.meta.title) {
      return {
        title: doc.meta.title,
        description: doc.meta.description || undefined,
        robots: { index: true, follow: true },
        openGraph: { title: doc.meta.title, description: doc.meta.description || undefined },
      };
    }
  } catch {
    // fall through to default
  }
  return { title: "Landing Page" };
}

function generateVisitorId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export default async function PublicLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const bypassExperiment = sp.preview !== undefined || sp.ab === "off";
  const leadCaptured = sp.lead === "ok";

  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? generateVisitorId();

  const resolved = await resolvePublicLanding(slug, visitorId, { bypassExperiment });
  if (!resolved) notFound();

  const { page, document } = resolved;
  const exitIntent = findExitIntent(document);

  if (document.sections.length === 0) {
    return (
      <LandingFrame document={document}>
        <div className="px-5 py-24 text-center text-[var(--lp-muted)]">This page is being prepared.</div>
        <ViewBeacon pageId={page.id} visitorId={visitorId} />
      </LandingFrame>
    );
  }

  return (
    <LandingFrame document={document}>
      {leadCaptured ? (
        <div className="flex items-center justify-center gap-2 bg-[var(--lp-soft)] px-4 py-3 text-center text-sm font-medium text-[var(--lp-soft-fg)]">
          <CheckCircle weight="fill" className="size-4" />
          Thanks - your guide is on the way. Check your inbox.
        </div>
      ) : null}
      {document.sections.map((section) => (
        <Fragment key={section.id}>{renderSection(section, { mode: "live", pageId: page.id, visitorId })}</Fragment>
      ))}
      <ViewBeacon pageId={page.id} visitorId={visitorId} />
      {exitIntent ? <ExitIntentPopup pageId={page.id} visitorId={visitorId} section={exitIntent} /> : null}
    </LandingFrame>
  );
}
