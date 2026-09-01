---
name: spec-kit-driven-development
description: Spec-driven development using GitHub Spec Kit methodology — structured specifications, architecture alignment, implementation tracking, validation pipelines, technical decision records, and systematic documentation. Use before implementing any significant feature, when designing new subsystems, when architectural decisions are required, or when a PRD/TRD/spec must precede code. Maintains architectural clarity, execution traceability, and requirement consistency.
---

# Spec-Kit-Driven Development

## Philosophy

Specifications precede implementation. For any significant feature, generate the spec artifacts first, align on architecture, then implement against the spec. This produces traceability from requirement → design → code → verification.

Reference: [github/spec-kit](https://github.com/github/spec-kit)

## When To Apply

| Trigger | Spec Required? |
|---------|---------------|
| New product feature (>1 day work) | Yes — full spec |
| New subsystem or service | Yes — full spec |
| Architectural refactor | Yes — ADR + design spec |
| New external integration | Yes — contract + design spec |
| Bug fix | No (unless touching architecture) |
| Cosmetic UI change | No |
| Single-file utility | No |

## Spec Artifacts

For a significant feature, generate these in order (each in `docs/specs/<feature-slug>/`):

### 1. PRD — Product Requirements Document

```markdown
# PRD: <Feature>

## Problem
<who, what pain, why now>

## Users / Personas
<primary, secondary>

## Goals
- G1 — <measurable outcome>

## Non-Goals
- NG1 — <explicit scope exclusion>

## Success Metrics
- M1 — <how we know it worked>

## User Stories
- US1 — As <persona>, I want <action> so that <outcome>
```

### 2. TRD — Technical Requirements Document

```markdown
# TRD: <Feature>

## Architecture
<high-level diagram (Mermaid), components, data flow>

## API Contracts
<endpoint, method, request/response schemas>

## Data Model
<schemas, indexes, retention, migrations>

## Non-Functional Requirements
- Latency: <p50/p95 targets>
- Throughput: <rps targets>
- Availability: <SLO>
- Security: <auth, RBAC, secrets, encryption>

## Dependencies
<internal services, external APIs, libraries>

## Risks
- R1 — <risk> · mitigation: <strategy>
```

### 3. ADR — Architecture Decision Record

For each significant technical choice:

```markdown
# ADR-NNN: <Decision Title>

**Status:** Proposed | Accepted | Superseded by ADR-MMM
**Date:** YYYY-MM-DD

## Context
<situation, constraints>

## Decision
<the choice made>

## Alternatives Considered
- Alt 1 — rejected because <reason>
- Alt 2 — rejected because <reason>

## Consequences
- Positive: <wins>
- Negative: <costs / tradeoffs>
```

### 4. Implementation Plan

```markdown
# Implementation Plan: <Feature>

## Milestones
- [ ] M1 — <chunk>
- [ ] M2 — <chunk>

## Tasks
<linked to milestones, with file targets and dependencies>

## Verification Strategy
- Unit: <coverage>
- Integration: <test plan>
- Manual: <UX validation steps>
- Performance: <benchmark plan>
```

## Spec → Code → Verification Traceability

Every PR description should reference:

- The PRD section being implemented
- The TRD component being built
- The ADR(s) being applied
- The verification evidence

## Architectural Alignment Workflow

1. **Draft spec** → share with user for review
2. **Iterate** based on feedback (in the spec, not in code)
3. **Approve** → spec is now the contract
4. **Implement** against the spec
5. **Verify** each requirement has evidence
6. **Update spec** if implementation reveals errors in the original spec (versioned, not silent)

## Anti-Patterns

- Writing code first, then back-filling a spec to match
- Skipping the PRD ("we know what we want")
- Letting spec drift from implementation without versioning
- ADRs as decoration (not actually consulted before decisions)
- Specs nobody reads — keep them concise and useful, not exhaustive bureaucracy
