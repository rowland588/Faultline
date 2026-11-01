/* GUIDES — registers and workflows of the 8D, PDCA and Kata methods (docs/METHODS.md §3, §5, §8, §9; src/catalogue/guide.ts).
 * Written in the page's own labels, in the order a person meets them, each step said as what it means, what to do and what you get. */
import type { Guide } from '../guide';

export const REGISTERS_GUIDES: Record<string, Guide> = {
  'FC-014': {
    intro: 'For the devices that stop a mistake — the label sensor, the date-code reader, the guard interlock — and the proof each one still works. A device nobody tests is worse than none: it gives a false sense of safety.',
    steps: [
      {
        step: 'New device check log',
        means: 'A log is one line’s list of its mistake-proofing devices, each with a test you do on a schedule. You start it from a list of nine to edit — it is a starting point, not the standard, and it gives no tolerance or sensitivity of yours.',
        doThis: 'Pick the line and the machine, tick the starter checks that are real on your line, and press Start it. Add the rest later with Add a check.',
        youGet: 'A log on the line with a round of checks, the first of each due now.',
      },
      {
        step: 'The device register',
        means: 'Every device named with the error it prevents (“a pack with no label”), its type and its function. Type is Shingo’s three: contact (a shape or sensor that fits only the right part), fixed-value (a count or quantity that must be reached) and motion-step (steps that must happen in order). Function is control (the machine stops or the pack is rejected) or warning (a light or a sound, so a person has to act).',
        doThis: 'Open The checks. Under Add a check or Edit, type the error the device prevents, tap its type and its function — or Not stated if you do not know yet. Use the chips to see only the contact devices, or only the warnings.',
        youGet: 'A count — 7 devices, 2 contact · 2 fixed-value · 3 motion-step; 6 control · 1 warning — which devices have no type yet, and the routine checks kept apart from the devices. A warning device is flagged: where the error is a food-safety one, a control is the stronger protection.',
      },
      {
        step: 'Due now',
        means: 'The devices whose test is due: each is tested by presenting a known-bad part — a pack with no label, a blank date code — and seeing the device act on it. Passing means the device caught it.',
        doThis: 'At the start of the shift, present the known-bad part to each device and tap ✓ Pass if it stopped the line or rejected the pack, ✗ Fail if it did not. Tap Pass all due only when you really have tested every one.',
        youGet: 'The check goes green and its next test is set. A missed test turns amber, then red — a device nobody tested is a device of unknown state.',
      },
      {
        step: 'A device that did not act',
        means: 'A failed test means everything made since the last good test was unprotected. A jumper or tape found on a device is a failure of the system, not of the device.',
        doThis: 'Tap ✗ Fail, write what you saw (“lens dirty”, “jumper on the switch”) and stop the line. The page shows the packs and the pounds held before you save it. Test again with the known-bad part before the line restarts.',
        youGet: 'The packs since the last good test, priced at the line’s materials where the line has them (or the missing figure named), and one problem on the register — a second failure in a row adds a step, not a second problem.',
      },
      {
        step: 'History',
        means: 'Was each device tested when it was due, what failed and what each failure held. A run of clean tests proves only so much: 62 clean tests say at most 4.7% of tests could fail, 95% sure — not that the device is 100% reliable.',
        doThis: 'Open History to read compliance by device, the failures and every result. A mistaken tap is struck, not deleted, and can be put back.',
        youGet: 'On time, missed and longest gap for each device, the failures with what each held, and the clean-record sentence once twenty tests have none failed.',
      },
      {
        step: 'On paper',
        means: 'The log as a page to show a customer, an auditor or the next shift: the device register, the checks as agreed, compliance and the failures.',
        doThis: 'Report ▾ → this log on paper. Everything on it is on the screen; nothing is added.',
        youGet: 'A page with the device register and its counts, the checks with each error, type and function, the failures and what they held, and what the list does not do.',
      },
    ],
    watch: 'The register lists devices; it does not choose which errors to proof or decide whether held product is released — that is your plan and your call. The errors not yet proofed and each device’s before-and-after effect are not here.',
  },
};
