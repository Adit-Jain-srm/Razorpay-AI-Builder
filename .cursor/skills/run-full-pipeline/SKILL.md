# Run Full Pipeline

The master orchestrator for the autonomous OSS contribution agent. This skill is self-invoking -- it determines what to do, does it, then recommends the next action.

## Pre-Flight (MANDATORY before ANY execution)

**ALWAYS read `AGENTS.md` first.** Before running any phase:
1. Check **Per-Repo Learnings** for the target repo (branch conventions, maintainer style, CI quirks)
2. Check **Failure Post-Mortems** for mistakes NOT to repeat
3. Check **Hard Rules** and **Elite SDE Mindset** checklist
4. Check **Learned Preferences** for behavioral patterns

Think deeply: "What is the SMARTEST action right now? Not the fastest. Not the most obvious. The one with the highest P(merge) and lowest P(wasted effort)."

## Invocation

Trigger this skill to run a full autonomous contribution cycle. It chains all other skills automatically based on the decision engine.

## Execution Flow

### Phase 0: State Assessment (decision-engine)

Before doing anything, assess current state:

1. **Check pending PRs** for any that need attention:
   ```bash
   # Check all our open PRs across repos
   gh search prs "author:Adit-Jain-srm is:open" --json repository,number,title,url,updatedAt,reviews --limit 20
   ```

2. **Check recently merged PRs** (for follow-up opportunities):
   ```bash
   gh search prs "author:Adit-Jain-srm is:merged sort:updated" --limit 5 --json repository,number,title,mergedAt
   ```

3. **Load RL state** from `intelligence/strategies/rl-state.json`

4. **Read last session's NEXT ACTION** recommendation (if any)

5. **Check pending issue assignments** (issues we commented on asking for assignment):
   ```bash
   # For each issue in intelligence/strategies/pending-assignments.md:
   gh issue view {number} --repo {owner}/{repo} --json assignees,comments --jq "{assignees: [.assignees[].login], commentCount: (.comments | length)}"
   ```
   - If assigned to us → immediately proceed to Phase 5 (Contribution) for that issue
   - If assigned to someone else → remove from pending list, move on
   - If still unassigned → leave in pending list, check again next run
   - If maintainer replied with questions → answer immediately

### Phase 0.5: PR Monitoring (if pending PRs exist)

For each open PR:
```bash
# Check PR status -- ALWAYS include both comments AND reviews (bots post as either)
gh pr view {number} --repo {owner}/{repo} --json state,reviews,comments,updatedAt

# CRITICAL: Check if the PARENT ISSUE is still open
gh issue view {issue_number} --repo {parent_owner}/{parent_repo} --json state --jq .state
```

**If parent issue is CLOSED (resolved by someone else or maintainer):**
- Close our PR immediately:
  ```bash
  gh pr close {pr_number} --repo {owner}/{repo} --comment "Closing — the parent issue has been resolved. Thank you!"
  ```
- Update contribution log: status → "closed (issue resolved)"
- Update RL state: no penalty (external event, not our failure)
- Move on immediately

**If parent issue is still OPEN but our PR has no reviews after 14+ days:**
- Consider closing with a polite note (repo may be unresponsive)
- Or leave open but deprioritize — don't count on it

**If bot comments require action (COMMON - handle immediately):**
Automated bots frequently comment on PRs requiring response:

| Bot | What it wants | How to handle |
|-----|---------------|---------------|
| CLA Assistant / DCO bot | Sign CLA or add sign-off | Sign the CLA link OR add `Signed-off-by` to commits |
| changeset-bot | Add changeset file | Create `.changeset/{name}.md` with package + semver type |
| CodeRabbit / Copilot | Code review suggestions | Read suggestions, apply valid ones, dismiss others |
| codecov / coveralls | Coverage report | Informational only, no action unless coverage dropped |
| vercel / netlify bot | Deploy preview | Informational, but check preview works |
| stale bot | Marks PR as stale | Comment to keep alive: "Still working on this" |
| label bot | Adds/requests labels | Follow instructions if any |
| ProposalPolice | Checks for duplicates | If flagged as duplicate, explain why ours is different |

