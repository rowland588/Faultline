/* A LINE BEING COMMISSIONED — ALL OF IT, ON ONE SCREEN.
 *
 * Two things, and nothing else. THE PROGRAMME: the stages, their dates, and how
 * far each one has got. THE WORK: one list, grouped under those stages, one row
 * per thing.
 *
 * WHAT THIS REPLACED, AND WHY. Each stage used to be a gate with its own page —
 * derived pass criteria, rules the stage imposed, a dated sign-off with a name
 * box — and underneath that, five separate tables (programs, materials, checks,
 * punch list, everything else), every one of them shown whether or not it
 * applied. Open site acceptance and you got eight blocks of furniture for what
 * is really two tests. It was ceremony somebody had to feed.
 *
 * So: no gate, no pass button, no criteria. A stage is done when the work under
 * it is done. Every row still shows what its own kind needs — "51 ppm against
 * 60 agreed", "10 of 40 rolls", "grade A", "test failed" — but as ONE LINE in
 * ONE LIST. That is what stops everything piling into a stage.
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
  phaseName, programme, comingUp, slipOf, stageCount, workOf, standsAt, stateOf, isOpen,
  type Phase, type PhaseState, type CommissionItem, type Severity,
} from '../lib/commissioning';

const nice = (iso?: string): string => {
  if (!iso) return '—';
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : iso;
};
const weekday = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }).toUpperCase() : iso;
};
const slipWords = (days?: number): { text: string; state: 'g' | 'a' | 'r' } | undefined => {
  if (days == null || days === 0) return undefined;
  if (days < 0) return { text: `${-days} days earlier than planned`, state: 'g' };
  return { text: `${days} day${days === 1 ? '' : 's'} later than planned`, state: days > 7 ? 'r' : 'a' };
};

const num = (v: string): number => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

/* ------------------------------- one row ---------------------------------- */

/** The mark at the head of a row: a tick when it is done, the grade when it is
 *  a defect, an empty ring otherwise. One glance down the left edge says what
 *  is outstanding without reading a word. */
function Mark({ item }: { item: CommissionItem }) {
  const s = stateOf(item);
  if (s === 'g') {
    return (
      <span className="cw-mark is-g" aria-hidden>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    );
  }
  if (item.kind === 'punch') return <span className={'cw-mark is-sev is-' + s} aria-hidden>{item.severity}</span>;
  if (item.kind === 'check' && item.outcome === 'fail') {
    return (
      <span className="cw-mark is-r" aria-hidden>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3 3 L9 9 M9 3 L3 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
      </span>
    );
  }
  return <span className={'cw-mark is-ring is-' + s} aria-hidden />;
}

/** One piece of work. Whatever kind it is, it gets ONE line: what it is, where
 *  it stands in its own terms, who owes it and when. */
function Row({ item, cm }: { item: CommissionItem; cm: ReturnType<typeof useCommission> }) {
  const [open, setOpen] = useState(false);
  const s = stateOf(item);
  const who = item.kind === 'punch' ? (item.fixBy ?? item.owner)
    : item.kind === 'check' ? (item.witnessedBy ?? item.owner) : item.owner;

  return (
    <>
      <div className={'cw-row is-' + s}>
        <Mark item={item} />
        <button className="cw-open" onClick={() => setOpen(o => !o)}>
          <span className="cw-t">{item.title}</span>
          <span className="cw-s">{standsAt(item)}</span>
        </button>
        <span className="cw-who">{who ?? ''}</span>
        <span className="cw-when">{item.due ? nice(item.due) : ''}</span>
      </div>
      {open && <Edit item={item} cm={cm} close={() => setOpen(false)} />}
    </>
  );
}

/** Tap a row and the few fields that kind actually has open underneath it.
 *  Inline rather than a page of its own: a commissioning row is four or five
 *  values, and a screen to hold five values is a screen too many. */
