import type { AdPlatform } from "@/lib/research/standard-models";

import { getPlatformSpec, roleLabel, type RoleSpec } from "./platforms";
import type { CreativeField } from "./types";

/**
 * PURE, unit-tested character-limit enforcement. Every platform copy element
 * passes through here so a generated (or hand-edited) field is guaranteed to fit
 * the network's limit, with a `truncated` flag when we had to trim model output.
 *
 * Nothing here touches the network, Azure, or the DB - it is deterministic and
 * runs equally on the server (generation) and the client (live editing).
 */

/** Collapse runs of whitespace to single spaces and trim. Ad copy is single-line. */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Truncates `text` to at most `limit` characters. Prefers a word boundary when
 * one exists in the last ~40% of the budget (so we don't slice mid-word and lose
 * meaning), strips a dangling trailing separator, and never returns more than
 * `limit` characters. Returns the result plus whether trimming occurred.
 */
export function truncateToLimit(text: string, limit: number): { text: string; truncated: boolean } {
  const trimmed = text.trim();
  if (limit <= 0) return { text: "", truncated: trimmed.length > 0 };
  if (trimmed.length <= limit) return { text: trimmed, truncated: false };

  let slice = trimmed.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  // Only honor the word boundary if it keeps most of the budget.
  if (lastSpace >= Math.floor(limit * 0.6)) {
    slice = slice.slice(0, lastSpace);
  }
  slice = slice.replace(/[\s.,;:!?\u2013\u2014-]+$/u, "").trim();
  // If stripping emptied the slice (e.g. tiny limit), fall back to a hard cut.
  if (slice.length === 0) slice = trimmed.slice(0, limit).trim();
  return { text: slice, truncated: true };
}

/** Measures a field WITHOUT trimming (for live editing - flags rather than cuts). */
export function measureField(role: string, label: string, limit: number, text: string): CreativeField {
  const length = text.length;
  return { role, label, text, limit, length, withinLimit: length <= limit, truncated: false };
}

/** Builds a single enforced field: normalize, truncate to the limit, then measure. */
export function buildField(role: string, label: string, limit: number, rawText: string): CreativeField {
  const normalized = normalizeWhitespace(rawText);
  const { text, truncated } = truncateToLimit(normalized, limit);
  return { role, label, text, limit, length: text.length, withinLimit: text.length <= limit, truncated };
}

/**
 * Builds the enforced fields for one role from raw model strings: drops blanks,
 * caps the count at the platform's `max`, labels them, and enforces the limit.
 */
export function buildRoleFields(spec: RoleSpec, rawTexts: string[]): CreativeField[] {
  const cleaned = rawTexts.map(normalizeWhitespace).filter((t) => t.length > 0).slice(0, spec.max);
  return cleaned.map((t, i) => {
    const { text, truncated } = truncateToLimit(t, spec.limit);
    return {
      role: spec.role,
      label: roleLabel(spec, i, cleaned.length),
      text,
      limit: spec.limit,
      length: text.length,
      withinLimit: text.length <= spec.limit,
      truncated,
    };
  });
}

/** Quality flags for a set of fields (drives the warning badges in the UI). */
export function collectFieldFlags(fields: CreativeField[]): string[] {
  const flags: string[] = [];
  if (fields.some((f) => f.truncated)) flags.push("truncated");
  if (fields.some((f) => !f.withinLimit)) flags.push("over_limit");
  return flags;
}

/**
 * True when every required (non-optional) role has at least its `min` count of
 * non-empty fields. Used to flag "incomplete" variants the model under-filled.
 */
export function isVariantComplete(platform: AdPlatform, fields: CreativeField[]): boolean {
  const spec = getPlatformSpec(platform);
  for (const role of spec.roles) {
    if (role.optional) continue;
    const count = fields.filter((f) => f.role === role.role && f.text.trim().length > 0).length;
    if (count < role.min) return false;
  }
  return true;
}

/** Total characters over budget across all fields (0 when everything fits). */
export function totalOverflow(fields: CreativeField[]): number {
  return fields.reduce((sum, f) => sum + Math.max(0, f.length - f.limit), 0);
}
