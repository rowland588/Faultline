/* THE RULES A PROGRAM IS READ BY.
 *
 * Every one of these is a decision that could quietly go the other way in a
 * refactor and take a month to notice on a real line — chiefly the one the
 * whole model rests on: PROVED NEEDS A DATE. A row that says it is proved and
 * cannot say when is a program somebody felt good about, and reading it as
 * signed off is how a line runs product on an unproven program.
 */
import { describe, it, expect } from 'vitest';
import {
  busiestMachine, byUrgency, daysOverdue, fillIn, isProved, ontoMachine, standingOf,
  stateOf, tally, testedIn, weeksFor,
  type Program,
} from '../programs';
import type { TestItem } from '../testing';

const TODAY = '2026-09-21';   // a Monday

let n = 0;
const prog = (p: Partial<Program> = {}): Program => ({
  id: `p${++n}`, projectId: 'proj', what: `P-${n}`,
  state: 'needed', sort: n, createdAt: 1, updatedAt: 1, ...p,
});

describe('where it has got to', () => {
  it('reads the three states off the record', () => {
    expect(stateOf(prog({ state: 'needed' }))).toBe('needed');
    expect(stateOf(prog({ state: 'onMachine' }))).toBe('onMachine');
    expect(stateOf(prog({ state: 'proved', provedOn: '2026-09-14' }))).toBe('proved');
  });

  /* THE RULE THE MODEL RESTS ON. */
  it('refuses to call a program proved without a date', () => {
    const p = prog({ state: 'proved' });          // the word, and nothing behind it
    expect(stateOf(p)).toBe('onMachine');
    expect(isProved(p)).toBe(false);
  });

  it('takes the date as the fact even when the word disagrees', () => {
    // A row that went backwards on one device and was proved on another: the
    // date wins, and LWW on updatedAt settles which record is current.
    expect(stateOf(prog({ state: 'onMachine', provedOn: '2026-09-14' }))).toBe('proved');
  });
});

describe('when we find out', () => {
  it('is booked when the day is still ahead', () => {
    expect(standingOf(prog({ state: 'onMachine', testOn: '2026-09-29' }), TODAY)).toBe('booked');
  });

  it('is overdue when the day has gone and it is still not proved', () => {
    expect(standingOf(prog({ state: 'onMachine', testOn: '2026-09-15' }), TODAY)).toBe('overdue');
    expect(daysOverdue(prog({ state: 'onMachine', testOn: '2026-09-15' }), TODAY)).toBe(6);
  });

  it('counts the day itself as still booked, not overdue', () => {
    // A test happening this morning is not a failure at 09:00.
    expect(standingOf(prog({ state: 'onMachine', testOn: TODAY }), TODAY)).toBe('booked');
  });

  it('calls no date agreed what it is, rather than inventing one', () => {
    expect(standingOf(prog({ state: 'needed' }), TODAY)).toBe('undated');
    expect(daysOverdue(prog({ state: 'needed' }), TODAY)).toBeUndefined();
  });

  it('is never overdue once it is proved, whatever date it carried', () => {
    const p = prog({ state: 'proved', provedOn: '2026-09-18', testOn: '2026-09-01' });
    expect(standingOf(p, TODAY)).toBe('proved');
    expect(daysOverdue(p, TODAY)).toBeUndefined();
  });
});

