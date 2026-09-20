-- ============================================================================
-- FAULTLINE — COMMISSIONING, REBUILT FROM THE JOB. Run ONCE. Safe to re-run.
--
-- The four cuts before this one each invented a process and asked the job to fit
-- it: a readiness checklist, then six gates with pass criteria, then a programme
-- of phases, then one flat list grouped by stage. What the person doing the job
-- actually has in front of him is this:
--
--   machinery on site, being tested with the OEM;
--   a film transition where the OLD stock still runs and the NEW stock does not
--     behave the same, so results got on the old spec are not evidence;
--   programs missing, including on a line commissioned two years ago;
--   and one question — where are we now.
--
-- So there are two new tables and six new columns, and between them they say:
--
--   ASSETS ARE RECORDS. A machine used to be a typed-in name on each item, so it
--   could not carry a state, a supplier or a document, and two spellings were two
--   machines. `docs` is jsonb metadata for the OEM's PDFs; the BYTES go through
--   the same media pipeline as a snag photo, which is what makes a FAT report
--   openable on a factory floor with no signal.
--
--   PACKS ARE THE OTHER AXIS. A rate, a seal and a weight check are proved per
--   pack, never once for a line. A program is one (asset, pack) cell, and a cell
--   with no program is a hole you can SEE — on a new line, and on one signed off
--   in 2024.
--
--   THE CONDITIONS ARE PART OF THE EVIDENCE. `proven_on` records which material
--   spec a result was got on, and `supersedes` says that one spec replaces
--   another. Together they mean a rate proved on 40µ film stops counting the day
--   35µ film lands, automatically, without anybody remembering. This is the one
--   thing every earlier cut missed, and it is the one that silently lies.
-- ============================================================================

-- ---------- the machines ----------

create table if not exists public.commission_assets (
  id           text primary key,
  owner_id     uuid not null default auth.uid(),
  project_id   text not null,

  name         text not null,
  -- who supplied it, for the conversation about whose job a fix is
  oem          text,
  -- awaited | onSite | installed | running. Text rather than an enum: the first
  -- job that wants "in FAT" or "decommissioned" must not need a migration and a
  -- deploy in lockstep.
  state        text not null default 'onSite',

  -- ISO dates (yyyy-mm-dd), not timestamps: a machine arrives on a DAY, and
  -- storing a midnight in some zone invites the classic off-by-one where a date
  -- shown in Manchester is the day before the one stored.
  arrived_at   text,
  installed_at text,

  -- The OEM's paperwork: [{id,name,blobKey,mime,bytes,savedAt,readAt}]. jsonb
  -- rather than a table because a document has no life of its own — it belongs
  -- to the asset, is always read with it, and is never queried across assets.
  docs         jsonb,

  note         text,
  sort         numeric not null default 0,

  updated_at   bigint not null,
  deleted_at   bigint
);

create index if not exists commission_assets_project_idx on public.commission_assets (project_id);
create index if not exists commission_assets_owner_idx   on public.commission_assets (owner_id);

-- ---------- the packs ----------

create table if not exists public.commission_packs (
  id           text primary key,
  owner_id     uuid not null default auth.uid(),
  project_id   text not null,

  name         text not null,
  sort         numeric not null default 0,

  updated_at   bigint not null,
  deleted_at   bigint
);

create index if not exists commission_packs_project_idx on public.commission_packs (project_id);
create index if not exists commission_packs_owner_idx   on public.commission_packs (owner_id);

-- ---------- what an item now says about itself ----------

-- Which machine and which pack, by id. `asset` (the old free-text column) is
-- left in place and still read as a display fallback: a row typed on a phone
-- before this migration knows one thing about itself, and dropping the column
-- would throw it away for no gain.
alter table public.commission_items add column if not exists asset_id text;
alter table public.commission_items add column if not exists pack_id  text;

-- A / B / C on EVERY kind of item, not only on defects. A missing program stops
-- the line exactly as hard as a broken guard does, and the grade is what makes a
-- list of things into a list of work.
alter table public.commission_items add column if not exists grade text;

-- THE TRANSITION, and THE CONDITIONS. `spec` names what this material actually
-- is ("40µ", "35µ modified") so two rows of the same film are two different
-- conditions; `supersedes` points at the row this one replaces; `proven_on`
-- records which of them a result was got on. A program's runs carry the same
-- pointer inside their own jsonb, per run, because each run happened on whatever
-- was on the machine that day.
alter table public.commission_items add column if not exists spec       text;
alter table public.commission_items add column if not exists supersedes text;
alter table public.commission_items add column if not exists proven_on  text;

