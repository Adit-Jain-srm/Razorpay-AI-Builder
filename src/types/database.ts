/**
 * Hand-authored database types for the MediaOS Supabase schema
 * (see `supabase/migrations/0001_init.sql`). This is the single source of truth
 * the typed Supabase clients use, and the contract every feature team builds on.
 *
 * Conventions:
 * - `jsonb` columns are typed as `Json`. Domain teams cast to the richer shapes
 *   in `@/lib/research/standard-models`, `@/lib/agent/types`, etc.
 * - Timestamps (`timestamptz`) and `date` columns are ISO strings.
 * - `Insert` makes columns with DB defaults or NULLability optional.
 * - `Update` is `Partial<Row>` (any column may be patched).
 *
 * Row/Insert/Update shapes are declared as `type` aliases (not `interface`s) on
 * purpose: supabase-js's `GenericTable` constraint requires each shape to extend
 * `Record<string, unknown>`. TypeScript gives object-literal type aliases and
 * mapped types an implicit index signature but withholds it from interfaces
 * (which stay open to declaration merging). Using `interface` here makes the
 * whole `public` schema fail `GenericSchema`, so `SupabaseClient<Database>`
 * resolves every table to `never`. Keep these as `type` aliases.
 *
 * Keep this file in lockstep with the SQL migrations.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/* -------------------------------------------------------------------------- */
/* Agent                                                                      */
/* -------------------------------------------------------------------------- */

export type AgentConversationRow = {
  id: string;
  user_id: string;
  campaign_id: string | null;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};
export type AgentConversationInsert = {
  id?: string;
  user_id: string;
  campaign_id?: string | null;
  title?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};
export type AgentConversationUpdate = Partial<AgentConversationRow>;

export type AgentMessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  content: string;
  tool_calls: Json | null;
  tool_results: Json | null;
  created_at: string;
};
export type AgentMessageInsert = {
  id?: string;
  conversation_id: string;
  user_id: string;
  role: string;
  content?: string;
  tool_calls?: Json | null;
  tool_results?: Json | null;
  created_at?: string;
};
export type AgentMessageUpdate = Partial<AgentMessageRow>;

export type AgentRunRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  goal: string;
  plan: Json;
  status: string;
  artifacts: Json;
  created_at: string;
  updated_at: string;
};
export type AgentRunInsert = {
  id?: string;
  conversation_id: string;
  user_id: string;
  goal: string;
  plan?: Json;
  status?: string;
  artifacts?: Json;
  created_at?: string;
  updated_at?: string;
};
export type AgentRunUpdate = Partial<AgentRunRow>;

/* -------------------------------------------------------------------------- */
/* Research (USP)                                                             */
/* -------------------------------------------------------------------------- */

export type ResearchProjectRow = {
  id: string;
  user_id: string;
  campaign_id: string | null;
  name: string;
  query: string;
  status: string;
  created_at: string;
  updated_at: string;
};
export type ResearchProjectInsert = {
  id?: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  query: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};
export type ResearchProjectUpdate = Partial<ResearchProjectRow>;

export type AudiencePersonaRow = {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  demographics: Json;
  psychographics: Json;
  behaviors: Json;
  pain_points: Json;
  buying_triggers: Json;
  size_estimate: Json;
  confidence: number | null;
  sources: Json;
  created_at: string;
  updated_at: string;
};
export type AudiencePersonaInsert = {
  id?: string;
  project_id: string;
  user_id: string;
  name: string;
  demographics?: Json;
  psychographics?: Json;
  behaviors?: Json;
  pain_points?: Json;
  buying_triggers?: Json;
  size_estimate?: Json;
  confidence?: number | null;
  sources?: Json;
  created_at?: string;
  updated_at?: string;
};
export type AudiencePersonaUpdate = Partial<AudiencePersonaRow>;

