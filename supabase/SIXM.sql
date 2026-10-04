-- ============================================================================
-- FAULTLINE — THE 6M METHOD: THE FISHBONE ON A RUNNING LINE. Run ONCE. Safe to re-run.
--
-- Decided with Rowland, 4 October (docs/SIXM.md, docs/OPEX.md): a running
-- line's improvement is organised by the traditional fishbone — People ·
-- Machine · Method · Material · Measurement · Environment — and becomes a
-- root cause analysis: the gap → the problem (the head of the fish) → causes
-- on the six bones, each drilled with the five whys → countermeasures →
-- proof → holding. No new table: every piece hangs off a record that exists.
--
--   cases        The thin A3 was always the problem. It now carries its
--                project and line, what its head was taken from (source),
--                the causes on its bones (causes — a list merged by id, so two
--                devices adding causes both keep theirs) and the check that
--                keeps the gain (hold).
--   pace_todos   An action is the countermeasure for a cause (cause_ref =
--                "<caseId>:<causeId>") and says what it should change before
--                it is done (expect) — the prediction it is checked against.
--                Its column (pillar) now holds the six bones; the old People /
--                Plant / Process words are read across by the app.
--   observations A timed stop may carry the cause family the floor gave it
--                (cause_m) — one tap when it is timed — so the fishbone fills
--                from what the line said, not from a guess.
--
-- A client changes nothing on a project (supabase/ACCESS_LEVELS.sql): a case
-- that belongs to a project is written only by its editors, as a restrictive
-- policy beside the workspace ones (a case with no project is untouched).
-- ============================================================================

alter table public.cases        add column if not exists project_id text;
alter table public.cases        add column if not exists line_id    text;
alter table public.cases        add column if not exists source     jsonb;
alter table public.cases        add column if not exists causes     jsonb not null default '[]'::jsonb;
alter table public.cases        add column if not exists hold       jsonb;

alter table public.pace_todos   add column if not exists cause_ref  text;
alter table public.pace_todos   add column if not exists expect     text;

alter table public.observations add column if not exists cause_m    text;

create index if not exists cases_project_line_idx on public.cases (project_id, line_id);

do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cases' and policyname = 'project editors only insert') then
    create policy "project editors only insert" on public.cases as restrictive for insert to authenticated
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cases' and policyname = 'project editors only update') then
    create policy "project editors only update" on public.cases as restrictive for update to authenticated
      using (project_id is null or public.is_project_editor(project_id))
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
end $p$;

-- A photo on a cause ("I saw…") is a file the problem names: the media
-- bucket's rule (faultline_can_see_media) learns to look inside cases.causes,
-- so the phone may upload it and anybody who can see the problem may read it.
-- Same function as before, with one more place it looks; nothing else moves.
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
    execute 'select exists (select 1 from public.snags where detail_photo_key = $1 or fixed_photo_key = $1)' into hit using k;
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

-- ---------------------------------------------------------------- read back
select 'column' as what, table_name || '.' || column_name as name from information_schema.columns
  where table_schema = 'public' and (
    (table_name = 'cases' and column_name in ('project_id', 'line_id', 'source', 'causes', 'hold')) or
    (table_name = 'pace_todos' and column_name in ('cause_ref', 'expect')) or
    (table_name = 'observations' and column_name = 'cause_m'))
union all
select 'policy', tablename || ': ' || policyname from pg_policies where schemaname = 'public' and tablename = 'cases' and policyname like 'project editors%'
order by 1, 2;
