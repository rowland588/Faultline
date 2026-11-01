import { describe, expect, it } from 'vitest';
import { kataInsight } from '../methodInsights/kata';
import { matchOf, tally, dayWords } from '../kataBoard';
import { kataReport } from '../../project/method/report/kata';
import type { MethodReportCtx } from '../methodReportModel';
import { methodByKey } from '../methods';
import { METHOD_INSIGHT } from '../methodInsight';

const T = '2026-11-10';
const base = { challenge: '52 a minute by March', measure: 'packs a minute', current: '46 to 49', target: '50 every hour', target_by: '2026-11-20', obstacles: 'Film tension\nJaw drift', obstacle_now: 'Film tension' };
const run = (a: Record<string, string>, today = T) => kataInsight({ answers: a, studies: [], owed: [], today });
const texts = (a: Record<string, string>, today = T) => (run(a, today).attention ?? []).map(x => `${x.tone}: ${x.text}`);

describe('the Kata insight, hand-worked', () => {
  it('is registered for kata', () => { expect(METHOD_INSIGHT.kata).toBe(kataInsight); });
  it('says nothing and the default next while the direction is not written', () => {
    expect(run({})).toEqual({});
    expect(run({ challenge: 'x' }).next).toBeUndefined();
  });
  it('the first experiment is asked for once the direction is written', () => {
    expect(run(base).next).toBe('Write the first experiment: one small step at “Film tension” and what you expect from it, before you take it.');
    expect(run({ ...base, obstacle_now: '' }).next).toBe('Name the one obstacle you will address now, then write the first small step at it.');
  });
  it('an open step is seen first; a closed one asks for the next', () => {
    const open = { ...base, step: 'Re-set dancer', prediction: '50', ran: '2026-11-09' };
    expect(run(open).next).toBe('Go and see experiment 1, then write what happened and what was learned.');
    expect(texts(open)).toEqual(['a: Experiment 1 was taken yesterday and has no result written — go and see, and write what happened.']);
    const closed = { ...open, result: '49', matched: 'Partly', learning: 'Helps a little' };
    expect(run(closed).next).toBe('Write experiment 2: one small step at “Film tension” and what you expect from it, before you take it.');
    expect(texts(closed)).toEqual([]);
  });
  it('three days with no step is a routine that has stopped; seven is red', () => {
    const a = { ...base, step: 's', prediction: 'p', result: 'r', matched: 'yes', learning: 'l', ran: '2026-11-07' };
    expect(texts(a)).toEqual(['a: No experiment step for 3 days (the last was 7 Nov) — a storyboard with no step for three days is a routine that has stopped. Hold the five coaching questions and take the next step.']);
    expect(run(a).next?.startsWith('No step for 3 days — hold the five questions today. Write experiment 2')).toBe(true);
    expect(texts({ ...a, ran: '2026-11-02' })[0].startsWith('r: No experiment step for 8 days')).toBe(true);
    expect(texts({ ...a, ran: '2026-11-08' })).toEqual([]);
  });
  it('a result with no prediction written first is named', () => {
    const a = { ...base, step: 's', result: 'r', ran: T };
    expect(texts(a)).toEqual(['a: Experiment 1 has a result but no prediction written first — a prediction written after the step teaches nothing.']);
  });
  it('a miss with no lesson is amber; with a lesson a note; it sets the next step', () => {
    const a = { ...base, step: 's', prediction: '50', result: '47', matched: 'No — heater was not the limit', ran: T };
    expect(texts(a)).toEqual(['a: Experiment 1 missed what was expected and no lesson is written — the miss is the learning; write what it showed, and let it set the next step.']);
    const b = { ...a, learning: 'Reel too heavy for one' };
    expect(texts(b)).toEqual(['n: Experiment 1 missed what was expected. Learned: Reel too heavy for one The next step starts from there.']);
    expect(run(b).next).toBe('Experiment 1 missed what was expected — write the next step from that lesson, at “Film tension”, and what you expect from it.');
  });
  it('the target day: past, undated, and the day to go and see', () => {
    expect(texts({ ...base, target_by: '2026-11-07' })).toEqual(['a: The target condition’s day (7 Nov 2026) passed 3 days ago — is it reached? If so, make it the standard and set the next target condition; if not, write what stood in the way.']);
    expect(texts({ ...base, target_by: '' })).toEqual(['n: The target condition has no day — the experiments need a date to aim at, two to four weeks away.']);
    expect(texts({ ...base, step: 's', prediction: 'p', see_by: '2026-11-09 9:00', ran: T })).toEqual(['a: The day to go and see (9 Nov) has passed and the open step has no result.']);
  });
  it('experiments with no target or no one obstacle', () => {
    expect(texts({ step: 's', prediction: 'p', ran: T }).some(x => x.includes('no target condition is written'))).toBe(true);
    expect(texts({ ...base, obstacle_now: '', step: 's', prediction: 'p', ran: T }).some(x => x.includes('no one obstacle is named'))).toBe(true);
  });
  it('experiments with no day written cannot show a pulse', () => {
    expect(texts({ ...base, step: 's', prediction: 'p' })).toEqual(['n: The experiments have no day written, so the routine’s pulse cannot be read — write the day each step was taken.']);
  });
});

