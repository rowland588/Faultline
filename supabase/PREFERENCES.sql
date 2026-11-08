-- PREFERENCES.sql — How I work: what AI Mode's colleague is always told about the person (8 November, docs/AI-MODE.md, Memory).
--
-- Why: Rowland wants the colleague to know how he works without saying it every time — the words he uses ("the line", the CW
-- for the checkweigher), the methods he reaches for, how he likes a report, anything else it should always remember. He types it
-- once (ui/PreferencesSheet, from the account menu and AI Mode's More ▾) or tells the colleague "remember …" and confirms the
-- card (the remember_preference capability). Kept on his profile so his phone and his laptop agree; the device keeps a copy
-- (lib/preferences) so AI Mode sends it offline-first. At most 1,900 characters in the boxes (2,000 with their labels) — the
-- device holds it to that and the gateway cuts anything longer.
--
-- How: one jsonb column on profiles; written only through set_my_preferences(), security definer, which touches the
-- preferences of the caller's own row and nothing else — profiles has a read policy only (FRESH_START.sql), and that stays so.
-- The same shape as BRAND.sql.
--
-- Run ONCE. Safe to re-run.

alter table public.profiles add column if not exists preferences jsonb;

create or replace function public.set_my_preferences(p jsonb) returns void
language sql security definer set search_path = public as $$
  update public.profiles set preferences = p where id = auth.uid();
$$;
revoke all on function public.set_my_preferences(jsonb) from public, anon;
grant execute on function public.set_my_preferences(jsonb) to authenticated;

-- What it did
select (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'preferences') as preferences_column,
       (select count(*) from pg_proc where proname = 'set_my_preferences') as fn,
       (select string_agg(grantee::text, ', ') from information_schema.routine_privileges where routine_name = 'set_my_preferences') as granted_to;
