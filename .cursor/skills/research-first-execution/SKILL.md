---
name: research-first-execution
description: Research-first execution methodology. Before implementing any significant feature, researches competitors, benchmarks UX patterns, analyzes architecture strategies, studies relevant products, and validates assumptions. Integrates GitNexus impact analysis before editing symbols. Use before starting any non-trivial feature, when entering a new domain, or when architectural decisions are required.
---

# Research-First Execution

## The Rule

Before implementing any significant feature:

1. Research competitors and existing solutions
2. Benchmark UX patterns in the domain
3. Analyze architecture strategies
4. Study relevant products
5. Validate assumptions with evidence

## Research Goals

- Better UX through pattern analysis
- Architectural optimization from prior art
- Workflow improvements from competitor study
- Interaction patterns from best-in-class products
- Scalability ideas from production systems
- Implementation best practices from documentation

## Research Process

### Phase 1 — Landscape Analysis

- Identify 3–5 competitors or similar products
- Note their architectural choices
- Document UX patterns that work well
- Identify gaps and opportunities

### Phase 2 — Technical Research

- Review relevant documentation
- Study library/framework best practices
- Analyze performance characteristics
- Identify potential pitfalls

### Phase 3 — Synthesis

- Combine findings into actionable recommendations
- Prioritize by impact and feasibility
- Document decisions and rationale
- Create implementation plan based on research

## Research Tooling

| Need | Tool |
|------|------|
| Live web search | `WebSearch` / Exa / Bright Data SERP |
| Documentation fetch | `WebFetch` / Bright Data scrape |
| Parallel research | `Task` with `subagent_type: "web-researcher"` |
| Browser automation | `browser-use` subagent / `cursor-ide-browser` MCP |
| Competitor UI capture | `cursor-ide-browser` `browser_take_screenshot` |

## Knowledge Graph Integration

Before editing any non-trivial symbol, run impact analysis. See the `gitnexus` skills (`gitnexus-impact-analysis`, `gitnexus-exploring`) for full workflows.

Minimum protocol:

```text
gitnexus_impact({ target: "symbolName", direction: "upstream" })
```

Report blast radius (direct callers, affected processes, risk level) before proceeding. Warn the user on HIGH or CRITICAL risk.

Before committing:

```text
gitnexus_detect_changes()
```

Verify changes only affect expected symbols and execution flows.

## Design Inspiration Sources

| Source | Domain |
|--------|--------|
| Linear | Project management, fast keyboard UX |
| Vercel | Developer platform, dashboard density |
| Stripe | Developer docs, payments UX |
| Apple | Consumer hardware/software fit |
| Arc Browser | Browser innovation, command palettes |
| Notion | Productivity, block composition |
| Raycast | Launchers, keyboard-first |
| GitHub | Collaboration, code surfaces |
| Airbnb | Marketplace, trust UX |
| Modern fintech / AI-native | Polished surface bar |

## Anti-Patterns

- Implementing without checking prior art
- Reinventing patterns that established products already perfected
- Editing core symbols without impact analysis
- Assumption-driven design (no evidence)
