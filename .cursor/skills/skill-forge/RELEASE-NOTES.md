# Release Notes

## v1.0.0 — "First Forge" (2026-06-04)

Initial release of skill-forge: a self-improving meta-agent + 7 compound skills.

### Skills Included
- **setup** — One-time onboarding, configures user preferences
- **mcp-conductor** — Multi-MCP orchestration pipelines
- **web-perf** — Core Web Vitals diagnosis + production fixes
- **git-workflow** — Branching, releases, monorepo, archaeology
- **db-schema** — Production schema: indexes, migrations, multi-tenancy
- **arch-from-code** — Architecture diagrams from codebase analysis
- **error-resilience** — Retry, circuit breakers, graceful degradation

### Meta-Agent Capabilities
- Autonomous discovery across GitHub, Exa, Bright Data, marketplaces
- Reinforcement learning (EMA-weighted source/category preferences)
- Self-check quality gate after every action
- Validate-against-best before publishing
- CONTEXT.md shared language technique
- Multi-platform plugin manifests (Cursor, Claude Code)

### Infrastructure
- 53-test automated test suite
- Skill validation script (`validate-skill.js`)
- 8 automation scripts (discover, analyze, route, install, scaffold, rl-update, self-improve, validate)
- Persistent memory (RL state, learnings, gaps, published repos, reputation playbook)
- Hooks for Cursor (invocation tracking)

### Architecture Decisions
- Collection repo (not single-file) — learned from addyosmani (48K stars)
- Problem→Fix framing — learned from mattpocock (116K stars)
- Shared vocabulary (CONTEXT.md) — learned from mattpocock
- Platform manifests — learned from obra/superpowers (197K installs)
- Self-check loops — original, no other skill does this

### What's Next (v1.1.0)
- More skills targeting "Skill Development" category (only 120 on marketplace)
- Marketplace indexing (claudemarketplaces.com)
- Capafy monetization integration
- Automated cross-linking between skills
