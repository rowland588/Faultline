# Faultline — data integrity & security audit (files only)

Audited 16 Oct 2026 at commit `3fbd1d1` in an isolated worktree. **No database access** (the Supabase MCP server failed to connect and the brief forbids it): every statement below is read from `supabase/*.sql` (74 files), `supabase/functions/*`, `src/cloud/*`, `src/db/*`, `src/lib/access.ts`, the screens, and the full git history of every branch. Where only the live database can settle a point it is marked **LIVE-ONLY**.

`npx vitest run src/cloud/__tests__/sync-schema.test.ts` → 65/65 pass (every mapper column exists in some migration; every synced table has `rev`; every `tests.kind` face is allowed; every media-carrying kind is in `faultline_can_see_media`, with `MEDIA_RULE_FILE = SNAG_MEDIA.sql` as the rule in force).

How the "final" state was built: later files override earlier ones by git date (`git log -- supabase/<file>`); `create or replace` functions take their newest definition; policies take the last `drop/create` or catalogue rewrite. The four files CLAUDE.md names as moving the DB backwards if replayed are confirmed from their text: `TEAM_UPGRADE.sql:29` (`using (true) with check (true)` on five tables and `profiles … using (true)` at :36), `WORKSPACE_TEAMS.sql:33-42` (old `is_ws_member`, no confirmation, no project chain), `PROJECT_TEAMS.sql:55` (old `is_project_member`, no confirmation), `FRESH_START.sql:12,64,86…` (plain `create table`, fails on a populated project). A fifth to keep off a live DB: `RUN_ME.sql:163-166` and `SYNC_UPGRADE.sql:19-24` re-create `faultline_stamp_rev` **without** `set search_path = ''` (the later files pin it, `COMMISSIONING.sql:107-108`).

Function versions in force (by git date): `is_super`, `faultline_confirmed`, `is_project_member` → `SECURITY_RLS.sql:48-85`; `is_ws_member` → `PROJECT_WALK.sql:15-39` (2 Oct 19:24, after `LINE_STUDY_ACCESS.sql` 18:12); `is_project_owner` → `PROJECT_TEAMS.sql:54`; `is_project_editor`, `can_start_projects`, `invite_member` → `ACCESS_LEVELS.sql:59-128`; `faultline_can_see_media` → `SNAG_MEDIA.sql:23-77`; `faultline_keep_agreement` → `PERFORMANCE_RUNS.sql:47-115` (7 Oct 20:00 — commit `4744b09` says "NOT applied yet", see S6); `faultline_keep_study_agreement` → `STUDIES.sql:141-155`.

---

## (a) Intended schema (final, per table) vs the mapper

Legend: **✓** mapper writes it · **DEAD** SQL defines it, app never reads/writes · **SRV** server-written only · **(t)** type note. `owner_id`, `created_at`, `updated_at`, `deleted_at`, `rev` are on every synced table and written as the mapper says unless noted. Every synced kind's local store is `src/db/core.ts:30-116`.

