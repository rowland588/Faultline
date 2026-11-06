# Improvement roadmap — parallel work (planning)

Rowland, 6 November: take the app to the next level across capabilities and aesthetics.
This page is **planning only** — nothing here ships until Rowland says go (`AGENTS.md`).
The product direction is `docs/DIRECTION.md`; the ordered backlog is `docs/STATE.md` §2.

## Domain matrix (impact × risk × gate)

| Domain | Impact | Risk | Typical gate |
|--------|--------|------|--------------|
| Shell / navigation (frame, rail, context bar) | High | Medium | **fast**; **full** if journeys baseline or many screens |
| Factory / line / project (tabs, boards, cards) | High | Medium | **fast** |
| Tools gallery & detail (`#/tools`, worlds) | High | Medium | **fast** — `tools-directory`, `tool-page`, `tool-world`, `inventory` |
| Papers / PDFs (lean kit, parity) | High | High | **full** — `report-stress`, `paper-parity`, affected acceptance |
| Line Talk + gateway | High | High | **full** — assist sync, fingerprint, talk acceptance |
| Sync (`src/cloud/`, mappers, schema) | High | High | **full** |
| Performance (bundle, lazy routes) | High | Medium | **full** if routes/build graph change broadly |
| a11y (semantics, focus) | Medium | Low–Medium | **fast** |
| Data viz (per-tool charts) | High | High | **fast** per tool; **full** if `lib/report/` shared |
| Empty states / onboarding | Medium | Medium | **fast** + `inventory` |
| Phone (breakpoints, bar) | High | Medium | **fast** — `structure` |

## Parallel agent workstreams (low merge conflict)

Run on **separate branches**; merge bottom-up or freeze shared files between streams.

| ID | Focus | Touches mostly | Conflicts with |
|----|--------|----------------|----------------|
| **A** | Enterprise **E6 + E7** — tool study shell, drawers, phone stack (`docs/ENTERPRISE-UI.md`) | `src/ui/*`, tool shells, `src/styles.css` | Other CSS-wide edits |
| **B** | **Lean 3-2-1** on every paper (`docs/LEAN-PAGE.md`, `docs/STATE.md` §2 item 4) | `src/lib/report/`, per-tool lean builders | Same tools as A if both edit one surface |
| **C** | Empty states & onboarding copy | Screens, `public/` assets | Some `styles.css` with A |
| **D** | Performance audit — code-split, chunk budget | `vite.config.ts`, route imports | Broad import rewrites |
| **E** | a11y — frame/rail semantics, focus | `ui/Frame`, `ui/rail`, `ui/parts` | A (chrome) |

**Good parallel pairs:** D + E, or D + C. **B** is best **solo** (touches many reports).

## Hygiene without new product scope

Allowed without changing **what** the product promises: ratchet-safe token use (`src/ui/__tests__/ratchet.test.ts`),
contrast within existing five-state meanings, dead copy, typos, docs that match **already live** behaviour,
branch housekeeping (`docs/STATE.md` §3).

## Suggested first two tracks (after go)

1. **A (E6/E7)** — finish enterprise tool chrome and phone stacking; **fast** gate if scope stays chrome-only.
2. **B (Lean 3-2-1)** — matches STATE §2 priority on papers; expect **full** gate.

## Optional branch names (when go is given)

Prefix `cursor/` and suffix `-de14` per repo convention, e.g. `cursor/enterprise-e6-e7-de14`,
`cursor/lean-page-3-2-1-sweep-de14`, `cursor/perf-codesplit-de14`, `cursor/a11y-frame-rail-de14`,
`cursor/empty-states-de14`.
