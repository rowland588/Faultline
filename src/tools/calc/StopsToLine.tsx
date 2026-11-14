/* THE STOPS TIMED HERE, PUT ON THE LINE'S STOP LOG (FC-241 part 8; ./stopsToLine) — drawn inside "Every stop timed". The person presses once;
 * after that the log follows the record: a stop timed, a reason changed, a stop taken off. The line's Pareto and its 6M read the log. */
import { useEffect, useRef, useState } from 'react';
import { addObservation, observationsById, patchStudy, softDeleteObservation, updateObservation } from '../../db';
import { now } from '../../lib/ids';
import type { ToolStudy } from '../../lib/study';
import { sixmListHref } from '../sixm/sixmTool';
import { parseStops, type StopDone } from './stopReasons';
import { lineStopsSaid, planSync, stopsWanted } from './stopsToLine';

/** Make the line's log hold exactly this record's timed stops. `take` = take them all off. */
export async function syncStopsToLine(s: ToolStudy, stops: readonly StopDone[], nameOf: (i: number) => string, o: { take?: boolean; ownerId?: string } = {}): Promise<number> {
  const lineId = s.workspaceId;
  const sent = s.facts.lineStops?.ids ?? [];
  if (!lineId && !sent.length) return 0;
  const wanted = o.take || !lineId ? [] : stopsWanted({ studyId: s.id, name: s.name, lineId, stops, nameOf, now: now(), ...(o.ownerId ? { ownerId: o.ownerId } : {}) });
  const held = await observationsById([...new Set([...sent, ...wanted.map(w => w.id)])]);
  const plan = planSync(wanted, held, sent);
  for (const a of plan.add) await addObservation(a);
  for (const u of plan.update) await updateObservation(u);
  for (const id of plan.remove) await softDeleteObservation(id);
  await patchStudy(s.id, cur => {
    const { lineStops: _l, ...facts } = cur.facts; void _l;
    return { facts: o.take || !lineId ? facts : { ...facts, lineStops: { lineId, ids: plan.ids, at: now() } } };
  });
  return plan.ids.length;
}

export function StopsToLine({ s, saved, lineName, nameOf, canEdit, me }: { s: ToolStudy; saved: unknown; lineName?: string; nameOf: (i: number) => string; canEdit: boolean; me?: string }) {
  const stops = parseStops(saved);
  const on = s.facts.lineStops;
  const [busy, setBusy] = useState(false);
  const names = stops.map(x => nameOf(x.i)).join('|');
  const sig = `${typeof saved === 'string' ? saved : ''}#${names}#${s.name}#${s.workspaceId ?? ''}`;
  const last = useRef<string | null>(null);
  const run = (take?: boolean): void => { setBusy(true); void syncStopsToLine(s, stops, nameOf, { take, ...(me ? { ownerId: me } : {}) }).finally(() => setBusy(false)); };
  /* kept in step: once they are on the line's log, every later change to the record's stops goes there too */
  useEffect(() => {
    if (!on || !canEdit) return;
    if (last.current === null) { last.current = sig; if (on.ids.length === stops.length && on.lineId === s.workspaceId) return; }
    else if (last.current === sig) return;
    last.current = sig;
    void syncStopsToLine(s, stops, nameOf, me ? { ownerId: me } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the signature is what changed
  }, [sig, !!on, canEdit]);
  if (!stops.length && !on) return null;
  return (
    <div className="calc-toline" data-stops-line={on ? 'on' : 'off'}>
      <p className="sub" role="status" data-stops-line-says>{lineStopsSaid({ line: lineName, stops: stops.length, ...(on ? { sent: on.ids.length } : {}), canEdit })}</p>
      {lineName && s.workspaceId && (
        <span className="calc-toline-acts">
          {!on && canEdit && <button type="button" className="btn btn-sm" data-stops-to-line disabled={busy} onClick={() => run()}>Put these stops on {lineName}’s stop log</button>}
          {on && <a className="linkish" data-stops-line-pareto href={`#/w/${encodeURIComponent(s.workspaceId)}/analyse`}>Open {lineName}’s Pareto ›</a>}
          {on && <a className="linkish" data-stops-line-sixm href={`#${sixmListHref(s.workspaceId)}`}>Its 6Ms ›</a>}
          {on && canEdit && <button type="button" className="linkish" data-stops-off-line disabled={busy} onClick={() => run(true)}>Take them off the line’s log</button>}
        </span>
      )}
    </div>
  );
}