| Table (files) | Columns | Mapper / drift |
|---|---|---|
| **workspaces** (FRESH_START:64-84, SYNC_UPGRADE, LOST_OUTPUT, LABOUR_BURDEN, FACTORY:22-23) | id uuid · name text NN · color · categories/subcategories/assets/shifts jsonb NN · crew, labour_rate_per_hour, labour_burden, packs_per_min, margin_per_pack numeric · last_category, last_asset · archived bool NN · line_type text · floor_order integer | ✓ all. Device-only `lastRoute, lastOpenedAt, activeTimer, schemaVersion` not in SQL by design (`mappers.ts:60-61`). |
| **observations** (FRESH_START:86-106, SIXM:39) | workspace_id uuid NN FK · category NN · subcategory · asset NN · shift · started_at NN, ended_at · duration_ms NN · timing NN · count int NN · value_num, cost_per · note · media jsonb NN · cause_m text | ✓ all. |
| **segments** (FRESH_START:108-120) | workspace_id · sequence int NN · name · video_key NN · poster_key · duration_s | ✓ |
| **snag_assets** (FRESH_START:122-136, EVIDENCE_OUTLIVES_VIDEO:14-18) | workspace_id · segment_id uuid FK **set null** (nullable) · timestamp_s NN · name NN · code · still_key NN | ✓ |
| **snags** (FRESH_START:140-166, PARETO_ACTIONS, ACTION_TRACKER, CASES:29, PROOF_STUDY:15, QUICK_SNAGS:20-22, PROBLEM_PRIORITY:15, PROBLEM_JOURNEY:20-21) | workspace_id NN · asset_id uuid FK cascade (nullable) · x_pct, y_pct · target_category/subcategory/asset · problem NN · proposed_solution · status NN check(open,in_progress,closed) · owner · case_id uuid · raised_at NN · due_at · latest_update(_at) · closed_at, close_note · detail_photo_key, fixed_photo_key · linked_obs_ids jsonb NN · media jsonb · **project_id text** · sent jsonb · priority check(critical,high,low) · journey jsonb · archived_at | ✓ all; `SnagStatus` and priority match the checks (`snag/types.ts:13,69`). `project_id` has no project-level write rule → S9. |
| **cases** (FRESH_START:170-186, ROOT_CAUSE, PROOF_STUDY, SIXM:30-34) | workspace_id NN · title NN · path jsonb NN · note · whys, study jsonb · baseline_ms_week NN · target_ms_week · status NN check(open,closed) · opened_at NN · closed_at · project_id, line_id text · source jsonb · causes jsonb NN · hold jsonb | ✓; `Case.status` is `'open'|'closed'` (`types.ts:216`). |
| **projects** (PROJECT_TEAMS:41, OPTIONAL_TOOLS, PARETO, COMMISSIONING, COMMISSIONING_V3:122-123, MEASURES:23-24, ARCHIVE, PROJECT_WALK:11, HOURS_LOST:18, INSTALL_STAGES, GATES:17, REPORT_COMMENTARY) | id text · name NN · description · color NN · workspace_ids jsonb NN · lead, lead_email · lever_tree, pareto, commissioning bool NN · planned_at, expected_at text · measures, periods jsonb · archived_at · walk_workspace_id text · day_hours numeric check(0<x≤24) · install_stages, gate_stages jsonb · report_note, report_note_at | ✓ all. |
| **project_members** (PROJECT_TEAMS:42, ACCESS_LEVELS:45,50) | project_id FK cascade · email · role NN · added_by default auth.uid() · created_at · access NN 'team' check(team,client) | live only (`cloud/members.ts`) ✓ |
| **workspace_members** (FRESH_START:208-214) | workspace_id FK · email · added_by default auth.uid() · created_at | live only ✓ |
| **pace_ppm** (PROJECT_PACE:29-42, PROJECT_TEAMS:73-83, LINE_CAPACITY:12) | id text · line_key NN · name NN · variant · **q1..q4 numeric NN 0 — DEAD** · **weekly jsonb NN — DEAD** · project_id · line_owner(_email), sponsor(_email) · **workspace_id TEXT (t)** · sort integer NN · capacity jsonb | ✓ (q1..q4/weekly rely on defaults, `mappers.ts:268-271`). (t) every other `workspace_id` is uuid; `MACHINES_AND_PROGRAMS.sql:100-117` has to regex-cast it. |
| **pace_todos** (PROJECT_PACE:48-64, PROJECT_TEAMS:74,84, THREE_P_ACTIONS, ACTIONS_CASE_AND_DONE, PACE_TODO_NOTES, SIXM:36-37) | what/where_at/why/who/when_at text NN '' · state NN check(todo,waiting,done) · media jsonb NN · project_id, line_id · pillar, due, case_id, done_on · notes, outcome text NN '' · cause_ref, expect | ✓; `PaceTodoRow.state` matches (`rows.ts:22`). |
| **pace_wins** (PROJECT_PACE:70-81, PROJECT_TEAMS, WIN_PROOF) | title/story/where_at/who/impact NN '' · project_id, line_id · proof jsonb | ✓ |
| **tree_nodes** (LEVER_TREE:15-26, TREE_BIND) | project_id NN · parent_id · text NN · rag NN · sort double precision · bind jsonb | ✓ |
| **commission_assets** (COMMISSIONING_V3:37-66, MACHINE_DATES:17-20, MACHINES_AND_PROGRAMS:36-37,45-48) | project_id text **nullable** · name NN · oem · state NN 'onSite' · **arrived_at, installed_at text — DEAD** (app writes on_site_on/installed_on) · docs jsonb · note · sort numeric · due_on, on_site_on, installed_on, running_on text · workspace_id uuid · check(project_id or workspace_id) | ✓ (mapper sends `project_id: a.projectId \|\| null`, `mappers.ts:377`). |
| **tests** (TESTING:25-60, FIXES_AND_RANGES:23-25,36,53, INSTALL:19-21, PERFORMANCE_RUN:20-21, PERFORMANCE_RUNS:37, OVERLAP_OK:17, EVIDENCE_PINS:13, GATES:16,20) | project_id NN · title NN · asset_id · planned_for text · passes_if · with_whom · planned · ran_on text · product · result · outcome NN · media, docs jsonb · from_test_id · sort numeric · kind NN check(test,fix,install) · **planned_to DATE, ran_to DATE (t)** · program_id · run_agreed jsonb (object) · run jsonb (object) · runs jsonb (array) · overlap_ok bool · pin jsonb · gate check(setup,handover) | ✓ all. (t) `planned_for/ran_on` are text, `planned_to/ran_to` are `date`: works today only because `editPatch` turns a blanked box into `undefined` (`ui/RecordEdit.tsx:58-66`); a writer sending `''` would be refused. |
| **test_items** (TESTING:70-91, STAGE_MOVES, OBSERVATIONS, HOURS_LOST:17,23, CRITICAL_PROBLEMS:21-23,28, PROBLEM_RISK:17-18,23, EVIDENCE_PINS:17, NOTE_REMINDERS:10, PUSH_REMINDERS:59, PART_STATUS:28,33) | project_id NN · **test_id text NN** · kind NN · what NN · note, owner, due · done_at · media jsonb · became_test_id, became_item_id, from_item_id · sort numeric · hours_lost numeric check(0<x≤10000) · critical bool, impact, ways jsonb(array) · risk bool, could_lose check(0<x≤100000) · pin · moved_from, moved_to · on_plan bool · **reminded_on text — SRV** (remind function) · results jsonb(array) | ✓; a whole-job note carries `testId = ''` (`lib/testing.ts:482`), legal for NN. `hoursLost` only written when > 0 (`ui/WhyMoved.tsx:361`). `ItemKind 'today'` is fine (kind unchecked). |
| **targets** (MEASURES:26-36) | project_id, line_id, measure_id, period_id NN · value numeric NN | ✓ |
| **readings** (MEASURES:42-56) | project_id, line_id, measure_id NN · at text NN · value NN · note | ✓ |
| **materials** (MATERIALS:22-43) | project_id NN · what NN · how_much · line_id · supplier · due · here bool NN · in_on · note · **sort integer (t)** | ✓. (t) materials/programs/pace_ppm `sort` is `integer`; tests/test_items/commission_assets are `numeric`, standards `bigint` (`standard.ts:373` writes epoch-ms). A fractional/midpoint sort on materials or programs would be refused. |
| **programs** (PROGRAMS:28-64, MACHINES_AND_PROGRAMS:34-35,41-44) | project_id **nullable** · what NN · runs text · asset_id, line_id · state NN check(needed,onMachine,proved) · test_on, proved_on · test_id · supplier · note · sort integer · workspace_id uuid · check(project_id or workspace_id) | ✓; `ProgramState` is the same three (`lib/programs.ts:47`); "not tested / no program" live on tests, not here. |
| **standards** (LINE_STANDARD:14-31, LINE_TOOLS:23-25,30-31, STANDARD_BOARD:16) | project_id **nullable** · product NN · program_id · photo_key · marks jsonb NN · note · sort bigint · workspace_id uuid · capacity jsonb · board text · check(project_id or workspace_id) | ✓ |
| **studies** (STUDIES:55-83) | tool NN check(10 tools) · name NN '' · workspace_id uuid · project_id text · machine, asset_id, product, program_id, standard_id · agreed jsonb · facts jsonb NN · uses jsonb NN · started_at NN · closed_at · receipt, overrule jsonb | ✓; `STUDY_TOOLS` = the same ten (`lib/study.ts:29`). |
| **shares** (SHARE_LINKS:28-50) | token text PK check(len≥32) · project_id, test_id, blob_key NN · kind NN check(photo,video) · caption · owner_id NN default auth.uid() · created_at, expires_at NN, revoked_at timestamptz · views int NN · last_viewed_at | live only (`cloud/shares.ts`) ✓ |
| **push_subscriptions / push_keys** (PUSH_REMINDERS:23-29,41-49) | endpoint PK · user_id FK · p256dh, auth / id=1 · public_key, private_key, cron_key | live only ✓ (`cloud/push.ts`); push_keys read by nobody but the function. |
| **profiles / allowed_emails** (FRESH_START:12-17,28-32; ACCESS_LEVELS:46,53) | id FK auth.users · email · is_super · created_at / email PK · invited_by · created_at · scope NN 'app' check(app,project) | live only ✓ (`cloud/admin.ts`, `cloud/team.ts`). |
| **commission_items** (COMMISSIONING:14-64, _V2:30-45, _V3:94-110, _PROGRAMME:70), **commission_phases** (_PROGRAMME:24-52,152-153), **commission_packs** (_V3:73-83) | 40+ columns, rev triggers, realtime, policies | **DEAD** — not in `SYNC_KINDS` (`mappers.ts:725-744`), no local store; `SECURITY_RLS`/`ACCESS_LEVELS`/`DELETE_AGREEMENT` still loop over them. |
| **project_targets, project_actuals** (PROJECT_TARGETS:25-56), **pace_snapshots** (PROJECT_PACE:86-100, PARETO:18-25) | q1..q4_target, start_date / "date", actual_ppm / taken_at, file_name, actions, roster, pareto | **DEAD** in the cloud; retired 13 Oct (`db/rows.ts:138-140`). Local stores stay declared and empty (`core.ts:48-55`); nothing writes them (grep: no `put('project_targets'…)`). |

