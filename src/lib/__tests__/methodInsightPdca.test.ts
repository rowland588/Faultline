import { describe, expect, it } from 'vitest';
import { decisionOf, hitOf, readCycles, cycleView } from '../methodPdca';
import { pdcaInsight } from '../methodInsights/pdca';
import { methodByKey } from '../methods';
import { methodDashboard } from '../methodDashboard';
import { methodReportModel } from '../methodReportModel';
import { pdcaReport } from '../../project/method/report/pdca';

const ins = (answers: Record<string, string>) => pdcaInsight({ answers, studies: [], owed: [], today: '2026-11-10' });
/* the record's worked case: film breaks a shift, 7.0 → predicted −30% (4.9) → got 2.5 */
const plan = { number: 'Film breaks a shift', gap: '7.0 a shift against 4 wanted', cause: 'Splice', change: 'New splice guide', expect: '4.9 a shift (30% fewer)' };

describe('PDCA reads the team’s first word', () => {
  it('Yes, Partly and No are the prediction’s verdict; anything else is not stated', () => {
    expect(hitOf('Yes — 2.5, twice the prediction')).toBe('yes');
    expect(hitOf('  partly: 5.5 against 4.9')).toBe('partly');
    expect(hitOf('No, short by one')).toBe('no');
    expect(hitOf('Not sure')).toBeUndefined();
    expect(hitOf('Short by one')).toBeUndefined();
    expect(hitOf('')).toBeUndefined();
  });
  it('Adopt, Adapt and Abandon are the decision; the words after are its reason', () => {
    expect(decisionOf('Adapt — nearly there')).toBe('adapt');
    expect(decisionOf('Abandon it')).toBe('abandon');
    expect(decisionOf('adopted')).toBeUndefined();
    const r = readCycles({ decision: 'Adapt — nearly there' })[0];
    expect(r.why).toBe('nearly there');
  });
  it('an adapted cycle needs no standard to be complete; an adopted one does', () => {
    const act = { ...plan, who: 'Sam', small: 's', collect: 'c', seen: 'x', result: '2.5', predicted: 'Yes', learned: 'l', beyond: 'b' };
    expect(cycleView({ ...act, decision: 'Adapt — x' }, 1).status).toBe('Complete — decided');
    expect(cycleView({ ...act, decision: 'Adopt — x' }, 1).status).toBe('Under way — in Act');
    expect(cycleView({ ...act, decision: 'Adopt — x', standard: 'LS-12', trained: 'All' }, 1).status).toBe('Complete — decided');
  });
});

