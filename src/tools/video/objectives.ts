/* THE MANUFACTURING STUDIES FOOTAGE IS FILMED FOR (docs/VIDEO-DESIGN.md, D1–D4).
 *
 * A video study starts from what a person wants to find out, never from the
 * footage. Each study here says the question it answers; whether Faultline
 * can measure it from footage today, partly, or not yet — and, when not yet,
 * which of the app's tools does it meanwhile; the camera's view it needs and
 * the ones it cannot use; what must be in the picture; how long to film;
 * and, measure by measure, how each would be known: observed by a method
 * whose accuracy is measured, worked out from confirmed observations,
 * interpreted (by the assistant or a person — never a time or a count), or
 * not measurable from footage at all.
 *
 * The methods are the readings that produce observations. Each says its
 * technique — conventional vision where the answer is a time or a count,
 * because its error can be measured against footage with known times; a
 * vision model only to say what something looks like — whether it is built,
 * and what it has been shown on. Pure: the capture plan (lib/video/capture),
 * the assessment (lib/video/assess), the screens and the paper read it. */
import type { VideoStudyKind, Viewpoint } from './record';

export type { Viewpoint };

export type MethodId = 'zone-motion' | 'steadiness' | 'light' | 'vision-label' | 'person-mark' | 'zone-presence' | 'count-line' | 'person-track' | 'object-track';

export interface Method {
  name: string;
  technique: 'conventional vision' | 'a vision model' | 'a person';
  produces: string;
  status: 'built' | 'planned';
  /** What it has been measured on — or that it has not. */
  shown: string;
}

export const METHODS: Record<MethodId, Method> = {
  'zone-motion': { name: 'Movement in a box', technique: 'conventional vision', produces: 'when activity starts and stops in a fixed place, ± half the reading’s interval', status: 'built', shown: 'measured on made footage with known times: on clean footage each boundary within about 0.15 s and every piece of work found; flickering light and a station never idle are its known weak spots — not yet measured on real footage timed by hand' },
  steadiness: { name: 'The camera’s steadiness', technique: 'conventional vision', produces: 'whether the camera is steady, shaking or moved, when, and by how far', status: 'built', shown: 'measured on fifteen made camera set-ups with known movement — a wide moving belt is its known weak spot' },
  light: { name: 'The light', technique: 'conventional vision', produces: 'how bright the footage is and when the light jumps', status: 'built', shown: 'measured on the same set-ups' },
  'vision-label': { name: 'Naming what an event looks like', technique: 'a vision model', produces: 'what an observation is believed to be — never its time, length or count', status: 'built', shown: 'not measured: its names are an interpretation until a person confirms them' },
  'person-mark': { name: 'A person, at the player', technique: 'a person', produces: 'events, boundaries and names seen on the footage — the truth the readings are scored against', status: 'built', shown: '—' },
  'zone-presence': { name: 'Someone or something in a box', technique: 'conventional vision', produces: 'present but still told from nobody there — waiting from absent', status: 'planned', shown: '—' },
  'count-line': { name: 'A count line', technique: 'conventional vision', produces: 'when each item crosses a line drawn across the flow — output, gaps, a discharge stopping', status: 'planned', shown: '—' },
  'person-track': { name: 'People’s tracks', technique: 'conventional vision', produces: 'temporary tracks of people between areas, from above — walking and distance', status: 'planned', shown: '—' },
  'object-track': { name: 'Objects’ tracks', technique: 'conventional vision', produces: 'trays, baskets and cases followed — hand-offs, waiting, accumulation', status: 'planned', shown: '—' },
};

export const VIEWPOINTS: Record<Viewpoint, { name: string; place: string; why: string }> = {
  'side-raised': { name: 'Side-on, raised', place: 'Fixed beside the line, 2–2.5 m up, angled down at the work', why: 'every station’s hands and bench in one picture, and nobody stands in front of anybody else' },
  overhead: { name: 'From above', place: 'Fixed high above the area, looking straight down', why: 'paths and areas are flat from above, and nothing hides behind anything' },
  'high-corner': { name: 'A high corner', place: 'Fixed high in a corner, looking across the whole area', why: 'the whole area and where things come from in one picture' },
  'across-flow': { name: 'Across the flow', place: 'Fixed at right angles to the conveyor or route, high enough that items do not hide each other', why: 'each item crosses the picture one after another' },
  'close-up': { name: 'Close up on one station', place: 'Fixed near one station, its hands and parts filling the picture', why: 'a reach is told from a place only when hands and parts are large in the picture' },
  handheld: { name: 'In the hand', place: 'Held', why: 'the picture moves with the hand, so movement in it is not work' },
  moving: { name: 'Carried round', place: 'Walked round the area', why: 'the picture moves all the time' },
};

