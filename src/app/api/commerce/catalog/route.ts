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

export const runtime = "nodejs";

/** Demo catalog (in-memory). Same SKU set as /api/checkout/orders. */
const DEMO_CATALOG = {
  spec: "mediaos-acp-inspired/2026-09",
  merchant: {
    name: "AarogyaFit (MediaOS Demo Merchant)",
    country: "IN",
    psp: "razorpay_test",
  },
  items: [
    {
      id: "AAROGYA-12W",
      title: "AarogyaFit 12-week training program",
      description: "A structured 12-week fitness program with progressive overload, mobility, and recovery protocols.",
      url: "/lp/aarogya-fit",
      image_url: null,
      price: { amount_paise: 149_900, currency: "INR", formatted: "₹1,499" },
      availability: "in_stock",
      is_eligible_search: true,
      is_eligible_checkout: true,
      upsell_skus: ["AAROGYA-NUTR"],
      cross_sell_skus: ["AAROGYA-BUNDLE"],
      checkout: { create_order: "/api/checkout/orders", create_session: "/api/commerce/checkout/sessions" },
    },
    {
      id: "AAROGYA-NUTR",
      title: "Nutrition add-on guide",
      description: "Macro-balanced meal plans, supplement guidance, and hydration protocols to complement the training program.",
      url: "/lp/aarogya-fit",
      image_url: null,
      price: { amount_paise: 49_900, currency: "INR", formatted: "₹499" },
      availability: "in_stock",
      is_eligible_search: true,
      is_eligible_checkout: true,
      upsell_skus: [],
      cross_sell_skus: ["AAROGYA-BUNDLE"],
      checkout: { create_order: "/api/checkout/orders", create_session: "/api/commerce/checkout/sessions" },
    },
    {
      id: "AAROGYA-BUNDLE",
      title: "Program + nutrition bundle",
      description: "The complete AarogyaFit package: 12-week training program plus nutrition guide, ₹199 cheaper than buying separately.",
      url: "/lp/aarogya-fit",
      image_url: null,
      price: { amount_paise: 179_900, currency: "INR", formatted: "₹1,799" },
      availability: "in_stock",
      is_eligible_search: true,
      is_eligible_checkout: true,
      upsell_skus: [],
      cross_sell_skus: [],
      checkout: { create_order: "/api/checkout/orders", create_session: "/api/commerce/checkout/sessions" },
    },
  ],
};

export async function GET() {
  return NextResponse.json(DEMO_CATALOG, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
