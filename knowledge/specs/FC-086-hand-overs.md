# FC-086 · FC-094 — hand-overs between the Statistics tools: the specification

**Catalogue:** FC-086 Control chart (individuals), FC-094 Capability (measured data) — each gains one line under its answer; no new entry · **Knowledge:** `spc.control-charts`, `spc.capability-measured`, `spc.normality-checks` (`knowledge/methods/`) · **Asked for:** Rowland, 30 October 2026 — *"this tool says X, now link to this tool"*; 31 October — *"stay on tools and make the statistical world"* · **Status:** agreed (Rowland, 31 October) — built with W2 of `docs/TOOLS-WORLDS.md`, on the readings sharing of `FC-094-shared-readings.md`

## 1. Purpose
A tool's answer sometimes names the next question. A capability index on a run that was not steady is a rough guide at best, and the person should be told what to do about it, not left to know. A control chart that has settled, with the specification known, is exactly the situation a capability index describes. The sentence it lets the lead say to the team: **"the tool told us what to look at next, and why."**

**Scope.** This build covers two hand-overs, fixed rules, each shown once under the answer of the tool that makes it and each opening the existing *Use these readings in…* sheet (`FC-094-shared-readings.md`) on the right tool: **Capability said not steady → Chart these readings**, and **a steady Control chart with the specification known → Check capability**. It does not cover: any hand-over made by a model (never — `docs/DIRECTION.md`); a button that is always there; hand-overs from Analysis, the loss count, reliability or the lean tools (each needs its own rule and its own spec, W2 later); starting anything by itself (a suggestion only); any new calculation — every condition is read from the tool's own module.

## 2. Users and scenarios
The lead at a desk or on a phone, looking at an answer. (1) Thirty fill weights give a Ppk of 0.9 and the checks say *Not steady — 8 in a row sat above the mean from no. 17* — **Next: chart these readings**. (2) A chart of forty seal temperatures has had its limits set from the first twenty and no signal since, and the specification is typed on it — **Next: can it hold the specification? Check capability**. (3) A chart with a signal says nothing of capability — the process is not steady, so no hand-over.

## 3. Method selection
No new method. What is chosen is *when* a hand-over is made, so it is never noise: it must rest on a fact the answering tool has already computed and says in its own words. Alternatives considered: always offering the other tool (noise — the More ▾ item already does that); a hand-over by a model reading the answer (forbidden); more rules now (each needs a reason a statistician would give, and a test — two are enough to prove the pattern).

**Established · assumed · chosen.** *Established:* a capability index describes a process that is in statistical control; where the run is not steady the index is unreliable and a control chart is the tool that shows when and how it moved (`spc.normality-checks`, `spc.capability-measured`, Montgomery, *Introduction to Statistical Quality Control*, ch. 8–9 — capability analysis follows control). A control chart with limits set from a steady period and no signal since is the evidence of control. *Assumed:* the chart's own signals (the run rules agreed on it) are the test of steadiness; the capability study's own *steady* check (individuals limits and a run of 7+ on one side) is the test on the other side. *Chosen (Faultline's, Rowland 31 October):* the two rules above and only these; the hand-over is **only for individual-value charts with a specification typed** (a short-run chart's values are deviations; pre-control has no limits to freeze; a subgroup chart's readings are not individual values); a client is not shown it; it is said once, under the answer, never as a banner.

## 4. Inputs
None typed. Everything is read from the study: Capability — its agreed readings (kind limits or pack by weight), its readings, and the tool's `checksSay` steady entry; Control chart — its agreed chart (kind, specification, frozen limits) and its readings through `chartFigures` (provisional or set, signals).

## 5. Data suitability
Capability's checks are said from `CHECK_FROM` readings, so a hand-over from it needs at least that many; a chart needs limits set (frozen, from at least its `LIMITS_FROM` readings). Fewer: no hand-over — never a guess.

## 6. Calculations
None new. `handOverFor(study)` (`src/lib/handOvers.ts`) is a pure function of the study through the tools' own modules. Independent cases (unit tests, hand-made series): (a) a ramp from 395 to 405.2 over 30 readings — capability says *Not steady* → hands over to the chart, the reason being the tool's own sentence; (b) a bounded zig-zag of the same length — steady → nothing; (c) 8 readings, or a rejects study → nothing; (d) the zig-zag charted with its limits frozen and a specification → hands over to capability; (e) the ramp charted → a signal → nothing; (f) the zig-zag with provisional limits, with no specification, short-run, pre-control → nothing; (g) any other tool → nothing.

## 7. Outputs
**On screen:** under the answer's sentences, one line — **Next** · *The run was not steady — chart these readings to see when it moved and whether it settled.* followed by the tool's own sentence as the reason, and a button **Chart these readings ›** (or **Check capability ›**) that opens the sharing sheet already on that tool. Nothing when no rule applies.

**The report.** No change to any paper: the hand-over is a suggestion about the next piece of work, not a finding. (The copy a person then starts says where its readings came from, on screen and paper — `FC-094-shared-readings.md`.) Paper parity is unchanged for every paper.

## 8. Manufacturing usability
One line and one button under the answer; on a phone the line wraps and the button is 44 px. The sheet it opens is the sharing sheet — Start is one more tap. Nothing is started by itself.

## 9. Failure handling
A client sees nothing (it cannot start a study). A closed study (a receipt) still hands over — the copy is a new open study. Too few readings, counted data, a short-run chart: no hand-over, no message. A source that changes after the hand-over was acted on: the copy says the source has moved (`FC-094-shared-readings.md`).

## 10. Integration
**Record:** none — a read of the study. **Where it shows (rule 5):** Capability's and the Control chart's answer, nowhere else; the sheet it opens is the one More ▾ opens; the world's home (Statistics) is where the two tools' relationship is first said. **Access:** `can.edit` (a client is not shown it). **PAGES.md:** the two tools' lines. **No AI. No sensor.**

## 11. Verification
`src/lib/__tests__/handOvers.test.ts` (the cases in §6) and `scripts/acceptance/hand-overs.mjs`: a drifting capability study showing Next with the tool's own reason, its button opening the sheet on Chart, the chart made with the readings; the steady one showing none; a steady chart with limits set and the specification typed showing Next › Check capability and making the study; the same chart given a signal showing none; the phone.

**Acceptance criteria.**
1. A capability study the tool says is not steady shows **Next** with the tool's own sentence as the reason and a button naming the chart — `handOvers.test.ts` (a) and step 1 of `hand-overs.mjs`.
2. A steady capability study shows nothing — test (b), step 1.
3. The button opens the sharing sheet on the right tool and Start makes the copy — step 2 (the study made is the chart, with the readings).
4. A steady chart with limits set and the specification known shows **Next › Check capability**; with a signal, provisional limits, no specification, short-run or not individuals, nothing — tests (d)–(f), steps 3–4.
5. Nothing is ever started by itself; a client sees nothing — step 2 (nothing exists until Start) and the `canEdit` gate read in `ui/NextStep` (**the client case is not driven in a browser** — listed below).
6. No paper changes — `paper-parity` against live.
7. The phone: the line wraps, the button is at least 44 px, nothing off the side — step 5.
Not yet proved: the client case driven in a browser; hand-overs from the other tools.

## 12. Maintainability
Code: `src/lib/handOvers.ts` (the rules, one function), `ui/NextStep` (the line), one line in each of the two screens. A third rule is one more branch in that function with its test and its sentence in the answering tool's words. Left for later: rules from Analysis (a wide interval → *how many readings*), the loss count and the stops (→ Reliability), each by its own spec.
