-- ============================================================================
-- FAULTLINE — WHAT THE JOB IS WAITING ON. Run ONCE. Safe to re-run.
--
-- The sheet this is: LINE 2 NEW PERFORATION PLAN. A row per film, a column
-- beside it saying either "In stock" or the date it is planned for, and the
-- weeks to the right of that date shaded green. Rowland's words: "these are the
-- films we require with dates of arrival, or green arrived… this list is used
-- as what we need as a business".
--
-- A material is three facts:
--   WHAT IT IS, WHEN IT IS DUE (or nothing — "no date agreed" is a real state),
--   and WHETHER IT IS HERE.
--
-- `here` is stored rather than read off `in_on`, because a sheet that says "In
-- stock" knows the thing is here and does not know when it landed, and an
-- invented landing date reads as a fact.
--
-- NOT A STOCK SYSTEM: no quantities that have to stay correct, no receipting,
-- no part-deliveries. `how_much` is free text for exactly that reason.
-- ============================================================================

create table if not exists public.materials (
  id          text primary key,
  owner_id    uuid not null default auth.uid(),
  project_id  text not null,
  what        text not null,
  how_much    text,
  -- The line it is for, when it is for one. Half of what a job waits on is not
  -- line-specific, so this is nullable on purpose.
  line_id     text,
  -- Who is bringing it. `supplier`, not `from`: FROM is a reserved word.
  supplier    text,
  -- ISO dates (yyyy-mm-dd), not timestamps: a delivery lands on a DAY, and a
  -- midnight in some zone shows in Manchester as the day before it arrived.
  due         text,
  here        boolean not null default false,
  in_on       text,
  note        text,
  sort        integer not null default 0,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

create index if not exists materials_project_idx on public.materials (project_id);
create index if not exists materials_owner_idx   on public.materials (owner_id);
create index if not exists materials_due_idx     on public.materials (project_id, due);

-- ---------- sync transport: the rev stamp ----------
--
-- Not optional. Devices pull with "rev > the last rev I saw", and a table
-- WITHOUT this column answers that query with 42703. The app now isolates that
-- to the one table rather than degrading every other table's cursor with it,
-- but this table would simply never sync.

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
  foreach t in array array['materials'] loop
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

-- CHECK: expect one row reading ready ✓.
select 'materials' as item,
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'materials'
                    and column_name in ('what','due','here','in_on','line_id','supplier','sort','rev')) = 8
             and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'materials')
            then 'ready ✓' else 'MISSING — rerun' end as value;
