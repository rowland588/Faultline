/* The line standard's maps, small — what Hand over shows. The screen itself
 * (screens/StandardScreen) loads on first use. */
import { useCallback, useEffect, useState } from 'react';
import { listStandards, onDataChange } from '../db';
import { nav } from '../state/useRoute';
import { headcount, type Standard } from '../lib/standard';
import { can as canOf, type Can } from '../lib/access';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function useStandards(projectId: string) {
  const [rows, setRows] = useState<Standard[] | null>(null);
  const load = useCallback(async () => setRows(await listStandards(projectId)), [projectId]);
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);
  return rows;
}

/** The maps, small — where Hand over shows them. A client (lib/access) reads
 *  the maps that exist and is not offered a first one to make; the line
 *  standard holds nothing to delete from here, so the team sees what the
 *  owner sees. */
export function StandardsCard({ projectId, can = canOf('owner') }: { projectId: string; can?: Can }) {
  const list = useStandards(projectId);
  if (list == null) return null;
  const mayOpen = list.length > 0 || can.edit;
  return (
    <section className="ls-strip">
      <div className="ls-strip-h">
        <h3>Line standard</h3>
        <span className="sub">who stands where, and what they do, on each product</span>
        {mayOpen ? (
          <button className="btn btn-ghost btn-sm" onClick={() => nav(`/project/${projectId}/standard`)}>
            {list.length ? 'Open ›' : 'Make the first map ›'}
          </button>
        ) : <span className="sub">No map yet.</span>}
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
