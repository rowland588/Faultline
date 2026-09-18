/* COMMISSIONING — the loop, on one page.
 *
 * Where are we · what are we after · what is the result · what is next. Those
 * four questions in that order, because that is how somebody running a handover
 * actually thinks, and because a page that answers them in order can be sent to
 * a General Manager without a covering note explaining how to read it.
 *
 * Everything is editable in place. There is no upload here and no workbook
 * underneath: a commissioning job has no system of record yet, so this is it.
 * The consequence is that a stale item is nobody's fault but the person looking
 * at it, which is exactly the pressure that keeps a readiness list honest.
 */
import { useEffect, useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { Sweep } from '../ui/Sweep';
import { useProject } from '../lib/useProjects';
import { useCommission } from '../lib/useCommission';
import { loadPdfLib, deliverPdf, isStaleBuildError, reloadOntoNewBuild } from '../lib/savePdf';
import type { CommissionReportData, CommissionReportRow } from '../lib/commissionPdf';
import {
  readiness, readinessLine, stateOf, itemLine, STATE_LABEL, SUGGESTED_STREAMS,
  type CommissionItem, type ItemKind, type CheckStage, type TaskStage,
} from '../lib/commissioning';

const KINDS: { id: ItemKind; label: string; hint: string }[] = [
  { id: 'check', label: 'Check', hint: 'must be proven against a number' },
  { id: 'supply', label: 'Supply', hint: 'we need a quantity of it' },
  { id: 'task', label: 'Task', hint: 'somebody has to do it' },
];

const CHECK_STAGES: { id: CheckStage; label: string }[] = [
  { id: 'none', label: 'Not written' },
  { id: 'have', label: 'Written' },
  { id: 'testing', label: 'Testing' },
  { id: 'passed', label: 'Passed' },
  { id: 'failed', label: 'Failed' },
];

const TASK_STAGES: { id: TaskStage; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In hand' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'done', label: 'Done' },
];

/** A number field that writes back only real numbers, and shows empty rather
 *  than 0 — "0 reels" and "nobody has said yet" are different facts. */
function Num({ v, label, onSave }: { v?: number; label: string; onSave: (n: number) => void }) {
  return (
    <label className="cm-num">
      <span>{label}</span>
      <input type="number" min={0} inputMode="numeric" value={v ?? ''}
        onChange={e => onSave(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
    </label>
  );
}

function Item({ i, onSave, onRemove }: {
  i: CommissionItem; onSave: (i: CommissionItem) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const st = stateOf(i);
  const set = (patch: Partial<CommissionItem>) => onSave({ ...i, ...patch });

  return (
    <article className={'cm-item is-' + st}>
      <button className="cm-item-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className={'cm-dot is-' + st} aria-hidden />
        <span className="cm-item-main">
          <span className="cm-item-t">{i.title || 'Untitled'}</span>
          <span className="cm-item-s">
            <span className="cm-kind">{i.kind}</span>
            {itemLine(i)}
            {i.target && <> · target <b>{i.target}</b></>}
            {i.owner && <> · {i.owner}</>}
            {i.due && <> · wanted {i.due}</>}
          </span>
        </span>
        <span className={'cm-state is-' + st}>{STATE_LABEL[st]}</span>
      </button>

      {open && (
        <div className="cm-item-body">
          <label className="cm-f">
            <span>What it is</span>
            <input className="text-input" value={i.title}
              onChange={e => set({ title: e.target.value })} />
          </label>

          {i.kind === 'check' && (
            <>
              <div className="cm-stages">
                {CHECK_STAGES.map(s => (
                  <button key={s.id} className={'chip' + (i.stage === s.id ? ' on' : '')}
                    onClick={() => set({ stage: s.id })}>{s.label}</button>
                ))}
              </div>
              <label className="cm-f">
                <span>Target — what it has to hit</span>
                <input className="text-input" placeholder="75 ppm at 98% OEE, 30 min run"
                  value={i.target ?? ''} onChange={e => set({ target: e.target.value || undefined })} />
              </label>
              <label className="cm-f">
                <span>Result — what it actually did</span>
                <input className="text-input" placeholder="72 ppm at 94%, 12 Sep with OEM"
                  value={i.result ?? ''} onChange={e => set({ result: e.target.value || undefined })} />
              </label>
            </>
          )}

          {i.kind === 'supply' && (
            <>
              <div className="cm-nums">
                <Num v={i.need} label="Need" onSave={n => set({ need: n })} />
                <Num v={i.have} label="Have" onSave={n => set({ have: n })} />
                <Num v={i.onOrder} label="On order" onSave={n => set({ onOrder: n })} />
                <label className="cm-num">
                  <span>Due in</span>
                  <input type="date" value={i.dueIn ?? ''}
                    onChange={e => set({ dueIn: e.target.value || undefined })} />
                </label>
              </div>
              <label className="cm-f">
                <span>Spec — so the right thing turns up</span>
                <input className="text-input" placeholder="35µm, 420mm, matt lacquer"
                  value={i.target ?? ''} onChange={e => set({ target: e.target.value || undefined })} />
              </label>
            </>
          )}

          {i.kind === 'task' && (
            <div className="cm-stages">
              {TASK_STAGES.map(s => (
                <button key={s.id} className={'chip' + ((i.taskStage ?? 'todo') === s.id ? ' on' : '')}
                  onClick={() => set({ taskStage: s.id })}>{s.label}</button>
              ))}
            </div>
          )}

          <div className="cm-row2">
            <label className="cm-f">
              <span>Who</span>
              <input className="text-input" placeholder="OEM · engineering · you"
                value={i.owner ?? ''} onChange={e => set({ owner: e.target.value || undefined })} />
            </label>
            <label className="cm-f">
              <span>Wanted by</span>
              <input className="text-input" type="date" value={i.due ?? ''}
                onChange={e => set({ due: e.target.value || undefined })} />
            </label>
          </div>

          <label className="cm-f">
            <span>Note</span>
            <input className="text-input" placeholder="Anything the next person needs to know"
              value={i.note ?? ''} onChange={e => set({ note: e.target.value || undefined })} />
          </label>

          <div className="cm-item-foot">
            <button className="btn btn-ghost cm-del" onClick={onRemove}>Remove</button>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </article>
  );
}

export function CommissioningScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const cm = useCommission(projectId);
  const r = useMemo(() => readiness(cm.items), [cm.items]);

  const [stream, setStream] = useState('');
  const [kind, setKind] = useState<ItemKind>('check');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<{ stale: boolean; msg: string } | null>(null);

  /* Fetch the PDF library when the PAGE opens, not when the button is pressed.
     It is a separate chunk, and an installed PWA keeps serving the build it
     booted with — so after a deploy the page asks for a filename the server no
     longer has and the button appears to do nothing. Loading it up front turns
     a dead button into one that can say what is wrong. */
  useEffect(() => { void loadPdfLib().catch(() => { /* reported when pressed */ }); }, []);

  /* Everything the drawer needs, as plain numbers and sentences. It never looks
     at the DOM, so this is the whole contract between the screen and the file —
     and it is why the sheet is identical on a phone and a laptop. */
  const reportData = (): CommissionReportData => {
    const row = (i: CommissionItem): CommissionReportRow => ({
      stream: i.stream, kind: i.kind, title: i.title,
      line: itemLine(i), target: i.target, result: i.result,
      owner: i.owner, due: i.due, note: i.note,
      state: stateOf(i), stateLabel: STATE_LABEL[stateOf(i)],
    });
    return {
      title: project?.name ?? 'Commissioning',
      lead: project?.lead,
      now: Date.now(),
      pct: r.pct, done: r.done, total: r.total,
      headline: readinessLine(r),
      checks: r.checks,
      streams: r.streams.map(s => ({ name: s.name, done: s.done, total: s.total, pct: s.pct, risk: s.risk })),
      attention: r.attention.map(row),
      // In workstream order, exactly as the page shows them, so the sheet reads
      // as the same document rather than a second opinion.
      rows: r.streams.flatMap(s => s.items.map(row)),
    };
  };

  const download = async () => {
    if (saving) return;
    setSaving(true); setSaveErr(null);
    try {
      const { jsPDF } = await loadPdfLib();
      const { drawCommissionReport } = await import('../lib/commissionPdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
      drawCommissionReport(pdf, reportData());
      const slug = (project?.name ?? 'Commissioning').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'Commissioning';
      const how = await deliverPdf(pdf, `${slug}-readiness-${new Date().toISOString().slice(0, 10)}.pdf`);
      if (how === 'opened') setSaveErr({ stale: false, msg: 'Your browser would not save it, so it is open in a new tab — share or print it from there.' });
    } catch (err) {
      console.error('commissioning PDF failed', err);
      setSaveErr(isStaleBuildError(err)
        ? { stale: true, msg: 'This tab is still running an older version of the app, so the part that draws the PDF could not load.' }
        : { stale: false, msg: err instanceof Error ? err.message : 'The PDF could not be built.' });
    } finally { setSaving(false); }
  };

  const streams = useMemo(() => {
    const seen = r.streams.map(s => s.name);
    return [...seen, ...SUGGESTED_STREAMS.filter(s => !seen.includes(s))];
  }, [r.streams]);

  const addIt = async () => {
    const s = (stream || streams[0] || 'Programs').trim();
    if (!title.trim()) return;
    await cm.add(s, kind, title.trim());
    setTitle('');
    setStream(s);
  };

  if (loading || cm.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }

  const pct = Math.round(r.pct * 100);

  return (
    <div className="wrap pace cm-screen">
      <Sweep id={'cm:' + projectId} />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Commissioning' },
      ]} />

      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">Commissioning</h1>
          <p className="pace-lede">
            Where we are, what we are after, what the result was, and what is next — the four
            questions a handover turns on. Everything here is typed in the app: there is no workbook
            underneath, because a commissioning job has no system of record until somebody makes one.
          </p>
        </div>
        <div className="pace-head-actions">
          <span className="exec-bar-hint cm-hint">One click — an A3 you can send</span>
          <button className="btn btn-primary" disabled={saving} onClick={() => void download()}>
            {saving ? 'Building…' : 'Download A3'}
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
          <AccountMenu />
        </div>
      </header>

      {saveErr && (
        <div className={'exec-saveerr no-print' + (saveErr.stale ? ' is-stale' : '')} role="alert">
          <span>{saveErr.msg}</span>
          {saveErr.stale && (
            <button className="btn btn-primary" onClick={() => void reloadOntoNewBuild()}>Reload the app</button>
          )}
          <button className="exec-saveerr-x" onClick={() => setSaveErr(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* ---- WHERE WE ARE. One number and the sentence that stops it being
             nodded at: a readiness percentage with nothing blocking named
             beside it is the easiest thing in the world to agree with. ---- */}
      <section className="cm-top">
        <div className="cm-ready">
          <span className="cm-ready-n">{pct}<i>%</i></span>
          <span className="cm-ready-l">ready</span>
        </div>
        <div className="cm-top-m">
          <p className="cm-top-line">{readinessLine(r)}</p>
          <div className="cm-bar" role="img" aria-label={`${pct}% ready`}>
            <span className="cm-bar-f" style={{ width: `${pct}%` }} />
          </div>
          {r.checks.total > 0 && (
            <p className="cm-accept">
              <b>Acceptance</b> — {r.checks.passed} of {r.checks.total} checks passed
              {r.checks.failed > 0 && <>, <b className="is-bad">{r.checks.failed} failed</b></>}
              {r.checks.untested > 0 && <>, {r.checks.untested} still to run</>}
            </p>
          )}
        </div>
      </section>

      {/* ---- WHAT IS NEXT, before the full list, because the full list is
             where a blocker goes to hide. ---- */}
      {r.attention.length > 0 && (
        <section className="cm-next">
          <h2 className="cm-h">What is next</h2>
          <ul className="cm-next-list">
            {r.attention.slice(0, 8).map(i => (
              <li key={i.id} className={'is-' + stateOf(i)}>
                <span className={'cm-dot is-' + stateOf(i)} aria-hidden />
                <span className="cm-next-t">{i.title}</span>
                <span className="cm-next-m">{i.stream} · {itemLine(i)}{i.owner ? ` · ${i.owner}` : ''}</span>
              </li>
            ))}
          </ul>
          {r.attention.length > 8 && (
            <p className="sub">and {r.attention.length - 8} more below</p>
          )}
        </section>
      )}

      {/* ---- THE LIST, by workstream ---- */}
      {r.streams.map(s => (
        <section key={s.name} className="cm-stream">
          <header className="cm-stream-h">
            <h2 className="cm-stream-t">{s.name}</h2>
            <span className="cm-stream-n">
              {s.done} of {s.total}
              {s.risk > 0 && <b className="is-bad"> · {s.risk} need attention</b>}
            </span>
            <span className="cm-mini" aria-hidden>
              <span style={{ width: `${Math.round(s.pct * 100)}%` }} />
            </span>
          </header>
          <div className="cm-items">
            {s.items.map(i => (
              <Item key={i.id} i={i}
                onSave={x => void cm.save(x)}
                onRemove={() => void cm.remove(i.id)} />
            ))}
          </div>
        </section>
      ))}

      {/* ---- ADD ---- */}
      <section className="cm-add">
        <h2 className="cm-h">Add something</h2>
        <div className="cm-add-row">
          <label className="cm-f">
            <span>Workstream</span>
            <input className="text-input" list="cm-streams" placeholder="Programs"
              value={stream} onChange={e => setStream(e.target.value)} />
            <datalist id="cm-streams">
              {streams.map(s => <option key={s} value={s} />)}
            </datalist>
          </label>
          <label className="cm-f cm-f-grow">
            <span>What it is</span>
            <input className="text-input" placeholder="250g tray — run at rate"
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void addIt(); }} />
          </label>
        </div>
        <div className="cm-add-kinds">
          {KINDS.map(k => (
            <button key={k.id} className={'chip' + (kind === k.id ? ' on' : '')}
              onClick={() => setKind(k.id)} title={k.hint}>
              {k.label} <span className="bs-hint">{k.hint}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" disabled={!title.trim()} onClick={() => void addIt()}>
            Add
          </button>
        </div>
      </section>

      {r.total === 0 && (
        <div className="bd-empty" style={{ marginTop: 16 }}>
          <p className="bd-empty-t">Nothing on the list yet</p>
          <p className="sub">
            Start with what you already know you are waiting on — a program that has to run at rate,
            the film you are short of, the test the OEM owes you. A commissioning list is most useful
            when it is written before anybody asks for it.
          </p>
        </div>
      )}

      <footer className="pace-foot">
        <p>{project.name} · commissioning readiness · kept in the app, not in a workbook</p>
      </footer>
    </div>
  );
}
