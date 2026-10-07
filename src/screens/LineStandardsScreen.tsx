/* A LINE'S MAPS AND BALANCES — tools on the line, a job optional.
 *
 * Rowland, 7 October: "We also want the line balancing tool and the line
 * mapping tool, much like the snags, so I can use them — assign them to a
 * line, they don't necessarily have to be part of a project, but can then be
 * attached to a project ... it's a tool, but can be attached." Several per
 * line, one per product.
 *
 * The same screens a job's line standard has (screens/StandardScreen), at the
 * line's own address: the products, and each one's map with its balance under
 * it. A product attached to a job shows in that job's line standard as well —
 * one record, seen from both (LINE_TOOLS.sql). Anybody on the line uses its
 * tools, as anybody on it raises its snags. */
import { useCallback, useEffect, useState } from 'react';
import { getWorkspace, listStandardsForLine, onDataChange } from '../db';
import type { Standard } from '../lib/standard';
import { can as canOf } from '../lib/access';
import { StandardsAt, type StdHome } from './StandardScreen';

export function LineStandardsScreen({ wsId, standardId }: { wsId: string; standardId?: string }) {
  const [list, setList] = useState<Standard[] | null>(null);
  const [name, setName] = useState<string | null>(null);
  const load = useCallback(async () => setList(await listStandardsForLine(wsId)), [wsId]);
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);
  useEffect(() => { void getWorkspace(wsId).then(w => setName(w?.name ?? 'The line')); }, [wsId]);
  if (list == null || name == null) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  const home: StdHome = { name, base: `/w/${wsId}/standards`, wsId };
  /* A line's members use all of its tools — draw, balance, attach and delete
     — as they raise and close its snags. */
  return <StandardsAt home={home} list={list} standardId={standardId} can={canOf('owner')} />;
}
