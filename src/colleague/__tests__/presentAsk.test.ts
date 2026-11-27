import { describe, expect, it } from 'vitest';
import { dataAsk, presentForm, presentLead, presentOffer, presentOffered, presentWorth, PRESENT_ASK, PRESENT_CHIPS } from '../presentAsk';
import { helloSaid } from '../hello';
import { fastChatKind } from '../../tools/colleague/colleagueAssist';
import { graphAsked } from '../autoChart';
import type { DataResult } from '../../lib/data/outputs';
import type { Used } from '../conversation';

const result = (n: number): DataResult => ({
  id: 'R1', title: 'Top losses', at: 1, source: { kind: 'dataset', id: 'stops:w', name: 'Line 2 — stops' },
  query: { groupBy: ['category'] },
  result: {
    sheet: 'stops', rowsScanned: n, rowsMatched: n, groupsTotal: n, groupBy: ['category'],
    groups: Array.from({ length: n }, (_, i) => ({ key: [`k${i}`], values: [i + 1], rows: 1, refs: [] })),
    measures: ['minutes'], totals: [0], notes: [], skipped: [],
  },
});
const step = (resultId?: string): Used => ({
  callId: 'q', name: 'query_data', title: 'Ask the data', kind: 'read', status: 'done', says: '',
  refs: resultId ? [{ kind: 'result', id: resultId, label: '', href: '' }] : [], at: 1,
} as Used);

describe('presentAsk — client-office data ask and how they would like it', () => {
  it('hello is a meeting, not a dead Hello, and never a figure', () => {
    expect(helloSaid('Hello Luna', { hour: 10 })).toMatch(/good to meet you/i);
    expect(helloSaid('Hello Luna', { hour: 10 })).toMatch(/I'm Luna/);
    expect(helloSaid('Hello Luna', { hour: 10 })).not.toMatch(/\d/);
    expect(helloSaid('Hi', { hour: 15, name: 'Rowland' })).toBe("Hello, Rowland — good to see you. I'm Luna.");
    expect(helloSaid('Hello Luna', { hour: 10, room: ['Jason — COO of Branston'] })).toBe("Hello, Jason — good to meet you. I'm Luna.");
    expect(helloSaid("Hello, I'm Sarah", { hour: 14 })).toBe("Hello, Sarah — good to meet you. I'm Luna.");
  });

  it('a data ask is not swallowed as hello or fast chat', () => {
    const hour = { hour: 10, name: 'Rowland' };
    expect(helloSaid('show me top losses', hour)).toBeNull();
    expect(helloSaid('what happened last week compared to the week before', hour)).toBeNull();
    expect(helloSaid('top losses', hour)).toBeNull();
    expect(fastChatKind('show me top losses')).toBeNull();
    expect(fastChatKind('what happened last week compared to the week before')).toBeNull();
    expect(fastChatKind('top losses')).toBeNull();
    expect(fastChatKind('Hello Luna')).toBe('hello');
    expect(fastChatKind("Hello, I'm Sarah")).toBe('hello');
  });

  it('offers graphs when the form is open', () => {
    expect(dataAsk('show me top losses')).toBe(true);
    expect(dataAsk('what happened last week compared to the week before')).toBe(true);
    expect(presentForm('show me top losses')).toBeUndefined();
    expect(presentOffer('show me top losses')).toBe(true);
    expect(presentOffer('what happened last week compared to the week before')).toBe(true);
    expect(PRESENT_CHIPS).toEqual(['Graphs', 'A table', 'A report']);
    expect(presentLead('Jam led.', true)).toBe(`${PRESENT_ASK}\n\nJam led.`);
    expect(presentLead('', true)).toBe(PRESENT_ASK);
    expect(presentWorth([step('R1')], new Map([['R1', result(2)]]))).toBe(true);
    expect(presentOffered([...PRESENT_CHIPS])).toBe(true);
  });

  it('does not offer when they already said graphs', () => {
    expect(presentForm('show me top losses as a graph')).toBe('graphs');
    expect(presentOffer('show me top losses as a graph')).toBe(false);
    expect(presentForm('Graphs')).toBe('graphs');
    expect(presentForm('A table')).toBe('table');
    expect(presentForm('A report')).toBe('report');
    expect(presentLead('Jam led.', false)).toBe('Jam led.');
    expect(graphAsked('Graphs', true)).toBe(true);
    expect(graphAsked('Graphs', false)).toBe(false);
  });
});
