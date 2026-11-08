/* THE CHAPTER'S GATEWAY TASK (tools/story/storyAssist, docs/STORY.md §5): the ask held to its limits, the answer read again, every
 * figure not among the snapshot's found; and the snapshot as the assistant reads it (tools/story/storyAsk snapshotText). */
import { describe, expect, it } from 'vitest';
import { STORY_LIMITS, checkStoryAnswer, readStoryAsk, storyUser, unsureStory } from '../storyAssist';
import { snapshotText, storyAskOf } from '../storyAsk';
import type { StorySnapshot, StoryChapter } from '../../../lib/study';

const snap: StorySnapshot = {
  at: Date.parse('2026-11-08T10:00:00Z'), lines: 2,
  found: { open: 3, critical: 0, late: 1, priced: 2, costDay: 595 }, fixing: { open: 3, late: 1, nobody: 1 }, proved: 1,
  findings: [{ id: 'p1', what: 'Wrapper holds the line at 60 a minute', line: 'Line 2A', machine: 'Wrapper', priority: 'high', late: true, owner: 'Ilapak', poundsDay: 580, words: '120 min a day at Wrapper, the bottleneck: £100 labour · 7,200 packs lost · £480 contribution a day' }],
  actions: [{ what: 'Film guide fitted', who: 'Ilapak', due: '2026-11-06', late: true, kind: 'Problem' }],
  provedFixes: [{ id: 'f1', what: 'Splice guide', machine: 'Wrapper', line: 'Line 2A', proof: 'changeover 41 → 26 min' }],
  toolsUsed: [{ tool: 'changeover', label: 'SMED', n: 1 }],
};
const since = { newFindings: [], closed: 0, newProved: [], newTools: 0 };

describe('the chapter asked of the assistant', () => {
  it('renders the snapshot line by line with every figure’s source', () => {
    const t = snapshotText(snap, since);
    expect(t).toMatch(/PROBLEMS OPEN \(the register\): 3; 0 critical; 1 past their day; 2 priced; together £595 a day/);
    expect(t).toMatch(/- Wrapper holds the line at 60 a minute · Line 2A, Wrapper · £580 a day \(120 min a day at Wrapper/);
    expect(t).toMatch(/- Film guide fitted · Ilapak · was due 6 Nov/);
    expect(t).toMatch(/- Splice guide · Line 2A, Wrapper · changeover 41 → 26 min/);
    expect(t).toMatch(/this is the first chapter/);
  });
  it('builds the ask with the brief, the headlines before and the snapshot’s figures', () => {
    const story = { client: 'Northfield', brief: 'Why?', startedAt: 0 };
    const draft = { id: 'c', at: snap.at, from: 0, headline: '', narrative: [], snapshot: snap, since, by: 'assembled' } as StoryChapter;
    const a = storyAskOf(story, [{ ...draft, id: 'b', headline: 'The first week', approvedAt: 1 }], draft, snap.at);
    expect(a.client).toBe('Northfield'); expect(a.headlinesBefore).toEqual(['The first week']); expect(a.figures).toContain('595'); expect(a.figures).toContain('580');
    const read = readStoryAsk({ task: 'story', ...a });
    expect(read.ok).toBe(true);
    if (read.ok) expect(storyUser(read.ask)).toMatch(/CLIENT: Northfield[\s\S]*1\. The first week[\s\S]*WHAT FAULTLINE RECORDED/);
  });
  it('refuses an ask with no snapshot, or one too long', () => {
    expect(readStoryAsk({})).toMatchObject({ ok: false });
    expect(readStoryAsk({ snapshotText: 'x'.repeat(STORY_LIMITS.text + 1) })).toMatchObject({ ok: false, why: expect.stringMatching(/longer than the assistant takes/) });
  });
  it('reads the answer again, and finds the figures the snapshot does not hold', () => {
    expect(checkStoryAnswer({ headline: ' The wrapper decides the line ', narrative: ['A.', '', 'B.'] })).toEqual({ headline: 'The wrapper decides the line', narrative: ['A.', 'B.'] });
    expect(checkStoryAnswer({ headline: '', narrative: ['A.'] })).toBeNull();
    const a = readStoryAsk({ snapshotText: snapshotText(snap, since), figures: ['595', '580', '3'], brief: 'Why?', today: '8 November 2026', headlinesBefore: [] });
    if (!a.ok) throw new Error('ask');
    expect(unsureStory({ headline: 'The wrapper costs £580 a day', narrative: ['3 problems are open; the changeover went from 41 to 26 minutes.'] }, a.ask)).toEqual([]);
    expect(unsureStory({ headline: 'Savings of £12,000 a year', narrative: ['About 15% of output.'] }, a.ask)).toEqual(['12,000', '15']);
  });
});
