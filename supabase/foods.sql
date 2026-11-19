-- BestiePT's own food database: foods people scan, type in or correct are kept here,
-- so the next person gets them straight away without another lookup or AI call.
-- Run once in Supabase → SQL Editor.

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null,                 -- lower-case name used for matching
  barcode text unique,
  lang text,
  per jsonb not null,                     -- per 100 g: kcal, protein, carbs, fat, fibre, sugar
  portion numeric not null default 100,   -- usual portion in grams
  source text not null check (source in ('barcode', 'user', 'ai')),
  uses integer not null default 1,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists foods_name_key on public.foods (name_key);
create index if not exists foods_name_trgm on public.foods using gin (name_key extensions.gin_trgm_ops);

alter table public.foods enable row level security;
drop policy if exists "signed-in people can read foods" on public.foods;
create policy "signed-in people can read foods" on public.foods for select to authenticated using (true);
-- Writes only go through remember_food below, which checks the numbers.

-- Add a food, or count another use of one we already have. Better sources replace worse ones
-- (a barcode label beats a person's correction, which beats an AI estimate).
create or replace function public.remember_food(p_name text, p_barcode text, p_lang text, p_per jsonb, p_portion numeric, p_source text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  k text := lower(btrim(regexp_replace(p_name, '\s+', ' ', 'g')));
  rank_new int := case p_source when 'barcode' then 3 when 'user' then 2 else 1 end;
  found public.foods;
  added_today int;
  kcal numeric := coalesce((p_per->>'kcal')::numeric, -1);
begin
  if me is null then raise exception 'signed_out'; end if;
  if p_source not in ('barcode', 'user', 'ai') or k = '' or length(k) > 120 then raise exception 'bad_food'; end if;
  if kcal < 0 or kcal > 950
     or coalesce((p_per->>'protein')::numeric, 0) not between 0 and 100
     or coalesce((p_per->>'carbs')::numeric, 0) not between 0 and 100
     or coalesce((p_per->>'fat')::numeric, 0) not between 0 and 100 then raise exception 'bad_food'; end if;

  if p_barcode is not null and p_barcode <> '' then
    select * into found from public.foods where barcode = p_barcode;
  else
    select * into found from public.foods where name_key = k and barcode is null order by uses desc limit 1;
  end if;

  if found.id is not null then
    update public.foods set
      uses = uses + 1,
      per = case when rank_new > (case found.source when 'barcode' then 3 when 'user' then 2 else 1 end) then p_per else per end,
      source = case when rank_new > (case found.source when 'barcode' then 3 when 'user' then 2 else 1 end) then p_source else source end,
      updated_at = now()
    where id = found.id;
    return found.id;
  end if;

  select count(*) into added_today from public.foods where created_by = me and created_at > now() - interval '1 day';
  if added_today >= 300 then return null; end if;

  insert into public.foods (name, name_key, barcode, lang, per, portion, source)
  values (btrim(p_name), k, nullif(p_barcode, ''), p_lang, p_per, coalesce(nullif(p_portion, 0), 100), p_source)
  returning id into found.id;
  return found.id;
end $$;
grant execute on function public.remember_food(text, text, text, jsonb, numeric, text) to authenticated;
