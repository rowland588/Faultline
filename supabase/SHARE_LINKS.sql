-- ============================================================================
-- FAULTLINE — A LINK TO ONE PICTURE OR CLIP. Run ONCE. Safe to re-run.
--
-- Rowland, 4 October: "I like the idea of being able to send links to the
-- client so they can see a video ... how can this be done safely and
-- securely?" An invite (supabase/ACCESS_LEVELS.sql, the client level) is for
-- the people who look again and again. This is for the one clip sent to
-- somebody who will never have an account: "here's the fault we filmed".
--
-- How it stays safe:
--   ONE THING   a share names one photo or clip on one test (its blob key) —
--               the link opens that and nothing else in the job.
--   UNGUESSABLE the link carries a random token (24 bytes); nothing about the
--               job is in it.
--   EXPIRES     every share has expires_at; the owner picks the length.
--   STOPPABLE   revoked_at ends it at once, before its date.
--   SEEN        views and last_viewed_at are counted, so the test can say
--               "shared until 11 Oct · seen 3 times".
--   NO PUBLIC FILE  the bucket stays private. supabase/functions/share reads
--               the token with the service role, checks it, and hands back a
--               signed address for the file that lasts five minutes.
--
-- Only the project's OWNER may share (and stop sharing): sending the job's
-- footage outside is a control decision, like inviting somebody. Nobody but
-- the function reads a share without being the project's owner.
-- ============================================================================

create table if not exists public.shares (
  token          text primary key,
  project_id     text not null,
  test_id        text not null,
  blob_key       text not null,
  kind           text not null default 'video',
  caption        text,
  owner_id       uuid not null default auth.uid(),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  revoked_at     timestamptz,
  views          integer not null default 0,
  last_viewed_at timestamptz
);

do $k$ begin
  if not exists (select 1 from pg_constraint where conname = 'shares_kind_check') then
    alter table public.shares add constraint shares_kind_check check (kind in ('photo', 'video'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shares_token_length') then
    alter table public.shares add constraint shares_token_length check (length(token) >= 32);
  end if;
end $k$;

create index if not exists shares_test_idx on public.shares (project_id, test_id);

alter table public.shares enable row level security;

do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shares' and policyname = 'owner reads shares') then
    create policy "owner reads shares" on public.shares for select to authenticated
      using (public.is_project_owner(project_id) or (select public.is_super()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shares' and policyname = 'owner makes shares') then
    create policy "owner makes shares" on public.shares for insert to authenticated
      with check ((public.is_project_owner(project_id) or (select public.is_super())) and owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shares' and policyname = 'owner stops shares') then
    create policy "owner stops shares" on public.shares for update to authenticated
      using (public.is_project_owner(project_id) or (select public.is_super()))
      with check (public.is_project_owner(project_id) or (select public.is_super()));
  end if;
end $p$;

-- ---------------------------------------------------------------- read back
select 'table' as what, 'shares' as name where to_regclass('public.shares') is not null
union all
select 'policy', policyname from pg_policies where schemaname = 'public' and tablename = 'shares'
order by 1, 2;
