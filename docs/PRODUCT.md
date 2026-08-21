# Faultline — what the product is

**Faultline is the improvement loop for food factories: it measures where a
line bleeds money in £, writes the A3 as the team works, and proves the fix
held.** Power = evidence (video, observations) denominated in £. Intelligence =
the engine that says where to look next. Simplicity = one question to start,
one screen per role, one key back to the overview.

This file exists because a previous attempt became a pile of tools with broken
connections. Every future feature answers to this page.

## The loop (the product's shape)

Not DMAIC-as-workflow — DMAIC is a vocabulary for the report, never a cage for
the user. The product is a short-cycle loop, entered anywhere:

1. **Observe** — capture observations; film snag walks. (Measure)
2. **Reveal** — the Pareto drill; count-vs-time disagreement; the vital few.
   Shift is a drill dimension like any other — "is it the same on shift C?"
   is one cut, not a feature.
   (Analyse — and the *sharp* problem definition falls out here, it is not
   paperwork done up front)
3. **Decide** — raise actions on the vital few, from the board or a walk pin.
   (Improve)
4. **Verify** — the weekly trend with fix flags: did the loss actually stay
   down? (Control — the phase every competitor drops)

Two doors in: **"we know something's wrong"** (scoped workspace, straight to
capture/walk) and **"show me where to look"** (broad capture → Pareto picks the
problem). Both doors end at the same loop. The cadence is weekly — the answer
to "DMAIC is too long, the business loses focus" is a loop whose feedback
arrives before attention decays.

## The spine and the coherence rule

The core object graph is small and stays small: workspace → observations /
walks / snags → actions → trend. One planned addition — the **Case** (a thin
A3: a question, a saved scope, baseline + target numbers, its linked actions,
a held/not-held status). Everything in a Case's A3 boxes is *derived* from
data that already exists; the Case is a folder with a number on it, not a
subsystem.

**The coherence rule: a feature that cannot name which A3 box it fills or
reads does not ship.** Count the objects — if a design adds a second new
object, the answer is no.

**The no-removal rule: a new feature never removes or orphans an existing
capability unless the removal is agreed first.** New doors may open; old
doors stay. If a feature takes over an entry point (a tab, a button), every
destination that entry point used to reach must remain reachable.

Cases are deliberately scarce: a workspace with many open Cases should feel
crowded — scarcity *is* the focus mechanism.

