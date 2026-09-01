---
name: prove-it
description: >-
  Prevents false progress. Before claiming ANY task is done, forces the agent to
  provide EVIDENCE — run tests, show output, demonstrate the fix works. Eliminates
  the #1 agent failure: "says done but isn't". Use when completing any task, fixing
  bugs, implementing features, or whenever about to say "done" or "fixed" or
  "implemented". Auto-triggers before any completion claim.
---

Never say "done" without proof. Never say "fixed" without running it. Never say "implemented" without showing it works.

## Persistence

ACTIVE on EVERY completion claim. Whenever you're about to say "done", "fixed", "implemented", "completed", "all set", "should work now" — STOP. Prove it first.

## The Gate

Before ANY statement claiming work is complete:

```
1. WHAT CLAIM am I about to make? (state it explicitly)
2. WHAT EVIDENCE proves this claim? (name the specific command/test/verification)
3. RUN the evidence NOW (not "I could run..." — actually run it)
4. READ the output (full output, not just exit code)
5. DOES the output CONFIRM the claim? 
   YES → show the evidence, THEN make the claim
   NO  → fix the issue, then re-run from step 3
```

## Examples

**BAD:** "Fixed the authentication bug." ← Where's the proof?

**GOOD:** 
```
Claim: "Login now works with expired refresh tokens"
Evidence: Running test suite
→ npm test -- auth.test.ts
→ Output: 14 passing, 0 failing
→ Specifically: "should refresh expired token" ✓
Confirmed: fix works.
```

**BAD:** "Implemented the search feature." ← Did you try it?

**GOOD:**
```
Claim: "Search returns results matching query"
Evidence: Running the feature
→ curl localhost:3000/api/search?q=test
→ Output: {"results": [{"title": "Test Item", ...}], "total": 3}
Confirmed: feature works.
```

## What Counts as Evidence

| Claim Type | Minimum Evidence |
|-----------|-----------------|
| Bug fix | Test that WAS failing now passes |
| New feature | Demo showing it works (command + output) |
| Refactor | All existing tests still pass |
| Performance fix | Before/after metrics |
| Config change | Proof the config is loaded correctly |
| "Everything works" | Full test suite output, exit code 0 |

## What Does NOT Count

- "It should work" ← run it
- "Based on the code changes" ← that's what you WROTE, not what RUNS  
- "The logic is correct" ← prove it with execution
- Citing your own diff as proof ← the diff is the CLAIM, not the EVIDENCE
- A passing linter ← linter checks syntax, not behavior

## Why

The #1 agent failure pattern (2026): "says done but isn't." Users report spending MORE time verifying false completions than if they'd done it themselves. This single discipline — prove before claiming — eliminates the entire category of wasted cycles.

> "Claiming work is complete without verification is dishonesty, not efficiency."
