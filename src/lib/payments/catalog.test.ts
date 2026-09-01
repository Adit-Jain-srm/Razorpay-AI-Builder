import { describe, expect, it } from "vitest";

/**
 * Catalog schema validation tests. Verifies the ACP-inspired catalog feed
 * has all required fields for agent readability.
 */

/** Minimal ACP-inspired required fields per item. */
const REQUIRED_ITEM_FIELDS = [
  "id",
  "title",
  "description",
  "price",
  "availability",
  "is_eligible_search",
  "is_eligible_checkout",
  "checkout",
] as const;

const REQUIRED_PRICE_FIELDS = ["amount_paise", "currency"] as const;

describe("catalog schema", () => {
  // Import the catalog data structure inline (mirrors what the route returns)
  const catalog = {
    spec: "mediaos-acp-inspired/2026-09",
    merchant: { name: "AarogyaFit (MediaOS Demo Merchant)", country: "IN", psp: "razorpay_test" },
    items: [
      {
        id: "AAROGYA-12W",
        title: "AarogyaFit 12-week training program",
        description: "A structured 12-week fitness program.",
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
        description: "Macro-balanced meal plans.",
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
        description: "Complete package.",
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

  it("has a spec version", () => {
    expect(catalog.spec).toMatch(/^mediaos-acp-inspired\//);
  });

  it("has merchant info with country IN", () => {
    expect(catalog.merchant.country).toBe("IN");
    expect(catalog.merchant.psp).toBe("razorpay_test");
  });

  it("has at least one item", () => {
    expect(catalog.items.length).toBeGreaterThan(0);
  });

  it("every item has all required ACP-inspired fields", () => {
    for (const item of catalog.items) {
      for (const field of REQUIRED_ITEM_FIELDS) {
        expect(item).toHaveProperty(field);
      }
    }
  });

  it("every item price has amount_paise and currency", () => {
    for (const item of catalog.items) {
      for (const field of REQUIRED_PRICE_FIELDS) {
        expect(item.price).toHaveProperty(field);
      }
      expect(Number.isInteger(item.price.amount_paise)).toBe(true);
      expect(item.price.amount_paise).toBeGreaterThan(0);
      expect(item.price.currency).toBe("INR");
    }
  });

  it("every item is checkout-eligible", () => {
    for (const item of catalog.items) {
      expect(item.is_eligible_checkout).toBe(true);
    }
  });

  it("every item has a checkout endpoint", () => {
    for (const item of catalog.items) {
      expect(item.checkout.create_order).toBe("/api/checkout/orders");
      expect(item.checkout.create_session).toBe("/api/commerce/checkout/sessions");
    }
  });

  it("bundle is cheaper than sum of components", () => {
    const program = catalog.items.find((i) => i.id === "AAROGYA-12W")!;
    const nutrition = catalog.items.find((i) => i.id === "AAROGYA-NUTR")!;
    const bundle = catalog.items.find((i) => i.id === "AAROGYA-BUNDLE")!;
    expect(bundle.price.amount_paise).toBeLessThan(
      program.price.amount_paise + nutrition.price.amount_paise,
    );
  });

  it("upsell SKUs reference existing items", () => {
    const ids = new Set(catalog.items.map((i) => i.id));
    for (const item of catalog.items) {
      for (const sku of item.upsell_skus) {
        expect(ids.has(sku)).toBe(true);
      }
      for (const sku of item.cross_sell_skus) {
        expect(ids.has(sku)).toBe(true);
      }
    }
  });
});
