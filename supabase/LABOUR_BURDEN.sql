-- ============================================================================
-- FAULTLINE — ON-COSTS RATIO. Run ONCE (SQL Editor → Run). Re-runnable.
-- Idle-labour cost becomes crew × wage × on-costs ratio: the multiplier
-- (employer NI, pension, holiday cover — typically 1.25–1.4) that turns a wage
-- into what a person actually costs the business. One nullable column; unset
-- means ×1 (wages only), so existing numbers don't move until you set it.
-- ============================================================================

alter table public.workspaces add column if not exists labour_burden numeric;

select 'workspaces.labour_burden',
  case when exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'workspaces'
                      and column_name = 'labour_burden')
       then 'added ✓' else 'MISSING — rerun' end;
