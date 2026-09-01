# API & Server Actions

The contract surface for MediaOS. Mutations are **Server Actions**; public/streaming/webhook
surfaces are **Route Handlers** under `src/app/api`. This is the foundation plan - each row is filled
in by its module's phase. Every input is validated with the Zod schema named in the last column
(`src/lib/validators`); every server-side mutation re-checks auth (RLS + `auth.uid()`), per the
React/Next guidance to treat server actions as public endpoints.

Status legend: **Live** = implemented in the foundation; **Planned** = contract defined, built in
its module phase.

---

## Public routes (no auth)

| Route | Method | Purpose | Status |
|---|---|---|---|
| `/login`, `/register` | page | Auth surfaces; submit via server actions | Live (UI) |
| `/lp/[slug]` | page (RSC) | Render a **deployed** landing page (RLS public read) | Live (route) |
| `/api/lead` | POST | Anonymous lead capture into `leads` (validated, owner resolved from deployed page) | Planned |
| `/api/page-view` | POST | Anonymous page-view ping into `page_views` | Planned |

## Auth

| Action / route | Kind | Input schema | Status |
|---|---|---|---|
| `signIn` | server action | `loginSchema` | Planned |
| `signUp` | server action | `registerSchema` | Planned |
| `signOut` | server action | - | Planned |
| route protection | `src/proxy.ts` | - | Live |

## Module 0 - Operator (agent)

| Action / route | Kind | Input | Status |
|---|---|---|---|
| `/api/agent/chat` | POST (streaming) | messages + conversationId | Planned |
| `createConversation` / `listConversations` | server action | campaignId? | Planned |
| `saveRun` / `saveMessage` | server action | run/message records | Planned |

Backed by `agent_conversations` / `agent_messages` / `agent_runs`; tools come from
`agentToolRegistry` ([ADR 0004](./adr/0004-agent-runtime.md)).

## Module 1 - Research

| Action / route | Kind | Input schema | Status |
|---|---|---|---|
| `createResearchProject` | server action | `createResearchProjectSchema` | Planned |
| `runResearchProject` | server action / streamed | `researchQuerySchema` (= `queryParamsSchema`) | Planned |
| `getResearchProject` / `listResearchProjects` | server action | id / filters | Planned |

Engine entry point: `runResearch()` (`src/lib/research/orchestrator.ts`). See
[research-engine.md](./research-engine.md).

## Module 2 - Campaigns

| Action | Kind | Input schema | Status |
|---|---|---|---|
| `createCampaign` | server action | `createCampaignSchema` | Planned |
| `updateCampaign` / `archiveCampaign` | server action | id + partial brief/budget | Planned |
| `listCampaigns` / `getCampaign` | server action | filters / id | Planned |

Service: `campaignService` (`src/lib/services/campaign.service.ts`).

## Module 3 - Creative Studio

| Action | Kind | Input schema | Status |
|---|---|---|---|
| `generateCreatives` | server action (streamed) | `creativeRequestSchema` | Planned |
| `generateCreativeImage` | server action | `imageRequestSchema` | Planned |
| `rateCreative` / `favoriteCreative` | server action | id + rating | Planned |
| `exportCreatives` (`/api/creatives/export`) | GET | campaignId + format | Planned |

Services: `creativeService`; images via `generateImage` (`src/lib/ai/azure.ts`) to the
`creative-images` storage bucket.

## Module 4 - Landing Pages

| Action | Kind | Input schema | Status |
|---|---|---|---|
| `generateLandingPage` | server action | brief + `landingTemplateSchema` | Planned |
| `deployLandingPage` | server action | id (sets `status = 'deployed'`) | Planned |
| `captureLead` (`/api/lead`) | POST | `leadCaptureSchema` | Planned |
| `recordPageView` (`/api/page-view`) | POST | `pageViewSchema` | Planned |

Service: `landingService`. Anonymous writes rely on the RLS deployed-page join
([ADR 0003](./adr/0003-rls-strategy.md)).

## Module 5 - Performance Intelligence

| Action / route | Kind | Input | Status |
|---|---|---|---|
| `getAnalyticsSummary` | server action | `AnalyticsQuery` (campaign/date range) | Planned |
| `seedPerformance` | server action / script | campaignId | Planned |
| `generateDailyBrief` / `detectAnomalies` | server action | campaignId | Planned |
| `exportReport` (`/api/analytics/export`) | GET | campaignId + format | Planned |

Service: `analyticsService` (`AnalyticsQuery`, `AnalyticsSummary`). Anomalies/insights persist to
`anomalies` / `ai_insights` and feed the Operator's monitoring loop.

---

## Conventions

- **Validation:** parse with the named Zod schema; return structured field errors on failure.
- **Auth:** every action verifies the session and relies on RLS; the service-role client is used
  only for trusted server paths (validated public capture, seeders, cron).
- **Resilience:** external calls go through `withRetry` / `withTimeout` and throw typed `AppError`s.
- **Errors to the client:** typed, secret-free (`AppError.toJSON()`); never leak internal detail.
