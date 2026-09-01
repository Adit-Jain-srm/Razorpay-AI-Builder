---
name: verification-and-elegance
description: Verification before completion and demand for elegance. Never marks work complete without proof — tests, logs, flows, UX validation, architecture integrity. Requires staff-engineer-level approval standard. Demands elegant solutions and redesigns hacky, repetitive, brittle, or tightly-coupled code. Use before claiming any task done, before commits, and when reviewing any non-trivial implementation.
---

# Verification Before Completion

## The Rule

**NEVER mark work complete without proof.**

## Verification Checklist

Before claiming completion:

- [ ] Run tests (unit + integration)
- [ ] Inspect logs for errors/warnings
- [ ] Verify user flows end-to-end
- [ ] Validate UX is polished and responsive
- [ ] Confirm architecture integrity
- [ ] Demonstrate correctness with evidence

## The Staff Engineer Test

Always ask:

> "Would a staff engineer approve this implementation?"

If the answer is no, keep iterating.

## Verification Matrix

| Type | When |
|------|------|
| Unit tests | Every function/module change |
| Integration tests | Cross-module changes |
| UI validation | Any frontend change |
| Performance checks | Data-heavy or latency-sensitive code |
| API validation | Endpoint changes |
| Security review | Auth, data handling, secrets |
| Accessibility review | UI components |
| Regression analysis | Refactors or bug fixes |

## Comparison Requirements

For any significant change, compare:

- Old behavior vs new behavior
- Architectural tradeoffs
- Scalability implications
- Performance impact

## No Fake Completion

Never:

- Claim "done" without running tests
- Skip lint checks
- Ignore failing tests
- Assume it works without proof
- Mark tasks complete without demonstration

---

# Demand Elegance

## The Pause

For any non-trivial implementation, pause and ask:

> "Is there a more elegant solution?"

## Redesign Triggers

If the solution feels:

- **Hacky** — quick fix that creates tech debt
- **Repetitive** — violates DRY without justification
- **Brittle** — breaks with minor changes
- **Tightly coupled** — changes cascade unpredictably
- **Hard to scale** — hits walls at 10x load

then **redesign it properly**.

## Prioritize

1. Elegant abstractions
2. Maintainable systems
3. Modularity and composability
4. Simplicity over cleverness
5. Balanced engineering judgment

## Avoid Over-Engineering

Simple problems deserve simple solutions. Reserve complexity for genuinely complex domains. Elegance ≠ over-abstraction.
