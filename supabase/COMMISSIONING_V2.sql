-- ============================================================================
-- FAULTLINE — COMMISSIONING, PROPERLY. Run ONCE (SQL Editor → Run). Safe to re-run.
--
-- The first cut of this table was the tracker's shape with a commissioning label
-- on it: one generic item with a free-text `target`, a `stream` string, and
-- quarterly numbers borrowed from the Pace project. Quarterly targets mean
-- nothing in a handover. A rate is agreed ONCE, in writing, before the machine
-- ships, and the only question is whether it has been proven.
--
-- So the five things a handover is made of each get the columns they need:
--
--   program   agreed_rate as a NUMBER (it is contractual), rate_unit, `written`
--             so a program nobody has created yet reads as MISSING rather than
--             merely untested, and `runs` — the evidence: ran for so long,
--             achieved so much, witnessed by whom.
--   material  need / have / on_order / unit. Nothing more.
--   check     criterion, result, outcome, and who witnessed it. An acceptance
--             test nobody signed is not acceptance.
--   punch     severity A/B/C as every handover in the industry grades them, with
--             raised_at and closed_at.
--   task      task_stage, reused — it already meant exactly this.
--
-- All additive. Every new column is nullable because each kind fills only its
-- own: a program has no severity and a punch item has no agreed rate. Nothing is
-- dropped, so a row written by the earlier cut still reads back — it simply
-- arrives as a task, which is the honest reading of an item that never said what
-- kind it was.
-- ============================================================================

alter table public.commission_items add column if not exists agreed_rate  numeric;
alter table public.commission_items add column if not exists rate_unit    text;
alter table public.commission_items add column if not exists written      boolean;
alter table public.commission_items add column if not exists runs         jsonb;

alter table public.commission_items add column if not exists unit         text;

alter table public.commission_items add column if not exists criterion    text;
alter table public.commission_items add column if not exists outcome      text;
alter table public.commission_items add column if not exists witnessed_by text;
alter table public.commission_items add column if not exists witnessed_at bigint;

alter table public.commission_items add column if not exists severity     text;
alter table public.commission_items add column if not exists raised_at    bigint;
alter table public.commission_items add column if not exists closed_at    bigint;
alter table public.commission_items add column if not exists fix_by       text;

-- The sheet is read one machine at a time, and the open punch list is read by
-- severity, so both get an index.
create index if not exists idx_commission_items_asset
  on public.commission_items (project_id, asset);
create index if not exists idx_commission_items_open_punch
  on public.commission_items (project_id, severity)
  where kind = 'punch' and closed_at is null;

-- CHECK: expect one row reading ready ✓
select 'commission_items v2' as item,
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'commission_items'
                    and column_name in ('agreed_rate','rate_unit','written','runs','unit',
                                        'criterion','outcome','witnessed_by','witnessed_at',
                                        'severity','raised_at','closed_at','fix_by')) = 13
            then 'ready ✓' else 'MISSING — rerun' end as value;
