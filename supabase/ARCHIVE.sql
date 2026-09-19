-- ============================================================================
-- FAULTLINE — ARCHIVING A PROJECT. Run ONCE. Safe to re-run.
--
-- One column. A project that is finished should be able to leave the list
-- without anybody deciding whether they will ever want its handover file
-- again — because when the only option on offer is DELETE, nobody takes it,
-- and the list fills with dead projects that everybody scrolls past.
--
-- Archiving is reversible and loses nothing. Deleting is a separate act,
-- reachable only from the archive, and it takes the project's whole file with
-- it — which is why it is not one control with the other.
--
-- Nothing is dropped and nothing is rewritten: a project that has never been
-- archived has archived_at null, which is exactly what it means.
-- ============================================================================

alter table public.projects add column if not exists archived_at bigint;

-- The list reads "everything not archived", every time it is drawn.
create index if not exists idx_projects_archived
  on public.projects (owner_id)
  where archived_at is null;

-- CHECK: expect one row reading ready ✓
select 'projects.archived_at' as item,
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'projects'
                           and column_name = 'archived_at')
            then 'ready ✓' else 'MISSING — rerun' end as value;
