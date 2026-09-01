import type { AudienceSegment, ResearchReport } from "@/lib/research/standard-models";

/** Pure serializers + a browser download helper for exporting research. */

export function reportToJson(report: ResearchReport): string {
  return JSON.stringify(report, null, 2);
}

export function personaToMarkdown(persona: AudienceSegment): string {
  const lines: string[] = [`### ${persona.name}`];
  if (persona.sizeEstimate.range) lines.push(`**Size:** ${persona.sizeEstimate.range}`);
  const d = persona.demographics;
  const demo = [d.ageRange && `Age ${d.ageRange}`, d.incomeBracket, d.education, d.genderSplit, d.location].filter(Boolean);
  if (demo.length) lines.push(`**Demographics:** ${demo.join(" · ")}`);
  if (persona.psychographics.painPoints.length) lines.push(`**Pain points:** ${persona.psychographics.painPoints.join("; ")}`);
  if (persona.psychographics.values.length) lines.push(`**Values:** ${persona.psychographics.values.join(", ")}`);
  if (persona.psychographics.interests.length) lines.push(`**Interests:** ${persona.psychographics.interests.join(", ")}`);
  if (persona.psychographics.aspirations.length) lines.push(`**Aspirations:** ${persona.psychographics.aspirations.join(", ")}`);
  if (persona.behaviors.platforms.length) lines.push(`**Platforms:** ${persona.behaviors.platforms.join(", ")}`);
  return lines.join("\n");
}

export function reportToMarkdown(report: ResearchReport, projectName: string): string {
  const out: string[] = [];
  out.push(`# Audience Research - ${projectName}`);
  out.push(`> Query: ${report.query.query}`);
  if (report.generatedAt) out.push(`> Generated: ${report.generatedAt}`);
  out.push("");

  if (report.segments.length) {
    out.push("## Personas", "");
    for (const persona of report.segments) out.push(personaToMarkdown(persona), "");
  }

  if (report.opportunities.length) {
    out.push("## Opportunities", "");
    for (const op of report.opportunities) {
      out.push(`- **${op.title}** (${op.type})`, `  ${op.rationale}`);
    }
    out.push("");
  }

  if (report.painPoints.length) {
    out.push("## Pain points", "");
    for (const pain of report.painPoints) {
      out.push(`- **${pain.summary}**${pain.quote ? ` - "${pain.quote}"` : ""}`);
    }
    out.push("");
  }

  if (report.buyingTriggers.length) {
    out.push("## Buying triggers", "");
    for (const t of report.buyingTriggers) out.push(`- ${t.trigger}${t.urgency ? ` (${t.urgency})` : ""}`);
    out.push("");
  }

  if (report.competitorAds.length) {
    out.push("## Competitor ads", "");
    for (const ad of report.competitorAds) {
      out.push(`- **${ad.advertiser ?? "Unknown"}** [${ad.platform}]: ${ad.copy ?? ""}${ad.hooksUsed.length ? ` _(hooks: ${ad.hooksUsed.join(", ")})_` : ""}`);
    }
    out.push("");
  }

  if (report.trends.length) {
    out.push("## Trends", "");
    for (const t of report.trends) out.push(`- ${t.topic}${t.velocity ? ` (velocity ${(t.velocity * 100).toFixed(0)})` : ""}`);
    out.push("");
  }

  if (report.communityInsights.length) {
    out.push("## Community voices", "");
    for (const c of report.communityInsights) out.push(`- [${c.platform ?? "web"}] "${c.content}"`);
    out.push("");
  }

  const sources = report.sources.filter((s) => !s.provider.startsWith("_") && s.url);
  if (sources.length) {
    out.push("## Sources", "");
    sources.forEach((s, i) => out.push(`${i + 1}. [${s.title ?? s.url}](${s.url}) - ${s.provider}`));
    out.push("");
  }

  return out.join("\n");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "research";
}

/** Triggers a client-side file download. No-ops on the server. */
export function downloadTextFile(filename: string, content: string, mime = "text/plain"): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
