# Working on Faultline — for any agent or person, whatever the tool

This file is deliberately short. The rules are in **`CLAUDE.md`** (read it whole; it is not Claude-specific, it is the
repo's law, in Rowland's words); the state is in **`docs/STATE.md`**; the product is in **`docs/DIRECTION.md`**.

## The ten things people get wrong

1. **Done means live.** `main` is what Vercel builds. A push to a branch changes nothing Rowland can see. Done = gate
   green → merged into `main` → the Vercel production build READY. Say "on a branch, not live" when that is the truth.
2. **The memory is the repo.** Nothing survives a session but what is written here. After building, write what changed
   where the next reader looks: `docs/PAGES.md` for anything on a page (the inventory script fails otherwise), the gate
   line in `CLAUDE.md` for a new acceptance script, `docs/STATE.md` for where things stand, the catalogue for a tool.
3. **Nothing new is built until Rowland says go.** A question or an idea gets a specification and a request for go.
4. **A tool goes through the standard.** `.claude/skills/faultline-tool/SKILL.md` → `knowledge/STANDARD.md`: resolve it
   in the catalogue (`node scripts/catalogue.mjs show|search|next`), read its knowledge record, write the spec from
   `knowledge/specs/TEMPLATE.md` *before code*, validate formulas with independent cases (`scripts/knowledge/*.py`),
   build with its report, prove with an acceptance script, update the catalogue truthfully
   (`node scripts/catalogue.mjs summary --write`, `check`).
5. **No AI in a figure.** The only AI is the voice (Line Talk, through the `assist` gateway, Claude only) and the
   camera. Line Talk writes down what was said; it never works out, classes, estimates or saves. Every number on a
   screen or paper comes from a formula in `src/`.
6. **Everything derives a cost** from the one cost model (`knowledge/MONEY.md`); a missing input is named, never
   invented, and never blocks the tool.
7. **One word, one place, one colour.** A page is *Problems*, *Actions*, *Tools*; a project, never a job; a client,
   never a GM. Red · amber · green · violet · grey mean one thing each and the state is always said in words beside the
   colour. Paper is light — never white words on a dark fill.
8. **Nothing is removed until you can say why it was there**, and every change states its effect on the screen and the
   PDF together. Additions connect to an existing record and show wherever that record shows.
9. **Manufacturing is many.** Before holding one value, ask whether the floor ever has a list — and build the list.
10. **Push the working branch after every commit.** A container restart has already wiped a day's unpushed work once.

## Where things are

| | |
|---|---|
| The app | `src/` — `src/project/` (the reader, the kinds, the journey), `src/line/`, `src/tools/<key>/` (a tool by its catalogue key), `src/catalogue/` (every tool, its status, the registry), `src/lib/report/` (the paper engine), `src/cloud/` (sync, mappers — a schema change is a migration, never an edit to the test) |
| The knowledge | `knowledge/` — `methods/` (the library), `specs/` (one per tool, twelve headings), `STANDARD.md`, `MONEY.md`, `GAPS.md`, `SUMMARY.md` (generated) |
| The designs | `docs/` — each named in `CLAUDE.md`; `docs/history/` is what was replaced |
| The proofs | `scripts/acceptance/*.mjs` (Playwright, one per finished story), `scripts/smoke.mjs`, `scripts/inventory.mjs`, `scripts/journeys.mjs`, `scripts/gate.sh` |
| The database | `supabase/*.sql` — a history, never replayed; a change is a new file applied with its read-back. `supabase/functions/assist` is the Line Talk gateway, whose `talk/` and `video/` folders are copied from `src/tools/` by `scripts/sync-assist.mjs` |
| The brand | `scripts/brand-assets.mjs`, `index.html`, `public/` |

## Git

Branch from `main`, work on a branch, merge to `main` only when the gate is green:
`git fetch origin main && git merge-base --is-ancestor origin/main HEAD && git push origin HEAD:main`.
The `Prune branches` action (Actions tab) deletes branches whose commits are all in `main`.