/** How a measure is known — the four kinds of statement (docs/VIDEO-DESIGN.md, D2). */
export type Claim = 'measured' | 'worked-out' | 'interpreted' | 'not-measurable' | 'not-yet';

export const CLAIM_WORD: Record<Claim, string> = {
  measured: 'Measured', 'worked-out': 'Worked out', interpreted: 'Interpreted — not measured', 'not-measurable': 'Not measurable from footage', 'not-yet': 'Not from footage yet',
};

export interface Measure {
  what: string;
  /** How it is known when the footage suits the study. */
  claim: Claim;
  method?: MethodId;
  /** What else it needs, or why it is only what it is. */
  note?: string;
}

export type Readiness = 'measured' | 'partly' | 'not-yet';

export const READINESS_WORD: Record<Readiness, string> = {
  measured: 'Measured from footage today', partly: 'Partly measured from footage today', 'not-yet': 'Not measured from footage yet',
};

export interface Objective {
  kind: VideoStudyKind;
  question: string;
  readiness: Readiness;
  /** In a sentence: what footage gives today. */
  today: string;
  view: Viewpoint;
  alsoFine: Viewpoint[];
  never: Viewpoint[];
  framing: string[];
  /** How long: whole cycles of the slowest station, or seconds, or a whole event. */
  minCycles?: number;
  minSec?: number;
  wholeEvent?: string;
  minFps: number;
  /** Most stations one camera holds for it, each at least a tenth of the picture's width. */
  maxZones?: number;
  measures: Measure[];
  cannot: string[];
  /** The app's tool that does it by hand meanwhile. */
  meanwhile?: { tool: string; path: string; why: string };
  /** Words that ask for it. */
  words: string[];
}

