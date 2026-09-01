---
name: mcp-conductor
description: >-
  Orchestrate multiple MCP servers together for complex multi-step tasks.
  Teaches agents to chain Exa search → Bright Data scraping → GitHub API →
  file operations in intelligent workflows. Use when a task requires data from
  multiple sources, when combining MCP tools for research, when building
  multi-step automations across services, or when the user says orchestrate,
  combine MCPs, multi-source, research pipeline, or chain tools together.
---

# MCP Conductor — Multi-Server Orchestration

## Overview

Teach your AI agent to orchestrate multiple MCP servers as a unified intelligence pipeline. Single MCP calls give shallow results. Chaining them gives 10x depth.

## When to Use

- Task requires data from 2+ sources (search + scrape + analyze)
- User asks to "research" something (implies multi-source)
- Need to validate information across sources
- Building a comparison or competitive analysis
- Monitoring for changes over time
- Any workflow where one tool's output feeds another tool's input

## Orchestration Patterns

### Pattern 1: Research Pipeline

```
TASK: "Research how company X handles authentication"

Step 1: DISCOVER (Exa MCP)
  → web_search_exa: "company X authentication architecture blog"
  → Returns: 5-10 relevant URLs

Step 2: EXTRACT (Bright Data MCP)  
  → scrape_as_markdown: each URL from Step 1
  → Returns: full page content as markdown

Step 3: ANALYZE (Agent reasoning)
  → Read all scraped content
  → Extract: patterns, technologies, trade-offs
  → Cross-reference findings

Step 4: ENRICH (GitHub MCP / gh CLI)
  → Search for open-source implementations mentioned
  → Read relevant source code for concrete examples

Step 5: SYNTHESIZE (Agent output)
  → Combine all sources into structured analysis
  → Cite sources, compare approaches, recommend
```

### Pattern 2: Competitive Intelligence

```
TASK: "Compare all tools that solve X"

Step 1: SEARCH (Exa MCP — semantic search)
  → "tools libraries frameworks for X comparison 2026"
  
Step 2: VALIDATE (GitHub — verify repos exist and are active)
  → gh repo view each candidate — check stars, last push, activity
  → Filter: only repos pushed in last 90 days with 100+ stars

Step 3: DEEP-READ (Bright Data — get full documentation)
  → Scrape README, docs pages, getting-started guides
  
Step 4: ANALYZE (Agent — structured comparison)
  → Feature matrix, trade-offs, community health, performance claims
  → Output: ranked recommendation with evidence
```

### Pattern 3: Content Aggregation & Synthesis

```
TASK: "Create a comprehensive guide on topic Y"

Step 1: MULTI-SOURCE SEARCH
  → Exa: semantic search for authoritative sources
  → Bright Data search_engine: Google for official docs
  → GitHub: find repos, examples, real implementations

Step 2: PARALLEL EXTRACTION
  → Bright Data scrape_as_markdown: top 10 URLs (parallel batch)
  → gh API: read READMEs of top repos

Step 3: KNOWLEDGE GRAPH
  → Identify: key concepts, relationships, prerequisites
  → Map: which source covers which subtopic best
  → Find: gaps no single source covers

Step 4: GENERATION
  → Synthesize: original content citing all sources
  → Validate: cross-check claims against multiple sources
  → Format: structured guide with clear sections
```

### Pattern 4: Monitor & React

```
TASK: "Watch for changes in domain Z and alert me"

Step 1: BASELINE (one-time)
  → Exa + Bright Data: current state of domain Z
  → Store: key facts, current leaders, latest news

Step 2: PERIODIC CHECK (via loop skill)
  → Exa: search for NEW content since last check
  → Compare: against stored baseline
  → Detect: changes, new entries, removals

Step 3: REACT (when change detected)
  → Bright Data: scrape the changed resource for details
  → Analyze: significance of change
  → Notify: user with summary + links
```

## MCP Server Capabilities Reference

| Server | Best For | Key Tools |
|--------|----------|-----------|
| **Exa** | Semantic/neural web search | `web_search_exa` (conceptual matching, not just keywords) |
| **Bright Data** | Any URL scraping, SERP, structured data | `scrape_as_markdown`, `search_engine`, `web_data_*` |
| **GitHub (gh CLI)** | Repos, code, issues, PRs | `gh search repos`, `gh api`, `gh repo view` |
| **Slack** | Team communication | `slack_list_channels`, `slack_post_message` |
| **Linear** | Project management | Issues, projects, cycles |
| **Stripe** | Payments | Customers, invoices, subscriptions |

## Orchestration Rules

1. **Start broad, narrow deep.** First search finds candidates. Then scrape only the best.
2. **Validate before extracting.** Don't scrape 50 URLs — verify relevance first (check title, snippet).
3. **Parallelize when possible.** Multiple scrapes of independent URLs can happen simultaneously.
4. **Cache aggressively.** If you scraped a URL this session, don't scrape it again.
5. **Cite everything.** Every claim must trace back to a source URL.
6. **Fail gracefully.** If one MCP fails, continue with others. Don't abort the pipeline.
7. **Respect rate limits.** Space Bright Data calls by 1-2 seconds. Batch Exa calls.

## Anti-Patterns

- Using ONLY one MCP when a chain would give 10x better results
- Scraping everything without filtering first (wastes time and tokens)
- Not cross-referencing (single source = unverified)
- Sequential when parallel is possible
- Ignoring MCP errors instead of retrying/falling back

## Quick Reference: Common Chains

| Goal | Chain |
|------|-------|
| Research a topic | Exa search → Bright Data scrape top 5 → synthesize |
| Find best tool for X | Exa search → GitHub verify → Bright Data docs → compare |
| Monitor a space | Exa baseline → loop + Exa delta → Bright Data details |
| Competitive analysis | Exa search → GitHub stats → Bright Data pricing pages → matrix |
| Build knowledge base | Exa broad → Bright Data batch scrape → extract + organize |
