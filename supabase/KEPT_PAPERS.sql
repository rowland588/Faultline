-- ============================================================================
-- FAULTLINE — THE LIBRARY: EVERY PAPER YOU HAVE MADE, IN THE CLOUD. Run ONCE. Safe to re-run.
--
-- Rowland, 11 November (docs/CONSULTANT-WORKSPACE.md C4): "Where is my overall library of work? … All reports I've created … I need to
-- be able to browse my work across businesses, but also open an individual business and see everything associated with it. I don't
-- want reports disappearing into individual projects … I also need to distinguish between my own internal working documents and
-- finished client-facing reports."
--
-- Since 5 November every PDF the app makes is kept where it was made (src/lib/keptPdfs — Saved copies under a page's Report ▾), but
-- ON THE DEVICE THAT MADE IT ONLY: a report made on the phone was never in the app on the laptop. This table is the record of each
-- kept paper, synced like every other row (rev cursor, last-writer-wins, tombstones), and its PDF goes to the existing `media`
-- bucket under media_key — so a paper made on the phone is in the library on the laptop.
--
-- Columns, as src/lib/keptPdfs KeptPdf:
--   page          the address of the page it was made on, without its query ("#/lines/<id>/report")
--   ids           every id in that address (a line, a project, a record)
--   workspace_id  the line it was made for, when it was (a line's report, a record on a line)
--   project_id    the project, when it was
--   study_id      the record (a tool's use, a document), when it was
--   client        the customer it was made for, as named at the time (the line's client, the project's, else the active one)
--   name          the file's name, changeable (Rename)
--   kind          what paper it is, read from the page (src/lib/library paperKindOf): story · visit-report · line-report ·
--                 area-report · project-report · problems · actions · factory · tool · talk · other — NOT checked against a list
--                 here, so a new kind of paper never needs a migration (studies_tool_check is the lesson: widened six times)
--   audience      'client' (a finished, client-facing report) or 'internal' (a working paper) — the default from its kind,
--                 changeable on each copy
--   size          bytes; media_key the PDF in the `media` bucket; made_at when it was made
-- Nothing worked out is stored.
--
-- WHO MAY DO WHAT — exactly as a study (STUDIES.sql): read and write by its maker; by the line's members when it is for a line; by
-- the project's members when it is for a project. RESTRICTIVE beside them (ACCESS_LEVELS.sql part 2): for a project, writing also
-- needs to be the owner, the administrator or on the team — so a client reads the project's papers and changes nothing (the app
-- never pushes a client's rows: src/cloud/sync.ts). No policy is `true`.
--
-- THE MEDIA RULE, widened by ONE clause: the bucket takes (and gives) a file only once a row the person can see names it
-- (faultline_can_see_media). The function below is ATTACHMENTS.sql's — the live one as of 6 November — line for line, with the
-- kept_papers clause added before `return false`. It runs with the person's own rights (not security definer), so a kept paper they
-- cannot see names nothing for them.
--
-- BEFORE THIS IS APPLIED the app is safe: the pull and the push of kept_papers answer "relation does not exist", that one kind waits
-- (src/cloud/sync.ts isMissingTable — its rows are counted unsent and go on the first pass after it is applied) and every other kind
-- syncs as before; the papers stay on the device as they did. Proved by src/cloud/__tests__/sync-pass.test.ts.
--
-- WRITTEN 11 November 2026 (slice C4). To be applied with apply_migration under this name and read back (pg_policies,
-- pg_get_functiondef, pg_indexes) before the library is said to sync.
-- ============================================================================

create table if not exists public.kept_papers (
  id            text primary key,
  owner_id      uuid not null default auth.uid(),
  workspace_id  uuid,
  project_id    text,
  study_id      text,
  client        text,
  page          text not null default '',
  ids           text[] not null default '{}',
  name          text not null default '',
  kind          text not null default 'other',
  audience      text not null default 'internal' check (audience in ('client', 'internal')),
  size          bigint not null default 0,
  media_key     text not null,
  made_at       bigint not null,
  updated_at    bigint not null,
  deleted_at    bigint
);

create index if not exists kept_papers_owner_idx     on public.kept_papers (owner_id);
create index if not exists kept_papers_project_idx   on public.kept_papers (project_id)   where project_id is not null;
create index if not exists kept_papers_workspace_idx on public.kept_papers (workspace_id) where workspace_id is not null;
create index if not exists kept_papers_media_idx     on public.kept_papers (media_key);

-- ---------------------------------------------------------------- sync transport: the rev stamp
-- Not optional: devices pull with "rev > the last rev I saw" (LINE_STANDARD.sql).
alter table public.kept_papers add column if not exists rev bigint;
create or replace trigger faultline_rev before insert or update on public.kept_papers
  for each row execute function public.faultline_stamp_rev();
update public.kept_papers set rev = nextval('public.faultline_rev_seq') where rev is null;
create index if not exists idx_kept_papers_rev on public.kept_papers (rev);

do $p$ begin
  alter publication supabase_realtime add table public.kept_papers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $p$;

-- ---------------------------------------------------------------- who may
alter table public.kept_papers enable row level security;

-- Permissive policies are OR-ed: the maker, or the line's members, or the project's members. A select policy has no with_check;
-- "for all" carries both.
do $r$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'kept_papers' and policyname = 'own kept papers') then
    create policy "own kept papers" on public.kept_papers for all to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'kept_papers' and policyname = 'line kept papers') then
    create policy "line kept papers" on public.kept_papers for all to authenticated
      using (workspace_id is not null and (select public.is_ws_member(kept_papers.workspace_id)))
      with check (workspace_id is not null and (select public.is_ws_member(kept_papers.workspace_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'kept_papers' and policyname = 'project kept papers') then
    create policy "project kept papers" on public.kept_papers for all to authenticated
      using (project_id is not null and (select public.is_project_member(kept_papers.project_id)))
      with check (project_id is not null and (select public.is_project_member(kept_papers.project_id)));
  end if;
  -- RESTRICTIVE, beside them (ACCESS_LEVELS.sql part 2): for a project, writing also needs to be the owner, the administrator or
  -- on the team — so a client reads and changes nothing. Off a project it asks nothing more.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'kept_papers' and policyname = 'editors only insert') then
    create policy "editors only insert" on public.kept_papers as restrictive for insert to authenticated
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'kept_papers' and policyname = 'editors only update') then
    create policy "editors only update" on public.kept_papers as restrictive for update to authenticated
      using (project_id is null or public.is_project_editor(project_id))
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
end $r$;

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
  if to_regclass('public.kept_papers') is not null then
    -- A kept paper's PDF (KEPT_PAPERS.sql, src/lib/keptPdfs, docs/CONSULTANT-WORKSPACE.md C4): kept_papers.media_key, on a paper the
    -- person can see by the kept papers' own rules (its maker, the line's members, the project's members).
    execute 'select exists (select 1 from public.kept_papers where media_key = $1)' into hit using k;
    if hit then return true; end if;
  end if;
  return false;
end $function$;


-- ---------------------------------------------------------------- read back
select 'kept_papers table' as what,
       case when to_regclass('public.kept_papers') is not null then 'yes' else 'NO' end as answer
union all
select 'kept_papers has rev and its trigger',
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'kept_papers' and column_name = 'rev')
             and exists (select 1 from pg_trigger where tgrelid = 'public.kept_papers'::regclass and tgname = 'faultline_rev') then 'yes' else 'NO' end
