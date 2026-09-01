# Azure AI Foundry Models

How MediaOS's AI capabilities (Operator reasoning/copy + Creative Studio visuals) map
onto the Azure AI Foundry models the user provisioned. **This is the Azure AI Foundry
OpenAI-compatible `v1` surface (`services.ai.azure.com`), which is _different_ from
classic Azure OpenAI (`*.openai.azure.com`).** [`src/lib/ai/azure.ts`](../src/lib/ai/azure.ts) has been **adapted** to this surface
(see [§5 integration](#5-mediaos-integration-done)).

> Status: **env wired, code wired, LIVE-VALIDATED (2026-06-30).** Real AI is now
> active: chat (`gpt-5.3-chat`) and image (`MAI-Image-2.5`) both respond against the
> live Foundry v1 surface (`npm run smoke:azure` green). The app only degrades to the
> seeded "configure credentials" mode when the key/base URL are absent. The two live
> corrections vs. the originally documented shape are recorded inline below:
> the image endpoint is **`/mai/v1/images/generations`** (the `/openai/v1/...` form
> validates input but 404s on generation) and `output_format` must be a **MIME type**
> (`image/png`), not the bare `png`.

---

## 1. Resource & endpoints

| Thing | Value |
|---|---|
| Resource base | `https://aditjain2005-0132-resource.services.ai.azure.com` |
| OpenAI-compatible v1 base | `https://aditjain2005-0132-resource.services.ai.azure.com/openai/v1` |
| Project endpoint | `https://aditjain2005-0132-resource.services.ai.azure.com/api/projects/aditjain2005-0132` |
| Responses endpoint | `https://aditjain2005-0132-resource.services.ai.azure.com/api/projects/aditjain2005-0132/openai/v1/responses` |
| Image generations endpoint (WORKING) | `https://aditjain2005-0132-resource.services.ai.azure.com/mai/v1/images/generations` |
| Image generations endpoint (validates input, 404s on generation) | `https://aditjain2005-0132-resource.services.ai.azure.com/openai/v1/images/generations` |
| API version | `preview` |
| API key (shared by both models) | `1284...g4Xs` — **masked here on purpose; the real key lives only in git-ignored `.env.local`. Rotate it (the user will rotate).** |

> Note on the image endpoint: two forms were observed during provisioning —
> `.../openai/v1/images/generations` and `.../mai/v1/images/generations`. MediaOS
> standardizes on the `/openai/v1/...` form (stored in `AZURE_OPENAI_IMAGE_ENDPOINT`).

---

## 2. The two models

### Chat — `gpt-5.3-chat`
- **Deployment name:** `gpt-5.3-chat`
- **Base URL:** `https://aditjain2005-0132-resource.services.ai.azure.com/openai/v1`
- **How to call:** OpenAI SDK (`responses.create`, or chat completions) with `base_url` +
  `api_key`. The OpenAI-style `model` argument is the **deployment name**
  (`gpt-5.3-chat`).
- **Responses endpoint:**
  `https://aditjain2005-0132-resource.services.ai.azure.com/api/projects/aditjain2005-0132/openai/v1/responses`

### Image — `MAI-Image-2.5`
- **Deployment name:** `MAI-Image-2.5`
- **Endpoint (live-confirmed working):**
  `https://aditjain2005-0132-resource.services.ai.azure.com/mai/v1/images/generations`
  — the `/openai/v1/images/generations` form passes input validation but returns
  **HTTP 404** on the actual generation, so MediaOS uses the `/mai/v1/...` form.
- **`output_format` is a MIME type:** allowed values are `image/png`, `image/jpeg`,
  `image/webp` (or `null`). The bare `png` string is rejected with HTTP 400. MediaOS
  sends `image/png`.
- **Response shape:** returns `data[0].b64_json` (base64 PNG bytes, no `data:` prefix).
- **Auth:** `Authorization: Bearer <key>`.

---

## 3. Environment variables

Set in git-ignored `.env.local` (real values) and mirrored as placeholders in the
committed `.env.example`. Both chat-deployment keys are intentionally set to the same
value so whichever name the code reads resolves correctly.

| Key | Value (placeholder in `.env.example`) | Purpose |
|---|---|---|
| `AZURE_OPENAI_ENDPOINT` | `https://<resource>.services.ai.azure.com` | Resource base |
| `AZURE_OPENAI_API_KEY` | _(secret)_ | Shared key for chat + image |
| `AZURE_OPENAI_BASE_URL` | `https://<resource>.services.ai.azure.com/openai/v1` | OpenAI-compatible v1 base |
| `AZURE_OPENAI_GPT4O_DEPLOYMENT` | `gpt-5.3-chat` | Chat deployment (legacy key name) |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | `gpt-5.3-chat` | Chat deployment (v1-aligned name) |
| `AZURE_OPENAI_IMAGE_DEPLOYMENT` | `MAI-Image-2.5` | Image deployment |
| `AZURE_OPENAI_IMAGE_ENDPOINT` | `https://<resource>.services.ai.azure.com/openai/v1/images/generations` | Full image gen URL |
| `AZURE_OPENAI_API_VERSION` | `preview` | API version for the v1 surface |
| `AZURE_AI_PROJECT_ENDPOINT` | `https://<resource>.services.ai.azure.com/api/projects/<project>` | Project endpoint (responses API) |

---

## 4. Working usage snippets

> The key is masked as `1284...g4Xs` below. **Never paste the real key into a committed
> file** — it lives only in `.env.local`. Read it from the environment at runtime.

### Image generation (curl)

```bash
curl -X POST \
  "https://aditjain2005-0132-resource.services.ai.azure.com/openai/v1/images/generations" \
  -H "Authorization: Bearer 1284...g4Xs" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MAI-Image-2.5",
    "prompt": "a minimalist product hero shot of a financial newsletter app, soft studio lighting",
    "size": "1024x1024",
    "n": 1,
    "output_format": "png"
  }'
# -> { "data": [ { "b64_json": "<base64 png bytes>" } ] }
```

### Chat via `responses.create` (Python, OpenAI SDK)

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://aditjain2005-0132-resource.services.ai.azure.com/openai/v1",
    api_key=os.environ["AZURE_OPENAI_API_KEY"],  # "1284...g4Xs"
)

resp = client.responses.create(
    model="gpt-5.3-chat",  # the deployment name
    input="Draft a 2-line cold-open for a fintech newsletter targeting indie founders.",
)
print(resp.output_text)
```

The equivalent in JS/TS uses the `openai` package with `baseURL` + `apiKey` and
`client.responses.create({ model: "gpt-5.3-chat", input: "..." })`.

---

## 5. MediaOS integration (DONE)

**Completed + live-validated 2026-06-30.** `src/lib/ai/azure.ts` and `src/lib/env.ts`
now target the Foundry v1 surface; the exported client signatures
(`getChatModel`/`generateChat`/`streamChat`/`generateImage`) are unchanged so no consumer
in `research`/`campaign`/`creative`/`landing`/`analytics`/`agent` needed edits.

1. **Chat — DONE.** Swapped `@ai-sdk/azure`'s `createAzure(...)` for
   `@ai-sdk/openai`'s `createOpenAI({ baseURL: AZURE_OPENAI_BASE_URL, apiKey: AZURE_OPENAI_API_KEY })`
   and target the **chat-completions** transport via `provider.chat("gpt-5.3-chat")`
   (the simplest path that keeps `streamText`/`generateText` + tool-calling working). A
   `CHAT_TRANSPORT` constant can be flipped to `"responses"` (`provider.responses(...)`)
   if a future model requires it. `@ai-sdk/openai@4.0.2` pairs exactly with `ai@7.0.4`
   (both use `@ai-sdk/provider@4.0.0` + `@ai-sdk/provider-utils@5.0.1`).
   - **Quirk:** the AI SDK classifies `gpt-5.3-chat` as a **reasoning model** and drops
     `temperature` (logs an `unsupported`/`temperature` warning). Calls still succeed; the
     copy/planner temperatures are silently ignored. No action needed — graceful.
2. **Image — DONE.** `generateImage` POSTs to `AZURE_OPENAI_IMAGE_ENDPOINT`
   (**`/mai/v1/images/generations`** — see §2) with `Authorization: Bearer <key>`, body
   `{ prompt, model: "MAI-Image-2.5", n, size, output_format: "image/png" }`, parsing
   `data[0].b64_json`. Two live corrections vs. the original spec: the working endpoint is
   `/mai/v1/...` (not `/openai/v1/...`), and `output_format` must be the MIME `image/png`
   (not bare `png`). `output_compression` is not sent.
3. **Env — DONE.** Added `AZURE_OPENAI_BASE_URL`, `AZURE_OPENAI_CHAT_DEPLOYMENT`,
   `AZURE_OPENAI_IMAGE_ENDPOINT`, `AZURE_AI_PROJECT_ENDPOINT` (optional, safe defaults),
   bumped `AZURE_OPENAI_API_VERSION` default to `preview`, and made `isAzureConfigured()`
   gate on key + (base URL or endpoint). The base URL / image endpoint are derived from
   `AZURE_OPENAI_ENDPOINT` when blank.
4. **Live validation — DONE.** `npm run smoke:azure` (creds-gated, NOT in CI/test suite)
   exercises both models against the real `.env.local` key: chat returns `"ok"`; image
   returns a valid base64 PNG (decoded + PNG magic verified, written to the git-ignored
   `scripts/.smoke-out.png`). The committed Vitest suite stays fully mocked + offline
   (`src/lib/ai/azure.test.ts`, `src/lib/env.test.ts`).

> Auth header note: classic Azure OpenAI uses the `api-key` header; the Foundry v1 surface
> uses standard OpenAI `Authorization: Bearer <key>` — `createOpenAI({ apiKey })` sets it
> for chat and the image helper sets it explicitly.

---

## 6. Security

- The real API key lives **only** in `.env.local`, which is git-ignored (`.gitignore`
  matches `.env.*` with a `!.env.example` exception). It is masked everywhere in this
  committed doc as `1284...g4Xs`.
- The user intends to **rotate** this key. After rotation, update `AZURE_OPENAI_API_KEY`
  in `.env.local` only.
- `AZURE_OPENAI_API_KEY` is server-only — never expose it to the client bundle or a
  Client Component.

---

## Model versions & confirmed key-auth usage

Confirmed details from provisioning/testing against the Azure AI Foundry
OpenAI-compatible `v1` surface. **Access method: Key Authentication** (a shared API key
used for both models). The key is masked everywhere below as `1284...g4Xs` and the user
will rotate it later.

### Model versions

| Model (deployment) | Version | Auth |
|---|---|---|
| `MAI-Image-2.5` | `2026-06-02` | Key Authentication (shared API key) |
| `gpt-5.3-chat` | `2026-03-03` | Key Authentication (shared API key) |

### Chat (`gpt-5.3-chat`) — confirmed Python usage (OpenAI SDK, not the Azure SDK)

This was confirmed using the **OpenAI** Python SDK (not `@azure` / `openai.AzureOpenAI`),
pointing `base_url` at the `/openai/v1` surface, setting `api_key` directly, and calling
`responses.create(...)`. The result is read from `response.output[0]`.

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://aditjain2005-0132-resource.services.ai.azure.com/openai/v1",
    api_key="1284...g4Xs",  # masked — real key lives only in .env.local; rotate later
)

response = client.responses.create(
    model="gpt-5.3-chat",  # deployment name, version 2026-03-03
    input="Draft a 2-line cold-open for a fintech newsletter targeting indie founders.",
)

print(response.output[0])
```

### Image (`MAI-Image-2.5`) — confirmed curl usage

This was confirmed via a direct `POST` to the `/openai/v1/images/generations` endpoint
with a standard `Authorization: Bearer <key>` header. The base64 PNG is parsed from
`data[0].b64_json`.

```bash
curl -X POST \
  "https://aditjain2005-0132-resource.services.ai.azure.com/openai/v1/images/generations" \
  -H "Authorization: Bearer $AZURE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a minimalist product hero shot of a financial newsletter app, soft studio lighting",
    "model": "MAI-Image-2.5",
    "size": "1024x1024",
    "n": 1,
    "output_format": "png",
    "output_compression": 100
  }'
# -> { "data": [ { "b64_json": "<base64 png bytes>" } ] }   # decode data[0].b64_json
```

> `$AZURE_API_KEY` is the masked `1284...g4Xs` key, read from the environment — never
> hard-code the real key.

### Integration implication for `src/lib/ai/azure.ts` (DONE)

> **DONE + live-validated 2026-06-30** (see [§5](#5-mediaos-integration-done)).

- **Chat:** `@ai-sdk/openai`'s
  `createOpenAI({ baseURL: "https://aditjain2005-0132-resource.services.ai.azure.com/openai/v1", apiKey })`
  with `provider.chat("gpt-5.3-chat")` (chat-completions). `provider.responses(...)` is
  the drop-in alternative behind the `CHAT_TRANSPORT` constant.
- **Image:** `POST` to **`.../mai/v1/images/generations`** with `Authorization: Bearer`,
  model `MAI-Image-2.5`, `output_format: "image/png"`, decoding `data[0].b64_json`.
- **No `api-version` query param** is needed for the v1 surface.
