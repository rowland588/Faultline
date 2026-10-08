-- ============================================================================
-- FAULTLINE — A SNAG'S PHOTOS AND CLIPS MAY BE UPLOADED. Run ONCE. Safe to re-run.
--
-- Rowland, 8 October: "Phone is not sending — repair sync is not working on
-- videos and photos."
--
-- The media bucket takes a file only once a row names it (faultline_can_see_media,
-- SECURITY_RLS.sql; "no upload before a row names the file"). QUICK_SNAGS.sql
-- gave a snag a list of photos and clips — snags.media, [{ blobKey, thumbKey,
-- … }] — and the Snag button fills it; but the rule was never taught to look
-- there. It looked only at a snag's two old single photos (detail_photo_key,
-- fixed_photo_key). So every photo and clip taken with the Snag button since
-- was refused by the bucket: the snag's words reached the cloud, its pictures
-- did not, and every retry — Repair sync included — was refused the same way.
-- Read on 8 October: 6 photos and 1 clip named by snags, none in the bucket;
-- nothing at all uploaded since 6 October 07:25.
--
-- The function below is SIXM.sql's, line for line, with snags.media added to
-- the snags clause. Nothing else moves. The phones keep the refused files and
-- send them again on their next pass — nothing to re-take, nothing to press.
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
  return false;
end $function$;

select pg_get_functiondef('public.faultline_can_see_media(text)'::regprocedure) like '%media @> $2 or media @> $3)'' into hit using k, one, two%' as snags_media_covered;
