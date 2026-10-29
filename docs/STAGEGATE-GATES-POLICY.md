# Stage gate — fixed gates (product policy)

Rowland, 29 October: decide whether stage gate is a free editable system or
**keep the fixed gate model** (Install · Set up · Commission · Hand over) for
the product sold — bespoke templates attach to those gates, not a generic
workflow editor.

**Decision: fixed gates for v1.** The path in `docs/STAGEGATE-PATH.md` stands.
This page says what that means in the product.

## What is fixed

- **The method** is stage gate only — stored as `commissioning` on the project,
  shown as *Stage gate*; never a pick-your-own workflow.
- **The gate sequence** is always **Install · Set up · Commission · Hand over**
  (the eight steps on the path roll up to these four places). There is no gate
  builder, no extra gates, no reordering of the method.
- **The usual lists** per gate (what a machine gets when you give it the usual
  list) are the agreed template — not user-defined gate types.

## What is editable

- **Machines** on the line and on the project — add, name, who made them, due
  on site, handover.
- **Programs** on each machine — what runs, whose, test days, criteria,
  sign-off, commentary.
- **Tests** in Commission — plan, run, pass or fail, fixes, re-tests, evidence.
- **Steps and hand-over items** on each gate — dates, who, done or not, problems
  and fixes.
- **Papers** per gate and per reader — status, client report, commissioning,
  programs, machines, test cards, handover (see STAGEGATE-PATH §3).

## Bespoke without a workflow editor

A site or OEM can still look bespoke:

- **Papers and Now** say what that project agreed — machines, programs, tests,
  dates, who — read from the records, not from a generic template engine.
- **Programs and criteria** are chosen per program (capability, reliability,
  analysis, run tests) — the tools judge; the gate sequence does not change.
- **Commission and test cards** carry the words typed for that test on that day.

That is template-by-content (what you fill in and what the papers print), not
template-by-structure (new gate types or a drag-and-drop path).

## Code

The four gates are the `StepGate` values in `lib/testing.ts` and the gate
screens routed from `ui/PlanTabs`. There is no API to create a fifth gate.
If a future need appears, the path document changes first — not a hidden
feature flag.

## Where this is proved

- `docs/STAGEGATE-PATH.md` — the eight steps and four places.
- `scripts/acceptance/stagegate-walk.mjs` — the path walked end to end.
- `scripts/acceptance/now.mjs` — Now, Plan, Commission, four gates only.
