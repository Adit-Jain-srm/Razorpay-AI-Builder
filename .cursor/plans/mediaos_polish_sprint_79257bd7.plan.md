---
name: MediaOS Polish Sprint
overview: "Sequential quality improvement sprint across MediaOS: anti-slop compliance, accessibility, AI-native intelligence, resilience hardening, performance, copy quality, architecture audit, and mobile responsiveness. Each phase gated by fresh verification evidence before proceeding."
todos: []
isProject: true
phases:
  - name: "Phase 1: Anti-Slop Compliance"
    todos:
      - id: purge-emdash
        content: Replace all 48 em/en-dash (U+2014/U+2013) instances across 24 files with proper punctuation. Verify zero remaining via grep.
        status: pending
      - id: purge-animate-pulse
        content: Replace all 11 animate-pulse instances with shimmer class. Verify zero remaining via grep.
        status: pending
  - name: "Phase 2: Accessibility + Contrast"
    todos:
      - id: contrast-audit
        content: Audit muted-foreground, emerald accent, ghost buttons against zinc-950 for WCAG AA 4.5:1 compliance. Fix any failures.
        status: pending
      - id: a11y-labels
        content: Confirm all inputs have labels, all icon-only buttons have aria-label, focus-visible rings work globally.
        status: pending
  - name: "Phase 3: AI-Native Intelligence"
    todos:
      - id: proactive-brief
        content: Surface a proactive Morning Brief card on Command Center (call proactive_briefing on load, cache, show without opening Operator).
        status: pending
      - id: contextual-nudges
        content: Add inline 'Regenerate weak variants?' chip in Creative Studio when score <50. Auto-suggest campaign name from research. Fatigue-risk badge in analytics.
        status: pending
      - id: floating-suggestions
        content: Surface 2-3 contextual Operator next-action chips on every page (not just the Operator view).
        status: pending
  - name: "Phase 4: Error Resilience"
    todos:
      - id: resilience-grep
        content: Grep for naked fetch without retry/timeout, empty catch blocks, missing abort signals. Fix any found.
        status: pending
      - id: degradation-test
        content: "Verify graceful degradation: unset Azure/Supabase/Bright Data keys one at a time, confirm no white screens."
        status: pending
  - name: "Phase 5: Performance"
    todos:
      - id: lighthouse-audit
        content: Run Lighthouse on live URL. Report LCP/INP/CLS. Fix any metric above target threshold.
        status: pending
      - id: code-split-check
        content: Verify recharts and Motion are code-split per route. Add dynamic imports if loaded globally. Lazy-load below-fold motion.
        status: pending
  - name: "Phase 6: Copy Quality"
    todos:
      - id: copy-audit
        content: Re-read all visible UI strings. Replace filler verbs, AI-hallucinated phrases, marketing speak with concrete language. Label sample data.
        status: pending
  - name: "Phase 7: Architecture Audit"
    todos:
      - id: debt-scan
        content: Run ai-debt-detector 5-point checklist on research providers, agent runtime, and 10 most complex files. Fix swallowed errors, orphans, missing cleanup.
        status: pending
      - id: timeout-verification
        content: Verify Operator maxDuration surfaces a user-visible timeout message. Verify Scraping Browser connections always disconnect.
        status: pending
  - name: "Phase 8: Mobile Responsiveness"
    todos:
      - id: mobile-test
        content: "Test at 375px: sidebar collapses, rail hides, touch targets 44px+, charts scroll horizontally, command palette works with touch, /lp pages are mobile-first."
        status: pending
---

# MediaOS Polish Sprint

## Context

The platform is shipped and deployed at https://mediaos-kappa.vercel.app with all 5 modules + Operator agent live. Real AI (gpt-5.3-chat + MAI-Image-2.5) and real Bright Data (SERP + Web Unlocker + Scraping Browser) are validated. 418 tests pass. This sprint raises it from "functional and shipped" to "impresses a design-conscious judge within 5 seconds."

## Current state (from `Docs/progress.md`)
- All waves COMPLETE and SHIPPED
- Motion primitives exist and are partially applied
- Two pre-flight failures outstanding: 48 em/en-dash instances, 11 animate-pulse remnants
- Zero TODO/FIXME/HACK in codebase (clean)
- Live at https://mediaos-kappa.vercel.app

