/* WHAT IS SAID ABOUT A WORKBOOK THAT THE APP ANSWERS ITSELF (colleague/lookAsk) — only when it is the whole of what was said. */
import { describe, it, expect } from 'vitest';
import { lookAsked, startWith } from '../lookAsk';
import { PACK_OFFER } from '../../lib/workbook/lookPack';

describe('about a workbook’s first look, answered in code', () => {
  it('a pack asked for, and nothing else', () => {
    for (const s of [PACK_OFFER, 'make this a pack', 'Make it into a pack please', 'Can you make me a pack', 'Yes please, make a pack', 'put that in a board pack', 'give me a pack of this for them'])
      expect(lookAsked(s), s).toEqual({ name: 'workbook_pack', input: {} });
    for (const s of ['make this a pack and email it to Jason', 'what is a pack', 'pack the line faster', 'why did the pack rate fall in October?'])
      expect(lookAsked(s), s).toBeNull();
  });
  it('the sheet to start with — the chip, or said', () => {
    expect(lookAsked(startWith('RAW data'))).toEqual({ name: 'read_workbook_as', input: { sheet: 'RAW data' } });
    expect(lookAsked('start with the sheet "Hourly archive".')).toEqual({ name: 'read_workbook_as', input: { sheet: 'Hourly archive' } });
  });
  it('where the headings are', () => {
    expect(lookAsked('The headings are on row 5')).toEqual({ name: 'read_workbook_as', input: { headerRow: 5 } });
    expect(lookAsked('headers are in row 3 of “Shift report”')).toEqual({ name: 'read_workbook_as', input: { headerRow: 3, sheet: 'Shift report' } });
    expect(lookAsked('the headings are on the wrong row')).toBeNull();
  });
  it('which column is the result, or the date', () => {
    expect(lookAsked('Column M is the result')).toEqual({ name: 'read_workbook_as', input: { result: 'M' } });
    expect(lookAsked('“Fin var £” is the one we manage by.')).toEqual({ name: 'read_workbook_as', input: { result: 'Fin var £' } });
    expect(lookAsked('Week ending is the date')).toEqual({ name: 'read_workbook_as', input: { date: 'Week ending' } });
    expect(lookAsked('I think the problem with line 2 on nights after the changeover is the result of poor training')).toBeNull();
    expect(lookAsked('What is the result?')).toBeNull();
  });
});
