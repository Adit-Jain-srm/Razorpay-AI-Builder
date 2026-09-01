"use client";

import { useEffect, useRef } from "react";

import { parseUtm } from "@/lib/landing/utm";

/**
 * Fire-and-forget page-view beacon. On mount it records a view for the rendered
 * (A/B-assigned) page with the visitor's UTM + referrer, and persists the
 * server-provided visitor id as the `mos_vid` cookie so future visits get a
 * stable A/B assignment. Deduped per session so it counts one view per load.
 */

interface ViewBeaconProps {
  pageId: string;
  visitorId: string;
}

const VISITOR_COOKIE = "mos_vid";

function persistVisitorCookie(visitorId: string): void {
  if (typeof document === "undefined") return;
  if (document.cookie.split("; ").some((c) => c.startsWith(`${VISITOR_COOKIE}=`))) return;
  // 1-year, lax cookie; readable by the SSR assignment path on the next visit.
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(visitorId)}; path=/; max-age=31536000; samesite=lax`;
}

export function ViewBeacon({ pageId, visitorId }: ViewBeaconProps) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    persistVisitorCookie(visitorId);

    const key = `lp_view_${pageId}`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore (private mode) - still send the beacon
    }

    const utm = parseUtm(window.location.search);
    const referrer = document.referrer || undefined;
    const payload = JSON.stringify({ landingPageId: pageId, visitorId, utm, referrer });

    // Prefer sendBeacon so navigation never cancels the record.
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/page-views", new Blob([payload], { type: "application/json" }));
        return;
      }
    } catch {
      // fall through to fetch
    }
    void fetch("/api/page-views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, [pageId, visitorId]);

  return null;
}
