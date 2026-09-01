---
name: zoom-out
description: >-
  Force a perspective shift. Stop looking at the code line-by-line and explain
  the broader context: how this piece fits in the system, what depends on it,
  what it depends on, and what the original designer was thinking. Use when lost
  in unfamiliar code, when changes feel risky because you don't see the full
  picture, or when user says "zoom out", "big picture", "how does this fit",
  or "explain the architecture around this".
---

Stop. Zoom out. Before touching this code, explain:

1. **What system is this part of?** (name the module/service/layer)
2. **What calls this?** (trace UP — who depends on this code?)
3. **What does this call?** (trace DOWN — what does it depend on?)
4. **Why does it exist?** (what problem did the original author solve?)
5. **What breaks if this changes?** (blast radius)
6. **What's the simplest mental model?** (explain to a new team member in 2 sentences)

## When to Auto-Trigger

- About to modify a file you didn't write and haven't read fully
- Making a change that touches 3+ files
- The function/class name doesn't clearly explain its purpose
- You feel uncertain about side effects

## Rules

- Read FIRST, explain SECOND, modify THIRD. Never modify what you don't understand.
- If you can't explain it simply, you don't understand it well enough to change it safely.
- Cite specific file paths and line numbers when explaining relationships.

## Example

```bash
# Before modifying auth.ts, zoom out:
# 1. What calls auth.ts?
grep -r "from.*auth" src/ --include="*.ts" -l
# 2. What does auth.ts import?
head -20 src/auth.ts | grep "import"
# 3. What tests cover this?
find . -name "*auth*test*"
```

Then explain: "auth.ts is the middleware layer between routes/ and the JWT library. It's called by 12 route handlers. Breaking its interface breaks all protected endpoints."
