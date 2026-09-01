import type { CreativeContent } from "./types";

/**
 * PURE export formatters - hand-rolled CSV (no dependencies) for the two import
 * targets media buyers actually use:
 * - Google Ads Editor (Responsive Search Ads): fixed Headline 1-15 / Description
 *   1-4 / Path columns.
 * - Meta Ads bulk import: a practical Campaign/Ad Set/Ad template.
 *
 * RFC-4180 quoting (double-quote wrap + doubled quotes, CRLF rows) so cells with
 * commas, quotes, or newlines round-trip cleanly. Deterministic and unit-tested.
 */

export interface ExportOptions {
  campaignName: string;
  /** Final/landing URL written into the export (defaults to a placeholder). */
  finalUrl?: string;
  /** Meta call-to-action enum (e.g. LEARN_MORE, SIGN_UP). */
  callToAction?: string;
}

const DEFAULT_URL = "https://example.com";

/** RFC-4180 cell escaping: wrap in quotes and double internal quotes when needed. */
export function escapeCsvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Joins a matrix into a CSV string (CRLF row terminators). */
export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell ?? "")).join(",")).join("\r\n");
}

/** All text values for a role in a creative, in order. */
function roleTexts(content: CreativeContent, role: string): string[] {
  return content.fields.filter((f) => f.role === role && f.text.trim().length > 0).map((f) => f.text);
}

function adGroupName(content: CreativeContent, fallback: number): string {
  return content.angle?.trim() || `Ad group ${fallback}`;
}

const GOOGLE_HEADLINES = 15;
const GOOGLE_DESCRIPTIONS = 4;
const GOOGLE_PATHS = 2;

/**
 * Google Ads Editor CSV for Responsive Search Ads. Only `google` creatives are
 * included. Columns match Editor's RSA import shape (fixed headline/description
 * slots) so the file pastes straight in.
 */
export function creativesToGoogleCsv(contents: CreativeContent[], options: ExportOptions): string {
  const header = [
    "Campaign",
    "Ad Group",
    "Ad type",
    ...Array.from({ length: GOOGLE_HEADLINES }, (_, i) => `Headline ${i + 1}`),
    ...Array.from({ length: GOOGLE_DESCRIPTIONS }, (_, i) => `Description ${i + 1}`),
    "Path 1",
    "Path 2",
    "Final URL",
  ];

  const rows: string[][] = [header];
  const url = options.finalUrl?.trim() || DEFAULT_URL;

  contents
    .filter((c) => c.platform === "google")
    .forEach((content, index) => {
      const headlines = roleTexts(content, "headline");
      const descriptions = roleTexts(content, "description");
      const paths = roleTexts(content, "path");

      rows.push([
        options.campaignName,
        adGroupName(content, index + 1),
        "Responsive search ad",
        ...Array.from({ length: GOOGLE_HEADLINES }, (_, i) => headlines[i] ?? ""),
        ...Array.from({ length: GOOGLE_DESCRIPTIONS }, (_, i) => descriptions[i] ?? ""),
        ...Array.from({ length: GOOGLE_PATHS }, (_, i) => paths[i] ?? ""),
        url,
      ]);
    });

  return rowsToCsv(rows);
}

/**
 * Meta Ads bulk-import CSV. Only `meta` creatives are included. One row per ad
 * with Title (headline), Body (primary text), and Link Description.
 */
export function creativesToMetaCsv(contents: CreativeContent[], options: ExportOptions): string {
  const header = [
    "Campaign Name",
    "Ad Set Name",
    "Ad Name",
    "Title",
    "Body",
    "Link Description",
    "Website URL",
    "Call to Action",
  ];

  const rows: string[][] = [header];
  const url = options.finalUrl?.trim() || DEFAULT_URL;
  const cta = options.callToAction?.trim() || "LEARN_MORE";

  contents
    .filter((c) => c.platform === "meta")
    .forEach((content, index) => {
      const title = roleTexts(content, "headline")[0] ?? content.headline;
      const body = roleTexts(content, "primary_text")[0] ?? content.body;
      const description = roleTexts(content, "description")[0] ?? "";

      rows.push([
        options.campaignName,
        adGroupName(content, index + 1),
        `${options.campaignName} - Meta ${index + 1}`,
        title,
        body,
        description,
        url,
        cta,
      ]);
    });

  return rowsToCsv(rows);
}

export type ExportFormat = "google" | "meta";

/** Builds the CSV for a given format. */
export function exportCreativesCsv(format: ExportFormat, contents: CreativeContent[], options: ExportOptions): string {
  return format === "google" ? creativesToGoogleCsv(contents, options) : creativesToMetaCsv(contents, options);
}

/** Filesystem-safe slug for export/download filenames. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "export"
  );
}

/** Suggested CSV filename, e.g. `retirement-income-google-ads.csv`. */
export function exportFilename(format: ExportFormat, campaignName: string): string {
  return `${slugify(campaignName)}-${format === "google" ? "google-ads" : "meta-ads"}.csv`;
}

/** Suggested image download filename. */
export function imageFilename(campaignName: string, aspectRatio: string, index: number): string {
  const ratio = aspectRatio.replace(/[^0-9]+/g, "x").replace(/^x|x$/g, "");
  return `${slugify(campaignName)}-${ratio}-${index + 1}.png`;
}
