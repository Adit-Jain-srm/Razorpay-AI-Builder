import type { AdPlatform } from "@/lib/research/standard-models";
import type { AzureImageSize } from "@/lib/ai/azure";
import type { AspectRatio } from "@/lib/validators/creative";

/**
 * PURE visual helpers: map platform aspect ratios to the sizes Azure GPT-Image
 * supports, build image prompts, and render a deterministic SVG placeholder so
 * the gallery is populated even with zero credentials. The actual Azure call
 * lives in `studio.ts` (server) and uses these helpers - keeping this module
 * client-safe and offline.
 */

/** GPT-Image only supports square / portrait / landscape; map each ratio to the closest. */
export function aspectRatioToImageSize(ratio: AspectRatio): AzureImageSize {
  switch (ratio) {
    case "1:1":
      return "1024x1024";
    case "9:16":
      return "1024x1536";
    case "16:9":
    case "1.91:1":
      return "1536x1024";
    default:
      return "1024x1024";
  }
}

/** Pixel dimensions used for the SVG placeholder (matches each ratio). */
export function aspectRatioPixels(ratio: AspectRatio): { width: number; height: number } {
  switch (ratio) {
    case "1:1":
      return { width: 1080, height: 1080 };
    case "9:16":
      return { width: 1080, height: 1920 };
    case "16:9":
      return { width: 1600, height: 900 };
    case "1.91:1":
      return { width: 1910, height: 1000 };
    default:
      return { width: 1080, height: 1080 };
  }
}

const PLATFORM_SCENE: Record<string, string> = {
  google: "clean, trustworthy editorial photography",
  meta: "scroll-stopping lifestyle photography with a clear focal subject",
  tiktok: "authentic, high-energy vertical UGC-style photography",
  taboola: "intriguing, editorial native-discovery photography",
};

/**
 * Builds a GPT-Image prompt for an ad visual. We deliberately ask for NO embedded
 * text (copy is overlaid/served separately) and a clear focal subject so the
 * image works across placements.
 */
export function buildImagePrompt(input: {
  platform: AdPlatform;
  angle?: string;
  headline?: string;
  painPoints?: string[];
  extra?: string;
}): string {
  const scene = PLATFORM_SCENE[input.platform] ?? "professional advertising photography";
  const subject = input.angle?.trim() || input.headline?.trim() || "the product's core benefit";
  const pains = (input.painPoints ?? []).slice(0, 2).filter(Boolean);

  return [
    `High-quality ${scene} for a paid ${input.platform} ad.`,
    `Concept: ${subject}.`,
    pains.length ? `Emotionally resonate with: ${pains.join("; ")}.` : "",
    "Single clear focal subject, natural lighting, modern and premium, photorealistic.",
    "No text, no words, no logos, no watermarks in the image.",
    input.extra?.trim() ?? "",
  ]
    .filter((p) => p.length > 0)
    .join(" ");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A deterministic, on-brand SVG placeholder returned as a `data:` URL. Used when
 * Azure is unconfigured so the image gallery still demonstrates aspect ratios and
 * layout without any network call. Clearly labeled as a preview.
 */
export function buildPlaceholderImage(ratio: AspectRatio, label: string, sublabel = "Preview"): string {
  const { width, height } = aspectRatioPixels(ratio);
  const title = escapeXml(label.slice(0, 48));
  const sub = escapeXml(sublabel.slice(0, 32));
  const fontSize = Math.round(Math.min(width, height) * 0.06);
  const subSize = Math.round(fontSize * 0.5);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#18181b"/>
      <stop offset="1" stop-color="#09090b"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect x="2%" y="2%" width="96%" height="96%" fill="none" stroke="#10b981" stroke-opacity="0.35" stroke-width="${Math.max(2, Math.round(width * 0.004))}" rx="${Math.round(width * 0.02)}"/>
  <circle cx="50%" cy="42%" r="${Math.round(Math.min(width, height) * 0.09)}" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.5" stroke-width="${Math.max(2, Math.round(width * 0.003))}"/>
  <text x="50%" y="62%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="600" fill="#fafafa">${title}</text>
  <text x="50%" y="62%" dy="${fontSize}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${subSize}" fill="#a1a1aa">${sub} - ${ratio}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** True when a stored path is a self-contained data URL (in-memory / placeholder). */
export function isDataUrl(path: string): boolean {
  return path.startsWith("data:");
}
