# Reinforcement Learning for Contribution Strategy

## Purpose

Apply reinforcement learning principles to continuously improve contribution decisions. Every contribution outcome (merged, rejected, stale) updates a persistent strategy state that biases future discovery, repo selection, and effort allocation.

## State File

All learned weights live in `intelligence/strategies/rl-state.json`. Load this file before any discovery or contribution decision. Write back after every outcome signal.

## Signal Definitions

| Outcome | Signal | Reward Value |
|---------|--------|--------------|
| PR merged | Positive reward | +1.0 |
| PR rejected (closed without merge) | Negative penalty | -0.8 |
| PR stale (>30 days no response) | Neutral decay | -0.1 |
| PR approved but not yet merged | Partial positive | +0.3 |
| Maintainer requests changes | Mild negative | -0.2 |

## Strategy State Schema

The state file tracks five learned dimensions:

### 1. Repo Preference Weights

Each repo we've contributed to gets a score in `repo_weights`:

```
score = EMA(previous_score, signal, alpha=0.3)
```

- New repos start at `0.5` (neutral)
- Score ranges from `0.0` (avoid) to `1.0` (strongly prefer)
- During discovery, multiply a repo's opportunity score by its weight
- Repos with score < 0.2 are blacklisted unless exploration triggers

### 2. Time-of-Day Preferences

Track when maintainers respond fastest per repo in `time_preferences`:

```json
{
  "owner/repo": {
    "best_hours_utc": [14, 15, 16],
    "response_rate_by_hour": { "14": 0.8, "15": 0.7, ... }
  }
}
```

- Update: when a maintainer responds, record the hour (UTC) the PR was submitted
- Use EMA on the response rate per hour bucket
- Before submitting a PR, prefer to submit during the repo's highest-response hours
- If no data exists for a repo, default to 14:00-18:00 UTC (business hours)

### 3. Issue Type Preferences

Track ROI by contribution type in `issue_type_weights`:

```json
{
  "bug_fix": { "weight": 0.7, "attempts": 12, "merges": 8 },
  "feature": { "weight": 0.4, "attempts": 5, "merges": 2 },
  "docs": { "weight": 0.9, "attempts": 3, "merges": 3 },
  "refactor": { "weight": 0.5, "attempts": 4, "merges": 2 },
  "test": { "weight": 0.6, "attempts": 2, "merges": 1 }
}
```

- Weight = merge_rate adjusted by EMA: `weight = EMA(weight, merged ? 1.0 : 0.0, alpha=0.2)`
- During discovery, prefer issue types with higher weights
- Never fully ignore any type (floor at 0.1)

### 4. Bounty Amount vs Effort Calibration

Track actual time spent vs bounty reward in `bounty_calibration`:

```json
{
  "min_acceptable_rate": 25.0,
  "history": [
    { "bounty_usd": 100, "hours_spent": 3, "merged": true, "effective_rate": 33.3 }
  ],
  "ema_rate": 30.0
}
```

- After each bounty contribution, compute `effective_rate = bounty / hours`
- Update `ema_rate = EMA(ema_rate, effective_rate, alpha=0.25)`
- Skip bounties where estimated effort would yield rate < `min_acceptable_rate * 0.5`
- Increase `min_acceptable_rate` when `ema_rate` consistently exceeds it

### 5. Competition Threshold Sensitivity

Track how many competing PRs we can beat in `competition_threshold`:

```json
{
  "max_competitors": 5,
  "win_rate_by_count": { "1": 0.9, "2": 0.7, "3": 0.5, "5": 0.2, "8": 0.05 },
  "ema_threshold": 4
}
```

- After each outcome, update win rate for that competition count
- `ema_threshold` = highest competitor count where win rate > 0.3
- During discovery, skip issues with more open PRs than `ema_threshold + 1`

## Update Rule: Exponential Moving Average

All weight updates use:

```
new_value = alpha * signal + (1 - alpha) * old_value
```

Where:
- `alpha` = learning rate (dimension-specific, see above)
- `signal` = the observed reward/penalty
- `old_value` = current stored weight

Higher alpha means faster adaptation (more reactive to recent signals). Lower alpha means more stable (resistant to noise).

## Confidence Metric

Each repo tracks a confidence score:

```
confidence = merges / (merges + rejections + 1)
```

- Ranges from 0.0 to ~1.0
- Used to modulate exploration: low confidence repos get explored less
- High confidence (>0.7) repos are "safe bets" for exploitation phase
- Confidence decays by 0.01 per week of inactivity (prevents stale confidence)

## Exploration vs Exploitation (Epsilon-Greedy)

Parameter: `epsilon = 0.20` (20% exploration)

### Decision Process

Before selecting a target repo/issue:

1. Generate random number `r` in [0, 1]
2. If `r < epsilon` → **EXPLORE**: pick from repos NOT in `repo_weights` or with < 2 contributions
3. If `r >= epsilon` → **EXPLOIT**: pick from repos with highest `weight * confidence` product

### Exploration Decay

As total contributions increase, reduce epsilon slightly:

```
effective_epsilon = max(0.05, epsilon - 0.01 * floor(total_contributions / 10))
```

This ensures we always explore at least 5% of the time, but increasingly focus on known-good repos.

## When To Apply This Skill

### Before Discovery (`discover-bounties` or `run-full-pipeline`)

1. Load `intelligence/strategies/rl-state.json`
2. Apply `repo_weights` to bias repo scanning order
3. Apply `issue_type_weights` to filter issue types
4. Apply `competition_threshold` to skip oversaturated issues
5. Apply `bounty_calibration` to filter low-ROI bounties
6. Roll epsilon to decide explore vs exploit

### Before Contribution (`contribute-to-repo`)

1. Check `time_preferences` — delay submission if current hour is suboptimal
2. Verify repo confidence is above 0.1 (otherwise flag for human review)
3. Log start time for bounty effort tracking

### After Outcome (merge/reject/stale)

1. Load current state
2. Identify which signals to update based on outcome
3. Apply EMA updates to all relevant dimensions
4. Recompute confidence for the affected repo
5. Save updated state to `intelligence/strategies/rl-state.json`
6. Log the update to `intelligence/strategies/rl-update-log.jsonl` (append-only)

## Update Log Format

Append to `intelligence/strategies/rl-update-log.jsonl`:

```json
{"timestamp": "2026-06-01T10:00:00Z", "repo": "owner/repo", "issue": 123, "outcome": "merged", "signals_updated": ["repo_weights", "issue_type_weights", "competition_threshold"], "state_snapshot": {"repo_weight": 0.72, "confidence": 0.8}}
```

## Guardrails

- Never let any weight go below 0.0 or above 1.0 (clamp)
- Never blacklist a repo permanently — minimum weight is 0.05
- If state file is missing or corrupted, reinitialize from defaults
- Human can override any weight by editing the JSON directly
- Log every state mutation for auditability
