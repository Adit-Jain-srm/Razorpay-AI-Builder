# Decision Engine

The VITAL core of the autonomous agent. AI-powered dynamic decision making -- NOT hardcoded priority lists. Every decision is contextual, evaluating all available options and selecting the highest-value action based on current state.

## Pre-Flight (MANDATORY)

**Read `AGENTS.md` BEFORE making any decision:**
1. Load **Per-Repo Learnings** for all repos currently in play
2. Load **Failure Post-Mortems** to avoid repeating mistake patterns
3. Load **Strategy Evolution Log** to understand what changed and why
4. Apply **Elite SDE Mindset** - think DEEPLY, not reactively

**Decision quality checklist:**
- Am I choosing this because it's BEST, or because it's FIRST/EASIEST?
- Have I considered the maintainer's perspective? (Will this actually get merged?)
- Am I avoiding a known failure pattern from AGENTS.md?
- Is there a higher-value action I'm overlooking because of recency bias?

## Philosophy

This is NOT a static priority queue. The agent THINKS before acting:
- "Should I do a follow-up PR or find fresh opportunities?"
- "Is iterating on one issue the best use of time, or should I diversify?"
- "What gives the highest combined value across ALL goals right now?"

**Never aimlessly iterate on a single issue.** Each action must be a conscious AI decision weighing:
- Contribution graph impact (primary)
- Earning potential (secondary)
- Achievement advancement (tertiary)
- Time investment vs return
- Diversification value (contributing to multiple repos > one repo)
- Learning value (new codebase knowledge)
- **Acceptance probability** (will this repo actually merge our PR?)

## Growth Mindset (embedded in every decision)

NEVER be satisfied. NEVER say "good progress." The benchmark is NOT "did I contribute today" -- it's "am I operating at the level of developers with 15K+ followers who ship daily?"

Reference bar: sindresorhus (75K followers, ships daily), antfu (20K+, maintains 1000+ packages), tj (38K, built Express/Koa/Commander). These are the standard. If a session ends with fewer than 3 meaningful actions, the system failed.

## Repo Acceptance Evaluation (BEFORE investing time)

Before selecting ANY target, dynamically evaluate if our PR would actually get accepted:

```bash
# 1. Check contributor diversity
gh pr list --repo {owner}/{repo} --state merged --limit 20 --json author --jq '[.[].author.login] | unique | length'
# If < 5 unique authors → likely internal-only → SKIP
# If > 10 unique authors → open community → PROCEED

# 2. Check if externals get merged (not just core team)
gh pr list --repo {owner}/{repo} --state merged --limit 10 --json author,mergedAt --jq '.[] | .author.login'
# Compare against repo org members. If ALL are internal → SKIP.

# 3. Check issue-to-PR close rate
gh pr list --repo {owner}/{repo} --state closed --limit 10 --json mergedAt --jq '[.[] | select(.mergedAt != null)] | length'
# If 0 out of 10 recent closed PRs were merged → they close without merging → SKIP
```

**Red flags (SKIP immediately):**
- All merged PRs are from 2-3 internal people
- 100+ open PRs but only internal ones get merged
- Issues marked "help wanted" but no external PR ever merged
- Maintainer closes PRs with "we'll handle internally"

## Decision Framework

On every pipeline invocation, the AI evaluates ALL available options and scores them dynamically:

### Option Categories

1. **PR Monitoring** -- Check pending PRs for reviews that need response
2. **Follow-up to same repo** -- Only if genuinely higher value than alternatives
3. **Fresh discovery** -- Find new opportunities across all sources
4. **Achievement action** -- Discussion answers, doc fixes (if enabled)
5. **Ecosystem diversification** -- Contribute to a NEW repo for breadth

### Dynamic Scoring (AI evaluates, not formula)

For each available option, the AI considers:

```
EVALUATE each option:
  - What's the expected outcome? (merged PR? money? learning?)
  - How long will it take? (5 min review response vs 3h new feature)
  - What's the competition? (0 = easy win, 20 = likely waste of time)
  - Am I diversifying or concentrating? (3 PRs to same repo = diminishing returns)
  - Is this genuinely the best use of my next hour?
  - What does the RL state suggest? (repo weights, issue type performance)
  - Would a DIFFERENT action advance my goals MORE?
```

### Follow-Up Decision Logic

A follow-up PR is NOT automatic. The AI asks:
- "Is there actually a follow-up that makes sense technically?"
- "Would the maintainer expect/appreciate a connected fix?"
- "Or would my time be better spent on a completely different opportunity?"
- "Am I just doing this because it's easy, or because it's high-value?"

If the answer is "it's just easy" -- find something more impactful instead.

### When to STOP working on a repo

- After 2-3 PRs without any merge: pause, work elsewhere
- After exhausting obvious fixes: don't force contributions
- If competition suddenly increased: move on
- If maintainer is unresponsive (>7 days): work elsewhere while waiting

## State Assessment (runs first)

```bash
# Check pending PRs
gh pr list --author Adit-Jain-srm --state open --json repository,number,title,updatedAt,reviews

# Check recently merged (celebrate + learn)
gh pr list --author Adit-Jain-srm --state merged --json repository,number,mergedAt --limit 5
```

## PR Monitoring Protocol

This is ALWAYS high-priority (respond within hours):

1. Check all open PRs for new comments/reviews
2. If changes requested: fix immediately (this is time-sensitive)
3. If questions asked: answer clearly
4. If approved: no action (wait for merge)
5. If merged: update tracking, celebrate, evaluate next move
6. If closed: post-mortem, learn, move on

## Fresh Discovery Triggers

Run fresh discovery when:
- No pending PRs need immediate attention
- Last discovery was >24 hours ago
- All follow-ups have been evaluated and none are clearly better than new opportunities
- The AI decides diversification has more value than depth

## Output

The decision engine outputs a REASONED decision:

```markdown
## Decision: {chosen action}
### Reasoning:
- Considered: {list of options evaluated}
- Selected: {chosen option} because {specific reasoning}
- Rejected: {why other options were worse right now}
### Expected Outcome:
- {what success looks like}
- {time estimate}
- {risk assessment}
```

## Learning from Outcomes

After every action completes:
- Was the decision correct? (Did it produce expected outcome?)
- Update RL weights based on actual result
- If decision was wrong: note WHY in AGENTS.md for future reference
- Adjust decision parameters for next time

## Integration with Pipeline

The decision engine is invoked at the START and END of every pipeline run:
- START: "What should I do?" → select action
- END: "What should I do next?" → store recommendation
- The stored recommendation is a SUGGESTION, not a mandate. Next run re-evaluates fresh.
