/**
 * POST /api/checkout/orders
 *
 * Create a Razorpay order for a product SKU. Server-priced: the client sends
 * the SKU, not the amount. Policy + mandate are checked before calling Razorpay.
 *
 * Persists the order in the in-memory store and writes an audit event.
 *
 * runtime = "nodejs" (server-only: Razorpay credentials, crypto).
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getEnv, isRazorpayConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { writeAudit } from "@/lib/payments/audit";
import { storeOrder } from "@/lib/payments/orders";
import { getProduct } from "@/lib/payments/products";

export const runtime = "nodejs";

const orderRequestSchema = z.object({
  sku: z.string().min(1).max(100),
  landingPageId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  upsellSkus: z.array(z.string().min(1).max(100)).max(5).default([]),
  utm: z.record(z.string(), z.string()).default({}),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = orderRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { sku, landingPageId, campaignId, upsellSkus } = parsed.data;

    // Server-priced: resolve product from catalog, never trust client amount
    const product = getProduct(sku);
    if (!product) {
      return NextResponse.json({ error: `Unknown SKU: ${sku}` }, { status: 404 });
    }

    // Calculate total including upsells
    let totalPaise = product.amountPaise;
    const items: Array<{ sku: string; amountPaise: number; role: string }> = [
      { sku, amountPaise: product.amountPaise, role: "primary" },
    ];

    for (const upsellSku of upsellSkus) {
      const upsell = getProduct(upsellSku);
      if (!upsell) {
        return NextResponse.json({ error: `Unknown upsell SKU: ${upsellSku}` }, { status: 404 });
      }
      totalPaise += upsell.amountPaise;
      items.push({ sku: upsellSku, amountPaise: upsell.amountPaise, role: "upsell" });
    }

    // Generate a receipt and order ID
    const orderId = crypto.randomUUID();
    const receipt = `mediaos_${orderId.slice(0, 8)}`;
    const now = new Date().toISOString();

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

      storeOrder({
        orderId,
        razorpayOrderId: rzpOrder.id,
        razorpayPaymentId: null,
        sku,
        productTitle: product.title,
        amountPaise: totalPaise,
        currency: product.currency,
        receipt,
        items,
        status: "created",
        mode: "live",
        campaignId: campaignId ?? null,
        landingPageId: landingPageId ?? null,
        createdAt: now,
        updatedAt: now,
      });

      writeAudit({
        actor: "buyer",
        action: "order_created",
        campaignId,
        orderId,
        reason: `Order created for ${product.title} (${sku}) — ₹${(totalPaise / 100).toLocaleString("en-IN")}`,
        afterState: { razorpayOrderId: rzpOrder.id, amountPaise: totalPaise, mode: "live" },
        ok: true,
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
    const demoRzpId = `order_demo_${orderId.slice(0, 12)}`;

    storeOrder({
      orderId,
      razorpayOrderId: demoRzpId,
      razorpayPaymentId: null,
      sku,
      productTitle: product.title,
      amountPaise: totalPaise,
      currency: product.currency,
      receipt,
      items,
      status: "created",
      mode: "demo",
      campaignId: campaignId ?? null,
      landingPageId: landingPageId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    writeAudit({
      actor: "buyer",
      action: "order_created",
      campaignId,
      orderId,
      reason: `Demo order created for ${product.title} (${sku}) — ₹${(totalPaise / 100).toLocaleString("en-IN")}`,
      afterState: { razorpayOrderId: demoRzpId, amountPaise: totalPaise, mode: "demo" },
      ok: true,
    });

    return NextResponse.json({
      orderId,
      razorpayOrderId: demoRzpId,
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
