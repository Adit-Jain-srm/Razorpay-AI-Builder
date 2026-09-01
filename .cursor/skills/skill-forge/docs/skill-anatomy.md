# Skill Anatomy

Every skill in this collection follows a consistent structure for quality and discoverability.

## File Structure

```
skills/skill-name/
├── SKILL.md              # Required — the skill itself
├── reference.md          # Optional — detailed docs (if SKILL.md > 300 lines of content)
└── examples/             # Optional — real-world examples
```

## SKILL.md Format

```markdown
---
name: skill-name
description: >-
  What this skill does (third person). Use when [trigger conditions].
---

# Skill Title

## Overview
[2-3 sentences: what and why]

## When to Use
[Bullet list of specific trigger conditions]

## Quick Start
[Fastest path to value — copy-paste ready]

## Process / Workflow
[Step-by-step with code examples]

## Common Mistakes
[Pitfalls and how to avoid them]

## Verification
[How to confirm it worked]
```

## Quality Standards

### Description (Critical for Discovery)

The description determines when the agent activates this skill. It must:
- Start with what the skill does (third person)
- Include specific "Use when" trigger conditions
- Mention key terms users might say
- Be under 200 characters for the core message

**Good:** "Optimize web performance for Core Web Vitals. Use when pages load slowly, LCP > 2.5s, or user mentions page speed, lighthouse, or bundle size."

**Bad:** "Helps with performance stuff."

### Code Examples

- Must be copy-paste ready (no placeholders like `{your-thing-here}`)
- Include the import/setup if non-obvious
- Show the BEFORE (problem) and AFTER (solution)
- Use the most common framework/language for the domain

### Actionability

Every instruction must answer "what do I DO?" — not just "what should I think about?"

**Good:** "Run `npx lighthouse https://your-site.com` and check LCP score"
**Bad:** "Consider your performance characteristics"

## Size Guidelines

- SKILL.md: 100-400 lines (under 500 maximum)
- If content exceeds 400 lines, split into SKILL.md (overview + workflow) and reference.md (deep details)
- Progressive disclosure: SKILL.md has the essentials, reference.md has the depth
