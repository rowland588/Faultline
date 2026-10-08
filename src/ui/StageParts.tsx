/* PART OF THE PLAN — the lines a stage is made of, that are not problems.
 *
 * Rowland, 6 October: "Part of our issues is also pressing the stage 'hit a
 * problem' — perhaps write a note that it is part of the plan, for example
 * programs: write a subsection, 'Panels to run Express 1.25 kg'. This helps
 * tie in what are problems, fixes and subsections of a plan."
 *
 * "Hit a problem" was the only way to write anything on a stage, so planned
 * work went in as a problem and the stage turned red. These are the stage's
 * own parts: a line each, ticked when done, never a problem. No new record —
 * the item kind 'next' ("what we do next") already held exactly this: words,
 * an owner, a day, done. Everything here can be changed or taken off.
 *
 * A DAY AND A WHO, when it has them (6 October): "— Ilapak UK · by 9 Oct" on
 * the line, and its state in words in the house colours — late red, due soon
 * amber, done green, to do plain. A part with a day is owed like anything
 * else: it is on Needs you, the control room's week and the day's story, and
 * its stage's square carries it as a branch (lib/noted owedParts, partsSaid).
 * The one-line add stays one line; the day and the who fold behind a link.
 *
 * ITS STATUS, WITH WHAT WAS SEEN (8 October): "in programs we need to show
 * status of program, not just problem — pass, fail, baseline achieved ... I
 * need status with commentary." Status, beside Hit a problem: baseline
 * achieved, passed or failed, and what was seen. The newest is said under the
 * line in its colour; the ones before it fold behind "N earlier". Passed
 * ticks it done. A failed one is on the gate's Needs you, the plan (screen
 * and paper), the day, and both reports as "Didn't pass" (lib/noted). */
import { useState } from 'react';
import type { PartResultIs, Test, TestItem } from '../lib/testing';
import { live } from '../lib/testing';
import { RESULT_WORD, partLate, partMoved, partsOf, resultNow, resultWords, saidResult } from '../lib/noted';
import { addDays, niceDay, todayISO } from '../lib/weeks';
import { DUE_SOON_DAYS } from '../lib/actions';
import { isWholeDate } from './DateInput';
import { offerUndo } from './Undo';
import { deleteTestItem } from '../db';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';

type TT = ReturnType<typeof useTesting>;
type Draft = { id: string; what: string; owner: string; due: string };

/** How a part stands, in words and in one of the house colours. A problem
 *  written on it and not sorted is the louder fact, as it is on a stage; then
 *  its status when it has one (lib/noted resultNow) — passed green, failed
 *  red, baseline achieved indigo, under way. */
function stateOf(p: TestItem, today: string, openProblems = 0): { word: string; tone: 'g' | 'r' | 'a' | 'w' | 'n' } {
  if (openProblems > 0 && p.doneAt == null) return { word: openProblems === 1 ? 'a problem' : `${openProblems} problems`, tone: 'r' };
  const r = resultNow(p);
  if (p.doneAt != null) return { word: r ? resultWords(r) : `done ${niceDay(todayISO(new Date(p.doneAt)))}`, tone: 'g' };
  if (r?.is === 'failed') return { word: resultWords(r), tone: 'r' };
  if (partLate(p, today)) return { word: r ? `late · ${RESULT_WORD[r.is]}` : 'late', tone: 'r' };
  if (r) return { word: resultWords(r), tone: 'w' };
  if (p.due && p.due <= addDays(today, DUE_SOON_DAYS)) {
    return { word: p.due === today ? 'due today' : p.due === addDays(today, 1) ? 'due tomorrow' : 'due soon', tone: 'a' };
  }
  return { word: 'to do', tone: 'n' };
}

/** The three a part can be said to be — in the order work goes. */
const RESULTS: PartResultIs[] = ['baseline', 'passed', 'failed'];
const RESULT_TONE: Record<PartResultIs, 'w' | 'g' | 'r'> = { baseline: 'w', passed: 'g', failed: 'r' };

/** A STAGE'S PARTS AS A BRANCH OFF IT — on its square, its phone card row and
 *  beside its state in the drawer: "2 parts · 1 done", and "· 1 late" in red
 *  when one is. Only the abnormal number carries colour (CLAUDE.md). */
export function PartsMark({ said, className }: { said?: { head: string; late: number; failed?: number }; className?: string }) {
  if (!said) return null;
  return (
    <span className={'pt-mark' + (className ? ` ${className}` : '')}>
      {said.head}{(said.failed ?? 0) > 0 && <> · <b className="pt-late">{said.failed} failed</b></>}{said.late > 0 && <> · <b className="pt-late">{said.late} late</b></>}
    </span>
  );
}