function Edit({ item, cm, close }: { item: CommissionItem; cm: ReturnType<typeof useCommission>; close: () => void }) {
  const [achieved, setAchieved] = useState('');
  const [by, setBy] = useState('');

  return (
    <div className="cw-edit">
      <label className="cw-f cw-f-wide">
        <span>What</span>
        <input value={item.title} onChange={e => void cm.save({ ...item, title: e.target.value })} />
      </label>
      <label className="cw-f">
        <span>Wanted by</span>
        <input type="date" value={item.due ?? ''} onChange={e => void cm.save({ ...item, due: e.target.value || undefined })} />
      </label>

      {item.kind === 'program' && (
        <>
          <label className="cw-f cw-f-n">
            <span>Agreed</span>
            <input inputMode="decimal" value={String(item.agreedRate)}
              onChange={e => void cm.save({ ...item, agreedRate: num(e.target.value) })} />
          </label>
          <label className="cw-f cw-f-n">
            <span>Ran at</span>
            <input inputMode="decimal" placeholder="ppm" value={achieved} onChange={e => setAchieved(e.target.value)} />
          </label>
          <label className="cw-f">
            <span>Witnessed by</span>
            <input value={by} onChange={e => setBy(e.target.value)} placeholder="Dave + OEM" />
          </label>
          <button className="btn btn-sm" disabled={num(achieved) <= 0}
            onClick={() => { void cm.addRun(item.id, { at: Date.now(), achieved: num(achieved), by: by.trim() || undefined }); setAchieved(''); setBy(''); }}>
            Save the run
          </button>
        </>
      )}

      {item.kind === 'material' && (
        <>
          <label className="cw-f cw-f-n"><span>Need</span>
            <input inputMode="numeric" value={String(item.need)} onChange={e => void cm.save({ ...item, need: num(e.target.value) })} /></label>
          <label className="cw-f cw-f-n"><span>Have</span>
            <input inputMode="numeric" value={String(item.have)} onChange={e => void cm.save({ ...item, have: num(e.target.value) })} /></label>
          <label className="cw-f cw-f-n"><span>On order</span>
            <input inputMode="numeric" value={String(item.onOrder ?? 0)} onChange={e => void cm.save({ ...item, onOrder: num(e.target.value) })} /></label>
          <label className="cw-f cw-f-n"><span>Unit</span>
            <input value={item.unit ?? ''} placeholder="rolls" onChange={e => void cm.save({ ...item, unit: e.target.value || undefined })} /></label>
        </>
      )}

      {item.kind === 'check' && (
        <>
          <label className="cw-f cw-f-wide"><span>What good looks like</span>
            <input value={item.criterion} onChange={e => void cm.save({ ...item, criterion: e.target.value })} /></label>
          <label className="cw-f cw-f-wide"><span>What happened</span>
            <input value={item.result ?? ''} placeholder="the result" onChange={e => void cm.save({ ...item, result: e.target.value || undefined })} /></label>
          <label className="cw-f"><span>Witnessed by</span>
            <input value={item.witnessedBy ?? ''} onChange={e => void cm.save({ ...item, witnessedBy: e.target.value || undefined })} /></label>
          <span className="cw-seg">
            {(['pass', 'fail', 'notRun'] as const).map(o => (
              <button key={o} className={'btn btn-sm' + (item.outcome === o ? ' on' : ' btn-ghost')}
                onClick={() => void cm.save({ ...item, outcome: o, at: o === 'notRun' ? undefined : Date.now() })}>
                {o === 'pass' ? 'Passed' : o === 'fail' ? 'Failed' : 'Not run'}
              </button>
            ))}
          </span>
        </>
      )}

      {item.kind === 'punch' && (
        <>
          <label className="cw-f"><span>Grade</span>
            <select value={item.severity} onChange={e => void cm.save({ ...item, severity: e.target.value as Severity })}>
              <option value="A">A — stops acceptance</option>
              <option value="B">B — before production</option>
              <option value="C">C — can follow</option>
            </select></label>
          <label className="cw-f"><span>Fix by</span>
            <input value={item.fixBy ?? ''} placeholder="OEM / us" onChange={e => void cm.save({ ...item, fixBy: e.target.value || undefined })} /></label>
          <button className={'btn btn-sm' + (isOpen(item) ? '' : ' on')}
            onClick={() => void cm.save({ ...item, closedAt: isOpen(item) ? Date.now() : undefined })}>
            {isOpen(item) ? 'Close it' : 'Closed'}
          </button>
        </>
      )}

      {item.kind === 'task' && (
        <>
          <label className="cw-f"><span>Who</span>
            <input value={item.owner ?? ''} onChange={e => void cm.save({ ...item, owner: e.target.value || undefined })} /></label>
          <span className="cw-seg">
            {(['todo', 'doing', 'waiting', 'done'] as const).map(st => (
              <button key={st} className={'btn btn-sm' + (item.state === st ? ' on' : ' btn-ghost')}
                onClick={() => void cm.save({ ...item, state: st })}>
                {{ todo: 'To do', doing: 'Doing', waiting: 'Waiting', done: 'Done' }[st]}
              </button>
            ))}
          </span>
        </>
      )}

      <span className="cw-edit-end">
        <button className="btn btn-ghost btn-sm cw-del"
          onClick={() => { if (confirm(`Delete “${item.title}”?`)) void cm.remove(item.id); }}>Delete</button>
        <button className="btn btn-ghost btn-sm" onClick={close}>Close</button>
      </span>
    </div>
  );
}

/** One line to add anything. The KIND is picked here rather than by choosing
 *  which of five tables to type into — that choice was the whole reason every
 *  stage carried five tables in the first place. */
