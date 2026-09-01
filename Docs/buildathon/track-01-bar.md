# Track 01 Bar — Decoded

Official: "Every money action explainable, bounded and gated. Show the audit trail and one failure
handled gracefully."

---

## Money-action taxonomy

A "money action" in MediaOS is any operation that creates, modifies, or settles a financial
commitment. Each must be gated by the policy engine and logged to `audit_events`.

| Action | Razorpay API | Policy gate | Audit event |
|--------|-------------|-------------|-------------|
| `create_order` | `POST /v1/orders` | mandate + budget check + INR + cap | `order_created` |
| `reallocate_budget` | none (jsonb write) | mandate + reason + remaining check | `budget_reallocated` |
| `apply_upsell` | adds to order items | in-graph + bundle cap | `upsell_applied` / `upsell_rejected` |
| `activate_campaign` | none | budget.total set + INR | `campaign_activated` |

**Explainable:** every action carries a `reason` (min 24 chars) and `evidence[]` (research artifact
ids, scorecard metrics).

**Bounded:** every action has `amountPaise` and `maxPaise`; policy enforces caps (single order
₹5,000, campaign ₹50,000, rate 20/10min).

**Gated:** LLM proposes; deterministic policy decides; mandate persisted before execution.

---

## Failure matrix

| Failure | Trigger | System behavior |
|---------|---------|-----------------|
| Payment failed | UPI `failure@razorpay` or mock bank Failure | Audit `payment_failed`; stop-rule: no retry same `razorpay_order_id`; Operator `{ ok:false, code:"PAYMENT_FAILED", stop:true }` |
| Signature mismatch | Fixture / tampered header | 400; no fulfill; audit `signature_invalid` |
| Policy denied | Over cap, missing reason, non-INR | `{ ok:false, code:"POLICY_DENIED" }`; audit `mandate_denied` |
| Razorpay timeout | Mock 5xx | Retry with backoff → `UPSTREAM` → circuit breaker |
| Duplicate webhook | Replay same `event.id` | 200; GMV counted once |
| Abandoned checkout | `created` > 30 min | `expired`; audit; not GMV |
| Amount tamper | Client sends wrong paise | Ignored; server price wins |

**Demo the headline:** `payment.failed` stop-rule. The judge sees: pay with failure VPA → failed
page → audit timeline shows stop-rule → Operator does not retry.

---

## Protocol context (pitch, not implementation)

Track 01 names four protocols. We implement their *ideas* on Razorpay test-mode.

| Protocol | What we borrow | What we do not fake |
|----------|---------------|---------------------|
| NPCI UAP | Named agent, per-merchant caps, consent | No UPI Circle registry |
| OpenAI+Stripe ACP | Product feed, checkout sessions | Not Instant Checkout in ChatGPT |
| Google AP2 | Mandates (bounds + evidence + decidedBy) | No Google payment rail |
| Coinbase x402 | HTTP 402 on gated resources | No on-chain settlement |

See [protocols.md](./protocols.md) for full references.