**Action protocol for bot comments:**
```bash
# Fetch latest comments
gh pr view {number} --repo {owner}/{repo} --json comments --jq '.comments[-3:] | .[] | {author: .author.login, body: (.body | .[:200])}'
```
- If CLA/DCO required: complete it immediately (sign link, or `git commit --amend -s` + force push)
- If changeset required: create the file and push
- If coverage dropped: assess if we need to add tests
- If stale bot warned: comment to keep alive
- Ignore purely informational bots (deploy previews, metrics)
- **NEVER close/stop the pipeline because of a bot comment.** Handle it (sign CLA, add changeset, etc.) and continue with other work in parallel.

**If new comments since our last response:**
- Invoke `contribute-to-repo` skill in REVIEW RESPONSE mode
- Address all comments
- Push fixes if needed
- Reply to each review comment

**If merged:** 
- Update contribution log: status → "merged", add merged date
- Update RL state: increment merges for repo, increase weight
- Update dashboard stats (win rate, streak)
- **Post-merge cleanup:**
  ```bash
  # Delete the branch from our fork
  gh api -X DELETE repos/Adit-Jain-srm/{repo}/git/refs/heads/{branch_name} 2>/dev/null
  
  # If this was the only branch (besides main), consider deleting the fork
  # gh repo delete Adit-Jain-srm/{repo} --yes  # Only if no other active work
  ```
- Check for follow-up opportunities in same repo
- Look for related issues maintainer may have linked

**If closed by maintainer:** Log post-mortem, update RL state, extract lessons

### Phase 0.75: Discussion Monitoring (MANDATORY every run)

Check all past discussions where we've posted answers. Only respond if genuinely needed — otherwise skip silently.

**Discussion registry:** `dashboard/ACHIEVEMENTS.md` lists all posted discussion answers with URLs.

**Step 1: Fetch all threads we've participated in (INCLUDING threaded replies)**

GitHub discussions have TWO levels: top-level comments AND nested replies (threaded under each comment). BOTH must be fetched or you will miss responses entirely.

```bash
# For each discussion URL in dashboard/ACHIEVEMENTS.md:
# CRITICAL: Include replies(first: 10) inside each comment node!
gh api graphql -f query='query {
  repository(owner: "{owner}", name: "{repo}") {
    discussion(number: {N}) {
      title
      closed
      answerChosenAt
      comments(first: 20) {
        nodes {
          id
          author { login }
          body
          createdAt
          replies(first: 10) {
            nodes {
              author { login }
              body
              createdAt
            }
          }
        }
      }
    }
  }
}' --jq '.data.repository.discussion'
```

**Why this matters:** On GitHub Discussions, users often reply in **threaded replies** (nested under a comment), NOT as new top-level comments. If you only fetch `.comments.nodes[]` without `.replies.nodes[]`, you will MISS all OP follow-ups, maintainer corrections, and new questions. This was a real failure — we missed 11 replies from a user for hours because we only checked top-level comments.

**Step 2: Determine if action is needed (Decision Matrix)**

For each discussion thread, check BOTH top-level comments AND threaded replies under our comments. Classify into exactly one category:

| Scenario | Action |
|----------|--------|
| No new comments OR replies since our last post | SKIP — nothing to do |
| New **threaded reply** from OP under our comment (follow-up question) | EVALUATE — likely needs reply |
| New **threaded reply** from OP under our comment (thank you / resolved) | LOG — may lead to answer acceptance |
| New comment from maintainer correcting us | ACKNOWLEDGE — thank them, correct or delete our answer |
| New comment from another user answering better | SKIP — don't pile on |
| OP marked another answer as accepted | SKIP — move on |
| Thread was closed/locked | SKIP — remove from tracking |
| Our answer was marked as accepted | LOG — update ACHIEVEMENTS.md |