**Tables synced but not created:** none (the test proves it). **Columns the app writes that no SQL defines:** none (ditto). **Local stores not synced:** `media` (blobs go through storage, by design), `meta` (cursors, bases, `paceWorkspace` keys), `tombstones`, `pace_lines` (legacy, migrated into `pace_ppm`), `project_targets`, `project_actuals`, `pace_snapshots` — of these only `meta`/`media` hold anything, and a device wipe loses only device state plus any blob not yet uploaded (counted on screen as `pendingUp`, `sync.ts:51`). No user data lives in an unsynced store.

**Realtime publication:** every synced table is added by its file **except `projects`** — `PROJECT_TEAMS.sql:144-149` leaves `alter publication supabase_realtime add table public.projects` in a comment and no later file adds it (S12).

---

## (b) RLS matrix (final policies; P = permissive, R = restrictive)

| Table | RLS | SELECT | INSERT | UPDATE | DELETE | Client can write? |
|---|---|---|---|---|---|---|
| profiles | on | P `id = me OR is_super() OR faultline_shares_with(email)` (SECURITY_RLS:302-304) | — (definer trigger) | — | — | no |
| allowed_emails | on | P ALL to **public**: `is_super()` (FRESH_START:34-35); `invite_member` (definer) inserts scope 'project' | — | — | — | no |
| workspaces | on | P `is_ws_member(id)` (LINE_STUDY_ACCESS:58-59) | P `owner_id = me OR is_ws_member(id)` (:61-62) | P `is_ws_member(id)` (FRESH_START:240-241) — **no keep_agreement, deleted_at/archived/name open** | P `is_ws_owner(id) OR super` (:242-243) | **yes** via S3 (incl. soft-delete, S1) |
| observations, segments, snag_assets, snags | on | P ALL `is_ws_member(workspace_id)` (FRESH_START:245-252) — includes **DELETE** | same | same | **open to members** | **yes** (S3, S9) |
| cases | on | P ALL `is_ws_member(workspace_id)` + R insert/update `project_id is null OR is_project_editor(project_id)` (SIXM:43-53) | | | open to members | only a case with no job |
| projects | on | P `is_project_member(id)` (PROJECT_TEAMS:118) | P `owner_id = me OR member` + R `(owner_id = me AND can_start_projects()) OR is_project_editor(id)` (ACCESS_LEVELS:155-158) | P member + R `is_project_editor(id)` (:159-162); trigger keeps archived_at/planned_at/expected_at/stages/method/owner/deleted_at | P `is_project_owner OR super` (:121) | no |
| project_members | on | P member (PROJECT_TEAMS:124) | P ALL owner\|super (:125) | same | same | no |
| workspace_members | on | P member (FRESH_START:256-257) | P ALL ws owner\|super (:258-261) | | | no |
| pace_ppm, pace_todos, pace_wins, tree_nodes, tests, test_items, targets, readings, materials (+dead project_targets, project_actuals, pace_snapshots, commission_items, commission_phases) | on | P `is_project_member(project_id) OR (project_id is null AND owner_id = me)` (SECURITY_RLS:146-148) | P same + R `is_project_editor(project_id) OR (project_id is null AND owner_id = me)` (ACCESS_LEVELS:144-150) | same, P+R (:149-150) | **none** (by design, SECURITY_RLS:128-129) | no |
| commission_assets, programs | on | as above **+** P ALL (roles **public**) `workspace_id not null AND is_ws_member(workspace_id)` (MACHINES_AND_PROGRAMS:57-66) | R rewritten with the line clause (:72-98) | same | **re-opened** for ws members by the `for all` line policy (S4) | a line's row with no job: **yes** (S3) |
| standards | on | P ALL `owner_id = me OR is_project_member(project_id)` (LINE_STANDARD:75-85 — **never rewritten by SECURITY_RLS C**, so the owner arm survives) + P ALL (public) `workspace_id not null AND is_ws_member(…)` (LINE_TOOLS:42-46) | same — **no restrictive editors policy** | same | **open** | **yes, on a job too (S2)** |
| studies | on | P ALL `owner_id = me` · P ALL `line` · P ALL `project` (STUDIES:110-125) + R insert/update `project_id is null OR is_project_editor` (:127-137); `faultline_keep_study_agreement` keeps agreed/closed/receipt/project_id/deleted_at | | | **open** to maker, line and project members (S4) | a study on a line with no job: yes (S3) |
| shares | on | P `is_project_owner(project_id) OR super` (SHARE_LINKS:58-59) | P owner AND `owner_id = me` (:62-63) | P owner (:66-68) | none | no |
| push_subscriptions | on | P ALL `user_id = me` (PUSH_REMINDERS:33-35) | | | | n/a |
| push_keys | on, **no policies** (PUSH_REMINDERS:47) → service role only | | | | | n/a |
| storage.objects (bucket `media`, private) | — | `bucket_id='media' AND faultline_can_see_media(name)` (SECURITY_RLS:266) | same (:267) | `owner = me` (:268) | `owner = me OR super` (:269) | insert: a client may upload a file a visible row names (row-before-file holds; the row check is "can see", not "can write") |

