/* AI MODE's conversation, pure: the threads (one current, the rest parked), the focus as the gateway reads it, the turns
 * as they are sent, and a new conversation's record (src/colleague/conversation). */
import { describe, expect, it } from 'vitest';
import { STOP_NOTE } from '../colleagueAsk';
import { COLLEAGUE_LIMITS } from '../../tools/colleague/colleagueAssist';
import {
  CHANGED, FOCUS_MAX, IT_SAYS, factsOfConversation, appendTurn, addNote, addRefs, chatProjects, conversationTitle, currentThread, filesBlock, focusText, gatewayTurns, isConversation, newConversation, parkCurrent, parkedThreads,
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
  it('says what report is on screen in Present mode (M1)', () => {
    const f = focusText([], { present: { reportId: 'Dabc12', version: 3, title: 'Line 2 downtime', form: 'report' } });
    expect(f).toContain('On screen (Present mode): Report Dabc12 v3 — “Line 2 downtime”');
    expect(f).toContain('“the chart”, section headings and “on screen” mean it');
  });
});

/* WHAT IS SENT IS NEVER CUT WITHOUT A WORD (22 November, the review): the gateway takes 12,000 characters of the context and drops the
 * rest in silence — and the files, each with what it says and what changed, are the part that grows with the customer. */
