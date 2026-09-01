# Creative Studio (Module 3)

Research-informed, platform-ready ad creatives - copy + visuals - with psychological
hook analysis and direct-response scoring. Cross-references:
[architecture](./architecture.md), [research-engine](./research-engine.md),
[api](./api.md), [progress](./progress.md), [runbook](./runbook.md).

The studio turns a campaign (plus its research) into scored, hook-analyzed,
limit-enforced ad variants for Google, Meta, TikTok, and Taboola, generates
GPT-Image visuals at the right aspect ratios, learns a brand voice, and exports
to the ad managers. It runs **fully credential-free** (seeded demo) and upgrades
to live Azure generation + Supabase persistence when configured.

---

## Architecture

```
src/lib/creative/
  types.ts          Zod schemas + types (hook, score, field, content) - source of truth
  platforms.ts      Per-platform field specs + character limits (DATA)
  limits.ts         PURE char-limit enforcement (truncate / measure / flag)
  hooks.ts          PURE psychological hook classification (heuristic + taxonomy)
  scoring.ts        PURE direct-response scoring (clarity/specificity/CTA/hook)
  assemble.ts       PURE: raw role strings -> enforced + classified + scored content
  prompts.ts        PURE per-platform generation prompts (research + brand voice aware)
  copy.ts           SERVER: streamChat generation -> parse -> assemble (seeded fallback)
  visuals.ts        PURE: aspect-ratio mapping, image prompt, SVG placeholder
  brand-voice.ts    PURE: tone-profile derivation + prompt summary
  fixtures.ts       Seeded demo creatives (financial-newsletter vertical)
  research-bridge.ts SERVER (read-only): pain points + vocabulary from research
  studio.ts         SERVER orchestration: generate / regenerate / edit / images / brand voice
  index.ts          Client-safe barrel (pure modules only)

src/lib/services/creative.service.ts   Persistence: Supabase + in-memory store + Storage
src/app/api/creative/generate/route.ts NDJSON streaming generation endpoint
src/app/(dashboard)/creatives/actions.ts Server actions (non-streaming + mutations + export)
src/app/(dashboard)/creatives/page.tsx   Server page (campaign-scoped)
src/components/creative/**               Studio UI
```

**Data flow (generation):** `page` / `GenerationPanel` -> `/api/creative/generate`
-> `studio.generateCreatives` -> research bridge + brand voice + `copy.generateCopy`
(`streamChat`) -> `assembleVariant` (enforce -> classify -> score) -> persist via
`creativeService` -> stream `variants` back -> `VariantCard`.

The `content` jsonb stores the full validated `CreativeContent`; the row columns
`hook_type`, `hook_confidence`, and `score` mirror it for querying.

---

## Character-limit enforcement (pure, unit-tested)

Limits live as data in `platforms.ts` (one source of truth for generators, the
scorer, exports, and the UI). `limits.ts` enforces them deterministically:
`normalizeWhitespace` -> `truncateToLimit` (word-boundary aware, never exceeds the
cap, sets a `truncated` flag) -> `buildField` / `buildRoleFields`. `measureField`
flags over-limit text without trimming (live editing).

| Platform | Format | Fields (limit) |
|---|---|---|
| Google | Responsive Search Ad | Headline x3-15 (**30**), Description x2-4 (**90**), Path x0-2 (**15**) |
| Meta | Single feed ad | Primary text (**125** visible), Headline (**40**), Link description (**30**, optional) |
| TikTok | In-feed video | Spoken hook (**90**), Caption (**100**), Overlay (**40**), CTA (**20**) |
| Taboola | Native discovery | Headline (**60**), Branding (**25**, optional), Description (**150**, optional) |

LinkedIn / YouTube / X fall back to a generic single-ad spec so the system never
breaks on a non-core platform. Limits reflect each network's enforced/recommended
caps as of 2026 (e.g. Meta's 125-char visible primary text, 40-char headline;
TikTok's 100-char caption; Taboola's 60-char title).

---

## Hook psychological analysis

Six persuasion mechanisms: **fear, curiosity, FOMO, social_proof, urgency,
exclusivity**. `hooks.ts` scores copy against weighted signal dictionaries (word
boundaries prevent false hits like "now" inside "knowledge"), normalizes the
per-mechanism scores, and returns the dominant type with a confidence that blends
its share of total signal with absolute strength. It is deterministic and offline.

An optional AI pass can refine it, but the heuristic is the trustworthy floor and
the fallback. `coerceHookType` maps model aliases (e.g. `scarcity` -> `urgency`,
`authority` -> `social_proof`) and rejects unknowns. Results persist to
`hook_type` / `hook_confidence` and render as a badge per variant.

---

## Creative scoring

`scoring.ts` produces a 0-100 direct-response score from four sub-scores, weighted:

- **Hook strength (30%)** - confidence of the classified mechanism.
- **Clarity (25%)** - fits limits, not truncated, no ALL-CAPS / over-punctuation.
- **Specificity (25%)** - concrete numbers, money, percentages, time, proper nouns.
- **CTA strength (20%)** - action verb present, ideally in a dedicated CTA field.