describe('the order the list reads in', () => {
  it('puts what has slipped first and what is done last', () => {
    const rows = [
      prog({ what: 'proved', state: 'proved', provedOn: '2026-09-10' }),
      prog({ what: 'undated', state: 'onMachine' }),
      prog({ what: 'booked', state: 'onMachine', testOn: '2026-09-29' }),
      prog({ what: 'overdue', state: 'onMachine', testOn: '2026-09-10' }),
    ];
    expect(byUrgency(rows, TODAY).map(p => p.what))
      .toEqual(['overdue', 'booked', 'undated', 'proved']);
  });

  it('puts the soonest test first inside the booked group', () => {
    const rows = [
      prog({ what: 'later', state: 'onMachine', testOn: '2026-10-20' }),
      prog({ what: 'sooner', state: 'onMachine', testOn: '2026-09-29' }),
    ];
    expect(byUrgency(rows, TODAY).map(p => p.what)).toEqual(['sooner', 'later']);
  });

  /* Both are waiting on somebody to name a day. One is also waiting on
     somebody to write it, which is the longer pole. */
  it('puts a program nobody has written before one that merely needs proving', () => {
    const rows = [
      prog({ what: 'exists', state: 'onMachine' }),
      prog({ what: 'missing', state: 'needed' }),
    ];
    expect(byUrgency(rows, TODAY).map(p => p.what)).toEqual(['missing', 'exists']);
  });

  it('leaves out the deleted', () => {
    const rows = [prog({ what: 'gone', deletedAt: 5 }), prog({ what: 'here' })];
    expect(byUrgency(rows, TODAY).map(p => p.what)).toEqual(['here']);
  });
});

describe('the counts', () => {
  const rows = [
    prog({ state: 'proved', provedOn: '2026-09-14' }),
    prog({ state: 'proved', provedOn: '2026-09-18' }),
    prog({ state: 'onMachine', testOn: '2026-09-29' }),
    prog({ state: 'onMachine' }),
    prog({ state: 'needed', testOn: '2026-09-10' }),   // the day has gone
    prog({ state: 'needed' }),
  ];

  it('counts each state by what the record says, not by the word', () => {
    const t = tally(rows, TODAY);
    expect(t.total).toBe(6);
    expect(t.proved).toBe(2);
    expect(t.onMachine).toBe(2);
    expect(t.needed).toBe(2);
  });

  it('counts a test day that has gone, separately from everything else', () => {
    expect(tally(rows, TODAY).overdue).toBe(1);
  });

  it('names the next test that is actually still ahead', () => {
    expect(tally(rows, TODAY).nextTest).toBe('2026-09-29');
  });

  it('counts a proved-without-a-date row as on the machine', () => {
    const t = tally([prog({ state: 'proved' })], TODAY);
    expect(t.proved).toBe(0);
    expect(t.onMachine).toBe(1);
  });
});

describe('the grid', () => {
  const weeks = weeksFor([prog({ state: 'onMachine', testOn: '2026-10-06' })], TODAY);

  it('starts at this week and covers the last test booked', () => {
    expect(weeks[0].start).toBe('2026-09-21');
    expect(weeks.some(w => '2026-10-06' >= w.start && '2026-10-06' <= w.end)).toBe(true);
  });

  it('goes green from the week it was proved, and stays green', () => {
    const p = prog({ state: 'proved', provedOn: '2026-10-01' });
    expect(fillIn(p, weeks[0])).toBe('none');        // proved after this week
    const w = weeks.find(x => '2026-10-01' <= x.end);
    expect(w && fillIn(p, w)).toBe('proved');
    expect(fillIn(p, weeks[weeks.length - 1])).toBe('proved');
  });

  it('is green all the way across for something proved long ago', () => {
    const p = prog({ state: 'proved', provedOn: '2026-03-02' });
    expect(weeks.every(w => fillIn(p, w) === 'proved')).toBe(true);
  });

  /* Amber everywhere, not amber up to its test date: it can run today and it
     could equally be wrong today, and that does not change on a Monday. */
  it('is amber all the way across while it is on the machine', () => {
    const p = prog({ state: 'onMachine', testOn: '2026-10-06' });
    expect(weeks.every(w => fillIn(p, w) === 'machine')).toBe(true);
  });

  it('is hollow all the way across while nobody has written it', () => {
    const p = prog({ state: 'needed', testOn: '2026-10-06' });
    expect(weeks.every(w => fillIn(p, w) === 'none')).toBe(true);
  });

  it('rings the week the test is booked in, and only that one', () => {
    const p = prog({ state: 'onMachine', testOn: '2026-10-06' });
    expect(weeks.filter(w => testedIn(p, w))).toHaveLength(1);
  });

  /* The ring is a question. A proved program has answered it. */
  it('draws no ring on something already proved', () => {
    const p = prog({ state: 'proved', provedOn: '2026-09-22', testOn: '2026-10-06' });
    expect(weeks.some(w => testedIn(p, w))).toBe(false);
  });
});

