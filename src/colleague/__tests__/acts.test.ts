import { describe, expect, it } from 'vitest';
import { conversationAct, reportInputOf } from '../acts';
import { addDays } from '../../lib/weeks';
import type { Chart, DataResult } from '../../lib/data/outputs';

const TODAY = '2026-11-24';

describe('conversationAct — make a report, send it, remind me tomorrow, move into a workspace', () => {
  it('remind me tomorrow, with and without what it is for', () => {
    expect(conversationAct('Remind me tomorrow', TODAY)).toEqual({ kind: 'remind', when: '2026-11-25', what: 'what we were talking about' });
    expect(conversationAct('remind me tomorrow to look at the wrapper', TODAY)).toEqual({ kind: 'remind', when: '2026-11-25', what: 'look at the wrapper' });
    const about = conversationAct('Please remind me tomorrow about the film splice.', TODAY);
    expect(about && about.kind === 'remind' ? about.what : '').toBe('the film splice');
  });
  it('a day named, in n days, next week, an ISO day', () => {
    expect(conversationAct('remind me on Friday to chase engineering', TODAY)).toEqual({ kind: 'remind', when: '2026-11-27', what: 'chase engineering' });
    const inDays = conversationAct('remind me in 2 days to look at the wrapper', TODAY);
    expect(inDays && inDays.kind === 'remind' ? inDays.when : '').toBe(addDays(TODAY, 2));
    const week = conversationAct('remind me next week', TODAY);
    expect(week && week.kind === 'remind' ? week.when : '').toBe(addDays(TODAY, 7));
    expect(conversationAct('remind me on 2026-12-01 to send the pack', TODAY)).toEqual({ kind: 'remind', when: '2026-12-01', what: 'send the pack' });
  });
  it('a short timer is not a reminder for a day — that is start_timer', () => {
    expect(conversationAct('remind me in 20 minutes to look at the wrapper', TODAY)).toBeNull();
    expect(conversationAct('remind me in 2 hours', TODAY)).toBeNull();
  });
  it('send this to an address — never a name alone', () => {
    expect(conversationAct('send this report to jane@acme.test', TODAY)).toEqual({ kind: 'send', to: 'jane@acme.test' });
    const emailed = conversationAct('Email this to Jane.Smith@acme.test please', TODAY);
    expect(emailed && emailed.kind === 'send' ? emailed.to : '').toBe('jane.smith@acme.test');
    expect(conversationAct('send this to jane@acme.test', TODAY)?.kind).toBe('send');
    expect(conversationAct('send this report to John', TODAY)).toBeNull();
    expect(conversationAct('send this email to John', TODAY)).toBeNull();
  });
  it('make a report / put that in a report', () => {
    expect(conversationAct('make a report', TODAY)).toEqual({ kind: 'report' });
    expect(conversationAct('Put that in a report', TODAY)?.kind).toBe('report');
    expect(conversationAct('write that up as a report', TODAY)?.kind).toBe('report');
    expect(conversationAct('make me a report of that', TODAY)?.kind).toBe('report');
  });
  it('move that into a workspace — named, or ask once', () => {
    expect(conversationAct('move that into a workspace', TODAY)).toEqual({ kind: 'workspace' });
    expect(conversationAct('Move that into a workspace called Night shift', TODAY)).toEqual({ kind: 'workspace', name: 'Night shift' });
    expect(conversationAct('please put this chat into a workspace named Packing week', TODAY)).toEqual({ kind: 'workspace', name: 'Packing week' });
    expect(conversationAct('move this and its files into a workspace', TODAY)?.kind).toBe('workspace');
  });
  it('anything else is Luna’s — a question, a job, small talk', () => {
    expect(conversationAct('Hello Luna', TODAY)).toBeNull();
    expect(conversationAct('what is open on this line?', TODAY)).toBeNull();
    expect(conversationAct('track the film jams on the wrapper', TODAY)).toBeNull();
    expect(conversationAct('Luna, tell me what you are', TODAY)).toBeNull();
  });
});

describe('reportInputOf — the latest chart, else the latest result', () => {
  const result = (id: string, at: number, title = 'Downtime by category'): DataResult => ({
    id, title, source: { kind: 'dataset', id: 'stops:w', name: 'Line 2 — stops' },
    query: {},
    result: {
      sheet: 'stops', rowsScanned: 4, rowsMatched: 4, groupsTotal: 2, groupBy: ['category'],
      groups: [{ key: ['Jam'], values: [15], rows: 2, refs: [] }, { key: ['Film'], values: [12], rows: 1, refs: [] }],
      measures: ['minutes'], totals: [27], notes: [], skipped: [],
    },
    at,
  });
  const chart = (id: string, resultId: string, at: number): Chart => ({
    id, at, versions: [{ resultId, type: 'column', measure: 0, title: 'Downtime by category' }],
  });
  it('a chart becomes a chart section, and its finding when the series has one', () => {
    const r = result('R1', 1);
    const got = reportInputOf({ charts: [chart('C1', 'R1', 2)], results: [r] });
    expect(got?.title).toBe('Downtime by category');
    expect(got?.sections[0]).toMatchObject({ kind: 'chart', chartId: 'C1' });
    expect(got?.sections.some(s => s.kind === 'finding' && s.evidence?.[0] === 'R1')).toBe(true);
  });
  it('no chart — a table of the latest result; nothing — null', () => {
    expect(reportInputOf({ charts: [], results: [result('R1', 1)] })?.sections[0]).toMatchObject({ kind: 'table', resultId: 'R1' });
    expect(reportInputOf({ charts: [], results: [] })).toBeNull();
  });
  it('the newest chart wins', () => {
    const got = reportInputOf({ charts: [chart('Cold', 'R1', 1), chart('New', 'R1', 9)], results: [result('R1', 1)] });
    expect(got?.sections[0]?.chartId).toBe('New');
  });
});
