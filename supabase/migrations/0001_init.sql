-- MediaOS initial schema
-- Postgres / Supabase. All tables: uuid PK, user_id (RLS scoped to auth.uid()),
-- timestamps, FKs + indexes on every FK and analytics date column, RLS enabled.
--
-- Child tables denormalize `user_id` so owner RLS is a simple, fast
-- `auth.uid() = user_id`. The two public-write tables (page_views, leads) keep
-- user_id too, but their INSERT is additionally constrained by a join to a
-- DEPLOYED landing page so anonymous visitors can only write rows that attach to
-- a real, published page owned by the page's owner.

create extension if not exists pgcrypto;

-- Touch updated_at on UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* ========================================================================== */
/* Campaigns (hub - referenced by many tables)                                */
/* ========================================================================== */

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  brief jsonb not null default '{}'::jsonb,
  platform_config jsonb not null default '{}'::jsonb,
  budget jsonb not null default '{}'::jsonb,
  persona_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_user_id_idx on public.campaigns (user_id);
create index campaigns_status_idx on public.campaigns (status);
create trigger campaigns_set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

/* ========================================================================== */
/* Agent                                                                      */
/* ========================================================================== */

create table public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  title text not null default 'New conversation',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agent_conversations_user_id_idx on public.agent_conversations (user_id);
create index agent_conversations_campaign_id_idx on public.agent_conversations (campaign_id);
create trigger agent_conversations_set_updated_at before update on public.agent_conversations
  for each row execute function public.set_updated_at();

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  content text not null default '',
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz not null default now()
);
create index agent_messages_conversation_id_idx on public.agent_messages (conversation_id);
create index agent_messages_user_id_idx on public.agent_messages (user_id);
create index agent_messages_created_at_idx on public.agent_messages (created_at);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  goal text not null,
  plan jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  artifacts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agent_runs_conversation_id_idx on public.agent_runs (conversation_id);
create index agent_runs_user_id_idx on public.agent_runs (user_id);
create trigger agent_runs_set_updated_at before update on public.agent_runs
  for each row execute function public.set_updated_at();

/* ========================================================================== */
/* Research (USP)                                                             */
/* ========================================================================== */

create table public.research_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  name text not null,
  query text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index research_projects_user_id_idx on public.research_projects (user_id);
create index research_projects_campaign_id_idx on public.research_projects (campaign_id);
create trigger research_projects_set_updated_at before update on public.research_projects
  for each row execute function public.set_updated_at();

create table public.audience_personas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  demographics jsonb not null default '{}'::jsonb,
  psychographics jsonb not null default '{}'::jsonb,
  behaviors jsonb not null default '{}'::jsonb,
  pain_points jsonb not null default '[]'::jsonb,
  buying_triggers jsonb not null default '[]'::jsonb,
  size_estimate jsonb not null default '{}'::jsonb,
  confidence numeric,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audience_personas_project_id_idx on public.audience_personas (project_id);
create index audience_personas_user_id_idx on public.audience_personas (user_id);
create trigger audience_personas_set_updated_at before update on public.audience_personas
  for each row execute function public.set_updated_at();

create table public.competitor_ads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  advertiser text,
  creative_type text,
  copy text,
  hooks jsonb not null default '[]'::jsonb,
  estimated_spend text,
  date_range text,
  image_url text,
  created_at timestamptz not null default now()
);
create index competitor_ads_project_id_idx on public.competitor_ads (project_id);
create index competitor_ads_user_id_idx on public.competitor_ads (user_id);

create table public.trend_signals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  velocity numeric,
  volume numeric,
  sentiment numeric,
  source text,
  time_series jsonb not null default '[]'::jsonb,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index trend_signals_project_id_idx on public.trend_signals (project_id);
create index trend_signals_user_id_idx on public.trend_signals (user_id);
create index trend_signals_detected_at_idx on public.trend_signals (detected_at);

create table public.community_insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_url text,
  platform text,
  content text not null,
  pain_point_extracted text,
  sentiment numeric,
  upvotes integer,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);
create index community_insights_project_id_idx on public.community_insights (project_id);
create index community_insights_user_id_idx on public.community_insights (user_id);

create table public.research_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  url text,
  title text,
  fetched_at timestamptz not null default now(),
  raw_data jsonb not null default '{}'::jsonb,
  confidence numeric,
  created_at timestamptz not null default now()
);
create index research_sources_project_id_idx on public.research_sources (project_id);
create index research_sources_user_id_idx on public.research_sources (user_id);

/* ========================================================================== */
/* Creative                                                                   */
/* ========================================================================== */

create table public.brand_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sample_ads jsonb not null default '[]'::jsonb,
  tone_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brand_voices_user_id_idx on public.brand_voices (user_id);
create trigger brand_voices_set_updated_at before update on public.brand_voices
  for each row execute function public.set_updated_at();

create table public.creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  hook_type text,
  hook_confidence numeric,
  score numeric,
  is_favorite boolean not null default false,
  rating integer,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index creatives_campaign_id_idx on public.creatives (campaign_id);
create index creatives_user_id_idx on public.creatives (user_id);
create trigger creatives_set_updated_at before update on public.creatives
  for each row execute function public.set_updated_at();

