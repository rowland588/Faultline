-- PIN_PROJECT_MACHINES.sql — a project's machines and programs carry their line.
--
-- Why (23 October, step 0 of the combined line report — "you should be able to
-- do a combined report as long as everything is associated to that line"):
-- a project's machine or program made with no line of its own stands on the
-- project's only factory line (lib/lineRecords lineOfMachine, lineOfProgram).
-- Read on the live database that day, project "Line 2 A"'s two machines
-- (Destaker, Pick and Place), its three programs and their 39 tests reached
-- Line 2a only that way. The day that project is given a second line, or its
-- one is taken off, they would stand on no line and drop out of Line 2a's
-- pages and papers without a word. So each is given the line it stands on now.
-- The app does the same from here, before a project's lines change
-- (lib/lines pinToProjectLine).
--
-- Only rows with no line of their own, on a project with exactly one factory
-- line, are touched; a program that names its project line (line_id) already
-- finds its factory line through it. Nothing else moves.
--
-- Run ONCE. Safe to re-run: the second run finds nothing left to pin.

with one_line as (
  select project_id, min(workspace_id) as ws
  from public.pace_ppm
  where deleted_at is null and workspace_id is not null
  group by project_id
  having count(distinct workspace_id) = 1
)
update public.commission_assets a
   set workspace_id = o.ws::uuid,
       updated_at = (extract(epoch from now()) * 1000)::bigint
  from one_line o
 where a.project_id = o.project_id
   and a.workspace_id is null
   and a.deleted_at is null;

with one_line as (
  select project_id, min(workspace_id) as ws
  from public.pace_ppm
  where deleted_at is null and workspace_id is not null
  group by project_id
  having count(distinct workspace_id) = 1
)
update public.programs p
   set workspace_id = o.ws::uuid,
       updated_at = (extract(epoch from now()) * 1000)::bigint
  from one_line o
 where p.project_id = o.project_id
   and p.workspace_id is null
   and p.line_id is null
   and p.deleted_at is null;

-- What it did: every live machine and program, the line it now carries.
select 'machine' as kind, a.name, w.name as line
  from public.commission_assets a left join public.workspaces w on w.id = a.workspace_id
 where a.deleted_at is null
union all
select 'program', p.what, w.name
  from public.programs p left join public.workspaces w on w.id = p.workspace_id
 where p.deleted_at is null
order by 1, 2;
