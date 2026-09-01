# Discover Bounties & Contribution Opportunities

## Pre-Flight (MANDATORY)

**Read `AGENTS.md` before discovery:**
1. Check **Per-Repo Learnings** - which repos have we already contributed to successfully? Repeat contributions have ~80% merge rate.
2. Check **Failure Post-Mortems** - which repo patterns to AVOID (internal-only, vouch-gated, agent-bait)?
3. Check **Learned Preferences** - what strategies have the highest yield?
4. Apply **Elite SDE Mindset** - think SMART, not broad. Target high-P(merge) opportunities, not just any open issue.

## Purpose

Find high-acceptance-probability contribution opportunities across the open-source ecosystem. Optimized for MERGE RATE over bounty size - a merged PR to a well-known repo is worth more than a $100 bounty that never gets reviewed.

## Inputs

- `config/targets.json` - Curated repo list
- `config/preferences.json` - Filters (min bounty, tech stack, etc.)
- `config/achievements.json` - Whether to include achievement-only routes
- `intelligence/strategies/rl-state.json` - Learned repo weights
- `intelligence/strategies/repo-evaluation-pool.json` - Pre-evaluated repos (if exists)

## Critical Pre-Filters (Apply BEFORE Investigating Any Issue)

These eliminate wasted time on repos that will NEVER merge our PRs:

```
HARD SKIP if ANY of:
  - Repo created < 6 months ago with > 20 "bounty" labeled issues (SCAM)
  - Only 1-3 unique authors in last 20 merged PRs (INTERNAL ONLY)
  - All issues labeled "bug: upstream" (NOT FIXABLE in this repo)
  - Repo is archived or no push in > 60 days (DEAD)
  - Issue has > 5 open PRs already (OVERSATURATED)
  - Stars:forks ratio < 1:10 (BOT FARM indicator)
  - Issue body mentions specific hardware/platform we can't test (iOS-only, etc.)
  - Repo requires vouch/application/CLA we haven't completed
```

## Discovery Strategies (ordered by ROI)

### Strategy 1: Repeat Contribution to Proven Repos (HIGHEST ROI)

Check repos where we already have:
- A merged PR (80% merge rate on follow-ups)
- A pending PR with positive review signals (the maintainer knows us)

```bash
# For each repo in rl-state.json with merges > 0:
gh issue list --repo {owner}/{repo} --state open --label "bug" --json number,title,comments,createdAt --limit 10
gh issue list --repo {owner}/{repo} --state open --label "help wanted" --json number,title,comments,createdAt --limit 10
```

### Strategy 2: High-Merge-Rate Repo Scanning

Target repos PROVEN to merge external PRs. Score = unique external authors in last 20 merged PRs.

**Tier 1: Known High-Merge-Rate (verified externals merge)**
```
# MCP/AI ecosystem (hot right now, fast reviews)
- intuit/quickbooks-online-mcp-server (7-day SLA, proven)
- anthropics/anthropic-sdk-python
- langchain-ai/langchain
- openai/openai-python
- vercel/ai

# Developer tools (active communities, merge externals)
- honojs/hono (fast, lightweight, merges externals)
- oven-sh/bun
- biomejs/biome
- oxc-project/oxc
- astral-sh/ruff
- astral-sh/uv
- jsr-io/jsr

# Infrastructure (large teams, welcome contributors)
- docker/compose
- grafana/grafana
- prometheus/prometheus
- hashicorp/terraform-provider-aws

# Web frameworks (proven external merge history)
- sveltejs/svelte
- solidjs/solid
- preactjs/preact
- fastify/fastify

# Databases & ORMs
- prisma/prisma
- kysely-org/kysely
- electric-sql/pglite

# Testing & Quality
- vitest-dev/vitest (many external merges)
- biomejs/biome
- eslint/eslint

# Payment/bounty repos
- calcom/cal.com (Algora bounties, $100-2500)
- twentyhq/twenty (Algora, $100-2500)
- documenso/documenso (Algora)
- formbricks/formbricks (Algora)
- openstatushq/openstatus (Algora)
- midday-ai/midday (Algora)
```

For each, check for fresh issues:
```bash
gh issue list --repo {owner}/{repo} --state open --json number,title,labels,comments,createdAt --limit 15 \
  --jq '[.[] | select((.comments | length) <= 2) | {number, title, labels: [.labels[].name], comments: (.comments | length), age: .createdAt}]'
```

### Strategy 3: Acceptance Likelihood Verification

