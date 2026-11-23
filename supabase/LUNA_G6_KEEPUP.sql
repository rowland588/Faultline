-- ============================================================================
-- LUNA G6 — linked files polled while the app is shut (23 November 2026, docs/LUNA-G6-SERVER.md G2 remainder).
-- Run ONCE on the live project. Safe to re-run.
--
-- pg_cron calls supabase/functions/keepup every hour. The worker fetches each due link (same rules as colleague/keepUp),
-- compares SHA-256 to the hash on the newest source record, writes luna_server_news and pushes to the owner's devices.
-- No AI, no write-back to business systems, archived customers skipped.
-- ============================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

-- ---------- when each linked file was last checked in the cloud ----------
create table if not exists public.luna_link_checks (
  file_key   text primary key,
  checked_at timestamptz not null default now(),
  last_hash  text not null default ''
);
alter table public.luna_link_checks enable row level security;
-- no policies: only the service role (keepup worker) reads or writes

-- ---------- what changed while the app was shut ----------
create table if not exists public.luna_server_news (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  source_id   text not null,
  file_key    text not null,
  client      text not null default '',
  file_name   text not null default '',
  old_hash    text not null,
  new_hash    text not null,
  detected_at timestamptz not null default now(),
  pushed_at   timestamptz,
  acked_at    timestamptz
);
alter table public.luna_server_news enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'luna_server_news' and policyname = 'own luna_server_news') then
    create policy "own luna_server_news" on public.luna_server_news
      for all to authenticated
      using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
  end if;
end $$;
create index if not exists luna_server_news_owner_open_idx
  on public.luna_server_news (owner_id) where acked_at is null;

-- ---------- every hour, ask the worker (key from push_keys at fire time) ----------
do $c$ begin
  if not exists (select 1 from cron.job where jobname = 'faultline-luna-keepup') then
    perform cron.schedule(
      'faultline-luna-keepup', '0 * * * *',
      $job$
        select net.http_post(
          url     := 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/keepup',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'x-keepup-key', (select cron_key from public.push_keys where id = 1)),
          body    := '{}'::jsonb
        )
      $job$
    );
  end if;
end $c$;

-- ---------- printed back ----------
select 'luna_link_checks' as what, count(*)::text as value from public.luna_link_checks
union all select 'luna_server_news', count(*)::text from public.luna_server_news
union all select 'cron keepup', coalesce((select schedule from cron.job where jobname = 'faultline-luna-keepup'), 'MISSING');