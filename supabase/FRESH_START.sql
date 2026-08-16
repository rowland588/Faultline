-- ============================================================================
-- FAULTLINE — FRESH START. Run this ONCE on a BRAND-NEW, EMPTY Supabase project.
-- (SQL Editor -> New snippet -> paste ALL of this -> Run.)
-- It creates everything the app needs and prints a report at the end.
-- ============================================================================

-- ---------- superadmin (the email you sign into the APP with) ----------
create or replace function public.faultline_superadmin_email()
returns text language sql immutable as $$ select lower('rowlandglew@yahoo.co.uk') $$;

-- ---------- profiles + invite list + sign-up gate ----------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  is_super   boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_super)
$$;
grant execute on function public.is_super() to authenticated, anon;

alter table public.profiles enable row level security;
create policy "team profiles read" on public.profiles for select to authenticated using (true);

create table public.allowed_emails (
  email      text primary key,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
create policy "super manages invites" on public.allowed_emails
  for all using (public.is_super()) with check (public.is_super());

insert into public.allowed_emails (email) values (public.faultline_superadmin_email());

create or replace function public.faultline_enforce_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(trim(new.email)) = public.faultline_superadmin_email() then return new; end if;
  if not exists (select 1 from public.allowed_emails where email = lower(trim(new.email))) then
    raise exception 'FAULTLINE_NOT_INVITED'
      using hint = 'This email has not been invited. Ask your administrator to add it.';
  end if;
  return new;
end $$;
create trigger faultline_enforce_invite
  before insert on auth.users for each row execute function public.faultline_enforce_invite();

create or replace function public.faultline_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, is_super)
  values (new.id, new.email, lower(trim(new.email)) = public.faultline_superadmin_email())
  on conflict (id) do nothing;
  return new;
end $$;
create trigger faultline_handle_new_user
  after insert on auth.users for each row execute function public.faultline_handle_new_user();

-- ---------- the five data tables (every clock = epoch-ms BIGINT) ----------
create table public.workspaces (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text,
  categories jsonb not null default '[]'::jsonb,
  subcategories jsonb not null default '{}'::jsonb,
  assets jsonb not null default '[]'::jsonb,
  shifts jsonb not null default '[]'::jsonb,
  crew numeric,
  labour_rate_per_hour numeric,
  labour_burden numeric,
  packs_per_min numeric,
  margin_per_pack numeric,
  last_category text,
  last_asset text,
  archived boolean not null default false,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table public.observations (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  category text not null,
  subcategory text,
  asset text not null,
  shift text,
  started_at bigint not null,
  ended_at bigint,
  duration_ms bigint not null default 0,
  timing text not null,
  count int not null default 1,
  value_num numeric,
  cost_per numeric,
  note text,
  media jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table public.segments (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  sequence int not null,
  name text,
  video_key text not null,
  poster_key text,
  duration_s numeric,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table public.snag_assets (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  segment_id uuid not null references public.segments (id) on delete cascade,
  timestamp_s numeric not null,
  name text not null,
  code text,
  still_key text not null,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

-- a snag is EITHER pinned on an asset still (asset_id + x/y) OR an action
-- raised from the Pareto board (target_* records where the board pointed)
create table public.snags (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  asset_id uuid references public.snag_assets (id) on delete cascade,
  x_pct numeric,
  y_pct numeric,
  target_category text,
  target_subcategory text,
  target_asset text,
  problem text not null,
  proposed_solution text,
  status text not null default 'open' check (status in ('open','in_progress','closed')),
  owner text,
  case_id uuid,
  raised_at bigint not null,
  due_at bigint,
  latest_update text,
  latest_update_at bigint,
  closed_at bigint,
  close_note text,
  detail_photo_key text,
  fixed_photo_key text,
  linked_obs_ids jsonb not null default '[]'::jsonb,
  updated_at bigint not null,
  deleted_at bigint
);

-- the thin A3: a question, a saved drill scope, a baseline and a target.
-- Everything else derives on the device — no analysis is ever stored here.
create table public.cases (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  path jsonb not null default '[]'::jsonb,
  note text,
  study jsonb,
  baseline_ms_week bigint not null default 0,
  target_ms_week bigint,
  status text not null default 'open' check (status in ('open','closed')),
  opened_at bigint not null,
  closed_at bigint,
  updated_at bigint not null,
  deleted_at bigint
);

create index idx_observations_ws      on public.observations (workspace_id);
create index idx_observations_updated on public.observations (owner_id, updated_at);
create index idx_segments_ws          on public.segments (workspace_id);
create index idx_snag_assets_ws       on public.snag_assets (workspace_id);
create index idx_snag_assets_seg      on public.snag_assets (segment_id);
create index idx_snags_ws             on public.snags (workspace_id);
create index idx_snags_asset          on public.snags (asset_id);
create index idx_cases_ws             on public.cases (workspace_id);

alter table public.workspaces   enable row level security;
alter table public.observations enable row level security;
alter table public.segments     enable row level security;
alter table public.cases        enable row level security;
alter table public.snag_assets  enable row level security;
alter table public.snags        enable row level security;

-- WORKSPACE TEAMS: each workspace is an independent room with its own
-- stakeholders. Whoever creates it owns it and chooses who else is in it —
-- you see a workspace only if you own it or your email is on its people list.
-- owner_id also feeds attribution ("logged by Dave").
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email        text not null,
  added_by     uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (workspace_id, email)
);
alter table public.workspace_members enable row level security;

create or replace function public.is_ws_owner(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid())
$$;

create or replace function public.is_ws_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super()
      or public.is_ws_owner(ws)
      or exists (
        select 1 from public.workspace_members m
        where m.workspace_id = ws
          and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
$$;

grant execute on function public.is_ws_owner(uuid)  to authenticated;
grant execute on function public.is_ws_member(uuid) to authenticated;

create policy "member workspaces select" on public.workspaces
  for select to authenticated using (public.is_ws_member(id));
create policy "member workspaces insert" on public.workspaces
  for insert to authenticated with check (owner_id = auth.uid() or public.is_ws_member(id));
create policy "member workspaces update" on public.workspaces
  for update to authenticated using (public.is_ws_member(id)) with check (public.is_ws_member(id));
create policy "member workspaces delete" on public.workspaces
  for delete to authenticated using (public.is_ws_owner(id) or public.is_super());

create policy "member observations" on public.observations for all to authenticated
  using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
create policy "member segments"     on public.segments     for all to authenticated
  using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
create policy "member snag_assets"  on public.snag_assets  for all to authenticated
  using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
create policy "member snags"        on public.snags        for all to authenticated
  using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));
create policy "member cases"        on public.cases        for all to authenticated
  using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id));