## Phase gating (non-negotiable per plan section 13)
Every phase ends with:
1. Fresh `tsc --noEmit` (0) + `lint` (0) + `npm test` (all pass) + `npm run build` (SUCCESS) - output shown
2. Committed + pushed to `origin/main`
3. Redeployed via `npx vercel --prod`
4. Specific verification evidence for the phase's claims (grep results, Lighthouse scores, etc.)

---

## Phase 1: Anti-Slop Compliance

Remove the two blockers that make the design-taste-frontend pre-flight checklist fail.

- Replace all 48 em-dash (U+2014) and en-dash (U+2013) characters across 24 source files with proper punctuation (comma, colon, period, or hyphen)
- Replace all 11 `animate-pulse` instances with the `shimmer` CSS class (already in globals.css)
- Verify: grep confirms ZERO remaining matches for both patterns
- This is the highest-priority fix because em-dashes are the #1 AI tell that a design-literate judge would spot

## Phase 2: Accessibility + Contrast Hardening

- Audit `--muted-foreground` against `--background` (zinc-950): must hit WCAG AA 4.5:1
- Audit emerald accent text against zinc-950 (the primary CTA color on dark bg)
- Confirm all ghost/outline buttons have sufficient contrast in both hover and rest states
- Confirm every `<input>` has an associated `<label>` (not placeholder-as-label)
- Confirm every icon-only `<button>` has `aria-label`
- Add `focus-visible:ring-2 ring-primary/50` globally if not already present
- Verify: automated contrast check on the 5 most-used color pairs

## Phase 3: AI-Native Intelligence Layer

Make the AI feel deeply integrated (not bolted-on), per the ai-native-product-thinking skill.

- Command Center: surface a proactive "Morning Brief" card (call `proactive_briefing` on page load; cache result; show without the user needing to open the Operator)
- Creative Studio: inline "Regenerate weak variants?" chip when any creative scores below 50 (contextual nudge, not requiring chat)
- Campaign brief: auto-suggest campaign name + template from the most recent research project (smart defaults)
- Analytics: highlight "fatigue risk" badge on creatives with declining CTR trend (predictive, not reactive)
- Operator suggestions: surface the 2-3 most relevant next actions as floating chips on EVERY page (not just in the Operator view)

## Phase 4: Error Resilience Verification

- Grep for naked `fetch()` calls without timeout/retry wrapper (should be zero)
- Grep for empty `catch {}` or `catch { }` blocks (AI debt pattern #1)
- Verify graceful degradation: temporarily unset Azure key on Vercel, confirm all pages render with seeded data (no white screens, no error toasts)
- Verify Supabase fallback: confirm in-memory stores activate cleanly
- Verify Bright Data fallback: confirm fixture data renders when token is invalid
- Document any gaps found and fix them

## Phase 5: Performance + Core Web Vitals

- Run Lighthouse on the live URL (target: LCP <2.5s, INP <200ms, CLS <0.1)
- Check if `recharts` is code-split per route or loaded globally (it should be dynamic-imported)
- Check if Motion primitives below the fold are lazy-loaded
- Add `loading="lazy"` or `next/image priority` where appropriate
- Verify no layout shift from shimmer -> content transitions (skeleton shapes match final)
- Report actual Lighthouse scores as evidence

## Phase 6: Copy + Content Quality Audit

- Re-read every visible UI string for: filler verbs ("elevate", "seamless", "leverage"), AI-hallucinated phrases, grammatically-broken sentences, unclear referents
- Replace marketing speak with specific, concrete language about what the tool literally does
- Verify demo seeded data doesn't claim fake-precise numbers without "(sample data)" label
- Confirm one copy register per page (mono for metrics only, functional prose for descriptions)
- Zero em-dashes (confirmed in Phase 1, re-verify)

## Phase 7: Architecture Audit (ai-debt-detector + zoom-out)

- Audit all six research providers for: swallowed errors, orphaned fetch calls without abort signal, missing finally blocks
- Verify Operator `maxDuration: 60` properly surfaces a timeout message to the user (not silent drop)
- Check every `useEffect` with timers/subscriptions has cleanup return
- Verify no resource leaks in the Scraping Browser path (puppeteer connections always disconnect)
- Run `ai-debt-detector` 5-point checklist on the 10 most complex files

## Phase 8: Mobile Responsiveness

- Test at 375px viewport: sidebar collapses, Operator rail hides, content is single-column
- Verify all touch targets are 44x44px minimum (buttons, nav items, card actions)
- Verify analytics charts scroll horizontally without page overflow
- Verify Command palette works with touch (no hover-only triggers)
- Verify the landing page `/lp/[slug]` is mobile-first (it is the conversion surface)
