import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyCheckoutSignature, verifyWebhookSignature } from "./hmac";

/* -------------------------------------------------------------------------- */
/* Checkout handler signature (KEY_SECRET over order_id|payment_id)           */
/* -------------------------------------------------------------------------- */

describe("verifyCheckoutSignature", () => {
  const keySecret = "test_key_secret_abc123";
  const orderId = "order_Abc123Xyz";
  const paymentId = "pay_DefGhi789";

  const validSig = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  it("accepts a valid signature", () => {
    expect(verifyCheckoutSignature(orderId, paymentId, validSig, keySecret)).toBe(true);
  });

  it("rejects when the wrong secret is used", () => {
    expect(verifyCheckoutSignature(orderId, paymentId, validSig, "wrong-secret")).toBe(false);
  });

  it("rejects a tampered payment ID", () => {
    expect(verifyCheckoutSignature(orderId, "pay_tampered", validSig, keySecret)).toBe(false);
  });

  it("rejects a tampered order ID", () => {
    expect(verifyCheckoutSignature("order_tampered", paymentId, validSig, keySecret)).toBe(false);
  });

  it("rejects empty inputs", () => {
    expect(verifyCheckoutSignature("", paymentId, validSig, keySecret)).toBe(false);
    expect(verifyCheckoutSignature(orderId, "", validSig, keySecret)).toBe(false);
    expect(verifyCheckoutSignature(orderId, paymentId, "", keySecret)).toBe(false);
    expect(verifyCheckoutSignature(orderId, paymentId, validSig, "")).toBe(false);
  });

  it("rejects a signature with non-hex characters", () => {
    expect(verifyCheckoutSignature(orderId, paymentId, "not-a-hex-sig!!!", keySecret)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Webhook signature (WEBHOOK_SECRET over RAW body)                           */
/* -------------------------------------------------------------------------- */

describe("verifyWebhookSignature", () => {
  const webhookSecret = "whsec_test_webhook_secret_32chars!!";
  const rawBody = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123"}}}}';

  const validSig = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  it("accepts a valid webhook signature", () => {
    expect(verifyWebhookSignature(rawBody, validSig, webhookSecret)).toBe(true);
  });

  it("rejects when the wrong secret is used", () => {
    expect(verifyWebhookSignature(rawBody, validSig, "wrong-webhook-secret")).toBe(false);
  });

  it("rejects when the body is re-serialized (the raw-body trap)", () => {
    const parsed = JSON.parse(rawBody);
    // Re-serialization with different key order breaks the HMAC
    const reordered = JSON.stringify({ payload: parsed.payload, event: parsed.event });
    expect(verifyWebhookSignature(reordered, validSig, webhookSecret)).toBe(false);
  });

  it("rejects empty inputs", () => {
    expect(verifyWebhookSignature("", validSig, webhookSecret)).toBe(false);
    expect(verifyWebhookSignature(rawBody, "", webhookSecret)).toBe(false);
    expect(verifyWebhookSignature(rawBody, validSig, "")).toBe(false);
  });

  it("works with a Buffer body", () => {
    const bufBody = Buffer.from(rawBody, "utf-8");
    expect(verifyWebhookSignature(bufBody, validSig, webhookSecret)).toBe(true);
  });

  it("checkout secret does NOT verify a webhook body", () => {
    const checkoutSecret = "rzp_key_secret_different";
    const wrongSig = createHmac("sha256", checkoutSecret).update(rawBody).digest("hex");
    expect(verifyWebhookSignature(rawBody, wrongSig, webhookSecret)).toBe(false);
  });
});
