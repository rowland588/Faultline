-- ============================================================================
-- TEST — WHO SEES WHICH LINES IN A BUSINESS (docs/ORGANISATION.md O3; ORGANISATIONS.sql, ORG_PEOPLE.sql, ORG_VISIBILITY.sql).
--
-- Run AFTER the three files, as the database's owner (the SQL editor, or execute_sql). Everything happens inside one transaction that
-- is ROLLED BACK at the end: nothing it makes is kept. Each person is played by setting the JWT claims and the `authenticated` role, as
-- PostgREST does. A check that fails raises an exception naming it; the last select says ALL PASSED.
--
-- The business "Test Foods": two lines at Hull — T-Packing (area Packing) and T-Dispatch (area Dispatch) — made by its administrator,
-- a problem on each. Its people:
--   admin   its maker
--   leader  the whole business
--   team    Packing only
--   viewer  the whole business, reads only
--   gone    team, the whole business, then removed
--   stranger  on no list
-- ============================================================================
begin;

-- ---------------------------------------------------------------- the people (as the owner)
insert into public.allowed_emails (email, scope) values
  ('t.admin@org-test.example', 'app'), ('t.leader@org-test.example', 'org'), ('t.team@org-test.example', 'org'),
  ('t.viewer@org-test.example', 'org'), ('t.gone@org-test.example', 'org'), ('t.stranger@org-test.example', 'app')
on conflict (email) do nothing;

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 't.admin@org-test.example',    now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 't.leader@org-test.example',   now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 't.team@org-test.example',     now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 't.viewer@org-test.example',   now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 't.gone@org-test.example',     now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 't.stranger@org-test.example', now(), now(), now());

-- ---------------------------------------------------------------- the business, its lines, its problems
insert into public.organisations (id, name, created_by, created_at, updated_at)
values ('b0000000-0000-4000-8000-000000000001', 'Test Foods', 'a0000000-0000-4000-8000-000000000001', 1, 1);

insert into public.organisation_members (id, org_id, email, role, sites, areas, invited_by, created_at, updated_at) values
  ('b0000000-0000-4000-8000-000000000001:t.admin@org-test.example',  'b0000000-0000-4000-8000-000000000001', 't.admin@org-test.example',  'admin',  '{}', '{}',        'a0000000-0000-4000-8000-000000000001', 1, 1),
  ('b0000000-0000-4000-8000-000000000001:t.leader@org-test.example', 'b0000000-0000-4000-8000-000000000001', 't.leader@org-test.example', 'leader', '{}', '{}',        'a0000000-0000-4000-8000-000000000001', 1, 1),
  ('b0000000-0000-4000-8000-000000000001:t.team@org-test.example',   'b0000000-0000-4000-8000-000000000001', 't.team@org-test.example',   'team',   '{}', '{Packing}', 'a0000000-0000-4000-8000-000000000001', 1, 1),
  ('b0000000-0000-4000-8000-000000000001:t.viewer@org-test.example', 'b0000000-0000-4000-8000-000000000001', 't.viewer@org-test.example', 'viewer', '{}', '{}',        'a0000000-0000-4000-8000-000000000001', 1, 1),
  ('b0000000-0000-4000-8000-000000000001:t.gone@org-test.example',   'b0000000-0000-4000-8000-000000000001', 't.gone@org-test.example',   'team',   '{}', '{}',        'a0000000-0000-4000-8000-000000000001', 1, 1);
update public.organisation_members set deleted_at = 2 where email = 't.gone@org-test.example';

insert into public.workspaces (id, owner_id, name, site_name, area_name, org_id, created_at, updated_at) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'T-Packing',  'Hull', 'Packing',  'b0000000-0000-4000-8000-000000000001', 1, 1),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'T-Dispatch', 'Hull', 'Dispatch', 'b0000000-0000-4000-8000-000000000001', 1, 1);

insert into public.snags (id, owner_id, workspace_id, problem, raised_at, updated_at) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'T: film off the roller', 1, 1),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'T: pallet wrap torn',    1, 1);

-- ---------------------------------------------------------------- the invite opened the front door (ORG_PEOPLE.sql)
do $t$ begin
  if not exists (select 1 from public.allowed_emails where email = 't.team@org-test.example' and scope = 'org') then
    raise exception 'FAIL: an invited address is on allowed_emails with scope org';
  end if;
end $t$;

