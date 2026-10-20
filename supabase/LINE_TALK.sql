-- ============================================================================
-- FAULTLINE — LINE TALK MAY BE KEPT IN THE CLOUD. Run ONCE. Safe to re-run.
--
-- Line Talk (docs/LINE-TALK.md, docs/DIRECTION.md — the AI tool Rowland
-- agreed on 20 October: one person talks on the line, it hears it, the talk
-- is kept for good and carried on like a chat) is a `studies` row of tool
-- 'talk', its conversation in facts.turns: each piece said with its
-- recording, each photo, each typed line. Two things the database must
-- allow before the app sends one:
--
--   1. 'talk' among the tools a study may be (studies_tool_check) — the
--      app's list is lib/study STUDY_TOOLS. The check is put back with the
--      same tools as STUDIES.sql and 'talk'; nothing that is there changes.
--   2. a talk's files may be uploaded and opened: the media bucket takes a
--      file only once a row the person can see names it
--      (faultline_can_see_media). The function below is VIDEO_MEDIA.sql's,
--      the live one as of 19 October, line for line, with one clause
--      widened: studies.facts -> turns contains a turn whose media is the
--      file. It runs with the person's own rights (not security definer),
--      so a talk they cannot see names nothing for them.
-- ============================================================================

-- ------------------------------------------------- 1. the tools a study may be
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'studies_tool_check' and pg_get_constraintdef(oid) like '%talk%') then
    alter table public.studies drop constraint if exists studies_tool_check;
    alter table public.studies add constraint studies_tool_check check (tool in
      ('capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout', 'talk'));
  end if;
end $c$;

-- ------------------------------------------------- 2. a talk's files
create or replace function public.faultline_can_see_media(object_name text)
returns boolean language plpgsql stable set search_path to 'public' as $function$
declare k text := regexp_replace(object_name, '^.*/', '');
        one jsonb := jsonb_build_array(jsonb_build_object('blobKey', k));
        two jsonb := jsonb_build_array(jsonb_build_object('thumbKey', k));
        hit boolean := false;
begin
  if to_regclass('public.observations') is not null then
    execute 'select exists (select 1 from public.observations where media @> $1 or media @> $2)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.segments') is not null then
    execute 'select exists (select 1 from public.segments where video_key = $1 or poster_key = $1)' into hit using k;
    if hit then return true; end if;
  end if;
  if to_regclass('public.snag_assets') is not null then
    execute 'select exists (select 1 from public.snag_assets where still_key = $1)' into hit using k;
    if hit then return true; end if;
  end if;
  if to_regclass('public.snags') is not null then
    -- A snag's photos and clips (snags.media, QUICK_SNAGS.sql) — the list
    -- the Snag button fills. Missed here until 8 October.
    execute 'select exists (select 1 from public.snags where detail_photo_key = $1 or fixed_photo_key = $1 or media @> $2 or media @> $3)' into hit using k, one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.pace_todos') is not null then
    execute 'select exists (select 1 from public.pace_todos where media @> $1 or media @> $2)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.tests') is not null then
    execute 'select exists (select 1 from public.tests where media @> $1 or media @> $2 or docs @> $1)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.test_items') is not null then
    execute 'select exists (select 1 from public.test_items where media @> $1 or media @> $2)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.commission_assets') is not null then
    execute 'select exists (select 1 from public.commission_assets where docs @> $1)' into hit using one;
    if hit then return true; end if;
  end if;
  if to_regclass('public.commission_items') is not null then
    execute 'select exists (select 1 from public.commission_items where photos @> $1 or photos @> $2)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.standards') is not null then
    execute 'select exists (select 1 from public.standards where photo_key = $1)' into hit using k;
    if hit then return true; end if;
  end if;
  if to_regclass('public.cases') is not null then
    execute 'select exists (select 1 from public.cases where causes @> jsonb_build_array(jsonb_build_object(''media'', $1)) or causes @> jsonb_build_array(jsonb_build_object(''media'', $2)))' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.flow_records') is not null then
    -- A method's step: its photos and files (METHODS.sql, FLOW_MEDIA.sql).
    execute 'select exists (select 1 from public.flow_records where media @> $1 or media @> $2 or docs @> $1)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.studies') is not null then
    -- A video study's footage and its poster (VIDEO_MEDIA.sql, docs/VIDEO.md):
    -- facts.video.media, on a study the person can see by the studies' own rules.
    -- And a Line Talk's recordings and photos (LINE_TALK.sql, docs/LINE-TALK.md):
    -- facts.turns[].media.blobKey, on a study the person can see.
    execute 'select exists (select 1 from public.studies where facts -> ''video'' -> ''media'' ->> ''blobKey'' = $1 or facts -> ''video'' -> ''media'' ->> ''thumbKey'' = $1 or facts -> ''turns'' @> $2)' into hit using k, jsonb_build_array(jsonb_build_object('media', jsonb_build_object('blobKey', k)));
    if hit then return true; end if;
  end if;
  return false;
end $function$;

-- ---------------------------------------------------------------- read back
select 'a study may be a Line Talk' as what,
       case when (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like '%''talk''%' then 'yes' else 'NO' end as answer
union all
select 'the earlier tools are all still allowed',
       case when (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studies_tool_check') like all
         (array['%''capability''%', '%''map''%', '%''time''%', '%''balance''%', '%''cycle''%', '%''changeover''%', '%''losses''%', '%''sampling''%', '%''ergonomics''%', '%''layout''%'])
       then 'yes' else 'NO' end
union all
select 'media rule looks in a talk''s turns',
       case when pg_get_functiondef('public.faultline_can_see_media'::regproc) like '%facts -> ''turns'' @>%' then 'yes' else 'NO' end
union all
select 'media rule keeps a video''s footage',
       case when pg_get_functiondef('public.faultline_can_see_media'::regproc) like '%''video'' -> ''media''%' then 'yes' else 'NO' end
union all
select 'media rule keeps flow_records',
       case when pg_get_functiondef('public.faultline_can_see_media'::regproc) like '%public.flow_records where media%' then 'yes' else 'NO' end
union all
select 'media rule is not security definer',
       case when (select prosecdef from pg_proc where oid = 'public.faultline_can_see_media'::regproc) then 'NO' else 'yes' end;
