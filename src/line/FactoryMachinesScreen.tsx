/* EVERY MACHINE IN THE FACTORY — the Factory's Machines tab (#/machines).
 *
 * Rowland, 27 October: "if I go to factory, I see overview, lines, programs. Why don't I see machines? ...
 * Something's wrong"; then: "factory machines tells you nothing. But projects, machines shows the page I have been
 * wanting .. but still no report abilities". So each line in floor order, its machines in flow order, and a machine
 * a stage-gate project is working on says what that project's Machines tab says of it — its status, where it is up
 * to, its programs, what it owes, what is next (project/machines) — opening its page in the project; a machine with
 * no project says so and opens its page on its line. Read by lib/factoryMachines; on paper by lib/machinePaperPdf,
 * the same words. A machine is named on its line's Machines tab, where the order and the names are kept. */
import { useEffect, useMemo, useState } from 'react';
import type { Snag } from '../snag/types';
import { listAllSnags, onDataChange } from '../db';
import { useLineRecords } from '../lib/useLineRecords';
import { useProjects } from '../lib/useProjects';
import { useJobInputs } from '../lib/useJobInputs';
import { factoryMachines, factoryMachinesPaper, type InProject } from '../lib/factoryMachines';
import { gateOwed, projectMachineRows } from '../project/machines/machines';
import { todayISO } from '../lib/weeks';
import { PageHeader } from '../ui/parts';
import { nav } from '../state/useRoute';

export function FactoryMachinesScreen() {
  const rec = useLineRecords();
  const { projects } = useProjects();
  const inputs = useJobInputs(projects);
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => void listAllSnags().then(s => { if (alive) setSnags(s); });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
  }, []);
  /* every stage-gate project's machines, read as its own Machines tab reads them */
  const inProjects = useMemo(() => {
    const m = new Map<string, InProject>();
    if (!inputs) return m;
    const today = todayISO();
    for (const g of inputs.gate) for (const row of projectMachineRows(g, gateOwed(g, today), today)) m.set(row.id, { projectId: g.project.id, project: g.project.name, row });
    return m;
  }, [inputs]);
  const r = useMemo(() => (snags && inputs ? factoryMachines({ lines: rec.lines, assets: rec.machines, jobLines: rec.jobLines, jobs: rec.jobs, programs: rec.programs, snags, inProjects }) : null),
    [rec.lines, rec.machines, rec.jobLines, rec.jobs, rec.programs, snags, inputs, inProjects]);

  if (rec.loading || !r) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  const print = async () => {
    if (busy) return;
    setBusy(true); setSaid(null);
    try {
      const { saveMachinesPaper } = await import('../lib/machinePaperPdf');
      const how = await saveMachinesPaper(factoryMachinesPaper(r), ['Factory', 'machines']);
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('factory machines pdf failed', e);
      setSaid('The paper could not be made — try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap pace fmc">
      <PageHeader eyebrow={<span className="pl-eyebrow">FACTORY</span>} title="Machines"
        says={<span className="pl-says fmc-says">{r.says}</span>}
        papers={[{ label: 'The factory’s machines', for: r.total ? 'every machine, line by line — its status, its project and where it is up to, its programs, what is next' : 'no machines named yet', disabled: !r.total || busy, make: print }]} />
      {said && <p className="tc-ok" role="status">{said}</p>}
      {!rec.lines.length && (
        <div className="fac-empty">
          <p>Set up your factory first — your lines, in floor order. Then name each line’s machines on its Machines tab.</p>
          <button type="button" className="btn btn-primary" onClick={() => nav('/factory?add=1')}>Set up your factory</button>
        </div>
      )}
      {r.groups.map(g => (
        <section key={g.line.id} className="pl-sec fmc-line" aria-label={`Machines on ${g.line.name}`}>
          <div className="pl-sec-h">
            <h2>{g.line.name}{g.line.lineType ? <span className="sub"> · {g.line.lineType}</span> : null}</h2>
            <span className="sub">{g.rows.length ? `${g.rows.length} machine${g.rows.length === 1 ? '' : 's'}` : 'none named yet'}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/lines/${encodeURIComponent(g.line.id)}?view=machines`)}>{g.rows.length ? `Order and names on ${g.line.name} ›` : `Name its machines ›`}</button>
          </div>
          {g.rows.length > 0 && (
            <ul className="lt-rows">
              {g.rows.map(x => (
                <li key={x.name} className={'lt-li fmc-m now-m' + (x.rightTone === 'r' ? ' is-late' : '')} data-machine={x.name}>
                  <button type="button" className="lt-row" onClick={() => nav(x.href)}>
                    <b className="lt-what"><span className="fmc-n">{x.n}</span> {x.name}{x.oem && <span className="sub"> · {x.oem}</span>}
                      {x.status && <> <span className={'pms-status is-' + (x.statusTone ?? 'w')}>{x.status}</span></>}</b>
                    <span className="lt-says">{x.says}</span>
                    <span className={'lt-where' + (x.rightTone === 'r' ? ' act-late' : '')}>{x.right}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