-- ================================================================ team, Packing only
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","email":"t.team@org-test.example","role":"authenticated"}', true);
do $t$ begin
  if (select count(*) from public.workspaces where name like 'T-%') <> 1 then raise exception 'FAIL: team in Packing reads one line, not %', (select count(*) from public.workspaces where name like 'T-%'); end if;
  if exists (select 1 from public.workspaces where name = 'T-Dispatch') then raise exception 'FAIL: team in Packing reads Dispatch''s line'; end if;
  if exists (select 1 from public.snags where problem = 'T: pallet wrap torn') then raise exception 'FAIL: team in Packing reads Dispatch''s problem'; end if;
  if not exists (select 1 from public.snags where problem = 'T: film off the roller') then raise exception 'FAIL: team in Packing reads Packing''s problem'; end if;
  -- writes on Packing; refused on Dispatch
  insert into public.snags (id, workspace_id, problem, raised_at, updated_at)
  values ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'T: raised by the team leader', 1, 1);
  begin
    insert into public.snags (id, workspace_id, problem, raised_at, updated_at)
    values ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'T: should be refused', 1, 1);
    raise exception 'FAIL: team in Packing wrote on Dispatch';
  exception when insufficient_privilege then null;
  end;
  -- the people list: read, not written
  if (select count(*) from public.organisation_members where org_id = 'b0000000-0000-4000-8000-000000000001') < 4 then raise exception 'FAIL: a member reads the people'; end if;
  begin
    insert into public.organisation_members (id, org_id, email, role, created_at, updated_at)
    values ('b0000000-0000-4000-8000-000000000001:x@org-test.example', 'b0000000-0000-4000-8000-000000000001', 'x@org-test.example', 'admin', 1, 1);
    raise exception 'FAIL: a team member invited somebody';
  exception when insufficient_privilege then null;
  end;
end $t$;
reset role;

-- ================================================================ leader, the whole business
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","email":"t.leader@org-test.example","role":"authenticated"}', true);
do $t$ begin
  if (select count(*) from public.workspaces where name like 'T-%') <> 2 then raise exception 'FAIL: the leader reads both lines'; end if;
  if (select count(*) from public.snags where problem like 'T:%') <> 3 then raise exception 'FAIL: the leader reads all three problems, not %', (select count(*) from public.snags where problem like 'T:%'); end if;
  if (select count(*) from public.organisations where name = 'Test Foods') <> 1 then raise exception 'FAIL: a member reads their business'; end if;
end $t$;
reset role;

-- ================================================================ viewer: reads, writes nothing
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","email":"t.viewer@org-test.example","role":"authenticated"}', true);
do $t$
declare n int;
begin
  if (select count(*) from public.workspaces where name like 'T-%') <> 2 then raise exception 'FAIL: the viewer reads both lines'; end if;
  if (select count(*) from public.snags where problem like 'T:%') <> 3 then raise exception 'FAIL: the viewer reads the problems'; end if;
  begin
    insert into public.snags (id, workspace_id, problem, raised_at, updated_at)
    values ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'T: a viewer''s problem', 1, 1);
    raise exception 'FAIL: the viewer raised a problem';
  exception when insufficient_privilege then null;
  end;
  update public.snags set problem = 'T: changed by the viewer' where id = 'd0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: the viewer changed a problem'; end if;
  update public.workspaces set name = 'T-Renamed' where id = 'c0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: the viewer renamed a line'; end if;
  delete from public.snags where id = 'd0000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: the viewer deleted a problem'; end if;
  begin
    update public.organisations set name = 'Viewer Foods' where id = 'b0000000-0000-4000-8000-000000000001';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: the viewer renamed the business'; end if;
  end;
end $t$;
reset role;

-- ================================================================ removed, and a stranger: nothing
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000005","email":"t.gone@org-test.example","role":"authenticated"}', true);
do $t$ begin
  if exists (select 1 from public.workspaces where name like 'T-%') then raise exception 'FAIL: somebody removed still reads the lines'; end if;
  if exists (select 1 from public.organisations where name = 'Test Foods') then raise exception 'FAIL: somebody removed still reads the business'; end if;
end $t$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000006","email":"t.stranger@org-test.example","role":"authenticated"}', true);
do $t$ begin
  if exists (select 1 from public.workspaces where name like 'T-%') then raise exception 'FAIL: a stranger reads the lines'; end if;
  if exists (select 1 from public.snags where problem like 'T:%') then raise exception 'FAIL: a stranger reads the problems'; end if;
  if exists (select 1 from public.organisation_members where email like '%@org-test.example') then raise exception 'FAIL: a stranger reads the people'; end if;
end $t$;
reset role;

-- ================================================================ admin: manages the people
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","email":"t.admin@org-test.example","role":"authenticated"}', true);
do $t$
declare n int;
begin
  update public.organisation_members set role = 'manager' where email = 't.team@org-test.example';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the administrator changes a role'; end if;
  update public.organisations set name = 'Test Foods Ltd' where id = 'b0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the administrator renames the business'; end if;
end $t$;
reset role;

-- ---------------------------------------------------------------- done
select 'ALL PASSED — team scoped to Packing cannot read Dispatch; leader reads all; viewer reads and cannot write; removed and stranger read nothing; admin manages people' as result;
rollback;
