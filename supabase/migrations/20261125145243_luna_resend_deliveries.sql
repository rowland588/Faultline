-- An outbound message is identified by the confirmed command or by the schedule and period.
create table public.luna_mail_deliveries (
  delivery_key text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  payload jsonb,
  provider_id text,
  accepted_at timestamptz
);
alter table public.luna_mail_deliveries enable row level security;
revoke all on public.luna_mail_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.luna_mail_deliveries to service_role;

-- Keep the existing cron endpoint and secret. A five minute tick supports the schedule's London time.
do $$ declare tick bigint; begin
  select jobid into tick from cron.job where jobname = 'faultline-standing-jobs';
  if tick is not null then perform cron.alter_job(tick, schedule := '*/5 * * * *'); end if;
end $$;

-- Only the cron database role and the edge function need the trigger key.
alter table public.standing_job_keys enable row level security;
revoke all on public.standing_job_keys from public, anon, authenticated;
grant select on public.standing_job_keys to service_role;
update public.standing_job_keys set cron_key = gen_random_uuid()::text || gen_random_uuid()::text where id = 1;

alter table public.standing_jobs add column email_accepted_period text;
create policy "private email schedules" on public.standing_jobs as restrictive for all to authenticated
  using (not (scope ? 'email') or owner_id = (select auth.uid()))
  with check (not (scope ? 'email') or owner_id = (select auth.uid()));

-- Use the factory's production lines. Area records and project walk workspaces are separate places.
create function public.luna_mail_line_briefing(p_owner uuid, p_client text) returns text
language sql stable security invoker set search_path = '' as $$
  with lines as materialized (
    select w.id, w.name, w.floor_order from public.workspaces w
    where w.owner_id = p_owner and lower(trim(w.client_name)) = lower(trim(p_client))
      and trim(p_client) <> '' and w.deleted_at is null and not w.archived
      and w.name not like 'Demo — %' and lower(trim(coalesce(w.line_type, ''))) <> 'the area itself'
      and not exists (select 1 from public.projects p where p.walk_workspace_id = w.id::text and p.owner_id = p_owner and p.deleted_at is null
        and not exists (select 1 from public.pace_ppm l where l.workspace_id = w.id::text and l.owner_id = p_owner and l.deleted_at is null))
  ), problems as materialized (
    select s.id, s.problem, s.priority, s.owner, s.updated_at, l.name
    from public.snags s join lines l on l.id = s.workspace_id
    where s.owner_id = p_owner and s.deleted_at is null and s.archived_at is null and s.status in ('open', 'in_progress')
  )
  select concat_ws(E'\n\n',
    case when exists (select from lines) then
      'Active lines (' || (select count(*) from lines) || '): ' ||
      (select string_agg(name, ', ' order by floor_order nulls last, name, id)
        from (select * from lines order by floor_order nulls last, name, id limit 100) listed) ||
      case when (select count(*) from lines) > 100 then ' (first 100 shown)' else '' end
    else 'No active lines are synced for this customer.' end,
    'Open problems: ' || (select count(*) from problems),
    (select string_agg(concat_ws(' · ',name,problem,priority,nullif(owner,'')), E'\n' order by updated_at desc, id)
      from (select * from problems order by updated_at desc, id limit 20) recent),
    case when (select count(*) from problems) > 20 then 'Showing the 20 most recently updated problems.' end)
$$;
revoke all on function public.luna_mail_line_briefing(uuid,text) from public, anon, authenticated;
grant execute on function public.luna_mail_line_briefing(uuid,text) to service_role;
