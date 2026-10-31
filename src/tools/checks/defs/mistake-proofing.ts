/* MISTAKE-PROOFING DEVICES — THE REGISTER AND THE DAILY DEVICE CHECKS (FC-014; knowledge/specs/FC-014-mistake-proofing.md).
 *
 * A poka-yoke device (Shingo: contact, fixed-value or motion-step; a control that stops the machine or a warning that
 * a person acts on) is protection only while it works, and nobody sees a sensor fail
 * (knowledge/methods/lean/poka-yoke.md). So each device is a check on the list: the device and the error it prevents
 * in its name, its type and function and the deliberate fail test (a known-bad part presented) in the words of what
 * passes, where it is on the line, and how often it is tested. A failed test means everything made since the last good
 * test was unprotected — the shape works that window out and raises ONE problem on the register; whether the product
 * is inspected, held, re-run or scrapped is the site's call, never this tool's. A bypassed device (the jumper, the
 * taped sensor) found on a walk is a failure of the system and is recorded as a fail.
 *
 * The register is the list of checks (knowledge/BUILD-SHAPES.md, FC-014). Its fields as DATA (type, function, the
 * error) are not separate fields of a check yet — they are words here; the spec (§12) says what that needs. */
import type { LogDef } from '../def';

const REACTION =
  'Stop the line. Tag the device out of service. Hold everything made since the last good test and inspect it for the error the device prevents. Find why it failed — a bypass (jumper, tape, override) is a failure of the system, not of the device. Test it again with the known-bad part before the line restarts.';
const GUARD_REACTION = 'Stop the machine. Lock it out and tag it. Do not run with the guard or interlock bypassed. Tell the engineer and test it again before restart.';
const SHIFT = { when: { every: 1, unit: 'shift' } as const, kind: 'passfail' as const, reaction: REACTION, priority: 'critical' as const, holds: true };

