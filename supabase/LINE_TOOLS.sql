-- ============================================================================
-- FAULTLINE — LINE BALANCE AND LINE MAP AS TOOLS ON A LINE. Run ONCE.
-- Safe to re-run.
--
-- Rowland, 7 October: "We also want the line balancing tool and the line
-- mapping tool to have the ability, much like the snags, so I can use them,
-- assign them to a line — they don't necessarily have to be part of a project,
-- but can then be attached to a project ... it needs to be versatile, not
-- everything belongs to a project, some things just need doing. It's a tool,
-- but can be attached." Several per line, one per product.
--
-- No new table. A line standard (public.standards) is already the map of a
-- line for one product. It now also:
--   workspace_id  belongs to a LINE (a line study), as a snag does
--   capacity      carries the line BALANCE for that product (the same
--                 document a 6M line's balance is: stations, speeds, units)
--   project_id    is optional — attached to a job, or not
-- One of the two must be set. Who may read and write it: anybody on the job it
-- is attached to (as before), or anybody on its line (as a snag), or its owner
-- — the job's rule is kept as it is and a line's rule is added beside it.
-- ============================================================================

alter table public.standards add column if not exists workspace_id uuid;
alter table public.standards add column if not exists capacity jsonb;
alter table public.standards alter column project_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'standards_on_a_line_or_a_job') then
    alter table public.standards add constraint standards_on_a_line_or_a_job
      check (project_id is not null or workspace_id is not null);
  end if;
end $$;

create index if not exists standards_workspace_id_idx on public.standards (workspace_id) where workspace_id is not null;

-- ADDED BESIDE the job's rule, nothing dropped: permissive policies are
-- OR-ed, so a line standard is open to its job's members (the existing
-- "project standards" rule) or to its line's members (this one).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'standards' and policyname = 'line standards') then
    create policy "line standards" on public.standards for all
      using (workspace_id is not null and (select public.is_ws_member(standards.workspace_id)))
      with check (workspace_id is not null and (select public.is_ws_member(standards.workspace_id)));
  end if;
end $$;

select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'standards' and column_name in ('project_id', 'workspace_id', 'capacity')
order by column_name;
