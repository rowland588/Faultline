-- ============================================================================
-- Finder — Supabase schema (run this whole file in the Supabase SQL editor).
--
-- Finder stays LOCAL-FIRST: IndexedDB on the device is the source of truth so it
-- works fully offline on the floor. These tables are the cloud MIRROR for backup
-- and multi-device. Sync is last-write-wins by `updated_at`; hard deletes travel
-- as tombstones (`deleted_at`). Every timestamp is epoch-MILLISECONDS (bigint),
-- matching the app's one clock exactly — no timezone conversion, integer LWW.
--
-- Every row is owner-scoped by RLS: you only ever see and write your own data.
-- Media blobs (photos, videos, stills) live in the `media` Storage bucket, keyed
-- by the same blobKey the app already uses, under an owner folder.
--
-- Safe to re-run: `create ... if not exists`, `drop policy if exists` first.
-- ============================================================================

-- ---------- workspaces (the isolation container) ----------
create table if not exists workspaces (
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
  updated_at bigint not null,          -- LWW clock (epoch ms)
  deleted_at bigint                    -- tombstone (epoch ms) — null while alive
);

-- ---------- observations (the one row every lens reads) ----------
create table if not exists observations (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  category text not null,
  subcategory text,
  asset text not null,
  shift text,
  started_at bigint not null,
  ended_at bigint,
  duration_ms bigint not null default 0,
  timing text not null,                -- 'stopwatch' | 'typed' | 'instant'
  count int not null default 1,
  value_num numeric,
  cost_per numeric,
  note text,
  media jsonb not null default '[]'::jsonb,   -- MediaRef[] metadata; blobs live in Storage
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

-- ---------- SNAG LIST: segments → assets → snags (all workspace-scoped) ----------
create table if not exists segments (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  sequence int not null,
  name text,
  video_key text not null,             -- Storage key (media bucket)
  poster_key text,
  duration_s numeric,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table if not exists snag_assets (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  segment_id uuid not null references segments (id) on delete cascade,
  timestamp_s numeric not null,
  name text not null,
  code text,
  still_key text not null,             -- Storage key (media bucket)
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table if not exists snags (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  asset_id uuid not null references snag_assets (id) on delete cascade,
  x_pct numeric not null,
  y_pct numeric not null,
  problem text not null,
  proposed_solution text,
  status text not null default 'open' check (status in ('open','in_progress','closed')),
  owner text,                          -- assignee name (free text), distinct from owner_id
  raised_at bigint not null,
  closed_at bigint,
  close_note text,
  detail_photo_key text,               -- Storage key (media bucket)
  linked_obs_ids jsonb not null default '[]'::jsonb,   -- optional Pareto link → observation ids
  updated_at bigint not null,
  deleted_at bigint
);

-- ---------- indexes (the scoped reads the sync does) ----------
create index if not exists idx_observations_ws on observations (workspace_id);
create index if not exists idx_observations_updated on observations (owner_id, updated_at);
create index if not exists idx_segments_ws on segments (workspace_id);
create index if not exists idx_snag_assets_ws on snag_assets (workspace_id);
create index if not exists idx_snag_assets_seg on snag_assets (segment_id);
create index if not exists idx_snags_ws on snags (workspace_id);
create index if not exists idx_snags_asset on snags (asset_id);

-- ---------- row-level security: every row scoped to its owner ----------
alter table workspaces   enable row level security;
alter table observations enable row level security;
alter table segments     enable row level security;
alter table snag_assets  enable row level security;
alter table snags        enable row level security;

drop policy if exists "own workspaces"   on workspaces;
drop policy if exists "own observations" on observations;
drop policy if exists "own segments"     on segments;
drop policy if exists "own snag_assets"  on snag_assets;
drop policy if exists "own snags"        on snags;

create policy "own workspaces"   on workspaces   for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own observations" on observations for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own segments"     on segments     for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own snag_assets"  on snag_assets  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own snags"        on snags        for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================================================
-- STORAGE — the media bucket. Run this part SEPARATELY if the SQL editor errors
-- with "must be owner of table objects"; the same rules can be created from the
-- dashboard (Storage → New bucket "media", private → the "own files" policies).
-- Blobs are keyed `${auth.uid()}/${blobKey}`, so the owner is the first folder.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists "own media read"   on storage.objects;
drop policy if exists "own media write"  on storage.objects;
drop policy if exists "own media update" on storage.objects;
drop policy if exists "own media delete" on storage.objects;

create policy "own media read"   on storage.objects for select using (bucket_id = 'media' and owner = auth.uid());
create policy "own media write"  on storage.objects for insert with check (bucket_id = 'media' and owner = auth.uid());
create policy "own media update" on storage.objects for update using (bucket_id = 'media' and owner = auth.uid());
create policy "own media delete" on storage.objects for delete using (bucket_id = 'media' and owner = auth.uid());
