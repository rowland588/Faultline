/* The line standard's maps, small — what Hand over shows. The screen itself
 * (screens/StandardScreen) loads on first use. */
import { useCallback, useEffect, useState } from 'react';
import { listStandards, onDataChange } from '../db';
import { nav } from '../state/useRoute';
import { headcount, type Standard } from '../lib/standard';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function useStandards(projectId: string) {
  const [rows, setRows] = useState<Standard[] | null>(null);
  const load = useCallback(async () => setRows(await listStandards(projectId)), [projectId]);
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);
  return rows;
}

/** The maps, small — where Hand over shows them. */
export function StandardsCard({ projectId }: { projectId: string }) {
  const list = useStandards(projectId);
  if (list == null) return null;
  return (
    <section className="ls-strip">
      <div className="ls-strip-h">
        <h3>Line standard</h3>
        <span className="sub">who stands where, and what they do, on each product</span>
        <button className="btn btn-ghost btn-sm" onClick={() => nav(`/project/${projectId}/standard`)}>
          {list.length ? 'Open ›' : 'Make the first map ›'}
        </button>
      </div>
      {list.length > 0 && (
        <div className="ls-strip-list">
          {list.map(s => (
            <button key={s.id} className="ls-strip-b" onClick={() => nav(`/project/${projectId}/standard/${s.id}`)}>
              <b>{s.product}</b><span>{plural(headcount(s), 'person', 'people')}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
