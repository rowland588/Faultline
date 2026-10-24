---
id: quality.fmea
name: Failure mode and effects analysis — what can go wrong, how badly, how often, how well caught
aka: [FMEA, PFMEA, DFMEA, failure modes, S O D, action priority, RPN, AIAG-VDA FMEA]
discipline: quality
kind: established
evidence: standard
depth: full
checked: 2026-10-24 — the seven-step process, the S/O/D scales and the action-priority (AP) table as the AIAG & VDA FMEA Handbook (1st ed. 2019) gives them (from knowledge — the AP table in `scripts/knowledge/cases-quality.py` is reconstructed from memory and must be checked cell by cell against the handbook before it is coded; `knowledge/GAPS.md`); IEC 60812:2018 named from knowledge; RPN as the older AIAG 4th ed. practice
needs: []
next: [quality.control-plan, lean.poka-yoke]
alternatives: [maintenance.criticality]
related: [foodsafety.haccp, rca.fault-tree, maintenance.rcm]
---
# Failure mode and effects analysis — what can go wrong, how badly, how often, how well caught

## Purpose and principle
Before the failure, not after: a team walks each step of the process and
asks what could go wrong (the failure mode), what it would do (the
effect, rated for severity), why it would happen (the cause, rated for
how often) and whether the current controls would catch it (rated for
detection). The three ratings set a priority; the high ones get an
action — a prevention (a poka-yoke, a change to the method) or a better
detection — and the control plan is written from what remains. It is
HACCP's method applied to quality and reliability rather than safety, and
it feeds the control plan the checks it should have.

## Questions it answers
- What are the ways this step can fail, and which matter most?
- Are the current controls enough, or is a high-severity failure barely
  detected?
- Where should prevention go before the line runs (or before the change)?
- After an action: did the priority come down, and is it recorded?

## Inputs and minimum conditions
- The process steps (a flow chart or the value stream map), the product's
  requirements, the customer's known complaints and the line's known
  failures (the register, the loss count, the reliability study).
- A cross-functional team: operator, engineer, quality, the person who
  will own the actions.
- The scales agreed (the handbook's 1–10 for S, O, D), and the rule for
  priority (AP or RPN) written down.

## Procedure and calculation
The AIAG-VDA seven steps: planning and scope · structure analysis (the
steps and their elements) · function analysis (what each must do) ·
failure analysis (modes, effects, causes as a chain) · risk analysis
(S, O, D and the priority) · optimisation (actions, re-rated) ·
documentation.
- Severity S (1–10) of the *effect* — 9–10 safety or regulatory, 7–8 loss
  of primary function, 4–6 degraded, 2–3 annoyance, 1 none.
- Occurrence O (1–10) of the *cause* with current prevention — 10 very
  high (≥ 1 in 10), 7 moderate-high (1 in 100), 5 (1 in 1,000), 2 (1 in
  100,000), 1 remote (prevented by design); the handbook's table.
- Detection D (1–10) of the current *detection control* — 10 none, 7 a
  human check after the event, 4 an automatic check that stops the
  line, 1 error-proofed so the failure cannot pass.
- **Action priority (AP)** from the handbook's table of S × O × D
  combinations: H (must act or document why not), M (should act), L
  (may). Severity dominates: S 9–10 with O ≥ 4 is H whatever D; S 9–10
  with O 1 is L. The table is the handbook's and is to be copied from it,
  not reconstructed.
- The older **RPN = S × O × D** (1–1,000) is still used; it hides a
  severity-10 failure behind a low RPN (10 × 1 × 10 = 100) — the reason
  AP replaced it.
- Actions: prevention first (lower O), then detection (lower D); severity
  moves only with a design change. Re-rate after the action is in place
  and verified, with the date and the evidence.
- The control plan's rows come from the modes still at M or H and from
  every S ≥ 8 (`quality.control-plan`).

**Worked case** (`cases-quality.py`, the AP table as reconstructed): a
wrapper's "seal does not hold" — S 9 (a leaker reaches the customer, a
food-safety effect), O 3 (a jaw temperature drift once a month with the
current set-point check), D 4 (a seal pull every 30 min stops the line)
→ AP M, RPN 108. "Wrong film reel loaded" — S 8, O 2, D 9 (no check
until the complaint) → AP M, RPN 144 — the RPN ranks it below a S 3 O 9
D 8 cosmetic mark (RPN 216), the AP does not. Action on the reel: a
barcode scan at loading (D 9 → 2, O unchanged) — re-rated L.

## Assumptions, limits and misuse
- An FMEA written by one person at a desk lists what that person knows;
  the operator's failure modes are the ones that happen.
- Rating by argument ("call it a 7") without the scale's anchors makes
  the priorities noise; the anchors are read out each time.
- A document filed and never re-rated is a one-off; it is re-opened at
  every change, complaint and new failure.
- RPN thresholds ("act above 100") are the misuse the handbook retired.
- Food safety hazards belong in HACCP with its legal standing
  (`foodsafety.haccp`); the FMEA covers quality and reliability failure
  and points to the HACCP plan for the rest.
- The AP table must be the handbook's; the version in the cases script is
  from memory and is flagged as such.

## Reading the result
"Line 2 wrapper: 23 failure modes; 4 high, 7 medium. 'Wrong reel loaded'
is S 8 with no detection — a scan at loading brings it to low; owner
Dave, by 1 Nov." Money: each mode's expected cost = occurrence rate ×
packs × its cost per event (a leaker's complaint, a reel's rework —
`knowledge/MONEY.md` Q and C), so the action's worth is said before it is
spent on.

## When not to use it — and instead
Food-safety hazards → `foodsafety.haccp`. A failure that has already
happened → `rca.fishbone-5whys`, `rca.eight-d`. Equipment criticality for
maintenance → `maintenance.criticality`, `maintenance.rcm`. A top-down
logic of one serious event → `rca.fault-tree`.

## In food and FMCG manufacturing
A new line or a line change (the PFMEA of each step: fill, seal, code,
detect, pack); a packaging change (new film, new tray); recurrent
failures on a wrapper; the allergen changeover's failure modes; the
checkweigher's and metal detector's (which are also CCPs — the FMEA points
at the HACCP plan).

## References
- [manual] AIAG & VDA, *FMEA Handbook*, 1st ed., 2019 — the seven steps, the S/O/D tables, the action-priority table (from knowledge; text not read — the AP table to be copied from it, GAPS).
- [standard] IEC 60812:2018, *Failure modes and effects analysis (FMEA and FMECA)* — the generic method (from knowledge).
- [manual] AIAG, *Potential Failure Mode and Effects Analysis*, 4th ed., 2008 — RPN, superseded by the 2019 handbook (from knowledge).

## In Faultline
Not built (FC-132). When built: the steps from the line's value stream
map or the project's stages, a row a failure mode with S, O, D chosen
from the anchors in words, AP from the handbook's table (copied, never
reconstructed), the actions as the project's own actions with owner and
day, the re-rating with its evidence, and the medium and high rows handed
to the control plan.
