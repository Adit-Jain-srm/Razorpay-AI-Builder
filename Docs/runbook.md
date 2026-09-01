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

1. Import the repo at https://github.com/Adit-Jain-srm/MediaOS into Vercel.
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
