/* THE PLAN FOR TODAY — agreed at the morning huddle, ticked through the day.
 *
 * Rowland, 7 October: "every day I almost have a huddle, and at the start we
 * kind of go, okay, so what are we planning to do today? Let's agree that,
 * and then let's move forward. It could be the same sort of thing as the
 * notes."
 *
 * The top of The day. Three ways a line gets on it, all one tap or one line:
 * what the last huddle left undone (carried over), what the plan already has
 * due today (a stage, a test, a fix — added as a line about that record), or
 * typed. Each line: what, whose, done. A line about a record is a branch off
 * it — the drawer says "On today's plan". How the plan went is in the day's
 * story and on Today's update (lib/day), so the evening reads against the
 * morning. Everything here can be changed or taken off. */
import { useState } from 'react';
import { live, WHOLE_JOB, type Test, type TestItem } from '../lib/testing';
import { leftFrom, planCount, planFor, TODAY_KIND } from '../lib/huddle';
import { niceDay } from '../lib/weeks';
import { uid } from '../lib/ids';
import { deleteTestItem } from '../db';
import { offerUndo } from './Undo';
import { openRecord } from './RecordDrawer';
import { Icon } from './Icon';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';

type TT = ReturnType<typeof useTesting>;

export function DayPlan({ projectId, today, tt, can, due }: {
  projectId: string; today: string; tt: TT; can: Can;
  /** What the plan already has due or under way today — offered first. */
  due: Test[];
}) {
  const plan = planFor(tt.items, today);
  const left = leftFrom(tt.items, today);
  const [what, setWhat] = useState('');
  const [who, setWho] = useState('');
  const [about, setAbout] = useState(WHOLE_JOB);
  const [editing, setEditing] = useState<{ id: string; what: string; owner: string } | null>(null);
  const tests = live(tt.tests);
  const machine = (t?: Test) => tt.assets.find(a => a.id === t?.assetId)?.name;
  const named = (t: Test) => (t.kind === 'install' ? `${machine(t) ?? 'The line'} — ${t.title}` : t.title);
  const onIt = new Set(plan.map(i => i.testId).filter(Boolean));
  const offer = due.filter(t => !onIt.has(t.id)).slice(0, 8);
  /* Everyone named on the job, for the "who" box. */
  const names = [...new Set([...tests.map(t => t.withWhom?.trim()), ...live(tt.assets).map(a => a.oem?.trim()),
    ...live(tt.items).filter(i => i.kind === TODAY_KIND).map(i => i.owner?.trim())].filter((x): x is string => !!x))].sort();
  /* What a line can be about: the job, or a stage, test or fix not yet done. */
  const open = tests.filter(t => t.outcome !== 'passed').sort((a, b) => (a.plannedFor ?? '9').localeCompare(b.plannedFor ?? '9') || a.sort - b.sort);
  const nextSort = () => plan.reduce((n, i) => Math.max(n, i.sort), 0) + 1;

  const put = async (lines: { what: string; testId?: string; owner?: string; fromItemId?: string }[], said: string) => {
    const at = Date.now();
    let sort = nextSort();
    const made: string[] = [];
    for (const l of lines) {
      const id = uid();
      await tt.saveItem({
        id, projectId, testId: l.testId ?? WHOLE_JOB, kind: TODAY_KIND, what: l.what, due: today,
        ...(l.owner ? { owner: l.owner } : {}), ...(l.fromItemId ? { fromItemId: l.fromItemId } : {}),
        sort: sort++, createdAt: at, updatedAt: at,
      });
      made.push(id);
    }
    offerUndo(said, async () => { for (const id of made) await deleteTestItem(id); });
  };
  const add = () => {
    const w = what.trim();
    if (!w) return;
    void put([{ what: w, ...(about ? { testId: about } : {}), ...(who.trim() ? { owner: who.trim() } : {}) }], `On today’s plan: “${w}”`);
    setWhat(''); setWho(''); setAbout(WHOLE_JOB);
  };
  const tick = (i: TestItem) => {
    const was = i.doneAt != null;
    void tt.saveItem({ ...i, doneAt: was ? undefined : Date.now() });
    offerUndo(was ? `“${i.what}” — not done` : `“${i.what}” — done`, () => tt.saveItem(i));
  };
  const save = (i: TestItem, e: NonNullable<typeof editing>) => {
    const w = e.what.trim(), o = e.owner.trim() || undefined;
    if (w && (w !== i.what || o !== i.owner)) { void tt.saveItem({ ...i, what: w, owner: o }); offerUndo('Changed', () => tt.saveItem(i)); }
    setEditing(null);
  };
  const remove = async (i: TestItem) => offerUndo(`Took “${i.what}” off today’s plan`, await deleteTestItem(i.id));
  const about_ = (i: TestItem) => tests.find(t => t.id === i.testId);

  if (!plan.length && !can.edit) return null;
  return (
    <section className="cmp-sec dp">
      <div className="cw-sec-h">
        <h2 className="cmp-h">The plan for today</h2>
        <span className="cmp-h-n">{plan.length ? planCount(plan) : 'agreed at the huddle'}</span>
      </div>

      {/* WHAT THE LAST HUDDLE LEFT UNDONE — carried over as new lines; the
          old day still says it was not done then. */}
      {can.edit && left && (
        <div className="dp-left">
          <span><b>Not done from {niceDay(left.day, { weekday: 'short' })}:</b> {left.lines.map(i => i.what).join(' · ')}</span>
          <button className="btn btn-sm" onClick={() => void put(left.lines.map(i => ({ what: i.what, testId: i.testId || undefined, owner: i.owner, fromItemId: i.id })),
            `Carried ${left.lines.length} over from ${niceDay(left.day, { weekday: 'short' })}`)}>Carry {left.lines.length === 1 ? 'it' : `all ${left.lines.length}`} over</button>
        </div>
      )}

      {plan.length > 0 && (
        <ul className="dp-list">
          {plan.map(i => {
            const on = about_(i);
            return (
              <li key={i.id} className={'dp-row' + (i.doneAt != null ? ' is-done' : '')}>
                {editing?.id === i.id ? (
                  <form className="dp-edit" onSubmit={e => { e.preventDefault(); save(i, editing); }}>
                    <input className="text-input" value={editing.what} autoFocus aria-label="What" onChange={e => setEditing({ ...editing, what: e.target.value })} />
                    <input className="text-input dp-who" list="dp-names" value={editing.owner} placeholder="Who" aria-label="Who" onChange={e => setEditing({ ...editing, owner: e.target.value })} />
                    <button type="submit" className="btn btn-sm btn-primary">Save</button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <label className="dp-tick">
                      <input type="checkbox" checked={i.doneAt != null} disabled={!can.edit} onChange={() => tick(i)} />
                      <span className="dp-what">{i.what}{i.owner && <span className="sub"> — {i.owner}</span>}</span>
                    </label>
                    <span className={'dp-state' + (i.doneAt != null ? ' is-g' : ' is-w')}>{i.doneAt != null ? 'done' : 'to do'}</span>
                    {on && <button className="cw-link dp-on" onClick={() => openRecord(projectId, on.id)}>{named(on) === i.what.trim() ? 'Open it' : named(on)} ›</button>}
                    {can.edit && (
                      <span className="sp-row-acts">
                        <button className="cw-link" onClick={() => setEditing({ id: i.id, what: i.what, owner: i.owner ?? '' })}>Edit</button>
                        {can.remove && <button className="cw-link sp-rm" onClick={() => void remove(i)}>Delete</button>}
                      </span>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {can.edit && (
        <>
          {/* WHAT THE PLAN HAS DUE TODAY, one tap each — the huddle starts
              from the plan, not a blank page. */}
          {offer.length > 0 && (
            <div className="dp-offer">
              <span className="sub">Due or under way today:</span>
              {offer.map(t => (
                <button key={t.id} className="chip dp-chip" onClick={() => void put([{ what: named(t), testId: t.id, ...(t.withWhom ? { owner: t.withWhom } : {}) }], `On today’s plan: “${named(t)}”`)}>
                  <Icon name="plus" size="0.9em" /> {named(t)}
                </button>
              ))}
            </div>
          )}
          <form className="dp-add" onSubmit={e => { e.preventDefault(); add(); }}>
            <input className="text-input dp-what-in" value={what} placeholder="What are we doing today? — e.g. Load the Express programs"
              aria-label="Add to today's plan" onChange={e => setWhat(e.target.value)} />
            <input className="text-input dp-who" list="dp-names" value={who} placeholder="Who" aria-label="Who" onChange={e => setWho(e.target.value)} />
            <select className="text-input dp-about" value={about} aria-label="What it is about" onChange={e => setAbout(e.target.value)}>
              <option value={WHOLE_JOB}>The whole job</option>
              {open.map(t => <option key={t.id} value={t.id}>{named(t)}</option>)}
            </select>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!what.trim()}>Add</button>
          </form>
          <datalist id="dp-names">{names.map(n => <option key={n} value={n} />)}</datalist>
        </>
      )}
    </section>
  );
}