export type CompetitorAdRow = {
  id: string;
  project_id: string;
  user_id: string;
  platform: string;
  advertiser: string | null;
  creative_type: string | null;
  copy: string | null;
  hooks: Json;
  estimated_spend: string | null;
  date_range: string | null;
  image_url: string | null;
  created_at: string;
};
export type CompetitorAdInsert = {
  id?: string;
  project_id: string;
  user_id: string;
  platform: string;
  advertiser?: string | null;
  creative_type?: string | null;
  copy?: string | null;
  hooks?: Json;
  estimated_spend?: string | null;
  date_range?: string | null;
  image_url?: string | null;
  created_at?: string;
};
export type CompetitorAdUpdate = Partial<CompetitorAdRow>;

export type TrendSignalRow = {
  id: string;
  project_id: string;
  user_id: string;
  topic: string;
  velocity: number | null;
  volume: number | null;
  sentiment: number | null;
  source: string | null;
  time_series: Json;
  detected_at: string;
  created_at: string;
};
export type TrendSignalInsert = {
  id?: string;
  project_id: string;
  user_id: string;
  topic: string;
  velocity?: number | null;
  volume?: number | null;
  sentiment?: number | null;
  source?: string | null;
  time_series?: Json;
  detected_at?: string;
  created_at?: string;
};
export type TrendSignalUpdate = Partial<TrendSignalRow>;

export type CommunityInsightRow = {
  id: string;
  project_id: string;
  user_id: string;
  source_url: string | null;
  platform: string | null;
  content: string;
  pain_point_extracted: string | null;
  sentiment: number | null;
  upvotes: number | null;
  posted_at: string | null;
  created_at: string;
};
export type CommunityInsightInsert = {
  id?: string;
  project_id: string;
  user_id: string;
  source_url?: string | null;
  platform?: string | null;
  content: string;
  pain_point_extracted?: string | null;
  sentiment?: number | null;
  upvotes?: number | null;
  posted_at?: string | null;
  created_at?: string;
};
export type CommunityInsightUpdate = Partial<CommunityInsightRow>;

export type ResearchSourceRow = {
  id: string;
  project_id: string;
  user_id: string;
  provider: string;
  url: string | null;
  title: string | null;
  fetched_at: string;
  raw_data: Json;
  confidence: number | null;
  created_at: string;
};
export type ResearchSourceInsert = {
  id?: string;
  project_id: string;
  user_id: string;
  provider: string;
  url?: string | null;
  title?: string | null;
  fetched_at?: string;
  raw_data?: Json;
  confidence?: number | null;
  created_at?: string;
};
export type ResearchSourceUpdate = Partial<ResearchSourceRow>;

/* -------------------------------------------------------------------------- */
/* Campaigns + creative                                                       */
/* -------------------------------------------------------------------------- */

export type CampaignRow = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  brief: Json;
  platform_config: Json;
  budget: Json;
  persona_ids: Json;
  created_at: string;
  updated_at: string;
};
export type CampaignInsert = {
  id?: string;
  user_id: string;
  name: string;
  status?: string;
  brief?: Json;
  platform_config?: Json;
  budget?: Json;
  persona_ids?: Json;
  created_at?: string;
  updated_at?: string;
};
export type CampaignUpdate = Partial<CampaignRow>;

export type CreativeRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  platform: string;
  type: string;
  content: Json;
  hook_type: string | null;
  hook_confidence: number | null;
  score: number | null;
  is_favorite: boolean;
  rating: number | null;
  version: number;
  created_at: string;
  updated_at: string;
};
export type CreativeInsert = {
  id?: string;
  campaign_id: string;
  user_id: string;
  platform: string;
  type: string;
  content?: Json;
  hook_type?: string | null;
  hook_confidence?: number | null;
  score?: number | null;
  is_favorite?: boolean;
  rating?: number | null;
  version?: number;
  created_at?: string;
  updated_at?: string;
};
export type CreativeUpdate = Partial<CreativeRow>;