**The calm rule: every screen has ONE hero; status signals share a single
quiet strip; detail unfolds on tap.** (Owner call, Aug 2026 — "it feels very
busy".) Features earn their signal a *pill*, not a banner: each new capability
that announces itself on an existing screen joins the shared status strip
instead of stacking its own card above the hero. At most one primary button
per screen; every other route out is a quiet link. The same rule applies
inside a chart: figures live on the vital-few bars only — the tail keeps its
bars and its tooltips but goes quiet.

## The meeting (the room where the product is judged)

Weekly, zero preparation, runs on live data, decisions land as data before the
room empties, minutes write themselves. Two axes: the **agenda rail** moves
sideways (five acts, fixed order — ritual), the **zoom stack** moves down and
up (Headline → List → Card → Evidence, the same four altitudes in every act;
Escape ascends, Home always returns to the Overview board). The five acts:

1. **The Number** — last full week in £, vs prior, vs target.
2. **Where it hurt** — the week's Pareto, drilled live; evidence at the bottom.
3. **The reckoning** — actions, overdue first, by owner; edited in the room.
4. **Did it hold?** — fix flags on the trend; wins named, fake fixes reopened.
5. **The recap** — auto-minutes: everything changed during this meeting.

The meeting invents no data and no objects — it is a choreography of reads the
app already trusts. It absorbs Present (one presenting system, not two). The
Overview board is scoped to the meeting's period; it must not grow into a
general dashboard.

## The proof principle (two worlds, one rule)

Never claim an improvement you didn't go back and verify — the passive trend
only shows what people happened to log, so it can't be the receipt. Each world
proves in its native language:

- **Stopwatch world** (recurring costs): the **confirmation study** on a Case —
  re-measure the same scope the same way, compare mean time per event, both
  sample sizes always shown, £ projected at the baseline's stated frequency
  (`lib/proof` is the single source of that arithmetic).
- **Camera world** (conditions): the **after-photo** on a closed snag — the
  before-still with the pin next to the proof it's gone.

The tagline is this table: OEE systems have numbers and no eyes; audit apps
have eyes and no numbers; Faultline has both — and closes both loops.

## Positioning: the companion, never the scoreboard

Faultline does not compute OEE, does not attack OEE, and never ships a rival
headline metric (owner decision, Aug 2026 — a named "replacement number" was
considered and rejected: it turns the product into a competing scoreboard and
confuses the story). The pitch is the companion: **"Your OEE / CX / hours
says X. Faultline shows you why, where, and what it costs — and proves the
fix held."** Their score is the smoke alarm; Faultline finds the fire. The
tagline is consistent with this: it says OEE systems can't SEE, not that the
score is wrong.

## The moat (why food, why us)

The real incumbent is a consultant with a stopwatch and Excel. OEE systems
watch machines and need sensors; audit apps do checklists without analysis.
Faultline is the CI consultant as a product: phone-first, no sensors,
measurement by observation, in £. Domain expertise ships as **content**: a
food loss taxonomy (flow wrapper, tray sealer, multihead, checkweigher, metal
detector, oven, slicer; changeover types incl. allergen and hygiene
cleandowns) offered at workspace creation. Losses are not just downtime —
giveaway, labour (crew × wage × on-costs), waste by cause, speed. Walks map
onto the GMP/engineering walks food factories already do weekly: we upgrade an
existing habit, not create one.

## Intelligence — three tiers

1. **Deterministic** (exists): Pareto, vital few, next-cut suggestion,
   count/time disagreement. Offline, free, always the floor.
2. **Domain** (grows with customers): taxonomy + benchmarks — "14% on this
   asset class; typical is 4–6%." No LLM; it's data.
3. **LLM** (Claude, server-side, optional, human-confirmed): v1 ships exactly
   one feature — **the Case writes its own A3 narrative**. Auto-coded free-text
   capture, the root-cause coach, ask-the-workspace: roadmap, not build plan.
   AI must degrade to nothing on a dead-WiFi factory floor; the loop runs on
   tier 1 alone.

## Build order (each step ships complete and useful alone)

1. **Tracker teeth** — `dueAt` + `latestUpdate` on actions (model, sync, SQL
   migration in the standalone re-runnable pattern), overdue-first review
   ordering, group-by-owner, per-action time strips (raised → today → due),
   due/overdue in print + CSV. Owners stay free text with team suggestions —
   fitters and contractors will never be app users.
2. **Meeting Mode** — the five acts above, absorbing Present.
3. **The Case** — the thin object; the existing report regrouped as its
   rendering; micro-charter (baseline auto-filled from data, filled *after*
   the first Pareto, not before).
4. **Food loss taxonomy** — a content file offered at workspace creation.
5. **AI narrative** — one server-side function, drafts the A3 prose, a human
   edits and accepts. **PARKED by owner decision (Aug 2026): build only when
   the owner asks.** Needs an Anthropic API key in Supabase when it comes.

Along the way, one cheap future-proof: a `site` text label on workspaces
(one column now so multi-site later is a query, not a migration).

## The NOT list (cut, with the condition that un-cuts each)

- **Org hierarchy / roles-as-surfaces / SSO** — when an enterprise customer is
  pulling for it, not before. Until then: owner/member + the `site` label.
- **Cross-site benchmarking** — when a second site of the same customer signs.
- **Tier-2 benchmarks** — when enough customer data exists to be honest.
- **AI beyond the A3 narrative** (auto-coding, root-cause coach,
  ask-the-workspace) — when the narrative feature has earned trust in use.
- **New analysis tools** (fishbone, histogram, scatter…) — when a real meeting
  asks a question the Pareto can't answer; `questions.ts` already has the
  socket.
- **Gantt charts** — never. Actions here have no dependency structure;
  overdue-sorted-by-owner is the honest version. The time strip is as
  Gantt as it gets.
- **A separate Prize Board screen** — never (owner decision, Aug 2026). The
  drill already shows where/what/time/cost; the prize is a LINE on the
  existing board (£/wk, halve-it scenario, only ever computed from ≥1 full
  week), and opening a Case turns that prize into the default target.
- **A general dashboard** — never as such; the meeting Overview is the only
  cockpit, scoped to its period.
- **A meeting/attendance object** — not unless auto-minutes-by-diff proves
  insufficient in real use.
- **Wall mode** (a no-touch TV route cycling the meeting Overview) — PARKED
  by owner decision (Aug 2026): build only when the owner asks. When it
  comes, it's a re-choreography of the meeting Overview — no new data.
- **CSV import of existing downtime records** (end-of-shift sheets, planner
  spreadsheets, OEE-system exports → ordinary observations, labelled
  imported; kills the cold start, fits the companion story) — when a real
  prospect has an export in hand and the empty first week is what's blocking
  the sale. Imported rows never mix into a proof study's after-sample.
- **Cost lenses** (view any £ as total / labour only / lost-output only, and
  later more metrics — energy, materials) — when a customer asks to see the
  split. The seam already exists: lib/cost computes each component
  separately and blends only at display; this is a lens, never a data
  rework. Until then the blended £ with the labelled breakdown in Settings
  is the product.

## The demo system (the sales machine, Aug 2026)

**The demo IS the video** (owner decision, Aug 2026 — after trying wizard
tours, the owner cut them: two demo entry points confused the product).
Three parts, each a distinct thing:

- **The tutorial film** (▶ Watch the demo on the demo board →
  public/demo/tutorial.webm): an automatic ~2-minute film of the whole app
  used start to finish in workflow order — capture with the live £ ticker,
  the board, drill in / asset Pareto / deeper / prize / All back out, the
  Case with whys and running study, the proven receipt, the walk with
  pinned faults and footage, the meeting. Visible cursor, real clicks,
  captions explaining each function as it's used. This is what plays in a
  customer room and what a prospect watches in the app. Re-record whenever
  the UI meaningfully changes (scratchpad recorder; the seam at
  public/demo/footage.mp4 swaps in real factory footage).
- **The landing page plays the SAME film** — one video, everywhere. There
  is no separate marketing cut (owner decision, Aug 2026: "remove all demos
  apart from the correct 1").
- **The script arms the presenter** (docs/DEMO_SCRIPT.md): the beats with
  say-this lines, the numbers to have cold, one-breath objection answers,
  and the recovery moves. The live phone-capture beat — a log on the phone
  moving the big-screen bar — is the wow; never cut it.

The wizard walkthrough (invitee onboarding + its home-page replay link) was
REMOVED in the same decision — it read as yet another demo. 📖 the /guide
page is the how-to now, and it's labelled documentation, never "tour" or
"demo". The [data-tour] anchors stay in the markup: the film recorder
scripts target them.

## The workspace is the place (owner decision, Aug 2026)

A workspace is a PLACE — a line, an area — and the product renders it
spatially wherever it can. Three rules:

- **One name.** The workspace name is the line name. Never a second
  "line name" field.
- **Asset order is line order.** `workspace.assets` is the machines in the
  order they stand on the floor (Settings ‹ › reorders). Capture's chips
  and the Line view walk that order; the Pareto stays worst-first.
- **One machine list.** Marking a machine on walk footage PICKS from the
  workspace's machines (add-new joins the list) — so the camera world and
  the numbers world share one spine by construction, joined by name.

**The Line view** (`/line`, door on the snags hub) shows the workspace as
the place: one machine per screen in line order, latest still, read-only
pins, filmed-when stamp (amber when stale), grey gap for machines not yet
filmed. The three-jobs rule keeps the camera world legible: *the hub files
walks · the Line is where you stand and look · the asset page is the
workbench.* The Line never edits — tap the machine to work on it.

Staged on top of this spine, in order, as the owner asks: (2) layers on
the portraits — £-heat per machine, action markers, proof ticks; (3) the
time scrubber — the line across walks; (4) spatial capture — log a loss
from the machine you're standing at. No new objects at any stage; each is
a rendering of segments, stills, pins and observations that already exist.
Projects that aren't lines lose nothing: with no marked machines the Line
door never appears.

Written-down cuts are what stop addon creep when a future session has a clever
idea. Amend this file first, build second.
