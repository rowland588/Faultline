/* @vitest-environment jsdom
 *
 * THE WEEKLY UPLOAD. The highest-consequence untested path in the app.
 *
 * Rowland uploads a tracker every week and presents what comes out of it to a
 * General Manager. A mis-parse does not show up as an error — it shows up as a
 * wrong number on an A3, in a room, with nothing to say it is wrong. So these
 * tests are about the parser being RIGHT, not merely about it not throwing.
 *
 * Each case below is either a rule the workbook format depends on or a fault
 * that has actually occurred. The Pareto second-table case is the sharpest:
 * reading past the end of the first table turned 28 categories into 63 and
 * reported 4,434 minutes against a sheet that says 3,638 on its own face.
 */
import { describe, it, expect } from 'vitest';
import { readPaceWorkbook } from '../paceWorkbook';
import { xlsx, raw, type Grid } from './xlsxFixture';

const read = (sheets: Record<string, Grid>, name = 'tracker.xlsx') =>
  readPaceWorkbook(xlsx(sheets), name);

const TRACKER_HEAD = ['Ref', 'Line', 'Category', 'What’s happening', 'Action', 'Who', 'Owner', 'Due', 'Status', 'Priority', '3P'];
const trackerRow = (over: Partial<Record<string, string | number>> = {}) => [
  over.ref ?? 'A-1', over.line ?? 'Line 7', over.category ?? 'Changeover',
  over.problem ?? 'slow', over.action ?? 'fix it', over.who ?? 'Engineering',
  over.owner ?? 'Dave', over.due ?? '2026-10-02', over.status ?? 'Open',
  over.priority ?? 1, over.pillar ?? 'Plant',
];

describe('the action tracker', () => {
  it('reads a row into the fields the app uses', () => {
    const { snapshot, warnings } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()] });
    expect(warnings).toEqual([]);
    expect(snapshot.actions).toHaveLength(1);
    expect(snapshot.actions[0]).toMatchObject({
      ref: 'A-1', line: 'Line 7', category: 'Changeover', problem: 'slow',
      action: 'fix it', who: 'Engineering', owner: 'Dave', due: '2026-10-02',
      status: 'Open', priority: 1, pillar: 'Plant',
    });
  });

  it('reads by HEADING, not by position — a column inserted in Excel shifts nothing', () => {
    // The whole reason the parser works by heading. Somebody adds "Cost" in the
    // middle of the sheet one Monday; every field after it must stay put.
    const head = [...TRACKER_HEAD];
    const row = trackerRow();
    head.splice(2, 0, 'Cost');
    row.splice(2, 0, 1234);

    const { snapshot } = read({ 'Action Tracker': [head, row] });
    expect(snapshot.actions[0]).toMatchObject({
      ref: 'A-1', line: 'Line 7', category: 'Changeover', owner: 'Dave', status: 'Open',
    });
  });

  it('finds the heading row even when the sheet opens with a title and a blank', () => {
    const { snapshot } = read({
      'Action Tracker': [['PROJECT PACE — week 38'], [], TRACKER_HEAD, trackerRow()],
    });
    expect(snapshot.actions).toHaveLength(1);
  });

  it('skips rows with no Ref, which is how Excel spacers and totals arrive', () => {
    const { snapshot } = read({
      'Action Tracker': [TRACKER_HEAD, trackerRow(), [], trackerRow({ ref: 'A-2' }), ['', 'TOTAL']],
    });
    expect(snapshot.actions.map(a => a.ref)).toEqual(['A-1', 'A-2']);
  });

  it('defaults an absent or nonsense priority to 3 rather than 0 or NaN', () => {
    // Priority sorts the board. A 0 would jump a blank to the top of the client's
    // page; a NaN would put it somewhere undefined.
    const { snapshot } = read({
      'Action Tracker': [TRACKER_HEAD,
        trackerRow({ ref: 'P-blank', priority: '' }),
        trackerRow({ ref: 'P-words', priority: 'high' }),
        trackerRow({ ref: 'P-zero', priority: 0 }),
        trackerRow({ ref: 'P-two', priority: 2 })],
    });
    const byRef = Object.fromEntries(snapshot.actions.map(a => [a.ref, a.priority]));
    expect(byRef).toEqual({ 'P-blank': 3, 'P-words': 3, 'P-zero': 3, 'P-two': 2 });
  });

  it('accepts any of the spellings the 3P column might be given', () => {
    for (const heading of ['3P', 'Pillar', 'PPP', 'People Plant Process', 'People Process Plant']) {
      const { snapshot } = read({
        'Action Tracker': [['Ref', 'Line', 'Status', heading], ['A-1', 'Line 7', 'Open', 'People']],
      });
      expect(snapshot.actions[0]?.pillar, heading).toBe('People');
    }
  });

  it('refuses a workbook with no readable actions instead of importing an empty one', () => {
    // Deliberately a throw, not a warning: accepting zero actions would replace
    // a working tracker view with an empty one and report success.
    expect(() => read({ 'Action Tracker': [['just', 'some', 'notes']] }))
      .toThrow(/no actions this app recognises/i);
  });

  it('the refusal says WHY, and which sheets it looked at', () => {
    // The specific diagnosis used to be computed and thrown away, leaving a
    // generic sentence and a workbook with nothing visibly wrong with it.
    let msg = '';
    try { read({ 'Notes': [['just', 'some', 'notes']], 'Costs': [[1, 2]] }); }
    catch (e) { msg = (e as Error).message; }
    expect(msg).toMatch(/no Tracker sheet found/i);
    expect(msg).toMatch(/Sheets in this file: Notes, Costs/);
  });

  it('says so when the headings are there but no rows are under them', () => {
    let msg = '';
    try { read({ 'Action Tracker': [TRACKER_HEAD] }); } catch (e) { msg = (e as Error).message; }
    expect(msg).toMatch(/no action rows/i);
  });

  it('treats a formula cell whose cached value was dropped as blank, not as zero', () => {
    // An empty <v/> is what some writers leave behind. Number('') is 0, which
    // turned blank computed cells into real-looking data.
    const { snapshot } = read({
      'Action Tracker': [['Ref', 'Line', 'Status', 'Priority'],
        ['A-1', 'Line 7', 'Open', raw('<c r="{{ref}}"><v/></c>')]],
    });
    expect(snapshot.actions[0]?.priority).toBe(3);
  });
});

