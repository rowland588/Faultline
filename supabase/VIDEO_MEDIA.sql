-- ============================================================================
-- FAULTLINE — A VIDEO STUDY'S FOOTAGE MAY BE UPLOADED. Run ONCE. Safe to
-- re-run.
--
-- A video study (docs/VIDEO.md) is a `studies` row whose facts carry the
-- footage: facts.video.media.blobKey (and a poster's thumbKey). The media
-- bucket takes a file only once a row the person can see names it
-- (faultline_can_see_media; "no upload before a row names the file"), and
-- the rule has never looked in studies — so a study's footage would be
-- refused, and stays on the device that took it.
--
-- The function below is FLOW_MEDIA.sql's, the live one as of 18 October,
-- line for line, with one clause added: studies.facts -> video -> media. It
-- runs with the person's own rights (not security definer), so a study they
-- cannot see names nothing for them.
--
-- NOT APPLIED YET. Rowland declined the last migration offered from here
-- (ASSIST_USAGE, 18 October), so this waits on his word. Until it is applied
-- the app does not send a study's footage (src/cloud/mappers.ts, studies
-- mediaKeys stays []) and says on the study that the footage is kept on this
-- device only; the events, the figures and the reports sync as any study's.
-- Once applied and read back: studies.mediaKeys names facts.video.media, and
-- the study's words change in the same commit.
-- ============================================================================

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
    execute 'select exists (select 1 from public.studies where facts -> ''video'' -> ''media'' ->> ''blobKey'' = $1 or facts -> ''video'' -> ''media'' ->> ''thumbKey'' = $1)' into hit using k;
    if hit then return true; end if;
  end if;
  return false;
end $function$;

-- ---------------------------------------------------------------- read back
select 'media rule looks in studies for a video''s footage' as what,
       case when pg_get_functiondef('public.faultline_can_see_media'::regproc) like '%public.studies where facts%' then 'yes' else 'NO' end as answer
union all
select 'media rule keeps flow_records',
       case when pg_get_functiondef('public.faultline_can_see_media'::regproc) like '%public.flow_records where media%' then 'yes' else 'NO' end
union all
select 'media rule keeps snags.media',
       case when pg_get_functiondef('public.faultline_can_see_media'::regproc) like '%media @> $2 or media @> $3%' then 'yes' else 'NO' end;
