/* THE BRIEF'S ASKS (docs/STORY.md §7, S7–S9): the scope read from an ask's words, the evidence matched by rules, what is still missing
 * named, what answers no ask, the chapter's snapshot carrying the asks — and a story with none reading exactly as before. */
import { describe, expect, it } from 'vitest';
import { askEvidence, askScopeFromWords, asksEvidence, assignTo, storyAsksState, toolsWanted, withAsks, type AskRecords } from '../storyAsks';
import { snapshotOf } from '../clientStory';
import { plainText, briefKindOf } from '../../tools/story/briefText';
import { snapshotText } from '../../tools/story/storyAsk';
import type { BriefAsk } from '../study';

const lines = [
  { id: 'l1', name: 'Line 2A', machines: ['Filler', 'Wrapper'], products: ['1.25 kg'] },
  { id: 'l2', name: 'Line 3', machines: ['Labeller', 'Case packer'], products: [] },
];
const R: AskRecords = {
  lines,
  findings: [
    { id: 'p1', what: 'Wrapper holds the line at 60 a minute', line: 'Line 2A', machine: 'Wrapper', priority: 'high', late: true, poundsDay: 580 },
    { id: 'p2', what: 'Film runs out on the wrapper', line: 'Line 2A', priority: 'low', late: false },
    { id: 'p3', what: 'Labels skew on nights', line: 'Line 3', machine: 'Labeller', priority: 'low', late: false },
    { id: 'p4', what: 'Wet floor at the door', line: 'Line 3', priority: 'low', late: false },
  ],
  actions: [
    { what: 'Fit the film guide', who: 'Ilapak', due: '2026-11-06', late: true, kind: 'Problem', snagId: 'p1' },
    { what: 'Stage film at Line 2A', who: 'Dave', due: '2026-11-12', late: false, kind: 'Action' },
    { what: 'Mop rota', who: '', late: false, kind: 'Action', where: 'Line 3' },
  ],
  proved: [{ id: 'f1', what: 'Splice guide', machine: 'Wrapper', line: 'Line 2A', proof: 'changeover 41 → 26 min' }],
  records: [
    { id: 's1', tool: 'changeover', title: 'SMED — 1.25 kg to 2 kg · Wrapper', lineId: 'l1', machine: 'Wrapper', href: '/smed/s1' },
    { id: 's2', tool: 'capability', title: 'Capability study — label position · Labeller', lineId: 'l2', machine: 'Labeller', href: '/capability/s2' },
  ],
};
const ask = (id: string, text: string, more: Partial<BriefAsk> = {}): BriefAsk => ({ id, text, order: Number(id.slice(1)), ...more });

