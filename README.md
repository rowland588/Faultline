# Faultline — The Operational Improvement System

Faultline is Opex Elevate’s app for Rowland’s manufacturing consultancy. A visit can start with a standalone tool or a project on a customer’s production line. Line Recovery is a prepared DMAIC project. Each phase keeps its tool runs, findings and actions together for the customer report. Financial estimates use the recorded cost inputs.

The project methods are PDCA, DMAIC, 8D, A3, Stage gate, Kaizen event, Improvement Kata and Theory of Constraints.

The React, TypeScript and Vite app keeps records on the device in IndexedDB and syncs them to Supabase. Vercel deploys `main` to [Faultline](https://faultline.opexelevate.co.uk).

## Read in this order

1. **`AGENTS.md`** — the one page for anyone (or any agent) working here: the rules, where things are, how to prove a change.
2. **`CLAUDE.md`** — the rules in full, with Rowland's own words and dates. They are the law of the repo whatever tool you use.
3. **`docs/STATE.md`** — where the product is right now: what is live, what is in flight, what is next, what lives outside the repo.
4. **`docs/DIRECTION.md`** — what Faultline is and is not (20 October); it overrides any older document that disagrees.
5. Then the design the change belongs to: `docs/BLUEPRINT.md` (the map), `docs/METHODS.md` (the methods are the projects),
   `docs/STRUCTURE.md` and `docs/MAP.md` (where every page lives), `docs/PAGES.md` (what each page must show),
   `knowledge/README.md` (the tools: library, catalogue, standard).

## Run it

```
npm ci
VITE_SUPABASE_URL=https://testproj.supabase.co VITE_SUPABASE_ANON_KEY=testkey npx vite --port 5191 --host 127.0.0.1
```

The fake Supabase values make an offline device the browser scripts can sign into with a planted session; real values
(`.env.example`) turn on sign-in and sync. To see which build the device is running, open **Account → App & sync**. The deployed commit and build time are published in [version.json](https://faultline.opexelevate.co.uk/version.json).

## Prove it

Nothing is done until the gate passes and the change is merged into `main` and built (CLAUDE.md, *Finished means live*).
With a dev server on 5191, run `npx tsc --noEmit && npm run lint && npm test && npx vite build`,
then `node scripts/smoke.mjs`, `node scripts/inventory.mjs`, `node scripts/journeys.mjs` and the acceptance scripts
for what you touched (`scripts/acceptance/`, each listed with what it proves in CLAUDE.md, *The gate*); or all of it at
once with `scripts/gate.sh fast|quick|full`. A tool is built through `.claude/skills/faultline-tool/SKILL.md` and
`knowledge/STANDARD.md`: specification first, independent cases, an acceptance script, the catalogue kept truthful.
