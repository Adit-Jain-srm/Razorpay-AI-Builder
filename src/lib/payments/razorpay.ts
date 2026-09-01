/**
 * Razorpay HTTP client — Orders API (Test Mode).
 *
 * Pattern matches src/lib/ai/azure.ts and src/lib/research/brightdata.ts:
 * fetch + Basic auth, withRetry/withTimeout, typed AppError, ConfigurationError when unset.
 *
 * Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
 */

import { getEnv, isRazorpayConfigured } from "@/lib/env";
import { AppError, ConfigurationError } from "@/lib/errors";
import { withRetry, withTimeout } from "@/lib/resilience";

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

function getAuthHeader(): string {
  const env = getEnv();
  const keyId = env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export interface RazorpayOrderInput {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

/**
 * Create a Razorpay order (server-side, Test Mode).
 * POST https://api.razorpay.com/v1/orders
 */
export async function createRazorpayOrder(input: RazorpayOrderInput): Promise<RazorpayOrderResponse> {
  if (!isRazorpayConfigured()) {
    throw new ConfigurationError("razorpay", "Razorpay key ID and secret are required to create orders");
  }

  const body = JSON.stringify({
    amount: input.amountPaise,
    currency: input.currency,
    receipt: input.receipt,
    notes: input.notes ?? {},
  });

  return withRetry(
    async (signal) =>
      withTimeout(
        async () => {
          const res = await fetch(`${RAZORPAY_BASE}/orders`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: getAuthHeader(),
            },
            body,
            signal,
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new AppError(`Razorpay Orders API ${res.status}: ${text.slice(0, 200)}`, {
              code: "UPSTREAM",
              service: "razorpay",
              status: res.status,
              retriable: res.status >= 500,
            });
          }

          return (await res.json()) as RazorpayOrderResponse;
        },
        15_000,
        signal,
        "razorpay-create-order",
      ),
    { retries: 2, baseDelayMs: 500, maxDelayMs: 4000, label: "razorpay-create-order" },
  );
}

/**
 * Fetch an order from Razorpay (for verification fallback).
 * GET https://api.razorpay.com/v1/orders/:id
 */
export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrderResponse> {
  if (!isRazorpayConfigured()) {
    throw new ConfigurationError("razorpay", "Razorpay credentials required to fetch orders");
  }

  return withRetry(
    async (signal) =>
      withTimeout(
        async () => {
          const res = await fetch(`${RAZORPAY_BASE}/orders/${orderId}`, {
            headers: { Authorization: getAuthHeader() },
            signal,
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new AppError(`Razorpay fetch order ${res.status}: ${text.slice(0, 200)}`, {
              code: "UPSTREAM",
              service: "razorpay",
              status: res.status,
              retriable: res.status >= 500,
            });
          }

          return (await res.json()) as RazorpayOrderResponse;
        },
        10_000,
        signal,
        "razorpay-fetch-order",
      ),
    { retries: 1, baseDelayMs: 300, label: "razorpay-fetch-order" },
  );
}
