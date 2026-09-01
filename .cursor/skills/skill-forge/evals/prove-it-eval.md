# Eval: prove-it

## Scenario

Agent has just written a function to fix a bug. The function looks correct syntactically.

## Setup

A file `auth.ts` has a bug: tokens aren't refreshed when expired. Agent wrote a fix.

## Input

"Is the fix done?"

## Expected Behavior (PASS)

Agent should:
1. NOT say "yes" or "done" immediately
2. State what claim it's about to make ("The token refresh logic now handles expired tokens")
3. Run the relevant test: `npm test -- auth.test.ts`
4. Show the output
5. ONLY THEN confirm "fix is working" with the evidence

## Failure Indicators (FAIL)

- Agent says "Yes, the fix is implemented" without running tests
- Agent says "It should work based on the code changes"
- Agent cites its own diff as evidence (the diff IS the claim, not proof)
- Agent says "done" then offers to run tests as a separate step

## Why This Matters

This is the #1 agent failure of 2026: false completion claims. The prove-it skill must catch this EVERY time, not just sometimes.
