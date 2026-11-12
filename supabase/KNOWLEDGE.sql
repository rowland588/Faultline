-- ============================================================================
-- LUNAR — THE KNOWLEDGE LEDGER: what the brain found, what happened after each fix, and what people say — kept, never rewritten.
-- Run ONCE. Safe to re-run.
--
-- Rowland, 12 November (docs/LUNAR-KNOWLEDGE.md): "Luna must learn from evidence and experience, not simply accumulate opinions. A
-- manager's explanation, an engineer's observation, a measured result and a verified improvement are different types of knowledge.
-- Preserve those distinctions, their sources and their history … retain contradictory evidence … recognise when an earlier finding or
-- assumption was wrong, rather than quietly rewriting history."
--
-- One row an ENTRY. Entries are append-only: once a row exists, an update keeps every column of the row as it was (the trigger below —
-- the rev is still stamped afresh, so a device that wrote the same id with different words pulls the copy that stands) and there is no
-- delete policy. A correction is a new entry naming what it answers (about, stance) or replaces (supersedes).
--
-- Columns, as src/lib/knowledge LedgerEntry:
--   kind        finding · outcome · account · review — NOT checked against a list here, so a new kind never needs a migration
--   known       counted · measured · observed · reported (the app's HowKnown words)
--   subject     what it is about: line · machine:<m> · stops:<m>|<reason> · fix:<id> · problem:<id>
--   claim       a finding's or outcome's identity (<kind>:<subject>), stable across versions
--   supersedes  the entry this version replaces; about + stance (supports · contradicts · neutral) the entry it answers
--   says        the sentence; body its provenance (method, period, record ids, sample size, sureness, limits, money, engine)
--   by_name, role, source   who said it and their role; the engine's version, 'person' or 'luna' (a card the person confirmed)
--   workspace_id, project_id, client    the line it belongs to, the project when there is one, the customer named at the time
--   at          when it was found or said
--
-- WHO MAY DO WHAT — as a study on its line (STUDIES.sql, KEPT_PAPERS.sql): read and add by the line's members (is_ws_member, which
-- since ORG_VISIBILITY.sql reaches a business's people as far as their scope), by the project's members when it is for a project, and
-- by its maker. RESTRICTIVE beside them: for a project, adding needs the owner, the administrator or the team (a client reads and adds
-- nothing — the app never pushes a client's rows); on a line, a business's viewer adds nothing (ws_viewer_only). No policy is `true`.
-- No delete policy at all.
--
-- LATE JOINERS: faultline_org_member_added (ORG_VISIBILITY.sql) re-stamps a business's line rows when somebody joins or is widened, so
-- their next pull sweeps them up. Replaced here by its live body (read 12 November) with 'knowledge' added to its list — nothing else
-- changed. The re-stamp is an update, which the keep trigger turns into a fresh rev on the unchanged row: exactly what it needs.
--
-- BEFORE THIS IS APPLIED the app is safe: knowledge's pull and push answer "relation does not exist", that kind waits (src/cloud/sync.ts
-- isMissingTable) and every other kind syncs as before.
--
-- WRITTEN 12 November 2026 (slice K1). Applied with apply_migration under this name and read back (pg_policies, pg_trigger,
-- pg_get_functiondef) before anything is said to sync.
-- ============================================================================

create table if not exists public.knowledge (
  id            text primary key,
  owner_id      uuid not null default auth.uid(),
  workspace_id  uuid not null,
  project_id    text,
  client        text,
  kind          text not null,
  known         text not null,
  subject       text not null default 'line',
  claim         text,
  supersedes    text,
  about         text,
  stance        text check (stance is null or stance in ('supports', 'contradicts', 'neutral')),
  says          text not null default '',
  body          jsonb not null default '{}'::jsonb,
  by_name       text,
  role          text,
  source        text not null default 'person',
  at            bigint not null,
  updated_at    bigint not null,
  deleted_at    bigint
);

create index if not exists knowledge_workspace_idx on public.knowledge (workspace_id);
create index if not exists knowledge_claim_idx     on public.knowledge (claim) where claim is not null;
create index if not exists knowledge_about_idx     on public.knowledge (about) where about is not null;

-- ---------------------------------------------------------------- sync transport: the rev stamp
alter table public.knowledge add column if not exists rev bigint;
create or replace trigger faultline_rev before insert or update on public.knowledge
  for each row execute function public.faultline_stamp_rev();
update public.knowledge set rev = nextval('public.faultline_rev_seq') where rev is null;
create index if not exists idx_knowledge_rev on public.knowledge (rev);

-- ---------------------------------------------------------------- an entry once written is kept as written
-- Named to fire BEFORE faultline_rev (triggers of one timing fire in name order): every column is put back as it was, then the rev
-- is stamped afresh. A deleted_at can never be set, so nothing is hidden either.
create or replace function public.knowledge_keep()
returns trigger language plpgsql set search_path to '' as $$
begin
  new := old;
  return new;
end $$;
create or replace trigger a_knowledge_keep before update on public.knowledge
  for each row execute function public.knowledge_keep();

do $p$ begin
  alter publication supabase_realtime add table public.knowledge;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $p$;

-- ---------------------------------------------------------------- who may
alter table public.knowledge enable row level security;

do $r$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'own knowledge read') then
    create policy "own knowledge read" on public.knowledge for select to authenticated
      using (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'line knowledge read') then
    create policy "line knowledge read" on public.knowledge for select to authenticated
      using ((select public.is_ws_member(knowledge.workspace_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'project knowledge read') then
    create policy "project knowledge read" on public.knowledge for select to authenticated
      using (project_id is not null and (select public.is_project_member(knowledge.project_id)));
  end if;
  -- adding: only on a line the person reaches (or a project they are on), and only as themselves
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'line knowledge add') then
    create policy "line knowledge add" on public.knowledge for insert to authenticated
      with check (owner_id = (select auth.uid()) and ((select public.is_ws_member(knowledge.workspace_id))
        or (project_id is not null and (select public.is_project_member(knowledge.project_id)))));
  end if;
  -- the same id written again (two devices doing the same homework): allowed through, and the keep trigger leaves the row as it was
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'line knowledge rewrite') then
    create policy "line knowledge rewrite" on public.knowledge for update to authenticated
      using ((select public.is_ws_member(knowledge.workspace_id)) or (project_id is not null and (select public.is_project_member(knowledge.project_id))))
      with check ((select public.is_ws_member(knowledge.workspace_id)) or (project_id is not null and (select public.is_project_member(knowledge.project_id))));
  end if;
  -- RESTRICTIVE: a project's client adds nothing; a business's viewer adds nothing
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'editors only insert') then
    create policy "editors only insert" on public.knowledge as restrictive for insert to authenticated
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'editors only update') then
    create policy "editors only update" on public.knowledge as restrictive for update to authenticated
      using (project_id is null or public.is_project_editor(project_id))
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'org viewers read only insert') then
    create policy "org viewers read only insert" on public.knowledge as restrictive for insert to authenticated
      with check (not (select public.ws_viewer_only(workspace_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'org viewers read only update') then
    create policy "org viewers read only update" on public.knowledge as restrictive for update to authenticated
      using (not (select public.ws_viewer_only(workspace_id))) with check (not (select public.ws_viewer_only(workspace_id)));
  end if;
end $r$;

-- ---------------------------------------------------------------- late joiners (ORG_VISIBILITY.sql's live body, 'knowledge' added)
create or replace function public.faultline_org_member_added()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare t text;
begin
  if new.deleted_at is not null then return new; end if;
  if tg_op = 'UPDATE' and old.deleted_at is null and old.sites = new.sites and old.areas = new.areas then return new; end if;
  update public.workspaces set updated_at = updated_at where org_id = new.org_id;
  foreach t in array array['observations', 'segments', 'snag_assets', 'snags', 'cases', 'standards', 'studies', 'programs', 'commission_assets', 'kept_papers', 'knowledge'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('update public.%I set updated_at = updated_at where workspace_id in (select id from public.workspaces where org_id = $1)', t) using new.org_id;
  end loop;
  return new;
end $function$;

-- ---------------------------------------------------------------- what it did
select (select count(*) from pg_policies where schemaname = 'public' and tablename = 'knowledge') as policies,
       (select string_agg(tgname, ', ' order by tgname) from pg_trigger where tgrelid = 'public.knowledge'::regclass and not tgisinternal) as triggers,
       (select relrowsecurity from pg_class where oid = 'public.knowledge'::regclass) as rls;
