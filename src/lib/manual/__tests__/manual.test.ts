/* A machine's manual read by rules (docs/ASSET-DOCUMENTS.md). The pages are a made-up bagger manual written the three ways manuals
 * write maintenance: a sentence with its interval, a table row, and a heading that is an interval with its tasks under it. */
import { describe, expect, it } from 'vitest';
import { findPassages, intervalIn, intervalSaid, pmTasksOf, proceduresOf, quoteOnPage } from '../manual';

const PAGES = [
  `BX-200 Vertical bagger — Operating manual\n1 Technical data\nMaximum speed 120 bags per minute\nBag width 80 – 250 mm\nSuitable for laminated film up to 80 micron\nCompressed air 6 bar, must not exceed 8 bar`,
  `7 Maintenance\n7.1 General\nSwitch off and lock out before any work.\nLubricate the main drive chain every 500 operating hours with ISO VG 68 oil.\nThe sealing jaws are a wear part.\n\n\nDaily\n• Clean the film path and the forming shoulder\n• Check the air pressure gauge reads 6 bar\nWeekly\n- Inspect the sealing jaw PTFE tape and replace if marked\nNotes on safety apply throughout.`,
  `7.3 Schedule\nTask Interval\nCheck belt tension Monthly\nReplace the knife Every 2,000 hours\nGrease the cross-seal bearings quarterly\nInspect the safety interlocks annually\nCheck the oil level.\nEvery 6 months\nChange the gearbox oil`,
];

describe('the interval a line states', () => {
  it.each([
    ['every 500 operating hours', 500, 'hour'], ['Every 2,000 hours', 2000, 'hour'], ['after 50 h', 50, 'hour'], ['daily', 1, 'day'], ['each shift', 1, 'shift'],
    ['weekly', 1, 'week'], ['every 2 weeks', 2, 'week'], ['Monthly', 30, 'day'], ['every 3 months', 91, 'day'], ['quarterly', 91, 'day'],
    ['Every 6 months', 182, 'day'], ['annually', 365, 'day'], ['every two years', 730, 'day'],
  ])('%s', (words, every, unit) => { expect(intervalIn(`Do it ${words} please`)).toMatchObject({ every, unit }); });
  it('none where none is said', () => { expect(intervalIn('Check the oil level.')).toBeUndefined(); });
});

describe('the PM tasks a manual stipulates', () => {
  const tasks = pmTasksOf(PAGES);
  it('reads a sentence, a heading with its tasks, and a table — in the manual’s order, each with its page and line', () => {
    expect(tasks.map(t => [t.task, t.every, t.unit, t.page])).toEqual([
      ['Lubricate the main drive chain with ISO VG 68 oil', 500, 'hour', 2],
      ['Clean the film path and the forming shoulder', 1, 'day', 2],
      ['Check the air pressure gauge reads 6 bar', 1, 'day', 2],
      ['Inspect the sealing jaw PTFE tape and replace if marked', 1, 'week', 2],
      ['Check belt tension', 30, 'day', 3],
      ['Replace the knife', 2000, 'hour', 3],
      ['Grease the cross-seal bearings', 91, 'day', 3],
      ['Inspect the safety interlocks', 365, 'day', 3],
      ['Change the gearbox oil', 182, 'day', 3],
    ]);
    expect(tasks.every(t => t.by === 'rules' && quoteOnPage(PAGES, t.page, t.quote))).toBe(true);
  });
  it('claims nothing the manual gives no interval for, and nothing that is not a task', () => {
    const said = tasks.map(t => t.task).join(' | ');
    expect(said).not.toMatch(/oil level|wear part|lock out|safety apply/i);
  });
  it('keeps the manual’s own words for the interval', () => {
    expect(intervalSaid(tasks[0])).toBe('every 500 hours (the manual: “every 500 operating hours”)');
    expect(intervalSaid(tasks[4])).toBe('every 30 days (the manual: “Monthly”)');
  });
});

