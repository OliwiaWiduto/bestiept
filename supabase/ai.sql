-- BestiePT database setup, step 3: AI features (recipe import and photo scanning)
-- Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.
-- Keeps a daily count per person so nobody can run up the AI bill.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  kind text not null,
  count int not null default 0,
  primary key (user_id, day, kind)
);
alter table public.ai_usage enable row level security;
drop policy if exists "see my ai usage" on public.ai_usage;
create policy "see my ai usage" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));

-- Counts one use and says whether it's allowed (30 imports and 30 photo scans a day each).
drop function if exists public.use_ai(text);
create or replace function public.use_ai(ai_kind text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if auth.uid() is null or ai_kind not in ('import', 'scan') then return false; end if;
  insert into public.ai_usage (user_id, kind, count) values (auth.uid(), ai_kind, 1)
  on conflict (user_id, day, kind) do update set count = public.ai_usage.count + 1
  returning count into n;
  return n <= 30;
end $$;
revoke all on function public.use_ai(text) from public, anon;
grant execute on function public.use_ai(text) to authenticated;
