/* SMED UNDER A PRODUCT'S STANDARD — a branch off the map, beside
 * the balance's and the work's lines (screens/StandardScreen; docs/TOOLKIT.md
 * tool 6, "shows up: under the product's standard").
 *
 * Two things, one line each: the newest changeover timed INTO this product
 * (lib/studyLinks currentChangeover) with its sentence and the door to it;
 * and the agreed changeovers the standard holds (capacity.changeovers, one
 * per product it is changed from — Set as the standard wrote them), each
 * opening the study it came from. "Start a SMED" starts one on this
 * product, on its line and its job, and opens it. Only the abnormal — external
 * work still done with the line stopped — carries colour. */
import { useCallback, useEffect, useState } from 'react';
import { getStudy, listAllStudies, onDataChange, putStudy } from '../../db';
import { now, uid } from '../../lib/ids';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import type { Standard } from '../../lib/standard';
import type { Can } from '../../lib/access';
import type { ToolStudy } from '../../lib/study';
import { standardLine } from './changeover';
import { changeoverLine, currentChangeover, studyHref } from '../../lib/studyLinks';

const day = (ms: number) => niceDay(isoDay(ms));

/** The newest changeover into a line standard, kept current; null when none. */
export function useChangeoverFor(standardId: string): ToolStudy | null | undefined {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS(currentChangeover(await listAllStudies(), { standardId }) ?? null), [standardId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return s;
}

export function ChangeoverLines({ s, can }: { s: Standard; can: Can }) {
  const current = useChangeoverFor(s.id);
  const agreed = [...(s.capacity?.changeovers ?? [])].sort((a, b) => b.agreedAt - a.agreedAt);
  const line = current ? changeoverLine(current) : undefined;
  const start = async () => {
    const t = now();
    const st: ToolStudy = { id: uid(), tool: 'changeover', name: `Into ${s.product}`, product: s.product, standardId: s.id,
      ...(s.workspaceId ? { workspaceId: s.workspaceId } : {}), ...(s.projectId ? { projectId: s.projectId } : {}),
      facts: { toProduct: s.product, sequence: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t };
    await putStudy(st);
    nav(studyHref(st));
  };
  const openAgreed = async (id: string) => { const st = await getStudy(id); if (st) nav(studyHref(st)); };
  return (
    <div className="ls-balance-line ls-co">
      <span className="ls-bl-h">SMED{agreed.length ? ' · the standard' : ''}</span>
      <span className={'ls-bl-say' + (line?.tone === 'a' ? ' is-a' : '')}>
        {current === undefined ? 'Opening…' : line ? line.text : current ? `${current.name}: not timed yet` : 'Not timed yet — Lap the changeover into this product on the phone, element by element, from the last good piece to the first good piece at full rate.'}
      </span>
      {current && <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(studyHref(current))}>Open the SMED ›</button>}
      {can.edit && <button type="button" className="btn btn-ghost btn-sm" onClick={() => void start()}>Start a SMED ›</button>}
      {agreed.length > 0 && (
        <ul className="ls-co-agreed">
          {agreed.map(a => (
            <li key={a.id} className="sub">
              <b>Standard{a.from ? ` from ${a.from}` : ''}:</b> {standardLine(a, day).replace(/ · from [^·]+/, '')}
              <button type="button" className="linkish" onClick={() => void openAgreed(a.fromStudyId)}>The SMED it came from ›</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
