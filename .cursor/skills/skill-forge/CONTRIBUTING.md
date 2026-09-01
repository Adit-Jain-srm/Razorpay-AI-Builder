# Contributing to skill-forge

Thank you for contributing! This project ships production-grade AI agent skills.

## Quality Bar

Every skill MUST have:

### Required Structure
```
skills/skill-name/
├── SKILL.md           # Main skill (YAML frontmatter + markdown)
```

### SKILL.md Anatomy

Every skill follows this structure:

1. **YAML Frontmatter** — `name` (kebab-case, max 64 chars) + `description` (starts with what it does, includes "Use when" triggers)
2. **Overview** — What this skill does and why (2-3 sentences)
3. **When to Use** — Specific triggering conditions
4. **Quick Start** — Fastest path to value (< 60 seconds)
5. **Process/Workflow** — Step-by-step guidance with code examples
6. **Common Mistakes** — Pitfalls with fixes
7. **Verification** — How to confirm it worked

### Quality Checks Before Submitting

- [ ] SKILL.md under 500 lines
- [ ] Description is third-person, includes WHAT + WHEN
- [ ] Code examples are copy-paste ready (not pseudocode)
- [ ] Tested against at least one real scenario
- [ ] No vague advice — every instruction is actionable
- [ ] Consistent terminology throughout
- [ ] Would YOU use this skill? Be honest.

### What NOT to Do

- Don't submit skills that are just rewritten documentation
- Don't duplicate what other skills already cover — reference them
- Don't add theory without practice (every concept needs a code example)
- Don't create skills for things the agent already knows well
- Don't submit without reading 3+ existing skills first (match the quality)

## Adding a New Skill

1. Fork the repo
2. Create `skills/your-skill-name/SKILL.md`
3. Follow the anatomy above
4. Run `node scripts/validate-skill.js skills/your-skill-name` (must pass)
5. Open a PR with a clear description of what gap this fills

## Reporting Issues

If a skill gives bad advice, open an issue with:
- Which skill
- What scenario
- What it recommended
- What should have been recommended instead

## Code of Conduct

Be excellent to each other. Focus on quality, not quantity.
