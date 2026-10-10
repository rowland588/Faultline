/* WHERE EACH MACHINE IS — the four gates of a stage-gate job, one row per
 * machine. Rowland: "install, set up, commissioning, handover — these are the
 * gates." Read off lib/install's journeyOf, the same reading the client
 * report prints beside each machine. Tap a gate to go to it. */
import { nav } from '../state/useRoute';
import { openRecord } from './RecordDrawer';
import { GATE_TONE_WORD, JOURNEY, handedOverWith, isWrongGate, machineAt, journeyOf, reasonsOf } from '../lib/install';
import { live, type Asset, type Test, type TestItem } from '../lib/testing';
import { todayISO } from '../lib/weeks';
import { usePrograms } from '../lib/usePrograms';

/* Grey is "not started" (the colour rules); indigo alone says still ahead.
   Late and a problem are said apart — Rowland, 6 October: never "late or a
   problem", the app knows which (lib/install lateOrProblem). */
const TONE_WORD = GATE_TONE_WORD;

export function Journey({ projectId, assets, tests, items, bare }: {
  projectId: string; assets: Asset[]; tests: Test[]; items: TestItem[];
  /** Inside a panel that already says "Where each machine is", beside a
   *  "Needs you" that names every late and problem thing: no heading of its
   *  own and no reasons under each machine — the squares and "at Set up". */
  bare?: boolean;
}) {
  /* A machine's programs are its Set up as much as its set-up steps are. */
  const { programs } = usePrograms(projectId);
  const machines = live(assets).sort((a, b) => a.sort - b.sort);
  if (machines.length === 0) return null;
  const today = todayISO();
  return (
    <section className="jr">
      {!bare && (
        <div className="jr-head">
          <h3 className="jr-h">Where each machine is</h3>
          <span className="jr-gates" aria-hidden>{JOURNEY.map(g => <span key={g.gate}>{g.label}</span>)}</span>
        </div>
      )}
      {machines.map(a => {
        const j = journeyOf(a, tests, items, today, programs);
        /* HANDED OVER WITH — what was still open when its list was done
           (lib/install handedOverWith): the status, never a block. */
        const open = handedOverWith(a, tests, items, today, programs);
        return (
          <div key={a.id} className="jr-row">
            {/* The name opens the machine — everything on it (docs/FLOW.md item 2). */}
            <span className="jr-m"><button type="button" className="mp-name" onClick={() => openRecord(projectId, a.id)}>{a.name}</button><span className="sub">{machineAt(a, j).says}{open.length > 0 && <span className="jr-with"> · {open.join(' · ')}</span>}</span>
              {/* WHY IT IS RED OR AMBER, where the colour is — each reason in
                  its own: "Sensors checked — late, 2 h lost" red, "Dry run — a
                  problem, no time lost" amber. Tapping the tile goes to where
                  it is changed or put back. */}
              {!bare && j.some(g => isWrongGate(g.tone)) && (() => {
                const why = reasonsOf(a, tests, items, today);
                return why.length > 0 && (
                  <span className="jr-why">
                    {why.slice(0, 2).map((r, k) => <span key={k} className={'jr-why-r is-' + r.tone}>{k > 0 && ' · '}{r.text}</span>)}
                    {why.length > 2 ? ` · and ${why.length - 2} more` : ''}
                  </span>
                );
              })()}
            </span>
            <span className="jr-strip">
              {j.map((g, i) => (
                <button key={g.gate} className={'jr-seg is-' + g.tone} title={`${g.label}: ${TONE_WORD[g.tone]}`}
                  aria-label={`${a.name} — ${g.label}: ${TONE_WORD[g.tone]}`}
                  onClick={() => nav(`/project/${projectId}/${JOURNEY[i].path}`)}>
                  <span className="jr-seg-t">{g.label}</span>
                </button>
              ))}
            </span>
          </div>
        );
      })}
      <p className="jr-key">
        <span className="is-done">done</span><span className="is-going">under way</span>
        <span className="is-late">late</span><span className="is-failed">didn’t pass</span><span className="is-problem">a problem — no time lost</span><span className="is-ahead">not started</span>
      </p>
    </section>
  );
}