It returns a breakdown plus prioritized improvement notes and a letter grade
(A >= 85, B >= 70, C >= 55, D otherwise). Deterministic; an optional AI pass may
refine.

---

## Visual generation

`visuals.ts` maps platform aspect ratios to the sizes Azure GPT-Image supports:

| Aspect ratio | Use | Azure size |
|---|---|---|
| 1:1 | Square (Meta, Taboola) | 1024x1024 |
| 9:16 | Vertical (TikTok, Stories) | 1024x1536 |
| 16:9 | Landscape (YouTube) | 1536x1024 |
| 1.91:1 | Link/native | 1536x1024 |

`studio.generateImages` builds a no-text photographic prompt, calls
`generateImage` (capped at **4** per request), uploads bytes to the
`creative-images` bucket (`{userId}/{creativeId}/{uuid}.png`), and persists a
`creative_images` row. Without Azure (or on failure) it seeds branded SVG
placeholder data-URLs at the correct ratio so the gallery still populates.

---

## Export

Pure, dependency-free CSV formatters (`export.ts`), RFC-4180 quoted:

- **Google Ads Editor** - RSA columns (`Headline 1..15`, `Description 1..4`,
  `Path 1/2`, `Final URL`); one row per `google` creative.
- **Meta bulk import** - `Campaign / Ad Set / Ad Name / Title / Body / Link
  Description / Website URL / Call to Action`; one row per `meta` creative.

The browser downloads the returned string via a Blob (no new dependency). Images
download directly from the gallery.

---

## Brand voice

`brand-voice.ts` derives a structured tone profile (formality, reading level,
emoji usage, sentence cadence, dominant hooks, signature vocabulary, descriptors)
from a handful of winning ads - pure and deterministic. It persists to
`brand_voices.tone_profile`, and `summarizeToneForPrompt` injects it into the
generation prompt so new copy sounds like the brand.

---

## Research bridge (read-only)

`research-bridge.ts` reads (never modifies) the Research Engine: when a campaign
has a research project, it surfaces the exact pain points and audience vocabulary
so generated copy targets them. The demo campaign uses the seeded
financial-newsletter intelligence. The `GenerationPanel` prefills pain points
from this bridge; users can edit them.

---

## Credential-free fallback

The studio is fully demoable with zero credentials:

- **Copy** - `copy.ts` returns seeded variants (real assembly pipeline, so hooks
  and scores are genuine) when Azure is unconfigured or generation/parse fails.
- **Persistence** - `creative.service.ts` uses a seeded in-memory store when
  Supabase is unconfigured or no user is signed in; the demo campaign
  (`DEMO_CAMPAIGN_ID`) ships with A/B-grouped creatives across all four platforms.
- **Visuals** - branded SVG placeholders at the right aspect ratio.

A clear in-product banner explains demo mode and how to enable live generation.

---

## API + actions

- `POST /api/creative/generate` - NDJSON stream: `start` -> `delta` (tokens) ->
  `variants` (persisted, scored) -> `done` (or `error`). Validated by
  `creativeRequestSchema`.
- Server actions (`actions.ts`): `generateCreativesAction` (non-streaming
  fallback), `regenerateCreativeAction`, `editCreativeAction`,
  `rateCreativeAction`, `favoriteCreativeAction`, `removeCreativeAction`,
  `generateImagesAction`, `saveBrandVoiceAction`, `removeBrandVoiceAction`,
  `exportCreativesAction`. Each returns a discriminated `ActionResult`.

All external calls (Azure, Supabase, Storage) go through the foundation's
retry/timeout wrappers and fail safe with typed errors - a failure degrades to
seeded output rather than throwing to the UI.

---

## Testing

Vitest, CI-safe (no network, AI + Supabase mocked), co-located `*.test.ts`:

- `limits.test.ts` - truncation, word-boundary, flags, completeness.
- `hooks.test.ts` - classification per mechanism, word boundaries, alias coercion.
- `scoring.test.ts` - ranking, bounds, clarity/CTA behavior, grades.
- `assemble.test.ts` - enforce -> classify -> score, incomplete + RSA caps.
- `export.test.ts` - CSV header/row correctness, RFC-4180 quoting, filenames.
- `brand-voice.test.ts` - tone derivation + prompt summary.
- `copy.test.ts` - seeded fallback + AI parse/enforce/cap (mocked `streamChat`).
- `creative.service.test.ts` - in-memory CRUD/seed/images/brand voices, URL
  resolution, and the Supabase store with a mocked client (user-scoping, upload
  path, listing).

Run: `npm test` (or `npx vitest run src/lib/creative src/lib/services/creative.service.test.ts`).

---

## Extending: add a platform

1. Add a `PlatformSpec` (roles + limits) in `platforms.ts` and include it in `CORE_PLATFORMS` if first-class.
2. Add its raw model schema + `rawToByRole` case in `copy.ts`, and a JSON shape + tactic in `prompts.ts`.
3. Add an icon/label in `components/creative/platform-meta.tsx`.
4. (Optional) add an export formatter in `export.ts` and a seeded fixture in `fixtures.ts`.

Enforcement, hook analysis, scoring, the UI, and persistence work automatically -
they read the spec and the unified `CreativeContent` shape.
