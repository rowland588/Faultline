---
id: capacity.kingman-vut
name: Utilisation and variability — why queues explode (Kingman's VUT)
aka: [Kingman formula, VUT equation, queueing, utilisation, variability]
discipline: capacity
kind: established
evidence: peer-reviewed
depth: summary
checked: 2026-10-22 — Kingman (1961); the VUT form as Hopp & Spearman (2008) give it
needs: [capacity.littles-law]
next: [capacity.accumulation-buffer]
alternatives: [capacity.simulation]
related: []
---
# Utilisation and variability — why queues explode (Kingman's VUT)

## Purpose and principle
Waiting time before a station grows with variability and explodes as
utilisation approaches 100%: wait ≈ V × U × T.

## Questions it answers
Why does running the bottleneck at 95% make waits so long? What does cutting variability buy?

## Inputs and minimum conditions
Arrival and process variability (coefficients of variation cₐ, cₛ), utilisation u, mean process time tₑ.

## Procedure and calculation
Wq ≈ ((cₐ² + cₛ²)/2) × (u/(1 − u)) × tₑ.

## Assumptions, limits and misuse
An approximation for a single station (G/G/1); a guide, not a forecast.

## Reading the result
"At 95% utilisation the queue is 19 process-times long; at 85%, 5.7."

## When not to use it — and instead
Several interacting stations → `capacity.simulation`.

## In food and FMCG manufacturing
Product waiting for a shared spiral freezer or a shared packing machine.

## References
- [paper] Kingman, J.F.C. (1961), "The single server queue in heavy traffic", *Mathematical Proceedings of the Cambridge Philosophical Society* 57(4), 902–904.
- [textbook] Hopp, W.J. and Spearman, M.L. (2008), *Factory Physics*, 3rd ed.

## In Faultline
Not built (FC-045).