Before ANY issue gets scored, verify the repo actually merges externals:

```bash
# Get unique authors of last 20 merged PRs
gh pr list --repo {owner}/{repo} --state merged --json author --limit 20 --jq '[.[].author.login] | unique'
```

**Scoring:**
- 10+ unique authors → OPEN COMMUNITY (excellent)
- 5-9 unique authors → SELECTIVE (good, target uncontested issues)
- 2-4 unique authors → LIKELY INTERNAL (skip unless we see clear external merges)
- 1 author → SOLO MAINTAINER (only worth it if they explicitly ask for help)

### Strategy 4: Fresh Issue Harvesting (Zero Competition)

Find issues created in the last 3-7 days with 0 existing PRs:

```bash
# TypeScript repos, 500+ stars, bug label, recent
gh search issues --state=open --sort=created --order=desc --label="bug" --language=TypeScript \
  --json repository,number,title,commentsCount,url --limit 20 \
  -- stars:">500" created:">$(date -d '7 days ago' +%Y-%m-%d)"

# Python repos
gh search issues --state=open --sort=created --order=desc --label="bug" --language=Python \
  --json repository,number,title,commentsCount,url --limit 20 \
  -- stars:">500" created:">$(date -d '7 days ago' +%Y-%m-%d)"

# Go repos
gh search issues --state=open --sort=created --order=desc --label="bug" --language=Go \
  --json repository,number,title,commentsCount,url --limit 20 \
  -- stars:">500" created:">$(date -d '7 days ago' +%Y-%m-%d)"

# Rust repos
gh search issues --state=open --sort=created --order=desc --label="bug" --language=Rust \
  --json repository,number,title,commentsCount,url --limit 20 \
  -- stars:">500" created:">$(date -d '7 days ago' +%Y-%m-%d)"
```

Then filter for 0-comment issues (nobody else looking yet):
```bash
# For each result where commentsCount == 0, verify no PRs:
gh pr list --repo {owner}/{repo} --search "#{issue_number}" --state open --json number --jq 'length'
```

### Strategy 5: Label-Based Discovery (Broader Net)

Search for specific labels that indicate maintainer-approved work:

```bash
# "help wanted" — maintainer explicitly asking for help
gh search issues --state=open --sort=updated --label="help wanted" \
  --json repository,number,title,commentsCount --limit 30

# "good first issue" — low barrier, fast merge (reputation building)
gh search issues --state=open --sort=created --label="good first issue" \
  --json repository,number,title,commentsCount --limit 30

# "contributions welcome" — explicit invitation
gh search issues --state=open --sort=created --label="contributions welcome" \
  --json repository,number,title,commentsCount --limit 20

# "easy" or "beginner" — quick wins
gh search issues --state=open --sort=created \
  --json repository,number,title,commentsCount --limit 20 \
  -- label:easy OR label:beginner OR label:"low hanging fruit"
```

### Strategy 6: Bounty Platform Scanning

**Algora (GitHub labels):**
```bash
gh search issues --label="💎 Bounty" --state=open --sort=created \
  --json repository,number,title,labels,commentsCount --limit 50
```

**Generic bounty labels:**
```bash
gh search issues --state=open --sort=created \
  --json repository,number,title,labels,commentsCount --limit 30 \
  -- label:bounty OR label:reward OR label:paid
```

**Web scraping (Bright Data MCP):**
```json
// Algora active bounties
CallMcpTool: server="user-brightdata-mcp", toolName="scrape_as_markdown"
arguments: { "url": "https://algora.io/bounties" }

// cal.com bounties
CallMcpTool: server="user-brightdata-mcp", toolName="scrape_as_markdown"
arguments: { "url": "https://console.algora.io/org/calcom/bounties" }
```

**Web search (Exa MCP - neural search):**
```json
CallMcpTool: server="plugin-exa-exa", toolName="web_search_exa"
arguments: { "query": "open source projects paying contributors bounties TypeScript Python 2026", "numResults": 10 }
```

### Strategy 7: Patience Harvesting (Stale Competition)

Find issues where existing PRs have gone stale (14+ days without update):

```bash
# Issues with bounties that have stale PRs
gh search issues --state=open --sort=updated-asc \
  --json repository,number,title,commentsCount --limit 30 \
  -- label:bounty comments:">3"
```

For each, check PR freshness:
```bash
gh pr list --repo {owner}/{repo} --search "#{issue_number}" --state open \
  --json number,updatedAt,author --jq '[.[] | {number, updatedAt, author: .author.login}]'
```

