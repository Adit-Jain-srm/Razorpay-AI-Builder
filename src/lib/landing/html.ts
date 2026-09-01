import { themeVarsToCss } from "./theme";
import type { LandingDocument, LandingSection } from "./types";

/**
 * Renders a `LandingDocument` to a self-contained static HTML snapshot. Stored
 * in `landing_pages.html_content` on deploy and offered as a downloadable
 * artifact, so a deployed page is portable and works even with JavaScript
 * disabled (the lead form is a real `<form>` that posts to `/api/leads`).
 *
 * The LIVE `/lp/[slug]` route renders the React components (interactive lead
 * capture, countdown, quiz, exit-intent); this snapshot is the static, indexable
 * counterpart. PURE - no React, no server imports.
 */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function attr(value: string): string {
  return esc(value);
}

function renderSection(section: LandingSection, pageId: string, slug: string): string {
  switch (section.type) {
    case "hero":
      return `<section class="lp-hero">
  ${section.eyebrow ? `<p class="lp-eyebrow">${esc(section.eyebrow)}</p>` : ""}
  <h1>${esc(section.headline)}</h1>
  ${section.subheadline ? `<p class="lp-sub">${esc(section.subheadline)}</p>` : ""}
  ${section.bullets.length ? `<ul class="lp-bullets">${section.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
  <a class="lp-btn" href="#lead">${esc(section.ctaLabel)}</a>
</section>`;
    case "rich_text":
      return `<section class="lp-prose">
  ${section.eyebrow ? `<p class="lp-eyebrow">${esc(section.eyebrow)}</p>` : ""}
  ${section.title ? `<h2>${esc(section.title)}</h2>` : ""}
  ${section.byline ? `<p class="lp-byline">${esc(section.byline)}</p>` : ""}
  ${section.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}
  ${section.bullets.length ? `<ul class="lp-bullets">${section.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
</section>`;
    case "features":
      return `<section class="lp-features">
  ${section.title ? `<h2>${esc(section.title)}</h2>` : ""}
  ${section.subtitle ? `<p class="lp-sub">${esc(section.subtitle)}</p>` : ""}
  <div class="lp-grid">${section.items
    .map((item) => `<div class="lp-card"><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p></div>`)
    .join("")}</div>
</section>`;
    case "listicle":
      return `<section class="lp-features">
  ${section.title ? `<h2>${esc(section.title)}</h2>` : ""}
  ${section.intro ? `<p class="lp-sub">${esc(section.intro)}</p>` : ""}
  <ol class="lp-list">${section.items
    .map((item) => `<li><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p></li>`)
    .join("")}</ol>
</section>`;
    case "social_proof":
      return `<section class="lp-proof">
  <div class="lp-stats">${section.items
    .map((item) => `<div><span class="lp-stat">${esc(item.value)}</span><span class="lp-stat-label">${esc(item.label)}</span></div>`)
    .join("")}</div>
  ${section.note ? `<p class="lp-note">${esc(section.note)}</p>` : ""}
</section>`;
    case "testimonials":
      return `<section class="lp-testimonials">
  ${section.title ? `<h2>${esc(section.title)}</h2>` : ""}
  <div class="lp-grid">${section.items
    .map(
      (t) =>
        `<figure class="lp-card"><blockquote>${esc(t.quote)}</blockquote><figcaption>${esc(t.name)}${t.role ? ` &middot; ${esc(t.role)}` : ""}</figcaption></figure>`,
    )
    .join("")}</div>
</section>`;
    case "faq":
      return `<section class="lp-faq">
  ${section.title ? `<h2>${esc(section.title)}</h2>` : ""}
  ${section.items
    .map((item) => `<details><summary>${esc(item.q)}</summary><p>${esc(item.a)}</p></details>`)
    .join("")}
</section>`;
    case "countdown":
      return `<section class="lp-urgency">
  ${section.title ? `<h2>${esc(section.title)}</h2>` : ""}
  ${section.subtitle ? `<p class="lp-sub">${esc(section.subtitle)}</p>` : ""}
  <a class="lp-btn" href="#lead">${esc(section.ctaLabel)}</a>
</section>`;
    case "cta":
      return `<section class="lp-cta-band">
  ${section.headline ? `<h2>${esc(section.headline)}</h2>` : ""}
  ${section.subtitle ? `<p class="lp-sub">${esc(section.subtitle)}</p>` : ""}
  <a class="lp-btn" href="#lead">${esc(section.ctaLabel)}</a>
</section>`;
    case "lead_form":
      return `<section class="lp-form" id="lead">
  <h2>${esc(section.title)}</h2>
  ${section.subtitle ? `<p class="lp-sub">${esc(section.subtitle)}</p>` : ""}
  <form method="post" action="/api/leads">
    <input type="hidden" name="landingPageId" value="${attr(pageId)}" />
    <input type="hidden" name="redirect" value="/lp/${attr(slug)}?lead=ok" />
    ${section.collectName ? `<input type="text" name="name" placeholder="First name" autocomplete="given-name" />` : ""}
    <input type="email" name="email" placeholder="you@example.com" required autocomplete="email" />
    <button type="submit" class="lp-btn">${esc(section.ctaLabel)}</button>
  </form>
  ${section.disclaimer ? `<p class="lp-note">${esc(section.disclaimer)}</p>` : ""}
</section>`;
    case "compliance":
      return `<section class="lp-compliance">
  <p class="lp-note"><strong>${esc(section.title)}</strong></p>
  ${section.disclaimers.map((line) => `<p class="lp-note">${esc(line)}</p>`).join("")}
</section>`;
    case "exit_intent":
    case "quiz":
      // Interactive-only on the live route; omitted from the static snapshot.
      return "";
    default:
      return "";
  }
}

export interface RenderHtmlContext {
  pageId: string;
  slug: string;
}

/** Renders the full self-contained HTML document for a deployed page. */
export function renderDocumentToHtml(doc: LandingDocument, ctx: RenderHtmlContext): string {
  const body = doc.sections.map((section) => renderSection(section, ctx.pageId, ctx.slug)).join("\n");
  const styleVars = themeVarsToCss(doc.theme);
  const css = `
:root{${styleVars}}
*{box-sizing:border-box}
body{margin:0;background:var(--lp-bg);color:var(--lp-fg);font-family:var(--lp-font);line-height:1.6}
main{max-width:760px;margin:0 auto;padding:48px 20px}
section{margin:0 0 40px}
h1{font-size:2.25rem;line-height:1.15;margin:0 0 16px}
h2{font-size:1.5rem;margin:0 0 12px}
h3{font-size:1.05rem;margin:0 0 6px}
p{margin:0 0 12px;color:var(--lp-fg)}
.lp-eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:.75rem;color:var(--lp-accent);font-weight:600;margin:0 0 8px}
.lp-sub{color:var(--lp-muted);font-size:1.05rem}
.lp-byline{color:var(--lp-muted);font-size:.85rem;font-style:italic}
.lp-note{color:var(--lp-muted);font-size:.8rem}
.lp-bullets{padding-left:1.1rem}.lp-bullets li{margin:0 0 6px}
.lp-btn{display:inline-block;background:var(--lp-accent);color:var(--lp-accent-fg);text-decoration:none;font-weight:600;padding:12px 20px;border:0;border-radius:var(--lp-radius);cursor:pointer;font-size:1rem}
.lp-grid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:640px){.lp-grid{grid-template-columns:1fr 1fr}}
.lp-card{background:var(--lp-card);color:var(--lp-card-fg);border:1px solid var(--lp-border);border-radius:var(--lp-radius);padding:18px}
.lp-list{padding-left:1.2rem}.lp-list li{margin:0 0 14px}
.lp-stats{display:flex;flex-wrap:wrap;gap:24px;justify-content:center;text-align:center}
.lp-stat{display:block;font-size:1.8rem;font-weight:700;color:var(--lp-accent)}
.lp-stat-label{display:block;color:var(--lp-muted);font-size:.85rem}
.lp-form{background:var(--lp-subtle);border:1px solid var(--lp-border);border-radius:var(--lp-radius);padding:24px}
.lp-form input{display:block;width:100%;margin:0 0 12px;padding:12px;border:1px solid var(--lp-border);border-radius:calc(var(--lp-radius) - 6px);font-size:1rem;background:var(--lp-card);color:var(--lp-card-fg)}
.lp-urgency,.lp-cta-band{background:var(--lp-soft);color:var(--lp-soft-fg);border-radius:var(--lp-radius);padding:28px;text-align:center}
.lp-faq details{border-bottom:1px solid var(--lp-border);padding:12px 0}
.lp-faq summary{cursor:pointer;font-weight:600}
.lp-compliance{border-top:1px solid var(--lp-border);padding-top:20px}
`.trim();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(doc.meta.title || doc.meta.brandName || "Landing Page")}</title>
<meta name="description" content="${attr(doc.meta.description)}" />
<style>${css}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}
