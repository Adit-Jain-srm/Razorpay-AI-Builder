---
name: Delight & Satisfaction Upgrade
overview: "Sequential delight sprint: remove FloatingSuggestions blocker, then implement motion tokens, View Transitions, spring-physics buttons, procedural sounds, data-reactive motion, and contextual delight. Each phase is gated by build+test+push+docs update."
todos: []
isProject: true
phases:
  - name: "Phase 1: Fix Blocker + Motion Infrastructure"
    todos:
      - id: remove-floating-suggestions
        content: Remove FloatingSuggestions from dashboard-shell.tsx, delete the file. DONE (commit b11753b).
        status: completed
      - id: motion-tokens
        content: "Add motion design tokens to globals.css: --motion-duration-instant (0ms), --motion-duration-fast (100ms), --motion-duration-standard (200ms), --motion-duration-slow (350ms), --motion-ease-enter (cubic-bezier(0,0,0.2,1)), --motion-ease-exit (cubic-bezier(0.4,0,1,1)), --motion-ease-spring (cubic-bezier(0.22,1.36,0.36,1)). Add prefers-reduced-motion override that sets all durations to 0."
        status: pending
      - id: view-transitions
        content: "Enable native View Transitions in next.config.ts (experimental: { viewTransition: true }). Add CSS for ::view-transition-old/new with crossfade (opacity 200ms with --motion-ease-enter). Zero library cost."
        status: pending
      - id: shadow-depth-system
        content: "Add elevation utilities to globals.css: shadow-depth-1 (rest), shadow-depth-2 (hover), shadow-depth-3 (float/modal). Use oklch-tinted shadows (not pure black). Add glow-primary (0 0 12px oklch(0.696 0.17 162.5 / 25%))."
        status: pending
      - id: phase-1-gate
        content: "Gate: tsc (0) + test (418 pass) + build (success) + git push. Update Docs/progress.md with 'Delight Phase 1' entry."
        status: pending
  - name: "Phase 2: Button Fluidity + Spring Physics"
    todos:
      - id: button-spring-physics
        content: "Convert button.tsx from base-ui Button to motion.button for default+primary+secondary variants. Add whileHover={{ scale: 1.02 }} and whileTap={{ scale: 0.97 }} with spring (stiffness: 500, damping: 30). CSS handles color/bg/shadow. Ghost/icon get whileTap only. Destructive gets red shadow flash. Gate behind useReducedMotion."
        status: pending
      - id: button-shadow-depth
        content: Wire shadow-depth-1 (rest) -> shadow-depth-2 (hover) -> shadow-depth-1 (active) on primary buttons. Primary gets glow-primary on hover. Creates the 'pushed into surface' Linear feel.
        status: pending
      - id: button-gradient-shine
        content: "Primary CTA only: ::before pseudo with skewed white/20% gradient, translateX -100% to +100% on hover (1.2s ease-in-out). Gate behind prefers-reduced-motion. Apply to: Open Operator card, Generate button."
        status: pending
      - id: card-tilt-deploy
        content: "Wrap Command Center action cards in TiltCard (already built, just deploy). maxTilt: 2, spring: 300/30."
        status: pending
      - id: sidebar-active-spring
        content: "Add emerald glow on active sidebar item. Tune AnimatedIndicator spring to stiffness: 350, damping: 25 for Raycast-style overshoot snap."
        status: pending
      - id: phase-2-gate
        content: "Gate: tsc (0) + test (all pass) + build (success) + git push. Update Docs/learnings.md with button spring config notes."
        status: pending
  - name: "Phase 3: Deploy Dead-Code Primitives"
    todos:
      - id: deploy-slide-up
        content: Wire SlideUp to Operator chat messages in operator-chat.tsx. Each message slides up 12px + fades in over 200ms. This is the highest-impact single change for AI interaction feel.
        status: pending
      - id: deploy-shimmer-skeleton
        content: Replace plain Skeleton in all loading.tsx files with ShimmerSkeleton. Swap import, no other changes needed.
        status: pending
      - id: agent-rail-slide
        content: Add slide-in from right (translateX 100% -> 0, 250ms, --motion-ease-enter) on AgentRail open. Use AnimatePresence + motion.aside for exit.
        status: pending
      - id: phase-3-gate
        content: "Gate: tsc (0) + test (all pass) + build (success) + git push. Update Docs/progress.md."
        status: pending
  - name: "Phase 4: Procedural Sound System"
    todos:
      - id: install-tiks
        content: npm i tiks. Zero-dependency Web Audio API library (~2KB). No audio files.
        status: pending
      - id: sound-hook
        content: "Create src/hooks/use-sound.ts: thin hook wrapping tiks. Initializes AudioContext lazily on first gesture. Reads mute pref from localStorage key 'mediaos:sound'. Default MUTED."
        status: pending
      - id: wire-sounds
        content: "Wire: click() on primary button press, success() on generation/deploy/save complete, pop() on tab switch, toggle() on sidebar collapse + theme toggle."
        status: pending
      - id: sound-toggle
        content: "Add SpeakerHigh/SpeakerSlash toggle in TopBar. Persisted to localStorage. Default: muted (opt-in delight)."
        status: pending
      - id: phase-4-gate
        content: "Gate: tsc (0) + test (all pass) + build (success) + bundle size delta < 5KB. Git push. Update Docs/learnings.md with sound integration notes."
        status: pending
  - name: "Phase 5: Data-Reactive Motion + Feedback"
    todos:
      - id: count-up-everywhere
        content: "Deploy CountUp on: analytics metric-cards, creative studio stat pills, campaign hub metrics. Swap static spans for <CountUp value={n} />."
        status: pending
      - id: success-pulse
        content: "Add @keyframes ring-pulse (400ms, emerald glow expand). Fire on: toast success, generation complete, deploy success."
        status: pending
      - id: operator-typing-indicator
        content: "Replace shimmer cursor in operator chat with 3-dot bounce indicator. Dots: size-1.5 bg-primary, staggered scale (0.5->1->0.5, 0.6s period, 0.15s stagger)."
        status: pending
      - id: chart-animate-in
        content: Set animationDuration={400} and animationEasing='ease-out' on all Recharts components. Already gated by useReducedMotion.
        status: pending
      - id: phase-5-gate
        content: "Gate: tsc (0) + test (all pass) + build (success) + git push. Update Docs/progress.md."
        status: pending
  - name: "Phase 6: Contextual Delight + Explainability"
    todos:
      - id: hover-icon-animations
        content: "Sidebar nav icons: CSS transition (150ms), translateY(-1px) + scale(1.08) on link:hover. Pure CSS, no JS for high-frequency interaction."
        status: pending
      - id: tooltip-explainability
        content: "Add Tooltips on: CPA, CTR, CVR, ROAS abbreviations in analytics. Score meters. Status badges. Use existing Tooltip component."
        status: pending
      - id: empty-state-personality
        content: "Loading.tsx headings: analytics='Crunching campaign numbers...', research='Scanning the web...', creatives='Preparing the studio...', operator='Waking up the Operator...'"
        status: pending
      - id: scroll-progress
        content: "CSS scroll-driven animation: 2px emerald bar at top of main. animation-timeline: scroll(). No JS. Only visible on pages with overflow."
        status: pending
      - id: first-time-confetti
        content: Dynamic import canvas-confetti (~5KB). Brief burst when creative count 0->1+ first time in session. sessionStorage flag prevents repeat.
        status: pending
      - id: phase-6-gate
        content: "Gate: tsc (0) + test (all pass) + build (success) + git push. Update Docs/progress.md + Docs/learnings.md."
        status: pending
  - name: "Phase 7: Final Verification + Ship"
    todos:
      - id: reduced-motion-audit
        content: grep for every new animation/transition and verify prefers-reduced-motion handling. Motion tokens auto-handle CSS. motion/react props need useReducedMotion gate.
        status: pending
      - id: performance-budget
        content: Verify total new JS < 10KB gzipped (tiks ~2KB + canvas-confetti ~5KB dynamic). No layout-triggering animations. Only transform+opacity animated.
        status: pending
      - id: mobile-375-test
        content: "Test at 375px: springs feel good on touch, no overflow from shadows, sounds don't auto-play, View Transitions work Safari 18+."
        status: pending
      - id: full-gate
        content: tsc --noEmit (0) + npm test (all pass) + npm run build (success). Git push + deploy to Vercel.
        status: pending
      - id: docs-final
        content: Update Docs/progress.md with Delight Sprint summary. Update Docs/learnings.md with any new gotchas. Commit docs alongside code.
        status: pending
