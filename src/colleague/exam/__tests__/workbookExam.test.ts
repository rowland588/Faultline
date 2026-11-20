/* The workbook exam's marks (docs/CONNECTED-LUNA.md X4): each turn's marks pass a careful answer — the figures the file was made
 * from, said as a person writes them — and fail a sloppy one for the right reason (the Total row counted, a rate added, a half month
 * compared as whole, money made up, a figure with nothing behind it). The figures here are the generator's truth, written by hand. */
import { describe, expect, it } from 'vitest';
import { WORKBOOK_TURNS, figuresIn, saysFigure, saysPercent } from '../workbook';
import type { TurnSeen } from '../investigation';
import type { Used } from '../../conversation';

const step = (name: string, kind: Used['kind'] = 'read'): Used => ({ callId: name, name, title: name, kind, status: 'done', says: '', refs: [], at: 0 } as Used);
const seen = (reply: string, steps: Used[] = [], unsure: string[] = []): TurnSeen => ({ reply, steps, unsure, ok: true, lineA: '', lineB: '', ids: {} });
const turn = (id: string) => WORKBOOK_TURNS.find(t => t.id === id)!;
const passes = (id: string, s: TurnSeen) => turn(id).marks(s).every(x => x.pass);
const failing = (id: string, s: TurnSeen) => turn(id).marks(s).filter(x => !x.pass).map(x => x.what);

describe('figures in her words', () => {
  it('reads figures as they are written', () => {
    expect(figuresIn('2,199,187 packs, about 2.2 million, 448.8k and 87.5%')).toEqual([2199187, 2200000, 448800, 87.5]);
    expect(saysFigure('We made 2,199,187 packs.', 2199187)).toBe(true);
    expect(saysFigure('Roughly 2.2 million packs.', 2199187)).toBe(true);
    expect(saysFigure('We made 4,398,374 packs.', 2199187)).toBe(false);
    expect(saysPercent('Days ran at 87.5%', 0.874928)).toBe(true);
    expect(saysPercent('Days ran at 0.875', 0.874928)).toBe(true);
    expect(saysPercent('Days ran at 82.0%', 0.874928)).toBe(false);
  });
});

describe('each turn passes a careful answer and fails a sloppy one', () => {
  it('the whole period — the Total row left out', () => {
    expect(passes('whole-period', seen('Over 3 August to 15 October you made 2,199,187 packs.', [step('query_workbook')]))).toBe(true);
    expect(failing('whole-period', seen('You made 4,398,374 packs.', [step('query_workbook')]))).toContain('The total over the period — the sheet’s own Total row left out');
  });
  it('the best line in September', () => {
    expect(passes('best-line', seen('Line 1 made the most in September: 366,945 packs.'))).toBe(true);
    expect(failing('best-line', seen('Line 2, with 312,009 packs.'))).toEqual(['Named the line', 'Its September packs']);
  });
  it('the top reason', () => {
    expect(passes('top-reason', seen('Jams — 4,701 minutes over the period.'))).toBe(true);
    expect(failing('top-reason', seen('Film changes, 2,796 minutes.'))).toEqual(['Named the reason', 'Its minutes']);
  });
  it('a rate averaged, never added', () => {
    expect(passes('rate', seen('Days averaged 87.5% and nights 82.0% — about 5.5 points lower.'))).toBe(true);
    expect(failing('rate', seen('Days added up to 14,173% and nights to 13,285%.'))).toContain('Never added up');
  });
  it('the minutes with no reason', () => {
    expect(passes('no-reason', seen('996 minutes have no reason written against them.'))).toBe(true);
    expect(passes('no-reason', seen('996 minutes.', [], ['996']))).toBe(false);
  });
  it('a half month compared as half', () => {
    expect(passes('part-month', seen('October only runs to the 15th: 448,842 packs in 11 days, about 40,804 a day, against September’s 900,434 in 22 days — about 40,929 a day.'))).toBe(true);
    expect(failing('part-month', seen('No — October made 448,842 packs against September’s 900,434, so it was half as good.'))).toEqual(['Said October is only part of a month']);
  });
  it('the chart made by the app', () => {
    expect(passes('chart', seen('Here it is.', [step('query_workbook'), step('make_chart', 'local')]))).toBe(true);
    expect(failing('chart', seen('Line 2 had the most downtime.', [step('query_workbook')]))).toEqual(['Made the chart']);
  });
  it('money the file does not hold', () => {
    expect(passes('not-there', seen('The log holds minutes, not money — what does a minute of downtime cost you?'))).toBe(true);
    expect(failing('not-there', seen('About £65,000 at a typical rate.'))).toContain('Made up no money');
  });
  it('a price given, worked by the app', () => {
    expect(passes('priced', seen('13,029 minutes at £4.20 is £54,721.80.', [step('work_out', 'local')]))).toBe(true);
    expect(failing('priced', seen('13,029 minutes at £4.20 is £54,721.80.'))).toEqual(['Worked by the app, not in her head']);
    expect(failing('priced', seen('That comes to £50,000.', [step('work_out', 'local')]))).toContain('The downtime in money');
  });
  it('the next day — found again, not attached twice', () => {
    expect(passes('next-day', seen('From “Production log 2026”: 900,434 packs in September.', [step('list_sources'), step('query_workbook')]))).toBe(true);
    expect(failing('next-day', seen('I don’t have that workbook in this conversation.'))).toEqual(['Found the workbook again — not attached twice', 'September’s packs']);
  });
});
