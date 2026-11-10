/* FC-241 — hand-worked cases (knowledge/specs/FC-241-workstation-stops.md §6) */
import { describe, expect, it } from 'vitest';
import def, { MAX_STATIONS, wid } from '../defs/workstation-stops';
import { runCalc } from '../calc';

const base = { unit: 'kg', same: 'same', per: 'min', rate: 12 };
describe('stops across workstations', () => {
  it('case A: 8.5, 22 and 5.25 minutes at 12 kg a minute lose 429 kg; the worst is 61.5%', () => {
    const r = runCalc(def, { n: 4, ...base, [wid(0, 'min')]: 8.5, [wid(2, 'min')]: 22, [wid(3, 'min')]: 5.25, watched: 120, unitCost: 2.1 });
    expect(r.blocked).toBe(false);
    expect(r.result?.verdict).toBe('429 kg lost');
    expect(r.result?.more?.join(' ')).toContain('stopped for 7.4% of the 2 hours watched');
    expect(r.result?.money?.text).toContain('£900.90');
  });
  it('case B: an hourly rate divides by 60', () => {
    const r = runCalc(def, { n: 2, unit: 'units', same: 'own', per: 'hour', [wid(0, 'min')]: 15, [wid(0, 'rate')]: 600, [wid(1, 'min')]: 6, [wid(1, 'rate')]: 1800 });
    expect(r.result?.verdict).toBe('330 units lost');
  });
  it('the unit changes the word, not the number', () => {
    const a = runCalc(def, { n: 1, ...base, [wid(0, 'min')]: 10 }).result;
    const b = runCalc(def, { n: 1, ...base, unit: 'packs', [wid(0, 'min')]: 10 }).result;
    expect(a?.verdict).toBe('120 kg lost'); expect(b?.verdict).toBe('120 packs lost');
  });
  it('case C: nothing stopped loses nothing', () => {
    const r = runCalc(def, { n: 3, ...base });
    expect(r.result?.sentence).toBe('None of 3 workstations has stopped yet.');
    expect(r.problems.some(p => /No workstation has stopped/.test(p.say))).toBe(true);
  });
  it('stops with no minutes are said', () => {
    const r = runCalc(def, { n: 2, ...base, [wid(1, 'stops')]: 2, [wid(0, 'min')]: 1 });
    expect(r.problems.some(p => /2 stops counted but no minutes/.test(p.say))).toBe(true);
  });
  it('thirty workstations total as worked', () => {
    const inputs: Record<string, number | string> = { n: MAX_STATIONS, ...base };
    for (let i = 0; i < MAX_STATIONS; i++) inputs[wid(i, 'min')] = i + 1;
    expect(runCalc(def, inputs).result?.verdict).toBe('5,580 kg lost'); // 465 min × 12
  });

  describe('part 2 — carried forward, with the confidence (SciPy cases)', () => {
    const A = { n: 4, ...base, [wid(0, 'min')]: 8.5, [wid(0, 'stops')]: 3, [wid(2, 'min')]: 22, [wid(2, 'stops')]: 2, [wid(3, 'min')]: 5.25, [wid(3, 'stops')]: 1, watched: 120 };
    const said = (i: Record<string, number | string>): string => (runCalc(def, i).result?.more ?? []).join(' ');
    it('8 hours at 95%: 1,716 kg between 629.7 and 3,735, Rough, 66 stops and 20 hours more', () => {
      const t = said({ ...A, horizon: '8' });
      expect(t).toContain('Carried on for 8 hours: about 1,716 kg lost — between 629.7 and 3,735 kg at 95% confidence — from 6 stops in 2 hours of watching.');
      expect(t).toContain('Confidence: Rough.');
      expect(t).toContain('width rests on the 6 stops counted');
      expect(t).toContain('About 66 stops — roughly 20 hours more watching');
    });
    it('a chip changes the figure and the chart’s end; the confidence changes the range', () => {
      const r1 = runCalc(def, { ...A, horizon: '1', conf: '90' }).result;
      expect(r1?.tiles.find(t => t.k === 'If it goes on')?.v).toBe('214.5');
      expect(r1?.tiles.find(t => t.k === 'Confidence')?.of).toBe('90% range 93.4 to 423.4');
      const pic = r1?.picture;
      expect(pic?.lines.length).toBe(3);
      expect(pic?.dots.length).toBe(2);
      const r99 = runCalc(def, { ...A, horizon: '1', conf: '99' }).result;
      expect(r99?.tiles.find(t => t.k === 'Confidence')?.of).toBe('99% range 54.9 to 559.8');
    });
    it('a week asks the hours a week and never guesses; another takes typed hours', () => {
      expect(said({ ...A, horizon: 'week' })).toContain('Give the hours the line runs in a week');
      expect(said({ ...A, horizon: 'week', weekH: 120 })).toContain('Carried on for a week (120 hours): about 25,740 kg lost');
      expect(said({ ...A, horizon: '1', customH: 6 })).toContain('Carried on for 6 hours: about 1,287 kg lost');
      expect(said({ ...A, customH: 2000 })).toContain('Carried on for 2,000 hours');
    });
    it('says how confidence grows: the stops needed at the chosen level, and that minutes alone do not help', () => {
      const t = said({ ...A, conf: '99' });
      expect(t).toContain('at 99% it takes 29 stops to be Fair (within ±50%) and 111 to be Firm (within ±25%). You have 6.');
      expect(said({ ...A, conf: '90' })).toContain('at 90% it takes 13 stops to be Fair');
      expect(said({ ...A, watched: 2000 })).toContain('You have 6.');
    });
    it('the time watched is in the science: the rate, the stretch’s prediction, no stops ruling out', () => {
      const t = said({ ...A, watched: 120, horizon: '8' });
      expect(t).toContain('The rate seen is 3 stops an hour (1.1 to 6.53 at 95%) from 6 in 2 hours.');
      expect(t).toContain('one stretch of 8 hours could see 8 to 52 of them — about 572 to 3,718 kg');
      expect(t).toContain('Whether they come in bursts cannot be told yet: the watching was typed, not timed');
    });
    it('watching longer at the same rate narrows the range', () => {
      const wide = runCalc(def, { ...A, horizon: '8' }).result?.tiles.find(t => t.k === 'Confidence')?.of;
      const long = runCalc(def, { ...A, horizon: '8', watched: 1200, [wid(0, 'min')]: 85, [wid(0, 'stops')]: 30, [wid(2, 'min')]: 220, [wid(2, 'stops')]: 20, [wid(3, 'min')]: 52.5, [wid(3, 'stops')]: 10 }).result?.tiles.find(t => t.k === 'Confidence')?.of;
      expect(wide).toBe('95% range 629.7 to 3,735');
      expect(long).toBe('95% range 1,309.5 to 2,208.8');
    });
    it('no stop seen says the count’s upper bound and carries nothing; no time watched asks for it', () => {
      expect(said({ n: 2, ...base, watched: 60, horizon: '8' })).toContain('No stop has been seen in the 1 hour watched. At 95% confidence the rate could still be as high as 3.69 an hour (29.5 stops over 8 hours); 3.7 hours of watching with none would rule out one an hour.');
      expect(said({ n: 2, ...base, [wid(0, 'min')]: 5 })).toContain('Give the time you have watched');
    });
    it('minutes with no stops counted: the point figure and the reason there is no range', () => {
      const t = said({ n: 1, ...base, [wid(0, 'min')]: 10, watched: 60, horizon: '8' });
      expect(t).toContain('about 960 kg lost — but no range can be given because some workstations have minutes stopped but no stops counted');
    });
  });
});

