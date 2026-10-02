/* What the walk found, on the plan: one lane, merged so markers never touch,
 * the number what is still open, the words the state. */
import { describe, expect, it } from 'vitest';
import { gantt } from '../gantt';
import { walkMarkers, walkSnagsOf, walkWords, type WalkSnag } from '../walkSnags';
import type { PlanMark } from '../standing';
import type { Snag, SnagAsset } from '../../snag/types';

const TODAY = '2026-10-02';
const plan: PlanMark[] = [{ id: 'a', kind: 'install', at: '2026-10-05', until: '2026-10-09', label: 'Wrapper — Install', tone: 'booked' }];
const snag = (id: string, found: string, state: WalkSnag['state'] = 'open', due?: string): WalkSnag =>
  ({ id, what: id, state, found, wsId: 'w', frameId: 'f', ...(due ? { due } : {}) });

describe('walk snags on the plan', () => {
  it('reads only snags pinned on a frame, with the frame they are on', () => {
    const at = (iso: string) => new Date(`${iso}T09:00:00`).getTime();
    const frames = [{ id: 'f1', workspaceId: 'w', name: 'Infeed', stillKey: 'k1', timestampS: 3, createdAt: 1 } as SnagAsset];
    const snags = [
      { id: 's1', workspaceId: 'w', assetId: 'f1', xPct: 20, yPct: 30, problem: 'Guard gap', status: 'open', raisedAt: at('2026-09-30'), dueAt: at('2026-10-01'), updatedAt: 1 },
      { id: 's2', workspaceId: 'w', problem: 'Board action', status: 'open', raisedAt: at('2026-09-30'), updatedAt: 1 },
      { id: 's3', workspaceId: 'w', assetId: 'f1', problem: 'Gone', status: 'open', raisedAt: at('2026-09-30'), updatedAt: 1, deletedAt: 2 },
    ] as Snag[];
    const out = walkSnagsOf([{ wsId: 'w', snags, frames }]);
    expect(out.map(s => s.id)).toEqual(['s1']);
    expect(out[0]).toMatchObject({ found: '2026-09-30', due: '2026-10-01', frameName: 'Infeed', stillKey: 'k1', x: 20, y: 30 });
  });

  it('says the state in words', () => {
    expect(walkWords([snag('a', '2026-09-30', 'open', '2026-10-01'), snag('b', '2026-09-30'), snag('c', '2026-09-29', 'closed')], TODAY))
      .toBe('2 open · 1 past due · 1 closed');
    expect(walkWords([snag('c', '2026-09-29', 'closed')], TODAY)).toBe('all 1 closed');
  });

  it('is one lane with a day per day found — never a row per snag', () => {
    const g = gantt(plan, { today: TODAY }, { tests: [], items: [], walk: [
      snag('a', '2026-09-30', 'open', '2026-10-01'), snag('b', '2026-09-30'), snag('c', '2026-10-06', 'closed'),
    ] });
    expect(g.groups.flatMap(x => x.rows)).toHaveLength(1);
    expect(g.walk?.days.map(d => [d.iso, d.ids.length, d.open, d.late])).toEqual([['2026-09-30', 2, 2, 1], ['2026-10-06', 1, 0, 0]]);
    expect(g.walk?.words).toBe('2 open · 1 past due · 1 closed');
  });

  it('an open snag found before the plan widens the calendar to show it', () => {
    const g = gantt(plan, { today: TODAY }, { tests: [], items: [], walk: [snag('old', '2026-09-01')] });
    expect(g.from <= '2026-09-01').toBe(true);
    expect(g.walk?.days[0].iso).toBe('2026-09-01');
  });

  it('merges days into weeks when they are too narrow to tell apart', () => {
    const g = gantt(plan, { today: TODAY }, { tests: [], items: [], walk: [
      snag('a', '2026-09-29'), snag('b', '2026-09-30'), snag('c', '2026-10-01', 'open', '2026-10-01'), snag('d', '2026-10-06'),
    ] });
    const wide = walkMarkers(g.walk!, 34);
    expect(wide).toHaveLength(4);
    const narrow = walkMarkers(g.walk!, 5);
    expect(narrow.map(m => [m.span, m.ids.length, m.open, m.late])).toEqual([[7, 3, 3, 1], [7, 1, 1, 0]]);
    expect(narrow[0].start % 7).toBe(0);   // a calendar week — the chart starts on a Monday
  });
});
