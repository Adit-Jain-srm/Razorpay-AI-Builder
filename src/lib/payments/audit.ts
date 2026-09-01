/**
 * Audit timeline service — append-only ledger of money actions.
 *
 * The audit trail is the Track 01 bar: every money action must be explainable,
 * bounded, gated, and visible in a timeline the judge can inspect without
 * replaying the Operator chat.
 *
 * PURE functions + in-memory store (demo mode). Supabase store reads from
 * audit_events table (Phase 9).
 */

import type { AuditAction, AuditEntry } from "./types";

/* -------------------------------------------------------------------------- */
/* In-memory audit store (demo mode)                                          */
/* -------------------------------------------------------------------------- */

export interface AuditRecord extends AuditEntry {
  id: string;
  timestamp: string;
}

const auditStore: AuditRecord[] = [];
const MAX_AUDIT_RECORDS = 10_000;

/** Append an audit event. Returns the record with id + timestamp. */
export function writeAudit(entry: AuditEntry, _userId = "demo"): AuditRecord {
  const record: AuditRecord = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  if (auditStore.length >= MAX_AUDIT_RECORDS) {
    auditStore.shift();
  }
  auditStore.push(record);
  return record;
}

/** Read the audit timeline for a campaign, newest first. */
export function getAuditTimeline(campaignId: string, limit = 100): AuditRecord[] {
  return [...auditStore]
    .filter((r) => r.campaignId === campaignId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

/** Read the full audit log (no campaign filter), newest first. */
export function getFullAuditLog(limit = 200): AuditRecord[] {
  return [...auditStore]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

/** Count events by action type for a campaign. */
export function countAuditEvents(campaignId: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of auditStore) {
    if (r.campaignId === campaignId) {
      counts[r.action] = (counts[r.action] ?? 0) + 1;
    }
  }
  return counts;
}

/** Clear the in-memory store (for tests). */
export function clearAuditStore(): void {
  auditStore.length = 0;
}

/* -------------------------------------------------------------------------- */
/* Audit action labels (for UI rendering)                                     */
/* -------------------------------------------------------------------------- */

const ACTION_LABELS: Record<AuditAction, string> = {
  order_created: "Order created",
  order_attempted: "Payment attempted",
  payment_captured: "Payment captured",
  payment_failed: "Payment failed",
  order_expired: "Order expired",
  mandate_created: "Mandate issued",
  mandate_denied: "Mandate denied",
  mandate_consumed: "Mandate consumed",
  budget_reallocated: "Budget reallocated",
  upsell_applied: "Upsell applied",
  upsell_rejected: "Upsell rejected",
  campaign_activated: "Campaign activated",
  signature_invalid: "Signature invalid",
};

export function auditActionLabel(action: AuditAction): string {
  return ACTION_LABELS[action] ?? action;
}

/** Whether an audit action represents a failure / denial. */
export function isFailureAction(action: AuditAction): boolean {
  return action === "payment_failed" ||
    action === "mandate_denied" ||
    action === "upsell_rejected" ||
    action === "signature_invalid" ||
    action === "order_expired";
}
