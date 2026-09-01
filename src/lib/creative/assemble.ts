import type { AdPlatform } from "@/lib/research/standard-models";

import { classifyHookHeuristic } from "./hooks";
import { buildRoleFields, collectFieldFlags, isVariantComplete } from "./limits";
import { getPlatformSpec } from "./platforms";
import { scoreVariant } from "./scoring";
import { creativeContentSchema, type CreativeContent, type CreativeField, type HookAnalysis } from "./types";

/**
 * PURE assembly of a validated `CreativeContent` from raw role strings. Shared by
 * the generator (after the AI returns), the seeded fixtures, and the inline
 * editor (re-enforce + re-score after a manual edit) - so a creative is enforced,
 * classified, and scored the exact same way no matter where it came from.
 */

/** Raw, per-role copy strings (e.g. `{ headline: ["..."], description: ["..."] }`). */
export type RawByRole = Record<string, string[]>;

export interface AssembleMeta {
  angle?: string;
  painPointsTargeted?: string[];
  batchId?: string;
  /** Override the classified hook (e.g. from the optional AI classifier). */
  hook?: HookAnalysis;
}

/** Builds enforced, labeled fields in spec order from raw role strings. */
export function buildFieldsFromRaw(platform: AdPlatform, byRole: RawByRole): CreativeField[] {
  const spec = getPlatformSpec(platform);
  const fields: CreativeField[] = [];
  for (const role of spec.roles) {
    const texts = byRole[role.role] ?? [];
    fields.push(...buildRoleFields(role, texts));
  }
  return fields;
}

/** Picks the denormalized display headline + body from enforced fields. */
export function denormalize(platform: AdPlatform, fields: CreativeField[]): { headline: string; body: string } {
  const spec = getPlatformSpec(platform);
  const headline =
    fields.find((f) => f.role === spec.primaryHeadlineRole && f.text.trim().length > 0)?.text ?? fields[0]?.text ?? "";
  const body =
    fields.find((f) => f.role === spec.primaryBodyRole && f.text.trim().length > 0)?.text ??
    fields.find((f) => f.role !== spec.primaryHeadlineRole && f.text.trim().length > 0)?.text ??
    "";
  return { headline, body };
}

function finalize(platform: AdPlatform, fields: CreativeField[], meta: AssembleMeta): CreativeContent {
  const spec = getPlatformSpec(platform);
  const { headline, body } = denormalize(platform, fields);
  const hookText = [headline, body, ...fields.map((f) => f.text)].join(" ");
  const hook = meta.hook ?? classifyHookHeuristic(hookText);
  const score = scoreVariant(platform, fields, hook);

  const flags = collectFieldFlags(fields);
  if (!isVariantComplete(platform, fields)) flags.push("incomplete");

  return creativeContentSchema.parse({
    platform,
    format: spec.format,
    headline,
    body,
    fields,
    hook,
    score,
    angle: meta.angle,
    painPointsTargeted: meta.painPointsTargeted ?? [],
    batchId: meta.batchId,
    flags,
  });
}

/** Assembles a full creative from raw role strings: enforce -> classify -> score. */
export function assembleVariant(platform: AdPlatform, byRole: RawByRole, meta: AssembleMeta = {}): CreativeContent {
  return finalize(platform, buildFieldsFromRaw(platform, byRole), meta);
}

/** Re-assembles after an inline edit: re-enforce limits on edited fields, re-score. */
export function assembleFromFields(platform: AdPlatform, fields: CreativeField[], meta: AssembleMeta = {}): CreativeContent {
  const byRole: RawByRole = {};
  for (const f of fields) {
    (byRole[f.role] ??= []).push(f.text);
  }
  return finalize(platform, buildFieldsFromRaw(platform, byRole), meta);
}