/* 13 November — a mock OEM manual made to test with (a 13-page bagger manual, every name made up) showed two faults the first pages did
 * not: a table cell that wraps ("Every 500" / "operating hours") was not read, and the tail of a wrapped sentence ("after 6000 operating
 * hours.") was taken for a heading and its interval given to the three sentences after it — an interval the manual never stated. */
describe('a manual as a PDF prints it: wrapped cells and wrapped sentences', () => {
  const WRAPPED = [
    `7.1 Maintenance schedule\nInterval Task By See\nMonthly Check the jaw closing pressure against the recipe sheet Engineer 7.7\nEvery 500\noperating hours\nLubricate the jaw carriage linear bearings Engineer 8\nEvery 2000\noperating hours\nReplace the jaw heater cartridges and thermocouples Engineer 7.9\nAnnually Replace the pull belts Engineer 7.4\n7.2 Cleaning\nWipe product dust from the film path.\n7.3 Air service unit\nDrain the air filter bowl every day. Replace the filter element every 6 months, or sooner if the pressure\ndrop across the unit exceeds 0.5 bar.\n7.5 Knife\nCheck the knife every week. A nicked knife leaves bags joined at the cut. Replace the knife blade every\n3 months in normal use; do not attempt to re-sharpen it.`,
    `7.6 Vacuum pump\nThe vacuum pump holds the film against the pull belts. Clean its filter monthly. Replace the pump vanes\nafter 6000 operating hours.\n7.7 Jaw pressure\nCheck the jaw closing pressure with the pressure-indicating film supplied in the tool kit. The impression\nmust be even across the full width of the jaw.\n7.9 Heaters\nAfter fitting, calibrate the temperature controllers against a contact thermometer.\nContact Northfield service if the jaws do not close squarely after adjustment.`,
  ];
  const tasks = pmTasksOf(WRAPPED);
  const row = (re: RegExp) => tasks.filter(t => re.test(t.task)).map(t => [t.every, t.unit, t.oem, t.page]);
  it('a table cell that wraps is still the interval of the task beside it', () => {
    expect(row(/^Lubricate the jaw carriage/)).toEqual([[500, 'hour', 'Every 500 operating hours', 1]]);
    expect(row(/^Replace the jaw heater/)).toEqual([[2000, 'hour', 'Every 2000 operating hours', 1]]);
    expect(row(/^Replace the pull belts/)).toEqual([[365, 'day', 'Annually', 1]]);
  });
  it('a sentence that wraps keeps its own interval, and each sentence only its own', () => {
    expect(row(/^Drain the air filter bowl$/)).toEqual([[1, 'day', 'every day', 1]]);
    expect(row(/^Replace the filter element/)).toEqual([[182, 'day', 'every 6 months', 1]]);
    expect(row(/^Check the knife$/)).toEqual([[1, 'week', 'every week', 1]]);
    expect(row(/^Replace the knife blade/)).toEqual([[91, 'day', 'every 3 months', 1]]);
    expect(row(/^Clean its filter$/)).toEqual([[30, 'day', 'monthly', 2]]);
    expect(row(/^Replace the pump vanes$/)).toEqual([[6000, 'hour', 'after 6000 operating hours', 2]]);
  });
  it('gives no interval to a sentence that states none — the tail of a wrapped sentence is not a heading, and a section title ends one', () => {
    const said = tasks.map(t => t.task).join(' | ');
    expect(said).not.toMatch(/jaw closing pressure with|calibrate the temperature|Northfield service|Wipe product dust|Cleaning$/i);
    expect(tasks.filter(t => t.unit === 'hour' && t.every === 6000)).toHaveLength(1);
    expect(tasks).toHaveLength(10);
  });
  it('every task still quotes words that are on its page', () => {
    expect(tasks.every(t => quoteOnPage(WRAPPED, t.page, t.quote))).toBe(true);
  });
  it('a task the manual says twice at the same interval — in its table and again in its section — is one task', () => {
    const twice = pmTasksOf([`Weekly Inspect the pull belts for wear and glazing Setter 7.4\nDaily Drain the air filter bowl Operator 7.3\n7.3 Air\nDrain the air filter bowl every day. Inspect the pull belts weekly. Inspect the pull belts every day in dusty areas.`]);
    expect(twice.map(t => [t.task, t.every, t.unit])).toEqual([
      ['Inspect the pull belts for wear and glazing Setter 7.4', 1, 'week'], ['Drain the air filter bowl Operator 7.3', 1, 'day'], ['Inspect the pull belts in dusty areas', 1, 'day'],
    ]);
  });
});

