---
id: lean.toyota-kata
name: Improvement kata and coaching kata
aka: [Toyota kata, improvement kata, coaching kata, target condition, PDCA experiments, five questions, learner's storyboard]
discipline: lean
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — Rother (2009) *Toyota Kata* and the *Toyota Kata Practice Guide* (2018): the four steps, the five coaching questions, the experimenting record; from knowledge, texts not re-read; the worked storyboard in `scripts/knowledge/cases-lean.py`
needs: []
next: [rca.pdca]
alternatives: [lean.kaizen-event]
related: [rca.pdca, visual.daily-management, lean.standard-work, people.twi-job-instruction]
---
# Improvement kata and coaching kata

## Purpose and principle
A daily routine for improving toward a goal when the way there is not
known. The **improvement kata** has four steps: understand the direction
(the challenge — a measurable aim months out); grasp the current
condition (the process measured as it is — its pattern, not its
average); establish the next **target condition** (a described state of
the process, with a date a few weeks away, not a solution); then
experiment toward it one step at a time, each step a small PDCA with a
written prediction before and a written result and learning after. The
**coaching kata** is the daily five-question conversation that keeps
the learner on the routine: What is the target condition? What is the
actual condition now? What obstacles are in the way, and which one are
you addressing? What is your next step, and what do you expect? When
can we see what we have learned? Its product is not the result alone
but a team that improves every day by method.

## Questions it answers
- What is the target condition, and where is the process against it
  today?
- Which obstacle is being worked, and what is the next experiment?
- What was predicted, what happened, what was learned — experiment by
  experiment?
- Is the daily coaching happening (the cycles), and is the measure
  moving?

## Inputs and minimum conditions
- The challenge (from the line's or the project's aim — `projects.hoshin`
  where the site has one).
- The current condition as measured: the process's cycle times or
  output pattern, its variation, its standard, drawn (a run chart, a
  block diagram).
- The target condition: the pattern wanted, the measure's value, the
  date (two to four weeks).
- The obstacle parking lot; the experimenting record (step, expected,
  actual, learned, date); a coach and a daily time.

## Procedure and calculation
- The measure on a run chart from the current condition toward the
  target condition's value and date; the experiments marked on it.
- Each experiment: the step taken, what was expected (a number or a
  pattern), what happened, what was learned, in one line each — a
  prediction matched is confirmation, a prediction missed is the
  learning.
- Experiments a week and coaching cycles a week are the routine's
  pulse; a storyboard with no entry for three days is a routine that
  has stopped.
- When the target condition is reached, the new state becomes the
  standard (`lean.standard-work`) and the next target condition is set
  toward the challenge.
- The verdict is on the pattern, not one day's number; a target
  condition "cycle time 25 s every cycle" is met when the readings sit
  under 25 with their variation, not when the average does.

**Worked case** (`cases-lean.py`): a team leader's challenge — the
end-of-line changeover from 38 s to 20 s by the quarter's end; the
target condition for 30 November, 25 s every cycle. Seven experiments
in two weeks, each with a prediction: 1 expected 38 got 35; 2 expected 35
got 33; 3 expected 33 got 36 (learned: the second operator's reach); 4
expected 33 got 31; 5 and 6 as expected at 30 and 29; 7 expected 30 got
45 — the film splice with one person took longer, not shorter: the reel
is too heavy for one, and that is the next obstacle. Current condition
29–30 s against 25 wanted; seven of seven experiments recorded with a
prediction before the step.

## Assumptions, limits and misuse
- It is a practice routine; a storyboard filled in without the daily
  coaching is paperwork.
- A target condition written as a solution ("install a trolley") is not
  one; it describes the process state wanted.
- One big experiment a month is a project, not kata; small steps,
  often, each with a prediction.
- Predictions written after the result are the common fraud against
  oneself; the record carries the time of each.
- Results on one day prove little; the pattern over the days does.

## Reading the result
"Target condition 25 s by 30 November; current 29–30; experiment 7
taught us the reel is too heavy for one person — the next step is the
reel lift. Seven experiments, seven predictions, two weeks." Money: the
measure's movement at its rate (`knowledge/MONEY.md` — a changeover's
seconds × changeovers × the line's contribution a minute, T) said as
what the routine has won so far.

## When not to use it — and instead
A one-off big change in a week → `lean.kaizen-event`. The cycle each
experiment follows → `rca.pdca`. The daily meeting that hosts the
coaching → `visual.daily-management`. The standard that holds the gain →
`lean.standard-work`.

## In food and FMCG manufacturing
A team leader's daily improvement on line output or give-away; a
changeover worked down in seconds a week; the start-up losses after a
hygiene clean taken obstacle by obstacle.

## References
- [textbook] Rother, M. (2009), *Toyota Kata: Managing People for Improvement, Adaptiveness and Superior Results*, McGraw-Hill (from knowledge).
- [textbook] Rother, M. (2018), *The Toyota Kata Practice Guide*, McGraw-Hill — the storyboard and the five questions (from knowledge).

## In Faultline
Not built (FC-017). A 6M project carries a problem, its causes and
before → after on a number (`src/project`, `docs/SIXM.md`); FC-017 is the
storyboard — the challenge, the current condition's chart, the target
condition with its date, the obstacles, and the experiment log with its
predictions and times — on a line or in a project, with the coaching
cycles counted.
