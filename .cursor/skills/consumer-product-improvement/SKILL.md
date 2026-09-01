---
name: consumer-product-improvement
description: Aggressive consumer-product improvement doctrine. Runs the Analyze → Critique → Reimagine → Stress Test → Improve → Refine cycle on any shipped or in-flight feature. Evaluates UX friction, cognitive load, perceived intelligence, retention mechanics, delight, AI-native opportunities, and five user perspectives (first-time, daily, power, mobile, impatient). Use after every implementation pass, when auditing existing UI, when expanding a feature, when the user shares product feedback, or proactively to elevate "functional but boring" surfaces into premium consumer-grade experiences. Mandates feature-ecosystem thinking, not isolated screens.
---

# Consumer Product Improvement

## When To Use

- **After any implementation** — never stop at "it works."
- **When auditing existing UI** — find friction, dead zones, emotional flatness.
- **When expanding a feature** — think ecosystem, not screen.
- **When the user shares product feedback** — translate vague reactions into concrete refactors.
- **Proactively** — the Final Execution Rule (Prompt.md Part II): "Do not merely complete requested tasks. Continuously rethink, improve, optimize, refine, modernize, simplify, and elevate."

## The Improvement Cycle

> **Analyze → Critique → Reimagine → Prototype Mentally → Stress Test → Improve → Refine**

| Step | Output |
|------|--------|
| Analyze | What is this surface actually for? What does the user do here? |
| Critique | What's friction, confusion, dead air, generic, slow, missing? |
| Reimagine | What would the best consumer product in the world do here? |
| Prototype Mentally | Walk through the redesigned flow as each of the five personas. |
| Stress Test | Empty data · 10× data · slow network · mobile · keyboard only · accessibility · error states |
| Improve | Ship the highest-ROI changes atomically; one delight per commit. |
| Refine | Polish microinteractions, motion, copy, defaults, transitions. |

## The 10 Consumer Questions

For every screen/flow, answer:

1. What would make this more useful?
2. What would make this feel magical?
3. What would reduce friction?
4. What would increase delight?
5. What would make users return daily?
6. What would make users recommend this?
7. What would make this feel premium?
8. What would save users time or effort?
9. What would make this smarter?
10. What would users wish existed but never ask for?

## Five User Perspectives — Mandatory Walk-through

| Persona | Litmus test |
|---------|-------------|
| First-time user | Is value obvious in 30 s? Is there a wow moment? Is the next step screaming at them? |
| Daily active user | Is this faster on day 30 than day 1? Does it learn? Does it adapt? |
| Power user | Are shortcuts present? Is there a Cmd+K for everything? Can repetitive work be eliminated? |
| Mobile user | Touch targets ≥ 44 px? No horizontal scroll? Cognitive load minimized? |
| Impatient user | Fewer steps possible? Smart defaults? AI can decide? |

If any persona has friction, **the design is not done**.

## AI-Native Opportunities — Always Scan

- Contextual copilot inline with the current task
- Semantic search across the user's own data
- Predictive recommendations (next action, next experiment, next config)
- Auto-completion on every text field where it adds value
- Proactive insights surfaced unprompted
- Memory across sessions (the product remembers preferences)
- Conversational UX as an alternative to forms
- Personalized dashboards (what this user looks at most → first)
- Intent prediction (the user starts typing → guess the target)
- Auto-summarization of long content (runs, audit logs, eval reports)
- Intelligent prioritization (notifications, lists, dashboards)

**AI should be invisible when unnecessary, powerful when needed.** Never AI-for-marketing-only.

## Delight Engineering Checklist

- Microinteractions on every interactive surface
- Rewarding animations on success (subtle, < 400 ms, GPU-accelerated)
- Smooth transitions between views
- Intelligent empty states (CTA, illustration, sample data offer)
- Playful feedback (success toasts with personality, error states with humanity)
- Premium tactile UX (haptic-style cues, spring physics, easing > linear)
- Frictionless confirmations (optimistic UI, undo > confirm dialogs)
- Smart suggestions (defaults that learn)
- Personalized moments ("Welcome back, your last run …")
- Elegant loading states (skeletons that match the final shape, not spinners)
- Dynamic contextual actions (right-click, long-press, context menus that adapt)

"Would users smile while using this?" — if no, iterate.

## Reject

- Generic SaaS dashboards · cluttered UX · feature overload · shallow AI · passive experiences
- "Functional but boring"
- Enterprise-heavy aesthetic in a consumer-facing product
- Anything that feels emotionally flat

## Output Format

When this skill is invoked, return:

1. **Audit summary** — top 5–10 opportunities ranked by impact × effort
2. **Top picks for this iteration** — 3–7 improvements to ship now
3. **Backlog** — the rest, sized and tagged
4. **Verification plan** — how each shipped improvement will be validated

Then implement the top picks, commit atomically, verify, push.
