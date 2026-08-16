-- ============================================================================
-- FAULTLINE — THE PROOF STUDY. Run ONCE (SQL Editor → Run). Re-runnable.
--
-- "We saved £X/week" needs a receipt, and the passive trend can't be one —
-- it only shows what people happened to log. Two columns give both worlds
-- their proof:
--   cases.study — the confirmation study (started, target sample size,
--     called). Before/after means over the same scope, same method, both
--     sample sizes always shown; the maths derives on the device.
--   snags.fixed_photo_key — the camera world's proof: the AFTER photo next
--     to the before-still. Walk back, look again, show it.
-- ============================================================================

alter table public.cases add column if not exists study jsonb;
alter table public.snags add column if not exists fixed_photo_key text;

-- ---------- report ----------
select 'cases.study' as item,
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cases' and column_name = 'study') then 'added ✓' else 'MISSING — rerun' end as value
union all
select 'snags.fixed_photo_key',
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'snags' and column_name = 'fixed_photo_key') then 'added ✓' else 'MISSING — rerun' end;
