import type { AdPlatform } from "@/lib/research/standard-models";

import type { CreativeFormat } from "./types";

/**
 * Per-platform copy specifications: the field roles each ad format has and the
 * character limit for each. These are DATA so the limit-enforcement functions,
 * the generators, the scorer, and the UI all read one source of truth.
 *
 * Limits reflect each network's enforced/recommended caps (verified 2026):
 * - Google RSA: headline <= 30, description <= 90, path <= 15.
 * - Meta: primary text 125 (visible), headline 40, link description 30.
 * - TikTok: ad caption 100, on-screen overlay short, custom CTA 20.
 * - Taboola native: title <= 60 (recommended 34-45), optional description.
 *
 * Where a network's hard cap exceeds the practical/visible cap we enforce the
 * practical cap (what actually performs) and surface it in the UI.
 */

export interface RoleSpec {
  role: string;
  /** Base label (e.g. "Headline"); numbered when `max` > 1. */
  label: string;
  /** Character limit enforced for this role. */
  limit: number;
  /** Minimum number of this field a complete ad should have. */
  min: number;
  /** Maximum number of this field the platform allows. */
  max: number;
  /** Longer free-text element (rendered as a textarea / multi-line in the UI). */
  multiline?: boolean;
  /** Optional fields can be absent without the ad being "incomplete". */
  optional?: boolean;
  /** Short helper shown under the field in the UI. */
  hint?: string;
}

export interface PlatformSpec {
  platform: AdPlatform;
  format: CreativeFormat;
  displayName: string;
  /** One-line description of the ad unit. */
  summary: string;
  roles: RoleSpec[];
  /** Role used as the denormalized display headline. */
  primaryHeadlineRole: string;
  /** Role used as the denormalized display body. */
  primaryBodyRole: string;
}

/** The four first-class platforms the studio fully specializes for. */
export const CORE_PLATFORMS = ["google", "meta", "tiktok", "taboola"] as const satisfies readonly AdPlatform[];

const GOOGLE: PlatformSpec = {
  platform: "google",
  format: "rsa",
  displayName: "Google Ads",
  summary: "Responsive Search Ad - multiple headlines and descriptions Google mixes and matches.",
  roles: [
    { role: "headline", label: "Headline", limit: 30, min: 3, max: 15, hint: "<=30 chars. Google shows 3 at a time." },
    { role: "description", label: "Description", limit: 90, min: 2, max: 4, multiline: true, hint: "<=90 chars. Google shows 2." },
    { role: "path", label: "Path", limit: 15, min: 0, max: 2, optional: true, hint: "Display URL path, <=15 chars." },
  ],
  primaryHeadlineRole: "headline",
  primaryBodyRole: "description",
};

const META: PlatformSpec = {
  platform: "meta",
  format: "single",
  displayName: "Meta (Facebook / Instagram)",
  summary: "Single-image/video feed ad - primary text hook, headline, optional link description.",
  roles: [
    { role: "primary_text", label: "Primary text", limit: 125, min: 1, max: 1, multiline: true, hint: "First 125 chars show before 'See more'. Front-load the hook." },
    { role: "headline", label: "Headline", limit: 40, min: 1, max: 1, hint: "<=40 chars (27 visible on Feed)." },
    { role: "description", label: "Link description", limit: 30, min: 0, max: 1, optional: true, hint: "<=30 chars. Often hidden - keep optional." },
  ],
  primaryHeadlineRole: "headline",
  primaryBodyRole: "primary_text",
};

const TIKTOK: PlatformSpec = {
  platform: "tiktok",
  format: "video",
  displayName: "TikTok",
  summary: "In-feed video ad - spoken hook (first 3s), caption, on-screen overlay, and CTA.",
  roles: [
    { role: "hook", label: "Spoken hook (0-3s)", limit: 90, min: 1, max: 1, multiline: true, hint: "The first line said on camera. Stop the scroll instantly." },
    { role: "caption", label: "Ad caption", limit: 100, min: 1, max: 1, multiline: true, hint: "<=100 chars; ~40 visible before 'more'." },
    { role: "overlay", label: "On-screen text", limit: 40, min: 1, max: 1, hint: "Short overlay burned into the video." },
    { role: "cta", label: "CTA", limit: 20, min: 1, max: 1, hint: "Custom CTA, <=20 chars." },
  ],
  primaryHeadlineRole: "hook",
  primaryBodyRole: "caption",
};

const TABOOLA: PlatformSpec = {
  platform: "taboola",
  format: "native",
  displayName: "Taboola",
  summary: "Native discovery ad - curiosity-driven headline plus branding and optional description.",
  roles: [
    { role: "headline", label: "Headline", limit: 60, min: 1, max: 1, multiline: true, hint: "<=60 chars (34-45 ideal). Curiosity over hype." },
    { role: "branding", label: "Branding", limit: 25, min: 0, max: 1, optional: true, hint: "Brand/sponsor name, <=25 chars." },
    { role: "description", label: "Description", limit: 150, min: 0, max: 1, multiline: true, optional: true, hint: "Optional supporting line, <=150 chars." },
  ],
  primaryHeadlineRole: "headline",
  primaryBodyRole: "description",
};

/** Generic fallback for platforms without a first-class spec (linkedin/youtube/x). */
function genericSpec(platform: AdPlatform, displayName: string): PlatformSpec {
  return {
    platform,
    format: "generic",
    displayName,
    summary: "Single ad - headline plus primary text.",
    roles: [
      { role: "primary_text", label: "Primary text", limit: 200, min: 1, max: 1, multiline: true },
      { role: "headline", label: "Headline", limit: 70, min: 1, max: 1 },
    ],
    primaryHeadlineRole: "headline",
    primaryBodyRole: "primary_text",
  };
}

const SPECS: Partial<Record<AdPlatform, PlatformSpec>> = {
  google: GOOGLE,
  meta: META,
  tiktok: TIKTOK,
  taboola: TABOOLA,
  linkedin: genericSpec("linkedin", "LinkedIn"),
  youtube: genericSpec("youtube", "YouTube"),
  x: genericSpec("x", "X (Twitter)"),
};

const DISPLAY_NAMES: Record<AdPlatform, string> = {
  google: "Google Ads",
  meta: "Meta",
  tiktok: "TikTok",
  taboola: "Taboola",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X (Twitter)",
};

/** Returns the spec for a platform, falling back to a generic single-ad spec. */
export function getPlatformSpec(platform: AdPlatform): PlatformSpec {
  return SPECS[platform] ?? genericSpec(platform, DISPLAY_NAMES[platform] ?? platform);
}

/** Looks up a single role spec on a platform (or undefined). */
export function getRoleSpec(platform: AdPlatform, role: string): RoleSpec | undefined {
  return getPlatformSpec(platform).roles.find((r) => r.role === role);
}

/** Human label for a role occurrence, numbered when the role repeats. */
export function roleLabel(spec: RoleSpec, index: number, total: number): string {
  return total > 1 || spec.max > 1 ? `${spec.label} ${index + 1}` : spec.label;
}

export function platformDisplayName(platform: AdPlatform): string {
  return DISPLAY_NAMES[platform] ?? platform;
}
