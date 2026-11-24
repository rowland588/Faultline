-- Repair the G7 scheduler installed by STANDING_JOBS.sql. The project_url Vault
-- secret is absent in production, so the old command passed NULL to pg_net.
-- Generate the request key in Postgres before the endpoint is ever called.
update public.standing_job_keys
set cron_key = encode(gen_random_bytes(32), 'hex')
where id = 1 and cron_key = 'SET-ME';

do $repair$
declare standing_job_id bigint;
begin
  select jobid into standing_job_id from cron.job where jobname = 'faultline-standing-jobs';
  if standing_job_id is not null then
    perform cron.alter_job(
      standing_job_id,
      '0 7 * * 1',
      $call$select net.http_post(
        url := 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/standing-job',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-standing-key', (select cron_key from public.standing_job_keys where id = 1)
        ),
        body := '{"mode":"tick"}'::jsonb
      ) as request_id;$call$
    );
  end if;
end $repair$;
