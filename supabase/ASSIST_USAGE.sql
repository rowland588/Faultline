-- ============================================================================
-- FAULTLINE — THE ASSISTANT'S ALLOWANCE: one row for every answer the
-- assistant gives, kept where only the gateway writes it. Run ONCE. Safe to
-- re-run.
--
-- Rowland's mandate, 18 October: "Use Claude through a controlled, secure
-- gateway. Keep credentials server-side, enforce permissions independently
-- of AI, validate every proposed operation and maintain appropriate usage
-- and cost controls." The gateway (supabase/functions/assist) checks a
-- person's last 24 hours here before it asks Claude anything — by number and
-- by cost — and writes one row after: who, which task, which model, the
-- tokens, what it cost in millionths of a dollar, and whether the answer
-- could be read (docs/PLATFORM-STATUS.md, slice 4).
--
-- WHO MAY DO WHAT: the gateway writes with the service role, which RLS does
-- not hold back. A person may read their own rows (what they have used) and
-- nothing else; there is no insert, update or delete policy, so nobody can
-- write, clear or change a row through the API to get round the allowance.
-- ============================================================================

create table if not exists public.assist_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  at            timestamptz not null default now(),
  task          text not null,
  model         text not null,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cost_micros   bigint not null default 0,
  ok            boolean not null default true
);

create index if not exists assist_usage_user_at on public.assist_usage (user_id, at desc);

alter table public.assist_usage enable row level security;

drop policy if exists "own usage" on public.assist_usage;
create policy "own usage" on public.assist_usage
  for select using (user_id = auth.uid());

-- What it did, read back.
select c.relname as table_name, c.relrowsecurity as rls,
       (select string_agg(p.polname || ':' || p.polcmd::text, ', ' order by p.polname) from pg_policy p where p.polrelid = c.oid) as policies,
       (select string_agg(i.indexname, ', ') from pg_indexes i where i.tablename = c.relname) as indexes
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'assist_usage';
