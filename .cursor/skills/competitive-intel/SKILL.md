# Competitive PR Intelligence

Analyze existing PRs on a target issue to understand why they failed or are stale, then build a superiority brief for our contribution.

## Pre-Flight (MANDATORY)

**Read `AGENTS.md` Failure Post-Mortems and Per-Repo Learnings.** Many competitive failures stem from the SAME patterns we've already documented. Don't repeat them.

Think deeply: "Why did these PRs fail? Is it because the approach was wrong, or because the repo doesn't merge externals at all?" If the latter, skip entirely.

## Inputs

- Issue URL or `owner/repo#number`
- Target issue details (from discovery)

## Process

### Step 1: Fetch All Related PRs

Find PRs that reference the target issue:
```bash
# Search for PRs that mention the issue number
gh pr list --repo {owner}/{repo} --state all --search "#{issue_number}" --json number,title,state,body,url,createdAt,updatedAt,reviews,files,additions,deletions,author

# Also search for PRs with "fixes #N" or "closes #N" in body
gh search prs "repo:{owner}/{repo} #{issue_number}" --json number,title,state,url,createdAt,updatedAt
```

### Step 2: Categorize Each PR

For each PR found, classify its status:
- **Merged** - Someone already solved it (STOP - issue may be done)
- **Open + Active** - Active competition (assess quality)
- **Open + Stale** - No updates in 14+ days (prime target for superseding)
- **Closed without merge** - Failed attempt (rich learning source)
- **Draft** - Work in progress (may or may not complete)

If a PR was already merged, STOP and report "issue likely resolved."

### Step 3: Deep Analysis of Each Failed/Stale PR

For each closed-without-merge or stale PR, read:

```bash
# Get PR details including review comments
gh pr view {pr_number} --repo {owner}/{repo} --json title,body,state,reviews,reviewDecision,files,additions,deletions,comments

# Get the diff to understand what they attempted
gh pr diff {pr_number} --repo {owner}/{repo}
```

Analyze for these failure patterns:

**A. Guidelines Violations:**
- Wrong branch base (e.g., PR to main instead of develop)
- Missing or incomplete PR description sections
- No tests added when repo requires them
- Didn't sign CLA/DCO
- Wrong commit message format

**B. Code Quality Issues:**
- Style doesn't match repo conventions (naming, indentation, imports)
- Hardcoded values instead of using config
- Missing error handling
- No TypeScript types (in a typed codebase)
- Didn't follow existing patterns in the codebase

**C. Completeness Issues:**
- Only partial fix (doesn't handle edge cases)
- Missing migration/documentation updates
- Broke existing tests
- Didn't address all requirements in the issue

**D. Communication Issues:**
- No response to review comments (most common for stale PRs)
- Didn't explain the approach in PR description
- No screenshots for UI changes
- Didn't reference the issue properly

**E. Maintainer Feedback (GOLD):**
Read all review comments from maintainers. These tell you EXACTLY what they want:
- Specific code changes requested
- Architecture preferences stated
- Testing requirements clarified
- Style expectations made explicit

### Step 4: Extract Positive Elements

Even from failed PRs, identify what was done well:
- Good algorithmic approach (just poorly styled)
- Correct identification of files to change
- Useful test cases (even if implementation was wrong)
- Good PR description structure

### Step 5: Build Superiority Brief

Compile findings into an actionable brief:

```markdown
# Competitive Intelligence: {owner}/{repo} #{issue_number}

## Summary
- Total PRs found: N
- Merged: N (if >0, issue may be resolved - verify)
- Open/Active: N
- Stale (>14 days): N
- Closed/Failed: N

## Failure Analysis

### Common Mistakes (AVOID THESE):
1. {mistake 1 - e.g., "3/4 PRs didn't add tests"}
2. {mistake 2 - e.g., "Used tabs instead of spaces"}
3. {mistake 3 - e.g., "Didn't fill PR template"}

### Maintainer Explicitly Requested:
1. {request from review comments}
2. {another request}

### Good Ideas to Borrow (improve upon):
1. {approach from PR #X that had merit but poor execution}

## Recommended Approach
Based on the above analysis:
- DO: {specific actions}
- DON'T: {specific anti-patterns from failed PRs}
- MUST INCLUDE: {non-negotiables from maintainer feedback}
- STYLE: {observed conventions that others violated}

## Risk Assessment
- Competition level: low / medium / high
- Confidence of acceptance: X%
- Time estimate: Xh
```

### Step 6: Save Intelligence

Save the brief to `intelligence/competitive-analysis/{owner}-{repo}-{issue_number}.md`

This intelligence persists and can be referenced if we need to revisit the issue later.

## Output

Return the superiority brief to the orchestrator for use in the contribution phase.
