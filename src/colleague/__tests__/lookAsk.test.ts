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
  it('the rows the workbook’s own reports leave out — in, or out again', () => {
    for (const x of ['Read every row', 'read every row.', 'include them', 'Count all the rows please', 'every row'])
      expect(lookAsked(x), x).toEqual({ name: 'read_workbook_as', input: { everyRow: true } });
    for (const x of ['Leave them out', 'read it as the reports do', 'the reports’ basis'])
      expect(lookAsked(x), x).toEqual({ name: 'read_workbook_as', input: { everyRow: false } });
    for (const x of ['read every row of the manual to me', 'include them in the email to Jason', 'why are they left out?'])
      expect(lookAsked(x), x).toBeNull();
  });
  it('THE READING (15 November): what a column is — averaged, never added, added up, time lost, money, output', () => {
    const col = (x: string, c: string, say: string) => expect(lookAsked(x), x).toEqual({ name: 'read_workbook_as', input: { columns: { [c]: say } } });
    col('“Score” is a rate', 'Score', 'average');
    col('Score is a percentage, not a total', 'Score', 'average');
    col('“OEE %” is a percentage', 'OEE %', 'average');
    col('Yield should be averaged', 'Yield', 'average');
    col('Never add “Std hrs”', 'Std hrs', 'never');
    col("Don't add up Crew", 'Crew', 'never');
    col('“Std hrs” is not a figure.', 'Std hrs', 'never');
    col('“Count” is added up', 'Count', 'add');
    col('Column H is a total', 'H', 'add');
    col('“Standing” is time lost', 'Standing', 'lost');
    col('Standing is downtime', 'Standing', 'lost');
    col('“Charge” is money', 'Charge', 'money');
    col('“Made” is output', 'Made', 'volume');
    /* the result and the date are still theirs */
    expect(lookAsked('Score is the result')).toEqual({ name: 'read_workbook_as', input: { result: 'Score' } });
  });
  it('the rows that count, a column to ignore, what was told, and forgetting it', () => {
    expect(lookAsked('Leave out rows where “Type” is “Trial”')).toEqual({ name: 'read_workbook_as', input: { leaveOut: { column: 'Type', is: 'Trial' } } });
    expect(lookAsked('ignore the rows where Status is Cancelled.')).toEqual({ name: 'read_workbook_as', input: { leaveOut: { column: 'Status', is: 'Cancelled' } } });
    expect(lookAsked('Only rows where Site is Hull')).toEqual({ name: 'read_workbook_as', input: { only: { column: 'Site', is: 'Hull' } } });
    expect(lookAsked('Ignore “Notes ref”')).toEqual({ name: 'read_workbook_as', input: { ignore: ['Notes ref'] } });
    expect(lookAsked('ignore the column Batch')).toEqual({ name: 'read_workbook_as', input: { ignore: ['Batch'] } });
    for (const x of ['What have I told you?', 'what have I told you about this workbook', 'What did I tell you about this report?'])
      expect(lookAsked(x), x).toEqual({ name: 'read_workbook_as', input: { told: true } });
    for (const x of ['Forget what I told you', 'forget what I’ve told you about this report.', 'Read it your own way', 'forget that'])
      expect(lookAsked(x), x).toEqual({ name: 'read_workbook_as', input: { forget: true } });
    /* "leave them out" is still the reports' basis, never a column called "them" */
    expect(lookAsked('Leave them out')).toEqual({ name: 'read_workbook_as', input: { everyRow: false } });
  });
  it('said another way, or about something else, it goes to Luna', () => {
    for (const x of ['Score is a rate and leave out the trial runs and tell me which line is worst for standing time this month please, by shift and by week',
      'Why is the score so low on Line 2?', 'What is a rate?', 'Is Score a rate?', 'forget about line 3 for now and look at nights', 'the trial runs do not count',
      'average the two lines', 'Average Score', 'add up the packs', 'what did I tell Jason?'])
      expect(lookAsked(x), x).toBeNull();
  });
});
