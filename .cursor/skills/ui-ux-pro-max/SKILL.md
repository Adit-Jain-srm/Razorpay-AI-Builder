---
name: ui-ux-pro-max
description: UI/UX design intelligence for elite frontend work. Covers design systems, color palettes, typography, animation, accessibility, layout, responsive patterns, and stack-specific best practices for React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui. Use when designing, building, reviewing, fixing, improving, optimizing, or refactoring any UI — components, landing pages, dashboards, admin panels, e-commerce, SaaS, portfolios, blogs, or mobile apps. Especially relevant for glassmorphism, minimalism, dark mode, bento grids, microinteractions, and Linear/Vercel/Stripe-tier polish.
---

# UI/UX Pro Max

Design intelligence for elite frontend engineering.

## Preferred Stack

| Layer | Tool |
|-------|------|
| Framework | React + TypeScript (Next.js preferred for SSR/RSC) |
| Styling | TailwindCSS (with `@theme inline` for v4) |
| Animation | Framer Motion (default), GSAP (only where beneficial) |
| Components | shadcn/ui primitives, custom on top |
| Icons | Heroicons / Lucide / Simple Icons SVG — never emoji |

## When To Apply

When the user asks to plan, build, create, design, implement, review, fix, improve, optimize, enhance, or refactor any UI surface — websites, landing pages, dashboards, admin panels, e-commerce, SaaS, portfolios, blogs, mobile apps, or any `.html`, `.tsx`, `.vue`, `.svelte` file.

## Quality Bar

Every UI must feel: investor-demo quality, Linear/Vercel/Stripe-tier polish, AI-native, premium, intentional.

Never ship: generic CRUD aesthetic, sparse layouts, emoji-as-icon, default browser styling, layout-thrashing hover states, invisible focus rings.

## Rule Priorities

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Accessibility | CRITICAL |
| 2 | Touch & Interaction | CRITICAL |
| 3 | Performance | HIGH |
| 4 | Layout & Responsive | HIGH |
| 5 | Typography & Color | MEDIUM |
| 6 | Animation | MEDIUM |
| 7 | Style Selection | MEDIUM |
| 8 | Charts & Data | LOW |

## Accessibility (CRITICAL)

- 4.5:1 minimum contrast for normal text
- Visible focus rings on every interactive element (`focus-visible:ring-2`)
- Descriptive alt text on meaningful images
- `aria-label` on icon-only buttons
- Tab order matches visual order
- `<label htmlFor>` for every form input

## Touch & Interaction (CRITICAL)

- 44×44 px minimum touch targets
- Click/tap for primary interactions (no hover-only on mobile)
- Disable buttons during async operations; show loading state
- Error messages near the problem, not at the top of the page
- `cursor-pointer` on every clickable surface

## Performance (HIGH)

- WebP/AVIF + `srcset` + lazy loading for images
- Respect `prefers-reduced-motion`
- Reserve space for async content (no layout jumps)
- Code split at route level; dynamic import heavy widgets

## Layout & Responsive (HIGH)

- Test 375 / 768 / 1024 / 1440 px
- 16 px minimum body font on mobile
- No horizontal scroll
- Defined z-index scale (e.g. 10, 20, 30, 50)
- Floating navbar: `top-4 left-4 right-4` not `top-0 left-0 right-0`

## Typography & Color (MEDIUM)

- Body line-height 1.5–1.75
- 65–75 characters per line for long-form
- Match heading/body font personalities
- Light-mode body text: slate-900; muted: slate-600 (never gray-400)
- Light-mode borders: `border-gray-200` (not `border-white/10` which is invisible)

## Animation (MEDIUM)

- 150–300 ms for micro-interactions
- Animate `transform` and `opacity` only (GPU-accelerated)
- Skeleton screens over spinners for known-shape content
- Stagger lists for elegant entrance

## Style Selection (MEDIUM)

- Match style to product type (fintech ≠ playful, kids app ≠ minimal corporate)
- Consistency across all pages
- SVG icons (Heroicons/Lucide), never emojis as UI

## Common Mistakes (Frequently Overlooked)

| Rule | Do | Don't |
|------|----|----- |
| Icons | SVG from Heroicons/Lucide/Simple Icons | Emoji as UI icons |
| Hover states | Color / opacity / shadow transitions | Scale transforms that shift layout |
| Glass cards (light mode) | `bg-white/80` or higher | `bg-white/10` (invisible) |
| Text contrast (light) | `slate-900` body, `slate-600` muted | `slate-400` body text |
| Borders | `border-gray-200` in light mode | `border-white/10` |
| Floating navbar | `top-4 left-4 right-4` | `top-0 left-0 right-0` |
| Cursor | `cursor-pointer` on all clickables | Default cursor |

## Pre-Delivery Checklist

### Visual

- [ ] No emojis used as icons
- [ ] Icons from a single consistent set
- [ ] Hover states never cause layout shift
- [ ] Brand logos verified (Simple Icons)

### Interaction

- [ ] All clickables have `cursor-pointer`
- [ ] Hover feedback is clear
- [ ] Transitions 150–300 ms
- [ ] Focus visible for keyboard users

### Light/Dark Mode

- [ ] Light-mode text meets 4.5:1 contrast
- [ ] Glass/transparent elements visible in both modes
- [ ] Borders visible in both modes
- [ ] Both modes tested

### Layout

- [ ] Floating elements have edge spacing
- [ ] No content hidden behind fixed navbars
- [ ] Tested at 375/768/1024/1440
- [ ] No horizontal scroll on mobile

### Accessibility

- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected

## Design Inspiration

Linear · Vercel · Stripe · Apple · Arc Browser · Notion · Raycast · GitHub · Airbnb · modern fintech and AI-native products.

## shadcn/ui MCP

When shadcn-mcp is available, use it for component search and ready-made examples instead of reinventing primitives.

## Advanced — Design System Search Script

This skill ships with a Python search tool that recommends pattern + style + colors + typography + effects + anti-patterns based on product type. Use it when starting a new product to produce a complete design system in one call.

```bash
python scripts/search.py "<product_type> <industry> <keywords>" --design-system -p "Project Name"
```

Persist as a hierarchical Master + page-overrides structure:

```bash
python scripts/search.py "<query>" --design-system --persist -p "Project Name"
python scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"
```

Domain-specific lookups:

```bash
python scripts/search.py "<keyword>" --domain <style|color|typography|landing|chart|ux>
python scripts/search.py "<keyword>" --stack <html-tailwind|react|nextjs|vue|svelte|shadcn>
```

Default stack when unspecified: `html-tailwind`.
