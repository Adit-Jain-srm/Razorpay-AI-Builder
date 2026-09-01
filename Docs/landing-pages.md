# Landing Page Engine

AI-generated, deployable, high-converting landing pages with real anonymous lead
capture, UTM tracking, page-view analytics, and A/B split testing. Part of Wave 4
(`landing-generation`, `landing-editor`, `landing-deploy`).

Cross-references: [progress](./progress.md), [architecture](./architecture.md),
[ADR 0003 RLS](./adr/0003-rls-strategy.md), [creative-studio](./creative-studio.md).

---

## What it does

1. **Generates** a complete, section-based landing page from the campaign brief +
   research the engine surfaced, using direct-response frameworks (AIDA / PAS).
2. Lets you **edit** it visually - live desktop/mobile preview, click-a-section
   to edit inline, per-section regenerate, template switcher, theme accent.
3. **Deploys** it to a public `/lp/[slug]` route with a working lead-capture form,
   UTM tracking, and page-view analytics - usable by anonymous visitors.
4. Runs **A/B experiments**: multiple variants per campaign, stable per-visitor
   traffic split, per-variant conversion tracking, and one-click auto-promote.
5. Works with **zero credentials**: when Azure is unset it produces a compelling
   seeded page; when Supabase is unset it uses a seeded in-memory store.

---

## The 5 templates (with DR frameworks)

| Template | id | Framework | Section arc |
|---|---|---|---|
| Squeeze page | `squeeze` | AIDA | hero → social proof → lead form → exit-intent → compliance |
| Long-form sales (VSL) | `long_form_sales` | PAS → AIDA | video hero → problem/agitate → benefits → proof → testimonials → countdown → lead form → FAQ → exit-intent → compliance |
| Quiz funnel | `quiz_funnel` | AIDA | hero → interactive quiz → gated lead form → social proof → compliance |
| Advertorial | `advertorial` | PAS | "sponsored" editorial hero → story → benefits → testimonials → CTA → lead form → exit-intent → compliance |
| Listicle | `listicle` | AIDA | hero → numbered value stack → CTA → lead form → compliance |

Templates live in `src/lib/landing/templates.ts` as deterministic section builders.
`buildLandingDocument(template, ctx, { copy })` maps an optional AI copy spec onto
the section structure and fills any gaps with context-derived defaults, so the
result is **always a valid, renderable document**. Finance verticals
(`detectFinance`) automatically receive a compliance/disclaimer block.

## Section model + component library

The page is a typed `LandingDocument` (`src/lib/landing/types.ts`, Zod source of
truth) persisted to `landing_pages.sections` (jsonb). It is a discriminated union
of sections, each rendered by a render-safe component:

| Section | Component | Interactive |
|---|---|---|
| `hero` | static | smooth-scroll CTA |
| `rich_text` | static | - |
| `features` (feature/benefit) | static | - |
| `social_proof` | static | - |
| `testimonials` | static | - |
| `listicle` | static | - |
| `faq` | `interactive.tsx` | accordion |
| `countdown` | `interactive.tsx` | live timer (reduced-motion safe) |
| `quiz` | `interactive.tsx` | stepper |
| `lead_form` | `lead-form.tsx` | posts to `/api/leads` |
| `exit_intent` | `exit-intent.tsx` | exit/dwell popup, once/session |
| `cta` | static | smooth-scroll CTA |
| `compliance` | static | financial disclaimers |

Static sections are **server-rendered** for a fast, mobile-first, indexable page;
interactive sections are **client islands**. The renderer
(`components/landing-page/section-renderer.tsx`) is shared by the public route
and the editor preview, so *what you edit is what deploys*. Per-template styling
is self-contained via CSS variables (`src/lib/landing/theme.ts`) - fully isolated
from the zinc+emerald dashboard chrome.

## Generation (AI + seeded fallback)

`src/lib/landing/generate.ts` asks Azure GPT-4o for a single strict-JSON
`LandingCopySpec` (prompt in `prompts.ts`), extracts + Zod-validates it, then maps
it onto the template. **Every failure path is covered**: Azure unconfigured,
malformed JSON, schema-invalid output, or a thrown call all degrade to a seeded
document. Generation never throws. Per-section regeneration uses a focused AI pass
(spliced back in) when Azure is configured, and a deterministic copy variation
(`varySectionCopy`) otherwise so the demo still visibly changes.

## Persistence + RLS (the public capture path)

`src/lib/services/landing.service.ts` mirrors the creative service: a `LandingStore`
interface with an **in-memory seeded store** (credential-free) and a **Supabase
store** (RLS-scoped). Two resolvers:

- `getLandingStore()` - owner ops (dashboard): Supabase RLS when signed in, else
  the seeded store.
- `getPublicLandingStore()` - the anonymous `/lp` path: prefers the service-role
  admin client (bypasses RLS), then the anon client (uses the public policies),
  else the seeded store.

The foundation RLS (migration `0001`) makes **deployed** pages publicly readable
and allows anonymous `INSERT` into `leads` / `page_views` only when the row joins
to a deployed page **owned by the recorded `user_id`**. The capture path therefore
resolves the page owner server-side and writes `user_id = page.user_id`, so:

- anonymous capture satisfies the RLS check (and the admin client is robust if the
  policy is unavailable), and
- the public path is **isolated from authenticated data** - it can only read
  deployed pages and write rows attached to them.

