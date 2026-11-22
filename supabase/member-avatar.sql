-- Let linked friends see each other's fruit picture. Run once in the Supabase SQL Editor.
-- Only the picture's name (e.g. 'strawberry') is stored, next to the username and display name
-- that linked people can already see. Nothing else from your profile is shared.
alter table public.members add column if not exists avatar text
  check (avatar is null or avatar ~ '^[a-z0-9-]{1,30}$');