export function StageParts({ step, tt, can, onProblem }: {
  step: Test; tt: Pick<TT, 'items' | 'tests' | 'assets' | 'addItem' | 'saveItem'>; can: Can;
  /** HIT A PROBLEM ON A PART — the stage's own write-up (ui/WhyMoved
   *  ProblemForm), opened for this part. Rowland, 8 October: "I want to click
   *  on the subsection and write the problem in the subsection ... exactly the
   *  same as have a problem, write it up." */
  onProblem?: (part: TestItem) => void;
}) {
  const parts = partsOf(step.id, tt.items);
  /* The problems written on each part (kept on the problem as fromItemId). */
  const problemsOf = (p: TestItem) => live(tt.items).filter(i => i.kind === 'found' && i.testId === step.id && i.fromItemId === p.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  const today = todayISO();
  const [adding, setAdding] = useState('');
  /* The day and the who, folded until asked for. */
  const [more, setMore] = useState(false);
  const [by, setBy] = useState('');
  const [who, setWho] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  /* SAY ITS STATUS — the part being said, what it is, and what was seen. */
  const [stating, setStating] = useState<{ id: string; is?: PartResultIs; note: string } | null>(null);
  /* The parts whose earlier statuses are open. */
  const [story, setStory] = useState<Set<string>>(new Set());
  if (!parts.length && !can.edit) return null;

  /* Everyone named anywhere on the job, for the "who" box. */
  const names = [...new Set([
    ...live(tt.tests).map(t => t.withWhom?.trim()),
    ...live(tt.assets).map(a => a.oem?.trim()),
    ...live(tt.items).filter(i => i.kind === 'next').map(i => i.owner?.trim()),
  ].filter((x): x is string => !!x))].sort();
  /* A half-typed year is never kept (ui/DateInput, HUNT 25). */
  const day = (v: string) => (v && isWholeDate(v) ? v : undefined);

  const add = () => {
    const what = adding.trim();
    if (!what) return;
    void tt.addItem(step.id, 'next', what, { owner: who.trim() || undefined, due: day(by) });
    setAdding(''); setBy(''); setWho(''); setMore(false);
  };
  const toggle = (p: TestItem) => {
    void tt.saveItem({ ...p, doneAt: p.doneAt != null ? undefined : Date.now() });
    offerUndo(p.doneAt != null ? `“${p.what}” — not done` : `“${p.what}” — done`, () => tt.saveItem(p));
  };
  const save = (p: TestItem, d: Draft) => {
    const what = d.what.trim();
    const owner = d.owner.trim() || undefined;
    const due = d.due ? day(d.due) ?? p.due : undefined;
    if (what && (what !== p.what || owner !== p.owner || due !== p.due)) {
      void tt.saveItem({ ...p, what, owner, due });
      offerUndo('Changed', () => tt.saveItem(p));
    }
    setEditing(null);
  };
  const remove = async (p: TestItem) => offerUndo(`Took off “${p.what}”`, await deleteTestItem(p.id));
  const state = (p: TestItem, is: PartResultIs, note: string) => {
    void tt.saveItem(saidResult(p, is, note));
    offerUndo(`“${p.what}” — ${RESULT_WORD[is]}`, () => tt.saveItem(p));
    setStating(null);
  };
  /* ▲ ▼ — the parts in the order the person wants them (lib/noted partMoved). */
  const move = (p: TestItem, by: -1 | 1) => { for (const x of partMoved(step.id, tt.items, p.id, by)) void tt.saveItem(x); };

  return (
    <div className="rd-blk sp-parts">
      {/* How many, and how many done, is said once — beside the stage's state
          at the top of the drawer (ui/RecordDrawer). */}
      <small>Part of the plan</small>
      {parts.length > 0 && (
        <ul className="spp-list">
          {parts.map((p, k) => {
            const probs = problemsOf(p);
            const st = stateOf(p, today, probs.filter(x => x.doneAt == null).length);
            /* The status it stands on, and every one said before, newest first. */
            const said = resultNow(p);
            const earlier = (p.results ?? []).filter(r => r !== said).slice().reverse();
            const meta = [p.owner?.trim(), p.due && p.doneAt == null ? `by ${niceDay(p.due)}` : ''].filter(Boolean).join(' · ');
            return (
              <li key={p.id} className={'spp-row' + (p.doneAt != null ? ' is-done' : '')}>
                {editing?.id === p.id ? (
                  <form className="spp-edit" onSubmit={e => { e.preventDefault(); save(p, editing); }}>
                    <input className="spp-what" value={editing.what} autoFocus aria-label="The part" onChange={e => setEditing({ ...editing, what: e.target.value })} />
                    <label className="spp-f"><span>Who</span>
                      <input list="spp-names" value={editing.owner} placeholder="Ilapak UK" onChange={e => setEditing({ ...editing, owner: e.target.value })} /></label>
                    <label className="spp-f"><span>By</span>
                      <input type="date" value={editing.due} onChange={e => setEditing({ ...editing, due: e.target.value })} /></label>
                    <span className="spp-acts">
                      <button type="submit" className="btn btn-sm btn-primary">Save</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                    </span>
                  </form>
                ) : (
                  <>
                    {can.edit && parts.length > 1 && (
                      <span className="pg-move is-inline" role="group" aria-label={`Move ${p.what}`}>
                        <button type="button" className="pg-move-b" disabled={k === 0} aria-label={`Move ${p.what} up`} onClick={() => move(p, -1)}>▲</button>
                        <button type="button" className="pg-move-b" disabled={k === parts.length - 1} aria-label={`Move ${p.what} down`} onClick={() => move(p, 1)}>▼</button>
                      </span>
                    )}
                    <label className="spp-tick">
                      <input type="checkbox" checked={p.doneAt != null} disabled={!can.edit} onChange={() => toggle(p)} />
                      <span>{p.what}{meta && <span className="spp-meta"> — {meta}</span>}</span>
                    </label>
                    {/* The state beside the line — unless it is the status,
                        which is said once, with its commentary, under it. */}
                    {(!said || st.word !== resultWords(said)) && <span className={'spp-state is-' + st.tone}>{st.word}</span>}
                    {/* ITS STATUS AND WHAT WAS SEEN under the line, and the ones
                        said before it one tap away — newest first. */}
                    {said && (
                      <p className="spp-said"><b className={'is-' + RESULT_TONE[said.is]}>{resultWords(said)}</b>{said.note ? ` — ${said.note}` : ''}</p>
                    )}
                    {earlier.length > 0 && (
                      <button type="button" className="cw-link spp-story" aria-expanded={story.has(p.id)}
                        onClick={() => setStory(o => { const n = new Set(o); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}>
                        {story.has(p.id) ? 'Hide' : `${earlier.length} earlier`}
                      </button>
                    )}
                    {story.has(p.id) && (
                      <ul className="spp-earlier">
                        {earlier.map(r => (
                          <li key={r.at}><b className={'is-' + RESULT_TONE[r.is]}>{resultWords(r)}</b>{r.note ? ` — ${r.note}` : ''}</li>
                        ))}
                      </ul>
                    )}
                    {can.edit && (
                      <span className="sp-row-acts">
                        <button type="button" className="cw-link spp-stat" onClick={() => setStating({ id: p.id, note: '' })}>Status</button>
                        {onProblem && <button type="button" className="cw-link spp-prob" onClick={() => onProblem(p)}>Hit a problem</button>}
                        <button type="button" className="cw-link" onClick={() => setEditing({ id: p.id, what: p.what, owner: p.owner ?? '', due: p.due ?? '' })}>Edit</button>
                        {/* Taking a line off is the owner's (lib/access) — the database keeps it for anyone else. */}
                        {can.remove && <button type="button" className="cw-link sp-rm" onClick={() => void remove(p)}>Delete</button>}
                      </span>
                    )}
                    {stating?.id === p.id && (
                      <form className="spp-statf" onSubmit={e => { e.preventDefault(); if (stating.is) state(p, stating.is, stating.note); }}>
                        <span className="spp-pick" role="group" aria-label={`How ${p.what} stands`}>
                          {RESULTS.map(is => (
                            <button key={is} type="button" className={'spp-opt is-' + RESULT_TONE[is] + (stating.is === is ? ' is-on' : '')}
                              aria-pressed={stating.is === is} onClick={() => setStating({ ...stating, is })}>{RESULT_WORD[is][0].toUpperCase() + RESULT_WORD[is].slice(1)}</button>
                          ))}
                        </span>
                        <textarea className="spp-note" rows={2} value={stating.note} aria-label="What you saw"
                          placeholder="What you saw — e.g. Running 32 ppm at baseline settings, film tracking still to tune"
                          onChange={e => setStating({ ...stating, note: e.target.value })} />
                        <span className="spp-acts">
                          <button type="submit" className="btn btn-sm btn-primary" disabled={!stating.is}>Save</button>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setStating(null)}>Cancel</button>
                        </span>
                      </form>
                    )}
                    {/* ITS PROBLEMS, as a branch under it — what, and how it
                        stands; the whole story is under "What happened". */}
                    {probs.length > 0 && (
                      <ul className="spp-probs">
                        {probs.map(x => (
                          <li key={x.id} className={x.doneAt == null ? 'is-open' : 'is-sorted'}>
                            <b>Problem:</b> {x.what}{x.hoursLost ? ` · ${x.hoursLost} h lost` : ''} · {x.doneAt == null ? 'open' : 'sorted'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {can.edit && (
        <form className="spp-add" onSubmit={e => { e.preventDefault(); add(); }}>
          <input value={adding} placeholder="Add a part — e.g. Panels to run Express 1.25 kg" aria-label="Add a part of the plan" onChange={e => setAdding(e.target.value)} />
          <button type="submit" className="btn btn-sm" disabled={!adding.trim()}>Add</button>
          {more ? (
            <span className="spp-more">
              <label className="spp-f"><span>Who</span>
                <input list="spp-names" value={who} placeholder="Ilapak UK" onChange={e => setWho(e.target.value)} /></label>
              <label className="spp-f"><span>By</span>
                <input type="date" value={by} aria-label="By when" onChange={e => setBy(e.target.value)} /></label>
            </span>
          ) : (
            <button type="button" className="cw-link spp-open" onClick={() => setMore(true)}>add a day or who</button>
          )}
        </form>
      )}
      {can.edit && <datalist id="spp-names">{names.map(n => <option key={n} value={n} />)}</datalist>}
      {!parts.length && can.edit && <p className="sub spp-why">Planned work inside this stage. Not a problem — a problem is for what went wrong.</p>}
    </div>
  );
}
