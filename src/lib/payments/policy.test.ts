import { describe, expect, it } from "vitest";

import {
  checkAll,
  checkCampaignBudget,
  checkCurrency,
  checkNoRetryAfterFailure,
  checkOrderAmount,
  checkOrderRate,
  checkReason,
  checkRemainingBudget,
  POLICY_DEFAULTS,
} from "./policy";

describe("policy engine", () => {
  /* ---------------------------------------------------------------------- */
  /* Currency                                                                */
  /* ---------------------------------------------------------------------- */

  describe("checkCurrency", () => {
    it("allows INR", () => {
      expect(checkCurrency("INR").allowed).toBe(true);
    });

    it("rejects USD", () => {
      const d = checkCurrency("USD");
      expect(d.allowed).toBe(false);
      expect(d.code).toBe("POLICY_DENIED");
    });

    it("rejects empty string", () => {
      expect(checkCurrency("").allowed).toBe(false);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Order amount                                                            */
  /* ---------------------------------------------------------------------- */

  describe("checkOrderAmount", () => {
    it("allows a normal order", () => {
      expect(checkOrderAmount(149900).allowed).toBe(true);
    });

    it("allows the exact cap", () => {
      expect(checkOrderAmount(POLICY_DEFAULTS.maxOrderPaise).allowed).toBe(true);
    });

    it("rejects over cap", () => {
      const d = checkOrderAmount(POLICY_DEFAULTS.maxOrderPaise + 1);
      expect(d.allowed).toBe(false);
      expect(d.code).toBe("POLICY_DENIED");
    });

    it("rejects zero", () => {
      expect(checkOrderAmount(0).allowed).toBe(false);
    });

    it("rejects negative", () => {
      expect(checkOrderAmount(-100).allowed).toBe(false);
    });

    it("rejects non-integer (float)", () => {
      expect(checkOrderAmount(149.99).allowed).toBe(false);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Campaign budget                                                         */
  /* ---------------------------------------------------------------------- */

  describe("checkCampaignBudget", () => {
    it("allows within cap", () => {
      expect(checkCampaignBudget(1_000_000).allowed).toBe(true);
    });

    it("rejects over cap", () => {
      const d = checkCampaignBudget(POLICY_DEFAULTS.maxCampaignBudgetPaise + 1);
      expect(d.allowed).toBe(false);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Reason length                                                           */
  /* ---------------------------------------------------------------------- */

  describe("checkReason", () => {
    it("allows a sufficient reason", () => {
      expect(checkReason("Audience B has 2x better CVR based on 30-day test").allowed).toBe(true);
    });

    it("rejects a short reason", () => {
      const d = checkReason("too short");
      expect(d.allowed).toBe(false);
      expect(d.code).toBe("POLICY_DENIED");
    });

    it("rejects empty reason", () => {
      expect(checkReason("").allowed).toBe(false);
    });

    it("trims whitespace before checking", () => {
      expect(checkReason("   a   ").allowed).toBe(false);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Remaining budget                                                        */
  /* ---------------------------------------------------------------------- */

  describe("checkRemainingBudget", () => {
    it("allows when within remaining", () => {
      expect(checkRemainingBudget(100_000, 400_000, 1_000_000).allowed).toBe(true);
    });

    it("rejects when exceeding remaining", () => {
      const d = checkRemainingBudget(100_001, 900_000, 1_000_000);
      expect(d.allowed).toBe(false);
    });

    it("allows exact remaining", () => {
      expect(checkRemainingBudget(100_000, 900_000, 1_000_000).allowed).toBe(true);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Stop-rule: no retry after failure                                       */
  /* ---------------------------------------------------------------------- */

  describe("checkNoRetryAfterFailure", () => {
    it("allows a fresh order", () => {
      const failed = new Set(["order_old_fail"]);
      expect(checkNoRetryAfterFailure("order_new", failed).allowed).toBe(true);
    });

    it("blocks retry of a failed order", () => {
      const failed = new Set(["order_failed_123"]);
      const d = checkNoRetryAfterFailure("order_failed_123", failed);
      expect(d.allowed).toBe(false);
      expect(d.code).toBe("PAYMENT_FAILED");
    });

    it("allows null razorpay order ID (new order)", () => {
      const failed = new Set(["order_failed_123"]);
      expect(checkNoRetryAfterFailure(null, failed).allowed).toBe(true);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Rate limit                                                              */
  /* ---------------------------------------------------------------------- */

  describe("checkOrderRate", () => {
    it("allows within limit", () => {
      expect(checkOrderRate(5).allowed).toBe(true);
    });

    it("blocks at limit", () => {
      const d = checkOrderRate(POLICY_DEFAULTS.maxOrdersPerWindow);
      expect(d.allowed).toBe(false);
      expect(d.code).toBe("POLICY_DENIED");
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Composition                                                             */
  /* ---------------------------------------------------------------------- */

  describe("checkAll", () => {
    it("passes when all checks pass", () => {
      const d = checkAll(
        checkCurrency("INR"),
        checkOrderAmount(149900),
        checkReason("This is a valid reason with enough characters for the policy"),
      );
      expect(d.allowed).toBe(true);
    });

    it("fails on first denial", () => {
      const d = checkAll(
        checkCurrency("INR"),
        checkOrderAmount(999_999_999), // over cap
        checkReason("This is fine"), // would also fail, but we stop at first
      );
      expect(d.allowed).toBe(false);
      expect(d.reason).toContain("exceeds max");
    });

    it("returns the specific failing check's reason", () => {
      const d = checkAll(
        checkCurrency("USD"),
        checkOrderAmount(100),
      );
      expect(d.reason).toContain("INR");
    });
  });
});
