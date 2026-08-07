-- ============================================================================
-- FAULTLINE — SYNC UPGRADE. Run ONCE on an existing project (SQL Editor → Run).
-- Safe to re-run. FRESH_START.sql already includes all of this for new projects.
--
-- What it fixes:
--  1. Adds a server-assigned `rev` (one global sequence, stamped by trigger) to
--     every synced table. Devices pull "rev > last seen" — pure server truth.
--     Before this, the pull cursor was the DEVICE'S OWN CLOCK compared against
--     rows stamped by OTHER devices' clocks: any skew between a phone and a
--     laptop made one silently skip the other's rows, forever. That is the
--     "my devices don't match until I press Full re-sync" bug.
--  2. Adds the synced tables to the realtime publication, so every signed-in
--     device is TOLD the moment another one pushes — sync becomes something
--     that happens, not something you do.
-- ============================================================================

create sequence if not exists public.faultline_rev_seq;

create or replace function public.faultline_stamp_rev()
returns trigger language plpgsql as $$
begin
  new.rev := nextval('public.faultline_rev_seq');
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['workspaces','observations','segments','snag_assets','snags'] loop
    execute format('alter table public.%I add column if not exists rev bigint', t);
    execute format('drop trigger if exists faultline_rev on public.%I', t);
    execute format('create trigger faultline_rev before insert or update on public.%I for each row execute function public.faultline_stamp_rev()', t);
    execute format('update public.%I set rev = nextval(''public.faultline_rev_seq'') where rev is null', t);
    execute format('create index if not exists idx_%s_rev on public.%I (rev)', t, t);
  end loop;
end $$;

-- Realtime: announce every change so other devices pull immediately.
do $$
declare t text;
begin
  foreach t in array array['workspaces','observations','segments','snag_assets','snags'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;  -- already in the publication
      when undefined_object then null;  -- realtime disabled on this project; interval sync still works
    end;
  end loop;
end $$;

-- ---------- report ----------
select 'rev on ' || table_name as item,
       case when count(*) = 1 then 'installed' else 'MISSING' end as value
from information_schema.columns
where table_schema = 'public' and column_name = 'rev'
  and table_name in ('workspaces','observations','segments','snag_assets','snags')
group by table_name
union all
select 'realtime: ' || tablename,
       'publishing'
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('workspaces','observations','segments','snag_assets','snags')
order by item;
