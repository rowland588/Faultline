-- ============================================================================
-- FAULTLINE — THE LINE STANDARD. Run ONCE. Safe to re-run.
--
-- Rowland: "line standard manning … take a picture, and then we'll have little
-- icons — pallets, human icons, boxes … when you're on this product, this is
-- where the people go, this is what they do."
--
-- One row per product: the picture of the line, and what is placed on it.
-- The marks are one jsonb list — { id, kind, x, y, label, task } — because
-- they are only ever read and written with their map. Headcount is counted
-- off the marks by the app, never stored.
-- ============================================================================

create table if not exists public.standards (
  id          text primary key,
  owner_id    uuid not null default auth.uid(),
  project_id  text not null,
  -- The product, in words: usually a program's name.
  product     text not null,
  -- The program it was picked from, when it was. Text, not a foreign key, the
  -- same rule programs keep for a test.
  program_id  text,
  -- The picture: a key into the media store, the same as a frame's still.
  photo_key   text,
  marks       jsonb not null default '[]'::jsonb,
  note        text,
  sort        bigint not null default 0,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

create index if not exists standards_project_idx on public.standards (project_id);
create index if not exists standards_owner_idx   on public.standards (owner_id);

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
  foreach t in array array['standards'] loop
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