create index if not exists idx_commission_items_asset on public.commission_items (asset_id);
create index if not exists idx_commission_items_pack  on public.commission_items (pack_id);

-- ---------- the two dates the job is judged on ----------
--
-- On the project, because they belong to the whole job rather than to any stage
-- of it. planned_at is written once, when the date is agreed, and must never be
-- quietly rewritten afterwards: it is the thing every slip is measured from. A
-- system that lets the baseline follow the forecast around always reports that
-- everything is on time.
alter table public.projects add column if not exists planned_at  text;
alter table public.projects add column if not exists expected_at text;

-- ---------- sync transport: the rev stamp ----------
--
-- Not optional, and not per-table optional either. Devices pull with "rev > the
-- last rev I saw", and a table WITHOUT this column answers that query with
-- 42703 — which the app reads as "this cloud is too old for rev cursors",
-- degrading the pull for EVERY table for the rest of the session. Two new tables
-- missing three lines each would take the snags and the tracker down with them.

create sequence if not exists public.faultline_rev_seq;

create or replace function public.faultline_stamp_rev() returns trigger language plpgsql
set search_path = ''
as $stamp$
begin
  new.rev := nextval('public.faultline_rev_seq');
  return new;
end $stamp$;

do $rev$
declare t text;
begin
  foreach t in array array['commission_assets', 'commission_packs'] loop
    execute format('alter table public.%I add column if not exists rev bigint', t);
    execute format('drop trigger if exists faultline_rev on public.%I', t);
    execute format('create trigger faultline_rev before insert or update on public.%I
                    for each row execute function public.faultline_stamp_rev()', t);
    -- A null rev is never greater than a cursor, so a row written by an earlier
    -- run would be invisible to every pull until somebody happened to edit it.
    execute format('update public.%I set rev = nextval(''public.faultline_rev_seq'') where rev is null', t);
    execute format('create index if not exists idx_%I_rev on public.%I (rev)', t, t);

    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;   -- already published
      when undefined_object then null;   -- realtime disabled here
    end;

    execute format('alter table public.%I enable row level security', t);

    -- Scoped to the project, exactly like commission_items: somebody invited
    -- onto the job must see the machines, or they open a line being handed over
    -- and find an empty page with nothing to say why.
    --
    -- auth.uid() is wrapped in (select …) so the planner hoists it to an
    -- InitPlan and runs it once per query rather than once per row, and the
    -- cheap owner_id test is written first so it short-circuits the membership
    -- function in the common case.
    execute format('drop policy if exists "project %s" on public.%I', t, t);
    if exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
               where ns.nspname = 'public' and p.proname = 'is_project_member') then
      execute format('create policy "project %s" on public.%I for all to authenticated
                      using (owner_id = (select auth.uid()) or (select public.is_project_member(project_id)))
                      with check (owner_id = (select auth.uid()) or (select public.is_project_member(project_id)))', t, t);
    else
      execute format('create policy "project %s" on public.%I for all to authenticated
                      using (owner_id = (select auth.uid()))
                      with check (owner_id = (select auth.uid()))', t, t);
    end if;
  end loop;
end $rev$;

-- CHECK: expect one row reading ready ✓ for each. Anything else means re-run.
select 'commission_assets' as item,
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'commission_assets'
                    and column_name in ('name','state','docs','sort','rev','updated_at')) = 6
             and exists (select 1 from pg_trigger where tgname = 'faultline_rev' and tgrelid = 'public.commission_assets'::regclass)
             and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'commission_assets')
            then 'ready ✓' else 'MISSING — rerun' end as value
union all
select 'commission_packs',
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'commission_packs'
                    and column_name in ('name','sort','rev','updated_at')) = 4
             and exists (select 1 from pg_trigger where tgname = 'faultline_rev' and tgrelid = 'public.commission_packs'::regclass)
             and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'commission_packs')
            then 'ready ✓' else 'MISSING — rerun' end
union all
select 'commission_items new columns',
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'commission_items'
                    and column_name in ('asset_id','pack_id','grade','spec','supersedes','proven_on')) = 6
            then 'ready ✓' else 'MISSING — rerun' end
union all
select 'projects dates',
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'projects'
                    and column_name in ('planned_at','expected_at')) = 2
            then 'ready ✓' else 'MISSING — rerun' end;
