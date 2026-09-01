import type { CSSProperties } from "react";

import type { LandingAccent, LandingTheme } from "./types";

/**
 * Public landing pages are conversion-optimized with their OWN per-template
 * styling, isolated from the zinc+emerald dashboard chrome. The theme resolves
 * to a flat set of CSS custom properties applied on the page root; section
 * components reference them via Tailwind arbitrary values (`bg-[var(--lp-accent)]`)
 * so a page is fully self-contained and styleable without global tokens.
 *
 * PURE + client-safe.
 */

interface AccentPalette {
  /** Primary action color. */
  accent: string;
  accentHover: string;
  accentFg: string;
  /** Soft tint for highlights/badges. */
  soft: string;
  softFg: string;
}

/** WCAG-AA-minded accent palettes (accentFg contrasts on accent). */
export const LANDING_ACCENT_PALETTES: Record<LandingAccent, AccentPalette> = {
  emerald: { accent: "#059669", accentHover: "#047857", accentFg: "#ffffff", soft: "#ecfdf5", softFg: "#065f46" },
  blue: { accent: "#2563eb", accentHover: "#1d4ed8", accentFg: "#ffffff", soft: "#eff6ff", softFg: "#1e40af" },
  violet: { accent: "#7c3aed", accentHover: "#6d28d9", accentFg: "#ffffff", soft: "#f5f3ff", softFg: "#5b21b6" },
  amber: { accent: "#d97706", accentHover: "#b45309", accentFg: "#ffffff", soft: "#fffbeb", softFg: "#92400e" },
  rose: { accent: "#e11d48", accentHover: "#be123c", accentFg: "#ffffff", soft: "#fff1f2", softFg: "#9f1239" },
  teal: { accent: "#0d9488", accentHover: "#0f766e", accentFg: "#ffffff", soft: "#f0fdfa", softFg: "#115e59" },
};

const RADIUS_PX: Record<LandingTheme["radius"], string> = { sm: "8px", md: "12px", lg: "16px", xl: "22px" };

const FONT_STACKS: Record<LandingTheme["font"], string> = {
  geist: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  grotesk: "'Space Grotesk', var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, 'Times New Roman', serif",
};

interface SurfacePalette {
  bg: string;
  fg: string;
  muted: string;
  card: string;
  cardFg: string;
  border: string;
  subtle: string;
}

const LIGHT_SURFACE: SurfacePalette = {
  bg: "#ffffff",
  fg: "#0f172a",
  muted: "#475569",
  card: "#ffffff",
  cardFg: "#0f172a",
  border: "#e2e8f0",
  subtle: "#f8fafc",
};

const DARK_SURFACE: SurfacePalette = {
  bg: "#0b1120",
  fg: "#f1f5f9",
  muted: "#94a3b8",
  card: "#111a2e",
  cardFg: "#f1f5f9",
  border: "#1e293b",
  subtle: "#0e1726",
};

/** Resolves a theme to the CSS variable map applied on the landing page root. */
export function resolveThemeVars(theme: LandingTheme): CSSProperties {
  const accent = LANDING_ACCENT_PALETTES[theme.accent] ?? LANDING_ACCENT_PALETTES.emerald;
  const surface = theme.mode === "dark" ? DARK_SURFACE : LIGHT_SURFACE;
  return {
    "--lp-accent": accent.accent,
    "--lp-accent-hover": accent.accentHover,
    "--lp-accent-fg": accent.accentFg,
    "--lp-soft": theme.mode === "dark" ? "rgba(255,255,255,0.06)" : accent.soft,
    "--lp-soft-fg": theme.mode === "dark" ? accent.accentFg : accent.softFg,
    "--lp-bg": surface.bg,
    "--lp-fg": surface.fg,
    "--lp-muted": surface.muted,
    "--lp-card": surface.card,
    "--lp-card-fg": surface.cardFg,
    "--lp-border": surface.border,
    "--lp-subtle": surface.subtle,
    "--lp-radius": RADIUS_PX[theme.radius] ?? RADIUS_PX.lg,
    "--lp-font": FONT_STACKS[theme.font] ?? FONT_STACKS.geist,
  } as CSSProperties;
}

/** Inline CSS-var string for the static HTML snapshot (no React). */
export function themeVarsToCss(theme: LandingTheme): string {
  const vars = resolveThemeVars(theme) as Record<string, string>;
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}