---

# Delight & Satisfaction Upgrade

## Problem

1. **Broader issue:** The platform is functional but lacks the tactile, satisfying feel of Linear, Raycast, and Arc. Motion primitives exist but are underutilized (4 dead-code components found in audit).

## Execution Model

**Sequential, phase-gated.** No parallel execution. Each phase:

1. Implement the changes
2. Run full gate: `tsc --noEmit` (0) + `npm test` (all pass) + `npm run build` (success)
3. Git commit + push to `origin/main`
4. Update `Docs/progress.md` and `Docs/learnings.md` in the same commit
5. Only then proceed to the next phase

## Project Context (docs references)

- **Architecture:** `Docs/architecture.md` - Next.js 16 + React 19.2, Tailwind v4, shadcn base-nova (Base UI), motion/react
- **Progress:** `Docs/progress.md` - All 6 waves complete, 418 tests, deployed at mediaos-kappa.vercel.app  
- **Learnings:** `Docs/learnings.md` - Append-only gotcha log (update per phase)
- **Creative Studio:** `Docs/creative-studio.md` - Scoring, hooks, generation
- **Analytics:** `Docs/analytics.md` - Metrics, anomalies, recommendations
- **Operator Tools:** `Docs/operator-tools.md` - 17 tools, proactive briefing
- **Existing motion:** `src/components/motion/` - FadeIn, Stagger, CountUp, ScaleIn, PressableButton, TiltCard, SlideUp, ShimmerSkeleton, AnimatedIndicator, PageTransition
- **CSS animations:** `src/app/globals.css` - shimmer, pulse-border, card-hover, btn-press, focus-visible ring

