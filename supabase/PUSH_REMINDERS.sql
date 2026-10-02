-- ============================================================================
-- FAULTLINE — REMINDERS THAT RING WHEN THE APP IS CLOSED. Run ONCE. Safe to re-run.
--
-- A note's reminder (test_items of kind 'note' with a `due`) used to ring only
-- while Faultline was open: the device checked every fifteen minutes and used
-- the browser's Notification. A phone in a pocket heard nothing. Now the
-- database asks an edge function (supabase/functions/remind) every fifteen
-- minutes, and the function pushes to every device that has said yes, for
-- everyone on the note's project. Nothing new is decided here — the same rule
-- as lib/reminders.ts: a note, with a date, not ticked off, due today or gone,
-- said once a day.
--
-- The keys (VAPID, and the one the scheduler presents) live in push_keys,
-- which no API role can read. The function makes them itself the first time
-- it is called while they read SET-ME, so no key ever passes through a person
-- or a file in the repo.
-- ============================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

-- ---------- where a device can be reached ----------
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'own push_subscriptions') then
    create policy "own push_subscriptions" on public.push_subscriptions
      for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
end $$;
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------- the keys: service role only ----------
create table if not exists public.push_keys (
  id          int primary key default 1 check (id = 1),
  public_key  text not null,
  private_key text not null,
  cron_key    text not null
);
alter table public.push_keys enable row level security;   -- no policies: the API never reads it
insert into public.push_keys (id, public_key, private_key, cron_key)
  values (1, 'SET-ME', 'SET-ME', 'SET-ME') on conflict (id) do nothing;

-- The one thing a device needs: the public half, through a function.
create or replace function public.push_public_key()
returns text language sql stable security definer set search_path = public as $$
  select public_key from public.push_keys where id = 1 and public_key <> 'SET-ME'
$$;
grant execute on function public.push_public_key() to authenticated;

-- ---------- said once a day: the day it was pushed, on the note ----------
alter table public.test_items add column if not exists reminded_on text;

-- ---------- every fifteen minutes, ask the function ----------
-- The key is read from push_keys at fire time, so it is never in cron.job.
do $$ begin
  if not exists (select 1 from cron.job where jobname = 'faultline-remind') then
    perform cron.schedule(
      'faultline-remind', '*/15 * * * *',
      $job$
        select net.http_post(
          url     := 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/remind',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'x-remind-key', (select cron_key from public.push_keys where id = 1)),
          body    := '{}'::jsonb
        )
      $job$
    );
  end if;
end $$;

-- ---------- printed back ----------
select 'push_subscriptions' as what, count(*)::text as value from public.push_subscriptions
union all select 'keys set', case when (select public_key from public.push_keys where id = 1) <> 'SET-ME' then 'yes' else 'not yet — the function makes them on its first run' end
union all select 'cron job', coalesce((select schedule from cron.job where jobname = 'faultline-remind'), 'MISSING');
