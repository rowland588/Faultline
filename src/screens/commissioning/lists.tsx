/* THE FIVE LISTS A COMMISSIONING STAGE IS MADE OF.
 *
 * Programs, materials, acceptance checks, the punch list, and everything else.
 * They are the DETAIL of a gate, not the front page: the project screen leads
 * with the programme and its dates, and you reach these by opening the stage
 * they belong to. Putting them first was the mistake that made a commissioning
 * project look like a spreadsheet with no time in it.
 *
 * Shared by the gate screen and anywhere else a scoped list is wanted, which is
 * why they live here rather than inside one screen.
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import { useCommission } from '../../lib/useCommission';
import {
  programStatus, materialStatus, bestRun, isOpen,
  stateOf, STATE_WORD,
  type Program, type Material, type Check, type Punch, type Task,
  type Severity, type ReadyState,
} from '../../lib/commissioning';

export const dot = (s: ReadyState) => <span className={'cm-dot is-' + s} title={STATE_WORD[s]} />;
export const num = (v: string): number => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

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

export function TextCell({ value, onCommit, placeholder, className = '' }: {
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

export function NumCell({ value, onCommit, className = '' }: {
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
export function useAddAgain() {
  const first = useRef<HTMLInputElement>(null);
  return { first, again: () => first.current?.focus() };
}

/** The one destructive control on the page, so it asks. A record typed by
 *  mistake has to be removable — until now nothing on this screen could be
 *  deleted, and a fat-fingered row counted against the verdict for ever. */
export function Bin({ what, onGo }: { what: string; onGo: () => void }) {
  return (
    <button className="cm-bin" title={`Delete ${what}`} aria-label={`Delete ${what}`}
      onClick={() => { if (confirm(`Delete “${what}”? This cannot be undone.`)) onGo(); }}>×</button>
  );
}

/** A section that only appears once it has something in it, plus its add row.
 *  An empty list with a heading is a page telling you about work you have not
 *  started; the add row is enough. */
export function Section({ title, sub, count, children, add }: {
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

export function Programs({ rows, cm, asset, phaseId }: { rows: Program[]; cm: ReturnType<typeof useCommission>; asset?: string; phaseId?: string }) {
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
          void cm.addProgram(title, num(rate), asset, undefined, phaseId);
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

export function Materials({ rows, cm, asset, phaseId }: { rows: Material[]; cm: ReturnType<typeof useCommission>; asset?: string; phaseId?: string }) {
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
          void cm.addMaterial(title, num(need), asset, unit.trim() || undefined, phaseId);
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

export function Checks({ rows, cm, asset, phaseId }: { rows: Check[]; cm: ReturnType<typeof useCommission>; asset?: string; phaseId?: string }) {
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
          void cm.addCheck(title, criterion, asset, phaseId);
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

export function PunchList({ rows, cm, asset, phaseId }: { rows: Punch[]; cm: ReturnType<typeof useCommission>; asset?: string; phaseId?: string }) {
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
          void cm.addPunch(title, sev, asset, phaseId);
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

export function Tasks({ rows, cm, asset, phaseId }: { rows: Task[]; cm: ReturnType<typeof useCommission>; asset?: string; phaseId?: string }) {
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
          void cm.addTask(title, asset, phaseId);
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
