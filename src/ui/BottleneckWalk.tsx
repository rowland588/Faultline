/* THE BOTTLENECK, WALKED — on Line capacity, beside the bottleneck the sums
 * give (docs/CAPACITY.md §3; lib/ie/walk).
 *
 * Walk the line and tap each station: working, starved, blocked or down. A
 * walk is a work sampling study whose "people" are the line's stations —
 * one record, one tool, no new noun — on the product's line standard, its
 * moments drawn at random through the shift, the first one now. The latest
 * walk's verdict is said here against the calculated bottleneck: agreeing is
 * the proof; disagreeing says the speeds typed are wrong, or stops not speed
 * hold the line. */
import { useEffect, useState } from 'react';
import { listAllStudies, onDataChange, putStudy } from '../db';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { schedulePrompts } from '../tools/sampling/sampling';
import { WALK_STATES, walkVerdict } from '../lib/ie/walk';
import type { ToolStudy } from '../lib/study';

export function useWalks(standardId: string | undefined): ToolStudy[] {
  const [list, setList] = useState<ToolStudy[]>([]);
  useEffect(() => {
    if (!standardId) return;
    const load = () => void listAllStudies().then(all => setList(all.filter(s => !s.deletedAt && s.tool === 'sampling' && !!s.agreed?.sampling?.walk && s.standardId === standardId)
      .sort((a, b) => b.startedAt - a.startedAt)));
    load();
    return onDataChange(load);
  }, [standardId]);
  return list;
}

export function BottleneckWalk({ standardId, workspaceId, projectId, product, stations, calculated, canEdit }: {
  standardId: string; workspaceId?: string; projectId?: string; product: string; stations: string[]; calculated?: string; canEdit: boolean;
}) {
  const walks = useWalks(standardId);
  const latest = walks[0];
  const v = latest ? walkVerdict(latest.agreed?.sampling?.who ?? stations, latest.facts.taps ?? [], calculated) : undefined;
  const start = async () => {
    const t = now(), HR = 3_600_000;
    const s: ToolStudy = { id: uid(), tool: 'sampling', name: `Bottleneck walk — ${product}`, product, standardId,
      ...(workspaceId ? { workspaceId } : {}), ...(projectId ? { projectId } : {}),
      agreed: { sampling: { who: stations, activities: [...WALK_STATES], marginPts: 10, from: t, to: t + 8 * HR,
        prompts: [t, ...schedulePrompts(t + 20 * 60_000, t + 8 * HR, 11)], walk: true } },
      facts: { taps: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t };
    await putStudy(s);
    nav(`/sampling/${s.id}`);
  };
  if (stations.length < 2) return null;
  return (
    <div className="bw">
      <span className="cap-eyebrow">The bottleneck, walked</span>
      {v ? (
        <p className={'bw-says' + (v.against === 'disagrees' ? ' is-a' : '')}>{v.sentence}
          {' '}<button type="button" className="linkish" onClick={() => nav(`/sampling/${latest?.id}`)}>Open the walk</button></p>
      ) : (
        <p className="sub">Walk the line and tap each station — working, starved, blocked or down. A blocked station points to the bottleneck after it, a starved one to the one before; walked a few times through the shift, the bottleneck is where the arrows meet — no stopwatch.</p>
      )}
      {canEdit && <button type="button" className="btn" onClick={() => void start()}>{v ? 'Walk the line again' : 'Walk the line'}</button>}
    </div>
  );
}
