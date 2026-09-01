-- MediaOS storage buckets
--
-- Path convention: every object is stored under a per-user folder, i.e.
--   {auth.uid()}/<campaign-or-project>/<filename>
-- so RLS can authorize writes by checking the first path segment.
--
-- - creative-images: PUBLIC read (ad visuals are shown on public landing pages
--   and galleries), owner-only write.
-- - research-assets: PRIVATE (owner-only read/write).

insert into storage.buckets (id, name, public)
values ('creative-images', 'creative-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('research-assets', 'research-assets', false)
on conflict (id) do nothing;

/* -------------------------------------------------------------------------- */
/* creative-images: public read, owner-scoped write                           */
/* -------------------------------------------------------------------------- */

drop policy if exists "creative_images_public_read" on storage.objects;
create policy "creative_images_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'creative-images');

drop policy if exists "creative_images_owner_insert" on storage.objects;
create policy "creative_images_owner_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'creative-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "creative_images_owner_update" on storage.objects;
create policy "creative_images_owner_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'creative-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'creative-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "creative_images_owner_delete" on storage.objects;
create policy "creative_images_owner_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'creative-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

/* -------------------------------------------------------------------------- */
/* research-assets: owner-only read + write                                    */
/* -------------------------------------------------------------------------- */

drop policy if exists "research_assets_owner_select" on storage.objects;
create policy "research_assets_owner_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'research-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "research_assets_owner_insert" on storage.objects;
create policy "research_assets_owner_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'research-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "research_assets_owner_update" on storage.objects;
create policy "research_assets_owner_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'research-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'research-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "research_assets_owner_delete" on storage.objects;
create policy "research_assets_owner_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'research-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
