-- BestiePT: reminders (web push). Paste into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.
-- Before running: replace PASTE_CRON_SECRET at the bottom with the secret Claude gave you (the same one you add as CRON_SECRET).

-- Where to send each phone's reminders (one row per phone), with its time zone and language.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  keys jsonb not null,
  tz text not null default 'Europe/London',
  lang text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "my push subscriptions" on public.push_subscriptions;
create policy "my push subscriptions" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- What we've sent, so nobody gets the same reminder twice in a day or more than two a day.
create table if not exists public.push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);
alter table public.push_log enable row level security; -- only the sender (service role) reads and writes it

-- Every half hour, ask the send-reminders function to send whatever is due.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('send-reminders') where exists (select 1 from cron.job where jobname = 'send-reminders');
select cron.schedule('send-reminders', '0,30 * * * *', $$
  select net.http_post(
    url := 'https://nxixvwvdbhbsijmhtjyw.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'PASTE_CRON_SECRET'),
    body := '{}'::jsonb
  )
$$);
