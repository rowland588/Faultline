/* The ROOM demo — the consultant's performance, start to finish, on the live
 * app. Different job from the guided demo: that one teaches a solo prospect;
 * this one scripts a person STANDING IN A ROOM, driving the real product on a
 * big screen. Every card is written to be read aloud — it says what we're
 * about to press and what it will show, then waits for the press so the room
 * watches the app respond. The full arc: read the board → log a loss live and
 * watch the bar move → drill into the worst asset → its own Pareto → deeper →
 * the £ prize → zoom back out to the line → the open case, whys and running
 * study → the proven receipt → the camera world → the meeting → the close.
 * Cards render presentation-sized (see startWizard's room option). */
import type { WStep } from '../ui/Wizard';

export const ROOM_TOUR: WStep[] = [
  {
    title: 'The room demo',
    body: 'Present the whole product, live — no slides. Each card says what we\'re about to press and what it will show; read the line, press the thing, and let the room watch the app respond. Escape leaves at any time; the cards drive the same story every time.',
    advance: 'next', cta: 'Into the room ›',
  },
  {
    target: 'board', title: 'This is last week, in pounds',
    body: 'One packing line, twelve weeks of real observations. Every bar is a machine, sized by lost time — with its £. Not percentages, not OEE: what actually happened, ranked by what it cost. Everything on this screen updates the moment anyone on the floor logs anything.',
    advance: 'next',
  },
  {
    target: 'line-chart', title: 'The chart answers the question we ask it',
    body: 'We\'re now going to change the question. Press Frequency — same data, ranked by how often. Press Both — the two bars side by side expose the split that matters: rare-but-costly versus frequent-but-quick. Different diseases, different medicine. Press Lost time to come back.',
    advance: 'next',
  },
  {
    target: 'gemba', title: 'The scoreboard strip',
    body: 'Above the chart, the whole system\'s state in one quiet row: when the line was last observed and walked (it goes amber, then red, when nobody has been), the 🏆 £ proven so far, and the 📌 problems being worked right now. We\'ll visit each — but first, where the numbers come from.',
    advance: 'next',
  },
  {
    target: 'tab-capture', title: 'Now we become the operator — press Capture',
    body: 'Everything you\'ve seen derives from ten-second entries made on the floor. We\'re now going to log a stoppage exactly as an operator would. Press Capture.',
    advance: { route: /\/capture/ },
  },
  {
    target: 'cap-fields', title: 'Three taps: where, what',
    body: 'Which machine, what we saw — tap one chip in each row. On the floor this is one thumb while the other hand deals with the problem. (The chips are the customer\'s own machines and losses — typed in once at setup.)',
    advance: 'next',
  },
  {
    target: 'log-now', title: 'Press Log now',
    body: 'The stopwatch times a stoppage live and shows the £ counting up while it runs — but for the room, press Log now: the observation is made, priced, and on its way to the board.',
    advance: 'click',
  },
  {
    target: 'tab-analyse', title: 'Now watch the board catch it — press Analyse',
    body: 'That entry is already in the data. Press Analyse and watch for the bar.',
    advance: { route: /\/analyse/ },
  },
  {
    target: 'line-chart', title: 'It landed',
    body: 'The log we just made is on the Pareto — seconds from floor to boardroom, no spreadsheet, nobody typing anything up. When the team logs for a week, this board IS the week.',
    advance: 'next',
  },
  {
    target: 'line-chart', title: 'There\'s a problem on this line — press the tallest bar',
    body: 'The board says WHERE it hurts. We\'re now going to walk into the worst of it: press the tallest bar and the app takes us straight inside that asset.',
    advance: { route: /\/analyse\?.*path=/ },
  },
  {
    target: 'drill-chart', title: 'This asset\'s own Pareto — press its tallest bar',
    body: 'Same chart, one level down: only this asset\'s losses, re-ranked. We can keep asking — press its tallest bar to go a layer deeper: which kind of problem, and further still, which shift it happens on.',
    advance: { route: /path=[^&]*%3E/i },
  },
  {
    target: 'prize', title: 'The prize line',
    body: 'At every depth, the whiteboard sentence: what this exact problem runs at per week — and what halving it banks per year. This is the number the finance director hears. From here ⚑ raises an owned, due-dated action, and 📌 opens a Case with that prize as its target.',
    advance: 'next',
  },
  {
    target: 'crumb-all', title: 'And back out — press All',
    body: 'Detail is only useful if you can leave it. Press All on the breadcrumb and we\'re back at the whole line — down to a shift-level answer and back, in a handful of presses.',
    advance: 'click',
  },
  {
    target: 'cases', title: 'A problem being worked — press the Allergen pin',
    body: 'We\'re now going to open a live improvement. Each 📌 is a Case — one problem, one page — and the arrow beside it shows how it\'s moving against its measured baseline. Press Allergen changeovers.',
    advance: { route: /\/case\// },
  },
  {
    target: 'whys', title: 'Why, until it stops answering',
    body: 'The floor asks WHAT to do; this page asks WHY it happens. Five whys, and the last line wears the root-cause badge — the countermeasures below are aimed at it, each with an owner and a due date, ageing in red if it slips.',
    advance: 'next',
  },
  {
    target: 'proof', title: 'The study running right now',
    body: 'Here\'s the discipline most systems skip: a fix isn\'t an improvement until it\'s re-measured. This study is collecting the after-sample live — every capture in scope counts automatically. Same method, same scope, both sample sizes shown. It can come back NO IMPROVEMENT — which is exactly why a PROVEN means something.',
    advance: 'next',
  },
  {
    target: 'case-back', title: 'Back to the board — press ‹ Back',
    body: 'One way in, one way back out — everywhere in the app. Press Back.',
    advance: { route: /\/analyse/ },
  },
  {
    target: 'wins', title: 'The trophy shelf — press it',
    body: 'And here\'s where proven fixes live. Press the trophy: every line on this shelf carries its receipt — before, after, both sample sizes, £ per year. This is the slide your champion shows their board, except it isn\'t a slide.',
    advance: 'click',
  },
  {
    target: 'tab-snags', title: 'Numbers were half the promise — press Snags',
    body: 'OEE systems have numbers and no eyes; audit apps have eyes and no numbers. You\'ve seen our numbers. Press Snags for the eyes.',
    advance: { route: /\/(snags|segment|asset|snaglist|walk)/ },
  },
  {
    target: 'seg-list', title: 'The filmed walk — open it',
    body: 'A walk down the line, filmed on a phone. We\'re going to open the footage and pin faults to the machines themselves. Press the walk.',
    advance: { route: /\/segment\// },
  },
  {
    target: 'asset-lines', title: 'The machines on the footage — press one',
    body: 'Scrubbing the film and marking a machine froze it as a still. Press the Flow wrapper to step onto it.',
    advance: { route: /\/asset\// },
  },
  {
    target: 'pins', title: 'Faults pinned to the metal',
    body: 'Each numbered dot is a fault pinned to the exact spot on the machine — press one: owner, due date, and the after-photo when it\'s fixed. ▶ plays the live footage this still came from. Every pin sits on the snag list, ageing, until someone closes it.',
    advance: 'next',
  },
  {
    target: 'asset-back', title: 'Back off the machine — press ‹',
    body: 'Same rule as the drill: in with a press, out with Back.',
    advance: { route: /\/(segment|snags)\/?/ },
  },
  {
    target: 'tab-meeting', title: 'Monday morning — press Meeting',
    body: 'Everything we\'ve shown feeds one room. We\'re now going to run the meeting these screens were built for. Press Meeting.',
    advance: { route: /\/meeting/ },
  },
  {
    target: 'meet-grid', title: 'Zero preparation',
    body: 'Five acts in a fixed order: what last week cost, where it hurt, who\'s carrying what (edited live, in the room), did the fixes hold, and minutes that write themselves. Nobody prepared this — last week prepared it. Arrow keys walk the agenda; every tile is a door.',
    advance: 'next',
  },
  {
    title: 'The close',
    body: 'That\'s the whole product: find it with a stopwatch or a camera → price it in £ → ask why → act with owners and dates → prove it held → bank the win. Now the line that ends the meeting: "Give me one line and a fortnight. If the board doesn\'t pay for itself in found losses, we shake hands and part friends."',
    advance: 'next', cta: 'Curtain ›',
  },
];
