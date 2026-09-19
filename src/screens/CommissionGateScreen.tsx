/* ONE STAGE OF THE COMMISSIONING, AND THE GATE AT THE END OF IT.
 *
 * A gate is not a date somebody moves. It is a set of things that have to be
 * TRUE, derived from the records — the rows put against this stage, plus the
 * rules the stage itself imposes whatever anybody remembered to type. No
 * product goes through a line that has not passed mechanical completion; rate
 * proving is not passed with a program short of its agreed rate; handover is
 * not passed with a grade-A defect open. Those are not preferences.
 *
 * So the button that passes the gate is dead until every one of them is met,
 * and passing is dated and named. A gate anybody can wave through is a gate
 * that gets waved through at five o'clock on a Friday, and the cost lands three
 * months later as a line that never quite makes its rate.
 */
import { useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { useProject } from '../lib/useProjects';
import { useCommission } from '../lib/useCommission';
import {
  PHASE_WHAT, phaseName, inOrder, phaseStates, gateCriteria, canPass, slipOf,
  type PhaseKey, type CommissionItem,
} from '../lib/commissioning';
import { Programs, Materials, Checks, PunchList, Tasks } from './commissioning/lists';

const nice = (iso?: string): string => {
  if (!iso) return '—';
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : iso;
};

export function CommissionGateScreen({ projectId, phaseKey }: { projectId: string; phaseKey: PhaseKey }) {
  const { project, loading } = useProject(projectId);
  const cm = useCommission(projectId);
  const [who, setWho] = useState('');

  const phases = useMemo(() => inOrder(cm.phases), [cm.phases]);
  const states = useMemo(() => phaseStates(phases), [phases]);
  const phase = phases.find(p => p.key === phaseKey);
  const criteria = useMemo(() => (phase ? gateCriteria(phase, cm.items) : []), [phase, cm.items]);

  const mine = useMemo(
    () => cm.items.filter(i => !i.deletedAt && phase && i.phaseId === phase.id),
    [cm.items, phase],
  );
  const of = <K extends CommissionItem['kind']>(k: K) =>
    mine.filter((i): i is Extract<CommissionItem, { kind: K }> => i.kind === k).sort((a, b) => a.sort - b.sort);

  if (loading || cm.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project || !phase) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That stage isn’t here.</p>
        <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/commissioning`)}>Back to the programme</button>
      </div>
    );
  }

  const state = states.get(phase.id) ?? 'upcoming';
  const done = criteria.filter(c => c.met).length;
  const owed = criteria.length - done;
  const ready = canPass(phase, cm.items);
  const slip = slipOf(phase);
  /* Position read from THIS PROJECT'S stages, not from the built-in list — a
     job that added a stage of its own would otherwise be told it is on "stage 3
     of 6" while looking at the seventh row. */
  const at = phases.findIndex(p => p.id === phase.id);
  const next = phases[at + 1];
  const n = at + 1;
  const what = PHASE_WHAT[phase.key as PhaseKey];

  const pass = () => {
    const by = who.trim();
    if (!by) return;
    void cm.savePhase({ ...phase, passedAt: new Date().toISOString().slice(0, 10), passedBy: by });
    setWho('');
  };

  return (
    <div className="wrap pace cm-screen">
      <AccountMenu />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Commissioning', to: `/project/${projectId}/commissioning` },
        { label: phaseName(phase) },
      ]} />

      <header className="cm-head">
        <div>
          <span className={'cmp-stage-n is-' + state}>
            STAGE {n} OF {phases.length}{state === 'current' ? ' · WE ARE HERE' : state === 'passed' ? ' · PASSED' : ''}
          </span>
          <h1>{phaseName(phase)}</h1>
          {what && <p className="sub">{what}</p>}
        </div>
        {/* THE STAGES ARE YOURS TO CHANGE. Six is how a packaging line is
            normally commissioned; it is a default, not a rule, and a system
            that insists on its own process gets abandoned for the spreadsheet
            it replaced. */}
        <div className="cmp-stage-edit">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const name = prompt('What should this stage be called?', phaseName(phase))?.trim();
            if (name && name !== phaseName(phase)) void cm.savePhase({ ...phase, name });
          }}>Rename</button>
          <button className="btn btn-ghost btn-sm cmp-stage-del" onClick={() => {
            if (!confirm(`Remove the “${phaseName(phase)}” stage?\n\n${mine.length
              ? `Its ${mine.length} row${mine.length === 1 ? '' : 's'} stay on the project but stop gating anything.`
              : 'Nothing is recorded against it.'}`)) return;
            void cm.removePhase(phase.id);
            nav(`/project/${projectId}/commissioning`);
          }}>Remove stage</button>
        </div>
      </header>

      {/* THE DATES. Planned is the baseline and is typed once; forecast is the
          one that moves. Showing them side by side is what makes a slip a
          number instead of a feeling. */}
      <section className="cmp-dates">
        <label className="cmp-date">
          <span>PLANNED</span>
          <input type="date" value={phase.plannedAt ?? ''}
            onChange={e => void cm.savePhase({ ...phase, plannedAt: e.target.value || undefined })} />
        </label>
        <label className="cmp-date">
          <span>FORECAST</span>
          <input type="date" value={phase.forecastAt ?? ''}
            onChange={e => void cm.savePhase({ ...phase, forecastAt: e.target.value || undefined })} />
        </label>
        <label className="cmp-date cmp-date-w">
          <span>OWNER</span>
          <input placeholder="who is driving this stage" value={phase.owner ?? ''}
            onChange={e => void cm.savePhase({ ...phase, owner: e.target.value || undefined })} />
        </label>
        {slip != null && slip !== 0 && (
          <div className={'cmp-slip-box is-' + (slip > 7 ? 'r' : slip > 0 ? 'a' : 'g')}>
            <span>SLIP</span>
            <b>{slip > 0 ? `+${slip}` : slip} days</b>
          </div>
        )}
      </section>

      {next && state !== 'passed' && (
        <p className="cmp-knock">
          <b>{phaseName(next)} cannot start until this passes.</b> Every date after it moves with this one.
        </p>
      )}

      <section className="cmp-sec">
        <h2 className="cmp-h">
          To pass this gate <span className="cmp-h-n">{done} of {criteria.length}</span>
        </h2>
        {criteria.length === 0 ? (
          <p className="sub">
            Nothing recorded against this stage yet. Add what has to be true below — a program to prove,
            material to land, a test to pass, or an obligation somebody owes.
          </p>
        ) : (
          <ul className="cmp-crit">
            {criteria.map((c, i) => (
              <li key={c.id ?? i} className={c.met ? 'is-met' : 'is-owed'}>
                <span className="cmp-crit-mark" aria-hidden>
                  {c.met
                    ? <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                    : <svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 3 L9 9 M9 3 L3 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>}
                </span>
                <span className="cmp-crit-main">
                  <span className="cmp-crit-t">{c.what}</span>
                  {c.why && <span className="cmp-crit-w">{c.why}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* PASSING IS DATED AND NAMED. A gate passed by nobody is not passed. */}
      <section className="cmp-pass">
        {phase.passedAt ? (
          <div className="cmp-passed">
            <b>Passed {nice(phase.passedAt)}{phase.passedBy ? ` by ${phase.passedBy}` : ''}</b>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { if (confirm('Reopen this gate? Anything that depended on it goes back to waiting.')) void cm.savePhase({ ...phase, passedAt: undefined, passedBy: undefined }); }}>
              Reopen
            </button>
          </div>
        ) : (
          <>
            <input className="cmp-pass-who" placeholder="Passed by — your name" value={who}
              onChange={e => setWho(e.target.value)} disabled={!ready} />
            <button className="btn btn-primary cmp-pass-go" onClick={pass} disabled={!ready || !who.trim()}>
              {ready ? 'Pass this gate' : `Pass this gate — ${owed} still open`}
            </button>
            <p className="sub">
              {ready
                ? 'Everything this stage needs is true. Put your name to it and it is recorded with today’s date.'
                : 'A gate cannot be passed with something still open. Close what is above and this comes alive.'}
            </p>
          </>
        )}
      </section>

      <h2 className="cmp-h cmp-h-wide">What this stage is made of</h2>
      <Programs rows={of('program')} cm={cm} phaseId={phase.id} />
      <Materials rows={of('material')} cm={cm} phaseId={phase.id} />
      <Checks rows={of('check')} cm={cm} phaseId={phase.id} />
      <PunchList rows={of('punch')} cm={cm} phaseId={phase.id} />
      <Tasks rows={of('task')} cm={cm} phaseId={phase.id} />

      <div className="cm-foot">
        <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}/commissioning`)}>← The programme</button>
      </div>
    </div>
  );
}
