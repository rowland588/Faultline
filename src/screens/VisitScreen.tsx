/* A VISIT'S PAGE — #/visit/:id (11 November, docs/CONSULTANT-WORKSPACE.md C3; lib/visits). Rowland: "Faultline lays out what was captured on
 * that visit — the problems with their money, the photos, the measurements — and the visit report is made from it."
 *
 * The customer and the day, what we were asked (the brief said at the door), then what was found that day — every record READ from the
 * customer's lines in the visit's hours (visitRecords), each a door to itself: problems with their money (problemCost, the line's own cost
 * model), photos, measurements and studies, Line Talks. A problem held at the customer before its line was known offers PLACE ON A LINE.
 * What we recommend next is typed here. MAKE THE VISIT REPORT is the client-facing paper (lib/report/visitPaper), kept under Saved copies like
 * every paper. In hand: End the visit is the primary; ended: the report is. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllSnags, listAllStandards, listAllStudies, listObservations, listWorkspaces, onDataChange } from '../db';
import type { Observation, Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { ToolStudy } from '../lib/study';
import type { Standard } from '../tools/linestandard/standard';
import type { Department } from '../lib/departments';
import { endVisit, isHolding, placeProblem, placesFor, setRecommend, visitDayLong, visitRecords, visitSays, type Visit, type VisitFound } from '../lib/visits';
import { useVisits } from '../lib/useVisits';
import { setActiveClient, storedClient } from '../lib/activeClient';
import { customerKey } from '../lib/customers';
import { problemCost } from '../lib/problemCost';
import { neckOf } from '../lib/lineLoss';
import { studyHref, studyTitle } from '../lib/studyLinks';
import { useBlobUrl } from '../lib/useBlobUrl';
import { readBrand } from '../lib/brand';
import { PageHeader } from '../ui/parts';
import { DraftArea } from '../ui/Draft';
import { openStartVisit } from '../ui/StartVisit';
import { lineHref } from '../ui/rail';
import { nav } from '../state/useRoute';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const hhmm = (t: number) => new Date(t).toTimeString().slice(0, 5);
const mins = (ms: number) => Math.round(ms / 60000);

interface Got { lines: Workspace[]; snags: Snag[]; studies: ToolStudy[]; standards: Standard[]; departments: Department[]; stops: Observation[] }

export function VisitScreen({ id }: { id: string }) {
  const { ready, visits } = useVisits();
  const v = visits.find(x => x.id === id);
  const [got, setGot] = useState<Got | null>(null);
  const load = useCallback(async () => {
    if (!v) return;
    const [lines, snags, studies, standards, deps] = await Promise.all([listWorkspaces(), listAllSnags(), listAllStudies(), listAllStandards(), import('../db/departments').then(m => m.listDepartments())]);
    const mine = lines.filter(w => customerKey(w.clientName) === customerKey(v.client));
    const stops = (await Promise.all(mine.map(w => listObservations(w.id)))).flat();
    setGot({ lines, snags, studies, standards, departments: deps, stops });
  }, [v]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  /* THE PAGE IS THE CUSTOMER'S — the bar follows it, as it follows a line's page (C1) */
  useEffect(() => { if (v && customerKey(storedClient()) !== customerKey(v.client)) setActiveClient(v.client); }, [v?.client]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <div className="wrap vs"><p className="sub">Reading the visit…</p></div>;
  if (!v) return <div className="wrap vs"><PageHeader eyebrow="VISIT" title="This visit is not here" says="It may have been made on another device that has not synced yet." /></div>;
  if (!got) return <div className="wrap vs"><p className="sub">Reading what was captured…</p></div>;
  return <VisitPage v={v} got={got} />;
}

