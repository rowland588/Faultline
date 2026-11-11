-- ============================================================================
-- LUNA — BUSINESS-WIDE FIGURES WORKED OUT IN THE DATABASE, UNDER THE CALLER'S OWN ROW-LEVEL SECURITY. Run ONCE. Safe to re-run.
--
-- Rowland, 11 November (docs/ORGANISATION.md O4, docs/LUNA-PLATFORM.md § "Business-wide reads run on the device"): "Luna must be
-- useful both to someone standing beside a production machine and someone sitting in the boardroom … an authorised senior manager
-- should be able to ask meaningful questions across departments and production lines."
--
-- A director's question across thirty lines should not wait on every row of thirty lines reaching one phone. So each question family
-- is a read-only function worked out here and returned as a few rows:
--
--   luna_losses_by_line(p_from, p_to, p_org)   the stops timed on each line in a period (observations): how many, the minutes, and
--                                              the crew's idle labour for those minutes where the line has a crew and a wage
--                                              (minutes ÷ 60 × crew × wage × on-costs — src/lib/cost labourPerHour, the same sum);
--                                              never a figure where an input is missing (null, said by the app)
--   luna_problems_by_area(p_now, p_org)        the open problems by site, area and priority: how many, how many past their day, the
--                                              minutes a day typed on them (src/lib/problemCost reads the same column) and how many
--                                              carry minutes
--   luna_actions_late(p_now, p_org)            what is owed past its day, by the person it is owed by (a problem's owner and due day —
--                                              the register's own actions, src/line/actions): how many, the oldest day, on how many lines
--   luna_output_by_line(p_from, p_to, p_org)   ONLY when public.production_records exists (another track adds it — PRODUCTION_DATA.sql):
--                                              output against target by line and day, as imported
--
-- SECURITY INVOKER, NEVER DEFINER. Each function runs as the person who calls it, so every table it reads answers through the same
-- policies as the app's own reads (is_ws_member — widened to the business and the person's scope by ORG_VISIBILITY.sql): a team leader
-- in Packing sums Packing's rows and nothing else, a leader sums the business. Nothing here can show a person a row they could not
-- already pull. Execute is granted to signed-in people only (not anon).
--
-- Times are the app's: milliseconds since 1970 (bigint), as every row carries them. p_org narrows to one business (workspaces.org_id);
-- null = every line the caller may read (a consultant across businesses). Archived and deleted lines are left out.
--
-- Depends on: ORGANISATIONS.sql (workspaces.org_id), CLIENT_SITE_AREA.sql (site_name, area_name), LABOUR_BURDEN.sql, PROBLEM_COST.sql
-- (minutes_per_day), PROBLEM_PRIORITY.sql (priority), ACTION_TRACKER.sql (due_at), PROBLEM_JOURNEY.sql (archived_at).
-- Read by src/capabilities/business.ts (business_summary), which falls back to the device's own records offline and says which.
-- WRITTEN 11 November 2026 (slice O4b). Applied with apply_migration under this name and read back (the select at the end).
-- ============================================================================

-- ---------------------------------------------------------------- losses by line and period
create or replace function public.luna_losses_by_line(p_from bigint, p_to bigint, p_org uuid default null)
returns table (
  workspace_id uuid, line text, site text, area text,
  stops bigint, timed bigint, minutes numeric, labour numeric
)
language sql stable security invoker set search_path = public
as $$
  select w.id, w.name, nullif(trim(w.site_name), ''), nullif(trim(w.area_name), ''),
         count(o.id),
         count(o.id) filter (where o.timing <> 'instant' and o.duration_ms > 0),
         round(coalesce(sum(o.duration_ms) filter (where o.timing <> 'instant' and o.duration_ms > 0), 0) / 60000.0, 2),
         case when coalesce(w.crew, 0) > 0 and coalesce(w.labour_rate_per_hour, 0) > 0
              then round(coalesce(sum(o.duration_ms) filter (where o.timing <> 'instant' and o.duration_ms > 0), 0) / 3600000.0
                         * w.crew * w.labour_rate_per_hour * coalesce(nullif(w.labour_burden, 0), 1), 2)
         end
    from public.workspaces w
    left join public.observations o
      on o.workspace_id = w.id and o.deleted_at is null and o.started_at >= p_from and o.started_at < p_to
   where w.deleted_at is null and not w.archived and (p_org is null or w.org_id = p_org)
   group by w.id, w.name, w.site_name, w.area_name, w.crew, w.labour_rate_per_hour, w.labour_burden
   order by 7 desc, 2;
