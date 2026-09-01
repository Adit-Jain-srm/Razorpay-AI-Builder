import type { SupabaseClient } from "@supabase/supabase-js";

import { getEnv, isSupabaseConfigured } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  buildSeededCreatives,
  buildSeededImages,
  DEMO_CAMPAIGN_ID,
} from "@/lib/creative/fixtures";
import type {
  BrandVoice,
  BrandVoiceInsert,
  Creative,
  CreativeImage,
  CreativeImageInsert,
  CreativeInsert,
  CreativeUpdate,
  Database,
  Json,
} from "@/types/database";

/**
 * Creative + creative-image + brand-voice persistence.
 *
 * Uses Supabase (RLS-scoped to the signed-in user) when configured, and degrades
 * to a SEEDED in-memory store so the Creative Studio is fully demoable with zero
 * credentials. The store also owns Supabase Storage I/O for `creative_images`
 * (upload base64 -> `creative-images` bucket; resolve public URLs).
 *
 * SERVER ONLY: imports the cookie-bound Supabase client. Never import from a
 * Client Component - resolve image URLs server-side and pass strings down.
 */

const STORAGE_BUCKET = "creative-images";
const DEMO_CREATIVE_USER_ID = "demo-creative-user";

/** Upload a freshly generated image (base64) and persist its row. */
export interface UploadImageInput {
  creativeId: string;
  /** Base64-encoded image bytes (no `data:` prefix). */
  base64: string;
  contentType?: string;
  aspectRatio?: string | null;
  platform?: string | null;
  promptUsed?: string | null;
}

export interface CreativeService {
  listByCampaign(campaignId: string): Promise<Creative[]>;
  get(id: string): Promise<Creative | null>;
  create(input: CreativeInsert): Promise<Creative>;
  update(id: string, patch: CreativeUpdate): Promise<Creative>;
  setFavorite(id: string, isFavorite: boolean): Promise<Creative>;
  setRating(id: string, rating: number | null): Promise<Creative>;
  remove(id: string): Promise<void>;
  addImage(input: CreativeImageInsert): Promise<CreativeImage>;
  uploadImage(input: UploadImageInput): Promise<CreativeImage>;
  listImages(creativeId: string): Promise<CreativeImage[]>;
  removeImage(id: string): Promise<void>;
  /** Resolves a stored image to a renderable URL (public URL or data URL). */
  getImageUrl(image: CreativeImage): string;
  listBrandVoices(): Promise<BrandVoice[]>;
  createBrandVoice(input: BrandVoiceInsert): Promise<BrandVoice>;
  removeBrandVoice(id: string): Promise<void>;
}

