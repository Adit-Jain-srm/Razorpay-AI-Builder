-- MediaOS Wave 7: Razorpay money loop (Track 01)
-- Adds products, orders, payments, mandates, audit, and webhook tables.
-- Money columns: bigint paise (never float). RLS: owner-scoped user_id,
-- public order insert via deployed-page join, webhook writes via service role.
-- See ADR 0005 for rationale.

/* ========================================================================== */
/* Products (agent-readable catalog)                                           */
/* ========================================================================== */

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sku text not null,
  title text not null,
  description text not null default '',
  amount_paise bigint not null,
  currency text not null default 'INR',
  image_url text,
  landing_path text,
  availability text not null default 'in_stock',
  upsell_skus jsonb not null default '[]'::jsonb,
  cross_sell_skus jsonb not null default '[]'::jsonb,
  is_eligible_checkout boolean not null default true,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sku)
);
create index if not exists products_user_id_idx on public.products (user_id);
create index if not exists products_status_sort_idx on public.products (status, sort_order);
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

/* ========================================================================== */
/* Mandates (AP2-style bounds on money actions)                                */
/* ========================================================================== */

create table if not exists public.mandates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  action text not null,
  amount_paise bigint not null,
  max_paise bigint not null,
  currency text not null default 'INR',
  expires_at timestamptz not null,
  reason text not null,
  evidence jsonb not null default '[]'::jsonb,
  actor text not null default 'operator',
  decided_by text not null default 'policy',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mandates_user_id_idx on public.mandates (user_id);
create index if not exists mandates_campaign_active_idx on public.mandates (campaign_id, status, expires_at)
  where status = 'active';
create trigger mandates_set_updated_at before update on public.mandates
  for each row execute function public.set_updated_at();

/* ========================================================================== */
/* Orders                                                                      */
/* ========================================================================== */

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  landing_page_id uuid references public.landing_pages (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  razorpay_order_id text unique,
  receipt text,
  amount_paise bigint not null,
  currency text not null default 'INR',
  status text not null default 'created',
  mandate_id uuid references public.mandates (id) on delete set null,
  utm jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_campaign_status_idx on public.orders (user_id, campaign_id, status);
create index if not exists orders_razorpay_id_idx on public.orders (razorpay_order_id) where razorpay_order_id is not null;
create index if not exists orders_created_at_idx on public.orders (created_at);
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

/* ========================================================================== */
/* Order items (line-level detail for upsell/cross-sell)                        */
/* ========================================================================== */

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sku text not null,
  quantity integer not null default 1,
  amount_paise bigint not null,
  role text not null default 'primary',
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_user_id_idx on public.order_items (user_id);

/* ========================================================================== */
/* Payments (Razorpay payment entities)                                        */
/* ========================================================================== */

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  razorpay_payment_id text unique,
  status text not null default 'created',
  method text,
  error_code text,
  error_description text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_razorpay_id_idx on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

/* ========================================================================== */
/* Audit events (append-only ledger of money actions)                          */
/* ========================================================================== */

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor text not null,
  action text not null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  mandate_id uuid references public.mandates (id) on delete set null,
  reason text not null default '',
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  ok boolean not null default true,
  error_code text,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_user_id_idx on public.audit_events (user_id);
create index if not exists audit_events_campaign_timeline_idx on public.audit_events (campaign_id, created_at desc);
create index if not exists audit_events_order_id_idx on public.audit_events (order_id)
  where order_id is not null;

/* ========================================================================== */
/* Webhook receipts (idempotency + signature log)                              */
/* ========================================================================== */

create table if not exists public.webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null unique,
  event_name text not null,
  signature_ok boolean not null default false,
  raw_hash text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists webhook_receipts_user_id_idx on public.webhook_receipts (user_id);
create index if not exists webhook_receipts_event_id_idx on public.webhook_receipts (event_id);

/* ========================================================================== */
/* Row Level Security                                                          */
/* ========================================================================== */

alter table public.products enable row level security;
alter table public.mandates enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.audit_events enable row level security;
alter table public.webhook_receipts enable row level security;

-- Owner-scoped full access (same pattern as 0001_init.sql).
create policy products_owner_all on public.products for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy mandates_owner_all on public.mandates for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy orders_owner_all on public.orders for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy order_items_owner_all on public.order_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy payments_owner_all on public.payments for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy webhook_receipts_owner_all on public.webhook_receipts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Audit events: owner can SELECT only (append-only, no update/delete).
create policy audit_events_owner_select on public.audit_events for select to authenticated
  using (auth.uid() = user_id);
create policy audit_events_owner_insert on public.audit_events for insert to authenticated
  with check (auth.uid() = user_id);

-- Public order insert: anonymous visitors can create orders tied to deployed pages
-- (same pattern as leads/page_views in 0001).
create policy orders_public_insert on public.orders for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.landing_pages lp
      where lp.id = landing_page_id
        and lp.status = 'deployed'
        and lp.user_id = orders.user_id
    )
  );

-- Public product read: anyone can see active products (catalog).
create policy products_public_read on public.products for select to anon, authenticated
  using (status = 'active');

/* ========================================================================== */
/* Updated_at triggers for tables that have them                               */
/* ========================================================================== */
-- (Already created inline above with each table definition.)
