---
id: lean.poka-yoke
name: Mistake-proofing (poka-yoke) — the device register and its daily check
aka: [poka yoke, error proofing, mistake proofing, fail safe, verification of error proofing, device check]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Shingo (1986) *Zero Quality Control* for the principle and the three device types (contact, fixed-value, motion-step) and the two functions (control, warning); the verification practice as the automotive control plan frames it (a device checked at start-up with a known-bad part); from knowledge, texts not re-read; the register's arithmetic in `scripts/knowledge/cases-lean.py`
needs: []
next: [quality.control-plan]
alternatives: [quality.fmea]
related: [rca.fishbone-5whys, foodsafety.metal-detection-verification, packaging.code-label-verification, spc.zero-failure-demonstration]
---
# Mistake-proofing (poka-yoke) — the device register and its daily check

## Purpose and principle
Make the error impossible, or make it evident at once where it happens,
rather than inspect for its defect later. Shingo's devices are of three
kinds — **contact** (a shape or sensor that fits only the right part or
position), **fixed-value** (a count or a quantity that must be reached —
all six labels used, the weight in band) and **motion-step** (the steps
must happen in order — the guard closed before the start) — and of two
functions: **control** (the machine stops or will not start) or
**warning** (a light, a sound, a person decides). A device is only
protection while it works, and nobody sees a sensor fail: so each device
is on a register with how it is checked (a known-bad part presented at
start-up, a test piece, a disconnected sensor) and how often, and the
checks done, missed and failed are the measure. A failed check means
everything since the last good check was unprotected.

## Questions it answers
- Which errors on this line are proofed, by what device, control or
  warning?
- Were the devices checked this shift — all of them — and did each
  work?
- When one failed its check, what product was unprotected and what was
  done?
- Which errors are not yet proofed (from the FMEA's ranking) and what
  would proof them?

## Inputs and minimum conditions
- The register: the error (what a person could do wrong), its defect,
  the device, its type, its function, how the check is done, how often
  (start of shift, after a changeover, weekly), who.
- The checks as they are done, with the result; a failed check's
  reaction (stop, inspect since the last good check, fix, re-check).
- The line's rate (for the product unprotected).

## Procedure and calculation
- Checks due in the period (devices × frequency) against done; the
  missed ones named — a missed check is a device of unknown state.
- Failed checks: count, the device, the time since its last good check,
  product since then = minutes × rate → inspected or held
  (`quality.nonconformance-hold`); the device's own fault found
  (`rca.fishbone-5whys`).
- What a clean record proves: n passed checks with none failed → at
  most 3/n of checks could have failed at 95%
  (`spc.zero-failure-demonstration`); say it rather than "100%
  reliable".
- The device's effectiveness: defects of the error's kind reaching the
  customer or the next step before and after the device (the complaint
  or reject count — `quality.complaints`, `quality.check-sheet`).
- Candidates: the FMEA's highest-ranked human errors with no device
  (`quality.fmea`) — proofing is the strongest prevention control and
  lowers the occurrence or detection rating when verified.
- A bypassed device (the jumper, the taped sensor) found on a check is
  recorded as a failure of the system, not of the device.

**Worked case** (`cases-lean.py`): a packing line's register holds 14
devices — the label-presence sensor, the date-code reader, the
metal-detector reject confirmation, the case-count sensor, the
guard-interlock on the slicer among them. Weekly checks due 14; done 12
— the two not checked are two devices of unknown state for a week. This
month 62 checks passed and 1 failed: the label-presence sensor did not
stop the line on the known-bad pack; last good check 7 hours earlier at
110 a minute → 46,200 packs to inspect for a missing label. The 62 clean
checks say only that at most 4.8% of checks could fail at 95% — a month
is not proof of a year.

## Assumptions, limits and misuse
- A device never checked gives false security that an inspection would
  not; the register without the checks is worse than nothing.
- A warning device depends on a person's reaction; where the defect is
  a food-safety one the device should be a control (stop or reject).
- Devices multiply at a line's start-up and the checks become a
  burden; the check is designed into the start-up routine, not added to
  it.
- A bypass is the common failure, usually to keep running during a
  fault; the andon and the cause are the answer, not a stricter rule.
- Mistake-proofing addresses human error; a machine's own variation is
  SPC's business.

## Reading the result
"14 devices; 12 checked this week, 2 not; the label sensor failed its
check — 46,200 packs inspected, 31 found without a label." Money: the
inspection's labour (`knowledge/MONEY.md`, L), the held product (H), and
the consequence the device exists to prevent — an unlabelled or
mis-dated pack at the customer (C).

## When not to use it — and instead
Ranking which errors to proof first → `quality.fmea`. The checks as part
of the line's control plan → `quality.control-plan`. The detector's and
the label reader's own verification → `foodsafety.metal-detection-verification`,
`packaging.code-label-verification`. A device's repeated failure →
`rca.fishbone-5whys`.

## In food and FMCG manufacturing
Label and date-code verification scanners that stop the line; the
metal detector's reject confirmation; a case-count sensor; allergen-
coded utensils and colour-coded tools that only fit their own station;
the recipe system that will not release the next ingredient until the
last is weighed; the guard interlock.

## References
- [textbook] Shingo, S. (1986), *Zero Quality Control: Source Inspection and the Poka-yoke System*, Productivity Press (from knowledge).
- [textbook] Nikkan Kogyo Shimbun (ed.) (1988), *Poka-yoke: Improving Product Quality by Preventing Defects*, Productivity Press — 240 examples (from knowledge).
- [standard] AIAG, *Advanced Product Quality Planning and Control Plan*, 2nd ed. (2008) — error-proofing verification in the control plan (from knowledge).

## In Faultline
Not built (FC-014). The line's machines and their programs hold a test
and its day (`src/line`); FC-014 adds the device register per line, the
checks tapped at start-up with their result, a failure opening the
unprotected product's count and hold, the clean record's bound in words,
and the unproofed errors from the FMEA as the candidates list.
