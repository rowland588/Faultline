/* WHAT STANDS NOW — the customer's standing picture told with every question (colleague/picture, 22 November 2026 — docs/LUNA-AGENT.md
 * G3b). The words are written by hand here from the inputs; and read from a database, the picture is held to the very readers the
 * Today page uses (lib/today briefing and lineState) and to the customer in hand. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { PICTURE, STANDS_NOW, pictureSaid, worstOf } from '../picture';
import { focusText } from '../conversation';
import { checkFigures } from '../figureCheck';

const NOW = Date.UTC(2026, 10, 22, 9);
const DAY = 86_400_000;
const HEAD = (client = '') => `${STANDS_NOW}${client ? ` for ${client}` : ''} — the app’s own reading of the records, in the words its pages use (a question this answers is answered from it at once, with no step; anything finer through the line’s own reads):`;

describe('the picture in words', () => {
  const brief = [
    { key: 'late', state: 'r' as const, word: 'Late', to: '/actions', says: '4 actions past their day — the oldest “Replace the splice table”, Sam, due 2026-11-12.' },
    { key: 'new', state: 'a' as const, word: 'New', to: '/snags', says: '1 problem raised since you were last in — “Bags not opening on the Bagger”.' },
  ];
  it('Today’s own briefing, then each line in the Today page’s word — the worst first, with the worst thing open on it', () => {
    const said = pictureSaid({
      client: 'Branston', brief,
      lines: [
        { name: 'Line 2', open: 0, critical: 0 },
        { name: 'Line 1', open: 2, critical: 0, worst: { what: 'Label skews on the wrap', late: false } },
        { name: 'Line 3', open: 4, critical: 1, worst: { what: 'Bagger jams on bag presentation', owner: 'Sam', late: true } },
      ],
    });
    expect(said).toBe([
      HEAD('Branston'),
      '  Today: 4 actions past their day — the oldest “Replace the splice table”, Sam, due 2026-11-12. 1 problem raised since you were last in — “Bags not opening on the Bagger”.',
      '  Lines: Line 3 — 1 critical problem (4 open in all); the worst “Bagger jams on bag presentation”, Sam, past its day · Line 1 — 2 problems open; the worst “Label skews on the wrap”, nobody yet · nothing open on Line 2.',
    ].join('\n'));
  });

  it('every client shown: no name in its heading; no lines and no briefing: nothing is said', () => {
    expect(pictureSaid({ client: '', brief: [], lines: [{ name: 'Line 1', open: 0, critical: 0 }] })).toBe(`${HEAD()}\n  Lines: nothing open on Line 1.`);
    expect(pictureSaid({ client: 'Branston', brief: [], lines: [] })).toBeUndefined();
  });

  it('many lines: the eight with most against them by name, the rest counted — and the quiet ones counted past six', () => {
    const busy = Array.from({ length: 11 }, (_, i) => ({ name: `Line ${i + 1}`, open: 11 - i, critical: 0, worst: { what: `Problem ${i + 1}`, late: false } }));
    const quiet = Array.from({ length: 7 }, (_, i) => ({ name: `Quiet ${i + 1}`, open: 0, critical: 0 }));
    const said = pictureSaid({ client: '', brief: [], lines: [...quiet, ...busy] }) ?? '';
    expect(said).toContain('Line 1 — 11 problems open; the worst “Problem 1”, nobody yet · Line 2 — 10 problems open');
    expect(said.split(' — ').length - 1 - 1).toBe(PICTURE.lines);          /* (one dash is the heading's) */
    expect(said).toContain('· and 3 more lines with problems open · nothing open on 7 other lines.');
    expect(said).not.toContain('Line 9 —');
  });

  it('never longer than its limit — cut at a word', () => {
    const said = pictureSaid({ client: 'Branston', brief: [{ key: 'late', state: 'r', word: 'Late', to: '/', says: 'x '.repeat(900) }], lines: [] }) ?? '';
    expect(said.length).toBeLessThanOrEqual(PICTURE.chars);
    expect(said.endsWith('…')).toBe(true);
  });

  it('the worst thing open on a line: critical before high before low, then one past its day, then the oldest', () => {
    const p = (problem: string, priority: 'critical' | 'high' | 'low', o: { dueAt?: number; raisedAt?: number; owner?: string } = {}) => ({ problem, priority, ...o });
    expect(worstOf([p('low one', 'low'), p('high one', 'high'), p('critical one', 'critical', { owner: ' Sam ' })], NOW)).toEqual({ what: 'critical one', owner: 'Sam', late: false });
    expect(worstOf([p('on time', 'high', { dueAt: NOW + DAY }), p('late', 'high', { dueAt: NOW - DAY })], NOW)).toEqual({ what: 'late', late: true });
    expect(worstOf([p('newer', 'high', { raisedAt: NOW - DAY }), p('older', 'high', { raisedAt: NOW - 9 * DAY })], NOW)?.what).toBe('older');
    expect(worstOf([], NOW)).toBeUndefined();
  });
});