/** The per-request store, bound to the resolved user. */
export interface CreativeStore extends Omit<CreativeService, "getImageUrl"> {
  readonly userId: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function randomId(prefix = "cr"): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

/** Resolves a stored image path to a renderable URL. */
export function getCreativeImageUrl(image: CreativeImage): string {
  const path = image.storage_path;
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/* -------------------------------------------------------------------------- */
/* In-memory store (seeded, credential-free demo + tests)                     */
/* -------------------------------------------------------------------------- */

class InMemoryCreativeStore implements CreativeStore {
  readonly userId = DEMO_CREATIVE_USER_ID;
  private readonly creatives = new Map<string, Creative>();
  private readonly images = new Map<string, CreativeImage>();
  private readonly brandVoices = new Map<string, BrandVoice>();
  private seeded = false;

  private ensureSeed(): void {
    if (this.seeded) return;
    this.seeded = true;
    const now = new Date().toISOString();
    const seeds = buildSeededCreatives();

    for (const seed of seeds) {
      this.creatives.set(seed.id, {
        id: seed.id,
        campaign_id: DEMO_CAMPAIGN_ID,
        user_id: this.userId,
        platform: seed.content.platform,
        type: seed.content.format,
        content: toJson(seed.content),
        hook_type: seed.content.hook.type,
        hook_confidence: seed.content.hook.confidence,
        score: seed.content.score.total,
        is_favorite: false,
        rating: null,
        version: 1,
        created_at: now,
        updated_at: now,
      });
    }

    for (const img of buildSeededImages(seeds)) {
      const id = randomId("img");
      this.images.set(id, {
        id,
        creative_id: img.creativeId,
        user_id: this.userId,
        storage_path: img.storagePath,
        aspect_ratio: img.aspectRatio,
        platform: img.platform,
        prompt_used: img.promptUsed,
        created_at: now,
      });
    }
  }

  async listByCampaign(campaignId: string): Promise<Creative[]> {
    this.ensureSeed();
    return [...this.creatives.values()]
      .filter((c) => c.campaign_id === campaignId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async get(id: string): Promise<Creative | null> {
    this.ensureSeed();
    return this.creatives.get(id) ?? null;
  }

  async create(input: CreativeInsert): Promise<Creative> {
    this.ensureSeed();
    const now = new Date().toISOString();
    const row: Creative = {
      id: input.id ?? randomId(),
      campaign_id: input.campaign_id,
      user_id: this.userId,
      platform: input.platform,
      type: input.type,
      content: input.content ?? {},
      hook_type: input.hook_type ?? null,
      hook_confidence: input.hook_confidence ?? null,
      score: input.score ?? null,
      is_favorite: input.is_favorite ?? false,
      rating: input.rating ?? null,
      version: input.version ?? 1,
      created_at: input.created_at ?? now,
      updated_at: input.updated_at ?? now,
    };
    this.creatives.set(row.id, row);
    return row;
  }

  private mutate(id: string, patch: Partial<Creative>): Creative {
    const existing = this.creatives.get(id);
    if (!existing) throw new UpstreamError("Creative not found", { service: "supabase", status: 404 });
    const next = { ...existing, ...patch, updated_at: new Date().toISOString() };
    this.creatives.set(id, next);
    return next;
  }

  async update(id: string, patch: CreativeUpdate): Promise<Creative> {
    this.ensureSeed();
    return this.mutate(id, patch);
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<Creative> {
    this.ensureSeed();
    return this.mutate(id, { is_favorite: isFavorite });
  }

  async setRating(id: string, rating: number | null): Promise<Creative> {
    this.ensureSeed();
    return this.mutate(id, { rating });
  }

  async remove(id: string): Promise<void> {
    this.creatives.delete(id);
    for (const [imgId, img] of this.images) if (img.creative_id === id) this.images.delete(imgId);
  }

  async addImage(input: CreativeImageInsert): Promise<CreativeImage> {
    this.ensureSeed();
    const now = new Date().toISOString();
    const row: CreativeImage = {
      id: input.id ?? randomId("img"),
      creative_id: input.creative_id,
      user_id: this.userId,
      storage_path: input.storage_path,
      aspect_ratio: input.aspect_ratio ?? null,
      platform: input.platform ?? null,
      prompt_used: input.prompt_used ?? null,
      created_at: input.created_at ?? now,
    };
    this.images.set(row.id, row);
    return row;
  }

  async uploadImage(input: UploadImageInput): Promise<CreativeImage> {
    const contentType = input.contentType ?? "image/png";
    // In-memory: keep the bytes inline as a data URL so the gallery renders.
    return this.addImage({
      creative_id: input.creativeId,
      user_id: this.userId,
      storage_path: `data:${contentType};base64,${input.base64}`,
      aspect_ratio: input.aspectRatio ?? null,
      platform: input.platform ?? null,
      prompt_used: input.promptUsed ?? null,
    });
  }

  async listImages(creativeId: string): Promise<CreativeImage[]> {
    this.ensureSeed();
    return [...this.images.values()]
      .filter((i) => i.creative_id === creativeId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async removeImage(id: string): Promise<void> {
    this.images.delete(id);
  }

  async listBrandVoices(): Promise<BrandVoice[]> {
    return [...this.brandVoices.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async createBrandVoice(input: BrandVoiceInsert): Promise<BrandVoice> {
    const now = new Date().toISOString();
    const row: BrandVoice = {
      id: input.id ?? randomId("bv"),
      user_id: this.userId,
      name: input.name,
      sample_ads: input.sample_ads ?? [],
      tone_profile: input.tone_profile ?? {},
      created_at: input.created_at ?? now,
      updated_at: input.updated_at ?? now,
    };
    this.brandVoices.set(row.id, row);
    return row;
  }

  async removeBrandVoice(id: string): Promise<void> {
    this.brandVoices.delete(id);
  }
}

/** Process-wide singleton so demo creatives persist across requests. */
const memoryStore = new InMemoryCreativeStore();

/* -------------------------------------------------------------------------- */
/* Supabase store (RLS-scoped)                                                */
/* -------------------------------------------------------------------------- */

class SupabaseCreativeStore implements CreativeStore {
  constructor(
    private readonly db: SupabaseClient<Database>,
    readonly userId: string,
  ) {}

  async listByCampaign(campaignId: string): Promise<Creative[]> {
    const { data, error } = await this.db
      .from("creatives")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    if (error) {
      logger.warn("creativeStore.listByCampaign failed", { error: error.message });
      return [];
    }
    return data ?? [];
  }

  async get(id: string): Promise<Creative | null> {
    const { data, error } = await this.db.from("creatives").select("*").eq("id", id).maybeSingle();
    if (error) {
      logger.warn("creativeStore.get failed", { error: error.message });
      return null;
    }
    return data ?? null;
  }

  async create(input: CreativeInsert): Promise<Creative> {
    // Force user scoping to the resolved session (RLS requires user_id = auth.uid()).
    const { data, error } = await this.db
      .from("creatives")
      .insert({ ...input, user_id: this.userId })
      .select()
      .single();
    if (error || !data) throw error ?? new UpstreamError("Failed to create creative", { service: "supabase" });
    return data;
  }

  private async patch(id: string, patch: CreativeUpdate): Promise<Creative> {
    const { data, error } = await this.db
      .from("creatives")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw error ?? new UpstreamError("Failed to update creative", { service: "supabase" });
    return data;
  }

  async update(id: string, patch: CreativeUpdate): Promise<Creative> {
    return this.patch(id, patch);
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<Creative> {
    return this.patch(id, { is_favorite: isFavorite });
  }

  async setRating(id: string, rating: number | null): Promise<Creative> {
    return this.patch(id, { rating });
  }

  async remove(id: string): Promise<void> {
    // Best-effort: clean up stored objects for this creative first.
    const images = await this.listImages(id);
    const paths = images.map((i) => i.storage_path).filter((p) => !p.startsWith("data:") && !p.startsWith("http"));
    if (paths.length) await this.db.storage.from(STORAGE_BUCKET).remove(paths).catch(() => undefined);
    const { error } = await this.db.from("creatives").delete().eq("id", id);
    if (error) throw error;
  }

  async addImage(input: CreativeImageInsert): Promise<CreativeImage> {
    const { data, error } = await this.db
      .from("creative_images")
      .insert({ ...input, user_id: this.userId })
      .select()
      .single();
    if (error || !data) throw error ?? new UpstreamError("Failed to add creative image", { service: "supabase" });
    return data;
  }

  async uploadImage(input: UploadImageInput): Promise<CreativeImage> {
    const contentType = input.contentType ?? "image/png";
    const ext = contentType.includes("jpeg") ? "jpg" : contentType.split("/")[1] ?? "png";
    const path = `${this.userId}/${input.creativeId}/${randomId("img")}.${ext}`;
    const bytes = Buffer.from(input.base64, "base64");

    const { error: uploadError } = await this.db.storage.from(STORAGE_BUCKET).upload(path, bytes, {
      contentType,
      upsert: false,
    });
    if (uploadError) {
      throw new UpstreamError(`Image upload failed: ${uploadError.message}`, { service: "supabase" });
    }

    return this.addImage({
      creative_id: input.creativeId,
      user_id: this.userId,
      storage_path: path,
      aspect_ratio: input.aspectRatio ?? null,
      platform: input.platform ?? null,
      prompt_used: input.promptUsed ?? null,
    });
  }

  async listImages(creativeId: string): Promise<CreativeImage[]> {
    const { data, error } = await this.db
      .from("creative_images")
      .select("*")
      .eq("creative_id", creativeId)
      .order("created_at", { ascending: false });
    if (error) {
      logger.warn("creativeStore.listImages failed", { error: error.message });
      return [];
    }
    return data ?? [];
  }

  async removeImage(id: string): Promise<void> {
    const { data } = await this.db.from("creative_images").select("storage_path").eq("id", id).maybeSingle();
    if (data?.storage_path && !data.storage_path.startsWith("data:") && !data.storage_path.startsWith("http")) {
      await this.db.storage.from(STORAGE_BUCKET).remove([data.storage_path]).catch(() => undefined);
    }
    const { error } = await this.db.from("creative_images").delete().eq("id", id);
    if (error) throw error;
  }

  async listBrandVoices(): Promise<BrandVoice[]> {
    const { data, error } = await this.db.from("brand_voices").select("*").order("updated_at", { ascending: false });
    if (error) {
      logger.warn("creativeStore.listBrandVoices failed", { error: error.message });
      return [];
    }
    return data ?? [];
  }

  async createBrandVoice(input: BrandVoiceInsert): Promise<BrandVoice> {
    const { data, error } = await this.db
      .from("brand_voices")
      .insert({ ...input, user_id: this.userId })
      .select()
      .single();
    if (error || !data) throw error ?? new UpstreamError("Failed to save brand voice", { service: "supabase" });
    return data;
  }

  async removeBrandVoice(id: string): Promise<void> {
    const { error } = await this.db.from("brand_voices").delete().eq("id", id);
    if (error) throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Store resolution + public service                                          */
/* -------------------------------------------------------------------------- */

/**
 * Resolves the best store: Supabase (RLS) when configured and a user is signed
 * in, otherwise the seeded in-memory store. Never throws - always returns a
 * usable store so the studio renders with zero credentials.
 */
export async function getCreativeStore(): Promise<CreativeStore> {
  if (!isSupabaseConfigured()) return memoryStore;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return memoryStore;
    return new SupabaseCreativeStore(supabase, user.id);
  } catch (error) {
    logger.warn("Falling back to in-memory creative store", { error: String(error) });
    return memoryStore;
  }
}

export const creativeService: CreativeService = {
  async listByCampaign(campaignId) {
    return (await getCreativeStore()).listByCampaign(campaignId);
  },
  async get(id) {
    return (await getCreativeStore()).get(id);
  },
  async create(input) {
    return (await getCreativeStore()).create(input);
  },
  async update(id, patch) {
    return (await getCreativeStore()).update(id, patch);
  },
  async setFavorite(id, isFavorite) {
    return (await getCreativeStore()).setFavorite(id, isFavorite);
  },
  async setRating(id, rating) {
    return (await getCreativeStore()).setRating(id, rating);
  },
  async remove(id) {
    return (await getCreativeStore()).remove(id);
  },
  async addImage(input) {
    return (await getCreativeStore()).addImage(input);
  },
  async uploadImage(input) {
    return (await getCreativeStore()).uploadImage(input);
  },
  async listImages(creativeId) {
    return (await getCreativeStore()).listImages(creativeId);
  },
  async removeImage(id) {
    return (await getCreativeStore()).removeImage(id);
  },
  getImageUrl(image) {
    return getCreativeImageUrl(image);
  },
  async listBrandVoices() {
    return (await getCreativeStore()).listBrandVoices();
  },
  async createBrandVoice(input) {
    return (await getCreativeStore()).createBrandVoice(input);
  },
  async removeBrandVoice(id) {
    return (await getCreativeStore()).removeBrandVoice(id);
  },
};

/** Exposed for tests + the studio orchestration layer. */
export { InMemoryCreativeStore, SupabaseCreativeStore, DEMO_CREATIVE_USER_ID };
