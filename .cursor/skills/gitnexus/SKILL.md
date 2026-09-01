---
name: gitnexus
description: GitNexus code intelligence — impact analysis, change detection, symbol exploration, knowledge graph queries, and safe refactoring. Indexes the repository as nodes/edges/execution-flows. Use before editing any function/class/method (impact analysis), before committing (change detection), when exploring unfamiliar code, when renaming/refactoring symbols, when debugging unfamiliar bugs, or when the user asks "how does X work" / "what depends on Y" / "is it safe to change Z".
---

# GitNexus — Code Intelligence

GitNexus indexes the repository into a knowledge graph (symbols, relationships, execution flows) and exposes MCP tools for impact analysis, exploration, and safe refactoring.

This project is indexed as **NightmareNet** (2280 symbols, 4080 relationships, 78 execution flows).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method:

  ```text
  gitnexus_impact({ target: "symbolName", direction: "upstream" })
  ```

  Report blast radius (direct callers, affected processes, risk level) to the user.

- **MUST run `gitnexus_detect_changes()` before committing** to verify changes only affect expected symbols and execution flows.

- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding.

- When exploring unfamiliar code, prefer `gitnexus_query({ query: "concept" })` over grep. It returns process-grouped results ranked by relevance.

- For full context on a specific symbol (callers, callees, flows it participates in), use `gitnexus_context({ name: "symbolName" })`.

## Never Do

- Edit a function/class/method without first running `gitnexus_impact`.
- Ignore HIGH or CRITICAL risk warnings from impact analysis.
- Rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- Commit changes without running `gitnexus_detect_changes()`.

## Common Workflows

### Exploring "How does X work?"

```text
gitnexus_query({ query: "X" })          # find relevant execution flows
gitnexus_context({ name: "topSymbol" }) # callers/callees/flows
```

### Impact Analysis Before Editing

```text
gitnexus_impact({ target: "sym", direction: "upstream" })   # who uses sym?
gitnexus_impact({ target: "sym", direction: "downstream" }) # what does sym use?
```

Report: direct callers, transitive blast radius, affected execution flows, risk level (LOW / MEDIUM / HIGH / CRITICAL).

### Safe Rename

```text
gitnexus_rename({ from: "oldName", to: "newName", scope: "symbolKind" })
```

NEVER use find-and-replace for symbol renames.

### Pre-Commit Verification

```text
gitnexus_detect_changes()
```

Confirm only the expected symbols and execution flows are affected.

### Debugging an Error

```text
gitnexus_query({ query: "error keyword or function name" })
gitnexus_context({ name: "suspectSymbol" })
```

Trace the execution flow to the actual fault location.

## Index Freshness

If any tool warns the index is stale, run:

```bash
npx gitnexus analyze
```

To check status:

```bash
npx gitnexus status
```

## MCP Resources

| Resource | Use For |
|----------|---------|
| `gitnexus://repo/NightmareNet/context` | Codebase overview, check index freshness |
| `gitnexus://repo/NightmareNet/clusters` | All functional areas |
| `gitnexus://repo/NightmareNet/processes` | All execution flows |
| `gitnexus://repo/NightmareNet/process/{name}` | Step-by-step execution trace |

## Risk Reporting Template

When reporting impact analysis to the user:

```
gitnexus_impact on `symbolName`:
- Direct callers: N
- Affected execution flows: F
- Risk level: LOW | MEDIUM | HIGH | CRITICAL
- Notes: <unusual cross-module dependencies, public API surface, etc.>
```

If HIGH or CRITICAL, pause and confirm before proceeding.
