# Faultline: minimal interface (v2), design brief

Rowland, 19 November 2026. This folder IS the design. Look at it before anything else.

## The screens

| Screen | Picture | Exact source (open in a browser; real colours, sizes, spacing) |
|---|---|---|
| Factory (home) | MinFactory.png | MinFactory.html |
| Line page: Overview | MinLine.png | MinLine.html |
| Actions: board | MinActions.png | MinActions.html |
| Tools: Library | MinTools.png | MinTools.html |
| Projects | MinProjects.png | MinProjects.html |
| Luna | MinLuna.png | MinLuna.html |
| Phone: line page | MinPhoneLine.png | MinPhoneLine.html |

The HTML files are mock-ups with sample data (Hillside Bakery is not a real client). Take the look, layout, sizes and colours from them. Take the content, figures, labels and behaviour from the REAL app. Every element in the mock-ups was checked against main @ f9b766d (19 Nov 14:23). Apart from the three changes below, each one is an existing part of the app, restyled.

## New authority (supersedes the 17 November "Pop" identity)

I am replacing Pop (cream, lime buttons, charcoal rail, offset shadows, tilted selections) with this minimal look, in the spirit of Microsoft Teams and Planner: calm and familiar to the managers I put it in front of. Record this in docs/BRAND.md, src/brand/identity.json and CLAUDE.md. Faultline stays the product, Luna the assistant, Opex Elevate the maker. The split-F logo stays on its lime tile, and lime appears nowhere else.

## The look (tokens, read from the HTML)

- Page #f5f5f5 · cards and panels #ffffff · borders #e1e1e1 · shadow at most 0 1px 2px rgba(0,0,0,.05). No offset shadows, nothing tilted.
- Text #242424 · secondary #616161 · Inter.
- One accent, olive #4a5a14: the ONE main button per page (white text), the selected tab underline, the selected item in the left bar, links.
- Status keeps its meaning and always carries a word: red #b42318 late/critical · amber #d08a00 (text #8a5a00) problem/high · green #4d8a32 done/on track · grey not started.
- Corners 4px (buttons, inputs) and 6px (cards). Touch targets at least 44px.
- Desktop frame: 52px white top bar (logo; search/jump ⌘K centred; client switch, ＋ Problem, account) and a 72px icon bar on the left: Factory · Tools · Actions · Projects · Luna (icon over label; current one gets an olive bar and olive text).
- Phone: white bottom bar Factory · Tools · ＋Problem (olive) · Actions · More.

## The three layout changes. Everything else is a restyle.

1. Line pages get a 240px left panel listing areas and their lines (like Teams channels), each with its status square, the current line highlighted (marked NEW on MinLine). It must stack away on a phone.
2. "The line in figures" tiles move out of "More about this line" to a single row under the See-it-on-the-line buttons.
3. "Results and charts" on the line page starts open.

## Hard rules

- Presentation only. Change no calculation, figure, record, permission, route or AI request. Card figures must still equal their tool pages (line-evidence acceptance).
- Don't add duplicate buttons or lose functions. Move them, don't drop them.
- Keep every acceptance script passing. Update visual-identity to the new tokens, never loosen a check.
- Small commits, one concern each; full tests and build after each.

## What I want back first (do not build yet)

1. What changed on main since f9b766d that touches these screens or the frame, and any conflicts with this design.
2. Your read of the real app against these pictures: what fits, what doesn't, and what you'd do differently as the designer, with reasons.
3. Your plan: commit order, the files and components you'd touch (tokens, frame, rail, each screen), and how you'll prove behaviour is unchanged.
4. Anything in the three layout changes you think is wrong.

I'll take your answer back to Claude to check before you start.
