-- =============================================================================
-- CHI website dashboard — Supabase setup
--
-- Run this ONCE: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; every step checks before it creates anything.
-- =============================================================================

-- 1. The table that holds the whole website content as a single JSON row. ----
create table if not exists public.site_content (
  id         integer primary key,
  content    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Exactly one row, with id = 1. The dashboard always reads and writes this row.
insert into public.site_content (id, content)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- 2. Row level security. ------------------------------------------------------
-- This is what actually protects the site. The anon key shipped in the page is
-- public, so anyone can read — which is fine, it is website copy. Writing is
-- restricted to a signed-in user, which means knowing the dashboard password.
alter table public.site_content enable row level security;

drop policy if exists "site content is publicly readable" on public.site_content;
create policy "site content is publicly readable"
  on public.site_content
  for select
  to anon, authenticated
  using (true);

drop policy if exists "only signed-in users can edit site content" on public.site_content;
create policy "only signed-in users can edit site content"
  on public.site_content
  for update
  to authenticated
  using (true)
  with check (true);

-- 3. Image storage. -----------------------------------------------------------
-- A public bucket: images need to be readable by visitors, uploadable only by
-- the signed-in admin.
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

drop policy if exists "site images are publicly readable" on storage.objects;
create policy "site images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'site-images');

drop policy if exists "only signed-in users can upload site images" on storage.objects;
create policy "only signed-in users can upload site images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'site-images');

drop policy if exists "only signed-in users can replace site images" on storage.objects;
create policy "only signed-in users can replace site images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'site-images');

drop policy if exists "only signed-in users can delete site images" on storage.objects;
create policy "only signed-in users can delete site images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'site-images');

-- =============================================================================
-- Done. Two things are still done by hand in the Supabase dashboard:
--
--   Authentication -> Users -> "Add user"
--       email:    the address in assets/cms-config.js
--       password: the dashboard password you want
--       tick "Auto Confirm User"
--
--   Authentication -> Sign In / Providers
--       turn OFF "Allow new users to sign up", so yours stays the only account
-- =============================================================================
