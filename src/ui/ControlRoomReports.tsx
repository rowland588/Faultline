/* THE CONTROL ROOM'S REPORTS — every paper the app makes, from the control
 * room. Rowland, 14 October: "report is there but only in projects not in the
 * control room — that's the problem, we need the same in control room."
 *
 * A job's Reports sheet (ui/ReportsSheet) is the index of its papers; this is
 * the same index one level up, in the order the control room is read: the
 * control room's own papers (every job and line on one page, the factory, the
 * problems register, the programs, the tools' lists), then each line of the
 * factory in floor order, then every job — each job's own list, the very
 * doors its Reports sheet shows (JobPapers), under its name. A door that makes
 * its paper here makes it; one whose paper is printed from its page opens
 * that page, and says so. Nothing is stored. */
import { useMemo, useState } from 'react';
import type { Project } from '../types';
import { useFactoryLines } from '../lib/useFactoryLines';
import { Sheet } from './Sheet';
import { Door, JobPapers } from './ReportsSheet';
import { useJobInputs } from '../lib/useJobInputs';
import { useLineWork } from '../lib/useLineWork';
import { portfolio } from '../lib/portfolio';
import { todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';

export function ControlRoomReports({ projects, onClose }: {
  /** The jobs on the control room, in its order. */
  projects: Project[];
  onClose: () => void;
}) {
  const go = (to: string) => { onClose(); nav(to); };
  /* Your factory's lines, in floor order (lib/useFactoryLines) */
  const lines = useFactoryLines();
  /* the control room report is made from the board's own reading (lib/portfolio) */
  const inputs = useJobInputs(projects);
  const lineWork = useLineWork();
  const today = todayISO();
  const pf = useMemo(() => (inputs && lineWork ? portfolio(inputs.gate, today, inputs.paced, lineWork) : null), [inputs, lineWork, today]);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const controlRoom = async () => {
    if (!pf || busy) return;
    setBusy(true); setSaid('');
    try {
      const { saveControlRoomReport } = await import('../lib/controlRoomPdf');
      const how = await saveControlRoomReport(pf, today);
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      setSaid(`The report could not be made — ${e instanceof Error ? e.message : 'try again'}.`);
    } finally { setBusy(false); }
  };

  return (
    <Sheet open onClose={onClose} title="On paper — the control room">
      <div className="meet-reports">
        {/* THE CONTROL ROOM'S OWN — who each is for, said first, as a job's */}
        <Door title="Control room report — 1 page"
          says={busy ? 'Making it…' : pf ? 'For the business — every project and every line on one page: where each is, why, and who owes what.' : 'Reading every project…'}
          onClick={() => void controlRoom()} />
        {said && <p className="sub" role="status">{said}</p>}
        <Door title="Factory report" says="Every line in floor order, with its type, its projects and what is open — one page. Print it from the Factory’s Lines page." onClick={() => go('/factory')} />
        <Door title="Problems" says="Every problem on every line and project, in priority order — the Problems report, and a card for every problem. Print them from the page." onClick={() => go('/snags')} />
        <Door title="Programs" says="Every line's programs, machine by machine, planned and proved — the programs report, from the page." onClick={() => go('/programs')} />
        <Door title="Line capacity" says="Every product's capacity, a page each, with a front saying them all — Report ▾ on the list." onClick={() => go('/balances')} />
        <Door title="Line standard" says="For the floor — a line standard card for every product — Report ▾ on the list." onClick={() => go('/standards')} />
        <Door title="The studies" says="Capability, value stream, SMED, work sampling and loss counts — each on paper, and every one shown from Report ▾ on each tool's list." onClick={() => go('/capability')} />

        {/* EACH LINE OF THE FACTORY, in floor order: its problems on its page,
            its week on one page, its evidence cards */}
        {lines.length > 0 && <h3 className="meet-h">Each line</h3>}
        {lines.map(w => (
          <section key={w.id} className="meet-line" aria-label={w.name}>
            <Door title={`${w.name} — its problems`} says="Its problems report, and a card for each problem, from the line's page." onClick={() => go(`/lines/${w.id}`)} />
            <Door title={`One-page report — ${w.name}`} says="The week on this line in one page — lost time, where it went, the problems needing a push." onClick={() => go(`/w/${w.id}/report`)} />
            <Door title={`Evidence cards — ${w.name}`} says="One page per problem on this line's walk, with its picture." onClick={() => go(`/w/${w.id}/snaglist`)} />
          </section>
        ))}

        {/* EVERY JOB — its own Reports list, the same doors, under its name */}
        {projects.length > 0 && <h3 className="meet-h">Each project</h3>}
        {projects.map(p => (
          <section key={p.id} className="meet-line cr-job-papers" aria-label={p.name}>
            <p className="meet-line-n">{p.name}</p>
            <JobPapers project={p} onClose={onClose} />
          </section>
        ))}
      </div>
    </Sheet>
  );
}

/** A LINE'S PAPERS — its Reports in the line's rail (docs/STRUCTURE.md §5.2, B2): the doors the
 *  control room's sheet gives each line, on their own. */
export function LineReports({ line, onClose }: { line: { id: string; name: string }; onClose: () => void }) {
  const go = (to: string) => { onClose(); nav(to); };
  return (
    <Sheet open onClose={onClose} title={`On paper — ${line.name}`}>
      <div className="meet-reports">
        <Door title={`Line report — ${line.name}`} says="The line on one page — its problems, its machines, its products ready or not, what its tools found, its projects. From the line's page." onClick={() => go(`/lines/${line.id}`)} />
        <Door title={`${line.name} — its problems`} says="Its problems report, and a card for each problem, from the line's page." onClick={() => go(`/lines/${line.id}`)} />
        <Door title={`One-page report — ${line.name}`} says="The week on this line in one page — lost time, where it went, the problems needing a push." onClick={() => go(`/w/${line.id}/report`)} />
        <Door title={`Evidence cards — ${line.name}`} says="One page per problem on this line's walk, with its picture." onClick={() => go(`/w/${line.id}/snaglist`)} />
      </div>
    </Sheet>
  );
}

