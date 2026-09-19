/* A LINE BEING COMMISSIONED, AS A PROJECT.
 *
 * The first two cuts of this screen answered one question — can we sign off —
 * and that is the finish line, not the race. A commissioning job is a project:
 * it runs in stages, each needing the one before it to be true, and every
 * question anybody asks about it is about TIME. Is it going to be ready. What
 * has moved. What is holding it up. Who owes what this week.
 *
 * So the page leads with the date the line becomes ours and how far that has
 * drifted from the date it was promised for, then the stages, then what is in
 * the way of the one being worked on now, then the week. Handover readiness —
 * the whole of the previous screen — is the LAST GATE, reached by opening it.
 *
 * Everything on this page is derived. Nobody types a status, nobody ticks
 * "ready", and no date moves by itself: the baseline is what was agreed, the
 * forecast is what somebody has since said, and the difference is the number
 * the Monday call is actually about.
 */
import { useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { useProject } from '../lib/useProjects';
import { useCommission } from '../lib/useCommission';
import { useCommissionEvidence } from '../lib/useCommissionEvidence';
import { saveCommissionReport } from '../lib/buildCommissionReport';
import { isStaleBuildError, reloadOntoNewBuild } from '../lib/savePdf';
import {
  phaseName, programme, gateCriteria, comingUp, slipOf, readiness,
  type Phase, type PhaseState,
} from '../lib/commissioning';

/** A date as somebody says it out loud: "14 Nov". */
const nice = (iso?: string): string => {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const weekday = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }).toUpperCase() : iso;
};

/** How far off, in the words of the meeting. Undefined means there is no
 *  baseline to measure against, which is not the same as being on time. */
const slipWords = (days?: number): { text: string; state: 'g' | 'a' | 'r' } | undefined => {
  if (days == null) return undefined;
  if (days <= 0) return { text: days === 0 ? 'on the planned date' : `${-days} days earlier than planned`, state: 'g' };
  return { text: `${days} day${days === 1 ? '' : 's'} later than planned`, state: days > 7 ? 'r' : 'a' };
};

/* ------------------------------- the stages ------------------------------- */

function PhaseRow({ phase, state, open, criteria }: {
  phase: Phase; state: PhaseState; open: () => void;
  criteria: { met: boolean }[];
}) {
  const done = criteria.filter(c => c.met).length;
  const owed = criteria.length - done;
  const slip = slipOf(phase);
  const words = slipWords(slip);

  return (
    <button className={'cmp-phase is-' + state} onClick={open}>
      <span className="cmp-rail" aria-hidden>
        <span className={'cmp-bead is-' + state} />
        <span className="cmp-thread" />
      </span>
      <span className="cmp-phase-main">
        {state === 'current' && <span className="cmp-now">WE ARE HERE</span>}
        <span className="cmp-phase-n">{phaseName(phase)}</span>
        <span className="cmp-phase-d">
          {phase.passedAt
            ? `Passed ${nice(phase.passedAt)}${phase.passedBy ? ` · ${phase.passedBy}` : ''}`
            : phase.plannedAt || phase.forecastAt
              ? `Planned ${nice(phase.plannedAt)}${phase.forecastAt && phase.forecastAt !== phase.plannedAt ? ` · now ${nice(phase.forecastAt)}` : ''}`
              : 'No date set'}
        </span>
        {state !== 'passed' && criteria.length > 0 && (
          <span className={'cmp-phase-c' + (owed > 0 && state === 'current' ? ' is-owed' : '')}>
            {done} of {criteria.length} done{owed > 0 ? ` · ${owed} in the way` : ''}
          </span>
        )}
        {/* Only the stage being worked on gets a coloured slip. The four after
            it have moved BECAUSE of it — printing the same news in red four
            times over makes a page that is shouting, and a page that is always
            shouting stops being read. Downstream reads quietly, as a knock-on. */}
        {state === 'current' && words && words.state !== 'g' && (
          <span className={'cmp-slip is-' + words.state}>{words.text}</span>
        )}
        {state === 'upcoming' && words && words.state !== 'g' && (
          <span className="cmp-slip is-knock">moved {words.text.replace(' later than planned', ' by the stages before it')}</span>
        )}
      </span>
      <span className={'cmp-phase-tag is-' + state}>
        {state === 'passed' ? 'PASSED' : state === 'current' ? '›' : ''}
      </span>
    </button>
  );
}

/* ==================================== page =================================== */

