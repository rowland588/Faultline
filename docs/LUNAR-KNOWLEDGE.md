# LUNAR's knowledge — findings, outcomes, history and the factory, as one architecture

*12 November 2026. Rowland: "Luna must learn from evidence and experience, not simply accumulate opinions. A manager's explanation, an
engineer's observation, a measured result and a verified improvement are different types of knowledge. Preserve those distinctions, their
sources and their history … retain contradictory evidence … recognise when an earlier finding or assumption was wrong, rather than quietly
rewriting history." The order agreed: (1) findings with stable identities, provenance and review states; (2) outcome tracking — findings to
investigations, countermeasures and results; (3) the history of what was tried and whether it lasted; (4) the brain across the Factory
Knowledge Model. The brief behind it: `docs/briefs/LUNAR-INTELLIGENCE-BRIEF.md` (as received — it ends mid-§6). B1, the first homework, is
`docs/LUNAR-BRAIN.md`. Held, by Rowland's word: production-system connections stay off; no decision on storing workbooks server-side; no new
AI provider.*

## 1. The one loop

```
 RECORDS (stops, problems, countermeasures, studies, check logs)          ── each kept where it lives, never copied
    │
    ▼  the brain's homework (lib/brain — code, no AI)
 FINDINGS ── a claim with an identity, versioned; a new version only when what it says changes; the old kept, marked superseded
    │
    ▼  a person or Luna turns one into work (raise a problem, start a project — the finding linked as its evidence)
 INVESTIGATION AND FIX (problems, countermeasures, studies — the app's own records)
    │
    ▼  the brain's outcome check (lib/knowledge/outcomes — code)
 OUTCOMES ── did it change, did it last; measured or counted, versioned the same way
    │
    ▼  read together with what people said (accounts, reviews) — each kept apart by how it is known
 HISTORY (lib/knowledge/history) ── what was found, what was tried, what came of it, what people believe, what the evidence says
    │
    ▼
 LUNA ── reads findings, outcomes and history first (capabilities), says how sure and how known, recommends ONE next step,
         and can open the investigation (raise_problem / start_project with the finding attached) — the loop closes
```

Nothing here is a separate AI feature. Every arrow is code over the app's records; Luna only reads it and, on a person's yes, writes through
the capabilities she already has.

## 2. The ledger — one append-only record of knowledge (`knowledge`, `supabase/KNOWLEDGE.sql`)

The records the factory makes keep their own homes (a problem is a problem, a study a study). The ledger holds only what has no other home:
**the brain's findings and outcomes, versioned, and what people say about them.** A row is an *entry*; entries are never changed and never
deleted — the database refuses it (a trigger keeps every column of an existing entry; no delete policy). A correction is a new entry that
says what it corrects. So history cannot be quietly rewritten, and a finding that was wrong stays on the record as wrong.

| Field | Meaning |
|---|---|
| `kind` | **finding** (the brain's claim) · **outcome** (what happened after a fix) · **account** (what a person says happened or why) · **review** (a person's answer to an entry) |
| `known` | how it is known — **counted** (from records counted by code) · **measured** (a study's measurement) · **observed** (a person saw it) · **reported** (a person says it) — the app's own HowKnown words; *verified* is never written by the AI |
| `subject` | what it is about, a key: `line` · `machine:<m>` · `stops:<m>|<reason>` · `fix:<id>` · `problem:<id>` |
| `claim` | a finding's or outcome's identity: `<kind>:<subject>` (e.g. `recurs:stops:bagger|jam`, `outcome:fix:<id>`) — stable for as long as the line exists |
| `supersedes` | the version this one replaces (findings and outcomes); the old one stays |
| `about`, `stance` | the entry this one answers, and how: **supports · contradicts · neutral** |
| `says`, `body` | the sentence, and its provenance: method, period, the records it rests on (ids), sample size, sureness, limits, money (or the input missing), engine version |
| `by`, `role`, `source` | who (the person, from their sign-in) and their role in the business when known; the source — the engine's version, *person*, or *luna* (a card the person confirmed) |
| `workspace_id`, `project_id`, `client` | where it belongs — the line (always), the project when there is one, the customer named at the time |

**Identity and versions.** An entry's id is worked out from its claim, what it says that matters (its *signature*) and the version it
replaces — so two devices doing the same homework write the same id, and the second write changes nothing. A signature changes only when the
claim does: the top cause of the stop time, the direction of a change and its sureness, a pattern appearing or **lapsing** (a recurring stop
that has stopped recurring is a new version, not a deletion). Figures that drift day to day stay in the line's current homework (`brain-<line>`,
B1), not in the ledger.

**Who may write.** As a study on its line (`is_ws_member`, the project's members, the restrictive editors-only and viewer-only policies of
`ACCESS_LEVELS` and `ORG_VISIBILITY`): a client or a viewer reads and writes nothing; one customer's ledger is invisible to another's people.
The engine writes from a device only when its person may write on the line; otherwise it works in memory and says so.

## 3. The state of a claim — evidence over opinion

`lib/knowledge/state` reads every entry on a claim and its subject and says, in words, where it stands — evidence always outranking opinion:

| State | When |
|---|---|
| **Found** | the brain's finding, nothing else said |
| **Supported by evidence** | a counted or measured outcome or study supports it, none contradicts |
| **Contradicted by evidence** | counted or measured evidence goes against it (an outcome, a later version reversing it) |
| **Evidence both ways** | counted or measured entries on both sides — both said, never averaged |
| **A person agrees — not proven** / **A person disputes — not proven** | only accounts and reviews, no evidence either way |
| **Superseded** | a later version replaced it — kept, with what it said and when |
| **Lapsed** | the pattern is no longer there |

