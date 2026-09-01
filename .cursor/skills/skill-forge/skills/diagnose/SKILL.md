---
name: diagnose
description: >-
  Disciplined diagnosis loop for hard bugs and unexpected behavior. Forces
  reproduce → minimise → hypothesise → instrument → fix → regression-test.
  Use when something is broken and you don't know why, when a bug seems
  intermittent, when a fix didn't work, or when user says diagnose, debug,
  investigate, or "why is this broken".
---

Do NOT guess. Follow the loop. Every step produces evidence.

## The Loop

```
1. REPRODUCE — make it fail on demand. If you can't reproduce, you can't fix.
2. MINIMISE — strip everything until only the bug remains. Smallest failing case.
3. HYPOTHESISE — ONE theory. Not three. One. State it clearly.
4. INSTRUMENT — add the ONE measurement that proves/disproves your hypothesis.
5. EVALUATE — run it. Was hypothesis correct?
   YES → go to step 6
   NO  → back to step 3 with new information
6. FIX — minimal change that addresses root cause (not symptoms)
7. REGRESSION TEST — write a test that would have caught this. Run it red then green.
```

## Rules

- Never skip REPRODUCE. "I think it fails when..." is not reproducing.
- Never fix without a hypothesis. Shotgun debugging = wasted time.
- One hypothesis at a time. Changing two things = you learn nothing.
- The fix must address ROOT CAUSE. If you're fixing symptoms, you're not done.
- The regression test must FAIL without the fix applied.

## Anti-Patterns (stop yourself)

- "Let me try adding a null check here" → NO. Where's your hypothesis? What evidence?
- "It's probably a timing issue" → Probably? REPRODUCE it. PROVE it's timing.
- "I'll add some console.logs" → WHICH log proves WHICH hypothesis? Be specific.
- "Fixed! (without running the test)" → NO. Prove it. Run it. Evidence.

## Persistence

ACTIVE whenever debugging. Stay in the loop until the regression test is green. Don't exit early. Don't declare "fixed" without step 7.
