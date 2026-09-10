-- ============================================================================
-- FAULTLINE — PROJECT TEAMS. Run in the Supabase SQL Editor. Safe to re-run.
--
-- Project Pace was one person's management surface. It is now a PROJECT with
-- people in it: a lead who is accountable, lines each with an owner, a sponsor
-- and a pack of their own, and anyone else invited to read it. This is what
-- makes that real on the server rather than only on one laptop.
--
-- Nothing is taken away. The old rule (owner_id = auth.uid()) stays as the
-- first half of every policy, so every row already there stays visible to
-- whoever owns it, whether or not it has been given a project yet.
--
-- ---------------------------------------------------------------------------
-- WHY IT LOOKS LIKE THIS: one statement per line, no line breaks inside a
-- statement, and no dollar-quoted bodies anywhere.
--
-- Earlier drafts were laid out for reading — indented CREATE TABLEs, DO $$ $$
-- loops — and failed twice on the way into the SQL editor with a syntax error
-- pointing past the end of the text, which means what arrived was not what was
-- sent. A statement broken across twelve lines can lose one and still parse as
-- far as the closing bracket: drop `deleted_at bigint` and the line above it
-- ends in a comma, so the error lands on the ")" and says nothing useful.
--
-- On one line that cannot happen. A statement either arrives whole or is
-- obviously absent, and re-running is free.
--
-- Verified end to end against PostgreSQL 16 before being sent.
-- ---------------------------------------------------------------------------
--
-- RUN IT IN FOUR PARTS, in order. Each part re-runs safely on its own.
--
-- Depends on: PROJECT_PACE.sql (the pace_* tables), SYNC_UPGRADE.sql
-- (faultline_stamp_rev, faultline_rev_seq) and WORKSPACE_TEAMS.sql (is_super).
-- ============================================================================


-- ============================ PART 1 of 4 ===================================
-- The two new tables: the project itself, and who is in it.
-- ============================================================================

create table if not exists public.projects (id text primary key, owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade, name text not null default 'Project', description text, color text not null default '#2b87d4', workspace_ids jsonb not null default '[]'::jsonb, lead text, lead_email text, created_at bigint not null, updated_at bigint not null, deleted_at bigint, rev bigint);
create table if not exists public.project_members (project_id text not null references public.projects (id) on delete cascade, email text not null, role text not null default 'member', added_by uuid references auth.users (id) on delete set null, created_at timestamptz not null default now(), primary key (project_id, email));
create index if not exists idx_projects_owner on public.projects (owner_id);
create index if not exists idx_projects_rev on public.projects (rev);
alter table public.projects enable row level security;
alter table public.project_members enable row level security;


-- ============================ PART 2 of 4 ===================================
-- Who is in a project. Security definer, so the policies in part 4 can call
-- these without RLS recursing into the very table it is checking.
-- ============================================================================