A manager's explanation and an engineer's observation are both kept, attributed, with their `known` word; neither moves a claim to
*supported*. Only counted or measured evidence does — and a *verified improvement* is an outcome measured or counted as improved and held,
which the code says, not the person and never the AI.

## 4. Outcomes — did the fix work, did it last (`lib/knowledge/outcomes`)

A **fix** is a closed problem (`snags`, status closed, its `closedAt`) or a countermeasure done (`pace_todos`). Its **measure** is the stops
it was about: the machine and reason it names (`targetAsset`, `targetCategory`, else the reasons of the stops it was raised from), else the
machine alone (said). The check, by code:

- **Before** the 28 days up to the fix; **after** from the fix to now (the first 28 days); stops counted per **watched day** — a day on which
  the line had any stop timed — so a day nobody timed is never read as a day with no stops (and that limit is said).
- The same exact conditional test as B1. **Improved** / **Worse** at p < 0.05; **No clear change** otherwise; **Too early** under 7 watched
  days after; **Not enough timed** under 5 stops in all.
- **Lasting**: once 8 weeks have passed, the first 4 weeks after against the latest 4 — **Held** or **Came back**.
- A countermeasure proved by its own before → after study (`studyLinks beforeAfter`) gives a **measured** outcome too, in the study's words.
- Money from the one cost model (`lib/problemCost`) on the minutes a watched day that changed, or the input missing named.

Each verdict is an outcome entry, versioned like a finding: *too early → improved → came back* is three versions, all kept. An outcome on a
subject is evidence on every finding about that subject — a fix that held supports the finding that it was the problem; a pattern that comes
back after a fix contradicts what was said when it was closed.

## 5. History — what was tried and what came of it (`lib/knowledge/history`)

For a line, a machine or a machine-and-reason: every finding version, every problem and countermeasure on it (raised, its journey — *what
we did, what came of it* — its close note), every outcome, every account and review, and the studies on that machine, in time order — and one
summary sentence: *"Tried 3 times since March: the guide change (closed 2 Apr) held; the sensor clean (closed 9 Jul) came back within 5
weeks; one open now. People put it down to film tension (reported, J. Smith, engineer) — not proven."* Read live from each record's own home;
nothing is copied.

## 6. The factory — relationships across lines (`lib/knowledge/factory`)

The first slice of §4 of the brief: within one customer only, the same reason recurring on the same machine — the same machine kind
(`docs/FACTORY-KNOWLEDGE.md`, a machine's `kind`) or name — on two or more lines; and a fix that held on one line where the same pattern
recurs on another (the bridge to *Spread what works*, FC-155). Products, shifts, materials and schedules are not related yet: the stops carry
too little of them (a shift is reserved, a product is not on a stop) — said, never guessed. The next slices read loss counts, check logs and
studies into the same ledger.

## 7. Luna

- `findings` — each finding with its claim id, its state in words, its versions and the evidence on each side.
- `history` — the story of a line, machine or machine-and-reason (§5).
- `outcomes` — every fix on a line and whether it worked and lasted (§4).
- `note_knowledge` — a card: what a person said, attributed to them, kept as an **account** with *reported* or *observed* — never as evidence.
- `raise_problem` and `start_project` carry the finding they act on, so the outcome finds its way back.
- Her rules: read findings, outcomes and history before saying how a line is doing or what was tried; say how each thing is known; never
  turn an opinion into a cause; when an earlier finding was wrong, say so and say what changed.

## 8. On screen

The line's *What LUNAR has found* (inside *More about this line*): each finding with its state, *Earlier* when it has versions, *Agree* ·
*Disagree…* (a person's review, with what they saw or believe) and *Investigate* (a problem raised with the finding linked); under it *Did
the fixes work?* — each fix's verdict. The machine page: *What has been tried*, the history. All inside folds; a viewer sees, and is offered
nothing that writes.

## 9. Built in this order — each proved before the next

| Slice | What | Proof |
|---|---|---|
| K1 | the ledger table, sync and model; findings with identities and versions; claim state | **Built 12 Nov.** `KNOWLEDGE.sql` applied and read back (an update to an entry tried in the database left it as written); `knowledge.test.ts`; sync-schema |
| K2 | outcomes, versioned; findings and fixes linked; the problem's link to its finding (`finding:<id>` in linked_obs_ids) | **Built.** `outcomes.test.ts` on hand-worked cases (p = 0.004181 as SciPy) |
| K3 | history; Luna's `findings`, `outcomes`, `history`, `note_knowledge`, `raise_problem` with its finding; her rules; the line and machine screens | **Built.** capability tests; `scripts/acceptance/knowledge.mjs` |
| K4 | across lines for one customer (`lib/knowledge/factory`) | **Built.** `factory.test.ts` (two customers never joined); the acceptance script |

**Not yet proved with the real model**: whether Luna reads findings, history and outcomes first, offers note_knowledge in a person's own
words, and raises problems with their finding — the next real-model run asks it.

## 10. Not yet, and why

- **Overnight work on the server** — the homework still runs on a device (when a line is opened or Luna asks). The ledger is what makes a
  server runner possible later: it writes the same deterministic entries.
- **Workbooks and production data** in the homework — held (Rowland, 12 November).
- **Learning across customers** — the part of the brief that did not arrive. Nothing crosses a customer.
- **Methods that proved useful** (§6 of the brief) — the ledger keeps, per finding, its method and whether it was later supported; reading
  that into "which methods work where" waits for enough history to read.