describe('the Kata tally and match', () => {
  it('reads the first word, nothing else', () => {
    expect(['Yes', 'yes, 50 held', 'Partly — one hour', 'No', 'Not really', 'missed', 'maybe', ''].map(matchOf)).toEqual(['yes', 'yes', 'partly', 'no', 'no', 'no', undefined, undefined]);
  });
  it('tallies the seven experiments of the record', () => {
    // Rother's worked case: 1 expected 38 got 35 … 7 expected 30 got 45 — here: three matched, one partly, two missed, one open
    const a: Record<string, string> = {};
    const put = (n: number, v: Record<string, string>) => Object.entries(v).forEach(([k, x]) => { a[n === 1 ? k : `${k}@${n}`] = x; });
    put(1, { step: 'a', prediction: '35', result: '35', matched: 'yes' }); put(2, { step: 'b', prediction: '33', result: '33', matched: 'yes' });
    put(3, { step: 'c', prediction: '33', result: '36', matched: 'no' }); put(4, { step: 'd', prediction: '31', result: '31', matched: 'yes' });
    put(5, { step: 'e', prediction: '30', result: '31', matched: 'partly' }); put(6, { step: 'f', result: '29' });
    put(7, { step: 'g', prediction: '30' });
    expect(tally(a)).toEqual({ written: 7, closed: 6, open: 1, yes: 3, partly: 1, no: 1, notSaid: 1, noPrediction: 1 });
    expect(dayWords('2026-11-20')).toBe('20 Nov 2026');
  });
});

describe('the Kata sections of the project report', () => {
  const method = methodByKey('kata');
  const ctx = (answers: Record<string, string>): MethodReportCtx => ({
    method: method as NonNullable<typeof method>, project: { name: 'P' }, line: 'Line 7', answers, studies: [], findings: [], dash: {} as never, owed: [], today: T,
    answer: id => (answers[id] ?? '').trim(),
  });
  it('three sections whose ids are stable, with an empty project named not invented', () => {
    const s = kataReport(ctx({}));
    expect(s.map(x => x.id)).toEqual(['kata-direction', 'kata-experiments', 'kata-coaching']);
    expect(s[0].lead).toBe('No target condition is written yet — the experiments have nothing to aim at.');
    expect(s[1].lead).toBe('No experiment is written yet.');
    const facts = s[0].items[0];
    expect(facts.kind === 'facts' && facts.rows.find(r => r[0] === 'Challenge')?.[1]).toBe('Not written yet.');
  });
  it('the target day in words, the obstacle being addressed marked, the experiments tabled', () => {
    const a = { ...base, step: 'Re-set dancer', prediction: '50', result: '47', matched: 'No', learning: 'Reel too heavy', ran: '2026-11-08', 'step@2': 'Lighter reel', 'prediction@2': '50' };
    const s = kataReport(ctx(a));
    expect(s[0].lead).toBe('The next target condition: 20 Nov 2026 — 10 days left.');
    const ob = s[0].items.find(i => i.kind === 'table');
    expect(ob?.kind === 'table' && ob.rows).toEqual([['Film tension', 'Addressing now'], ['Jaw drift', 'In the way']]);
    expect(s[1].lead).toBe('2 experiments written: 1 with a result, 1 open.');
    const t = s[1].items.find(i => i.kind === 'table');
    expect(t?.kind === 'table' && t.rows[0]).toEqual(['1 · 8 Nov: Re-set dancer', '50', '47', 'No — the lesson. Learned: Reel too heavy']);
    expect(t?.kind === 'table' && t.rows[1]).toEqual(['2: Lighter reel', '50', 'No result yet', 'Open']);
    expect(s[1].items.some(i => i.kind === 'callout' && i.text === 'Experiment 1: Reel too heavy')).toBe(true);
  });
  it('flags results whose match is not said', () => {
    const s = kataReport(ctx({ ...base, step: 's', prediction: 'p', result: 'r', ran: T }));
    expect(s[1].flags?.[0].text).toContain('1 experiment with a result but no answer');
  });
  it('the coaching table names the missing answers', () => {
    const s = kataReport(ctx({ target: 'x' }));
    const t = s[2].items[0];
    expect(t.kind === 'table' && t.rows.map(r => r[2])).toEqual(['Written', 'Not written', 'Not written', 'Not written', 'Not written']);
  });
});