/* PUTTING THE WHOLE LIST ON ONE MACHINE.
 *
 * Rowland: "all the current existing programs set to the machine called pick
 * and place." A list pasted from the OEM lands with no machine on any row, and
 * before this the only way through was the per-row dropdown, one tap each.
 *
 * The risk is arithmetic rather than anything on screen: a bulk write that
 * catches a row it was not asked for, or loses a test date on the way past, is
 * wrong in a way nobody sees until the grid reads wrong a week later.
 */
describe('putting programs onto a machine', () => {
  it('writes exactly the rows it was asked for', () => {
    const rows = [prog({ id: 'a' }), prog({ id: 'b' }), prog({ id: 'c' })];
    const out = ontoMachine(rows, ['a', 'c'], 'pnp');
    expect(out.map(p => p.id)).toEqual(['a', 'c']);
    expect(out.every(p => p.assetId === 'pnp')).toBe(true);
  });

  it('leaves everything else on the row exactly as it was', () => {
    const rows = [prog({ id: 'a', what: 'P-104', testOn: '2026-10-01', state: 'onMachine', runs: 'Finest Red 2kg' })];
    expect(ontoMachine(rows, ['a'], 'pnp')[0]).toEqual({ ...rows[0], assetId: 'pnp' });
  });

  it('moves a program already on another machine when it is named', () => {
    /* Picking the wrong machine and putting them all on it again has to be
       recoverable, or the one-tap door is a trap. */
    const rows = [prog({ id: 'a', assetId: 'wrong' })];
    expect(ontoMachine(rows, ['a'], 'right')[0].assetId).toBe('right');
  });

  it('writes nothing when nothing was named', () => {
    expect(ontoMachine([prog({ id: 'a' })], [], 'pnp')).toEqual([]);
  });

  it('ignores an id that is not on the list rather than inventing a row', () => {
    expect(ontoMachine([prog({ id: 'a' })], ['a', 'ghost'], 'pnp')).toHaveLength(1);
  });

  it('does not mutate the rows it was given', () => {
    const rows = [prog({ id: 'a' })];
    ontoMachine(rows, ['a'], 'pnp');
    expect(rows[0].assetId).toBeUndefined();
  });
});

/* WHICH MACHINE A NEW PROGRAM STARTS ON.
 *
 * Rowland: "same one as — I press the node and it doesn't work." The chip did
 * fill the name in; the machine box under it said "the line itself" even on a
 * job with two machines, so reusing a name added a second copy belonging to no
 * machine. The chip was fine and the box was wrong, and together they made a
 * control that looked broken.
 */
describe('which machine the add form starts on', () => {
  const m = (id: string) => ({ id });

  it('is the one most programs are already on', () => {
    const rows = [prog({ assetId: 'pnp' }), prog({ assetId: 'pnp' }), prog({ assetId: 'wrp' })];
    expect(busiestMachine(rows, [m('wrp'), m('pnp')])).toBe('pnp');
  });

  it('is the first machine when nothing has been assigned yet', () => {
    expect(busiestMachine([prog(), prog()], [m('pnp'), m('wrp')])).toBe('pnp');
  });

  it('is the line itself when the job has no machines — which is what it always was', () => {
    expect(busiestMachine([prog()], [])).toBe('');
  });

  it('ignores a machine that has been deleted since', () => {
    /* Deleting a machine leaves its programs pointing at an id nothing
       answers to; starting the form on one would show an empty select. */
    const rows = [prog({ assetId: 'gone' }), prog({ assetId: 'gone' }), prog({ assetId: 'pnp' })];
    expect(busiestMachine(rows, [m('pnp')])).toBe('pnp');
  });

  it('settles ties by the order the machines are listed, not by chance', () => {
    const rows = [prog({ assetId: 'a' }), prog({ assetId: 'b' })];
    expect(busiestMachine(rows, [m('a'), m('b')])).toBe('a');
    expect(busiestMachine(rows, [m('b'), m('a')])).toBe('b');
  });
});

