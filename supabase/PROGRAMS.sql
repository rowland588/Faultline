-- ============================================================================
-- FAULTLINE — WHAT THE MACHINE CAN RUN. Run ONCE. Safe to re-run.
--
-- Rowland's words: "programs on the machine, programs that we have that have
-- been validated… What programs do we have? What programs do we need? When are
-- we testing them?"
--
-- The materials table's twin, and deliberately shaped like it, because a line
-- waits on two kinds of thing and nobody should have to learn two pictures.
-- ONE idea differs: a film either turned up or it did not, but a program can
-- sit on the machine for a month with nobody willing to run production on it.
-- So `state` is three values, never a boolean:
--
--   needed     we need it, nobody has made it
--   onMachine  it exists and can be selected; nobody has proved it works
--   proved     tested, passed, and DATED
--
-- `proved_on` is the fact. The app refuses to read `state = 'proved'` as more
-- than an opinion without it, the same way it refuses to invent a landing date
-- for a material that is simply "in stock".
--
-- NOT A PROGRAM STORE: no version numbers, no parameter lists, no approval
-- signatures, no record of who last edited it on the HMI. The machine and its
-- own software own all of that, a copy here would be wrong inside a week, and
-- none of it answers the one question a project asks.
-- ============================================================================

create table if not exists public.programs (
  id          text primary key,
  owner_id    uuid not null default auth.uid(),
  project_id  text not null,
  -- What it is: the name or number on the machine. The only field that must be
  -- filled in.
  what        text not null,
  -- What it runs — the product or film. Text, not a foreign key to materials:
  -- a program is often written before the film has a row, and a link that
  -- cannot be made yet would stop the row being typed at all.
  runs        text,
  -- Which machine, when it is for one. Nullable: absent means the line itself,
  -- the same rule tests use.
  asset_id    text,
  line_id     text,
  -- needed | onMachine | proved. Checked, because a fourth value would reach
  -- every device before anybody noticed, and the grid's colours are the whole
  -- point of the screen.
  state       text not null default 'needed'
                check (state in ('needed', 'onMachine', 'proved')),
  -- ISO dates (yyyy-mm-dd), not timestamps: a test happens on a DAY, and a
  -- midnight in some zone shows in Manchester as the day before it ran.
  test_on     text,
  proved_on   text,
  -- The test that proved it, when there is one. Null means a person signed it
  -- off by hand — true of every program proved before this app existed, and
  -- the screen says which rather than implying a test nobody ran.
  test_id     text,
  -- Who owes it to us. `supplier`, not `from`: FROM is a reserved word, and it
  -- matches the column materials already uses.
  supplier    text,
  note        text,
  sort        integer not null default 0,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

create index if not exists programs_project_idx on public.programs (project_id);
create index if not exists programs_owner_idx   on public.programs (owner_id);
create index if not exists programs_test_idx    on public.programs (project_id, test_on);

-- ---------- sync transport: the rev stamp ----------
--
-- Not optional. Devices pull with "rev > the last rev I saw", and a table
-- WITHOUT this column answers that query with 42703 — the app isolates that to
-- the one table rather than degrading every other table's cursor, but this
-- table would then simply never sync.

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
  foreach t in array array['programs'] loop
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
