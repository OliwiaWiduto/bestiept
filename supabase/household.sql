-- Plan and shop together: two linked people share one meal plan and one shopping list.
-- Run once in the Supabase SQL Editor (after family.sql and family-recipes.sql).

-- Either person can turn it on or off for their link.
alter table public.links add column if not exists household boolean not null default false;

-- True when I'm in a household with this person.
create or replace function public.is_household(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.links l
    where l.status = 'accepted' and l.household
      and ((l.requester = (select auth.uid()) and l.addressee = other)
        or (l.addressee = (select auth.uid()) and l.requester = other))
  )
$$;

-- True when this link is mine and set to plan and shop together.
create or replace function public.in_household_link(lid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.links l
    where l.id = lid and l.status = 'accepted' and l.household
      and (l.requester = (select auth.uid()) or l.addressee = (select auth.uid()))
  )
$$;

create or replace function public.set_household(link_id uuid, turn_on boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.links set household = turn_on
  where id = link_id and status = 'accepted'
    and (requester = (select auth.uid()) or addressee = (select auth.uid()));
  return found;
end $$;
revoke all on function public.set_household(uuid, boolean) from public, anon;
grant execute on function public.set_household(uuid, boolean) to authenticated;

-- Household members can see, add, move and remove each other's planned meals.
drop policy if exists "household plan items" on public.plan_items;
create policy "household plan items" on public.plan_items for all to authenticated
  using (public.is_household(user_id))
  with check (public.is_household(user_id));

-- ...and always see each other's recipes, since their plan uses them.
create or replace function public.recipes_shared_with_me(owner_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_household(owner_id) or (public.is_linked(owner_id) and not exists (
    select 1 from public.shares s
    where s.owner = owner_id and s.viewer = (select auth.uid()) and s.recipes = false
  ))
$$;

-- One shopping list per household (ticks, things added by hand, pantry staples).
create table if not exists public.household_lists (
  link_id uuid primary key references public.links(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.household_lists enable row level security;
drop policy if exists "my household list" on public.household_lists;
create policy "my household list" on public.household_lists for all to authenticated
  using (public.in_household_link(link_id))
  with check (public.in_household_link(link_id));
