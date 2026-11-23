# Luna in the room — TV, voice, Excel, report on screen

Rowland, 23 November 2026: *conversation works but “hello” is slow; on TV with voice, Excel open, charts and suggestions,
“create the report — yes” — and the report visible on screen.*

This is the product picture for that moment. **Read with** `docs/LUNA-ABILITIES.md` §4 (M1–M5), `docs/VOICE.md`, `docs/WORKBOOKS.md`,
`docs/LUNA-STACK.md`.

---

## 1. What you described, step by step

| Moment | What you want | What exists today | Gap |
|---|---|---|---|
| Stand at TV, Luna voice | Natural back-and-forth | Voice mode, `spoken: true`, streaming first sentence | **Speed** on trivial turns (§2); TV = browser on cast / large screen |
| Excel in play | She knows the file | Attach, read on device, standing headlines (G3) | **P1** blurb when attached (`LUNA-ABILITIES` §5) |
| Ask about the data | Answers from rows | `query_workbook`, `query_data`, charts in code (`autoChart`) | Real model proof on analysis exam |
| Graphical reports | See charts | `workbook_pack`, `build_report` (chart sections) | **M4** full-screen report, not only beside chat |
| “This looks like a good route…” | Opinion + next step | Colleague suggestions; `method_knowledge`; no invented figures | Expert framing slice (future); job plans |
| “Create a spreadsheet?” | New file | **Not built** — we do not write `.xlsx` back (by design) | Offer **pack**, **CSV export**, or **conversational report** instead; say so |
| “Create a report — yes” | Card then result | `build_report` / `workbook_pack`; writes on card | **M4** report as **what the room sees** (present mode) |
| Report on screen | Everyone sees it | Work pane on phone; Story `#/?present=1` only | **M4** Present: report/pack fullscreen + voice + optional cast URL |

**The spine of the demo is already code** (attach → query → chart → build_report → show). **The room experience** (fullscreen on TV,
fast pleasantries, focus on what is on screen) is what we build next.

---

## 2. Speed — “hello” and easy chat

**Why it feels slow today:** every turn sends Luna’s full instructions and the **whole capability catalog** to Claude (assist), even
when no tool is needed. First token waits on that round trip plus prompt size. Streaming (`docs/AI-MODE.md`) helps **after** the first
word; it does not shrink the first wait.

**Built but not switched on:** `ASSIST_COLLEAGUE_TOOLS=search` — defer tool schemas until she searches (cheaper wake, extra step when
she needs tools). Measured in `docs/LUNA-EVAL.md` §3; not live.

**Built — `F1` fast conversational path (23 November, live when `assist` is deployed from `main`)**

1. **Classify turn in the gateway** (`colleagueFastChat` in `colleagueAssist`, unit-tested): greeting, thanks, small talk, who-are-you
   → **no tools** this round; work questions unchanged.
2. **`CHAT_FAST_NOTE`** on typed fast turns (`SPOKEN_NOTE` unchanged for voice).
3. **`assist_usage.fast_chat`** and `tools_mode: none` on the row (`supabase/ASSIST_USAGE_FAST_CHAT.sql`; gateway falls back if the
   column is not there yet). Response may carry `fastChat: true`.
4. **Proof:** `colleagueFastChat.test.ts`, `scripts/acceptance/luna-fast-chat.mjs`.

**Still planned:** **`F1a`** optional Haiku/Sonnet for classified chit-chat only; p50 time-to-first-token measure on “Hi Luna” × 20
(target under 2 s warm on phone).

**Not acceptable:** a fake instant reply that lies about working; skipping figure check on real asks.

---

## 3. Room mode — one build track `M4+`

Extends `LUNA-ABILITIES` M1–M5:

| Slice | Delivers |
|---|---|
| **M4** | **Built 23 November** — **Put on screen** at `#/ai/present?reportId=&c=` (and on the conversational report / pack card): fullscreen minimal v2, large type and charts readable at distance, minimal chrome, **Talk** / voice bar always available on the surface (`docs/VOICE.md`, `spoken: true`, streaming); TV = room browser, HDMI or Chrome Cast to this URL — no native TV app |
| **M1** | **Built 23 November** — `facts.sessionFocus` (report id + version) set in Present, cleared on exit; told in `focusText` each round |
| **M2–M3** | **Built 23 November** — `resolve_report_section` + `patch_report`; sections in `focusText`; `luna-room.mjs` patches October while Present stays open |
| **M5** | Section “Updating…” while query runs; first voice sentence under 3 s where possible |
| **Cast** | **Documented on screen** — one line on Present says cast / HDMI / open this hash on the TV browser |

**Acceptance (`luna-room.mjs`, built 23 November):** mocked gateway — attach workbook, voice asks with `spoken: true`, chart and
`build_report`, **Put on screen**, session focus, voice adds a finding from a workbook query while Present stays up (figures from the
generator); phone 44 px.

---

## 4. Build order (after workers in flight)

1. ~~**F1** fast path for trivial chat~~ — **built 23 November** (measure F1a next).
2. **P1** abilities blurb on attach (in progress).
3. **M4** present surface for `build_report` / pack (then M1–M3).
4. **Tool search** A/B if F1 not enough for warm jobs.

Rowland’s go is required per slice beyond doc; *“get it all built and live”* (23 Nov) covers P1, gate fixes, and release hygiene first.

---

## 5. One sentence for the team

*Luna already answers Excel with code-worked charts and builds conversational reports on a card; the room product is Present mode on
the TV plus a fast no-tools path for hellos, not a new chatbot.*