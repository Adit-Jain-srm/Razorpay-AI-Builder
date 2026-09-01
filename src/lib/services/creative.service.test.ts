import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// Avoid pulling next/headers via the real Supabase server client.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { DEMO_CAMPAIGN_ID } from "@/lib/creative/fixtures";
import type { Database } from "@/types/database";

import {
  DEMO_CREATIVE_USER_ID,
  getCreativeImageUrl,
  InMemoryCreativeStore,
  SupabaseCreativeStore,
} from "./creative.service";

/* -------------------------------------------------------------------------- */
/* In-memory store                                                            */
/* -------------------------------------------------------------------------- */

describe("InMemoryCreativeStore", () => {
  let store: InMemoryCreativeStore;
  beforeEach(() => {
    store = new InMemoryCreativeStore();
  });

  it("is seeded with demo creatives for the demo campaign", async () => {
    const rows = await store.listByCampaign(DEMO_CAMPAIGN_ID);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.campaign_id === DEMO_CAMPAIGN_ID)).toBe(true);
  });

  it("creates a creative scoped to the resolved user (ignores spoofed user_id)", async () => {
    const created = await store.create({
      campaign_id: "c1",
      user_id: "attacker",
      platform: "meta",
      type: "single",
      content: { platform: "meta" },
    });
    expect(created.user_id).toBe(DEMO_CREATIVE_USER_ID);
    expect(created.id).toBeTruthy();
    expect(await store.get(created.id)).toEqual(created);
  });

  it("updates favorite, rating, and arbitrary patches", async () => {
    const created = await store.create({ campaign_id: "c1", user_id: "u", platform: "meta", type: "single" });
    expect((await store.setFavorite(created.id, true)).is_favorite).toBe(true);
    expect((await store.setRating(created.id, 4)).rating).toBe(4);
    expect((await store.update(created.id, { score: 88 })).score).toBe(88);
  });

  it("removes a creative and its images", async () => {
    const created = await store.create({ campaign_id: "c1", user_id: "u", platform: "meta", type: "single" });
    await store.uploadImage({ creativeId: created.id, base64: "AAAA", contentType: "image/png" });
    expect((await store.listImages(created.id)).length).toBe(1);
    await store.remove(created.id);
    expect(await store.get(created.id)).toBeNull();
    expect((await store.listImages(created.id)).length).toBe(0);
  });

  it("uploads an image inline as a data URL", async () => {
    const created = await store.create({ campaign_id: "c1", user_id: "u", platform: "meta", type: "single" });
    const image = await store.uploadImage({ creativeId: created.id, base64: "AAAA", contentType: "image/png", aspectRatio: "1:1" });
    expect(image.storage_path.startsWith("data:image/png;base64,")).toBe(true);
    expect(image.aspect_ratio).toBe("1:1");
  });

  it("persists and removes brand voices", async () => {
    const voice = await store.createBrandVoice({ user_id: "u", name: "Test voice", sample_ads: ["a"], tone_profile: {} });
    expect((await store.listBrandVoices()).length).toBe(1);
    await store.removeBrandVoice(voice.id);
    expect((await store.listBrandVoices()).length).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Image URL resolution                                                       */
/* -------------------------------------------------------------------------- */

describe("getCreativeImageUrl", () => {
  const base = {
    id: "i",
    creative_id: "c",
    user_id: "u",
    aspect_ratio: null,
    platform: null,
    prompt_used: null,
    created_at: "t",
  };

  it("passes through data and http URLs", () => {
    expect(getCreativeImageUrl({ ...base, storage_path: "data:image/svg+xml,x" })).toBe("data:image/svg+xml,x");
    expect(getCreativeImageUrl({ ...base, storage_path: "https://cdn/x.png" })).toBe("https://cdn/x.png");
  });

  it("builds a public storage URL for a relative path", () => {
    const url = getCreativeImageUrl({ ...base, storage_path: "user/cre/img.png" });
    expect(url).toContain("/storage/v1/object/public/creative-images/user/cre/img.png");
  });
});

/* -------------------------------------------------------------------------- */
/* Supabase store (mocked client)                                             */
/* -------------------------------------------------------------------------- */

interface BuilderState {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  payload?: Record<string, unknown>;
  single: boolean;
  maybe: boolean;
}
type MockResult = { data: unknown; error: unknown };

const uploads: string[] = [];

function sampleRow(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  return {
    id: "row-1",
    created_at: "t",
    updated_at: "t",
    is_favorite: false,
    rating: null,
    version: 1,
    hook_type: null,
    hook_confidence: null,
    score: null,
    ...(payload ?? {}),
  };
}

function resolve(state: BuilderState): MockResult {
  if (state.op === "insert" || state.op === "update") return { data: sampleRow(state.payload), error: null };
  if (state.op === "select") {
    if (state.maybe) return { data: sampleRow({}), error: null };
    return { data: [sampleRow({ campaign_id: "c1" }), sampleRow({ campaign_id: "c1" })], error: null };
  }
  return { data: null, error: null };
}

function makeBuilder(table: string) {
  const state: BuilderState = { table, op: "select", single: false, maybe: false };
  const builder = {
    select() {
      return builder;
    },
    insert(payload: Record<string, unknown>) {
      state.op = "insert";
      state.payload = payload;
      return builder;
    },
    update(payload: Record<string, unknown>) {
      state.op = "update";
      state.payload = payload;
      return builder;
    },
    delete() {
      state.op = "delete";
      return builder;
    },
    eq() {
      return builder;
    },
    order() {
      return builder;
    },
    single() {
      state.single = true;
      return builder;
    },
    maybeSingle() {
      state.maybe = true;
      return builder;
    },
    then<T1 = MockResult, T2 = never>(
      onF?: ((value: MockResult) => T1 | PromiseLike<T1>) | null,
      onR?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
    ): Promise<T1 | T2> {
      return Promise.resolve(resolve(state)).then(onF, onR);
    },
  };
  return builder;
}

function makeClient(): SupabaseClient<Database> {
  const client = {
    from: (table: string) => makeBuilder(table),
    storage: {
      from: () => ({
        upload: async (path: string) => {
          uploads.push(path);
          return { error: null };
        },
        remove: async () => ({ error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://x/${path}` } }),
      }),
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

describe("SupabaseCreativeStore", () => {
  afterEach(() => {
    uploads.length = 0;
  });

  it("forces user scoping on create (RLS safety)", async () => {
    const store = new SupabaseCreativeStore(makeClient(), "user-123");
    const created = await store.create({ campaign_id: "c1", user_id: "spoofed", platform: "meta", type: "single" });
    expect(created.user_id).toBe("user-123");
  });

  it("uploads images under the user's storage folder and persists the row", async () => {
    const store = new SupabaseCreativeStore(makeClient(), "user-123");
    const image = await store.uploadImage({ creativeId: "cre-9", base64: "AAAA", contentType: "image/png", aspectRatio: "9:16" });
    expect(uploads).toHaveLength(1);
    expect(uploads[0].startsWith("user-123/cre-9/")).toBe(true);
    expect(image.storage_path).toBe(uploads[0]);
  });

  it("lists creatives for a campaign", async () => {
    const store = new SupabaseCreativeStore(makeClient(), "user-123");
    const rows = await store.listByCampaign("c1");
    expect(rows).toHaveLength(2);
  });
});