function Add({ cm, phaseId }: { cm: ReturnType<typeof useCommission>; phaseId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CommissionItem['kind']>('task');
  const [title, setTitle] = useState('');
  const [n, setN] = useState('');

  if (!open) {
    return (
      <button className="cw-add" onClick={() => setOpen(true)}>
        <span className="cw-add-p" aria-hidden>+</span> Add to this stage
      </button>
    );
  }

  const go = () => {
    const t = title.trim();
    if (!t) return;
    if (kind === 'program') void cm.addProgram(t, num(n), undefined, undefined, phaseId);
    else if (kind === 'material') void cm.addMaterial(t, num(n), undefined, undefined, phaseId);
    else if (kind === 'check') void cm.addCheck(t, '', undefined, phaseId);
    else if (kind === 'punch') void cm.addPunch(t, 'B', undefined, phaseId);
    else void cm.addTask(t, undefined, phaseId);
    setTitle(''); setN('');
  };

  const needsNumber = kind === 'program' || kind === 'material';
  return (
    <form className="cw-addf" onSubmit={e => { e.preventDefault(); go(); }}>
      <select value={kind} onChange={e => setKind(e.target.value as CommissionItem['kind'])} aria-label="What kind">
        <option value="task">Something to do</option>
        <option value="program">Product to prove at rate</option>
        <option value="material">Material we need</option>
        <option value="check">Test to pass</option>
        <option value="punch">Defect</option>
      </select>
      <input autoFocus placeholder={
        kind === 'program' ? 'Product or format — 250g tray'
          : kind === 'material' ? 'Item — 980mm film'
            : kind === 'check' ? 'Test — emergency stops'
              : kind === 'punch' ? 'Defect — former roller misaligned'
                : 'What needs doing'} value={title} onChange={e => setTitle(e.target.value)} />
      {needsNumber && (
        <input className="cw-num" inputMode="decimal" value={n} onChange={e => setN(e.target.value)}
          placeholder={kind === 'program' ? 'ppm' : 'need'} />
      )}
      <button className="btn" type="submit" disabled={!title.trim()}>Add</button>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Done</button>
    </form>
  );
}

/* ==================================== page =================================== */

export function CommissioningScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const cm = useCommission(projectId);
  const walk = useCommissionEvidence(projectId);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<{ stale: boolean; msg: string } | null>(null);
  const [dates, setDates] = useState(false);

  const prog = useMemo(() => programme(cm.phases, cm.items), [cm.phases, cm.items]);
  const week = useMemo(() => comingUp(cm.phases, cm.items), [cm.phases, cm.items]);
  const handover = slipWords(prog.handoverSlip);
  /* Work recorded before stages existed, or left behind when a stage was
     removed. It still belongs to the line, so it is shown rather than hidden —
     a row nobody can see is a row nobody does. */
  const loose = cm.items.filter(i => !i.deletedAt && !cm.phases.some(p => p.id === i.phaseId && !p.deletedAt));

  const download = async () => {
    if (saving || cm.loading) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const how = await saveCommissionReport({
        title: project?.name ?? 'Commissioning', lead: project?.lead,
        items: cm.items, phases: cm.phases, walk: walk.byId,
      });
      if (how === 'opened') setSaveErr({ stale: false, msg: 'Your browser would not save it, so it is open in a new tab — share or print it from there.' });
    } catch (err) {
      console.error('Status sheet failed', err);
      setSaveErr(isStaleBuildError(err)
        ? { stale: true, msg: 'This tab is still running an older version of the app, so the part that draws the PDF could not load.' }
        : { stale: false, msg: err instanceof Error ? err.message : 'The sheet could not be built.' });
    } finally { setSaving(false); }
  };

  if (loading || cm.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

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
          {prog.phases.length > 0 && (
            <p className="cw-handover">
              <b>Handover {nice(prog.handoverAt)}</b>
              {handover && <span className={'cw-slip is-' + handover.state}>{handover.text}</span>}
              {/* No leading "·": the row is a flex with a gap, and the dot
                  stranded itself at the start of a line whenever this wrapped. */}
              {project.lead && <span className="sub">{project.lead} leading</span>}
            </p>
          )}
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
          {saveErr.stale && <button className="btn btn-primary" onClick={() => void reloadOntoNewBuild()}>Reload the app</button>}
          <button className="exec-saveerr-x" onClick={() => setSaveErr(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {prog.phases.length === 0 ? (
        <section className="cmp-empty">
          <h2>No programme yet</h2>
          <p>
            A line is commissioned in stages — factory acceptance, install, mechanical completion,
            site acceptance, rate proving, handover. Lay them out, put dates against them, and list the
            work under each one.
          </p>
          <button className="btn btn-primary" onClick={() => void cm.startProgramme()}>Start the programme</button>
        </section>
      ) : (
        <>
          {/* THE PROGRAMME — stages, dates, how far each has got. Nothing to open. */}
          <section className="cmp-sec">
            <div className="cw-sec-h">
              <h2 className="cmp-h">The programme</h2>
              <button className="cw-link" onClick={() => setDates(d => !d)}>{dates ? 'Done' : 'Dates'}</button>
            </div>
            <div className="cw-stages">
              {prog.phases.map(p => (
                <StageLine key={p.id} phase={p} state={prog.states.get(p.id) ?? 'upcoming'}
                  count={stageCount(p, cm.items)} cm={cm} editing={dates} />
              ))}
            </div>
            {dates && (
              <button className="cw-add" onClick={() => {
                const name = prompt('What is the stage called?\n\ne.g. Trials, Vertical start-up')?.trim();
                if (name) void cm.addPhase(name);
              }}><span className="cw-add-p" aria-hidden>+</span> Add a stage</button>
            )}
          </section>

          {week.length > 0 && (
            <section className="cmp-sec">
              <h2 className="cmp-h">The next seven days</h2>
              <div className="cmp-week">
                {week.map(d => (
                  <div key={d.id} className={'cmp-day' + (d.late ? ' is-late' : '')}>
                    <span className="cmp-day-d">{d.late ? 'LATE' : weekday(d.at)}</span>
                    <span className="cmp-day-w">{d.what}</span>
                    <span className="cmp-day-o">{d.who ?? '—'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* THE WORK — one list, grouped by stage. */}
          <section className="cmp-sec">
            <h2 className="cmp-h">The work</h2>
            {prog.phases.map(p => {
              const rows = workOf(p, cm.items);
              const c = stageCount(p, cm.items);
              return (
                <div key={p.id} className="cw-group">
                  <div className="cw-group-h">
                    <span className="cw-group-n">{phaseName(p).toUpperCase()}</span>
                    <span className="cw-group-c">
                      {c.total > 0 ? `${c.done} of ${c.total}` : 'nothing yet'}
                      {p.forecastAt || p.plannedAt ? ` · ${nice(p.forecastAt ?? p.plannedAt)}` : ''}
                    </span>
                  </div>
                  <div className="cw-list">
                    {rows.map(i => <Row key={i.id} item={i} cm={cm} />)}
                    <Add cm={cm} phaseId={p.id} />
                  </div>
                </div>
              );
            })}

            {loose.length > 0 && (
              <div className="cw-group">
                <div className="cw-group-h">
                  <span className="cw-group-n">NOT ON A STAGE</span>
                  <span className="cw-group-c">{loose.length}</span>
                </div>
                <div className="cw-list">
                  {loose.map(i => <Row key={i.id} item={i} cm={cm} />)}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      <div className="cm-foot">
        <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    </div>
  );
}

/** One stage on the programme: a bead, its name, where it has got to, and its
 *  date. Dates open for editing all together rather than one page each. */
function StageLine({ phase, state, count, cm, editing }: {
  phase: Phase; state: PhaseState; count: { done: number; total: number };
  cm: ReturnType<typeof useCommission>; editing: boolean;
}) {
  const words = slipWords(slipOf(phase));
  return (
    <div className={'cw-stage is-' + state}>
      <span className={'cw-bead is-' + state} aria-hidden />
      <span className="cw-stage-n">{phaseName(phase)}</span>
      {!editing && (
        <span className="cw-stage-r">
          {state === 'passed'
            ? <span className="cw-done">done</span>
            : <>
                {count.total > 0 && <span className={state === 'current' ? 'cw-count is-now' : 'cw-count'}>{count.done} of {count.total}</span>}
                <span className="cw-stage-d">{nice(phase.forecastAt ?? phase.plannedAt)}</span>
                {state === 'current' && words && words.state !== 'g' && (
                  <span className={'cw-slip is-' + words.state}>{words.text}</span>
                )}
              </>}
        </span>
      )}
      {editing && (
        <span className="cw-stage-edit">
          <label><span>Planned</span>
            <input type="date" value={phase.plannedAt ?? ''}
              onChange={e => void cm.savePhase({ ...phase, plannedAt: e.target.value || undefined })} /></label>
          <label><span>Forecast</span>
            <input type="date" value={phase.forecastAt ?? ''}
              onChange={e => void cm.savePhase({ ...phase, forecastAt: e.target.value || undefined })} /></label>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const name = prompt('What should this stage be called?', phaseName(phase))?.trim();
            if (name) void cm.savePhase({ ...phase, name });
          }}>Rename</button>
          <button className="btn btn-ghost btn-sm cw-del" onClick={() => {
            if (confirm(`Remove the “${phaseName(phase)}” stage?\n\nAny work under it stays on the project.`)) void cm.removePhase(phase.id);
          }}>Remove</button>
        </span>
      )}
    </div>
  );
}
