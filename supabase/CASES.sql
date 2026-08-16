-- ============================================================================
-- FAULTLINE — CASES (the thin A3). Run ONCE (SQL Editor → Run). Re-runnable.
--
-- A Case is a folder with a number on it: a question, a saved drill scope, a
-- baseline captured from data when it opened, and a target. Everything else
-- about it derives live on the device — this table stores no analysis, no
-- charts, no copies. Actions link in via `snags.case_id` (soft — no FK, so a
-- deleted case never strands an action).
-- ============================================================================

create table if not exists public.cases (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  path jsonb not null default '[]'::jsonb,
  note text,
  baseline_ms_week bigint not null default 0,
  target_ms_week bigint,
  status text not null default 'open' check (status in ('open','closed')),
  opened_at bigint not null,
  closed_at bigint,
  updated_at bigint not null,
  deleted_at bigint
);
create index if not exists idx_cases_ws on public.cases (workspace_id);

-- the action → case link (soft, no FK)
alter table public.snags add column if not exists case_id uuid;

-- ---------- RLS: same membership rule as every workspace child ----------
alter table public.cases enable row level security;
do $$
begin
  execute 'create policy "member cases" on public.cases for all to authenticated
    using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id))';
exception when duplicate_object then null;
end $$;

-- ---------- sync transport: rev stamp + realtime, same as every table ----------
alter table public.cases add column if not exists rev bigint;
drop trigger if exists faultline_rev on public.cases;
create trigger faultline_rev before insert or update on public.cases
  for each row execute function public.faultline_stamp_rev();
update public.cases set rev = nextval('public.faultline_rev_seq') where rev is null;
create index if not exists idx_cases_rev on public.cases (rev);

do $$
begin
  execute 'alter publication supabase_realtime add table public.cases';
exception
  when duplicate_object then null;
  when undefined_object then null; -- realtime disabled; interval sync still works
end $$;

-- ---------- late joiners get cases too (extend the member-added backfill) ----------
create or replace function public.faultline_member_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.workspaces   set updated_at = updated_at where id = new.workspace_id;
  update public.observations set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.segments     set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.snag_assets  set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.snags        set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.cases        set updated_at = updated_at where workspace_id = new.workspace_id;
  return new;
end $$;

-- ---------- report ----------
select 'cases table' as item,
       case when exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'cases') then 'created ✓' else 'MISSING — rerun' end as value
union all
select 'cases.rev + trigger',
       case when exists (select 1 from pg_trigger where tgname = 'faultline_rev' and tgrelid = 'public.cases'::regclass) then 'stamped ✓' else 'MISSING — rerun' end
union all
select 'snags.case_id',
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'snags' and column_name = 'case_id') then 'added ✓' else 'MISSING — rerun' end
union all
select 'cases RLS',
       case when exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cases') then 'member-scoped ✓' else 'MISSING — rerun' end;
