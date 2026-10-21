-- ============================================================================
-- FAULTLINE — A MACHINE'S RELIABILITY MAY BE KEPT IN THE CLOUD. Run ONCE. Safe to re-run.
--
-- Rowland, 21 October: "a tool ... to measure machine reliability, MTBF and a
-- failure rate ... a person stood at a machine, tapping a button every time
-- an event happened ... also I start a clock watch I can stop and start".
-- The reliability study (lib/ie/reliability, docs/TOOLKIT.md) is a `studies`
-- row of tool 'reliability', its sessions in facts.reliability: each the
-- stretches the watch ran and the events tapped in them. One thing the
-- database must allow before the app sends one:
--
--   'reliability' among the tools a study may be (studies_tool_check) — the
--   app's list is lib/study STUDY_TOOLS. The check is put back with the same
--   tools as LINE_TALK.sql and 'reliability'; nothing that is there changes.
-- ============================================================================

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'studies_tool_check' and pg_get_constraintdef(oid) like '%reliability%') then
    alter table public.studies drop constraint if exists studies_tool_check;
    alter table public.studies add constraint studies_tool_check check (tool in
      ('capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout', 'talk', 'reliability'));
  end if;
end $c$;

-- what it did
select 'a study may be a reliability study' as check,
       case when (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''reliability''%' then 'yes' else 'NO' end as answer
union all
select 'the tools before it are all still allowed',
       case when (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''talk''%'
             and (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''capability''%' then 'yes' else 'NO' end;
