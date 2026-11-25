-- Existing production schedule fields. Keep a fresh install aligned with the live scheduler.
alter table public.standing_jobs add column if not exists hour smallint not null default 7 check (hour between 0 and 23);
alter table public.standing_jobs add column if not exists minute smallint not null default 0 check (minute between 0 and 59);
alter table public.standing_jobs add column if not exists last_status text;
alter table public.standing_jobs add column if not exists name text;
alter table public.standing_jobs add column if not exists action jsonb not null default '{}'::jsonb;
