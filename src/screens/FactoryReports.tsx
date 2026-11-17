/* THE FACTORY'S REPORTS TAB — #/room?view=reports (16 November, docs/NAV.md N2 — Rowland: "I couldn't then get onto the correct reports and
 * the correct page … multiple doors are opening … Customers like simple reports that they can simply look at something and understand").
 *
 * Two reports, as every place has: the SUMMARY — the Factory overview, the customer's factory on one paper (docs/OVERVIEW.md) — and
 * EVERYTHING — every area's report and every line's full package, one press each, so the whole factory is a list of its places. The
 * other papers the board's Report ▾ held (the control room's page, the client update, the library) are one fold below, nothing deleted.
 * Then the papers already made here and on the two the Summary opens, kept in the app. */
import { useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { PageHeader } from '../ui/parts';
import { Fold } from '../ui/Fold';
import { PlaceReports } from '../ui/PlaceReports';
import { ControlRoomReports } from '../ui/ControlRoomReports';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useClientScope } from '../lib/activeClient';
import { useProjects } from '../lib/useProjects';
import { areaHref, areasOf } from '../lib/areas';
import { productionLines } from '../lib/lines';
import { savingAt } from '../lib/useSaveOnArrival';
import { loadJobInputs, useJobInputs } from '../lib/useJobInputs';
import { readLineWork, useLineWork } from '../lib/useLineWork';
import { portfolio } from '../lib/portfolio';
import { todayISO } from '../lib/weeks';

const enc = encodeURIComponent;
const fullOf = (id: string) => `/lines/${enc(id)}/report?full=1`;

export function FactoryReports() {
  const cs = useClientScope();
  const lines = productionLines(useFactoryLines()).filter(w => cs.line(w.id));
  const { projects, loading: projectsLoading } = useProjects();
  const [every, setEvery] = useState(false);
  const [sheet, setSheet] = useState(false);
  const clients = new Set(lines.map(w => (w.clientName ?? '').trim().toLowerCase()).filter(Boolean)).size;
  const { areas, noArea } = useMemo(() => areasOf(lines, clients > 1), [lines, clients]);
  /* the control room report — made from the board's own reading (lib/portfolio), as the board's Report ▾ made it */
  const mine = useMemo(() => projects.filter(p => cs.project(p.id)), [projects, cs]);
  const inputs = useJobInputs(mine);
  const lineWork = useLineWork();
  const today = todayISO();
  const pf = useMemo(() => (!projectsLoading && cs.ready && inputs && lineWork ? portfolio(inputs.gate, today, inputs.paced, lineWork) : null), [projectsLoading, cs.ready, inputs, lineWork, today]);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const controlRoom = async () => {
    if (!pf || busy) return;
    setBusy(true); setSaid('');
    try {
      const { saveControlRoomReport } = await import('../lib/controlRoomPdf');
      const [freshInputs, freshLines] = await Promise.all([loadJobInputs(mine), readLineWork()]);
      const fresh = portfolio(freshInputs.gate, today, freshInputs.paced, freshLines.filter(x => cs.line(x.line.id)));
      const how = await saveControlRoomReport(fresh, today);
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      setSaid(`The report could not be made — ${e instanceof Error ? e.message : 'try again'}.`);
    } finally { setBusy(false); }
  };

  const place = (key: string, name: string, says: string, to: string) => (
    <li key={key} className="lrs-p" data-every-report={name}>
      <span className="lrs-p-t"><b>{name}</b><span className="sub">{says}</span></span>
      <button type="button" className="btn btn-sm" onClick={() => nav(savingAt(to))}>Download</button>
    </li>
  );

  return (
    <div className="wrap home fac-reports">
      <PageHeader title="Reports" says="The customer summary, full reports by area or line, and saved copies." />
      <PlaceReports label="The factory's reports"
        match={k => k.page === '#/overview' || k.page === '#/story' || k.page === '#/room'}
        rows={[
          { key: 'summary', title: 'Summary', says: 'The Factory overview — what costs the most, what holds each line, what needs attention and what has improved, on one paper for the customer.',
            primary: { label: 'Download', run: () => nav('/overview?save=1') }, other: { label: 'Open it', run: () => nav('/overview') } },
          { key: 'everything', title: 'Reports by area or line', says: 'Every area’s report and every line’s full package — every record, problem, program and machine — one press each.',
            primary: { label: every ? 'Hide the list' : 'Choose a place', run: () => setEvery(v => !v), disabled: !lines.length } },
        ]}
        after={every ? (
          <div className="lrs-every" data-every-list>
            {areas.map(a => (
              <section key={a.title + (a.id.client ?? '')} className="lrs-every-sec" aria-label={a.title}>
                <ul className="lrs-pl">
                  {place(`a:${a.title}`, a.id.client ? `${a.title} · ${a.id.client}` : a.title, `The area report — ${a.lines.length} line${a.lines.length === 1 ? '' : 's'}, each with every record, then the area together.`, areaHref(a.id, true))}
                  {a.lines.map(w => place(w.id, w.name, 'The line’s full package — everything on it.', fullOf(w.id)))}
                </ul>
              </section>
            ))}
            {noArea.length > 0 && (
              <section className="lrs-every-sec" aria-label="Lines in no area">
                <ul className="lrs-pl">{noArea.map(w => place(w.id, w.name, 'The line’s full package — everything on it.', fullOf(w.id)))}</ul>
              </section>
            )}
          </div>
        ) : null} />
      <Fold id="factory-other-papers" title="Other papers" start={false} says="The control room report, each project’s and line’s papers, the client update and the library">
        <ul className="lrs-pl" data-other-papers>
          <li className="lrs-p"><span className="lrs-p-t"><b>Control room report — 1 page</b><span className="sub">For the business — every project and every line on one page: where each is, why, and who owes what.</span></span><button type="button" className="btn btn-sm" disabled={!pf || busy} onClick={() => void controlRoom()}>{busy ? 'Making…' : !pf ? 'Loading…' : 'Download'}</button></li>
          <li className="lrs-p"><span className="lrs-p-t"><b>Each project’s and each line’s papers</b><span className="sub">Every paper the factory’s projects and lines have, in one list.</span></span><button type="button" className="btn btn-sm" onClick={() => setSheet(true)}>Open</button></li>
          <li className="lrs-p"><span className="lrs-p-t"><b>Client update — the story so far</b><span className="sub">What was asked, found, done and proved — its report and slides.</span></span><button type="button" className="btn btn-sm" onClick={() => nav('/story')}>Open</button></li>
          <li className="lrs-p"><span className="lrs-p-t"><b>Library</b><span className="sub">Every paper you have made, the very file you handed over.</span></span><button type="button" className="btn btn-sm" onClick={() => nav('/library')}>Open</button></li>
        </ul>
        {said && <p className="sub" role="status">{said}</p>}
      </Fold>
      {sheet && <ControlRoomReports projects={projects} onClose={() => setSheet(false)} />}
    </div>
  );
}
