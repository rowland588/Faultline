-- Existing project actions and test/fix records retain supporting source references.
-- Additive nullable fields: no record, permission, owner or calculation changes.
alter table public.pace_todos add column if not exists sources jsonb;
alter table public.pace_todos add column if not exists standalone boolean not null default false;
alter table public.pace_todos add column if not exists workspace_id text;
alter table public.pace_todos add column if not exists client_name text;
alter table public.tests add column if not exists sources jsonb;
alter table public.pace_todos add constraint pace_todos_sources_array check (sources is null or jsonb_typeof(sources) = 'array');
alter table public.tests add constraint tests_sources_array check (sources is null or jsonb_typeof(sources) = 'array');
comment on column public.pace_todos.sources is 'Supporting record/conversation references. A reference does not assert verified proof.';
comment on column public.tests.sources is 'Supporting record/conversation references. Test outcome and verification remain separate.';
