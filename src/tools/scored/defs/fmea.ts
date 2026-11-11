import { uid } from '../../../lib/ids';
import { fmeaAnalyse, fmeaStart } from '../../fmea/fmea';
import type { ScoredDef } from '../types';

/* FC-132 — the process FMEA with an action priority: a card a failure mode, rated for severity, occurrence and detection 1–10 against anchors,
   the priority read by Faultline's own severity-first rule (not the AIAG-VDA handbook's table, which is not reproduced), an action, its owner and day,
   and the re-rating once it is done. Specification: knowledge/specs/FC-132-fmea.md. Arithmetic and words: src/tools/fmea/fmea.ts. */
const def: ScoredDef = {
  key: 'fmea',
  fc: 'FC-132',
  title: 'Process FMEA',
  says: 'What can go wrong at each step, how badly, how often, how well caught — and which failure modes need action first',
  group: 'Risk and control',
  question: 'Which failure modes need action first — and are the controls now in place enough?',
  scales: [],
  limits: [
    'The priority is Luna’s own severity-first rule, not the AIAG-VDA handbook’s action-priority table (licensed, not reproduced, not read here); a row can be set by hand from the handbook by a team that holds it.',
    'The severity, occurrence and detection anchors are written for food manufacturing by Luna, not the handbook’s words; edit the judgement, not the number.',
    'An action is a field on the card (what, who, by when, done); it is not yet on the project’s Actions page or in Needs you.',
    'The steps are typed — they are not read from the line’s value stream map or the project’s stages; food-safety hazards are marked and belong in the HACCP plan (not built).',
  ],
  noun: 'failure mode',
  register: {
    analyse: ({ rows, ctx }) => fmeaAnalyse({ rows, today: ctx.today }),
    start: () => fmeaStart(uid),
    asks: { name: 'What is the process or line step this covers?', placeholder: 'e.g. Line 2 wrapper — October review', empty: 'No process FMEA yet — walk the process step by step and write down what could go wrong, then rate it.', noun: 'failure mode', newLabel: 'New FMEA' },
  },
  examples: [{
    name: 'Line 2 wrapper — seven failure modes from the knowledge record’s cases',
    rows: [
      { id: 'f1', name: 'Seal does not hold', fmea: { step: 'Sealing', effect: 'Leaker reaches the customer', cause: 'Jaw temperature drift', prevention: 'Set-point check each start', detection: 'Seal pull every 30 min stops the line', s: 9, o: 3, d: 4 } },
      { id: 'f2', name: 'Wrong film reel loaded', fmea: { step: 'Reel change', effect: 'A shift of packs scrapped', cause: 'Two reels look alike', prevention: 'Reels kept apart', detection: 'Nothing until the complaint', s: 8, o: 2, d: 9 } },
      { id: 'f3', name: 'Print smudged', fmea: { step: 'Coding', effect: 'Cosmetic mark', cause: 'Ink build-up', prevention: 'None', detection: 'Operator looks occasionally', s: 3, o: 9, d: 8 } },
      { id: 'f4', name: 'Metal detector misses a test piece', fmea: { step: 'Metal detection', effect: 'A foreign body could reach a consumer', cause: 'Sensitivity drift', prevention: 'Daily test', detection: 'Test pieces each hour, the belt stops', s: 10, o: 2, d: 3, haccp: true } },
      { id: 'f5', name: 'Wrong date code', fmea: { step: 'Coding', effect: 'Product withdrawn', cause: 'Wrong product loaded at changeover', prevention: 'Checklist', detection: 'Visual check by the operator', s: 7, o: 5, d: 7 } },
      { id: 'f6', name: 'Underweight pack', fmea: { step: 'Filling', effect: 'Customer complaint', cause: 'Head blocked', prevention: 'Cleaning', detection: 'Checkweigher rejects every pack', s: 7, o: 4, d: 2 } },
      { id: 'f7', name: 'Film splice not seen', fmea: { step: 'Wrapping', effect: 'Weak seal at the splice', cause: 'Splice tape lifts', prevention: 'None', detection: 'Operator looks after the process', s: 6, o: 7, d: 8 } },
    ],
    /* scripts/knowledge/cases-m6-analysis.py — the rule re-worked by hand and by a second implementation */
    expect: { counts: { H: 1, M: 4, L: 2 }, order: ['Wrong date code', 'Metal detector misses a test piece', 'Seal does not hold', 'Wrong film reel loaded', 'Film splice not seen', 'Underweight pack', 'Print smudged'], verdict: '1 High' },
  }],
};

export default def;
