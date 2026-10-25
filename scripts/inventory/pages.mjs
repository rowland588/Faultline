/* WHAT EACH PAGE MUST SHOW — the app's memory of itself (docs/PAGES.md).
 *
 * Rowland, 15 October, after the V-curve went missing from Line capacity for
 * several lines and nothing noticed: "how do we stop ourselves from making such
 * errors, removing graphics, etc., that were once there without being told?"
 * — and, told the builder keeps no memory between sessions, "Yes, of course, I
 * want the memory written in."
 *
 * Each page: where it is (from the seeds), and the things a person sees on it
 * that must be there — each a selector that has to be on the screen with a
 * size, at desk and at phone width. `scripts/inventory.mjs` checks every one in
 * the gate. Taking something off a page means taking it off this list in the
 * same commit, with the reason beside it — so a removal is always a decision
 * someone wrote down, never an accident.
 *
 * `n` — at least this many of it (one a line, one a station …). `desk` / `phone`
 * — only at that width. (The pages of the method builder — Methods, the
 * studio, a method, a project on one — were taken off on 20 October with
 * the builder itself: docs/DIRECTION.md.) */
export const PAGES = (sd, cap) => [
  /* THE FACTORY — THE ONE HOME (23 October: "What's the point of home? ... The control room, is it
     required?"; one home, a fixed menu): #/ and #/room; what was the control room, with where you were,
     Line Talk, and the menu and its own tabs that say where you are */
  { name: 'Factory — the one home', path: '#/', must: [
    { what: 'its heading', sel: '.home h1', text: /^Factory$/ },
    { what: 'the menu, the same on every page — Factory lit', sel: '.nv-rail .nv-ri.is-on', text: /^Factory$/, desk: true },
    { what: 'the phone’s bar, the same on every page — Factory · Projects · ＋ · Problems · More', sel: '.nv-bar .nv-bi', n: 5, phone: true },
    { what: 'its own tabs — Overview · Lines · Programs, Overview on', sel: '.nv-tabs .nv-tab.is-on', text: /^Overview$/ },
    { what: 'Line Talk — start one, or carry on the latest', sel: '.home-talk .fd-talk-start', text: /Start a Line Talk/ },
    { what: 'carry on the latest Line Talk', sel: '.home-talk .fd-talk-on', text: /^Carry on: / },
    /* the page header since B3: the band's two report buttons are its Report ▾ */
    { what: 'the page header — Report ▾ with the control room report and every report', sel: '.home > .part-head .part-menu-b', text: /^Report/ },
    { what: 'Your factory — every line', sel: '.fac-floor' },
    { what: 'this week, across every line and project', sel: '.jb-week' },
    { what: 'the projects on one timeline', sel: '.jb-gantt', desk: true },
    /* the lean page (17 October, slice 5; lib/roomLean): each number in the band says what it is of, the money is the slips' cost, and the board closes on one line */
    { what: 'what each number in the band is of', sel: '.jb-hero .jb-of', n: 3 },
    { what: 'what the slips cost', sel: '.jb-stat.is-money' },
    { what: 'the closing line', sel: '.jb > .ln-close' },
  ] },
  { name: 'Your factory', path: '#/factory', must: [{ what: 'the lines in floor order', sel: '.fac-lines' },
    /* the page header since B3: its paper in Report ▾ */
    { what: 'the page header — Report ▾ with the factory report', sel: '.fac .part-head .part-menu-b', text: /^Report/ },
    /* the lean page (17 October, slice 5b; lib/factoryLean): the tiles — lines, problems open, late, a day of the factory in margin — and the closing line */
    { what: 'the tiles, a day of the factory among them', sel: '.fac .sg-tiles .ln-tile', n: 4 },
    { what: 'the closing line', sel: '.fac .ln-close' }] },
  /* THE LINE REPORT — EVERYTHING ON THE LINE (23 October, lib/lineBundle, screens/LineReportScreen) */
  { name: 'A line — its report, everything on the line', path: `#/lines/${sd.line7WsId}/report`, must: [
    { what: 'the page header — Download the one primary', sel: '.lr .part-head .btn-primary', text: /^Download/ },
    { what: 'a part — the line', sel: '.lr-part' },
    { what: 'the one-page report\'s tiles on it', sel: '.lr-part .ln-tile', n: 4 },
    { what: 'what goes in — a tick a tool record', sel: '.lr-tick input[type=checkbox]' },
    { what: 'Tick all and Tick none beside what goes in (25 October)', sel: '.lr-all .cw-link', n: 2 },
    { what: 'who owes what by when', sel: '.lr-h', text: /^Who owes what by when/ },
    { what: 'the closing line', sel: '.lr .ln-close' },
  ] },
  { name: 'A line — its own page', path: `#/lines/${sd.line7WsId}`, must: [
    { what: 'the line, machine by machine — the tour', sel: '.tour-says' },
    { what: 'a card a machine', sel: '.tour-card', n: 2 },
    /* the floor's two acts first, and the stopwatch among the tools (16 October, docs/UPGRADE-AUDIT.md F1) */
    { what: 'Time a stop', sel: '.pl-time' },
    /* the filmed walk from the line, no job needed (20 October, docs/DIRECTION.md) — in More ▾ since B3 (one primary on the page header,
       docs/STRUCTURE.md §5.4: seven buttons squeezed the line's name into a column 50 px wide), beside Edit the line */
    { what: 'More ▾ — Film the line and Edit the line', sel: '.pl .part-head .part-menu-b', text: /^More/ },
    { what: 'the stopwatch and its Pareto, among the tools', sel: '.pl-tool.is-stops' },
    /* the line is the hub (17 October, BLUEPRINT Stage 3; lib/lineLean). Its products, ready or not, came off on
       23 October — Rowland: "You've invented products ... The program is the product"; a program says its products */
    { what: 'the four tiles — problems, programs, stops, a day of the line', sel: '.pl-tiles .ln-tile', n: 4 },
    /* its papers in Report ▾ since B3 — the line report, the problems report and the problem cards, each named */
    { what: 'Report ▾ — the line report among its papers', sel: '.pl .part-head .part-menu-b', text: /^Report/ },
    { what: 'the closing line', sel: '.pl > .ln-close' },
  ] },
  { name: 'Programs', path: '#/programs', must: [{ what: 'machine by machine', sel: '.mt-list' }, { what: 'a row a program (16 October: one row, its boxes a tap away)', sel: '.mt-list .pgr' },
    /* the page header since B3: the programs report in Report ▾ */
    { what: 'the page header — Report ▾ with the programs report', sel: '.lp .part-head .part-menu-b', text: /^Report/ },
    /* 23 October: a project's programs typed only on its Commission, on its line */
    { what: 'a project\'s programs typed only on its Commission, under it', sel: '.lp-stage [data-stage-program]' }] },
  { name: 'Problems', path: '#/snags', must: [{ what: 'the register, a line at a time', sel: '.qsl-rows' },
    /* the page header since B3 (docs/STRUCTURE.md §5.4): Problem the one primary, its two papers in Report ▾ */
    { what: 'the page header — Problem, and Report ▾', sel: '.qsl .part-head .part-menu-b', text: /^Report/ },
    /* the lean page (17 October, slice 4; lib/problemsLean): its chips are its tiles, each a filter; the closing line names the worst open problem */
    { what: 'the closing line', sel: '.ln-close' }] },
  { name: 'Problems — one open, its editor', path: `#/snags?open=${sd.snagId}`, must: [
    { what: 'the box — minutes a day it costs the line (24 October, FC-154)', sel: '[aria-label="Minutes a day it costs the line"]' },
    { what: 'the boxes — rejects a day because of it, packs on hold because of it (FC-154 part 2)', sel: '[aria-label="Rejects a day because of it"], [aria-label="Packs on hold because of it"]', n: 2 },
    { what: 'what that is in money, or the ask', sel: '.pe-cost' },
  ] },
  { name: 'A stage-gate project — its front page', path: `#/project/${sd.projectId}`, must: [
    /* this week and next (23 October, docs/JOURNEY.md): done · still to do · planned, opening the journey */
    { what: 'This week and next — opening the journey', sel: '.jn-week button', text: /^Open the journey/ },
    /* B3: the status report and the client report in the header's Report ▾ (the verdict's link moved here) */
    { what: 'the page header — Report ▾ with the status report and the client report', sel: '.part-head .part-menu-b', text: /^Report/ },
    { what: 'the verdict', sel: '.vd' }, { what: 'Needs you', sel: 'h2, h3', text: /Needs you/ }, { what: 'where each machine is', sel: '.fp-grid' },
    /* the band's five tiles — the same the one-page status and the full report count (17 October, docs/LEAN-PAGE.md) */
    /* on a phone the band is the answer and the status report (the phone pass, 5 October): its tiles are the desk's */
    { what: 'the band’s tiles — handover, late of what is still to do, critical, fixes open, what the slip costs', sel: '.vd .vd-tile', n: 5, desk: true },
    /* the job's places, its machines each a page (16 October, docs/STAGEGATE-UX.md) — one tap from Where each machine is (23 October: off the menu, which never changes) */
    { what: 'its machines, each a page, from where each machine is', sel: '.fp-where .jr-row.is-door', n: 3 },
    { what: 'its own pages as tabs — Overview on', sel: '.nv-tabs .nv-tab.is-on', text: /^Overview/ },
  ] },
  { name: 'A machine — its own page', path: `#/project/${sd.projectId}/machine/${sd.machineId}`, must: [
    { what: 'its four gates in a row', sel: '.mpg-steps .mpg-step', n: 4 },
    { what: 'its stages and tests, gate by gate', sel: '.mpg-main .mp-gate' },
    { what: 'its programs', sel: '.mpg-side .pp-m' },
    /* the lean page (17 October; lib/stageGatePages machineTiles): gates through, late, fixes, no fix yet, the job's money — and the closing line */
    { what: 'the five tiles — the project’s money last', sel: '.mpg > .sg-tiles .ln-tile', n: 5 },
    { what: 'the closing line', sel: '.mpg > .ln-close' },
  ] },
  /* one row a program, its test on the row, one form (16 October: "too many views and doors") */
  { name: 'Programs — a stage-gate project', path: `#/project/${sd.projectId}/programs`, must: [
    { what: 'the programs in a sentence', sel: '.pp-says' },
    /* the page header since B3: the programs report in Report ▾ (it was "Programs report — PDF") */
    { what: 'the page header — Report ▾ with the programs report', sel: '.part-head .part-menu-b', text: /^Report/ },
    { what: 'the states worth showing, each a filter', sel: '.pp-chip', n: 2 },
    { what: 'a row a program, machine by machine', sel: '.pgr-list .pgr', n: 4 },
    { what: 'how its test went, on its row', sel: '.pgr .ptx-go' },
    { what: 'a program added to a machine', sel: '.pgr-add-open' },
    /* the lean page (17 October, docs/LEAN-PAGE.md): its counted figures are the chips, its closing line the programs in a sentence */
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  { name: 'Commission', path: `#/project/${sd.projectId}/testing`, must: [
    /* the four gates and the timeline are one Plan, its tabs (16 October, docs/STAGEGATE-UX.md) */
    { what: 'the plan’s tabs, Commission on', sel: '.plt .plt-t.on', text: /^Commission/ },
    { what: 'Needs you', sel: '.nd-list' }, { what: 'the board, machine by machine', sel: '.ig-grid', desk: true },
    { what: 'the board as a card a machine', sel: '.igm-card', phone: true },
    /* the lean page (17 October, docs/LEAN-PAGE.md; lib/stageGatePages): the header's counts as tiles, and the money */
    { what: 'the tiles — passed, didn’t pass, didn’t run, still to run, the money', sel: '.sg-tiles .ln-tile', n: 5 },
    /* the page header since B3: the commissioning report and the test cards in Report ▾ */
    { what: 'the page header — Report ▾ with the commissioning report and the test cards', sel: '.part-head .part-menu-b', text: /^Report/ },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  { name: 'Install', path: `#/project/${sd.projectId}/install`, must: [
    { what: 'the plan’s tabs, Install on', sel: '.plt .plt-t.on', text: /^Install/ },
    { what: 'the tiles — done, late, problems, not added yet, the money', sel: '.sg-tiles .ln-tile', n: 5 },
    { what: 'Needs you', sel: '.cg-needs' },
    /* the page header since B3: the step cards in Report ▾ */
    { what: 'the page header — Report ▾ with the step cards', sel: '.part-head .part-menu-b', text: /^Report/ },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  { name: 'Problems — a stage-gate project', path: `#/project/${sd.projectId}/fixes`, must: [
    { what: 'the tiles — open, critical, late, no fix yet, the money', sel: '.sg-tiles .ln-tile', n: 5 },
    { what: 'the closing line', sel: '.ln-close' },
    /* the page header since B3: the problems report and the cards in Report ▾ */
    { what: 'the page header — Report ▾ with its two papers', sel: '.part-head .part-menu-b', text: /^Report/ },
  ] },
  { name: 'Materials', path: `#/project/${sd.pacedProjectId}/materials`, must: [
    { what: 'the tiles — here, late, waiting, no date, the money', sel: '.sg-tiles .ln-tile', n: 5 },
    { what: 'what we are waiting on, a row a material', sel: '.mt-list .mt-row', n: 2 },
    { what: 'the closing line', sel: '.ln-close' },
    /* the page header since B3: the materials report in Report ▾ */
    { what: 'the page header — Report ▾ with the materials report', sel: '.part-head .part-menu-b', text: /^Report/ },
  ] },
  /* the day (17 October, the lean page slice 5c; lib/dayLean): its update to send, the story counted in tiles, the job's money last, the closing line */
  { name: 'The day', path: `#/project/${sd.projectId}/day`, must: [
    /* the update to send, at the top — the page header's one primary since B3, named for what it is (it said "— PDF"), and in Report ▾ */
    { what: 'the update to send, at the top', sel: '.part-head .btn-primary', text: /update/ },
    { what: 'the tiles — done, late, went wrong, found, the project’s money', sel: '.cm-screen > .sg-tiles .ln-tile', n: 4 },
    { what: 'the closing line', sel: '.cm-screen > .ln-close' }] },
  { name: 'The plan', path: `#/project/${sd.projectId}/plan`, must: [{ what: 'the Gantt', sel: '.gt-body' },
    /* B3: the Gantt's own PDF is the page header's Report ▾ */
    { what: 'the page header — Report ▾ with the plan on one page', sel: '.part-head .part-menu-b', text: /^Report/ }, { what: 'the plan’s tabs, Timeline on', sel: '.plt .plt-t.on', text: /^Timeline/ },
    /* the lean page (17 October; lib/stageGatePages planTiles): the header's count line moved into the tiles, the job's money last; the closing line */
    { what: 'the tiles — done of the dates, late, still ahead, the project’s money', sel: '.cm-screen > .sg-tiles .ln-tile', n: 4 },
    { what: 'the closing line', sel: '.cm-screen > .ln-close' }] },
  { name: 'The client report — a stage-gate project', path: `#/project/${sd.projectId}/report`, must: [
    /* B3: the paper's page header — Download the one primary, where it said PDF */
    { what: 'the page header — Download', sel: '.part-head .btn-primary', text: /^Download/ },
    { what: 'its five papers to choose', sel: '.cr-which .chip', n: 5 }] },
  { name: 'The client report — a 6M project', path: `#/pace-report?project=${sd.pacedProjectId}`, must: [
    { what: 'the page header — Download', sel: '.part-head .btn-primary', text: /^Download/ },
    { what: 'its two papers to choose', sel: '.cr-which .chip', n: 2 }] },
  /* a problem read through (24 October, FC-146): its hours a week in money by the line's cost model on its card — or which input the line is missing */
  { name: 'A 6M project — a problem read through', path: `#/project/${sd.pacedProjectId}/fishbone?line=${sd.pacedLineId}&problem=${sd.problemId}&view=read`, must: [
    { what: 'the problem card — its number in money (or the missing input named)', sel: '.pc-money', text: /labour|wage|speed|margin/ },
  ] },
  { name: 'A 6M project — its front page', path: `#/project/${sd.pacedProjectId}`, must: [
    /* this week and next (23 October, docs/JOURNEY.md): done · still to do · planned, opening the journey */
    { what: 'This week and next — opening the journey', sel: '.jn-week button', text: /^Open the journey/ },
    { what: 'the page header — Report ▾ with the status report and the client report', sel: '.part-head .part-menu-b', text: /^Report/ },
    { what: 'the verdict', sel: '.vd' }, { what: 'the fishbone, drawn', sel: 'svg.fb-svg' },
    /* the lean page (17 October, docs/LEAN-PAGE.md slice 4; lib/sixmLean): the 6M report's five tiles on the band — the desk's, as the stage gate's */
    { what: 'the band’s tiles — the gap, problems, roots found, countermeasures, holding', sel: '.vd .vd-tile', n: 5, desk: true },
  ] },
  { name: 'The 6M board', path: `#/project/${sd.pacedProjectId}/board`, must: [{ what: 'the six bones', sel: '.bd6-lanes' }] },
  { name: 'The Pareto', path: `#/project/${sd.pacedProjectId}/pareto`, must: [{ what: 'the ranked losses', sel: '.pr-table' }] },
  { name: 'The lever tree', path: `#/project/${sd.treeProjectId}/tree`, must: [{ what: 'the tree, drawn', sel: '.lt-root' }] },
  { name: 'Line capacity — one line', path: `#/w/${sd.wsId}/standards/${sd.lineStandardId}?at=balance`, must: [
    { what: 'the tool shell — More ▾ and Report ▾', sel: '.ls-head .part-menu-b', n: 2 }, { what: 'the product’s views as tabs — Line capacity on', sel: '.part-views .part-view.on', text: /^Line capacity$/ },
    { what: 'what the sums say', sel: '.cap-says' },
    { what: 'the V-curve, drawn', sel: 'svg.vc-svg', desk: true },
    { what: 'the V on its side', sel: '.vc-rows', phone: true },
    { what: 'the capacity sheet', sel: '.cap-sheet' },
    { what: 'what a unit costs in labour', sel: '.cap-cost' },
    { what: 'what the bottleneck costs a pack, under the sums (or what it needs)', sel: '.cap-money' },
    /* the lean page (17 October, docs/LEAN-PAGE.md): the band, the tiles, the closing line */
    { what: 'the band — the product, where it is, what limits the line', sel: '.ls-head.is-band .ln-verdict' },
    { what: 'the tiles — what it makes, the target, against it, labour a pack, the people', sel: '.cap-tiles .ln-tile', n: 5 },
    { what: 'the closing line', sel: '.ln-close' },
    { what: 'the stations, in order', sel: '.cap-grp' },
    /* set up on the left, seen on the right (16 October) */
    { what: 'the line, drawn beside the stations', sel: '.capx-live svg.cxf-svg' },
    { what: 'what each station can do, in units a minute', sel: '.capx-live .cxb-row', n: 2 },
  ] },
  ...(cap ? [{ name: 'Line capacity — two lines into one wrapper', path: `#/w/${cap.wsId}/standards/${cap.lanesId}?at=balance`, must: [
    { what: 'what the sums say', sel: '.cap-says' },
    { what: 'how many lines feed in', sel: '.cap-shape', },
    /* the chip map gave way to the drawing (16 October: "being able to see what
       you're doing makes no sense") — the same stations, speeds and merge, drawn */
    { what: 'how many lines feed in — step 1, above the stations', sel: '.capx-in .cap-shape' },
    { what: 'the lines drawn meeting, beside the stations', sel: '.capx-live .cxf-merge' },
    { what: 'a column a line in the drawing', sel: '.capx-live .cxf-lane', n: 2 },
    { what: 'the way to the target', sel: '.cap-plan' },
    { what: 'a V for each line and where they merge — on the page, not only the paper', sel: 'svg.vc-svg', n: 3, desk: true },
    { what: 'a V on its side for each line and where they merge', sel: '.vc-rows', n: 3, phone: true },
    { what: 'a sheet for each line and where they merge', sel: '.cap-sheet', n: 3 },
  ] }] : []),
  { name: 'Line capacity — what a line can make', path: `#/balances?line=${sd.line7WsId}`, must: [
    { what: 'the answer first', sel: '.lch-hero' },
    { what: 'theoretical · demonstrated · plannable, each opening why', sel: '.lch-mx .mx', n: 3 },
    { what: 'where and when it stops — a machine × day grid', sel: '.lch-hm-row', n: 2 },
    { what: 'the week, to send', sel: '.lch-brief' },
    { what: 'ask about the line', sel: '.lch-ask' },
    { what: 'where the time went, band by band', sel: '.lch-bands .lch-band', n: 3 },
    { what: 'will next week’s orders fit', sel: '.lch-dem' },
  ] },
  /* THE LINE BALANCE, its own tool (17 October) — at the old People tab's address too, which still opens it */
  { name: 'Line balance — one product', path: `#/w/${sd.wsId}/standards/${sd.lineStandardId}?at=balance&view=work`, must: [
    { what: 'the product’s views as tabs — Line balance on', sel: '.part-views .part-view.on', text: /^Line balance$/ },
    { what: 'each person’s work, stacked against takt', sel: 'svg.wb-svg' },
    { what: 'each person, where they work and their bar against takt', sel: '.wb-person .wb-bar', n: 3 },
    { what: 'what the bottleneck costs, or what it needs', sel: '.wb-cost' },
    { what: 'time each person', sel: '.wb-time', n: 3 },
    /* the lean page (17 October): the band, the tiles in the strip's place, the closing line */
    { what: 'the band', sel: '.ls-head.is-band' }, { what: 'the tiles — people, takt, the bottleneck person, labour a pack, lost a minute', sel: '.wb-strip .ln-tile', n: 5 },
    { what: 'the closing line', sel: '.wb .ln-close' },
  ] },
  { name: 'Line balance — every product', path: `#/linebalance?line=${sd.wsId}`, must: [{ what: 'each product with its balance said', sel: '.lt-row .lt-says' }] },
  { name: 'All together — one product', path: `#/w/${sd.wsId}/standards/${sd.lineStandardId}?at=all`, must: [
    { what: 'the tool shell — Report ▾', sel: '.ls-head .part-menu-b', text: /^Report/ }, { what: 'the product’s views as tabs — All together on', sel: '.part-views .part-view.on', text: /^All together$/ },
    { what: 'each tool’s sentence', sel: '.tg-strip .tg-cell', n: 3 },
    { what: 'the line station by station', sel: '.tg-st', n: 3 },
    { what: 'each person against takt', sel: '.tg-bars .wb-bar', n: 3 },
    /* the lean page (17 October): the band, each tool's figure as a tile, the closing line */
    { what: 'the band', sel: '.tg .ls-head.is-band' }, { what: 'the tiles — each tool’s own figure', sel: '.tg .ln-tiles .ln-tile', n: 5 },
    { what: 'the closing line', sel: '.tg .ln-close' },
  ] },
  { name: 'Line standard — a map', path: `#/w/${sd.wsId}/standards/${sd.lineStandardId}`, must: [
    { what: 'the tool shell — More ▾ and Report ▾', sel: '.ls-head .part-menu-b', n: 2 },
    { what: 'the board', sel: '.ls-board' }, { what: 'who does what', sel: '.ls-side' },
    { what: 'what the people placed cost — one sentence under the count (24 October, FC-006)', sel: '.ls-money', text: /placed|as Line capacity has them/ },
  ] },
  ...(cap ? [{ name: 'Line standard — long notes, tall shapes', path: `#/w/${cap.wsId}/standards/${cap.lanesId}`, must: [
    { what: 'the board', sel: '.ls-board' },
    { what: 'the bottleneck said first', sel: '.ls-bn-sum' },
    { what: 'words up a tall, narrow shape', sel: '.ls-shape-t.is-up' },
  ] }] : []),
  { name: 'A value stream map', path: `#/value-stream/${sd.lineMapId}`, must: [{ what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 }, { what: 'Belongs to — its line and project, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ }, { what: 'the grid', sel: '.vs-grid' },
    { what: 'the band', sel: '.ln-band' }, { what: 'its seven cards', sel: '.vs-cards .vs-card2' }, { what: 'the action plan', sel: '.ln-plan-p' }, { what: 'the closing line', sel: '.ln-close' },
    /* IN MONEY (knowledge/specs/FC-001-value-stream-money.md, 24 October): the waste work's labour a day and the product waiting, among the cards; the sentence with what is missing named */
    { what: 'the money cards — Waste work a day, Waiting product tied up (FC-001)', sel: '.vs-cards .vs-card2.is-money', n: 2 }, { what: 'the money sentence — the labour said, or the line’s wage named as missing', sel: '.ie-say.ie-money', text: /^Waste work/ }] },
  { name: 'A SMED', path: `#/smed/${sd.changeoverId}`, must: [{ what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 }, { what: 'Belongs to — its line and project, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ }, { what: 'the grid', sel: '.vs-grid' }, { what: 'what it says', sel: '.ie-says' },
    /* the lean page (17 October, slice 6; lib/ie/changeoverLean): the band, five tiles in the strip's place, the action plan, the closing line */
    { what: 'the band', sel: '.ln-band' }, { what: 'the five tiles — now, inside the stop, planned to, stopped in packs and £, bought back', sel: '.ie-strip .ln-tile', n: 5 },
    { what: 'the action plan', sel: '.ln-plan-p' }, { what: 'the closing line', sel: '.ln-close' }] },
  /* A TOOL INSIDE A PROJECT (21 October, docs/PROJECTS.md P2): opened from the
     project's rail, the page keeps the project's rail and lists its own first */
  /* A PROJECT'S ACTIONS (21 October, docs/PROJECTS.md P3): every thing it owes, who, why, where, by when */
  { name: 'Actions — a stage-gate project', path: `#/project/${sd.projectId}/actions`, must: [
    { what: 'the six tiles — open, late, this week, nobody yet, no date, done this week', sel: '.act-tiles .ln-tile', n: 6 },
    /* the page header since B3: the action list in Report ▾ (it was a button saying PDF) */
    { what: 'the page header — Report ▾ with the action list', sel: '.act .part-head .part-menu-b', text: /^Report/ },
    { what: 'seen by who, when or where', sel: '[aria-label="Seen by"] .chip', n: 3 },
    { what: 'a group a person, each with its actions', sel: '.act-g .act-li' },
    { what: 'the closing line', sel: '.ln-close' }] },
  { name: 'Actions — a 6M project', path: `#/project/${sd.pacedProjectId}/actions`, must: [
    { what: 'the tiles', sel: '.act-tiles .ln-tile', n: 6 }, { what: 'its actions', sel: '.act-li' }, { what: 'the closing line', sel: '.ln-close' }] },
  /* THE JOURNEY (23 October, docs/JOURNEY.md J2): the project between two dates, day by day */
  { name: 'Journey — a stage-gate project', path: `#/project/${sd.projectId}/journey`, must: [
    { what: 'the page header — Plan something the primary', sel: '.jn .part-head .btn-primary', text: /^Plan something$/ },
    { what: 'the page header — Report ▾ with the journey report for the range', sel: '.jn .part-head .part-menu-b', text: /^Report/ },
    { what: 'the range — its five picks', sel: '[aria-label="Range"] .chip', n: 5 }, { what: 'the range said', sel: '.jn-range-t' },
    { what: 'the four tiles — done, still to do, late, planned', sel: '.jn-tiles .ln-tile', n: 4 },
    /* every tool at a desk; on a phone the list folds to the ticked, Every tool under it */
    { what: 'the tools we will use — a tick a tool', sel: '.jn-tools .jn-tool', n: 11, desk: true },
    { what: 'the tools we will use, folded — Every tool', sel: '.jn-tools .jn-every', text: /^Every tool/, phone: true },
    { what: 'the days in order', sel: '.jn-day' }, { what: 'a day’s lines, each a record’s own', sel: '.jn-day .jn-li' },
    { what: 'today marked', sel: '.jn-day.is-today' }, { what: 'the closing line', sel: '.ln-close' }] },
  { name: 'Journey — a 6M project', path: `#/project/${sd.pacedProjectId}/journey`, must: [
    { what: 'the range', sel: '[aria-label="Range"] .chip', n: 5 }, { what: 'the four tiles', sel: '.jn-tiles .ln-tile', n: 4 },
    { what: 'the tools we will use', sel: '.jn-tools .jn-tool', n: 11, desk: true }, { what: 'the days', sel: '.jn-day .jn-li' }, { what: 'the closing line', sel: '.ln-close' }] },
  /* the parts every page is built from (docs/STRUCTURE.md §7, B1, 23 October) — in development, photographed so a change to a part is seen before it ships */
  { name: 'The parts', path: '#/parts', must: [
    { what: 'the page header — one title, its state', sel: '.part-head h1 .part-tag' },
    { what: 'Report ▾ and More ▾', sel: '.part-head .part-menu-b', n: 2 },
    { what: 'the primary action', sel: '.part-head .btn-primary' },
    { what: 'where it belongs', sel: '.part-belongs' },
    { what: 'the tiles', sel: '.parts .ln-tile', n: 4 },
    { what: 'the views', sel: '.part-views [role=tab]', n: 5 },
    { what: 'the filters that are the counts', sel: '.part-filters .chip', n: 4 },
    { what: 'a state in each of the five colours, with its word', sel: '.parts p .part-tag', n: 5 },
    { what: 'the app\'s eleven tools, from the catalogue', sel: '.parts .part-row', n: 14 },
  ] },
  { name: 'Tools — the library', path: '#/tools', must: [
    { what: 'the problem, asked first', sel: '.et-search input' },
    { what: 'the counts that are the filters — six statuses and All', sel: '.et-status .chip', n: 7 },
    { what: 'start from the problem — every route', sel: '.et-route-b', n: 20 },
    { what: 'every tool by discipline, each with its status in words', sel: '.et-row .et-st', n: 200 },
    /* the eleven a person can open, one tap each — the factory's tools since the rail stopped listing them (23 October, docs/STRUCTURE.md B2) */
    { what: 'use one now — every tool a person can open', sel: '.et-now .lt-row', n: 11 },
  ] },
  /* A PROJECT'S TOOLS (23 October, docs/STRUCTURE.md §5.1, B2): the eleven tools left the foot of the project's rail for one page — each tool, how often it is used here, its latest; New on its row */
  /* RESULTS (docs/STRUCTURE.md D9, B5): Numbers and Wins one page, two views */
  { name: 'Results — a 6M project', path: `#/project/${sd.pacedProjectId}?view=data`, must: [
    { what: 'its heading', sel: '.pace-head h1', text: /^Results$/ },
    { what: 'its two views, Numbers and Wins', sel: '.pace-head .part-views .part-view', n: 2 },
    { what: 'Numbers shown, lit', sel: '.pace-head .part-view.on', text: /^Numbers$/ },
  ] },
  { name: 'Tools — a 6M project', path: `#/project/${sd.pacedProjectId}/tools`, must: [
    { what: 'its heading', sel: '.ptools h1', text: /^Tools$/ },
    { what: 'every tool, how often it is used here', sel: '.ptools .lt-row', n: 11 },
    { what: 'New on a tool’s row', sel: '.ptools .lt-li .btn', n: 10 },
    /* the project's Evidence since B5 (docs/STRUCTURE.md D9) */
    { what: 'the line, filmed — the project’s evidence', sel: '.ptools .ptools-film h2', text: /^The line, filmed$/ },
    { what: 'the project’s tabs, Tools on', sel: '.nv-tabs .nv-tab.is-on', text: /^Tools/ }] },
  /* A LINE'S TOOLS — the line's own page narrowed to its tools, with New ▾ (B2) */
  { name: 'A line — its tools', path: `#/lines/${sd.line7WsId}?view=tools`, must: [
    { what: 'the tools on this line', sel: '.pl-tools .pl-tool', n: 4 },
    { what: 'New ▾ — a tool started here is the line’s', sel: '.pl-sec-h .part-menu-b' },
    { what: 'a tick beside each tool — to read them together or start several here (25 October)', sel: '.pl-tick input[type=checkbox]', n: 9 },
    { what: 'what ticking does, said until a tool is ticked', sel: '.pl-pick-hint', text: /Tick tools to read them together in one line report/ },
    { what: 'the line’s tabs, Tools on', sel: '.nv-tabs .nv-tab.is-on', text: /^Tools/ }] },
  /* STOPS TIMED — the line study, the line's first log (docs/STRUCTURE.md D8, B6): named, its four views
     tabs on its page at a desk as on a phone; no screen of it on the rail */
  { name: 'Stops timed — Capture', path: `#/w/${sd.wsId}/capture`, must: [
    { what: 'its name, Stops timed, and the line', sel: '.study-log b', text: /^Stops timed$/ },
    { what: 'its four views as tabs, Capture lit', sel: '.study-views [role=tab]', n: 4 },
    { what: 'Capture the view shown', sel: '.study-views [role=tab][aria-selected=true]', text: /^Capture$/ },
    /* the seeded study is a stage-gate project's own walk, filmed from Install: the Plan lit */
    { what: 'where it sits, its tab on — the Plan', sel: '.nv-tabs .nv-tab.is-on', text: /^Plan/ }] },
  { name: 'Actions — the factory', path: '#/actions', must: [
    { what: 'the six tiles', sel: '.act-tiles .ln-tile', n: 6 }, { what: 'seen by who, when, where or project', sel: '[aria-label="Seen by"] .chip', n: 4 },
    { what: 'every project’s actions and every line’s own problems', sel: '.act-li' }, { what: 'the closing line', sel: '.ln-close' }] },
  { name: 'SMED inside a project', path: `#/smed?project=${sd.pacedProjectId}`, must: [
    { what: 'the project’s tabs — its fishbone among its pages', sel: '.nv-tabs .nv-tab', text: /^Fishbone/ },
    { what: 'whose — the project’s own, everything on its lines, every line', sel: '.ip-scope .chip', n: 3 },
    { what: 'the project’s own SMED', sel: '.lt-li[data-study]' }] },
  { name: 'A loss count', path: `#/losses/${sd.lossId}`, must: [
    { what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 }, { what: 'Belongs to — its line and project, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ },
    { what: 'the waterfall, drawn', sel: 'svg.lf-fall' }, { what: 'what it says', sel: '.ie-says' },
    /* the lean page (17 October, docs/LEAN-PAGE.md): the band, the tiles, the causes, the action plan, the closing line */
    { what: 'the band — what, where, the day and the shift', sel: '.ln-band' }, { what: 'the tiles — good packs, lost, stops, rejects, what it cost', sel: '.ln-tiles .ln-tile', n: 5 },
    { what: 'the top causes', sel: '.lf-tab .lf-row' }, { what: 'the action plan — the countermeasure raised from its biggest bar', sel: '.ln-plan .ln-row' },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  /* the lean page (17 October, slice 6): the band, the tiles in the strip's place, the action plan, the closing line */
  { name: 'Work sampling', path: `#/sampling/${sd.samplingId}`, must: [{ what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 }, { what: 'Belongs to — its line and project, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ }, { what: 'the round', sel: '.ws-round' },
    { what: 'the band', sel: '.ln-band' }, { what: 'the five tiles — what it costs among them', sel: '.ie-strip .ln-tile', n: 5 }, { what: 'the action plan', sel: '.ln-plan-p' }, { what: 'the closing line', sel: '.ln-close' }] },
  /* A RELIABILITY STUDY (21 October, docs/TOOLKIT.md tool 13): the watch and the event button, the lean tiles (MTBF first), what it means, the graphs — events against watched hours, the gaps, the MTBF day by day — what the stops were, the days, the commentary, the closing line */
  /* A CONTROL CHART (24 October, W2, knowledge/specs/FC-086-charts.md): the tiles, the sentence and its signals in words, the limits set, the chart and the moving range with the CUSUM under it, the pad, the readings, the action plan, the closing line */
  { name: 'Control chart', path: `#/chart/${sd.chartId}`, must: [
    { what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 }, { what: 'Belongs to — its line and project, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ },
    { what: 'the band', sel: '.ln-band' },
    { what: 'the six tiles — readings, centre, limits, signals, since, level (the verdict is the band’s)', sel: '.ie-strip .ln-tile', n: 6 },
    { what: 'the sentence', sel: '.ie-say', text: /^Fill weight — 40 readings against limits .* set from readings 1–20: 2 beyond \(35, 38\)/ },
    { what: 'each signal in words, with what it usually means', sel: '[data-signal]', n: 7 },
    { what: 'the limits set, and Set them again', sel: '.ie-limits-act', text: /Limits set .* from readings 1–20/ },
    { what: 'the chart, the moving range and the CUSUM', sel: '.ie-ch-pic svg', n: 3 },
    { what: 'a point for each reading', sel: '.ie-ch [data-point]', n: 40 },
    { what: 'the pad', sel: '.ie-pad .ie-key', n: 13 },
    { what: 'a note on a reading — New reel', sel: '.ie-notes .chip', n: 3 },
    { what: 'every reading, in order', sel: '.ie-rows li', n: 40 },
    { what: 'the action plan', sel: '.ln-plan-p' },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  /* AN ANALYSIS (24 October, W3a, knowledge/specs/FC-105-analysis.md): twelve fill times before and after — the band's verdict, five tiles, the sentence in "we can be 95% confident", what it does not say, the picture's lanes, the entry (Before / After, the pad, a pasted column), the checks, every reading, Agreed, the action plan, the closing line */
  { name: 'Analysis', path: `#/analysis/${sd.analysisId}`, must: [
    { what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 }, { what: 'Belongs to — its line and project, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ },
    { what: 'the band with its verdict', sel: '.ln-band', text: /Moved the right way/ },
    { what: 'the five tiles — before, after, the change, p, the test', sel: '.ie-strip .ln-tile', n: 5 },
    { what: 'the sentence, in the floor’s words', sel: '.ie-say', text: /^Before 12\.81 s, after 12\.31 s: it fell by 0\.50 s — we can be 95% confident it fell by between 0\.24 and 0\.76 s \(p = 0\.0006\)/ },
    { what: 'what it does not say', sel: '.ie-notclaimed', text: /^What this does not say/ },
    { what: 'the picture’s three lanes — before, after, the change on a zero line', sel: '.ie-an-pic g', n: 3 },
    { what: 'Before and After, the sides of the entry', sel: '.chip-row .chip', n: 2 }, { what: 'the pad', sel: '.ie-pad .ie-key', n: 13 },
    { what: 'a pasted column', sel: '.ie-paste textarea' },
    { what: 'the checks on the readings', sel: '.ie-checks .ie-check' },
    { what: 'every reading, in order', sel: '.ie-readings summary', text: /\(24\)/ },
    { what: 'what was agreed, and Change what was agreed', sel: '.ie-agreed b', text: /did it change, measured · lower is better · 95% confidence/ },
    { what: 'the action plan', sel: '.ln-plan-p' },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  /* THE CALCULATORS (25 October, FC-235, knowledge/specs/FC-235-calculators.md): the hub with every calculator as a card and the saved ones; one calculator's list; a saved calculation — figures left, the answer right, the saved before, the what-if */
  { name: 'Calculators — the hub', path: '#/calc', must: [
    { what: 'the page named Calculators with Report ▾', sel: '.part-head .pace-title', text: /^Calculators$/ }, { what: 'a card each calculator, with what it is for', sel: '.calc-card', n: 4 },
    { what: 'the kanban card counting its saved one', sel: '[data-calc-card=kanban] .calc-card-n', text: /1 saved/i },
    { what: 'the saved calculations, a row each with its calculator and verdict', sel: '.lt-rows .lt-li', n: 3 },
  ] },
  { name: 'One calculator — Kanban sizing', path: '#/calc/kanban', must: [
    { what: 'the page named for the calculator, with New calculation', sel: '.part-head .pace-title', text: /^Kanban sizing$/ }, { what: 'New calculation', sel: '.pace-head-actions .btn-primary', text: /^New calculation$/ },
    { what: 'its saved ones, a row each with Rename and Delete', sel: '.lt-li .lt-acts', n: 1 },
    { what: 'the calculators that carry on from it', sel: '.calc-see .linkish', n: 2 },
  ] },
  { name: 'A calculation — kanbans for trays, with its saved before', path: `#/calc/kanban/${sd.calcKanbanId}`, must: [
    { what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 }, { what: 'Belongs to — its line, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ },
    { what: 'the band with its verdict', sel: '.ln-band', text: /8 kanbans/ },
    { what: 'the figures, each with its box', sel: '.calc-field input', n: 7 }, { what: 'the safety factor saying it is a choice', sel: '[data-chosen=safety]', text: /^A choice, not a measurement\./ },
    { what: 'the money figures folded under In money — all optional', sel: '.calc-money > summary', text: /^In money — all optional$/ },
    { what: 'the five tiles, each with what moved since the saved before', sel: '.calc-tiles .ln-tile', n: 5 }, { what: 'a change since the saved before', sel: '.calc-tiles .ln-ch', text: /fewer than the saved before/ },
    { what: 'the sentence, in the floor’s words', sel: '[data-calc=sentence]', text: /^8 kanbans of 60 trays — a supermarket of at most 480 trays\. The loop carries 400 trays before safety because a refill takes 2 hours; halve that and it carries 200\./ },
    { what: 'how it is worked out', sel: '.calc-working-t tr', n: 6 }, { what: 'the money, said with its because', sel: '[data-calc=money]', text: /^A full shelf is £408\.00 of trays/ },
    { what: 'what this does not say', sel: '.calc-caveats li', n: 4 },
    { what: 'Before → after, the before’s own sentence', sel: '[data-calc=before]', text: /^Before: 16 kanbans of 60 trays/ },
    { what: 'What if…', sel: '.calc-whatif h2', text: /^What if/ },
    { what: 'the action plan', sel: '.ln-plan-p' }, { what: 'the closing line', sel: '.ln-close' },
  ] },
  { name: 'A calculation — what a sampling plan protects, with its curve', path: `#/calc/oc-curve/${sd.calcOcId}`, must: [
    { what: 'the band with both risks', sel: '.ln-band', text: /Risks 3\.7% and 5\.4%/ },
    { what: 'the curve drawn, with its guides and dots', sel: '.calc-pic-svg polyline', n: 1 }, { what: 'the guides’ words — AQL, LQ, 95 in 100, 10 in 100', sel: '.calc-pic-lab', n: 4 },
    { what: 'what it does not say — the licence caveat', sel: '.calc-caveats li', text: /does not hold the tables of ISO 2859-1/ },
    { what: 'the line’s wage offered or typed', sel: '[data-field=rate] input', n: 1 },
  ] },
  /* THE ANALYSIS, PART TWO (24 October, W3b, knowledge/specs/FC-107-groups-tables-relations.md): three shifts, a table of counts, a relation — each page says its answer in "we can be 95% confident" and draws what it is about */
  { name: 'Analysis — do groups differ', path: `#/analysis/${sd.analysisGroupsId}`, must: [
    { what: 'the band’s verdict — the worst shift, amber', sel: '.ln-band', text: /B is the worst/ },
    { what: 'five tiles — shifts, readings, the widest gap, p, the share between', sel: '.ie-strip .ln-tile', n: 5 },
    { what: 'the sentence, with each pair’s interval', sel: '.ie-say', text: /B is above A by 0\.59 g \(between 0\.34 and 0\.84 g\).*A and C are not shown to differ/ },
    { what: 'a lane a shift with its interval', sel: '.ie-an-pic g', n: 3 }, { what: 'a chip a shift', sel: '.chip-row .chip', n: 3 },
    { what: 'a new shift by name, and the pad', sel: '.ie-pad .ie-key', n: 13 }, { what: 'Levene’s check on the spreads', sel: '.ie-check', text: /Levene/ },
  ] },
  { name: 'Analysis — counts in a table', path: `#/analysis/${sd.analysisTableId}`, must: [
    { what: 'the band’s verdict', sel: '.ln-band', text: /Linked/ },
    { what: 'five tiles — counted, χ², p, Cramér’s V, how sure', sel: '.ie-strip .ln-tile', n: 5 },
    { what: 'the sentence, naming the cell beyond ±2', sel: '.ie-say', text: /Lane 3 has more Misprint than chance would give \(12 against 6\.0\)/ },
    { what: 'the table drawn — nine cells, one marked more', sel: '.ie-tbl td.is-more', n: 1 }, { what: 'a row chip and a column chip for each name', sel: '.chip-row .chip', n: 6 },
    { what: 'the whole table pasted', sel: '.ie-paste textarea' },
  ] },
  { name: 'Analysis — what moves with what', path: `#/analysis/${sd.analysisRelateId}`, must: [
    { what: 'the band’s verdict — linked, not straight, amber', sel: '.ln-band', text: /Linked, not straight/ },
    { what: 'five tiles — pairs, the link, per unit, explained, the shape', sel: '.ie-strip .ln-tile', n: 5 },
    { what: 'the sentence, in the floor’s units', sel: '.ie-say', text: /Seal strength rises 0\.145 N for every extra 1 °C of jaw temperature/ },
    { what: 'the scatter — twelve points, the line and its band', sel: '.ie-an-scatter .ie-an-dot', n: 12 }, { what: 'the prediction box', sel: '.ie-predict input' },
    { what: 'a box a driver and one for the result, and rows pasted', sel: '.ie-relrow input', n: 2 }, { what: 'the shape check', sel: '.ie-check', text: /too straight/ },
  ] },
  /* A RELIABILITY STUDY WITH THE W5 PARTS (25 October — FC-059 repair times, FC-055 short stops, FC-061 growth, FC-060 Weibull, FC-015 calls): the stops timed — their repair time and availability tiles, the sentence, a bar for each stop, the reasons, a fitter's time — the growth with its picture and what was not run, the count's own chips; the calls and the part that wears a chip away */
  { name: 'Reliability study — repairs, growth, calls and a part that wears', path: `#/reliability/${sd.reliabilityFamilyId}`, must: [
    { what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 },
    { what: 'a count a chip — stops, calls, the part that wears', sel: '.rl-seen .chip', n: 3 },
    { what: 'the Repair time and Available tiles beside the study’s own', sel: '.ie-strip .ln-tile .ln-k', text: /^Repair time$/ },
    { what: 'the MTBF now tile — the growth', sel: '.ie-strip .ln-tile .ln-k', text: /^MTBF now$/ },
    { what: 'the repair sentence — typically how long, availability, halving it', sel: '[data-repair]', text: /timed: typically .+ to clear .+Available \d+%/ },
    { what: 'a bar for each stop — waiting and fixing', sel: '.rl-stopbars rect.rl-bar-fix', n: 6 },
    { what: 'what the stops were — the reasons', sel: '.rl-reasons li', n: 2 },
    { what: 'a fitter’s time in money', sel: '[data-fitter]', text: /a repair/ },
    { what: 'the growth — its sentence, the picture, what was not run', sel: '.rl-growth-p [data-growth]' },
    { what: 'the growth picture — the fitted curve', sel: '.rl-growthfig path.rl-fit' },
    { what: 'what the growth did not run', sel: '.rl-caveats li', text: /fit test is not run here/ },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  { name: 'Reliability study', path: `#/reliability/${sd.reliabilityId}`, must: [
    { what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 }, { what: 'Belongs to — its line and project, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ },
    { what: 'the band', sel: '.ln-band' },
    { what: 'the watch, running, with its stop', sel: '.rl-watch.is-on .rl-go', text: /^Stop the watch$/ },
    { what: 'a button for each thing counted, all on the one watch (22 October: "three buttons ... three data sets")', sel: '.rl-buttons .rl-event', n: 2 },
    { what: 'the stop button — a tap each one seen', sel: '.rl-event', text: /^Stop/ },
    { what: 'counted side by side — a row each, with its MTBF', sel: '.rl-together tbody tr', n: 2 },
    { what: 'each thing counted a chip away', sel: '.rl-seen .chip', n: 2 },
    { what: 'the five tiles — MTBF, failure rate, watched, stops, what it costs', sel: '.ie-strip .ln-tile', n: 5 },
    { what: 'MTBF first, with its bounds', sel: '.ie-strip .ln-tile:first-child .ln-of', text: /mean time between stops · 90% sure/ },
    { what: 'what it means', sel: '.ln-ins li' },
    { what: 'the stops against watched hours, drawn — the failures beside them', sel: '.rl-fig .rl-step' },
    { what: 'the other thing counted drawn on the same watch', sel: '.rl-fig .rl-other' },
    { what: 'the gaps between stops, drawn — a bar a stretch of running', sel: 'svg.rl-gaps rect.ln-bar', n: 3 },
    { what: 'what it costs in money', sel: '.rl-cost', text: /^What it costs: .+min stood an hour of running/ },
    { what: 'the days', sel: '.rl-days tbody tr' },
    { what: 'the commentary — each remark kept', sel: '.rl-rem li[data-remark]', n: 2 },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  /* PROJECTS LISTS THE PROJECTS (docs/STRUCTURE.md §5.6, B5) — the kinds as counts, a row a project */
  { name: 'Projects', path: '#/projects', must: [
    { what: 'the kinds as chips that are the counts — All first', sel: '.proj-list .part-filters .chip', text: /^\d+All$/ },
    { what: 'a row a project — its kind and who leads it, its lines and its handover', sel: '.proj-list li.part-row', n: 3 },
    { what: 'All lines, to narrow it to one', sel: '.proj-list select.proj-line-f' },
  ] },
  /* NEW JOB: the three kinds of project, chosen from the situation (the words box and the library went with the method builder, 20 October) */
  { name: 'New project', path: '#/projects?new=1', must: [
    { what: 'Faultline’s three kinds of project, each from its situation', sel: '.proj-model-opt', n: 3 },
  ] },
  /* A VIDEO STUDY (18 October, docs/VIDEO.md): footage read for the work at each station, reviewed, worked out as a line balance */
  { name: 'Video studies', path: '#/video', must: [
    { what: 'a row a study — its standing, its kind, its footage and line', sel: '.lt-li[data-study]' },
    { what: 'New video study', sel: '.pace-head-actions button', text: /^New video study$/ },
    /* before a long study (19 October, docs/VIDEO-FEASIBILITY.md) */
    { what: 'Can this phone film a long study?', sel: '.vck-door button', text: /^Can this phone film a long study\?$/ },
  ] },
  /* New, from what is to be found out (19 October, docs/VIDEO-DESIGN.md D1, D5): the study chosen, how to film it before the footage */
  { name: 'New video study', path: '#/video?add=1', must: [
    { what: 'what do you want to find out', sel: '.vid-new textarea' },
    { what: 'the study — read from the words, or picked', sel: '.vid-new select[aria-label="The study"]' },
    { what: 'how to film it, before the footage', sel: '.vid-new .vfit-plan summary', text: /^How to film it — side-on, raised · Measured from footage today$/ },
    { what: 'the footage', sel: '.vid-new input[type=file]' },
  ] },
  /* the phone check (19 October, docs/VIDEO-FEASIBILITY.md): what the phone offers, then the test — what it found shows only after a run, which video-check.mjs drives */
  { name: 'Can this phone film a long study?', path: '#/video-check', must: [
    { what: 'its question', sel: 'h1', text: /^Can this phone film a long study\?$/ },
    { what: 'what this phone offers — what it films, the screen, room, the battery', sel: '.vck-offers .vck-line', n: 4 },
    { what: 'how long — two minutes to an hour', sel: '.vck-len [role=radio]', n: 4 },
    { what: 'Start the test', sel: '.vck-start .btn-primary', text: /^Start the test$/ },
  ] },
  { name: 'A video study', path: `#/video/${sd.videoStudyId}`, must: [
    { what: 'the tool shell — More ▾ and Report ▾ in its header', sel: '.part-head .part-menu-b', n: 2 }, { what: 'Belongs to — its line and project, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ },
    { what: 'where it stands — never verified while one is to review', sel: '[data-standing]', text: /to review · \d+ accepted/ },
    /* the facts, and where the footage is: said after them when it is here, or in the player when it is not (the seed's is not) */
    { what: 'the footage and its facts, and where the footage is (on this device only, waiting to go up, in the cloud, or over what the cloud takes)', sel: '.vid-panel', text: /^(?=[\s\S]*line4-morning\.webm — 0:32\.0 · 1280×720)(?=[\s\S]*(kept on this device only|on this device, waiting to go up to the cloud|in the cloud — your other devices play it|over the \d+ MB the cloud takes|sign in to send it to the cloud|not on this device yet))/ },
    /* is this footage fit for the study? (19 October, docs/VIDEO-DESIGN.md D6): the verdict, what is not fine, the rest folded, what it can tell, how to film it */
    { what: 'is this footage fit for the study — the verdict', sel: 'section.vid-fit [data-fit-headline]', text: /^This footage suits line balance, with 3 things to watch\.$/ },
    { what: 'the checks — what is not fine, the rest folded', sel: 'section.vid-fit .vfit-fine summary', text: /^Fine: .*the camera/ },
    { what: 'what this footage can tell you — measured, worked out, interpreted', sel: 'section.vid-fit .vfit-claims li', n: 7 },
    { what: 'how to film it', sel: 'section.vid-fit .vfit-plan summary', text: /^How to film it/ },
    { what: 'the stations in view', sel: '.vid-zone-rows li', n: 3 },
    { what: 'every event on its station’s lane', sel: '.vid-bar', n: 12 },
    { what: 'every event in the list, how it is known and what was decided — each end’s ±', sel: '.vid-ev .vid-ev-how', text: /each end ±0\.05 s/ },
    { what: 'an event the footage flags — the light jumped', sel: '.vid-ev .vid-ev-flag', text: /the light jumped here — check it on the footage/ },
    { what: 'each station’s work with its 95% interval, cycles of those needed, and no movement between', sel: '.vid-table tbody tr', n: 3 },
    { what: 'each station’s workload drawn — work and no movement', sel: 'svg.vid-load [data-station]', n: 3 },
    { what: 'the people’s work stacked against takt', sel: '.vid-stacks svg' },
    { what: 'what it says, each line said how it is known', sel: '.vid-findings li[data-kind]' },
    { what: 'asked in words', sel: '.vid-ask input' },
    { what: 'the report', sel: '.pace-head-actions button', text: /^Report$/ },
  ] },
  /* LINE TALK (20 October, docs/LINE-TALK.md): the AI tool — one person talks on the line; every talk on a line, newest first */
  { name: 'Line Talk', path: `#/talk?line=${sd.wsId}`, must: [
    { what: 'its name', sel: 'h1', text: /^Line Talk$/ },
    { what: 'start one on this line', sel: '.tk-new .tk-start', text: /^Start a Line Talk on / },
    { what: 'every talk on the line, what was said in a line', sel: '.lt-row', text: /Line 7 — morning walk[\s\S]*4 pieces said/ },
  ] },
  /* a talk: the conversation as it was left — pieces the phone wrote down, one corrected, a photo, a typed line, one not written down (recorded before 21 October), one written down with no recording; a report asked for and Line Talk's answer with the document it wrote (slice 2, 20 October) — and the box to carry on, as a chat's (21 October) */
  { name: 'A Line Talk', path: `#/talk/${sd.talkId}`, must: [
    { what: 'the tool shell — Rename and Delete in More ▾', sel: '.part-head .part-menu-b', text: /^More/ },
    { what: 'where it is — the line, every Line Talk', sel: '.pl-eyebrow', text: /^LINE TALK · .+ › · Every Line Talk ›$/ },
    { what: 'what was said, in a line — its answers and document counted', sel: '.tk-sum', text: /^4 pieces said, 2 min · 1 photo · 2 typed · 1 answer · 1 document — 1 not written down\.$/ },
    { what: 'what Line Talk knows — the line’s records, said in a line', sel: '.tk-knows summary', text: /^What Line Talk knows — .+: \d+ machines? · / },
    { what: 'every turn in the order it happened', sel: '.tk-turn', n: 8 },
    { what: 'a correction over what was heard, the heard kept beside it', sel: '.tk-turn .tk-heard', text: /^As heard: Starting at the bagger, it is running at about sixty a minute/ },
    { what: 'a piece not written down — why, the recording kept, and how to type the words over it', sel: '.tk-turn .tk-fail', text: /^Not written down — No signal while it was said, so the phone could not write it down\. The recording is kept — play it, and type what was said with Correct\.$/ },
    { what: 'a piece written down by a phone that does not record — the words, no recording', sel: '.tk-turn[data-kind=said]:not(:has(> span.sub)):not(:has(audio))', text: /Back at the bagger\. The jaws are clean now\./ },
    { what: 'a photo by its label', sel: '.tk-turn[data-kind=photo] .tk-label', text: /^P1$/ },
    { what: 'Line Talk’s answer, its words as written', sel: '.tk-turn.is-reply .tk-ans', text: /Here is the line-walk report/ },
    { what: 'the document it wrote, to open, edit and print', sel: '.tk-turn.is-reply .tk-doc', text: /Line-walk report[\s\S]*Line 7 — morning walk[\s\S]*2 sections · 1 photo[\s\S]*Open — edit and print/i },
    { what: 'a figure it was not given, said to check', sel: '.tk-turn.is-reply .tk-unsure', text: /^Check before you use it: 8 is not in what was said or in Faultline’s records\.$/ },
    { what: 'the microphone in the box — talk, and the words come up in it (21 October)', sel: '.tk-bar .tk-mic[aria-label="Talk into the box"]' },
    { what: 'a photo', sel: '.tk-bar .tk-photo[aria-label="Add a photo"]' },
    { what: 'the shortcuts to the usual documents', sel: '.tk-bar .tk-chip', n: 4 },
    { what: 'typing into it', sel: '.tk-bar .tk-type textarea' },
    { what: 'Send — nothing new to answer yet', sel: '.tk-bar .tk-send', text: /^Send$/ },
    { what: 'how: the microphone or typing', sel: '.tk-bar .tk-hint', text: /^Tap the microphone and talk, or type — add a photo whenever it helps\.$/ },
  ] },
  /* the document Line Talk wrote, opened (slice 2): what it is, each section with its points saying where they come from, its photo with its caption, the PDF */
  { name: 'A Line Talk document', path: `#/talk/${sd.talkId}?doc=seedt-8`, must: [
    { what: 'where it is — back to the talk', sel: '.tk-docv .pl-eyebrow', text: /^LINE TALK · DOCUMENT · ‹ Back to the talk$/ },
    { what: 'a figure it was not given, said to check', sel: '.tk-docv .tk-unsure', text: /^Check before you send it: 8 is not in what was said or in Faultline’s records\.$/ },
    { what: 'its sections', sel: '.tk-dsec', n: 2 },
    { what: 'each point with where it comes from', sel: '.tk-dpt select[aria-label="Where it comes from"]', n: 4 },
    { what: 'its photo, labelled, with its caption to edit', sel: '.tk-dph[data-photo=P1]', text: /P1/ },
    { what: 'on paper', sel: '.tk-dacts button', text: /^Save as PDF$/ },
  ] },
  { name: 'A capability study', path: `#/capability/${sd.studyId}`, must: [{ what: 'the tool shell — More ▾ and Report ▾ in its band', sel: '.ln-band .part-menu-b', n: 2 }, { what: 'Belongs to — its line and project, Change', sel: '.ie-place .part-belongs-c', text: /^Change$/ }, { what: 'the readings, drawn', sel: 'svg.ie-dots' },
    { what: 'before capability — the three checks', sel: '.ie-checks .ie-check' }, { what: 'the histogram', sel: 'svg.ie-hist rect.ie-bar' },
    { what: 'the band', sel: '.ln-band' }, { what: 'the tiles', sel: '.ie-strip .ln-tile' }, { what: 'the action plan', sel: '.ln-plan-p' }, { what: 'the closing line', sel: '.ln-close' },
    /* IN MONEY (knowledge/specs/FC-156-capability-money.md, 24 October): the give-away tile and the sentence with its because, from the packs a shift and £ a kg typed on the study */
    { what: 'the money — Give-away a pack, a shift and a week (FC-156)', sel: '.ie-strip .ln-tile', text: /^Give-away/ }, { what: 'the money sentence with its because', sel: '.ie-say.ie-money', text: /^Give-away .*because the mean/ }] },
];
