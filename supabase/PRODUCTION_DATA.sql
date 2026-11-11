-- ============================================================================
-- LUNA — PRODUCTION DATA FROM THE BUSINESS'S OWN SYSTEMS. Run ONCE. Safe to re-run.
--
-- Rowland, 11 November (docs/DATA-CONNECTIONS.md): "Production data connectivity is a core platform capability, not an optional
-- reporting feature … Luna should connect directly to the customer's production systems wherever possible, through APIs or other
-- appropriate authorised access methods … Retain data provenance, apply calculations through the app's own deterministic logic and
-- distinguish actual system data from reported or estimated information."
--
-- What this makes:
--   data_connections          a connection to one of the business's systems: its kind (push · pull · database · files · historian —
--                             a word, never checked against a list, so a new kind needs no migration), its line, its mapping
--                             (JSON paths or CSV headers to a production record's fields), the system's line names to Luna's lines,
--                             its schedule, its pull address and the header its key goes in (never the key), and its health
--                             (last run, last success, rows, refused, the last error in words) written by the ingest function.
--                             Synced like every line-attached row (rev, realtime, tombstones).
--   production_records        one row a line × day × shift × product from a system: planned and run minutes, output, target, good,
--                             rejects, downtime minutes and reason, the system's own id (source_id), the connection, when it came
--                             in and how it is known ('system'). Idempotent on (connection_id, source_id): the same row sent twice
--                             replaces itself. Nothing worked out is stored.
--   data_connection_secrets   THE SECRET MATERIAL, which no API role can read (row-level security on, no policy, every privilege
--                             revoked from anon and authenticated): a push token's SHA-256 (the token itself exists in full only on
--                             the screen of the person who made it, once) and the Vault id of a pull connection's key.
--   set_data_connection_token(connection, sha256)   a person who may change the connection sets its token's hash
--   set_data_connection_secret(connection, secret)  … and a pull key, straight into Supabase Vault (vault.create_secret/update_secret)
--   data_connection_pull_secret(connection)         the decrypted key, for the service role (the ingest function) ONLY
--   ingest_keys + a pg_cron job every 15 minutes    asks the ingest function to run the pulls that are due, with a key only the
--                                                   database holds — made by the function on its first call (as PUSH_REMINDERS.sql)
--
-- WHO MAY DO WHAT — as a line's study (STUDIES.sql, LINE_STUDY_ACCESS.sql): its maker, or a member of its line (is_ws_member — so when
-- docs/ORGANISATION.md O3 widens is_ws_member to the business, these follow with no policy edited). No policy is `true`.
-- The ingest function writes with the service role, as the connection's owner.
--
-- BEFORE THIS IS APPLIED the app is safe: the pull and push of these two kinds answer "relation does not exist", those kinds wait
-- (src/cloud/sync.ts isMissingTable) and every other kind syncs as before; setting a token says it waits for the cloud.
--
-- WRITTEN 11 November 2026. To be applied with apply_migration under this name and read back (pg_policies, pg_get_functiondef,
-- cron.job) — and the ingest function deployed with verify_jwt OFF (the token is its authentication) — before a connection is said
-- to work.
-- ============================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- ---------------------------------------------------------------- the connections
create table if not exists public.data_connections (
  id                text primary key,
  owner_id          uuid not null default auth.uid(),
  workspace_id      uuid,
  name              text not null default '',
  kind              text not null default 'push',
  status            text not null default 'active' check (status in ('active', 'paused')),
  system            text,
  mapping           jsonb not null default '{}'::jsonb,
  line_map          jsonb not null default '{}'::jsonb,
  schedule_minutes  integer not null default 60 check (schedule_minutes >= 15),
  pull_url          text,
  pull_auth_header  text,
  pull_auth_prefix  text,
  token_hint        text,
  token_set_at      bigint,
  secret_set_at     bigint,
  last_run_at       bigint,
  last_success_at   bigint,
  last_error        text,
  last_rows         integer,
  last_refused      integer,
  rows_total        bigint not null default 0,
  created_at        bigint not null,
  updated_at        bigint not null,
  deleted_at        bigint
);
create index if not exists data_connections_owner_idx     on public.data_connections (owner_id);
create index if not exists data_connections_workspace_idx on public.data_connections (workspace_id) where workspace_id is not null;

