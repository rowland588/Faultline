/* THE STORY (lib/story, docs/STORY.md): the snapshot is the readers' figures frozen, since is by the records' ids, the words are the
 * modules' own, and a figure the snapshot does not hold is found. */
import { describe, expect, it } from 'vitest';
import { assembledNarrative, draftChapter, headlineOf, linesOfClient, sinceOf, sinceSentence, snapshotOf, storySays, storyTiles, unsureIn } from '../clientStory';
import type { WrongRow } from '../factoryQuestions';
import type { ProjectAction } from '../projectActions';
import type { ProvedFix } from '../../tools/yokoten/yokoten';
import type { ToolStudy } from '../study';

const lines = [{ id: 'l1', name: 'Line 2A' }, { id: 'l2', name: 'Line 2B' }];
const wrong: Omit<WrongRow, 'pounds'>[] = [
  { id: 'p1', what: 'Wrapper holds the line at 60 a minute', line: 'Line 2A', priority: 'high', late: true, owner: 'Ilapak', cost: { minutes: 120, machine: 'Wrapper', stopsLine: true, neckKnown: true, labour: 100, packs: 7200, contribution: 480, missing: [], words: '120 min a day at Wrapper, the bottleneck: £100 labour · 7,200 packs lost · £480 contribution a day', short: '' } },
  { id: 'p2', what: 'Packers walk to fetch film', line: 'Line 2A', priority: 'low', late: false, cost: { minutes: 30, stopsLine: false, neckKnown: true, labour: 15, missing: [], words: '30 min a day on the line: £15 labour a day', short: '' } },
  { id: 'p3', what: 'Seal rejects on nights', line: 'Line 2B', priority: 'low', late: false },
  { id: 'px', what: 'Another client’s problem', line: 'Line 9', priority: 'critical', late: true },
];
const actions: ProjectAction[] = [
  { key: 'a1', kind: 'Problem', what: 'Film guide fitted', who: 'Ilapak', due: '2026-11-06', late: true, soon: false },
  { key: 'a2', kind: 'Action', what: 'Stage film at the line', who: 'Dave', due: '2026-11-12', late: false, soon: true },
  { key: 'a3', kind: 'Action', what: 'Review with the site director', who: '', late: false, soon: false },
] as ProjectAction[];
const proved: ProvedFix[] = [{ id: 'f1', what: 'Splice guide', machine: 'Wrapper', lineId: 'l1', lineName: 'Line 2A', proof: 'changeover 41 → 26 min' }];
const studies = [{ id: 's1', tool: 'changeover', name: 'x', workspaceId: 'l1' }, { id: 's2', tool: 'calc', name: 'y', workspaceId: 'l1', agreed: { calc: { key: 'spaghetti', inputs: {} } } }, { id: 's3', tool: 'capability', name: 'z', workspaceId: 'l9' }] as unknown as ToolStudy[];
const AT = Date.parse('2026-11-08T10:00:00Z');
const snap = () => snapshotOf({ at: AT, lines, wrong, actions, proved, studies, today: '2026-11-08' });

describe('the story', () => {
  it('reads the client’s lines by the name on them, or every line when none is named', () => {
    const ls = [{ id: 'a', clientName: 'Northfield' }, { id: 'b', clientName: 'northfield ' }, { id: 'c' }];
    expect(linesOfClient(ls, 'Northfield').map(l => l.id)).toEqual(['a', 'b']);
    expect(linesOfClient(ls, '').map(l => l.id)).toEqual(['a', 'b', 'c']);
  });
  it('freezes the readers’ figures: the client’s open problems worst first and priced, the actions late first, the fixes proved on its lines, the tools used', () => {
    const s = snap();
    expect(s.found).toEqual({ open: 3, critical: 0, late: 1, priced: 2, costDay: 595 });
    expect(s.findings.map(f => f.id)).toEqual(['p1', 'p2', 'p3']);
    expect(s.findings[0]).toMatchObject({ machine: 'Wrapper', poundsDay: 580, late: true });
    expect(s.fixing).toEqual({ open: 3, late: 1, nobody: 1 });
    expect(s.actions[0].what).toBe('Film guide fitted');
    expect(s.proved).toBe(1);
    expect(s.toolsUsed.map(t => [t.label, t.n])).toEqual([['SMED', 1], ['Spaghetti diagram', 1]]);
  });
  it('says what changed since the chapter before by the records’ ids', () => {
    const before = snap();
    const after = snapshotOf({ at: AT + 86_400_000, lines, wrong: [wrong[0], { id: 'p4', what: 'Labeller short stops', line: 'Line 2B', priority: 'low', late: false }], actions, proved: [...proved, { ...proved[0], id: 'f2', what: 'Film staged' }], studies: [...studies, { id: 's4', tool: 'losses', name: 'w', workspaceId: 'l2' } as unknown as ToolStudy], today: '2026-11-09' });
    const x = sinceOf(after, before);
    expect(x.newFindings.map(f => f.id)).toEqual(['p4']);
    expect(x.closed).toBe(2);
    expect(x.newProved.map(p => p.id)).toEqual(['f2']);
    expect(x.newTools).toBe(1);
    expect(x.costDayBefore).toBe(595);
    expect(sinceSentence(x)).toBe('Since 8 Nov: 1 new finding · 2 closed · 1 fix proved · 1 tool record used.');
    expect(sinceOf(before, undefined).newFindings.length).toBe(3);
  });
  it('tiles, headline and the assembled narrative are the modules’ own words', () => {
    const s = snap(); const since = sinceOf(s, undefined);
    expect(storyTiles(s).map(t => [t.k, t.v])).toEqual([['Found so far', '£595 a day'], ['Biggest loss', 'Wrapper'], ['Being fixed', '3'], ['Proved', '1']]);
    expect(headlineOf(s, since)).toBe('Wrapper holds the line at 60 a minute — £580 a day');
    const n = assembledNarrative('Why are we losing output?', s, since);
    expect(n[0]).toMatch(/^Why are we losing output\. 2 lines running\. 3 problems open, costing £595 a day; 1 action late/);
    expect(n.some(p => /The biggest loss is Wrapper holds the line at 60 a minute on Line 2A \(Wrapper\) — 120 min a day/.test(p))).toBe(true);
    expect(n.some(p => /1 action is late\. Next: Film guide fitted \(Ilapak, was due 6 Nov\)/.test(p))).toBe(true);
    expect(n[n.length - 1]).toBe('Proved so far: Splice guide on Line 2A — changeover 41 → 26 min.');
  });
  it('a draft chapter carries the snapshot, the since and the assembled words; the story says its chapters', () => {
    const story = { client: 'Northfield', brief: 'Why?', startedAt: AT - 7 * 86_400_000 };
    const c = draftChapter('c1', story, [], snap());
    expect(c.by).toBe('assembled'); expect(c.from).toBe(story.startedAt); expect(c.approvedAt).toBeUndefined();
    expect(storySays(story, [])).toBe('0 chapters since 1 November 2026');
    expect(storySays(story, [{ ...c, approvedAt: AT }])).toBe('1 chapter since 1 November 2026 · last 8 Nov');
  });
  it('finds a figure the snapshot does not hold, and lets a day or a year pass', () => {
    const s = snap();
    expect(unsureIn(['The wrapper costs £580 a day; the register holds 3 problems.'], s)).toEqual([]);
    expect(unsureIn(['Savings of £12,000 a year are likely.', 'On 6 Nov 2026.'], s)).toEqual(['12000']);
  });
});
