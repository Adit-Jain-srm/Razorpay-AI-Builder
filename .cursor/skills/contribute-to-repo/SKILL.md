# Contribute to Repo

Execute the full contribution workflow: fork, implement, test, and submit a PR.

## Pre-Flight (MANDATORY)

**Read `AGENTS.md` BEFORE touching any code:**
1. Check **Per-Repo Learnings** for this specific repo (branch conventions, CI behavior, maintainer quirks)
2. Check **Failure Post-Mortems** - have we failed on this repo or a similar pattern before?
3. Check **Hard Rules** - especially: no force push, think from maintainer's perspective, detail-oriented
4. Apply **Elite SDE Mindset** checklist before EVERY implementation decision

**Think like a human senior dev:**
- Would I force push this? (NO - push fixup commits)
- Would I submit without running tests? (NO - run the full suite)
- Would I copy-paste a PR description from a template? (NO - write it in my own words, specific to this change)
- Am I rushing? (If yes, STOP. Slow down. Quality > speed.)

## Inputs

- Issue URL (`owner/repo#number`)
- Repo profile from `intelligence/repo-profiles/{owner}-{repo}.json`
- Competitive intel brief from `intelligence/competitive-analysis/`
- Analysis report (from analyze-opportunity skill)

## Process

### Step 1: Preparation

**Fork the repository:**
```bash
gh repo fork {owner}/{repo} --clone=false
```

**Clone to a local worktree:**
```bash
git clone https://github.com/Adit-Jain-srm/{repo}.git worktrees/{repo}
cd worktrees/{repo}
```

**Create branch following repo convention:**
Use the branch naming pattern from the repo profile:
```bash
# Example patterns:
git checkout -b fix/issue-{number}-{slug}       # if repo uses fix/ prefix
git checkout -b feat/{number}-{slug}            # if repo uses feat/ prefix
git checkout -b {number}-{short-description}    # if repo uses number prefix
```

**Install dependencies and verify build:**
```bash
# Detect package manager and install
npm install    # or yarn, pnpm, pip install, cargo build, go mod download
# Run build to verify clean state
npm run build  # or equivalent
```

### Step 2: Deep Codebase Understanding

Before writing ANY code:

1. **Read the issue and ALL its comments** - understand every requirement and nuance
2. **Load the competitive intel brief** - know what to avoid and what to include
3. **Trace the relevant code paths** - use Cursor's semantic search to find:
   - Where the bug manifests / where the feature should live
   - Related code that follows the same patterns
   - Existing tests for the area
   - Import patterns and module structure
4. **Read the repo profile** - refresh on conventions

### Step 3: Implementation

Write the solution following these iron-clad rules:

1. **Match EXACT code style:**
   - Same indentation (tabs/spaces, indent size)
   - Same naming convention (camelCase, snake_case, PascalCase)
   - Same import ordering and grouping
   - Same comment style and density
   - Same error handling patterns
   - Same file organization

2. **Follow the repo's patterns:**
   - If they use a specific abstraction, use it (don't reinvent)
   - If they have utility functions for common tasks, use them
   - If they have a specific way of writing tests, follow it exactly

3. **Address ALL requirements from the issue:**
   - Every acceptance criterion mentioned
   - Edge cases discussed in comments
   - Related concerns maintainers raised

4. **Include what competing PRs missed:**
   - Tests (if others skipped them)
   - Documentation updates (if others forgot)
   - Error handling (if others left it incomplete)
   - Full edge case coverage

### Step 4: Testing

```bash
# Run the FULL test suite (not just your new tests)
{test_command from repo profile}

# If you added new tests, verify they pass in isolation too
{test_command} --filter {your_test_file}
```

If tests fail:
- Fix your code (not the tests, unless the test is wrong)
- Iterate until ALL tests pass
- Never submit with failing tests

### Step 5: Linting & Formatting

```bash
# Run linter with repo's config
{lint_command from repo profile}

# Run formatter
{format_command from repo profile}

# Run type checker if applicable
{typecheck_command}
```

Fix ALL linting errors. Zero warnings if the repo enforces that.

### Step 6: Commit

Follow the repo's commit message convention exactly:
```bash
# Conventional commits example:
git add .
git commit -m "fix(module): resolve issue with X (#123)

Detailed description of what was changed and why.
Addresses edge case Y and Z.

Fixes #{issue_number}"

# If repo uses DCO sign-off:
git commit -s -m "..."
```

### Step 7: Pre-Submit Quality Gate

Before pushing, verify:
- [ ] All tests pass
- [ ] Linter reports zero errors
- [ ] Formatter has been run (no style diffs)
- [ ] Commit message matches convention
- [ ] No secrets, API keys, personal paths in code
- [ ] No unrelated changes in the diff
- [ ] PR template sections can all be filled
- [ ] Issue is still open (check again)
- [ ] CLA/DCO signed if required

### Step 8: Human Review Gate

Present a summary to the operator:
```
READY TO SUBMIT PR
==================
Repo: {owner}/{repo}
Issue: #{number} - {title}
Branch: {branch_name}
Files changed: {count}
Lines: +{added} / -{removed}

Changes summary:
{brief description of what was implemented}

Tests: {PASS / FAIL}
Lint: {PASS / FAIL}
Conventions: {compliant / issues}

Bounty: ${amount}
Competition: {N} existing PRs (our advantages: ...)

Proceed with push and PR creation? [Waiting for confirmation]
```

### Step 9: Push & Create PR

```bash
git push origin {branch_name}
```

Create PR using the repo's template:
```bash
gh pr create --repo {owner}/{repo} --title "{title matching convention}" --body "$(cat <<'EOF'
{Fill PR template completely - every section}

Fixes #{issue_number}
EOF
)"
```

### Step 10: Post-Submission

If the bounty platform requires claiming:
```bash
# Comment on issue for Algora
gh issue comment {number} --repo {owner}/{repo} --body "/attempt"
```

Log the submission via the `track-contribution` skill.

## Cleanup

After PR is submitted:
```bash
# Keep the worktree for potential review iterations
# Track it in contributions log
```

## Review Response Protocol

If maintainer requests changes:
1. Read ALL review comments carefully
2. Address EVERY comment (don't skip any)
3. Push NEW commits on top (NEVER amend + force push - it destroys review context)
4. Reply to each review comment confirming the fix
5. Update the contribution log with the interaction
6. Wait for re-review - don't ping or rush the maintainer
