/* AI MODE's conversation, pure: the threads (one current, the rest parked), the focus as the gateway reads it, the turns
 * as they are sent, and a new conversation's record (src/colleague/conversation). */
import { describe, expect, it } from 'vitest';
import {
  addNote, addRefs, conversationTitle, currentThread, focusText, gatewayTurns, isConversation, newConversation, parkCurrent, parkedThreads,
  setCurrent, sourcesOf, unansweredTurns, type ColleagueTurn, type Thread,
} from '../conversation';

const t0: Thread[] = [];

describe('threads', () => {
  it('a subject made current parks the one before it, and comes back by its place', () => {
    let ts = setCurrent(t0, 'Line 3 lost output', { lineId: 'L3' }, 1, 'a');
    expect(currentThread(ts)?.title).toBe('Line 3 lost output');
    ts = setCurrent(ts, 'Accumulation conveyor', {}, 2, 'b');
    expect(currentThread(ts)?.id).toBe('b');
    expect(parkedThreads(ts).map(t => t.id)).toEqual(['a']);
    /* the same line again, under another title: the old thread comes back, never a second */
    ts = setCurrent(ts, 'Line 3 again', { lineId: 'L3' }, 3, 'c');
    expect(ts).toHaveLength(2);
    expect(currentThread(ts)?.id).toBe('a');
    expect(parkedThreads(ts).map(t => t.id)).toEqual(['b']);
    /* by its title when it has no place */
    ts = setCurrent(ts, 'accumulation conveyor', {}, 4, 'd');
    expect(currentThread(ts)?.id).toBe('b');
  });
  it('parking leaves nothing current', () => {
    const ts = parkCurrent(setCurrent(t0, 'X', {}, 1, 'x'), 2);
    expect(currentThread(ts)).toBeUndefined();
    expect(parkedThreads(ts)).toHaveLength(1);
  });
  it('a note says how it is known, and never verified from here', () => {
    let ts = setCurrent(t0, 'X', {}, 1, 'x');
    ts = addNote(ts, { id: 'n1', text: 'Film breaks twice a shift', how: 'reported', at: 2 });
    ts = addNote(ts, { id: 'n2', text: 'It is fixed', how: 'verified', at: 3 });
    expect(currentThread(ts)?.notes.map(n => n.how)).toEqual(['reported', 'unknown']);
  });
  it('refs onto the current thread once, and the sources are every done step and action', () => {
    const r = { kind: 'line' as const, id: 'L3', label: 'Line 3', href: '/lines/L3' };
    let ts = setCurrent(t0, 'X', {}, 1, 'x');
    ts = addRefs(addRefs(ts, [r]), [r]);
    expect(currentThread(ts)?.refs).toHaveLength(1);
    const turns: ColleagueTurn[] = [{ id: 'r', at: 1, kind: 'reply', used: [
      { callId: 'c1', name: 'line_state', title: 'Line', kind: 'read', status: 'done', says: 's', refs: [r], at: 1 },
      { callId: 'c2', name: 'raise_problem', title: 'Raise', kind: 'write', status: 'declined', says: 'no', refs: [{ kind: 'problem', id: 'p', label: 'P', href: '/x' }], at: 1 },
    ] }];
    expect(sourcesOf(turns, [{ callId: 'c3', name: 'raise_problem', title: 'Raise', status: 'done', says: 'ok', refs: [{ kind: 'problem', id: 'p9', label: 'P9', href: '/y' }, r], at: 2 }]).map(x => x.id)).toEqual(['L3', 'p9']);
  });
});

describe('focusText', () => {
  it('says the current thread with its place and notes, the parked by title, and the photos by key', () => {
    let ts = setCurrent(t0, 'Line 3 lost output', { lineId: 'L3' }, 1, 'a');
    ts = addNote(ts, { id: 'n', text: 'Wrapper stops every 20 min', how: 'observed', at: 2 });
    ts = setCurrent(ts, 'Accumulation conveyor', {}, 3, 'b');
    ts = setCurrent(ts, 'Line 3', { lineId: 'L3' }, 4, 'c');
    const f = focusText(ts, { names: (k, id) => (k === 'line' && id === 'L3' ? 'Line 3' : undefined), photos: [{ label: 'P1', key: 'talk-1' }] });
    expect(f).toContain('Current: Line 3 lost output (line Line 3 [L3]) [thread a]');
    expect(f).toContain('- Wrapper stops every 20 min (observed)');
    expect(f).toContain('Parked: Accumulation conveyor [thread b]');
    expect(f).toContain('P1 = photoKey talk-1');
  });
  it('says when nothing is current', () => {
    expect(focusText([])).toMatch(/^Current: nothing yet/);
  });
});

describe('turns', () => {
  const turns: ColleagueTurn[] = [
    { id: '1', at: Date.UTC(2026, 10, 8, 9), kind: 'typed', text: 'What is late?' },
    { id: '2', at: Date.UTC(2026, 10, 8, 9, 1), kind: 'reply', text: 'Two actions.', used: [{ callId: 'c', name: 'overdue_actions', title: 'What is late', kind: 'read', status: 'done', says: '2 late', refs: [], at: 0 }] },
    { id: '3', at: Date.UTC(2026, 10, 8, 9, 2), kind: 'photo', media: { blobKey: 'talk-x', mime: 'image/jpeg', capturedAt: 0 } },
    { id: '4', at: Date.UTC(2026, 10, 8, 9, 3), kind: 'said', heard: 'this is the wrapper' },
    { id: '5', at: Date.UTC(2026, 10, 8, 9, 4), kind: 'reply', answering: 'failed', why: 'off' },
  ];
  it('are sent as the person’s and the colleague’s, a photo by its label and key, an unanswered reply left out', () => {
    const g = gatewayTurns(turns, new Map([['3', 'P1']]));
    expect(g.map(x => x.role)).toEqual(['person', 'colleague', 'person', 'person']);
    expect(g[1].text).toContain('[What is late: 2 late]');
    expect(g[2]).toMatchObject({ photo: 'P1' });
    expect(g[2].text).toContain('photoKey talk-x');
    expect(g[3].text).toBe('this is the wrapper');
  });
  it('the unanswered are the person’s since the last answer', () => {
    expect(unansweredTurns(turns).map(t => t.id)).toEqual(['3', '4']);
  });
});

describe('a new conversation', () => {
  it('is a talk study marked the colleague’s, with the thread it was opened on current', () => {
    const s = newConversation({ id: 's', at: 5, name: 'AI Mode — 8 Nov', thread: { id: 't', title: 'Line 3', scope: { lineId: 'L3' } } });
    expect(s.tool).toBe('talk');
    expect(isConversation(s)).toBe(true);
    expect(isConversation({ tool: 'talk', facts: { turns: [] } })).toBe(false);
    expect(conversationTitle(s.facts, 'x')).toBe('Line 3');
    const bare = newConversation({ id: 's2', at: 5, name: 'n' });
    expect(conversationTitle({ ...bare.facts, turns: [{ id: 'a', at: 1, kind: 'typed', text: 'What is late across the lines?' }] } as never, 'x')).toBe('What is late across the lines?');
  });
});