export function CommissioningScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const cm = useCommission(projectId);
  const walk = useCommissionEvidence(projectId);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<{ stale: boolean; msg: string } | null>(null);

  const prog = useMemo(() => programme(cm.phases, cm.items), [cm.phases, cm.items]);
  const week = useMemo(() => comingUp(cm.phases, cm.items), [cm.phases, cm.items]);
  const ready = useMemo(() => readiness(cm.items), [cm.items]);
  const handoverWords = slipWords(prog.handoverSlip);

  const download = async () => {
    if (saving || cm.loading) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const how = await saveCommissionReport({
        title: project?.name ?? 'Commissioning',
        lead: project?.lead,
        items: cm.items,
        phases: cm.phases,
        walk: walk.byId,
      });
      if (how === 'opened') {
        setSaveErr({ stale: false, msg: 'Your browser would not save it, so it is open in a new tab — share or print it from there.' });
      }
    } catch (err) {
      console.error('Handover sheet failed', err);
      setSaveErr(isStaleBuildError(err)
        ? { stale: true, msg: 'This tab is still running an older version of the app, so the part that draws the PDF could not load.' }
        : { stale: false, msg: err instanceof Error ? err.message : 'The sheet could not be built.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || cm.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) {
    return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;
  }

  return (
    <div className="wrap pace cm-screen">
      <AccountMenu />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Commissioning' },
      ]} />

      <header className="cm-head">
        <div>
          <h1>{project.name}</h1>
          <p className="sub">
            Commissioning
            {prog.current ? ` · ${phaseName(prog.current)}` : prog.phases.length ? ' · handed over' : ''}
            {project.lead ? ` · ${project.lead} leading` : ''}
          </p>
        </div>
        {cm.items.length > 0 && (
          <button className="btn btn-primary" onClick={() => void download()} disabled={saving}>
            {saving ? 'Building the sheet…' : 'Status sheet (A3 PDF)'}
          </button>
        )}
      </header>

      {saveErr && (
        <div className={'exec-saveerr' + (saveErr.stale ? ' is-stale' : '')} role="alert">
          <span>{saveErr.msg}</span>
          {saveErr.stale && (
            <button className="btn btn-primary" onClick={() => void reloadOntoNewBuild()}>Reload the app</button>
          )}
          <button className="exec-saveerr-x" onClick={() => setSaveErr(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* NOTHING PLANNED YET. Deliberately not six rows of blank dates: that is
          clutter pretending to be a plan. One button, and one sentence saying
          what it will do. */}
      {prog.phases.length === 0 ? (
        <section className="cmp-empty">
          <h2>No programme yet</h2>
          <p>
            A line is commissioned in six stages — factory acceptance, install, mechanical completion,
            site acceptance, rate proving, handover. Lay them out and put dates against them, and this
            page will tell you what is late and what is holding it up.
          </p>
          <button className="btn btn-primary" onClick={() => void cm.startProgramme()}>Start the programme</button>
        </section>
      ) : (
        <>
          {/* THE ANSWER: when does this line become ours, and has that moved. */}
          <section className={'cmp-hero is-' + (handoverWords?.state ?? 'n')}>
            <span className="cmp-hero-l">HANDOVER</span>
            <div className="cmp-hero-row">
              <span className="cmp-hero-d">{nice(prog.handoverAt)}</span>
              {prog.handoverAt && <span className="cmp-hero-out">{untilWords(prog.handoverAt)}</span>}
            </div>
            {handoverWords
              ? <p className={'cmp-hero-slip is-' + handoverWords.state}>{handoverWords.text}</p>
              : <p className="cmp-hero-slip is-n">No planned date set, so nothing can be measured against it yet.</p>}
            {prog.blocking.length > 0 && prog.current && (
              <p className="cmp-hero-why">
                {phaseName(prog.current)} is waiting on {prog.blocking.length} thing{prog.blocking.length === 1 ? '' : 's'}, and everything after it moves with that.
              </p>
            )}
          </section>

          <section className="cmp-sec">
            <h2 className="cmp-h">Where we are</h2>
            <div className="cmp-phases">
              {prog.phases.map(p => (
                <PhaseRow
                  key={p.id}
                  phase={p}
                  state={prog.states.get(p.id) ?? 'upcoming'}
                  criteria={gateCriteria(p, cm.items)}
                  open={() => nav(`/project/${projectId}/commissioning/${p.key}`)}
                />
              ))}
            </div>
            {/* Six stages is the default, not the law. */}
            <button className="cmp-add-stage" onClick={() => {
              const name = prompt('What is the stage called?\n\ne.g. Trials, Vertical start-up, Dry goods trial')?.trim();
              if (name) void cm.addPhase(name);
            }}>+ Add a stage</button>
          </section>

          {prog.blocking.length > 0 && (
            <section className="cmp-sec">
              <h2 className="cmp-h">In the way — {prog.blocking.length}</h2>
              <div className="cmp-block-list">
                {prog.blocking.map((b, i) => (
                  <button key={b.id ?? i} className="cmp-block"
                    onClick={() => prog.current && nav(`/project/${projectId}/commissioning/${prog.current.key}`)}>
                    <span className="cmp-block-t">{b.what}</span>
                    {b.why && <span className="cmp-block-w">{b.why}</span>}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="cmp-sec">
            <h2 className="cmp-h">The next seven days</h2>
            {week.length === 0 ? (
              <p className="sub">Nothing dated in the next week. Put dates on the stages and the work, and they land here.</p>
            ) : (
              <div className="cmp-week">
                {week.map(d => (
                  <div key={d.id} className={'cmp-day' + (d.late ? ' is-late' : '')}>
                    <span className="cmp-day-d">{d.late ? 'LATE' : weekday(d.at)}</span>
                    <span className="cmp-day-w">{d.what}</span>
                    <span className="cmp-day-o">{d.who ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {cm.items.length > 0 && (
            <section className="cmp-sec">
              <h2 className="cmp-h">The numbers that decide it</h2>
              <div className="cmp-nums">
                <div className="cmp-num"><b>{ready.programs.proven}<i> of {ready.programs.total}</i></b><span>programs proven at rate</span></div>
                <div className="cmp-num"><b className={ready.punch.openA ? 'is-r' : ''}>{ready.punch.openA}A<i> {ready.punch.openB}B {ready.punch.openC}C</i></b><span>punch list open</span></div>
                <div className="cmp-num"><b>{ready.checks.pass}<i> of {ready.checks.total}</i></b><span>acceptance tests passed</span></div>
                <div className="cmp-num"><b className={ready.materials.short + ready.materials.late ? 'is-a' : ''}>{ready.materials.have}<i> of {ready.materials.total}</i></b><span>material lines on site</span></div>
              </div>
            </section>
          )}
        </>
      )}

      <div className="cm-foot">
        <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    </div>
  );
}

/** "6 weeks out", "next week", "3 days ago". The distance, not the date. */
function untilWords(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const days = Math.round((t - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} ago`;
  if (days === 0) return 'today';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} out`;
  return `${Math.round(days / 7)} weeks out`;
}
