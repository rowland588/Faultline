---
id: ie.person-machine
name: Person–machine chart and machine interference
aka: [man-machine chart, multiple activity chart, machine interference, how many machines can one person run]
discipline: ie
kind: established
evidence: textbook
depth: summary
checked: 2026-10-22 — from knowledge (Freivalds & Niebel — multiple activity charts and synchronous servicing)
needs: [ie.time-study]
next: [capacity.line-balancing]
alternatives: [lean.standard-work]
related: [capacity.line-capacity]
---
# Person–machine chart and machine interference

## Purpose and principle
A person's and one or more machines' activity side by side over a cycle —
working, idle, waiting — to see idle time on both and how many machines one
person can tend before machines wait for the person (interference).

## Questions it answers
Can one operator run two fillers? How long do machines wait for the operator?

## Inputs and minimum conditions
Each machine's automatic time; the person's loading/unloading and walking time a machine.

## Procedure and calculation
Synchronous servicing: machines a person can tend N′ = (l + m)/(l + w), l load
time, m machine time, w walk time; above N′ the machines wait, below the person does.

## Assumptions, limits and misuse
Random stops break the synchronous model (interference formulas or simulation then).

## Reading the result
"One person can tend 2.6 machines; at 3, each machine waits 4 s a cycle."

## When not to use it — and instead
Purely manual lines → `capacity.line-balancing`.

## In food and FMCG manufacturing
One operator on two flow wrappers; one person feeding two tray sealers.

## References
- [textbook] Freivalds, A. and Niebel, B.W., *Niebel's Methods, Standards, and Work Design*, McGraw-Hill (13th ed., 2014).

## In Faultline
Not built (FC-026).
