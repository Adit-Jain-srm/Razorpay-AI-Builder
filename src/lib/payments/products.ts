/**
 * Shared demo product catalog — the single source of truth for AarogyaFit SKUs.
 *
 * Used by: /api/checkout/orders, /api/commerce/catalog, /api/commerce/checkout/sessions.
 * SERVER ONLY (imported by route handlers).
 */

export interface DemoProduct {
  sku: string;
  title: string;
  description: string;
  amountPaise: number;
  currency: string;
  imageUrl: string | null;
  availability: string;
  upsellSkus: string[];
  crossSellSkus: string[];
}

export const DEMO_PRODUCTS: Record<string, DemoProduct> = {
  "AAROGYA-12W": {
    sku: "AAROGYA-12W",
    title: "AarogyaFit 12-week training program",
    description: "A structured 12-week fitness program with progressive overload, mobility, and recovery protocols.",
    amountPaise: 149_900,
    currency: "INR",
    imageUrl: null,
    availability: "in_stock",
    upsellSkus: ["AAROGYA-NUTR"],
    crossSellSkus: ["AAROGYA-BUNDLE"],
  },
  "AAROGYA-NUTR": {
    sku: "AAROGYA-NUTR",
    title: "Nutrition add-on guide",
    description: "Macro-balanced meal plans, supplement guidance, and hydration protocols to complement the training program.",
    amountPaise: 49_900,
    currency: "INR",
    imageUrl: null,
    availability: "in_stock",
    upsellSkus: [],
    crossSellSkus: ["AAROGYA-BUNDLE"],
  },
  "AAROGYA-BUNDLE": {
    sku: "AAROGYA-BUNDLE",
    title: "Program + nutrition bundle",
    description: "The complete AarogyaFit package: 12-week training program plus nutrition guide, ₹199 cheaper than buying separately.",
    amountPaise: 179_900,
    currency: "INR",
    imageUrl: null,
    availability: "in_stock",
    upsellSkus: [],
    crossSellSkus: [],
  },
};

/** Look up a product by SKU (case-sensitive). */
export function getProduct(sku: string): DemoProduct | undefined {
  return DEMO_PRODUCTS[sku];
}

/** All active products as an array. */
export function getAllProducts(): DemoProduct[] {
  return Object.values(DEMO_PRODUCTS);
}
