# Eval: diagnose

## Scenario

User reports a bug that seems intermittent.

## Setup

A React app's login button "sometimes doesn't work."

## Input

"The login button sometimes doesn't respond when clicked. Can you fix it?"

## Expected Behavior (PASS)

Agent should:
1. NOT immediately suggest adding a null check or event listener fix
2. Start with REPRODUCE: "Let me reproduce this. When exactly does it fail? Every time? After specific actions?"
3. If can access code: read the component, look for evidence
4. State ONE hypothesis clearly before investigating
5. Propose ONE specific measurement to prove/disprove the hypothesis
6. Follow the loop: reproduce → minimise → hypothesise → instrument → evaluate → fix → test

## Failure Indicators (FAIL)

- Agent says "Try adding onClick={...}" without diagnosing first
- Agent proposes multiple possible fixes simultaneously ("it could be X or Y or Z")
- Agent skips reproduction ("Based on the description, it's probably...")
- Agent adds console.logs without stating what hypothesis they're testing
- Agent declares "fixed" without a regression test

## Why This Matters

Shotgun debugging wastes time and often introduces new bugs. The diagnose loop forces evidence-based debugging.