-- ---------------------------------------------------------------- the records a system sends
create table if not exists public.production_records (
  id                text primary key,
  owner_id          uuid not null default auth.uid(),
  workspace_id      uuid,
  connection_id     text not null,
  source_id         text not null,
  day               text not null,
  shift             text,
  product           text,
  planned_minutes   numeric,
  run_minutes       numeric,
  output            numeric,
  target            numeric,
  good              numeric,
  rejects           numeric,
  downtime_minutes  numeric,
  downtime_reason   text,
  how_known         text not null default 'system',
  imported_at       bigint not null,
  updated_at        bigint not null,
  deleted_at        bigint,
  unique (connection_id, source_id)
);
create index if not exists production_records_owner_idx     on public.production_records (owner_id);
create index if not exists production_records_workspace_idx on public.production_records (workspace_id, day) where workspace_id is not null;
create index if not exists production_records_conn_idx      on public.production_records (connection_id);

-- ---------------------------------------------------------------- sync transport: the rev stamp and realtime
do $t$ declare t text; begin
  foreach t in array array['data_connections', 'production_records'] loop
    execute format('alter table public.%I add column if not exists rev bigint', t);
    execute format('create or replace trigger faultline_rev before insert or update on public.%I for each row execute function public.faultline_stamp_rev()', t);
    execute format('update public.%I set rev = nextval(''public.faultline_rev_seq'') where rev is null', t);
    execute format('create index if not exists idx_%s_rev on public.%I (rev)', t, t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; when undefined_object then null;
    end;
  end loop;
end $t$;

-- ---------------------------------------------------------------- who may
alter table public.data_connections   enable row level security;
alter table public.production_records enable row level security;

do $r$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'data_connections' and policyname = 'own data connections') then
    create policy "own data connections" on public.data_connections for all to authenticated
      using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'data_connections' and policyname = 'line data connections') then
    create policy "line data connections" on public.data_connections for all to authenticated
      using (workspace_id is not null and (select public.is_ws_member(data_connections.workspace_id)))
      with check (workspace_id is not null and (select public.is_ws_member(data_connections.workspace_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'production_records' and policyname = 'own production records') then
    create policy "own production records" on public.production_records for all to authenticated
      using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'production_records' and policyname = 'line production records') then
    create policy "line production records" on public.production_records for all to authenticated
      using (workspace_id is not null and (select public.is_ws_member(production_records.workspace_id)))
      with check (workspace_id is not null and (select public.is_ws_member(production_records.workspace_id)));
  end if;
end $r$;

-- ---------------------------------------------------------------- the secret material: the service role only
create table if not exists public.data_connection_secrets (
  connection_id    text primary key references public.data_connections (id) on delete cascade,
  token_hash       text unique check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$'),
  vault_secret_id  uuid,
  updated_at       timestamptz not null default now()
);
alter table public.data_connection_secrets enable row level security;   -- no policies: the API never reads it
revoke all on public.data_connection_secrets from anon, authenticated;

-- May this person change this connection? Its owner, or a member of its line, and it is not deleted.
create or replace function public.may_change_data_connection(p_connection text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.data_connections c
    where c.id = p_connection and c.deleted_at is null
      and (c.owner_id = auth.uid() or (c.workspace_id is not null and public.is_ws_member(c.workspace_id)))
  )
$$;
revoke all on function public.may_change_data_connection(text) from public, anon;
grant execute on function public.may_change_data_connection(text) to authenticated;

-- A push token's hash. The token is made on the device and shown once; only its SHA-256 reaches here.
create or replace function public.set_data_connection_token(p_connection text, p_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.may_change_data_connection(p_connection) then raise exception 'not yours to change' using errcode = '42501'; end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'a token hash is 64 hex characters' using errcode = '22023'; end if;
  insert into public.data_connection_secrets (connection_id, token_hash, updated_at) values (p_connection, p_hash, now())
    on conflict (connection_id) do update set token_hash = excluded.token_hash, updated_at = now();
  return true;
end $$;
revoke all on function public.set_data_connection_token(text, text) from public, anon;
grant execute on function public.set_data_connection_token(text, text) to authenticated;

-- A pull connection's key, straight into Vault. The table keeps only the Vault id.
create or replace function public.set_data_connection_secret(p_connection text, p_secret text)
returns boolean language plpgsql security definer set search_path = public, vault as $$
declare had uuid;
begin
  if not public.may_change_data_connection(p_connection) then raise exception 'not yours to change' using errcode = '42501'; end if;
  if p_secret is null or length(p_secret) < 1 or length(p_secret) > 4000 then raise exception 'a key of 1 to 4000 characters' using errcode = '22023'; end if;
  select vault_secret_id into had from public.data_connection_secrets where connection_id = p_connection;
  if had is not null and exists (select 1 from vault.secrets where id = had) then
    perform vault.update_secret(had, p_secret);
  else
    had := vault.create_secret(p_secret, 'luna-connection-' || p_connection, 'Luna data connection key (docs/DATA-CONNECTIONS.md)');
    insert into public.data_connection_secrets (connection_id, vault_secret_id, updated_at) values (p_connection, had, now())
      on conflict (connection_id) do update set vault_secret_id = excluded.vault_secret_id, updated_at = now();
  end if;
  return true;
end $$;
revoke all on function public.set_data_connection_secret(text, text) from public, anon;
grant execute on function public.set_data_connection_secret(text, text) to authenticated;

-- The decrypted key — for the ingest function (service role) and nobody else.
create or replace function public.data_connection_pull_secret(p_connection text)
returns text language sql stable security definer set search_path = public, vault as $$
  select d.decrypted_secret from public.data_connection_secrets s join vault.decrypted_secrets d on d.id = s.vault_secret_id
  where s.connection_id = p_connection
$$;
revoke all on function public.data_connection_pull_secret(text) from public, anon, authenticated;
grant execute on function public.data_connection_pull_secret(text) to service_role;

-- A connection's secret row taken away takes its Vault secret with it.
create or replace function public.data_connection_secret_gone() returns trigger language plpgsql security definer set search_path = public, vault as $$
begin
  if old.vault_secret_id is not null then delete from vault.secrets where id = old.vault_secret_id; end if;
  return old;
end $$;
create or replace trigger data_connection_secret_gone after delete on public.data_connection_secrets
  for each row execute function public.data_connection_secret_gone();

-- ---------------------------------------------------------------- the schedule: every fifteen minutes, ask the function
create table if not exists public.ingest_keys (
  id        int primary key default 1 check (id = 1),
  cron_key  text not null
);
alter table public.ingest_keys enable row level security;   -- no policies: the API never reads it
revoke all on public.ingest_keys from anon, authenticated;
insert into public.ingest_keys (id, cron_key) values (1, 'SET-ME') on conflict (id) do nothing;

-- The key is read from ingest_keys at fire time, so it is never in cron.job.
do $c$ begin
  if not exists (select 1 from cron.job where jobname = 'luna-ingest-pull') then
    perform cron.schedule(
      'luna-ingest-pull', '*/15 * * * *',
      $job$
        select net.http_post(
          url     := 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/ingest',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'x-ingest-key', (select cron_key from public.ingest_keys where id = 1)),
          body    := '{"mode":"pull"}'::jsonb
        )
      $job$
    );
  end if;
end $c$;

-- ---------------------------------------------------------------- read back
select 'data_connections and production_records' as what,
       case when to_regclass('public.data_connections') is not null and to_regclass('public.production_records') is not null then 'yes' else 'NO' end as answer
union all
select 'both carry rev and its trigger',
       case when (select count(*) from pg_trigger where tgname = 'faultline_rev' and tgrelid in ('public.data_connections'::regclass, 'public.production_records'::regclass)) = 2 then 'yes' else 'NO' end
union all
select 'row-level security on all four (connections, records, secrets, ingest keys)',
       (select count(*)::text from pg_class where oid in ('public.data_connections'::regclass, 'public.production_records'::regclass, 'public.data_connection_secrets'::regclass, 'public.ingest_keys'::regclass) and relrowsecurity)
union all
select 'policies: 2 on connections, 2 on records, NONE on secrets and ingest keys',
       (select string_agg(tablename || ' ' || n, ', ' order by tablename) from (select tablename, count(*)::text n from pg_policies where schemaname = 'public' and tablename in ('data_connections', 'production_records', 'data_connection_secrets', 'ingest_keys') group by tablename) x)
union all
select 'no new policy is plain true',
       case when exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('data_connections', 'production_records') and (qual = 'true' or with_check = 'true')) then 'NO' else 'yes' end
union all
select 'authenticated cannot read the secrets',
       case when has_table_privilege('authenticated', 'public.data_connection_secrets', 'select') then 'NO' else 'yes' end
union all
select 'only the service role may read a pull key',
       case when has_function_privilege('authenticated', 'public.data_connection_pull_secret(text)', 'execute') then 'NO'
            when has_function_privilege('service_role', 'public.data_connection_pull_secret(text)', 'execute') then 'yes' else 'NO' end
union all
select 'one row a system id a connection',
       case when exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'production_records' and indexdef ilike '%unique%(connection_id, source_id)%') then 'yes' else 'NO' end
union all
select 'in the realtime publication',
       (select count(*)::text from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('data_connections', 'production_records'))
union all
select 'cron job', coalesce((select schedule from cron.job where jobname = 'luna-ingest-pull'), 'MISSING');
