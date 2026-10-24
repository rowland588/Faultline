---
id: ie.allowances
name: Allowances — from basic time to standard time (the ILO relaxation factors)
aka: [relaxation allowance, personal needs allowance, fatigue allowance, contingency allowance, PFD, standard time, ILO allowances]
discipline: ie
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the allowance structure and the relaxation-allowance factors as the ILO's *Introduction to Work Study* (Kanawaty, 4th ed. 1992, ch. 23 and its appendix table) gives them (from knowledge — the table's exact percentages to confirm against the text; the figures below are the commonly quoted ones); Faultline's 9% for a person in Line capacity (`docs/CAPACITY.md` §1); the worked case in `scripts/knowledge/cases-ie.py`
needs: []
next: [ie.time-study]
alternatives: []
related: [capacity.line-capacity, ergonomics.hse-mac-art, ie.labour-productivity]
---
# Allowances — from basic time to standard time (the ILO relaxation factors)

## Purpose and principle
A timed and rated cycle is the *basic* time — what the job takes at a
steady, normal pace with no rest. Nobody works a shift like that. The
standard time adds an allowance for personal needs, for recovering from
the effort and conditions of the job (fatigue), and sometimes for
unavoidable contingencies — so that the standard is one a person can
keep all day without strain. The ILO's relaxation-allowance tables are
the common basis: a fixed personal and basic-fatigue part, plus variable
parts for standing, posture, load, light, air, noise, strain, monotony
and tedium. The same arithmetic sets how many packs a person can be
*planned* to do an hour.

## Questions it answers
- What is the standard time for this job, and so the rate a person can
  be planned at?
- How much of the standard is allowance, and which conditions drive it?
- Is a 9% allowance right for this job, or does the cold room and the
  lifting earn more?

## Inputs and minimum conditions
- The basic time per cycle from a rated time study (`ie.time-study`) or
  the line balance's timed elements (`src/tools/linework/balance.ts`).
- The job's conditions: posture, load lifted and how often, temperature,
  noise, light, visual and mental strain, monotony — observed, not
  assumed.
- The site's agreed allowance policy where one exists (a union
  agreement often fixes it); the ILO table where it does not.

## Procedure and calculation
- Standard time = basic time × (1 + allowance %); the allowance applied
  to each element where conditions differ by element, else to the
  cycle.
- **Constant** allowances (ILO): personal needs 5% (men) / 7% (women, in
  the 1992 table — a site applies one figure to all today); basic
  fatigue 4%.
- **Variable** allowances, added by condition (the ILO table's commonly
  quoted values): standing 2%; abnormal posture: slightly awkward 0,
  awkward (bending) 2, very awkward (lying, stretching) 7; use of force
  or muscular energy, by load lifted — 2.5 kg 0, 5 kg 1, 7.5 kg 2, 10 kg
  3, 12.5 kg 4, 15 kg 5, 17.5 kg 7, 20 kg 9, 22.5 kg 11, 25 kg 13, 30 kg
  17, 35 kg 22; bad light: slightly below 0, well below 2, quite
  inadequate 5; atmospheric conditions (heat and humidity) 0–100 by an
  index; close attention: fairly fine work 0, fine or exacting 2, very
  fine 5; noise: continuous 0, intermittent loud 2, intermittent very
  loud 5, high-pitched loud 5; mental strain: fairly complex 1, complex
  or wide span 4, very complex 8; monotony: low 0, medium 1, high 4;
  tediousness: rather tedious 0, tedious 2, very tedious 5.
- Contingency allowance (≤ 5%) only for small unavoidable delays that
  cannot be timed out; never for stops the loss count should hold.
- Planned rate per hour = 3,600 ÷ standard seconds; the standard time's
  labour cost a pack = crew × rate ÷ (planned rate) (`ie.labour-productivity`).
- Cold rooms and heavy repetitive lifting push the ergonomic limits
  before they push the allowance (`ergonomics.hse-mac-art`): the
  allowance is not a licence.

**Worked case** (`cases-ie.py`): a packer's basic time 42.0 s a pack.
Conditions: standing 2, a 5 kg load 1, medium monotony 1, intermittent
loud noise 2, plus personal 5 and fatigue 4 → 15%. Standard 48.3 s → 75
an hour. Faultline's Line capacity applies the ILO's 9% (personal plus
basic fatigue) to a seated or light job: 45.8 s, 79 an hour — four an
hour more than the full table gives for this job; the difference is the
standing, the load and the noise. In a cold room (+4) lifting 15 kg
(+5): 52.1 s, 69 an hour.

## Assumptions, limits and misuse
- One allowance for every job on the line is the usual shortcut; a cold
  store and a seated inspection are not the same job.
- An allowance used to hide stops, waiting or rework makes the standard
  a fiction and the loss count blind; those are counted, not allowed.
- The ILO table is a 1950s–70s consensus, gendered in its original form
  and never a law; many sites use their own agreed figures. Say which
  table and version.
- Rating and allowance are separate corrections: rating normalises the
  pace observed, the allowance adds rest; applying one twice (a slow
  rating *and* a fatigue allowance for the same slowness) double counts
  (`docs/CAPACITY.md`'s "rest counted twice" check).
- A standard with a 25% allowance says the job needs redesign, not a
  bigger allowance (`ie.ecrs`, `ergonomics.rula-reba`).

## Reading the result
"The packer's basic time is 42 s; standing, a 5 kg lift and the noise
earn 15% — standard 48.3 s, 75 an hour. Planned at 79 (9%) the station is
asked for 4 an hour it cannot hold all day." Money: the labour cost a
pack at the standard (`knowledge/MONEY.md`, L) and, where the planned
rate exceeds the standard, the shortfall the line will show as "slow
running" at the bottleneck (T).

## When not to use it — and instead
The basic time itself → `ie.time-study`, `ie.video-time-study`. The
job's design (less effort) → `ie.ecrs`, `ie.micro-motion`. The lifting
and posture risk → `ergonomics.hse-mac-art`, `ergonomics.rula-reba`. A
machine-paced station → the machine's rate, no allowance
(`capacity.line-capacity`).

## In food and FMCG manufacturing
Hand packing, tray loading, case packing, quality inspection stations,
cold-store picking, depositing by hand — the people stations whose
planned rate sets the line's people capacity and the bottleneck walk.

## References
- [textbook] Kanawaty, G. (ed.), *Introduction to Work Study*, 4th rev. ed., ILO, Geneva, 1992, ch. 23 and appendix — relaxation allowances (from knowledge; percentages to confirm against the text).
- [textbook] Freivalds, A. and Niebel, B., *Niebel's Methods, Standards, and Work Design*, 13th ed., McGraw-Hill, 2014, ch. 11 — allowances (from knowledge).
- [guide] HSE — manual handling and the MAC tool, for the limits the allowance must not paper over (from knowledge).

## In Faultline
One allowance agreed per line balance (`src/tools/linework/balance.ts`);
Line capacity adds the ILO's 9% rest to a person's time
(`docs/CAPACITY.md` §1) and checks rest is not counted twice; the factor
tables are not offered (FC-025, partly). The piece to build: the
conditions ticked per station, the allowance built from the table with
each factor named, and the standard's planned rate carried into Line
capacity in place of the flat 9%.
