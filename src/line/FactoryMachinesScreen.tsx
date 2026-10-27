/* EVERY MACHINE IN THE FACTORY — the Factory's Machines tab (#/machines).
 *
 * Rowland, 27 October: "if I go to factory, I see overview, lines, programs. Why don't I see machines? ...
 * Something's wrong." Each line in floor order, its machines in flow order — who made it, the project working on
 * it, its programs proved of planned, the problems open on it — each opening the machine's own page on its line.
 * Read by lib/factoryMachines; on paper by lib/factoryMachinesPdf, the same words. A machine is named on its line's
 * Machines tab, where the order and the names are kept. */
import { useEffect, useMemo, useState } from 'react';
import type { Snag } from '../snag/types';
import { listAllSnags, onDataChange } from '../db';
import { useLineRecords } from '../lib/useLineRecords';
import { factoryMachines } from '../lib/factoryMachines';
import { niceDay, todayISO } from '../lib/weeks';
import { PageHeader } from '../ui/parts';
import { nav } from '../state/useRoute';

export function FactoryMachinesScreen() {
  const rec = useLineRecords();
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    const load = () => void listAllSnags().then(s => { if (live) setSnags(s); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  const r = useMemo(() => (snags ? factoryMachines({ lines: rec.lines, assets: rec.machines, jobLines: rec.jobLines, jobs: rec.jobs, programs: rec.programs, snags }) : null),
    [rec.lines, rec.machines, rec.jobLines, rec.jobs, rec.programs, snags]);

  if (rec.loading || !r) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  const print = async () => {
    if (busy) return;
    setBusy(true); setSaid(null);
    try {
      const { loadPdfLib, deliverPdf } = await import('../lib/savePdf');
      const { drawFactoryMachines } = await import('../lib/factoryMachinesPdf');
      const { pdfFileName } = await import('../lib/fileName');
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const today = todayISO();
      await drawFactoryMachines(doc, r, niceDay(today, { year: true }));
      const how = await deliverPdf(doc, pdfFileName('Factory', 'machines', today));
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
        papers={[{ label: 'The factory’s machines', for: r.total ? 'every machine, line by line — who made it, its project, its programs, what is open' : 'no machines named yet', disabled: !r.total || busy, make: print }]} />
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
                <li key={x.name} className={'lt-li fmc-m' + (x.critical ? ' is-late' : '')} data-machine={x.name}>
                  <button type="button" className="lt-row" onClick={() => nav(x.href)}>
                    <b className="lt-what"><span className="fmc-n">{x.n}</span> {x.name}{x.oem && <span className="sub"> · {x.oem}</span>}</b>
                    <span className="lt-says">{[x.project ? `With ${x.project}` : 'No project on it', x.programs ? `${x.proved} of ${x.programs} program${x.programs === 1 ? '' : 's'} proved` : 'no programs'].join(' · ')}</span>
                    <span className="lt-where">{x.open ? <b className={x.critical ? 'act-late' : ''}>{x.open} problem{x.open === 1 ? '' : 's'} open{x.critical ? `, ${x.critical} critical` : ''}</b> : 'No problems open'}</span>
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
