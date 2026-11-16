-- BestiePT database setup, step 2: family sharing
-- Run AFTER schema.sql. Paste into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once.
--
-- How sharing works
--  * Two people "link" (by username, or one gives the other a 6-character code).
--  * Linked people can see and edit each other's recipes.
--  * Each person chooses, per linked person, whether to share their meal plan,
--    their shopping list and their macros (all macros or none).
--  * Weight is never shared. Profiles (which hold weight, height, age) are never shared.

-- People's public name tags --------------------------------------------------
create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  username text unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name text not null default '' check (length(display_name) <= 40),
  updated_at timestamptz not null default now()
);

-- Links between two people ---------------------------------------------------
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references auth.users (id) on delete cascade default auth.uid(),
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists links_pair_idx on public.links (least(requester, addressee), greatest(requester, addressee));

-- What each person shares with each linked person ----------------------------
create table if not exists public.shares (
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  viewer uuid not null references auth.users (id) on delete cascade,
  plan boolean not null default false,
  list boolean not null default false,
  macros boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner, viewer)
);

-- Short-lived codes for linking in person -----------------------------------
create table if not exists public.pair_codes (
  code text primary key,
  owner uuid not null references auth.users (id) on delete cascade default auth.uid(),
  expires_at timestamptz not null default now() + interval '1 day'
);

-- Helpers (run with the database's rights, so policies can use them) ----------
create or replace function public.is_linked(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.links l
    where l.status = 'accepted'
      and ((l.requester = (select auth.uid()) and l.addressee = other)
        or (l.addressee = (select auth.uid()) and l.requester = other))
  )
$$;

create or replace function public.is_linked_folder(folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select folder ~ '^[0-9a-f-]{36}$' and public.is_linked(folder::uuid)
$$;

create or replace function public.shared_with_me(owner_id uuid, what text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_linked(owner_id) and exists (
    select 1 from public.shares s
    where s.owner = owner_id and s.viewer = (select auth.uid())
      and case what when 'plan' then s.plan when 'list' then s.list when 'macros' then s.macros else false end
  )
$$;

-- Row level security ----------------------------------------------------------
alter table public.members enable row level security;
alter table public.links enable row level security;
alter table public.shares enable row level security;
alter table public.pair_codes enable row level security;

drop policy if exists "own member" on public.members;
create policy "own member" on public.members for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "see people I'm linked or linking with" on public.members;
create policy "see people I'm linked or linking with" on public.members for select to authenticated
  using (exists (select 1 from public.links l where
    (l.requester = (select auth.uid()) and l.addressee = members.id) or (l.addressee = (select auth.uid()) and l.requester = members.id)));

drop policy if exists "see my links" on public.links;
create policy "see my links" on public.links for select to authenticated
  using ((select auth.uid()) in (requester, addressee));
drop policy if exists "remove my links" on public.links;
create policy "remove my links" on public.links for delete to authenticated
  using ((select auth.uid()) in (requester, addressee));
-- Creating and accepting links goes through the functions below.

drop policy if exists "manage what I share" on public.shares;
create policy "manage what I share" on public.shares for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()) and public.is_linked(viewer));
drop policy if exists "see what is shared with me" on public.shares;
create policy "see what is shared with me" on public.shares for select to authenticated
  using (viewer = (select auth.uid()));

drop policy if exists "own codes" on public.pair_codes;
create policy "own codes" on public.pair_codes for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

-- Recipes: linked people can see and edit each other's.
drop policy if exists "own recipes" on public.recipes;
drop policy if exists "own and linked recipes" on public.recipes;
create policy "own and linked recipes" on public.recipes for all to authenticated
  using (user_id = (select auth.uid()) or public.is_linked(user_id))
  with check (user_id = (select auth.uid()) or public.is_linked(user_id));

-- Meal plans: readable when the owner shares their plan or their shopping list.
drop policy if exists "shared plan items" on public.plan_items;
create policy "shared plan items" on public.plan_items for select to authenticated
  using (public.shared_with_me(user_id, 'plan') or public.shared_with_me(user_id, 'list'));

-- Food log: readable when the owner shares macros.
drop policy if exists "shared log entries" on public.log_entries;
create policy "shared log entries" on public.log_entries for select to authenticated
  using (public.shared_with_me(user_id, 'macros'));

-- Photos: linked people can see each other's (recipe photos live there).
drop policy if exists "linked photos read" on storage.objects;
create policy "linked photos read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_linked_folder((storage.foldername(name))[1]));

-- Functions the app calls ------------------------------------------------------

-- Daily targets of someone who shares macros with me (never weight or body details).
create or replace function public.shared_targets(owner_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select p.data -> 'targets' from public.profiles p
  where p.id = owner_id and public.shared_with_me(owner_id, 'macros')
$$;

-- Ask to link with someone by their exact username.
create or replace function public.request_link(target_username text) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); them uuid; existing public.links;
begin
  if me is null then return 'signed_out'; end if;
  select id into them from public.members where username = lower(trim(target_username));
  if them is null then return 'not_found'; end if;
  if them = me then return 'self'; end if;
  select * into existing from public.links
    where least(requester, addressee) = least(me, them) and greatest(requester, addressee) = greatest(me, them);
  if existing.id is not null then
    if existing.status = 'accepted' then return 'already_linked'; end if;
    if existing.addressee = me then -- they already asked me: that's a yes
      update public.links set status = 'accepted' where id = existing.id;
      return 'linked';
    end if;
    return 'already_requested';
  end if;
  insert into public.links (requester, addressee) values (me, them);
  return 'requested';
end $$;

-- Accept a request someone sent me.
create or replace function public.accept_link(link_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.links set status = 'accepted'
  where id = link_id and addressee = auth.uid() and status = 'pending';
  return found;
end $$;

-- Make a fresh 6-character code (valid for a day) that someone can type to link with me.
create or replace function public.create_pair_code() returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); c text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if me is null then raise exception 'signed out'; end if;
  delete from public.pair_codes where owner = me or expires_at < now();
  loop
    c := '';
    for i in 1..6 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    begin
      insert into public.pair_codes (code, owner) values (c, me);
      return c;
    exception when unique_violation then -- try another
    end;
  end loop;
end $$;

-- Type someone's code to link straight away (the code shows they agreed).
create or replace function public.redeem_pair_code(pair_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); them uuid;
begin
  if me is null then return 'signed_out'; end if;
  select owner into them from public.pair_codes where code = upper(trim(pair_code)) and expires_at > now();
  if them is null then return 'invalid'; end if;
  if them = me then return 'self'; end if;
  insert into public.links (requester, addressee, status) values (them, me, 'accepted')
  on conflict ((least(requester, addressee)), (greatest(requester, addressee))) do update set status = 'accepted';
  delete from public.pair_codes where code = upper(trim(pair_code));
  return 'linked';
end $$;

-- When two people unlink, stop sharing in both directions.
create or replace function public.links_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.shares where (owner = old.requester and viewer = old.addressee) or (owner = old.addressee and viewer = old.requester);
  return old;
end $$;
drop trigger if exists links_cleanup on public.links;
create trigger links_cleanup after delete on public.links for each row execute function public.links_cleanup();

revoke all on function public.request_link(text), public.accept_link(uuid), public.create_pair_code(), public.redeem_pair_code(text), public.shared_targets(uuid) from public, anon;
grant execute on function public.request_link(text), public.accept_link(uuid), public.create_pair_code(), public.redeem_pair_code(text), public.shared_targets(uuid) to authenticated;
