/**
 * GET /api/commerce/catalog
 *
 * Public ACP-inspired product catalog feed. Returns all active products
 * with pricing in paise, availability, upsell graph, and checkout endpoint.
 *
 * Not a certified ACP merchant — inspired by the protocol for agent readability.
 * See Docs/buildathon/protocols.md.
 */

import { NextResponse } from "next/server";

import { getAllProducts } from "@/lib/payments/products";

export const runtime = "nodejs";

export async function GET() {
  const products = getAllProducts();

  const catalog = {
    spec: "mediaos-acp-inspired/2026-09",
    merchant: {
      name: "AarogyaFit (MediaOS Demo Merchant)",
      country: "IN",
      psp: "razorpay_test",
    },
    items: products.map((p) => ({
      id: p.sku,
      title: p.title,
      description: p.description,
      url: "/lp/aarogya-fit",
      image_url: p.imageUrl,
      price: { amount_paise: p.amountPaise, currency: p.currency, formatted: `₹${(p.amountPaise / 100).toLocaleString("en-IN")}` },
      availability: p.availability,
      is_eligible_search: true,
      is_eligible_checkout: true,
      upsell_skus: p.upsellSkus,
      cross_sell_skus: p.crossSellSkus,
      checkout: { create_order: "/api/checkout/orders", create_session: "/api/commerce/checkout/sessions" },
    })),
  };

  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
