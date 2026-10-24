-- ============================================================================
-- FAULTLINE — WHAT A PROBLEM COSTS THE LINE WHILE IT IS OPEN. Run ONCE. Safe to re-run.
--
-- Rowland, 24 October: "all tools made or that will be made will have cost
-- in ... the cost is merely one of the outputs ... if the user doesn't have
-- that information then the app must handle it gracefully, don't block
-- anything." knowledge/MONEY.md §4, FC-154: a problem's open cost — the
-- minutes a day it costs the line (a stop, slow running, a workaround), said
-- in money by the line's own cost model: labour for the minutes, and the
-- packs and contribution lost where it stops the line (lib/problemCost).
--
-- One column on the register's problems (snags):
--   minutes_per_day   numeric — how many minutes a day this costs the line
--                     while it is open; absent when nobody has said
-- ============================================================================

alter table public.snags add column if not exists minutes_per_day numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'snags_minutes_per_day_sane') then
    alter table public.snags add constraint snags_minutes_per_day_sane
      check (minutes_per_day is null or (minutes_per_day >= 0 and minutes_per_day <= 1440));
  end if;
end $$;

select column_name, data_type,
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'snags_minutes_per_day_sane') as rule
from information_schema.columns
where table_schema = 'public' and table_name = 'snags' and column_name = 'minutes_per_day';
