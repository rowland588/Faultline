-- THE GATES OF A STAGE-GATE JOB.
--
-- Rowland: "Install is the only gate we have. Next gate set up — programs;
-- next commissioning; after that handover." Install, Set up and Hand over are
-- each a list of stages ticked off per machine: the same row as an install
-- step, told apart by `gate`. Commission is the tests.
--
--   tests.gate            'setup' | 'handover'; NULL is Install, which is every
--                         step written before the other gates existed.
--   projects.gate_stages  the job's own Set up and Hand over lists,
--                         {"setup": [...], "handover": [...]}; NULL (or a gate
--                         absent) means the app's defaults.
--
-- Additive. Safe to run more than once.

alter table public.tests add column if not exists gate text;
alter table public.projects add column if not exists gate_stages jsonb;

do $$ begin
  alter table public.tests add constraint tests_gate_check
    check (gate is null or gate in ('setup', 'handover'));
exception when duplicate_object then null; end $$;
