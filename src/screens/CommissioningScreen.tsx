/* A LINE BEING COMMISSIONED — FOUR FACES OF ONE SUBJECT.
 *
 *   THE ANSWER     where are we now, in a sentence nobody typed
 *   A MACHINE      what it has to prove, what it was proved ON, and the OEM's
 *                  paperwork
 *   THE MATERIALS  what is here, and the transitions that stop results counting
 *   THE PROGRAMS   every asset against every pack, holes visible
 *
 * WHAT THIS REPLACED, AND WHY. Four earlier cuts each invented a process and
 * asked the job to fit it: a readiness checklist, then six gates with pass
 * criteria and sign-off ceremonies, then a programme of phases with per-stage
 * baselines, then one flat list grouped by stage. Every one of them was furniture
 * somebody had to feed, and none of them could answer the four things actually in
 * front of the person doing the job — machines being tested with the OEM, a film
 * transition, missing programs, and "where are we".
 *
 * So there are no stages. The grouping is the machine, because that is what an
 * acceptance is argued about, and the four faces are path segments rather than
 * tabs in component state so that the phone's back button walks back out of a
 * machine instead of leaving the app.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { useProject } from '../lib/useProjects';
import { useCommission } from '../lib/useCommission';
import { useCommissionEvidence } from '../lib/useCommissionEvidence';
import { saveCommissionReport } from '../lib/buildCommissionReport';
import { deliverBlob, isStaleBuildError, reloadOntoNewBuild } from '../lib/savePdf';
import { getBlob, putBlob, updateProject } from '../db';
import { uid } from '../lib/ids';
import {
  ASSET_STATE_ORDER, ASSET_STATE_WORD, CELL_WORD, LINE_ITSELF, SEVERITY_WHAT, SUGGESTED_CHECKS,
  byAsset, conditionOf, daysBetween, gradeOf, isOpen, isStale, materialsOf,
  provenOnOf, standsAt, stateOf, supersededIds, transitions, weeksTo,
  type Asset, type CommissionItem, type DocRef, type Material, type Severity, type Suggestion,
} from '../lib/commissioning';

type CM = ReturnType<typeof useCommission>;

const nice = (iso?: string): string => {
  if (!iso) return '—';
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : iso;
};
const num = (v: string): number => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

/** What a row calls itself. A material carries its spec, because the two rows a
 *  changeover is made of are both called "Film" and telling them apart is the
 *  entire point of the screen. */
const rowName = (i: CommissionItem): string =>
  i.kind === 'material' && i.spec ? `${i.title} — ${i.spec}` : i.title;
const kb = (bytes?: number): string =>
  bytes == null ? '' : bytes > 900_000 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** How far the job has moved from the date it was agreed for. Positive is late,
 *  and there is deliberately nothing to say when there is no baseline: a slip
 *  measured against a date nobody agreed is a number nobody can act on. */
const slipWords = (planned?: string, expected?: string): { text: string; state: 'g' | 'a' | 'r' } | undefined => {
  const days = daysBetween(planned, expected);
  if (days == null || days === 0) return undefined;
  if (days < 0) return { text: `${-days} days earlier than planned`, state: 'g' };
  return { text: `${days} day${days === 1 ? '' : 's'} later than planned`, state: days > 7 ? 'r' : 'a' };
};

/* ------------------------------ shared pieces ------------------------------ */

/** The mark at the head of a row: a tick when it is true, the grade when it is
 *  graded, an empty ring otherwise. One glance down the left edge says what is
 *  outstanding without reading a word. */
function Mark({ item, superseded }: { item: CommissionItem; superseded: Set<string> }) {
  const s = stateOf(item, superseded);
  if (s === 'g') {
    return (
      <span className="cw-mark is-g" aria-hidden>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    );
  }
  const grade = gradeOf(item);
  if (grade) return <span className={'cw-mark is-sev is-' + s} aria-hidden>{grade}</span>;
  if (item.kind === 'check' && item.outcome === 'fail') {
    return (
      <span className="cw-mark is-r" aria-hidden>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3 3 L9 9 M9 3 L3 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
      </span>
    );
  }
  return <span className={'cw-mark is-ring is-' + s} aria-hidden />;
}

/** One claim. Whatever kind it is, it gets ONE line: what it is, where it stands
 *  in its own terms, and — when the answer depends on a material — what it was
 *  got on. That last line is the whole film problem, said once per row. */
