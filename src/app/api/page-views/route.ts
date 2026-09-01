import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { recordLandingView } from "@/lib/landing/studio";
import { cleanReferrer, parseUtm } from "@/lib/landing/utm";
import { pageViewSchema } from "@/lib/validators";

/**
 * Anonymous page-view beacon for deployed landing pages. Records a view (with
 * UTM + referrer) against the rendered/assigned page and persists the visitor id
 * cookie so the A/B assignment stays stable across visits. Accepts JSON or a
 * `navigator.sendBeacon` blob. Never throws to the client.
 *
 * Runs on Node (Supabase service/anon clients).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "mos_vid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest): Promise<Response> {
  let raw: Record<string, unknown> = {};
  try {
    raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    raw = {};
  }

  const parsed = pageViewSchema.safeParse({
    landingPageId: raw.landingPageId,
    visitorId: typeof raw.visitorId === "string" ? raw.visitorId : undefined,
    utm: typeof raw.utm === "object" && raw.utm ? raw.utm : parseUtm(request.headers.get("referer")),
    referrer: typeof raw.referrer === "string" ? raw.referrer : request.headers.get("referer") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await recordLandingView({
      landingPageId: parsed.data.landingPageId,
      visitorId: parsed.data.visitorId,
      utm: parsed.data.utm,
      referrer: cleanReferrer(parsed.data.referrer),
    });
  } catch (error) {
    // A failed view record must never break the visitor's experience.
    logger.warn("page view record failed", { error: String(error) });
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const response = NextResponse.json({ ok: true });
  const visitorId = parsed.data.visitorId;
  if (visitorId && !request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
      httpOnly: false,
    });
  }
  return response;
}