If all PRs are > 14 days stale → HIGH PRIORITY TARGET.

### Strategy 8: Trending Repo Opportunities

Fresh trending repos often have issues that need fixing but lack contributor attention:

```bash
# Check what's trending via GitHub API
gh api /search/repositories --method GET -f q="stars:>1000 pushed:>$(date -d '3 days ago' +%Y-%m-%d) language:TypeScript" -f sort=stars -f per_page=10 --jq '.items[].full_name'
```

For each trending repo, scan for contribution opportunities:
```bash
gh issue list --repo {trending_repo} --state open --label "bug" --json number,title,comments --limit 5
```

### Strategy 9: MCP/AI Ecosystem (Hot Category)

The MCP ecosystem is exploding — new servers need contributions daily:

```bash
# Search for MCP-related repos with issues
gh search issues --state=open --sort=created \
  --json repository,number,title,commentsCount --limit 20 \
  -- "MCP" OR "model context protocol" label:bug

# GitHub Topics: mcp, model-context-protocol
gh search repos --topic=mcp --sort=stars --json fullName,stargazersCount --limit 20
```

For each MCP repo found:
```bash
gh issue list --repo {owner}/{repo} --state open --json number,title,labels,comments --limit 10
```

### Strategy 10: Changelog/Release Mining

Repos that just released a new version often have fresh bugs from the release:

```bash
# Find repos with recent releases
gh search repos --json fullName,stargazersCount --limit 10 \
  -- stars:">1000" pushed:">$(date -d '2 days ago' +%Y-%m-%d)"
```

Check their issue tracker for post-release bug reports:
```bash
gh issue list --repo {owner}/{repo} --state open --sort=created --json number,title,labels,createdAt --limit 10
```

### Strategy 11: WebSearch Fallback (when gh search returns noise)

The GitHub search API is heavily polluted with scam repos and has limited filtering. When strategies 1-10 return noise, use WebSearch:

```
WebSearch: "GitHub repos looking for contributors 2026 TypeScript Python open issues help wanted"
WebSearch: "open source onboarding issues 2026 new contributors welcome"
WebSearch: "site:github.com good first issue TypeScript 1000 stars 2026"
```

This found LMCache (8K stars, explicit 2026 onboarding) that gh search never surfaced. WebSearch sees blog posts, dev.to articles, and GitHub pages that the API doesn't index.

**When to use:** After 2+ strategies return only scam repos, already-fixed issues, or internal-only repos.

---

## Scoring Algorithm (v2)

```
final_score = (
  acceptance_score *      # Will this repo actually merge an external PR?
  issue_quality *         # Is this a clear, fixable issue?
  competition_factor *    # How many others are working on this?
  reputation_value *      # How much is this repo worth for our profile?
  timing_bonus            # Is the timing right?
)

acceptance_score (0-1):
  - 10+ unique merging authors in last 20 PRs: 1.0
  - 5-9 unique: 0.7
  - 2-4 unique: 0.3
  - 1 (solo maintainer): 0.1
  - Never merged externals: 0.0 (SKIP)

issue_quality (0-1):
  - Has clear reproduction steps: +0.3
  - Has "help wanted" or "good first issue" label: +0.2
  - Body mentions specific file/function to fix: +0.3
  - Maintainer commented with guidance: +0.2
  - Vague/unclear requirements: -0.3
  - Requires platform we can't test: -1.0 (SKIP)

competition_factor (0-1):
  - 0 existing PRs: 1.0
  - 1 PR (stale >14 days): 0.9
  - 1-2 active PRs: 0.6
  - 3-5 PRs (but mostly AI slop): 0.4 if bounty >$200, else 0.3
  - 3-5 PRs (quality competitors): 0.2
  - 5-8 PRs: 0.15 (only if $200+ bounty AND visible quality gap)
  - 8+ PRs: 0.05 (effectively skip unless $500+ AND all garbage)
  - NOTE: "AI slop" = no tests, doesn't follow CONTRIBUTING.md, generic
    descriptions, no issue reference. If competitors are slop, discount them.

reputation_value (0.1-2.0):
  - CRITICAL: Check stars on the INDIVIDUAL REPO, not org level!
  - Multi-repo orgs: tscircuit/dsn-converter = 6 stars, NOT tscircuit/tscircuit = 2.2K
  - The PR goes to the SUB-PACKAGE — that's what counts for reputation
  - Verify with: gh repo view {owner}/{repo} --json stargazerCount --jq .stargazerCount
  - 50K+ stars on THIS REPO (React, Next.js, Vite): 2.0
  - 10K-50K stars on THIS REPO (well-known projects): 1.5
  - 1K-10K stars on THIS REPO (solid projects): 1.0
  - 100-1K stars on THIS REPO (niche but useful): 0.5
  - Fortune 500 company repo (any stars): 1.5
  - CNCF/Apache project: 1.8
  - <100 stars (sub-package of popular org): 0.3 (low rep unless bounty)
  - <100 stars with bounty: 0.3

timing_bonus (0.5-1.5):
  - Issue created 24-72h ago (sweet spot): 1.5
  - Issue created 3-14 days ago (competition thinning): 1.3
  - Issue created 14-30 days ago (patience harvesting): 1.2
  - Issue created < 24h ago (too hot): 0.5
  - Issue created > 30 days ago (might be stale/intentionally ignored): 0.8

bounty_bonus (additive):
  - $50-100 bounty: +0.5
  - $100-500 bounty: +1.0
  - $500+ bounty: +2.0
  - No bounty but high-rep repo: +0.0 (reputation IS the reward)
```

