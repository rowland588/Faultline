-- ============================================================================
-- LUNA G6 job slice — parked jobs on the server (23 November 2026, docs/LUNA-G6-SERVER.md).
-- Run ONCE on the live project. Safe to re-run.
--
-- pg_cron calls supabase/functions/colleague-job every fifteen minutes. The device also kicks with the owner's JWT
-- on hand-off. Deadline is twelve hours from insert (client sets deadline_at). plan_job / job_step run on the server;
-- other capability calls wait on the device. Writes are never auto-approved (G5).
-- ============================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

create table if not exists public.luna_server_jobs (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  conversation_id text not null,
  thread_id       text not null,
  client          text not null default '',
  status          text not null check (status in ('queued', 'running', 'waiting_device', 'done', 'stopped', 'failed')),
  snapshot        jsonb not null default '{}'::jsonb,
  legs            int not null default 0 check (legs >= 0),
  max_legs        int not null default 4 check (max_legs > 0),
  deadline_at     timestamptz not null,
  started_at      timestamptz,
  finished_at     timestamptz,
  merged_at       timestamptz,
  last_error      text,
  pushed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.luna_server_jobs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'luna_server_jobs' and policyname = 'own luna_server_jobs') then
    create policy "own luna_server_jobs" on public.luna_server_jobs
      for all to authenticated
      using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
  end if;
end $$;

create index if not exists luna_server_jobs_worker_idx
  on public.luna_server_jobs (status, deadline_at)
  where status in ('queued', 'running');

create index if not exists luna_server_jobs_owner_open_idx
  on public.luna_server_jobs (owner_id)
  where merged_at is null;

do $c$ begin
  if not exists (select 1 from cron.job where jobname = 'faultline-luna-jobs') then
    perform cron.schedule(
      'faultline-luna-jobs', '*/15 * * * *',
      $job$
        select net.http_post(
          url     := 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/colleague-job',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'x-keepup-key', (select cron_key from public.push_keys where id = 1)),
          body    := '{}'::jsonb
        )
      $job$
    );
  end if;
end $c$;

select 'luna_server_jobs' as what, count(*)::text as value from public.luna_server_jobs
union all select 'cron colleague-job', coalesce((select schedule from cron.job where jobname = 'faultline-luna-jobs'), 'MISSING');