# AGENTS.md — skill-forge

## Instructions

This is a self-improving skill collection. The meta-agent (root SKILL.md) discovers, devours, and creates new skills autonomously.

### For AI Agents Using This Repo

1. Read `CONTEXT.md` first — it defines the project vocabulary
2. Skills live in `skills/` — each has a SKILL.md with YAML frontmatter
3. The meta-agent's memory lives in `memory/` — state files that persist between sessions
4. Run `/setup` on first use to configure user preferences
5. Quality bar: every skill must pass `node scripts/validate-skill.js`

### Available Skills

| Skill | Slash Command | Solves |
|-------|--------------|--------|
| setup | /setup | First-time configuration |
| mcp-conductor | /mcp-conductor | "Agent uses one tool when it should chain five" |
| web-perf | /web-perf | "Site is slow, don't know why" |
| git-workflow | /git-workflow | "Drowning in git complexity" |
| db-schema | /db-schema | "Database breaks at scale" |
| arch-from-code | /arch-from-code | "Nobody knows how codebase works" |
| error-resilience | /error-resilience | "Code breaks in production" |

### Self-Check Protocol

After every action, the agent runs a mandatory self-check (see root SKILL.md Phase 5). This is not optional.