## Research Sources

- [Linear/Raycast Micro-Transition Stack](https://pixicstudio.medium.com/the-micro-transition-stack-used-by-linear-and-raycast-4fac298d5b9e) - Spring physics, press feedback
- [Motion Design 2026](https://mantlr.com/blog/motion-design-principles-2026) - Duration hierarchy, easing direction
- [Motion Design Tokens](https://www.uiuxatlas.com/lessons/motion/motion-design-tokens/) - CSS custom properties
- [Next.js View Transitions](https://nextjs.org/docs/app/guides/view-transitions) - Native browser transitions (Next.js 16)
- [Micro-Interactions 2026](https://creativealive.com/micro-interactions-2026-motion-ux-rules/) - Springs > bezier
- [tiks](https://github.com/rexa-developer/tiks/) - Procedural UI sounds (Web Audio API)
- [Atlassian Motion Design](https://atlassian.design/foundations/motion) - Frequency-based motion budget
- [Tactile Buttons](https://www.rezajafar.com/experiments/tactile-buttons) - Spring press, interruptible animation
- [Spring Physics Buttons](https://tigerabrodi.blog/how-to-implement-spring-physics-buttons-with-framer-motion) - motion handles transform, CSS handles color

## Design Principles (from research + design-taste-frontend skill)

- **Springs > bezier** for interactive elements (interruptible, preserves velocity)
- **Duration hierarchy:** micro 100-150ms, mid 200-300ms, large 300-500ms. Nothing over 500ms.
- **Deformation range:** 0.95-1.05 scale. More reads as toy, not tool.
- **Motion must be motivated:** hierarchy, storytelling, feedback, or state transition. Never "it looked cool."
- **Sound is opt-in** (default muted). Never auto-play.
- **Reduced motion is non-negotiable.** Every animation needs a fallback.
- **No em-dashes.** Already enforced (Phase 1 of Polish Sprint).
- **No animate-pulse.** Already enforced (shimmer is the replacement).
- **Layered approach:** motion/react owns transform, CSS owns color/bg/shadow. Never conflict.

## Button Fluidity Strategy


| Variant         | Hover       | Press (whileTap) | Shadow                        | Special                       |
| --------------- | ----------- | ---------------- | ----------------------------- | ----------------------------- |
| Primary/Default | scale(1.02) | scale(0.97)      | depth-1 -> depth-2 -> depth-1 | Emerald glow + gradient shine |
| Ghost/Icon      | none        | scale(0.96)      | none                          | -                             |
| Secondary       | scale(1.01) | scale(0.98)      | depth-1 -> depth-2            | -                             |
| Destructive     | scale(1.01) | scale(0.97)      | red glow flash                | Warning emphasis              |
| Link            | none        | none             | none                          | Underline slide               |


Spring config: `{ type: "spring", stiffness: 500, damping: 30 }`

## Dead Code to Deploy


| Primitive       | Target                                              | Impact                        |
| --------------- | --------------------------------------------------- | ----------------------------- |
| SlideUp         | Operator chat messages                              | Highest - AI interaction feel |
| ShimmerSkeleton | All loading.tsx files                               | Medium - loading quality      |
| PressableButton | Remove after button.tsx upgrade                     | Cleanup                       |
| ScaleIn         | Keep as utility (tw-animate-css handles most cases) | Low                           |


## Performance Budget


| Addition             | Size (gzipped) | Notes                       |
| -------------------- | -------------- | --------------------------- |
| tiks                 | ~2KB           | Procedural sounds, no files |
| canvas-confetti      | ~5KB (dynamic) | Only loaded once            |
| Motion tokens CSS    | ~500B          | Zero runtime                |
| View Transitions CSS | ~200B          | Browser-native              |
| **Total**            | **< 10KB**     | Within budget               |


## Key Files

- `next.config.ts` - viewTransition flag
- `src/app/globals.css` - Motion tokens, shadows, keyframes, scroll-progress
- `src/components/ui/button.tsx` - Spring physics (motion.button)
- `src/components/layout/sidebar.tsx` - Active glow, icon hover
- `src/components/layout/agent-rail.tsx` - Slide transition
- `src/components/agent/operator-chat.tsx` - SlideUp + typing indicator
- `src/hooks/use-sound.ts` - NEW: sound hook
- `src/components/layout/top-bar.tsx` - Sound toggle
- `src/app/(dashboard)/page.tsx` - TiltCard on cards
- `src/app/(dashboard)/*/loading.tsx` - ShimmerSkeleton + copy
- `src/components/analytics/metric-cards.tsx` - CountUp + tooltips
- `Docs/progress.md` - Update per phase
- `Docs/learnings.md` - Update per phase

