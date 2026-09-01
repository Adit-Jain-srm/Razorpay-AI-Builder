# Razorpay AI Buildathon — Wave 7 Docs Pack

Source of truth for the Track 01 upgrade. Every file here was written before money code.

## Quality bar

Same as Waves 0–6: typed, RLS-backed, fail-safe, tested, documented in the same change,
Conventional Commits, pushed to `origin`. See [Docs/progress.md](../progress.md) Definition of Done.

## Phase list

| Phase | Scope |
|-------|-------|
| 0 | Docs pack + execution rule |
| 1 | Schema + env + error taxonomy |
| 2 | Payments core (client, policy, HMAC, demo store) |
| 3 | Human checkout (LP → Orders → verify → webhook) |
| 4 | Agentic commerce (catalog, sessions, conversational pay) |
| 5 | Upsell / cross-sell + campaign orchestrator |
| 6 | Audit UI + analytics GMV funnel |
| 7 | Operator prompts, tools, canonical seed, copy |
| 8 | Full e2e, edge-case sweep, smoke, prove-it |
| 9 | Live deploy + Razorpay Dashboard |
| 10 | Pitch, architecture, submit |

## File-claim map

| Claim | Owns |
|-------|------|
| payments-core | `src/lib/payments/**`, `src/lib/services/payments.service.ts` |
| checkout-http | `src/app/api/checkout/**`, `src/app/api/webhooks/razorpay/**` |
| commerce-http | `src/app/api/commerce/**`, `public/llms.txt` |
| landing-checkout | `src/lib/landing/types.ts`, checkout components, thanks/failed pages |
| campaign-budget | `src/lib/campaign/brief.ts`, budget UI, hub audit panel |
| analytics-gmv | `src/lib/analytics/aggregate.ts`, charts, labels |
| operator-money | `src/lib/agent/tools/payments.tools.ts`, prompts, runtime |
| schema | `supabase/migrations/0003_*.sql`, `src/types/database.ts` |
| seed | `src/lib/seed/constants.ts` + fixtures |
| docs | `Docs/buildathon/**`, ADR 0005, module docs, README |

## Links

- [Plan](.cursor/plans/track_01_upgrade_96eff3ff.plan.md)
- [Execution rule](.cursor/rules/track-01-execution.mdc)
- [ADR 0005](../adr/0005-razorpay-money-loop.md)
- [Official Buildathon](https://razorpay.com/buildathon/)
- [Track 01 bar decoded](./track-01-bar.md)
- [Protocols](./protocols.md)
