-- Commissioning: a line being handed over by an OEM, tracked on readiness.
--
-- One new table and one new flag. Both additive, both safe to run twice.
--
-- Unlike the tracker, NOTHING here is read from a workbook: a commissioning job
-- has no system of record until somebody makes one, so the app is it. That is
-- why this table holds real fields rather than a blob — the rows are edited from
-- two devices in the same week and last-writer-wins on a whole document would
-- lose somebody's afternoon.

alter table if exists public.projects
  add column if not exists commissioning boolean not null default false;

create table if not exists public.commission_items (
  id          text primary key,
  owner_id    uuid not null default auth.uid(),
  project_id  text not null,

  -- the workstream: Programs, Film & materials, SAT & acceptance...
  stream      text not null default '',
  -- check (must be proven) | supply (need a quantity) | task (somebody does it)
  kind        text not null default 'task',
  title       text not null default '',

  -- what good looks like, and what actually happened
  target      text,
  result      text,

  -- a check's progression: none | have | testing | passed | failed
  stage       text,
  -- a task's: todo | doing | waiting | done
  task_stage  text,

  -- a supply's arithmetic
  need        numeric,
  have        numeric,
  on_order    numeric,
  due_in      text,

  owner       text,
  due         text,
  note        text,
  -- Pictures attached to this item: an array of lightweight MediaRefs, never
  -- the images themselves. The blobs go to storage by the same route the line
  -- walk's evidence does; what lives here is only which ones belong to this row.
  photos      jsonb,
  sort        bigint not null default 0,

  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

-- For a database that already ran an earlier cut of this file, before items
-- could carry pictures. Additive and safe on a table that already has it.
alter table if exists public.commission_items
  add column if not exists photos jsonb;

create index if not exists commission_items_project_idx
  on public.commission_items (project_id);
create index if not exists commission_items_owner_idx
  on public.commission_items (owner_id);

alter table public.commission_items enable row level security;

-- Same rule the rest of the app runs on: you see and change your own rows.
-- Written as drop-then-create so re-running this file cannot fail on a policy
-- that is already there.
drop policy if exists commission_items_own on public.commission_items;
create policy commission_items_own on public.commission_items
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
