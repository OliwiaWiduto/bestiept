-- Lets each person choose whether linked people can see their recipes (on by default).
-- Run once in Supabase → SQL Editor, after family.sql.

alter table public.shares add column if not exists recipes boolean not null default true;

-- True unless the owner has turned recipe sharing off for me.
create or replace function public.recipes_shared_with_me(owner_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_linked(owner_id) and not exists (
    select 1 from public.shares s
    where s.owner = owner_id and s.viewer = (select auth.uid()) and s.recipes = false
  )
$$;

drop policy if exists "own and linked recipes" on public.recipes;
create policy "own and linked recipes" on public.recipes for all to authenticated
  using (user_id = (select auth.uid()) or public.recipes_shared_with_me(user_id))
  with check (user_id = (select auth.uid()) or public.recipes_shared_with_me(user_id));