## Deduplication & Final Filtering

After all sources are scanned:

1. **Deduplicate** by issue URL
2. **Verify issue not already fixed** — BEFORE implementing, grep the default branch:
   ```bash
   # Clone shallow and check if the bug still exists
   # If the code mentioned in the issue has already been changed, it's likely fixed
   gh api repos/{owner}/{repo}/contents/{file_path} -H "Accept: application/vnd.github.raw" | Select-String "{pattern}"
   ```
3. **Check INDIVIDUAL repo stars** (not org stars):
   ```bash
   gh repo view {owner}/{repo} --json stargazerCount --jq .stargazerCount
   ```
4. **Cross-check RL state** — skip repos with weight=0 (blocked/gated)
5. **Verify issue still open** (for web-sourced results)
6. **Check for CLA/DCO requirements** we haven't completed
7. **Rank by final_score descending**
8. **Present top 5** to the decision engine

## Output Format

```json
{
  "discovered": [
    {
      "url": "https://github.com/owner/repo/issues/123",
      "repo": "owner/repo",
      "stars": 15000,
      "issue_number": 123,
      "title": "Issue title",
      "type": "bug|feature|docs|refactor|test",
      "labels": ["bug", "help wanted"],
      "bounty_usd": 0,
      "competition": { "open_prs": 0, "stale_prs": 0, "comments": 2 },
      "acceptance_score": 0.9,
      "final_score": 4.2,
      "source": "strategy_4_fresh_harvest",
      "priority": "contribution|money|achievement",
      "notes": "Zero competition, maintainer asked for help, clear repro"
    }
  ],
  "skipped": [
    { "url": "...", "reason": "internal-only merges" },
    { "url": "...", "reason": "5+ competing PRs" }
  ],
  "metadata": {
    "sources_scanned": 10,
    "issues_found": 47,
    "passed_filters": 12,
    "top_5_presented": 5,
    "timestamp": "2026-06-02T04:00:00Z"
  }
}
```

## Scam Detection Rules (MANDATORY)

Before ANY investment of time, check:

| Signal | Meaning | Action |
|--------|---------|--------|
| Repo created < 6 months + 50+ bounty issues | Bot farm / scam | HARD SKIP |
| Bounty labels on issues with impossible tasks ("calculate PI exactly") | Trap | HARD SKIP |
| "AI agent friendly" label + $780+ bounties | Designed to lure AI agents | HARD SKIP |
| Stars:forks ratio < 1:10 | Bot-inflated metrics | HARD SKIP |
| All merged PRs are from 1-2 internal accounts | Not accepting externals | HARD SKIP |
| Issue requires signing up for unknown platforms | Potential credential harvest | INVESTIGATE FIRST |
| "SecureBananaLabs", "oss-hunter-livefire", "mergeos-bounties" | CONFIRMED SCAMS | HARD SKIP |

## Known Scam/Useless Repos (blocklist)

```
SecureBananaLabs/bug-bounty
tine1117/oss-hunter-livefire
mergeos-bounties/mergeos
lingdojo/kana-dojo (spam issues, no real code)
kubestellar/console (bulk auto-generated docs issues)
```

## Rate Limit Management

GitHub search API has secondary rate limits. If hit:

1. Wait 60 seconds before retrying
2. Use `gh pr view` / `gh issue view` (direct lookups) instead of `gh search` where possible
3. Batch searches — don't run > 5 search queries in 30 seconds
4. Cache results in memory during the session — don't re-search the same query

## Ecosystem Intelligence (Run Weekly)

These are expensive operations — only run once per week or when discovery is dry:

### External Platforms & Organizations (beyond GitHub)

These platforms specialize in connecting contributors with projects. Use them when GitHub search returns noise or competition is saturated.

#### Tier 1: Bounty Platforms (scrape for active bounties)

| Platform | URL | Scrape Method | Payout | Notes |
|----------|-----|---------------|--------|-------|
| **Algora** | algora.io/bounties | Bright Data scrape | Stripe (10% fee) | PRIMARY. $50-$500 avg. Agent-saturated for small bounties. |
| **Opire** | app.opire.dev | Bright Data scrape | Direct (0% fee to dev) | RISING. $200-$13K bounties. Less competition. Filter by language. |
| **BountyHub** | bountyhub.org | Bright Data scrape | PayPal (0% fee) | Small but growing. Check weekly. |
| **WarpSpeed** | warpspeedopen.org/bounties | WebSearch | PayPal ($330-$960) | React Native/TS. Requires signup+approval. |
| **Tenstorrent** | (GitHub issues) | gh search | Direct ($500-$10K) | Hardware/ML. Expert-level only. |
| **Aeternity** | github.com/aeternity/bounties | gh search | CHF direct | Swiss Francs. Sophia/Erlang niche. |

```json
// Scrape Opire for active bounties (better signal-to-noise than Algora in 2026)
CallMcpTool: server="user-brightdata-mcp", toolName="scrape_as_markdown"
arguments: { "url": "https://app.opire.dev/issues" }

// Scrape Algora (still useful for TS/Python)
CallMcpTool: server="user-brightdata-mcp", toolName="scrape_as_markdown"
arguments: { "url": "https://algora.io/bounties" }
```

#### Tier 2: Issue Aggregators (find quality issues faster)

| Platform | URL | What it does | When to use |
|----------|-----|-------------|-------------|
| **CLOTributor** | clotributor.dev | CNCF Cloud Native issues | When targeting Kubernetes/infra ecosystem |
| **Up For Grabs** | up-for-grabs.net | Curated tasks for newcomers | When looking for well-mentored first issues |
| **Good First Issue** | goodfirstissue.dev | Popular repos' beginner issues | General browsing, language filtering |
| **Help Wanted** | helpwanted.dev | Real-time help-wanted issues | Quick scan for fresh opportunities |
| **CodeTriage** | codetriage.com | Sends you repos to help | Subscribe to specific repos for email alerts |

```json
// Scrape CLOTributor for CNCF opportunities (high-reputation, well-maintained)
CallMcpTool: server="user-brightdata-mcp", toolName="scrape_as_markdown"
arguments: { "url": "https://clotributor.dev/search?ts_query_web=typescript&page=1&accepted_from=&accepted_to=" }

// Scrape Up For Grabs filtered by language
CallMcpTool: server="user-brightdata-mcp", toolName="scrape_as_markdown"
arguments: { "url": "https://up-for-grabs.net/#/filters?language=typescript&tags=&names=" }
```

#### Tier 3: Foundations & Programs (long-term reputation)

| Organization | Focus | How to engage | Value |
|-------------|-------|---------------|-------|
| **CNCF** | Cloud Native (K8s, Envoy, Helm) | CLOTributor → contribute | CNCF contributor badge, massive reputation |
| **OpenJS Foundation** | Node.js, webpack, ESLint | Join Slack, pick issues | JS ecosystem credibility |
| **NumFOCUS** | Scientific Python (NumPy, Pandas) | Good first issues on repos | Data science cred |
| **Apache Foundation** | Enterprise Java/infra | JIRA issues, mailing lists | Enterprise reputation |
| **Linux Foundation** | Kernel, networking | LFX Mentorship (stipend!) | Elite-tier reputation |
| **Eclipse Foundation** | IDE, IoT, Jakarta EE | Bugzilla + GitHub issues | Enterprise Java cred |

**LFX Mentorship (CURRENT TERM: Jun-Aug 2026)**:
- Stipend: $3000-$6600 for 3 months
- Status: Selection notifications going out Jun 3 (TODAY)
- Future terms: check github.com/cncf/mentoring for next call

#### Tier 4: Company OSS Programs (direct engagement)

These companies have explicit OSS contribution programs or heavily encourage external PRs:

