-- ============================================================================
-- FAULTLINE — TEAM UPGRADE. Run ONCE (SQL Editor → Run). Safe to re-run.
--
-- Before this, every user's data was PRIVATE to them: row security was
-- "you see what you own", so an invited colleague got an account and an empty
-- world. This turns the deployment into ONE TEAM: everyone invited shares the
-- same workspaces — the CI manager's losses, engineering's snag list and
-- production's shift captures all live in the same place.
--
-- Access model: sign-up is already invite-only (the admin controls
-- allowed_emails), so "any authenticated user" IS the team. Rows keep their
-- owner_id for attribution ("logged by Dave"), not for privacy.
-- ============================================================================

-- ---------- data tables: owner-private → team-shared ----------
do $$
declare t text;
begin
  foreach t in array array['workspaces','observations','segments','snag_assets','snags'] loop
    execute format('drop policy if exists "own %s" on public.%I', replace(t, '_', ' '), t);
    execute format('drop policy if exists "team %s" on public.%I', t, t);
    execute format('create policy "team %s" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- ---------- profiles: whole team visible (feeds "logged by …" and the owner picker) ----------
drop policy if exists "profiles read" on public.profiles;
drop policy if exists "team profiles read" on public.profiles;
create policy "team profiles read" on public.profiles for select to authenticated using (true);

-- ---------- storage: shared media namespace ----------
-- New uploads land at the flat `${key}` path; legacy per-user folders stay
-- readable so nothing already captured goes dark.
do $$
begin
  execute 'drop policy if exists "media read own folder"   on storage.objects';
  execute 'drop policy if exists "media write own folder"  on storage.objects';
  execute 'drop policy if exists "media update own folder" on storage.objects';
  execute 'drop policy if exists "media delete own folder" on storage.objects';
  execute 'drop policy if exists "team media read"   on storage.objects';
  execute 'drop policy if exists "team media write"  on storage.objects';
  execute 'drop policy if exists "team media update" on storage.objects';
  execute 'drop policy if exists "team media delete" on storage.objects';
  execute $p$create policy "team media read"   on storage.objects for select to authenticated using (bucket_id = 'media')$p$;
  execute $p$create policy "team media write"  on storage.objects for insert to authenticated with check (bucket_id = 'media')$p$;
  execute $p$create policy "team media update" on storage.objects for update to authenticated using (bucket_id = 'media')$p$;
  execute $p$create policy "team media delete" on storage.objects for delete to authenticated using (bucket_id = 'media')$p$;
exception when insufficient_privilege then
  raise notice 'Storage policies need the dashboard: Storage -> media -> Policies -> allow all authenticated users.';
end $$;

-- ---------- report ----------
select 'policy ' || tablename || ': ' || policyname as item, cmd as value
from pg_policies
where schemaname = 'public' and tablename in ('workspaces','observations','segments','snag_assets','snags','profiles')
union all
select 'storage: ' || policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like '%media%'
order by item;
