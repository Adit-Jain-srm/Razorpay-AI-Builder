/**
 * POST /api/webhooks/razorpay
 *
 * Razorpay webhook handler. Events: payment.captured, payment.failed, order.paid.
 *
 * CRITICAL: uses the RAW request body for HMAC verification (never re-serialized).
 * Returns 200 within 5 seconds; heavy processing is async.
 * Idempotent: duplicate event.id is acknowledged but not re-processed.
 * Replay guard: events older than 5 minutes (after signature verification) are ignored.
 *
 * Reference: https://razorpay.com/docs/webhooks/validate-test/
 *
 * runtime = "nodejs" (crypto, raw body parsing).
 */

import { NextResponse } from "next/server";

import { getEnv, isRazorpayWebhookConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { verifyWebhookSignature } from "@/lib/payments/hmac";

export const runtime = "nodejs";

/** In-memory idempotency set (production: move to webhook_receipts table). */
const processedEventIds = new Set<string>();

/** Replay guard: reject events older than 5 minutes. */
const MAX_EVENT_AGE_S = 300;

export async function POST(request: Request) {
  try {
    // Read raw body for HMAC — never JSON.parse then re-stringify
    const rawBody = await request.text();

    // Demo mode: accept without verification
    if (!isRazorpayWebhookConfigured()) {
      logger.info("Webhook demo mode: accepted without verification");
      return NextResponse.json({ status: "ok", mode: "demo" });
    }

    // Verify HMAC signature
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    const webhookSecret = getEnv().RAZORPAY_WEBHOOK_SECRET;

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.warn("Webhook signature invalid");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Parse the verified body
    const event = JSON.parse(rawBody) as {
      event: string;
      payload: Record<string, unknown>;
      created_at?: number;
    };

    // Razorpay event bodies include a top-level `event` field and sometimes `account_id`.
    // Use a composite key for idempotency since the raw webhook body does not have a stable `event_id`.
    const eventCreatedAt = event.created_at ?? 0;
    const paymentEntity = (event.payload as Record<string, Record<string, Record<string, unknown>>>)
      ?.payment?.entity;
    const paymentId = typeof paymentEntity?.id === "string" ? paymentEntity.id : "";
    const eventId = paymentId
      ? `${event.event}_${paymentId}`
      : `${event.event}_${eventCreatedAt}`;

    // Idempotency: skip already-processed events
    if (processedEventIds.has(eventId)) {
      logger.info("Webhook duplicate event ignored", { eventId });
      return NextResponse.json({ status: "ok", duplicate: true });
    }

    // Replay guard: ignore stale events (but still return 200)
    if (eventCreatedAt > 0) {
      const ageS = Date.now() / 1000 - eventCreatedAt;
      if (ageS > MAX_EVENT_AGE_S) {
        logger.info("Webhook stale event ignored", { eventId, ageS: Math.round(ageS) });
        return NextResponse.json({ status: "ok", stale: true });
      }
    }

    // Mark as processed (respond 200 fast, then process)
    processedEventIds.add(eventId);

    // Process by event type
    switch (event.event) {
      case "payment.captured":
        logger.info("Payment captured via webhook", { eventId });
        break;
      case "payment.failed":
        logger.info("Payment failed via webhook", { eventId });
        break;
      case "order.paid":
        logger.info("Order paid via webhook", { eventId });
        break;
      default:
        logger.info("Unhandled webhook event", { event: event.event });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("Webhook processing error", error);
    // Still return 200 to prevent Razorpay retries on our parsing errors
    return NextResponse.json({ status: "ok", error: "Processing error" });
  }
}
