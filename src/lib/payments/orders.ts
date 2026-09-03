/**
 * In-memory order store — persists order lifecycle across create → verify → webhook.
 *
 * SERVER ONLY. Bounded to MAX_ORDERS to prevent unbounded growth on warm
 * serverless instances. Keyed by both `orderId` (internal UUID) and
 * `razorpayOrderId` (Razorpay's `order_XXX`) for O(1) lookup from either side.
 *
 * This is the demo-mode store. A production deployment would write to Supabase
 * `orders` table via the same interface.
 */

import type { OrderStatus } from "./types";

export interface StoredOrder {
  orderId: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  sku: string;
  productTitle: string;
  amountPaise: number;
  currency: string;
  receipt: string;
  items: Array<{ sku: string; amountPaise: number; role: string }>;
  status: OrderStatus;
  mode: "live" | "demo";
  campaignId: string | null;
  landingPageId: string | null;
  createdAt: string;
  updatedAt: string;
}

const byOrderId = new Map<string, StoredOrder>();
const byRazorpayOrderId = new Map<string, StoredOrder>();
const MAX_ORDERS = 5_000;

function evictOldest(): void {
  if (byOrderId.size < MAX_ORDERS) return;
  const oldest = byOrderId.keys().next().value;
  if (oldest === undefined) return;
  const order = byOrderId.get(oldest);
  byOrderId.delete(oldest);
  if (order?.razorpayOrderId) byRazorpayOrderId.delete(order.razorpayOrderId);
}

/** Persist a newly created order. */
export function storeOrder(order: StoredOrder): StoredOrder {
  evictOldest();
  byOrderId.set(order.orderId, order);
  if (order.razorpayOrderId) {
    byRazorpayOrderId.set(order.razorpayOrderId, order);
  }
  return order;
}

/** Lookup by internal UUID. */
export function getOrderById(orderId: string): StoredOrder | undefined {
  return byOrderId.get(orderId);
}

/** Lookup by Razorpay order ID (`order_XXX`). */
export function getOrderByRazorpayId(razorpayOrderId: string): StoredOrder | undefined {
  return byRazorpayOrderId.get(razorpayOrderId);
}

/** Update an order's status and optional payment ID. Returns the updated order or undefined. */
export function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  razorpayPaymentId?: string,
): StoredOrder | undefined {
  const order = byOrderId.get(orderId);
  if (!order) return undefined;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
  return order;
}

/** Update by Razorpay order ID. Returns the updated order or undefined. */
export function updateOrderByRazorpayId(
  razorpayOrderId: string,
  status: OrderStatus,
  razorpayPaymentId?: string,
): StoredOrder | undefined {
  const order = byRazorpayOrderId.get(razorpayOrderId);
  if (!order) return undefined;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
  return order;
}

/** Total stored orders (for tests). */
export function orderStoreSize(): number {
  return byOrderId.size;
}

/** Clear all orders (for tests). */
export function clearOrderStore(): void {
  byOrderId.clear();
  byRazorpayOrderId.clear();
}
