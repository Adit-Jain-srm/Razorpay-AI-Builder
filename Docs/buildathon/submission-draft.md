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
24+ typed, Zod-validated tools spanning research, campaign strategy, creative generation, landing
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

### 2026-09-02 — Unbounded in-memory stores (memory leak on warm serverless)

**What went wrong:** Three in-memory data structures (`processedEventIds` Set in the webhook handler, `sessions` Map in checkout sessions, `auditStore` array) had no size cap. On a warm Vercel serverless instance handling many requests, these would grow unbounded until the instance recycled.

**How I reproduced it:** AI-debt audit skill flagged the pattern during code review — `new Set()` / `new Map()` with `.add()`/`.set()` but no eviction.

**Root cause:** Classic AI-generated code pattern: works on the happy path but ignores the production lifecycle of a long-running process.

**Fix:** Added FIFO eviction caps: 10K events, 1K sessions, 10K audit records. Oldest entries are evicted when the cap is reached. `trackEventId()` helper encapsulates the cap logic for the webhook.

**Verification:** `npm test` (499 passing). Build succeeds. No memory growth in bounded usage.

**Prevention:** Added to the execution rule: "No unbounded in-memory stores."

### 2026-09-02 — Cross-sell savings calculation returned wrong ₹ amount

**What went wrong:** The `recommend_upsells` tool calculated bundle savings as `product.amountPaise + getProduct(product.upsellSkus[0])?.amountPaise - bundle.amountPaise`. When the primary product had no upsells, `upsellSkus[0]` was `undefined`, so `getProduct(undefined)` returned `undefined`, and the `?? 0` fallback made the savings negative or zero.

**How I reproduced it:** Self-review read the code line by line and traced the data flow for the BUNDLE product (which has empty `upsellSkus`).

**Root cause:** AI generated a shortcut accessing `[0]` instead of summing all components.

**Fix:** Changed to `.reduce()` over all component SKUs, clamped to `Math.max(0, ...)`, with a fallback text when savings are zero.

**Verification:** The catalog test "bundle is cheaper than sum of components" still passes.

### 2026-09-02 — `as unknown` type casts bypassing runToolSafely

**What went wrong:** Two Operator tools (`reallocate_budget` on policy denial, `recommend_upsells` on unknown SKU) returned `{ ok: false, error }` directly using `as unknown as ReturnType<typeof ok>` — bypassing the `runToolSafely` error handling pattern that all other tools use.

**How I reproduced it:** Architecture review identified the pattern: every other tool `throw`s inside `runToolSafely`, which catches and converts to `{ ok: false }`. These two tools broke the pattern.

**Root cause:** AI-generated code took a shortcut to avoid throwing.

**Fix:** Changed both to `throw new Error(...)` — `runToolSafely` catches them and returns the structured error the Operator can recover from.

**Verification:** `npm run typecheck` (0 errors), `npm test` (499 passing). Zero `as unknown` in payments code.
