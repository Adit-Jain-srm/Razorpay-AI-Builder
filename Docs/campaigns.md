# Campaign System

The campaign module is the **hub** that links research, creatives, landing pages, and
analytics. A campaign carries a research-powered **brief**, a **platform config**, and a
**budget plan**, and moves through a `draft -> active -> archived` lifecycle. It supports
the "research first" flow: personas synthesized by the Audience Research Intelligence
Engine are imported straight into the brief.

Cross-references: [architecture](./architecture.md), [research-engine](./research-engine.md),
[progress](./progress.md). API contracts are consolidated in [api](./api.md).

---

## 1. Module map

| Area | Path | Notes |
|---|---|---|
| Domain (pure) | `src/lib/campaign/brief.ts` | Schemas + decoders for the 4 jsonb columns; all pure, client-safe. |
| Templates (pure) | `src/lib/campaign/templates.ts` | Financial-newsletter / ecommerce / SaaS seeds. |
| AI brief assistant | `src/lib/campaign/assistant.ts` | Personas + platform recs + budget split. Server-only (Azure). |
| Research import | `src/lib/campaign/personas.ts` | Reads personas from a research project (read-only). Server-only. |
| Persistence | `src/lib/campaign/store.ts` | Supabase (RLS) + in-memory demo store. Server-only. |
| Service | `src/lib/services/campaign.service.ts` | `campaignService` CRUD + `setStatus` over the store. |
| Server actions | `src/app/(dashboard)/campaigns/actions.ts` | CRUD, duplicate, status, AI assist, persona import. |
| UI | `src/components/campaign/**`, `src/app/(dashboard)/campaigns/**` | List, multi-step builder, campaign hub. |

`@/lib/campaign` (barrel) re-exports only the **pure** modules (`brief`, `templates`) so client
components never drag in server-only code; server modules are imported by explicit path.

---

## 2. Data model (the `campaigns` table)

The table has four `jsonb` columns. `brief.ts` is the single place that decodes them into
rich, validated shapes and encodes them back. Decoding is **lenient**: a legacy/partial row
falls back to schema defaults rather than throwing.

| Column | Decoded shape | Holds |
|---|---|---|
| `brief` | `CampaignBriefData` | objective, product, offer, audience, value props, tone, notes, persona snapshots, `researchProjectId`, `source` |
| `platform_config` | `PlatformConfig` | selected `platforms`, ranked `recommendations` (0-100 `fit` + rationale), `source` |
| `budget` | `BudgetPlan` | `total`, `daily`, `currency`, per-platform `allocations` (percent + rationale), `source` |
| `persona_ids` | `string[]` | ids mirrored from `brief.personas` (kept in sync on write) |

### Brief schema (`briefSchema`)

```ts
{
  objective: string,            // "leads" | "sales" | ... (free text allowed)
  product: string,
  offer: string,
  audience: string,
  valueProps: string[],
  tone: string,
  notes: string,
  personas: PersonaSnapshot[],  // self-contained snapshots (see below)
  researchProjectId?: string,   // the "research first" linkage
  source: "manual" | "ai" | "seeded" | "template",
}
```

### Persona snapshot (`personaSnapshotSchema`)

Personas are **snapshotted** into the brief (not just referenced) so the campaign hub renders
the audience even if the source research project later changes or is deleted.

```ts
{
  id: string,                   // research: `${projectId}:${slug}:${index}`, ai: `ai:${slug}:${i}`
  name: string,
  summary: string,
  ageRange?, incomeBracket?, location?, sizeRange?: string,
  painPoints: string[],
  platforms: string[],
  source: "research" | "ai" | "manual",
  researchProjectId?: string,
}
```

