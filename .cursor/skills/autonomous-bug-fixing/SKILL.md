---
name: autonomous-bug-fixing
description: Autonomous senior-engineer bug fixing workflow. Investigates independently, inspects logs, traces root causes, reproduces issues, fixes thoroughly, and validates correctness — without asking for unnecessary guidance. Use whenever encountering bugs, failing builds, broken UX, CI failures, test failures, regressions, or any unexpected behavior. Operates the way a staff engineer would: hypothesis-driven, evidence-driven, root-cause-driven.
---

# Autonomous Bug Fixing

## Philosophy

When given a bug, failing build, broken UX, CI failure, or regression: **do NOT ask for guidance**. Investigate independently and fix thoroughly. Operate like an autonomous senior engineer.

## The 6-Step Loop

### 1. Reproduce

Get the failure to happen locally / in a known environment before changing anything.

- Run the failing test, command, or user flow
- Capture exact error message, stack trace, logs
- If not reproducible, that IS the bug — solve reproducibility first

### 2. Inspect Evidence

Read the actual evidence — never assume.

| Source | What to look at |
|--------|----------------|
| Test failure | Full stack trace, assertion message, fixture state |
| Build failure | Compiler/linker output, dependency resolution |
| Runtime error | Logs, structured metrics, request/response capture |
| CI failure | The check's logs (use `gh run view --log-failed` or `ci-investigator` subagent) |
| UX bug | Browser DevTools (network, console), `cursor-ide-browser` screenshot |
| Performance | Profile output, flamegraph, slow query log |

### 3. Hypothesize

State the suspected root cause in one sentence. If you have multiple hypotheses, rank them by probability and cost-to-test.

**Avoid:** "let me just try changing this and see". That is guess-and-check, not debugging.

### 4. Trace to Root Cause

- Use `gitnexus_query` and `gitnexus_context` to navigate the call graph
- Use `gitnexus_impact({ target, direction: "upstream" })` to find every caller affected
- Read the actual code path — don't trust assumed behavior
- For data bugs: dump the actual values at the point of failure

**Never** apply a fix that doesn't have a named root cause.

### 5. Fix at the Root

Fix the underlying problem, not the symptom.

| Symptom Fix (BAD) | Root Cause Fix (GOOD) |
|-------------------|----------------------|
| Add a null check that hides the real issue | Find why the value is null and fix upstream |
| Wrap in try/except to silence the error | Fix the condition that raises it |
| Bump timeout to 30s because it flakes | Find the actual slow operation and fix it |
| Sleep before assertion | Wait for the deterministic signal |

### 6. Validate

Prove the fix works AND nothing else broke.

- [ ] Re-run the original reproduction — confirm it passes
- [ ] Run the full test suite — confirm no regressions
- [ ] Run lint / type-check — confirm no new errors
- [ ] If UI: visually verify the fixed flow
- [ ] If performance: re-measure
- [ ] Add a regression test that would have caught the original bug

## When To Delegate to Subagents

- **CI failures** — `Task` with `subagent_type: "ci-investigator"`
- **Unfamiliar subsystem** — `Task` with `subagent_type: "explore"` first
- **Broad investigation** — `Task` with `subagent_type: "generalPurpose"` to gather evidence

## Anti-Patterns

- Asking the user "what should I try?" before investigating
- Applying multiple speculative changes at once (can't isolate which fixed it)
- Catching/silencing the error instead of fixing the cause
- Skipping the regression test ("I'm sure it won't happen again")
- Marking the fix complete without re-running the original reproduction
- Disabling the failing test instead of fixing the underlying behavior

## Report Format

When reporting a fix to the user:

```
**Root cause:** <one-sentence cause>
**Fix:** <what changed and why>
**Files:** <comma-separated paths>
**Verification:**
- <test command> → <result>
- <lint command> → <result>
- <regression test added>: <path>
```
