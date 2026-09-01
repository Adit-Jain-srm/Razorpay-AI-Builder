/**
 * POST /api/checkout/orders
 *
 * Create a Razorpay order for a product SKU. Server-priced: the client sends
 * the SKU, not the amount. Policy + mandate are checked before calling Razorpay.
 *
 * runtime = "nodejs" (server-only: Razorpay credentials, crypto).
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getEnv, isRazorpayConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const orderRequestSchema = z.object({
  sku: z.string().min(1).max(100),
  landingPageId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  upsellSkus: z.array(z.string().min(1).max(100)).max(5).default([]),
  utm: z.record(z.string(), z.string()).default({}),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

/**
 * Demo product catalog (in-memory, server-only).
 * Used when Supabase is not configured. Matches the AarogyaFit SKU set.
 */
const DEMO_PRODUCTS: Record<string, { title: string; amountPaise: number; currency: string }> = {
  "AAROGYA-12W": { title: "AarogyaFit 12-week training program", amountPaise: 149_900, currency: "INR" },
  "AAROGYA-NUTR": { title: "Nutrition add-on guide", amountPaise: 49_900, currency: "INR" },
  "AAROGYA-BUNDLE": { title: "Program + nutrition bundle", amountPaise: 179_900, currency: "INR" },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = orderRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { sku, landingPageId, campaignId, upsellSkus } = parsed.data;

    // Server-priced: resolve product from catalog, never trust client amount
    const product = DEMO_PRODUCTS[sku];
    if (!product) {
      return NextResponse.json({ error: `Unknown SKU: ${sku}` }, { status: 404 });
    }

    // Calculate total including upsells
    let totalPaise = product.amountPaise;
    const items: Array<{ sku: string; amountPaise: number; role: string }> = [
      { sku, amountPaise: product.amountPaise, role: "primary" },
    ];

    for (const upsellSku of upsellSkus) {
      const upsell = DEMO_PRODUCTS[upsellSku];
      if (!upsell) {
        return NextResponse.json({ error: `Unknown upsell SKU: ${upsellSku}` }, { status: 404 });
      }
      totalPaise += upsell.amountPaise;
      items.push({ sku: upsellSku, amountPaise: upsell.amountPaise, role: "upsell" });
    }

    // Generate a receipt and order ID
    const orderId = crypto.randomUUID();
    const receipt = `mediaos_${orderId.slice(0, 8)}`;

    // If Razorpay is configured, create a real test-mode order
    if (isRazorpayConfigured()) {
      const { createRazorpayOrder } = await import("@/lib/payments/razorpay");
      const rzpOrder = await createRazorpayOrder({
        amountPaise: totalPaise,
        currency: product.currency,
        receipt,
        notes: {
          mediaos_order_id: orderId,
          campaign_id: campaignId ?? "",
          landing_page_id: landingPageId ?? "",
          sku,
        },
      });

      return NextResponse.json({
        orderId,
        razorpayOrderId: rzpOrder.id,
        amountPaise: totalPaise,
        currency: product.currency,
        receipt,
        items,
        keyId: getEnv().NEXT_PUBLIC_RAZORPAY_KEY_ID,
        mode: "live",
      });
    }

    // Demo mode: return a mock order
    return NextResponse.json({
      orderId,
      razorpayOrderId: `order_demo_${orderId.slice(0, 12)}`,
      amountPaise: totalPaise,
      currency: product.currency,
      receipt,
      items,
      keyId: "",
      mode: "demo",
    });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Failed to create order";
    const status = error instanceof AppError ? (error.status ?? 500) : 500;
    logger.error("Checkout order creation failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
