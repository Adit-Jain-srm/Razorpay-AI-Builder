import { NextResponse, type NextRequest } from "next/server";

import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { captureLandingLead } from "@/lib/landing/studio";
import { parseUtm } from "@/lib/landing/utm";
import { leadCaptureSchema } from "@/lib/validators";

/**
 * Anonymous lead capture for deployed landing pages. Accepts JSON (from the
 * React form / fetch) and form-encoded posts (from the static HTML snapshot, so
 * pages work with JavaScript disabled). The write is owner-resolved + validated
 * against a DEPLOYED page in the service layer, isolated from authenticated data.
 *
 * Runs on Node (Supabase service/anon clients).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

/** Only allow same-app `/lp/...` redirects (prevents open-redirect abuse). */
function safeRedirect(target: unknown, request: NextRequest): URL {
  const fallback = new URL("/", request.url);
  if (typeof target !== "string" || !target.startsWith("/lp/")) return fallback;
  try {
    return new URL(target, request.url);
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  const isForm = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");

  let raw: Record<string, unknown> = {};
  let redirectTarget: unknown;
  try {
    if (isForm) {
      const form = await request.formData();
      raw = Object.fromEntries(form.entries());
      redirectTarget = raw.redirect;
      // No-JS posts can't send parsed UTM; recover it from the page's referrer.
      raw.utm = parseUtm(request.headers.get("referer"));
    } else {
      raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    }
  } catch {
    raw = {};
  }

  const parsed = leadCaptureSchema.safeParse({
    landingPageId: raw.landingPageId,
    email: raw.email,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : undefined,
    utm: typeof raw.utm === "object" && raw.utm ? raw.utm : undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid submission";
    if (isForm) {
      const url = safeRedirect(redirectTarget, request);
      url.searchParams.set("lead", "error");
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    await captureLandingLead({
      landingPageId: parsed.data.landingPageId,
      email: parsed.data.email,
      name: parsed.data.name,
      utm: parsed.data.utm,
      ipAddress: clientIp(request),
    });
  } catch (error) {
    logger.error("lead capture failed", error);
    if (isForm) {
      const url = safeRedirect(redirectTarget, request);
      url.searchParams.set("lead", "error");
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok: false, error: toErrorMessage(error) }, { status: 502 });
  }

  if (isForm) {
    return NextResponse.redirect(safeRedirect(redirectTarget, request), 303);
  }
  return NextResponse.json({ ok: true });
}
