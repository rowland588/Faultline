-- ============================================================================
-- FAULTLINE — STOP RLS CALLING auth.uid() ONCE PER ROW.
-- Run ONCE (SQL Editor → Run). Safe to re-run: the second run changes nothing.
--
-- A policy written `using (owner_id = auth.uid())` evaluates auth.uid() for
-- EVERY ROW it examines. Written `using (owner_id = (select auth.uid()))` the
-- planner hoists it to an InitPlan and evaluates it once for the whole query.
-- Measured on this schema with a counting stub: 10,002 calls became 2.
--
-- is_super() gets the same treatment and matters more per call, because it is
-- not a cheap lookup — it selects from public.profiles. Per row, on a table
-- being pulled by two devices, that is a query per row.
--
-- The functions that take the ROW'S OWN COLUMN — is_project_member(project_id),
-- is_ws_member(workspace_id) — are deliberately left alone. They cannot be
-- hoisted, because their answer depends on the row being tested. Wrapping them
-- changes nothing and pretending otherwise would hide the real cost.
--
-- WHY THIS READS THE CATALOGUE INSTEAD OF NAMING POLICIES: it rewrites what is
-- ACTUALLY on the database, whichever of the other files have been run and in
-- whatever order. A list of policy names hand-copied from those files would
-- silently miss any that differ, and silently fail on any not present.
--
-- NOTHING'S MEANING CHANGES. Only when and how often a function is called.
-- Every policy's command, roles, permissiveness and predicate are rebuilt
-- exactly as found, with the two call sites wrapped. The whole pass is one
-- transaction, so there is never a moment when a table sits without its policy.
-- ============================================================================

set search_path = public;

do $hoist$
declare
  r        record;
  new_q    text;
  new_c    text;
  stmt     text;
  changed  int := 0;
  seen     int := 0;
begin
  for r in
    select tablename, policyname, permissive, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  loop
    seen := seen + 1;

    new_q := r.qual;
    new_c := r.with_check;

    -- pass 1: unwrap anything already hoisted, so the text is in one known form
    new_q := regexp_replace(new_q, '\( SELECT (auth\.uid\(\)|is_super\(\)) AS \w+\)', '\1', 'g');
    new_c := regexp_replace(new_c, '\( SELECT (auth\.uid\(\)|is_super\(\)) AS \w+\)', '\1', 'g');
    -- pass 2: hoist. \m anchors to a word start so a longer identifier that
    -- merely ends in is_super() is never touched.
    new_q := regexp_replace(new_q, '\m(auth\.uid\(\)|is_super\(\))', '(select \1)', 'g');
    new_c := regexp_replace(new_c, '\m(auth\.uid\(\)|is_super\(\))', '(select \1)', 'g');

    -- Skip unless a BARE call actually remains in what is stored.
    --
    -- Not "unless my rewrite differs from the stored text": Postgres re-prints a
    -- wrapped call in its own canonical form, `( SELECT auth.uid() AS uid)`,
    -- which never matches the `(select auth.uid())` this builds. Comparing the
    -- two made an already-hoisted policy look like work, so it was dropped and
    -- recreated on every run and the count reported one more than it changed.
    -- Testing for a bare call instead means the number printed below is the
    -- number of policies that needed fixing, and a second run really is a no-op.
    if regexp_replace(
         coalesce(r.qual,'') || ' ' || coalesce(r.with_check,''),
         '\( SELECT (auth\.uid\(\)|is_super\(\)) AS \w+\)', '', 'g'
       ) !~ '\m(auth\.uid\(\)|is_super\(\))' then
      continue;
    end if;

    stmt := format('create policy %I on public.%I as %s for %s to %s',
                   r.policyname, r.tablename,
                   case when r.permissive = 'RESTRICTIVE' then 'restrictive' else 'permissive' end,
                   case r.cmd when 'ALL' then 'all' else lower(r.cmd) end,
                   array_to_string(r.roles, ', '));
    if new_q is not null then stmt := stmt || format(' using (%s)', new_q); end if;
    if new_c is not null then stmt := stmt || format(' with check (%s)', new_c); end if;

    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    execute stmt;

    changed := changed + 1;
    raise notice 'hoisted  %.%', r.tablename, r.policyname;
  end loop;

  raise notice '% of % policies rewritten', changed, seen;
end $hoist$;

-- CHECK: expect 0 and 0. Any other number means a policy still calls one of
-- these per row, and this file should be re-run.
select 'policies still calling auth.uid() per row' as item,
       count(*) as value
from pg_policies
where schemaname = 'public'
  and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ '\mauth\.uid\(\)'
  and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) !~ 'SELECT auth\.uid\(\)'
union all
select 'policies still calling is_super() per row',
       count(*)
from pg_policies
where schemaname = 'public'
  and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ '\mis_super\(\)'
  and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) !~ 'SELECT is_super\(\)';
