import { getCampaignStore } from "@/lib/campaign/store";
import type { Campaign, CampaignInsert, CampaignUpdate } from "@/types/database";

/**
 * Campaign CRUD + lifecycle. Implemented (campaigns phase) against the typed
 * Supabase server client; reads/writes are RLS-scoped to the current user.
 *
 * Thin application service over `getCampaignStore()`, which resolves the best
 * available backend per request (Supabase RLS when configured + signed in,
 * otherwise an in-memory demo store). Reads degrade gracefully; writes throw
 * typed `AppError`s so callers can surface failures.
 */
export interface CampaignService {
  list(): Promise<Campaign[]>;
  get(id: string): Promise<Campaign | null>;
  create(input: CampaignInsert): Promise<Campaign>;
  update(id: string, patch: CampaignUpdate): Promise<Campaign>;
  setStatus(id: string, status: string): Promise<Campaign>;
  remove(id: string): Promise<void>;
}

export const campaignService: CampaignService = {
  async list() {
    const store = await getCampaignStore();
    return store.list();
  },
  async get(id) {
    const store = await getCampaignStore();
    return store.get(id);
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
