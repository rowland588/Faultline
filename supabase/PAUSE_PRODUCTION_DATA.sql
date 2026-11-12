-- PAUSE_PRODUCTION_DATA — the production data pull held (12 November).
-- Rowland: "Do not activate production data connections yet. I want to establish the business data model, product and process
-- identities, source traceability and validation requirements before we start feeding production data into Luna."
-- PRODUCTION_DATA.sql (11 November) scheduled `luna-ingest-pull` every 15 minutes. With no connection it fetched nothing, but it was
-- running. This pauses it — nothing is dropped or deleted; the tables, the ingest function and the job stay, and switching it back on
-- is `select cron.alter_job(jobid, active := true) from cron.job where jobname = 'luna-ingest-pull';`.
-- Run ONCE. Safe to re-run.
select cron.alter_job(jobid, active := false) from cron.job where jobname = 'luna-ingest-pull';
select jobname, schedule, active from cron.job where jobname = 'luna-ingest-pull';
