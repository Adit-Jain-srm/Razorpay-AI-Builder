---
name: task-management-loop
description: Task management and self-improvement loop using tasks/todo.md (checkable items, milestones, risks, verification, rollout) and tasks/lessons.md (mistake → cause → prevention → future rule after every user correction). Use at the start of any non-trivial work (create/update todo.md), during work (mark progress, add notes), at completion (verification evidence, lessons learned, remaining debt), and after ANY user correction (append to lessons.md).
---

# Task Management Loop

## Two Files, One Loop

| File | Purpose |
|------|---------|
| `tasks/todo.md` | Active plan — checkable tasks, milestones, risks, verification |
| `tasks/lessons.md` | Permanent memory — every user correction becomes a rule |

## tasks/todo.md Format

```markdown
# <Feature / Workstream Name>

## Milestones
- [ ] M1 — <architectural milestone>
- [ ] M2 — <architectural milestone>

## Tasks
### M1
- [ ] T1.1 — <atomic task> · file: `path/to/file.py`
- [ ] T1.2 — <atomic task> · depends: T1.1
- [ ] T1.3 — verify: `pytest tests/foo -v`

## Risks
- R1 — <risk> · mitigation: <strategy>

## Verification
- [ ] All tests pass: `pytest tests/`
- [ ] Lint clean: `ruff check .`
- [ ] Frontend build: `npm run build`

## Rollout
1. Land behind feature flag
2. Validate in staging
3. Enable in prod with monitoring

---

## Notes
<implementation notes, decisions, surprises>

## Review Summary
<at completion: what shipped, verification evidence, lessons, debt>
```

## During Work

- Mark items `[x]` immediately upon completion (do not batch)
- Add implementation notes inline under the relevant task
- If approach changes, append a "Decision:" note explaining why
- Note blockers as new `Risks` entries

## At Completion

Under `## Review Summary` include:

- **Shipped:** comma-separated list of what landed
- **Verification:** test results, lint output, build logs (paste counts/timestamps)
- **Lessons learned:** what surprised you
- **Remaining debt:** known TODOs that didn't fit this iteration

## tasks/lessons.md — Self-Improvement Loop

After ANY correction from the user, append a new entry:

```markdown
## YYYY-MM-DD — <short title>

**Mistake:** <what was wrong>

**Why it happened:** <root cause — assumption, missing context, bad pattern>

**Prevention:** <concrete change to behavior or process>

**Future rule:** <one-line rule to follow going forward>
```

### When to Append

- User says "actually, do X instead"
- User points out a bug, regression, or missed requirement
- A verification step caught something that should have been planned for
- A design choice turned out to be wrong in review

### Before Starting Future Work

1. Read `tasks/lessons.md` (or scan recent entries)
2. Identify rules that apply to the new task
3. Proactively avoid the documented mistakes

## Anti-Patterns

- Treating `todo.md` as a TODO graveyard (stale, unused)
- Batching status updates instead of marking complete in real time
- Letting `lessons.md` go unwritten after corrections (loop breaks)
- Vague lesson entries ("be more careful") — must be concrete and actionable
- Duplicating with the `TodoWrite` tool — `tasks/todo.md` is the human-readable artifact; `TodoWrite` is the session-local working set
