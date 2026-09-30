/* INSTALL — the weeks between a machine landing and it running.
 *
 * Rowland: "an installing section — the ability to understand the issues and
 * stages that are taking place on a day to day basis, telling a story."
 *
 * A machine already went Not here yet → On site → Installed → Running, and the
 * installation was one date. This is that gap, drawn: each machine, its steps
 * in the order they happen, which are done, which one it is waiting on and
 * whose it is, and what stopped it.
 *
 * SAME RECORD, THIRD DOOR. An install step is a Test wearing `kind: 'install'`
 * — see lib/testing — so it already had a page, a card, a verdict, pictures,
 * "what we found" and fixes that can be for it. What the machine reads as is
 * lib/install's, one call, so the sentence here is the sentence on paper.
 */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { Verdicts } from '../ui/Verdicts';
import { niceDay, todayISO } from '../lib/weeks';
import { useStanding } from '../lib/useStanding';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { ASSET_STATE_WORD, INSTALL_STAGES, assetStateOf, assetStateOn, outcomeWord, plannedEnd, type Asset } from '../lib/testing';
import { installOf, type MachineInstall, type StepView } from '../lib/install';
import { AddAsset } from './TestsScreen';

type TT = ReturnType<typeof useTesting>;

const TONE_WORD: Record<StepView['tone'], string> = {
  done: 'Done', problem: 'Hit a problem', asking: 'Done? Say so', late: 'Late', ahead: '',
};

export function InstallScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  const stand = useStanding(projectId);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  const today = todayISO();
  const steps = tt.tests.filter(t => t.kind === 'install' && !t.deletedAt);
  const machines = tt.assets.filter(a => !a.deletedAt).map(a => installOf(a, tt.tests, tt.items, today));
  /* Steps on no machine — the line's own services, a mezzanine, a guard run. */
  const line = installOf(undefined, tt.tests, tt.items, today);
  const done = steps.filter(t => t.outcome === 'passed').length;
  const late = [...machines, line].reduce((n, m) => n + m.late, 0);
  const installing = machines.filter(m => m.total > 0 && m.done < m.total).length;

  return (
    <div className="wrap pace cm-screen">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Install' },
      ]} />
      <Peers peers={projectPeers(projectId, 'install', stand.counts)} />

      <header className="cm-head">
        <div>
          <p className="cm-eyebrow">{project.name}</p>
          <h1>Install</h1>
          <p className="cw-handover">
            {steps.length === 0
              ? <b>Nothing planned yet</b>
              : <>
                <b>{done} of {steps.length} steps done</b>
                {installing > 0 && <span className="sub">{installing} machine{installing === 1 ? '' : 's'} installing</span>}
                {late > 0 && <span className="sub in-late">{late} late</span>}
              </>}
            <button className="cw-link" onClick={() => nav(`/project/${projectId}/day`)}>Read the day</button>
          </p>
        </div>
      </header>

      {/* A step worked on and never signed off asks first, as a fix does. */}
      <Verdicts tests={steps} projectId={projectId}
        onAnswer={(t, outcome) => void tt.patchTest(t.id, cur => ({ outcome, ranOn: cur.ranOn ?? todayISO() }))}
        onUndo={before => void tt.patchTest(before.id, { outcome: 'planned', ranOn: before.ranOn })} />

      {machines.length === 0 && (
        <p className="sub tw-note">
          Name the machines first. Each gets its install steps — positioned, air and power, electrics,
          I/O, dry run — and what is found doing them becomes a fix with a name on it.
        </p>
      )}

      <div className="in-list">
        {machines.map(m => <MachineInstallCard key={m.asset?.id} m={m} tt={tt} projectId={projectId} />)}
        {(line.total > 0 || machines.length === 0) && <MachineInstallCard m={line} tt={tt} projectId={projectId} />}
      </div>

      <div className="cx-assets in-add-machine">
        <AddAsset add={tt.addAsset} />
      </div>

      <p className="sub tw-note">
        A step is planned for a day and done by somebody. Tap it to say what was done, add pictures,
        and write down what you found — anything that needs doing becomes a fix for that step.
      </p>
    </div>
  );
}

