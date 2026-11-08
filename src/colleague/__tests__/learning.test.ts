/* What AI Mode did and what could be code instead (src/colleague/learning), on rows built by hand. */
import { describe, expect, it } from 'vitest';
import { findCandidates, inputSaid, normaliseQuestion, readActions, requestsOnDevice, type ActionRow, type ConversationRead } from '../learning';
import type { ColleagueTurn, Used } from '../conversation';

const NOW = Date.parse('2026-11-08T12:00:00Z');
const H = 3_600_000, D = 24 * H;
const iso = (ms: number) => new Date(ms).toISOString();

const used = (name: string, input: Record<string, unknown> = {}, status: Used['status'] = 'done', kind: Used['kind'] = 'read'): Used =>
  ({ callId: `${name}-${Math.random()}`, name, title: name, kind, status, says: '', refs: [], input, at: 0 });
let seq = 0;
const ask = (at: number, text: string): ColleagueTurn => ({ id: `t${seq++}`, at, kind: 'typed', text });
const reply = (at: number, u: Used[]): ColleagueTurn => ({ id: `t${seq++}`, at, kind: 'reply', text: 'ok', used: u });

describe('readActions', () => {
  const rows: ActionRow[] = [
    { at: iso(NOW - H), capability: 'line_state', kind: 'read', status: 'proposed' },
    { at: iso(NOW - H), capability: 'line_state', kind: 'read', status: 'done' },
    { at: iso(NOW - H), capability: 'raise_problem', kind: 'write', status: 'proposed' },
    { at: iso(NOW - H), capability: 'raise_problem', kind: 'write', status: 'done' },
    { at: iso(NOW - 2 * H), capability: 'raise_problem', kind: 'write', status: 'proposed' },
    { at: iso(NOW - 2 * H), capability: 'raise_problem', kind: 'write', status: 'declined' },
    { at: iso(NOW - 3 * H), capability: 'start_project', kind: 'write', status: 'proposed' },
    { at: iso(NOW - 3 * H), capability: 'start_project', kind: 'write', status: 'failed', says: 'You may not' },
    { at: iso(NOW - 4 * H), capability: 'delete_line', kind: null, status: 'refused', input: { lineId: 'L7' }, says: 'not a capability' },
    { at: iso(NOW - 40 * D), capability: 'raise_problem', kind: 'write', status: 'declined' },
  ];
  const r = readActions(rows, NOW, 30, n => (n === 'raise_problem' ? 'Raise a problem' : undefined));
  it('counts each outcome in the window, the old row left out', () => {
    expect([r.proposed, r.done, r.failed, r.declined, r.refused]).toEqual([4, 2, 1, 1, 1]);
  });
  it('the share accepted is of writes only: done and failed (Do it pressed) against declined', () => {
    expect(r.writesAnswered).toBe(3);
    expect(r.writesAccepted).toBe(2);
    expect(r.acceptedShare).toBeCloseTo(2 / 3);
  });
  it('by capability, the most proposed first, titled', () => {
    expect(r.byCapability[0]).toMatchObject({ capability: 'raise_problem', title: 'Raise a problem', proposed: 2, done: 1, declined: 1 });
    expect(r.byCapability.find(c => c.capability === 'line_state')?.title).toBe('Line state');
  });
  it('a refused call is listed with what was tried and why', () => {
    expect(r.refusals).toEqual([{ at: NOW - 4 * H, capability: 'delete_line', tried: '{"lineId":"L7"}', why: 'not a capability' }]);
  });
  it('no writes answered: no share', () => {
    expect(readActions([], NOW).acceptedShare).toBeUndefined();
  });
  it('a long input is cut short', () => {
    expect(inputSaid({ words: 'x'.repeat(300) }, 20)).toHaveLength(20);
  });
});

describe('normaliseQuestion', () => {
  it('drops case, punctuation and the small words, each word once', () => {
    expect(normaliseQuestion("What are Line 7's late problems?")).toBe('line 7 late problems');
    expect(normaliseQuestion('show me line 7 LATE problems please')).toBe('line 7 late problems');
  });
});

