-- BestiePT database setup (phase 2, step 1: accounts and sync)
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once.

-- One row per person: profile, targets, settings and shopping list state.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Recipes, logged meals and meal plan items. Each row keeps the app's object in `data`.
create table if not exists public.recipes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.log_entries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.plan_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.weights (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  kg numeric(5, 1) not null check (kg > 20 and kg < 400),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists recipes_user_idx on public.recipes (user_id);
create index if not exists log_entries_user_date_idx on public.log_entries (user_id, date);
create index if not exists plan_items_user_date_idx on public.plan_items (user_id, date);

-- Row level security: everyone can only see and change their own rows.
-- (Family sharing in a later step adds policies for paired accounts.)
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.log_entries enable row level security;
alter table public.plan_items enable row level security;
alter table public.weights enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own recipes" on public.recipes;
create policy "own recipes" on public.recipes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own log entries" on public.log_entries;
create policy "own log entries" on public.log_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own plan items" on public.plan_items;
create policy "own plan items" on public.plan_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own weights" on public.weights;
create policy "own weights" on public.weights for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Photos: a private bucket. Each person's photos live in a folder named after their user id.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;

drop policy if exists "own photos read" on storage.objects;
create policy "own photos read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own photos write" on storage.objects;
create policy "own photos write" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own photos update" on storage.objects;
create policy "own photos update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