**IMPORTANT: Check `replies` on EVERY one of our comments, not just the latest.** Users may reply to our first comment days after we posted a correction as a second comment.

**Step 3: Self-Evaluation Gate (BEFORE responding)**

If Step 2 determined a reply is needed, STOP and verify ALL of the following:

1. **Read the FULL thread** — not just the latest comment. Understand the entire conversation arc.
2. **Read the repo source** — verify any technical claim against actual code before posting. Use `gh api repos/{owner}/{repo}/contents/{path}` or `search/code` API.
3. **Cross-check our prior answer** — is it still accurate? Did we get anything wrong that needs correction?
4. **Ask: "Am I adding value?"** — If the answer is "just agreeing" or "restating what's already said," do NOT reply.
5. **Ask: "Am I 100% certain this is factually correct?"** — If ANY doubt exists, do NOT post. Silence > wrong information.
6. **Ask: "Could this damage reputation?"** — If the response could be seen as wrong, presumptuous, or AI-generated filler, do NOT post.

**HARD RULES:**
- NEVER respond unless you have verified EVERY technical claim against source code or official docs
- NEVER assume an API, CLI command, or config option exists — verify it first
- NEVER respond just to "stay active" in a thread — only if genuinely helpful
- NEVER contradict a maintainer — if they corrected us, acknowledge and learn
- NEVER respond to a thread where someone already gave a better answer
- If corrected by a maintainer: immediately update AGENTS.md with the learning
- Prefer SHORT, precise replies over long explanations
- Include links to source files/docs as evidence for every claim

**Step 4: Compose and Post (only if Step 3 passed)**

```bash
# Write reply to temp file for review
# Then post via GraphQL mutation:
gh api graphql --input payload.json --jq '.data.addDiscussionComment.comment.url'
```

**Step 5: Update tracking**

- If answer was accepted → update `dashboard/ACHIEVEMENTS.md`
- If thread closed/locked → remove from active tracking
- If we posted a correction → note in AGENTS.md "Per-Repo Learnings"
- If maintainer corrected us → add to AGENTS.md "Failure Post-Mortems"

### Phase 1: Discovery (parallel via subagents)

Invoke `discover-bounties` skill which uses:

**GitHub CLI Sources:**
- Algora bounty labels
- Generic bounty/reward labels  
- Curated target repos from `config/targets.json`
- Patience scanner (stale PRs)
- Achievement router (if enabled)

**Web Intelligence Sources (MCP-powered):**
- Bright Data `search_engine` for Algora bounties, dev.to articles
- Exa `web_search` for emerging paid OSS programs
- Bright Data `scrape_as_markdown` for bounty board pages
- Built-in WebSearch as fallback

**Aggregator Repos (check periodically):**
- `kunovsky/paid-open-source-projects` -- curated paid OSS list
- `firstcontributions/first-contributions` -- beginner-friendly repos
- `MunGell/awesome-for-beginners` -- awesome list by language
- OSS project lists on dev.to and Reddit

### Phase 2: Competitive Intelligence

For top 3-5 candidates, invoke `competitive-intel` skill:
- Fetch existing PRs on each issue
- Analyze why they failed/are stale
- Build superiority briefs
- Store in `intelligence/competitive-analysis/`

### Phase 3: Deep Analysis

For the best candidate, invoke `analyze-opportunity` skill:
- Read CONTRIBUTING.md + `.github/` templates
- Detect linter/formatter configs
- Analyze recent merged PRs for conventions
- Build/update repo profile
- Score feasibility

Always cross-reference with `default-guidelines` skill for minimum standards.

### Phase 4: Selection (decision-engine scoring)

Apply RL-weighted scoring:
```
final_score = (
  base_score * rl_repo_weight *
  competition_factor * 
  follow_up_bonus *
  achievement_alignment
)
```

