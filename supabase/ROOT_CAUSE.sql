-- ============================================================================
-- FAULTLINE — THE WHY-CHAIN. Run ONCE (SQL Editor → Run). Re-runnable.
--
-- The floor's action composer asks WHAT to do; the Case now asks WHY it
-- happens: a 5-Whys chain (jsonb array of "because…" lines, the last one
-- the root cause), printed into the A3's Analysis box and shown above the
-- countermeasures so cause → action → proof reads as one argument.
-- ============================================================================

alter table public.cases add column if not exists whys jsonb;

-- ---------- report ----------
select 'cases.whys' as item,
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cases' and column_name = 'whys') then 'added ✓' else 'MISSING — rerun' end as value;