describe('the order the person sets', () => {
  const P = (id: string, sort: number): Program => ({ id, projectId: 'p', what: id, state: 'needed', sort, createdAt: sort, updatedAt: sort } as Program);
  it('reads in the order set, new ones last', async () => {
    const { inOrder } = await import('../programs');
    expect(inOrder([P('c', 30), P('a', 10), P('b', 20)]).map(p => p.id)).toEqual(['a', 'b', 'c']);
  });
  it('moves one a place, renumbered, writing only what moved', async () => {
    const { inOrder, movedOne } = await import('../programs');
    const rows = [P('a', 10), P('b', 20), P('c', 30)];
    const up = movedOne(rows, 'c', -1);
    expect(up.map(p => [p.id, p.sort])).toEqual([['c', 20], ['b', 30]]);
    const after = rows.map(r => up.find(u => u.id === r.id) ?? r);
    expect(inOrder(after).map(p => p.id)).toEqual(['a', 'c', 'b']);
    expect(movedOne(rows, 'a', -1)).toEqual([]);   // already first
    expect(movedOne(rows, 'c', 1)).toEqual([]);    // already last
  });
  it('moves among one machine\'s programs, passing the one above it there', async () => {
    const { inOrder, movedOne } = await import('../programs');
    /* a and c are the filler's, b is another machine's between them. */
    const rows = [{ ...P('a', 10), assetId: 'f' }, { ...P('b', 20), assetId: 'x' }, { ...P('c', 30), assetId: 'f' }];
    const onFiller = (p: Program) => p.assetId === 'f';
    const up = movedOne(rows, 'c', -1, onFiller);
    const after = rows.map(r => up.find(u => u.id === r.id) ?? r);
    expect(inOrder(after).filter(onFiller).map(p => p.id)).toEqual(['c', 'a']);
    expect(movedOne(rows, 'a', -1, onFiller)).toEqual([]);   // first on its machine
  });
});

describe('a stage\'s parts in the order the person sets', () => {
  const I = (id: string, sort: number, testId = 's1') => ({ id, projectId: 'p', testId, kind: 'next', what: id, sort, createdAt: sort, updatedAt: sort }) as TestItem;
  it('moves one a place on its own stage, renumbered, writing only what moved', async () => {
    const { partMoved, partsOf } = await import('../noted');
    const items = [I('a', 1), I('b', 2), I('c', 3), I('z', 1, 's2')];
    const up = partMoved('s1', items, 'c', -1);
    expect(up.map(p => [p.id, p.sort])).toEqual([['c', 2], ['b', 3]]);
    const after = items.map(r => up.find(u => u.id === r.id) ?? r);
    expect(partsOf('s1', after).map(p => p.id)).toEqual(['a', 'c', 'b']);
    expect(partMoved('s1', items, 'a', -1)).toEqual([]);
    expect(partMoved('s1', items, 'c', 1)).toEqual([]);
    /* Parts all written with the same number still move — renumbered 1, 2, 3. */
    const flat = [I('a', 0), I('b', 0)].map((x, k) => ({ ...x, createdAt: k }));
    expect(partsOf('s1', flat.map(r => partMoved('s1', flat, 'b', -1).find(u => u.id === r.id) ?? r)).map(p => p.id)).toEqual(['b', 'a']);
  });
});

