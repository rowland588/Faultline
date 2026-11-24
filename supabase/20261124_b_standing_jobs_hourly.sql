-- The deployed standing-job function evaluates each job's local due time.
-- Run the tick hourly so daily, weekday and weekly jobs are all reached.
do $repair$
declare standing_job_id bigint;
begin
  select jobid into standing_job_id from cron.job where jobname = 'faultline-standing-jobs';
  if standing_job_id is not null then
    perform cron.alter_job(standing_job_id, '5 * * * *');
  end if;
end $repair$;
