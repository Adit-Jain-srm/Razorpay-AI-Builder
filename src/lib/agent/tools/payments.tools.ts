/**
 * Operator tools for payments and commerce (Wave 7 Track 01).
 *
 * Tools: create_checkout_session, list_catalog, recommend_upsells,
 * explain_money_action, reallocate_budget, get_growth_scorecard.
 *
 * SERVER ONLY: imports payments services and product catalog.
 */

import { z } from "zod";

import type { AgentTool } from "../types";
import { defineTool } from "../types";
import { runToolSafely, ok } from "./shared";
import { storeOrder } from "@/lib/payments/orders";
import { getAllProducts, getProduct, upsertProduct, removeProduct } from "@/lib/payments/products";
import {
  buildGrowthScorecard,
  computeReallocation,
  type AudienceMetrics,
} from "@/lib/payments/growth";
import { writeAudit, getAuditTimeline } from "@/lib/payments/audit";
import { checkAll, checkCurrency, checkReason } from "@/lib/payments/policy";

const PAYMENTS_CATEGORY = "payments" as const;
const COMMERCE_CATEGORY = "commerce" as const;

const DEMO_AUDIENCES: AudienceMetrics[] = [
  { personaId: "A", personaName: "Fitness-conscious 18-30", ctr: 3.8, cvr: 4.1, cpaPaise: 16200, gmvPaise: 450_000, orders: 28, spend: 453_600 },
  { personaId: "B", personaName: "Health-aware professionals", ctr: 2.4, cvr: 7.3, cpaPaise: 11800, gmvPaise: 620_000, orders: 41, spend: 483_800 },
  { personaId: "C", personaName: "Casual fitness beginners", ctr: 5.1, cvr: 1.8, cpaPaise: 24300, gmvPaise: 180_000, orders: 12, spend: 291_600 },
];

/* -------------------------------------------------------------------------- */
/* Payment tools                                                              */
/* -------------------------------------------------------------------------- */

export function createPaymentTools(): AgentTool[] {
  const reallocateBudget = defineTool({
    name: "reallocate_budget",
    description: "Shift campaign budget from the worst-performing audience to the best, based on observed CPA. Writes the new allocation and creates an audit event. Requires a reason ≥24 chars.",
    category: PAYMENTS_CATEGORY,
    parameters: z.object({
      campaignId: z.string().uuid().describe("Campaign to reallocate"),
      reason: z.string().min(24).describe("Why this reallocation is justified (min 24 chars)"),
      maxShiftPercent: z.number().int().min(1).max(50).default(15).describe("Max % points to shift"),
    }),
    execute: async (params) =>
      runToolSafely("reallocate_budget", async () => {
        const policyCheck = checkAll(
          checkReason(params.reason),
          checkCurrency("INR"),
        );
        if (!policyCheck.allowed) {
          writeAudit({
            actor: "operator",
            action: "mandate_denied",
            campaignId: params.campaignId,
            reason: policyCheck.reason,
            ok: false,
            errorCode: policyCheck.code,
          });
          throw new Error(policyCheck.reason);
        }

        const scorecard = buildGrowthScorecard(params.campaignId, DEMO_AUDIENCES);
        const proposal = computeReallocation(
          DEMO_AUDIENCES.map((a) => ({ personaId: a.personaId, percent: 33, rationale: "Initial equal split" })),
          scorecard,
          params.maxShiftPercent,
        );

        if (!proposal) {
          return ok({ message: "No reallocation needed — audiences are performing similarly" }, {
            type: "budget-reallocation" as const,
            title: "No reallocation needed",
            data: { scorecard },
          });
        }

        writeAudit({
          actor: "operator",
          action: "budget_reallocated",
          campaignId: params.campaignId,
          reason: params.reason,
          ok: true,
          beforeState: { from: proposal.from.currentPercent, to: proposal.to.currentPercent },
          afterState: { from: proposal.from.newPercent, to: proposal.to.newPercent },
        });

        return ok(
          { message: `Reallocated ${proposal.shiftPercent}% from ${proposal.from.personaId} to ${proposal.to.personaId}`, proposal },
          { type: "budget-reallocation" as const, title: "Budget reallocated", data: { proposal, scorecard } },
        );
      }),
  });

  const getGrowthScorecard = defineTool({
    name: "get_growth_scorecard",
    description: "Get per-audience CTR, CVR, CPA, and Razorpay GMV for a campaign. Shows which audience is best/worst.",
    category: PAYMENTS_CATEGORY,
    parameters: z.object({
      campaignId: z.string().uuid().optional().describe("Campaign ID (defaults to demo)"),
    }),
    execute: async (params) =>
      runToolSafely("get_growth_scorecard", async () => {
        const scorecard = buildGrowthScorecard(params.campaignId ?? "demo", DEMO_AUDIENCES);
        return ok(scorecard, {
          type: "growth-scorecard" as const,
          title: "Growth Scorecard",
          data: scorecard,
        });
      }),
  });

  const explainMoneyAction = defineTool({
    name: "explain_money_action",
    description: "Show the audit trail for a campaign — every money action with timestamp, actor, reason, and outcome.",
    category: PAYMENTS_CATEGORY,
    parameters: z.object({
      campaignId: z.string().uuid().describe("Campaign to audit"),
      limit: z.number().int().min(1).max(200).default(50).describe("Max events to return"),
    }),
    execute: async (params) =>
      runToolSafely("explain_money_action", async () => {
        const timeline = getAuditTimeline(params.campaignId, params.limit);
        return ok(
          { events: timeline, count: timeline.length },
          { type: "audit-timeline" as const, title: "Audit Trail", data: { events: timeline } },
        );
      }),
  });

  return [reallocateBudget, getGrowthScorecard, explainMoneyAction];
}

