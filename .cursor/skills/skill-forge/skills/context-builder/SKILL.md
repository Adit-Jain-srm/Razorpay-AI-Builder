---
name: context-builder
description: >-
  Generate a CONTEXT.md shared vocabulary for any project. Reduces agent verbosity
  by 50-75%, improves variable naming, makes conversations more precise. Interviews
  the user about domain terms, then produces a structured glossary the agent references
  every session. Use when starting a new project, onboarding to unfamiliar code,
  the agent is being too verbose, or conversations have too much jargon confusion.
  Also use when user says "build context", "shared language", "define terms", or
  "the agent doesn't understand my project vocabulary".
---

# Context Builder

## Overview

Create a shared vocabulary between you and the agent. Once built, the agent speaks YOUR language — concise, precise, domain-native.

## The Problem This Solves

Without shared context:
- Agent uses 20 words where your domain has 1 term
- Variables named generically ("data", "handler", "service") instead of domain terms
- Every session starts from scratch explaining the same concepts
- Conversations are verbose because the agent doesn't know your jargon

With CONTEXT.md:
- Agent speaks your domain language natively
- "the materialization cascade" replaces "when a lesson inside a section of a course is made real"
- Code uses domain terms for variables, functions, modules
- Sessions start with shared understanding already loaded

## Process

### 1. Interview (grill the user)

Ask these questions ONE AT A TIME:

1. "What is this project? One sentence."
2. "What are the 3-5 most important CONCEPTS in this domain?"
3. For each concept: "Define it in one sentence. What terms should I AVOID using for this?"
4. "Are there relationships between these concepts? (X contains many Y, Y belongs to one X)"
5. "Any terms that were previously confusing or ambiguous? What did you resolve them to?"
6. "What actions/verbs are specific to this domain?" (e.g., "materialize", "triage", "hydrate")

### 2. Generate CONTEXT.md

Write to the project root:

```markdown
# [Project Name]

[One-sentence description]

## Language

**[Term 1]**:
[Definition in one sentence]
_Avoid_: [terms NOT to use for this concept]

**[Term 2]**:
[Definition]
_Avoid_: [alternatives to avoid]

## Relationships

- A **[Term 1]** contains many **[Term 2]**s
- A **[Term 2]** belongs to one **[Term 1]**

## Flagged Ambiguities

- "[confusing term]" was previously used for both X and Y — resolved: [how it's now used]
```

### 3. Persistence

Once CONTEXT.md exists:
- Agent reads it at session start
- Uses defined terms in ALL communication
- Names variables/functions using the vocabulary
- Flags when new undefined terms appear: "Should I add '[term]' to CONTEXT.md?"

### 4. Evolution

CONTEXT.md grows over time:
- New concepts emerge during development → add them
- Ambiguities surface → resolve and document
- Terms become obsolete → remove them
- The vocabulary becomes MORE precise with each session

## Verification

After generating CONTEXT.md:
- [ ] Every domain concept has exactly ONE term (no synonyms in use)
- [ ] Each term has an "Avoid" list (prevents drift back to vague language)
- [ ] Relationships are explicit (not just a flat list)
- [ ] The agent can explain the project using ONLY these terms

## Why This Works

Cognitive science: shared mental models reduce communication overhead exponentially. In software, Eric Evans called this "Ubiquitous Language" (Domain-Driven Design). mattpocock proved it works for AI agents with 75% token reduction in practice.

The CONTEXT.md IS the Ubiquitous Language for your human-agent collaboration.