export const OBJECTIVES: Record<VideoStudyKind, Objective> = {
  balance: {
    kind: 'balance',
    question: 'How much work does each station do in a cycle, which one sets the pace, and is the line balanced against takt?',
    readiness: 'measured',
    today: 'When work starts and stops at each station is measured from the movement; the cycles, the pace and the balance are worked out from what a person confirms.',
    view: 'side-raised', alsoFine: ['overhead'], never: ['handheld', 'moving'],
    framing: ['Every station to be balanced, left to right, in the one picture', 'Each station at least a tenth of the picture’s width — six to a camera at most', 'Each person’s hands and work surface in view, not hidden by the person beside them'],
    minCycles: 10, minFps: 10, maxZones: 6,
    measures: [
      { what: 'When work starts and stops at each station', claim: 'measured', method: 'zone-motion' },
      { what: 'Each station’s work a cycle and its cycle, with their spread and whether enough cycles were filmed', claim: 'worked-out', method: 'zone-motion' },
      { what: 'Which station sets the pace, and the line’s rate at it', claim: 'worked-out' },
      { what: 'Takt, and the stations over it', claim: 'worked-out', note: 'needs the demand and the minutes to make it in' },
      { what: 'Gaps with no movement at a station', claim: 'measured', method: 'zone-motion' },
      { what: 'Whether a gap is waiting', claim: 'interpreted', method: 'person-mark', note: 'no movement can be waiting, checking without moving, or the person out of view — a person says which' },
      { what: 'What the work is', claim: 'interpreted', method: 'vision-label', note: 'named by the assistant from the frames, or by a person' },
    ],
    cannot: ['The elements inside a station’s work — reach, grasp, place: film one station close up', 'Walking between stations — a movement study from above', 'Products and material passing — a flow study'],
    words: ['balanc', 'workload', 'yamazumi', 'takt', 'operator', 'station'],
  },
  cycles: {
    kind: 'cycles',
    question: 'How long does a repeated cycle take at a station or a machine, and how much does it vary?',
    readiness: 'measured',
    today: 'When the activity that marks each cycle starts and stops is measured from the movement in its box; cycle times and their spread are worked out from what a person confirms.',
    view: 'side-raised', alsoFine: ['close-up', 'across-flow'], never: ['handheld', 'moving'],
    framing: ['The place each cycle shows — the press stroke, the hand placing the part, the discharge — in its own box, its movement filling a good part of it', 'Nothing else that moves inside that box'],
    minCycles: 15, minFps: 10, maxZones: 6,
    measures: [
      { what: 'When the activity that marks each cycle starts and stops', claim: 'measured', method: 'zone-motion' },
      { what: 'Cycle start to start, its spread, and whether enough cycles were filmed', claim: 'worked-out', method: 'zone-motion' },
      { what: 'What the cycle is', claim: 'interpreted', method: 'vision-label' },
      { what: 'Whether a machine was faulted, starved or blocked between cycles', claim: 'not-measurable', note: 'its inside is not seen; a gap is only a gap' },
    ],
    cannot: ['A machine’s internal state — what the footage shows is what moves'],
    words: ['cycle', 'repeat', 'duration', 'how long'],
  },
  waiting: {
    kind: 'waiting',
    question: 'How much of the time is each person or station not working, when, and for how long?',
    readiness: 'partly',
    today: 'Gaps with no movement are measured; whether a gap is waiting, checking without moving, or the person away is a person’s to say — telling still from absent is the next reading.',
    view: 'side-raised', alsoFine: ['high-corner'], never: ['handheld', 'moving'],
    framing: ['Each person’s place in view even when they step back from the work — the box covering where they stand', 'The stations either side, so a wait for work can be seen arriving'],
    minSec: 10 * 60, minFps: 10, maxZones: 6,
    measures: [
      { what: 'Gaps with no movement at each station, and when', claim: 'measured', method: 'zone-motion' },
      { what: 'The share of the time with no movement', claim: 'worked-out', method: 'zone-motion' },
      { what: 'Whether someone is there but still, or nobody is there', claim: 'not-yet', method: 'zone-presence' },
      { what: 'Whether a gap is waiting, and for what', claim: 'interpreted', method: 'person-mark', note: 'why a person waits — starved, blocked, told to — is said by people, never seen' },
    ],
    cannot: ['Why anyone waits — that is said, not seen: walk the line and ask (the bottleneck walk)'],
    meanwhile: { tool: 'Work sampling', path: '/sampling', why: 'the share of time each person spends waiting, with the reason, tapped at random moments' },
    words: ['wait', 'idle', 'starv', 'blocked', 'delay'],
  },
  changeover: {
    kind: 'changeover',
    question: 'What happens between the last good piece and the first good piece, how long each activity takes, and which could be done while the machine runs?',
    readiness: 'not-yet',
    today: 'Not read from footage yet: film it and keep it here, and time the activities in SMED by hand. Whether an activity could be external is always a person’s decision, never the reading’s.',
    view: 'high-corner', alsoFine: ['side-raised'], never: ['handheld', 'moving'],
    framing: ['The whole machine and the floor around it where the team works', 'Where tools, parts and materials come from, when it is close — a second camera only if the machine hides one side'],
    wholeEvent: 'the whole changeover, from the last good piece before to the first good piece after — nothing cut', minFps: 10,
    measures: [
      { what: 'Each activity and how long it takes', claim: 'not-yet', method: 'person-mark', note: 'marked by hand in SMED today' },
      { what: 'Whether an activity is internal or external', claim: 'interpreted', method: 'person-mark', note: 'always decided by a person' },
    ],
    cannot: ['A changeover longer than 20 minutes in one study — that is the long study, read live as it films (planned)'],
    meanwhile: { tool: 'SMED', path: '/smed', why: 'each element lapped with who does it, Shingo’s stages, and what the changeovers cost' },
    words: ['changeover', 'change over', 'smed', 'setup', 'set-up', 'set up', 'format change', 'die change', 'tool change'],
  },
  movement: {
    kind: 'movement',
    question: 'Where do people walk between work areas, how far, and how often?',
    readiness: 'not-yet',
    today: 'Not read from footage yet: following people across the picture is a planned reading (temporary tracks, never who they are). Time the walking as its own element meanwhile.',
    view: 'overhead', alsoFine: ['high-corner'], never: ['handheld', 'moving', 'side-raised'],
    framing: ['The whole area, both ends of every walk in the picture', 'The floor visible, so where someone stands can be read'],
    minSec: 15 * 60, minFps: 10,
    measures: [
      { what: 'Each person’s path between areas, as a temporary track', claim: 'not-yet', method: 'person-track' },
      { what: 'Distance walked and trips between areas', claim: 'not-yet', method: 'person-track', note: 'needs the floor’s scale, a measured length in the picture' },
      { what: 'Reaching, handling, walking inside the work', claim: 'interpreted', method: 'vision-label' },
    ],
    cannot: ['Who anyone is — people are temporary tracks, never identified'],
    meanwhile: { tool: 'Line balance', path: '/linebalance', why: 'walking timed as its own element, beside the work it serves' },
    words: ['walk', 'travel', 'spaghetti', 'movement', 'motion between', 'distance', 'path'],
  },
  flow: {
    kind: 'flow',
    question: 'How do products, trays, baskets or batches move through the process — how many pass, how long they wait, where they pile up?',
    readiness: 'not-yet',
    today: 'Not read from footage yet: the count line — items crossing a line drawn across the flow, each with its time — is the next reading to be built.',
    view: 'across-flow', alsoFine: ['overhead'], never: ['handheld', 'moving'],
    framing: ['A stretch of the flow where items pass one after another, each clearly apart from the next', 'A buffer or queue whole in the picture, if its pile-up is the question'],
    minSec: 15 * 60, minFps: 15,
    measures: [
      { what: 'When each item passes a point', claim: 'not-yet', method: 'count-line' },
      { what: 'Items an hour, and the gaps between them', claim: 'not-yet', method: 'count-line' },
      { what: 'How full a buffer is over time', claim: 'not-yet', method: 'zone-presence' },
      { what: 'Hand-offs between people and how long an item waits', claim: 'not-yet', method: 'object-track' },
    ],
    cannot: ['What is inside a closed case or tote'],
    meanwhile: { tool: 'Value stream', path: '/value-stream', why: 'the stock between steps counted on the walk, and its waiting worked out' },
    words: ['flow', 'wip', 'accumul', 'buffer', 'queue', 'basket', 'tray', 'tote', 'container', 'batch', 'product', 'material', 'hand-off', 'handoff', 'pile'],
  },
  machine: {
    kind: 'machine',
    question: 'When does a machine run, and when does it stop — for how long?',
    readiness: 'partly',
    today: 'Box the part of the machine that moves when it runs — the stroke, the wheel, the gripper: when it moves and when it does not is measured. Why it stopped is never seen; counting its output is the next reading.',
    view: 'across-flow', alsoFine: ['close-up', 'side-raised'], never: ['handheld', 'moving'],
    framing: ['The part of the machine that moves when it runs, in its own box', 'Its discharge, and its stack light if it has one'],
    minSec: 15 * 60, minFps: 10, maxZones: 4,
    measures: [
      { what: 'When the boxed part moves and when it is still', claim: 'measured', method: 'zone-motion' },
      { what: 'How long each stop lasts, and the share of time stopped', claim: 'worked-out', method: 'zone-motion' },
      { what: 'Its output — each piece leaving', claim: 'not-yet', method: 'count-line' },
      { what: 'Why it stopped — fault, starved, blocked, a changeover', claim: 'not-measurable', note: 'its inside is not seen; said by people, or counted in a shift’s losses' },
    ],
    cannot: ['A machine’s internal state, its speed setting or its faults — only what moves where the camera can see'],
    meanwhile: { tool: 'A shift’s losses', path: '/losses', why: 'each stop counted with its reason on the phone, at the bottleneck’s speed' },
    words: ['machine', 'stop', 'downtime', 'jam', 'breakdown', 'output', 'running', 'stoppage'],
  },
  elements: {
    kind: 'elements',
    question: 'What are the elements inside one station’s cycle — reach, grasp, move, place, wait — and how long does each take?',
    readiness: 'not-yet',
    today: 'Not read from footage yet: elements proposed from the movement inside a cycle and named by a person is a planned reading. Time the elements with the line balance’s stopwatch meanwhile.',
    view: 'close-up', alsoFine: [], never: ['handheld', 'moving', 'overhead'],
    framing: ['One station, the hands, the parts and where they are taken from filling the picture'],
    minCycles: 10, minFps: 25,
    measures: [
      { what: 'Each element’s start and end inside the cycle', claim: 'not-yet', method: 'zone-motion', note: 'boundaries to be proposed from movement and named by a person' },
      { what: 'What each element is', claim: 'interpreted', method: 'person-mark' },
    ],
    cannot: ['The rating of the person’s pace — always a person’s judgement, never read from the picture'],
    meanwhile: { tool: 'Line balance', path: '/linebalance', why: 'each element lapped on the phone with Undo, stacked against takt' },
    words: ['element', 'motion study', 'time and motion', 'reach', 'grasp', 'therblig', 'mtm'],
  },
};

export const KINDS = Object.keys(OBJECTIVES) as VideoStudyKind[];

/** The study a person's words ask for. A changeover, the elements of a cycle
 *  or people's walking are named only when meant; then a line balance wins
 *  over the rest ("the line balance of the product packing" is a balance,
 *  not a flow); then flow, a machine, waiting and cycles; a line balance
 *  when nothing says otherwise. */
export function kindOfWords(text: string): VideoStudyKind {
  const t = text.toLowerCase();
  const has = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(t);
  const said = (k: VideoStudyKind) => OBJECTIVES[k].words.some(has);
  for (const k of ['changeover', 'elements', 'movement'] as const) if (said(k)) return k;
  if (['balanc', 'yamazumi', 'workload'].some(has)) return 'balance';
  for (const k of ['flow', 'machine', 'waiting', 'cycles'] as const) if (said(k)) return k;
  return 'balance';
}
