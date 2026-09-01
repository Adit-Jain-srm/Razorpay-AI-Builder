import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";
import { AppError, UpstreamError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { personasFixture } from "@/lib/research/fixtures";
import type { AudienceSegment } from "@/lib/research/standard-models";
import type { Campaign, CampaignInsert, CampaignUpdate, Database, Json } from "@/types/database";

import {
  budgetPlanSchema,
  briefSchema,
  coerceStatus,
  personaSnapshotSchema,
  platformConfigSchema,
  type PersonaSnapshot,
} from "./brief";

/**
 * Campaign persistence. Uses Supabase (RLS-scoped to the signed-in user) when
 * configured, and degrades to a process-wide in-memory store - seeded with a rich
 * demo campaign - so the module fully works with zero credentials (demo-safe),
 * mirroring the research engine's store strategy.
 *
 * Reads are resilient (return empty/null on failure); writes throw typed
 * `AppError`s so server actions can surface a real error to the user. The service
 * layer (`campaign.service.ts`) is a thin pass-through over `getCampaignStore()`.
 *
 * SERVER ONLY. The Supabase client is imported lazily inside `getCampaignStore`
 * so this module (and its tests) never pull `next/headers` at import time.
 */

export interface CampaignStore {
  list(): Promise<Campaign[]>;
  get(id: string): Promise<Campaign | null>;
  create(input: CampaignInsert): Promise<Campaign>;
  update(id: string, patch: CampaignUpdate): Promise<Campaign>;
  setStatus(id: string, status: string): Promise<Campaign>;
  remove(id: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `camp_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

function notFound(id: string): AppError {
  return new AppError(`Campaign not found: ${id}`, { code: "UNKNOWN", service: "platform", status: 404 });
}

function dbError(action: string, cause: unknown): AppError {
  return new UpstreamError(`Failed to ${action}`, { service: "supabase", cause, context: { action } });
}

/* -------------------------------------------------------------------------- */
/* Demo seed (credential-free + tests)                                        */
/* -------------------------------------------------------------------------- */

import {
  DEMO_CAMPAIGN_ID,
  DEMO_CAMPAIGN_NAME,
  DEMO_RESEARCH_PROJECT_ID,
  DEMO_USER_ID,
} from "@/lib/seed/constants";

export { DEMO_CAMPAIGN_ID };

function fixtureToSnapshot(segment: AudienceSegment, index: number): PersonaSnapshot {
  return personaSnapshotSchema.parse({
    id: `${DEMO_RESEARCH_PROJECT_ID}:${index}`,
    name: segment.name,
    summary: segment.psychographics.painPoints[0] ?? "",
    ageRange: segment.demographics.ageRange,
    incomeBracket: segment.demographics.incomeBracket,
    location: segment.demographics.location,
    painPoints: segment.psychographics.painPoints,
    platforms: segment.behaviors.platforms,
    sizeRange: segment.sizeEstimate.range,
    source: "research",
    researchProjectId: DEMO_RESEARCH_PROJECT_ID,
  });
}

function buildDemoCampaign(): Campaign {
  const now = "2026-06-22T12:00:00.000Z";
  const personas = personasFixture.map((segment, index) => fixtureToSnapshot(segment, index));

  const brief = briefSchema.parse({
    objective: "leads",
    product: "A plain-English retirement income newsletter for near-retirees",
    offer: "Free 2026 Inflation-Proof Income Blueprint",
    audience: "US near-retirees aged 55-67 worried inflation will erode their savings",
    valueProps: [
      "No jargon, no relentless upsells - just a plan you can trust",
      "Income ideas designed to keep pace with inflation",
      "Built specifically for people approaching retirement",
    ],
    tone: "trustworthy, plain-English, reassuring",
    notes: "Lead with trust and inflation-protection; avoid the greed/curiosity hooks competitors overuse.",
    personas,
    researchProjectId: DEMO_RESEARCH_PROJECT_ID,
    source: "seeded",
  });

  const platformConfig = platformConfigSchema.parse({
    platforms: ["meta", "taboola", "google"],
    recommendations: [
      { platform: "meta", fit: 88, rationale: "Detailed targeting reaches 55+ with long-form lead-gen creative." },
      { platform: "taboola", fit: 80, rationale: "Native advertorials convert this audience on finance publishers." },
      { platform: "google", fit: 76, rationale: "Captures high-intent retirement-income and inflation search demand." },
      { platform: "youtube", fit: 60, rationale: "Explainer pre-roll builds trust; secondary, higher-CPA channel." },
      { platform: "tiktok", fit: 28, rationale: "Demographic mismatch for near-retirees." },
    ],
    source: "seeded",
    generatedAt: now,
  });

  const budget = budgetPlanSchema.parse({
    total: 6000,
    currency: "USD",
    allocations: [
      { platform: "meta", percent: 45, rationale: "Primary lead-gen workhorse." },
      { platform: "taboola", percent: 30, rationale: "Native scale on finance sites." },
      { platform: "google", percent: 25, rationale: "High-intent capture." },
    ],
    source: "seeded",
    generatedAt: now,
  });

  return {
    id: DEMO_CAMPAIGN_ID,
    user_id: DEMO_USER_ID,
    name: DEMO_CAMPAIGN_NAME,
    status: "active",
    brief: toJson(brief),
    platform_config: toJson(platformConfig),
    budget: toJson(budget),
    persona_ids: toJson(personas.map((persona) => persona.id)),
    created_at: now,
    updated_at: now,
  };
}

/* -------------------------------------------------------------------------- */
/* In-memory store                                                            */
/* -------------------------------------------------------------------------- */

export class InMemoryCampaignStore implements CampaignStore {
  private readonly campaigns = new Map<string, Campaign>();
  private seeded = false;

  /** @param seedDemo seed the demo campaign on first access (default true). */
  constructor(private readonly seedDemo = true) {}

  private ensureSeed(): void {
    if (this.seeded) return;
    this.seeded = true;
    if (this.seedDemo) {
      const demo = buildDemoCampaign();
      this.campaigns.set(demo.id, demo);
    }
  }

  async list(): Promise<Campaign[]> {
    this.ensureSeed();
    return [...this.campaigns.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async get(id: string): Promise<Campaign | null> {
    this.ensureSeed();
    return this.campaigns.get(id) ?? null;
  }

  async create(input: CampaignInsert): Promise<Campaign> {
    this.ensureSeed();
    const now = new Date().toISOString();
    const row: Campaign = {
      id: input.id ?? randomId(),
      user_id: DEMO_USER_ID,
      name: input.name,
      status: input.status ?? "draft",
      brief: input.brief ?? {},
      platform_config: input.platform_config ?? {},
      budget: input.budget ?? {},
      persona_ids: input.persona_ids ?? [],
      created_at: input.created_at ?? now,
      updated_at: input.updated_at ?? now,
    };
    this.campaigns.set(row.id, row);
    return row;
  }

  async update(id: string, patch: CampaignUpdate): Promise<Campaign> {
    this.ensureSeed();
    const existing = this.campaigns.get(id);
    if (!existing) throw notFound(id);
    const next: Campaign = {
      ...existing,
      ...patch,
      id: existing.id,
      user_id: existing.user_id,
      updated_at: new Date().toISOString(),
    };
    this.campaigns.set(id, next);
    return next;
  }

  async setStatus(id: string, status: string): Promise<Campaign> {
    return this.update(id, { status });
  }

  async remove(id: string): Promise<void> {
    this.ensureSeed();
    this.campaigns.delete(id);
  }
}

/** Process-wide singleton so created campaigns persist across requests in dev/demo. */
const memoryStore = new InMemoryCampaignStore();

/* -------------------------------------------------------------------------- */
/* Supabase store (RLS-scoped)                                                */
/* -------------------------------------------------------------------------- */

export class SupabaseCampaignStore implements CampaignStore {
  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async list(): Promise<Campaign[]> {
    try {
      const { data, error } = await this.db.from("campaigns").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    } catch (error) {
      logger.error("campaign.store list failed", error);
      return [];
    }
  }

  async get(id: string): Promise<Campaign | null> {
    try {
      const { data, error } = await this.db.from("campaigns").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ?? null;
    } catch (error) {
      logger.error("campaign.store get failed", error, { id });
      return null;
    }
  }

  async create(input: CampaignInsert): Promise<Campaign> {
    // `user_id` is authoritative from the session (RLS) - never trust the caller's.
    const { data, error } = await this.db
      .from("campaigns")
      .insert({
        name: input.name,
        status: input.status ?? "draft",
        brief: input.brief ?? {},
        platform_config: input.platform_config ?? {},
        budget: input.budget ?? {},
        persona_ids: input.persona_ids ?? [],
        user_id: this.userId,
      })
      .select()
      .single();
    if (error || !data) throw dbError("create campaign", error);
    return data;
  }

  async update(id: string, patch: CampaignUpdate): Promise<Campaign> {
    // Never let a caller reassign ownership or the primary key via a patch.
    const safe: CampaignUpdate = { ...patch };
    delete safe.user_id;
    delete safe.id;
    const { data, error } = await this.db
      .from("campaigns")
      .update({ ...safe, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw dbError("update campaign", error);
    return data;
  }

  async setStatus(id: string, status: string): Promise<Campaign> {
    return this.update(id, { status });
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from("campaigns").delete().eq("id", id);
    if (error) throw dbError("delete campaign", error);
  }
}

/* -------------------------------------------------------------------------- */
/* Store resolution                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Resolves the best available store: Supabase (RLS) when configured and a user is
 * signed in, otherwise the in-memory demo store. Never throws - always returns a
 * usable store so the UI renders with or without credentials.
 */
export async function getCampaignStore(): Promise<CampaignStore> {
  if (!isSupabaseConfigured()) return memoryStore;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return memoryStore;
    return new SupabaseCampaignStore(supabase, user.id);
  } catch (error) {
    logger.warn("Falling back to in-memory campaign store", { error: String(error) });
    return memoryStore;
  }
}

/** Exposed for the status coercion the service uses when normalizing input. */
export { coerceStatus };
