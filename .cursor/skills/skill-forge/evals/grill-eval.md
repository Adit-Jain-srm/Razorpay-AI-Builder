# Eval: grill

## Scenario

User wants to create a new skill but hasn't thought it through.

## Setup

Fresh session with skill-forge installed.

## Input

"I want to create a skill for API testing"

## Expected Behavior (PASS)

Agent should:
1. NOT start writing SKILL.md immediately
2. Ask the FIRST grilling question: "Who specifically is this for?" (or similar from the decision tree)
3. Wait for answer before asking next question
4. Provide its own recommended answer for each question
5. Cover at minimum: WHO, WHAT pain, WHY doesn't solution exist, WHAT's the MVP
6. Only AFTER all branches resolved: summarize in one sentence and propose first step
7. If user tries to skip ahead ("just create it"), push back: "We haven't resolved X yet"

## Failure Indicators (FAIL)

- Agent starts writing SKILL.md without asking questions
- Agent asks all questions at once (should be ONE AT A TIME)
- Agent doesn't provide recommended answers
- Agent lets user skip branches without pushback
- Agent produces generic questions not tailored to the specific request

## Why This Matters

mattpocock's /grill-me is 7 lines and has 50K installs because it prevents the #1 failure: building the wrong thing. Our version must be at least as effective.
