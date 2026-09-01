/**
 * LIVE smoke test for the Azure AI Foundry (OpenAI-compatible v1) integration.
 *
 * Creds-gated and intentionally NOT part of the Vitest suite or CI: it makes
 * real network calls using the secrets in the git-ignored `.env.local`. It
 * mirrors exactly how `src/lib/ai/azure.ts` builds its requests so a green run
 * proves the production wiring works end to end:
 *   (a) chat  - createOpenAI({ baseURL, apiKey }).chat(model) -> generateText
 *               (chat-completions over `/openai/v1`)
 *   (b) image - POST `<image endpoint>` with `Authorization: Bearer`, body
 *               { prompt, model, size, n, output_format, output_compression },
 *               parsing `data[0].b64_json` (base64 PNG)
 *
 * Run:  npm run smoke:azure
 * The decoded PNG is written to `scripts/.smoke-out.png` (git-ignored, never
 * committed) so you can eyeball it. Exits non-zero on any failure.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Load secrets from .env.local (same file the app reads). Node >= 20.6.
try {
  process.loadEnvFile(join(root, ".env.local"));
} catch (error) {
  console.error("Could not load .env.local:", error?.message ?? error);
  process.exit(1);
}

const key = (process.env.AZURE_OPENAI_API_KEY ?? "").trim();
const endpoint = (process.env.AZURE_OPENAI_ENDPOINT ?? "").trim().replace(/\/+$/, "");
const baseUrl =
  (process.env.AZURE_OPENAI_BASE_URL ?? "").trim().replace(/\/+$/, "") || `${endpoint}/openai/v1`;
const chatDeployment =
  (process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "").trim() ||
  (process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT ?? "").trim();
const imageDeployment = (process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT ?? "").trim();
const imageEndpoint =
  (process.env.AZURE_OPENAI_IMAGE_ENDPOINT ?? "").trim().replace(/\/+$/, "") ||
  `${baseUrl}/images/generations`;

if (!key || !baseUrl || !chatDeployment || !imageDeployment) {
  console.error("Missing required env. Need AZURE_OPENAI_API_KEY, a base URL, chat + image deployments.");
  process.exit(1);
}

const mask = (s) => (s.length <= 8 ? "****" : `${s.slice(0, 4)}...${s.slice(-4)}`);
console.log("=== Azure AI Foundry live smoke ===");
console.log("base URL        :", baseUrl);
console.log("chat deployment :", chatDeployment);
console.log("image deployment:", imageDeployment);
console.log("image endpoint  :", imageEndpoint);
console.log("api key         :", mask(key));
console.log("");

let failures = 0;

/* ----------------------------- (a) chat ---------------------------------- */
async function smokeChat() {
  console.log("--- (a) chat: gpt-5.3-chat (chat-completions) ---");
  const provider = createOpenAI({ baseURL: baseUrl, apiKey: key });
  const model = provider.chat(chatDeployment);
  const t0 = Date.now();
  const result = await generateText({
    model,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
    temperature: 0.7,
    maxOutputTokens: 50,
    maxRetries: 0,
  });
  const ms = Date.now() - t0;
  console.log(`response (${ms}ms):`, JSON.stringify(result.text));
  if (Array.isArray(result.warnings) && result.warnings.length > 0) {
    console.log("warnings:", JSON.stringify(result.warnings));
  }
  if (!result.text || result.text.trim().length === 0) {
    throw new Error("chat returned empty text");
  }
  console.log("chat OK\n");
}

/* ----------------------------- (b) image --------------------------------- */
async function postImage(url, body) {
  const t0 = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  const text = await response.text().catch(() => "");
  return { status: response.status, ok: response.ok, ms, text };
}

async function smokeImage() {
  console.log("--- (b) image: MAI-Image-2.5 (images/generations) ---");
  const body = {
    prompt: "a tiny minimalist blue circle on a white background",
    model: imageDeployment,
    size: "1024x1024",
    n: 1,
    output_format: "image/png",
  };

  // Probe the configured endpoint plus the documented `/mai/v1/...` alternate.
  const candidates = [imageEndpoint];
  const maiAlt = imageEndpoint.replace("/openai/v1/", "/mai/v1/");
  if (maiAlt !== imageEndpoint) candidates.push(maiAlt);

  let lastDetail = "";
  for (const url of candidates) {
    const { status, ok, ms, text } = await postImage(url, body);
    if (!ok) {
      console.log(`  ${url} -> HTTP ${status} (${ms}ms)`);
      lastDetail = `HTTP ${status}: ${text.slice(0, 300)}`;
      continue;
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      lastDetail = `non-JSON body: ${text.slice(0, 200)}`;
      continue;
    }
    const b64 = json?.data?.[0]?.b64_json;
    if (typeof b64 !== "string" || b64.length === 0) {
      lastDetail = `missing data[0].b64_json: ${JSON.stringify(json).slice(0, 200)}`;
      continue;
    }
    const bytes = Buffer.from(b64, "base64");
    const outPath = join(here, ".smoke-out.png");
    writeFileSync(outPath, bytes);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    console.log(`  working endpoint: ${url}`);
    console.log(`  response (${ms}ms): b64 length = ${b64.length}, first chars = ${b64.slice(0, 24)}`);
    console.log(`  decoded ${bytes.length} bytes, PNG magic = ${isPng}, wrote ${outPath}`);
    if (!isPng) throw new Error("decoded image is not a PNG");
    console.log("image OK\n");
    return;
  }
  throw new Error(`no image endpoint succeeded. last: ${lastDetail}`);
}

for (const [label, fn] of [
  ["chat", smokeChat],
  ["image", smokeImage],
]) {
  try {
    await fn();
  } catch (error) {
    failures += 1;
    console.error(`${label} FAILED:`, error?.message ?? error);
  }
}

console.log(failures === 0 ? "=== ALL SMOKE CHECKS PASSED ===" : `=== ${failures} SMOKE CHECK(S) FAILED ===`);
process.exit(failures === 0 ? 0 : 1);
