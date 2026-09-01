---
name: handoff
description: >-
  Compact the current conversation into a handoff document so another agent or
  future session can continue the work without losing context. Use when ending a
  session, switching tasks, the context is getting long, or user says handoff,
  wrap up, save progress, or "continue this later".
---

Write a handoff document capturing everything needed to continue this work.

## What to Include

```
1. GOAL — what we're building/fixing (one sentence)
2. CURRENT STATE — what's done, what's in progress, what's blocked
3. KEY DECISIONS MADE — choices that shouldn't be re-litigated
4. OPEN QUESTIONS — unresolved decisions awaiting input
5. NEXT STEPS — exact actions to take (not vague "continue working")
6. FILES TOUCHED — paths modified this session
7. SUGGESTED SKILLS — which skills the next session should invoke
```

## What NOT to Include

- Full code (reference by file path instead)
- Conversation history (this is a SUMMARY not a transcript)
- Sensitive info (API keys, passwords, PII)
- Resolved dead ends (only include what's RELEVANT going forward)

## Where to Save

Save to the OS temp directory (not the workspace):
- Windows: `$env:TEMP/handoff-{project}-{date}.md`
- macOS/Linux: `/tmp/handoff-{project}-{date}.md`

Tell the user the path so they can reference it next session.

## Format

Keep it SHORT. Under 50 lines. A good handoff is one page a new agent can scan in 10 seconds and know exactly what to do.
