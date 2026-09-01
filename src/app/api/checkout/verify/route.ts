/**
 * POST /api/checkout/verify
 *
 * Verify the checkout handler signature (razorpay_signature from the browser).
 * This is NOT the sole source of truth — always rely on webhooks for fulfillment.
 * This route provides instant client feedback ("payment looks valid").
 *
 * runtime = "nodejs" (crypto).
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getEnv, isRazorpayConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { verifyCheckoutSignature } from "@/lib/payments/hmac";

export const runtime = "nodejs";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing required fields", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    // Demo mode: accept any signature
    if (!isRazorpayConfigured()) {
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
      return NextResponse.json(
        { error: "Signature verification failed", verified: false },
        { status: 400 },
      );
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
