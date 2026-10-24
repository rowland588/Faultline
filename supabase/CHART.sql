-- ============================================================================
-- FAULTLINE — A CONTROL CHART MAY BE KEPT IN THE CLOUD. Run ONCE. Safe to re-run.
--
-- W2 of docs/TOOLS-BUILD.md (knowledge/specs/FC-086-charts.md, 24 October): the
-- control chart — readings in order against limits set from a steady period,
-- the signals in words, the CUSUM since when — is a `studies` row of tool
-- 'chart', its readings in facts.readings as the capability study's are. One
-- thing the database must allow before the app sends one:
--
--   'chart' among the tools a study may be (studies_tool_check) — the app's
--   list is lib/study STUDY_TOOLS. The check is put back with the same tools
--   as RELIABILITY.sql and 'chart'; nothing that is there changes.
-- ============================================================================

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'studies_tool_check' and pg_get_constraintdef(oid) like '%''chart''%') then
    alter table public.studies drop constraint if exists studies_tool_check;
    alter table public.studies add constraint studies_tool_check check (tool in
      ('capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout', 'talk', 'reliability', 'chart'));
  end if;
end $c$;

-- what it did
select 'a study may be a control chart' as check,
       case when (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''chart''%' then 'yes' else 'NO' end as answer
union all
select 'the tools before it are all still allowed',
       case when (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''reliability''%'
             and (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''capability''%' then 'yes' else 'NO' end;