describe('the brief’s asks', () => {
  it('reads a line’s, a machine’s and a product’s name from an ask’s words, whole words only', () => {
    expect(askScopeFromWords('Why does the wrapper on Line 2A stop?', lines)).toEqual({ lines: ['l1'], machines: ['Wrapper'], products: [] });
    expect(askScopeFromWords('Is the 1.25 kg pack overfilled?', lines)).toEqual({ lines: [], machines: [], products: ['1.25 kg'] });
    expect(askScopeFromWords('What about Line 2AB or the wrappers?', lines)).toEqual({ lines: [], machines: [], products: [] });
  });
  it('wants the tool the words name, Line capacity when they name no kind of loss', () => {
    expect(toolsWanted('How much does a changeover cost?').map(t => t.tool)).toEqual(['changeover']);
    expect(toolsWanted('Tell us about Line 3').map(t => t.tool)).toEqual(['linebalance']);
  });
  it('matches the evidence by the scope in the words: found, being done (late said), proved, still missing', () => {
    const e = askEvidence(ask('a1', 'Why is Line 2A losing output?'), R);
    expect(e.fromWords).toBe(true);
    expect(e.found.findings.map(f => f.id)).toEqual(['p1', 'p2']);
    expect(e.found.records.map(x => x.id)).toEqual(['s1']);
    expect(e.doing.map(a => a.what)).toEqual(['Fit the film guide', 'Stage film at Line 2A']);
    expect(e.proved.map(p => p.id)).toEqual(['f1']);
    expect(e.missing.map(m => m.text)).toEqual(['Line capacity would show what holds Line 2A.']);
    expect(e.missing[0].href).toBe('/lines/l1?view=tools');
    expect(e.says).toBe('3 found · 2 being done, 1 late · 1 proved · 1 still to show');
  });
  it('matches by a machine picked on the chips, anywhere, and names a machine with nothing measured on it', () => {
    const e = askEvidence(ask('a2', 'Why does it jam?', { machines: ['Case packer'] }), R);
    expect(e.fromWords).toBe(false);
    expect(e.found.findings).toEqual([]);
    expect(e.missing.map(m => m.text)).toEqual(['Reliability would show how often it stops on Line 3.', 'No measurement on the Case packer yet — Reliability would show it.']);
  });
  it('says an ask matched to nothing so, and asks where', () => {
    const e = askEvidence(ask('a3', 'Are we a good employer?'), R);
    expect(e.says).toBe('0 found · 0 being done · 0 proved · 1 still to show');
    expect(e.missing[0].text).toMatch(/pick the line or machine/);
  });
  it('lists what answers no ask, and assigning one adds its machine (else its line) to the ask', () => {
    const story = { asks: [ask('a1', 'Why is Line 2A losing output?'), ask('a2', 'Why do the labels skew on the Labeller?')] };
    const { asks, alsoFound } = asksEvidence(story, R);
    expect(asks.map(a => a.ask.id)).toEqual(['a1', 'a2']);
    expect(alsoFound.map(x => x.id)).toEqual(['p4']);
    const a2 = assignTo(story.asks[1], alsoFound[0], lines);
    expect(a2.machines).toEqual(['Labeller']);
    expect(a2.lines).toEqual(['l2']);
    expect(asksEvidence({ asks: [story.asks[0], a2] }, R).alsoFound).toEqual([]);
  });
  it('freezes the asks on the chapter’s snapshot; a story with no asks keeps the snapshot as it was', () => {
    const s = snapshotOf({ at: 1, lines: [{ id: 'l1', name: 'Line 2A' }], wrong: [], actions: [], proved: [], studies: [], today: '2026-11-08' });
    expect(withAsks(s, {}, R)).toBe(s);
    const w = withAsks(s, { asks: [ask('a1', 'Why is Line 2A losing output?', { from: 'Why are we losing output on 2A?' })] }, R);
    expect(w.asks?.[0]).toMatchObject({ id: 'a1', from: 'Why are we losing output on 2A?', says: '3 found · 2 being done, 1 late · 1 proved · 1 still to show', missing: ['Line capacity would show what holds Line 2A.'] });
    expect(w.asks?.[0].found[0]).toEqual({ id: 'p1', what: 'Wrapper holds the line at 60 a minute', where: 'Line 2A · Wrapper', money: '£580 a day' });
    expect(snapshotText(w, { newFindings: [], closed: 0, newProved: [], newTools: 0 })).toMatch(/THE CLIENT'S ASKS[\s\S]*Why is Line 2A losing output\?[\s\S]*Line capacity would show what holds Line 2A/);
    expect(snapshotText(s, { newFindings: [], closed: 0, newProved: [], newTools: 0 })).not.toMatch(/ASKS/);
  });
  it('says the asks in words for the colleague, and no brief as no brief', () => {
    const st = storyAsksState({ brief: '', asks: [ask('a1', 'Why is Line 2A losing output?')] }, R);
    expect(st.brief).toMatch(/^No brief yet/);
    expect(st.asks[0].doing[0]).toBe('Fit the film guide — Ilapak by 6 Nov, late');
    expect(st.says).toBe('1 ask; 3 records answering none of them.');
  });
});

describe('the brief read in code', () => {
  it('reads plain text as a person would', () => {
    expect(plainText('\uFEFFWhy are we\r\nlosing output?  \r\n\r\n\r\n\r\nAnd   why nights?  ')).toBe('Why are we\nlosing output?\n\nAnd why nights?');
  });
  it('knows a file by its type and its name', () => {
    expect(briefKindOf('Brief.PDF', '')).toBe('pdf');
    expect(briefKindOf('b.docx', '')).toBe('docx');
    expect(briefKindOf('b.md', '')).toBe('text');
    expect(briefKindOf('IMG_1.jpg', 'image/jpeg')).toBe('image');
    expect(briefKindOf('b.xlsx', '')).toBe('other');
  });
});
