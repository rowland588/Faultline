# Faultline — data flow contract

The map of what every screen shows, where it reads it from, and what must make
it refresh. Any screen that breaks these rules produces the class of bug where
data exists but the UI claims it doesn't ("0 observations" on a workspace full
of videos), or where one device shows yesterday until someone force-refreshes.

## The three refresh rules

Every screen that displays stored data re-reads it on ALL of:

1. **Mount / scope change** — navigating to the screen, or its `wsId`/`id`
   param changing. (Navigation always remounts, so back-and-forth is fresh.)
2. **`useSyncedAt()` tick** — a background sync finished; remote changes may
   have landed. Put it in the load-effect's dependency array. This covers
   every cross-device path: the other phone, the laptop, an invitee.
3. **Own writes** — after a mutation the screen itself made, it re-reads
   explicitly (`await load()` in the save handler). Local writes also trigger
   a push via `onLocalWrite` (db.ts) → other devices get rule 2.

A display derived from data must derive from **all** of the data it claims to
summarise — a workspace card that says what's inside counts observations AND
videos AND snags, never one kind standing in for the whole.

Derived numbers shown on more than one screen come from ONE module —
`lib/stats` (weekly loss, headline KPIs, category momentum) and
`snag/history` (walk grouping, asset timelines) — so Trend, the Report and
Asset history can never disagree about the same figure.

## Write path (why nothing needs a Sync button)

```
user action → db.ts mutator → IndexedDB (source of truth)
                   │
                   └─ signalWrite() → sync engine (debounced ~1s)
                        ├─ PUSH rows changed since push-cursor (+ media first)
                        └─ cloud stamps `rev` (server sequence, trigger)
                             └─ realtime event → every other signed-in device
                                  └─ PULL rev > last-seen  → IndexedDB
                                       └─ syncedAt tick → screens re-read (rule 2)
```

Fallbacks only: focus / online / visibility / 30s interval. Failed media
transfers sit in persistent retry queues drained each pass.

Device-local fields — `lastRoute`, `activeTimer`, `lastOpenedAt` — never stamp
`updatedAt` (the LWW clock) and never sync. Opening the app must not make
stale data look newer than a real edit from another device.

## Team model (v4: workspace teams)

Two doors, two owners. The **app door** belongs to the superadmin: sign-up is
invite-only via `allowed_emails`. Each **workspace door** belongs to whoever
created that workspace: anyone in the app can open a workspace, and its owner
picks the stakeholders on `workspace_members` (by email) through the People
panel in Settings. RLS (`is_ws_member`) shows you a workspace — and all its
child rows — only if you own it, you're on its people list, or you're the
superadmin. There is no all-shared world.

**Late joiners get full history.** Devices pull by the server `rev` cursor, so
a member added to a workspace with months of history would otherwise see
nothing older than their cursor. A DB trigger (`faultline_member_added`) runs
no-op updates on every row of the workspace when a member is added; the rev
trigger re-stamps them, and the new member's next pull sweeps up the lot.
`updated_at` is untouched, so LWW is unaffected and other devices just re-pull
identical rows once.

`owner_id` is attribution ("logged by Dave") AND workspace-level access —
the client must NEVER reassign it: `toRow` keeps the row's existing `ownerId`,
stamping the current user only on rows created locally. The people list is a
live cloud fetch (not offline-synced): you manage people while online. Media
uploads to the flat `${key}` storage path (team-readable; keys are unguessable
uuids, rows pointing at them are membership-scoped); downloads fall back to
the capturer's legacy `${owner}/${key}` folder, then our own. Snag `owner` is
free text with the team as suggestions; assignment to a member's email powers
their "Mine" view.

## One action system, two ways in

A `snags` row is EITHER a pinned snag (assetId + x/y on a walk still) OR a
**board action** raised straight from the Pareto drill (no pin; `target_*`
columns record where the board pointed — category / kind / operational asset
name). Both share the same lifecycle, owners, snag list (actions sort first,
flagged ⚑), printed snag report ("Actions from the board" section), one-page
report ("needing a push" / "closed this week") and trend fix-flags. Pin-based
screens (Asset, Walkthrough, History) read via the `by_asset` index, which
naturally excludes pinless rows. Never assume `assetId`/`xPct`/`yPct` exist on
a Snag.

## Screen inventory

| Screen (route) | Reads | Refreshes on |
| --- | --- | --- |
| **WorkspaceHome** `#/` | all workspaces; per-ws contents (obs + videos + open snags); profile | mount · syncedAt |
| **WorkspaceProvider** (wraps `#/w/:id/*`) | the workspace + its observations | wsId · syncedAt · own writes (addObs etc.) |
| **CaptureScreen** `capture` | provider (workspace, observations); cases (armed-study chips → lib/proof) | provider's rules · syncedAt (chips) |
| **LogScreen** `log` | provider | provider's rules |
| **AnalyseScreen / Present** `analyse`/`present` | provider + URL drill state | provider's rules · hash change |
| **MeetingScreen** `meeting` | provider observations → lib/stats + drill engine (windowed to the meeting's week); snags + assets (reckoning, verdicts); cases → lib/proof (Act 4 receipts); minutes = diff vs session start | provider's rules · syncedAt · own writes (updateSnag) |
| **SnagsScreen** `snags` | segments, assets-per-segment, open snag count; unportable-footage scan | wsId · syncedAt · own writes (upload/film/reorder/delete/repair) |
| **SegmentScreen** `segment/:id` | the segment record, sibling list, its assets + open counts | segmentId · syncedAt · own writes (mark/rename/add) |
| **AssetScreen** `asset/:id` | the asset, its snags, source video key | assetId · syncedAt · own writes (snag CRUD/rename) |
| **SnagListScreen** `snaglist` | all assets + snags of the workspace | wsId · syncedAt · own writes (status changes) |
| **WalkthroughScreen** `walk` | segments + assets + snags | wsId · syncedAt |
| **TrendScreen** `trend` | provider observations → lib/stats weekly buckets; snags (closed flags) | provider's rules · syncedAt |
| **AssetHistoryScreen** `history/:id` | all assets/segments/snags → snag/history derivations | wsId+assetId · syncedAt |
| **ReportScreen** `report` | provider observations + snags → lib/stats | provider's rules · syncedAt |
| **CaseScreen** `case/:id` | the case; provider observations scoped by its path (weekly trend, analysis); snags with its caseId + in-scope suggestions | wsId+caseId · syncedAt · own writes (updateCase/updateSnag/addSnag) |
| **CloudPanel** (on Home) | session + sync status | auth events · sync status events |
| **AdminPanel** (superadmin) | profiles + allowed_emails (cloud reads) | open · own writes |
| **PeoplePanel** (in Settings) | workspace_members + profiles (cloud reads) | open · own add/remove |

## Media

Blobs live in the `media` store, referenced by key from rows. Object URLs are
minted at point of use through `useBlobSource`, which repairs missing MIME
types from the bytes (storage round-trips strip them). A missing blob renders
an explanation ("not on this device yet" / codec named), never a silent black
box. Sync uploads media BEFORE the row referencing it, and both directions
retry from persistent queues.
