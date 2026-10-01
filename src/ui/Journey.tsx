/* WHERE EACH MACHINE IS — the four gates of a stage-gate job, one row per
 * machine. Rowland: "install, set up, commissioning, handover — these are the
 * gates." Read off lib/install's journeyOf, the same reading the client
 * report prints beside each machine. Tap a gate to go to it. */
import { nav } from '../state/useRoute';
import { JOURNEY, journeyNow, journeyOf, type GateTone } from '../lib/install';
import { live, type Asset, type Test, type TestItem } from '../lib/testing';
import { todayISO } from '../lib/weeks';
import { usePrograms } from '../lib/usePrograms';

const TONE_WORD: Record<GateTone, string> = {
  done: 'done', going: 'under way', late: 'late or a problem', ahead: 'still ahead', none: 'nothing kept yet',
};

export function Journey({ projectId, assets, tests, items }: {
  projectId: string; assets: Asset[]; tests: Test[]; items: TestItem[];
}) {
  /* A machine's programs are its Set up as much as its set-up steps are. */
  const { programs } = usePrograms(projectId);
  const machines = live(assets).sort((a, b) => a.sort - b.sort);
  if (machines.length === 0) return null;
  const today = todayISO();
  return (
    <section className="jr">
      <div className="jr-head">
        <h3 className="jr-h">Where each machine is</h3>
        <span className="jr-gates" aria-hidden>{JOURNEY.map(g => <span key={g.gate}>{g.label}</span>)}</span>
      </div>
      {machines.map(a => {
        const j = journeyOf(a, tests, items, today, programs);
        return (
          <div key={a.id} className="jr-row">
            <span className="jr-m"><b>{a.name}</b><span className="sub">at {journeyNow(j)}</span></span>
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
        <span className="is-late">late or a problem</span><span className="is-ahead">still ahead</span>
        <span className="is-none">nothing kept yet</span>
      </p>
    </section>
  );
}
