import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { generateText, streamText, type LanguageModel, type Prompt } from "ai";

import { getEnv, isAzureConfigured } from "@/lib/env";
import { ConfigurationError, UpstreamError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { withRetry } from "@/lib/resilience";

/**
 * Azure AI Foundry access for MediaOS (OpenAI-compatible `v1` surface -
 * `services.ai.azure.com/openai/v1`, NOT classic Azure OpenAI).
 *
 * - Chat / reasoning / copy runs through the Vercel AI SDK (`generateChat`,
 *   `streamChat`) over the OpenAI-compatible provider so the Operator agent gets
 *   first-class tool-calling + streaming. We target the **chat-completions**
 *   transport (`provider.chat`) on the `/openai/v1` base - the simplest path that
 *   keeps `streamText`/`generateText` and tool-calling working; flip
 *   `CHAT_TRANSPORT` to `"responses"` to use the Responses API instead.
 * - Image generation (`MAI-Image-2.5`) runs through a typed REST helper
 *   (`generateImage`) so we control size/format explicitly and stay resilient.
 *
 * Auth is the standard OpenAI `Authorization: Bearer <key>` header (the Foundry
 * v1 surface), which `createOpenAI({ apiKey })` sets for us and the image helper
 * sets explicitly.
 *
 * Every entry point is guarded by `isAzureConfigured()` and wrapped in
 * retry + timeout, throwing the typed errors from `@/lib/errors` so the agent
 * and UI can degrade gracefully when credentials are absent.
 */

// SERVER ONLY: this module reads `AZURE_OPENAI_API_KEY`. Never import it from a
// Client Component.

/**
 * Which OpenAI transport backs the chat model. `gpt-5.3-chat` answers on
 * chat-completions over the `/openai/v1` base (live-validated), so we use that;
 * `"responses"` is available as a drop-in fallback for models that require it.
 */
const CHAT_TRANSPORT: "chat" | "responses" = "chat";

const CONFIG_MESSAGE =
  "Azure AI Foundry is not configured. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_BASE_URL (or AZURE_OPENAI_ENDPOINT).";

let provider: OpenAIProvider | null = null;

/** Resolves the OpenAI-compatible v1 base URL (explicit, else derived). */
function resolveBaseUrl(): string {
  const env = getEnv();
  const explicit = env.AZURE_OPENAI_BASE_URL.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const endpoint = env.AZURE_OPENAI_ENDPOINT.trim().replace(/\/+$/, "");
  return `${endpoint}/openai/v1`;
}

/** Chat deployment name: v1-aligned key first, legacy key as fallback. */
function resolveChatDeployment(override?: string): string {
  const env = getEnv();
  return override ?? (env.AZURE_OPENAI_CHAT_DEPLOYMENT.trim() || env.AZURE_OPENAI_GPT4O_DEPLOYMENT);
}

function getOpenAIProvider(): OpenAIProvider {
  if (!isAzureConfigured()) {
    throw new ConfigurationError("azure", CONFIG_MESSAGE);
  }
  if (provider) return provider;

  const env = getEnv();
  provider = createOpenAI({
    baseURL: resolveBaseUrl(),
    apiKey: env.AZURE_OPENAI_API_KEY,
  });
  return provider;
}

/** Returns the configured chat model (deployment `gpt-5.3-chat` by default). */
export function getChatModel(deployment?: string): LanguageModel {
  const p = getOpenAIProvider();
  const id = resolveChatDeployment(deployment);
  return CHAT_TRANSPORT === "responses" ? p.responses(id) : p.chat(id);
}

type ChatMessages = NonNullable<Prompt["messages"]>;

export interface ChatRequest {
  /** System prompt. Prepended as a system message. */
  system?: string;
  /** Single-turn user prompt. Appended as a user message. */
  prompt?: string;
  /** Multi-turn message history (model messages). */
  messages?: ChatMessages;
  temperature?: number;
  maxOutputTokens?: number;
  /** Override the chat deployment (defaults to the configured chat deployment). */
  deployment?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
}

/** Builds a normalized message array so we never hit the prompt/messages union. */
function buildMessages(req: ChatRequest): ChatMessages {
  const messages: ChatMessages = [];
  if (req.system) messages.push({ role: "system", content: req.system });
  if (req.messages?.length) messages.push(...req.messages);
  if (req.prompt) messages.push({ role: "user", content: req.prompt });
  return messages;
}

/**
 * Non-streaming text generation with retry + timeout. Use for analysis,
 * synthesis, and structured single-shot generation.
 */
export async function generateChat(req: ChatRequest): Promise<{ text: string }> {
  const model = getChatModel(req.deployment);
  const messages = buildMessages(req);

  const result = await withRetry(
    (signal) =>
      generateText({
        model,
        messages,
        temperature: req.temperature,
        maxOutputTokens: req.maxOutputTokens,
        maxRetries: 0, // resilience handled here
        abortSignal: signal,
      }),
    {
      signal: req.signal,
      timeoutMs: req.timeoutMs ?? 60000,
      retries: req.retries ?? 2,
      label: "azure.generateChat",
      onRetry: (error, attempt, delayMs) => logger.warn("Retrying Azure chat generation", { attempt, delayMs, error: String(error) }),
    },
  );

  return { text: result.text };
}

/**
 * Streaming text generation. Returns the AI SDK stream result so callers can
 * pipe to a UI message stream (agent runtime) or consume `textStream`. Streaming
 * retries are delegated to the SDK (`maxRetries`) since mid-stream retry is unsafe.
 */
export function streamChat(req: ChatRequest) {
  if (!isAzureConfigured()) {
    throw new ConfigurationError("azure", CONFIG_MESSAGE);
  }
  const model = getChatModel(req.deployment);
  const messages = buildMessages(req);

  return streamText({
    model,
    messages,
    temperature: req.temperature,
    maxOutputTokens: req.maxOutputTokens,
    maxRetries: req.retries ?? 2,
    abortSignal: req.signal,
  });
}

/** Sizes supported by the Foundry image deployment (MAI-Image-2.5). */
export type AzureImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
export type AzureImageQuality = "low" | "medium" | "high" | "auto";

export interface GenerateImageRequest {
  prompt: string;
  size?: AzureImageSize;
  /**
   * Retained for caller-signature stability. The MAI-Image-2.5 endpoint does not
   * take a `quality` parameter, so it is accepted but not forwarded.
   */
  quality?: AzureImageQuality;
  /** Number of images to generate. Default 1. */
  n?: number;
  /** Override the image deployment (defaults to the configured image deployment). */
  deployment?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
}

export interface GeneratedImage {
  /** Base64-encoded image bytes (no data: prefix). */
  b64: string;
  mimeType: string;
  size: AzureImageSize;
  revisedPrompt?: string;
}

interface AzureImageApiResponse {
  data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  error?: { message?: string; code?: string };
}

/**
 * Full image-generations URL: explicit `AZURE_OPENAI_IMAGE_ENDPOINT`, else
 * derived. MAI-Image-2.5 serves generation on the `/mai/v1` surface - the
 * `/openai/v1/images/generations` form validates input but 404s on generation
 * (confirmed live), so the derived default targets `.../mai/v1/images/generations`.
 */
function resolveImageEndpoint(): string {
  const env = getEnv();
  const explicit = env.AZURE_OPENAI_IMAGE_ENDPOINT.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const base = resolveBaseUrl();
  const maiBase = base.replace(/\/openai\/v1$/, "/mai/v1");
  return `${maiBase}/images/generations`;
}

/**
 * Generates images via the Azure AI Foundry images REST API (MAI-Image-2.5 on
 * the `/openai/v1/images/generations` endpoint). Uses the OpenAI-style
 * `Authorization: Bearer` header, sends the deployment as `model`, and parses
 * `data[0].b64_json` (base64 PNG). Returns base64 bytes so callers can upload to
 * Supabase Storage. Wrapped in retry + timeout with typed errors.
 */
export async function generateImage(req: GenerateImageRequest): Promise<GeneratedImage[]> {
  if (!isAzureConfigured()) {
    throw new ConfigurationError("azure", CONFIG_MESSAGE);
  }

  const env = getEnv();
  const deployment = req.deployment ?? env.AZURE_OPENAI_IMAGE_DEPLOYMENT;
  const size: AzureImageSize = req.size ?? "1024x1024";
  const url = resolveImageEndpoint();

  const body = {
    prompt: req.prompt,
    model: deployment,
    n: req.n ?? 1,
    size,
    // MAI-Image-2.5 expects a MIME type here (image/png|image/jpeg|image/webp),
    // NOT the bare "png" form classic gpt-image used. Confirmed by live 400.
    output_format: "image/png",
  };

  return withRetry(
    async (signal) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.AZURE_OPENAI_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new UpstreamError(`Azure image generation failed (${response.status})`, {
          service: "azure",
          status: response.status,
          context: { detail: detail.slice(0, 500) },
        });
      }

      const json = (await response.json()) as AzureImageApiResponse;
      const items = json.data ?? [];
      if (items.length === 0) {
        throw new UpstreamError("Azure image generation returned no images", { service: "azure", status: response.status });
      }

      return items
        .filter((item): item is { b64_json: string; revised_prompt?: string } => typeof item.b64_json === "string")
        .map((item) => ({
          b64: item.b64_json,
          mimeType: "image/png",
          size,
          revisedPrompt: item.revised_prompt,
        }));
    },
    {
      signal: req.signal,
      timeoutMs: req.timeoutMs ?? 120000,
      retries: req.retries ?? 1,
      label: "azure.generateImage",
      onRetry: (error, attempt, delayMs) => logger.warn("Retrying Azure image generation", { attempt, delayMs, error: String(error) }),
    },
  );
}
