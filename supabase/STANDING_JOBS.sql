-- ============================================================================
-- STANDING JOBS (G7, 23 November 2026 — docs/LUNA-AGENT.md). Run ONCE. Safe to re-run.
--
-- A standing job belongs to a customer: schedule weekly or daily, scope jsonb, template prompt for when G6 runs full job machinery.
-- Runs store the code-worked digest on the device (and sync). Until G6, the edge scheduler only marks the schedule — digest is built
-- on the device (docs/LUNA-G6-SERVER.md).
-- ============================================================================

create or replace function public.is_client_reachable(c text)
returns boolean language sql stable security definer set search_path = public as $$
  select c is not null and btrim(c) <> '' and exists (
    select 1 from public.workspaces w
    where w.deleted_at is null
      and lower(btrim(coalesce(w.client_name, ''))) = lower(btrim(c))
      and public.is_ws_member(w.id)
  );
$$;
grant execute on function public.is_client_reachable(text) to authenticated;

create table if not exists public.standing_jobs (
  id                text primary key,
  owner_id          uuid not null default auth.uid(),
  client            text not null,
  kind              text not null default 'weekly_digest',
  schedule          text not null default 'weekly' check (schedule in ('weekly', 'daily')),
  weekday           smallint not null default 1 check (weekday between 1 and 7),
  enabled           boolean not null default true,
  template_prompt   text,
  scope             jsonb not null default '{"picture":true,"files":true,"problems":true,"variance":true}'::jsonb,
  last_run_at       bigint,
  last_period_key   text,
  created_at        bigint not null,
  updated_at        bigint not null,
  deleted_at        bigint
);

create table if not exists public.standing_job_runs (
  id            text primary key,
  owner_id      uuid not null default auth.uid(),
  job_id        text not null references public.standing_jobs (id) on delete restrict,
  client        text not null,
  period_key    text not null,
  at            bigint not null,
  title         text not null default '',
  digest        text not null default '',
  sections      jsonb not null default '[]'::jsonb,
  created_at    bigint not null,
  updated_at    bigint not null,
  deleted_at    bigint
);

create index if not exists standing_jobs_client_idx on public.standing_jobs (client) where deleted_at is null;
create index if not exists standing_job_runs_job_idx on public.standing_job_runs (job_id);

alter table public.standing_jobs add column if not exists rev bigint;
alter table public.standing_job_runs add column if not exists rev bigint;

create sequence if not exists public.faultline_rev_seq;
create or replace function public.faultline_stamp_rev() returns trigger language plpgsql as $stamp$
begin new.rev := nextval('public.faultline_rev_seq'); return new; end $stamp$;

drop trigger if exists faultline_rev on public.standing_jobs;
create trigger faultline_rev before insert or update on public.standing_jobs for each row execute function public.faultline_stamp_rev();
drop trigger if exists faultline_rev on public.standing_job_runs;
create trigger faultline_rev before insert or update on public.standing_job_runs for each row execute function public.faultline_stamp_rev();

update public.standing_jobs set rev = nextval('public.faultline_rev_seq') where rev is null;
update public.standing_job_runs set rev = nextval('public.faultline_rev_seq') where rev is null;

create index if not exists idx_standing_jobs_rev on public.standing_jobs (rev);
create index if not exists idx_standing_job_runs_rev on public.standing_job_runs (rev);

create table if not exists public.standing_job_keys (
  id         int primary key check (id = 1),
  cron_key   text not null
);
insert into public.standing_job_keys (id, cron_key) values (1, 'SET-ME') on conflict (id) do nothing;

do $p$ begin
  alter publication supabase_realtime add table public.standing_jobs;
  alter publication supabase_realtime add table public.standing_job_runs;
exception when duplicate_object then null; when undefined_object then null; end $p$;

alter table public.standing_jobs enable row level security;
alter table public.standing_job_runs enable row level security;

drop policy if exists "standing jobs read" on public.standing_jobs;
create policy "standing jobs read" on public.standing_jobs for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_client_reachable(client));

drop policy if exists "standing jobs write" on public.standing_jobs;
create policy "standing jobs write" on public.standing_jobs for all to authenticated
  using (owner_id = (select auth.uid()) or public.is_client_reachable(client))
  with check (owner_id = (select auth.uid()) and public.is_client_reachable(client));

drop policy if exists "standing job runs read" on public.standing_job_runs;
create policy "standing job runs read" on public.standing_job_runs for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_client_reachable(client));

drop policy if exists "standing job runs write" on public.standing_job_runs;
create policy "standing job runs write" on public.standing_job_runs for all to authenticated
  using (owner_id = (select auth.uid()) or public.is_client_reachable(client))
  with check (owner_id = (select auth.uid()) and public.is_client_reachable(client));

-- Monday 07:00 Europe/London — stub tick; digest is built on device until G6
do $cron$ begin
  if not exists (select 1 from cron.job where jobname = 'faultline-standing-jobs') then
    perform cron.schedule(
      'faultline-standing-jobs',
      '0 7 * * 1',
      $job$select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1) || '/functions/v1/standing-job',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-standing-key', (select cron_key from public.standing_job_keys where id = 1)
        ),
        body := '{"mode":"tick"}'::jsonb
      ) as request_id;$job$
    );
  end if;
exception when undefined_table or undefined_function then null; end $cron$;

select 'standing_jobs', (select count(*) from information_schema.tables where table_schema='public' and table_name='standing_jobs')
union all select 'standing_job_runs', (select count(*) from information_schema.tables where table_schema='public' and table_name='standing_job_runs')
union all select 'is_client_reachable', (select count(*) from pg_proc where proname = 'is_client_reachable');