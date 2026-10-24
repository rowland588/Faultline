---
id: capacity.kingman-vut
name: Utilisation and variability — why queues explode (Kingman's VUT), and the three buffers
aka: [Kingman formula, VUT equation, queueing, utilisation, variability, G/G/1, three buffers, variability buffering, inventory time capacity]
discipline: capacity
kind: established
evidence: peer-reviewed
depth: full
checked: 2026-10-24 — Kingman (1961); the VUT form and the multi-server approximation as Hopp & Spearman (2008) give them (from knowledge; the single-server form confirmed on 24 October in secondary sources); the three buffers and the utilisation hyperbola as Pound, Bell & Spearman (2014) put them for managers — confirmed in secondary summaries of that book, its text not read (knowledge/SOURCES.md)
needs: [capacity.littles-law, capacity.flow-benchmarks]
next: [capacity.accumulation-buffer]
alternatives: [capacity.simulation]
related: [capacity.theory-of-constraints, planning.safety-stock]
---
# Utilisation and variability — why queues explode (Kingman's VUT)

## Purpose and principle
The time a pack waits before a station is, near enough, the product of three
things: how **variable** arrivals and the station's work are, how **utilised**
the station is, and how long its work **takes** — wait ≈ V × U × T. The
utilisation term is u ÷ (1 − u): a hyperbola, not a line. At 50% utilisation
a pack waits about one process time; at 85% nearly six; at 95% nineteen. So
loading the bottleneck "to the full" buys a little output and a great deal of
waiting, and the only ways to cut the waiting are to cut variability, lower
utilisation (more capacity), or accept the queue. That is the **variability
buffering law**: variability in a production system is always buffered by
some combination of **inventory** (the queue), **capacity** (spare rate) and
**time** (lead time, late orders) — the choice is which, never whether.

## Questions it answers
Why does running the bottleneck at 95% make waits so long? What does cutting
variability buy — in waiting, in WIP (by Little's law), in shelf life? What
spare capacity does a given lead time need? Which buffer is this line paying
with today?

## Inputs and minimum conditions
The station's mean effective process time t_e (its cycle, with its stops and
slow running in — effective, not nameplate) and its variability as a
coefficient of variation c_e (standard deviation ÷ mean; from timed cycles or
the stops log); the arrival variability c_a (the upstream station's departure
variability — for a conveyor-fed station, about the feeder's c_e; for a
batch-fed one, high); utilisation u = arrival rate ÷ the station's rate
(u < 1). Enough timed cycles to say c_e (tens, not a handful).

## Procedure and calculation
- One machine (G/G/1, Kingman's approximation):
  CT_q ≈ ((c_a² + c_e²) ÷ 2) × (u ÷ (1 − u)) × t_e;
  the cycle time through the station CT = CT_q + t_e.
- m identical machines in parallel (Sakasegawa's form, as the textbook
  gives it): CT_q ≈ ((c_a² + c_e²) ÷ 2) × (u^(√(2(m+1)) − 1) ÷ (m (1 − u))) × t_e.
- The queue's length, by Little's law: WIP_q = arrival rate × CT_q.
- The departure variability a station passes on: c_d² ≈ u² c_e² + (1 − u²) c_a²
  (a highly loaded station passes on its own variability; a lightly loaded
  one passes on what arrived).
- Effective process time with stops in: t_e = t_0 ÷ A where A is the
  station's availability from its stops, and c_e² = c_0² + (1 + c_r²) A (1 − A) m_r ÷ t_0
  with m_r the mean repair time and c_r its CV — long infrequent stops make
  far more variability than short frequent ones of the same total.
- Faultline's reading: variability is said as "low" (c < 0.75), "moderate"
  (0.75–1.33) and "high" (> 1.33) as the textbook classes it.

## Assumptions, limits and misuse
- An approximation for a steady state; exact only for the M/M/1 queue. Within
  about ±10% in the textbook's range; a guide, not a forecast.
- u must be below 1 — a station asked for more than it can do has no steady
  queue, only a growing pile (`capacity.flow-benchmarks`).
- Nameplate speed in t_e understates utilisation; the stops must be in.
- A line of stations is not one G/G/1: each station's departures feed the
  next (c_d); for the whole line with real stop patterns use
  `capacity.simulation`.
- Cutting variability at a station that is not the bottleneck shortens that
  station's queue, not the line's output.

## Reading the result
"The wrapper runs at 92% of its effective rate with its stops in. Its own
variability is high (c_e 1.5 — the stops are long and rare) and the feeder's
moderate (c_a 0.9). Kingman says a pack waits about 17 process times here —
nine minutes — and by Little's law 1,000 packs sit in front of it. At 85%
utilisation (one more wrapper hour a shift of spare capacity) the wait falls
to five minutes; halving the wrapper's stop length does nearly as much. The
line is buffering the wrapper with inventory and shelf life today."

## When not to use it — and instead
Where the WIP should sit and how much is enough → `capacity.accumulation-buffer`,
`capacity.dbr-buffer`. Several interacting stations → `capacity.simulation`.
Stock held against demand variability rather than a queue at a machine →
`planning.safety-stock` (the same law, the inventory buffer chosen).

## In food and FMCG manufacturing
Product waiting for a shared spiral freezer, a shared packing machine or a
metal detector fed by several lines; a chiller between cook and pack is the
inventory buffer, and the shelf life it spends is the time buffer in days.
Where the buffer cannot be inventory (hot product, a cook step with a hold
time), it must be capacity.

## References
- [paper] Kingman, J.F.C. (1961), "The single server queue in heavy traffic", *Mathematical Proceedings of the Cambridge Philosophical Society* 57(4), 902–904.
- [textbook] Hopp, W.J. and Spearman, M.L. (2008), *Factory Physics*, 3rd ed., Waveland Press — ch. 8 Variability Basics (the VUT and multi-server forms, c_d, effective process time with stops), ch. 9 the corrupting influence of variability (the buffering law). From knowledge; the G/G/1 form confirmed against online copies, 24 October 2026.
- [textbook] Pound, E.S., Bell, J.H. and Spearman, M.L. (2014), *Factory Physics for Managers: How Leaders Improve Performance in a Post-Lean Six Sigma World*, McGraw-Hill Education — the VUT equation, Little's law and the variance of replenishment-time demand as the three key equations; inventory, time and capacity as the only three buffers. Chapter list and these claims confirmed in the publisher's description and secondary summaries, 24 October 2026; the text not read.
- [paper] Sakasegawa, H. (1977), "An approximation formula Lq ≈ αρ^β/(1−ρ)", *Annals of the Institute of Statistical Mathematics* 29, 67–75 — the multi-server form. From knowledge.

## In Faultline
Not built (FC-045). Line capacity's accumulation and the bottleneck walk say
where product waits; the loss count's stops give A, m_r and c_r for the
effective process time. Added 24 October from the books Rowland gave
(`knowledge/SOURCES.md`).