export type CreativeImageRow = {
  id: string;
  creative_id: string;
  user_id: string;
  storage_path: string;
  aspect_ratio: string | null;
  platform: string | null;
  prompt_used: string | null;
  created_at: string;
};
export type CreativeImageInsert = {
  id?: string;
  creative_id: string;
  user_id: string;
  storage_path: string;
  aspect_ratio?: string | null;
  platform?: string | null;
  prompt_used?: string | null;
  created_at?: string;
};
export type CreativeImageUpdate = Partial<CreativeImageRow>;

export type BrandVoiceRow = {
  id: string;
  user_id: string;
  name: string;
  sample_ads: Json;
  tone_profile: Json;
  created_at: string;
  updated_at: string;
};
export type BrandVoiceInsert = {
  id?: string;
  user_id: string;
  name: string;
  sample_ads?: Json;
  tone_profile?: Json;
  created_at?: string;
  updated_at?: string;
};
export type BrandVoiceUpdate = Partial<BrandVoiceRow>;

/* -------------------------------------------------------------------------- */
/* Landing pages                                                              */
/* -------------------------------------------------------------------------- */

export type LandingPageRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  slug: string;
  template_type: string;
  sections: Json;
  html_content: string | null;
  status: string;
  deployed_at: string | null;
  created_at: string;
  updated_at: string;
};
export type LandingPageInsert = {
  id?: string;
  campaign_id: string;
  user_id: string;
  slug: string;
  template_type: string;
  sections?: Json;
  html_content?: string | null;
  status?: string;
  deployed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
export type LandingPageUpdate = Partial<LandingPageRow>;

export type PageViewRow = {
  id: string;
  landing_page_id: string;
  user_id: string;
  visitor_id: string | null;
  utm: Json;
  referrer: string | null;
  created_at: string;
};
export type PageViewInsert = {
  id?: string;
  landing_page_id: string;
  user_id: string;
  visitor_id?: string | null;
  utm?: Json;
  referrer?: string | null;
  created_at?: string;
};
export type PageViewUpdate = Partial<PageViewRow>;

export type LeadRow = {
  id: string;
  landing_page_id: string;
  user_id: string;
  email: string;
  name: string | null;
  utm: Json;
  ip_address: string | null;
  created_at: string;
};
export type LeadInsert = {
  id?: string;
  landing_page_id: string;
  user_id: string;
  email: string;
  name?: string | null;
  utm?: Json;
  ip_address?: string | null;
  created_at?: string;
};
export type LeadUpdate = Partial<LeadRow>;

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

export type PerformanceMetricRow = {
  id: string;
  campaign_id: string;
  creative_id: string | null;
  user_id: string;
  platform: string;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  cpa: number | null;
  ctr: number | null;
  cvr: number | null;
  roas: number | null;
  created_at: string;
};
export type PerformanceMetricInsert = {
  id?: string;
  campaign_id: string;
  creative_id?: string | null;
  user_id: string;
  platform: string;
  date: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: number;
  revenue?: number;
  cpa?: number | null;
  ctr?: number | null;
  cvr?: number | null;
  roas?: number | null;
  created_at?: string;
};
export type PerformanceMetricUpdate = Partial<PerformanceMetricRow>;

export type AnomalyRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  metric: string;
  severity: string;
  description: string | null;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
};
export type AnomalyInsert = {
  id?: string;
  campaign_id: string;
  user_id: string;
  metric: string;
  severity?: string;
  description?: string | null;
  detected_at?: string;
  resolved_at?: string | null;
  created_at?: string;
};
export type AnomalyUpdate = Partial<AnomalyRow>;

export type AiInsightRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  type: string;
  content: string;
  confidence: number | null;
  actioned: boolean;
  created_at: string;
};
export type AiInsightInsert = {
  id?: string;
  campaign_id: string;
  user_id: string;
  type: string;
  content: string;
  confidence?: number | null;
  actioned?: boolean;
  created_at?: string;
};
export type AiInsightUpdate = Partial<AiInsightRow>;

