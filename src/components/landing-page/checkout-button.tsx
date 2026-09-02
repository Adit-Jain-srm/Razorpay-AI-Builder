"use client";

/**
 * Razorpay Checkout button for public landing pages.
 *
 * Loads Checkout.js from the Razorpay CDN (never self-hosted).
 * Amount is server-priced — the client only sends the SKU.
 *
 * Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/best-practices/
 */

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (response: Record<string, unknown>) => void) => void;
    };
  }
}

interface CheckoutButtonProps {
  sku: string;
  landingPageId?: string;
  campaignId?: string;
  ctaLabel?: string;
  className?: string;
}

export function CheckoutButton({
  sku,
  landingPageId,
  campaignId,
  ctaLabel = "Pay now",
  className = "",
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(
    typeof globalThis.window !== "undefined" && !!globalThis.window.Razorpay,
  );
  const [error, setError] = useState<string | null>(null);

  // Load Razorpay Checkout.js from CDN
  useEffect(() => {
    if (scriptLoaded) return;

    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      const onLoad = () => setScriptLoaded(true);
      existing.addEventListener("load", onLoad);
      return () => existing.removeEventListener("load", onLoad);
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Failed to load payment system");
    document.head.appendChild(script);
  }, [scriptLoaded]);

  const handleCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create order (server-priced)
      const res = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, landingPageId, campaignId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Order creation failed" }));
        setError(data.error ?? "Order creation failed");
        setLoading(false);
        return;
      }

      const order = await res.json();

      // Demo mode: simulate success
      if (order.mode === "demo") {
        window.location.href = `?order=${order.orderId}&demo=true&status=success`;
        return;
      }

      // Step 2: Open Razorpay Checkout
      if (!window.Razorpay) {
        setError("Payment system not ready. Please refresh.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "MediaOS Merchant",
        description: `Order ${order.receipt}`,
        order_id: order.razorpayOrderId,
        prefill: {
          name: "Test User",
          email: "test@mediaos.demo",
          contact: "9999999999",
        },
        notes: {
          sku,
        },
        handler: (response: Record<string, unknown>) => {
          // Verify signature (fire-and-forget — redirect immediately for UX)
          fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          }).catch(() => {});
          window.location.href = `?order=${order.orderId}&status=success`;
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
        theme: {
          color: "#10b981", // emerald-500 (match MediaOS)
        },
      });

      rzp.on("payment.failed", () => {
        window.location.href = `?order=${order.orderId}&status=failed`;
      });

      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }, [sku, landingPageId, campaignId]);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading || (!scriptLoaded && !error)}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : null}
        {ctaLabel}
      </button>
      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
