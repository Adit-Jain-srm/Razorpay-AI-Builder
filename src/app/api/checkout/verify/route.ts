/**
 * POST /api/checkout/verify
 *
 * Verify the checkout handler signature (razorpay_signature from the browser).
 * This is NOT the sole source of truth — always rely on webhooks for fulfillment.
 * This route provides instant client feedback ("payment looks valid") and
 * updates the order status to "attempted" (or "paid" in demo mode).
 *
 * runtime = "nodejs" (crypto).
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getEnv, isRazorpayConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { writeAudit } from "@/lib/payments/audit";
import { verifyCheckoutSignature } from "@/lib/payments/hmac";
import { getOrderByRazorpayId, updateOrderByRazorpayId } from "@/lib/payments/orders";

export const runtime = "nodejs";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing required fields", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    // Demo mode: accept any signature, mark order as paid
    if (!isRazorpayConfigured()) {
      const order = updateOrderByRazorpayId(razorpay_order_id, "paid", razorpay_payment_id);
      if (order) {
        writeAudit({
          actor: "buyer",
          action: "payment_captured",
          campaignId: order.campaignId ?? undefined,
          orderId: order.orderId,
          reason: `Demo payment verified for order ${order.orderId}`,
          afterState: { razorpayPaymentId: razorpay_payment_id, mode: "demo" },
          ok: true,
        });
      }
      return NextResponse.json({
        verified: true,
        mode: "demo",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    }

    const keySecret = getEnv().RAZORPAY_KEY_SECRET;
    const valid = verifyCheckoutSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      keySecret,
    );

    if (!valid) {
      logger.warn("Checkout signature mismatch", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });

      const existingOrder = getOrderByRazorpayId(razorpay_order_id);
      writeAudit({
        actor: "buyer",
        action: "signature_invalid",
        campaignId: existingOrder?.campaignId ?? undefined,
        orderId: existingOrder?.orderId,
        reason: `Checkout signature verification failed for Razorpay order ${razorpay_order_id}`,
        ok: false,
        errorCode: "SIGNATURE_INVALID",
      });

      return NextResponse.json(
        { error: "Signature verification failed", verified: false },
        { status: 400 },
      );
    }

    // Signature valid — mark as attempted (webhook confirms capture)
    const order = updateOrderByRazorpayId(razorpay_order_id, "attempted", razorpay_payment_id);
    if (order) {
      writeAudit({
        actor: "buyer",
        action: "order_attempted",
        campaignId: order.campaignId ?? undefined,
        orderId: order.orderId,
        reason: `Payment signature verified for order ${order.orderId}`,
        afterState: { razorpayPaymentId: razorpay_payment_id, mode: "live" },
        ok: true,
      });
    }

    return NextResponse.json({
      verified: true,
      mode: "live",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    logger.error("Checkout verification failed", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
