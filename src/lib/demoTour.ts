/* The guided demo — an immersive instruction manual, not a slideshow. Runs on
 * the seeded demo workspace through the wizard engine: a spotlight cuts to the
 * REAL control, the card says what this section IS and what to press, and the
 * tour advances when the press actually happens — into an asset and back out,
 * down a drill and back up. Built to be presented: stand beside a customer,
 * read the cards, let them do the clicking. Escape leaves at any time;
 * replay from the ▶ Guided demo pill on the demo board. */
import type { WStep } from '../ui/Wizard';

export const DEMO_TOUR: WStep[] = [
  {
    title: 'This is Faultline',
    body: 'A packing hall with 14 weeks of data in it — every number you\'ll see is derived live from real observations, not mock-ups. The tour points at a control, tells you what it does, and waits for you to press it. Escape leaves any time.',
    advance: 'next', cta: 'Start ›',
  },
  {
    target: 'board', title: 'The line, in pounds',
    body: 'This is the board — where every demo starts. Each bar is a machine, sized by time lost with its £. The chips above the chart switch the view: frequency, or both side by side. Everything updates the moment anyone on the floor logs anything.',
    advance: 'next',
  },
  {
    target: 'gemba', title: 'The honesty meter',
    body: 'Observation-based truth decays in silence — so the board says when the line was last observed and last walked, and goes amber, then red, when nobody has been. It pulls the team back to the floor.',
    advance: 'next',
  },
  {
    target: 'wins', title: 'The trophy shelf — tap it',
    body: 'Proven recoveries accumulate here: only fixes CONFIRMED by a before/after study count. Tap the trophy to open the shelf.',
    advance: 'click',
  },
  {
    target: 'cases', title: 'The open problems — tap the Allergen one',
    body: 'Each pin is a Case — one problem being worked. The arrow shows how it\'s moving against its measured baseline right now. Tap the Allergen changeovers chip to open its page.',
    advance: { route: /\/case\// },
  },
  {
    target: 'whys', title: 'Why, until it stops answering',
    body: 'The 5-Whys chain — the floor asks WHAT to do; this page asks WHY it happens. The last line wears the root-cause badge, and the countermeasures below aim at it.',
    advance: 'next',
  },
  {
    target: 'proof', title: 'The receipt',
    body: 'The confirmation study: re-measure the same scope the same way, compare the average per event, both sample sizes shown. It can say ✓ PROVEN or ✗ NO IMPROVEMENT — a proof that can\'t say no proves nothing. This one is still collecting on Capture.',
    advance: 'next',
  },
  {
    target: 'case-back', title: 'Step back out — tap ‹ Back',
    body: 'Navigation rule of the whole app: every level has one way in and one way back out. Tap Back and you land exactly where you came from.',
    advance: { route: /\/analyse/ },
  },
  {
    target: 'line-chart', title: 'Ask why — tap the tallest bar',
    body: 'The board answers "where?"; the drill answers "why?". Tap the tallest bar to walk into that machine — and keep tapping to go deeper: kind of problem, then even which shift.',
    advance: { route: /\/analyse\?.*path=/ },
  },
  {
    target: 'prize', title: 'The prize line',
    body: 'At every drill level, the consultant\'s whiteboard sentence: what this runs at per week — and what halving it recovers per year. From here, ⚑ raises an action and 📌 opens a Case with the prize as its target. Tap Snags on the tab bar when you\'re ready.',
    advance: { route: /\/(snags|segment|asset|snaglist|walk)/ },
  },
  {
    target: 'seg-list', title: 'The filmed walk — open it',
    body: 'This is real walk footage, uploaded from a phone or filmed in the app. Tap the video card to open it.',
    advance: { route: /\/segment\// },
  },
  {
    target: 'asset-lines', title: 'The machines on the footage — tap one',
    body: 'Scrubbing the video and marking a machine freezes it as a still. These are this walk\'s machines — tap the Flow wrapper to go into it.',
    advance: { route: /\/asset\// },
  },
  {
    target: 'pins', title: 'Faults pinned to the metal',
    body: 'Each numbered dot is a fault pinned to the exact spot — tap a dot to open it: owner, due date, after-photo when fixed. ▶ plays the footage this still was frozen from. Every pin sits on the snag list, ageing, until someone closes it.',
    advance: 'next',
  },
  {
    target: 'asset-back', title: 'And back out — tap ‹',
    body: 'Same rule as everywhere: in through a tap, out through Back. Try it — you\'ll land on the walk you came from.',
    advance: { route: /\/(segment|snags)\/?/ },
  },
  {
    target: 'tab-meeting', title: 'Monday morning — tap Meeting',
    body: 'Everything you\'ve just seen feeds one room. Tap Meeting.',
    advance: { route: /\/meeting/ },
  },
  {
    target: 'meet-grid', title: 'The meeting that runs itself',
    body: 'Five acts, fixed order, zero preparation: the number, where it hurt, the actions (edited live in the room), did it hold, and minutes that write themselves. Every tile is a door; arrow keys walk the agenda; Escape climbs back out.',
    advance: 'next',
  },
  {
    title: 'That\'s the loop',
    body: 'Find it (stopwatch or camera) → price it in £ → ask why → act with owners and due dates → prove it held → bank the win on the shelf. Everything you saw derives from observations a person made with a phone. Replay this tour any time from ▶ Guided demo on the board.',
    advance: 'next', cta: 'Explore freely ›',
  },
];
