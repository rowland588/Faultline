# Building the catalogue's tools — the brief every builder works to

Written 25 October 2026. Rowland, the same day, to the question "start with the check log and the
calculators, how many helpers, and do I batch the judgement calls into a list for you?":

> "Yes, start with check log and calculators, helpers, maximum that you can do. I think 7. And whether
> to batch the judgment calls into one list per batch so you confirm. No, you don't have to. Just go
> through the batches, go through everything, and return to me when everything's completed and
> functional inside the app."

So: **go** is given for every entry in the catalogue that can honestly be built, and the owner does not
want a list of questions. That does not loosen anything in `CLAUDE.md` or `knowledge/STANDARD.md`; it
moves each judgement call to the builder, who makes it **conservatively, writes it down where the next
person will look, and says it on the screen.** Read, before anything else: `CLAUDE.md`,
`docs/DIRECTION.md`, `knowledge/STANDARD.md`, `.claude/skills/faultline-tool/SKILL.md`,
`knowledge/BUILD-SHAPES.md` (the shapes and what each tool still brings), `docs/TOOLS-BUILD.md`
(the waves and what is already built), the entry (`node scripts/catalogue.mjs show FC-nnn`) and the
knowledge records it names.

## What "done" is for a tool

An entry is **available** only when the standard's four things are all true, and the catalogue test
(`src/catalogue/__tests__/catalogue.test.ts`) refuses it otherwise: its **code**, its **unit tests**,
an **acceptance script that is in the gate** (listed in `CLAUDE.md`'s gate block, as every
`scripts/acceptance/*.mjs` line is), and a **specification** with its scope, its facts said apart from
its choices, its report and its acceptance criteria naming that script. Plus: screen and paper say one
thing from one module; the money is in it (`lib/cost`, `knowledge/MONEY.md`) or it says which input is
missing; phone and desk; empty, too-few and invalid states designed; access checked
(`can.edit` / `can.agree` / `can.remove`); `docs/PAGES.md` and `scripts/inventory/pages.mjs` say what
the page must show; nothing broken that worked.

If something cannot be done honestly — a table that is licensed or whose text has not been read, a
safety judgement that belongs to a team, a person's data nobody has said may be shown — **build the
narrow honest version, say on the screen what it does not do, and leave the entry `partial`** with its
`limits`. If nothing honest can be built, leave it where it is and say why in your report. Never
invent a formula, a threshold from memory, a standard's clause number or a table: where a figure comes
from a source, the source is named in the spec and the figure is checked against it (an independent
case); where it is Faultline's own choice, it is said to be (`Established · assumed · chosen.`).
**Never claim a thing is done that was not run.**

## House rules that bite builders (the short list — `CLAUDE.md` is the whole)

- Measured **by people, not sensors**: every number is typed, timed, tapped, counted, photographed.
  No OEE. No second AI provider; no AI in a figure.
- **One colour, one meaning** (red late/failed, amber waiting/due soon, violet under way, green done,
  grey not started; priority RAG only on its tag). **Never white words on a dark fill.** Normal
  recedes, the abnormal stands out. The state in words beside the colour. No raw colours: use the
  tokens (`src/styles.css`); a ratchet test counts raw hex/rgba and **only comes down**.
- **Screen and paper together** (`lib/report`, `lib/reportKit`, the lean page `lib/lean`, `ui/Lean`).
  A paper is made from the same module that draws the screen. Greek letters and symbols on paper go
  through `lib/reportKit` `san` — check a paper by downloading it and reading it back
  (`pdftotext`), as the acceptance scripts do.
- **One page header** (`ui/parts` PageHeader: title, what it says, one primary, More ▾, Report ▾), one
  tool shell for a tool's record (`ui/StudyActs` StudyBand, `ui/StudyPlace` WhereItSits), a record is
  **edited and deleted where it sits, with Undo**. Menus and the rail: a new page sits in its scope
  (`lib/scope`), never a list of tools on the rail.
- **Wording**: *project* (never job), *client* (never GM), no "snag", "workspace", "tracker", "3P".
  The smoke script fails on those. House voice: plain, the floor's words.
- **Money**: one cost model (`lib/cost`, `lib/capacity` labourCost, `lib/ie/balanceLink`,
  `lib/ie/losses`); a finding is said in £ with "because of …", or says which input is missing and
  where to give it — never a blank, never an invented figure.
- **A record that is a list added on several devices merges by id** (as readings do); a row the cloud
  moved is pulled and merged, never overwritten (`src/cloud/sync.ts`; sync-two-devices scenario 10).
- **Database changes ship from here**: write `supabase/<NAME>.sql` in the house shape (header, "Run
  ONCE. Safe to re-run", create-if-missing, a final `select`). **Do not apply it** — tell the
  integrator in your report. Avoid needing one: a calculator's inputs, a check's results, a ledger's
  rows all live in the study's own `agreed` and `facts` (`studies` table, widened once for six shape
  keys by `supabase/SHAPE_TOOLS.sql`: `calc log ledger doc scored run`). If you add a field to a typed
  record, the mapper and `src/cloud/__tests__/sync-schema.test.ts` must agree.
