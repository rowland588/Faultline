-- ============================================================================
-- FAULTLINE — THE PERFORMANCE RUN, IN NUMBERS. Run ONCE. Safe to re-run.
--
-- Rowland, 7 October: "Commissioning ... performance run at the agreed rate —
-- the UI is poor. It needs to be product running, rate achieved, rejects ...
-- this is my time of acceptance, high focus on this section. People ask how
-- fast did we run, what did we net — speed, packs per minute — issues,
-- status."
--
-- Two more things a test (public.tests) can hold, both small json objects:
--   run_agreed  what the run is judged on, agreed before the day:
--               { rate: packs a minute, minutes: how long, rejectsMax: % }
--               An AGREED field — once written, only the project's owner
--               changes it, as a written "passes if" (ACCESS_LEVELS.sql).
--   run         what the day did: { minutes, packs, rejects, speed, stops }
--               — the net rate and the reject % are worked out from these in
--               the app (lib/run), never typed, so they cannot disagree.
-- ============================================================================

alter table public.tests add column if not exists run_agreed jsonb;
alter table public.tests add column if not exists run jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tests_run_agreed_object') then
    alter table public.tests add constraint tests_run_agreed_object
      check (run_agreed is null or jsonb_typeof(run_agreed) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tests_run_object') then
    alter table public.tests add constraint tests_run_object
      check (run is null or jsonb_typeof(run) = 'object');
  end if;
end $$;

-- The agreed numbers stay with the owner, as a written "passes if" does: a
-- team member may write them the first time, never change them after.
create or replace function public.faultline_keep_agreement()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare pid text;
begin
  if tg_table_name = 'projects' then pid := old.id; else pid := old.project_id; end if;
  if pid is null or public.is_super() or public.is_project_owner(pid) then
    return new;
  end if;
  new.deleted_at := old.deleted_at;
  if tg_table_name = 'projects' then
    new.archived_at     := old.archived_at;
    new.planned_at      := old.planned_at;
    new.expected_at     := old.expected_at;
    new.install_stages  := old.install_stages;
    new.gate_stages     := old.gate_stages;
    new.commissioning   := old.commissioning;
    new.lever_tree      := old.lever_tree;
    new.owner_id        := old.owner_id;
  elsif tg_table_name = 'tests' then
    if coalesce(old.passes_if, '') <> '' then new.passes_if := old.passes_if; end if;
    if old.run_agreed is not null and old.run_agreed <> '{}'::jsonb then new.run_agreed := old.run_agreed; end if;
  elsif tg_table_name = 'cases' then
    new.status    := old.status;
    new.closed_at := old.closed_at;
  end if;
  return new;
end $function$;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'tests' and column_name in ('run_agreed', 'run')
order by column_name;
