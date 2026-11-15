-- RESUME_PRODUCTION_DATA — the production data pull switched back on (15 November).
-- Rowland, 15 November, asked whether production data should be switched on: "yes switch on". It was held on 12 November
-- (PAUSE_PRODUCTION_DATA.sql) until the business data model was agreed; he has now said go without waiting for it.
-- PRODUCTION_DATA.sql (11 November) scheduled `luna-ingest-pull` every 15 minutes; this makes it active again. Nothing else changes:
-- the tables, their row-level security and the ingest function are as they were. With no connection made yet it fetches nothing.
-- Pausing again is PAUSE_PRODUCTION_DATA.sql.
-- Run ONCE. Safe to re-run.
select cron.alter_job(jobid, active := true) from cron.job where jobname = 'luna-ingest-pull';
select jobname, schedule, active from cron.job where jobname = 'luna-ingest-pull';
