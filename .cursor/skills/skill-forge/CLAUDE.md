# CLAUDE.md — skill-forge

Read `CONTEXT.md` for project vocabulary. Read `AGENTS.md` for available skills.

## Key Facts

- Skills are in `skills/` directory, each with a SKILL.md
- Memory/state persists in `memory/*.json`
- Quality validation: `node scripts/validate-skill.js skills/<name>`
- Self-check runs after every action (Phase 5 in root SKILL.md)
- Publishing target: GitHub under Adit-Jain-srm org
- Install mechanism: `npx skills@latest add Adit-Jain-srm/skill-forge`

## When Modifying

- Never ship a skill without validation passing
- Always update CONTEXT.md if adding new domain terms
- Learnings go in `memory/learnings.json` and must change BEHAVIOR not just exist
- README frames skills as PROBLEMS not features
