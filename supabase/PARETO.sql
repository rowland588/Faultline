-- The Pareto: an opt-in surface per project, and the sheet each upload carried.
--
-- Two small columns, both additive and both safe to run twice.
--
-- projects.pareto  — the project's own choice, exactly like lever_tree. A tool
--                    some projects run on and most do not.
-- pace_snapshots.pareto — the Pareto sheet as THAT upload had it. Kept per
--                    upload rather than once per project because a Pareto run
--                    again during the work is evidence of movement, and
--                    evidence needs two readings to say anything.
--
-- Nothing here is destructive: existing rows get the defaults and no snapshot
-- loses anything. A device that has never seen a Pareto sheet simply syncs null.

alter table if exists public.projects
  add column if not exists pareto boolean not null default false;

alter table if exists public.pace_snapshots
  add column if not exists pareto jsonb;

-- Only the rows that actually carry one, so the index stays small on a table
-- where most uploads have no Pareto sheet at all.
create index if not exists pace_snapshots_pareto_idx
  on public.pace_snapshots ((pareto is not null))
  where pareto is not null;
