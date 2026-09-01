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

https://github.com/Adit-Jain-srm/MediaOS

## 5-minute pitch video (unlisted)

_URL to be added after recording._

---

## What broke and how it was fixed

_Append-only log. Each entry added as the incident happens during implementation._

### Template (copy for each incident)

```
### [Date] — [Short title]

**What went wrong:** ...
**How I reproduced it:** ...
**Evidence collected:** ...
**Root cause:** ...
**Fix:** ...
**Verification:** ...
**Prevention:** ...
```
