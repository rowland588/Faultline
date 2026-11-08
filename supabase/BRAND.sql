-- BRAND.sql — the consultant's brand on every paper (8 November, docs/STORY.md S1).
--
-- Why: Faultline is Rowland's consultant's tool (Streamline Synergy) and the papers go to his clients. Every paper's foot and every
-- cover says who prepared it — his name, his business, a strapline, a contact line, his logo — once, kept on his profile so his phone
-- and his laptop agree (the device keeps a copy, lib/brand, so a paper made offline carries it too).
--
-- How: one jsonb column on profiles; written only through set_my_brand(), security definer, which touches the brand of the caller's
-- own row and nothing else — profiles has a read policy only (FRESH_START.sql), and that stays so.
--
-- Run ONCE. Safe to re-run.

alter table public.profiles add column if not exists brand jsonb;

create or replace function public.set_my_brand(b jsonb) returns void
language sql security definer set search_path = public as $$
  update public.profiles set brand = b where id = auth.uid();
$$;
revoke all on function public.set_my_brand(jsonb) from public, anon;
grant execute on function public.set_my_brand(jsonb) to authenticated;

-- What it did
select (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'brand') as brand_column,
       (select count(*) from pg_proc where proname = 'set_my_brand') as fn;