describe('where it stands in what Luna is told — and what her answer may take from it', () => {
  const picture = `${HEAD('Branston')}\n  Today: 4 actions past their day — the oldest “Replace the splice table”, Sam, due 2026-11-12.\n  Lines: Line 3 — 1 critical problem (4 open in all).`;
  it('before what this conversation has made, and before the files — which stay last', () => {
    const f = focusText([], { picture, outputs: 'result R1 “Stops by reason”', files: ['“Shift report” [source s1]'] });
    expect(f.indexOf(STANDS_NOW)).toBeGreaterThan(-1);
    expect(f.indexOf(STANDS_NOW)).toBeLessThan(f.indexOf('Made in this conversation'));
    expect(f.indexOf('Made in this conversation')).toBeLessThan(f.indexOf('Files in the register'));
    expect(focusText([], {})).not.toContain(STANDS_NOW);
  });
  it('a figure quoted from it is the app’s own; one that is not in it is marked', () => {
    const focus = focusText([], { picture });
    expect(checkFigures('Morning — 4 actions are past their day, the oldest due 2026-11-12, and Line 3 has 1 critical problem among 4 open.', [], ['morning', focus]).unsure).toEqual([]);
    expect(checkFigures('Line 3 has 14 problems open.', [], ['how is line 3?', focus]).unsure).toEqual(['14']);
  });
});

/* READ FROM THE RECORDS: held to the Today page's own readers, and to the customer in hand */
describe('read from the records — one number with the Today page, and only the customer in hand’s', () => {
  beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });
  async function seed() {
    const db = await import('../../db'), lines = await import('../../lib/lines'), pic = await import('../picture'), today = await import('../../lib/today');
    const a = await lines.addLineToFactory('Line A'), b = await lines.addLineToFactory('Line B'), c = await lines.addLineToFactory('Line C');
    await db.updateWorkspace({ ...a, clientName: 'Acme Foods' });
    await db.updateWorkspace({ ...b, clientName: 'Brook Dairy' });
    await db.updateWorkspace({ ...c, clientName: 'Acme Foods' });
    const t = Date.now();
    await db.addSnag({ id: 'pa1', workspaceId: a.id, problem: 'Wrapper film tears on the splice', status: 'open', priority: 'critical', raisedAt: t - 9 * DAY, updatedAt: t, dueAt: t - 3 * DAY, owner: 'Sam' });
    await db.addSnag({ id: 'pa2', workspaceId: a.id, problem: 'Labeller skews the label', status: 'open', priority: 'low', raisedAt: t - 2 * DAY, updatedAt: t });
    await db.addSnag({ id: 'pb1', workspaceId: b.id, problem: 'Filler drips on the seal', status: 'open', priority: 'high', raisedAt: t - DAY, updatedAt: t, dueAt: t - DAY, owner: 'Bea' });
    await db.addSnag({ id: 'pa3', workspaceId: a.id, problem: 'Closed long ago', status: 'closed', priority: 'critical', raisedAt: t - 30 * DAY, updatedAt: t });
    return { db, pic, today, a, b, c };
  }
  const chosen = async (client: string) => (await import('../../lib/activeClient')).setActiveClient(client);

  it('with Acme in hand: Acme’s lines in the Today page’s words, the briefing the Today page gives — and nothing of Brook’s', async () => {
    const { pic, today } = await seed();
    await chosen('Acme Foods');
    try {
      const said = (await pic.pictureNow()) ?? '';
      expect(said.startsWith(HEAD('Acme Foods'))).toBe(true);
      /* Line A: two open, one of them critical — lineState's own word; Line C: nothing open */
      expect(today.lineState(2, 1).word).toBe('1 critical problem');
      expect(said).toContain('Lines: Line A — 1 critical problem (2 open in all); the worst “Wrapper film tears on the splice”, Sam, past its day · nothing open on Line C.');
      /* the briefing is the Today page's: the very rows the Actions page reads for this client, through lib/today briefing() */
      const { loadClientEveryAction } = await import('../../lib/useProjectActions');
      const { handScope } = await import('../../capabilities/hand');
      const read = await loadClientEveryAction(await handScope(), []);
      const brief = today.briefing(read.rows, read.register, today.lastSeen(Date.now()));
      expect(brief.length).toBeGreaterThan(0);
      expect(said).toContain(`  Today: ${brief.map(b => b.says).join(' ')}`);
      expect(said).toContain('Wrapper film tears');
      for (const not of ['Line B', 'Filler drips', 'Bea', 'Brook']) expect(said).not.toContain(not);
      expect(said).not.toContain('Closed long ago');
    } finally { await chosen(''); }
  }, 60_000);

  it('every client shown: each customer’s lines; Brook archived: read by nobody', async () => {
    const { pic } = await seed();
    const all = (await pic.pictureNow()) ?? '';
    expect(all.startsWith(HEAD())).toBe(true);
    expect(all).toContain('Line B — 1 problem open; the worst “Filler drips on the seal”, Bea, past its day');
    expect(all).toContain('Line A — 1 critical problem');
    const { archiveCustomer } = await import('../../lib/customers');
    expect((await archiveCustomer('Brook Dairy')).ok).toBe(true);
    const after = (await pic.pictureNow()) ?? '';
    for (const not of ['Line B', 'Filler drips', 'Bea']) expect(after).not.toContain(not);
    expect(after).toContain('Line A — 1 critical problem');
  }, 60_000);

  it('it moves with the records: a problem raised is in the next reading — no waiting', async () => {
    const { db, pic, c } = await seed();
    const before = (await pic.pictureNow()) ?? '';
    expect(before).toContain('nothing open on Line C');
    const t = Date.now();
    await db.addSnag({ id: 'pc1', workspaceId: c.id, problem: 'Sealer jaw cold on start-up', status: 'open', priority: 'high', raisedAt: t, updatedAt: t + 1 });
    const after = (await pic.pictureNow()) ?? '';
    expect(after).toContain('Line C — 1 problem open; the worst “Sealer jaw cold on start-up”, nobody yet');
    /* a write that is none of its business — a conversation's own record — changes nothing in it */
    await db.putStudy({ id: 'talk1', tool: 'talk', name: 'AI', facts: { colleague: true, turns: [] } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    expect(await pic.pictureNow()).toBe(after);
  }, 60_000);
});