/* PART 6 (spec §Part 6, Rowland, 10 November on a live Cellox test: "I can't see what each section is actually costing us … it's the
   frequency of the stops that matters as well … I put a week, and the graph just completely disappeared") */
describe('stops across workstations — what each costs, how often it stops', () => {
  const caseA = { n: 4, ...base, [wid(0, 'name')]: 'Filler', [wid(0, 'min')]: 8.5, [wid(0, 'stops')]: 3, [wid(1, 'name')]: 'Wrapper', [wid(2, 'name')]: 'Sealer', [wid(2, 'min')]: 22, [wid(2, 'stops')]: 2, [wid(3, 'name')]: 'Packer', [wid(3, 'min')]: 5.25, [wid(3, 'stops')]: 1, watched: 120 };
  it('criterion 21: a bar a workstation ranked by its loss, its stops beside it; the frequency read by hand', () => {
    const r = runCalc(def, caseA).result!;
    expect(r.bars?.rows.map(b => [b.label, b.a, b.b, b.aText, b.bText])).toEqual([
      ['Sealer', 264, 2, '264 kg', '2 stops · 11 min each'],
      ['Filler', 102, 3, '102 kg', '3 stops · 2.83 min each'],
      ['Packer', 63, 1, '63 kg', '1 stop · 5.25 min each'],
    ]);
    expect(r.bars?.title).toBe('What each workstation lost, and how often it stopped');
    expect(r.more?.join(' ')).toContain('By how often: Filler stopped most — 3 times, 2.83 min a stop on average, 102 kg lost. By how much: Sealer lost the most from 2 stops, 11 min a stop. Filler stops often but briefly; Sealer\'s loss comes from fewer, longer stops');
  });
  it('with a unit’s worth, each bar says its money too', () => {
    const r = runCalc(def, { ...caseA, unitCost: 2.1 }).result!;
    expect(r.bars?.rows[0].aText).toBe('264 kg · £554.40');
  });
  it('one workstation both most frequent and biggest loser is said once', () => {
    const r = runCalc(def, { n: 2, ...base, [wid(0, 'name')]: 'A', [wid(0, 'min')]: 20, [wid(0, 'stops')]: 5, [wid(1, 'name')]: 'B', [wid(1, 'min')]: 2, [wid(1, 'stops')]: 1 }).result!;
    expect(r.more?.join(' ')).toContain('A both stopped most often (5 stops, 4 min each on average) and lost the most.');
  });
  it('criterion 22: A week with no hours keeps a chart over the time watched and asks for the hours', () => {
    const r = runCalc(def, { ...caseA, horizon: 'week' }).result!;
    expect(r.picture?.title).toBe('Kg lost so far');
    expect(r.picture?.x.max).toBeGreaterThanOrEqual(2);
    expect(r.picture?.caption).toMatch(/Type the hours the line runs in a week/);
    expect(r.tiles.find(t => t.k === 'If it goes on')?.of).toBe('give the hours a week');
    const w = runCalc(def, { ...caseA, horizon: 'week', weekH: 120 }).result!;
    expect(w.picture?.title).toBe('Kg lost if it carries on');
  });
  it('the phone’s second pane is Results for this tool', () => { expect(def.answerTab).toBe('Results'); });
});
