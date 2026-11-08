-- ============================================================================
-- FAULTLINE — WHAT AI MODE ASKED TO DO, AND WHAT CAME OF IT: one row for
-- every capability AI Mode's colleague proposed, every one the gateway
-- refused, and every result the device sent back (done, failed, or declined
-- by the person). Kept where only the gateway writes it. Run ONCE. Safe to
-- re-run.
--
-- Rowland, 8 November: two modes over one application — in AI Mode Claude
-- operates Faultline only through approved capabilities, reads run at once,
-- writes run only when the person confirms (docs/AI-MODE.md). The gateway
-- (supabase/functions/assist, task `colleague`) checks every call against the
-- capabilities' schemas before it reaches the device, and writes here with
-- the service role: who, which conversation, which call, which capability
-- and of what kind (read · write · local), the input it was given, and what
-- became of it — 'proposed', 'refused' (dropped by the gateway's check, never
-- sent on), 'done', 'failed' or 'declined'. So what the AI did, and what it
-- was stopped from doing, can always be shown.
--
-- WHO MAY DO WHAT: the gateway writes with the service role, which RLS does
-- not hold back. A person may read their own rows and nothing else; there is
-- no insert, update or delete policy, so nobody can write, clear or change
-- the record through the API. Additive: no other table is touched.
-- ============================================================================

create table if not exists public.ai_actions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  at              timestamptz not null default now(),
  conversation_id text,
  call_id         text,
  capability      text,
  kind            text,
  input           jsonb,
  status          text not null,
  says            text
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ai_actions_status_check' and conrelid = 'public.ai_actions'::regclass) then
    alter table public.ai_actions add constraint ai_actions_status_check
      check (status in ('proposed', 'refused', 'done', 'failed', 'declined'));
  end if;
end $$;

create index if not exists ai_actions_user_at on public.ai_actions (user_id, at desc);
create index if not exists ai_actions_conversation on public.ai_actions (conversation_id, at);

alter table public.ai_actions enable row level security;

drop policy if exists "own ai actions" on public.ai_actions;
create policy "own ai actions" on public.ai_actions
  for select to authenticated using (user_id = auth.uid());

-- What it did, read back.
select c.relname as table_name, c.relrowsecurity as rls,
       (select string_agg(p.polname || ':' || p.polcmd::text, ', ' order by p.polname) from pg_policy p where p.polrelid = c.oid) as policies,
       (select string_agg(i.indexname, ', ' order by i.indexname) from pg_indexes i where i.schemaname = 'public' and i.tablename = c.relname) as indexes,
       (select pg_get_constraintdef(k.oid) from pg_constraint k where k.conrelid = c.oid and k.conname = 'ai_actions_status_check') as status_check
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'ai_actions';
