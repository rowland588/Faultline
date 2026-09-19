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
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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

/* A CELL YOU CAN ACTUALLY TYPE IN.
 *
 * These were bound straight to the record — value={String(m.have)} with a save
 * on every keystroke — and both halves of that were wrong.
 *
 * The number boxes could not be cleared: emptying one ran the text through a
 * parser that turns "" into 0, so the 0 came straight back, and the next digits
 * landed around it. Typing 12 into a box showing 0 produced ONE HUNDRED AND TWO,
 * in the file the line is accepted on. Nobody would ever have reported that as a
 * bug in the box; they would have reported that Faultline had the wrong number.
 *
 * And a save per keystroke is a write per keystroke: the clock moves, the row
 * pushes, and a two-device team syncs eleven versions of a word being typed.
 *
 * So the cell holds its own text while it has focus and commits once, on blur or
 * Enter — with Escape to put it back. Which is also what every spreadsheet on
 * earth does, and this is a screen full of people who live in spreadsheets. */
function useDraft(value: string) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  // While somebody is typing, their text wins. The moment they leave, the record
  // wins again — including a change that arrived from another device mid-edit.
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  return { draft, setDraft, editing, setEditing };
}

function TextCell({ value, onCommit, placeholder, className = '' }: {
  value: string; onCommit: (v: string) => void; placeholder?: string; className?: string;
}) {
  const { draft, setDraft, setEditing } = useDraft(value);
  return (
    <input
      className={'cm-cell ' + className} placeholder={placeholder} value={draft}
      onFocus={() => setEditing(true)}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); if (draft !== value) onCommit(draft); }}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { setDraft(value); setEditing(false); e.currentTarget.blur(); }
      }}
    />
  );
}

function NumCell({ value, onCommit, className = '' }: {
  value: number; onCommit: (v: number) => void; className?: string;
}) {
  const { draft, setDraft, setEditing } = useDraft(String(value));
  return (
    <input
      className={'cm-cell cm-num ' + className} inputMode="decimal" value={draft}
      onFocus={e => { setEditing(true); e.currentTarget.select(); }}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        // An emptied box means zero once you leave it, not while you are typing.
        const next = draft.trim() === '' ? 0 : num(draft);
        if (next !== value) onCommit(next);
        setDraft(String(next));
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); e.currentTarget.blur(); }
      }}
    />
  );
}

/** ADDING TEN OF SOMETHING SHOULD COST TEN TYPES, NOT TEN MOUSE TRIPS.
 *
 * Every add form used to leave focus wherever the submit put it — usually the
 * rate box — so the second program meant reaching for the mouse again. Somebody
 * entering a machine's twelve formats off a sheet of paper does that eleven
 * times. The cursor goes back to the first field instead. */
function useAddAgain() {
  const first = useRef<HTMLInputElement>(null);
  return { first, again: () => first.current?.focus() };
}

/** The one destructive control on the page, so it asks. A record typed by
 *  mistake has to be removable — until now nothing on this screen could be
 *  deleted, and a fat-fingered row counted against the verdict for ever. */
function Bin({ what, onGo }: { what: string; onGo: () => void }) {
  return (
    <button className="cm-bin" title={`Delete ${what}`} aria-label={`Delete ${what}`}
      onClick={() => { if (confirm(`Delete “${what}”? This cannot be undone.`)) onGo(); }}>×</button>
  );
}

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
      {/* Only the TABLE scrolls sideways on a phone, never the section. When the
          whole section was the scroller, pushing the table across took the
          heading and its one-line explanation with it, so you ended up reading
          an unlabelled grid of numbers. */}
      {children && <div className="cm-scroll">{children}</div>}
      <div className="cm-add">{add}</div>
    </section>
  );
}

/* ---------------------------------- programs --------------------------------- */