describe('PDCA’s own reading of its project', () => {
  it('says nothing about a cycle that has not been started', () => {
    expect(ins({})).toEqual({});
    expect(ins(plan)).toEqual({});
  });
  it('a cycle under way with no prediction written is flagged', () => {
    const r = ins({ number: 'n', who: 'Sam, Tuesday' });
    expect(r.attention?.[0]).toMatchObject({ tone: 'a' });
    expect(r.attention?.[0].text).toMatch(/^Cycle 1 is under way with no written prediction/);
  });
  it('a result not set against the prediction asks for Yes, Partly or No', () => {
    const r = ins({ ...plan, result: '2.5 a shift' });
    expect(r.attention?.some(a => /does not say if it hit the prediction/.test(a.text))).toBe(true);
  });
  it('a miss says so with both figures and the next is to start the next cycle from Act’s change', () => {
    const r = ins({ ...plan, result: '5.5 a shift', predicted: 'No — 5.5 against 4.9', again: 'Fit the guide to both wrappers' });
    expect(r.attention?.[0].text).toBe('Cycle 1 missed its prediction (expected 4.9 a shift (30% fewer); got 5.5 a shift) — plan the next cycle from what was learned.');
    expect(r.next).toBe('Cycle 1 missed its prediction: start cycle 2 — Act already says what to try (“Fit the guide to both wrappers”).');
  });
  it('a miss with no next change written asks for it first; partly is worded as partly', () => {
    const r = ins({ ...plan, result: '5.5', predicted: 'Partly' });
    expect(r.next).toBe('Cycle 1 only partly hit its prediction: in Act write the next change, then start cycle 2.');
  });
  it('the cycle in hand is the latest: a missed cycle 1 followed by a started cycle 2 is read on cycle 2', () => {
    const r = ins({ ...plan, result: '5.5', predicted: 'No', 'opened@2': '2026-11-09', 'change@2': 'x' });
    expect(r.attention ?? []).toEqual([]);
    expect(r.next).toBeUndefined();
  });
  it('hit it: the next is to decide; adopted with no standard written is flagged; written, it is quiet', () => {
    const hit = { ...plan, result: '2.5 a shift', predicted: 'Yes — twice the prediction', beyond: 'Welch p<0.001' };
    expect(ins(hit)).toEqual({ next: 'Cycle 1 hit its prediction: in Act decide — adopt, adapt or abandon.' });
    const adopted = ins({ ...hit, decision: 'Adopt — it holds' });
    expect(adopted.attention?.[0].text).toBe('Cycle 1 is adopted but not yet written into a standard — until it is, the gain is not held.');
    expect(adopted.next).toBe('Cycle 1 is adopted: in Act write where the new way is now written (the line standard or checklist).');
    expect(ins({ ...hit, decision: 'Adopt — it holds', standard: 'Line standard LS-12' })).toEqual({});
  });
  it('hit it with no reason that it is beyond the noise is a note, not an alarm', () => {
    const r = ins({ ...plan, result: '2.5', predicted: 'Yes' });
    expect(r.attention?.[0]).toMatchObject({ tone: 'n' });
  });
  it('adapted with no change written for the next cycle is flagged; abandoned is a note', () => {
    const base = { ...plan, result: '5', predicted: 'No' };
    expect(ins({ ...base, decision: 'Adapt — nearly' }).next).toBe('Cycle 1 is to be adapted: in Act write the change for the next cycle, then start cycle 2.');
    const ab = ins({ ...base, decision: 'Abandon — the guide does not fit' });
    expect(ab.attention?.map(a => a.tone)).toEqual(['n']);
    expect(ab.next).toBeUndefined();
  });
  it('three cycles checked and none hit is flagged', () => {
    const a: Record<string, string> = { ...plan, result: '5', predicted: 'No' };
    for (const n of [2, 3]) Object.assign(a, { [`expect@${n}`]: 'e', [`result@${n}`]: '5', [`predicted@${n}`]: 'Partly' });
    expect(ins(a).attention?.some(x => /^3 cycles have run and none hit its prediction/.test(x.text))).toBe(true);
  });
});

describe('the dashboard and the report say it', () => {
  const m = methodByKey('pdca');
  if (!m) throw new Error('pdca');
  const answers = { ...plan, who: 'Sam', result: '5.5 a shift', predicted: 'No — 5.5 against 4.9', learned: 'Guide fits only wrapper 2', again: 'Fit it to wrapper 1', decision: 'Adapt — wrapper 1 differs' };
  it('the dashboard’s next and attention come from the insight', () => {
    const d = methodDashboard({ method: m, answers, studies: [], owed: [], today: '2026-11-10', readsOf: () => undefined });
    expect(d.next).toBe('Cycle 1 missed its prediction: start cycle 2 — Act already says what to try (“Fit it to wrapper 1”).');
    expect(d.attention[0].tone).toBe('a');
  });
  it('the report’s own sections: the table of cycles, what was learned, and the cycle in hand', () => {
    const r = methodReportModel({ method: m, answers, studies: [], owed: [], today: '2026-11-10', project: { name: 'Seal', lead: 'R' }, line: 'L7', printed: 'x', readsOf: () => undefined }, pdcaReport);
    const ids = r.sections.map(s => s.id);
    expect(ids).toEqual(['journey', 'telling', 'attention', 'pdca-cycles', 'pdca-learned', 'pdca-hand', 'wrote']);
    const t = r.sections[3].items[0];
    expect(t.kind === 'table' && t.rows[0]).toEqual(['1', '7.0 a shift against 4 wanted', '4.9 a shift (30% fewer)', '5.5 a shift', 'No — missed', 'Adapt — wrapper 1 differs']);
    expect(t.kind === 'table' && t.tones).toEqual(['r']);
    expect(r.sections[3].lead).toBe('1 cycle: 0 hit the prediction, 1 missed it or only partly hit it.');
    const hand = r.sections[5].items[0];
    expect(hand.kind === 'facts' && hand.rows[0]).toEqual(['The change', 'New splice guide']);
  });
});
