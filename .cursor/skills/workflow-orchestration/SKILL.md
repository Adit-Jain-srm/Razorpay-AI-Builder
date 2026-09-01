---
name: workflow-orchestration
description: Plan-mode-first execution and workflow orchestration. Automatically enters PLAN mode for non-trivial tasks (3+ implementation steps, architectural decisions, infrastructure planning, scalability concerns, multiple modules, integrations, complex workflows, or UX systems). Generates detailed execution plans, risks, dependencies, verification strategies. Stops and re-plans on failure. Use when starting any non-trivial task, before touching code, or when work behaves unexpectedly.
---

# Workflow Orchestration

## The Default Execution Loop

For ANY non-trivial task:

> **Research → Think → Plan → Build → Test → Verify → Validate → Reflect → Improve → Repeat**

Never stop at "it works." Iterate until the solution feels **elegant, scalable, intuitive, consumer-grade, and genuinely delightful**. Every iteration should improve UX, performance, architecture, clarity, reliability, or user satisfaction.

| Step | Output |
|------|--------|
| Research | Competitor scan, prior art, modern UX patterns, constraints |
| Think | Architecture options, tradeoffs, "is there a more elegant solution?" |
| Plan | `tasks/todo.md` with milestones, risks, verification strategy |
| Build | Atomic-per-logical-change commits, conventional commit messages |
| Test | Unit + integration + edge cases — written before or with the code |
| Verify | Run tests, lint, type-check, UX walkthrough, regression check |
| Validate | "Would real users at scale love this?" Accessibility, perf, security |
| Reflect | What worked, what didn't, what felt weak, what introduced risk |
| Improve | Refactor weak areas, redesign hacky paths, polish UX |
| Repeat | Next iteration — never accept first-pass quality as final |

After every correction from the user, append a lesson to `tasks/lessons.md` (see `task-management-loop` skill). Never repeat the same mistake twice.

## Plan Mode Default

For ANY non-trivial task, enter PLAN mode first (call `SwitchMode` with `target_mode_id: "plan"`).

### What Is Non-Trivial?

A task is non-trivial if it includes any of:

- 3+ implementation steps
- Architectural decisions
- Infrastructure planning
- Scalability concerns
- Multiple modules
- External integrations
- Complex workflows
- UX systems design

### Plan Contents

Before implementation, generate:

1. **Detailed execution plan** — ordered steps with file/symbol targets
2. **Risk identification** — what can fail, what's unknown
3. **Dependency mapping** — internal/external blockers
4. **Verification strategies** — how each step will be proven
5. **Architecture decisions with rationale** — ADRs for non-trivial choices

### Failure Protocol

If anything fails or behaves unexpectedly:

1. **STOP immediately**
2. Re-evaluate assumptions
3. Re-plan before continuing
4. Do NOT continue blindly

### Plan Mode Applies To

Implementation, debugging, verification, optimization, refactoring, deployment, testing.

Always reduce ambiguity upfront.

## Task File Convention

Maintain `tasks/todo.md` as the single source of truth for current work. See `task-management-loop` skill for the full format and lifecycle.

## Output Deliverables For Significant Features

Before implementation of significant features, generate:

- PRD (Product Requirements Document)
- TRD (Technical Requirements Document)
- Architecture diagrams (Mermaid)
- UX flows
- System flows
- Database schemas
- API contracts
- Folder structures
- Component inventories
- Deployment architecture
- Sprint plans
- Technical risk analysis
- Verification strategies

Then implement iteratively, validate thoroughly, and continuously improve.

## Anti-Patterns

- Jumping into code without a plan
- Continuing past a failure instead of re-planning
- Treating "I think I know what to do" as sufficient planning
- Skipping risk analysis on infrastructure or architecture changes
