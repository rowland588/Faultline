---
id: ie.micro-motion
name: Micro-motion study — therbligs, the two-hand chart and motion economy
aka: [micromotion, therbligs, two-hand process chart, simo chart, principles of motion economy, left-hand right-hand chart]
discipline: ie
kind: established
evidence: textbook
depth: full
checked: 2026-10-24 — the Gilbreths' therbligs, the simo chart and Barnes's principles of motion economy as the IE texts give them (from knowledge; Barnes 1980; Freivalds & Niebel ch. 4); the worked two-hand chart in `scripts/knowledge/cases-ie.py`
needs: []
next: [ie.ecrs]
alternatives: [ie.pmts]
related: [ergonomics.rula-reba, ie.video-time-study, lean.standard-work]
---
# Micro-motion study — therbligs, the two-hand chart and motion economy

## Purpose and principle
Below the element is the motion: a reach, a grasp, a move, a position,
a release — and the ones that add nothing: hold, search, select, idle,
unavoidable delay. The Gilbreths named seventeen (the therbligs) and
filmed work frame by frame to see them; the two-hand chart lays the two
hands' motions side by side on one time scale, and the principles of
motion economy say what a good pattern looks like: both hands working
at once, symmetrical, smooth curves not straight jerks, momentum used,
nothing held in the hand that a fixture could hold, tools and materials
in a fixed place within easy reach. Footage from a phone is the modern
film.

## Questions it answers
- What is each hand doing, moment by moment — and how much of it is
  holding, searching or idle?
- Which principles of motion economy does the station break?
- What fixture, layout or sequence would free a hand or shorten a reach?

## Inputs and minimum conditions
- A short repetitive manual task (a cycle of seconds to a minute) seen
  close up — the video study's footage at normal speed, slowed for the
  chart (`ie.video-time-study`).
- The workplace layout with distances (reach zones).
- The person's consent and the study's purpose said: it is of the
  motions, not the person.

## Procedure and calculation
- The therbligs (the effective ones: reach, grasp, move, position,
  assemble, use, disassemble, release, inspect, pre-position; the
  ineffective ones to question: search, select, hold, unavoidable delay,
  avoidable delay, plan, rest).
- Two-hand (simo) chart: time down the page (frames or tenths of a
  second), left hand's and right hand's therbligs beside each other;
  totals per hand of effective and ineffective time; the share of the
  cycle each hand holds or idles.
- Against the principles of motion economy (Barnes's 22, in three
  groups — the body, the workplace, the tools): both hands begin and end
  together; not idle at the same time; opposite and symmetrical motions;
  the lowest motion class that will do (fingers · wrist · forearm ·
  upper arm · shoulder); momentum and rhythm; materials and tools in
  fixed places in the normal working area; gravity feed and drop
  delivery; fixtures to hold, foot pedals to free hands; handles shaped
  to the grip.
- The improvement: a redesigned chart with the hold given to a fixture,
  the reach shortened, the sequence re-ordered; the cycle's time before
  and after estimated from the frames and confirmed by a re-study.
- Posture and force flagged to the ergonomic assessment
  (`ergonomics.rula-reba`) — a motion pattern that is fast and harmful is
  not an improvement.

**Worked case** (`cases-ie.py`): "open bag" on a hand-filling station,
six motions each hand. Left: reach, grasp, hold, hold, hold, release —
holding for three of six; right: reach, grasp, pull, position, release,
idle. The left hand is a clamp. A fixture that holds the bag open frees
it to fetch the next while the right fills — two principles at once
(nothing held in the hand that a fixture could hold; both hands
working), and the element's time falls by about the hold's length.

## Assumptions, limits and misuse
- Frame-by-frame analysis of a long cycle is days of work; the study is
  for short cycles done thousands of times a shift.
- Filming people closely needs consent and a stated purpose; the
  footage is of the hands and the work (`docs/VIDEO.md`'s rules).
- A faster motion pattern that raises force or awkward posture trades
  seconds for injury; the ergonomic check is part of the study.
- Motion economy is for repetitive work; a varied task with judgement
  in it is not improved by symmetry rules.
- The chart describes one skilled person; the method must be taught
  (`people.twi-job-instruction`) or the improvement stays on paper.

## Reading the result
"Opening the bag: the left hand holds for half the element while the
right works; a bag holder frees it — about 1.5 s a bag, both hands
working, and the reach to the bag stock is 60 cm, outside the normal
area: move the stock." Money: the seconds × bags a shift × labour a
second (`knowledge/MONEY.md`, L); at the bottleneck the packs gained
(T); the fixture's cost against it.

## When not to use it — and instead
Element-level improvement of a whole job → `ie.ecrs`. A time without
the analysis → `ie.time-study`. A licensed motion-time system →
`ie.pmts`. Posture and force risk → `ergonomics.rula-reba`.

## In food and FMCG manufacturing
Hand filling and bagging, sandwich and ready-meal assembly, decorating,
tray loading, label application by hand, the repetitive two-hand work
that fills a shift and wears a wrist.

## References
- [textbook] Barnes, R.M., *Motion and Time Study: Design and Measurement of Work*, 7th ed., Wiley, 1980 — therbligs, the simo chart, the principles of motion economy (from knowledge).
- [textbook] Freivalds, A. and Niebel, B., *Niebel's Methods, Standards, and Work Design*, 13th ed., 2014, ch. 4 — manual work design (from knowledge).
- [textbook] Gilbreth, F.B. and Gilbreth, L.M. (1917), *Applied Motion Study*, Sturgis & Walton (from knowledge).

## In Faultline
Not built (FC-233). The video study holds the footage and marks element
boundaries on it (`src/tools/video`); FC-233 would let the two hands'
motions be marked on a short element frame by frame, draw the two-hand
chart with the holds and idles counted, name the principles broken, and
estimate the saving.
