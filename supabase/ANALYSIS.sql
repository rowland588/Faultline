-- ============================================================================
-- FAULTLINE — AN ANALYSIS MAY BE KEPT IN THE CLOUD. Run ONCE. Safe to re-run.
--
-- W3a of docs/TOOLS-BUILD.md (knowledge/specs/FC-105-analysis.md, 24 October): the
-- analysis — how sure am I of this figure, did it change, do two ways of measuring
-- agree, how many readings do I need — is a `studies` row of tool 'analysis', its
-- agreement in agreed.analysis and its readings or counts in facts.readings as the
-- capability study's are. One thing the database must allow before the app sends one:
--
--   'analysis' among the tools a study may be (studies_tool_check) — the app's
--   list is lib/study STUDY_TOOLS. The check is put back with the same tools
--   as CHART.sql and 'analysis'; nothing that is there changes.
-- ============================================================================

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'studies_tool_check' and pg_get_constraintdef(oid) like '%''analysis''%') then
    alter table public.studies drop constraint if exists studies_tool_check;
    alter table public.studies add constraint studies_tool_check check (tool in
      ('capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout', 'talk', 'reliability', 'chart', 'analysis'));
  end if;
end $c$;

-- what it did
select 'a study may be an analysis' as check,
       case when (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''analysis''%' then 'yes' else 'NO' end as answer
union all
select 'the tools before it are all still allowed',
       case when (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''chart''%'
             and (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''reliability''%'
             and (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''capability''%' then 'yes' else 'NO' end;
