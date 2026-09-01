---
name: dynamic-workflow
description: >-
  Design and orchestrate Claude Code dynamic workflows — the new multi-agent
  system that fans out 10-100 subagents in parallel with verification. Teaches
  when to use workflows vs single-agent, how to structure fan-out/fan-in patterns,
  and how to build verification gates. Use when tackling complex tasks that benefit
  from parallel research, multi-perspective analysis, or divide-and-conquer
  strategies. Also use when user says workflow, fan out, parallel agents, deep
  research, multi-agent, or wants to break a big task into verified parallel pieces.
---

# Dynamic Workflows

## Overview

Claude Code can now spawn 10-100 subagents in parallel, each working on a piece of a complex task, with verification before synthesis. This skill teaches you when and how to use this effectively.

## When to Use (vs Single Agent)

| Task Type | Use Dynamic Workflow? | Why |
|-----------|----------------------|-----|
| Simple code fix | NO | One agent is enough. Overhead not worth it. |
| Research with multiple sources | YES | Fan out searches, verify in parallel, synthesize |
| Code review across large PR | YES | Each agent reviews one file/component |
| Architecture comparison | YES | Each agent deeply analyzes one option |
| Content generation with fact-checking | YES | Generate + verify adversarially in parallel |
| Debugging intermittent issue | MAYBE | Fan out hypotheses, each agent tests one |

**Rule of thumb:** If you'd naturally say "I need to look at this from 5 different angles" — use a workflow. If it's sequential (step A must finish before B starts) — don't.

## Process

Follow this pattern for every dynamic workflow:

## The Pattern

```
1. DECOMPOSE — break the task into independent parallel pieces
2. FAN OUT — spawn one subagent per piece (10-100)
3. EXECUTE — each agent works independently with its own context
4. VERIFY — adversarial checking of results (catch hallucinations)
5. SYNTHESIZE — combine verified results into final output
```

## Designing Good Workflows

### Fan-Out Rules

Each parallel piece must be:
- **Independent** — doesn't need results from another piece
- **Bounded** — clear scope, defined deliverable
- **Verifiable** — output can be checked against source material

```
GOOD fan-out: "Research X from 5 different source types"
  → Agent 1: academic papers on X
  → Agent 2: industry blog posts on X
  → Agent 3: GitHub implementations of X
  → Agent 4: community discussions about X
  → Agent 5: competitor products using X

BAD fan-out: "Build the auth system"
  → Why bad? Steps are sequential (design → implement → test), not parallel
```

### Verification Gates

After fan-out, BEFORE synthesis:

```
For each agent's output:
  1. Does it cite sources? (not hallucinated)
  2. Do the sources actually say what's claimed? (verify against original)
  3. Does it contradict another agent's findings? (flag conflicts)
  4. Is it within scope? (didn't drift to adjacent topics)
```

### Synthesis Patterns

```
RESEARCH synthesis:
  - Group findings by theme
  - Highlight agreements (multiple sources confirm)
  - Flag contradictions (sources disagree — present both sides)
  - Rank by source quality (peer-reviewed > blog post)

COMPARISON synthesis:
  - Matrix table (features × options)
  - Clear winner per dimension
  - Weighted recommendation based on user's priorities

CODE REVIEW synthesis:
  - Critical issues (must fix) from all agents
  - Suggestions (should fix) ranked by severity
  - Praise (patterns to keep) for morale
```

## Anti-Patterns

- **Too many agents for simple task** — 100 agents researching "how to add a button" = waste
- **Sequential work disguised as parallel** — if agent 3 needs agent 2's output, it's not parallel
- **No verification** — fan-out without checking = fan-out hallucinations at scale
- **Vague decomposition** — "research this broadly" gives unfocused results. Be SPECIFIC per agent.
- **Synthesizing without conflict resolution** — if two agents contradict, you must resolve, not average

## Example: Deep Research Workflow

```
Task: "Research how top companies implement feature flags in 2026"

Decomposition:
  Agent 1: Search academic/technical papers on feature flag architectures
  Agent 2: Scrape LaunchDarkly, Split.io, Flagsmith docs for patterns
  Agent 3: Find GitHub repos with >1K stars that implement feature flags
  Agent 4: Search for post-mortems about feature flag failures
  Agent 5: Find blog posts from companies (Netflix, Uber, Airbnb) about their systems

Verification:
  - Cross-check: if Agent 2 says "LaunchDarkly uses X architecture" and Agent 3 finds their open-source code showing Y — flag the contradiction
  - Source check: does the cited blog actually exist and say what's claimed?

Synthesis:
  - Pattern matrix: which architectures are most common
  - Trade-off table: complexity vs flexibility vs performance
  - Recommendation: based on user's team size and scale
```

## Persistence

ACTIVE when facing complex tasks. Before decomposing a complex request into sequential steps, FIRST ask: "Could pieces of this run in parallel instead?" If yes — design the workflow.