/* -------------------------------------------------------------------------- */
/* Database type consumed by the Supabase clients                             */
/* -------------------------------------------------------------------------- */

export interface Database {
  public: {
    Tables: {
      agent_conversations: { Row: AgentConversationRow; Insert: AgentConversationInsert; Update: AgentConversationUpdate; Relationships: [] };
      agent_messages: { Row: AgentMessageRow; Insert: AgentMessageInsert; Update: AgentMessageUpdate; Relationships: [] };
      agent_runs: { Row: AgentRunRow; Insert: AgentRunInsert; Update: AgentRunUpdate; Relationships: [] };
      research_projects: { Row: ResearchProjectRow; Insert: ResearchProjectInsert; Update: ResearchProjectUpdate; Relationships: [] };
      audience_personas: { Row: AudiencePersonaRow; Insert: AudiencePersonaInsert; Update: AudiencePersonaUpdate; Relationships: [] };
      competitor_ads: { Row: CompetitorAdRow; Insert: CompetitorAdInsert; Update: CompetitorAdUpdate; Relationships: [] };
      trend_signals: { Row: TrendSignalRow; Insert: TrendSignalInsert; Update: TrendSignalUpdate; Relationships: [] };
      community_insights: { Row: CommunityInsightRow; Insert: CommunityInsightInsert; Update: CommunityInsightUpdate; Relationships: [] };
      research_sources: { Row: ResearchSourceRow; Insert: ResearchSourceInsert; Update: ResearchSourceUpdate; Relationships: [] };
      campaigns: { Row: CampaignRow; Insert: CampaignInsert; Update: CampaignUpdate; Relationships: [] };
      creatives: { Row: CreativeRow; Insert: CreativeInsert; Update: CreativeUpdate; Relationships: [] };
      creative_images: { Row: CreativeImageRow; Insert: CreativeImageInsert; Update: CreativeImageUpdate; Relationships: [] };
      brand_voices: { Row: BrandVoiceRow; Insert: BrandVoiceInsert; Update: BrandVoiceUpdate; Relationships: [] };
      landing_pages: { Row: LandingPageRow; Insert: LandingPageInsert; Update: LandingPageUpdate; Relationships: [] };
      page_views: { Row: PageViewRow; Insert: PageViewInsert; Update: PageViewUpdate; Relationships: [] };
      leads: { Row: LeadRow; Insert: LeadInsert; Update: LeadUpdate; Relationships: [] };
      performance_metrics: { Row: PerformanceMetricRow; Insert: PerformanceMetricInsert; Update: PerformanceMetricUpdate; Relationships: [] };
      anomalies: { Row: AnomalyRow; Insert: AnomalyInsert; Update: AnomalyUpdate; Relationships: [] };
      ai_insights: { Row: AiInsightRow; Insert: AiInsightInsert; Update: AiInsightUpdate; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

/* -------------------------------------------------------------------------- */
/* Convenience row aliases                                                    */
/* -------------------------------------------------------------------------- */

export type AgentConversation = AgentConversationRow;
export type AgentMessage = AgentMessageRow;
export type AgentRun = AgentRunRow;
export type ResearchProject = ResearchProjectRow;
export type AudiencePersona = AudiencePersonaRow;
export type CompetitorAdRecord = CompetitorAdRow;
export type TrendSignalRecord = TrendSignalRow;
export type CommunityInsightRecord = CommunityInsightRow;
export type ResearchSource = ResearchSourceRow;
export type Campaign = CampaignRow;
export type Creative = CreativeRow;
export type CreativeImage = CreativeImageRow;
export type BrandVoice = BrandVoiceRow;
export type LandingPage = LandingPageRow;
export type PageView = PageViewRow;
export type Lead = LeadRow;
export type PerformanceMetric = PerformanceMetricRow;
export type Anomaly = AnomalyRow;
export type AiInsight = AiInsightRow;

/** Helper: table names available on the public schema. */
export type TableName = keyof Database["public"]["Tables"];
