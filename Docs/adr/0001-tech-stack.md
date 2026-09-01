# ADR 0001: Technology Stack

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** Foundation build

## Context

MediaOS must feel like an AI-native operations console: streaming agent reasoning, real artifacts,
real data, real persistence - on a live URL a judge can use in minutes. We need a stack that
supports React Server Components + streaming, first-class tool-calling, strict typing end to end,
row-level-secured multi-tenant data, and a dark-first dense UI without bespoke design debt.

The project plan (`.cursor/plans/...`) specified Next.js 15. During scaffolding, Next.js 16 was the
current stable release.

## Decision

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router, RSC, Server Actions, streaming) | 16.2.x |
| UI runtime | React | 19.2.x |
| Language | TypeScript, `strict`, zero `any` | 5.x |
| Styling | Tailwind CSS | v4 (`@tailwindcss/postcss`) |
| Components | shadcn (the **base-nova** registry) over **Base UI** | shadcn 4.x, `@base-ui/react` 1.x |
| AI orchestration | Vercel AI SDK (tool calling + streaming) | `ai` 7.x |
| AI provider | Azure OpenAI (GPT-4o + GPT-Image) | `@ai-sdk/azure` 4.x |
| Data intelligence | Bright Data MCP | token-based |
| Database / Auth / Storage | Supabase | `@supabase/ssr` + `supabase-js` |
| Client state | Zustand | 5.x |
| Server state | TanStack Query | 5.x |
| Validation | Zod | 4.x |
| Charts | Recharts | 3.x |
| Icons | Phosphor (one family) | 2.x |
| Animation | Motion (`motion/react`), reduced-motion safe | 12.x |
| Deployment | Vercel | - |

### Why Next.js 16 instead of the plan's Next.js 15

Next.js 16 is a **superset** of the capabilities the plan relies on (App Router, RSC, Server
Actions, streaming) and was the current stable release at scaffold time. Choosing it avoids
immediately shipping on an older minor and then having to migrate. The one convention change it
forces is documented in `Docs/learnings.md`: route-protection middleware now lives in
`src/proxy.ts` exporting a `proxy()` function (the old `middleware.ts` / `middleware()` name).

### Why Base UI (shadcn `base-nova`) instead of Radix

The classic shadcn registry generates components on top of **Radix UI**. We use the **`base-nova`**
shadcn registry, which generates the same ergonomics on top of **Base UI** (`@base-ui/react`) - the
successor primitive library from the Radix team. This keeps us on the actively-evolving primitive
set. Practical consequence (see learnings): imports come from `@base-ui/react`, not
`@radix-ui/*`, and a few prop/slot names differ.

### Why Azure OpenAI (not OpenAI direct)

The challenge environment provides Azure OpenAI credentials. Azure uses deployment-based URLs and
versioned APIs; the `@ai-sdk/azure` provider is configured with `useDeploymentBasedUrls` and an
explicit `apiVersion`. Image generation (`gpt-image`) often needs a **preview** API version distinct
from the GA chat version - captured in `.env.example` and learnings.

### Why Bright Data for research

Audience research is the moat. Bright Data MCP gives real SERP + scraping on the free tier
(verified) and structured platform datasets on Pro. The engine is provider-agnostic and degrades
gracefully when Pro is unavailable (see [ADR 0002](./0002-research-provider-abstraction.md)).

### Why Supabase

Postgres + RLS gives strong multi-tenant isolation declaratively, plus Auth, Storage, and Realtime
in one service - ideal for a fast, secure build. See [ADR 0003](./0003-rls-strategy.md).

## Consequences

- **Positive:** One typed language across UI, server, AI tools, and validation. Streaming and RSC
  are first-class. RLS removes a whole class of authorization bugs. The research engine can grow
  without touching the core.
- **Negative / watch-outs:** Bleeding-edge versions (Next 16, React 19.2, Tailwind v4, Zod v4, AI
  SDK v7) mean some ecosystem docs lag; conventions (proxy.ts, Base UI) differ from older guides.
  Mitigation: pin versions, capture every gotcha in `Docs/learnings.md`, keep `tsc`/`lint`/`build`
  green on every commit.
- **Reference repo:** the OpenBB Python `Reference-repo/` is studied for the provider pattern but is
  excluded from every toolchain (git, tsc, eslint, next) so it never enters the build.
