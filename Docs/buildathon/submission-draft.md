# Submission Draft — Razorpay AI Buildathon Track 01

Pre-filled for the application form. Video URL added after recording.

---

## Track

01 — AI Growth & Agentic Commerce

## Project name

MediaOS — Autonomous Merchant Growth Agent

## Problem statement

Small Indian merchants have no media-buying team, no agentic checkout, and no way to make their
products sellable to AI buyers. They research audiences by hand, create creatives without data, and
lose conversions because the path from ad to payment is fragmented. Meanwhile, the 2026 protocol
race (NPCI UAP, OpenAI/Stripe ACP, Google AP2, Coinbase x402) is standardizing how AI agents
discover products, negotiate price, and pay — but merchants have no tool to participate.

MediaOS is an autonomous AI growth agent that closes this loop end to end: it researches Indian
buyers with live web data (6 Bright Data providers), orchestrates a bounded ₹ campaign, generates
platform-specific creatives and conversion-optimized landing pages, exposes an agent-readable product
catalog, collects rupees through Razorpay test-mode Standard Checkout, upsells within a signed
mandate, and optimizes toward a measurable ₹ objective — with a deterministic policy engine and an
append-only audit trail on every money action, including graceful handling of payment failures.

## Architecture (paragraph)

MediaOS is a Next.js 16 / React 19 / TypeScript strict application deployed on Vercel with Supabase
(Postgres + RLS + Auth) as the persistence layer. The primary surface is the Operator, an autonomous
agent running a plan-execute-observe loop (Vercel AI SDK v7 + Azure AI Foundry gpt-5.3-chat) with
25 typed, Zod-validated tools spanning research, campaign strategy, creative generation, landing
page deployment, Razorpay checkout, catalog management, upsell recommendation, budget reallocation,
and analytics. Every money action is gated by a deterministic policy engine (not the LLM) that
enforces INR-only, per-order caps, campaign budget bounds, rate limits, and a stop-rule on failed
payments. Mandates (inspired by Google AP2) are persisted before any Razorpay API call. Webhooks
(`payment.captured`, `payment.failed`, `order.paid`) are HMAC-verified with the raw request body and
processed idempotently. The research engine uses an OpenBB-inspired TET provider abstraction with 6
parallel Bright Data providers. An ACP-inspired public catalog feed and checkout sessions API make
the merchant transactable by external AI buyers. All money is stored as integer paise (never float).

## Public GitHub repository

https://github.com/Adit-Jain-srm/Razorpay-AI-Builder

## 5-minute pitch video (unlisted)

_URL to be added after recording._

---

## What broke and how it was fixed

### 1. Razorpay Checkout modal: "Payment could not be completed"

**What went wrong:** On the live deployed AarogyaFit page (`/lp/aarogya-fit`), clicking Pay opened the Razorpay modal but the payment failed with "could not be completed" — even with valid test cards.

**How I reproduced it:** Deployed the page to production, clicked Pay, entered test card `4111 1111 1111 1111`, saw the error in the modal.

**Root cause:** The `handler` callback was declared `async` — Razorpay's Checkout.js closes the modal before an async handler resolves, causing the payment to appear failed even when it succeeded. Additionally, no `prefill` object was provided, so the test form required manual entry of name/email/phone.

**Fix:** Changed `handler` from async to sync. Made verify call fire-and-forget (webhook is the source of truth, not the handler). Added `prefill` with test user data so the mock form is pre-filled.

**Verification:** Payment completes on production. Redirect to success page works. Webhook receives the event.

### 2. Seeded AarogyaFit page returned 404 on production

**What went wrong:** `/lp/aarogya-fit` returned 404 on the live Vercel deployment, even though the seeded page existed in the in-memory store.

**How I reproduced it:** `curl -s -o /dev/null -w "%{http_code}" https://mediaos-kappa.vercel.app/lp/aarogya-fit` → 404.

**Root cause:** Two-layer miss. The `/lp/[slug]` route calls `resolvePublicLanding()` in `studio.ts`, which calls `getPublicLandingStore()` directly — not through `landingService`. On production, Supabase is configured, so the public store queries the database (which has no AarogyaFit row). The seeded in-memory page was never consulted. Additionally, `landingService.getBySlug` had its own fallthrough, but `resolvePublicLanding` bypassed it.

