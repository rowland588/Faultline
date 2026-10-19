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
 * — only at that width. */
export const PAGES = (sd, cap) => [
  { name: 'Control room', path: '#/room', must: [
    { what: 'its heading', sel: 'h1, h2', text: /Control room/ },
    { what: 'Your factory — every line', sel: '.fac-floor' },
    { what: 'this week, across every line and job', sel: '.jb-week' },
    { what: 'the jobs on one timeline', sel: '.jb-gantt', desk: true },
    /* the lean page (17 October, slice 5; lib/roomLean): each number in the band says what it is of, the money is the slips' cost, and the board closes on one line */
    { what: 'what each number in the band is of', sel: '.jb-hero .jb-of', n: 3 },
    { what: 'what the slips cost', sel: '.jb-stat.is-money' },
    { what: 'the closing line', sel: '.jb > .ln-close' },
  ] },
  { name: 'Your factory', path: '#/factory', must: [{ what: 'the lines in floor order', sel: '.fac-lines' },
    /* the lean page (17 October, slice 5b; lib/factoryLean): the tiles — lines, problems open, late, a day of the factory in margin — and the closing line */
    { what: 'the tiles, a day of the factory among them', sel: '.fac .sg-tiles .ln-tile', n: 4 },
    { what: 'the closing line', sel: '.fac .ln-close' }] },
  { name: 'A line — its own page', path: `#/lines/${sd.line7WsId}`, must: [
    { what: 'the line, machine by machine — the tour', sel: '.tour-says' },
    { what: 'a card a machine', sel: '.tour-card', n: 2 },
    /* the floor's two acts first, and the stopwatch among the tools (16 October, docs/UPGRADE-AUDIT.md F1) */
    { what: 'Time a stop', sel: '.pl-time' },
    { what: 'the stopwatch and its Pareto, among the tools', sel: '.pl-tool.is-stops' },
    /* the line is the hub (17 October, BLUEPRINT Stage 3; lib/lineLean, lib/lineProducts) */
    { what: 'the five tiles — problems, programs, products, stops, a day of the line', sel: '.pl-tiles .ln-tile', n: 5 },
    { what: 'its products, a row a product with its four answers', sel: '.pl-prod:not(.is-head) .pl-ready', n: 4 },
    { what: 'the line report', sel: 'button', text: /^Line report$/ },
    { what: 'the closing line', sel: '.pl > .ln-close' },
  ] },
  { name: 'Programs', path: '#/programs', must: [{ what: 'machine by machine', sel: '.mt-list' }, { what: 'a row a program (16 October: one row, its boxes a tap away)', sel: '.mt-list .pgr' }] },
  { name: 'Problems', path: '#/snags', must: [{ what: 'the register, a line at a time', sel: '.qsl-rows' },
    /* the lean page (17 October, slice 4; lib/problemsLean): its chips are its tiles, each a filter; the closing line names the worst open problem */
    { what: 'the closing line', sel: '.ln-close' }] },
  { name: 'A stage-gate job — its front page', path: `#/project/${sd.projectId}`, must: [
    { what: 'the verdict', sel: '.vd' }, { what: 'Needs you', sel: 'h2, h3', text: /Needs you/ }, { what: 'where each machine is', sel: '.fp-grid' },
    /* the band's five tiles — the same the one-page status and the full report count (17 October, docs/LEAN-PAGE.md) */
    /* on a phone the band is the answer and the status report (the phone pass, 5 October): its tiles are the desk's */
    { what: 'the band’s tiles — handover, late of what is still to do, critical, fixes open, what the slip costs', sel: '.vd .vd-tile', n: 5, desk: true },
    /* the job's places, its machines each a page (16 October, docs/STAGEGATE-UX.md) */
    { what: 'its machines in the rail, each a page', sel: '.nv-rail .nv-grp-l', text: /^Machines$/i, desk: true },
  ] },
  { name: 'A machine — its own page', path: `#/project/${sd.projectId}/machine/${sd.machineId}`, must: [
    { what: 'its four gates in a row', sel: '.mpg-steps .mpg-step', n: 4 },
    { what: 'its stages and tests, gate by gate', sel: '.mpg-main .mp-gate' },
    { what: 'its programs', sel: '.mpg-side .pp-m' },
    /* the lean page (17 October; lib/stageGatePages machineTiles): gates through, late, fixes, no fix yet, the job's money — and the closing line */
    { what: 'the five tiles — the job’s money last', sel: '.mpg > .sg-tiles .ln-tile', n: 5 },
    { what: 'the closing line', sel: '.mpg > .ln-close' },
  ] },
  /* one row a program, its test on the row, one form (16 October: "too many views and doors") */
  { name: 'Programs — a stage-gate job', path: `#/project/${sd.projectId}/programs`, must: [
    { what: 'the programs in a sentence', sel: '.pp-says' },
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
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  { name: 'Install', path: `#/project/${sd.projectId}/install`, must: [
    { what: 'the plan’s tabs, Install on', sel: '.plt .plt-t.on', text: /^Install/ },
    { what: 'the tiles — done, late, problems, not added yet, the money', sel: '.sg-tiles .ln-tile', n: 5 },
    { what: 'Needs you', sel: '.cg-needs' },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  { name: 'Problems — a stage-gate job', path: `#/project/${sd.projectId}/fixes`, must: [
    { what: 'the tiles — open, critical, late, no fix yet, the money', sel: '.sg-tiles .ln-tile', n: 5 },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  { name: 'Materials', path: `#/project/${sd.pacedProjectId}/materials`, must: [
    { what: 'the tiles — here, late, waiting, no date, the money', sel: '.sg-tiles .ln-tile', n: 5 },
    { what: 'what we are waiting on, a row a material', sel: '.mt-list .mt-row', n: 2 },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  /* the day (17 October, the lean page slice 5c; lib/dayLean): its update to send, the story counted in tiles, the job's money last, the closing line */
  { name: 'The day', path: `#/project/${sd.projectId}/day`, must: [
    { what: 'the update to send, at the top', sel: '.dy-head .btn-primary', text: /PDF/ },
    { what: 'the tiles — done, late, went wrong, found, the job’s money', sel: '.cm-screen > .sg-tiles .ln-tile', n: 4 },
    { what: 'the closing line', sel: '.cm-screen > .ln-close' }] },
  { name: 'The plan', path: `#/project/${sd.projectId}/plan`, must: [{ what: 'the Gantt', sel: '.gt-body' }, { what: 'the plan’s tabs, Timeline on', sel: '.plt .plt-t.on', text: /^Timeline/ },
    /* the lean page (17 October; lib/stageGatePages planTiles): the header's count line moved into the tiles, the job's money last; the closing line */
    { what: 'the tiles — done of the dates, late, still ahead, the job’s money', sel: '.cm-screen > .sg-tiles .ln-tile', n: 4 },
    { what: 'the closing line', sel: '.cm-screen > .ln-close' }] },
  { name: 'A 6M job — its front page', path: `#/project/${sd.pacedProjectId}`, must: [
    { what: 'the verdict', sel: '.vd' }, { what: 'the fishbone, drawn', sel: 'svg.fb-svg' },
    /* the lean page (17 October, docs/LEAN-PAGE.md slice 4; lib/sixmLean): the 6M report's five tiles on the band — the desk's, as the stage gate's */
    { what: 'the band’s tiles — the gap, problems, roots found, countermeasures, holding', sel: '.vd .vd-tile', n: 5, desk: true },
  ] },
  { name: 'The 6M board', path: `#/project/${sd.pacedProjectId}/board`, must: [{ what: 'the six bones', sel: '.bd6-lanes' }] },
  { name: 'The Pareto', path: `#/project/${sd.pacedProjectId}/pareto`, must: [{ what: 'the ranked losses', sel: '.pr-table' }] },
  { name: 'The lever tree', path: `#/project/${sd.treeProjectId}/tree`, must: [{ what: 'the tree, drawn', sel: '.lt-root' }] },
  { name: 'Line capacity — one line', path: `#/w/${sd.wsId}/standards/${sd.lineStandardId}?at=balance`, must: [
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
    { what: 'each tool’s sentence', sel: '.tg-strip .tg-cell', n: 3 },
    { what: 'the line station by station', sel: '.tg-st', n: 3 },
    { what: 'each person against takt', sel: '.tg-bars .wb-bar', n: 3 },
    /* the lean page (17 October): the band, each tool's figure as a tile, the closing line */
    { what: 'the band', sel: '.tg .ls-head.is-band' }, { what: 'the tiles — each tool’s own figure', sel: '.tg .ln-tiles .ln-tile', n: 5 },
    { what: 'the closing line', sel: '.tg .ln-close' },
  ] },
  { name: 'Line standard — a map', path: `#/w/${sd.wsId}/standards/${sd.lineStandardId}`, must: [
    { what: 'the board', sel: '.ls-board' }, { what: 'who does what', sel: '.ls-side' },
  ] },
  ...(cap ? [{ name: 'Line standard — long notes, tall shapes', path: `#/w/${cap.wsId}/standards/${cap.lanesId}`, must: [
    { what: 'the board', sel: '.ls-board' },
    { what: 'the bottleneck said first', sel: '.ls-bn-sum' },
    { what: 'words up a tall, narrow shape', sel: '.ls-shape-t.is-up' },
  ] }] : []),
  { name: 'A value stream map', path: `#/value-stream/${sd.lineMapId}`, must: [{ what: 'the grid', sel: '.vs-grid' },
    { what: 'the band', sel: '.ln-band' }, { what: 'its seven cards', sel: '.vs-cards .vs-card2' }, { what: 'the action plan', sel: '.ln-plan-p' }, { what: 'the closing line', sel: '.ln-close' }] },
  { name: 'A SMED', path: `#/smed/${sd.changeoverId}`, must: [{ what: 'the grid', sel: '.vs-grid' }, { what: 'what it says', sel: '.ie-says' },
    /* the lean page (17 October, slice 6; lib/ie/changeoverLean): the band, five tiles in the strip's place, the action plan, the closing line */
    { what: 'the band', sel: '.ln-band' }, { what: 'the five tiles — now, inside the stop, planned to, stopped in packs and £, bought back', sel: '.ie-strip .ln-tile', n: 5 },
    { what: 'the action plan', sel: '.ln-plan-p' }, { what: 'the closing line', sel: '.ln-close' }] },
  { name: 'A loss count', path: `#/losses/${sd.lossId}`, must: [
    { what: 'the waterfall, drawn', sel: 'svg.lf-fall' }, { what: 'what it says', sel: '.ie-says' },
    /* the lean page (17 October, docs/LEAN-PAGE.md): the band, the tiles, the causes, the action plan, the closing line */
    { what: 'the band — what, where, the day and the shift', sel: '.ln-band' }, { what: 'the tiles — good packs, lost, stops, rejects, what it cost', sel: '.ln-tiles .ln-tile', n: 5 },
    { what: 'the top causes', sel: '.lf-tab .lf-row' }, { what: 'the action plan — the countermeasure raised from its biggest bar', sel: '.ln-plan .ln-row' },
    { what: 'the closing line', sel: '.ln-close' },
  ] },
  /* the lean page (17 October, slice 6): the band, the tiles in the strip's place, the action plan, the closing line */
  { name: 'Work sampling', path: `#/sampling/${sd.samplingId}`, must: [{ what: 'the round', sel: '.ws-round' },
    { what: 'the band', sel: '.ln-band' }, { what: 'the five tiles — what it costs among them', sel: '.ie-strip .ln-tile', n: 5 }, { what: 'the action plan', sel: '.ln-plan-p' }, { what: 'the closing line', sel: '.ln-close' }] },
  /* THE FRONT DOOR (18 October, docs/BLUEPRINT.md §3): the new product starts with what you need, in your words */
  { name: 'The front door', path: '#/', must: [
    { what: 'the question, first', sel: '.fd-ask h1', text: /^What do you need to get done\?$/ },
    { what: 'the box to say it in', sel: '.fd-box textarea' },
    { what: 'what is under way — every project in a line', sel: '.fd-jobs li[data-project]' },
    { what: 'the library to start from — Faultline’s eleven among it', sel: '.fd-lib .fw-card[data-start^="l:"]', n: 11 },
    { what: 'and its established three — the lever tree among them', sel: '.fd-lib .fw-card[data-start^="e:"]', n: 3 },
    { what: 'the tools to use on their own', sel: '.fd-tools li[data-tool]', n: 9 },
    { what: 'the new product’s places — Home first', sel: '.nv-rail .nv-ri', text: /Home/, desk: true },
  ] },
  /* METHODS OF ONE'S OWN (18 October, docs/PLATFORM-STATUS.md slice 3; lib/flow): the library, a method read and written, and a project running one — the lean page with the method's stages as its picture */
  { name: 'Methods', path: '#/methods', must: [{ what: 'a card a method', sel: '.fw-lib .fw-card' },
    { what: 'describe what you need — the studio', sel: '.pace-head-actions button', text: /^Describe what you need$/ },
    { what: 'Faultline’s library — each to adapt or use as it is', sel: '.fw-card.is-library', n: 11 },
    { what: 'Faultline’s established methods, each on its own screens', sel: '.fw-card.is-established', n: 3 },
    { what: 'find a method by a word', sel: '.fw-find input' }] },
  /* ONE WAY TO START (18 October, docs/BLUEPRINT.md §3): what is needed in words first, then the established three, then the library */
  { name: 'New job', path: '#/projects?new=1', must: [
    { what: 'what you need, in your words — first', sel: '.proj-say textarea' },
    { what: 'Faultline’s established three', sel: '.proj-model-opt', n: 3 },
    { what: 'the library — Faultline’s six among it', sel: '.proj-lib .fw-card', n: 6 },
  ] },
  /* THE STUDIO (the vision slice): what is needed in words, the library beside it */
  { name: 'Design a method', path: '#/design', must: [
    { what: 'what you need, in your words', sel: '.fw-ask-box textarea' },
    { what: 'the library to start from', sel: '.fw-start .fw-card', n: 6 },
  ] },
  { name: 'Design a method — from Faultline’s SMED method', path: '#/design?template=changeover-reduction', must: [
    { what: 'the conversation', sel: '.fw-turn' },
    { what: 'the method as it stands — its stages', sel: '.fw-preview .fw-prop-st', n: 4 },
    { what: 'what it measures, before and after', sel: '.fw-prev-m li' },
    { what: 'approve it and start a project', sel: '.fw-keep button', text: /^Approve it and start a project$/ },
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
  { name: 'A method from Faultline’s library', path: `#/methods/${sd.smedMethodId}`, must: [
    { what: 'a step done with one of the app’s tools', sel: '.fw-step-b', text: /with SMED/ },
    { what: 'what it measures', sel: '.fw-measures li' },
  ] },
  /* A TOOL MADE FROM BLOCKS (18 October, lib/flow/analysis): a step that is a log, and what it works out */
  { name: 'A method made of logs', path: `#/methods/${sd.logMethodId}`, must: [
    { what: 'a step that is a log — its columns and what it works out', sel: '.fw-step-b', text: /a log .*works out rejects a day, biggest reason/ },
    { what: 'what it measures — fed by the two logs', sel: '.fw-measures li', text: /Rejects a day/ },
  ] },
  { name: 'A project on SMED’s method', path: `#/project/${sd.smedProjectId}`, must: [
    { what: 'the measure, the first tile', sel: '.ln-tiles .ln-tile', text: /Changeover minutes/i },
    { what: 'what it measures — before → now, its readings', sel: '.fw-measured li' },
  ] },
  { name: 'A method', path: `#/methods/${sd.methodId}`, must: [
    { what: 'its stages, a step a line', sel: '.fw-stage .fw-step-b', n: 3 },
    { what: 'what each gate needs', sel: '.fw-gate .fw-cond-b' },
    { what: 'the projects on it', sel: '.fw-list li' },
    { what: 'change it with the assistant (slice 5)', sel: '.pace-head-actions button', text: /^Change it with the assistant$/ },
  ] },
  { name: 'A method — a draft', path: `#/methods/${sd.methodDraftId}`, must: [{ what: 'can it run? — the validator in words', sel: '.fw-check-panel' }] },
  { name: 'A project on a method', path: `#/project/${sd.flowProjectId}`, must: [
    { what: 'the band', sel: '.ln-band' }, { what: 'the five tiles — steps done, gates passed, late, did not pass, problems open', sel: '.ln-tiles .ln-tile', n: 5 },
    { what: 'its stages in a strip, each in its colour and word', sel: '.fw-strip .fw-sg', n: 4 },
    { what: 'the stage’s steps, machine by machine', sel: '.fw-stage-run .fw-row', n: 4 },
    { what: 'its gate, in a line', sel: '.fw-gate-line' },
    { what: 'the action plan', sel: '.ln-plan .ln-row' }, { what: 'the closing line', sel: '.ln-close' },
    { what: 'its stages in the rail', sel: '.nv-rail .nv-grp-l', text: /^Method$/i, desk: true },
    { what: 'ask about it — the questions the app answers itself (slice 5)', sel: '.fw-ask .fw-chip-b', n: 4 },
    { what: 'what has happened — its activity log', sel: '.fw-log li' },
  ] },
  { name: 'A capability study', path: `#/capability/${sd.studyId}`, must: [{ what: 'the readings, drawn', sel: 'svg.ie-dots' },
    { what: 'the band', sel: '.ln-band' }, { what: 'the tiles', sel: '.ie-strip .ln-tile' }, { what: 'the action plan', sel: '.ln-plan-p' }, { what: 'the closing line', sel: '.ln-close' }] },
];
