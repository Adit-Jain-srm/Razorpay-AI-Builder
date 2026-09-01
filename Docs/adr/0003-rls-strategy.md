# ADR 0003: Row-Level Security Strategy

- **Status:** Accepted
- **Date:** 2026-06-28
- **Deciders:** Foundation build

## Context

MediaOS is multi-tenant: every user's campaigns, research, creatives, and analytics must be isolated.
At the same time, **deployed landing pages are public** (`/lp/[slug]`) and must accept **anonymous**
lead submissions and page-view pings - without exposing any authed data or letting anonymous writers
forge rows against pages they don't own. We want authorization enforced by the database, not just the
app, so a bug in a server action cannot leak data.

Full DDL: `supabase/migrations/0001_init.sql` (tables + RLS) and `supabase/migrations/0002_storage.sql`
(buckets).

## Decision

**RLS is enabled on all 19 tables.** Policies follow three patterns.

### 1. Owner-scoped full access (the default, 16 tables)

Every table denormalizes `user_id` so the policy is a single fast predicate:

```sql
create policy <t>_owner_all on public.<t> for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Child tables (e.g. `audience_personas`, `creatives`, `performance_metrics`) carry `user_id` directly
rather than joining up to the parent. This keeps the hot path index-friendly
(`<t>_user_id_idx` on every table) and the policy trivial to reason about.

### 2. Public read of deployed landing pages

`landing_pages` keeps the owner policy **and** adds a public-read policy so `/lp/[slug]` renders for
anonymous visitors - but only for published pages:

```sql
create policy landing_pages_public_read on public.landing_pages
  for select to anon, authenticated using (status = 'deployed');
```

Draft/archived pages remain owner-only.

### 3. Anonymous insert constrained by a deployed-page join

`page_views` and `leads` must accept writes from logged-out visitors, but a visitor must not be able
to insert a row attributed to an arbitrary user or against a non-public page. The `with check`
constraint verifies the target page is **deployed** and that the recorded `user_id` is the page's
real owner:

```sql
create policy leads_public_insert on public.leads for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.landing_pages lp
      where lp.id = landing_page_id
        and lp.status = 'deployed'
        and lp.user_id = leads.user_id
    )
  );
```

Reads/updates/deletes of `leads` and `page_views` stay owner-only. The app captures these writes
server-side (after Zod validation - see `leadCaptureSchema` / `pageViewSchema`), resolving the
owning `user_id` from the deployed page so the row satisfies the policy.

### Storage (`0002_storage.sql`)

Objects are stored under a per-user folder: `{auth.uid()}/<scope>/<filename>`. Policies authorize by
the first path segment:

- **`creative-images`** bucket: **public read** (ad visuals appear on public pages/galleries),
  owner-only insert/update/delete (`(storage.foldername(name))[1] = auth.uid()::text`).
- **`research-assets`** bucket: **private** - owner-only read and write.

## Consequences

- **Positive:** Tenant isolation is enforced in Postgres, independent of app correctness. The public
  funnel works without a service-role bypass on the read path. Denormalized `user_id` keeps policies
  O(1) and indexed.
- **Negative:** `user_id` is duplicated onto child rows, so writers must always set it correctly;
  the public-insert path depends on the join staying in sync with the deployed status. Mitigation:
  all writes go through validated service functions; the lead-capture write path is covered by tests
  in later phases. The service-role client (which **bypasses** RLS) is reserved for trusted
  server-side operations (seeders, validated public capture, cron) and is never shipped to the
  browser.
