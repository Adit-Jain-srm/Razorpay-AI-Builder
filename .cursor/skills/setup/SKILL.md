---
name: setup
description: >-
  One-time setup for skill-forge. Asks user preferences (search sources, creation
  style, target platforms, GitHub username, skill categories of interest) and
  configures all other skills to use those preferences. Run once before using
  any other skill-forge capability. Use when user says setup, configure, or
  invokes /setup.
---

## Overview

One-time configuration that asks your preferences (platforms, domains, GitHub username, discovery style) and generates a config all other skill-forge capabilities use.

# Setup skill-forge

Run this ONCE per environment. It configures skill-forge to work the way YOU work.

I'll ask you a few questions, then create a config that all other skill-forge capabilities use.

## Questions I'll Ask

1. **GitHub username** — Where should published skills be created?
2. **What platforms do you use?** — Cursor / Claude Code / Codex / Gemini / Windsurf / Other
3. **What domains interest you most?** — Frontend / Backend / DevOps / AI / Security / Data / Other
4. **How aggressive should discovery be?** — Conservative (weekly) / Normal (daily) / Maximum (continuous)
5. **Publishing preferences** — Auto-publish when quality passes? Or always ask first?
6. **Existing skills to integrate with** — Which installed skills should skill-forge know about?

## What Gets Created

After answering, I'll generate:

```
memory/user-config.json
```

All other skills read this config. Your preferences persist across sessions.

## Example Config

```json
{
  "github_user": "your-username",
  "platforms": ["cursor", "claude-code"],
  "domains_of_interest": ["backend", "devops", "ai"],
  "discovery_aggression": "normal",
  "auto_publish": false,
  "installed_skills_to_integrate": ["superpowers/*", "azure-skills/*"],
  "quality_bar": "validate_before_ship",
  "configured_at": "2026-06-04T03:00:00Z"
}
```

## Why This Matters

Without setup:
- skill-forge doesn't know YOUR GitHub username (can't publish for you)
- Discovery is generic (not tuned to your interests)
- Doesn't know what you already have installed (creates duplicates)

With setup:
- Personalized discovery (your domains, your platforms)
- Publishing goes to YOUR account
- Integrates with YOUR existing skills (no duplication)
- Respects your automation preferences
