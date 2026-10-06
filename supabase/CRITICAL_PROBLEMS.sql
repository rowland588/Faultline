-- ============================================================================
-- FAULTLINE — A CRITICAL PROBLEM, AND ITS STORY. Run ONCE. Safe to re-run.
--
-- Rowland, 6 October: "If something happens during the project that is so
-- critical that we need to flag it as a critical element ... maybe it always
-- has to be a problem ... the ability to say that this is critical, and to
-- write more narrative behind it — potential solutions, what it means for the
-- business. For example, we just discovered that programs cannot be copied
-- over so easily, so we cannot release the line back to production in the
-- time that was agreed. There could be a mitigating thing — put a production
-- belt there to bypass the robot ... right now I don't have the ability to say
-- in a report: look at this, this is a major problem, potential solutions."
--
-- No new table: it is a problem (test_items, kind 'found') with three more
-- things it can say:
--   critical  it is flagged critical — it leads every screen and the report
--   impact    what it means for the business, in words
--   ways      the ways round it: [{ "id": …, "what": …, "agreed": true? }]
-- ============================================================================

alter table public.test_items add column if not exists critical boolean;
alter table public.test_items add column if not exists impact text;
alter table public.test_items add column if not exists ways jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'test_items_ways_is_array') then
    alter table public.test_items add constraint test_items_ways_is_array
      check (ways is null or jsonb_typeof(ways) = 'array');
  end if;
end $$;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'test_items' and column_name in ('critical', 'impact', 'ways')
order by column_name;
