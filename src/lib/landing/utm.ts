/**
 * UTM + attribution parsing for page views and leads. PURE + client-safe: the
 * public page reads attribution on the client (real referrer + query) and the
 * capture path re-parses server-side. One implementation, unit-tested.
 */

/** Canonical attribution keys we persist into the `utm` jsonb. */
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ttclid",
] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export type UtmRecord = Partial<Record<UtmKey, string>>;

type UtmSource = string | URLSearchParams | Record<string, unknown> | null | undefined;

/** Coerces assorted inputs (query string, URL, params, object) into params. */
function toParams(input: UtmSource): URLSearchParams {
  if (!input) return new URLSearchParams();
  if (input instanceof URLSearchParams) return input;
  if (typeof input === "string") {
    const qIndex = input.indexOf("?");
    const query = qIndex >= 0 ? input.slice(qIndex + 1) : input;
    return new URLSearchParams(query);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    params.set(key, String(value));
  }
  return params;
}

/**
 * Extracts known UTM + click-id params from a query string, URL, `URLSearchParams`,
 * or a plain object. Trims values, drops blanks, and caps length so a hostile
 * query can't bloat the row. Returns only the keys that are present.
 */
export function parseUtm(input: UtmSource): UtmRecord {
  const params = toParams(input);
  const out: UtmRecord = {};
  for (const key of UTM_KEYS) {
    const raw = params.get(key);
    if (raw == null) continue;
    const value = raw.trim().slice(0, 256);
    if (value) out[key] = value;
  }
  return out;
}

/** Normalizes a referrer to scheme://host/path (drops query/hash), or null. */
export function cleanReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  const trimmed = referrer.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    // Build from protocol+host (not `origin`, which is the string "null" for
    // non-HTTP schemes like android-app://) and drop the query + hash.
    const base = url.host ? `${url.protocol}//${url.host}${url.pathname}` : `${url.protocol}${url.pathname}`;
    return base.slice(0, 512);
  } catch {
    return trimmed.slice(0, 512);
  }
}
