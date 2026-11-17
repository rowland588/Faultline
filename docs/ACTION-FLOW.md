# From a finding to a completed action

Rowland, 17 November: areas, lines, tools, problems and Luna must lead to actions; without action the app has no purpose. This is an authorised repair of the existing action workflow, alongside the simpler workspaces.

## Findings from the code

- `StudyPlace.useBetter` returns immediately without a project; `UsedFor` disappears. Its empty-plan guidance explicitly requires attaching a project.
- Every study already supports raising a linked problem, but that entry is hidden in More and its creation form lacks the proposed-action field.
- `Snag` stores the problem and its legacy action plan. New follow-up tasks use the existing `PaceTodoRow` / `pace_todos` action record, so several actions do not create duplicate faults. Explicit standalone tasks need no project; legacy unflagged rows retain their old project meaning.
- Global and line action readers use the problem wording rather than the proposed action. The global register projection drops the proposed action entirely.
- Areas are already included in the shared action reader. Actions has a working shared page, but is absent from primary navigation.
- Luna can raise/update problems through confirmed capabilities. Its output needs a direct manual route into an action/evidence, with a durable source reference; AI text does not become verified evidence merely by being saved.

## Intended operating flow

Choose a tool or inspect a place/problem → identify the finding → **Create action** → review what to do, why, owner and date → save once → track in Actions and the relevant place/source → record progress/outcome and review evidence. Projects remain optional.

Actions becomes a primary workspace. The old Today dashboard remains outside normal navigation. Phone navigation prioritises Factory, Tools and Actions, with quick problem capture retained and Projects/Testing/Luna in More.

Use existing action/problem records and lifecycle. A problem may lead to several separately owned and dated actions. Source links name the originating problem, saved tool use/product record, or Luna conversation/output, retaining the original. A source reference is context or evidence, never automatic proof that a fix worked. Existing project countermeasures, fixes and testing workflows remain intact.

## Verification required before release

- A standalone tool creates an action without adding a project, with its source retained after reload and cloud mapper round-trip.
- A problem leads to multiple independent actions; closing one does not silently close its source problem or siblings.
- Area/line/machine context reaches the shared tracker correctly, without another client's records.
- A Luna answer/produced record can create or support an action through a reviewed manual form; its source remains identifiable as AI or an app record.
- The actual action plan, owner/date and source appear on working screens and papers; original finding facts remain.
- Progress, outcome evidence and closed records remain accessible from their source. The app does not equate saving/closing with a verified improvement.
- Phone/tablet/desktop controls fit and navigation remains usable; full release gate including sync/report facts passes before main and Vercel publication.

## Implemented flow — release verification pending

Actions now has a direct shared workspace and Open/Completed views. Tool studies, product-tool views, problems, Luna replies and testing records have a reviewed Create action / Link as evidence path. The original source retains its ownership. Actual tasks have separate owner/date, progress, outcome and supporting references; completing a task does not close its originating problem or verify improvement. Line Actions shows exact-place tasks alongside the existing problem tracker.

The additive migration `20261117221405_action_evidence_sources.sql` is applied to Supabase project `eqdigvzbljofxznqtfia`: JSONB source lists on existing actions/tests, an explicit standalone flag and optional place/client fields on actions. Existing RLS remains enabled and unchanged. Column/constraint read-back and security-advisor name/level comparison passed; pre-existing warnings remain. Sources merge by exact kind/id/reply identity, with legacy problem references transported through existing tagged links.

Local proof currently passes 23 focused source/mapper/concurrent-merge/tracker cases and the first visible browser loop: saved tool use → owned dated action without project → shared Actions → completion/outcome → completed history → original source. The fault count is unchanged. The expanded acceptance now also passes multiple independent actions, evidence links to existing work, Luna reply/output, personal/no-line area work, client isolation, line/completed/area PDFs and 360/820/1440 controls. Existing project/shared Actions and line dependency/Gantt/export stories pass. The full exact-source release gate and production publication remain required.

The schema drift check reads both legacy `supabase/*.sql` history and CLI-generated `supabase/migrations/*.sql`. Its column assertions are unchanged; the applied migration is validated rather than being invisible to a root-only directory read.
