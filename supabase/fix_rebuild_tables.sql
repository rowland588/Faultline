-- ============================================================================
-- Finder — REBUILD the five data tables with the CORRECT schema.
--
-- WHY: these tables were first created by a different (now-deleted) app with
-- date/time (timestamp) columns. Finder stores every clock as epoch
-- MILLISECONDS in a bigint, so sync fails with:
--   "date/time field value out of range: 0"
-- `create table if not exists` skipped the wrong tables, so we rebuild them.
--
-- SAFE TO RUN: this DROPS ONLY the cloud copies. Your real data lives on your
-- devices and re-uploads on the next sync (use "Full re-sync" in the app).
-- Auth, profiles, invites, and the media Storage bucket are untouched.
--
-- Run the WHOLE file in Supabase → SQL Editor.
-- ============================================================================

drop table if exists snags cascade;
drop table if exists snag_assets cascade;
drop table if exists segments cascade;
drop table if exists observations cascade;
drop table if exists workspaces cascade;

-- ---------- workspaces (the isolation container) ----------
create table workspaces (
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
create table observations (
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
  media jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

-- ---------- SNAG LIST: segments → assets → snags ----------
create table segments (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  sequence int not null,
  name text,
  video_key text not null,
  poster_key text,
  duration_s numeric,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table snag_assets (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  segment_id uuid not null references segments (id) on delete cascade,
  timestamp_s numeric not null,
  name text not null,
  code text,
  still_key text not null,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint
);

create table snags (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  asset_id uuid not null references snag_assets (id) on delete cascade,
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

-- ---------- indexes ----------
create index idx_observations_ws on observations (workspace_id);
create index idx_observations_updated on observations (owner_id, updated_at);
create index idx_segments_ws on segments (workspace_id);
create index idx_snag_assets_ws on snag_assets (workspace_id);
create index idx_snag_assets_seg on snag_assets (segment_id);
create index idx_snags_ws on snags (workspace_id);
create index idx_snags_asset on snags (asset_id);

-- ---------- row-level security ----------
alter table workspaces   enable row level security;
alter table observations enable row level security;
alter table segments     enable row level security;
alter table snag_assets  enable row level security;
alter table snags        enable row level security;

create policy "own workspaces"   on workspaces   for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own observations" on observations for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own segments"     on segments     for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own snag_assets"  on snag_assets  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own snags"        on snags        for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- sanity check: every clock column must be bigint ----------
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('workspaces','observations','segments','snag_assets','snags')
  and column_name in ('created_at','updated_at','deleted_at','started_at','ended_at','raised_at','closed_at')
order by table_name, column_name;