export const def: LogDef = {
  key: 'mistake-proofing',
  fc: 'FC-014',
  title: 'Mistake-proofing device checks',
  noun: 'device check',
  says: 'Each error-proofing device tested with a known-bad part — and what a failed test leaves unprotected',
  group: 'Lean',
  standard: {
    rests:
      'Shingo’s poka-yoke: a device at the source that makes the error impossible or evident at once — contact, fixed-value or motion-step, as a control or a warning — and only protection while it works, so each is tested on a schedule by presenting a known-bad part. The devices on a line, the error each prevents, the test part and how often are the site’s own, from its FMEA, HACCP plan and the device maker’s instructions; the list below is a starting point to edit and sets no tolerance or sensitivity.',
    confirm: [
      'Shingo’s and Nikkan Kogyo Shimbun’s texts were not re-read for this build (the record says so)',
      'The automotive control plan’s requirement for verifying error-proofing devices — its clause is not quoted and was not read against the text',
      'Each device’s known-bad part, how it is presented and how often — set by the site’s FMEA or HACCP plan and the device maker, never by this list',
      'Whether each device is a control (stops or rejects) or only a warning — for a food-safety error it should be a control',
    ],
  },
  kinds: ['passfail'],
  starterChecks: [
    { name: 'Label-presence sensor — prevents a pack with no label', where: '', ...SHIFT, criterion: 'Contact · control. A known-bad pack (no label) is presented and the line stops or the pack is rejected' },
    { name: 'Date-code reader — prevents a missing or wrong date code', where: '', ...SHIFT, criterion: 'Fixed-value · control. A known-bad code (blank, wrong date) is presented and the reader rejects the pack' },
    { name: 'Reject-confirm on the metal detector — prevents a rejected pack staying in the flow', where: '', ...SHIFT, criterion: 'Motion-step · control. A test piece is detected and the reject confirm proves the pack left the line' },
    { name: 'Case-count sensor — prevents a short or over-filled case', where: '', ...SHIFT, criterion: 'Fixed-value · control. A case with one pack missing is presented and the sensor stops the case sealing' },
    { name: 'Guard interlock — prevents the machine starting with the guard open', where: '', ...SHIFT, when: { every: 1, unit: 'day' }, reaction: GUARD_REACTION, holds: false, criterion: 'Motion-step · control. The guard is opened and the machine will not start or stops' },
    { name: 'Colour-coded utensils and tools — prevent an allergen tool at the wrong station', where: '', ...SHIFT, when: { every: 1, unit: 'week' }, priority: 'high', criterion: 'Contact · warning. Each tool is found at its own station and does not fit another; none missing or swapped' },
    { name: 'Recipe release — prevents the next ingredient before the last is weighed', where: '', ...SHIFT, when: { every: 1, unit: 'week' }, priority: 'high', criterion: 'Motion-step · control. The next ingredient is requested before the last is weighed in band and the system will not release it' },
    { name: 'No device bypassed — no jumper, tape or override on any of them', where: '', ...SHIFT, criterion: 'Each device walked: none jumpered, taped, switched off or overridden' },
    { name: 'Re-test after a device is repaired, moved or reset', where: '', ...SHIFT, when: { when: 'trigger', note: 'a device is repaired, moved or reset' }, criterion: 'The device acts on the known-bad part again before the line runs' },
  ],
  reactionWords: REACTION,
  whereLabel: 'Machine',
  holds: true,
  priority: 'critical',
  limits: [
    'It records the tests and states the team’s rules; it never decides whether product is inspected, held, re-run, released or scrapped — that is the site’s call.',
    'The register is the list of checks: a device’s type (contact, fixed-value, motion-step), function (control, warning) and the error it prevents are words in the check, not separate fields, so the list cannot yet be filtered or counted by them.',
    'The errors not yet proofed (the FMEA’s highest-ranked human errors with no device, FC-132) and a device’s effectiveness (defects of its kind before and after, FC-134) are not here.',
    'A device’s own cost against the failures it stops is not held, so what it pays back is not said; the packs held by a failed test are priced at the line’s materials a pack where that is given.',
    'A warning device depends on a person’s reaction; for a food-safety error it should be a control.',
    'Checks done when something happens (a repair, a move, a reset) are counted, not scheduled: a missed one is not known. The product-on-hold record (FC-135) is not built yet.',
  ],
  examples: [
    {
      /* the knowledge record's case: the label-presence sensor fails its test, the last good one 7 h before, 110 a minute → 46,200 packs.
       * The site tests the sensor every 7 hours (a 7-hour run) — the example agrees that; the date-code reader is tested every shift (8 h). */
      name: 'Label sensor tested every 7 hours fails at 840 min, last good 420 min before — 46,200 packs',
      checks: [0, 1], nowMin: 965, ratePerMin: 110,
      set: { 0: { when: { every: 7, unit: 'hour' } } },
      results: [
        { check: 0, min: 0, outcome: 'pass' }, { check: 0, min: 420, outcome: 'pass' }, { check: 0, min: 840, outcome: 'fail' },
        { check: 1, min: 0, outcome: 'pass' }, { check: 1, min: 480, outcome: 'pass' }, { check: 1, min: 960, outcome: 'pass' },
      ],
      expect: { expected: 6, onTime: 6, missed: 0, failed: 1, packsHeld: 46200, pct: 100, states: { 0: 'failed', 1: 'done' } },
    },
    {
      /* the record's "weekly checks due, two not done", in miniature: the tools done on day 0 and 7, the recipe release only on day 0, looked at on day 8 */
      name: 'Weekly device checks: the recipe release missed on day 7',
      checks: [5, 6], nowMin: 8 * 1440,
      results: [{ check: 5, min: 0, outcome: 'pass' }, { check: 5, min: 7 * 1440, outcome: 'pass' }, { check: 6, min: 0, outcome: 'pass' }],
      expect: { expected: 4, onTime: 3, missed: 1, failed: 0, pct: 75, states: { 5: 'done', 6: 'overdue' } },
    },
  ],
};