create policy "members read" on public.workspace_members
  for select to authenticated using (public.is_ws_member(workspace_id));
create policy "members manage" on public.workspace_members
  for all to authenticated
  using (public.is_ws_owner(workspace_id) or public.is_super())
  with check (public.is_ws_owner(workspace_id) or public.is_super());

-- Late-joiner history: when a member is added, no-op updates re-stamp every
-- row of the workspace with fresh revs (the faultline_rev trigger below), so
-- the new member's rev-cursor pull receives the workspace's FULL history —
-- not just changes from the moment they joined.
create or replace function public.faultline_member_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.workspaces   set updated_at = updated_at where id = new.workspace_id;
  update public.observations set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.segments     set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.snag_assets  set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.snags        set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.cases        set updated_at = updated_at where workspace_id = new.workspace_id;
  return new;
end $$;
create trigger faultline_member_added
  after insert on public.workspace_members
  for each row execute function public.faultline_member_added();

-- ---------- storage: private 'media' bucket, per-user folders ----------
do $bucket$
begin
  insert into storage.buckets (id, name, public) values ('media', 'media', false)
  on conflict (id) do update set public = false;
exception when insufficient_privilege then
  raise notice 'Create the bucket in the dashboard: Storage -> New bucket -> "media" (private).';
end
$bucket$;

do $pol$
begin
  execute $p$create policy "team media read"   on storage.objects for select to authenticated using (bucket_id = 'media')$p$;
  execute $p$create policy "team media write"  on storage.objects for insert to authenticated with check (bucket_id = 'media')$p$;
  execute $p$create policy "team media update" on storage.objects for update to authenticated using (bucket_id = 'media')$p$;
  execute $p$create policy "team media delete" on storage.objects for delete to authenticated using (bucket_id = 'media')$p$;
exception when insufficient_privilege then
  raise notice 'Add policies in the dashboard: Storage -> media -> Policies (authenticated users, own folder).';
end
$pol$;

-- ---------- sync transport: server-assigned rev + realtime ----------
-- `rev` (one global sequence, trigger-stamped) is the pull cursor: devices ask
-- for "rev > last seen", which is pure server truth — device clock skew can
-- never skip rows. The realtime publication tells every other signed-in device
-- to pull the moment one pushes.
create sequence if not exists public.faultline_rev_seq;

create or replace function public.faultline_stamp_rev()
returns trigger language plpgsql as $$
begin
  new.rev := nextval('public.faultline_rev_seq');
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['workspaces','observations','segments','snag_assets','snags','cases'] loop
    execute format('alter table public.%I add column if not exists rev bigint', t);
    execute format('drop trigger if exists faultline_rev on public.%I', t);
    execute format('create trigger faultline_rev before insert or update on public.%I for each row execute function public.faultline_stamp_rev()', t);
    execute format('update public.%I set rev = nextval(''public.faultline_rev_seq'') where rev is null', t);
    execute format('create index if not exists idx_%s_rev on public.%I (rev)', t, t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['workspaces','observations','segments','snag_assets','snags','cases'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null; -- realtime disabled; interval sync still works
    end;
  end loop;
end $$;

-- ---------- report ----------
select 'clock ' || table_name || '.' || column_name as item, data_type as value
from information_schema.columns
where table_schema = 'public'
  and table_name in ('workspaces','observations','segments','snag_assets','snags')
  and column_name in ('created_at','updated_at','deleted_at','started_at','ended_at','raised_at','closed_at')
union all
select 'public tables', string_agg(tablename, ', ' order by tablename)
from pg_tables where schemaname = 'public'
union all
select 'media bucket',
  coalesce((select case when public then 'EXISTS BUT PUBLIC — make it private!' else 'exists (private)' end
            from storage.buckets where id = 'media'), 'MISSING — create in dashboard')
union all
select 'media storage policies',
  case when (select count(*) from pg_policies
             where schemaname = 'storage' and tablename = 'objects' and policyname like '%media%') >= 4
       then 'installed (all 4)' else 'MISSING — add in dashboard' end
union all
select 'sign-up gate',
  case when exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'faultline_enforce_invite')
       then 'installed' else 'MISSING' end
order by item;
