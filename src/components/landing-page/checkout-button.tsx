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
import { Lock, ShieldCheck } from "@phosphor-icons/react";

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
  slug?: string;
  productTitle?: string;
  amountPaise?: number;
  landingPageId?: string;
  campaignId?: string;
  ctaLabel?: string;
  className?: string;
}

export function CheckoutButton({
  sku,
  slug,
  productTitle,
  amountPaise,
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

  const formatPrice = (value: number | undefined) =>
    value === undefined
      ? null
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(value / 100);

  const destinationSlug =
    slug && slug.trim().length > 0 ? encodeURIComponent(slug.trim()) : undefined;
  const formattedPrice = formatPrice(amountPaise);

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
        body: JSON.stringify({
          sku,
          landingPageId,
          campaignId,
          // Pass server-resolved product details so the orders route can auto-create
          // the catalog entry if the SKU is missing on this serverless instance.
          productTitle: productTitle ?? undefined,
          productAmountPaise: amountPaise ?? undefined,
        }),
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
        const amount = typeof order.amountPaise === "number" ? order.amountPaise : amountPaise;
        if (!destinationSlug) {
          setError("Missing page context. Please refresh and try again.");
          setLoading(false);
          return;
        }
        const params = new URLSearchParams({
          order: String(order.orderId),
          demo: "true",
        });
        if (typeof amount === "number") params.set("amount", String(amount));
        window.location.href = `/lp/${destinationSlug}/thanks?${params.toString()}`;
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
          if (!destinationSlug) {
            setError("Missing page context. Please refresh and try again.");
            setLoading(false);
            return;
          }
          const params = new URLSearchParams({
            order: String(order.orderId),
            rzp: String(order.razorpayOrderId),
            amount: String(order.amountPaise),
          });
          window.location.href = `/lp/${destinationSlug}/thanks?${params.toString()}`;
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
        theme: {
          color: "#10b981", // emerald-500 (match MediaOS)
        },
      });

      rzp.on("payment.failed", () => {
        if (!destinationSlug) {
          setError("Missing page context. Please refresh and try again.");
          setLoading(false);
          return;
        }
        const params = new URLSearchParams({ order: String(order.orderId) });
        window.location.href = `/lp/${destinationSlug}/failed?${params.toString()}`;
      });

      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }, [sku, landingPageId, campaignId, amountPaise, productTitle, destinationSlug]);

  return (
    <div className="flex w-full flex-col items-stretch gap-3">
      <div className="rounded-md border border-[var(--lp-border)] bg-[var(--lp-card)] p-3 text-left">
        <p className="text-xs uppercase tracking-wide text-[var(--lp-muted)]">Order summary</p>
        <p className="mt-1 text-sm font-semibold text-[var(--lp-card-fg)]">{productTitle ?? sku}</p>
        {formattedPrice ? (
          <p className="mt-1 text-lg font-bold text-[var(--lp-fg)]">{formattedPrice}</p>
        ) : null}
      </div>

      {!scriptLoaded && !error ? (
        <div
          aria-hidden="true"
          className="h-14 animate-pulse rounded-lg border border-[var(--lp-border)] bg-[var(--lp-card)] motion-reduce:animate-none"
        />
      ) : (
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className={`inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-8 text-lg font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        >
          {loading ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none" />
          ) : null}
          {ctaLabel}
        </button>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--lp-muted)]">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lp-border)] bg-[var(--lp-card)] px-2.5 py-1">
          <Lock className="size-3.5" />
          Secure payment
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lp-border)] bg-[var(--lp-card)] px-2.5 py-1">
          <ShieldCheck className="size-3.5" />
          Razorpay Test Mode
        </span>
      </div>

      {error ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}{" "}
          <a href="#pay" className="underline underline-offset-2">
            Try again
          </a>
          .
        </div>
      ) : null}
    </div>
  );
}
