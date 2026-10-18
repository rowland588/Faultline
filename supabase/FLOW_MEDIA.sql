-- ============================================================================
-- FAULTLINE — A METHOD'S PHOTOS AND FILES MAY BE UPLOADED. Run ONCE. Safe to
-- re-run.
--
-- METHODS.sql (18 October) gave a project running a method its records —
-- flow_records, each step's photos (media) and files (docs). The media bucket
-- takes a file only once a row the person can see names it
-- (faultline_can_see_media; "no upload before a row names the file"), and
-- the rule was never taught to look in flow_records — so every photo taken on
-- a method's step would have been refused, as the Snag button's were until
-- SNAG_MEDIA.sql (src/cloud/__tests__/sync-schema.test.ts caught it before
-- any reached a phone).
--
-- The function below is today's, read back live on 18 October (SNAG_MEDIA.sql
-- line for line), with one clause added: flow_records.media and .docs.
--
-- AND TWO COLUMNS RENAMED. flow_records.stage_key and .step_key became stage
-- and step: the schema test reads any column ending _key on a table that
-- carries files as a file's name, which these are not. The table was made
-- the same day and holds no rows; nothing else reads the old names.
-- ============================================================================

do $r$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'flow_records' and column_name = 'stage_key') then
    alter table public.flow_records rename column stage_key to stage;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'flow_records' and column_name = 'step_key') then
    alter table public.flow_records rename column step_key to step;
  end if;
end $r$;

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
  return false;
end $function$;

-- ---------------------------------------------------------------- read back
select 'column' as what, column_name as name from information_schema.columns
 where table_schema = 'public' and table_name = 'flow_records' and column_name in ('stage', 'step', 'stage_key', 'step_key')
union all
select 'media rule looks in flow_records',
       case when pg_get_functiondef('public.faultline_can_see_media'::regproc) like '%public.flow_records where media%' then 'yes' else 'NO' end
union all
select 'media rule keeps snags.media',
       case when pg_get_functiondef('public.faultline_can_see_media'::regproc) like '%media @> $2 or media @> $3%' then 'yes' else 'NO' end;
