-- ============================================================================
-- FAULTLINE — HOURS LOST TO A PROBLEM. Run ONCE. Safe to re-run.
--
-- Rowland, 6 October: "it only gives me ability to put days, but in some
-- occasions I find out that actually it's hours ... I've reported 2 hours
-- here, 1 hour there, 5 hours here, and then you can quantify that into
-- actually that was one day fully missed, or half a day."
--
-- A problem written on a stage (test_items, kind 'found') can now say how
-- many hours it cost. The hours on a stage add up, and when they make a full
-- working day the finish is pushed by that day — kept as a move like any
-- other (moved_from / moved_to), the problem that tipped it its reason.
-- How many hours make a day is the job's: projects.day_hours, eight when
-- left blank.
-- ============================================================================

alter table public.test_items add column if not exists hours_lost numeric;
alter table public.projects add column if not exists day_hours numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'test_items_hours_lost_range') then
    alter table public.test_items add constraint test_items_hours_lost_range
      check (hours_lost is null or (hours_lost > 0 and hours_lost <= 10000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'projects_day_hours_range') then
    alter table public.projects add constraint projects_day_hours_range
      check (day_hours is null or (day_hours > 0 and day_hours <= 24));
  end if;
end $$;

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'test_items' and column_name = 'hours_lost')
    or (table_name = 'projects' and column_name = 'day_hours'))
order by table_name;