| Company | Key Repos | Merge Culture | Notes |
|---------|-----------|---------------|-------|
| **Vercel** | next.js, ai, turborepo | Moderate (internal focus for core) | Good for docs/examples |
| **Supabase** | supabase, gotrue | Open (active community) | Great community, many contributors |
| **Stripe** | stripe-node, react-stripe-js | Selective | API SDK fixes welcome |
| **Cloudflare** | workers-sdk, miniflare | Open | Workers ecosystem growing |
| **Grafana** | grafana, loki, tempo | Very Open (15+ externals) | Dashboards/plugins especially |
| **HashiCorp** | terraform-provider-aws | Very Open | Provider ecosystem is huge |
| **Elastic** | elasticsearch, kibana | Open | Large codebase, many areas |

#### Tier 5: Emerging/Niche (less competition, genuine need)

| Category | Examples | Why valuable |
|----------|----------|-------------|
| **MCP Servers** | PrefectHQ/fastmcp, exa-labs/exa-mcp | Ecosystem is NEW, maintainers actively need help |
| **AI Frameworks** | langchain-ai/langchainjs, vercel/ai | Fast-moving, frequent bugs |
| **Dev Tools** | biomejs/biome, oxc-project/oxc | Rust-based, fewer contributors |
| **Self-hosting** | coolify, maybe-finance | Active communities, Algora bounties |

### Intelligence Gathering Commands

**Bright Data SERP (weekly):**
```json
CallMcpTool: server="user-brightdata-mcp", toolName="search_engine"
arguments: { "query": "site:algora.io bounties open 2026", "engine": "google" }

CallMcpTool: server="user-brightdata-mcp", toolName="search_engine"
arguments: { "query": "site:app.opire.dev bounties open", "engine": "google" }

CallMcpTool: server="user-brightdata-mcp", toolName="search_engine"
arguments: { "query": "open source bounty paid contributors 2026 new programs", "engine": "google" }
```

**Exa Neural Search (weekly):**
```json
CallMcpTool: server="plugin-exa-exa", toolName="web_search_exa"
arguments: { "query": "open source projects paying contributors for code contributions 2026", "numResults": 10 }

CallMcpTool: server="plugin-exa-exa", toolName="web_search_exa"
arguments: { "query": "new MCP server projects looking for contributors model context protocol", "numResults": 10 }

CallMcpTool: server="plugin-exa-exa", toolName="web_search_exa"
arguments: { "query": "CNCF cloud native projects accepting first contributions help wanted", "numResults": 10 }
```

**Built-in WebSearch (every run when gh search fails):**
```
WebSearch: "GitHub repos actively accepting contributions 2026 TypeScript Python merged external PRs"
WebSearch: "CLOTributor CNCF issues TypeScript help wanted"
WebSearch: "Opire bounties available TypeScript Python Rust 2026"
```

### Key Insight: The 2026 Landscape

From research, the 2026 OSS contribution landscape has shifted:
- **AI agents saturate low-hanging bounties** within hours (8+ competing PRs on simple fixes)
- **Quality and specialization win** — maintainers prefer one excellent PR over 10 sloppy ones
- **Relationship-based contributions** have 80%+ merge rate (repeat to same repos)
- **CNCF/Foundation projects** are under-targeted by agents (complex, well-maintained, high reputation)
- **Opire** is emerging as Algora alternative with lower competition and 0% dev fees
- **Direct repo engagement** (commenting on issues, helping triage) builds trust before PRs

## Discovery Execution Order (Pipeline Integration)

When the pipeline triggers discovery:

```
1. Strategy 1 (Repeat repos)      — 30 seconds, highest ROI
2. Strategy 4 (Fresh issues)      — 60 seconds, zero competition
3. Strategy 2 (Known good repos)  — 60 seconds, proven merge rates
4. Strategy 5 (Label search)      — 30 seconds, broad net
5. Strategy 6 (Bounties)          — 30 seconds, money-focused
6. Strategy 9 (MCP ecosystem)     — 30 seconds, hot category
7. Strategy 7 (Patience harvest)  — 30 seconds, stale competition
8. Strategy 3 (Verify acceptance) — Applied to top 10 candidates only
9. Score and rank all results
10. Present top 5 to decision engine
```

Total discovery time target: **5 minutes max** for a full sweep.

If initial strategies (1-4) find a strong candidate (score > 3.0), STOP early and proceed to analysis. Don't over-discover when a great opportunity is already found.
