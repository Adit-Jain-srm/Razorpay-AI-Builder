/**
 * GET /api/checkout/orders/[orderId]
 *
 * Public order lookup — returns order details from the in-memory store.
 * Used by the thanks/failed pages to show real persisted data instead of
 * relying solely on query params.
 *
 * No auth required (order IDs are unguessable UUIDs). Scoped to read-only.
 */

import { NextResponse } from "next/server";

import { getOrderById } from "@/lib/payments/orders";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  if (!orderId || orderId.length < 10) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const order = getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    orderId: order.orderId,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    sku: order.sku,
    productTitle: order.productTitle,
    amountPaise: order.amountPaise,
    currency: order.currency,
    receipt: order.receipt,
    items: order.items,
    status: order.status,
    mode: order.mode,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  });
}
