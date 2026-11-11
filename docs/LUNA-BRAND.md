# Luna — the product's name, and the safe way there from Faultline (11 November)

Rowland, 11 November: *"The customer-facing product name is LUNA — Lean Unified Network Assistant. This is the identity of the entire
product … Faultline is the previous product identity … Do not undertake a reckless global rename. First identify all existing references
to Faultline, distinguish customer-facing branding from internal technical identifiers, database structures, URLs, routes and historical
records, and establish a safe transition."*

**The product:** LUNA — Lean Unified Network Assistant. **Line:** Your intelligent colleague for manufacturing. **Statement:** From the
factory floor to the boardroom. **Parent:** Opex Elevate (written *Opex Elevate*). Luna is the whole product — the colleague, the tools,
the factory knowledge, the analysis, the papers — not only the AI inside it.

## 1. The audit (11 November, the merged tree at C6)

About 680 lines name Faultline in 243 files under `src/`, plus `index.html` (23), `vite.config.ts` (5), `public/llms.txt` (5), the fonts,
the PDFs' feet, the scripts and the docs. They fall into four kinds:

| Kind | Examples | Changes? |
|---|---|---|
| **A. What a customer reads** | the top bar's wordmark and the rail's (`ui/ContextBar`, `ui/Frame`, `ui/Logo`), the install sheet, the update banner, sign out, reminders, share titles, the landing page, the page title and share preview (`index.html`, `public/og.png`), the install name (`vite.config.ts` manifest), `public/llms.txt`, every paper's foot (*Made with Faultline*), the Excel export's file name, a paper's band | **Yes — R1** |
| **B. What Luna is told and says back** | the instructions (`COLLEAGUE_SYSTEM`, `TALK_SYSTEM`: *"Luna, the AI colleague within Faultline"*), the capabilities' sentences (*"Nothing in Faultline matches …"*, *"worked out by Faultline"*, *"Made in Faultline for …"*), the schemas' descriptions | **Yes — R1**, worded with care (§2) |
| **C. Internal identifiers** | storage keys (`faultline.client`, `faultline.visit`, `faultline.preferences` …), IndexedDB `faultline-data`, CSS classes, database objects (`faultline_can_see_media`, `faultline_rev_seq`, `faultline_superadmin_email` …), the capability id `describe_faultline`, the font files `Faultline-*.ttf` and the family `FaultlineName`, the repository, the Vercel and Supabase projects | **No.** A rename would cost every device its settings and data, or need migrations, for nothing a customer sees |
| **D. Addresses and history** | the domain `faultline.opexelevate.co.uk`, routes, `docs/` and the commit history, records already written (a conversation's turn kept as *Faultline*) | **No.** The domain stays until Rowland decides; history is history |

## 2. Wording Luna's rule about figures with one name

Until now the rule read *"Faultline works out every figure; you, Luna, never do"*. With one name it reads: **every figure is worked out by
the app's own code (work_out, query_data, a tool's sums) — never by Luna in her head.** Model-facing sentences say *"worked out by the
app"*, *"in the app"*, *"the app holds"*; customer-facing sentences say *Luna* where they mean the product (*"Nothing in Luna matches"*
reads oddly, so the record-finding sentences say *"Nothing recorded matches"*). The exam's marks (`src/colleague/exam`) follow the same
words. The rule itself is unchanged and as strict.

## 3. Slices

| Slice | What | Proof |
|---|---|---|
| **R1** | `src/lib/product.ts` the one source of the name, line, statement and parent; kind A and kind B changed to read from it or to the words of §2; the instructions' identity (Luna is the product and the colleague; Opex Elevate the maker); the landing page and `index.html`, `vite.config.ts`, `public/llms.txt`, `scripts/brand-assets.mjs` (og image, icons' name); the smoke test's old words gain *Faultline* on screen, so a customer-facing Faultline that comes back fails the gate | tsc, the unit tests (the strings asserted), smoke, the landing script, paper parity with the foot's change said, the real-model exam (§ docs/LUNA-EVAL.md) before and after |
| **R2** | the mark: a Luna mark and wordmark designed on the app's own screens, chosen, then the icons, og image and papers | screenshots at desk and phone; Rowland's eye |
| **R3** | the domain, if and when Rowland decides (e.g. luna.opexelevate.co.uk), the old one redirecting | — |

Kinds C and D stay as they are; `CLAUDE.md` and the docs keep their history and say *Luna (formerly Faultline)* where a reader needs it.