describe('the context fits what the gateway takes — and the files are what gives way', () => {
  const file = (i: number, says = 620, changed = 520) => `“File ${i}” — f${i}.xlsx, came in 21 Nov, ready [source s${i}]\n    ${IT_SAYS}: ${'s'.repeat(says)}\n    ${CHANGED} (this version came in 21 Nov): ${'c'.repeat(changed)}`;
  const twelve = Array.from({ length: 12 }, (_, i) => file(i));

  it('what the device sends, with the Stop note after it, is within what the gateway takes', () => {
    expect(FOCUS_MAX + 1 + STOP_NOTE.length).toBeLessThanOrEqual(COLLEAGUE_LIMITS.focusChars);
  });

  it('the files come LAST — after what this conversation has made, its photos and what is being built', () => {
    const f = focusText([], { files: [file(1, 20, 20)], outputs: 'result r1 “Downtime by reason”', photos: [{ label: 'P1', key: 'talk-1' }] });
    const at = (x: string) => f.indexOf(x);
    expect(at('Made in this conversation')).toBeGreaterThan(-1);
    expect(at('Files in the register')).toBeGreaterThan(at('Made in this conversation'));
    expect(at('Files in the register')).toBeGreaterThan(at('P1 = photoKey talk-1'));
    expect(f.endsWith(`${CHANGED} (this version came in 21 Nov): ${'c'.repeat(20)}`)).toBe(true);
  });

  it('twelve files that would not fit: the newest whole, then without what changed, then by their line — and the rest counted, never cut mid-line', () => {
    const outputs = Array.from({ length: 30 }, (_, i) => `result r${i} “A result with a long enough name to take room ${i}”`).join('\n');
    const f = focusText([], { files: twelve, outputs, photos: [{ label: 'P1', key: 'talk-1' }] });
    expect(f.length).toBeLessThanOrEqual(FOCUS_MAX);
    /* nothing this conversation is working on fell off */
    expect(f).toContain('result r29');
    expect(f).toContain('P1 = photoKey talk-1');
    const block = f.slice(f.indexOf('Files in the register'));
    /* the newest is said whole; a later one loses what changed first; a later one still is its line alone */
    expect(block).toContain(`[source s0]\n    ${IT_SAYS}: ${'s'.repeat(620)}\n    ${CHANGED}`);
    const lines = block.split('\n');
    const whole = twelve.filter((_, i) => block.includes(`[source s${i}]\n    ${IT_SAYS}: ${'s'.repeat(620)}\n    ${CHANGED}`)).length;
    const listed = lines.filter(l => /^ {2}“File \d+”/.test(l)).length;
    expect(whole).toBeGreaterThan(0);
    expect(whole).toBeLessThan(12);
    /* every line is a whole line: a file's line, what it says, what changed, or the count of the rest */
    for (const l of lines.slice(1)) expect(/^ {2}“File \d+” — f\d+\.xlsx, came in 21 Nov, ready \[source s\d+\]$|^ {4}It says: s+$|^ {4}Changed since it was read before \(this version came in 21 Nov\): c+$|^ {2}… and \d+ more files? not listed here \(this context is full\) — list_sources lists them$/.test(l)).toBe(true);
    if (listed < 12) expect(lines[lines.length - 1]).toBe(`  … and ${12 - listed} more ${12 - listed === 1 ? 'file' : 'files'} not listed here (this context is full) — list_sources lists them`);
  });

  it('fitted file by file: whole, else without what changed, else its line alone', () => {
    const two = [file(0, 100, 100), file(1, 100, 100)];
    const all = filesBlock(two, 5000);
    expect(all.split(CHANGED).length - 1).toBe(3);   /* twice under the files, once in the heading */
    /* room for one whole and the next without what changed */
    const head = 430 + 110;
    const one = `  ${two[0]}`.length + 1, bare = `  ${two[1]}`.split('\n').slice(0, 2).join('\n').length + 1;
    const tight = filesBlock(two, head + one + bare);
    expect(tight).toContain(`[source s0]\n    ${IT_SAYS}: ${'s'.repeat(100)}\n    ${CHANGED}`);
    expect(tight).toContain(`[source s1]\n    ${IT_SAYS}: ${'s'.repeat(100)}`);
    expect(tight.endsWith('s'.repeat(100))).toBe(true);
    /* room for the first whole and only the second's line */
    const tighter = filesBlock(two, head + one + `  ${two[1]}`.split('\n')[0].length + 1);
    expect(tighter.endsWith('[source s1]')).toBe(true);
    /* no room for even one line: they are counted, not listed */
    expect(filesBlock(two, head + 10)).toBe('Files in the register: 2 — not listed here (this context is full); list_sources lists them.');
    expect(filesBlock(two, 20)).toBe('');
  });

  it('a context too long even without the files is cut at a line, and says so', () => {
    const outputs = Array.from({ length: 400 }, (_, i) => `result r${i} “A result with a long enough name to take room ${i}”`).join('\n');
    const f = focusText([], { files: twelve, outputs });
    expect(f.length).toBeLessThanOrEqual(FOCUS_MAX);
    expect(f).toContain('(The rest of this context was too long to send — ask the app for what is not here.)');
    expect(f).not.toContain('Files in the register (');
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

describe('chat Projects — topic threads, never Faultline 6M', () => {
  it('groups conversations by their thread titles and skips a generic subject', () => {
    const a = newConversation({ id: 'a', at: 10, name: 'n', thread: { id: 't1', title: 'Lost time on Line 7', scope: { lineId: 'L7' } } });
    const b = newConversation({ id: 'b', at: 20, name: 'n', thread: { id: 't2', title: 'lost time on line 7', scope: { lineId: 'L7' } } });
    const c = newConversation({ id: 'c', at: 15, name: 'n', thread: { id: 't3', title: 'A new subject', scope: {} } });
    const d = newConversation({ id: 'd', at: 5, name: 'n' });
    b.updatedAt = 30;
    const out = chatProjects([a, b, c, d]);
    expect(out).toEqual([{ title: 'Lost time on Line 7', conversationId: 'b', at: 30, chats: 2 }]);
  });
});

describe('a new conversation', () => {
  it('is a talk study marked the colleague’s, with the thread it was opened on current', () => {
    const s = newConversation({ id: 's', at: 5, name: 'AI Mode — 8 Nov', thread: { id: 't', title: 'Line 3', scope: { lineId: 'L3' } } });
    expect(s.tool).toBe('talk');
    expect(isConversation(s)).toBe(true);
    expect(isConversation({ tool: 'talk', facts: { turns: [] } })).toBe(false);
    expect(conversationTitle(s.facts, 'x')).toBe('Line 3');
    expect(conversationTitle({ ...s.facts, named: '  Bagger jams  ' } as never, 'x')).toBe('Bagger jams');
    const bare = newConversation({ id: 's2', at: 5, name: 'n' });
    expect(conversationTitle({ ...bare.facts, turns: [{ id: 'a', at: 1, kind: 'typed', text: 'What is late across the lines?' }] } as never, 'x')).toBe('What is late across the lines?');
  });
});

describe('reply action context',()=>{
  it('keeps the original subject when focus moves to another line',async()=>{
    let record=newConversation({id:'scope',at:1,name:'Line review',thread:{id:'first',title:'Line A',scope:{lineId:'A'}}});
    const patch:Parameters<typeof appendTurn>[0]=async(_id,change)=>{record={...record,...change(record)};};
    await appendTurn(patch,record.id,{id:'reply',kind:'reply',at:2,text:'Check the guide'});
    const facts=factsOfConversation(record);facts.threads=setCurrent(facts.threads ?? [],'Line B',{lineId:'B'},3,'second');record={...record,facts};
    expect((factsOfConversation(record).turns ?? [])[0]?.actionScope).toEqual({lineId:'A'});
  });
});
