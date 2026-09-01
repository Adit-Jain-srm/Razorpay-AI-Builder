# Default Open Source Contribution Guidelines

Reference: https://github.com/github/opensource.guide

This skill provides baseline contribution etiquette that applies to ALL repos, even those without explicit CONTRIBUTING.md.

## Pre-Flight (MANDATORY)

**Read `AGENTS.md` Per-Repo Learnings and Failure Post-Mortems FIRST.**
Past failures contain the highest-signal lessons. The same mistake category must NEVER recur.

Apply the **Elite SDE Mindset** from AGENTS.md:
- Think from maintainer's perspective
- Be obsessively detail-oriented
- Slow down to go fast (read before coding)
- Treat every interaction as permanent and public
- NEVER force push, amend pushed commits, or use AI writing tells

## When to Use

ALWAYS load these principles before contributing to ANY repo. They are the minimum standard. If the target repo has its own CONTRIBUTING.md, that takes precedence -- but these defaults fill any gaps.

## Core Principles (from opensource.guide)

### Before Contributing

1. **Read existing documentation** - README, CONTRIBUTING.md, CODE_OF_CONDUCT.md
2. **Search for existing issues/PRs** - Don't duplicate work
3. **Open an issue before large changes** - Discuss before implementing
4. **Keep changes focused** - One concern per PR

### Making a Contribution

1. **Fork and branch** - Never work directly on main
2. **Follow project style** - Match existing code patterns exactly
3. **Write tests** - If the project has tests, add them
4. **Keep commits atomic** - Each commit should be a logical unit
5. **Write clear commit messages** - Explain why, not just what

### PR Etiquette

1. **Fill the PR template completely** - Every section matters
2. **Reference the issue** - Use "Fixes #N" or "Closes #N"
3. **Keep the diff minimal** - No unrelated changes
4. **Respond to reviews promptly** - Within hours, not days
5. **Be gracious** - Thank reviewers, accept feedback constructively
6. **Iterate** - Address ALL review comments, not just some

### After Submission

1. **Monitor CI** - Fix failures immediately
2. **Respond to comments** - Same day if possible
3. **Don't abandon** - If you can't finish, say so
4. **Follow up** - If related issues exist, consider addressing them

## Communication Standards

- Be respectful and professional in all interactions
- Don't spam issues with "can I work on this?" unless the repo explicitly asks
- If claiming work (e.g., `/attempt` on Algora), deliver within 48h
- If you can't deliver, unclaim explicitly

## Quality Checklist (minimum for ANY contribution)

- [ ] Tests pass (existing suite)
- [ ] No lint errors
- [ ] PR description is clear and complete
- [ ] Issue is referenced
- [ ] Changes are minimal and focused
- [ ] No secrets or personal paths in code
- [ ] Commit messages are meaningful

## Integration with Agent Pipeline

The `contribute-to-repo` skill MUST verify all items in the Quality Checklist above before the human review gate. The `analyze-opportunity` skill should check if a repo follows these standards (active maintainer, clear issues, responsive reviews) as a positive signal.

## Learning from Accepted PRs (CRITICAL)

Before contributing to ANY repo, study 3-5 recently merged PRs:
- How did successful contributors write their PR descriptions?
- What commit message style was used?
- Were tests included? What framework/style?
- How detailed were the code comments?
- Did they squash commits or keep history?
- How did they respond to review comments?

**Repo-specific guidelines ALWAYS override these defaults.** But when a repo has no explicit guidelines, mimic the patterns of its recently accepted PRs -- that IS the implicit guideline.

## Git Workflow Knowledge

Reference: https://github.com/firstcontributions/first-contributions/blob/main/docs/additional-material/git_workflow_scenarios/additional-material.md

Essential git operations for contributions:

### Keep Fork Synced
Before starting work, always sync your fork:
```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### Squashing Commits
If reviewer asks to squash (common in OSS):
```bash
git rebase -i HEAD~N  # N = number of commits to squash
# Change 'pick' to 'squash' for all but the first
```

### Resolving Merge Conflicts
If the target branch moved while you worked:
```bash
git fetch upstream
git rebase upstream/main
# Resolve conflicts, then:
git add .
git rebase --continue
git push --force-with-lease origin your-branch  # ONLY for conflict resolution rebases
```
**NOTE:** `--force-with-lease` is ONLY acceptable after a rebase to resolve conflicts. NEVER use `--force` or `--force-with-lease` to amend/rewrite commits that were already reviewed. Push fixes as new commits instead.

### Addressing Review Feedback (CORRECT approach)
```bash
# Make the fix
git add .
git commit -m "fix: address review - clarify error message"
git push origin your-branch  # Normal push, no force
```
**NEVER:** `git commit --amend && git push --force` after receiving reviews. This destroys the diff that reviewers and bots (CodeRabbit) use to verify fixes.

### Amending a Commit
If you need to fix your last commit (before pushing):
```bash
git add .
git commit --amend --no-edit  # keeps same message
```

### After PR is Merged: Cleanup
```bash
git checkout main
git pull upstream main
git push origin main
git branch -d your-feature-branch
git push origin --delete your-feature-branch
```

## Structural Contribution Logging

All contribution data lives in `contributions/YYYY-MM/` as individual markdown files. These are the source of truth. Dashboard files (`dashboard/`) are DERIVED from these logs -- never edit dashboard files directly. The `sync-and-push` script regenerates dashboards from contribution logs.

Avoid redundancy:
- Contribution details → `contributions/YYYY-MM/{repo}-{issue}.md` (one file per PR)
- Aggregated stats → `dashboard/README.md` (auto-generated)
- Earnings → `dashboard/EARNINGS.md` (auto-generated)
- Strategy insights → `AGENTS.md` (manually curated, high-signal only)
- Per-repo conventions → `intelligence/repo-profiles/{owner}-{repo}.json` (auto-generated by guidelines-parser)
- Competition analysis → `intelligence/competitive-analysis/` (per-issue, auto-generated)

