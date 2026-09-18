-- ============================================================================
-- FAULTLINE — THE TWO TABLES THAT WERE NEVER MIGRATED.
-- Run ONCE (SQL Editor → Run). Safe to re-run.
--
-- project_targets and project_actuals have been in the app's sync list and its
-- on-device database since the line pack was built, but NO migration ever
-- created them in Supabase. So every sync pass asked for them, got 42P01
-- "relation does not exist", and the app set schemaOutdated — which is why the
-- "your cloud needs upgrading" nudge never cleared. Targets and actuals stayed
-- on whichever device typed them and reached nothing else.
--
-- Derived from the app's own mapper (src/cloud/mappers.ts), column for column,
-- rather than from a guess at what the app might want.
--
-- TYPE CHOICES, so an insert cannot be rejected:
--   project_id   text  — projects.id is text, not uuid
--   workspace_id text  — matching pace_ppm, the closest analogue. A uuid string
--                        fits in text; a non-uuid string in a uuid column does
--                        not, and the app's workspaceId is a plain string.
--   owner_id     uuid, DEFAULT auth.uid() — these two mappers are the only ones
--                        that send no owner_id at all, so the default is not a
--                        convenience here, it is what makes the insert legal.
-- ============================================================================

create table if not exists public.project_targets (
  id            text primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id    text not null,
  workspace_id  text,
  line_variant  text,
  q1_target     numeric not null default 0,
  q2_target     numeric not null default 0,
  q3_target     numeric not null default 0,
  q4_target     numeric not null default 0,
  start_date    bigint not null default 0,
  created_at    bigint not null,
  updated_at    bigint not null,
  deleted_at    bigint,
  rev           bigint
);

create table if not exists public.project_actuals (
  id            text primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id    text not null,
  workspace_id  text,
  line_variant  text,
  -- "date" is a type name, not a reserved word, so it is a legal column name —
  -- quoted here so it reads as deliberate rather than as an accident.
  "date"        bigint not null default 0,
  actual_ppm    numeric not null default 0,
  created_at    bigint not null,
  updated_at    bigint not null,
  deleted_at    bigint,
  rev           bigint
);

create index if not exists idx_project_targets_project on public.project_targets (project_id);
create index if not exists idx_project_actuals_project on public.project_actuals (project_id);
create index if not exists idx_project_actuals_date    on public.project_actuals ("date");

-- ---------- sync transport ----------
create sequence if not exists public.faultline_rev_seq;

do $rev$
declare t text;
begin
  foreach t in array array['project_targets','project_actuals'] loop
    execute format('alter table public.%I add column if not exists rev bigint', t);
    execute format('drop trigger if exists faultline_rev on public.%I', t);
    execute format('create trigger faultline_rev before insert or update on public.%I for each row execute function public.faultline_stamp_rev()', t);
    -- a null rev is never greater than a pull cursor, so such a row would be
    -- invisible to every device until somebody happened to edit it
    execute format('update public.%I set rev = nextval(''public.faultline_rev_seq'') where rev is null', t);
    execute format('create index if not exists idx_%s_rev on public.%I (rev)', t, t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $rev$;

-- ---------- row level security ----------
-- Same rule as every other project table: your own rows, plus anything in a
-- project you have been invited into. auth.uid() is wrapped in (select ...) so
-- the planner evaluates it once per query instead of once per row.
do $rls$
declare t text; pred text;
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_project_member') then
    pred := 'owner_id = (select auth.uid()) or (select public.is_project_member(project_id))';
  else
    pred := 'owner_id = (select auth.uid())';
  end if;

  foreach t in array array['project_targets','project_actuals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "project %s" on public.%I', t, t);
    execute format('create policy "project %s" on public.%I for all to authenticated using (%s) with check (%s)', t, t, pred, pred);
  end loop;
end $rls$;

-- CHECK: expect two rows, both ready ✓
select t as item,
       case when exists (select 1 from information_schema.columns
                         where table_schema='public' and table_name=t and column_name='rev')
             and exists (select 1 from pg_trigger
                         where tgname='faultline_rev' and tgrelid=('public.'||t)::regclass and not tgisinternal)
             and exists (select 1 from pg_policies where schemaname='public' and tablename=t)
            then 'ready ✓' else 'MISSING — rerun' end as value
from unnest(array['project_targets','project_actuals']) t;
