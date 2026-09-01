# Operator Tools — wiring every module into the agent

The Operator is MediaOS's hero surface: an autonomous agent that **plans, executes,
monitors, and improves** a campaign end to end. It does real work by calling
**typed, Zod-validated tools** that wrap the same module services the manual
screens use — so the agent and the cockpit can never diverge.

This page is the engineering reference for the tool layer: the catalog, the
golden-path workflow, the artifact types, the proactive/improvement features, and
how to add a new tool.

Design rationale: [ADR 0004](./adr/0004-agent-runtime.md). Source:
`src/lib/agent/tools/`, `src/components/agent/artifact-view.tsx`.

---

## 1. The shape of a tool

Every capability is an `AgentTool` authored with `defineTool` (`src/lib/agent/types.ts`):
a name, a description (the model reads it), a category, a **Zod** `parameters`
schema, and an `execute(params, ctx)` that returns an `AgentToolResult` carrying a
renderable `AgentArtifact`.

Two invariants every module tool upholds:

1. **Validated boundary.** `defineTool` `safeParse`s raw arguments before calling
   `execute`, so a hallucinated/invalid argument returns `{ ok: false, error }`
   the agent can recover from instead of throwing.
2. **Fail safe.** Each `execute` body is wrapped in `runToolSafely` (`tools/shared.ts`):
   any thrown/rejected error is logged and converted to a structured
   `{ ok: false, error }`. **A tool never throws into the run.**

```ts
// src/lib/agent/tools/<module>.tools.ts
export function createResearchTools(): AgentTool[] {
  const tool = defineTool({
    name: "research_audience",
    description: "Run the research engine ...",   // the model reads this
    category: "research",
    parameters: z.object({ query: z.string().min(2).max(300) /* ... */ }),
    execute: async (params) =>
      runToolSafely("research_audience", async () => {
        const report = await runResearchPipeline(/* ... */); // module service
        const data = reportToArtifactData(report);
        return ok(data, { type: "research-report", title: "...", data });
      }),
  });
  return [tool];
}
```

Tools are grouped by `createXTools()` factories and registered idempotently by
`registerModuleTools()` (`tools/index.ts`). The Operator route
(`src/app/api/operator/chat/route.ts`) bootstraps **both** built-ins and module
tools per server instance:

```ts
registerBuiltinTools();   // navigate, list_capabilities, summarize_context
registerModuleTools();    // every module tool below
```

> **Module resolution note.** A sibling file `src/lib/agent/tools.ts` (the
> built-ins) coexists with the `src/lib/agent/tools/` directory. The bare
> specifier `@/lib/agent/tools` resolves to the **file** (built-ins); the module
> barrel is reached via the explicit `@/lib/agent/tools/index` path, so the two
> never collide.

---

## 2. The tool catalog

17 tools across five modules, plus the three built-ins. Param schemas are tight
and well-described; campaign-scoped tools accept an optional `campaignId` and
fall back to the seeded demo campaign.

### Research (`category: research`)

| Tool | Params | Returns (artifact) |
|---|---|---|
| `research_audience` | `query`, `industry?`, `product?`, `region?`, `limit?` | `research-report` — personas, ranked pain points, competitor angles, opportunities, source citations |
| `get_personas` | `projectId?` | `personas` — synthesized personas from a saved project |

### Campaign (`category: campaign`)

| Tool | Params | Returns (artifact) |
|---|---|---|
| `create_campaign` | `name`, `product`, `offer?`, `audience?`, `goal?`, `painPoints?`, `platforms?`, `budgetTotal?`, `currency?` | `campaign` — persisted campaign (objective, value props, personas, platforms, budget) |
| `recommend_platforms` | `product`, `offer?`, `audience?`, `goal?`, ... | `platform-recommendations` — ranked 0-100 fit + rationale |
| `suggest_budget` | `product`, `budgetTotal?`, `platforms?`, ... | `budget-plan` — normalized split + per-platform amounts |
| `list_campaigns` | — | `campaign-list` — the user's campaigns |
| `get_campaign` | `campaignId` | `campaign` — one campaign's full brief |

### Creative (`category: creative`)

| Tool | Params | Returns (artifact) |
|---|---|---|
| `generate_creatives` | `campaignId?`, `platform`, `angle?`, `painPoints?`, `count?` | `creative-set` — limit-enforced, hook-classified, scored variants |
| `score_creative` | `creativeId?` **or** `platform` + `headline?`/`body?`/`cta?` | `creative-score` — DR scorecard (clarity, specificity, CTA, hook) |
| `regenerate_creative` | `creativeId` | `creative-set` (single, `regenerated`) — the improvement loop's repair step |

### Landing pages (`category: landing`)

| Tool | Params | Returns (artifact) |
|---|---|---|
| `build_landing_page` | `campaignId?`, `template`, `angle?` | `landing-page` (draft) — conversion-structured sections |
| `deploy_landing_page` | `pageId` | `landing-page` (live) — public `/lp/{slug}` URL |

### Analytics (`category: analytics`)

| Tool | Params | Returns (artifact) |
|---|---|---|
| `get_performance_summary` | `campaignId?`, `from?`, `to?` | `analytics-summary` — totals + per-platform breakdown |
| `detect_anomalies` | `campaignId?` | `anomalies` — z-score deviations (CPA/CTR/spend) |
| `get_recommendations` | `campaignId?` | `recommendations` — scale/pause/refresh/reallocate/investigate |
| `daily_brief` | `campaignId?` | `daily-brief` — natural-language performance brief |
| `proactive_briefing` | `campaignId?` | `proactive-briefing` — brief + anomalies + recommendations + one-tap next actions |

