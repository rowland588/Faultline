-- ============================================================================
-- FAULTLINE — A DOCUMENT'S PHOTOS MAY BE UPLOADED. Run ONCE. Safe to re-run.
--
-- The document shape (knowledge/specs/FC-240-documents.md, src/tools/doc) keeps a charter, a SIPOC, an 8D report … as a `studies` row of
-- tool 'doc' — a tool the studies' check already allows (SHAPE_TOOLS.sql) — with what was typed in facts.docValues and its photos in
-- facts.docPhotos. No column is needed. What the database must still allow before a photo can leave the phone is the MEDIA RULE: the
-- bucket takes a file only once a row the person can see names it (faultline_can_see_media), and the rule has never looked in
-- facts.docPhotos — so a document's photos would be refused (a 400 nobody sees) and stay on the device that took them. Until this is
-- applied the app is safe: the photos are kept on the device and the document's words sync as ever.
--
-- The function below is LINE_TALK.sql's, the live one as of 20 October, line for line, with ONE clause added:
-- studies.facts -> docPhotos contains an entry whose blobKey is the file. It runs with the person's own rights (not security definer), so
-- a document they cannot see names nothing for them.
--
-- NOT YET APPLIED — written on the m6-doc branch (1 November 2026); the integrator applies it through apply_migration under the same
-- name and reads it back (CLAUDE.md, "Database changes ship from here"). If another branch also widens this function, merge the
-- clauses into ONE definition before applying: this function replaces the whole of it.
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
    execute 'select exists (select 1 from public.studies where facts -> ''video'' -> ''media'' ->> ''blobKey'' = $1 or facts -> ''video'' -> ''media'' ->> ''thumbKey'' = $1 or facts -> ''turns'' @> $2 or facts -> ''docPhotos'' @> $3)' into hit using k, jsonb_build_array(jsonb_build_object('media', jsonb_build_object('blobKey', k))), jsonb_build_array(jsonb_build_object('blobKey', k));
    if hit then return true; end if;
  end if;
  return false;
end $function$;


-- ---------------------------------------------------------------- read back
select 'media rule looks in a document''s photos' as what,
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''docPhotos'' @> $3$q$) > 0 then 'yes' else 'NO' end as answer
union all
select 'media rule keeps a talk''s turns',
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''turns'' @> $2$q$) > 0 then 'yes' else 'NO' end
union all
select 'media rule keeps a video''s footage',
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''video'' -> ''media'' ->> ''blobKey'' = $1$q$) > 0 then 'yes' else 'NO' end
union all
select 'media rule keeps flow_records',
       case when pg_get_functiondef('public.faultline_can_see_media'::regproc) like '%public.flow_records where media%' then 'yes' else 'NO' end
union all
select 'media rule is not security definer',
       case when (select prosecdef from pg_proc where oid = 'public.faultline_can_see_media'::regproc) then 'NO' else 'yes' end;
