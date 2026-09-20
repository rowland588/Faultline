-- ============================================================================
-- FAULTLINE — WHAT A BUSINESS MEASURES. Run ONCE. Safe to re-run.
--
-- This app was built for one factory and the schema said so: a line row carried
-- q1, q2, q3, q4 and a weekly array indexed from one fixed Monday, and every one
-- of those numbers was packs per minute. Four quarters, one measure, one shape
-- of spreadsheet feeding them. A bakery counting cases per hour, a pharma line
-- on first-pass yield, anybody running four-week periods rather than quarters —
-- none of them had anywhere to put a number.
--
-- So the business supplies the words:
--
--   a MEASURE is a name, a unit and which way is good
--   a PERIOD is a name and two dates
--   a TARGET is one line, one measure, one period, one number
--   a READING is one line, one measure, one date, one number
--
-- Measures and periods ride on the PROJECT row rather than tables of their own:
-- they are small lists, owned entirely by the project, edited rarely and always
-- read with it. Targets and readings are the volume, so they get tables.
-- ============================================================================

alter table public.projects add column if not exists measures jsonb;
alter table public.projects add column if not exists periods  jsonb;

create table if not exists public.targets (
  id          text primary key,
  owner_id    uuid not null default auth.uid(),
  project_id  text not null,
  line_id     text not null,
  measure_id  text not null,
  period_id   text not null,
  value       numeric not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

create index if not exists targets_project_idx on public.targets (project_id);
create index if not exists targets_owner_idx   on public.targets (owner_id);
create index if not exists targets_line_idx    on public.targets (line_id);

create table if not exists public.readings (
  id          text primary key,
  owner_id    uuid not null default auth.uid(),
  project_id  text not null,
  line_id     text not null,
  measure_id  text not null,
  -- An ISO date (yyyy-mm-dd), not a timestamp: a reading is taken on a DAY, and
  -- a midnight in some zone shows in Manchester as the day before it was taken.
  at          text not null,
  value       numeric not null,
  note        text,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

create index if not exists readings_project_idx on public.readings (project_id);
create index if not exists readings_owner_idx   on public.readings (owner_id);
create index if not exists readings_line_idx    on public.readings (line_id, measure_id, at);

-- ---------- sync transport: the rev stamp ----------
--
-- Not optional. Devices pull with "rev > the last rev I saw", and a table
-- WITHOUT this column answers that query with 42703 — which the app reads as
-- "this cloud is too old for rev cursors", degrading the pull for EVERY table
-- for the rest of the session.

create sequence if not exists public.faultline_rev_seq;

create or replace function public.faultline_stamp_rev() returns trigger language plpgsql
set search_path = ''
as $stamp$
begin
  new.rev := nextval('public.faultline_rev_seq');
  return new;
end $stamp$;

do $rev$
declare t text;
begin
  foreach t in array array['targets', 'readings'] loop
    execute format('alter table public.%I add column if not exists rev bigint', t);
    execute format('drop trigger if exists faultline_rev on public.%I', t);
    execute format('create trigger faultline_rev before insert or update on public.%I
                    for each row execute function public.faultline_stamp_rev()', t);
    -- A null rev is never greater than a cursor, so a row written by an earlier
    -- run would be invisible to every pull until somebody happened to edit it.
    execute format('update public.%I set rev = nextval(''public.faultline_rev_seq'') where rev is null', t);
    execute format('create index if not exists idx_%I_rev on public.%I (rev)', t, t);

    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "project %s" on public.%I', t, t);
    if exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
               where ns.nspname = 'public' and p.proname = 'is_project_member') then
      execute format('create policy "project %s" on public.%I for all to authenticated
                      using (owner_id = (select auth.uid()) or (select public.is_project_member(project_id)))
                      with check (owner_id = (select auth.uid()) or (select public.is_project_member(project_id)))', t, t);
    else
      execute format('create policy "project %s" on public.%I for all to authenticated
                      using (owner_id = (select auth.uid()))
                      with check (owner_id = (select auth.uid()))', t, t);
    end if;
  end loop;
end $rev$;

-- CHECK: expect three rows reading ready ✓.
select 'projects measures/periods' as item,
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'projects'
                    and column_name in ('measures','periods')) = 2
            then 'ready ✓' else 'MISSING — rerun' end as value
union all
select 'targets',
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'targets'
                    and column_name in ('line_id','measure_id','period_id','value','rev')) = 5
             and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'targets')
            then 'ready ✓' else 'MISSING — rerun' end
union all
select 'readings',
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'readings'
                    and column_name in ('line_id','measure_id','at','value','rev')) = 5
             and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'readings')
            then 'ready ✓' else 'MISSING — rerun' end;
