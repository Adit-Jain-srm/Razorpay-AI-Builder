import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for the Azure AI Foundry (OpenAI-compatible v1) client wiring.
 *
 * Fully MOCKED + offline: `@/lib/env` and `@ai-sdk/openai` are mocked and
 * `fetch` is stubbed, so no network call ever happens. These assert the wiring
 * contract the live smoke (`npm run smoke:azure`) proves end to end:
 *   - chat uses the OpenAI-compatible provider on the v1 base via the
 *     chat-completions transport, with the deployment as the model id;
 *   - image gen POSTs to the `/mai/v1/images/generations` endpoint with
 *     `Authorization: Bearer`, the MAI body shape, and parses `data[0].b64_json`;
 *   - both entry points throw a typed ConfigurationError when unconfigured.
 */

const hoisted = vi.hoisted(() => ({
  azureOn: true,
  env: {} as Record<string, string>,
  chatModel: { __brand: "chat-model" as const },
  responsesModel: { __brand: "responses-model" as const },
  chat: vi.fn(),
  responses: vi.fn(),
  createOpenAI: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => hoisted.env,
  isAzureConfigured: () => hoisted.azureOn,
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: hoisted.createOpenAI,
}));

const BASE_ENV: Record<string, string> = {
  AZURE_OPENAI_ENDPOINT: "https://res.services.ai.azure.com",
  AZURE_OPENAI_API_KEY: "test-key-123",
  AZURE_OPENAI_BASE_URL: "https://res.services.ai.azure.com/openai/v1",
  AZURE_OPENAI_GPT4O_DEPLOYMENT: "gpt-5.3-chat",
  AZURE_OPENAI_CHAT_DEPLOYMENT: "gpt-5.3-chat",
  AZURE_OPENAI_IMAGE_DEPLOYMENT: "MAI-Image-2.5",
  AZURE_OPENAI_IMAGE_ENDPOINT: "https://res.services.ai.azure.com/mai/v1/images/generations",
  AZURE_OPENAI_API_VERSION: "preview",
  AZURE_AI_PROJECT_ENDPOINT: "",
};

type AzureModule = typeof import("./azure");
let azure: AzureModule;

function okJson(obj: unknown) {
  return { ok: true, status: 200, json: async () => obj, text: async () => JSON.stringify(obj) };
}
function httpError(status: number, body: string) {
  return { ok: false, status, json: async () => ({}), text: async () => body };
}

beforeEach(async () => {
  hoisted.azureOn = true;
  hoisted.env = { ...BASE_ENV };
  hoisted.chat.mockReturnValue(hoisted.chatModel);
  hoisted.responses.mockReturnValue(hoisted.responsesModel);
  hoisted.createOpenAI.mockReturnValue({ chat: hoisted.chat, responses: hoisted.responses });
  vi.stubGlobal("fetch", hoisted.fetchMock);
  vi.resetModules();
  azure = await import("./azure");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getChatModel", () => {
  it("builds the OpenAI-compatible provider with the v1 base URL + key and uses chat-completions", () => {
    const model = azure.getChatModel();

    expect(hoisted.createOpenAI).toHaveBeenCalledWith({
      baseURL: "https://res.services.ai.azure.com/openai/v1",
      apiKey: "test-key-123",
    });
    expect(hoisted.chat).toHaveBeenCalledWith("gpt-5.3-chat");
    expect(hoisted.responses).not.toHaveBeenCalled();
    expect(model).toBe(hoisted.chatModel);
  });

  it("derives the v1 base URL from the resource endpoint when AZURE_OPENAI_BASE_URL is blank", () => {
    hoisted.env = { ...BASE_ENV, AZURE_OPENAI_BASE_URL: "" };

    azure.getChatModel();

    expect(hoisted.createOpenAI).toHaveBeenCalledWith({
      baseURL: "https://res.services.ai.azure.com/openai/v1",
      apiKey: "test-key-123",
    });
  });

  it("prefers the v1-aligned chat deployment but falls back to the legacy key", () => {
    hoisted.env = { ...BASE_ENV, AZURE_OPENAI_CHAT_DEPLOYMENT: "", AZURE_OPENAI_GPT4O_DEPLOYMENT: "legacy-deploy" };

    azure.getChatModel();

    expect(hoisted.chat).toHaveBeenCalledWith("legacy-deploy");
  });

  it("honors an explicit deployment override", () => {
    azure.getChatModel("custom-model");
    expect(hoisted.chat).toHaveBeenCalledWith("custom-model");
  });

  it("throws a typed ConfigurationError when Azure is unconfigured", () => {
    hoisted.azureOn = false;
    expect(() => azure.getChatModel()).toThrowError(/not configured/i);
    expect(hoisted.createOpenAI).not.toHaveBeenCalled();
  });
});

describe("generateImage", () => {
  it("POSTs the MAI body to the configured endpoint with Bearer auth and parses b64_json", async () => {
    hoisted.fetchMock.mockResolvedValue(okJson({ data: [{ b64_json: "QUJD", revised_prompt: "revised" }] }));

    const out = await azure.generateImage({ prompt: "a hero shot", size: "1024x1024" });

    expect(hoisted.fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = hoisted.fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://res.services.ai.azure.com/mai/v1/images/generations");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer test-key-123");
    expect(init.headers["content-type"]).toBe("application/json");

    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      prompt: "a hero shot",
      model: "MAI-Image-2.5",
      n: 1,
      size: "1024x1024",
      output_format: "image/png",
    });
    // The classic-style `api-key` header and bare `png` format must NOT be sent.
    expect(init.headers["api-key"]).toBeUndefined();
    expect(body.output_format).not.toBe("png");

    expect(out).toEqual([{ b64: "QUJD", mimeType: "image/png", size: "1024x1024", revisedPrompt: "revised" }]);
  });

  it("derives the /mai/v1 image endpoint from the base URL when AZURE_OPENAI_IMAGE_ENDPOINT is blank", async () => {
    hoisted.env = { ...BASE_ENV, AZURE_OPENAI_IMAGE_ENDPOINT: "" };
    hoisted.fetchMock.mockResolvedValue(okJson({ data: [{ b64_json: "QUJD" }] }));

    await azure.generateImage({ prompt: "x" });

    const [url] = hoisted.fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://res.services.ai.azure.com/mai/v1/images/generations");
  });

  it("throws a typed UpstreamError on a non-OK response (and does not retry a 400)", async () => {
    hoisted.fetchMock.mockResolvedValue(httpError(400, "bad request"));

    await expect(azure.generateImage({ prompt: "x" })).rejects.toMatchObject({
      name: "UpstreamError",
      code: "UPSTREAM",
      status: 400,
    });
    expect(hoisted.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the API returns no images", async () => {
    hoisted.fetchMock.mockResolvedValue(okJson({ data: [] }));

    await expect(azure.generateImage({ prompt: "x" })).rejects.toMatchObject({
      name: "UpstreamError",
      code: "UPSTREAM",
      message: expect.stringMatching(/no images/i),
    });
    expect(hoisted.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws a typed ConfigurationError when unconfigured and never calls fetch", async () => {
    hoisted.azureOn = false;
    await expect(azure.generateImage({ prompt: "x" })).rejects.toThrowError(/not configured/i);
    expect(hoisted.fetchMock).not.toHaveBeenCalled();
  });
});
