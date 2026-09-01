# Achievement Engine

Analyze GitHub profile achievements and strategically route contributions to level up.

## Toggle

Check `config/achievements.json` -> `"enabled"` field.
- If `false`: STOP. Do not execute this skill. Return immediately.
- If `true`: proceed with mode specified in `contribution_routing.achievement_mode`.

## Modes

- **opportunistic** (default): Only suggest achievement-advancing contributions when they align with primary (contributions) and secondary (money) goals. Never sacrifice a paid opportunity for an achievement.
- **aggressive**: Dedicate ~20% of discovery runs purely to achievement hunting. May suggest unpaid doc fixes, discussion answers, or own-repo actions.

## Process

### Step 1: Profile Analysis

Fetch current GitHub profile state:
```bash
# Get profile info
gh api /users/Adit-Jain-srm --jq '{login, public_repos, followers, following, created_at}'

# Get contribution activity (recent)
gh api /users/Adit-Jain-srm/events --jq '.[] | {type, repo: .repo.name, created_at: .created_at}' | head -50

# Get repos for star count
gh api /users/Adit-Jain-srm/repos --jq '.[] | {name, stargazers_count, fork}' | sort_by(.stargazers_count) | reverse
```

### Step 2: Achievement Status Check

Map current state to achievement tiers:

**Pull Shark:**
- Count total merged PRs across all repos
- ```bash
  gh search prs "author:Adit-Jain-srm is:merged" --limit 200 --json url | jq length
  ```
- Tiers: Default (2), Bronze (16), Silver (128), Gold (512)

**Galaxy Brain:**
- Count accepted discussion answers
- Check discussions in repos we've contributed to
- Tiers: Default (2), Bronze (8), Silver (16), Gold (32)

**Pair Extraordinaire:**
- Count co-authored commits
- Tiers: Default (10), Bronze (24), Silver (48), Gold (96)

**Starstruck:**
- Max stars on any owned repo
- ```bash
  gh api /users/Adit-Jain-srm/repos --jq 'max_by(.stargazers_count) | {name, stars: .stargazers_count}'
  ```
- Tiers: Default (16), Bronze (128), Silver (512), Gold (4096)

### Step 3: Identify Closest Targets

Rank achievements by "effort to next tier":
- Pull Shark: {current}/16 -> need {remaining} merged PRs
- Galaxy Brain: {current}/2 -> need {remaining} accepted answers
- Etc.

Focus on the achievement closest to its next tier.

### Step 4: Generate Achievement Actions

Based on mode and closest targets:

**For Pull Shark (most aligned with primary goal):**
- Every merged PR counts - this is achieved through normal workflow
- In aggressive mode: find easy-merge repos (doc fixes, typo fixes)

**For Galaxy Brain:**
- After submitting a PR to a repo, check their Discussions tab
- Find unanswered questions you can answer authoritatively
- ```bash
  gh api repos/{owner}/{repo}/discussions --jq '.[] | select(.answer_chosen_at == null) | {number, title}'
  ```

**For Pair Extraordinaire:**
- When collaborating on an issue with another developer
- Add `Co-authored-by: Name <email>` to commits when working from someone else's approach

**For Starstruck:**
- Make the oss-contributions repo genuinely useful (this README, tooling)
- Create a useful open-source tool that others would star
- Share the repo on dev.to, Reddit, etc.

### Step 5: Route Contributions

In **opportunistic** mode:
- When scoring opportunities, add +0.1 to score if the repo has Discussions (Galaxy Brain opportunity)
- When a PR is merged, automatically check for answerable discussions
- Prefer repos where we're close to another achievement

In **aggressive** mode:
- Reserve 1 in 5 runs for pure achievement actions:
  - Find and submit trivial doc fixes to high-merge-rate repos (Pull Shark)
  - Answer 1-2 discussions in repos we know (Galaxy Brain)
  - Create a useful script/tool and publicize (Starstruck)

### Step 6: Update Achievement State

After any achievement-relevant action:
- Update `config/achievements.json` with new progress
- Update `dashboard/ACHIEVEMENTS.md`
- Log in contribution tracker

## Output

Return:
- Current achievement state
- Next targets with effort estimate
- Recommended actions for this run (if any)
- Whether to inject achievement-route issues into discovery results
