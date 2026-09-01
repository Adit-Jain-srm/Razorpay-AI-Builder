import { describe, expect, it } from "vitest";

import { getAllProducts, getProduct, DEMO_PRODUCTS } from "./products";

describe("product catalog", () => {
  it("has exactly 3 AarogyaFit SKUs", () => {
    expect(Object.keys(DEMO_PRODUCTS)).toHaveLength(3);
    expect(getAllProducts()).toHaveLength(3);
  });

  it("resolves known SKUs", () => {
    const program = getProduct("AAROGYA-12W");
    expect(program).toBeDefined();
    expect(program!.amountPaise).toBe(149_900);
    expect(program!.currency).toBe("INR");
  });

  it("returns undefined for unknown SKUs", () => {
    expect(getProduct("UNKNOWN-SKU")).toBeUndefined();
    expect(getProduct("")).toBeUndefined();
  });

  it("all prices are positive integers (paise)", () => {
    for (const product of getAllProducts()) {
      expect(Number.isInteger(product.amountPaise)).toBe(true);
      expect(product.amountPaise).toBeGreaterThan(0);
    }
  });

  it("all currencies are INR", () => {
    for (const product of getAllProducts()) {
      expect(product.currency).toBe("INR");
    }
  });

  it("bundle is cheaper than buying components separately", () => {
    const program = getProduct("AAROGYA-12W")!;
    const nutrition = getProduct("AAROGYA-NUTR")!;
    const bundle = getProduct("AAROGYA-BUNDLE")!;
    expect(bundle.amountPaise).toBeLessThan(program.amountPaise + nutrition.amountPaise);
  });

  it("upsell SKUs reference existing products", () => {
    for (const product of getAllProducts()) {
      for (const sku of product.upsellSkus) {
        expect(getProduct(sku)).toBeDefined();
      }
      for (const sku of product.crossSellSkus) {
        expect(getProduct(sku)).toBeDefined();
      }
    }
  });

  it("server-priced: getProduct never returns user-controlled amounts", () => {
    // The key property: clients send SKU strings, not amounts.
    // This test documents the invariant.
    const product = getProduct("AAROGYA-12W")!;
    const clientAttemptedAmount = 100; // attacker tries ₹1
    expect(product.amountPaise).not.toBe(clientAttemptedAmount);
    expect(product.amountPaise).toBe(149_900); // server price wins
  });
});
