# skill-forge Reference

Detailed documentation for the skill-forge pipeline, extending the SKILL.md.

## MCP Tool Integration

### Exa MCP (Semantic Web Search)

```json
// Discovery: find novel skills
CallMcpTool: server="plugin-exa-exa", toolName="web_search_exa"
arguments: { "query": "new cursor skills SKILL.md agent 2026 popular", "numResults": 15 }

// Self-improvement: find better approaches
CallMcpTool: server="plugin-exa-exa", toolName="web_search_exa"
arguments: { "query": "prompt engineering best practices AI agents 2026", "numResults": 10 }

// Reputation research: what makes tools popular
CallMcpTool: server="plugin-exa-exa", toolName="web_search_exa"
arguments: { "query": "most starred developer tools github 2026 how to get stars", "numResults": 10 }
```

### Bright Data MCP (Any URL Scraping)

```json
// Scrape skills.sh leaderboard
CallMcpTool: server="user-brightdata-mcp", toolName="scrape_as_markdown"
arguments: { "url": "https://skills.sh" }

// Scrape cursor.directory
CallMcpTool: server="user-brightdata-mcp", toolName="scrape_as_markdown"
arguments: { "url": "https://cursor.directory" }

// Follow a trail: blog post referenced by a skill
CallMcpTool: server="user-brightdata-mcp", toolName="scrape_as_markdown"
arguments: { "url": "https://example.com/blog/novel-ai-pattern" }

// Search for competitor skills
CallMcpTool: server="user-brightdata-mcp", toolName="search_engine"
arguments: { "query": "cursor skill {domain} install", "engine": "google" }
```

## GitHub CLI Commands

### Discovery
```bash
gh search repos "SKILL.md cursor" --sort=updated --json fullName,stargazersCount,updatedAt --limit 50
gh search repos --topic=cursor-skill --sort=stars --limit 50
gh search repos --topic=agent-skills --sort=updated --limit 50
gh search repos --topic=mcp-server --sort=stars --limit 50
```

### Star Monitoring (Published Repos)
```bash
gh repo view Adit-Jain-srm/{name} --json stargazerCount,forkCount,issues --jq '{stars: .stargazerCount, forks: .forkCount, issues: (.issues | length)}'
```

### Publishing
```bash
gh repo create Adit-Jain-srm/{name} --public --description "{value-prop}" --clone
gh repo edit Adit-Jain-srm/{name} --add-topic cursor-skill,agent-skills,ai-skill,cursor,ai-agent
gh release create v1.0.0 --title "{name} v1.0.0" --notes "Install: npx skills add Adit-Jain-srm/{name}"
```

### Fetching Skill Content
```bash
gh api repos/{owner}/{repo}/contents/SKILL.md -H "Accept: application/vnd.github.raw"
gh api repos/{owner}/{repo}/readme -H "Accept: application/vnd.github.raw"
```

## Script Reference

### discover.js
```bash
node scripts/discover.js                    # Run all strategies
node scripts/discover.js --strategy a       # GitHub vacuum only
node scripts/discover.js --strategy b       # Star leaders only
node scripts/discover.js --strategy e       # CLI discovery only
```

### analyze.js
```bash
node scripts/analyze.js owner/repo          # Analyze from GitHub
node scripts/analyze.js owner/repo --stars 150  # Include star context
node scripts/analyze.js --local ./path/to/SKILL.md  # Analyze local file
```

### route-task.js
```bash
node scripts/route-task.js "deploy my app to vercel"
node scripts/route-task.js "write tests for my React components"
node scripts/route-task.js "set up CI/CD pipeline"
```

### install.js
```bash
node scripts/install.js owner/repo          # Install skill
node scripts/install.js --mcp server-name --command "npx -y @scope/mcp-server"  # Install MCP
```

### scaffold-repo.js
```bash
node scripts/scaffold-repo.js --name "my-skill" --description "Does X when Y" --dir "./my-skill"
node scripts/scaffold-repo.js --name "my-skill" --description "..." --user "Adit-Jain-srm"
```

### rl-update.js
```bash
node scripts/rl-update.js --signal source_novel --source exa_mcp
node scripts/rl-update.js --signal skill_starred --source "my-published-skill" --value 1.0
node scripts/rl-update.js --signal routing_miss --source "route-task" --details "missed better skill"
node scripts/rl-update.js --signal creation_success --source "my-skill" --category ai_agents
```

## Memory Files

| File | Purpose | Updated By |
|------|---------|-----------|
| `rl-state.json` | RL weights, epsilon, source/category weights | rl-update.js, Phase 6 |
| `discovered-skills.json` | All discovered skill metadata | Phase 1, analyze.js |
| `learnings.json` | Extracted patterns and philosophies | Phase 5 |
| `gaps.json` | Identified ecosystem gaps | Phase 1 (Strategy D), Phase 2 |
| `published.json` | Our published repos and metrics | Phase 4 (PUBLISH) |
| `installed-skills.json` | Skills we've installed locally | install.js |
| `reputation-playbook.json` | What makes skills get stars | Phase 1 (Strategy B) |
| `anti-laziness-findings.json` | What existing skills are missing | Phase 1 (Strategy D) |
| `evolution-log.jsonl` | Append-only change history | All phases |
| `next-action.md` | Recommendation for next run | Phase 7 |

## Continuous Loop (PowerShell)

```powershell
while ($true) {
  Start-Sleep -Seconds 1800
  Write-Output "AGENT_LOOP_TICK_SKILLFORGE {`"prompt`":`"skill-forge devour`"}"
}
```

Configure with `notify_on_output`:
- Pattern: `^AGENT_LOOP_TICK_SKILLFORGE`
- Reason: "skill-forge tick"
- Debounce: 30000ms

## GREED Checklist (Before Publishing)

- [ ] Name IMMEDIATELY communicates value
- [ ] Description triggers "I NEED this" in 5 seconds
- [ ] README first 3 lines sell the skill (not describe it)
- [ ] Before/after comparison makes value undeniable
- [ ] CLEARLY better than any alternative (verified by reading competitors)
- [ ] Can start using in < 60 seconds after install
- [ ] SKILL.md is itself a masterclass (quality IS marketing)
- [ ] Has depth for advanced users (not just hello-world)
- [ ] Proper frontmatter (name, description with WHAT + WHEN)
- [ ] Under 500 lines (progressive disclosure for detail)
- [ ] Would YOU star this if you found it? Be honest.

## Anti-Laziness Protocol

For every skill analyzed, answer:
1. What does this skill NOT do that users would expect?
2. What adjacent workflow is completely unaddressed?
3. What would a 10x version look like?
4. If I used this daily, what would frustrate me within a week?
5. What integration between THIS and ANOTHER skill is missing?

Record findings in `memory/anti-laziness-findings.json`.
