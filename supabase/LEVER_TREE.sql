-- ============================================================================
-- FAULTLINE — THE LEVER TREE. Run ONCE (SQL Editor → Run). Safe to re-run.
--
-- One table, because the tree is one kind of node nested by parent_id. Four
-- named levels would have needed a migration the first time a fifth was wanted,
-- and the whole point of a tree you draw yourself is that its shape is yours.
--
-- id is TEXT to match the app's other project tables — the ids come from more
-- than one generator and a uuid column would fail the insert and stall the
-- sync pass for everything behind it.
--
-- One statement per line. Nothing wrapped, nothing on a line by itself.
-- ============================================================================

create table if not exists public.tree_nodes (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id text not null,
  parent_id text,
  text text not null default '',
  rag text not null default 'n',
  sort double precision not null default 0,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create index if not exists idx_tree_nodes_project on public.tree_nodes (project_id);

create index if not exists idx_tree_nodes_parent on public.tree_nodes (parent_id);

alter table public.tree_nodes add column if not exists rev bigint;

alter table public.tree_nodes enable row level security;

-- Visible to whoever owns the row, and to anyone invited into its project.
drop policy if exists "project tree_nodes" on public.tree_nodes;

create policy "project tree_nodes" on public.tree_nodes for all to authenticated using (owner_id = auth.uid() or public.is_project_member(project_id)) with check (owner_id = auth.uid() or public.is_project_member(project_id));

-- The rev stamp, so devices can pull "everything newer than I have seen".
drop trigger if exists faultline_rev on public.tree_nodes;

create trigger faultline_rev before insert or update on public.tree_nodes for each row execute function public.faultline_stamp_rev();

-- CHECK: expect one row saying ready ✓
select 'tree_nodes' as item, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tree_nodes' and column_name = 'rev') and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tree_nodes') then 'ready ✓' else 'MISSING — rerun' end as value;