function Row({ item, cm }: { item: CommissionItem; cm: CM }) {
  const [open, setOpen] = useState(false);
  const superseded = useMemo(() => supersededIds(cm.items), [cm.items]);
  const materials = useMemo(() => materialsOf(cm.items), [cm.items]);
  const s = stateOf(item, superseded);
  const cond = conditionOf(item, materials, superseded);
  const stale = isStale(item, superseded);
  const who = item.kind === 'punch' ? (item.fixBy ?? item.owner)
    : item.kind === 'check' ? (item.witnessedBy ?? item.owner) : item.owner;

  return (
    <>
      <div className={'cw-row is-' + s}>
        <Mark item={item} superseded={superseded} />
        <button className="cw-open" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          <span className="cw-t">{rowName(item)}</span>
          <span className="cw-s">{standsAt(item)}</span>
          {cond && <span className={'cx-cond' + (stale ? ' is-stale' : '')}>{cond}</span>}
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
function Edit({ item, cm, close }: { item: CommissionItem; cm: CM; close: () => void }) {
  const [achieved, setAchieved] = useState('');
  const [by, setBy] = useState('');
  const [ran, setRan] = useState('');
  const materials = useMemo(() => materialsOf(cm.items), [cm.items]);

  /* Which material a result was got on. Empty is the honest default and means
     "this does not depend on a material" — an e-stop test is not film-sensitive,
     and forcing a spec onto it would make a film change invalidate the safety
     tests, which is nonsense somebody would have to un-tick every time. */
  const onWhat = (value: string | undefined, set: (v: string | undefined) => void) => (
    <label className="cw-f">
      <span>Run on</span>
      <select value={value ?? ''} onChange={e => set(e.target.value || undefined)}>
        <option value="">nothing — not material-dependent</option>
        {materials.map(m => (
          <option key={m.id} value={m.id}>{m.spec ? `${m.title} — ${m.spec}` : m.title}</option>
        ))}
      </select>
    </label>
  );

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
      {item.kind !== 'punch' && (
        <label className="cw-f">
          <span>How badly</span>
          <select value={item.grade ?? ''} onChange={e => void cm.save({ ...item, grade: (e.target.value || undefined) as Severity | undefined })}>
            <option value="">not graded</option>
            {(['A', 'B', 'C'] as const).map(g => <option key={g} value={g}>{g} — {SEVERITY_WHAT[g].toLowerCase()}</option>)}
          </select>
        </label>
      )}

      {item.kind === 'program' && (
        <>
          <label className="cw-f cw-f-n">
            <span>Agreed</span>
            <input inputMode="decimal" value={String(item.agreedRate)}
              onChange={e => void cm.save({ ...item, agreedRate: num(e.target.value) })} />
          </label>
          <label className="cw-f cw-f-n">
            <span>Ran at</span>
            <input inputMode="decimal" placeholder={item.rateUnit ?? 'ppm'} value={achieved} onChange={e => setAchieved(e.target.value)} />
          </label>
          <label className="cw-f">
            <span>Witnessed by</span>
            <input value={by} onChange={e => setBy(e.target.value)} placeholder="Dave + OEM" />
          </label>
          {onWhat(ran, v => setRan(v ?? ''))}
          <button className="btn btn-sm" disabled={num(achieved) <= 0}
            onClick={() => {
              void cm.addRun(item.id, { at: Date.now(), achieved: num(achieved), by: by.trim() || undefined, provenOn: ran || undefined });
              setAchieved(''); setBy('');
            }}>
            Save the run
          </button>
          {!item.written && (
            <button className="btn btn-sm btn-ghost" onClick={() => void cm.save({ ...item, written: true })}>
              Program written
            </button>
          )}
          {(item.runs ?? []).length > 0 && (
            <div className="cx-runs">
              {(item.runs ?? []).slice().reverse().map(r => (
                <span key={r.id} className="cx-run">
                  <b>{r.achieved} {item.rateUnit ?? 'ppm'}</b>
                  {r.by ? ` · ${r.by}` : ''}
                  {r.provenOn ? ` · on ${materials.find(m => m.id === r.provenOn)?.spec ?? materials.find(m => m.id === r.provenOn)?.title ?? 'a spec since removed'}` : ''}
                  {` · ${new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </span>
              ))}
            </div>
          )}
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
          <label className="cw-f"><span>Spec</span>
            <input value={item.spec ?? ''} placeholder="35µ modified" onChange={e => void cm.save({ ...item, spec: e.target.value || undefined })} /></label>
          <label className="cw-f cw-f-wide">
            <span>Replaces</span>
            <select value={item.supersedes ?? ''} onChange={e => void cm.save({ ...item, supersedes: e.target.value || undefined })}>
              <option value="">nothing — this is not a changeover</option>
              {materials.filter(m => m.id !== item.id).map(m => (
                <option key={m.id} value={m.id}>{m.spec ? `${m.title} — ${m.spec}` : m.title}</option>
              ))}
            </select>
          </label>
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
          {onWhat(item.provenOn, v => void cm.save({ ...item, provenOn: v }))}
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
              {(['A', 'B', 'C'] as const).map(g => <option key={g} value={g}>{g} — {SEVERITY_WHAT[g].toLowerCase()}</option>)}
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

/** One line to add anything, anywhere. The kind is picked here rather than by
 *  choosing which of five tables to type into — that choice is what put five
 *  tables under every stage in the cut before this one. */
function Add({ cm, assetId, label = 'Add something' }: { cm: CM; assetId?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CommissionItem['kind']>('check');
  const [title, setTitle] = useState('');
  const [n, setN] = useState('');
  const [packId, setPackId] = useState('');

  if (!open) {
    return (
      <button className="cw-add" onClick={() => setOpen(true)}>
        <span className="cw-add-p" aria-hidden>+</span> {label}
      </button>
    );
  }

  const where = { assetId, packId: packId || undefined };
  const go = () => {
    const t = title.trim();
    if (!t) return;
    if (kind === 'program') void cm.addProgram(t, num(n), where);
    else if (kind === 'material') void cm.addMaterial(t, num(n), where);
    else if (kind === 'check') void cm.addCheck(t, '', where);
    else if (kind === 'punch') void cm.addPunch(t, 'B', where);
    else void cm.addTask(t, where);
    setTitle(''); setN('');
  };

  const needsNumber = kind === 'program' || kind === 'material';
  return (
    <form className="cw-addf" onSubmit={e => { e.preventDefault(); go(); }}>
      <select value={kind} onChange={e => setKind(e.target.value as CommissionItem['kind'])} aria-label="What kind">
        <option value="check">Test to pass</option>
        <option value="program">Pack to prove at rate</option>
        <option value="material">Material we need</option>
        <option value="punch">Defect</option>
        <option value="task">Something to do</option>
      </select>
      <input autoFocus placeholder={
        kind === 'program' ? 'Pack — 400g'
          : kind === 'material' ? 'Item — 980mm film'
            : kind === 'check' ? 'Test — emergency stops'
              : kind === 'punch' ? 'Defect — former roller misaligned'
                : 'What needs doing'} value={title} onChange={e => setTitle(e.target.value)} />
      {needsNumber && (
        <input className="cw-num" inputMode="decimal" value={n} onChange={e => setN(e.target.value)}
          placeholder={kind === 'program' ? 'ppm' : 'need'} />
      )}
      {kind === 'program' && cm.packs.length > 0 && (
        <select value={packId} onChange={e => setPackId(e.target.value)} aria-label="Which pack">
          <option value="">no pack</option>
          {cm.packs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <button className="btn" type="submit" disabled={!title.trim()}>Add</button>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Done</button>
    </form>
  );
}

/** The frame every face shares: the account menu, the trail back out, and the
 *  same heading. One component so the four faces cannot drift apart. */
function Shell({ projectId, projectName, where, children }: {
  projectId: string; projectName: string; where?: string; children: React.ReactNode;
}) {
  return (
    <div className="wrap pace cm-screen">
      <AccountMenu />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: projectName, to: `/project/${projectId}` },
        where
          ? { label: 'Commissioning', to: `/project/${projectId}/commissioning` }
          : { label: 'Commissioning' },
        ...(where ? [{ label: where }] : []),
      ]} />
      {children}
      <div className="cm-foot">
        <button className="btn btn-ghost" onClick={() => nav(where ? `/project/${projectId}/commissioning` : `/project/${projectId}`)}>
          {where ? 'Back to commissioning' : 'Back to the project'}
        </button>
      </div>
    </div>
  );
}

/* ============================ FACE 1 — THE ANSWER ===========================
 *
 * Where are we now, and nothing else on the page that does not serve it. Every
 * word of it is read off the records: the sentence, the counts, the bar, the
 * order the blockers come in. There is no status field in this app to disagree
 * with them, which is the point.
 */
function NowFace({ projectId, cm }: { projectId: string; cm: CM }) {
  const { project } = useProject(projectId);
  const walk = useCommissionEvidence(projectId);
  const [dates, setDates] = useState(false);
  const [all, setAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<{ stale: boolean; msg: string } | null>(null);

  /* Fetch jsPDF when the screen opens rather than when the button is pressed —
     an installed PWA serving yesterday's JavaScript asks for a chunk that is no
     longer there, and a button that silently does nothing is the worst possible
     way to find that out. */
  useEffect(() => { void loadPdfLibQuietly(); }, []);

  const st = cm.standing;
  const groups = useMemo(() => byAsset(cm.assets, cm.items), [cm.assets, cm.items]);
  /* Paired up rather than filtered, so the machine is narrowed once here instead
     of asserted at every use below. */
  const machines = useMemo(
    () => groups.flatMap(g => (g.asset ? [{ g, asset: g.asset }] : [])),
    [groups],
  );
  const trans = useMemo(() => transitions(cm.items), [cm.items]);
  const slip = slipWords(project?.plannedAt, project?.expectedAt);
  const weeks = weeksTo(project?.expectedAt);
  const docs = cm.assets.reduce((n, a) => n + (a.docs?.length ?? 0), 0);
  const unread = cm.assets.reduce((n, a) => n + (a.docs ?? []).filter(d => !d.readAt).length, 0);
  const shortMaterials = materialsOf(cm.items).filter(m => m.have < m.need).length;
  const shown = all ? st.blockers : st.blockers.slice(0, 5);

  const download = async () => {
    if (saving || cm.loading) return;
    setSaving(true); setSaveErr(null);
    try {
      const how = await saveCommissionReport({
        title: project?.name ?? 'Commissioning', lead: project?.lead,
        items: cm.items, assets: cm.assets, packs: cm.packs, walk: walk.byId,
        plannedAt: project?.plannedAt, expectedAt: project?.expectedAt,
      });
      if (how === 'opened') setSaveErr({ stale: false, msg: 'Your browser would not save it, so it is open in a new tab — share or print it from there.' });
    } catch (err) {
      console.error('Status sheet failed', err);
      setSaveErr(isStaleBuildError(err)
        ? { stale: true, msg: 'This tab is still running an older version of the app, so the part that draws the PDF could not load.' }
        : { stale: false, msg: err instanceof Error ? err.message : 'The sheet could not be built.' });
    } finally { setSaving(false); }
  };

  const setDate = (field: 'plannedAt' | 'expectedAt') => (v: string) => {
    if (!project) return;
    void updateProject({ ...project, [field]: v || undefined, updatedAt: Date.now() });
  };

  return (
    <>
      <header className="cm-head">
        <div>
          <h1>{project?.name ?? 'Commissioning'}</h1>
          <p className="cw-handover">
            {project?.expectedAt
              ? <><b>Ours by {nice(project.expectedAt)}</b>{weeks != null && <span className="sub">{weeks >= 0 ? `${weeks} week${weeks === 1 ? '' : 's'}` : `${-weeks} week${weeks === -1 ? '' : 's'} ago`}</span>}</>
              : <b>No date set yet</b>}
            {slip && <span className={'cw-slip is-' + slip.state}>{slip.text}</span>}
            {project?.lead && <span className="sub">{project.lead} leading</span>}
            <button className="cw-link" onClick={() => setDates(d => !d)}>{dates ? 'Done' : 'Dates'}</button>
          </p>
        </div>
        {cm.items.length > 0 && (
          <button className="btn btn-primary" onClick={() => void download()} disabled={saving}>
            {saving ? 'Building the sheet…' : 'A3 status sheet'}
          </button>
        )}
      </header>

      {dates && (
        <div className="cx-dates">
          <label className="cw-f"><span>Planned — never moves</span>
            <input type="date" value={project?.plannedAt ?? ''} onChange={e => setDate('plannedAt')(e.target.value)} /></label>
          <label className="cw-f"><span>Now expecting</span>
            <input type="date" value={project?.expectedAt ?? ''} onChange={e => setDate('expectedAt')(e.target.value)} /></label>
          <p className="sub">
            The planned date is the baseline every slip is measured from, so it is written once and left
            alone. A system that lets it follow the forecast around always reports that everything is on time.
          </p>
        </div>
      )}

      {saveErr && (
        <div className={'exec-saveerr' + (saveErr.stale ? ' is-stale' : '')} role="alert">
          <span>{saveErr.msg}</span>
          {saveErr.stale && <button className="btn btn-primary" onClick={() => void reloadOntoNewBuild()}>Reload the app</button>}
          <button className="exec-saveerr-x" onClick={() => setSaveErr(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* THE ANSWER. One sentence, composed in lib/commissioning so the phone,
          the desktop and the A3 cannot each say something different. */}
      <section className="cx-answer">
        <span className="cmp-h-n">WHERE WE ARE</span>
        <p className="cx-said">{st.sentence}</p>
        {st.total > 0 && (
          <>
            <span className="cx-bar"><span className="cx-bar-in" style={{ width: `${Math.round(st.pct * 100)}%` }} /></span>
            <span className="cx-tally">
              {st.done} of {st.total} done
              {st.counts.punch.openA > 0 && <> · <b className="is-r">{st.counts.punch.openA} grade A</b></>}
              {st.stale > 0 && <> · <b className="is-a">{st.stale} need{st.stale === 1 ? 's' : ''} re-proving</b></>}
            </span>
          </>
        )}
      </section>

      {st.blockers.length > 0 && (
        <section className="cmp-sec">
          <div className="cw-sec-h">
            <h2 className="cmp-h">What’s stopping it</h2>
            {st.blockers.length > 5 && (
              <button className="cw-link" onClick={() => setAll(a => !a)}>
                {all ? 'Top five' : `All ${st.blockers.length}`}
              </button>
            )}
          </div>
          <div className="cx-blocks">
            {shown.map(b => (
              <button key={b.id} className={'cx-block' + (b.grade ? ' is-' + b.grade : '')}
                onClick={() => {
                  if (b.kind === 'material') nav(`/project/${projectId}/commissioning/materials`);
                  else if (b.assetId) nav(`/project/${projectId}/commissioning/asset/${encodeURIComponent(b.assetId)}`);
                  else if (b.kind === 'program') nav(`/project/${projectId}/commissioning/programs`);
                }}>
                <span className={'cx-grade' + (b.grade ? ' is-' + b.grade : '')}>{b.grade ?? '·'}</span>
                <span className="cx-block-w">{b.what}</span>
                <span className="cx-block-a">{cm.assets.find(a => a.id === b.assetId)?.name ?? ''}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* THE MACHINES. Two today; the + is the whole answer to "I need to be
          able to add more", and it is a button rather than a deploy because an
          asset is a record now. */}
      <section className="cmp-sec">
        <div className="cw-sec-h">
          <h2 className="cmp-h">The machines</h2>
          <span className="cmp-h-n">{cm.assets.length ? `${cm.assets.length} on this line` : ''}</span>
        </div>
        <div className="cx-assets">
          {/* Machines only. The line's own work has its own section further down,
              and listing it here as a machine you cannot open put a dead button
              in the list saying "not a machine". */}
          {machines.map(({ g, asset }) => (
            <button key={asset.id} className="cx-asset"
              onClick={() => nav(`/project/${projectId}/commissioning/asset/${encodeURIComponent(asset.id)}`)}>
              <span className="cx-asset-n">{g.name}</span>
              <span className="cx-asset-s">
                {ASSET_STATE_WORD[asset.state]}
                {g.items.length > 0 && ` · ${g.done} of ${g.items.length} proved`}
                {g.stale > 0 && <b className="is-a"> · {g.stale} on a withdrawn spec</b>}
              </span>
              {asset.docs?.length ? <span className="cx-asset-d">{asset.docs.length} PDF{asset.docs.length === 1 ? '' : 's'}</span> : null}
            </button>
          ))}
          <AddAsset cm={cm} projectId={projectId} />
        </div>
      </section>

      {trans.length > 0 && (
        <section className="cmp-sec">
          <h2 className="cmp-h">Changing over</h2>
          {trans.map(t => (
            <button key={t.to.id} className="cx-warn" onClick={() => nav(`/project/${projectId}/commissioning/materials`)}>
              <span className="cx-warn-h">{t.from ? `${t.from.spec ?? t.from.title} → ` : ''}{t.to.spec ?? t.to.title}</span>
              <span className="cx-warn-b">
                {t.to.have} of {t.to.need} {t.to.unit ?? ''} here
                {t.invalidated.length > 0 && ` · ${t.invalidated.length} result${t.invalidated.length === 1 ? '' : 's'} stop counting`}
              </span>
            </button>
          ))}
        </section>
      )}

      <section className="cx-doors">
        <button className="cx-door" onClick={() => nav(`/project/${projectId}/commissioning/programs`)}>
          <b>Programs</b>
          <span>{cm.grid.holes > 0 ? `${cm.grid.holes} missing` : cm.packs.length ? 'all written' : 'no packs yet'}</span>
        </button>
        <button className="cx-door" onClick={() => nav(`/project/${projectId}/commissioning/materials`)}>
          <b>Materials</b>
          <span>{shortMaterials > 0 ? `${shortMaterials} not here` : 'all here'}</span>
        </button>
        <button className="cx-door" onClick={() => {
          const first = cm.assets.find(a => (a.docs?.length ?? 0) > 0) ?? cm.assets[0];
          if (first) nav(`/project/${projectId}/commissioning/asset/${encodeURIComponent(first.id)}`);
        }} disabled={!cm.assets.length}>
          <b>OEM documents</b>
          <span>{docs ? `${docs} saved${unread ? ` · ${unread} unread` : ''}` : 'none yet'}</span>
        </button>
      </section>

      {/* Anything on the line itself rather than on a machine: hygiene clearance,
          training, the papers. It holds up a handover exactly as hard. */}
      {(() => {
        const line = groups.find(g => !g.asset);
        return (
          <section className="cmp-sec">
            <div className="cw-sec-h">
              <h2 className="cmp-h">{LINE_ITSELF}</h2>
              <span className="cmp-h-n">{line ? `${line.done} of ${line.items.length}` : ''}</span>
            </div>
            <div className="cw-list">
              {(line?.items ?? []).map(i => <Row key={i.id} item={i} cm={cm} />)}
              <Add cm={cm} label="Add something for the line" />
            </div>
          </section>
        );
      })()}
    </>
  );
}

/** Fetch jsPDF in the background, swallowing the failure: the button that needs
 *  it reports the problem properly, and a console error on screen entry would be
 *  noise nobody can act on. */
async function loadPdfLibQuietly(): Promise<void> {
  try { const { loadPdfLib } = await import('../lib/savePdf'); await loadPdfLib(); } catch { /* the button says so */ }
}

function AddAsset({ cm, projectId }: { cm: CM; projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [oem, setOem] = useState('');

  if (!open) {
    return (
      <button className="cw-add" onClick={() => setOpen(true)}>
        <span className="cw-add-p" aria-hidden>+</span> Add a machine
      </button>
    );
  }
  return (
    <form className="cw-addf" onSubmit={e => {
      e.preventDefault();
      const n = name.trim();
      if (!n) return;
      void (async () => {
        const id = await cm.addAsset(n, oem);
        /* Nothing is put on it. The machine opens with the picker up, so the
           first thing somebody does is CHOOSE what this machine has to prove —
           a wrapper and a checkweigher do not prove the same things, and the
           version that guessed four for you was just a shorter list to delete. */
        nav(`/project/${projectId}/commissioning/asset/${encodeURIComponent(id)}?pick=1`);
      })();
      setName(''); setOem(''); setOpen(false);
    }}>
      <input autoFocus placeholder="Machine — Ilapak flow wrapper" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Who supplied it" value={oem} onChange={e => setOem(e.target.value)} />
      <button className="btn" type="submit" disabled={!name.trim()}>Add</button>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}

/* =========================== FACE 2 — ONE MACHINE ===========================
 *
 * What it has to prove, what each result was got ON, and the paperwork the OEM
 * sent. The condition banner is the film problem said once, at the top, instead
 * of six times down the list.
 */
function AssetFace({ projectId, cm, assetId }: { projectId: string; cm: CM; assetId: string }) {
  const { project } = useProject(projectId);
  const [details, setDetails] = useState(false);
  /* Opened by ?pick=1 straight after the machine is made, so the first screen is
     the choosing rather than an empty list with a + on it. */
  const [picking, setPicking] = useState(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('pick') === '1');
  const asset = cm.assets.find(a => a.id === assetId);
  const superseded = useMemo(() => supersededIds(cm.items), [cm.items]);
  const materials = useMemo(() => materialsOf(cm.items), [cm.items]);
  const mine = useMemo(
    () => cm.items.filter(i => i.assetId === assetId).sort((a, b) => a.sort - b.sort),
    [cm.items, assetId],
  );
  const stale = mine.filter(i => isStale(i, superseded));

  if (!asset) {
    return (
      <Shell projectId={projectId} projectName={project?.name ?? 'Project'} where="Machine">
        <p className="sub" style={{ marginTop: 24 }}>That machine isn’t here any more.</p>
      </Shell>
    );
  }

  /* The specs these results were got on, named. "6 proofs are on old film" is a
     number; "6 proofs are on 40µ, which is being withdrawn" is a sentence
     somebody can act on. */
  const withdrawn = [...new Set(stale.map(i => provenOnOf(i)))]
    .map(id => materials.find(m => m.id === id))
    .filter((m): m is Material => !!m);
  const replacing = withdrawn.map(w => materials.find(m => m.supersedes === w.id)).filter((m): m is Material => !!m);

  return (
    <Shell projectId={projectId} projectName={project?.name ?? 'Project'} where={asset.name}>
      <header className="cm-head">
        <div>
          <h1>{asset.name}</h1>
          <p className="cw-handover">
            <b>{ASSET_STATE_WORD[asset.state]}</b>
            {asset.oem && <span className="sub">{asset.oem}</span>}
            {asset.installedAt && <span className="sub">installed {nice(asset.installedAt)}</span>}
            <button className="cw-link" onClick={() => setDetails(d => !d)}>{details ? 'Done' : 'Details'}</button>
          </p>
        </div>
      </header>

      {/* FOLDED AWAY BY DEFAULT. Five edit fields above the work is the same
          mistake the last four cuts made: furniture in front of the thing you
          opened the screen for. They are two taps away and never in the way. */}
      {details && (
      <div className="cx-asset-edit">
        <label className="cw-f"><span>Name</span>
          <input value={asset.name} onChange={e => void cm.saveAsset({ ...asset, name: e.target.value })} /></label>
        <label className="cw-f"><span>Where it’s got to</span>
          <select value={asset.state} onChange={e => void cm.saveAsset({ ...asset, state: e.target.value as Asset['state'] })}>
            {ASSET_STATE_ORDER.map(s => <option key={s} value={s}>{ASSET_STATE_WORD[s]}</option>)}
          </select></label>
        <label className="cw-f"><span>Supplied by</span>
          <input value={asset.oem ?? ''} placeholder="OEM" onChange={e => void cm.saveAsset({ ...asset, oem: e.target.value || undefined })} /></label>
        <label className="cw-f"><span>Arrived</span>
          <input type="date" value={asset.arrivedAt ?? ''} onChange={e => void cm.saveAsset({ ...asset, arrivedAt: e.target.value || undefined })} /></label>
        <label className="cw-f"><span>Installed</span>
          <input type="date" value={asset.installedAt ?? ''} onChange={e => void cm.saveAsset({ ...asset, installedAt: e.target.value || undefined })} /></label>
      </div>
      )}

      {stale.length > 0 && (
        <section className="cx-warn is-flat">
          <span className="cx-warn-h">
            {withdrawn.length === 1 && replacing.length === 1
              ? `Proved on ${withdrawn[0].spec ?? withdrawn[0].title}, which is being replaced by ${replacing[0].spec ?? replacing[0].title}`
              : 'Some results were got on a spec that is being withdrawn'}
          </span>
          <span className="cx-warn-b">
            This machine does not run the new spec the same way, so those results are not evidence for it.
            <b> {stale.length} need{stale.length === 1 ? 's' : ''} re-running.</b> The app marks them, so it is not on you to remember.
          </span>
        </section>
      )}

      <section className="cmp-sec">
        <div className="cw-sec-h">
          <h2 className="cmp-h">What it must prove</h2>
          <span className="cmp-h-n">
            {mine.filter(i => stateOf(i, superseded) === 'g').length} of {mine.length}
          </span>
        </div>
        <div className="cw-list">
          {mine.map(i => <Row key={i.id} item={i} cm={cm} />)}
          <button className="cw-add" onClick={() => setPicking(p => !p)}>
            <span className="cw-add-p" aria-hidden>+</span> {picking ? 'Close the list' : 'Pick from a list'}
          </button>
          <Add cm={cm} assetId={assetId} label="Or type your own" />
        </div>
        {picking && <Picker cm={cm} assetId={assetId} have={mine} done={() => setPicking(false)} />}
      </section>

      <Docs cm={cm} asset={asset} />

      <button className="btn btn-ghost cw-del cx-remove" onClick={() => void (async () => {
        const cost = await cm.assetCost(asset.id);
        const warn = cost.items > 0
          ? `Remove “${asset.name}”?\n\nIts ${cost.items} row${cost.items === 1 ? '' : 's'} go with it. That cannot be undone.`
          : `Remove “${asset.name}”?`;
        if (confirm(warn)) { await cm.removeAsset(asset.id); nav(`/project/${projectId}/commissioning`); }
      })()}>Remove this machine</button>
    </Shell>
  );
}

/** PICK WHAT THIS MACHINE HAS TO PROVE.
 *
 *  A list to choose from, and nothing is chosen for you. The version before this
 *  put four checks on every new machine automatically — e-stops, guarding,
 *  changeover, clean-down — which is the same mistake as the six stages and the
 *  five gates: deciding somebody else's process and leaving them to delete the
 *  half that does not apply. A checkweigher has no seal integrity.
 *
 *  Anything already on the machine is shown ticked and cannot be added twice.
 *  Typing your own is right there, because the list will never have heard of
 *  half of what a real line needs. */
function Picker({ cm, assetId, have, done }: {
  cm: CM; assetId: string; have: CommissionItem[]; done: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  // Matched on the title as somebody would read it, so a renamed row still
  // counts as "already on here" rather than being offered again.
  const already = useMemo(
    () => new Set(have.map(i => i.title.trim().toLowerCase())),
    [have],
  );

  const toggle = (title: string) => setPicked(p => {
    const next = new Set(p);
    if (next.has(title)) next.delete(title); else next.add(title);
    return next;
  });

  const add = async () => {
    const chosen: Suggestion[] = SUGGESTED_CHECKS
      .flatMap(g => g.items)
      .filter(i => picked.has(i.title));
    if (!chosen.length) return;
    setBusy(true);
    try {
      await cm.addChecks(assetId, chosen);
      setPicked(new Set());
      done();
    } finally { setBusy(false); }
  };

  return (
    <div className="cx-pick">
      <div className="cx-pick-head">
        <span className="cmp-h-n">WHAT DOES THIS MACHINE HAVE TO PROVE?</span>
        <p className="sub">
          Tick what applies to this machine. Nothing is added until you do, and everything you add can be
          renamed or deleted afterwards.
        </p>
      </div>

      {SUGGESTED_CHECKS.map(group => (
        <div key={group.name} className="cx-pick-group">
          <span className="cx-pick-g">{group.name}</span>
          {group.items.map(item => {
            const on = already.has(item.title.trim().toLowerCase());
            return (
              <label key={item.title} className={'cx-pick-row' + (on ? ' is-on' : '')}>
                <input type="checkbox" checked={on || picked.has(item.title)} disabled={on}
                  onChange={() => toggle(item.title)} />
                <span className="cx-pick-m">
                  <span className="cx-pick-t">{item.title}</span>
                  <span className="cx-pick-s">{on ? 'already on this machine' : item.criterion}</span>
                </span>
              </label>
            );
          })}
        </div>
      ))}

      <p className="sub cx-pick-note">
        A rate is not here on purpose — that is proved per pack, on the programs grid, because a machine can hit
        it on one pack and miss it on another.
      </p>

      <div className="cx-pick-foot">
        <button className="btn btn-primary" disabled={!picked.size || busy} onClick={() => void add()}>
          {busy ? 'Adding…' : picked.size ? `Add ${picked.size}` : 'Nothing ticked'}
        </button>
        <button className="btn btn-ghost" onClick={done}>Done</button>
      </div>
    </div>
  );
}

/** THE OEM'S PAPERWORK, IN THE APP.
 *
 *  The OEM is never going to log in — that was said plainly — so their FAT
 *  report and their film spec have to live where the work does. The bytes go
 *  into the same blob store as a snag photo, which means they sync, they survive
 *  a reinstall, and they open on a factory floor with no signal. Opening one uses
 *  the same delivery path as a generated report, because iOS ignoring `<a
 *  download>` is the same problem whoever drew the PDF. */
function Docs({ cm, asset }: { cm: CM; asset: Asset }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const docs = asset.docs ?? [];

  const take = async (chosen: FileList | null) => {
    if (!chosen?.length) return;
    setBusy(true); setErr(null);
    try {
      for (const f of Array.from(chosen)) {
        const key = `doc-${uid()}`;
        await putBlob(key, f);
        await cm.addDoc(asset.id, { name: f.name, blobKey: key, mime: f.type || 'application/pdf', bytes: f.size });
      }
    } catch (e) {
      console.error('Saving the document failed', e);
      setErr(e instanceof Error ? e.message : 'That file could not be saved.');
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  };

  const open = async (d: DocRef) => {
    setErr(null);
    const blob = await getBlob(d.blobKey);
    if (!blob) {
      setErr('That file hasn’t reached this device yet — it will once this device has synced.');
      return;
    }
    await cm.markDocRead(asset.id, d.id);
    await deliverBlob(blob, d.name);
  };

  return (
    <section className="cmp-sec">
      <div className="cw-sec-h">
        <h2 className="cmp-h">What the OEM sent</h2>
        <span className="cmp-h-n">{docs.length ? `${docs.length} saved` : ''}</span>
      </div>
      {err && <p className="sub is-r" role="alert">{err}</p>}
      <div className="cx-docs">
        {docs.map(d => (
          <div key={d.id} className={'cx-doc' + (d.readAt ? '' : ' is-new')}>
            <button className="cx-doc-open" onClick={() => void open(d)}>
              <span className="cx-pdf" aria-hidden>PDF</span>
              <span className="cx-doc-n">{d.name}</span>
              <span className="cx-doc-s">
                {kb(d.bytes)}
                {d.readAt ? ` · read ${nice(new Date(d.readAt).toISOString().slice(0, 10))}` : ' · not read'}
              </span>
            </button>
            <button className="cw-del btn btn-ghost btn-sm"
              onClick={() => { if (confirm(`Remove “${d.name}”?`)) void cm.removeDoc(asset.id, d.id); }}>Remove</button>
          </div>
        ))}
        <label className="cw-add">
          <span className="cw-add-p" aria-hidden>+</span> {busy ? 'Saving…' : 'Save a PDF they sent'}
          <input ref={file} type="file" accept="application/pdf,image/*" multiple hidden
            onChange={e => void take(e.target.files)} />
        </label>
      </div>
      <p className="sub">
        Saved in the app, so it opens on the floor with no signal, and it goes on the A3 next to the row it belongs to.
      </p>
    </section>
  );
}

/* ========================= FACE 3 — THE MATERIALS ===========================
 *
 * A changeover is not a stock count. The old spec may be plentiful and still be
 * the wrong thing to prove anything on, so the transition gets the top of the
 * screen and says exactly which results it costs us. Ordinary materials stay a
 * boring one-liner underneath, which is what they deserve to be.
 */
function MaterialsFace({ projectId, cm }: { projectId: string; cm: CM }) {
  const { project } = useProject(projectId);
  const trans = useMemo(() => transitions(cm.items), [cm.items]);
  const materials = useMemo(() => materialsOf(cm.items), [cm.items]);

  return (
    <Shell projectId={projectId} projectName={project?.name ?? 'Project'} where="Materials">
      <header className="cm-head">
        <div>
          <h1>Materials</h1>
          <p className="sub">What the line needs, and what is replacing what.</p>
        </div>
      </header>

      {trans.map(t => (
        <section key={t.to.id} className="cx-trans">
          <span className="cmp-h-n">CHANGING OVER</span>
          <div className="cx-trans-pair">
            <div className="cx-trans-side is-old">
              <span className="cx-trans-l">Running on now</span>
              <b>{t.from ? (t.from.spec ?? t.from.title) : 'the old spec'}</b>
              <span className="sub">{t.from ? standsAt(t.from) : 'no longer listed'}</span>
              <span className="cx-trans-w">Being withdrawn</span>
            </div>
            <div className="cx-trans-side">
              <span className="cx-trans-l">Moving to</span>
              <b>{t.to.spec ?? t.to.title}</b>
              <span className="sub">{standsAt(t.to)}</span>
              {t.to.due && <span className="sub">due {nice(t.to.due)}</span>}
            </div>
          </div>
          <span className="cx-bar"><span className="cx-bar-in" style={{ width: `${Math.round(t.landed * 100)}%` }} /></span>
          <span className="cx-tally">{Math.round(t.landed * 100)}% delivered</span>

          {t.invalidated.length > 0 ? (
            <div className="cx-warn is-flat">
              <span className="cx-warn-h">What this costs us</span>
              <span className="cx-warn-b">
                A result got on {t.from?.spec ?? 'the old spec'} is not evidence for {t.to.spec ?? 'the new one'}.
                <b> {t.invalidated.length} result{t.invalidated.length === 1 ? '' : 's'}</b> need doing again — the app marks
                them the day the new stock lands, it is not on you to remember.
              </span>
              <ul className="cx-inv">
                {t.invalidated.map(i => (
                  <li key={i.id}>
                    {i.title} — {standsAt(i)}
                    {i.assetId && <span className="sub"> · {cm.assets.find(a => a.id === i.assetId)?.name ?? ''}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="sub">Nothing has been proved on the old spec, so this changeover costs us no re-runs.</p>
          )}
        </section>
      ))}

      {/* EVERY material, including both sides of a changeover.
          The panel above is the interpretation; this is the list, and leaving
          the two film rows out of it made the old spec uneditable and put a
          count on the heading that disagreed with what was underneath it. */}
      <section className="cmp-sec">
        <div className="cw-sec-h">
          <h2 className="cmp-h">What this line needs</h2>
          <span className="cmp-h-n">{materials.length}</span>
        </div>
        <div className="cw-list">
          {materials.map(m => <Row key={m.id} item={m} cm={cm} />)}
          <Add cm={cm} label="Add a material" />
        </div>
        <p className="sub">
          Open a material and set <b>Replaces</b> to make it a changeover like the film. Leave it alone and it stays
          needed-against-here.
        </p>
      </section>
    </Shell>
  );
}

/* ========================== FACE 4 — THE PROGRAMS ===========================
 *
 * Every asset against every pack. This screen came from one sentence — "I know we
 * have some missing programs from a line that's already been commissioned, and
 * there could be others" — and it is the only way that stops being something
 * somebody half-remembers.
 *
 * A hole is a program that ought to exist and does not. An empty cell is a
 * machine that does not run that pack and implies no claim at all. Confusing
 * those two is what makes a matrix useless, so they do not look alike and they do
 * not count alike.
 */
function ProgramsFace({ projectId, cm }: { projectId: string; cm: CM }) {
  const { project } = useProject(projectId);
  const g = cm.grid;

  const start = (assetId: string, packId: string) => {
    const pack = cm.packs.find(p => p.id === packId);
    const asset = cm.assets.find(a => a.id === assetId);
    if (!pack || !asset) return;
    const rate = prompt(`${asset.name} running ${pack.name}.\n\nWhat rate is agreed, in ppm?\n\nLeave blank if there is no agreed rate yet.`);
    if (rate === null) return;
    void cm.addProgram(pack.name, num(rate ?? ''), { assetId, packId, grade: 'A' });
  };

  return (
    <Shell projectId={projectId} projectName={project?.name ?? 'Project'} where="Programs">
      <header className="cm-head">
        <div>
          <h1>Programs</h1>
          <p className="sub">
            Every machine against every pack it has to run.
            {g.holes > 0 && <b className="is-r"> {g.holes} hole{g.holes === 1 ? '' : 's'}.</b>}
          </p>
        </div>
      </header>

      {g.assets.length === 0 || g.packs.length === 0 ? (
        <section className="cmp-empty">
          <h2>{g.assets.length === 0 ? 'No machines yet' : 'No packs yet'}</h2>
          <p>
            {g.assets.length === 0
              ? 'Add the machines on this line and they appear down the side of the grid.'
              : 'Name the packs this line has to run — “400g”, “1kg catering” — and they become the columns. A rate, a seal and a weight check are all proved per pack, never once for the line.'}
          </p>
          {g.assets.length > 0 && <AddPack cm={cm} />}
        </section>
      ) : (
        <>
          {/* The scroll hint is a real element rather than a CSS fade: a fade
              over the last column looks like the column is disabled. */}
          {g.packs.length > 2 && <p className="cx-scroll">Swipe the grid sideways for the rest of the packs.</p>}
          <div className="cx-grid-wrap">
            <table className="cx-grid">
              <thead>
                <tr>
                  <th scope="col">Machine</th>
                  {g.packs.map(p => <th key={p.id} scope="col">{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {g.assets.map(a => (
                  <tr key={a.id}>
                    <th scope="row">
                      <button className="cx-glabel" onClick={() => nav(`/project/${projectId}/commissioning/asset/${encodeURIComponent(a.id)}`)}>
                        {a.name}
                      </button>
                    </th>
                    {g.packs.map(p => {
                      const c = g.at(a.id, p.id);
                      return (
                        <td key={p.id} className={'cx-gcell is-' + c.cell}>
                          {c.cell === 'na'
                            ? <button className="cx-gadd" onClick={() => start(a.id, p.id)} aria-label={`Add a program for ${a.name} on ${p.name}`}>+</button>
                            : <span className="cx-gword">{CELL_WORD[c.cell]}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Each swatch and its word are ONE item, so a wrap never strands a
              word on the next line away from the colour it names. */}
          <p className="cx-legend">
            {([
              ['proven', 'proved'], ['untested', 'written, not run'], ['stale', 'needs re-proving'],
              ['missing', 'no program'], ['na', 'doesn’t run it'],
            ] as const).map(([k, word]) => (
              <span key={k} className="cx-leg"><span className={'cx-key is-' + k} />{word}</span>
            ))}
          </p>
          <p className="sub">
            Tap a <b>+</b> and the program becomes a graded row on that machine — the line cannot run the pack without it.
            Tap a machine to open it.
          </p>

          <section className="cmp-sec">
            <div className="cw-sec-h">
              <h2 className="cmp-h">The packs</h2>
              <span className="cmp-h-n">{g.packs.length}</span>
            </div>
            <div className="cw-list">
              {g.packs.map(p => (
                <div key={p.id} className="cx-packrow">
                  <input value={p.name} onChange={e => void cm.savePack({ ...p, name: e.target.value })} aria-label="Pack name" />
                  <button className="btn btn-ghost btn-sm cw-del" onClick={() => void (async () => {
                    const cost = await cm.packCost(p.id);
                    const warn = cost.items > 0
                      ? `Delete “${p.name}”?\n\nIts ${cost.items} row${cost.items === 1 ? '' : 's'} go with it. That cannot be undone.`
                      : `Delete “${p.name}”?`;
                    if (confirm(warn)) await cm.removePack(p.id);
                  })()}>Delete</button>
                </div>
              ))}
              <AddPack cm={cm} />
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}

function AddPack({ cm }: { cm: CM }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  if (!open) {
    return (
      <button className="cw-add" onClick={() => setOpen(true)}>
        <span className="cw-add-p" aria-hidden>+</span> Add a pack
      </button>
    );
  }
  return (
    <form className="cw-addf" onSubmit={e => {
      e.preventDefault();
      if (!name.trim()) return;
      void cm.addPack(name);
      setName('');
    }}>
      <input autoFocus placeholder="Pack — 400g" value={name} onChange={e => setName(e.target.value)} />
      <button className="btn" type="submit" disabled={!name.trim()}>Add</button>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Done</button>
    </form>
  );
}

/* ================================== the page ================================ */

export function CommissioningScreen({ projectId, view, assetId }: {
  projectId: string; view?: string; assetId?: string;
}) {
  const { project, loading } = useProject(projectId);
  const cm = useCommission(projectId);

  if (loading || cm.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  /* Keyed on the machine so moving between two of them REMOUNTS the face.
     Without it the per-machine state survived the switch, and the picker that
     opens on a machine you just made stayed open on the next one you looked at
     — which is the app deciding something for you all over again. */
  if (view === 'asset' && assetId) {
    return <AssetFace key={assetId} projectId={projectId} cm={cm} assetId={assetId} />;
  }
  if (view === 'materials') return <MaterialsFace projectId={projectId} cm={cm} />;
  if (view === 'programs') return <ProgramsFace projectId={projectId} cm={cm} />;

  return (
    <Shell projectId={projectId} projectName={project.name}>
      <NowFace projectId={projectId} cm={cm} />
    </Shell>
  );
}
