-- FAULTLINE — a win carries its proof
--
-- A win used to be a story with a number somebody typed into a box. It can now
-- carry a measured claim instead: which line's weeks, both means, both week
-- counts, the significance, and the moment it was called — frozen, so later
-- weeks cannot quietly rewrite something already read out in a meeting.
--
-- One nullable jsonb column. Every existing win keeps working untouched: no
-- proof means it is still a story, which is allowed.
--
-- Safe to run twice.

alter table public.pace_wins
  add column if not exists proof jsonb;

comment on column public.pace_wins.proof is
  'Frozen ppm receipt: {lineKey,lineName,fromWeek,calledAt,beforeN,beforeMean,afterN,afterMean,deltaPpm,changePct,pValue}. Null = the win is a story, not a measured claim.';

-- The report reads the called wins for a project newest-first; without this it
-- is a sequential scan over every win in the account to find them.
create index if not exists pace_wins_proof_idx
  on public.pace_wins (project_id, created_at desc)
  where proof is not null and deleted_at is null;

-- No RLS change: proof rides on the pace_wins row, so it is already covered by
-- whatever policy lets you see the win itself.
