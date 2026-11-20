## 19 November — Minimal v2 selected by Rowland (supersedes Pop)

Rowland, 19 November (`docs/design/minimal-v2/README.md`): *"I am replacing Pop (cream, lime buttons, charcoal rail, offset shadows, tilted selections) with this minimal look, in the spirit of Microsoft Teams and Planner: calm and familiar to the managers I put it in front of."* Faultline stays the product, Luna the assistant, Opex Elevate the maker. The design is the folder `docs/design/minimal-v2` — its pictures and HTML mock-ups give the look, layout, sizes and colours; the content, figures, labels and behaviour come from the real app.

| | |
|---|---|
| Page | `#f5f5f5` · cards and panels `#ffffff` · borders `#e1e1e1` · shadow at most `0 1px 2px` at 5% black — no offset shadows, nothing tilted |
| Text | `#242424` · secondary `#616161` · Inter |
| The one accent | olive `#4a5a14`: the ONE main button a page (white words), the selected tab's underline, the selected rail item, links |
| Status | always with its word — red `#b42318` late/critical · amber `#d08a00` as a square or edge, `#8a5a00` as words · green `#4d8a32` as a square or edge, `#3f7a2a` as words (the design's `#4d8a32` reads 4.2:1 as words) · grey not started |
| Under way | indigo `#3b4cb8` (the mock-ups' own marker colour), with its word — it was violet `#6d28d9` until 20 November |
| Charts | carried into the palette on 20 November (Rowland: *"the colours the design that was provided I think looked better"*): Line capacity's bars grey, lighter the more a station has to spare, the bottleneck in the ink `#242424`, under the V the amber fill — as MinLine draws them (`tools/linebalance/capacity` shareColours, on screen and paper); a loss bar the secondary grey, the biggest the ink (`charts/loss`); the value grid's VA · NE · NV the house's own green, amber and red with their letters; the old navy-black (`#12171c`, `#0b1a33`) is the ink everywhere. A person's own colour on the line standard stays theirs. |
| Corners | 4px buttons and inputs · 6px cards · touch targets at least 44px |
| Logo | the split F on its lime tile (`#d8eb77`); **lime appears nowhere else**. The mark keeps its own ink and olive (`markInk`, `markAccent` in `src/brand/identity.json`), so the icons are unchanged |

Tokens: `src/brand/identity.json` → `scripts/brand-assets.mjs` → `src/brand/tokens.css`; the app's rules in `src/brand/workspace.css`; the state colours in `src/styles.css`. Papers keep their own colours for now. `scripts/acceptance/visual-identity.mjs` proves the page, the one olive primary, 4px corners, no offset shadow, the olive rail selection, nothing tilted and lime only on the logo, at 360, 820 and 1440px. The sections below are history.

---

## 17 November — Pop selected by Rowland

Rowland explicitly rejected the existing branding, colours and button shapes and asked for an aesthetically coherent identity with as few controls as possible. This supersedes the 13 November palette/style restriction and the Sunrise/Aurora appearance below. Names remain **Faultline** (product), **Luna** (assistant), by **Opex Elevate**.

After reviewing Studio, Grove and Pop on desktop and phone, Rowland chose **Pop** and explicitly retained the **split-F logo** across the app. The selected identity uses warm cream paper, charcoal ink and desktop rail, lime primary actions/selections, dark olive text accents, Inter, seven-pixel button corners and a small offset shadow. Selected navigation has a slight sticker-like angle; working records remain upright and readable. App icons use the same F on lime, the share image uses charcoal/lime, and reports retain light printable surfaces with the same F and dark readable ink. Red/amber/green/violet operational states and chart encodings retain their meanings and words. Personal consultant branding is not overwritten. Studio and Grove were proposals, not extra settings to add to the current interface.

Simplicity means removing duplicate actions: one New calculation button, one place for camera/attachments, two useful starting suggestions and recent work disclosed only when it exists. The sign-in screen serves returning users; the public How it works page retains the lifecycle/method explanation. The assistant's empty screen is compact, bringing the question and the work forward. No calculator, permission, confirmation or data-storage behaviour changes are part of the identity work.

Visual verification must cover representative records/setup/reports and all device widths; the existing full functional gate remains required. The prior functional checkpoint is ce982e07; branding is an extension of the active task before publication.

---

# The brand — Faultline, with Luna within it (13 November)

Rowland, 13 November: *"I'd like to reverse the product branding back to Faultline. Luna remains the name of the AI assistant and
intelligence behind the product. The application itself is Faultline … You have creative ownership of the logo and visual identity, but
retain the existing color palette, overall interface styling and design language. This is a rebranding exercise, not a redesign."*

## 1. The identity

| | |
|---|---|
| Product | **Faultline** — written as a word, never in capitals |
| Descriptor | **The Operational Improvement System** |
| Statement | With Luna, your AI colleague, at its centre — from the factory floor to the boardroom |
| Maker | Opex Elevate (never *OpEx* or *OPEX Elevate*) |
| AI colleague | **Luna** — the intelligence within Faultline. *Ask Luna*, *Luna wrote this*. Never the product's name |
| Domain | faultline.opexelevate.co.uk (never changed) |

**The mark is the pulse.** Reviewed against alternatives and kept: a steady line, the fault ripping through it, the line settling — the
name made literal, the same shape as every trend chart in the app, legible at 16 px, and already on the landing page as the trace under
the name. What changed is its colour only: it is drawn in the current palette, **navy (#13294b) through blue (#1f5fae) into Luna's
turquoise (#12a5b0)** on a white-to-pale-sky tile, so the product's mark ends in the colleague's colour — Luna is within Faultline, in
the drawing too. Luna keeps her own orb and spark; the two are never the same picture. The crescent moon (LUNAR's) is removed.

## 2. The audit — where the name appears, and what was done

| Where | What |
|---|---|
| `src/lib/product.ts` | PRODUCT is Faultline; the LUNAR acronym and its five words removed; COLLEAGUE stays Luna |
| The frame (top bar, rail, phone) | reads PRODUCT; the moon override in `styles.css` removed, the wordmark a word again |
| Landing page | the name, descriptor and statement from PRODUCT; the acronym line removed; the trace kept |
| App text — 297 places in 144 files | every *LUNAR* a person reads is *Faultline* (tool notes, help, confirmations, empty states) |
| Leftovers from 11 November, when *Luna* was briefly the product | *Luna record* → *Faultline record* (Line Talk documents), *Luna's own names* → *Faultline's own names* (Data connections) |
| Papers | the corner of every page says **Faultline** beside the pulse (`lib/reportKit stampBrand`, it said LUNA); covers and decks say *Made with Faultline*; conversation reports *made with Luna in Faultline* |
| Luna's instructions (`COLLEAGUE_SYSTEM`, `TALK_SYSTEM`, `STORY_SYSTEM`) | *the AI colleague who lives within Faultline, the operational improvement system for manufacturing*; the gateway's copy synced |
| Spoken form | the rule that said the product's name as "Lunar" removed |
| Browser title, description, share cards, structured data (`index.html`) | Faultline — The Operational Improvement System |
| Install name (`vite.config.ts`), `public/llms.txt`, `public/how-it-works.html` | Faultline |
| Icons and share image (`public/mark.svg`, `icon-*.png`, `apple-touch-icon.png`, `icon-maskable*.{svg,png}`, `og.png`) | redrawn from `scripts/brand-assets.mjs` |
| Acceptance scripts and the page inventory | expect Faultline |

## 3. What deliberately did not change

Storage keys (`faultline.*`), database objects, CSS class names and the `html[data-luna]` theme hook, the `--lu-*` colour tokens, the
capability id `describe_faultline`, the script `lunar-environment.mjs`, the documents named `docs/LUNAR-*.md` / `docs/LUNA-*.md` and
Rowland's own words quoted in comments (history, kept verbatim). None is the product's name on a screen or a paper.

## 4. Not done here

- `public/guide/*.png` — the pictures on *How it works* are screenshots taken under the earlier names; they need retaking from the live app.
- Papers already made and kept in the Library carry the name they were made under.
- An installed app shows the new name and icon after its next update; some phones keep the old home-screen icon until re-installed.
