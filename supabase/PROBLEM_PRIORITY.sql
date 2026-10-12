-- ============================================================================
-- FAULTLINE — A PROBLEM ON A LINE HAS A PRIORITY. Run ONCE. Safe to re-run.
--
-- Rowland, 12 October: "We will change snags and fixes to the word problems
-- ... also add a RAG status for the problems — critical red, high amber, low
-- green — to show in order of priorities."
--
-- A problem on a job (test_items, kind 'found') already says critical
-- (CRITICAL_PROBLEMS.sql) or high risk (PROBLEM_RISK.sql); anything else is
-- low. A problem seen on a line before it is on a job (snags) said nothing,
-- so it is given the same three words here:
--   priority   'critical' · 'high' · 'low' — absent reads as low
-- ============================================================================

alter table public.snags add column if not exists priority text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'snags_priority_words') then
    alter table public.snags add constraint snags_priority_words
      check (priority is null or priority in ('critical', 'high', 'low'));
  end if;
end $$;

select column_name, data_type,
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'snags_priority_words') as rule
from information_schema.columns
where table_schema = 'public' and table_name = 'snags' and column_name = 'priority';