describe('findCandidates', () => {
  const lineName = (id: string) => (id === 'L7' ? 'Line 7' : undefined);
  /* six times: "Line 7's late problems" — list_problems (late) on L7, with a set_focus in front that is never a pattern */
  const sixTimes: ConversationRead = {
    id: 'c1',
    turns: Array.from({ length: 6 }, (_, i) => [
      ask(NOW - (i + 1) * D, i % 2 ? 'Line 7 late problems?' : "What are Line 7's late problems"),
      reply(NOW - (i + 1) * D + 1000, [used('set_focus', { title: 'Line 7' }, 'done', 'local'), used('line_state', { lineId: 'L7' }), used('list_problems', { lineId: 'L7', which: 'late' })]),
    ]).flat(),
  };
  const c = findCandidates([], [sixTimes], { now: NOW, lineName });

  it('the same steps on one line, six times, with a saved view on its Problems as the home', () => {
    const s = c.find(x => x.kind === 'steps');
    expect(s?.count).toBe(6);
    expect(s?.home).toEqual({ kind: 'saved view', where: "a saved view on Line 7's Problems filtered to late", href: '/snags?line=L7' });
    expect(s?.sentence).toBe("The colleague took the same 2 steps on Line 7 6 times in the last 30 days (line state, then list problems) — a saved view on Line 7's Problems filtered to late would answer it with no AI.");
  });
  it('the same question asked six times, its words normalised', () => {
    const q = c.find(x => x.kind === 'question');
    expect(q?.count).toBe(6);
    expect(q?.sentence).toMatch(/^You asked “.*” 6 times in the last 30 days — a saved view on Line 7's Problems filtered to late would answer it with no AI\.$/);
  });
  it('a note to copy says it is a proposal and how it becomes code', () => {
    const s = c.find(x => x.kind === 'steps')!;
    expect(s.note).toContain('a proposal, not a change');
    expect(s.note).toContain('Seen 6 times');
    expect(s.note).toContain("Rowland's approval");
  });
  it('twice is not a pattern; three is (the minimum can be set)', () => {
    const two: ConversationRead = { id: 'c2', turns: sixTimes.turns.slice(0, 4) };
    expect(findCandidates([], [two], { now: NOW })).toEqual([]);
    expect(findCandidates([], [two], { now: NOW, min: 2 }).length).toBeGreaterThan(0);
  });
  it('outside the window: nothing', () => {
    expect(findCandidates([], [sixTimes], { now: NOW + 60 * D })).toEqual([]);
  });
  it('steps ending in a write: a new capability that does them in one', () => {
    const conv: ConversationRead = {
      id: 'c3',
      turns: [0, 1, 2].flatMap(i => [ask(NOW - i * D - 5000, `film break number ${i}`), reply(NOW - i * D, [used('line_state', { lineId: 'L7' }), used('list_problems', { lineId: 'L7' }), used('raise_problem', { lineId: 'L7' }, 'waiting', 'write')])]),
    };
    const s = findCandidates([], [conv], { now: NOW, lineName }).find(x => x.kind === 'steps');
    expect(s?.home.kind).toBe('new capability');
    expect(s?.sentence).toContain('the same 3 steps on Line 7 3 times');
  });
  it('the same calculator three times, the same figures twice — its kept figures as the home', () => {
    const calc = (at: number, w: number) => reply(at, [used('run_calculator', { key: 'oee-loss', inputs: { width: w } })]);
    const conv: ConversationRead = { id: 'c4', turns: [calc(NOW - 3 * H, 5), calc(NOW - 2 * H, 5), calc(NOW - H, 7)] };
    const k = findCandidates([], [conv], { now: NOW, calculatorName: () => 'Changeover cost' }).find(x => x.kind === 'calculator');
    expect(k?.count).toBe(3);
    expect(k?.home).toEqual({ kind: 'calculator', where: 'the Changeover cost calculator with its figures kept (Save as before) — the same figures came 2 times', href: '/calc/oee-loss' });
  });
  it('calculator runs from ai_actions of a conversation not on this device count too, never twice for one on it', () => {
    const rows: ActionRow[] = [1, 2, 3].map(i => ({ at: iso(NOW - i * H), conversation_id: 'elsewhere', call_id: `k${i}`, capability: 'run_calculator', kind: 'read', status: 'proposed', input: { key: 'takt', inputs: { a: i } } }));
    const onDevice: ActionRow[] = rows.map(r => ({ ...r, conversation_id: 'c5' }));
    expect(findCandidates(rows, [], { now: NOW }).find(x => x.kind === 'calculator')?.count).toBe(3);
    expect(findCandidates(onDevice, [{ id: 'c5', turns: [] }], { now: NOW }).find(x => x.kind === 'calculator')).toBeUndefined();
  });
  it('ai_actions rows of another device read as requests, split where two minutes pass', () => {
    const rows: ActionRow[] = [0, 1, 2].flatMap(i => [
      { at: iso(NOW - i * D - H), conversation_id: 'other', capability: 'overdue_actions', kind: 'read', status: 'proposed', input: {} },
      { at: iso(NOW - i * D - H + 3000), conversation_id: 'other', capability: 'list_problems', kind: 'read', status: 'proposed', input: {} },
    ]).concat([0, 1, 2].map(i => ({ at: iso(NOW - i * D - 9 * H), conversation_id: 'other', capability: 'overdue_actions', kind: 'read', status: 'proposed', input: {} })));
    const s = findCandidates(rows, [], { now: NOW }).filter(x => x.kind === 'steps');
    expect(s).toHaveLength(1);
    expect(s[0].count).toBe(3);
    expect(s[0].home.href).toBe('/snags');
  });
  it('a write declined most of the time: the colleague proposes it wrongly', () => {
    const rows: ActionRow[] = ['declined', 'declined', 'done', 'declined'].map((s, i) => ({ at: iso(NOW - i * H), call_id: `w${i}`, capability: 'raise_problem', kind: 'write', status: s }));
    const conv: ConversationRead = { id: 'c6', turns: [], actions: [{ callId: 'w0', name: 'raise_problem', status: 'declined', at: NOW }] };
    const d = findCandidates(rows, [conv], { now: NOW, titleOf: n => (n === 'raise_problem' ? 'Raise a problem' : undefined) }).find(x => x.kind === 'declined');
    expect(d?.count).toBe(4);
    expect(d?.sentence).toContain('proposed “Raise a problem” 4 times in the last 30 days and you declined 3');
    expect(d?.home.kind).toBe('instructions');
  });
  it('a write accepted half the time is not a candidate', () => {
    const rows: ActionRow[] = ['declined', 'done', 'declined', 'done'].map((s, i) => ({ at: iso(NOW - i * H), call_id: `w${i}`, capability: 'raise_problem', kind: 'write', status: s }));
    expect(findCandidates(rows, [], { now: NOW }).find(x => x.kind === 'declined')).toBeUndefined();
  });
  it('the requests on this device are the person\'s turns in the window', () => {
    expect(requestsOnDevice([sixTimes], NOW)).toBe(6);
    expect(requestsOnDevice([sixTimes], NOW, 3)).toBe(2);
  });
});