Checks against the brief's flags: **RLS off** — none (every `create table` is followed by `enable row level security`; `faultline_stamp_rev` is created before the trigger so a failing migration cannot strand a table, `COMMISSIONING.sql:94-100`). **Literally `true`** — only in `TEAM_UPGRADE.sql:29,36` and `FRESH_START.sql:26` (profiles), both superseded; `SECURITY_RLS.sql:168` now tests `coalesce(qual, with_check, '') = 'true' or coalesce(with_check, qual, '') = 'true'`, the fixed form. **Select relying on with_check / insert on qual** — none in the files (the C2 bug is the one CLAUDE.md records, fixed at :163-168). **No delete rule** — intentional on the job tables; **re-opened** on commission_assets, programs, standards, studies and all workspace tables (S4). **Null project_id vs workspace_id paths** — standards/programs/commission_assets/studies all fall to `is_ws_member(workspace_id)`, and `is_ws_member` (PROJECT_WALK:26-37) admits every project member of any job on that line, with no access-level filter (S3). **Share links** — scoped to one blob on one test of one project (`functions/share/index.ts:47-51`), 24 random bytes (`cloud/shares.ts:30`), `expires_at` required and checked (:41), revocable (:40), only the project owner may create/stop (SHARE_LINKS:56-70), signed URL lasts 300 s (:57); the bucket stays private. **Bucket rules** — row-before-file is the `faultline_can_see_media` insert rule; the 50 MB limit is Supabase's global default, not set in any file (`sync.ts:143-147`; `fake-cloud.mjs:56` mirrors it) — **LIVE-ONLY** whether the bucket carries its own `file_size_limit`.

---

## (c) Findings, ranked (impact 5→1, then effort)

