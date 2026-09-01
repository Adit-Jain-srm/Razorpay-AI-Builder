# Analyze Opportunity

Deep analysis of a specific issue and its repository to determine feasibility and build a compliance profile.

**HARD GATE: This skill MUST run BEFORE forking or cloning any repo. If it reveals gating requirements (vouch, CLA, application), STOP and complete those gates first.**

## Pre-Flight (MANDATORY)

**Read `AGENTS.md` BEFORE analyzing:**
1. Check **Per-Repo Learnings** - have we contributed here before? What did we learn?
2. Check **Failure Post-Mortems** - did we fail on a similar repo/issue type?
3. Apply **Elite SDE Mindset** - think deeply about whether this opportunity is WORTH pursuing, not just whether it's technically feasible

**Key questions to answer BEFORE proceeding:**
- Is this repo one where outsiders actually get merged? (Check last 20 merged PRs)
- Will the maintainer respond within 7 days? (Check issue response times)
- Is this issue still relevant? (Check if already fixed on default branch)
- Am I the best person for this? (Stack, complexity, competition)

## Inputs

- Issue URL or `owner/repo#number`
- Competitive intel brief (from competitive-intel skill, if available)

## Process

### Step 0: ACCESS GATE CHECK (MANDATORY - DO NOT SKIP)

Before ANY other action, check if the repo has contribution gates that would auto-reject our PR:

```bash
# Read CONTRIBUTING.md
gh api "repos/{owner}/{repo}/contents/CONTRIBUTING.md" -H "Accept: application/vnd.github.raw" 2>/dev/null

# Also check for alternate locations
gh api "repos/{owner}/{repo}/contents/.github/CONTRIBUTING.md" -H "Accept: application/vnd.github.raw" 2>/dev/null
```

**STOP and ABORT if CONTRIBUTING.md mentions ANY of these:**
- "vouch" / "vouched" / "vouch request" → Must file vouch request issue first
- "CLA" / "contributor license agreement" → Must sign CLA first
- "approved contributors only" / "apply first" → Must apply and be approved
- "internal only" / "team members only" → Cannot contribute externally
- "Upwork" / "hired through" → Must apply on their platform first (Expensify pattern)

**Also check recent closed PRs for bot patterns:**
```bash
gh pr list --repo {owner}/{repo} --state closed --limit 5 --json title,body,closedAt,comments --jq '.[].comments[0].body' | head -20
```

If any automated closure messages mention "not vouched", "CLA not signed", "unauthorized", etc. → ABORT.

**Only proceed to Step 1 if no access gates are found.**

### Step 1: Repository Guidelines Deep Read

Clone or browse the target repo and extract ALL contribution requirements:

**CONTRIBUTING.md / CONTRIBUTING.rst:**
```bash
gh api repos/{owner}/{repo}/contents/CONTRIBUTING.md --jq .content | base64 -d
```
Extract:
- Branch naming convention
- Commit message format (conventional, angular, custom)
- PR title format requirements
- Required sections in PR description
- Testing requirements (unit, integration, e2e)
- Code style mandates
- Review process (who reviews, expected turnaround)
- CLA/DCO signing requirements
- Any "do NOT" rules

**PR Template:**
```bash
gh api repos/{owner}/{repo}/contents/.github/PULL_REQUEST_TEMPLATE.md --jq .content | base64 -d
```
Note every section that must be filled.

**CI Workflows:**
```bash
gh api repos/{owner}/{repo}/contents/.github/workflows --jq '.[].name'
```
Read the primary CI workflow to understand what checks run on PRs.

**Code Style Configs:**
Check for presence of: `.eslintrc*`, `.prettierrc*`, `pyproject.toml`, `rustfmt.toml`, `.editorconfig`, `biome.json`, `deno.json`

**CODEOWNERS:**
```bash
gh api repos/{owner}/{repo}/contents/.github/CODEOWNERS --jq .content | base64 -d
```
Know who will review your PR.

### Step 2: Learn from Merged PRs

Sample 3-5 recently merged PRs to learn patterns:
```bash
gh pr list --repo {owner}/{repo} --state merged --limit 5 --json number,title,body,additions,deletions,files
```

For each, note:
- Commit message style actually used
- PR description quality and format
- Whether tests were included
- How detailed code comments are
- Average PR size (lines changed)

### Step 3: Issue Deep Dive

Read the issue thoroughly:
```bash
gh issue view {number} --repo {owner}/{repo} --json title,body,comments,labels,assignees
```

Extract:
- Exact requirements (what needs to be done)
- Acceptance criteria (explicit or implied)
- Related issues or PRs referenced
- Maintainer clarifications in comments
- Labels that indicate priority/difficulty

### Step 4: Codebase Exploration

Using Cursor's semantic search and file reading:
- Identify the files that need to change
- Understand the architecture around those files
- Read existing tests for the area
- Note import patterns, naming conventions, error handling style

### Step 5: Build/Update Repo Profile

Save or update `intelligence/repo-profiles/{owner}-{repo}.json`:
```json
{
  "owner": "{owner}",
  "repo": "{repo}",
  "last_analyzed": "ISO-date",
  "branch_convention": "detected pattern",
  "commit_format": "conventional | angular | freeform",
  "commit_scope_required": true/false,
  "pr_template_path": ".github/PULL_REQUEST_TEMPLATE.md",
  "pr_template_sections": ["Description", "Type of Change", "Testing", "Checklist"],
  "tests_required": true/false,
  "test_framework": "jest | vitest | pytest | go test | cargo test",
  "test_command": "npm test | pytest | make test",
  "linter": "eslint | ruff | clippy | golangci-lint",
  "lint_command": "npm run lint | ruff check . | cargo clippy",
  "formatter": "prettier | black | rustfmt | gofmt",
  "format_command": "npm run format | black . | cargo fmt",
  "ci_checks": ["lint", "test", "typecheck", "build"],
  "cla_required": true/false,
  "cla_tool": "CLA Assistant | DCO sign-off",
  "merge_strategy": "squash | merge | rebase",
  "maintainer_style": "quick reviews | slow but thorough | requires iteration",
  "avg_review_days": N,
  "language_primary": "typescript | python | rust | go",
  "monorepo": true/false
}
```

### Step 6: Feasibility Scoring

Calculate final score:
```
score = (bounty_usd * acceptance_probability) / estimated_hours

acceptance_probability = sum of applicable factors (capped at 0.95):
  +0.40 if existing_pr_count < 3
  +0.20 if issue_age > 48h
  +0.30 if repo previously merged our PR
  +0.20 if clear acceptance criteria exist
  +0.10 if maintainer responds within 7 days
  -0.30 if 5+ competing PRs exist
  -0.50 if issue is vague/ambiguous

estimated_hours:
  - Documentation/typo fix: 0.5-1h
  - Small bug fix: 1-3h
  - Medium feature: 3-8h
  - Large feature: 8-20h
  - Complex system change: 20+h (usually skip unless high bounty)
```

### Step 7: Output

Return analysis report containing:
- Feasibility: go / risky / skip
- Score with breakdown
- Repo profile (saved to intelligence/)
- Specific implementation approach (high-level)
- Estimated time
- Risk factors
- Required conventions checklist
