# Skills — The Agent's Operating Manual

> **You are reading the index to 88 force-multipliers.** Each subfolder here is a `SKILL.md` that upgrades how you plan, build, debug, design, ship, and self-improve. This file tells you **what exists, when to reach for it, how to actually invoke it, and exactly what you lose by skipping it.**

**Audience: the agent (you).** Written in second person, imperative, on purpose. Read it like a checklist, not an essay.

---

## 0. The Prime Directive

1. **Skills are not optional decoration. They are how good work gets done here.** Before any non-trivial task, ask *"which skills apply?"* and **use them**.
2. **Reading ≠ using.** When a skill applies, `Read` its `SKILL.md` and **follow its process immediately**. Never just name-drop a skill ("I could use diagnose…") and then freelance. Invoke it for real.
3. **Use them enthusiastically and proactively.** The user should not have to ask. If you're about to write code → `self-review` is already queued. About to say "done" → `prove-it` fires first. About to build something fuzzy → `grill` first. This is the default, not the exception.
4. **Compound them.** Real tasks use 2–4 skills together (see [§4 Recipes](#4-compound-recipes--stack-them)). A lone skill is the floor, not the ceiling.
5. **Stay honest.** A skill's process is the standard you're held to — `prove-it`'s evidence gate, `diagnose`'s feedback loop, `verification-and-elegance`'s staff-engineer test. Don't perform the ritual and skip the substance.

---

## 1. Why this matters — WITH a skill vs WITHOUT

Skills exist because the **without** column is the entire catalogue of how capable agents still disappoint people. The **with** column is the bar.

| Moment | WITHOUT the skill | WITH the skill |
|---|---|---|
| You finished some code | You present a first draft; user finds the bug | `self-review` catches it silently; user accepts first time |
| You say "done" | "Should work" — it doesn't; wasted round-trip | `prove-it` runs the test, shows output, *then* claims |
| A hard bug appears | Guess-and-check, change 5 things, fix nothing | `diagnose` builds a deterministic repro loop → finds root cause |
| New feature, vague ask | You build the wrong thing beautifully | `grill` resolves every decision branch before a line of code |
| Building a UI | Inter font, purple gradient, three equal cards — AI slop | `frontend-design` / `design-taste-frontend` ship a distinctive, intentional interface |
| "Make it faster" | You optimize a non-bottleneck and claim a win | `web-perf` measures first, fixes the worst metric, proves the delta |
| Editing a core function | Blind change, unknown blast radius | `gitnexus` reports callers + risk before you touch it |
| Long session | Context rots, rules silently dropped, false progress | `session-guard` anchors rules, splits before corruption |
| External API call | One naked `fetch`, fails in prod | `error-resilience` adds retry + timeout + circuit breaker + fallback |
| Schema change | Demo-grade table that locks at 1M rows | `db-schema` designs queries-first, scale-safe migrations |

**Takeaway:** every skill converts a known failure mode into a default-good behavior. Reaching for them is the *fast* path, not the slow one — it removes rework, not adds ceremony.

---

## 2. How skills work here — access & invocation

### Where they live
```
.cursor/skills/<skill-name>/SKILL.md     ← the skill (read this, follow it)
.cursor/skills/<skill-name>/scripts/     ← runnable helpers (only some skills)
.cursor/skills/<skill-name>/*.md         ← reference files loaded on demand
```

### The three ways a skill activates

1. **Auto / contextual** — Most skills carry YAML frontmatter (`name` + `description`). The `description` *is* the trigger; when the task matches it, the skill is surfaced to you. Your job: **notice the match and follow the body.**
2. **Explicit / command** — Some are invoked by name or slash command (e.g. `/setup`, `/triage`, `/caveman`, `/learn`, `/caveman-commit`). Use these when the user types them or the situation in their description fits.
3. **Read-and-follow** — You can always `Read` any `SKILL.md` directly and execute its process. Do this the instant a skill applies — that's the whole mechanism.

> **Progressive disclosure:** Read the `SKILL.md` first. Only open its bundled `scripts/` or `*.md` reference files **when the body tells you to**. Don't preload everything.

### Skills that will NOT auto-trigger (you must invoke them deliberately)
`disable-model-invocation: true` — only run on explicit user request or when you consciously choose them:
- **`zoom-out`**, **`ubiquitous-language`**, **`teach`**, **`continual-learning`**, **`setup-matt-pocock-skills`**

### Command / slash-driven skills
`setup` (`/setup`) · `triage` (`/triage`) · `diagnose` (`/diagnose`) · `learn` (`/learn …`) · `handoff` · the whole **caveman** suite (`/caveman`, `/caveman-review`, `/caveman-commit`, `/caveman-compress`, `/caveman-stats`, `/caveman-help`) · `impeccable` (sub-commands: `craft`, `shape`, `critique`, `audit`, `polish`, `bolder`, `quieter`, …)

### Skills with runnable / bundled assets (open these when the body references them)
- **`impeccable`** — `scripts/` (context, palette, detector, live browser tooling) + ~28 `reference/*.md` command files
- **`skill-creator`** — `scripts/`, `agents/`, `eval-viewer/`, `references/`, `assets/`
- **`mcp-builder`** — `scripts/` (evaluation.py, connections.py) + `reference/` (4 docs)
- **`supabase-postgres-best-practices`** — `references/` (33 rule files)
- **`vercel-react-best-practices`** — ~70 `rules/*.md` + compiled `AGENTS.md`
- **`caveman-compress`** — Python `scripts/`; **`diagnose`** — `scripts/hitl-loop.template.sh`; **`git-guardrails-claude-code`** — `scripts/block-dangerous-git.sh`
- **`improve-codebase-architecture`** — LANGUAGE/INTERFACE-DESIGN/DEEPENING/HTML-REPORT refs; **`grill-with-docs`** — CONTEXT-FORMAT/ADR-FORMAT; **`prototype`** — LOGIC/UI; **`tdd`** — 5 refs; **`triage`** — AGENT-BRIEF/OUT-OF-SCOPE; **`teach`** — 4 format files

### The OSS-pipeline skills are special
`run-full-pipeline`, `decision-engine`, `discover-bounties`, `analyze-opportunity`, `competitive-intel`, `contribute-to-repo`, `track-contribution`, `achievement-engine`, `reinforcement-learning`, `default-guidelines` have **plain-markdown bodies (no frontmatter)** — they won't auto-surface. They are orchestrated by **`run-full-pipeline`** (or read directly), and they read `AGENTS.md` + `config/` + `intelligence/` and use `gh`/git. Start with `run-full-pipeline`.

---

## 3. The reflex map — situation → skill

This is your fast lookup. The moment a row matches, the named skill should already be in motion.

| The situation you're in | Reach for |
|---|---|
| About to write or modify code | `self-review` (after), `ai-debt-detector` (after AI-gen), `elite-execution-philosophy` (always) |
| About to claim "done / fixed / works" | `prove-it`, `verification-and-elegance` |
| Building something new or ambiguous | `grill` (or `grill-me`), then `workflow-orchestration` |
| A bug / failure / regression / CI red | `diagnose` (hard bugs) or `autonomous-bug-fixing` (senior-eng loop) |
| Complex task, 3+ steps | `workflow-orchestration` (plan first) + `task-management-loop` |
| Independent parallel sub-tasks | `subagent-strategy`, `dynamic-workflow` |
| Unfamiliar code area | `zoom-out`, `context-builder`, `gitnexus` |
| Before editing a core symbol | `gitnexus` (impact/blast radius) |
| Any UI / frontend work | `frontend-design`, `design-taste-frontend`, `ui-ux-pro-max`, `design-mode` (in-browser), `emil-design-eng` (motion) |
| "Make it faster" / perf | `web-perf` (measure-first), `vercel-react-best-practices`, `performance-security-devops` |
| Any external API / DB / job call | `error-resilience` |
| Schema / migration / data model | `db-schema`, `supabase-postgres-best-practices` |
| Any git operation | `git-workflow`; add `git-guardrails-claude-code` for hard safety |
| Turning context into a spec | `to-prd`, `spec-kit-driven-development` |
| Breaking work into tickets | `to-issues`, `request-refactor-plan` (refactors) |
| Reviewing a branch / PR | `review` (standards × spec), `caveman-review` (terse) |
| Reporting / filing bugs | `qa`, `triage` |
| Researching before building | `research-first-execution`, `mcp-conductor` |
| Documenting architecture | `arch-from-code`; improving it → `improve-codebase-architecture` |
| Session getting long / post-compaction | `session-guard`; switching tasks → `handoff` |
| Need to save tokens / be terse | `caveman` suite; delegate compressed → `cavecrew` |
| Writing prose / articles / docs | `writing-fragments` → `writing-shape`/`writing-beats` → `edit-article` |
| Building/finding/improving a skill | `skill-creator` / `write-a-skill` / `learn` / `agentskill-sh-review-skill` / `skill-forge` |
| Autonomous OSS contribution | `run-full-pipeline` (orchestrates the rest) |

---

## 4. Compound recipes — stack them

Single skills are the floor. These stacks are how strong work actually happens:

- **Build a feature** → `grill` (resolve unknowns) → `research-first-execution` (prior art) → `workflow-orchestration` (plan) → implement → `self-review` + `ai-debt-detector` → `prove-it`.
- **Fix a bug** → `diagnose` *or* `autonomous-bug-fixing` (root cause + repro) → `gitnexus` (blast radius) → fix + regression test → `prove-it`.
- **Refactor** → `zoom-out` (understand) → `improve-codebase-architecture` (find deepening) → `request-refactor-plan` (tiny commits) → `tdd` → `git-workflow`.
- **Ship a UI** → `design-taste-frontend`/`frontend-design` (direction) → `ui-ux-pro-max` (rules) → `emil-design-eng` (motion) → `consumer-product-improvement` (elevate) → `web-perf` (prove fast).
- **New data layer** → `db-schema` (queries-first) → `supabase-postgres-best-practices` → `error-resilience` (connections) → `prove-it`.
- **Contribute to OSS** → `run-full-pipeline` → (`discover-bounties` → `analyze-opportunity` → `competitive-intel` → `contribute-to-repo` → `track-contribution`).
- **Long/complex session** → `workflow-orchestration` + `task-management-loop` running throughout → `session-guard` watching health → `handoff` at the boundary.
- **Write an article** → `writing-fragments` (mine ideas) → `writing-shape` or `writing-beats` (assemble) → `edit-article` (tighten).

---

## 5. Scenario routing playbook

When the user says… → do this:

- **"Add X feature"** → `grill` first (don't assume), then the *Build a feature* recipe.
- **"It's broken / throwing / failing"** → `diagnose` (build the repro loop before touching code).
- **"Clean this up / it's messy"** → `zoom-out` → `improve-codebase-architecture`.
- **"Make this page beautiful"** → `design-taste-frontend` + `ui-ux-pro-max`; if they selected an element in-browser, `design-mode`.
- **"Is this done?" / "ship it"** → `prove-it` + `verification-and-elegance` before you answer.
- **"Review my changes"** → `review` (against a fixed point, standards × spec).
- **"Plan this out" / big ambiguous goal** → `workflow-orchestration` (enter plan mode) + `grill`.
- **"Write the PRD / tickets"** → `to-prd` → `to-issues`.
- **"Speed it up"** → `web-perf` (baseline → one fix → re-measure).
- **"Talk less / save tokens"** → `/caveman`.
- **"Find/install a skill for X"** → `/learn`; **"create one"** → `skill-creator` or `write-a-skill`.
- **Anything OSS-contribution-ish** → `run-full-pipeline`.
- **"I don't know this codebase"** → `context-builder` + `zoom-out` + `gitnexus`.

> Don't see an exact match? Pick the closest reflex-map row, read that `SKILL.md`, and follow it. Defaulting to a skill beats improvising.

---

## 6. Full catalog (all 88, by category)

Format: **`skill`** — when to reach for it · **WITH → WITHOUT** (the difference).

### A. Always-on quality reflexes
*Run these without being asked. They are the difference between senior and junior output.*

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **self-review** | After any code change | Catches own bugs/style/missed reqs silently → presents buggy first drafts |
| **prove-it** | Before any "done/fixed/works" claim | Runs evidence, shows output, then claims → false completions, wasted cycles |
| **ai-debt-detector** | After AI-generated code | Audits for swallowed errors, orphaned resources, hallucinated deps → hidden debt ships |
| **verification-and-elegance** | Before completion / commit / reviewing | Verifies + demands elegant, non-brittle design → "it works" hacky code stands |
| **elite-execution-philosophy** | Every task | Holds output to staff-engineer, production bar → settles for shallow/tutorial-grade work |
| **error-resilience** | Any external API/DB/job/IO call | Adds retry+backoff, timeout, circuit breaker, fallback, DLQ → one naked call that dies in prod |
| **session-guard** | Long sessions / after compaction | Anchors critical rules, splits before rot, re-reads source of truth → silent drift, false progress |

### B. Plan before you build

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **grill** | About to build/design anything non-trivial | Resolves every decision branch first → builds the wrong thing confidently |
| **grill-me** | User wants a lightweight stress-test | One-question-at-a-time interview to shared understanding → unexamined assumptions |
| **grill-with-docs** | Plan must align with domain model/ADRs | Checks claims vs glossary/code, updates CONTEXT.md/ADRs inline → terminology drift |
| **workflow-orchestration** | Non-trivial / 3+ step / architectural task | Auto-plans, verifies, re-plans on failure → jumps to code, pushes past failures |
| **dynamic-workflow** | Many independent pieces to fan out | Designs verified 10–100 parallel-subagent workflow → serial slog or unverified fan-out |
| **research-first-execution** | New domain / before a significant feature | Studies competitors, prior art, impact analysis first → assumption-driven design |
| **to-prd** | Turn current context into a spec | Publishes structured, seam-tested PRD to the tracker → ad-hoc unwritten requirements |
| **to-issues** | Break a plan into work | Independent vertical-slice tickets w/ deps → monolithic, un-grabbable tasks |
| **spec-kit-driven-development** | Significant feature/subsystem before code | PRD→TRD→ADR→plan with traceability → code-first, specs back-filled or drifting |
| **request-refactor-plan** | Planning a refactor | Tiny always-working commits filed as an issue → risky big-bang rewrite |
| **prototype** | Need to answer a design question fast | Throwaway logic/UI experiment yields a durable decision → premature commitment |
| **design-an-interface** | Designing an API/module shape | 3+ divergent designs compared ("design it twice") → ships the first idea unexamined |

### C. Debug, test & review

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **diagnose** | Hard bug / perf regression | Builds deterministic repro loop → ranked hypotheses → root cause → guess-and-check forever |
| **autonomous-bug-fixing** | Any bug/CI/test/build failure | Senior-eng loop: reproduce→evidence→root cause→fix→validate → symptom patches |
| **tdd** | Building/fixing test-first | Vertical red→green→refactor, behavior-tested → bulk "crap tests" coupled to impl |
| **review** | Reviewing a branch/PR since a point | Parallel standards×spec review, reported side-by-side → one axis masks the other |
| **qa** | User reports bugs conversationally | Files durable, user-language GitHub issues → vague or lost bug reports |
| **triage** | Managing the issue tracker | Drives issues through a labeled state machine → chaotic, unprioritized backlog |

### D. Understand the codebase & data

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **zoom-out** *(explicit)* | Unfamiliar code / need the big picture | Maps modules + callers in domain vocab → narrow line-reading misses the system |
| **context-builder** | New project / agent is jargon-confused | Builds CONTEXT.md glossary, speaks your domain → generic naming, verbose re-explanation |
| **ubiquitous-language** *(explicit)* | Need a canonical domain glossary | Writes DDD glossary, flags ambiguities → inconsistent terms across the project |
| **arch-from-code** | Document architecture | Diagrams traced from real imports/config → idealized, phantom-component diagrams |
| **improve-codebase-architecture** | Find refactor/deepening opportunities | HTML report of deep-module candidates + grilling → ad-hoc "make it cleaner" guesses |
| **gitnexus** | Before editing a symbol / impact Qs | Blast-radius + risk via call graph, safe rename → blind edits, find-replace renames |
| **db-schema** | Any schema/migration/data model | Queries-first, indexed, scale-safe migrations → demo schemas that lock at scale |

### E. Frontend, design & performance

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **frontend-design** | Build any UI / make it distinctive | Commits to a bold intentional aesthetic → Inter + purple gradient AI slop |
| **design-taste-frontend** | Landing/portfolio/marketing/redesign | Brief-inferred dials, real images, banned AI tells → templated centered-hero clichés |
| **ui-ux-pro-max** | Plan/build/review any UI | Enforces contrast, touch targets, focus rings, motion timing → generic CRUD aesthetic |
| **impeccable** | Production UI via command system | Context-aware craft/critique/audit/polish loop → first-draft on-the-nose design |
| **design-mode** | User selects/annotates element in-browser | Minimal scoped edit to exactly that element → refactors whole component, breaks a11y |
| **emil-design-eng** | Component feel / animation decisions | Custom easing, sub-300ms, transform/opacity only → `transition:all`, janky layout animation |
| **ai-native-product-thinking** | Designing features / roadmap review | Evaluates where AI genuinely helps → AI bolted on as a gimmick (or ignored) |
| **consumer-product-improvement** | After an implementation pass | Stress-tests across 5 personas, adds delight → ships emotionally flat, "it works" UI |
| **web-perf** | Slow page / LCP/INP/CLS/bundle | Measure → fix worst → re-measure with proof → guesses, optimizes non-bottlenecks |
| **vercel-react-best-practices** | React/Next perf work | Applies 70 rules: no waterfalls, smaller bundles → re-renders, oversized bundles |

### F. Execution infra: git, setup, orchestration

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **git-workflow** | Any git operation | Atomic conventional commits, clean PRs <400 LOC → "update stuff" unreviewable blobs |
| **git-guardrails-claude-code** | Want hard protection from destructive git | Hook blocks push/reset --hard/clean before run → agent can nuke the repo |
| **setup-pre-commit** | Add commit-time quality gates | Husky + lint-staged + typecheck + test → unformatted/broken code gets committed |
| **setup-matt-pocock-skills** *(explicit)* | Before to-issues/to-prd/triage/diagnose/tdd | Records tracker, labels, domain docs for those skills → they guess and duplicate |
| **setup** | First-time skill-forge config (`/setup`) | Personalizes discovery/publishing to the user → generic, can't publish, duplicates |
| **performance-security-devops** | Infra/prod-readiness/hardening | Enforces perf budgets, security baseline, deploy criteria → unbounded, insecure, unobservable |
| **supabase-postgres-best-practices** | Postgres/Supabase queries/schema/config | Battle-tested prioritized rules w/ EXPLAIN → generic SQL missing indexes/pooling/RLS |
| **migrate-to-shoehorn** | Replace `as` casts in tests | `fromPartial/fromAny` type-safe partials → brittle manual double-casts |
| **scaffold-exercises** | Create course exercise structure | Lint-passing dash-case scaffold → structurally invalid exercises |
| **mcp-builder** | Build an MCP server | Spec-grounded tools + eval harness → ad-hoc weak-schema untested tools |
| **mcp-conductor** | Task needs 2+ data sources | Chains Exa→Bright Data→GitHub→files, cross-cited → shallow single-source answers |
| **subagent-strategy** | 2+ independent threads / context pollution | Aggressive parallel specialized delegation → bloated main context, serial work |
| **task-management-loop** | Any non-trivial work | Persists todo.md + lessons.md (mistakes→rules) → ad-hoc, untracked, repeated mistakes |
| **handoff** | Switching tasks / ending a session | Compact handoff doc + suggested skills for next agent → lost context on continuation |

### G. Autonomous OSS contribution pipeline
*Plain-markdown, orchestrated. Start at `run-full-pipeline`.*

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **run-full-pipeline** | Run an autonomous contribution cycle | Orchestrates all phases w/ monitoring + sync → ad-hoc, untracked, unsynced steps |
| **decision-engine** | Start/end of each run; "what next?" | Weighs acceptance, diversification, ROI → aimlessly iterates on the easiest thing |
| **discover-bounties** | Fresh-discovery mode | Targets proven-merge repos, filters scams → chases noise and unmergeable issues |
| **analyze-opportunity** | Before forking any repo (hard gate) | Aborts on gated/internal-only, learns conventions → wastes effort, contributes blind |
| **competitive-intel** | A contested issue is selected | Learns why rival PRs failed, ships superior → repeats rejected mistakes |
| **contribute-to-repo** | Implementing the contribution | Matches conventions, tests/lint, review gate → convention-violating rejected PRs |
| **track-contribution** | After a PR / status change | Logs PR, dashboards, earnings, learnings → progress and intelligence lost |
| **achievement-engine** *(toggle)* | When achievements enabled in config | Routes contributions to advance profile badges → progress left to chance |
| **reinforcement-learning** | Before discovery/contribution; after outcomes | Adapts weights from real outcomes → never learns, repeats low-yield choices |
| **default-guidelines** | Contributing to any repo | Baseline OSS etiquette + safe git hygiene → template-skipping, destructive force-pushes |

### H. Writing & knowledge

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **writing-fragments** | Develop ideas before structure | Mines heterogeneous fragments via interview → premature outlining of raw thoughts |
| **writing-shape** | Turn raw notes into an article | Grows it block-by-block, debating format → one batch draft, no opening choice |
| **writing-beats** | Assemble prose as a narrative | Choose-your-own-adventure beat-by-beat → whole piece drafted with no pivots |
| **edit-article** | Revise an existing draft | Dependency-ordered restructure + clarity pass → ad-hoc line edits, no structure |
| **teach** *(explicit)* | User wants to learn a topic here | Stateful lessons grounded in their mission → abstract ungrounded answers |
| **obsidian-vault** | Manage notes in the Obsidian vault | Follows vault conventions, wikilinks, indexes → notes ignore structure |

### I. Token efficiency — the Caveman suite

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **caveman** | Need terse output / save tokens (`/caveman`) | ~75% fewer tokens, accuracy intact → verbose default English |
| **caveman-review** | Terse PR review | One-line-per-finding `L#: sev: problem. fix.` → hedged review paragraphs |
| **caveman-commit** | Lean commit message | Conventional Commit, ≤50-char subject → verbose what-focused messages |
| **caveman-compress** | Shrink a memory/CLAUDE.md file | Script compresses prose, keeps code safe + backup → no code-safe compression |
| **caveman-stats** | Check token usage (`/caveman-stats`) | Exact logged token + savings via hook → no stats or unreliable guess |
| **caveman-help** | Forget caveman commands | Instant full reference card → recall from memory |
| **cavecrew** | Deciding whether to delegate compressed | Routes to compressed subagents, ~60% less context → verbose agents exhaust context |

### J. Skill meta & self-improvement

| Skill | Use when | WITH → WITHOUT |
|---|---|---|
| **skill-forge** | Find/create/improve/route/ship skills | Discover→validate-against-best→compound→self-check pipeline → narrow unvalidated skills |
| **skill-creator** | Author a skill with rigor | Draft→eval→benchmark→iterate→package + viewer → one-pass unverified draft |
| **write-a-skill** | Author a skill lightweight | Requirements→draft→review w/ good triggers → ad-hoc file missing triggers |
| **learn** | Find/install skills (`/learn …`) | Searches/installs/rates from agentskill.sh marketplace → no discovery pipeline |
| **agentskill-sh-review-skill** | Audit a SKILL.md | 10-dimension score + before/after rewrites → subjective unstructured feedback |
| **diegosouzapw-agent-orchestration-improve-agent-v2** | Improve an existing agent (has metrics) | Baseline→A/B→staged rollout methodology → ad-hoc prompt tweaks, no rollback |
| **diegosouzapw-skill-improver-v2** | Iterate a skill to standard | Review→fix→re-verify loop w/ hard stop marker → one-pass edits, no verification |
| **egbertie-xiucheng-self-improving-agent** | Track agent improvement over time | Scores conversations, logs lessons, weekly reports → no structured reflection |
| **continual-learning** *(explicit)* | Mine prior chats / maintain AGENTS.md | Delegates to agents-memory-updater safely → uncontrolled direct memory edits |

---

## 7. Anti-patterns — you are skipping skills (STOP)

- Writing code, then presenting it → you skipped **self-review**. Review *before* showing.
- Saying "done / should work" with no command output → you skipped **prove-it**. Run it.
- Fixing a bug by changing several things at once → you skipped **diagnose**. Build a repro loop.
- Starting to build from a vague ask → you skipped **grill**. Resolve decisions first.
- A UI that looks like every other AI UI → you skipped the **design** skills. Commit to a direction.
- Editing a hot function blind → you skipped **gitnexus**. Check blast radius.
- 50+ tool calls and quality slipping → you skipped **session-guard**. Checkpoint and recite rules.
- Optimizing without a baseline → you skipped **web-perf**. Measure first.
- "I'll keep the skill in mind" → that's skipping it. **Read the `SKILL.md` and follow it now.**

---

## 8. Alphabetical quick index

`achievement-engine` · `agentskill-sh-learn` (learn) · `agentskill-sh-review-skill` · `ai-debt-detector` · `ai-native-product-thinking` · `analyze-opportunity` · `arch-from-code` · `autonomous-bug-fixing` · `caveman` · `caveman-commit` · `caveman-compress` · `caveman-help` · `caveman-review` · `caveman-stats` · `cavecrew` · `competitive-intel` · `consumer-product-improvement` · `context-builder` · `continual-learning` · `contribute-to-repo` · `db-schema` · `decision-engine` · `default-guidelines` · `design-an-interface` · `design-mode` · `design-taste-frontend` · `diagnose` · `diegosouzapw-agent-orchestration-improve-agent-v2` · `diegosouzapw-skill-improver-v2` · `discover-bounties` · `dynamic-workflow` · `edit-article` · `egbertie-xiucheng-self-improving-agent` · `elite-execution-philosophy` · `emil-design-eng` · `error-resilience` · `frontend-design` · `git-guardrails-claude-code` · `git-workflow` · `gitnexus` · `grill` · `grill-me` · `grill-with-docs` · `handoff` · `impeccable` · `improve-codebase-architecture` · `mcp-builder` · `mcp-conductor` · `migrate-to-shoehorn` · `obsidian-vault` · `performance-security-devops` · `prototype` · `prove-it` · `qa` · `reinforcement-learning` · `request-refactor-plan` · `research-first-execution` · `review` · `run-full-pipeline` · `scaffold-exercises` · `self-review` · `session-guard` · `setup` · `setup-matt-pocock-skills` · `setup-pre-commit` · `skill-creator` · `skill-forge` · `spec-kit-driven-development` · `subagent-strategy` · `supabase-postgres-best-practices` · `task-management-loop` · `tdd` · `teach` · `to-issues` · `to-prd` · `track-contribution` · `triage` · `ubiquitous-language` · `ui-ux-pro-max` · `verification-and-elegance` · `vercel-react-best-practices` · `web-perf` · `workflow-orchestration` · `write-a-skill` · `writing-beats` · `writing-fragments` · `writing-shape` · `zoom-out`

> **88 skills. The right one is almost always cheaper than not using it. Reach for them — enthusiastically, by default, in every scenario.**
