import { describe, expect, it } from 'vitest';
import { a3Insight, a3Reading, dayIn } from '../methodInsights/a3';
import { a3Report } from '../../project/method/report/a3';
import type { MethodReportCtx } from '../methodReportModel';

const T = '2026-11-10';
describe('reading a day the team typed', () => {
  it('reads ISO, "7 Nov", "7th November 2026", "Nov 7" and 7/11; says nothing for a word', () => {
    expect(dayIn('2026-11-28', T)).toBe('2026-11-28');
    expect(dayIn('Calibrate by 7 Nov', T)).toBe('2026-11-07');
    expect(dayIn('7th November 2027', T)).toBe('2027-11-07');
    expect(dayIn('Sept 3', T)).toBe('2026-09-03');
    expect(dayIn('7/11', T)).toBe('2026-11-07');
    expect(dayIn('0.3% by 31 Feb', T)).toBe('');
    expect(dayIn('Friday', T)).toBe('');
  });
});

const cm = (what: string, who: string, when: string, cause: string) => [what, who, when, cause].join(' | ');
describe('the A3’s own reading', () => {
  it('a countermeasure naming no cause is a to-do: amber, and the next step names it', () => {
    const r = a3Reading({ counter: cm('Calibrate heater', 'Eng', '20 Nov', 'Cold jaw heater'), 'counter@2': cm('Jaw checklist', 'Prod', '20 Nov', ''), followdate: '28 Nov' }, T);
    expect(r.cms.map(c => c.state)).toEqual(['Open', 'Cause not named']);
    expect(r.attention[0]).toMatchObject({ tone: 'a' });
    expect(r.attention[0]?.text).toMatch(/^1 countermeasure names no cause \(2\. Jaw checklist\)/);
    expect(r.next).toBe('Say which cause countermeasure 2 (“Jaw checklist”) answers — or take it off the page.');
  });
  it('a follow-up day passed with nothing written is red, 5 days ago from 5 Nov; it leads and sets the next step', () => {
    const r = a3Reading({ counter: cm('Fix', 'Eng', '1 Nov', 'Cause'), followdate: '5 Nov' }, T);
    expect(r.follow).toMatchObject({ status: 'overdue', days: 5, tone: 'r' });
    expect(r.follow.says).toBe('The follow-up was due on 5 Nov 2026 — 5 days ago — and what it showed is not written. The page lives until it is.');
    expect(r.attention[0]?.tone).toBe('r');
    expect(r.next).toMatch(/^Check the number now/);
    expect(r.cms[0]?.passed).toBe(true);
  });
  it('once what it showed is written the follow-up is checked and a passed countermeasure day is not asked about', () => {
    const r = a3Reading({ counter: cm('Fix', 'Eng', '1 Nov', 'Cause'), followdate: '5 Nov', held: '0.2% for four weeks' }, T);
    expect(r.follow).toMatchObject({ status: 'checked', tone: 'g' });
    expect(r.cms[0]?.passed).toBe(false);
    expect(r.attention).toEqual([]);
  });
  it('coming, today, no day set, a day it cannot read', () => {
    const base = { counter: cm('Fix', 'Eng', '20 Nov', 'Cause') };
    expect(a3Reading({ ...base, followdate: '2026-11-13' }, T).follow.says).toBe('The follow-up is due on 13 Nov 2026 — in 3 days.');
    expect(a3Reading({ ...base, followdate: '10 Nov' }, T).follow.says).toBe('The follow-up is due today (10 Nov 2026).');
    expect(a3Reading(base, T).follow.status).toBe('noday');
    expect(a3Reading({ ...base, followdate: 'after the shutdown' }, T).follow.status).toBe('unread');
    expect(a3Reading({}, T).follow.status).toBe('notyet');
    expect(a3Reading({}, T).attention).toEqual([]);
  });
  it('a cause with no word on how it is known; a countermeasure with no owner', () => {
    const r = a3Reading({ root: 'Heater runs cold', counter: cm('Fix', '', '20 Nov', 'Cause'), followdate: '28 Nov' }, T);
    expect(r.evidenceMissing).toBe(true);
    expect(r.attention.map(a => a.text.slice(0, 22))).toEqual(['A root cause is writte', '1 countermeasure has n']);
  });
  it('the insight gives the dashboard the same attention and next', () => {
    const i = a3Insight({ answers: { counter: cm('Fix', 'Eng', '', '') }, studies: [], owed: [], today: T });
    expect(i.attention?.[0]?.text).toMatch(/no cause/);
    expect(i.next).toMatch(/countermeasure 1/);
    expect(a3Insight({ answers: {}, studies: [], owed: [], today: T })).toEqual({});
  });
});

const ctx = (answers: Record<string, string>): MethodReportCtx => ({
  method: {} as never, project: { name: 'P' }, line: 'Line 7', answers, studies: [], findings: [], dash: {} as never, owed: [], today: T, answer: id => (answers[id] ?? '').trim(),
});
describe('the A3 sections of the project report', () => {
  it('four sections; the table has one row a countermeasure with its state, and the page-level facts are the team’s words', () => {
    const s = a3Report(ctx({ problem: 'Lane 3 leakers 3.2%', owner: 'Sam', currentnum: '3.2%', target: '0.3% by 14 Nov', counter: cm('Calibrate', 'Eng', '7 Nov', ''), followdate: '28 Nov' }));
    expect(s.map(x => x.id)).toEqual(['a3-glance', 'a3-sheet', 'a3-counter', 'a3-follow']);
    expect(s[0]?.items[0]).toMatchObject({ kind: 'facts' });
    const f = s[0]?.items[0] as { rows: [string, string][] };
    expect(f.rows[0]).toEqual(['Problem', 'Lane 3 leakers 3.2%']);
    expect(f.rows[2]).toEqual(['Questioned and agreed', 'Not written yet.']);
    const t = s[2]?.items[0] as { rows: string[][] };
    expect(t.rows).toEqual([['1', 'Calibrate', 'Eng', '7 Nov', 'No cause named', 'Cause not named · Day passed — is it done?']]);
    expect(s[2]?.items[1]).toMatchObject({ kind: 'paragraph', text: '0 of 1 countermeasure names the cause it answers. A countermeasure that names no cause is a to-do list, not a countermeasure.', tone: 'a' });
    const callout = s[3]?.items[1] as { text: string };
    expect(callout.text).toBe('The follow-up is due on 28 Nov 2026 — in 18 days.');
  });
});