create table public.creative_images (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid not null references public.creatives (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  aspect_ratio text,
  platform text,
  prompt_used text,
  created_at timestamptz not null default now()
);
create index creative_images_creative_id_idx on public.creative_images (creative_id);
create index creative_images_user_id_idx on public.creative_images (user_id);

/* ========================================================================== */
/* Landing pages                                                              */
/* ========================================================================== */

create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  template_type text not null,
  sections jsonb not null default '[]'::jsonb,
  html_content text,
  status text not null default 'draft',
  deployed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index landing_pages_campaign_id_idx on public.landing_pages (campaign_id);
create index landing_pages_user_id_idx on public.landing_pages (user_id);
create index landing_pages_status_idx on public.landing_pages (status);
create trigger landing_pages_set_updated_at before update on public.landing_pages
  for each row execute function public.set_updated_at();

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  visitor_id text,
  utm jsonb not null default '{}'::jsonb,
  referrer text,
  created_at timestamptz not null default now()
);
create index page_views_landing_page_id_idx on public.page_views (landing_page_id);
create index page_views_user_id_idx on public.page_views (user_id);
create index page_views_created_at_idx on public.page_views (created_at);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  name text,
  utm jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index leads_landing_page_id_idx on public.leads (landing_page_id);
create index leads_user_id_idx on public.leads (user_id);
create index leads_created_at_idx on public.leads (created_at);

/* ========================================================================== */
/* Analytics                                                                  */
/* ========================================================================== */

create table public.performance_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  creative_id uuid references public.creatives (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  date date not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  spend numeric not null default 0,
  revenue numeric not null default 0,
  cpa numeric,
  ctr numeric,
  cvr numeric,
  roas numeric,
  created_at timestamptz not null default now()
);
create index performance_metrics_campaign_id_idx on public.performance_metrics (campaign_id);
create index performance_metrics_creative_id_idx on public.performance_metrics (creative_id);
create index performance_metrics_user_id_idx on public.performance_metrics (user_id);
create index performance_metrics_date_idx on public.performance_metrics (date);
create index performance_metrics_campaign_date_idx on public.performance_metrics (campaign_id, date);

create table public.anomalies (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  metric text not null,
  severity text not null default 'medium',
  description text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index anomalies_campaign_id_idx on public.anomalies (campaign_id);
create index anomalies_user_id_idx on public.anomalies (user_id);
create index anomalies_detected_at_idx on public.anomalies (detected_at);

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  content text not null,
  confidence numeric,
  actioned boolean not null default false,
  created_at timestamptz not null default now()
);
create index ai_insights_campaign_id_idx on public.ai_insights (campaign_id);
create index ai_insights_user_id_idx on public.ai_insights (user_id);

/* ========================================================================== */
/* Row Level Security                                                          */
/* ========================================================================== */

alter table public.campaigns enable row level security;
alter table public.agent_conversations enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_runs enable row level security;
alter table public.research_projects enable row level security;
alter table public.audience_personas enable row level security;
alter table public.competitor_ads enable row level security;
alter table public.trend_signals enable row level security;
alter table public.community_insights enable row level security;
alter table public.research_sources enable row level security;
alter table public.brand_voices enable row level security;
alter table public.creatives enable row level security;
alter table public.creative_images enable row level security;
alter table public.landing_pages enable row level security;
alter table public.page_views enable row level security;
alter table public.leads enable row level security;
alter table public.performance_metrics enable row level security;
alter table public.anomalies enable row level security;
alter table public.ai_insights enable row level security;

-- Owner-scoped full access (select/insert/update/delete) for authenticated users.
create policy campaigns_owner_all on public.campaigns for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy agent_conversations_owner_all on public.agent_conversations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy agent_messages_owner_all on public.agent_messages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy agent_runs_owner_all on public.agent_runs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy research_projects_owner_all on public.research_projects for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy audience_personas_owner_all on public.audience_personas for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy competitor_ads_owner_all on public.competitor_ads for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy trend_signals_owner_all on public.trend_signals for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy community_insights_owner_all on public.community_insights for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy research_sources_owner_all on public.research_sources for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy brand_voices_owner_all on public.brand_voices for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy creatives_owner_all on public.creatives for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy creative_images_owner_all on public.creative_images for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy performance_metrics_owner_all on public.performance_metrics for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy anomalies_owner_all on public.anomalies for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ai_insights_owner_all on public.ai_insights for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Landing pages: owner full access + public read of DEPLOYED pages (for /lp/[slug]).
create policy landing_pages_owner_all on public.landing_pages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy landing_pages_public_read on public.landing_pages for select to anon, authenticated
  using (status = 'deployed');

-- Page views: owner reads/manages; anyone may INSERT a view that attaches to a
-- deployed page owned by the recorded user_id.
create policy page_views_owner_all on public.page_views for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy page_views_public_insert on public.page_views for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.landing_pages lp
      where lp.id = landing_page_id
        and lp.status = 'deployed'
        and lp.user_id = page_views.user_id
    )
  );

-- Leads: owner reads/manages; anyone may INSERT a lead that attaches to a
-- deployed page owned by the recorded user_id.
create policy leads_owner_all on public.leads for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy leads_public_insert on public.leads for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.landing_pages lp
      where lp.id = landing_page_id
        and lp.status = 'deployed'
        and lp.user_id = leads.user_id
    )
  );
