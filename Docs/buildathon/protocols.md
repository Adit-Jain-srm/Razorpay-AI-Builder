# Agentic Commerce Protocols — What We Implement vs Cite

Track 01 names a "global protocol race." We implement the *ideas* on Razorpay test-mode. We do
**not** claim certification or compliance with any protocol.

---

## NPCI Unified Agent Protocol (UAP)

**Layer:** Agent identity + spend limits on UPI.

**What we borrow:** Named agent identity (the Operator), per-merchant spending caps (policy engine),
user consent via mandates.

**What we do not fake:** Not a public spec yet; no UPI Circle registry; no real UPI rail.

**References:**
- [ClearingPost — NPCI UAP](https://clearingpost.com/insights/npci-unified-agent-protocol-agentic-upi/)
- [Outlook Business](https://www.outlookbusiness.com/news/india-plans-ai-powered-upi-payments-framework-through-unified-agent-protocol)
- [Stellagent — Razorpay/NPCI Claude pilots](https://stellagent.ai/insights/india-npci-unified-agent-protocol-upi)
- [ABP Live](https://news.abplive.com/business/ai-upi-payments-npci-unified-agent-protocol-explained-1855498)

---

## OpenAI + Stripe Agentic Commerce Protocol (ACP)

**Layer:** Catalog + checkout sessions.

**What we borrow:** Public product feed at `/api/commerce/catalog` (ACP-inspired JSON with
`is_eligible_search`, `is_eligible_checkout`); checkout sessions CRUD; `llms.txt` pointing AI buyers
at the catalog.

**What we do not fake:** Not Instant Checkout inside ChatGPT; not a certified ACP merchant.

**References:**
- [OpenAI Products API](https://developers.openai.com/commerce/specs/api/products)
- [ACP schemas (GitHub)](https://github.com/xpaysh/agentic-commerce-plugin-template/tree/main/packages/acp-schemas)
- [ChatGPT feed guide (Context Hints)](https://www.contexthints.com/guide/chatgpt-product-feed.html)
- [Orium — ACP/AP2/x402 explained](https://orium.com/blog/agentic-payments-acp-ap2-x402)
- [Premier Octet — ACP guide](https://www.premieroctet.com/blog/en/ecommerce-conversationnel-with-openai-and-stripe-complete-guide-of-the-agentic-commerce-protocol)

---

## Google Agent Payments Protocol (AP2)

**Layer:** Mandates — digitally signed statements defining what an agent may do.

**What we borrow:** `mandates` table with `action`, `amountPaise`, `maxPaise`, `expiresAt`,
`reason`, `evidence[]`, `decidedBy` (policy or user), `status`. Every money action requires an
active, non-expired mandate.

**What we do not fake:** No Google payment rail.

**References:**
- [Orium — ACP, AP2, and x402](https://orium.com/blog/agentic-payments-acp-ap2-x402)

---

## Coinbase x402

**Layer:** HTTP 402 Payment Required.

**What we borrow:** Optional `GET /api/commerce/offers/premium` returns 402 with payment
instructions; unlocks after `order.paid`.

**What we do not fake:** No on-chain settlement; no cryptocurrency.

**References:**
- [Orium — ACP, AP2, and x402](https://orium.com/blog/agentic-payments-acp-ap2-x402)

---

## Our money rail

Razorpay **Test Mode** only. No real money moves.

- [Orders API + Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Standard Checkout best practices](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/best-practices/)
- [Webhook validation](https://razorpay.com/docs/webhooks/validate-test/)
- [Test cards](https://razorpay.com/docs/payments/payments/test-card-details/)
- [Test UPI](https://razorpay.com/docs/payments/payments/test-upi-details/)
