---
name: subagent-strategy
description: Aggressive subagent delegation strategy. Uses subagents to isolate context, reduce cognitive overload, parallelize research, and specialize execution. Delegates research, debugging, architecture analysis, dependency exploration, performance analysis, UX research, codebase exploration, security reviews, documentation, and verification tasks. Use whenever a task has 2+ independent threads, requires deep research, or would pollute main context with exploration work.
---

# Subagent Strategy

## Philosophy

Use subagents **aggressively** via the `Task` tool. They exist to:

- Isolate context (keep main thread clean)
- Reduce cognitive overload
- Parallelize research
- Specialize execution

## When to Delegate

### Always Delegate

| Task Type | Subagent Responsibility |
|-----------|------------------------|
| Research | Competitive analysis, library comparison, best practices |
| Debugging | Log analysis, root cause investigation, reproduction |
| Architecture | Pattern analysis, dependency mapping, design review |
| Dependencies | Version compatibility, security audit, alternatives |
| Performance | Profiling, bottleneck identification, optimization paths |
| UX Research | Competitor UI patterns, accessibility audit, usability |
| Codebase Exploration | File discovery, symbol tracing, flow understanding |
| Security | Vulnerability scanning, auth review, secrets audit |
| Documentation | API docs, architecture diagrams, README updates |
| Verification | Test execution, lint checks, build validation |

### Delegation Rules

1. **One focused responsibility per subagent** — no multi-purpose agents
2. **Keep main context clean** — offload tangential work
3. **Use parallel compute** — launch independent subagents in a single message with multiple `Task` calls
4. **Aggregate findings intelligently** — synthesize results, don't dump raw output

## Subagent Selection

| `subagent_type` | Use For |
|----------------|---------|
| `explore` | Read-only codebase exploration, file discovery, "how does X work?" |
| `generalPurpose` | Multi-step research, complex investigations |
| `shell` | Git/command execution sequences |
| `web-researcher` | Deep external research with citations |
| `ci-investigator` | Failing PR check root-cause |
| `best-of-n-runner` | Parallel attempts in isolated worktrees |

## Prompt Patterns

### Research Subagent

```
Research [topic]. Answer: [specific questions].
Return: summary, recommendations, evidence/links.
Do NOT write code. Research only.
```

### Exploration Subagent

```
Explore the codebase for [concept]. Find all files related to [X].
Return: file paths, key functions, data flow summary.
Thoroughness: [quick | medium | very thorough]
```

### Verification Subagent

```
Verify [implementation]. Run tests, lint, validate [specific concern].
Return: pass/fail status, error details, suggested fixes.
```

## Complex Systems

For complex systems with many moving parts:

- Increase parallel analysis depth
- Use 3-5 subagents simultaneously
- Each covers a different subsystem or concern
- Synthesize in main thread

## Anti-Patterns

- Using one subagent for everything
- Duplicating main context into subagent
- Sequential subagent calls when parallel is possible
- Ignoring subagent findings
- Over-delegating trivial tasks (< 30 seconds of work)
