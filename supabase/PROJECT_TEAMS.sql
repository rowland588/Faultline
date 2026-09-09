-- ============================================================================
-- FAULTLINE — PROJECT TEAMS. Run ONCE (SQL Editor → Run). Safe to re-run.
--
-- Project Pace was one person's management surface. It is now a PROJECT with
-- people in it: a lead who is accountable, lines each with an owner and a
-- sponsor, and anyone else invited to read it. This migration is what makes
-- that real on the server rather than only on one laptop.
--
-- Three things change:
--
--   1. `projects` becomes a real table, so a project syncs like everything else
--      instead of living only on the device that made it.
--   2. `project_members` says who is in a project, exactly the way
--      workspace_members says who is in a workspace.
--   3. The pace_* tables gain a project_id, and their RLS opens from
--      "yours alone" to "yours, or a project you are in".
--
-- Nothing is taken away. The old rule (owner_id = auth.uid()) stays as the
-- first half of every policy, so every row the user already has stays theirs
-- and stays visible whether or not it has been given a project yet.
--
-- Depends on: PROJECT_PACE.sql (the pace_* tables) and WORKSPACE_TEAMS.sql
-- (public.is_super, and the pattern this follows).
-- ============================================================================

-- ---------- the project itself ----------
-- id is TEXT, not uuid: the project the app ships with has a fixed, readable id
-- ('project-pace') so that every one of the user's devices lands on the SAME
-- project rather than each minting its own. Same reasoning as the line ids.
create table if not exists public.projects (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Project',
  description text,
  color text not null default '#2b87d4',
  workspace_ids jsonb not null default '[]'::jsonb,
  lead text,                       -- the one person accountable, by name
  lead_email text,                 -- and, when they are in the app, by address
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);
create index if not exists idx_projects_owner on public.projects (owner_id);

-- ---------- who is in a project, one row per (project, email) ----------
-- `role` is a label, not a permission: everyone in a project sees the same
-- project. It says WHY someone is here, which is what the report prints.
create table if not exists public.project_members (
  project_id text not null references public.projects (id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('lead','sponsor','owner','member')),
  added_by   uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, email)
);
alter table public.project_members enable row level security;
alter table public.projects        enable row level security;

-- ---------- who's in the room? (security definer = no RLS recursion) ----------
create or replace function public.is_project_owner(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects x where x.id = p and x.owner_id = auth.uid())
$$;

