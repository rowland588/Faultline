# Faultline — fault-centric model (29 October 2026)

**Rowland, go (29 Oct ~18:15 UTC).** This is the product story for
**faultline.opexelevate.co.uk**: Gemba CI centred on **faults**, with two
engines — **Performance** (6M + line tools) and **Prove** (programs + tests on
the line). Read with [`docs/DIRECTION.md`](DIRECTION.md) (wins on
disagreement), [`docs/FAULTLINE-PRODUCT-DISCOVERY.md`](FAULTLINE-PRODUCT-DISCOVERY.md),
[`docs/STAGEGATE-PROGRAMS-CORE.md`](STAGEGATE-PROGRAMS-CORE.md),
[`docs/MAP.md`](MAP.md), [`docs/SIXM.md`](SIXM.md).

**Slice 1 (this commit):** docs + person-visible demotion of commissioning
narrative papers and lever tree on New project; code paths kept. **Slice 2
(later):** fault record in data model, routing UI, deeper report cleanup.

---

## 1. One sentence

**Faultline is fault-centric Gemba CI:** anchor a fault on program, machine,
area (line/zone), or any combination; route into Lean + Six Sigma + IE tools;
drive root cause and Actions; prove on the line with programs and tests when
frequency or pass/fail matters.

---

## 2. The fault record (design — slice 2 builds storage)

| Field | Meaning |
|---|---|
| **What** | Plain words — what is wrong or off target |
| **Anchors** | Zero or more of: **program**, **machine (asset)**, **area (line/zone)** |
| **Category** | Shapes which tools and which RCA path (see §4) |
| **Evidence** | Studies, walks, readings, photos — manual inputs only |
| **Actions** | Who, what, by when — project's Actions and/or line register |
| **Proof** | Before/after on the same measure, or program test/criteria pass |

A fault is not a new noun beside **project** or **problem** on screen today;
slice 2 aligns the register, 6M cases and line context to this shape. Until
then, **problem** on the line and **case** on the 6M board carry the work.

---

## 3. Flow (person on the floor)

```
Line (home) → see fault / gap → categorize → tools quantify → root cause
  → Actions (+ journey/Gantt when dates matter) → reports from records
```

- **Line is home** (`docs/MAP.md`) — machines, programs, studies, problems.
- **Project is the workspace** when a change needs Actions, journey, or client
  papers (`docs/PROJECTS.md`).
- **No commissioning-first story** on the default path — prove on **Line ›
  Programs** without opening a project when that is enough.

---

## 4. Tool routing — fault SHAPE decides entry

| Fault shape | First move | Then |
|---|---|---|
| **Time / loss / frequency** | Stops timed, shift losses, Pareto | 6M / 5Y on the head item |
| **Static asset** (one machine) | Reliability, machine page, programs on it | **5 Whys** — not Pareto first |
| **People / plan / process** | Work sampling, line balance, standard | Appropriate IE tool → Actions |
| **Pass/fail / rate on product** | Line **Programs**, criteria, capability/reliability as criteria | Re-test loop; sign-off when picked |

**Pareto vs 5Y (decision table)**

| Question | If yes → | If no → |
|---|---|---|
| Is the fault about **how often** or **how much time** something happens? | Pareto (or constraint from Line capacity) then 6M | ↓ |
| Is it **one asset** or **one step** with a clear physical cause? | 5 Whys on the fishbone (Machine / Method bone) | ↓ |
| Is it **mix, people layout, or plan**? | Line balance, VSM, sampling — then Actions | ↓ |
| Is it **did the run meet the spec**? | **Prove** engine — program test + criteria, not 6M first | |

---

## 5. Two engines (product, not three apps)

| Engine | Question | Method / place |
|---|---|---|
| **Performance** | Why is this line off target? | **6M** project + tools on the line; deep line fault finding; Pareto in chain when time/frequency applies |
| **Prove** | What is running and did tests show it clean? | **Programs + tests** on the line (`#/lines/:ws` Programs, `#/programs?line=`); criteria sign-off; optional **Installation project** when gates/handover are needed |

**Lever tree** — **parked** (hidden from New project; existing projects unchanged).

**Installation project** (`planModel: commissioning`) — **optional / desk**: gates,
Gantt, handover lists when OEM or formal install needs them; **not** the hero
loop. Truth stays on the line.

---

## 6. Actions and Gantt

- **Actions** — who owes what, by when, why; project Actions + control room
  Every action (`docs/PROJECTS.md` P3–P4).
- **Journey / Gantt** — when **dates** matter (install optional track, weekly
  6M rhythm); not required for “Test it on the line today.”

---

## 7. Reports (default product vs legacy)

**Default promise (slice 1 menus):**

| Keep in Report ▾ | Role |
|---|---|
| Status / client report | Where the change is and why |
| **Programs report** | Every program, machine by machine |
| **Test cards** | Floor/OEM proof cards from Commission |
| Line / machine / programs papers on the line | Gemba prove loop |
| Journey report | Day-by-day when reporting rhythm needs it |

**Deprecated from default menus (code kept; direct `?doc=` URLs still work until slice 2):**

| Paper | Reason |
|---|---|
| **Commissioning report** | Narrative for OEM meetings — not the moat |
| **Commissioning cards** (commissioning PDF bundle) | Same |
| **Handover report** | Formal sign-off pack — optional install only |

Flag: `src/lib/productStory.ts` — `commissioningNarrativePapersInMenus`.

**Acceptance:** `commissioning-report.mjs` still exercises legacy PDF paths;
not in slice 1 fast gate list. Re-enable menus or point the script at direct
URLs in slice 2.

---

## 8. What we are not deleting (slice 1)

- `planModel` commissioning, gates, Commission screen, handover data.
- PDF renderers for commissioning/handover.
- Stage-gate walks and seeded jobs.

UI demotion only; memory and slice 2 decide code removal.

---

## 9. Slice 2 (next)

- Fault anchors on register + 6M case; categorize → tool suggestions.
- Rename remaining “Stage gate” chips where still shown.
- Gate commissioning acceptance on legacy flag or direct navigation only.
- Optional: hide Commission tab behind Installation “More” when no gates in use.
