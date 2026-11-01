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
  'FC-135': {
    intro: 'For product that may not be right and has been put aside — a pouch after a failed seal check, a case with the wrong label. A hold needs a number, a reason and someone who decides by a day, or it sits there and costs money and shelf life.',
    steps: [
      {
        step: 'New register',
        means: 'A register is one line’s list of everything it has put on hold. There is one a line, so the product that is held, and what it has cost, is in one place.',
        doThis: 'Choose the line and press Start it. If the line already has one, the page offers it to open instead of making a second.',
        youGet: 'An empty register for the line, ready for the first hold.',
      },
      {
        step: 'Raise a hold',
        means: 'Putting product on hold: its name and lot, how much, why, and who will decide and by which day. A hold has a number — H-001, H-002 — so the label on the pallet and the line in the register are the same thing.',
        doThis: 'Press Raise a hold and fill in the product, how much (and in what: packs, cases, trays, pallets or kg), and why. Add who decides and the day to decide by, and what a piece has cost to this point if you know it. Or, where a check on the line has just failed, press Put it on hold beside it: the packs since the last good check and the reason are filled in.',
        youGet: 'A card under On hold now with its number, how many days it has been held, and what is tied up in it. Product with no owner or no decide-by day is said — a hold with no decision day is a slow destroy.',
      },
      {
        step: 'On hold now',
        means: 'Every hold not yet decided in full, the oldest and the late first. Tied up is the money waiting in the product — it is not lost unless the product is.',
        doThis: 'Read the tiles and the sentence first: how many are held, how much money is tied up, the oldest, and how many are past the day to decide by. Strike a hold raised by mistake — it is left out, and Undo puts it back.',
        youGet: 'The state in words beside the colour: red for a hold past its day, amber for one still in time. Nothing is guessed — a hold with no cost a piece says the money is missing.',
      },
      {
        step: 'Decide',
        means: 'What becomes of the product: release it (shown to conform), release it on concession (the customer agreed in writing), rework it, regrade it, or destroy it. You can decide part of a hold — release 4,500 and destroy 300 — and it closes when every pack has a fate.',
        doThis: 'Press Decide on the card, choose the fate, say how much of it, who decided and on what grounds (a release needs its grounds). For a concession, regrade, rework or destroy, type what it cost in all if you know it. Take back a decision if it was wrong: the quantity goes back on hold.',
        youGet: 'The hold under Decided with each fate, who and when. What was lost is said by fate, and the margin not earned on destroyed packs is said apart from it — never added to it.',
      },
      {
        step: 'Who decides, and the carrying rate',
        means: 'The names that may decide a hold — quality, not production under pressure — and the yearly rate that says what waiting costs. Neither is assumed: you give them.',
        doThis: 'Under More ▾ open Who decides, and the carrying rate. Type the names with the authority, separated by commas, and a carrying rate if the business has one. A decision by anyone else is still recorded but flagged.',
        youGet: 'The list on the page and the paper, a flag on any decision by someone not on it, and what waiting has cost so far at the rate.',
      },
      {
        step: 'Why holds happen',
        means: 'The holds counted by their reason. When the same reason holds product three times in four weeks it is a repeat, and a repeat is for an 8D — finding why, not holding again.',
        doThis: 'Write the reason the same way each time. Read the table; when the page says an 8D is the next step, start one from the method’s own sections.',
        youGet: 'The reasons ranked, and the repeat said in words.',
      },
      {
        step: 'On paper',
        means: 'The register as a page for the quality manager, the customer or the auditor: what is held, what was decided and who decided, the money and why holds happen.',
        doThis: 'Report ▾ → Product on hold on paper. Everything on it is on the screen; nothing is added.',
        youGet: 'A page with the holds, the decisions and their grounds, the money, the reasons, who may decide and what the register does not do.',
      },
    ],
    watch: 'A hold in the register is not a hold on the floor: the product must be physically set aside and labelled with its number. The register records the decision and never makes it, and an allergen or food-safety hold follows your HACCP plan first.',
  },
};