Ad platforms are the research engine's `AD_PLATFORMS`: `google, meta, tiktok, taboola,
linkedin, youtube, x`.

---

## 3. AI brief assistant

`getCampaignBriefAssistant()` (pluggable singleton, like the research analyzer) turns a short
product/offer description into a decision-ready brief:

- **`suggestPersonas`** - audience persona suggestions.
- **`recommendPlatforms`** - 0-100 fit score + reasoning per channel (the "platform
  recommendation engine").
- **`allocateBudget`** - a spend split across the recommended/selected channels.
- **`assist`** - a single combined call returning all of the above plus objective, value
  props, and tone (used by the builder's one-click "AI draft brief").

**Resilience + fallback (always demos).** Every model response is parsed and zod-validated
before it is trusted. When Azure is **unconfigured**, or a call/parse fails, the assistant
degrades to a **deterministic, vertical-aware seeded result**:

- Platform fit = per-platform base score adjusted by a detected vertical
  (finance / ecommerce / saas / youth / general), clamped to 5-98, ranked desc.
- Budget = allocations proportional to fit, normalized to exactly 100%.
- Personas = imported personas if present, else the finance fixture personas for that
  vertical, else a generic persona derived from the product/audience.

The UI labels the output `AI` vs `seeded` so it is never misrepresented. Invalid model output
falls back rather than propagating.

---

## 4. Research-first flow

`personas.ts` reads an existing research project's synthesized personas through the read-only
research service (`getResearchProjectWithReport`) and maps each `AudienceSegment` into a brief
`PersonaSnapshot` (carrying its `researchProjectId` for traceability). The builder's **Audience**
step lets a user pick a project and toggle personas into the brief; the campaign hub then links
back to that exact research project. Works with zero credentials (the research engine seeds a
demo project).

---

## 5. Templates

`CAMPAIGN_TEMPLATES` ships three ready-to-edit verticals - **financial newsletter**,
**ecommerce**, **SaaS** - each pre-filling the whole builder (brief + platforms + budget) with a
coherent, direct-response default whose budget allocations sum to 100%. `applyTemplate(id)`
returns a deep-cloned seed (`?template=<id>` deep-links into the builder).

---

## 6. Service + lifecycle

`campaignService` (`list / get / create / update / setStatus / remove`) is a thin pass-through
over `getCampaignStore()`, which resolves the best backend per request:

- **Supabase** (RLS-scoped to `auth.uid()`) when configured and a user is signed in. `user_id`
  on insert/update is **always** taken from the session - a caller-supplied `user_id` is ignored
  (defense-in-depth).
- **In-memory demo store** otherwise, seeded with a rich "Retirement Income Weekly" campaign so
  the module is fully usable with zero credentials.

Reads degrade gracefully (return `[]` / `null` on failure); writes throw typed `AppError`s so
server actions can surface real failures. Status lifecycle is `draft -> active -> archived`
(any transition allowed), plus a **duplicate** action that clones a campaign as a new draft.

---

## 7. UI surfaces

- `/campaigns` - card grid with status, platform chips, persona count, budget, and a brief-
  completeness bar; status filter tabs; template gallery; per-card actions menu.
- `/campaigns/new` - the multi-step brief builder (Offer -> Audience -> Channels -> Budget ->
  Review) with inline AI at every step (draft brief, suggest personas, recommend channels,
  allocate budget) and a live draft summary rail.
- `/campaigns/[id]` - the campaign hub: brief summary, persona cards, channel fit, budget
  allocation, and out-links to Research / Creatives / Landing Pages / Analytics for that campaign.

Design: zinc + emerald, Phosphor icons, Geist, the foundation state kit (empty/loading/error),
and reduced-motion-safe AI spinners.

---

## 8. Testing

Vitest, CI-safe (no network; Azure + Supabase + research service mocked or in-memory):

- `brief.test.ts` - decode/round-trip, `normalizeAllocations`, completeness, helpers.
- `templates.test.ts` - templates are schema-valid; allocations sum to 100; clone safety.
- `assistant.test.ts` - parsing with a **mocked `generateChat`** (valid JSON, malformed -> seeded,
  throw -> seeded, Azure-off -> seeded) plus the seeded heuristics.
- `personas.test.ts` - research-segment -> snapshot mapping with a **mocked research service**.
- `store.test.ts` - in-memory CRUD + demo seed, and `SupabaseCampaignStore` against a **mocked
  Supabase client** (asserts session `user_id`, resilient reads, typed write errors).
