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
  { name: 'Control room', path: '#/', must: [
    { what: 'its heading', sel: 'h1, h2', text: /Control room/ },
    { what: 'Your factory — every line', sel: '.fac-floor' },
    { what: 'this week, across every line and job', sel: '.jb-week' },
    { what: 'the jobs on one timeline', sel: '.jb-gantt', desk: true },
  ] },
  { name: 'Your factory', path: '#/factory', must: [{ what: 'the lines in floor order', sel: '.fac-lines' }] },
  { name: 'A line — its own page', path: `#/lines/${sd.line7WsId}`, must: [
    { what: 'the line, machine by machine — the tour', sel: '.tour-says' },
    { what: 'a card a machine', sel: '.tour-card', n: 2 },
  ] },
  { name: 'Programs', path: '#/programs', must: [{ what: 'machine by machine', sel: '.mt-list' }, { what: 'a row a program (16 October: one row, its boxes a tap away)', sel: '.mt-list .pgr' }] },
  { name: 'Problems', path: '#/snags', must: [{ what: 'the register, a line at a time', sel: '.qsl-rows' }] },
  { name: 'A stage-gate job — its front page', path: `#/project/${sd.projectId}`, must: [
    { what: 'the verdict', sel: '.vd' }, { what: 'Needs you', sel: 'h2, h3', text: /Needs you/ }, { what: 'where each machine is', sel: '.fp-grid' },
  ] },
  /* one row a program, its test on the row, one form (16 October: "too many views and doors") */
  { name: 'Programs — a stage-gate job', path: `#/project/${sd.projectId}/programs`, must: [
    { what: 'the programs in a sentence', sel: '.pp-says' },
    { what: 'the states worth showing, each a filter', sel: '.pp-chip', n: 2 },
    { what: 'a row a program, machine by machine', sel: '.pgr-list .pgr', n: 4 },
    { what: 'how its test went, on its row', sel: '.pgr .ptx-go' },
    { what: 'a program added to a machine', sel: '.pgr-add-open' },
  ] },
  { name: 'Commission', path: `#/project/${sd.projectId}/testing`, must: [
    /* the four gates and the timeline are one Plan, its tabs (16 October, docs/STAGEGATE-UX.md) */
    { what: 'the plan’s tabs, Commission on', sel: '.plt .plt-t.on', text: /^Commission/ },
    { what: 'Needs you', sel: '.nd-list' }, { what: 'the board, machine by machine', sel: '.ig-grid', desk: true },
    { what: 'the board as a card a machine', sel: '.igm-card', phone: true },
  ] },
  { name: 'The plan', path: `#/project/${sd.projectId}/plan`, must: [{ what: 'the Gantt', sel: '.gt-body' }, { what: 'the plan’s tabs, Timeline on', sel: '.plt .plt-t.on', text: /^Timeline/ }] },
  { name: 'A 6M job — its front page', path: `#/project/${sd.pacedProjectId}`, must: [
    { what: 'the verdict', sel: '.vd' }, { what: 'the fishbone, drawn', sel: 'svg.fb-svg' },
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
  { name: 'The work against takt', path: `#/w/${sd.wsId}/standards/${sd.lineStandardId}?at=balance&view=work`, must: [{ what: 'each person’s work, stacked against takt', sel: 'svg.wb-svg' }] },
  { name: 'Line standard — a map', path: `#/w/${sd.wsId}/standards/${sd.lineStandardId}`, must: [
    { what: 'the board', sel: '.ls-board' }, { what: 'who does what', sel: '.ls-side' },
  ] },
  ...(cap ? [{ name: 'Line standard — long notes, tall shapes', path: `#/w/${cap.wsId}/standards/${cap.lanesId}`, must: [
    { what: 'the board', sel: '.ls-board' },
    { what: 'the bottleneck said first', sel: '.ls-bn-sum' },
    { what: 'words up a tall, narrow shape', sel: '.ls-shape-t.is-up' },
  ] }] : []),
  { name: 'A value stream map', path: `#/value-stream/${sd.lineMapId}`, must: [{ what: 'the grid', sel: '.vs-grid' }] },
  { name: 'A SMED', path: `#/smed/${sd.changeoverId}`, must: [{ what: 'the grid', sel: '.vs-grid' }, { what: 'what it says', sel: '.ie-says' }] },
  { name: 'A loss count', path: `#/losses/${sd.lossId}`, must: [{ what: 'the waterfall, drawn', sel: 'svg.lf-fall' }, { what: 'what it says', sel: '.ie-says' }] },
  { name: 'Work sampling', path: `#/sampling/${sd.samplingId}`, must: [{ what: 'the round', sel: '.ws-round' }] },
  { name: 'A capability study', path: `#/capability/${sd.studyId}`, must: [{ what: 'the readings, drawn', sel: 'svg.ie-dots' }] },
];