create or replace function public.is_project_owner(p text) returns boolean language sql stable security definer set search_path = public as 'select exists (select 1 from public.projects x where x.id = p and x.owner_id = auth.uid())';
create or replace function public.is_project_member(p text) returns boolean language sql stable security definer set search_path = public as 'select p is not null and (public.is_super() or public.is_project_owner(p) or exists (select 1 from public.project_members m where m.project_id = p and m.email = lower(coalesce(auth.jwt() ->> ''email'', ''''))))';
grant execute on function public.is_project_owner(text) to authenticated;
grant execute on function public.is_project_member(text) to authenticated;


-- ============================ PART 3 of 4 ===================================
-- The columns. A line gains the people against it and a workspace of its own;
-- a next step or a win gains the LINE it belongs to, which is what gives each
-- owner their own pack. A null line_id means it spans the whole project, which
-- is what everything logged before lines had packs reads as.
-- ============================================================================

alter table public.pace_ppm add column if not exists project_id text;
alter table public.pace_todos add column if not exists project_id text;
alter table public.pace_wins add column if not exists project_id text;
alter table public.pace_snapshots add column if not exists project_id text;
alter table public.pace_ppm add column if not exists line_owner text;
alter table public.pace_ppm add column if not exists line_owner_email text;
alter table public.pace_ppm add column if not exists sponsor text;
alter table public.pace_ppm add column if not exists sponsor_email text;
alter table public.pace_ppm add column if not exists workspace_id text;
alter table public.pace_ppm add column if not exists sort integer not null default 0;
alter table public.pace_ppm add column if not exists deleted_at bigint;
alter table public.pace_todos add column if not exists line_id text;
alter table public.pace_wins add column if not exists line_id text;
create index if not exists idx_pace_ppm_project on public.pace_ppm (project_id);
create index if not exists idx_pace_todos_project on public.pace_todos (project_id);
create index if not exists idx_pace_wins_project on public.pace_wins (project_id);
create index if not exists idx_pace_snapshots_project on public.pace_snapshots (project_id);
create index if not exists idx_pace_todos_line on public.pace_todos (line_id);
create index if not exists idx_pace_wins_line on public.pace_wins (line_id);
update public.pace_ppm set project_id = 'project-pace' where project_id is null;
update public.pace_todos set project_id = 'project-pace' where project_id is null;
update public.pace_wins set project_id = 'project-pace' where project_id is null;
update public.pace_snapshots set project_id = 'project-pace' where project_id is null;
drop trigger if exists faultline_rev on public.projects;
create trigger faultline_rev before insert or update on public.projects for each row execute function public.faultline_stamp_rev();
update public.projects set rev = nextval('public.faultline_rev_seq') where rev is null;


-- ============================ PART 4 of 4 ===================================
-- The permissions, written out one per table rather than generated in a loop,
-- so a failure names the table it failed on. Then the late-joiner trigger, and
-- a report telling you it all landed.
--
-- The late-joiner trigger matters more than it looks: devices pull by the
-- server-assigned rev cursor, so somebody added to a project today has to have
-- every row of it re-stamped above their cursor, or they join and see an empty
-- project with months of work in it. The updates it runs are no-ops —
-- updated_at, which is what last-write-wins reads, is set to itself.
-- ============================================================================

drop policy if exists "member projects select" on public.projects;
drop policy if exists "member projects insert" on public.projects;
drop policy if exists "member projects update" on public.projects;
drop policy if exists "member projects delete" on public.projects;
create policy "member projects select" on public.projects for select to authenticated using (public.is_project_member(id));
create policy "member projects insert" on public.projects for insert to authenticated with check (owner_id = auth.uid() or public.is_project_member(id));
create policy "member projects update" on public.projects for update to authenticated using (public.is_project_member(id)) with check (public.is_project_member(id));
create policy "member projects delete" on public.projects for delete to authenticated using (public.is_project_owner(id) or public.is_super());
drop policy if exists "project members read" on public.project_members;
drop policy if exists "project members manage" on public.project_members;
create policy "project members read" on public.project_members for select to authenticated using (public.is_project_member(project_id));
create policy "project members manage" on public.project_members for all to authenticated using (public.is_project_owner(project_id) or public.is_super()) with check (public.is_project_owner(project_id) or public.is_super());
drop policy if exists "own pace_ppm" on public.pace_ppm;
drop policy if exists "project pace_ppm" on public.pace_ppm;
create policy "project pace_ppm" on public.pace_ppm for all to authenticated using (owner_id = auth.uid() or public.is_project_member(project_id)) with check (owner_id = auth.uid() or public.is_project_member(project_id));
drop policy if exists "own pace_todos" on public.pace_todos;
drop policy if exists "project pace_todos" on public.pace_todos;
create policy "project pace_todos" on public.pace_todos for all to authenticated using (owner_id = auth.uid() or public.is_project_member(project_id)) with check (owner_id = auth.uid() or public.is_project_member(project_id));
drop policy if exists "own pace_wins" on public.pace_wins;
drop policy if exists "project pace_wins" on public.pace_wins;
create policy "project pace_wins" on public.pace_wins for all to authenticated using (owner_id = auth.uid() or public.is_project_member(project_id)) with check (owner_id = auth.uid() or public.is_project_member(project_id));
drop policy if exists "own pace_snapshots" on public.pace_snapshots;
drop policy if exists "project pace_snapshots" on public.pace_snapshots;
create policy "project pace_snapshots" on public.pace_snapshots for all to authenticated using (owner_id = auth.uid() or public.is_project_member(project_id)) with check (owner_id = auth.uid() or public.is_project_member(project_id));
create or replace function public.faultline_project_member_added() returns trigger language plpgsql security definer set search_path = public as 'begin update public.projects set updated_at = updated_at where id = new.project_id; update public.pace_ppm set updated_at = updated_at where project_id = new.project_id; update public.pace_todos set updated_at = updated_at where project_id = new.project_id; update public.pace_wins set updated_at = updated_at where project_id = new.project_id; update public.pace_snapshots set updated_at = updated_at where project_id = new.project_id; return new; end';
drop trigger if exists faultline_project_member_added on public.project_members;
create trigger faultline_project_member_added after insert on public.project_members for each row execute function public.faultline_project_member_added();
select 'projects table' as item, case when exists (select 1 from pg_tables where schemaname='public' and tablename='projects') then 'created' else 'MISSING' end as value union all select 'project_members table', case when exists (select 1 from pg_tables where schemaname='public' and tablename='project_members') then 'created' else 'MISSING' end union all select 'line columns on pace_ppm (7 expected)', (select count(*)::text || ' of 7' from information_schema.columns where table_schema='public' and table_name='pace_ppm' and column_name in ('project_id','line_owner','line_owner_email','sponsor','sponsor_email','workspace_id','sort')) union all select 'line_id on next steps and wins (2 expected)', (select count(*)::text || ' of 2' from information_schema.columns where table_schema='public' and column_name='line_id' and table_name in ('pace_todos','pace_wins')) union all select 'project_id on the pace tables (4 expected)', (select count(*)::text || ' of 4' from information_schema.columns where table_schema='public' and column_name='project_id' and table_name in ('pace_ppm','pace_todos','pace_wins','pace_snapshots')) union all select 'project-scoped RLS (4 expected)', (select count(*)::text || ' of 4' from pg_policies where schemaname='public' and policyname like 'project pace%') union all select 'membership functions (2 expected)', (select count(*)::text || ' of 2' from pg_proc where proname in ('is_project_owner','is_project_member')) union all select 'late-joiner trigger', case when exists (select 1 from pg_trigger where tgname='faultline_project_member_added') then 'installed' else 'MISSING' end;


-- ---------------------------- OPTIONAL --------------------------------------
-- Live updates between devices. Interval sync works without it, so if this line
-- complains that the table is already a member of the publication, that is not
-- a problem: it means it is already on.
--
--   alter publication supabase_realtime add table public.projects;
-- ============================================================================
