/* CAN THIS LINE BE SIGNED OFF, AND IF NOT, WHAT IS STOPPING IT.
 *
 * That is the only question a commissioning sheet exists to answer, so it is the
 * first thing on the page and it is DERIVED — nobody ticks "ready". Underneath
 * it, the five lists it is derived from, each as short as the thing it describes.
 *
 * One asset at a time. A line is made of machines, each accepted in its own
 * right, and "the bagger is proven and the palletiser has not started" is a
 * sentence a single project percentage cannot say.
 */
import { Fragment, useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { useProject } from '../lib/useProjects';
import { useCommission } from '../lib/useCommission';
import { useCommissionEvidence } from '../lib/useCommissionEvidence';
import { saveCommissionReport } from '../lib/buildCommissionReport';
import { isStaleBuildError, reloadOntoNewBuild } from '../lib/savePdf';
import {
  LINE_ITSELF, byAsset, readiness, programStatus, materialStatus, bestRun, isOpen,
  stateOf, STATE_WORD,
  type CommissionItem, type Program, type Material, type Check, type Punch, type Task,
  type Severity, type ReadyState,
} from '../lib/commissioning';

const dot = (s: ReadyState) => <span className={'cm-dot is-' + s} title={STATE_WORD[s]} />;
const num = (v: string): number => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

/** A section that only appears once it has something in it, plus its add row.
 *  An empty list with a heading is a page telling you about work you have not
 *  started; the add row is enough. */
function Section({ title, sub, count, children, add }: {
  title: string; sub: string; count: number; children?: React.ReactNode; add: React.ReactNode;
}) {
  return (
    <section className="cm-sec">
      <header className="cm-sec-h">
        <h2>{title} {count > 0 && <span className="cm-sec-n">{count}</span>}</h2>
        <p className="sub">{sub}</p>
      </header>
      {children}
      <div className="cm-add">{add}</div>
    </section>
  );
}

/* ---------------------------------- programs --------------------------------- */

function Programs({ rows, cm, asset }: { rows: Program[]; cm: ReturnType<typeof useCommission>; asset?: string }) {
  const [title, setTitle] = useState('');
  const [rate, setRate] = useState('');
  const [runFor, setRunFor] = useState<string | null>(null);

  const STATUS = { missing: 'No program', untested: 'Not run', below: 'Below rate', proven: 'Proven at rate' };

  return (
    <Section
      title="Programs" count={rows.length}
      sub="Every product the line must run, and the rate it was agreed at. Proven means a witnessed run at or above it."
      add={
        <form className="cm-add-f" onSubmit={e => {
          e.preventDefault();
          if (!title.trim() || num(rate) <= 0) return;
          void cm.addProgram(title, num(rate), asset);
          setTitle(''); setRate('');
        }}>
          <input placeholder="Product or format — 250g tray" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="cm-num" placeholder="rate" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} />
          <span className="cm-unit">ppm</span>
          <button className="btn" type="submit">Add program</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>Product</th><th className="r">Agreed</th><th className="r">Best run</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map(p => {
              const st = programStatus(p);
              const best = bestRun(p);
              return (
                <Fragment key={p.id}>
                  <tr>
                    <td>{dot(stateOf(p))}</td>
                    <td><b>{p.title}</b>{p.runs?.length ? <span className="cm-sub"> · {p.runs.length} run{p.runs.length > 1 ? 's' : ''}</span> : null}</td>
                    <td className="r">{p.agreedRate} {p.rateUnit ?? 'ppm'}</td>
                    <td className="r">{best ? `${best.achieved}` : '—'}</td>
                    <td><span className={'cm-tag is-' + st}>{STATUS[st]}</span></td>
                    <td className="r">
                      <button className="btn btn-ghost btn-sm" onClick={() => setRunFor(runFor === p.id ? null : p.id)}>
                        Record a run
                      </button>
                    </td>
                  </tr>
                  {runFor === p.id && (
                    <tr className="cm-runrow">
                      <td />
                      <td colSpan={5}><RunForm p={p} cm={cm} done={() => setRunFor(null)} /></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </Section>
  );
}

/** "We ran it and achieved this." The whole point of ppm on a commissioning
 *  project — evidence against an agreed figure, not a quarterly trajectory. */
function RunForm({ p, cm, done }: { p: Program; cm: ReturnType<typeof useCommission>; done: () => void }) {
  const [achieved, setAchieved] = useState('');
  const [minutes, setMinutes] = useState('');
  const [waste, setWaste] = useState('');
  const [by, setBy] = useState('');
  const hit = num(achieved) >= p.agreedRate && num(achieved) > 0;

  return (
    <form className="cm-run" onSubmit={e => {
      e.preventDefault();
      if (num(achieved) <= 0) return;
      void cm.addRun(p.id, {
        at: Date.now(), by: by.trim() || undefined,
        achieved: num(achieved),
        minutes: num(minutes) || undefined,
        wastePct: waste.trim() ? num(waste) : undefined,
      });
      done();
    }}>
      <label>Achieved<input className="cm-num" inputMode="decimal" autoFocus value={achieved} onChange={e => setAchieved(e.target.value)} /></label>
      <label>For (min)<input className="cm-num" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
      <label>Waste %<input className="cm-num" inputMode="decimal" value={waste} onChange={e => setWaste(e.target.value)} /></label>
      <label>Witnessed by<input value={by} onChange={e => setBy(e.target.value)} placeholder="Dave + OEM" /></label>
      {achieved.trim() && (
        <p className={'cm-verdict is-' + (hit ? 'g' : 'a')}>
          {hit
            ? `At rate — ${num(achieved)} against ${p.agreedRate} agreed.`
            : `Short — ${num(achieved)} against ${p.agreedRate} agreed.`}
        </p>
      )}
      <button className="btn" type="submit">Save the run</button>
      <button className="btn btn-ghost" type="button" onClick={done}>Cancel</button>
    </form>
  );
}

/* --------------------------------- materials -------------------------------- */

function Materials({ rows, cm, asset }: { rows: Material[]; cm: ReturnType<typeof useCommission>; asset?: string }) {
  const [title, setTitle] = useState('');
  const [need, setNeed] = useState('');
  const WORD = { have: 'Have it', awaited: 'On order', short: 'Nothing ordered', late: 'Overdue' };

  return (
    <Section
      title="Materials" count={rows.length}
      sub="What the line cannot run without. Needed, have, on order, when."
      add={
        <form className="cm-add-f" onSubmit={e => {
          e.preventDefault();
          if (!title.trim()) return;
          void cm.addMaterial(title, num(need), asset);
          setTitle(''); setNeed('');
        }}>
          <input placeholder="Item — 980mm film" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="cm-num" placeholder="need" inputMode="numeric" value={need} onChange={e => setNeed(e.target.value)} />
          <button className="btn" type="submit">Add material</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>Item</th><th className="r">Need</th><th className="r">Have</th><th className="r">On order</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.id}>
                <td>{dot(stateOf(m))}</td>
                <td><b>{m.title}</b></td>
                <td className="r">{m.need}{m.unit ? ' ' + m.unit : ''}</td>
                <td className="r">
                  <input className="cm-cell" inputMode="numeric" value={String(m.have)}
                    onChange={e => void cm.save({ ...m, have: num(e.target.value) })} />
                </td>
                <td className="r">
                  <input className="cm-cell" inputMode="numeric" value={String(m.onOrder ?? 0)}
                    onChange={e => void cm.save({ ...m, onOrder: num(e.target.value) })} />
                </td>
                <td>
                  <input className="cm-cell cm-date" type="date" value={m.due ?? ''}
                    onChange={e => void cm.save({ ...m, due: e.target.value || undefined })} />
                </td>
                <td><span className={'cm-tag is-' + stateOf(m)}>{WORD[materialStatus(m)]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

/* ---------------------------- acceptance checks ----------------------------- */

function Checks({ rows, cm, asset }: { rows: Check[]; cm: ReturnType<typeof useCommission>; asset?: string }) {
  const [title, setTitle] = useState('');
  const [criterion, setCriterion] = useState('');

  return (
    <Section
      title="Acceptance checks" count={rows.length}
      sub="The site acceptance tests, each with what good looks like and who witnessed it."
      add={
        <form className="cm-add-f" onSubmit={e => {
          e.preventDefault();
          if (!title.trim()) return;
          void cm.addCheck(title, criterion, asset);
          setTitle(''); setCriterion('');
        }}>
          <input placeholder="Test — emergency stops" value={title} onChange={e => setTitle(e.target.value)} />
          <input placeholder="What good looks like" value={criterion} onChange={e => setCriterion(e.target.value)} />
          <button className="btn" type="submit">Add check</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>Test</th><th>Criterion</th><th>Result</th><th>Witnessed</th><th /></tr></thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id}>
                <td>{dot(stateOf(c))}</td>
                <td><b>{c.title}</b></td>
                <td className="cm-sub">{c.criterion || '—'}</td>
                <td>
                  <input className="cm-cell cm-wide" placeholder="what happened" value={c.result ?? ''}
                    onChange={e => void cm.save({ ...c, result: e.target.value || undefined })} />
                </td>
                <td>
                  <input className="cm-cell" placeholder="who" value={c.witnessedBy ?? ''}
                    onChange={e => void cm.save({ ...c, witnessedBy: e.target.value || undefined })} />
                </td>
                <td className="r cm-outcome">
                  {(['pass', 'fail', 'notRun'] as const).map(o => (
                    <button key={o} className={'btn btn-sm' + (c.outcome === o ? ' on' : ' btn-ghost')}
                      onClick={() => void cm.save({ ...c, outcome: o, at: o === 'notRun' ? undefined : Date.now() })}>
                      {o === 'pass' ? 'Pass' : o === 'fail' ? 'Fail' : 'Not run'}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

/* -------------------------------- punch list -------------------------------- */

const SEV_WORD: Record<Severity, string> = {
  A: 'A — blocks sign-off', B: 'B — before production', C: 'C — can follow',
};

function PunchList({ rows, cm, asset }: { rows: Punch[]; cm: ReturnType<typeof useCommission>; asset?: string }) {
  const [title, setTitle] = useState('');
  const [sev, setSev] = useState<Severity>('B');

  return (
    <Section
      title="Punch list" count={rows.filter(isOpen).length}
      sub="Defects handed to whoever owns them. A blocks sign-off, B is fixed before production, C can follow."
      add={
        <form className="cm-add-f" onSubmit={e => {
          e.preventDefault();
          if (!title.trim()) return;
          void cm.addPunch(title, sev, asset);
          setTitle('');
        }}>
          <input placeholder="Defect — former roller misaligned" value={title} onChange={e => setTitle(e.target.value)} />
          <select value={sev} onChange={e => setSev(e.target.value as Severity)}>
            {(['A', 'B', 'C'] as const).map(s => <option key={s} value={s}>{SEV_WORD[s]}</option>)}
          </select>
          <button className="btn" type="submit">Add defect</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>Sev</th><th>Defect</th><th>Fix by</th><th /></tr></thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className={isOpen(p) ? '' : 'cm-closed'}>
                <td>{dot(stateOf(p))}</td>
                <td>
                  <select className="cm-cell" value={p.severity}
                    onChange={e => void cm.save({ ...p, severity: e.target.value as Severity })}>
                    {(['A', 'B', 'C'] as const).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td><b>{p.title}</b></td>
                <td>
                  <input className="cm-cell" placeholder="OEM / us" value={p.fixBy ?? ''}
                    onChange={e => void cm.save({ ...p, fixBy: e.target.value || undefined })} />
                </td>
                <td className="r">
                  <button className={'btn btn-sm' + (isOpen(p) ? ' btn-ghost' : ' on')}
                    onClick={() => void cm.save({ ...p, closedAt: isOpen(p) ? Date.now() : undefined })}>
                    {isOpen(p) ? 'Close' : 'Closed'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

/* ----------------------------------- tasks ---------------------------------- */

function Tasks({ rows, cm, asset }: { rows: Task[]; cm: ReturnType<typeof useCommission>; asset?: string }) {
  const [title, setTitle] = useState('');
  const STATES = ['todo', 'doing', 'waiting', 'done'] as const;
  const WORD = { todo: 'To do', doing: 'Doing', waiting: 'Waiting', done: 'Done' };

  return (
    <Section
      title="Everything else" count={rows.filter(t => t.state !== 'done').length}
      sub="Training, manuals, the spares list, the safety file — dull, and it holds up sign-off just as hard."
      add={
        <form className="cm-add-f" onSubmit={e => {
          e.preventDefault();
          if (!title.trim()) return;
          void cm.addTask(title, asset);
          setTitle('');
        }}>
          <input placeholder="Obligation — operators trained on changeover" value={title} onChange={e => setTitle(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>What</th><th>Who</th><th /></tr></thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id} className={t.state === 'done' ? 'cm-closed' : ''}>
                <td>{dot(stateOf(t))}</td>
                <td><b>{t.title}</b></td>
                <td>
                  <input className="cm-cell" placeholder="who" value={t.owner ?? ''}
                    onChange={e => void cm.save({ ...t, owner: e.target.value || undefined })} />
                </td>
                <td className="r cm-outcome">
                  {STATES.map(s => (
                    <button key={s} className={'btn btn-sm' + (t.state === s ? ' on' : ' btn-ghost')}
                      onClick={() => void cm.save({ ...t, state: s })}>{WORD[s]}</button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

/* ==================================== page =================================== */

export function CommissioningScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const cm = useCommission(projectId);
  const walk = useCommissionEvidence(projectId);
  const [asset, setAsset] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<{ stale: boolean; msg: string } | null>(null);

  const assets = useMemo(() => byAsset(cm.items), [cm.items]);
  const whole = useMemo(() => readiness(cm.items), [cm.items]);

  /* Default to the first asset that has something wrong with it. Opening on a
     machine that is finished is a page that has hidden the news. */
  const current = asset ?? assets.find(a => !a.ready.canSignOff)?.asset ?? assets[0]?.asset ?? null;
  const shown = current == null ? cm.items : (assets.find(a => a.asset === current)?.items ?? []);
  const forAsset = current === LINE_ITSELF ? undefined : current ?? undefined;
  const nothingYet = cm.items.filter(i => !i.deletedAt).length === 0;

  /* THE SHEET. Built from the records, never from this page — see
     lib/buildCommissionReport. Rasterising the DOM made the output depend on a
     browser finishing a stylesheet fetch inside a hidden clone, which failed on
     real devices in four different ways. The A3 is the deliverable at sign-off,
     so it has to come out identical on every device. */
  const download = async () => {
    if (saving || cm.loading) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const how = await saveCommissionReport({
        title: project?.name ?? 'Commissioning',
        lead: project?.lead,
        items: cm.items,
        walk: walk.byId,
      });
      // Downloading is invisible on a phone, and "opened in a tab" needs saying
      // or it looks like nothing happened at all.
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

  const of = <K extends CommissionItem['kind']>(k: K) =>
    shown.filter((i): i is Extract<CommissionItem, { kind: K }> => i.kind === k)
      .sort((a, b) => a.sort - b.sort);

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
          <p className="sub">Handover — {whole.programs.total} program{whole.programs.total === 1 ? '' : 's'}, {assets.length} asset{assets.length === 1 ? '' : 's'}</p>
        </div>
        {/* THE SHEET IS THE POINT OF THE SCREEN, not an afterthought at the
            bottom. A handover ends with a document somebody signs; a page that
            can only be read on a phone is not a handover system. */}
        <button className="btn btn-primary" onClick={() => void download()} disabled={saving || nothingYet}>
          {saving ? 'Building the sheet…' : 'Handover sheet (A3 PDF)'}
        </button>
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

      {/* THE ANSWER, and it is about THE LINE — not whichever machine happens to
          be open below. "Can we sign off Line 2" is the question being asked in
          the room; the per-asset count lives on the asset's own tab. The first
          version of this card read off the current asset and so quietly answered
          a question nobody had asked. */}
      <section className={'cm-verdict-card is-' + (whole.canSignOff ? 'g' : 'r')}>
        <p className="cm-verdict-h">
          {nothingYet
            ? 'Nothing recorded yet'
            : whole.canSignOff
              ? 'Ready to sign off'
              : `Not ready — ${whole.blockers.length} thing${whole.blockers.length === 1 ? '' : 's'} in the way`}
        </p>
        {whole.blockers.length > 0 && (
          <ol className="cm-blockers">
            {whole.blockers.slice(0, 8).map(b => (
              <li key={b.id}>
                <b>{b.what}</b>
                {b.asset ? <span className="cm-sub"> · {b.asset}</span> : null}
              </li>
            ))}
            {whole.blockers.length > 8 && <li className="cm-sub">and {whole.blockers.length - 8} more</li>}
          </ol>
        )}
        <p className="cm-counts">
          Programs {whole.programs.proven}/{whole.programs.total} proven
          {whole.programs.missing > 0 && <> · <b>{whole.programs.missing} with no program written</b></>}
          {' · '}Materials {whole.materials.have}/{whole.materials.total} in
          {' · '}Checks {whole.checks.pass}/{whole.checks.total} passed
          {' · '}Punch {whole.punch.openA}A {whole.punch.openB}B {whole.punch.openC}C open
        </p>
      </section>

      {/* One machine at a time. */}
      {assets.length > 1 && (
        <nav className="cm-assets" aria-label="Asset">
          {assets.map(a => (
            <button key={a.asset}
              className={'cm-asset' + (a.asset === current ? ' on' : '')}
              onClick={() => setAsset(a.asset)}>
              <span className="cm-asset-n">{a.asset}</span>
              <span className="cm-asset-s">{a.ready.canSignOff ? 'ready' : `${a.ready.blockers.length} open`}</span>
            </button>
          ))}
        </nav>
      )}

      <Programs rows={of('program')} cm={cm} asset={forAsset} />
      <Materials rows={of('material')} cm={cm} asset={forAsset} />
      <Checks rows={of('check')} cm={cm} asset={forAsset} />
      <PunchList rows={of('punch')} cm={cm} asset={forAsset} />
      <Tasks rows={of('task')} cm={cm} asset={forAsset} />

      <div className="cm-foot">
        <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    </div>
  );
}
