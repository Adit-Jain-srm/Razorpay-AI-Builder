import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { UpstreamError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { buildSeededLandingPages, DEMO_CAMPAIGN_ID, DEMO_LANDING_USER_ID } from "@/lib/landing/fixtures";
import { renderDocumentToHtml } from "@/lib/landing/html";
import { parseLandingDocument } from "@/lib/landing/types";
import type {
  Database,
  Json,
  LandingPage,
  LandingPageInsert,
  LandingPageUpdate,
  Lead,
  LeadInsert,
  PageView,
  PageViewInsert,
} from "@/types/database";

/**
 * Landing page lifecycle + public capture.
 *
 * Uses Supabase (RLS-scoped to the signed-in user) when configured, and degrades
 * to a SEEDED in-memory store so the Landing Page Engine is fully demoable with
 * zero credentials (seeded with a deployed A/B experiment for the
 * finance-newsletter vertical).
 *
 * Public path (`getBySlug`, `captureLead`, `recordView`) serves the anonymous
 * `/lp/[slug]` route. It validates against a DEPLOYED page and writes leads /
 * page-views with `user_id` resolved to the PAGE OWNER - which the RLS
 * anonymous-insert policy requires (and the service-role admin client bypasses).
 * The public path is isolated from authenticated data.
 *
 * SERVER ONLY: imports the Supabase server clients. Never import from a Client
 * Component - resolve data server-side and pass plain objects down.
 */

const DEPLOYED = "deployed";

function randomId(prefix = "lp"): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

/** Per-page conversion counters. */
export interface LandingStats {
  views: number;
  leads: number;
}

/**
 * The per-request store. Extends the public `LandingService` with owner-only
 * reads the studio needs (deployed siblings for A/B, conversion counts).
 */
export interface LandingStore {
  readonly userId: string;
  listByCampaign(campaignId: string): Promise<LandingPage[]>;
  listDeployedByCampaign(campaignId: string): Promise<LandingPage[]>;
  get(id: string): Promise<LandingPage | null>;
  getBySlug(slug: string): Promise<LandingPage | null>;
  slugExists(slug: string): Promise<boolean>;
  create(input: LandingPageInsert): Promise<LandingPage>;
  update(id: string, patch: LandingPageUpdate): Promise<LandingPage>;
  deploy(id: string): Promise<LandingPage>;
  remove(id: string): Promise<void>;
  captureLead(input: LeadInsert): Promise<Lead>;
  recordView(input: PageViewInsert): Promise<PageView>;
  getStats(pageId: string): Promise<LandingStats>;
}

export interface LandingService {
  listByCampaign(campaignId: string): Promise<LandingPage[]>;
  get(id: string): Promise<LandingPage | null>;
  /** Public: fetch a deployed page by slug for rendering. */
  getBySlug(slug: string): Promise<LandingPage | null>;
  create(input: LandingPageInsert): Promise<LandingPage>;
  update(id: string, patch: LandingPageUpdate): Promise<LandingPage>;
  deploy(id: string): Promise<LandingPage>;
  remove(id: string): Promise<void>;
  /** Public: capture a lead submitted from a deployed page. */
  captureLead(input: LeadInsert): Promise<Lead>;
  /** Public: record a page view for analytics. */
  recordView(input: PageViewInsert): Promise<PageView>;
}

/** Builds the deployed-page HTML snapshot, tolerating an unparseable document. */
function snapshotHtml(page: Pick<LandingPage, "id" | "slug" | "sections">): string | null {
  const doc = parseLandingDocument(page.sections);
  if (!doc) return null;
  return renderDocumentToHtml(doc, { pageId: page.id, slug: page.slug });
}

/* -------------------------------------------------------------------------- */
/* In-memory store (seeded, credential-free demo + tests)                     */
/* -------------------------------------------------------------------------- */

class InMemoryLandingStore implements LandingStore {
  readonly userId = DEMO_LANDING_USER_ID;
  private readonly pages = new Map<string, LandingPage>();
  private readonly leads: Lead[] = [];
  private readonly views: PageView[] = [];
  /** Seeded base counts so demo conversion stats look realistic. */
  private readonly seededStats = new Map<string, LandingStats>();
  private seeded = false;

  private ensureSeed(): void {
    if (this.seeded) return;
    this.seeded = true;
    for (const seed of buildSeededLandingPages()) {
      this.pages.set(seed.id, {
        id: seed.id,
        campaign_id: DEMO_CAMPAIGN_ID,
        user_id: this.userId,
        slug: seed.slug,
        template_type: seed.document.template,
        sections: toJson(seed.document),
        html_content: snapshotHtml({ id: seed.id, slug: seed.slug, sections: toJson(seed.document) }),
        status: seed.status,
        deployed_at: seed.deployedAt,
        created_at: seed.createdAt,
        updated_at: seed.createdAt,
      });
      this.seededStats.set(seed.id, { views: seed.views, leads: seed.leads });
    }
  }

  async listByCampaign(campaignId: string): Promise<LandingPage[]> {
    this.ensureSeed();
    return [...this.pages.values()]
      .filter((p) => p.campaign_id === campaignId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listDeployedByCampaign(campaignId: string): Promise<LandingPage[]> {
    this.ensureSeed();
    return [...this.pages.values()].filter((p) => p.campaign_id === campaignId && p.status === DEPLOYED);
  }

  async get(id: string): Promise<LandingPage | null> {
    this.ensureSeed();
    return this.pages.get(id) ?? null;
  }

  async getBySlug(slug: string): Promise<LandingPage | null> {
    this.ensureSeed();
    return [...this.pages.values()].find((p) => p.slug === slug && p.status === DEPLOYED) ?? null;
  }

  async slugExists(slug: string): Promise<boolean> {
    this.ensureSeed();
    return [...this.pages.values()].some((p) => p.slug === slug);
  }

  async create(input: LandingPageInsert): Promise<LandingPage> {
    this.ensureSeed();
    const now = new Date().toISOString();
    const row: LandingPage = {
      id: input.id ?? randomId(),
      campaign_id: input.campaign_id,
      user_id: this.userId,
      slug: input.slug,
      template_type: input.template_type,
      sections: input.sections ?? [],
      html_content: input.html_content ?? null,
      status: input.status ?? "draft",
      deployed_at: input.deployed_at ?? null,
      created_at: input.created_at ?? now,
      updated_at: input.updated_at ?? now,
    };
    this.pages.set(row.id, row);
    return row;
  }

  private mutate(id: string, patch: Partial<LandingPage>): LandingPage {
    const existing = this.pages.get(id);
    if (!existing) throw new UpstreamError("Landing page not found", { service: "supabase", status: 404 });
    const next = { ...existing, ...patch, updated_at: new Date().toISOString() };
    this.pages.set(id, next);
    return next;
  }

  async update(id: string, patch: LandingPageUpdate): Promise<LandingPage> {
    this.ensureSeed();
    return this.mutate(id, patch);
  }

  async deploy(id: string): Promise<LandingPage> {
    this.ensureSeed();
    const existing = this.pages.get(id);
    if (!existing) throw new UpstreamError("Landing page not found", { service: "supabase", status: 404 });
    return this.mutate(id, {
      status: DEPLOYED,
      deployed_at: existing.deployed_at ?? new Date().toISOString(),
      html_content: snapshotHtml(existing),
    });
  }

  async remove(id: string): Promise<void> {
    this.pages.delete(id);
  }

  async captureLead(input: LeadInsert): Promise<Lead> {
    this.ensureSeed();
    const page = await this.requireDeployedPage(input.landing_page_id);
    const now = new Date().toISOString();
    const row: Lead = {
      id: input.id ?? randomId("lead"),
      landing_page_id: page.id,
      user_id: page.user_id,
      email: input.email,
      name: input.name ?? null,
      utm: input.utm ?? {},
      ip_address: input.ip_address ?? null,
      created_at: input.created_at ?? now,
    };
    this.leads.push(row);
    return row;
  }

  async recordView(input: PageViewInsert): Promise<PageView> {
    this.ensureSeed();
    const page = await this.requireDeployedPage(input.landing_page_id);
    const now = new Date().toISOString();
    const row: PageView = {
      id: input.id ?? randomId("view"),
      landing_page_id: page.id,
      user_id: page.user_id,
      visitor_id: input.visitor_id ?? null,
      utm: input.utm ?? {},
      referrer: input.referrer ?? null,
      created_at: input.created_at ?? now,
    };
    this.views.push(row);
    return row;
  }

  async getStats(pageId: string): Promise<LandingStats> {
    this.ensureSeed();
    const base = this.seededStats.get(pageId) ?? { views: 0, leads: 0 };
    return {
      views: base.views + this.views.filter((v) => v.landing_page_id === pageId).length,
      leads: base.leads + this.leads.filter((l) => l.landing_page_id === pageId).length,
    };
  }

  private async requireDeployedPage(pageId: string): Promise<LandingPage> {
    const page = this.pages.get(pageId);
    if (!page || page.status !== DEPLOYED) {
      throw new ValidationError("Lead capture requires a deployed landing page", { service: "platform", status: 404 });
    }
    return page;
  }
}

/** Process-wide singleton so demo pages + captured leads persist across requests. */
const memoryStore = new InMemoryLandingStore();

/* -------------------------------------------------------------------------- */
/* Supabase store (owner RLS + public capture)                                */
/* -------------------------------------------------------------------------- */

type StoreMode = "owner" | "public-anon" | "public-admin";

class SupabaseLandingStore implements LandingStore {
  constructor(
    private readonly db: SupabaseClient<Database>,
    readonly userId: string,
    private readonly mode: StoreMode,
  ) {}

  async listByCampaign(campaignId: string): Promise<LandingPage[]> {
    const { data, error } = await this.db
      .from("landing_pages")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    if (error) {
      logger.warn("landingStore.listByCampaign failed", { error: error.message });
      return [];
    }
    return data ?? [];
  }

  async listDeployedByCampaign(campaignId: string): Promise<LandingPage[]> {
    const { data, error } = await this.db
      .from("landing_pages")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", DEPLOYED);
    if (error) {
      logger.warn("landingStore.listDeployedByCampaign failed", { error: error.message });
      return [];
    }
    return data ?? [];
  }

  async get(id: string): Promise<LandingPage | null> {
    const { data, error } = await this.db.from("landing_pages").select("*").eq("id", id).maybeSingle();
    if (error) {
      logger.warn("landingStore.get failed", { error: error.message });
      return null;
    }
    return data ?? null;
  }

  async getBySlug(slug: string): Promise<LandingPage | null> {
    const { data, error } = await this.db
      .from("landing_pages")
      .select("*")
      .eq("slug", slug)
      .eq("status", DEPLOYED)
      .maybeSingle();
    if (error) {
      logger.warn("landingStore.getBySlug failed", { error: error.message });
      return null;
    }
    return data ?? null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const { data, error } = await this.db.from("landing_pages").select("id").eq("slug", slug).maybeSingle();
    if (error) {
      logger.warn("landingStore.slugExists failed", { error: error.message });
      return false;
    }
    return Boolean(data);
  }

  async create(input: LandingPageInsert): Promise<LandingPage> {
    const { data, error } = await this.db
      .from("landing_pages")
      .insert({ ...input, user_id: this.userId })
      .select()
      .single();
    if (error || !data) throw error ?? new UpstreamError("Failed to create landing page", { service: "supabase" });
    return data;
  }

  private async patch(id: string, patch: LandingPageUpdate): Promise<LandingPage> {
    const { data, error } = await this.db
      .from("landing_pages")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw error ?? new UpstreamError("Failed to update landing page", { service: "supabase" });
    return data;
  }

  async update(id: string, patch: LandingPageUpdate): Promise<LandingPage> {
    return this.patch(id, patch);
  }

  async deploy(id: string): Promise<LandingPage> {
    const existing = await this.get(id);
    if (!existing) throw new UpstreamError("Landing page not found", { service: "supabase", status: 404 });
    return this.patch(id, {
      status: DEPLOYED,
      deployed_at: existing.deployed_at ?? new Date().toISOString(),
      html_content: snapshotHtml(existing),
    });
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from("landing_pages").delete().eq("id", id);
    if (error) throw error;
  }

  /** Reads a deployed page directly (works for anon/admin public clients too). */
  private async requireDeployedPage(pageId: string): Promise<LandingPage> {
    const { data, error } = await this.db
      .from("landing_pages")
      .select("*")
      .eq("id", pageId)
      .eq("status", DEPLOYED)
      .maybeSingle();
    if (error || !data) {
      throw new ValidationError("Lead capture requires a deployed landing page", { service: "platform", status: 404 });
    }
    return data;
  }

  async captureLead(input: LeadInsert): Promise<Lead> {
    // Resolve the owner from the deployed page so the row satisfies the RLS
    // anonymous-insert policy (user_id must equal the page owner's id).
    const page = await this.requireDeployedPage(input.landing_page_id);
    const { data, error } = await this.db
      .from("leads")
      .insert({
        landing_page_id: page.id,
        user_id: page.user_id,
        email: input.email,
        name: input.name ?? null,
        utm: input.utm ?? {},
        ip_address: input.ip_address ?? null,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new UpstreamError("Failed to capture lead", { service: "supabase" });
    return data;
  }

  async recordView(input: PageViewInsert): Promise<PageView> {
    const page = await this.requireDeployedPage(input.landing_page_id);
    const { data, error } = await this.db
      .from("page_views")
      .insert({
        landing_page_id: page.id,
        user_id: page.user_id,
        visitor_id: input.visitor_id ?? null,
        utm: input.utm ?? {},
        referrer: input.referrer ?? null,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new UpstreamError("Failed to record page view", { service: "supabase" });
    return data;
  }

  async getStats(pageId: string): Promise<LandingStats> {
    const [views, leads] = await Promise.all([
      this.db.from("page_views").select("id", { count: "exact", head: true }).eq("landing_page_id", pageId),
      this.db.from("leads").select("id", { count: "exact", head: true }).eq("landing_page_id", pageId),
    ]);
    return { views: views.count ?? 0, leads: leads.count ?? 0 };
  }
}

/* -------------------------------------------------------------------------- */
/* Store resolution                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Owner store: Supabase (RLS) when configured + signed in, else the seeded
 * in-memory store. Used by the dashboard editor. Never throws.
 */
export async function getLandingStore(): Promise<LandingStore> {
  if (!isSupabaseConfigured()) return memoryStore;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return memoryStore;
    return new SupabaseLandingStore(supabase, user.id, "owner");
  } catch (error) {
    logger.warn("Falling back to in-memory landing store (owner)", { error: String(error) });
    return memoryStore;
  }
}

/**
 * Public store for the anonymous `/lp/[slug]` route + capture endpoints. Prefers
 * the service-role admin client (bypasses RLS), then the anon client (relies on
 * the public read + anonymous-insert policies), else the in-memory store.
 */
export async function getPublicLandingStore(): Promise<LandingStore> {
  if (isSupabaseAdminConfigured()) {
    try {
      return new SupabaseLandingStore(createAdminClient(), "", "public-admin");
    } catch (error) {
      logger.warn("Admin client unavailable for public landing store", { error: String(error) });
    }
  }
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      return new SupabaseLandingStore(supabase, "", "public-anon");
    } catch (error) {
      logger.warn("Falling back to in-memory landing store (public)", { error: String(error) });
    }
  }
  return memoryStore;
}

/* -------------------------------------------------------------------------- */
/* Public service                                                             */
/* -------------------------------------------------------------------------- */

export const landingService: LandingService = {
  async listByCampaign(campaignId) {
    return (await getLandingStore()).listByCampaign(campaignId);
  },
  async get(id) {
    return (await getLandingStore()).get(id);
  },
  async getBySlug(slug) {
    return (await getPublicLandingStore()).getBySlug(slug);
  },
  async create(input) {
    return (await getLandingStore()).create(input);
  },
  async update(id, patch) {
    return (await getLandingStore()).update(id, patch);
  },
  async deploy(id) {
    return (await getLandingStore()).deploy(id);
  },
  async remove(id) {
    return (await getLandingStore()).remove(id);
  },
  async captureLead(input) {
    return (await getPublicLandingStore()).captureLead(input);
  },
  async recordView(input) {
    return (await getPublicLandingStore()).recordView(input);
  },
};

/** Exposed for tests + the studio orchestration layer. */
export { InMemoryLandingStore, SupabaseLandingStore };
