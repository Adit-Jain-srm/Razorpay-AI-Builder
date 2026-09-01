/**
 * HMAC verification for Razorpay checkout handler and webhook.
 *
 * Two DISTINCT secrets and message formats:
 * - Checkout: HMAC-SHA256(key=KEY_SECRET, msg=order_id|payment_id) → compare with razorpay_signature
 * - Webhook:  HMAC-SHA256(key=WEBHOOK_SECRET, msg=RAW body bytes) → compare with X-Razorpay-Signature
 *
 * References:
 * - https://razorpay.com/docs/developer-tools/integrations/custom-checkout/
 * - https://razorpay.com/docs/webhooks/validate-test/
 * - https://dev.to/eventdock/how-to-verify-razorpay-webhook-signatures-and-why-it-is-not-the-payment-signature-1pei
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify the checkout handler signature (razorpay_signature from the browser).
 * Key: RAZORPAY_KEY_SECRET. Message: `order_id|payment_id`.
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  receivedSignature: string,
  keySecret: string,
): boolean {
  if (!orderId || !paymentId || !receivedSignature || !keySecret) return false;

  const body = `${orderId}|${paymentId}`;
  const expected = createHmac("sha256", keySecret).update(body).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(receivedSignature, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Verify a webhook signature (X-Razorpay-Signature header).
 * Key: RAZORPAY_WEBHOOK_SECRET. Message: the RAW request body (not parsed/re-serialized).
 *
 * CRITICAL: pass the raw body bytes, not JSON.stringify(parsed). Re-serialization
 * changes key order / whitespace and breaks the HMAC.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  receivedSignature: string,
  webhookSecret: string,
): boolean {
  if (!rawBody || !receivedSignature || !webhookSecret) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8"))
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(receivedSignature, "hex"),
    );
  } catch {
    return false;
  }
}