$$;

-- ---------------------------------------------------------------- problems by area and priority
create or replace function public.luna_problems_by_area(p_now bigint, p_org uuid default null)
returns table (
  site text, area text, priority text,
  open bigint, late bigint, minutes_per_day numeric, with_minutes bigint, lines bigint
)
language sql stable security invoker set search_path = public
as $$
  select nullif(trim(w.site_name), ''), nullif(trim(w.area_name), ''), coalesce(s.priority, 'none'),
         count(s.id),
         count(s.id) filter (where s.due_at is not null and s.due_at < p_now),
         coalesce(sum(s.minutes_per_day), 0),
         count(s.id) filter (where s.minutes_per_day is not null),
         count(distinct s.workspace_id)
    from public.snags s
    join public.workspaces w on w.id = s.workspace_id and w.deleted_at is null and not w.archived
   where s.deleted_at is null and s.archived_at is null and s.status <> 'closed'
     and (p_org is null or w.org_id = p_org)
   group by 1, 2, 3
   order by 1 nulls last, 2 nulls last, 3;
$$;

-- ---------------------------------------------------------------- actions owed late, by person
create or replace function public.luna_actions_late(p_now bigint, p_org uuid default null)
returns table (who text, late bigint, oldest_due bigint, lines bigint)
language sql stable security invoker set search_path = public
as $$
  select coalesce(nullif(trim(s.owner), ''), '(nobody yet)'),
         count(s.id), min(s.due_at), count(distinct s.workspace_id)
    from public.snags s
    join public.workspaces w on w.id = s.workspace_id and w.deleted_at is null and not w.archived
   where s.deleted_at is null and s.archived_at is null and s.status <> 'closed'
     and s.due_at is not null and s.due_at < p_now
     and (p_org is null or w.org_id = p_org)
   group by 1
   order by 2 desc, 3;
$$;

-- ---------------------------------------------------------------- output against target, only where production records exist
do $$
begin
  if to_regclass('public.production_records') is not null then
    execute $f$
      create or replace function public.luna_output_by_line(p_from text, p_to text, p_org uuid default null)
      returns table (workspace_id uuid, line text, day text, output numeric, target numeric, good numeric, records bigint)
      language sql stable security invoker set search_path = public
      as $b$
        select w.id, w.name, r.day, sum(r.output), sum(r.target), sum(r.good), count(r.id)
          from public.production_records r
          join public.workspaces w on w.id = r.workspace_id and w.deleted_at is null and not w.archived
         where r.deleted_at is null and r.day >= p_from and r.day <= p_to
           and (p_org is null or w.org_id = p_org)
         group by w.id, w.name, r.day
         order by r.day, w.name;
      $b$;
    $f$;
  end if;
end $$;

-- ---------------------------------------------------------------- who may call them: signed-in people, as themselves
revoke all on function public.luna_losses_by_line(bigint, bigint, uuid) from public, anon;
revoke all on function public.luna_problems_by_area(bigint, uuid) from public, anon;
revoke all on function public.luna_actions_late(bigint, uuid) from public, anon;
grant execute on function public.luna_losses_by_line(bigint, bigint, uuid) to authenticated;
grant execute on function public.luna_problems_by_area(bigint, uuid) to authenticated;
grant execute on function public.luna_actions_late(bigint, uuid) to authenticated;
do $$
begin
  if to_regprocedure('public.luna_output_by_line(text, text, uuid)') is not null then
    execute 'revoke all on function public.luna_output_by_line(text, text, uuid) from public, anon';
    execute 'grant execute on function public.luna_output_by_line(text, text, uuid) to authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------- read back: each function, and that it is INVOKER
select p.proname as function,
       pg_get_function_identity_arguments(p.oid) as arguments,
       case when p.prosecdef then 'SECURITY DEFINER — WRONG' else 'invoker' end as runs_as,
       has_function_privilege('authenticated', p.oid, 'execute') as signed_in_may_call,
       has_function_privilege('anon', p.oid, 'execute') as anon_may_call
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('luna_losses_by_line', 'luna_problems_by_area', 'luna_actions_late', 'luna_output_by_line')
 order by 1;