function MachineInstallCard({ m, tt, projectId }: { m: MachineInstall; tt: TT; projectId: string }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const a = m.asset;
  const open = (id: string) => nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);
  const add = () => {
    const clean = title.trim();
    if (!clean) return;
    void tt.planSteps([clean], a?.id);
    setTitle('');
    setAdding(false);
  };
  const state = a ? assetStateOf(a) : undefined;
  const on = a ? assetStateOn(a) : undefined;

  return (
    <section className={'in-card' + (m.late ? ' is-late' : '') + (m.total > 0 && m.done === m.total ? ' is-done' : '')}>
      <header className="in-card-h">
        <span className="in-name">
          <b>{a ? a.name : 'The line itself'}</b>
          {a?.oem && <span className="sub">{a.oem}</span>}
        </span>
        {a && state && (
          <span className={'in-state is-' + state}>
            {ASSET_STATE_WORD[state]}{on ? ` · ${niceDay(on)}` : ''}
          </span>
        )}
      </header>

      {m.total > 0 && (
        /* THE STAGES, left to right in the order they happen — the whole
           installation at a glance, each one tappable. */
        <ol className="in-strip" aria-label={`${m.done} of ${m.total} install steps done`}>
          {m.steps.map(s => (
            <li key={s.step.id} className={'in-seg is-' + s.tone + (s.next ? ' is-next' : '')}>
              <button onClick={() => open(s.step.id)} title={`${s.step.title} — ${outcomeWord(s.step)}`}>
                <span className="in-seg-bar" aria-hidden />
                <span className="in-seg-t">{s.step.title}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <p className="in-says">{m.says}</p>

      {m.ready && a && (
        <div className="in-ready">
          <span>All {m.total} steps are done. Mark {a.name} installed today?</span>
          <button className="btn" onClick={() => void tt.saveAsset({ ...a, installedOn: todayISO() } as Asset)}>Mark installed</button>
        </div>
      )}

      {m.total > 0 && (
        <ul className="in-steps">
          {m.steps.map(s => <StepRow key={s.step.id} s={s} onOpen={() => open(s.step.id)} />)}
        </ul>
      )}

      <div className="in-actions">
        {/* The usual stages are offered to a machine still to install. One
            already in and running has nothing to plan; a step can still be
            added to record what was done. */}
        {m.total === 0 && !(state === 'installed' || state === 'running') && (
          <button className="btn" onClick={() => void tt.planSteps(INSTALL_STAGES, a?.id)}>
            Add the usual {INSTALL_STAGES.length} stages
          </button>
        )}
        {adding ? (
          <form className="in-addf" onSubmit={e => { e.preventDefault(); add(); }}>
            <input autoFocus placeholder="What is the step? e.g. Guards fitted" value={title} onChange={e => setTitle(e.target.value)} />
            <button className="btn" type="submit" disabled={!title.trim()}>Add</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setAdding(false); setTitle(''); }}>Cancel</button>
          </form>
        ) : (
          <button className="cw-add" onClick={() => setAdding(true)}>
            <span className="cw-add-p" aria-hidden>+</span> Add a step
          </button>
        )}
      </div>
    </section>
  );
}

function StepRow({ s, onOpen }: { s: StepView; onOpen: () => void }) {
  const t = s.step;
  const when = t.ranOn ?? plannedEnd(t);
  const bits = [
    when ? (s.tone === 'late' ? `was ${niceDay(when, { weekday: 'short' })}` : niceDay(when, { weekday: 'short' })) : 'no day yet',
    t.withWhom?.trim() || 'nobody yet',
    s.found > 0 && `${s.found} found`,
    (t.media ?? []).length > 0 && `${t.media?.length} picture${t.media?.length === 1 ? '' : 's'}`,
  ].filter(Boolean);
  return (
    <li>
      <button className={'in-step is-' + s.tone + (s.next ? ' is-next' : '')} onClick={onOpen}>
        <span className="in-dot" aria-hidden />
        <span className="in-step-m">
          <b>{t.title}</b>
          <span className="sub">{bits.join(' · ')}</span>
          {t.result && <span className="in-step-r">{t.result}</span>}
        </span>
        <span className="in-step-w">{s.next && s.tone === 'ahead' ? 'Next' : TONE_WORD[s.tone]}</span>
      </button>
    </li>
  );
}