describe('a part\'s status, with what was seen', () => {
  const T = '2026-10-08';
  const P = (extra: Partial<TestItem> = {}): TestItem => ({ id: 'a', projectId: 'p', testId: 's1', kind: 'next', what: 'PR-12 Express 1.25 kg', sort: 1, createdAt: 1, updatedAt: 1, ...extra });
  const at = Date.parse(`${T}T10:00:00`);
  it('keeps every status said, newest last; passed ticks it done, failed or baseline unticks it', async () => {
    const { saidResult, resultNow } = await import('../noted');
    const b = saidResult(P({ doneAt: 5 }), 'baseline', '  Running 32 ppm at baseline  ', at);
    expect(b.doneAt).toBeUndefined();
    expect(b.results).toEqual([{ is: 'baseline', on: T, note: 'Running 32 ppm at baseline', at }]);
    const f = saidResult(b, 'failed', '', at + 1);
    expect(f.results?.map(r => r.is)).toEqual(['baseline', 'failed']);
    expect(f.results?.[1].note).toBeUndefined();
    expect(resultNow(f)?.is).toBe('failed');
    const ok = saidResult(f, 'passed', 'Ran 45 ppm for the hour', at + 2);
    expect(ok.doneAt).toBe(at + 2);
    expect(resultNow(ok)?.is).toBe('passed');
    /* Unticked after a pass: the pass is taken back, nothing is claimed. */
    expect(resultNow({ ...ok, doneAt: undefined })).toBeUndefined();
    /* Ticked done after a failure: the failure is sorted — it reads done. */
    expect(resultNow({ ...f, doneAt: at + 3 })).toBeUndefined();
  });
  it('says it on paper, the commentary after it, and counts it on the square', async () => {
    const { partWords, partsSaid, saidResult } = await import('../noted');
    const b = saidResult(P(), 'baseline', 'Running 32 ppm', at);
    expect(partWords(b, T)).toBe('PR-12 Express 1.25 kg — baseline achieved 8 Oct: Running 32 ppm');
    const f = saidResult(P({ id: 'b', owner: 'Ilapak UK' }), 'failed', 'Bag length short by 8 mm', at);
    expect(partWords(f, T)).toBe('PR-12 Express 1.25 kg — Ilapak UK · failed 8 Oct: Bag length short by 8 mm');
    const ok = saidResult(P({ id: 'c' }), 'passed', '', at);
    expect(partWords(ok, T)).toBe('PR-12 Express 1.25 kg — passed 8 Oct');
    /* Late and at its baseline: late leads, the baseline after it. */
    expect(partWords({ ...b, due: '2026-10-06' }, T)).toBe('PR-12 Express 1.25 kg — late · was 6 Oct · baseline achieved 8 Oct: Running 32 ppm');
    expect(partsSaid([b, f, ok], T)).toEqual({ text: '3 parts · 1 done · 1 at baseline · 1 failed', head: '3 parts · 1 done · 1 at baseline', late: 0, failed: 1 });
  });
  it('draws on the plan in its state: failed red, baseline under way, passed done', async () => {
    const { saidResult } = await import('../noted');
    const { partOf, partsWords } = await import('../gantt');
    const f = partOf(saidResult(P(), 'failed', 'x', at), T);
    const b = partOf(saidResult(P({ due: '2026-10-20' }), 'baseline', 'x', at), T);
    const ok = partOf(saidResult(P(), 'passed', 'x', at), T);
    expect([f.state, f.says]).toEqual(['failed', 'failed 8 Oct']);
    expect([b.state, b.says]).toEqual(['baseline', 'baseline achieved 8 Oct']);
    expect([ok.state, ok.says]).toEqual(['done', 'passed 8 Oct']);
    expect(partsWords([f, b, ok])).toBe('3 parts · 1 done · 1 at baseline · 1 failed');
  });
});