**Fix:** Added fallthrough to `resolvePublicLanding` in `studio.ts`: if the primary store returns null, check the `seededLandingStore` singleton. Exported the memory store as `seededLandingStore` from the service module.

**Verification:** `curl` returns 200. The page renders with hero, features, FAQ, and the Razorpay Checkout button.

### 3. Serverless statelessness: `add_product` didn't persist across requests

**What went wrong:** The Operator called `add_product("MEDIAOS-PRO", ...)` successfully in one conversation. In the next message, `create_checkout_session("MEDIAOS-PRO")` returned "Unknown SKU: MEDIAOS-PRO".

**How I reproduced it:** Used the Operator on production: add product → new conversation → create checkout → SKU not found.

**Root cause:** The product catalog is an in-memory `Map`. On Vercel serverless, each request may run on a different function instance. The `add_product` call wrote to instance A's memory; the `create_checkout_session` call ran on instance B, which only had the 3 seeded products.

**Fix:** Made `create_checkout_session` accept optional `title` + `amountPaise` parameters. If the SKU isn't in the seeded catalog, the tool auto-creates the product on-the-fly from those params. Seeded SKUs (`AAROGYA-*`) still work with just the SKU.

**Verification:** Operator can now create checkout sessions for any product in a single call, regardless of which serverless instance handles it.

### 4. Unbounded in-memory stores (memory leak on warm serverless)

**What went wrong:** Three in-memory data structures (`processedEventIds` Set in the webhook handler, `sessions` Map in checkout sessions, `auditStore` array) had no size cap. On a warm Vercel instance handling many requests, these would grow unbounded until recycled.

**How I reproduced it:** AI-debt audit flagged the pattern during systematic code review.

**Root cause:** AI-generated code pattern: works on the happy path but ignores the production lifecycle of a long-running process.

**Fix:** Added FIFO eviction caps: 10K events, 1K sessions, 10K audit records. `trackEventId()` helper encapsulates the cap logic for the webhook.

**Verification:** `npm test` (507 passing). No memory growth in bounded usage.

### 5. Cross-sell savings calculation returned wrong ₹ amount

**What went wrong:** The `recommend_upsells` tool showed incorrect savings for bundle products. For AAROGYA-BUNDLE, it showed "saves ₹0" instead of "saves ₹199."

**How I reproduced it:** Self-review traced the calculation: `product.amountPaise + getProduct(product.upsellSkus[0])?.amountPaise - bundle.amountPaise`. For the BUNDLE product (which has empty `upsellSkus`), `upsellSkus[0]` is `undefined` → `getProduct(undefined)` returns `undefined` → `?? 0` fallback → savings = `179900 + 0 - 179900 = 0`.

**Root cause:** Array index `[0]` shortcut instead of summing all component prices.

**Fix:** `.reduce()` over all component SKUs, `Math.max(0, ...)`, fallback text when savings ≤ 0.

**Verification:** Catalog test "bundle is cheaper than sum of components" passes.

### 6. `as unknown` type casts bypassing error handling

**What went wrong:** Two Operator tools (`reallocate_budget` on policy denial, `recommend_upsells` on unknown SKU) returned error objects using `as unknown as ReturnType<typeof ok>` — bypassing the `runToolSafely` catch boundary.

**How I reproduced it:** Architecture review: every other tool throws inside `runToolSafely`, which catches and converts to `{ ok: false }`. These two broke the pattern.

**Root cause:** AI-generated shortcut to avoid understanding the error handling contract.

**Fix:** Changed both to `throw new Error(...)` — `runToolSafely` catches and returns the structured error.

**Verification:** Zero `as unknown` in Wave 7 payments code. All 507 tests pass.

### 7. Hardcoded SKU in Razorpay Checkout notes

**What went wrong:** The `CheckoutButton` component sent `notes: { sku: "AAROGYA-12W" }` to Razorpay regardless of which product was being purchased.

**How I reproduced it:** Self-review caught the hardcoded string on line 110 of `checkout-button.tsx`.

**Root cause:** Copy-paste from initial implementation; never parameterized.

**Fix:** Changed to `notes: { sku }` — uses the dynamic `sku` prop.

**Verification:** Razorpay Dashboard now shows the correct SKU for every order.