### S1 — Any member of a line, a project client included, can delete the line from every device
Impact 5 · Effort S · Kind: bug
Where: `supabase/FRESH_START.sql:240-241` (`member workspaces update … using (is_ws_member(id))`), `supabase/PROJECT_WALK.sql:26-31` (`is_ws_member` ← `is_project_member(l.project_id)` — any role), `src/db/workspaces.ts:89-119` (`deleteWorkspace` tombstones the line and its children), `src/cloud/sync.ts:836` (a tombstone is `update {deleted_at}`), `src/db/sync.ts:125-148` (`applyRemoteDelete('workspaces')` hard-deletes observations, walks, frames, snags, cases **and their media blobs** on every other device), `src/screens/FactoryScreen.tsx:303-309` ("Delete for ever", no access check, "This cannot be undone, on any device").
Evidence: `faultline_keep_agreement` is keyed on `project_id` (ACCESS_LEVELS:172) and is not on `workspaces`; nothing in any file keeps `workspaces.deleted_at` or `archived` for the owner. `restoreWorkspace` only flips `archived` (`db/workspaces.ts:142-148`); the children's cloud rows keep their `rev`, so after an SQL restore other devices would not re-pull them without a full re-sync.
Fix: a trigger that keeps `deleted_at` (and `archived`, `name`, `line_type`, `floor_order`) for anyone but `is_ws_owner(id) or is_super()`, and `can.remove`-style gating on FactoryScreen/WorkspaceHome (a line's "owner" = `workspaces.owner_id`).
```sql
-- FAULTLINE — A LINE'S DELETE, ARCHIVE AND NAME STAY WITH ITS OWNER. Run ONCE. Safe to re-run.
-- Why: every member of a line (and, through is_ws_member, every member of a job on it) could set
-- workspaces.deleted_at; the tombstone then wiped the line's history from every device.
create or replace function public.faultline_keep_line()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_super() or old.owner_id = auth.uid() then return new; end if;
  new.deleted_at := old.deleted_at; new.archived := old.archived; new.owner_id := old.owner_id;
  new.name := old.name; new.line_type := old.line_type; new.floor_order := old.floor_order;
  return new;
end $$;
create or replace trigger faultline_keep_line before update on public.workspaces
  for each row execute function public.faultline_keep_line();
select tgname, tgrelid::regclass from pg_trigger where tgname = 'faultline_keep_line' and not tgisinternal;
```

### S2 — `standards` has no editors-only rule and keeps the owner arm: a client writes a job's line standards, and any signed-in user can plant a standard in any job
Impact 5 · Effort S · Kind: bug
Where: `supabase/LINE_STANDARD.sql:75-85` (`"project standards" for all using (owner_id = (select auth.uid()) or is_project_member(project_id))`), `supabase/SECURITY_RLS.sql:137-141` (part C's table list — no `standards`), `supabase/ACCESS_LEVELS.sql:138-142` (restrictive list — no `standards`), `supabase/SECURITY_RLS.sql:113-116` (keep_owner/clamp_clock list — no `standards`, `studies`, `shares`), `src/cloud/mappers.ts:613` (`owner_id: fallbackOwner` — the pusher becomes owner), `docs/BLUEPRINT.md` Stage 1 line standards accepted by `factory.mjs`.
Evidence: the exact hole SECURITY_RLS part C closed for every other job table ("the first arm let any signed-in user INSERT a row … into any project whose id they had seen", :13-19) is still open on `standards`: insert with `owner_id = me` and any `project_id` passes; a `client` member passes `is_project_member` and meets no restrictive policy. `DELETE_AGREEMENT.sql` (keep deleted_at) names standards but was committed "NOT applied yet" (S6).
Fix: rebuild standards' policies like part C + ACCESS_LEVELS part 2, and add the two triggers.
```sql
-- FAULTLINE — LINE STANDARDS FOLLOW THE JOB TABLES' RULES. Run ONCE. Safe to re-run.
drop policy if exists "project standards" on public.standards;
create policy "member standards select" on public.standards for select to authenticated
  using (public.is_project_member(project_id) or (project_id is null and owner_id = (select auth.uid())));
create policy "member standards insert" on public.standards for insert to authenticated
  with check (public.is_project_member(project_id) or (project_id is null and owner_id = (select auth.uid())));
create policy "member standards update" on public.standards for update to authenticated
  using (public.is_project_member(project_id) or (project_id is null and owner_id = (select auth.uid())))
  with check (public.is_project_member(project_id) or (project_id is null and owner_id = (select auth.uid())));
drop policy if exists "editors only insert" on public.standards;
create policy "editors only insert" on public.standards as restrictive for insert to authenticated
  with check (public.is_project_editor(project_id) or (project_id is null and owner_id = (select auth.uid()))
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));
drop policy if exists "editors only update" on public.standards;
create policy "editors only update" on public.standards as restrictive for update to authenticated
  using (public.is_project_editor(project_id) or (project_id is null and owner_id = (select auth.uid()))
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))))
  with check (public.is_project_editor(project_id) or (project_id is null and owner_id = (select auth.uid()))
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));
create or replace trigger faultline_keep_owner  before update on public.standards for each row execute function public.faultline_keep_owner();
create or replace trigger faultline_clamp_clock before insert or update on public.standards for each row execute function public.faultline_clamp_clock();
select policyname, permissive, cmd from pg_policies where schemaname = 'public' and tablename = 'standards' order by 2, 3;
```
("line standards" from LINE_TOOLS stays as the line's permissive rule; split its `for all` per S4.)

### S3 — The client level stops at the job's own tables; every line under the job is open to the client
Impact 4 · Effort M · Kind: design
Where: `supabase/PROJECT_WALK.sql:26-31,33-37` (`is_ws_member` admits `is_project_member(l.project_id)` for any job line and any project walk — no `access` filter), `supabase/FRESH_START.sql:245-252` (member ALL on observations/segments/snag_assets/snags), `supabase/CASES.sql:35-36`, `supabase/LINE_TOOLS.sql:43-46`, `supabase/MACHINES_AND_PROGRAMS.sql:57-66`, `supabase/STUDIES.sql:116-119`, `src/ui/Frame.tsx:109,189` (`QuickSnagHost`/`QuickSnagButton` on every screen, no `useAccess`), `src/screens/FactoryScreen.tsx`, `ProductionLineScreen.tsx`, `LineProgramsScreen.tsx`, `WorkspaceSettings.tsx`, `CaptureScreen.tsx`, `snag/*` (0 access references each — see the guard table in §(d)).
Evidence: `docs/BLUEPRINT.md:337-340` promises "everyone on the line works a line's program and a project-only client still cannot"; with `is_ws_member` as defined a client of the job *is* "on the line". So a client may raise, edit, close and delete Problems (also "for" the job, S9), time stops, film walks, write cases without a job, plan/prove/delete a line's programs and machines, place and delete line standards and studies with no job, rename/retype/reorder the line (workspaces update), and merge lines (S7). The sync's "a client's rows stay home" guard (`src/cloud/sync.ts:993-1013`) covers only rows whose `project_id` is a client project, so these writes are pushed.
Fix: add `is_ws_editor(ws)` = `is_super() or is_ws_owner(ws) or explicit workspace_members or exists(pace_ppm … and is_project_editor(l.project_id)) or exists(projects … and is_project_editor(p.id))`, and use it in the `with check` of every workspace-table write policy and in the line clauses of the restrictive rules; keep `is_ws_member` for reads. Then `useAccess` for line pages needs a line-level `can` (owner = `workspaces.owner_id`; team = editor; client = member-only) so the screens follow.

### S4 — Hard DELETE re-opened by `for all` policies on programs, commission_assets, standards, studies (and all workspace tables)
Impact 4 · Effort S · Kind: bug
Where: `supabase/MACHINES_AND_PROGRAMS.sql:58-66`, `supabase/LINE_TOOLS.sql:43-46`, `supabase/STUDIES.sql:112-124`, `supabase/FRESH_START.sql:245-254`; contrast `supabase/SECURITY_RLS.sql:128-129` ("no DELETE at all — the app never hard-deletes … so nobody else should either").
Evidence: the app issues DELETE only on `shares`-adjacent tables (`cloud/members.ts:71,159`, `cloud/admin.ts:65`, `cloud/push.ts:47`) — never on a synced table — so this is a hand-made-request risk; a hard delete bypasses tombstones and `faultline_keep_agreement`, and a device holding the row then hits "moved under us … gone from the cloud" (`src/cloud/sync.ts:1097-1100`) while its base still carries a `rev`, so the row is retried as an edit each pass rather than re-inserted (the comment at :1100 says "it goes fresh next pass"; `baseGet` at :1045 says otherwise).
Fix: split each `for all` into `for select` / `for insert` / `for update` with the same predicates (drop + create, read back `pg_policies` showing no DELETE row); in `sync.ts` clear the base when the cloud says the row is gone so it really does go fresh.

### S5 — `.gitignore` does not cover `.env`
Impact 4 · Effort S · Kind: bug
Where: `.gitignore:4-5,8` (`.env.local`, `.env.*.local`, `*.local` — not `.env`); `CLAUDE.md` gate line "`node scripts/check-live-schema.mjs` — needs .env"; `supabase/apply.mjs:11,24` wants `SUPABASE_ACCESS_TOKEN` (an `sbp_` token) in the environment; `supabase/CONNECT.md:1378`.
Evidence: a developer who creates the `.env` the gate asks for and runs `git add .` commits it. History check (every branch, 870 paths): no `.env` ever tracked, only `.env.example` (placeholders) and `.mcp.json` (S15); `git log --all -G '<jwt|sk-ant|sbp_|SERVICE_ROLE=|GEMINI_API_KEY=|ANTHROPIC_API_KEY=>'` returns nothing; `git grep` of HEAD finds no key-shaped string outside vendored skill docs. The bundle receives only `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (`src/cloud/config.ts:22-23`, `BAKED_URL`/`BAKED_KEY` empty at :14-15; `vite.config.ts` defines only `__BUILD_STAMP__`); `api/voice.ts:362-372` and `api/wording.ts:131-145` read `GEMINI_API_KEY`/`ANTHROPIC_API_KEY` server-side and check the caller's Supabase session first; `functions/*` read `SUPABASE_SERVICE_ROLE_KEY`/`ANTHROPIC_API_KEY` from Deno env, none in code.
Fix: add `.env` and `.env.*` (with `!.env.example`) to `.gitignore`.

### S6 — Two migrations the access model depends on were committed as "NOT applied yet"
Impact 3 · Effort S · Kind: question (LIVE-ONLY)
Where: commit `4744b09` "…(PERFORMANCE_RUNS.sql, NOT applied yet)" — `supabase/PERFORMANCE_RUNS.sql:47-115` is the newest `faultline_keep_agreement` (each product's agreed numbers, a removed product put back); commit `a949965` "…(DELETE_AGREEMENT.sql) … NOT applied yet: it goes on once the app that hides those deletes from the team is live" — `supabase/DELETE_AGREEMENT.sql:25-33` puts the trigger on readings, standards, targets, pace_ppm (+ dead tables).
Evidence: the screens that hide those deletes are live (`NumbersPanel`, `StandardScreen`, `MeasuresSetup` behind `can.agree` at `src/screens/ProjectSetupScreen.tsx:518`), so the precondition is met; nothing in the repo records the application. If the live function is `PROBLEM_AGREEMENT.sql`'s (:26-51, no `run_agreed`/`runs` branch) a team member can change the agreed rate of a performance run; if DELETE_AGREEMENT is not on, a team member's device can delete a reading, target, standard or line and the cloud keeps it.
Fix: `select pg_get_functiondef('public.faultline_keep_agreement()'::regprocedure) like '%PERFORMANCE_RUNS.sql%'` and `select tgrelid::regclass from pg_trigger where tgname='faultline_keep_agreement'`; apply the two files through `apply_migration` if missing.

### S7 — Deleting a line and merging lines: no Undo, no guard, and a merge is not atomic against RLS
Impact 3 · Effort M · Kind: bug
Where: `src/screens/FactoryScreen.tsx:245-275` (Merge…, no `useAccess`, no `offerUndo`), `:303-309` (Delete for ever, no Undo; `WorkspaceHome.tsx:402-403` does offer one), `src/db/workspaces.ts:191-229` (`mergeLines` re-stamps rows in six stores plus standards, pace_ppm, projects.walk_workspace_id, meta).
Evidence: a non-owner's merge pushes `pace_ppm.workspace_id` (restrictive editors-only, ACCESS_LEVELS:144-150) and studies/standards onto a target line they may not be a member of (`"line studies" with check … is_ws_member(studies.workspace_id)`, STUDIES:118-119); each refusal is per-row (`sync.ts:1066-1078`), so the result is a half-merged factory with the source already archived (:226). `SnagsScreen.tsx:157-158` (delete a walk's footage) and `SnagListScreen.tsx` (bulk status) also have no Undo; `CaptureScreen.tsx` `deleteBlobs` none.
Fix: gate Merge/Delete on `workspaces.owner_id = me` (or S3's `is_ws_editor`), keep the moved ids and offer Undo (restore `workspaceId` on each), and run the merge only after a pass has confirmed the pusher may write both lines.

### S8 — Button-that-lies check: none found on job screens; the line screens are unguarded by design today
Impact 3 · Effort S · Kind: design
Where: `useAccess` is called by 38 screens/components (list in §(d)); writing components without their own call receive `can` as a prop — `CommissionGrid` (20 refs), `InstallGrid` (19), `StageParts` (14), `RecordMore` (15), `WorkBalance` (15), `StudyPlace` (9), `UsualStages` (9), `DayPlan` (8), `ProgramRow` (8), `StudyLinks` (7), `ShiftLosses` (4), `StageStory`/`StandardsCard`/`StudyActs`/`BottleneckWalk` (3), `RecordSay`/`ChangeoverLines` (2); the zero-ref sheets `WhyMoved`, `NotYet`, `ProveProgram`, `SawSheet`, `DateWhy`, `RecordEdit` are opened only from guarded parents (`TestScreen` 16 refs, `InstallGrid` 18, `FishboneScreen` 16, `ProgramsScreen` 13, `ProjectLineScreen` 3); `MeasuresSetup` is behind `can.agree` and `LineTidyPanel` behind `can.edit` (`ProjectSetupScreen.tsx:474,518-522`). `JobsBoard.renameSupplier` runs over `editable` jobs only (:327).
Evidence: on the line screens (`FactoryScreen`, `ProductionLineScreen`, `LineProgramsScreen`, `WorkspaceSettings`, `CaptureScreen`, `snag/*`, `Frame.tsx` Problem button) nothing checks access and the DB accepts every member's write — so they do not lie today; they become lying buttons the moment S3's fix lands unless a line-level `can` ships with it. One true gap: `useAccess` answers `'team'` for a non-owner until the first `project_members` read lands (`src/cloud/access.ts:27-30,41`), so a client's very first offline open shows team controls once.
Fix: ship a line-level `useLineAccess(wsId)` with S3; remember a client's level before offering controls (default `'client'` for a non-owner until known).

### S9 — A problem "for" a job (`snags.project_id`) has no project-level write rule
Impact 3 · Effort S · Kind: design
Where: `supabase/QUICK_SNAGS.sql:21` (`snags.project_id text`), no restrictive policy on `snags` in any file (grep `restrictive` × `snags`: none); `src/snag/QuickSnag.tsx` (0 access refs) lets the Problem button set the job; the job's view and reports read it (`CLAUDE.md` snags.mjs: "staying on the page 'for' the job and shown on the job's own view").
Evidence: `cases` got exactly this rule in `SIXM.sql:43-53`; snags did not, so a client (S3) or any line member not on the job can add, close or delete a problem that appears on the job's status page and client report.
Fix: `create policy "project editors only insert/update" on public.snags as restrictive … with check (project_id is null or public.is_project_editor(project_id))` (the SIXM.sql:43-53 block with `snags` for `cases`).

### S10 — `projects` is not in the realtime publication
Impact 2 · Effort S · Kind: bug
Where: `supabase/PROJECT_TEAMS.sql:144-149` (the `alter publication … add table public.projects` is a comment); every other synced table's file adds itself; `src/cloud/sync.ts:1267-1270,1282` (realtime → `requestSync(600)`, else the 30 s interval).
Evidence: a new job, a report note or an archive on one device reaches the other only on the interval/focus kick; the two-device harness would not catch it (it waits).
Fix: `do $$ begin alter publication supabase_realtime add table public.projects; exception when duplicate_object then null; when undefined_object then null; end $$;` + `select tablename from pg_publication_tables where pubname='supabase_realtime' and tablename='projects'`.

### S11 — Dead tables and columns still carried, with policies and triggers maintained on them
Impact 2 · Effort S · Kind: design (LIVE-ONLY for row counts)
Where: §(a) DEAD rows — `commission_items`/`_phases`/`_packs` (COMMISSIONING*.sql), `project_targets`/`project_actuals` (PROJECT_TARGETS.sql), `pace_snapshots` (+ `pareto` index, PARETO.sql:23-25), `pace_ppm.q1..q4, weekly` (PROJECT_PACE.sql:36-40), `commission_assets.arrived_at, installed_at` (COMMISSIONING_V3.sql:53-54 vs MACHINE_DATES.sql:17-20); `SECURITY_RLS.sql:113-116,137-141`, `ACCESS_LEVELS.sql:138-142`, `DELETE_AGREEMENT.sql:28` keep looping over them; `docs/BLUEPRINT.md` §5.2 says 0 rows.
Fix: one `RETIRE.sql` dropping the six tables and three columns after `select count(*)` on each live, and the local stores from `core.ts` at the next DB_VERSION.

### S12 — Column types drift between twins
Impact 2 · Effort S · Kind: design
Where: `pace_ppm.workspace_id text` (PROJECT_TEAMS.sql:81) vs `uuid` on standards/programs/commission_assets/studies — the backfill has to regex-cast (`MACHINES_AND_PROGRAMS.sql:100-117`); `tests.planned_to/ran_to date` (FIXES_AND_RANGES.sql:24-25) vs `planned_for/ran_on text` — safe only through `editPatch` (`src/ui/RecordEdit.tsx:58-66`); `sort` is `integer` on materials/programs/pace_ppm (MATERIALS.sql:39, PROGRAMS.sql:60, PROJECT_TEAMS.sql:82), `numeric` on tests/test_items/commission_assets, `double precision` on tree_nodes, `bigint` on standards (`standard.ts:373` writes epoch-ms, so bigint is load-bearing).
Fix: no change needed now; note in BLUEPRINT §5 and keep `sync-schema.test.ts` honest by adding a type check (parse `column type` from the CREATE/ALTER and compare against a per-column expectation) before any midpoint-sort or '' date is written.

### S13 — `.mcp.json` is committed on `claude/faultline-connection-1vx7kt`
Impact 2 · Effort S · Kind: question
Where: `origin/claude/faultline-connection-1vx7kt:.mcp.json` — keys `mcpServers.supabase.type` ("http", 4 chars) and `url` (156 chars, `https://…`); `supabase/CONNECT.md:1329-1337`.
Evidence: the harness withheld the URL's query values (classifier). Supabase's MCP URL normally carries `project_ref` and feature flags — not secrets — but 156 characters is long enough for a token parameter. Nothing else secret-shaped exists in any commit (S5).
Fix: read the file on your machine; if it carries only `project_ref`/`features`, fine; if a token, rotate it and drop the file from the branch (`git filter-repo` or close the branch).

### S14 — CSP is report-only
Impact 2 · Effort S · Kind: design
Where: `vercel.json:6` (`Content-Security-Policy-Report-Only`), `index.html:33,146` (only a `ld+json` block and the module script).
Evidence: the policy as written already matches the app (`script-src 'self'`, `connect-src https://*.supabase.co wss://*.supabase.co`; `api/*` calls leave from the server), so it would enforce without breaking; today an injected script runs.
Fix: rename the header to `Content-Security-Policy` after a week of reports show nothing; keep `style-src 'unsafe-inline'`.

### S15 — Edge-function details worth a line
Impact 1 · Effort S · Kind: design
Where: `supabase/functions/remind/index.ts:44-49` (the first call with `push_keys = SET-ME` needs no `x-remind-key` and runs a full pass — harmless after bootstrap, gated only by the gateway's anon JWT); `functions/ask/index.ts:62-64` (`facts` are client-supplied and capped at 8000 chars — a prompt-injection only steers the asker's own answer; 20/hour per user in instance memory); `functions/share/index.ts:74` (view count is read-then-write, not atomic); `FRESH_START.sql:23` grants `is_super()`/`faultline_confirmed()` execute to `anon` (both return false for anon — harmless); `FRESH_START.sql:9` hard-codes the superadmin address as an immutable function (`rowlandglew@yahoo.co.uk`) while the account in use is a gmail address — `profiles.is_super` is what the policies read, so this only matters for the sign-up bypass at :42.
Fix: none urgent; move `cron_key` comparison to a constant-time compare and bootstrap keys from a migration-time `gen_random_bytes` if it ever matters.

---

## (d) What is sound

- **Schema drift guard.** `src/cloud/__tests__/sync-schema.test.ts` reads both sides (65 tests, pass): every written column, `rev` everywhere, the `tests.kind` faces, media kinds in the rule, and the exact columns the storage rule looks in (`SNAG_MEDIA.sql`). `scripts/check-live-schema.mjs` asks the live OpenAPI the same question with only the anon key and never fails the gate on a network answer.
- **Only the anon key and URL reach the bundle.** `src/cloud/config.ts:14-15,22-23`, `vite.config.ts` (`define` carries only the build stamp), `scripts/check-env.mjs` prints presence not values, `api/voice.ts:362-372` / `api/wording.ts:131-145` keep Gemini/Anthropic keys server-side and verify the Supabase session (`/auth/v1/user`) first, `functions/*` read secrets from Deno env. No secret-shaped string in any commit on any branch; `.env` never tracked; `.env.example` is placeholders.
- **The access ladder is real in the DB for the job tables.** Restrictive `editors only insert/update` on every project table (ACCESS_LEVELS:144-150; MACHINES_AND_PROGRAMS:72-98; STUDIES:127-137; SIXM:43-53), `can_start_projects()` on the project row, `faultline_keep_agreement` keeping dates/stages/method/owner/`passes_if`/`run_agreed`/per-product agreed/`deleted_at` (and cases' status) for anyone but the owner, `faultline_keep_study_agreement` for studies, `faultline_keep_owner` + `faultline_clamp_clock` on 21 tables (SECURITY_RLS:113-123). The screens mirror it: `lib/access.ts:34-40` is the one rule, `useAccess` is called by 38 screens, and the sync keeps a client's stray rows home (`sync.ts:993-1013`).
- **Membership requires a confirmed address** (`faultline_confirmed`, SECURITY_RLS:48-55) folded into `is_super`, `is_ws_member`, `is_project_member`, `is_project_editor`; emails are lower-cased on both sides; `invite_member` is `security definer`, revoked from `anon`, and checks ownership itself (OWNER_INVITES:79-80, ACCESS_LEVELS:93-113).
- **Storage.** Private bucket; read and write only when a visible row names the key (`faultline_can_see_media`, runs as the caller so the tables' own RLS decides); update/delete by the object's owner; legacy `<uid>/<key>` paths still readable; GIN indexes behind the containment lookups (SECURITY_RLS:236-258). Rows go before blobs; a refused or too-big file is counted and said (`sync.ts:62-80`).
- **Share links** are one blob, one test, one project, 24 random bytes, expiring, revocable, counted, owner-only to make, served by a 5-minute signed URL from the service role; the function re-checks the test still carries the key and belongs to the share's project (`functions/share/index.ts:47-51`).
- **Push.** `push_keys` has RLS and no policies; keys are generated inside the function on first run; only the public half is exposed through a definer function; pg_cron reads `cron_key` at fire time.
- **Sync safety.** Push is per-row and `rev`-conditional (`update … eq('rev')`, `sync.ts:1085`), merges column-by-column against the last agreed copy, never a plain upsert for an edited row; one refused row no longer stalls a kind (:1066-1078); `faultline_rev` stamps every synced table; a missing table or column isolates to its kind.
- **Undo** is offered for deletes of tests, steps, fixes, findings, notes, machines, materials (owner-only remove), programs, photos, snags/problems (single and bulk), frames, wins, actions, tree boxes, standards/maps, studies, cases, "Start fresh" (put away, not deleted), and for moved dates and voice edits (`src/ui/Undo.tsx` + 40 `offerUndo` callers); `WorkspaceHome` delays a line delete behind an Undo toast. Gaps are in S7.
- **Export-all** (`src/lib/exportAll.ts`) writes one workbook of every job's machines, tests, items, materials, programs, standards and every walk's snags/frames — a complete offline copy of the records, readable back by `lib/xlsxRead` in the tests.
- **Migrations are additive and re-runnable** in the house shape (if-not-exists / or-replace / guarded `do` blocks, a read-back `select` at the end); the one destructive family (hard `drop`/`create` of `tests_kind_check`, INSTALL.sql:19-21) only widens. Nothing in the repo drops a column or table; reversal of any file is a new file, not a replay.