create or replace function public.is_project_member(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select p is not null
     and (public.is_super()
       or public.is_project_owner(p)
       or exists (
            select 1 from public.project_members m
            where m.project_id = p
              and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
          ))
$$;

grant execute on function public.is_project_owner(text)  to authenticated;
grant execute on function public.is_project_member(text) to authenticated;

-- ---------- the projects table's own policies ----------
drop policy if exists "member projects select" on public.projects;
drop policy if exists "member projects insert" on public.projects;
drop policy if exists "member projects update" on public.projects;
drop policy if exists "member projects delete" on public.projects;
create policy "member projects select" on public.projects
  for select to authenticated using (public.is_project_member(id));
-- insert: you create projects you own; is_project_member covers upsert echoes
create policy "member projects insert" on public.projects
  for insert to authenticated with check (owner_id = auth.uid() or public.is_project_member(id));
create policy "member projects update" on public.projects
  for update to authenticated using (public.is_project_member(id)) with check (public.is_project_member(id));
create policy "member projects delete" on public.projects
  for delete to authenticated using (public.is_project_owner(id) or public.is_super());

-- ---------- the people list itself: members read, the owner manages ----------
drop policy if exists "project members read"   on public.project_members;
drop policy if exists "project members manage" on public.project_members;
create policy "project members read" on public.project_members
  for select to authenticated using (public.is_project_member(project_id));
create policy "project members manage" on public.project_members
  for all to authenticated
  using (public.is_project_owner(project_id) or public.is_super())
  with check (public.is_project_owner(project_id) or public.is_super());

-- ---------- the pace_* tables gain a project, and the lines gain people ----------
alter table public.pace_ppm       add column if not exists project_id text;
alter table public.pace_todos     add column if not exists project_id text;
alter table public.pace_wins      add column if not exists project_id text;
alter table public.pace_snapshots add column if not exists project_id text;

-- A line is now a thing with people against it and a workspace of its own.
-- `line_owner`, not `owner`: owner_id already means the auth user who wrote the
-- row, and two different meanings on one table is how bugs get written.
alter table public.pace_ppm add column if not exists line_owner       text;
alter table public.pace_ppm add column if not exists line_owner_email text;
alter table public.pace_ppm add column if not exists sponsor          text;
alter table public.pace_ppm add column if not exists sponsor_email    text;
alter table public.pace_ppm add column if not exists workspace_id     text;
alter table public.pace_ppm add column if not exists sort             integer not null default 0;
-- a removed line is a tombstone, so removing it on the laptop removes it on the
-- phone rather than the phone pushing it back
alter table public.pace_ppm add column if not exists deleted_at       bigint;

-- A next step or a win can belong to one LINE rather than the whole project:
-- that is what gives each line owner their own pack. NULL means it spans the
-- project, which is what everything logged before lines had packs of their own
-- reads as.
alter table public.pace_todos add column if not exists line_id text;
alter table public.pace_wins  add column if not exists line_id text;
create index if not exists idx_pace_todos_line on public.pace_todos (line_id);
create index if not exists idx_pace_wins_line  on public.pace_wins (line_id);

create index if not exists idx_pace_ppm_project       on public.pace_ppm (project_id);
create index if not exists idx_pace_todos_project     on public.pace_todos (project_id);
create index if not exists idx_pace_wins_project      on public.pace_wins (project_id);
create index if not exists idx_pace_snapshots_project on public.pace_snapshots (project_id);

-- Rows written before projects became plural belong to the project the app
-- shipped with. The app makes the same assumption locally, so this simply keeps
-- the two ends agreeing.
update public.pace_ppm       set project_id = 'project-pace' where project_id is null;
update public.pace_todos     set project_id = 'project-pace' where project_id is null;
update public.pace_wins      set project_id = 'project-pace' where project_id is null;
update public.pace_snapshots set project_id = 'project-pace' where project_id is null;

-- ---------- pace_* RLS: yours, OR a project you are in ----------
-- The first half is the rule these tables already had, kept exactly as it was:
-- nothing anyone owns stops being theirs. The second half is the new part.
do $$
declare t text;
begin
  foreach t in array array['pace_ppm','pace_todos','pace_snapshots','pace_wins'] loop
    execute format('drop policy if exists "own %s" on public.%I', t, t);
    execute format('drop policy if exists "project %s" on public.%I', t, t);
    execute format(
      'create policy "project %s" on public.%I for all to authenticated
         using (owner_id = auth.uid() or public.is_project_member(project_id))
         with check (owner_id = auth.uid() or public.is_project_member(project_id))', t, t);
  end loop;
end $$;

-- ---------- sync transport for projects: rev stamp + realtime ----------
do $$
begin
  execute 'alter table public.projects add column if not exists rev bigint';
  execute 'drop trigger if exists faultline_rev on public.projects';
  execute 'create trigger faultline_rev before insert or update on public.projects
             for each row execute function public.faultline_stamp_rev()';
  execute 'update public.projects set rev = nextval(''public.faultline_rev_seq'') where rev is null';
  execute 'create index if not exists idx_projects_rev on public.projects (rev)';
  begin
    execute 'alter publication supabase_realtime add table public.projects';
  exception
    when duplicate_object then null;
    when undefined_object then null; -- realtime disabled; interval sync still works
  end;
end $$;

-- ---------- late-joiner history: re-stamp revs when a member is added ----------
-- Devices pull by the server-assigned `rev` cursor, so somebody added to a
-- project today must have every row of it re-stamped above their cursor —
-- otherwise they join and see an empty project with months of work in it.
-- No-op updates fire faultline_rev; the values (and updated_at, which is what
-- LWW reads) are untouched.
create or replace function public.faultline_project_member_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.projects       set updated_at = updated_at where id = new.project_id;
  update public.pace_ppm       set updated_at = updated_at where project_id = new.project_id;
  update public.pace_todos     set updated_at = updated_at where project_id = new.project_id;
  update public.pace_wins      set updated_at = updated_at where project_id = new.project_id;
  update public.pace_snapshots set updated_at = updated_at where project_id = new.project_id;
  return new;
end $$;
drop trigger if exists faultline_project_member_added on public.project_members;
create trigger faultline_project_member_added
  after insert on public.project_members
  for each row execute function public.faultline_project_member_added();

-- ---------- report ----------
select 'projects table' as item,
       case when exists (select 1 from pg_tables where schemaname='public' and tablename='projects')
            then 'created ✓' else 'MISSING — rerun' end as value
union all
select 'project_members table',
       case when exists (select 1 from pg_tables where schemaname='public' and tablename='project_members')
            then 'created ✓' else 'MISSING — rerun' end
union all
select 'line columns on pace_ppm (7 expected)',
       (select count(*)::text || ' of 7 ✓' from information_schema.columns
         where table_schema='public' and table_name='pace_ppm'
           and column_name in ('project_id','line_owner','line_owner_email','sponsor','sponsor_email','workspace_id','sort'))
union all
select 'line_id on next steps and wins (2 expected)',
       (select count(*)::text || ' of 2 ✓' from information_schema.columns
         where table_schema='public' and column_name='line_id'
           and table_name in ('pace_todos','pace_wins'))
union all
select 'project_id on the pace tables (4 expected)',
       (select count(*)::text || ' of 4 ✓' from information_schema.columns
         where table_schema='public' and column_name='project_id'
           and table_name in ('pace_ppm','pace_todos','pace_wins','pace_snapshots'))
union all
select 'project-scoped RLS (4 expected)',
       (select count(*)::text || ' of 4 ✓' from pg_policies
         where schemaname='public' and policyname like 'project pace%')
union all
select 'membership functions (2 expected)',
       (select count(*)::text || ' of 2 ✓' from pg_proc
         where proname in ('is_project_owner','is_project_member'))
union all
select 'late-joiner trigger',
       case when exists (select 1 from pg_trigger where tgname='faultline_project_member_added')
            then 'installed ✓' else 'MISSING — rerun' end;
