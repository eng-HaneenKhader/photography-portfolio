-- 1) Create a Supabase project, then run this entire file in SQL Editor.
-- 2) Replace YOUR_ADMIN_EMAIL with the email address you will use to sign in.
-- 3) Create your admin account in Supabase Authentication > Users first.
-- 4) The email in the JWT must exactly match YOUR_ADMIN_EMAIL.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 100),
  caption text default '' check (char_length(caption) <= 1200),
  category text not null default 'Photography',
  location text default '',
  media jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;

drop policy if exists "Public can read posts" on public.posts;
create policy "Public can read posts"
on public.posts for select
to anon, authenticated
using (true);

drop policy if exists "Admin can insert posts" on public.posts;
create policy "Admin can insert posts"
on public.posts for insert
to authenticated
with check (
  (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL'
  and user_id = auth.uid()
);

drop policy if exists "Admin can update posts" on public.posts;
create policy "Admin can update posts"
on public.posts for update
to authenticated
using ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL' and user_id = auth.uid())
with check ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL' and user_id = auth.uid());

drop policy if exists "Admin can delete posts" on public.posts;
create policy "Admin can delete posts"
on public.posts for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL' and user_id = auth.uid());

-- Public media bucket. Public means visitors can view media; only the admin can upload/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view portfolio media" on storage.objects;
create policy "Public can view portfolio media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'portfolio-media');

drop policy if exists "Admin can upload portfolio media" on storage.objects;
create policy "Admin can upload portfolio media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'portfolio-media'
  and (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admin can update portfolio media" on storage.objects;
create policy "Admin can update portfolio media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'portfolio-media'
  and (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'portfolio-media'
  and (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admin can delete portfolio media" on storage.objects;
create policy "Admin can delete portfolio media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'portfolio-media'
  and (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL'
  and (storage.foldername(name))[1] = auth.uid()::text
);
