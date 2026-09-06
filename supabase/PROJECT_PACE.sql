-- ============================================================================
-- FAULTLINE — PROJECT PACE sync. Run ONCE (SQL Editor → Run). Re-runnable.
--
-- Four things typed in the app rather than read from the workbook, so that the
-- ppm numbers can be entered on a laptop and presented from a phone:
--
--   pace_ppm        one row per line — quarterly targets and the weekly readings
--   pace_todos      Next steps: what / where / why / who / when
--   pace_wins       Success log: what was done and what worked
--   pace_snapshots  each uploaded tracker workbook, parsed
--
-- These are PER USER, not workspace children. Project Pace is one person's
-- management surface, so the rule is owner_id = auth.uid() rather than the
-- membership check the workspace tables use. Nobody else's rows are visible and
-- nobody else can write yours.
--
-- ids are TEXT, not uuid: they come from more than one generator (crypto uuids
-- for todos and ppm rows, older prefixed ids for snapshots that already exist on
-- devices) and a format mismatch would fail the insert and stall the whole sync
-- pass. Text costs nothing here and removes that failure.
--
-- The array columns are jsonb held whole. A snapshot's actions and a line's
-- weekly readings are read and written as one document and never queried into,
-- so splitting them into rows would buy nothing and cost a join. NULL inside
-- `weekly` is meaningful — a week that was never measured, which is not zero.
-- ============================================================================

-- ---------- the ppm numbers ----------
create table if not exists public.pace_ppm (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  line_key text not null,          -- '2A', '2B', '7', '10' — the human name
  name text not null,
  variant text,
  q1 numeric not null default 0,
  q2 numeric not null default 0,
  q3 numeric not null default 0,
  q4 numeric not null default 0,
  weekly jsonb not null default '[]'::jsonb,
  updated_at bigint not null,
  deleted_at bigint
);
create index if not exists idx_pace_ppm_owner on public.pace_ppm (owner_id);

-- ---------- next steps ----------
-- `where` and `when` are reserved words in SQL, hence the _at suffixes; the app
-- maps them back to where/when on the way in and out.
create table if not exists public.pace_todos (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  what text not null default '',
  where_at text not null default '',
  why text not null default '',
  who text not null default '',
  when_at text not null default '',
  state text not null default 'todo' check (state in ('todo','waiting','done')),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);
create index if not exists idx_pace_todos_owner on public.pace_todos (owner_id);

-- ---------- the success log ----------
-- What was done and what worked — the wins to show the team. `where` is a
-- reserved word, hence where_at; the app maps it back to where on the way in
-- and out, the same as the todos.
create table if not exists public.pace_wins (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  story text not null default '',
  where_at text not null default '',
  who text not null default '',
  impact text not null default '',
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);
create index if not exists idx_pace_wins_owner on public.pace_wins (owner_id);

-- ---------- uploaded tracker workbooks ----------
create table if not exists public.pace_snapshots (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  taken_at bigint not null,
  file_name text not null default 'upload',
  actions jsonb not null default '[]'::jsonb,
  roster jsonb,
  deleted_at bigint
);
create index if not exists idx_pace_snapshots_owner on public.pace_snapshots (owner_id);
-- the sync engine sorts on updated_at for every kind; a snapshot is never
-- edited, so it simply mirrors when it was taken.
alter table public.pace_snapshots add column if not exists updated_at bigint;
update public.pace_snapshots set updated_at = taken_at where updated_at is null;
alter table public.pace_snapshots alter column updated_at set default 0;

-- ---------- RLS: yours and only yours ----------
do $$
declare t text;
begin
  foreach t in array array['pace_ppm','pace_todos','pace_snapshots','pace_wins'] loop
    execute format('alter table public.%I enable row level security', t);
    begin
      execute format(
        'create policy "own %s" on public.%I for all to authenticated
           using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- sync transport: rev stamp + realtime, same as every table ----------
do $$
declare t text;
begin
  foreach t in array array['pace_ppm','pace_todos','pace_snapshots','pace_wins'] loop
    execute format('alter table public.%I add column if not exists rev bigint', t);
    execute format('drop trigger if exists faultline_rev on public.%I', t);
    execute format('create trigger faultline_rev before insert or update on public.%I
      for each row execute function public.faultline_stamp_rev()', t);
    execute format('update public.%I set rev = nextval(''public.faultline_rev_seq'') where rev is null', t);
    execute format('create index if not exists idx_%s_rev on public.%I (rev)', t, t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null; -- realtime disabled; interval sync still works
    end;
  end loop;
end $$;

-- ---------- report ----------
select 'pace_ppm' as item,
       case when exists (select 1 from pg_tables where schemaname='public' and tablename='pace_ppm') then 'created ✓' else 'MISSING — rerun' end as value
union all
select 'pace_todos',
       case when exists (select 1 from pg_tables where schemaname='public' and tablename='pace_todos') then 'created ✓' else 'MISSING — rerun' end
union all
select 'pace_snapshots',
       case when exists (select 1 from pg_tables where schemaname='public' and tablename='pace_snapshots') then 'created ✓' else 'MISSING — rerun' end
union all
select 'pace_wins',
       case when exists (select 1 from pg_tables where schemaname='public' and tablename='pace_wins') then 'created ✓' else 'MISSING — rerun' end
union all
select 'rev triggers (4 expected)',
       (select count(*)::text || ' of 4 ✓' from pg_trigger
         where tgname = 'faultline_rev'
           and tgrelid in ('public.pace_ppm'::regclass,'public.pace_todos'::regclass,'public.pace_snapshots'::regclass,'public.pace_wins'::regclass))
union all
select 'owner-scoped RLS (4 expected)',
       (select count(*)::text || ' of 4 ✓' from pg_policies
         where schemaname='public' and tablename in ('pace_ppm','pace_todos','pace_snapshots','pace_wins'));
