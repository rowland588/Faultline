-- ============================================================================
-- FAULTLINE — THE SERVER READS EVERY GATE PASS. Run ONCE. Safe to re-run.
--
-- A gate on a project running a method is passed on the device, by the
-- owner, when the runtime says every blocking condition is met — or over
-- them, with the owner's reason kept on the pass (lib/flow/operations
-- passGate). METHODS.sql already lets only the owner write a pass. It could
-- not READ one: a device changed to skip the runtime could record a pass its
-- own records do not support, and every other device would show it passed
-- (docs/CAPABILITY-CHECK.md, item 19). So:
--
--   gate_checks     one row a pass — the server's reading of it, made by the
--                   app's own runtime (lib/flow/gateCheck, bundled into
--                   supabase/functions/gatecheck by scripts/build-gatecheck.mjs)
--                   as the records stood when the gate was passed: the
--                   records bear it out; passed over what was unmet with the
--                   owner's reason; or they do not bear it out. Only the
--                   service role writes it; a project's members read it, and
--                   the app says it beside the pass, on screen and on paper.
--   gate_check_key  the key the database sends the function with every ask,
--                   made here, read by the function with the service role;
--                   no policies, so the API never reads it. No key passes
--                   through a person or a file.
--   the asking      after any statement that writes a project's steps or
--                   gates (flow_records), if the project has a pass, the
--                   function is asked to read that project again (pg_net,
--                   after the write commits — a failure to ask never stops
--                   the write); and every hour, any pass with no reading yet
--                   or one the records did not bear out is read again, so a
--                   record that reached the cloud late is caught up.
-- ============================================================================

-- ---------------------------------------------------------------- the reading
create table if not exists public.gate_checks (
  id          text primary key,
  project_id  text not null,
  stage       text not null,
  verdict     text not null,
  says        text not null default '',
  unmet       jsonb,
  later       jsonb,
  override    text,
  read_at     bigint not null,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint,
  rev         bigint
);

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'gate_checks_verdict_check') then
    alter table public.gate_checks add constraint gate_checks_verdict_check check (verdict in ('agrees', 'override', 'disagrees'));
  end if;
end $c$;

create index if not exists gate_checks_project_idx on public.gate_checks (project_id);

-- ---------------------------------------------------------------- sync transport: the rev stamp
create or replace trigger faultline_rev before insert or update on public.gate_checks
  for each row execute function public.faultline_stamp_rev();
update public.gate_checks set rev = nextval('public.faultline_rev_seq') where rev is null;
create index if not exists idx_gate_checks_rev on public.gate_checks (rev);

do $p$ begin
  alter publication supabase_realtime add table public.gate_checks;
exception when duplicate_object then null; when undefined_object then null; end $p$;

-- ---------------------------------------------------------------- who may: members read, the server writes
alter table public.gate_checks enable row level security;
do $r$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gate_checks' and policyname = 'member gate check select') then
    create policy "member gate check select" on public.gate_checks for select to authenticated
      using (public.is_project_member(project_id));
  end if;
  -- RESTRICTIVE, so no permissive policy added later can open it: the
  -- service role (which skips row-level security) is the only writer.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gate_checks' and policyname = 'the server''s alone insert') then
    create policy "the server's alone insert" on public.gate_checks as restrictive for insert with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gate_checks' and policyname = 'the server''s alone update') then
    create policy "the server's alone update" on public.gate_checks as restrictive for update using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gate_checks' and policyname = 'the server''s alone delete') then
    create policy "the server's alone delete" on public.gate_checks as restrictive for delete using (false);
  end if;
end $r$;

-- ---------------------------------------------------------------- the key: service role only
create table if not exists public.gate_check_key (
  id   int primary key default 1 check (id = 1),
  key  text not null
);
alter table public.gate_check_key enable row level security;   -- no policies: the API never reads it
insert into public.gate_check_key (id, key)
  values (1, encode(extensions.gen_random_bytes(24), 'hex')) on conflict (id) do nothing;

-- ---------------------------------------------------------------- the asking: a project written
create or replace function public.faultline_gate_recheck()
returns trigger language plpgsql security definer set search_path = public as $$
declare ids text[];
begin
  select array_agg(distinct c.project_id) into ids
    from changed c
   where exists (select 1 from public.flow_records g where g.project_id = c.project_id and g.kind = 'gate');
  if ids is null then return null; end if;
  begin
    perform net.http_post(
      url     := 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/gatecheck',
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'x-check-key', (select key from public.gate_check_key where id = 1)),
      body    := jsonb_build_object('projects', to_jsonb(ids))
    );
  exception when others then
    raise warning 'faultline: the gate check was not asked for (%): %', ids, sqlerrm;
  end;
  return null;
end $$;

create or replace trigger faultline_gate_recheck_insert after insert on public.flow_records
  referencing new table as changed for each statement execute function public.faultline_gate_recheck();
create or replace trigger faultline_gate_recheck_update after update on public.flow_records
  referencing new table as changed for each statement execute function public.faultline_gate_recheck();

-- ---------------------------------------------------------------- the asking: every hour, what is not settled
-- The key is read at fire time, so it is never in cron.job.
do $$ begin
  if not exists (select 1 from cron.job where jobname = 'faultline-gatecheck') then
    perform cron.schedule(
      'faultline-gatecheck', '7 * * * *',
      $job$
        select net.http_post(
          url     := 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/gatecheck',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'x-check-key', (select key from public.gate_check_key where id = 1)),
          body    := '{"sweep": true}'::jsonb
        )
      $job$
    );
  end if;
end $$;

-- ---------------------------------------------------------------- printed back
select 'gate_checks rows' as what, count(*)::text as value from public.gate_checks
union all select 'gate_checks policies', string_agg(policyname || ' (' || permissive || ', ' || cmd || ')', '; ' order by policyname) from pg_policies where schemaname = 'public' and tablename = 'gate_checks'
union all select 'key made', case when exists (select 1 from public.gate_check_key where id = 1 and length(key) = 48) then 'yes' else 'NO' end
union all select 'triggers on flow_records', string_agg(tgname, ', ' order by tgname) from pg_trigger where tgrelid = 'public.flow_records'::regclass and tgname like 'faultline_gate_recheck%'
union all select 'cron job', coalesce((select schedule from cron.job where jobname = 'faultline-gatecheck'), 'MISSING');
