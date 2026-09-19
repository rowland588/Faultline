# Faultline — how work gets delivered here

## Finished means live, not pushed

`main` is what Vercel builds. A push to any other branch changes nothing that
Rowland can see: the site keeps serving the last build of `main`, silently and
correctly, and the work looks done from the terminal while being invisible from
the app.

That has already cost a whole session once — 21 commits sat on a branch for a
day while each one was reported as "pushed". Pushed was true. Live was not, and
those are not the same claim.

So the definition of done is:

1. the gate passes (below),
2. the change is merged into `main` and pushed,
3. and only then is it reported as done.

If something genuinely cannot be merged — a spike, a half-finished refactor, an
explicit request to hold it on a branch — say so in the same breath as
"finished", in plain words: *this is on a branch and will not reach the app
until it is merged.* Never let "pushed" stand in for "you can see it".

Working on a feature branch and merging at the end is fine. Leaving it there is
not.

## The gate

Run all of it before merging. It is what CI runs, plus the two things CI cannot:

```
npx tsc --noEmit
npx eslint src --max-warnings 109     # a ratchet, not a target — see below
npx vitest run
npx vite build
node scripts/smoke.mjs                # needs a dev server on 5191, or SMOKE_BASE
```

The lint number is a **ceiling that only ever comes down**. The remaining
warnings are a backlog (mostly non-null assertions), not a standard. If a change
removes some, lower the number in `package.json` and `.github/workflows/checks.yml`
in the same commit. Never raise it to get green.

`scripts/smoke.mjs` loads every screen in the app with realistic seeded data and
fails on any console error. It has caught crashes that no unit test would have.
Its fixtures live in `src/dev/seed.ts` — **TypeScript on purpose**, because two
earlier attempts wrote plain objects in the `.mjs` and both were the wrong shape,
manufacturing two "bugs" in the app that were really bugs in the harness.

## Verifying in the app, not just in the terminal

For anything a person sees, drive it in a real browser before calling it done —
Chromium is at `/opt/pw-browsers/chromium`, Playwright is configured to find it.
Seed data, click the actual controls, read the actual DOM.

Four separate defects in the commissioning screen were invisible to every test
and to reading the code, and turned up in the first thirty seconds of using it:
no way to create a machine at all, a number box that turned `12` into `102`, a
database write on every keystroke, and no way to delete a mistyped row.

On the deployed app, the Home screen prints `Build <timestamp>`. That is the
one-glance answer to "is the fix actually live", and it is why it exists.

## Things that will bite

- **Schema drift is silent.** The app's mapper and the SQL migrations are two
  descriptions of the same columns. When they disagree the push is rejected, the
  cursor never advances, the row never leaves the device, and nothing on screen
  says so. This has happened four times. `src/cloud/__tests__/sync-schema.test.ts`
  compares both sides and runs on every commit — when it fails, the fix is a
  migration, never an edit to the test.
- **The PWA caches aggressively.** `registerType: 'autoUpdate'` means an installed
  app fetches a new build and swaps to it on next launch. In a dev browser, a
  hard reload. Stale UI is usually this, not a broken build.
- **Supabase env vars are baked in at build time.** `scripts/check-env.mjs` prints
  whether both were present, in the host's build log. A build missing them ships
  a working-looking app with no sign-in.