`deploy()` flips `status='deployed'`, stamps `deployed_at`, and renders a
self-contained static **HTML snapshot** into `html_content` (`html.ts`) - a
portable, no-JS-resilient artifact whose `<form>` posts to `/api/leads`.

Statuses: `draft` → `deployed` → `paused` (paused = removed from public rotation
and RLS-unreadable, used by auto-promote to retire losing variants).

## Public route + endpoints

- `src/app/lp/[slug]/page.tsx` (`runtime = "nodejs"`, dynamic): server-renders the
  stored sections for a deployed page (404 otherwise), runs A/B assignment, mounts
  the lead form + view beacon + exit-intent popup. `?preview` / `?ab=off` bypasses
  A/B to preview an exact slug.
- `POST /api/leads`: anonymous lead capture. Accepts JSON (React form) **and**
  form-encoded posts (static snapshot, no-JS); validates `leadCaptureSchema`,
  captures IP + UTM (parsed from referrer for no-JS), and redirects form posts
  back with `?lead=ok`.
- `POST /api/page-views`: view beacon (`navigator.sendBeacon` or fetch). Records
  UTM + referrer and sets the `mos_vid` visitor cookie so A/B assignment is stable
  across visits.

## A/B testing

Design (`src/lib/landing/ab.ts`, pure + deterministic):

- **Grouping**: deployed pages in a campaign sharing `experiment.key` (stored in
  the document) form an experiment.
- **Assignment**: `assignVariant(visitorId, key, variants)` hashes the visitor id
  (FNV-1a) into `[0,1)` and picks by cumulative weight, sorted by id for stable,
  order-independent results. The same visitor always gets the same variant;
  weight `0` removes a variant from rotation.
- **Visitor id**: the `mos_vid` cookie (set by the view beacon). On a first,
  cookie-less SSR render the server uses an ephemeral id and the beacon persists
  it, so assignment stabilizes after the first view.
- **Tracking**: leads + views are recorded against the *rendered* variant's page,
  so per-variant conversion rate = leads/views per `landing_page_id`.
- **Auto-promote heuristic** (`pickWinner`, documented + tunable): every variant
  needs ≥ `minViewsPerVariant` views (default 100), and the best CVR must beat the
  next-best by ≥ `minRelativeLift` relative lift (default 10%). Otherwise the
  result is `insufficient_data` or `no_clear_winner` and nothing changes. On a
  confident winner, `promoteExperimentWinner` sets the winner to weight 100 and
  pauses the losers (weight 0, `status='paused'`), routing all traffic to the
  winner. This is a conservative stand-in for a full significance test.

## Editor

- `src/app/(dashboard)/landing-pages/page.tsx` - hub: list by campaign with
  conversion stats (views / leads / CVR), create flow (template + angle), and A/B
  experiment groups with promote-winner.
- `src/app/(dashboard)/landing-pages/[id]/page.tsx` - visual editor: live
  preview with desktop/mobile toggle, click-section-to-edit inline inspector,
  per-section regenerate, template picker, accent theming, one-click deploy,
  create-A/B-variant. Empty/loading/error states throughout.

## Credential-free demo

With no Azure + no Supabase, the in-memory store seeds a **deployed A/B experiment**
for the finance-newsletter vertical ("Retirement Income Weekly", reusing the
Creative Studio's demo campaign): two squeeze variants ("no-upsell trust" vs
"beat inflation") with realistic view/lead counts, so the hub stats, the A/B
view, the winner heuristic, and the live `/lp/[slug]` pages are all demoable
immediately.

## File map

```
src/lib/landing/
  types.ts            section + document + copy-spec Zod schemas (client-safe)
  theme.ts            per-template CSS-variable theming
  slug.ts             slugify + unique-slug generation
  utm.ts              UTM + referrer parsing
  ab.ts               deterministic assignment + winner heuristic
  templates.ts        5 templates, DR frameworks, copy mapping, section variation
  prompts.ts          AI prompt builders
  generate.ts         SERVER: AI generation + seeded fallback
  html.ts             static HTML snapshot renderer
  fixtures.ts         seeded finance demo (A/B experiment)
  studio.ts           SERVER: orchestration, A/B ops, public resolver
  index.ts            client-safe barrel
src/lib/services/landing.service.ts   store interface + in-memory + Supabase + public capture
src/components/landing-page/          renderer, sections, lead form, exit-intent, beacon, preview, editor, hub, inspector
src/app/(dashboard)/landing-pages/    hub + editor routes + server actions
src/app/lp/[slug]/page.tsx            public deployed route
src/app/api/leads, src/app/api/page-views   anonymous capture endpoints
```

## Tests (Vitest, CI-safe, no network)

- `ab.test.ts` - assignment determinism, weighting, zero-weight exclusion, winner
  heuristic (insufficient / no-clear / winner).
- `generate.test.ts` - section-generation parsing with **mocked Azure**: strict +
  fenced JSON applied, malformed / thrown / unconfigured all fall back to seeded.
- `templates.test.ts` - all 5 templates schema-valid, finance compliance
  auto-include, copy-spec mapping, per-section variation.
- `slug.test.ts` - slugify + collision-free uniqueness.
- `utm.test.ts` - UTM extraction from query/URL/params/object, referrer cleaning.
- `services/landing.service.test.ts` - slug uniqueness, deploy state transition +
  HTML snapshot, anonymous lead validation (deployed-only) + owner resolution,
  view recording with UTM + stats, seeded experiment.
