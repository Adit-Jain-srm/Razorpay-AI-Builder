# Track Contribution

Log a contribution and update all dashboards, trackers, and metrics.

## Pre-Flight

**After tracking, ALWAYS update `AGENTS.md`:**
- Add to **Per-Repo Learnings** if this is a new repo or we learned something new
- Add to **Failure Post-Mortems** if something went wrong
- Add to **Learned Preferences** if a strategy worked or didn't
- Update **Strategy Evolution Log** if approach changed

This ensures future invocations of ANY skill have the latest intelligence.

## Inputs

- Contribution details (repo, issue, PR URL, bounty, time spent, status)
- Achievement impact data
- Competitive intel used (if any)

## Process

### Step 1: Create Contribution Log Entry

Create file at `contributions/YYYY-MM/{repo-name}-{issue-number}.md`:

```markdown
# {owner}/{repo} #{issue_number}: {title}

## Meta
- Date: {ISO date}
- Platform: {Algora / GitHub Direct / Expensify / WarpSpeed / N/A}
- Bounty: ${amount} | Priority: {contribution / money / achievement}
- Tech: {languages and frameworks used}

## Discovery
- Found via: {source}
- Competition at discovery: {N} existing PRs, {M} active attempts
- Score: {calculated score}

## Competitive Intelligence
- Competing PRs analyzed: {list with URLs}
- Key failures identified: {summary}
- Advantage strategy: {what we did differently}

## Implementation
- Time to understand codebase: {duration}
- Time to implement: {duration}
- Time to test/lint/polish: {duration}
- Total time: {total}h
- Files changed: {count}
- Lines added/removed: +{added} / -{removed}

## Guidelines Compliance
- CONTRIBUTING.md followed: {yes/no + notes}
- PR template filled: {yes/no}
- Tests added: {yes/no + count}
- CI passing: {yes/no}
- Style match verified: {yes/no}

## Outcome
- Status: {submitted / under-review / changes-requested / merged / rejected}
- PR URL: {url}
- Merged date: {date or pending}
- Payment status: {pending / paid / N/A}
- Amount received: ${amount or 0}
- Review feedback: {summary}

## Learnings
- What worked: {notes}
- What to improve: {notes}
- Repo-specific insight: {insight to add to repo profile}

## Achievement Impact
- Contribution graph: +1 day
- PR merged: {+1 toward Pull Shark if merged}
- Other: {any achievement progress}
```

### Step 2: Update Dashboard

Read `dashboard/README.md` and update the stats table:
- Increment "Total PRs Submitted"
- Update "This Month" and "This Week" counts
- Add to "Active PRs Under Review" if status is submitted
- Update streak in `dashboard/STREAK.md`

### Step 3: Update Earnings

If bounty is involved, add row to `dashboard/EARNINGS.md`:
```
| {date} | {repo} | #{number} | {platform} | ${amount} | {hours}h | ${amount/hours}/hr | {status} |
```

Update summary totals.

### Step 4: Update Achievement Progress

Read `config/achievements.json` and `dashboard/ACHIEVEMENTS.md`:
- If PR was merged: increment Pull Shark progress
- If co-authored: increment Pair Extraordinaire
- Update the progress table

### Step 5: Update Weekly Report

Append to `dashboard/WEEKLY-REPORT.md`:
- Add PR to "PRs Submitted" or "PRs Merged" section
- Update earnings total
- Recalculate best ROI if this was better

### Step 6: Update Repo Intelligence

If learnings were gained, update `intelligence/repo-profiles/{owner}-{repo}.json`:
- Adjust maintainer_style based on review experience
- Update avg_review_days if we got a review
- Add any new conventions discovered

### Step 7: Update High-Acceptance Repos

If the PR was merged, check if this repo should be added to `intelligence/strategies/high-acceptance-repos.json`.
Calculate our acceptance rate for this repo: merged / submitted.

### Step 8: Commit Tracking Updates

```bash
git add contributions/ dashboard/ intelligence/
git commit -m "track: log contribution to {owner}/{repo}#{number}"
git push origin main
```

## Status Update Protocol

This skill should be re-run when a PR status changes:
- `submitted` -> `under-review` (maintainer commented)
- `under-review` -> `changes-requested` (review with requests)
- `changes-requested` -> `under-review` (we pushed fixes)
- `under-review` -> `merged` (SUCCESS)
- Any -> `rejected` / `closed` (learn why)
- `merged` -> `paid` (payment received)

Update the contribution log and all dashboards accordingly.
