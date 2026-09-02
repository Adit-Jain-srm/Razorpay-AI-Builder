/**
 * Product catalog — mutable in-memory store with seeded AarogyaFit SKUs.
 *
 * Used by: /api/checkout/orders, /api/commerce/catalog, /api/commerce/checkout/sessions,
 * and the Operator's catalog-management tools.
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

/** Mutable catalog store — seeded with AarogyaFit, extensible by the Operator. */
const catalog: Map<string, DemoProduct> = new Map([
  ["AAROGYA-12W", {
    sku: "AAROGYA-12W",
    title: "AarogyaFit 12-week training program",
    description: "A structured 12-week fitness program with progressive overload, mobility, and recovery protocols.",
    amountPaise: 149_900,
    currency: "INR",
    imageUrl: null,
    availability: "in_stock",
    upsellSkus: ["AAROGYA-NUTR"],
    crossSellSkus: ["AAROGYA-BUNDLE"],
  }],
  ["AAROGYA-NUTR", {
    sku: "AAROGYA-NUTR",
    title: "Nutrition add-on guide",
    description: "Macro-balanced meal plans, supplement guidance, and hydration protocols to complement the training program.",
    amountPaise: 49_900,
    currency: "INR",
    imageUrl: null,
    availability: "in_stock",
    upsellSkus: [],
    crossSellSkus: ["AAROGYA-BUNDLE"],
  }],
  ["AAROGYA-BUNDLE", {
    sku: "AAROGYA-BUNDLE",
    title: "Program + nutrition bundle",
    description: "The complete AarogyaFit package: 12-week training program plus nutrition guide, ₹199 cheaper than buying separately.",
    amountPaise: 179_900,
    currency: "INR",
    imageUrl: null,
    availability: "in_stock",
    upsellSkus: [],
    crossSellSkus: [],
  }],
]);

/** Backward-compatible constant for imports that read DEMO_PRODUCTS directly. */
export const DEMO_PRODUCTS: Record<string, DemoProduct> = Object.fromEntries(catalog);

/** Look up a product by SKU (case-sensitive). */
export function getProduct(sku: string): DemoProduct | undefined {
  return catalog.get(sku);
}

/** All active products as an array. */
export function getAllProducts(): DemoProduct[] {
  return [...catalog.values()];
}

/** Add or update a product in the catalog. Returns the product. */
export function upsertProduct(product: DemoProduct): DemoProduct {
  catalog.set(product.sku, product);
  return product;
}

/** Remove a product by SKU. Returns true if it existed. */
export function removeProduct(sku: string): boolean {
  return catalog.delete(sku);
}

/** Check if a SKU exists. */
export function hasProduct(sku: string): boolean {
  return catalog.has(sku);
}

/** Get catalog size. */
export function catalogSize(): number {
  return catalog.size;
}
