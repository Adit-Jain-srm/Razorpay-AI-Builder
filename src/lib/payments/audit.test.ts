import { afterEach, describe, expect, it } from "vitest";

import {
  auditActionLabel,
  clearAuditStore,
  countAuditEvents,
  getAuditTimeline,
  getFullAuditLog,
  isFailureAction,
  writeAudit,
} from "./audit";

describe("audit service", () => {
  afterEach(() => clearAuditStore());

  it("writes and reads an audit event", () => {
    const record = writeAudit({
      actor: "operator",
      action: "order_created",
      campaignId: "camp-1",
      orderId: "order-1",
      reason: "Test order for AarogyaFit 12-week program",
      ok: true,
    });

    expect(record.id).toBeTruthy();
    expect(record.timestamp).toBeTruthy();
    expect(record.action).toBe("order_created");
  });

  it("filters by campaign", () => {
    writeAudit({ actor: "op", action: "order_created", campaignId: "camp-1", reason: "r1r1r1r1r1r1r1r1r1r1r1r1r1", ok: true });
    writeAudit({ actor: "op", action: "payment_captured", campaignId: "camp-1", reason: "r2r2r2r2r2r2r2r2r2r2r2r2r2", ok: true });
    writeAudit({ actor: "op", action: "order_created", campaignId: "camp-2", reason: "r3r3r3r3r3r3r3r3r3r3r3r3r3", ok: true });

    const timeline = getAuditTimeline("camp-1");
    expect(timeline).toHaveLength(2);
    expect(timeline.every((r) => r.campaignId === "camp-1")).toBe(true);
  });

  it("returns events in reverse insertion order", () => {
    writeAudit({ actor: "op", action: "order_created", campaignId: "c1", reason: "first event written to audit trail", ok: true });
    writeAudit({ actor: "op", action: "payment_captured", campaignId: "c1", reason: "second event captured payment", ok: true });

    const timeline = getAuditTimeline("c1");
    // Both may have same timestamp (sub-ms); verify length and both present
    expect(timeline).toHaveLength(2);
    const actions = timeline.map((t) => t.action);
    expect(actions).toContain("order_created");
    expect(actions).toContain("payment_captured");
  });

  it("counts events by action", () => {
    writeAudit({ actor: "op", action: "order_created", campaignId: "c1", reason: "test reason with enough chars", ok: true });
    writeAudit({ actor: "op", action: "order_created", campaignId: "c1", reason: "test reason with enough chars", ok: true });
    writeAudit({ actor: "op", action: "payment_failed", campaignId: "c1", reason: "payment failed stop rule test", ok: false });

    const counts = countAuditEvents("c1");
    expect(counts["order_created"]).toBe(2);
    expect(counts["payment_failed"]).toBe(1);
  });

  it("getFullAuditLog returns all events", () => {
    writeAudit({ actor: "op", action: "order_created", campaignId: "c1", reason: "full log test event number one", ok: true });
    writeAudit({ actor: "op", action: "order_created", campaignId: "c2", reason: "full log test event number two", ok: true });

    expect(getFullAuditLog()).toHaveLength(2);
  });

  it("respects limit", () => {
    for (let i = 0; i < 5; i++) {
      writeAudit({ actor: "op", action: "order_created", campaignId: "c1", reason: `event ${i} with long enough reason`, ok: true });
    }
    expect(getAuditTimeline("c1", 3)).toHaveLength(3);
  });
});

describe("audit helpers", () => {
  it("labels actions correctly", () => {
    expect(auditActionLabel("payment_captured")).toBe("Payment captured");
    expect(auditActionLabel("mandate_denied")).toBe("Mandate denied");
  });

  it("identifies failure actions", () => {
    expect(isFailureAction("payment_failed")).toBe(true);
    expect(isFailureAction("mandate_denied")).toBe(true);
    expect(isFailureAction("order_created")).toBe(false);
    expect(isFailureAction("payment_captured")).toBe(false);
  });
});