describe('a procedure the manual gives as numbered steps', () => {
  const HEAD = 'Northfield — VFB-240 Manual Page ';
  const P = [
    `${HEAD}1\n4 Operating the machine\n4.1 Starting up\n1. Check that both guard doors are closed and the emergency stops are released.\n2. Switch the jaw heaters on and select the recipe for the product. Wait until both jaws show the set\ntemperature; this takes about 12 minutes from cold.\n3. Press RESET, then run three empty bags with JOG.\n4.3 Clearing a jam\nWARNING — Never reach into the jaw area with the guards open and the air on. Press STOP, open the\nguard, and wait for the jaws to open fully.\n1. Press STOP and open the front guard.\n2. Remove the jammed bag using the brass scraper provided.`,
    `${HEAD}2\n3. Close the guard, press RESET, then START.\nIf the film tracks to one side, check the reel.\n5 Notes\n1. A single numbered line is not a procedure.\nSee section 4.\n7 Parts\n2. This list does not start at one.\n3. Nor does this.`,
    `${HEAD}3\n8 Lubrication\nUse only the lubricants listed.`,
  ];
  const procs = proceduresOf(P);
  it('reads each run of numbered steps under its title, in the manual’s words, each step with its page', () => {
    expect(procs.map(x => [x.title, x.page, x.steps.length])).toEqual([['Starting up', 1, 3], ['Clearing a jam', 1, 3]]);
    expect(procs[0].steps[1]).toEqual({ n: 2, text: 'Switch the jaw heaters on and select the recipe for the product. Wait until both jaws show the set temperature; this takes about 12 minutes from cold.', page: 1 });
  });
  it('a procedure that runs over the page keeps going, past the page’s running head, and stops at the manual’s prose', () => {
    expect(procs[1].steps.map(x => [x.n, x.page])).toEqual([[1, 1], [2, 1], [3, 2]]);
    expect(procs[1].steps[2].text).toBe('Close the guard, press RESET, then START.');
  });
  it('keeps the section’s warning with its page, whole', () => {
    expect(procs[1].warnings).toEqual([{ text: 'WARNING — Never reach into the jaw area with the guards open and the air on. Press STOP, open the guard, and wait for the jaws to open fully.', page: 1 }]);
    expect(procs[0].warnings).toEqual([]);
  });
  it('one numbered line, or a list that does not start at 1, is not a procedure', () => {
    expect(procs.map(x => x.title)).not.toContain('Notes');
    expect(procs.map(x => x.title)).not.toContain('Parts');
  });
  it('every step’s words are on the page it names', () => {
    expect(procs.flatMap(x => x.steps).every(st => quoteOnPage(P, st.page, st.text.split('. ')[0]))).toBe(true);
  });
});

describe('what the manual says about a thing', () => {
  it('speed, with its page', () => {
    const r = findPassages(PAGES, { topic: 'speed' });
    expect(r.passages[0]).toMatchObject({ page: 1 });
    expect(r.passages[0].text).toContain('Maximum speed 120 bags per minute');
  });
  it('any words asked for', () => {
    expect(findPassages(PAGES, { words: 'gearbox oil' }).passages.map(p => p.page)).toEqual([3]);
    expect(findPassages(PAGES, { words: 'conveyor belt lacing' }).passages).toEqual([]);
  });
  it('a quote is checked against its own page', () => {
    expect(quoteOnPage(PAGES, 1, 'maximum  speed 120 bags per minute')).toBe(true);
    expect(quoteOnPage(PAGES, 2, 'Maximum speed 120 bags per minute')).toBe(false);
    expect(quoteOnPage(PAGES, 1, 'Maximum speed 140 bags per minute')).toBe(false);
  });
});