function Programs({ rows, cm, asset }: { rows: Program[]; cm: ReturnType<typeof useCommission>; asset?: string }) {
  const [title, setTitle] = useState('');
  const [rate, setRate] = useState('');
  const [runFor, setRunFor] = useState<string | null>(null);
  const { first, again } = useAddAgain();

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
          setTitle(''); setRate(''); again();
        }}>
          <input ref={first} placeholder="Product or format — 250g tray" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="cm-num" placeholder="rate" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} />
          <span className="cm-unit">ppm</span>
          <button className="btn" type="submit">Add program</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>Product</th><th className="r">Agreed</th><th className="r">Best run</th><th>Status</th><th /><th /></tr></thead>
          <tbody>
            {rows.map(p => {
              const st = programStatus(p);
              const best = bestRun(p);
              return (
                <Fragment key={p.id}>
                  <tr>
                    <td>{dot(stateOf(p))}</td>
                    <td>
                      <TextCell className="cm-wide" value={p.title} onCommit={v => v.trim() && void cm.save({ ...p, title: v.trim() })} />
                      {p.runs?.length ? <span className="cm-sub"> · {p.runs.length} run{p.runs.length > 1 ? 's' : ''}</span> : null}
                    </td>
                    <td className="r">
                      {/* The agreed rate is contractual, and it was static text — so a
                          6 typed for a 60 was permanent and every run after it read
                          as proven. */}
                      <NumCell value={p.agreedRate} onCommit={v => void cm.save({ ...p, agreedRate: v })} />
                      <span className="cm-unit">{p.rateUnit ?? 'ppm'}</span>
                    </td>
                    <td className="r">{best ? `${best.achieved}` : '—'}</td>
                    <td><span className={'cm-tag is-' + st}>{STATUS[st]}</span></td>
                    <td className="r">
                      <button className="btn btn-ghost btn-sm" onClick={() => setRunFor(runFor === p.id ? null : p.id)}>
                        Record a run
                      </button>
                    </td>
                    <td className="r"><Bin what={p.title} onGo={() => void cm.remove(p.id)} /></td>
                  </tr>
                  {runFor === p.id && (
                    <tr className="cm-runrow">
                      <td />
                      <td colSpan={6}><RunForm p={p} cm={cm} done={() => setRunFor(null)} /></td>
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
  const [unit, setUnit] = useState('');
  const { first, again } = useAddAgain();
  const WORD = { have: 'Have it', awaited: 'On order', short: 'Nothing ordered', late: 'Overdue' };

  return (
    <Section
      title="Materials" count={rows.length}
      sub="What the line cannot run without. Needed, have, on order, when."
      add={
        <form className="cm-add-f" onSubmit={e => {
          e.preventDefault();
          if (!title.trim()) return;
          // The unit was never askable, so every material read as a bare number —
          // "40" of something, on the sheet handed to the OEM. Rolls, cases, kg:
          // it is one word and it is the difference between a quantity and a
          // number.
          void cm.addMaterial(title, num(need), asset, unit.trim() || undefined);
          setTitle(''); setNeed(''); again();
        }}>
          <input ref={first} placeholder="Item — 980mm film" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="cm-num" placeholder="need" inputMode="numeric" value={need} onChange={e => setNeed(e.target.value)} />
          <input className="cm-unitin" placeholder="rolls" value={unit} onChange={e => setUnit(e.target.value)} />
          <button className="btn" type="submit">Add material</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>Item</th><th className="r">Need</th><th className="r">Have</th><th className="r">On order</th><th>Due</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map(m => (
              <tr key={m.id}>
                <td>{dot(stateOf(m))}</td>
                <td><TextCell className="cm-wide" value={m.title} onCommit={v => v.trim() && void cm.save({ ...m, title: v.trim() })} /></td>
                <td className="r">
                  <NumCell value={m.need} onCommit={v => void cm.save({ ...m, need: v })} />
                  <span className="cm-unit">{m.unit ?? ''}</span>
                </td>
                <td className="r"><NumCell value={m.have} onCommit={v => void cm.save({ ...m, have: v })} /></td>
                <td className="r"><NumCell value={m.onOrder ?? 0} onCommit={v => void cm.save({ ...m, onOrder: v })} /></td>
                <td>
                  <input className="cm-cell cm-date" type="date" value={m.due ?? ''}
                    onChange={e => void cm.save({ ...m, due: e.target.value || undefined })} />
                </td>
                <td><span className={'cm-tag is-' + stateOf(m)}>{WORD[materialStatus(m)]}</span></td>
                <td className="r"><Bin what={m.title} onGo={() => void cm.remove(m.id)} /></td>
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
  const { first, again } = useAddAgain();

  return (
    <Section
      title="Acceptance checks" count={rows.length}
      sub="The site acceptance tests, each with what good looks like and who witnessed it."
      add={
        <form className="cm-add-f" onSubmit={e => {
          e.preventDefault();
          if (!title.trim()) return;
          void cm.addCheck(title, criterion, asset);
          setTitle(''); setCriterion(''); again();
        }}>
          <input ref={first} placeholder="Test — emergency stops" value={title} onChange={e => setTitle(e.target.value)} />
          <input placeholder="What good looks like" value={criterion} onChange={e => setCriterion(e.target.value)} />
          <button className="btn" type="submit">Add check</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>Test</th><th>Criterion</th><th>Result</th><th>Witnessed</th><th /><th /></tr></thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id}>
                <td>{dot(stateOf(c))}</td>
                <td><TextCell value={c.title} onCommit={v => v.trim() && void cm.save({ ...c, title: v.trim() })} /></td>
                <td>
                  <TextCell className="cm-wide" placeholder="what good looks like" value={c.criterion}
                    onCommit={v => void cm.save({ ...c, criterion: v })} />
                </td>
                <td>
                  <TextCell className="cm-wide" placeholder="what happened" value={c.result ?? ''}
                    onCommit={v => void cm.save({ ...c, result: v || undefined })} />
                </td>
                <td>
                  <TextCell placeholder="who" value={c.witnessedBy ?? ''}
                    onCommit={v => void cm.save({ ...c, witnessedBy: v || undefined })} />
                </td>
                <td className="r cm-outcome">
                  {(['pass', 'fail', 'notRun'] as const).map(o => (
                    <button key={o} className={'btn btn-sm' + (c.outcome === o ? ' on' : ' btn-ghost')}
                      onClick={() => void cm.save({ ...c, outcome: o, at: o === 'notRun' ? undefined : Date.now() })}>
                      {o === 'pass' ? 'Pass' : o === 'fail' ? 'Fail' : 'Not run'}
                    </button>
                  ))}
                </td>
                <td className="r"><Bin what={c.title} onGo={() => void cm.remove(c.id)} /></td>
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
  const { first, again } = useAddAgain();

  return (
    <Section
      title="Punch list" count={rows.filter(isOpen).length}
      sub="Defects handed to whoever owns them. A blocks sign-off, B is fixed before production, C can follow."
      add={
        <form className="cm-add-f" onSubmit={e => {
          e.preventDefault();
          if (!title.trim()) return;
          void cm.addPunch(title, sev, asset);
          setTitle(''); again();
        }}>
          <input ref={first} placeholder="Defect — former roller misaligned" value={title} onChange={e => setTitle(e.target.value)} />
          <select value={sev} onChange={e => setSev(e.target.value as Severity)}>
            {(['A', 'B', 'C'] as const).map(s => <option key={s} value={s}>{SEV_WORD[s]}</option>)}
          </select>
          <button className="btn" type="submit">Add defect</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>Sev</th><th>Defect</th><th>Fix by</th><th /><th /></tr></thead>
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
                <td><TextCell className="cm-wide" value={p.title} onCommit={v => v.trim() && void cm.save({ ...p, title: v.trim() })} /></td>
                <td>
                  <TextCell placeholder="OEM / us" value={p.fixBy ?? ''}
                    onCommit={v => void cm.save({ ...p, fixBy: v || undefined })} />
                </td>
                <td className="r">
                  <button className={'btn btn-sm' + (isOpen(p) ? ' btn-ghost' : ' on')}
                    onClick={() => void cm.save({ ...p, closedAt: isOpen(p) ? Date.now() : undefined })}>
                    {isOpen(p) ? 'Close' : 'Closed'}
                  </button>
                </td>
                <td className="r"><Bin what={p.title} onGo={() => void cm.remove(p.id)} /></td>
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
  const { first, again } = useAddAgain();
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
          setTitle(''); again();
        }}>
          <input ref={first} placeholder="Obligation — operators trained on changeover" value={title} onChange={e => setTitle(e.target.value)} />
          <button className="btn" type="submit">Add</button>
        </form>
      }
    >
      {rows.length > 0 && (
        <table className="cm-t">
          <thead><tr><th /><th>What</th><th>Who</th><th /><th /></tr></thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id} className={t.state === 'done' ? 'cm-closed' : ''}>
                <td>{dot(stateOf(t))}</td>
                <td><TextCell className="cm-wide" value={t.title} onCommit={v => v.trim() && void cm.save({ ...t, title: v.trim() })} /></td>
                <td>
                  <TextCell placeholder="who" value={t.owner ?? ''}
                    onCommit={v => void cm.save({ ...t, owner: v || undefined })} />
                </td>
                <td className="r cm-outcome">
                  {STATES.map(s => (
                    <button key={s} className={'btn btn-sm' + (t.state === s ? ' on' : ' btn-ghost')}
                      onClick={() => void cm.save({ ...t, state: s })}>{WORD[s]}</button>
                  ))}
                </td>
                <td className="r"><Bin what={t.title} onGo={() => void cm.remove(t.id)} /></td>
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

  /* MACHINES YOU HAVE NAMED BUT NOT YET PUT ANYTHING ON.
   *
   * An asset is not a record of its own — it is the name its items carry, which
   * is why there is no machine table, no migration and nothing extra to sync. It
   * also meant there was NO WAY TO CREATE ONE: on a fresh project the bar was
   * empty, every add landed on "the line itself", and the spine of the whole
   * model was unreachable. You could read a handover organised by machine and
   * never write one.
   *
   * So a machine can exist here for as long as it takes to type the first thing
   * onto it. Nothing is stored: name it, add a program, and from then on the
   * items carry it themselves. */
  const [named, setNamed] = useState<string[]>([]);
  const tabs = useMemo(() => {
    const real = assets.map(a => a.asset);
    const extra = named.filter(n => !real.includes(n));
    // The line's own work sits last, after the machines, exactly as it does on
    // the A3 — and it is always offered, so there is always somewhere to put the
    // training and the safety file.
    return [...real.filter(a => a !== LINE_ITSELF), ...extra, LINE_ITSELF];
  }, [assets, named]);

  /* Default to the first machine that has something wrong with it. Opening on a
     machine that is finished is a page that has hidden the news. */
  const current = asset ?? assets.find(a => !a.ready.canSignOff)?.asset ?? tabs[0];
  const here = assets.find(a => a.asset === current);
  const shown = here?.items ?? [];
  const forAsset = current === LINE_ITSELF ? undefined : current;
  const nothingYet = cm.items.filter(i => !i.deletedAt).length === 0;

  const addMachine = () => {
    const name = prompt('What is the machine called?\n\ne.g. Brillopack bagger, Ishida multihead')?.trim();
    if (!name || name === LINE_ITSELF) return;
    setNamed(n => (n.includes(name) ? n : [...n, name]));
    setAsset(name);
  };

  /** Renaming a machine moves everything standing on it, because the name IS the
   *  link. Typing it wrong once and living with it for the whole handover is not
   *  a reasonable thing to ask. */
  const renameMachine = async () => {
    if (!current || current === LINE_ITSELF) return;
    const name = prompt('Rename this machine', current)?.trim();
    if (!name || name === current) return;
    for (const i of cm.items.filter(i => i.asset === current)) await cm.save({ ...i, asset: name });
    setNamed(n => n.map(x => (x === current ? name : x)));
    setAsset(name);
  };

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

      {/* ONE MACHINE AT A TIME, AND ALWAYS VISIBLE.
          The bar used to appear only once a second machine existed, so on the
          way to having one it was invisible — and it is the control that decides
          where everything you type lands. A page whose most consequential choice
          is hidden until you have already made it is not a choice. */}
      <nav className="cm-assets" aria-label="Machine">
        {tabs.map(name => {
          const a = assets.find(x => x.asset === name);
          return (
            <button key={name}
              className={'cm-asset' + (name === current ? ' on' : '') + (name === LINE_ITSELF ? ' is-line' : '')}
              onClick={() => setAsset(name)}>
              <span className="cm-asset-n">{name}</span>
              <span className="cm-asset-s">
                {!a ? 'nothing on it yet' : a.ready.canSignOff ? 'ready' : `${a.ready.blockers.length} open`}
              </span>
            </button>
          );
        })}
        <button className="cm-asset cm-asset-add" onClick={addMachine}>
          <span className="cm-asset-n">+ Machine</span>
          <span className="cm-asset-s">bagger, checkweigher…</span>
        </button>
      </nav>

      {/* What you are about to type onto, said in words rather than left to the
          highlighted tab — this is the line everything below it inherits. */}
      <p className="cm-where">
        Adding to <b>{current}</b>
        {current !== LINE_ITSELF && <> · <button className="cm-link" onClick={() => void renameMachine()}>rename</button></>}
      </p>

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
