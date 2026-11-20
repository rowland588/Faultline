-- ============================================================================
-- APP_SETTINGS — settings of Faultline itself, set ONCE by the administrator for everyone (20 November 2026, docs/CONNECTED-LUNA.md —
-- Rowland: "when I make the Microsoft account will the app auto connect … it needs to be ready to connect").
--
-- The first and only one so far: microsoft_client_id — the Application (client) ID Microsoft Entra gives Faultline's own registration.
-- Saved here once, every device of every person reads it on start, so Connect to Microsoft is ready everywhere at once: no rebuild, and
-- nothing typed on each device. It is NOT a secret — it is in every Microsoft sign-in address — so anyone may read it, even before
-- signing in (the sheet says whether Faultline is ready). Only the administrator (is_super) writes it. A key outside the list, or an ID
-- that is not a GUID, is refused by the table itself; nothing is deleted — a setting is cleared by writing ''.
--
-- Run ONCE. Safe to re-run. Applied with apply_migration under this name and read back (pg_policies, the constraint) before the app
-- reads it.
-- ============================================================================

create table if not exists public.app_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  updated_by  uuid default auth.uid()
);

alter table public.app_settings drop constraint if exists app_settings_known;
alter table public.app_settings add constraint app_settings_known check (
  key in ('microsoft_client_id')
  and (key <> 'microsoft_client_id' or value = '' or value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to anon, authenticated using (true);

drop policy if exists app_settings_insert on public.app_settings;
create policy app_settings_insert on public.app_settings for insert to authenticated with check ((select public.is_super()));

drop policy if exists app_settings_update on public.app_settings;
create policy app_settings_update on public.app_settings for update to authenticated using ((select public.is_super())) with check ((select public.is_super()));

revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;

-- what it did
select 'policy' as what, policyname as name, cmd, coalesce(qual, '') || ' / ' || coalesce(with_check, '') as rule
  from pg_policies where schemaname = 'public' and tablename = 'app_settings'
union all
select 'constraint', conname, '', pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.app_settings'::regclass and contype = 'c'
order by 1, 2;
