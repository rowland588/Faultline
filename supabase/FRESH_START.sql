-- ============================================================================
-- FINDER — FRESH START. Run this ONCE on a BRAND-NEW, EMPTY Supabase project.
-- (SQL Editor -> New snippet -> paste ALL of this -> Run.)
-- It creates everything the app needs and prints a report at the end.
-- ============================================================================

-- ---------- superadmin (the email you sign into the APP with) ----------
create or replace function public.finder_superadmin_email()
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
create policy "profiles read" on public.profiles for select using (id = auth.uid() or public.is_super());

create table public.allowed_emails (
  email      text primary key,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
create policy "super manages invites" on public.allowed_emails
  for all using (public.is_super()) with check (public.is_super());

insert into public.allowed_emails (email) values (public.finder_superadmin_email());

create or replace function public.finder_enforce_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(trim(new.email)) = public.finder_superadmin_email() then return new; end if;
  if not exists (select 1 from public.allowed_emails where email = lower(trim(new.email))) then
    raise exception 'FINDER_NOT_INVITED'
      using hint = 'This email has not been invited. Ask your administrator to add it.';
  end if;
  return new;
end $$;
create trigger finder_enforce_invite
  before insert on auth.users for each row execute function public.finder_enforce_invite();

create or replace function public.finder_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, is_super)
  values (new.id, new.email, lower(trim(new.email)) = public.finder_superadmin_email())
  on conflict (id) do nothing;
  return new;
end $$;
create trigger finder_handle_new_user
  after insert on auth.users for each row execute function public.finder_handle_new_user();

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

create table public.snags (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  asset_id uuid not null references public.snag_assets (id) on delete cascade,
  x_pct numeric not null,
  y_pct numeric not null,
  problem text not null,
  proposed_solution text,
  status text not null default 'open' check (status in ('open','in_progress','closed')),
  owner text,
  raised_at bigint not null,
  closed_at bigint,
  close_note text,
  detail_photo_key text,
  linked_obs_ids jsonb not null default '[]'::jsonb,
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

alter table public.workspaces   enable row level security;
alter table public.observations enable row level security;
alter table public.segments     enable row level security;
alter table public.snag_assets  enable row level security;
alter table public.snags        enable row level security;

create policy "own workspaces"   on public.workspaces   for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own observations" on public.observations for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own segments"     on public.segments     for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own snag_assets"  on public.snag_assets  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own snags"        on public.snags        for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

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
  execute $p$create policy "media read own folder"   on storage.objects for select using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$create policy "media write own folder"  on storage.objects for insert with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$create policy "media update own folder" on storage.objects for update using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$create policy "media delete own folder" on storage.objects for delete using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
exception when insufficient_privilege then
  raise notice 'Add policies in the dashboard: Storage -> media -> Policies (authenticated users, own folder).';
end
$pol$;

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
             where schemaname = 'storage' and tablename = 'objects' and policyname like 'media %') = 4
       then 'installed (all 4)' else 'MISSING — add in dashboard' end
union all
select 'sign-up gate',
  case when exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'finder_enforce_invite')
       then 'installed' else 'MISSING' end
order by item;