Present top pick with rationale. If in full-auto mode, proceed. Otherwise, human gate.

### Phase 5: Contribution

Invoke `contribute-to-repo` skill:
- Fork, clone, branch
- Deep codebase read
- Implement following ALL conventions
- Run tests + lint
- Human review gate
- Push + create PR
- Comment on issue if bounty platform requires

### Phase 5.5: Post-Submission Bot Check (MANDATORY)

**Immediately after creating a PR, ALWAYS wait 30-60 seconds then check for bot comments.**

This is NOT optional. Bots respond within seconds of PR creation and often require immediate action (CLA signing, changeset files, etc.). Ignoring them delays review.

```bash
# Wait for bots to respond
Start-Sleep -Seconds 30

# Check for bot comments AND reviews (bots use BOTH)
gh pr view {number} --repo {owner}/{repo} --json comments,reviews --jq '{comments: [.comments[] | {author: .author.login, body: (.body | .[:200])}], reviews: [.reviews[] | {author: .author.login, state: .state, body: (.body | .[:200])}]}'
```

**Handle immediately based on bot type:**
- CLA bot → sign the CLA link
- changeset-bot → create `.changeset/` file and push
- CodeRabbit/Copilot/cubic → read suggestions, apply valid ones
- Label bot → follow instructions
- Any other → assess if action needed or informational only

**If a review or CI check is still IN PROGRESS (not yet completed):**
- Wait incrementally: check again after 30s, then 60s, then 120s
- Don't move to Phase 6 until pending reviews/checks resolve
- If still running after 5 minutes total, proceed but note to recheck next pipeline run
```bash
# Check CI status
gh pr checks {number} --repo {owner}/{repo} 2>&1 | Select-String "pending|in_progress|queued"
# If any are still running, wait and recheck
```

**Only proceed to Phase 6 after bot comments/reviews are checked AND no pending reviews remain (or timeout hit).**

### Phase 6: Tracking & Learning

Invoke `track-contribution` skill:
- Log contribution to `contributions/YYYY-MM/`
- Update `dashboard/` stats

Invoke `reinforcement-learning` skill:
- Update repo weights
- Update issue-type weights
- Record competition data
- Adjust epsilon if needed

Invoke `achievement-engine` skill (if enabled):
- Check if PR advances any achievement
- Update progress tracking

### Phase 7: Next Action Recommendation

Based on everything that happened in this run, determine and store:

```markdown
## Next Action
- ACTION: {specific next step}
- REASON: {why this is highest priority}
- TIMING: {immediately / next session / after event}
- SKILL_CHAIN: {which skills to invoke}
- DEPENDENCIES: {what must happen first}
```

Store this in `intelligence/strategies/next-action.md` for the next invocation.

## Automatic Follow-Up Detection

After EVERY contribution, check:

1. **Same bug, different package?** (like bom-csv → pnp-csv)
   - Search the parent issue for mentions of other packages
   - If found: queue as highest-priority next action

2. **Maintainer suggested related work?**
   - Check if maintainer commented on our PR linking another issue
   - If found: add to high-priority queue

3. **Repo has more easy issues?**
   - List open issues in same repo, filter by our capabilities
   - Repeat contributions have ~80% merge rate

4. **Achievement opportunity?**
   - If repo has Discussions with unanswered questions → Galaxy Brain
   - If we're close to Pull Shark tier → find more easy-merge targets

## Skill Invocation Order

```
1. decision-engine → determines mode (monitor / follow-up / fresh-run)
2. default-guidelines → loads baseline standards
2.5 discussion-monitor → checks past discussion threads, responds ONLY if verified necessary
3. discover-bounties → finds opportunities (if fresh-run mode)
4. competitive-intel → analyzes competition (if opportunities found)
5. analyze-opportunity → deep-reads repo (for selected target)
6. contribute-to-repo → implements + submits (or responds to review)
7. track-contribution → logs everything
8. reinforcement-learning → updates weights
9. achievement-engine → checks progress
10. decision-engine → determines NEXT ACTION
11. **sync-and-push → updates all docs + atomic commit + push**
```