/* -------------------------------------------------------------------------- */
/* Commerce tools                                                             */
/* -------------------------------------------------------------------------- */

export function createCommerceTools(): AgentTool[] {
  const createCheckoutSession = defineTool({
    name: "create_checkout_session",
    description: "Create a Razorpay checkout session for a product. Use a known SKU (e.g. AAROGYA-12W) OR provide title + amountPaise for a new/custom product. Pass landingPageSlug from a previously deployed page so the checkout URL is real.",
    category: COMMERCE_CATEGORY,
    parameters: z.object({
      sku: z.string().min(1).describe("Product SKU (e.g. AAROGYA-12W, MEDIAOS-PRO)"),
      title: z.string().max(200).optional().describe("Product title (required if SKU not in catalog)"),
      amountPaise: z.number().int().min(100).optional().describe("Price in paise (required if SKU not in catalog, e.g. 149900 = ₹1,499)"),
      campaignId: z.string().uuid().optional().describe("Campaign this order belongs to"),
      landingPageSlug: z.string().max(200).optional().describe("Slug of the deployed landing page (from deploy_landing_page result). Defaults to aarogya-fit for seeded SKUs."),
    }),
    execute: async (params) =>
      runToolSafely("create_checkout_session", async () => {
        let product = getProduct(params.sku);

        // If SKU not in seeded catalog, create it on-the-fly from provided params
        if (!product && params.title && params.amountPaise) {
          product = upsertProduct({
            sku: params.sku,
            title: params.title,
            description: "",
            amountPaise: params.amountPaise,
            currency: "INR",
            imageUrl: null,
            availability: "in_stock",
            upsellSkus: [],
            crossSellSkus: [],
          });
        }

        if (!product) {
          throw new Error(`Unknown SKU: ${params.sku}. Provide title and amountPaise to create it.`);
        }

        const orderId = crypto.randomUUID();
        // Use the actual deployed landing page slug if provided, else derive from SKU
        const slug = params.landingPageSlug
          ?? (product.sku.startsWith("AAROGYA") ? "aarogya-fit" : product.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
        const checkoutUrl = `/lp/${slug}`;
        const catalogUrl = `/api/commerce/catalog`;
        const now = new Date().toISOString();

        // Persist to order store so the thanks/failed pages can look it up
        storeOrder({
          orderId,
          razorpayOrderId: null,
          razorpayPaymentId: null,
          sku: params.sku,
          productTitle: product.title,
          amountPaise: product.amountPaise,
          currency: "INR",
          receipt: `mediaos_${orderId.slice(0, 8)}`,
          items: [{ sku: params.sku, amountPaise: product.amountPaise, role: "primary" }],
          status: "created",
          mode: "demo",
          campaignId: params.campaignId ?? null,
          landingPageId: null,
          createdAt: now,
          updatedAt: now,
        });

        writeAudit({
          actor: "operator",
          action: "order_created",
          campaignId: params.campaignId,
          reason: `Checkout session created for ${product.title} (${product.sku}) at ₹${(product.amountPaise / 100).toLocaleString("en-IN")}`,
          ok: true,
          afterState: { sku: params.sku, amountPaise: product.amountPaise, orderId },
        });

        return ok(
          {
            orderId,
            sku: params.sku,
            title: product.title,
            amountPaise: product.amountPaise,
            price: `₹${(product.amountPaise / 100).toLocaleString("en-IN")}`,
            currency: "INR",
            checkoutUrl,
            catalogUrl,
            message: `Checkout ready for ${product.title} at ₹${(product.amountPaise / 100).toLocaleString("en-IN")}. The buyer can pay at ${checkoutUrl} using Razorpay test-mode (card 4111 1111 1111 1111 or UPI success@razorpay).`,
          },
          {
            type: "checkout-session" as const,
            title: `Checkout: ${product.title}`,
            data: { sku: params.sku, price: `₹${(product.amountPaise / 100).toLocaleString("en-IN")}`, checkoutUrl },
          },
        );
      }),
  });

  const listCatalog = defineTool({
    name: "list_catalog",
    description: "List all products in the merchant catalog with prices (INR paise), availability, and upsell graph.",
    category: COMMERCE_CATEGORY,
    parameters: z.object({}),
    execute: async () =>
      runToolSafely("list_catalog", async () => {
        const products = getAllProducts();
        const items = products.map((p) => ({
          sku: p.sku,
          title: p.title,
          price: `₹${(p.amountPaise / 100).toLocaleString("en-IN")}`,
          amountPaise: p.amountPaise,
          availability: p.availability,
          upsellSkus: p.upsellSkus,
          crossSellSkus: p.crossSellSkus,
        }));
        return ok(items, { type: "catalog" as const, title: "Product Catalog", data: { items } });
      }),
  });

  const recommendUpsells = defineTool({
    name: "recommend_upsells",
    description: "Given a primary SKU, recommend upsell and cross-sell products with reasons based on the product graph.",
    category: COMMERCE_CATEGORY,
    parameters: z.object({
      sku: z.string().min(1).describe("Primary product SKU"),
    }),
    execute: async (params) =>
      runToolSafely("recommend_upsells", async () => {
        const product = getProduct(params.sku);
        if (!product) {
          throw new Error(`Unknown SKU: ${params.sku}`);
        }

        const upsells = product.upsellSkus
          .map((sku) => getProduct(sku))
          .filter(Boolean)
          .map((p) => ({
            sku: p!.sku,
            title: p!.title,
            price: `₹${(p!.amountPaise / 100).toLocaleString("en-IN")}`,
            reason: `Complements ${product.title} — customers who buy the program often add this`,
          }));

        const crossSells = product.crossSellSkus
          .map((sku) => getProduct(sku))
          .filter(Boolean)
          .map((p) => {
            const componentTotal = product.amountPaise + product.upsellSkus.reduce(
              (sum, uSku) => sum + (getProduct(uSku)?.amountPaise ?? 0), 0,
            );
            const savings = Math.max(0, componentTotal - p!.amountPaise);
            return {
              sku: p!.sku,
              title: p!.title,
              price: `₹${(p!.amountPaise / 100).toLocaleString("en-IN")}`,
              reason: savings > 0
                ? `Bundle saves ₹${(savings / 100).toFixed(0)} vs buying separately`
                : `Bundled package with ${p!.title}`,
            };
          });

        return ok(
          { primarySku: params.sku, upsells, crossSells },
          { type: "upsell-set" as const, title: "Upsell Recommendations", data: { upsells, crossSells } },
        );
      }),
  });

  const addProduct = defineTool({
    name: "add_product",
    description: "Add a new product to the merchant catalog or update an existing SKU. Price is in INR paise (e.g. 149900 = ₹1,499). Upsell/cross-sell SKUs must reference existing products.",
    category: COMMERCE_CATEGORY,
    parameters: z.object({
      sku: z.string().min(1).max(50).describe("Unique product SKU"),
      title: z.string().min(1).max(200).describe("Product title"),
      description: z.string().max(1000).default("").describe("Product description"),
      amountPaise: z.number().int().min(100).describe("Price in paise (100 paise = ₹1)"),
      currency: z.string().default("INR").describe("Currency code"),
      upsellSkus: z.array(z.string()).default([]).describe("SKUs of upsell products"),
      crossSellSkus: z.array(z.string()).default([]).describe("SKUs of cross-sell products"),
    }),
    execute: async (params) =>
      runToolSafely("add_product", async () => {
        const product = upsertProduct({
          sku: params.sku,
          title: params.title,
          description: params.description,
          amountPaise: params.amountPaise,
          currency: params.currency,
          imageUrl: null,
          availability: "in_stock",
          upsellSkus: params.upsellSkus,
          crossSellSkus: params.crossSellSkus,
        });

        writeAudit({
          actor: "operator",
          action: "product_added",
          reason: `Product ${product.sku} added/updated: ${product.title} at ₹${(product.amountPaise / 100).toLocaleString("en-IN")}`,
          ok: true,
          afterState: { sku: product.sku, amountPaise: product.amountPaise },
        });

        return ok(
          { message: `Product ${product.sku} saved: ${product.title} at ₹${(product.amountPaise / 100).toLocaleString("en-IN")}`, product },
          { type: "catalog" as const, title: `Product added: ${product.title}`, data: { product } },
        );
      }),
  });

  const deleteProduct = defineTool({
    name: "remove_product",
    description: "Remove a product from the merchant catalog by SKU.",
    category: COMMERCE_CATEGORY,
    parameters: z.object({
      sku: z.string().min(1).describe("SKU to remove"),
    }),
    execute: async (params) =>
      runToolSafely("remove_product", async () => {
        const existed = removeProduct(params.sku);
        if (!existed) throw new Error(`SKU ${params.sku} not found in catalog`);

        writeAudit({
          actor: "operator",
          action: "product_removed",
          reason: `Product ${params.sku} removed from catalog`,
          ok: true,
          afterState: { sku: params.sku, removed: true },
        });

        return ok(
          { message: `Product ${params.sku} removed from catalog` },
          { type: "catalog" as const, title: `Product removed: ${params.sku}`, data: { sku: params.sku } },
        );
      }),
  });

  return [createCheckoutSession, listCatalog, recommendUpsells, addProduct, deleteProduct];
}
