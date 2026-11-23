# G6 — Luna on the server (design, not built)

**23 November 2026.** Companion to `docs/LUNA-AGENT.md` G6 and G7.

## What G6 is for

A job handed over at five should finish by morning — with the app shut. That needs:

- The data Luna reads (workbooks, links, production rows) reachable in the cloud without the device.
- A durable colleague loop on the server, with the same capabilities, allowance and audit as AI Mode today.
- Job state (`plan_job`, legs, G5 write batch) stored where the server can continue it.

Nothing in this document ships until Rowland says go after G7 and the data path are proved.

## G7 until G6 lands

**Standing jobs (G7, built 23 November)** store schedules and digests in `standing_jobs` / `standing_job_runs` (synced). The **weekly digest** is built in **pure code** on the device (`lib/standingJob/digest.ts`) from picture, file headlines, open problems and kept variance titles — no assist.

- **Scheduler:** `pg_cron` → `standing-job` edge function is a **stub** (counts enabled jobs; does not run Luna).
- **Client:** When Luna’s page is in view, `runDueStandingJobs` builds any due digest and `StandingDigestNews` offers it — same pattern as G2 keep-up.
- **When G6 is live:** The server runs the same digest builder (or full `plan_job` when `template_prompt` asks for more), writes `standing_job_runs`, and can notify the person without opening the app.

## Same machinery as interactive jobs

Interactive jobs use `capabilities/job` (`plan_job`, `job_step`) and `colleagueAsk`. Standing jobs with a non-empty `template_prompt` beyond the weekly digest should eventually invoke that path on the server; the weekly_digest kind stays code-first by design.