- A tool's **page and its paper are driven by an acceptance script in a real browser** that checks
  every sentence on the page against the module that makes it (`scripts/acceptance/*.mjs` are the
  models: `capability-kinds.mjs`, `reliability.mjs`, `line-analysis.mjs`), reads the downloaded PDF
  back, and checks the phone (390 px wide, nothing off the side). Press controls by name through
  `scripts/lib/pageHeader.mjs`, so a control moving into a menu never breaks it.

## Your setup (a worktree of your own — do not touch the other checkouts)

```
git fetch origin main && git checkout -B <your-branch> origin/main
ln -s /home/user/fl-dual/node_modules node_modules          # shared dependencies
cat > <name>-vite.config.ts <<'E'                            # untracked: NEVER commit it
import { mergeConfig } from 'vite';
import base from './vite.config';
export default mergeConfig(base, { server: { fs: { allow: ['/home/user'] } }, cacheDir: 'node_modules/.vite-<name>' });
E
VITE_SUPABASE_URL=https://testproj.supabase.co VITE_SUPABASE_ANON_KEY=smoke-anon-key \
  setsid nohup npx vite --port <YOUR PORT> --strictPort --config <name>-vite.config.ts > /tmp/<name>.log 2>&1 < /dev/null &
SMOKE_BASE=http://127.0.0.1:<YOUR PORT> node scripts/acceptance/<your-script>.mjs
```

Without those two `VITE_` variables the app shows "Temporarily unavailable". **Your port and cache
directory are your own** — a second server on a shared cache corrupts it. Never `pkill -f`/`pgrep -f` a
pattern that matches your own command line (it kills your shell); never wait with `sleep` loops — run
long things in the background and poll the file. A script that closes a sheet and then navigates waits
for `!history.state?.flPanel` first. Changing a source file under a running server can leave two module
copies loaded (a PDF font that differs from the harness's): restart your server after editing
`lib/reportKit.ts` or a seed. The seed is `src/dev/seed.ts` (TypeScript on purpose); a new shape of
data adds its seed there, and `scripts/smoke.mjs` must still pass (no console error on any screen).

**Run before you report** (all of it, in your worktree): `npx tsc --noEmit`; `npx eslint src
--max-warnings 61` (a ceiling that only comes down — if you remove warnings, lower it in
`package.json`, `.github/workflows/checks.yml` and `CLAUDE.md` in the same commit; never raise it);
`npx vitest run`; `npx vite build`; your own acceptance scripts; `node scripts/inventory.mjs`;
`node scripts/catalogue.mjs check`; `node scripts/smoke.mjs`; and every existing acceptance script of
a tool you changed. The integrator runs the whole gate (`scripts/gate.sh`) on the merge — do not run
it yourself, and do not run the long fuzz or the two-device sync.

## Shared files — edit them as little as you can, and only by adding

Several builders work at once, each in a worktree, and the integrator merges. `CLAUDE.md` (the gate
block: **one new line per acceptance script, at the end of the block**), `docs/PAGES.md` (a row or a
clause for each page), `scripts/inventory/pages.mjs` (an entry per page), `src/catalogue/entries/*.ts`
(only your entries), `knowledge/SUMMARY.md` (**regenerate** with `node scripts/catalogue.mjs summary
--write` before your last commit), `src/styles.css` (append your classes at the end, under a comment
naming the tool), `src/dev/seed.ts` (append). Do not reformat, reorder or "tidy" what is not yours.
Anything that every tool of a shape needs belongs in the shape's own module, not in a shared file.

## Judgement calls — decide, write down, say on the screen

A threshold, a default, a word, a scope, a level of detail: decide it conservatively, put it in the
spec under *chosen* with the reason **and who chose it ("the builder, 25 October — the owner asked not
to be asked")**, and say it on the screen where the person reads the result. A choice that belongs to
the owner by `CLAUDE.md` or `docs/DIRECTION.md` — a **fourth kind of change**, a **licensed table**,
**who sees a person's data**, **what a food-safety tool may say** — is not yours to settle by
building the large version: build only the part that is established and safe, say so, and list it
under *DECISIONS TAKEN* in your report. A tool that records and checks food safety (HACCP, allergen
order, validation, line clearance) **states the team's rules and checks against them; it never decides
a hazard, a limit or a release.**

## Commit, and do not push

Small commits on your own branch; messages say what changed and where it shows (screen, paper, the
parents it hangs off — `CLAUDE.md` rule 5), and end with the two lines the harness gives you
(`Co-Authored-By: …` and `Claude-Session: …`). **Never push. Never create a pull request. Never touch
`main`. Never apply SQL to the live database.** No model identifier in a commit, a comment, a spec or a
paper.

## Your final report

For each entry: the FC number; the status you reached (**available / partial / not built**) and why;
the files and the commit hashes; the acceptance script(s) and the gate line you added; the independent
cases and where they run; **DECISIONS TAKEN** (each one: what, why, where it is said on the screen);
**LIMITS** (what it does not do, as the screen says it); anything the integrator must do (a SQL file to
apply, a merge hint, a shared file you had to change beyond adding); anything you found wrong in
existing code (say where; fix it only if it is in your tools' own files and say so). Plain words first,
then the detail. If you stopped before finishing, say exactly where.
