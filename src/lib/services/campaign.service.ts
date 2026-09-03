import { getCampaignStore, type CampaignStore } from "@/lib/campaign/store";
import { DEMO_CAMPAIGN_ID, DEMO_TRACK01_CAMPAIGN_ID } from "@/lib/seed/constants";
import type { Campaign, CampaignInsert, CampaignUpdate } from "@/types/database";

/**
 * Campaign CRUD + lifecycle. Implemented (campaigns phase) against the typed
 * Supabase server client; reads/writes are RLS-scoped to the current user.
 *
 * Thin application service over `getCampaignStore()`, which resolves the best
 * available backend per request (Supabase RLS when configured + signed in,
 * otherwise an in-memory demo store). Reads degrade gracefully; writes throw
 * typed `AppError`s so callers can surface failures.
 *
 * For demo campaign IDs, reads fall through to the seeded in-memory store when
 * the primary (Supabase) store returns null/empty — same pattern as the
 * analytics and landing services.
 */
export interface CampaignService {
  list(): Promise<Campaign[]>;
  get(id: string): Promise<Campaign | null>;
  create(input: CampaignInsert): Promise<Campaign>;
  update(id: string, patch: CampaignUpdate): Promise<Campaign>;
  setStatus(id: string, status: string): Promise<Campaign>;
  remove(id: string): Promise<void>;
}

const DEMO_CAMPAIGN_IDS = new Set([DEMO_CAMPAIGN_ID, DEMO_TRACK01_CAMPAIGN_ID]);

/** Lazily resolved reference to the seeded in-memory store for fallthrough reads. */
let _memoryStore: CampaignStore | null = null;
async function getMemoryFallback(): Promise<CampaignStore> {
  if (!_memoryStore) {
    const { InMemoryCampaignStore } = await import("@/lib/campaign/store");
    _memoryStore = new InMemoryCampaignStore();
  }
  return _memoryStore;
}

export const campaignService: CampaignService = {
  async list() {
    const store = await getCampaignStore();
    const rows = await store.list();
    if (rows.length === 0) {
      const fallback = await getMemoryFallback();
      if (fallback !== store) {
        const seeded = await fallback.list();
        if (seeded.length > 0) return seeded;
      }
    }
    return rows;
  },
  async get(id) {
    const store = await getCampaignStore();
    const row = await store.get(id);
    if (!row && DEMO_CAMPAIGN_IDS.has(id)) {
      const fallback = await getMemoryFallback();
      if (fallback !== store) return fallback.get(id);
    }
    return row;
  },
  async create(input) {
    const store = await getCampaignStore();
    return store.create(input);
  },
  async update(id, patch) {
    const store = await getCampaignStore();
    return store.update(id, patch);
  },
  async setStatus(id, status) {
    const store = await getCampaignStore();
    return store.setStatus(id, status);
  },
  async remove(id) {
    const store = await getCampaignStore();
    await store.remove(id);
  },
};
