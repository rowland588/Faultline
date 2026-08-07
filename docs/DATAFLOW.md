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

## Screen inventory

| Screen (route) | Reads | Refreshes on |
| --- | --- | --- |
| **WorkspaceHome** `#/` | all workspaces; per-ws contents (obs + videos + open snags); profile | mount · syncedAt |
| **WorkspaceProvider** (wraps `#/w/:id/*`) | the workspace + its observations | wsId · syncedAt · own writes (addObs etc.) |
| **CaptureScreen** `capture` | provider (workspace, observations) | provider's rules |
| **LogScreen** `log` | provider | provider's rules |
| **AnalyseScreen / Present** `analyse`/`present` | provider + URL drill state | provider's rules · hash change |
| **SnagsScreen** `snags` | segments, assets-per-segment, open snag count; unportable-footage scan | wsId · syncedAt · own writes (upload/film/reorder/delete/repair) |
| **SegmentScreen** `segment/:id` | the segment record, sibling list, its assets + open counts | segmentId · syncedAt · own writes (mark/rename/add) |
| **AssetScreen** `asset/:id` | the asset, its snags, source video key | assetId · syncedAt · own writes (snag CRUD/rename) |
| **SnagListScreen** `snaglist` | all assets + snags of the workspace | wsId · syncedAt · own writes (status changes) |
| **WalkthroughScreen** `walk` | segments + assets + snags | wsId · syncedAt |
| **TrendScreen** `trend` | provider observations → lib/stats weekly buckets; snags (closed flags) | provider's rules · syncedAt |
| **AssetHistoryScreen** `history/:id` | all assets/segments/snags → snag/history derivations | wsId+assetId · syncedAt |
| **ReportScreen** `report` | provider observations + snags → lib/stats | provider's rules · syncedAt |
| **CloudPanel** (on Home) | session + sync status | auth events · sync status events |
| **AdminPanel** (superadmin) | profiles + allowed_emails (cloud reads) | open · own writes |

## Media

Blobs live in the `media` store, referenced by key from rows. Object URLs are
minted at point of use through `useBlobSource`, which repairs missing MIME
types from the bytes (storage round-trips strip them). A missing blob renders
an explanation ("not on this device yet" / codec named), never a silent black
box. Sync uploads media BEFORE the row referencing it, and both directions
retry from persistent queues.
