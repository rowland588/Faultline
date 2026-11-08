-- PROBLEM_HISTORY.sql — who changed what on a problem, and when (the audit trail; 8 November, the enterprise basics —
-- Rowland, 7 November: "do them all go" — docs/STATE.md 0b).
--
-- Why: a problem is an action on a line's tracker — who has it, by when, where it stands, what it waits for. Its record holds
-- only how it stands NOW; nobody could say who moved its day, who closed it or who took it off. A credible tool says it.
--
-- How: one table written only by a trigger on public.snags, AFTER INSERT and AFTER UPDATE, as the database (security
-- definer): the person (auth.uid() and the email in their token), the moment, and for each field a person sees that moved,
-- what it was and what it became. Fields a sync touches by itself (updated_at, rev) are not a change. Nothing a device sends
-- can write it, edit it or delete it: no insert, update or delete policy; a line's members read their line's history, the
-- same rule as the problem itself (is_ws_member).
--
-- Run ONCE. Safe to re-run.

create table if not exists public.problem_history (
  id          bigserial primary key,
  snag_id     uuid not null,
  workspace_id uuid not null,
  at          timestamptz not null default now(),
  actor       uuid,
  actor_email text,
  action      text not null check (action in ('raised', 'changed')),
  changed     jsonb not null default '{}'::jsonb
);

create index if not exists problem_history_snag_at on public.problem_history (snag_id, at desc);
create index if not exists problem_history_ws_at on public.problem_history (workspace_id, at desc);

alter table public.problem_history enable row level security;

drop policy if exists "members read their line's problem history" on public.problem_history;
create policy "members read their line's problem history" on public.problem_history
  for select using (is_ws_member(workspace_id));

create or replace function public.problem_history_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  tracked text[] := array['problem', 'status', 'priority', 'owner', 'due_at', 'proposed_solution', 'latest_update',
                          'close_note', 'deleted_at', 'archived_at', 'linked_obs_ids', 'minutes_per_day', 'rejects_per_day',
                          'held_packs', 'program_id', 'project_id', 'target_asset'];
  o jsonb;
  n jsonb := to_jsonb(new);
  diff jsonb := '{}'::jsonb;
  k text;
begin
  -- the history is never allowed to stop a problem being saved: anything that goes wrong here is swallowed
  begin
  if tg_op = 'INSERT' then
    insert into public.problem_history (snag_id, workspace_id, actor, actor_email, action, changed)
    values (new.id, new.workspace_id, auth.uid(), auth.jwt() ->> 'email', 'raised',
            jsonb_build_object('problem', jsonb_build_object('to', n -> 'problem')));
    return new;
  end if;
  o := to_jsonb(old);
  foreach k in array tracked loop
    if (o -> k) is distinct from (n -> k) then
      diff := diff || jsonb_build_object(k, jsonb_build_object('from', o -> k, 'to', n -> k));
    end if;
  end loop;
  if diff <> '{}'::jsonb then
    insert into public.problem_history (snag_id, workspace_id, actor, actor_email, action, changed)
    values (new.id, new.workspace_id, auth.uid(), auth.jwt() ->> 'email', 'changed', diff);
  end if;
  exception when others then
    raise warning 'problem_history: %', sqlerrm;
  end;
  return new;
end $$;

revoke all on function public.problem_history_write() from public, anon, authenticated;

drop trigger if exists problem_history_on_snags on public.snags;
create trigger problem_history_on_snags after insert or update on public.snags
  for each row execute function public.problem_history_write();

-- What it did
select (select count(*) from pg_policies where tablename = 'problem_history') as policies,
       (select count(*) from pg_trigger where tgname = 'problem_history_on_snags') as triggers,
       (select relrowsecurity from pg_class where relname = 'problem_history') as rls_on;
