# Runbook

How to set up, run, test, and ship MediaOS. Windows/PowerShell friendly.

---

## 1. Prerequisites

- **Node.js 20+** and npm (Next.js 16 / React 19 / Vitest 4).
- A **Supabase** project (Postgres + Auth + Storage).
- An **Azure OpenAI** resource with a GPT-4o deployment and a GPT-Image deployment.
- A **Bright Data** account + API token (free tier is enough to start).

The app **boots without any of these** in a degraded "configure credentials" state, so you can run
the UI immediately and wire integrations incrementally.

## 2. Install

```bash
npm install
```

## 3. Environment variables

Copy the template and fill in real values:

```bash
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
```

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | e.g. `https://abcd.supabase.co` (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | public anon key; RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | Server writes/seed | **server-only**, bypasses RLS - never expose |
| `AZURE_OPENAI_ENDPOINT` | Azure | `https://<resource>.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | Azure | resource key |
| `AZURE_OPENAI_GPT4O_DEPLOYMENT` | Azure chat | default `gpt-4o` |
| `AZURE_OPENAI_IMAGE_DEPLOYMENT` | Azure images | default `gpt-image-2` |
| `AZURE_OPENAI_API_VERSION` | Azure | default `2024-10-21`; **image gen may need a preview version** (e.g. `2025-04-01-preview`) - see `Docs/learnings.md` |
| `BRIGHTDATA_API_TOKEN` | Research | free tier: `search_engine` + `scrape_as_markdown` |

`.env.local` is git-ignored. Only `.env.example` is committed. Never commit secrets.

## 4. Database migrations

Apply in order. Either paste into the **Supabase SQL editor** or run with `psql` / the Supabase CLI:

```bash
# 1) schema: 19 tables + indexes + RLS policies
supabase/migrations/0001_init.sql
# 2) storage buckets + path-scoped object policies
supabase/migrations/0002_storage.sql
```

Example with psql (connection string from Supabase -> Project Settings -> Database):

```bash
psql "$env:SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
psql "$env:SUPABASE_DB_URL" -f supabase/migrations/0002_storage.sql
```

RLS details: [ADR 0003](./adr/0003-rls-strategy.md).

## 5. Run the app

```bash
npm run dev        # http://localhost:3000
```

## 6. Quality gates

```bash
npm run typecheck  # tsc --noEmit (strict)
npm run lint       # eslint
npm run build      # next build (also type-checks)
npm test           # vitest run (unit/integration; offline, deterministic)
```

All four must pass before any commit (the "definition of done" gate).

## 7. End-to-end tests (Playwright)

One-time browser install, then run the e2e suite (it boots `npm run dev` automatically):

```bash
npx playwright install
npm run test:e2e
```

## 8. Seed demo data

Placeholder - implemented in the `analytics-seed` and `demo-seed` phases. The intent: a realistic
financial-newsletter scenario (campaign, research, personas, creatives, a deployed landing page, and
90 days of multi-platform analytics) so judges see relevance in under 30 seconds.

```bash
npm run seed       # (planned)
```

## 9. Deploy to Vercel

1. Import the repo at https://github.com/Adit-Jain-srm/Razorpay-AI-Builder into Vercel.
2. Framework preset: **Next.js**. Build command and output are auto-detected.
3. Add every variable from section 3 in **Project Settings -> Environment Variables** (production +
   preview). Keep `SUPABASE_SERVICE_ROLE_KEY` and `AZURE_OPENAI_API_KEY` server-side only.
4. Deploy, then attach a custom domain.
5. `Reference-repo/` is excluded via `.gitignore` and `.vercelignore` so it never enters the build.

## 10. Troubleshooting

- **Everything shows "configure credentials".** Expected when env vars are unset; fill `.env.local`.
- **Auth redirect loop / no protection.** Route protection lives in `src/proxy.ts` (Next 16
  convention); it no-ops until Supabase is configured.
- **Azure image generation 400s** on the GA API version - switch `AZURE_OPENAI_API_VERSION` to a
  preview version for the image deployment.
- **Bright Data `web_data_*` returns null.** Pro is inactive; the engine degrades to free-tier
  search + scrape automatically.

## 11. Wave 7: Razorpay Test Mode Setup (Track 01)

### Prerequisites

1. Razorpay account with Test Mode enabled (no KYC needed for test).
2. Dashboard → Account & Settings → API Keys → **Test Mode toggle ON** → Generate Key.
3. Note your `Key ID` (`rzp_test_…`) and `Key Secret`.

### Environment variables

Add to `.env.local` (and Vercel production env):

```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...  (set below)
```

### Webhook setup

1. Dashboard → Account & Settings → Webhooks → **+ Add New Webhook**.
2. Webhook URL: `https://mediaos-kappa.vercel.app/api/webhooks/razorpay`
3. Secret: generate a random string ≥ 32 chars (must match `RAZORPAY_WEBHOOK_SECRET`).
4. Events: `payment.captured`, `payment.failed`, `order.paid`.
5. Mode: **Test Mode**.

### Database migration

Apply the Wave 7 migration on the Supabase project used by production:

```sql
-- Run supabase/migrations/0003_razorpay_money_loop.sql on the production DB
```

### Verification

**Success path:**
1. Open a deployed landing page with a checkout section.
2. Click Pay → enter test card `4111 1111 1111 1111`, any future expiry, any CVV.
3. Click **Success** on the mock bank page.
4. Verify: thanks page loads, audit shows `payment_captured`.

**Failure path:**
1. Open checkout → select UPI → enter `failure@razorpay`.
2. Verify: failed page loads, audit shows `payment_failed` + stop-rule.

**Test OTP notes:**
- 4-digit OTP → always succeeds (e.g. `1234`).
- 5-digit OTP starting with 1 → always fails (e.g. `12345`).
- Netbanking → mock bank page with Success/Failure buttons.

### Smoke test (local only)

```bash
npm run smoke:razorpay
```

Requires `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env.local`.

### References

- [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Test cards](https://razorpay.com/docs/payments/payments/test-card-details/)
- [Test UPI](https://razorpay.com/docs/payments/payments/test-upi-details/)
- [Webhook validation](https://razorpay.com/docs/webhooks/validate-test/)
- [Best practices](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/best-practices/)