function VisitPage({ v, got }: { v: Visit; got: Got }) {
  const f = useMemo(() => visitRecords(v, got), [v, got]);
  const byLine = useMemo(() => new Map(got.lines.map(w => [w.id, w])), [got.lines]);
  const money = (s: Snag) => { const w = byLine.get(s.workspaceId); return w ? problemCost(s, s.targetAsset, w, neckOf(got.standards, w.id)) : undefined; };
  const places = placesFor(got.lines, v.client);
  const ended = v.endedAt != null;
  const [said, setSaid] = useState('');
  const makeReport = async () => {
    const { makeVisitPaper } = await import('../lib/report/visitPaper');
    const { shrinkPicture } = await import('../tools/talk/talkPictures');
    const { deliverPdf } = await import('../lib/savePdf');
    const photos = await Promise.all(f.photos.map(async p => ({ caption: p.caption, pic: await shrinkPicture(p.key, 1200, 0.82) })));
    const doc = await makeVisitPaper({
      client: v.client, ...(v.site ? { site: v.site } : {}), day: visitDayLong(v), ...((v.by ?? readBrand()?.name) ? { by: v.by ?? readBrand()?.name } : {}),
      ...(v.brief ? { brief: v.brief } : {}), ...(v.recommend ? { recommend: v.recommend } : {}), ended,
      found: f.problems.map(s => { const c = money(s); return { what: s.problem, where: whereOf(s, byLine), priority: s.priority ?? 'low', ...(c ? { money: c.words } : {}), ...(s.owner ? { who: s.owner } : {}) }; }),
      seen: seenOf(f, byLine),
      photos,
      restsOn: restsOn(f),
      printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    });
    await deliverPdf(doc, `Visit report — ${v.client} — ${v.day}.pdf`);
    setSaid('The visit report is made — kept under Saved copies.');
  };
  return (
    <div className="wrap vs" data-visit={v.id} data-visit-state={ended ? 'ended' : 'in-hand'}>
      <PageHeader eyebrow={`VISIT · ${ended ? 'ENDED' : 'IN HAND'}`} title={`${v.client} — ${visitDayLong(v)}`}
        says={<span>{[v.site, ended ? `${hhmm(v.startedAt)}–${hhmm(v.endedAt ?? v.startedAt)}` : `since ${hhmm(v.startedAt)}`, v.by].filter(Boolean).join(' · ')} · <b data-visit-says>{visitSays(f)}</b></span>}
        primary={ended ? { label: 'Make the visit report', run: () => void makeReport(), className: 'vs-report' } : { label: 'End the visit', run: () => void endVisit(v), className: 'vs-end' }}
        papers={[{ label: 'Visit report', for: 'for the client: what we were asked, what we saw, what we found with its money, the photos, what we recommend next', make: makeReport }]}
        more={[{ label: `${v.client}’s story`, run: () => nav('/story') }, { label: 'Start another visit', run: () => openStartVisit(v.client) }]} />
      {said && <p className="sub" role="status">{said}</p>}

      <section className="vs-sec" aria-label="What we were asked">
        <h2 className="ln-h">What we were asked</h2>
        <p className={v.brief ? 'vs-brief' : 'sub'} data-visit-brief>{v.brief || 'Nothing said at the door — the visit is what was seen on the floor.'}</p>
      </section>

      <section className="vs-sec" aria-label="What was found">
        <h2 className="ln-h">What was found <span className="act-col-n">{f.problems.length}</span></h2>
        {f.problems.length === 0 ? <p className="sub">No problem taken on the visit yet — ＋ Problem in the bar takes one here{places.length ? '' : ', held at the customer until its line is known'}.</p> : (
          <ul className="lt-rows" data-visit-problems>
            {f.problems.map(s => {
              const c = money(s), w = byLine.get(s.workspaceId);
              return (
                <li key={s.id} className="lt-li vs-problem" data-visit-problem={s.problem}>
                  <button type="button" className="lt-row" onClick={() => nav(`/snags?open=${encodeURIComponent(s.id)}`)}>
                    <b className="lt-what">{s.problem}</b>
                    <span className="lt-says">{whereOf(s, byLine)} · {hhmm(s.raisedAt)}{c ? ` · ${c.short}` : ' · not priced yet'}</span>
                  </button>
                  {isHolding(w) && <PlaceOnLine snag={s} places={places} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="vs-sec" aria-label="Photos">
        <h2 className="ln-h">Photos <span className="act-col-n">{f.photos.length}</span></h2>
        {f.photos.length === 0 ? <p className="sub">No photo taken on the visit yet.</p> : (
          <ul className="vs-photos" data-visit-photos>
            {f.photos.map(p => <Photo key={p.key} p={p} />)}
          </ul>
        )}
      </section>

      <section className="vs-sec" aria-label="Measurements and studies">
        <h2 className="ln-h">Measurements, studies and talks <span className="act-col-n">{f.studies.length + f.talks.length + (f.stops.length ? 1 : 0)}</span></h2>
        {f.studies.length + f.talks.length + f.stops.length === 0 ? <p className="sub">Nothing measured, studied or talked through on the visit yet.</p> : (
          <ul className="lt-rows" data-visit-seen>
            {stopsByLine(f).map(x => (
              <li key={x.line.id} className="lt-li"><button type="button" className="lt-row" onClick={() => nav(lineHref(x.line.id, 'logs'))}><b className="lt-what">Stops timed — {x.line.name}</b><span className="lt-says">{plural(x.n, 'stop')} · {x.min} min</span></button></li>
            ))}
            {f.studies.map(s => (
              <li key={s.id} className="lt-li" data-visit-study={s.id}><button type="button" className="lt-row" onClick={() => nav(studyHref(s))}><b className="lt-what">{studyTitle(s)}</b><span className="lt-says">{byLine.get(s.workspaceId ?? '')?.name ?? ''} · {hhmm(s.createdAt)}</span></button></li>
            ))}
            {f.talks.map(s => (
              <li key={s.id} className="lt-li" data-visit-talk={s.id}><button type="button" className="lt-row" onClick={() => nav(`/talk/${encodeURIComponent(s.id)}`)}><b className="lt-what">Line Talk — {s.name}</b><span className="lt-says">{byLine.get(s.workspaceId ?? '')?.name ?? ''} · {hhmm(s.createdAt)}</span></button></li>
            ))}
          </ul>
        )}
      </section>

      <section className="vs-sec" aria-label="What we recommend next">
        <h2 className="ln-h">What we recommend next</h2>
        <DraftArea value={v.recommend ?? ''} rows={3} className="text-input" ariaLabel="What we recommend next" placeholder="Optional — printed on the visit report" onSave={t => void setRecommend(v, t)} />
      </section>
    </div>
  );
}

/** Where a problem is — its line, or "held at <customer>, not on a line yet". */
function whereOf(s: Snag, byLine: Map<string, Workspace>): string {
  const w = byLine.get(s.workspaceId);
  if (!w) return 'its line is not on this device';
  if (isHolding(w)) return `held at ${w.clientName ?? 'the customer'}, not on a line yet`;
  return `${w.name}${s.targetAsset ? ` · ${s.targetAsset}` : ''}`;
}

function stopsByLine(f: VisitFound): { line: Workspace; n: number; min: number }[] {
  return f.lines.map(line => {
    const o = f.stops.filter(x => x.workspaceId === line.id);
    return { line, n: o.length, min: mins(o.reduce((t, x) => t + (x.durationMs ?? 0), 0)) };
  }).filter(x => x.n > 0);
}
function seenOf(f: VisitFound, byLine: Map<string, Workspace>): { what: string; says: string }[] {
  return [
    ...stopsByLine(f).map(x => ({ what: `Stops timed on ${x.line.name}`, says: `${plural(x.n, 'stop')}, ${x.min} minutes` })),
    ...f.studies.map(s => ({ what: studyTitle(s), says: `on ${byLine.get(s.workspaceId ?? '')?.name ?? 'its line'}, started ${hhmm(s.createdAt)}` })),
    ...f.talks.map(s => ({ what: `Line Talk — ${s.name}`, says: `on ${byLine.get(s.workspaceId ?? '')?.name ?? 'its line'}` })),
  ];
}
function restsOn(f: VisitFound): string {
  return [f.stops.length ? `Stops timed (${f.stops.length})` : '', f.studies.length ? `Studies (${f.studies.length})` : '', f.talks.length ? `Line Talks (${f.talks.length})` : '', f.problems.length ? `Problems (${f.problems.length})` : '', f.photos.length ? `Photos (${f.photos.length})` : ''].filter(Boolean).join(' · ');
}

function Photo({ p }: { p: VisitFound['photos'][number] }) {
  const url = useBlobUrl(p.key);
  const to = p.from === 'problem' ? `/snags?open=${encodeURIComponent(p.refId)}` : p.from === 'walk' ? `/ai?c=${encodeURIComponent(p.refId)}` : `/talk/${encodeURIComponent(p.refId)}`;
  return (
    <li className="vs-photo" data-visit-photo={p.from}>
      <button type="button" className="vs-photo-b" onClick={() => nav(to)} aria-label={`${p.caption} — open where it was taken`}>
        {url ? <img src={url} alt={p.caption} /> : <span className="sub">Not on this device</span>}
        <span className="vs-photo-c">{p.caption} · {hhmm(p.at)}</span>
      </button>
    </li>
  );
}

/** PLACE ON A LINE — a problem held at the customer moved onto the line it belongs to. */
function PlaceOnLine({ snag, places }: { snag: Snag; places: Workspace[] }) {
  if (!places.length) return <button type="button" className="btn btn-sm" onClick={() => nav('/factory')} data-place-none>Add its line first ›</button>;
  return (
    <label className="vs-place" data-place-on-line>
      <span className="sr-only">Place “{snag.problem}” on a line</span>
      <select value="" aria-label={`Place “${snag.problem}” on a line`} onChange={e => { if (e.target.value) void placeProblem(snag.id, e.target.value); }}>
        <option value="">Place on a line…</option>
        {places.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
    </label>
  );
}