### Built-ins (`category: navigation | platform`)

`navigate`, `list_capabilities`, `summarize_context` — dependency-free; prove the
loop with zero credentials.

---

## 3. The golden path (end-to-end chain)

The recommended workflow, baked into `buildOperatorSystemPrompt`
(`OPERATOR_WORKFLOW`) so the live model follows it and chains each step's output
into the next:

```
goal
 └─ research_audience        → personas + pain points + citations
     └─ create_campaign      → campaign id (carry it forward), grounded in the pain points
         └─ generate_creatives  → hook-analyzed, scored variants for the campaign
             └─ score_creative / regenerate_creative  → compare + repair
                 └─ build_landing_page → deploy_landing_page → live /lp/{slug}
                     └─ get_performance_summary / detect_anomalies / get_recommendations / daily_brief
                         └─ proactive_briefing → improvement loop
```

The **campaign id is the spine**: `create_campaign` returns it; creatives, the
landing page, and analytics all reference it. Research **pain points** are the
other thread — they ground both the campaign brief and the creative copy.

The runtime (`src/lib/agent/runtime.ts`) drives the chain via the Vercel AI SDK's
multi-step tool loop (`stopWhen: stepCountIs(DEFAULT_MAX_STEPS)`). The step budget
is **16** — sized for the full path plus a final summary turn, so a long
autonomous run is never cut off mid-chain.

### Offline demo

With Azure unset the runtime runs a **scripted golden path that executes the real
module tools** (`mockGoldenPath`): research → creatives → landing → analytics,
threading the research pain points into creative generation. Every module service
degrades to seeded fixtures, so the hero feature is fully demoable with **zero
credentials**.

---

## 4. Artifact rendering

Each tool result type has a rich card in the client-side registry
(`src/components/agent/artifact-view.tsx`), keyed on `artifact.type`:

- **research-report / personas** — persona cards, pain points, competitor angles,
  opportunities, and clickable source links.
- **campaign / campaign-list** — brief cards with status, platforms, budget.
- **platform-recommendations / budget-plan** — ranked fit bars + allocation bars.
- **creative-set** — variant cards with a **hook badge** (mechanism + confidence)
  and a color-graded DR **score**.
- **creative-score** — per-dimension score bars + improvement notes.
- **landing-page** — preview (headline + section chips) with a live **Open URL**
  link once deployed, plus conversion stats.
- **analytics-summary / anomalies / recommendations / daily-brief /
  proactive-briefing** — metric grids, severity-tagged findings, priority-tagged
  actions, and the brief text.

The client/server boundary stays clean: tool `execute` is server-only and maps
rich domain output down to **flat, render-ready shapes** declared in
`src/lib/agent/tools/artifacts.ts` (a PURE, runtime-free module the client
imports). Unknown artifact types fall back to a readable JSON view.

---

## 5. Proactive intelligence + the improvement loop

- **`proactive_briefing`** fuses the daily brief, top anomalies, and the ranked
  recommendations into one artifact, and computes **`nextActions`** — one-tap
  follow-up prompts that drive real tools (e.g. "Regenerate the underperforming
  creative `<id>`"). When a run produces this artifact, the runtime surfaces those
  `nextActions` as the conversation's **suggestion chips** (`suggestionsFromArtifacts`),
  so the improvement loop is a single click.
- **Improvement loop:** `get_recommendations` / `detect_anomalies` find
  underperformers (high CPA, fatigued CTR), and `regenerate_creative` repairs the
  weakest one in place. The recommendation chips map straight to these tools.
- **Tool-aware chips:** `buildSuggestedActions` (`plan.ts`) offers golden-path
  follow-ups ("Launch full campaign", "What should I do today?", "Research the
  audience", "Draft ad concepts") whenever the module tools are registered.

---

## 6. How to add a new tool

The runtime, streaming protocol, and registration are untouched — adding a
capability is a localized change.

1. **Author it** in `src/lib/agent/tools/<module>.tools.ts` inside the module's
   `createXTools()` factory. Wrap the body in `runToolSafely`, call the module's
   server entry point, and return `ok(data, { type, title, data })`.
2. **Declare its artifact data** (flat, client-safe) in `tools/artifacts.ts`.
3. **Render it** by adding a `case "<type>"` to the `ArtifactView` switch in
   `src/components/agent/artifact-view.tsx`.
4. **Register it** — it is picked up automatically by `createModuleTools()` since
   it's returned from a `createXTools()` factory.
5. **Test it** — add a happy-path + error-path case in
   `src/lib/agent/tools/module-tools.test.ts` (mock the module service; never hit
   the network/AI).

If the workflow changes, update `OPERATOR_WORKFLOW` in `prompts.ts` and the
golden-path branch of `fallbackPlan` (`plan.ts`).

---

## 7. Testing

`src/lib/agent/tools/module-tools.test.ts` — offline + deterministic (every module
service mocked):

- Each tool's `execute`: happy path (mock returns → correct artifact) **and** error
  path (module throws → structured `{ ok: false }`, never throws).
- Registry: `registerModuleTools` wires all 17 tools and coexists with the
  built-ins.
- End-to-end runtime: a demo-mode run walks the golden path and an injected
  model stream drives an explicit multi-tool plan — both assert tools execute in
  order and artifacts accumulate in order.

Run: `npm test` (or `npx vitest run src/lib/agent`).
