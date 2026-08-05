-- ============================================================================
-- Finder — auth, invites & superadmin  (Deploy #1)
-- Run this WHOLE file in the Supabase SQL editor, AFTER schema.sql.
--
-- Model: single tenant, invite-only, one superadmin.
--   • profiles       — one row per registered user (id, email, is_super).
--   • allowed_emails — the invite list. Only the superadmin can edit it.
--   • A database rule REJECTS any sign-up whose email isn't on the list, so
--     "invite only" is enforced server-side even though the app has no server.
--
-- IMPORTANT SUPABASE SETTING: because this rule now does the gating, public
-- sign-ups must be turned back ON:
--   Authentication → Sign In / Providers → Email → "Allow new users to sign up" = ON
-- (If you leave it OFF, nobody — not even an invited user — can register.)
--
-- The superadmin is seeded by email below. Sign up with that email and you get
-- superadmin automatically; everyone else must be on the invite list first.
--
-- Safe to re-run.
-- ============================================================================

-- The one superadmin, in one place. Change this string to re-point it.
-- (Used by the seed + both triggers via a tiny helper so it's never duplicated.)
create or replace function public.finder_superadmin_email()
returns text language sql immutable as $$ select lower('rowlandglew@yahoo.co.uk') $$;

-- ---------- profiles: who has registered ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  is_super   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Am I the superadmin? SECURITY DEFINER so it reads profiles regardless of RLS
-- (and so the policies below can call it without recursing).
create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_super)
$$;
grant execute on function public.is_super() to authenticated, anon;

alter table public.profiles enable row level security;
drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles update" on public.profiles;
-- You can read your own row; the superadmin can read everyone's (for the panel).
create policy "profiles read"   on public.profiles for select using (id = auth.uid() or public.is_super());
create policy "profiles update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- allowed_emails: the invite list (superadmin-managed) ----------
create table if not exists public.allowed_emails (
  email      text primary key,          -- always stored lower(trim())
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
drop policy if exists "super manages invites" on public.allowed_emails;
create policy "super manages invites" on public.allowed_emails
  for all using (public.is_super()) with check (public.is_super());

-- Seed the superadmin onto the invite list so it's visible and consistent.
insert into public.allowed_emails (email)
values (public.finder_superadmin_email())
on conflict (email) do nothing;

-- ---------- enforcement: reject sign-ups that aren't invited ----------
create or replace function public.finder_enforce_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(trim(new.email)) = public.finder_superadmin_email() then
    return new;                                  -- the superadmin is always allowed
  end if;
  if not exists (
    select 1 from public.allowed_emails where email = lower(trim(new.email))
  ) then
    raise exception 'FINDER_NOT_INVITED'
      using hint = 'This email has not been invited. Ask your administrator to add it.';
  end if;
  return new;
end $$;

drop trigger if exists finder_enforce_invite on auth.users;
create trigger finder_enforce_invite
  before insert on auth.users
  for each row execute function public.finder_enforce_invite();

-- ---------- provisioning: create a profile for every new user ----------
create or replace function public.finder_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, is_super)
  values (new.id, new.email, lower(trim(new.email)) = public.finder_superadmin_email())
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists finder_handle_new_user on auth.users;
create trigger finder_handle_new_user
  after insert on auth.users
  for each row execute function public.finder_handle_new_user();

-- ---------- backfill: profiles for anyone who registered before this ran ----------
insert into public.profiles (id, email, is_super)
select u.id, u.email, lower(trim(u.email)) = public.finder_superadmin_email()
from auth.users u
on conflict (id) do nothing;

-- Make sure the superadmin flag is set even if that account already existed.
update public.profiles
  set is_super = true
  where lower(trim(email)) = public.finder_superadmin_email();
