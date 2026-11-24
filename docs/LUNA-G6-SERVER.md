# Luna on the server — G6 design (23 November 2026)

**Read this before changing the cron poll, the edge functions, or anything that runs Luna while the app is shut.** It is the design Rowland asked for before G6 is built (`docs/LUNA-AGENT.md` G6, `docs/LUNA-AGENTIC-NEXT.md` P5). The first live slice is **G2 remainder** — linked files polled in the cloud while the app is shut, with a push when something moved. **Parked jobs** on the server are specified here and **built** (24 November): a job handed over at five is done by morning, or the conversation has how far she got.

## What the person should feel

| Slice | When | What happens |
|---|---|---|
| **G2 remainder (built first)** | Overnight, the app shut | A linked workbook changes · the phone gets *A file Luna reads has changed* · opening Luna shows the same news row as when she looked on the device (`data-server-keepup`) |
| **G6 job (built)** | Hand a job at five · shut the app | In the morning the conversation has her finished answer, or how far she got — no "carry on" |

## 1. Durable job state (parked job — built 24 November)

A **server job** is a Luna conversation thread the person **parked** with an **open job** (`ColleagueThread.job`, `jobOpen`) and a flag the device sets when they leave: `handToServer: true` on that thread (stored in the talk study's `facts.colleague.threads[]` and synced like every study).

**What the server must hold** (next migration `LUNA_G6_JOBS.sql`):

| Field | Where | Purpose |
|---|---|---|
| Thread + job snapshot | `luna_server_jobs` row, JSON of gateway-shaped turns, focus, pending carry, job steps | Resume without the open tab |
| Owner | `owner_id` from the talk study | Allowance and push |
| Customer | `client` on the job / focus | Customer guard |
| Status | `queued` · `running` · `waiting_device` · `done` · `stopped` · `failed` | One row per hand-off |
| Bounds | `max_legs` 24 gateway rounds (`MAX_LEGS` × `MAX_ROUNDS`); `deadline_at` **twelve hours** (`SERVER_JOB_MS`) — not the device loop's ten-minute `JOB_MS` | Cost and overnight cap |
| Writes | Never auto-approved — G5 still needs the person | Rule 3 |

The **device** hands off when the app goes out of sight with an open job (`shouldHandOff`: not mid-ask on a live tab, or `pagehide` when the page is dying): patches the study, inserts `luna_server_jobs` (one open row per thread), and **kicks** `colleague-job` with the owner's JWT. Cron (`*/15 * * * *`) picks `queued`/`running` rows as backup. Each go: up to six gateway rounds; **`plan_job` and `job_step` run on the server** against the snapshot; a read that needs this device waits (`waiting_device`); a write is never run. The same gateway as AI Mode (`scripts/sync-assist.mjs`). Microsoft poll, server `readQuietly` and workbook bytes in cloud storage stay for the next slice.

**Nothing is deleted**; archive is still the Rowland-only `archive_customer` exception.

## 2. Assist gateway reuse

| Use | Task | Auth |
|---|---|---|
| Device | `colleague` | JWT + allowance (`ASSIST_COLLEAGUE_DAILY_CALLS`, 120) |
| Device fast hello | `colleague` + `colleagueFastChat` | Same |
| **Server poll (built)** | *(none — no AI)* | `x-keepup-key` = `push_keys.cron_key` |
| **Server job (built)** | `colleague` with stored conversation | Cron: `x-keepup-key`. Device kick: owner JWT + `jobId`. Allowance debited to the owner |

Usage rows stay in `assist_usage` with `ended` / `effort` (`ASSIST_USAGE_ENDED.sql`). A server leg is billed to the **owner**; the worker refuses when allowance is gone (same words as the gateway).

## 3. Cloud file read path

| Kind | Today | G6 slice 1 | G6 job slice |
|---|---|---|---|
| **Link** | `link` function · `lib/fileLink/linkCore` | **Built:** cron calls `fetchByLink` in `keepup`, SHA-256 vs `origin.hash` on the newest `source` study | Fingerprint only; full read still on device (G2b) |
| **SharePoint / OneDrive** | Device OAuth token | Not polled server-side (no refresh token in cloud) | Needs token vault — later |
| **Workbook bytes on device** | `lib/workbook/carry` | Unchanged | Optional: Supabase Storage copy per customer — not built |
| **Production pull** | `ingest` cron | Unchanged | Unchanged |

Rules unchanged: **https only**, private addresses refused (`link/address.ts`), **60 MB** link cap, **15 MB** for unattended fetch (same as `KEEP_UP.maxBytes`).

## 4. Allowance and cost

- **Poll:** no AI · one `link` fetch per due file per four hours · bounded by `KEEP_UP.most` per owner per run.
- **Server job (built):** each gateway round ≈ 3.6¢ warm (`docs/LUNA-AGENT.md` G1) · hard stop at **twelve hours** and 24 rounds, and the person's daily allowance · `effort` on usage rows for measurement (`colleague-server`).

## 5. Security

| Rule | How |
|---|---|
| **Customer guard** | Server skips sources whose `facts.client` is archived (`story` studies' `agreed.story.archivedAt`); news filtered on device by `activeClient` |
| **No write-back** | Poll never writes business systems; only `luna_link_checks` and `luna_server_news` |
| **No delete** | No capability runs on server in slice 1 |
| **Keys** | Cron presents `x-keepup-key` from `push_keys` at fire time — never in repo |
| **RLS** | Person reads/acks own `luna_server_news`; checks table has **no** policies (service role only) |

## 6. What is built in slice 1 (G2 remainder)

| Piece | Location |
|---|---|
| Design | This doc |
| Pure rules | `src/colleague/serverKeepUp.ts` |
| Client fetch/ack | `src/colleague/serverNews.ts`, `KeepUpNews.tsx` |
| Tables + cron | `supabase/LUNA_G6_KEEPUP.sql` |
| Worker | `supabase/functions/keepup/index.ts` |
| Proof | `serverKeepUp.test.ts`, `scripts/acceptance/luna-g6-keepup.mjs` |

**Not built in slice 1:** Microsoft poll, server `readQuietly`, parked-job loop, workbook bytes in cloud storage.

## 9. G6 job slice (built 23–24 November)

| Piece | Location |
|---|---|
| Pure rules | `src/colleague/serverJob.ts` |
| Device hand-off / merge | `src/colleague/serverJobClient.ts`, `serverJobHandoff.ts`, `ServerJobNews.tsx` |
| Tables + cron | `supabase/LUNA_G6_JOBS.sql` |
| Worker | `supabase/functions/colleague-job/index.ts` |
| Gateway leg | `supabase/functions/assist/colleague/serverJobLeg.ts` |
| Proof | `serverJob.test.ts`, `scripts/acceptance/luna-g6-job.mjs` |

**Overnight as of 24 November:** `SERVER_JOB_MS` twelve hours, `SERVER_JOB_MAX_LEGS` 24, immediate JWT kick, `plan_job` / `job_step` on the server, morning note of the finished answer or how far she got.

**Not built in job slice:** Microsoft poll, server `readQuietly`, workbook bytes in cloud storage, server-side execution of writes (G5 still needs the person).

## 7. Read-back after migration

After `supabase/LUNA_G6_KEEPUP.sql` on the live project:

```sql
select 'luna_server_news' as what, count(*)::text from public.luna_server_news
union all select 'luna_link_checks', count(*)::text from public.luna_link_checks
union all select 'cron keepup', coalesce((select schedule from cron.job where jobname = 'faultline-luna-keepup'), 'MISSING');
```

Deploy `keepup` (`--no-verify-jwt`); prove cron with one manual `net.http_post` using the check key.

## 8. G7 standing jobs until the server digest (built 23 November)

**Standing jobs** store schedules and digests in `standing_jobs` / `standing_job_runs` (synced). The **weekly digest** is built in **pure code** on the device (`lib/standingJob/digest.ts`) from picture, file headlines, open problems and kept variance titles — no assist.

| Piece | Today | When G6 job slice is live |
|---|---|---|
| **Scheduler** | `pg_cron` → `standing-job` edge function **stub** (counts enabled jobs; does not run Luna) | Server runs digest or full `plan_job` from `template_prompt`, writes runs, can push |
| **Client** | Luna in view → `runDueStandingJobs` + `StandingDigestNews` (same pattern as G2 keep-up) | Unchanged — ack on device; server may pre-build runs |

Interactive jobs use `capabilities/job` and `colleagueAsk`. Standing kinds beyond `weekly_digest` should eventually use that path on the server; the weekly digest stays code-first by design (`scripts/acceptance/standing-job.mjs`).
