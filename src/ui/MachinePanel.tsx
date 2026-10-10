/* THE MACHINE, IN THE DRAWER (docs/FLOW.md item 2).
 *
 * Opened from the machine's name wherever it shows — the front page's
 * machines, Commission's rows, the Programs page, the plan's machine headers,
 * Install's machine sheet and every record on it — so "what is left on the
 * weigher?" has one place. Its gates in order, every stage and test with its
 * state, day and who, each opening its record; then what is open on it; then
 * the machine itself, to correct. Read off lib/machineRecord, which reads the
 * same rules the gates do. */
import { useState } from 'react';
import { useProject } from '../lib/useProjects';
import { printLabels } from './printLabels';
import { climbsOf } from '../lib/rampUp';
import { Climbs } from './Climb';
import { machineRecord, type MachineLine, type MachineTone } from '../lib/machineRecord';
import { GATE_PATH } from '../lib/install';
import { hasRun, live, type Asset } from '../lib/testing';
import { todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { MachineCard } from '../screens/TestsScreen';
import { CriticalTag } from './CriticalFields';
import type { useTesting } from '../lib/useTesting';
import type { Program } from '../lib/programs';
import type { Can } from '../lib/access';

type TT = ReturnType<typeof useTesting>;

/** A MACHINE'S NAME AS A DOOR TO IT — drawn as the name, and heard as what
 *  it does ("Case packer — everything on this machine"), so a screen reader
 *  tells it from a chip that picks the machine (docs/FLOW.md item 2). */
export function MachineName({ name, onOpen }: { name: string; onOpen: () => void }) {
  return <button type="button" className="mp-name" aria-label={`${name} — everything on this machine`} onClick={onOpen}>{name}</button>;
}

/* The app's five colours, one meaning each (CLAUDE.md): red gone or failed,
   amber waiting, indigo ahead, green done, grey not started. */
const SQ: Record<MachineTone, 'r' | 'a' | 'w' | 'g' | 'n'> = { done: 'g', failed: 'r', late: 'r', problem: 'a', asking: 'a', ahead: 'w', none: 'n' };
const GATE_SQ = { done: 'g', going: 'w', late: 'r', problem: 'a', failed: 'r', ahead: 'n', none: 'n' } as const;

function Line({ l, onOpen, tag }: { l: MachineLine; onOpen: (id: string) => void; tag?: React.ReactNode }) {
  return (
    <li>
      <button type="button" className={'mp-line is-' + SQ[l.tone]} onClick={() => onOpen(l.id)}>
        <span className={'nv-sq is-' + SQ[l.tone]} aria-hidden />
        <span className="mp-line-m">
          <b>{tag}{l.title}</b>
          <small><span className={'mp-word is-' + SQ[l.tone]}>{l.word}</span>{l.who ? ` · ${l.who}` : ''}</small>
        </span>
      </button>
    </li>
  );
}

export function MachinePanel({ asset, projectId, tt, programs, can, onOpen, onClose }: {
  asset: Asset; projectId: string; tt: TT; programs: Program[]; can: Can;
  onOpen: (id: string) => void; onClose: () => void;
}) {
  const today = todayISO();
  const m = machineRecord(asset, { tests: tt.tests, items: tt.items, programs, today });
  const go = (path: string) => { onClose(); nav(`/project/${projectId}/${path}`); };
  const ran = live(tt.tests).filter(t => t.assetId === asset.id && (t.kind ?? 'test') === 'test' && hasRun(t)).length;
  const climbs = climbsOf({ tests: tt.tests, assets: [asset] }).filter(c => c.machineId === asset.id);
  return (
    <>
      <span className="rd-state-row">
        <span className={'rd-state is-' + (m.at.startsWith('Handed over') ? 'g' : m.arrivalLate ? 'r' : 'w')}>{m.at}</span>
      </span>
      <h2 className="rd-title">{m.name}</h2>
      <dl className="rd-facts">
        <div><dt>What</dt><dd>Machine{m.oem ? ` · ${m.oem}` : ''}</dd></div>
        <div><dt>On site</dt><dd className={m.arrivalLate ? 'in-late' : undefined}>{m.arrival}</dd></div>
        <div><dt>Still open</dt><dd>{m.open.length ? m.open.join(' · ') : <span className="sub">nothing</span>}</dd></div>
      </dl>

      {/* ITS GATES, IN THE ORDER IT GOES THROUGH THEM — every stage and test,
          each a door to its record. A gate's name goes to the gate's page,
          where its grid works every machine at once. */}
      {m.gates.map(g => (
        <section key={g.gate} className="rd-blk mp-gate">
          <h3 className="mp-gate-h">
            <button type="button" className="mp-gate-go" onClick={() => go(g.gate === 'commission' ? 'testing' : GATE_PATH[g.gate])}>
              <span className={'nv-sq is-' + GATE_SQ[g.tone]} aria-hidden />{g.label} ›
            </button>
            <span className="sub">{g.says}</span>
          </h3>
          {g.lines.length > 0 && <ul className="mp-lines">{g.lines.map(l => <Line key={l.id} l={l} onOpen={onOpen} />)}</ul>}
          {g.gate === 'setup' && m.programs && (
            <button type="button" className="rd-link mp-progs" onClick={() => go('programs')}>{m.programs} — the Programs page ›</button>
          )}
          {/* THE CLIMB TO RATE (lib/rampUp) — each product's runs on this
              machine, a branch of its Commission. */}
          {g.gate === 'commission' && <Climbs cs={climbs} />}
        </section>
      ))}

      {(m.fixes.length > 0 || m.fixesDone > 0) && (
        <section className="rd-blk mp-gate">
          <h3 className="mp-gate-h">
            <button type="button" className="mp-gate-go" onClick={() => go('fixes')}>Fixes ›</button>
            <span className="sub">{m.fixes.length} open{m.fixesDone ? ` · ${m.fixesDone} done` : ''}</span>
          </h3>
          {m.fixes.length > 0 && <ul className="mp-lines">{m.fixes.map(l => <Line key={l.id} l={l} onOpen={onOpen} />)}</ul>}
        </section>
      )}

      {m.problems.length > 0 && (
        <section className="rd-blk mp-gate">
          <h3 className="mp-gate-h"><span className="mp-gate-l">Problems with no fix</span><span className="sub">{m.problems.length} open</span></h3>
          <ul className="mp-lines">
            {m.problems.map(l => <Line key={l.id} l={l} onOpen={onOpen}
              tag={l.critical ? <CriticalTag /> : l.risk ? <CriticalTag risk /> : undefined} />)}
          </ul>
        </section>
      )}

      {/* ITS LABEL (lib/machineLabels) — the code to stick on it: scanned at the
          line, it opens this page. Anyone may print it; it writes nothing. */}
      <MachineLabelButton asset={asset} projectId={projectId} />

      {/* THE MACHINE ITSELF — its name, supplier and four dates, and remove.
          They lived in Install's machine sheet because Install was where
          machines lived; here they are wherever the machine is seen. */}
      {can.edit && (
        <section className="rd-blk">
          <h3 className="mp-gate-h"><span className="mp-gate-l">The machine</span></h3>
          <MachineCard a={asset} ran={ran} save={tt.saveAsset} />
        </section>
      )}
      {can.remove && (
        <div className="rd-blk">
          <button type="button" className="btn btn-ghost btn-sm cw-del rd-del" onClick={() => {
            if (!confirm(`Remove “${asset.name}”?\n\nIts stages and tests stay — they just stop naming a machine.`)) return;
            void tt.removeAsset(asset.id); onClose();
          }}>Remove this machine</button>
        </div>
      )}
    </>
  );
}

function MachineLabelButton({ asset, projectId }: { asset: Asset; projectId: string }) {
  const { project } = useProject(projectId);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  if (!project) return null;
  const print = async () => {
    setBusy(true); setSaid('');
    try { setSaid(await printLabels(project, [asset], asset.id)); }
    catch (e) { setSaid(`The label could not be drawn — ${e instanceof Error ? e.message : 'try again'}.`); }
    finally { setBusy(false); }
  };
  return (
    <p className="mp-label">
      <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void print()}>{busy ? 'Drawing…' : 'Print its label — PDF'}</button>
      <span className="sub"> A code for the machine: scanned with a phone’s camera, it opens this page.</span>
      {said && <span className="sub" role="status"> {said}</span>}
    </p>
  );
}