describe('the Pareto sheet', () => {
  /* The shape of the real sheet: prose above the table, the ranked table, then a
     SECOND table underneath ranked by stops whose column B is a stop count. */
  const PARETO_HEAD = ['Category', 'Mins', 'Events', 'Min/Event', 'Profile', 'L2 mins', 'L7 mins'];
  const paretoSheet = (): Grid => [
    ['LOSS ANALYSIS — covering 14 Jul – 6 Aug 2026 (four weeks).'],
    ['# 1 loss is Changeover, at 1,200 minutes.'],
    ['3,638 minutes lost across 398 stops'],
    [],
    PARETO_HEAD,
    ['Changeover', 1200, 100, 12, 'Long-stop', 700, 500],
    ['Breakdown', 900.5, 90, 10, 'Mixed', 400.5, 500],
    ['Material', 600, 120, 5, 'Frequency', 300, 300],
    [],
    ['FREQUENCY VIEW — ranked by stops'],
    ['Category', 'Stops', 'Mins'],
    ['Minor stop', 812, 40],
    ['Sensor fault', 430, 22],
  ];

  it('stops at the end of the first table and never reads the frequency view', () => {
    // THE BUG. Reading to the bottom of the sheet took stop counts as minutes:
    // 63 categories instead of 28, and 4,434 minutes against a stated 3,638.
    const { snapshot } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()], Pareto: paretoSheet() });
    const p = snapshot.pareto;
    expect(p).toBeDefined();
    expect(p!.rows.map(r => r.category)).toEqual(['Changeover', 'Breakdown', 'Material']);
    expect(p!.rows.some(r => r.category === 'Minor stop')).toBe(false);
    expect(p!.rows.some(r => r.category === 'Sensor fault')).toBe(false);
  });

  it('quotes the sheet’s own stated totals, not the column sum', () => {
    // The author will read these numbers out in a room. 3,638 is what the sheet
    // says; 2,700.5 is what its visible rows add up to. The sheet wins.
    const { snapshot } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()], Pareto: paretoSheet() });
    expect(snapshot.pareto!.totalMins).toBe(3638);
    expect(snapshot.pareto!.totalStops).toBe(398);
  });

  it('falls back to a rounded column sum when the sheet states no total', () => {
    // 1200 + 900.5 + 600 in binary is 2700.5000000000005 unrounded, and a figure
    // like that printed on an A3 costs the page its credibility.
    const sheet = paretoSheet().filter(r => !String(r[0] ?? '').includes('minutes lost'));
    const { snapshot } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()], Pareto: sheet });
    expect(snapshot.pareto!.totalMins).toBe(2700.5);
    expect(snapshot.pareto!.totalStops).toBe(310);
  });

  it('lifts the period off the sheet, because it decides what is comparable', () => {
    const { snapshot } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()], Pareto: paretoSheet() });
    expect(snapshot.pareto!.period).toBe('14 Jul – 6 Aug 2026');
  });

  it('keeps the sheet’s own headline sentence verbatim', () => {
    const { snapshot } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()], Pareto: paretoSheet() });
    expect(snapshot.pareto!.headline).toMatch(/Changeover, at 1,200 minutes/);
  });

  it('ranks by minutes regardless of the order the sheet lists them', () => {
    const s = paretoSheet();
    [s[5], s[7]] = [s[7]!, s[5]!];
    const { snapshot } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()], Pareto: s });
    expect(snapshot.pareto!.rows.map(r => r.mins)).toEqual([1200, 900.5, 600]);
  });

  it('discovers per-line columns instead of assuming three fixed ones', () => {
    const head = [...PARETO_HEAD, 'L12 mins'];
    const { snapshot } = read({
      'Action Tracker': [TRACKER_HEAD, trackerRow()],
      Pareto: [['covering 1 Sep – 28 Sep 2026'], [], head, ['Changeover', 100, 10, 10, 'Mixed', 40, 30, 30]],
    });
    expect(snapshot.pareto!.rows[0]!.byLine).toEqual({ 'Line 2': 40, 'Line 7': 30, 'Line 12': 30 });
  });

  it('tolerates one blank row inside the table but ends on two', () => {
    const { snapshot } = read({
      'Action Tracker': [TRACKER_HEAD, trackerRow()],
      Pareto: [['covering 1 Sep – 28 Sep 2026'], [], PARETO_HEAD,
        ['Changeover', 100, 10, 10, 'Mixed', 60, 40],
        [],
        ['Breakdown', 50, 5, 10, 'Mixed', 25, 25],
        [], [],
        ['Minor stop', 999, 900, 1, 'Frequency', 500, 499]],
    });
    expect(snapshot.pareto!.rows.map(r => r.category)).toEqual(['Changeover', 'Breakdown']);
  });

  it('ignores a total row sitting at the foot of the table', () => {
    const { snapshot } = read({
      'Action Tracker': [TRACKER_HEAD, trackerRow()],
      Pareto: [['covering 1 Sep – 28 Sep 2026'], [], PARETO_HEAD,
        ['Changeover', 100, 10, 10, 'Mixed', 60, 40],
        ['Total', 100, 10, 10, '', 60, 40]],
    });
    expect(snapshot.pareto!.rows.map(r => r.category)).toEqual(['Changeover']);
  });

  it('computes min/event when the sheet omits the column', () => {
    const { snapshot } = read({
      'Action Tracker': [TRACKER_HEAD, trackerRow()],
      Pareto: [['covering 1 Sep – 28 Sep 2026'], [], ['Category', 'Mins', 'Events'], ['Changeover', 120, 10]],
    });
    expect(snapshot.pareto!.rows[0]!.minPerEvent).toBe(12);
  });

  it('a workbook with no Pareto sheet is normal, not an error', () => {
    const { snapshot, warnings } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()] });
    expect(snapshot.pareto).toBeUndefined();
    expect(warnings).toEqual([]);
  });
});

describe('the whole upload', () => {
  it('keeps the file name and stamps when it was taken', () => {
    const before = Date.now();
    const { snapshot } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()] }, 'week 38.xlsx');
    expect(snapshot.fileName).toBe('week 38.xlsx');
    expect(snapshot.takenAt).toBeGreaterThanOrEqual(before);
    expect(snapshot.id).toBeTruthy();
  });

  it('lists the sheets it saw, so an upload that read nothing can be explained', () => {
    const { sheetsSeen } = read({ 'Action Tracker': [TRACKER_HEAD, trackerRow()], Lists: [['Owner'], ['Dave']] });
    expect(sheetsSeen).toEqual(['Action Tracker', 'Lists']);
  });

  it('throws on a file that is not a workbook at all', () => {
    const notAZip = new ArrayBuffer(32);
    expect(() => readPaceWorkbook(notAZip, 'holiday.jpg')).toThrow();
  });
});
