# Faultline — what the product is

**Faultline is where a factory runs its improvement work — and the only
system where that work has to prove itself.** (Owner decision, Aug 2026.)
You manage improvement events in it: every event opens against a MEASURED
loss in pounds (a baseline from real weeks, never typed), its actions live
on the same tracker the floor uses, and it cannot close with a claim — it
closes with a re-measured study that is allowed to say *no improvement*.
The management layer is how it's used; the evidence layer is why it's
bought and believed. Strip either half and it's a gimmick: admin theatre
without the proof, dead accounting without the workflow.

The category disease to never catch: **improvement theatre** (the KaiNexus
failure mode) — charters, stage gates, benefits typed into boxes, events
counted instead of pounds recovered. Faultline's answer is structural: the
Case IS the improvement event, and its numbers are derived, not declared.

**The enterprise surface** (built Aug 2026): `/portfolio`, door on the home
page — one page holding every Case across every workspace: stage, owners
(derived from the case's actions), £ at stake (recent truth vs baseline),
£ proven. The CI manager reads it as a portfolio of events; the FD reads it
as a ledger of outcomes. Sections: being worked · the receipts · called-
didn't-hold (shown, not hidden — the honest ✗ is what makes the ✓ credible)
· closed without a study. Honesty rules: every £ uses its own workspace's
rate; unpriced workspaces contribute hours, never silently mixed into £
totals. It is NOT a dashboard — it lists improvement work and its evidence,
nothing else; no KPIs beyond the cases' own numbers, ever.

The road to enterprise, in order, each still passing the coherence and calm
rules: (1) the portfolio/ledger page; (2) the year — annual totals, every
receipt retrievable, the line's condition over time; (3) audit-grade rigor —
who logged what and when, method always stated; then the parked items below
by their triggers. The refusals hold: no sensors, no chat/comms, no andon
engine, no compliance modules — a system of proof doesn't fight those wars,
it is what their winners have to reference.

**The test for every future feature: does it make the improvement work
truer, fuller, or more readable? If it only makes the demo shinier, it's
marketing, not product.**

## Who it's for, and the boundary (owner decision, Aug 2026)

Underneath everything is ONE ATOM: *see a problem in its place, pin it
with evidence, someone owns it, it closes with proof.* Many teams' work
is made of that atom — a CI manager's losses, a capex manager's punch
list — and that reach is welcome, but:

- **Personas are doors, never modes.** The workspace and its templates
  carry the difference; the object graph stays at four. Persona-specific
  wants enter as CONTENT (a taxonomy, a walk template, a print variant)
  or get refused. The atom evolves for everyone or not at all.
- **The market hears one door at a time.** The forbidden sentence is "it
  does many things." The permitted sentence: "one discipline — see it,
  pin it, own it, prove it closed — applied to whatever bleeds."
  Versatility is a second-act reveal in a live room, never the opening
  claim anywhere.
- **The buyer is the PERFORMANCE side of SME food factories** — ops
  managers, CI leads, line leaders, ops directors — reached through
  consultants, judged in pounds recovered, receipted.
- **The performance/conformance boundary:** Faultline answers "does it
  work and what does it cost?" It never answers "does it comply?" A
  conformance finding only means something against a standard (BRC
  clauses, glass policies, severities, sign-offs) — hosting standards
  makes you a QMS fighting iAuditor/Safefood 360 on their ground for a
  buyer who purchases paperwork. Technical/QA is therefore NOT a target
  buyer; the glass-audit wedge (briefly considered) is withdrawn for
  this reason — mechanical fit isn't meaning fit. If a technical manager
  ever PULLS for it regardless, revisit with eyes open; never push.
  Capex punch lists and fabrication/equipment damage pass the boundary
  (they're working-order questions) and need no build — a workspace
  already serves them.

Power = evidence (video, observations) denominated in £. Intelligence =
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

**The period lens (built Aug 2026): the board shows NOW; time is a lens.**
An unwindowed Pareto fossilizes — a problem fixed in March still towers in
September because months of dead history are baked into the bar. Every
ranking view (board, drill, present) is scoped to a rolling window — 4 wks
(default) · 12 wks · Year · All — carried in the URL (`p`) so it survives
the drill and the breadcrumb. Rolling days, not calendar weeks, so today's
log still lands on the board the moment it's made. Cases, wins, gemba and
studies keep their OWN windows — only ranking is scoped. Flipping periods
IS the trend, told in the Pareto's own vocabulary. Division of labour:
Pareto = where, within a period · trend + flags = whether, across weeks ·
movers = how the ranking shifts · studies = proof, at a moment.

**Proof hardening (built Aug 2026): a verdict is a RECEIPT, not a recompute.**
Three weaknesses, closed in one package. (1) *Frozen receipts* — calling a
study freezes its numbers (means, n, spans, rates, p, calledAt) into
`study.receipt`; logs after the call can never silently rewrite last month's
claim. Reopening clears the receipt; legacy called studies without one keep
computing live, never retro-failed. (2) *Sample density* — n means nothing
without the calendar it covers, so every readout states "before 29 over
11 wks · after 9 over 2 wks", the frequency line (events/wk each side) is
shown for information — the £ claim stays duration-based at the baseline's
frequency — and a study armed >60 days short of target is flagged as
drifted. (3) *The significance gate* — Welch one-sided t (after < before,
p < 0.10, humane for factory sample sizes) in lib/proof; a "win" within
noise is stamped **✗ NOT PROVEN — within noise**, which is exactly why a ✓
is a receipt. One definition of a win product-wide (`provenWin`): better on
average, £ recovered, and past the gate — untestable/legacy = grandfathered
pass, tested-and-failed = not a win. And after the call the question flips:
events since the call answer **"is it holding?"** — n≥5 with the mean >1.3×
the proven after-mean flags ⚠ SLIPPING on the Case, the wins shelf, the
meeting's receipts, the portfolio row and the Line's proof badge. This is
the first leg of audit-grade rigor on the enterprise road.

**The one-door rule (owner cut, Aug 2026): the system is four verbs — log
it · see what it costs · fix it · prove it — and each verb gets exactly ONE
obvious door.** Duplicate doors are what make a product feel complicated;
every one costs a sentence of explanation. Agreed removals under this rule:
the board's three question-cards (their answers live in the chart's chips
and the drill), the board's "Present the board" link (Present lives inside
the meeting), and the snag hub as the eyes' landing — the Snags tab now
lands on THE LINE once machines are marked, with 🎥 Film a walk as its one
action and the hub demoted to "Manage walks ›" (?manage=1 reaches it
without redirect). Capability was not removed anywhere — only doors; every
destination stays exactly one press deeper.

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

**Stage 2 — the layers (built Aug 2026).** The portrait is the canvas all
the data renders onto, one lens at a time (calm rule): 📍 Faults (the
pins) · £ heat (the machine's measured weekly loss glowing ON the metal,
normalized to the worst machine; the rail's dots size with the money) ·
⚑ Actions (open pins + board actions aimed at this machine, with owners
and due words) · ✓ Proof (the case being worked here, or the receipt of
the one that held — tap-through to the Case). Layers derive live from
weeklyLoss / studyResult / the snag store; heat renders on unfilmed gap
cards too, because a machine can bleed £ before it's ever been filmed.

Still staged, in order, as the owner asks: (3) the time scrubber — the
line across walks; (4) spatial capture — log a loss from the machine
you're standing at. No new objects at any stage; each is a rendering of
segments, stills, pins and observations that already exist.
Projects that aren't lines lose nothing: with no marked machines the Line
door never appears.

Written-down cuts are what stop addon creep when a future session has a clever
idea. Amend this file first, build second.
