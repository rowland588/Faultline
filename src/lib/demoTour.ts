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
    body: 'This is the board — where every demo starts. Each bar is a machine; green is time lost (with its £), slate is how often. Everything on this screen updates the moment anyone on the floor logs anything.',
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
    target: 'cases', title: 'The open problems',
    body: 'Each pin is a Case — one problem being worked, with its own page: baseline, target, root cause, actions, proof. The arrow shows how it\'s moving against its baseline right now.',
    advance: 'next',
  },
  {
    target: 'line-chart', title: 'Ask why — tap the tallest bar',
    body: 'The board answers "where?"; the drill answers "why?". Tap the tallest bar to walk into that machine.',
    advance: { route: /\/analyse\?.*path=/ },
  },
  {
    target: 'prize', title: 'The prize line',
    body: 'At every level of the drill, the same sentence a consultant would scribble on a whiteboard: what this problem runs at per week — and what halving it would recover per year. Computed only from full weeks of data; never a guess.',
    advance: 'next',
  },
  {
    target: 'case-cta', title: 'Make it a Case — tap it',
    body: 'One tap turns the drill position into a Case: the baseline is measured from the last four weeks, the target defaults to the prize. This drill already has one — open it.',
    advance: { route: /\/case\// },
  },
  {
    target: 'whys', title: 'Why, until it stops answering',
    body: 'The 5-Whys chain — the floor asks WHAT to do; this page asks WHY it happens. The last line wears the root-cause badge, and the actions below aim at it.',
    advance: 'next',
  },
  {
    target: 'proof', title: 'The receipt',
    body: 'The confirmation study: re-measure the same scope the same way, compare the average per event, both sample sizes shown. It can say ✓ PROVEN or ✗ NO IMPROVEMENT — a proof that can\'t say no proves nothing. This is what the FD believes.',
    advance: 'next',
  },
  {
    target: 'case-back', title: 'Step back out — tap ‹ Back',
    body: 'Navigation rule of the whole app: every level has one way in and one way back out. Tap Back and you land exactly where you drilled from.',
    advance: { route: /\/analyse/ },
  },
  {
    target: 'tab-snags', title: 'Now the camera world — tap Snags',
    body: 'Numbers were half the story. The other half: film the line, pin the faults ON the footage. Tap Snags.',
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
