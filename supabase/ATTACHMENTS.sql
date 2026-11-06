-- ============================================================================
-- FAULTLINE — PICTURES, VIDEOS AND LINKS ON ANY TOOL MAY BE UPLOADED. Run ONCE. Safe to re-run.
--
-- Rowland, 6 November: "add ability to put pictures and videos to any work station ... URL links and ability to add videos and pictures across all of
-- the tools". Every tool keeps them in ONE list on its study's facts (facts.attach — src/lib/attachments, docs/ATTACHMENTS.md), each aimed at a part
-- of the tool (a workstation) or the whole of it. No column is needed: a study is a `studies` row. What the database must still allow before a file can
-- leave the phone is the MEDIA RULE: the bucket takes a file only once a row the person can see names it (faultline_can_see_media), and the rule has
-- never looked in facts.attach — so these files would be refused (a 400 nobody sees) and stay on the device that took them. Until this is applied the
-- app is safe: the files are kept on the device and the words and links sync as ever.
--
-- The function below is DOC_PHOTOS.sql's, the live one as of 6 November, line for line, with ONE clause added to its studies test: facts.attach contains
-- an entry whose blobKey (the file) or thumbKey (its small picture) is the file. It runs with the person's own rights (not security definer), so a study
-- they cannot see names nothing for them.
--
-- APPLIED to the live database and read back (6 November 2026) through apply_migration under this name; the live function was proved equal to
-- DOC_PHOTOS.sql's first (md5 of its source, 4376e27b…), so this adds the one clause and nothing else.
-- ============================================================================

-- ------------------------------------------------- the media rule, widened
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
    -- And a document's photos (DOC_PHOTOS.sql, src/tools/doc): facts.docPhotos[].blobKey, an id-keyed list of
    -- {id, field, blobKey, mime, caption, at}, on a study the person can see.
    -- And the pictures, videos and links put on any tool (ATTACHMENTS.sql, src/lib/attachments): facts.attach[], an id-keyed list of
    -- {id, kind, target, blobKey, thumbKey, mime, url, caption, at}, a file named by blobKey (the picture or clip) or thumbKey (its small picture).
    execute 'select exists (select 1 from public.studies where facts -> ''video'' -> ''media'' ->> ''blobKey'' = $1 or facts -> ''video'' -> ''media'' ->> ''thumbKey'' = $1 or facts -> ''turns'' @> $2 or facts -> ''docPhotos'' @> $3 or facts -> ''attach'' @> $3 or facts -> ''attach'' @> $4)' into hit using k, jsonb_build_array(jsonb_build_object('media', jsonb_build_object('blobKey', k))), jsonb_build_array(jsonb_build_object('blobKey', k)), jsonb_build_array(jsonb_build_object('thumbKey', k));
    if hit then return true; end if;
  end if;
  return false;
end $function$;


-- ---------------------------------------------------------------- read back
select 'media rule looks in the attachments (file)' as what,
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''attach'' @> $3$q$) > 0 then 'yes' else 'NO' end as answer
union all
select 'media rule looks in the attachments (small picture)',
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''attach'' @> $4$q$) > 0 then 'yes' else 'NO' end
union all
select 'media rule keeps a document''s photos',
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''docPhotos'' @> $3$q$) > 0 then 'yes' else 'NO' end
union all
select 'media rule keeps a talk''s turns',
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''turns'' @> $2$q$) > 0 then 'yes' else 'NO' end
union all
select 'media rule keeps a video''s footage',
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''video'' -> ''media'' ->> ''blobKey'' = $1$q$) > 0 then 'yes' else 'NO' end
union all
select 'media rule is not security definer',
       case when (select prosecdef from pg_proc where oid = 'public.faultline_can_see_media'::regproc) then 'NO' else 'yes' end;
