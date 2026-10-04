# The improvement method — what the OpEx disciplines say, and what Faultline takes

Rowland, 4 October: "I'd like to keep all of the knowledge base that you've
just discovered because it can be useful for the future. But a lot of it's far
too complex and we don't want complexity as part of our ruling, we want
something that just works."

This is that knowledge base: what each operational-excellence discipline is
good at, the loop they all share underneath, and the line Faultline draws
between what it takes and what it leaves out. It is the reference for the
method a running line is improved by (today "3P" in `src/lib/planModel.ts`,
being renamed — see the end).

## The disciplines, and what each is actually for

| Discipline | What it is good at | What Faultline takes |
|---|---|---|
| **Toyota Production System** (Lean comes from it) | Standardised work — takt, the work sequence, standard stock — is the foundation: *no standard, no improvement*. Genchi genbutsu ("go and see") makes first-hand observation evidence. Jidoka: stop and surface the abnormal. | The **standard is the anchor** every gap is measured from. An observation made on the floor by a named person is real evidence. |
| **Industrial engineering** (work study) | Method study — how the work is done (Process). Work measurement — how long it *should* take a qualified worker at a defined pace: standard time = basic time + allowances. Line balancing, capacity, crewing. | The stopwatch, line study, line balance and line standard are IE tools already. The standard should carry **the crew and the time the work needs**, so "short-staffed" or "slow" become numbers. |
| **Theory of Constraints** (Goldratt) | Every line has one constraint; time won back anywhere else does not raise output. Identify → exploit → subordinate → elevate → repeat. | The line balance finds the limiting station; **what touches the constraint comes first** — it is the method's own question, "what is holding this line back?" |
| **TPM** (Total Productive Maintenance) | The losses: equipment (breakdown, set-up, minor stops, speed, defects, start-up) and manpower (management, motion, line organisation, monitoring). OEE and the six big losses. | How lost time is filed (the Pareto). Plant's evidence. |
| **World Class Manufacturing** (Fiat / Yamashina) | Cost deployment: every loss priced in money, so minutes, scrap, labour and material rank in one unit. | *Optional:* the sponsor's sentence in pounds as well as ppm — one "£ per hour of this line" figure. |
| **Six Sigma** (DMAIC) | Analyse: a cause is *suspected* until data confirms it. Control: a control plan — what is watched, by whom, how often, what happens if it slips — or the line drifts back. | Evidence is graded. **"At target, and holding"** means holding is *checked*: when an action works, the standard updates and one check is set. |
| **Shingo Model** | Results come from behaviour; behaviour from the systems and leadership around people. | Leadership and culture findings are real and belong under People, evidenced by observed behaviour (is the handover held? is the board used?), not minutes. |
| **Ishikawa** (fishbone, 4M/6M) | Cause families: Man, Machine, Method, Material (+ Measurement, Milieu). Its value is making people look everywhere instead of blaming the machine. | The **lens**: People · Plant · Process · Materials (Measurement folds into Process, environment into Plant). |
| **Toyota Kata** | A coaching routine: target condition, obstacles, experiments with "we expect / what happened". | Only its core: an action says what it should change, and is checked against it. Not the vocabulary. |
| **SQDCP boards / the 8 wastes** | What to watch daily (Safety, Quality, Delivery, Cost, People); a lens for a waste walk. | Tools inside the method, not the method. |

Note on the name "3P": in Lean, "3P" means the *Production Preparation
Process* (Chihiro Nakao) — designing a new line before buying equipment. It
is not People/Plant/Process, which is a plain-words condensation of
Ishikawa's 4M.

## The loop they all share

Strip the branding off and every serious OpEx system makes the same six moves:

1. **Standard** — what good looks like (crew, roles, tasks, times, takt).
2. **Gap** — the line's number against its target.
3. **Priority** — where the loss is and what matters most (Pareto; the
   constraint first; optionally money).
4. **Cause** — in which family (the lens) and **how sure**:
   - *measured* — data over time (Pareto minutes, OEE, changeover times)
   - *counted* — an audit, checklist, crew against standard, skills
   - *observed* — seen first-hand by a named person, dated, ideally filmed
   - *reported* — told by someone
   An observation stands on its own; some become actions, some stay noted.
   Only measured items get a share of the gap — judged items are shown as
   judged, never given invented numbers.
5. **Countermeasure and proof** — an action with a prediction, checked
   against the loss that raised it and the line's number.
6. **Hold** — the new way written into the standard, and one check that it
   stays.

## How each family is evidenced

| Family | What it covers | How it is quantified |
|---|---|---|
| **People** | capability (trained?), capacity (enough?), leadership and management, engagement | skills against the standard's roles; crew on shift against the standard's crew; observed behaviour and leader-standard-work checks; only some of it is lost time |
| **Plant** | the assets — machinery and everything on it | lost time and frequency (Pareto), time between breakdowns, the filmed walk and its snags |
| **Process** | the way the work is done — methods, changeovers, standards, measurement | changeover against its standard, cycle against takt (line balance), whether the standard work is followed, defects |
| **Materials** | what runs through the line — the product (size, shape, quality), film, packaging, ingredients | material-caused stops, spec failures, supplier defects, shortages, yield |

## Left out on purpose

Six Sigma statistics (control charts, measurement-system studies),
predetermined-time systems (MOST, MTM), WCM's twenty pillars, Shingo culture
assessments, the full sixteen TPM losses, Kata's coaching vocabulary. All
real; all too heavy for a phone on a line, and each a new noun. The house
rule holds: a fifth concept is almost always the wrong answer.

## Sources

- [Toyota Production System — Lean Enterprise Institute](https://www.lean.org/lexicon-terms/toyota-production-system/)
- [Production Preparation Process (3P) — Lean Enterprise Institute](https://www.lean.org/lexicon-terms/production-preparation-process/)
- [Work measurement — Wikipedia](https://en.wikipedia.org/wiki/Work_measurement)
- [Theory of Constraints, five focusing steps](https://www.learnsignal.com/blog/theory-of-constraints-five-focusing-steps-explained/)
- [TPM principles and pillars — Kaizen Institute](https://kaizen.com/insights/tpm-principles-pillars-implementation/)
- [6 Big Losses — Enlyze](https://docs.enlyze.com/en/concepts/oee-management/6-big-losses)
- [WCM cost deployment — IndustryWeek](https://www.industryweek.com/continuous-improvement/cost-deployment-7-steps-better-process-understanding-and-world-class-manufact)
- [DMAIC control phase](https://www.sixsigmaonline.org/dmaic-control-phase/)
- [Shingo Model — Shingo Institute](https://shingo.org/model)
- [Cause & effect, 6M](https://www.edrawsoft.com/6m-method.html)
- [Toyota Kata — target condition (Gemba Academy)](https://www.gembaacademy.com/school-of-lean/toyota-kata/improvement-kata-essentials/what-is-a-target-condition)
- [Training Within Industry — Lean Enterprise Institute](https://lean.org/?p=1822)
- [Gemba — Lean Enterprise Institute](https://www.lean.org/lexicon-terms/gemba/)
