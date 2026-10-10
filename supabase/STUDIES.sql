-- ============================================================================
-- FAULTLINE — STUDIES: ONE HOME FOR EVERY USE OF A TOOL. Run ONCE. Safe to
-- re-run.
--
-- Rowland, 10 October: "We're about to build tools that do two things. One,
-- can work independently. Two, can be attached to a project — possibly even
-- to a problem. It needs to be a full ecosystem ... You need to build that
-- first, don't you?" And "go, start release 2" — decision 0 agreed: the one
-- new record the toolkit needs (docs/TOOLKIT.md, Part 0; docs/BUILD.md, 2a).
--
-- A study is one use of a tool — a capability study of a weigher, a time
-- study of case packing — and it is EVIDENCE: never moved, never copied, one
-- record linked to whatever it is evidence for. (A snag is work, and moves;
-- that is unchanged.) Where it sits:
--   neither workspace_id nor project_id   a quick session: its maker's alone
--   workspace_id                          on a line: the line's members
--   project_id                            on a job: the job's people, by level
-- and `uses` lists what inside its job it is evidence or proof for.
--
-- Columns, as lib/study.ts ToolStudy:
--   tool          which tool: capability · map · time · balance · cycle ·
--                 changeover · losses · sampling · ergonomics · layout
--   agreed        what it is judged against, agreed before it is measured
--   facts         what people put in — readings, laps, steps, taps — each
--                 list merged by id between two devices
--   uses          [{ id, kind, ref, role, at, by }] — merged by id
--   closed_at, receipt   closed = a receipt: its figures as they stood
--   overrule      { verdict, why, by, at } — a person's word over the app's
-- Nothing worked out is stored: the mean, the Cpk, the verdict are the app's.
--
-- WHO MAY DO WHAT (docs/TOOLKIT.md, "Who can do what"):
--   read and write   its maker; or the line's members when it is on a line;
--                    or the job's members when it is on a job
--   a client         reads: the restrictive "editors only" policies refuse a
--                    client's insert and update on a job's study, as on every
--                    job table (ACCESS_LEVELS.sql). Not on a job, they do not
--                    apply — the line's or the maker's rule is the rule.
--   the job's owner  once a study is on a job: what was agreed (once written),
--                    which job it is on, reopening a closed one, and deleting
--                    are the owner's — the trigger below KEEPS the old value
--                    for anyone else rather than refusing the row, so the
--                    rest of their edit lands and the sync never stalls.
--
-- Its own guard function, not a branch in faultline_keep_agreement: that one
-- is shared by every job table, and replacing it from a file is how old
-- versions came back before (CLAUDE.md, "The files in supabase/").
--
-- Applied 10 October through apply_migration as STUDIES. The first attempt
-- came back "cancelled" and nothing had landed; the one statement that
-- dropped something (the cursor trigger, dropped and made again) became a
-- create-or-replace, and it went through. Read back: pg_policies,
-- pg_indexes, the triggers and pg_get_functiondef of the guard.
-- ============================================================================

create table if not exists public.studies (
  id            text primary key,
  owner_id      uuid not null default auth.uid(),
  tool          text not null,
  name          text not null default '',
  workspace_id  uuid,
  project_id    text,
  machine       text,
  asset_id      text,
  product       text,
  program_id    text,
  standard_id   text,
  agreed        jsonb,
  facts         jsonb not null default '{}'::jsonb,
  uses          jsonb not null default '[]'::jsonb,
  started_at    bigint not null,
  closed_at     bigint,
  receipt       jsonb,
  overrule      jsonb,
  created_at    bigint not null,
  updated_at    bigint not null,
  deleted_at    bigint
);

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'studies_tool_check') then
    alter table public.studies add constraint studies_tool_check check (tool in
      ('capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout'));
  end if;
end $c$;

create index if not exists studies_owner_idx     on public.studies (owner_id);
create index if not exists studies_project_idx   on public.studies (project_id)   where project_id is not null;
create index if not exists studies_workspace_idx on public.studies (workspace_id) where workspace_id is not null;

-- ---------------------------------------------------------------- sync transport: the rev stamp
-- Not optional: devices pull with "rev > the last rev I saw" (LINE_STANDARD.sql).
alter table public.studies add column if not exists rev bigint;
create or replace trigger faultline_rev before insert or update on public.studies
  for each row execute function public.faultline_stamp_rev();
update public.studies set rev = nextval('public.faultline_rev_seq') where rev is null;
create index if not exists idx_studies_rev on public.studies (rev);

do $p$ begin
  alter publication supabase_realtime add table public.studies;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $p$;

-- ---------------------------------------------------------------- who may
alter table public.studies enable row level security;

-- Permissive policies are OR-ed: the maker, or the line's members, or the
-- job's members. A select policy has no with_check; "for all" carries both.
do $r$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'studies' and policyname = 'own studies') then
    create policy "own studies" on public.studies for all to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'studies' and policyname = 'line studies') then
    create policy "line studies" on public.studies for all to authenticated
      using (workspace_id is not null and (select public.is_ws_member(studies.workspace_id)))
      with check (workspace_id is not null and (select public.is_ws_member(studies.workspace_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'studies' and policyname = 'project studies') then
    create policy "project studies" on public.studies for all to authenticated
      using (project_id is not null and (select public.is_project_member(studies.project_id)))
      with check (project_id is not null and (select public.is_project_member(studies.project_id)));
  end if;
  -- RESTRICTIVE, beside them (ACCESS_LEVELS.sql part 2): on a job, writing
  -- also needs to be the owner, the administrator or on the team — so a
  -- client reads and changes nothing. Off a job it asks nothing more.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'studies' and policyname = 'editors only insert') then
    create policy "editors only insert" on public.studies as restrictive for insert to authenticated
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'studies' and policyname = 'editors only update') then
    create policy "editors only update" on public.studies as restrictive for update to authenticated
      using (project_id is null or public.is_project_editor(project_id))
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
end $r$;

-- ---------------------------------------------------------------- the agreement is the owner's
create or replace function public.faultline_keep_study_agreement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.project_id is null or public.is_super() or public.is_project_owner(old.project_id) then
    return new;
  end if;
  new.deleted_at := old.deleted_at;                 -- deleting is the owner's
  new.project_id := old.project_id;                 -- so is taking it off the job
  if old.agreed is not null then new.agreed := old.agreed; end if;   -- written once by anyone
  if old.closed_at is not null then                 -- a receipt is reopened by the owner
    new.closed_at := old.closed_at;
    new.receipt   := old.receipt;
  end if;
  return new;
end $$;

create or replace trigger faultline_keep_study_agreement before update on public.studies
  for each row execute function public.faultline_keep_study_agreement();

-- ---------------------------------------------------------------- read back
select 'column' as what, column_name || ' ' || data_type || case when is_nullable = 'NO' then ' not null' else '' end as name
  from information_schema.columns where table_schema = 'public' and table_name = 'studies'
union all
select 'policy', policyname || ' · ' || permissive || ' · ' || cmd || ' · using ' || coalesce(qual, '—') || ' · check ' || coalesce(with_check, '—')
  from pg_policies where schemaname = 'public' and tablename = 'studies'
union all
select 'index', indexname from pg_indexes where schemaname = 'public' and tablename = 'studies'
union all
select 'trigger', tgname from pg_trigger where tgrelid = 'public.studies'::regclass and not tgisinternal
union all
select 'constraint', conname from pg_constraint where conrelid = 'public.studies'::regclass
union all
select 'realtime', tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'studies'
union all
select 'rls', relrowsecurity::text from pg_class where oid = 'public.studies'::regclass
order by 1, 2;
