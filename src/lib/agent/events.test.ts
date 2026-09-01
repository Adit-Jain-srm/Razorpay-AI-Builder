import { describe, expect, it } from "vitest";

import { decodeEvents, encodeEvent, type OperatorEvent } from "./events";

describe("operator event codec", () => {
  it("round-trips an event as a single SSE frame", () => {
    const event: OperatorEvent = { type: "message", delta: "hello" };
    const frame = encodeEvent(event);
    expect(frame).toContain("event: message");
    expect(frame).toContain(`data: ${JSON.stringify(event)}`);
    expect(frame.endsWith("\n\n")).toBe(true);

    const { events, rest } = decodeEvents(frame);
    expect(events).toEqual([event]);
    expect(rest).toBe("");
  });

  it("decodes multiple events and buffers a trailing partial frame", () => {
    const a: OperatorEvent = { type: "status", status: "planning" };
    const b: OperatorEvent = { type: "run-finish", status: "completed" };
    const frameA = encodeEvent(a);
    const partialB = `event: run-finish\ndata: ${JSON.stringify(b)}`; // no trailing \n\n
    const buffer = `${frameA}${partialB}`;

    const first = decodeEvents(buffer);
    expect(first.events).toEqual([a]);
    expect(first.rest).toBe(partialB);

    const second = decodeEvents(`${first.rest}\n\n`);
    expect(second.events).toEqual([b]);
    expect(second.rest).toBe("");
  });

  it("skips malformed frames and keepalive comments without throwing", () => {
    const valid: OperatorEvent = { type: "notice", level: "info", message: "ok" };
    const buffer = `: keepalive\n\nevent: broken\nno-data-here\n\nevent: notice\ndata: ${JSON.stringify(valid)}\n\n`;

    const { events } = decodeEvents(buffer);
    expect(events).toEqual([valid]);
  });

  it("ignores frames without a data line", () => {
    const buffer = "event: message\nid: 1\n\nevent: plan\n\n";
    const { events } = decodeEvents(buffer);
    expect(events).toEqual([]);
  });

  it("includes event id when provided", () => {
    const event: OperatorEvent = { type: "message", delta: "hi" };
    const frame = encodeEvent(event, 42);
    expect(frame).toContain("id: 42");
  });
});