## Phase 8: Sync & Push (RUNS AFTER EVERY ACTION)

This phase is MANDATORY after any pipeline action -- discovery, contribution, PR monitoring, or tracking update. It ensures the oss-contributions repo is always up-to-date.

### Step 1: Update All Documentation

After any action, regenerate/update these files:

**Dashboard Stats** (`dashboard/README.md`):
- Re-count total PRs submitted/merged from `contributions/` logs
- Recalculate win rate, earnings, ROI
- Update "Active PRs Under Review" section
- Update streak from last contribution date

**Earnings Ledger** (`dashboard/EARNINGS.md`):
- Append any new bounty transactions
- Recalculate totals

**Achievement Progress** (`dashboard/ACHIEVEMENTS.md`):
- Update progress numbers based on latest PR count
- Mark newly unlocked achievements

**Weekly Report** (`dashboard/WEEKLY-REPORT.md`):
- Append actions taken this session
- Update weekly totals

**Streak** (`dashboard/STREAK.md`):
- Update last contribution date to today (if action was taken)
- Recalculate current streak length

**AGENTS.md**:
- Append any new learnings to "Learned Preferences"
- Update "Per-Repo Learnings" table if new repo was contributed to
- Update "Strategy Evolution Log" if strategy changed

**Next Action** (`intelligence/strategies/next-action.md`):
- Write the decision-engine's recommended next action

### Step 2: Atomic Git Commit & Push

After all docs are updated, execute a single atomic commit:

```bash
# Stage only tracking/docs files (never stage worktree code)
git add \
  contributions/ \
  dashboard/ \
  intelligence/ \
  AGENTS.md \
  config/

# Commit with descriptive message
git commit -m "sync: update tracking after {action_summary}" \
  -m "{brief description of what happened this session}"

# Push immediately (retry on network failure)
git push origin main || (sleep 5 && git push origin main)
```

### Commit Message Convention for Sync Commits

| Action Taken | Commit Message |
|--------------|---------------|
| PR submitted | `sync: track PR submission to {owner}/{repo}#{number}` |
| PR status changed | `sync: update {owner}/{repo}#{number} status → {new_status}` |
| Discovery run | `sync: discovery run - {N} opportunities found` |
| Review responded | `sync: responded to review on {owner}/{repo}#{number}` |
| RL state updated | `sync: RL weights updated after {event}` |
| Achievement unlocked | `sync: achievement unlocked - {achievement_name}` |
| Strategy changed | `sync: strategy update - {what changed}` |

### Rules

- NEVER skip this phase. Every pipeline run ends with sync-and-push.
- NEVER commit worktree code (target repo code) to oss-contributions.
- ALWAYS use a single atomic commit (not multiple small ones per file).
- If push fails due to network: retry after 5s. If still fails: commit is safe locally, push next run.
- The commit adds to your GitHub contribution graph (green squares) every time.

## Error Recovery

- If gh CLI fails: wait 5s, retry. If fails again: wait 15s, retry once more.
- If subagent fails: retry with simpler prompt. If fails again: do it directly.
- If network drops: pause, retry in 3-5s. Network fluctuations are brief.
- If a test fails after our changes: debug and fix, don't skip.
- If PR creation fails: verify fork exists, branch pushed, then retry.

## Configuration Reference

| File | Controls |
|------|----------|
| `config/targets.json` | Which repos/platforms to scan |
| `config/preferences.json` | Tech stack, competition thresholds, timing |
| `config/achievements.json` | Achievement engine toggle + targets |
| `config/payment-methods.json` | Payment setup status |
| `intelligence/strategies/rl-state.json` | Learned weights |
| `intelligence/strategies/next-action.md` | Queued next action |
