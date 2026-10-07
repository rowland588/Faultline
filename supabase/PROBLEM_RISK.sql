-- ============================================================================
-- FAULTLINE — A PROBLEM THAT IS A RISK, AND WHAT IT COULD COST. Run ONCE.
-- Safe to re-run.
--
-- Rowland, 7 October: "I have critical, and I need like a high risk. Right
-- now, for example, I have 100 hours lost, but it's a possible assumption —
-- it's not reality. I need to flag a metric, and I need to flag a risk of
-- consequence."
--
-- Two more things a problem (test_items, kind 'found') can say, beside
-- critical / impact / ways (CRITICAL_PROBLEMS.sql):
--   risk        flagged HIGH RISK — it has not happened yet; watch it
--   could_lose  the hours it COULD cost: an estimate, never counted as lost
--               (hours_lost stays what it did cost)
-- ============================================================================

alter table public.test_items add column if not exists risk boolean;
alter table public.test_items add column if not exists could_lose numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'test_items_could_lose_range') then
    alter table public.test_items add constraint test_items_could_lose_range
      check (could_lose is null or (could_lose > 0 and could_lose <= 100000));
  end if;
end $$;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'test_items' and column_name in ('risk', 'could_lose')
order by column_name;