union all
select 'kept_papers row-level security on',
       case when (select relrowsecurity from pg_class where oid = 'public.kept_papers'::regclass) then 'yes' else 'NO' end
union all
select 'kept_papers policies (5: own, line, project, editors only insert, editors only update)',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'kept_papers')
union all
select 'no kept_papers policy is plain true',
       case when exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'kept_papers'
                           and (qual = 'true' or with_check = 'true')) then 'NO' else 'yes' end
union all
select 'kept_papers in the realtime publication',
       case when exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kept_papers') then 'yes' else 'NO' end
union all
select 'media rule looks in kept_papers',
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), 'from public.kept_papers where media_key = $1') > 0 then 'yes' else 'NO' end
union all
select 'media rule keeps the attachments',
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''attach'' @> $3$q$) > 0 then 'yes' else 'NO' end
union all
select 'media rule keeps a video''s footage',
       case when strpos(pg_get_functiondef('public.faultline_can_see_media'::regproc), $q$facts -> ''video'' -> ''media'' ->> ''blobKey'' = $1$q$) > 0 then 'yes' else 'NO' end
union all
select 'media rule is not security definer',
       case when (select prosecdef from pg_proc where oid = 'public.faultline_can_see_media'::regproc) then 'NO' else 'yes' end;
