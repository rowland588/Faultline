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
import { isProgramsStage } from '../lib/programs';
import { RESULT_WORD, editedResult, lastResult, partMoved, partStatus, partsOf, resultNow, resultWords, withoutResult } from '../lib/noted';
import { niceDay, todayISO } from '../lib/weeks';
import { DUE_SOON_DAYS } from '../lib/actions';
import { isWholeDate } from './DateInput';
import { offerUndo } from './Undo';
import { deleteTestItem } from '../db';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';

type TT = ReturnType<typeof useTesting>;
type Draft = { id: string; what: string; owner: string; due: string; is?: PartResultIs; note: string };

/** How a part stands — lib/noted partStatus, the one rule the plan, the
 *  programs and the reports read too. A status is the work done on its day:
 *  "baseline achieved — done 8 Oct". */
const stateOf = (p: TestItem, today: string, openProblems = 0) => partStatus(p, today, openProblems, DUE_SOON_DAYS);

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

export function StageParts({ step, tt, can, onProblem, only }: {
  step: Test; tt: Pick<TT, 'items' | 'tests' | 'assets' | 'addItem' | 'saveItem'>; can: Can;
  /** HIT A PROBLEM ON A PART — the stage's own write-up (ui/WhyMoved
   *  ProblemForm), opened for this part. Rowland, 8 October: "I want to click
   *  on the subsection and write the problem in the subsection ... exactly the
   *  same as have a problem, write it up." */
  onProblem?: (part: TestItem) => void;
  /** Only these, when the list is filtered (screens/ProgramsPage) — ▲ ▼ are
   *  offered only on the whole list, so a move is never to a place unseen. */
  only?: (p: TestItem) => boolean;
}) {
  const all = partsOf(step.id, tt.items);
  const parts = only ? all.filter(only) : all;
  /* On Set up's programs stage its parts ARE the programs — said so, here
     and on the Programs page that lists them (screens/ProgramsPage). */
  const prog = isProgramsStage(step);
  /* The problems written on each part (kept on the problem as fromItemId). */
  const problemsOf = (p: TestItem) => live(tt.items).filter(i => i.kind === 'found' && i.testId === step.id && i.fromItemId === p.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  const today = todayISO();
  const [adding, setAdding] = useState('');
  /* The day and the who, folded until asked for. */
  const [more, setMore] = useState(false);
  const [by, setBy] = useState('');
  const [who, setWho] = useState('');
  /* ONE PART OPEN AT A TIME, and everything about it in one form — how it
     stands and what was seen, its name, who and by when. Rowland, 8 October:
     "I don't have ability to edit the status commentary — you only allow the
     title — and all of that UI is very confusing." The list shows the state;
     the tools come out on the line being worked on (CLAUDE.md, simplicity 2). */
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  if (!all.length && !can.edit) return null;

  /* Everyone named anywhere on the job, for the "who" box. */
  const names = [...new Set([
    ...live(tt.tests).map(t => t.withWhom?.trim()),
    ...live(tt.assets).map(a => a.oem?.trim()),
    ...live(tt.items).filter(i => i.kind === 'next').map(i => i.owner?.trim()),
  ].filter((x): x is string => !!x))].sort();
  /* A half-typed year is never kept (ui/DateInput, HUNT 25). */
  const day = (v: string) => (v && isWholeDate(v) ? v : undefined);
  const noun = prog ? 'program' : 'part';

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
  const openIt = (p: TestItem) => {
    if (open === p.id) { setOpen(null); setDraft(null); return; }
    const last = lastResult(p);
    setOpen(p.id);
    setDraft({ id: p.id, what: p.what, owner: p.owner ?? '', due: p.due ?? '', ...(last ? { is: last.is } : {}), note: last?.note ?? '' });
  };
  /* One Save for all of it (lib/noted editedResult decides what a status
     change keeps). */
  const save = (p: TestItem, d: Draft) => {
    let next: TestItem = p;
    const what = d.what.trim() || p.what;
    const owner = d.owner.trim() || undefined;
    const due = d.due ? day(d.due) ?? p.due : undefined;
    if (what !== p.what || owner !== p.owner || due !== p.due) next = { ...next, what, owner, due };
    if (d.is) next = editedResult(next, d.is, d.note);
    if (next !== p) {
      void tt.saveItem(next);
      offerUndo(`“${what}” — saved`, () => tt.saveItem(p));
    }
    setOpen(null); setDraft(null);
  };
  const remove = async (p: TestItem) => { setOpen(null); offerUndo(`Took off “${p.what}”`, await deleteTestItem(p.id)); };
  const unsay = (p: TestItem, at: number) => {
    const next = withoutResult(p, at);
    void tt.saveItem(next);
    offerUndo('Status taken off', () => tt.saveItem(p));
  };
  /* ▲ ▼ — the parts in the order the person wants them (lib/noted partMoved). */
  const move = (p: TestItem, by: -1 | 1) => { for (const x of partMoved(step.id, tt.items, p.id, by)) void tt.saveItem(x); };

  return (
    <div className="rd-blk sp-parts">
      {/* How many, and how many done, is said once — beside the stage's state
          at the top of the drawer (ui/RecordDrawer). */}
      <small>{prog ? 'Programs on this machine' : 'Part of the plan'}</small>
      {parts.length > 0 && (
        <ul className="spp-list">
          {parts.map((p, k) => {
            const probs = problemsOf(p);
            const openProbs = probs.filter(x => x.doneAt == null).length;
            const st = stateOf(p, today, openProbs);
            /* The status it stands on — said with what was seen under its name. */
            const said = resultNow(p);
            const history = (p.results ?? []).slice().reverse();
            const meta = [p.owner?.trim(), p.due && !st.done ? `by ${niceDay(p.due)}` : ''].filter(Boolean).join(' · ');
            const isOpen = open === p.id && !!draft;
            const last = lastResult(p);
            return (
              <li key={p.id} className={'spp-row' + (st.done ? ' is-done' : '') + (isOpen ? ' is-open' : '')}>
                {can.edit && !only && parts.length > 1 && (
                  <span className="pg-move is-inline" role="group" aria-label={`Move ${p.what}`}>
                    <button type="button" className="pg-move-b" disabled={k === 0} aria-label={`Move ${p.what} up`} onClick={() => move(p, -1)}>▲</button>
                    <button type="button" className="pg-move-b" disabled={k === parts.length - 1} aria-label={`Move ${p.what} down`} onClick={() => move(p, 1)}>▼</button>
                  </span>
                )}
                {/* A stage's ordinary parts are ticked; a program is passed
                    by saying so, so it has no tick of its own. */}
                {!prog && (
                  <input type="checkbox" className="spp-tickbox" checked={p.doneAt != null} disabled={!can.edit} aria-label={`${p.what} — done`} onChange={() => toggle(p)} />
                )}
                <button type="button" className="spp-main" aria-expanded={isOpen} onClick={() => openIt(p)}>
                  {/* Its name and its state on one line — the state wraps
                      under the name, never away from it. */}
                  <span className="spp-top">
                    <span className="spp-name">{p.what}</span>
                    <span className={'spp-pill is-' + st.tone}>{st.word}</span>
                    {/* A problem open on it is said even when its status is. */}
                    {st.said && openProbs > 0 && <span className="spp-pill is-r">{openProbs === 1 ? 'a problem' : `${openProbs} problems`}</span>}
                  </span>
                  {meta && <span className="spp-meta">{meta}</span>}
                  {said?.note && <span className="spp-said">{said.note}</span>}
                </button>
                {/* EVERYTHING ABOUT IT, on the line being worked on. */}
                {isOpen && draft && (
                  <div className="spp-panel">
                    {can.edit && (
                      <form className="spp-form" onSubmit={e => { e.preventDefault(); save(p, draft); }}>
                        <span className="spp-f-h">How it stands</span>
                        <span className="spp-pick" role="group" aria-label={`How ${p.what} stands`}>
                          {RESULTS.map(is => (
                            <button key={is} type="button" className={'spp-opt is-' + RESULT_TONE[is] + (draft.is === is ? ' is-on' : '')}
                              aria-pressed={draft.is === is} onClick={() => setDraft({ ...draft, is })}>{RESULT_WORD[is][0].toUpperCase() + RESULT_WORD[is].slice(1)}</button>
                          ))}
                        </span>
                        <textarea className="spp-note" rows={3} value={draft.note} aria-label="What you saw"
                          placeholder="What you saw — e.g. Running 32 ppm at baseline settings, film tracking still to tune"
                          onChange={e => setDraft({ ...draft, note: e.target.value })} />
                        {last && draft.is && draft.is !== last.is && last.on !== todayISO() && (
                          <small className="sub">{RESULT_WORD[last.is][0].toUpperCase() + RESULT_WORD[last.is].slice(1)} on {niceDay(last.on)} stays in its history.</small>
                        )}
                        <label className="spp-f spp-f-wide"><span>The {noun}</span>
                          <input value={draft.what} aria-label={`The ${noun}`} onChange={e => setDraft({ ...draft, what: e.target.value })} /></label>
                        <label className="spp-f"><span>Who</span>
                          <input list="spp-names" value={draft.owner} placeholder="Ilapak UK" onChange={e => setDraft({ ...draft, owner: e.target.value })} /></label>
                        <label className="spp-f"><span>By</span>
                          <input type="date" value={draft.due} aria-label="By when" onChange={e => setDraft({ ...draft, due: e.target.value })} /></label>
                        <span className="spp-acts">
                          <button type="submit" className="btn btn-sm btn-primary">Save</button>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setOpen(null); setDraft(null); }}>Close</button>
                        </span>
                      </form>
                    )}
                    {history.length > 0 && (
                      <div className="spp-hist">
                        <span className="spp-f-h">History</span>
                        <ul>
                          {history.map(r => (
                            <li key={r.at}>
                              <b className={'is-' + RESULT_TONE[r.is]}>{resultWords(r)}</b>{r.note ? ` — ${r.note}` : ''}
                              {/* Taking a status off is the owner's (lib/access). */}
                              {can.remove && <button type="button" className="cw-link sp-rm spp-x" aria-label={`Take off: ${resultWords(r)}`} onClick={() => unsay(p, r.at)}>Take off</button>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* ITS PROBLEMS — what, and how each stands; the whole story
                        is under "What happened" on the stage. */}
                    {probs.length > 0 && (
                      <ul className="spp-probs">
                        {probs.map(x => (
                          <li key={x.id} className={x.doneAt == null ? 'is-open' : 'is-sorted'}>
                            <b>Problem:</b> {x.what}{x.hoursLost ? ` · ${x.hoursLost} h lost` : ''} · {x.doneAt == null ? 'open' : 'sorted'}
                          </li>
                        ))}
                      </ul>
                    )}
                    {can.edit && (
                      <span className="sp-row-acts spp-panel-acts">
                        {/* A plain job with no status is done by saying so. */}
                        {prog && !last && (p.doneAt == null
                          ? <button type="button" className="btn btn-sm" onClick={() => toggle(p)}>Mark done</button>
                          : <button type="button" className="cw-link" onClick={() => toggle(p)}>Not done</button>)}
                        {onProblem && <button type="button" className="btn btn-sm spp-prob" onClick={() => onProblem(p)}>Hit a problem</button>}
                        {can.remove && <button type="button" className="cw-link sp-rm" onClick={() => void remove(p)}>Delete this {noun}</button>}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {can.edit && (
        <form className="spp-add" onSubmit={e => { e.preventDefault(); add(); }}>
          <input value={adding} placeholder={prog ? 'Add a program — e.g. PR-12 Express 1.25 kg' : 'Add a part — e.g. Panels to run Express 1.25 kg'}
            aria-label={prog ? 'Add a program' : 'Add a part of the plan'} onChange={e => setAdding(e.target.value)} />
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
      {!all.length && can.edit && <p className="sub spp-why">{prog
        ? 'Each program this machine has to run — then tap one to say how it stands: baseline achieved, passed or failed.'
        : 'Planned work inside this stage. Not a problem — a problem is for what went wrong.'}</p>}
    </div>
  );
}
