## 17 November — full visual identity redesign authorized

Rowland explicitly rejected the existing branding, colours and button shapes and asked for an aesthetically coherent identity with as few controls as possible. This supersedes the 13 November palette/style restriction and the Sunrise/Aurora appearance below. Names remain **Faultline** (product), **Luna** (assistant), by **Opex Elevate**.

The direction is warm neutral paper, charcoal typography/actions, one restrained cobalt accent, clear Inter typography and small consistent corners. Selections are quiet rectangular choices, not large filled pill buttons. A split F mark replaces the medical-looking pulse. Its drawing/palette are shared by the app, installed icons, share image and PDF stamp. Colours used for data/state retain their meanings and words. Existing consultant branding remains the user's own and is not overwritten.

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
