# Getting Started with skill-forge

## What is skill-forge?

skill-forge is two things:

1. **A collection of production-grade AI agent skills** covering MCP orchestration, web performance, git workflows, database design, and more
2. **An autonomous meta-agent** that discovers, learns from, and creates new skills

## Installation

### Cursor

```bash
# Install all skills at once
npx skills add Adit-Jain-srm/skill-forge

# Or copy manually
git clone https://github.com/Adit-Jain-srm/skill-forge.git
cp -r skill-forge/skills/* ~/.cursor/skills/
```

### Claude Code

```bash
# Via marketplace
/plugin marketplace add Adit-Jain-srm/skill-forge

# Or local
git clone https://github.com/Adit-Jain-srm/skill-forge.git
claude --plugin-dir ./skill-forge
```

### Codex CLI

```bash
git clone https://github.com/Adit-Jain-srm/skill-forge.git
# Copy skills to ~/.codex/skills/ or reference in AGENTS.md
```

### Gemini CLI

```bash
gemini skills install https://github.com/Adit-Jain-srm/skill-forge.git --path skills
```

### Windsurf

Copy any `SKILL.md` from `skills/` into your Windsurf rules directory.

## Available Skills

| Skill | What It Does |
|-------|-------------|
| `mcp-conductor` | Orchestrate multiple MCP servers in intelligent pipelines |
| `web-perf` | Diagnose and fix Core Web Vitals (LCP, INP, CLS) |
| `git-workflow` | Advanced git: branching, releases, monorepos, archaeology |
| `db-schema` | Production database design: indexes, migrations, multi-tenancy |

## Using the Meta-Agent

The meta-agent (SKILL.md at root) is a self-improving system:

```
skill-forge              — Full discovery + creation pipeline
skill-forge discover     — Find new skills across the internet
skill-forge route <task> — Match your task to the best skill
skill-forge create       — Generate and publish a new skill
skill-forge devour       — Maximum learning mode
```

## How Skills Activate

Skills activate based on their `description` field triggers. When you're working on a task that matches a skill's trigger conditions, the agent loads and follows that skill automatically.

You can also invoke skills explicitly by name.
