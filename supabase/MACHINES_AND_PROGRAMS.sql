-- ============================================================================
-- FAULTLINE — MACHINES AND PROGRAMS ON THE LINE (docs/BLUEPRINT.md, Stage 2).
-- Run ONCE. Safe to re-run.
--
-- Rowland, 13 October: "programs should be able to pick programs from the
-- control room and plan a program for a line rather than open up a full
-- project system." A running line gets new programs too, with no project.
--
-- No new table. A machine (public.commission_assets) and a program
-- (public.programs) now also:
--   workspace_id  belongs to a LINE, as a line standard and a problem do
--   project_id    is optional — the job that brought it in, or none
-- One of the two must be set. The LINE_TOOLS.sql pattern, as line standards:
--
--   who may read and write a row on a line with no job — everyone on the line
--   ("line programs" / "line machines", permissive, beside the job's rule);
--   a row with a job keeps the job's rules: line members READ it (the line's
--   page lists every program on its machines) and only the job's editors
--   write it (the RESTRICTIVE "editors only insert/update" rules, which gain
--   the line's clause only for a row with no job).
--
-- faultline_keep_agreement already lets a row with no job through (pid is
-- null), so a line's program or machine has no agreed fields to keep — the
-- same as a line standard. A job's row keeps them.
--
-- Backfill: a program whose job line (line_id → pace_ppm) is on a factory line
-- gets that line; any other row on a job that is on exactly one factory line
-- gets that one. Read 13 October: 17 programs and 7 machines, none on a job
-- with a factory line — so this moves nothing today, and stays for any
-- database restored from before. A job on several lines is asked on screen.
-- updated_at moves with it, so every device pulls the line it was given.
-- ============================================================================

alter table public.programs add column if not exists workspace_id uuid;
alter table public.programs alter column project_id drop not null;
alter table public.commission_assets add column if not exists workspace_id uuid;
alter table public.commission_assets alter column project_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'programs_on_a_line_or_a_job') then
    alter table public.programs add constraint programs_on_a_line_or_a_job
      check (project_id is not null or workspace_id is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'machines_on_a_line_or_a_job') then
    alter table public.commission_assets add constraint machines_on_a_line_or_a_job
      check (project_id is not null or workspace_id is not null);
  end if;
end $$;

create index if not exists programs_workspace_id_idx on public.programs (workspace_id) where workspace_id is not null;
create index if not exists commission_assets_workspace_id_idx on public.commission_assets (workspace_id) where workspace_id is not null;

-- THE LINE'S RULE, beside the job's (permissive policies are OR-ed).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'programs' and policyname = 'line programs') then
    create policy "line programs" on public.programs for all
      using (workspace_id is not null and (select public.is_ws_member(programs.workspace_id)))
      with check (workspace_id is not null and (select public.is_ws_member(programs.workspace_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'commission_assets' and policyname = 'line machines') then
    create policy "line machines" on public.commission_assets for all
      using (workspace_id is not null and (select public.is_ws_member(commission_assets.workspace_id)))
      with check (workspace_id is not null and (select public.is_ws_member(commission_assets.workspace_id)));
  end if;
end $$;

-- THE RESTRICTIVE WRITE RULES: a job's editors, the owner of a row with no
-- job (as before) — and now everyone on the line for a row with no job.
-- Dropped and made again whole, so a re-run leaves exactly this.
drop policy if exists "editors only insert" on public.programs;
create policy "editors only insert" on public.programs as restrictive for insert
  with check (public.is_project_editor(project_id)
    or (project_id is null and owner_id = (select auth.uid()))
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));
drop policy if exists "editors only update" on public.programs;
create policy "editors only update" on public.programs as restrictive for update
  using (public.is_project_editor(project_id)
    or (project_id is null and owner_id = (select auth.uid()))
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))))
  with check (public.is_project_editor(project_id)
    or (project_id is null and owner_id = (select auth.uid()))
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));

drop policy if exists "editors only insert" on public.commission_assets;
create policy "editors only insert" on public.commission_assets as restrictive for insert
  with check (public.is_project_editor(project_id)
    or (project_id is null and owner_id = (select auth.uid()))
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));
drop policy if exists "editors only update" on public.commission_assets;
create policy "editors only update" on public.commission_assets as restrictive for update
  using (public.is_project_editor(project_id)
    or (project_id is null and owner_id = (select auth.uid()))
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))))
  with check (public.is_project_editor(project_id)
    or (project_id is null and owner_id = (select auth.uid()))
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));

-- BACKFILL. pace_ppm.workspace_id is text; only a well-formed id is cast.
with job_line as (
  select project_id, min(workspace_id) as ws
  from public.pace_ppm
  where deleted_at is null and workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  group by project_id having count(distinct workspace_id) = 1
)
update public.programs p
set workspace_id = coalesce(
      (select l.workspace_id::uuid from public.pace_ppm l
        where l.id = p.line_id and l.workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
      (select j.ws::uuid from job_line j where j.project_id = p.project_id)),
    updated_at = greatest(p.updated_at + 1, (extract(epoch from now()) * 1000)::bigint)
where p.workspace_id is null and p.deleted_at is null
  and coalesce(
      (select l.workspace_id from public.pace_ppm l
        where l.id = p.line_id and l.workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
      (select j.ws from job_line j where j.project_id = p.project_id)) is not null;

with job_line as (
  select project_id, min(workspace_id) as ws
  from public.pace_ppm
  where deleted_at is null and workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  group by project_id having count(distinct workspace_id) = 1
)
update public.commission_assets a
set workspace_id = j.ws::uuid,
    updated_at = greatest(a.updated_at + 1, (extract(epoch from now()) * 1000)::bigint)
from job_line j
where j.project_id = a.project_id and a.workspace_id is null and a.deleted_at is null;

select table_name, column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public' and table_name in ('programs', 'commission_assets') and column_name in ('project_id', 'workspace_id')
order by table_name, column_name;
