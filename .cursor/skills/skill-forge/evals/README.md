# Evaluations

This directory contains evaluation scenarios that prove each skill produces the correct behavior when activated.

## How Evals Work

Each eval is a scenario file that describes:
1. **Setup**: The context/situation
2. **Input**: What the user says or does
3. **Expected Behavior**: What the agent SHOULD do with the skill active
4. **Failure Indicators**: What would indicate the skill DIDN'T activate or worked incorrectly

## Running Evals

Evals are designed to be run manually in a fresh agent session:

```bash
# For each eval file:
# 1. Start a fresh session with skill-forge installed
# 2. Present the scenario
# 3. Verify behavior matches expected
# 4. Record pass/fail
```

Automated eval support is planned (tracking: eval automation).

## Eval Coverage

| Skill | Eval File | Tests |
|-------|-----------|-------|
| prove-it | `prove-it-eval.md` | Catches false completion claims |
| self-review | `self-review-eval.md` | Reviews before presenting |
| diagnose | `diagnose-eval.md` | Follows the loop, doesn't guess |
| grill | `grill-eval.md` | Asks questions before building |
| context-builder | `context-builder-eval.md` | Generates proper CONTEXT.md |
| git-workflow | `git-workflow-eval.md` | Enforces atomic commits |

## Pass Criteria

A skill PASSES eval when:
- It activates from the described trigger (without explicit /invoke)
- It produces the BEHAVIORAL change described (not just text output)
- It PERSISTS (doesn't revert after one response)
- It handles the edge case without breaking

A skill FAILS eval when:
- Agent ignores the skill despite matching trigger conditions
- Agent follows skill partially then drifts
- Agent treats it as one-time instead of persistent
- Agent's output would not satisfy an expert reviewer
