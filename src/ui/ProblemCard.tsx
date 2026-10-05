/* THE PROBLEM, WORKED — Problem · Why · Fix · Did it work (docs/SIXM.md, "The
 * working method"). Rowland, 5 October: "I want it simple … as automated as
 * possible, as intelligent as possible, and simplistic as possible."
 *
 * One card, four parts, top to bottom, in plain words:
 *   PROBLEM      the head of the fish, its number, where it came from, and
 *                where it is and is not (read from the stops — nothing typed);
 *   WHY          one block per chain of whys (a Cause on its bone: its text
 *                the first answer, its whys the rest, the root marked), each
 *                answer saying how it is known — seen · data · counted · told;
 *   FIX          the countermeasures — the board's own actions pointing at
 *                the chains (causeRef), with who, when and what they should
 *                change;
 *   DID IT WORK  the problem's own number before → now, each fix's
 *                prediction beside what happened, then close / hold / reopen.
 *
 * WHICH RECORD: nothing new. The problem is a Case, a chain a Cause on it, a
 * fix an action (pace_todos) with causeRef + expect, "did it work" is
 * lib/fishbone measureOf. WHERE IT SHOWS: the fishbone page and the line's
 * fishbone lens; the client report prints each problem as the same four parts
 * beside its fish. Access: a client reads every part and is offered no
 * button; can.edit works it, can.agree closes or reopens, can.remove removes.
 * Pure: the page loads and saves. */
import { useState, type ReactNode } from 'react';
import type { Can } from '../lib/access';
import type { ProblemView } from '../lib/problems';
import { PHASE_WORD } from '../lib/problems';
import type { PaceAction } from '../lib/tracker';
import type { PaceTodoRow } from '../db';
import type { Case } from '../types';
import type { ProblemFacts, StartingWhy } from '../lib/fishbone';
import { therefore } from '../lib/fishbone';
import {
  blamesAPerson, boneOfStop, boneOfSub, KNOWN_WORD, SIXM, sixmLabel,
  type Cause, type Grade, type SixM,
} from '../lib/sixm';
import { whysFill, type VoiceResult } from '../lib/voice';
import type { VoiceContext } from '../../api/voice';
import { statusOfAction } from '../lib/treeBind';
import { plural } from '../lib/format';
import { isRoot, lossWords, STATUS_WORD } from './fishbone/layout';
import { StatusGlyph } from './fishbone/marks';
import { Measure } from './Fishbone';
import { VoiceNote } from './Voice';
import { LineField } from './fishbone/LineField';

/* ================================ pure words ================================ */

/** The house colour of a phase: under way indigo, holding or closed the quiet
 *  green, slipped back red (CLAUDE.md, visual management). */
export const phaseTone = (p: ProblemView['phase']): 'w' | 'g' | 'r' =>
  p === 'slipped' ? 'r' : p === 'holding' || p === 'closed' ? 'g' : 'w';

/** Where the head of the fish came from, in words. */
export function sourceWords(s: NonNullable<Case['source']>): string {
  switch (s.kind) {
    case 'gap': return 'the line’s gap';
    case 'pareto': return `the Pareto${s.category ? ` — ${s.category}${s.asset ? `, ${s.asset}` : ''}` : ''}`;
    case 'constraint': return `the constraint${s.station ? ` — ${s.station}` : ''}`;
    default: return 'something seen';
  }
}

/** One answer in a chain, as the card reads it. */
export interface Answer { text: string; grade?: Grade; root: boolean }

/** A chain's answers in order: the first answer (the cause's own words and
 *  grade), then each why. The root is the last answer of a rooted chain. */
export function answersOf(c: Cause): Answer[] {
  const whys = c.whys.filter(w => w.text.trim());
  const all: Answer[] = [
    { text: c.text.trim(), grade: c.grade, root: false },
    ...whys.map(w => ({ text: w.text.trim(), grade: w.grade, root: false })),
  ];
  if (isRoot(c) && whys.length) all[all.length - 1].root = true;
  return all;
}

/** AN ANSWER NOBODY CAN BACK IS THE CUE TO GO AND LOOK (docs/SIXM.md, step
 *  3 — the verification step, folded in): the chain's deepest answer is only
 *  "told", and nothing on it was seen (no photo on a chain that is still its
 *  first answer). A ruled-out chain needs nothing more. */
export function needsLook(c: Cause): boolean {
  if (c.status === 'ruled_out') return false;
  const a = answersOf(c);
  const last = a[a.length - 1];
  if (last.grade !== 'reported') return false;
  return !(a.length === 1 && (c.media?.length ?? 0) > 0);
}

/** The bone a new chain on this problem starts on: the sub-category's usual
 *  bone (the shipped map), else guessed from the bar's words, else Machine —
 *  a suggestion the cause sheet's bone chips change in one tap. */
export function defaultBone(p: Case): SixM {
  const s = p.source;
  return boneOfSub(s?.subcategory) ?? (s?.category ? boneOfStop(s.category, s.subcategory) : 'machine');
}

/** The starting answers not yet on the fish — one tap each, so one already
 *  taken (the same words, any case) is not offered twice. */
export function freshStarts(starts: StartingWhy[], causes: Cause[]): StartingWhy[] {
  const have = new Set(causes.map(c => c.text.trim().toLowerCase()));
  return starts.filter(s => s.text.trim() && !have.has(s.text.trim().toLowerCase()));
}

/** A starting answer taken in one tap: the chain's first answer on its bone,
 *  known from the data (it came from the stops), suspected until checked. */
export function causeFromStart(s: StartingWhy, o: { id: string; at: number; by?: string }): Cause {
  return {
    id: o.id, m: s.m, text: s.text.trim(), grade: 'measured', status: 'suspected', whys: [], at: o.at,
    source: { kind: 'pareto', ...(s.ref ? { ref: s.ref } : {}), label: s.text.trim(), ...(s.minutesWeek > 0 ? { minutesWeek: s.minutesWeek } : {}) },
    ...(o.by ? { by: o.by } : {}),
  };
}

/** A spoken chain, as put on the fish: the first answer and the whys under
 *  it, told (it was said, not yet seen), suspected, and no root until the
 *  person says so. Null when nothing was said. */
export function causeFromWords(words: string[], m: SixM, o: { newId: () => string; at: number; by?: string }): Cause | null {
  const said = words.map(w => w.trim()).filter(Boolean);
  if (!said.length) return null;
  return {
    id: o.newId(), m, text: said[0], grade: 'reported', status: 'suspected', at: o.at,
    whys: said.slice(1).map(text => ({ id: o.newId(), text, grade: 'reported' as const })),
    ...(o.by ? { by: o.by } : {}),
  };
}

/** The board's words for where an action stands — the house colours by name. */
export const FIX_STATE: Record<string, string> = {
  n: 'not started', w: 'under way', a: 'waiting on someone', r: 'past due', g: 'done',
};

/** "Did it work", in words, with its tone: grey until it can be measured,
 *  indigo while it is being checked, quiet green when it moved the right way,
 *  red when it moved the wrong way. Not moving stays neutral words — the
 *  phase says "Slipped back" once it was closed on a hold. */
export function workedWords(v: ProblemView): { tone: 'n' | 'w' | 'g' | 'r'; text: string } {
  const m = v.measure;
  const anyDone = v.actions.some(a => statusOfAction(a) === 'g');
  if (!m || (m.before == null && m.now == null)) return { tone: 'n', text: 'Not measured yet — nothing timed or read in its scope' };
  /* The number is read already — what cannot be said yet is whether the
     fixes moved it, so "measured" would not be true here. */
  if (!anyDone) return { tone: 'n', text: 'Not judged yet — a full week after the last fix is done' };
  if (!m.moved) return { tone: 'w', text: 'Checking it worked — measured a full week after the last fix' };
  if (m.moved === 'better') return { tone: 'g', text: 'It moved the right way' };
  if (m.moved === 'worse') return { tone: 'r', text: 'It moved the wrong way' };
  return { tone: 'n', text: 'Not moved yet' };
}

/* ================================ the card ================================ */

export interface ProblemCardProps {
  view: ProblemView;
  can: Can;
  /** Is / Is not, read from the stops (lib/fishbone factsOf). */
  facts: ProblemFacts;
  /** The bar's breakdown as one-tap first answers (lib/fishbone startingWhys). */
  starts: StartingWhy[];
  /** The board's rows, for each fix's outcome — what happened. */
  steps: PaceTodoRow[];
  /** Who is working it — written on a chain they put on. */
  by?: string;
  voiceContext: () => VoiceContext;
  /** Today's id maker — a new chain and each of its whys. */
  newId: () => string;
  /** The old five whys, when the problem has them (the page's own block). */
  oldWhys?: ReactNode;
  onOpenCause: (c: Cause) => void;
  /** A blank first answer on a bone, in the cause sheet. */
  onWriteCause: (m: SixM) => void;
  onSaveCause: (c: Cause) => Promise<void>;
  onAddFix: (c: Cause) => void;
  onOpenFix: (a: PaceAction) => void;
  onClose: () => void;
  onReopen: () => void;
  onChecked: () => void;
  onRemove: () => void;
}

export function ProblemCard(p: ProblemCardProps) {
  const { view: v, can } = p;
  return (
    <article className={'pc is-' + phaseTone(v.phase)} aria-label={`The problem: ${v.problem.title}`}>
      <ProblemPart {...p} />
      <WhyPart {...p} />
      <FixPart {...p} />
      <WorkedPart {...p} />
      {/* A PROBLEM OPENED BY MISTAKE IS REMOVED, NOT CLOSED: closing asks how
          the gain is kept, which is wrong for a problem that was never real.
          Owner only (the database lets only the owner set deleted_at), quiet,
          and undone for a few seconds like every delete (ui/Undo). */}
      {can.remove && (
        <div className="pc-foot">
          <button type="button" className="btn btn-ghost cw-del fj-remove" onClick={p.onRemove}>Remove this problem</button>
        </div>
      )}
    </article>
  );
}

function PartHead({ n, title, state, tone }: { n: number; title: string; state?: ReactNode; tone?: string }) {
  return (
    <header className="pc-h">
      <span className="pc-n" aria-hidden>{n}</span>
      <h3 className="pc-t">{title}</h3>
      {state && <span className={'pc-state' + (tone ? ' is-' + tone : '')}>{state}</span>}
    </header>
  );
}

/* --------------------------------- problem --------------------------------- */

function ProblemPart({ view: v, facts }: ProblemCardProps) {
  const src = v.problem.source;
  const none = !facts.is.length && !facts.isNot.length;
  return (
    <section className="pc-part pc-problem">
      <PartHead n={1} title="Problem" state={<span className={'fj-phase is-' + phaseTone(v.phase)}>{PHASE_WORD[v.phase]}</span>} />
      <h2 className="pc-title">{v.problem.title}</h2>
      {v.measure && <p className="pc-num"><Measure m={v.measure} /></p>}
      {v.says && v.says !== v.problem.title && <p className="pc-says">{v.says}</p>}
      {src && (
        <p className="pc-src">
          From {sourceWords(src)}{src.why?.trim() ? <> · opened for <b>{src.why.trim()}</b></> : null}
        </p>
      )}
      {none ? (
        <p className="pc-quiet">Where it is and is not is read from the stops timed in its scope — nothing to read yet.</p>
      ) : (
        <dl className="pc-facts">
          {facts.is.length > 0 && <div><dt>Is</dt><dd>{facts.is.join(' · ')}</dd></div>}
          {facts.isNot.length > 0 && <div><dt>Is not</dt><dd>{facts.isNot.join(' · ')}</dd></div>}
        </dl>
      )}
    </section>
  );
}

/* ----------------------------------- why ----------------------------------- */

function WhyPart(p: ProblemCardProps) {
  const { view: v, can, starts, onOpenCause, onWriteCause, onSaveCause, newId, by } = p;
  const chains = v.bones.flatMap(b => b.causes);
  const roots = chains.filter(isRoot).length;
  const [asking, setAsking] = useState(false);
  const [heard, setHeard] = useState<VoiceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const offered = freshStarts(starts, chains);
  const title = v.problem.title.trim() || 'it';

  const askWhy = () => {
    /* Nothing to offer: straight to writing the first answer. */
    if (!offered.length) { onWriteCause(defaultBone(v.problem)); return; }
    setAsking(a => !a);
  };
  const take = async (s: StartingWhy) => {
    if (busy) return;
    setBusy(true);
    try { await onSaveCause(causeFromStart(s, { id: newId(), at: Date.now(), by })); setAsking(false); } finally { setBusy(false); }
  };

  return (
    <section className="pc-part pc-why">
      <PartHead n={2} title="Why"
        state={chains.length ? `${plural(chains.length, 'chain')} · ${roots ? plural(roots, 'root') : 'no root yet'}` : undefined} />
      {p.oldWhys}
      {chains.length === 0 && !p.oldWhys && (
        <p className="pc-quiet">{can.edit ? 'No why yet — ask why.' : 'No why yet.'}</p>
      )}
      {chains.length > 0 && (
        <ul className="pc-chains">
          {chains.map(c => <li key={c.id}><Chain c={c} problemTitle={title} can={can} onOpen={() => onOpenCause(c)} /></li>)}
        </ul>
      )}

      {can.edit && !heard && (
        <div className="pc-acts">
          <button type="button" className="btn pc-ask" aria-expanded={offered.length ? asking : undefined} onClick={askWhy}>Ask why</button>
          <VoiceNote form="whys" label="Say the whys" context={p.voiceContext} onHeard={r => { setAsking(false); setHeard(r); }} />
        </div>
      )}
      {can.edit && asking && !heard && (
        <div className="pc-asking" role="group" aria-label="The first answer">
          <p className="pc-q">Why does “{title}” happen?</p>
          <p className="pc-quiet">From the stops — one tap puts it on as the first answer, known from the data, suspected until it is checked.</p>
          <div className="pc-starts">
            {offered.map(s => (
              <button key={s.text} type="button" className="pc-start" disabled={busy} onClick={() => void take(s)}>
                <span className="pc-start-t">{s.text}</span>
                <span className="pc-start-s">{[lossWords(s.minutesWeek), sixmLabel(s.m)].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
          <div className="pc-acts">
            <button type="button" className="btn btn-ghost" onClick={() => { setAsking(false); onWriteCause(defaultBone(v.problem)); }}>Write another answer</button>
            <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </div>
      )}
      {can.edit && heard && (
        <WhysReview heard={heard} problem={v.problem}
          onDiscard={() => setHeard(null)}
          onSave={async (words, m) => {
            const c = causeFromWords(words, m, { newId, at: Date.now(), by });
            if (c) await onSaveCause(c);
            setHeard(null);
          }} />
      )}
    </section>
  );
}

/** One chain: the first answer, each why indented under it, how each is
 *  known, the root marked, its bone, and the read-back under a root. The
 *  whole block opens the cause sheet — where the whys are worked. */
function Chain({ c, problemTitle, can, onOpen }: { c: Cause; problemTitle: string; can: Can; onOpen: () => void }) {
  const answers = answersOf(c);
  const root = isRoot(c);
  const back = root ? therefore(c, problemTitle) : [];
  const look = needsLook(c);
  return (
    <button type="button" className={'pc-chain is-' + c.status + (root ? ' is-root' : '')} onClick={onOpen}
      aria-label={`${sixmLabel(c.m)} chain: ${answers.map(a => a.text).join(', because ')} — ${STATUS_WORD[c.status]}${root ? ', the root found' : ''}. Tap to ${can.edit ? 'work it' : 'read it'}.`}>
      <span className="pc-chain-k">
        <span className="pc-bone">{sixmLabel(c.m)}</span>
        <StatusGlyph status={c.status} root={root} />
        <span>{STATUS_WORD[c.status]}</span>
      </span>
      {/* Spans, not a list: a button holds phrasing content only. */}
      <span className="pc-answers" role="list">
        {answers.map((a, i) => (
          <span key={i} role="listitem" className={'pc-a' + (a.root ? ' is-root' : '')} style={{ ['--d' as string]: Math.min(i, 5) }}>
            <span className="pc-a-t">{a.text || 'An answer with no words yet'}</span>
            {a.grade && <span className="pc-known">{KNOWN_WORD[a.grade]}</span>}
            {a.root && <span className="pc-root">the root</span>}
          </span>
        ))}
      </span>
      {/* Read back from the root to the head, one link a line — each has to hold. */}
      {back.length > 0 && <span className="pc-backs">{back.map((l, i) => <span key={i} className="pc-back">{l}.</span>)}</span>}
      {look && <span className="pc-look">{root ? 'Told, not seen — go and look before acting on it.' : 'Go and look before the next why.'}</span>}
      {!root && !look && c.status !== 'ruled_out' && can.edit && <span className="pc-next">Why? — ask the next why ›</span>}
    </button>
  );
}

/** SAY THE WHYS, REVIEWED: the chain as heard, each answer editable, its bone,
 *  and the blame prompt — nothing is put on the fish until "Put it on". */
function WhysReview({ heard, problem, onSave, onDiscard }: {
  heard: VoiceResult; problem: Case;
  onSave: (words: string[], m: SixM) => Promise<void>; onDiscard: () => void;
}) {
  const fill = whysFill(heard);
  const [words, setWords] = useState<string[]>(() =>
    fill.chain.length ? fill.chain : heard.transcript.trim() ? [heard.transcript.trim()] : ['']);
  const [m, setM] = useState<SixM>(fill.m ?? defaultBone(problem));
  const [busy, setBusy] = useState(false);
  const said = words.map(w => w.trim()).filter(Boolean);
  const last = said[said.length - 1] ?? '';
  const unchanged = said.join('\n') === fill.chain.join('\n');
  const blame = last ? (blamesAPerson(last) ?? (unchanged ? fill.blames : null)) : null;
  const save = async () => {
    if (busy || !said.length) return;
    setBusy(true);
    try { await onSave(said, m); } finally { setBusy(false); }
  };
  return (
    <section className="vo-review pc-review" aria-label="The whys as heard">
      <p className="vo-said"><span className="vo-said-l">You said</span> “{heard.transcript || '…'}”</p>
      {!fill.chain.length && <p className="sub">That did not split into whys — put it right below, or discard it and say it again.</p>}
      <ol className="pc-rv">
        {words.map((w, i) => (
          <li key={i} className="pc-rv-a">
            <span className="vo-row-l">{i === 0 ? `Why does “${problem.title.trim() || 'it'}” happen?` : 'Why?'}</span>
            <span className="pc-rv-row">
              <LineField label={i === 0 ? 'The first answer' : `Why ${i}`} value={w} placeholder="Because…"
                onChange={x => setWords(ws => ws.map((y, j) => (j === i ? x : y)))} />
              {words.length > 1 && (
                <button type="button" className="cs-x" aria-label={`Take out answer ${i + 1}`}
                  onClick={() => setWords(ws => ws.filter((_, j) => j !== i))}>×</button>
              )}
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-ghost pc-rv-add" disabled={!words[words.length - 1]?.trim()}
        onClick={() => setWords(ws => [...ws, ''])}>+ Another why</button>
      <div className="pc-rv-bone">
        <span className="vo-row-l">On the bone</span>
        <div className="cs-chips" role="radiogroup" aria-label="Which bone">
          {SIXM.map(b => (
            <button key={b.key} type="button" role="radio" aria-checked={m === b.key} title={b.blurb}
              className={'cs-chip' + (m === b.key ? ' on' : '')} onClick={() => setM(b.key)}>{b.label}</button>
          ))}
        </div>
      </div>
      {blame && <p className="cs-ask" role="note">{blame}</p>}
      <p className="pc-quiet">It goes on as told — said, not yet seen — and suspected. Mark the root in the chain when it is one.</p>
      <div className="vo-go">
        <button type="button" className="btn btn-primary" disabled={busy || !said.length} onClick={() => void save()}>
          {busy ? 'Putting it on…' : 'Put it on the fishbone'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDiscard}>Discard</button>
      </div>
    </section>
  );
}

/* ----------------------------------- fix ----------------------------------- */

function FixPart({ view: v, can, onAddFix, onOpenFix }: ProblemCardProps) {
  const chains = v.bones.flatMap(b => b.causes);
  const rooted = chains.filter(isRoot);
  const fixes = v.actions;
  const tones = fixes.map(a => statusOfAction(a));
  const late = tones.filter(t => t === 'r').length;
  const done = tones.filter(t => t === 'g').length;
  const open = fixes.length - done;
  const causeOf = (a: PaceAction) => chains.find(c => a.causeRef === `${v.problem.id}:${c.id}`);
  return (
    <section className="pc-part pc-fix">
      <PartHead n={3} title="Fix" tone={late ? 'r' : undefined}
        state={fixes.length ? <>{plural(fixes.length, 'fix', 'fixes')} · {open} open{late ? <> · <b>{late} past due</b></> : null}</> : undefined} />
      {fixes.length === 0 && (
        <p className="pc-quiet">{rooted.length ? (can.edit ? 'No fix yet — add one on the root.' : 'No fix yet.') : 'No fix yet — find the root first.'}</p>
      )}
      {fixes.length > 0 && (
        <ul className="pc-fixes">
          {fixes.map((a, i) => {
            const t = tones[i];
            const c = causeOf(a);
            const root = c ? answersOf(c).slice(-1)[0]?.text : undefined;
            return (
              <li key={a.uid ?? a.ref}>
                <button type="button" className={'pc-fixrow is-' + t} onClick={() => onOpenFix(a)}
                  aria-label={`${a.action || 'An action with no words yet'} — ${FIX_STATE[t]}. Tap to open it.`}>
                  <i className={'cs-dot is-' + t} aria-hidden />
                  <span className="cs-cm-main">
                    <span className="cs-cm-t">{a.action || a.problem || 'An action with no words yet'}</span>
                    {a.expect && <span className="cs-cm-x">Should change: {a.expect}</span>}
                    <span className="cs-cm-s">
                      {[a.owner || a.who || 'Nobody named', a.due ? `due ${a.due}` : 'no date'].join(' · ')} · <span className={'cs-cm-st is-' + t}>{FIX_STATE[t]}</span>
                    </span>
                    {root && <span className="cs-cm-s">For: {root}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {can.edit && rooted.length > 0 && (
        <div className="pc-acts">
          {rooted.map(c => (
            <button key={c.id} type="button" className="btn cs-cm-add" onClick={() => onAddFix(c)}>
              + Add a fix{rooted.length > 1 ? <> for “{short(answersOf(c).slice(-1)[0]?.text ?? c.text)}”</> : null}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

const short = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/* ------------------------------- did it work ------------------------------- */

const EVERY_WORD = (d: number) => (d === 1 ? 'day' : d === 7 ? 'week' : d === 14 ? 'fortnight' : d === 30 ? 'month' : `${d} days`);

function WorkedPart({ view: v, can, steps, onClose, onReopen, onChecked }: ProblemCardProps) {
  const m = v.measure;
  const w = workedWords(v);
  const open = v.problem.status === 'open';
  const hold = v.problem.hold;
  const told = v.actions.filter(a => a.expect || steps.find(s => s.id === a.uid)?.outcome?.trim());
  return (
    <section className="pc-part pc-worked">
      <PartHead n={4} title="Did it work" tone={w.tone === 'r' ? 'r' : undefined}
        state={!open || v.phase === 'proving' ? PHASE_WORD[v.phase] : undefined} />
      <p className={'pc-moved is-' + w.tone}>
        {m && (m.before != null || m.now != null) && <Measure m={m} />}
        <b>{w.text}</b>
      </p>
      {told.length > 0 && (
        <ul className="pc-told">
          {told.map(a => {
            const out = steps.find(s => s.id === a.uid)?.outcome?.trim();
            return (
              <li key={a.uid ?? a.ref}>
                <span className="pc-told-t">{a.action || 'A fix'}</span>
                <span className="pc-told-s">Should change: {a.expect || 'not said'} · What happened: {out || (statusOfAction(a) === 'g' ? 'not written yet' : 'not done yet')}</span>
              </li>
            );
          })}
        </ul>
      )}
      {!open && hold && (
        <p className="fj-holdline">
          Kept by: <b>{hold.what}</b>{hold.who ? ` · ${hold.who}` : ''} · every {EVERY_WORD(hold.everyDays)}
          {' '}· {hold.standardUpdated ? 'standard updated' : 'standard not updated yet'}
          {hold.lastChecked ? ` · last checked ${hold.lastChecked}` : ' · not checked yet'}
        </p>
      )}
      {!open && !hold && <p className="pc-quiet">Closed with no check to keep it.</p>}
      <div className="pc-acts">
        {!open && hold && can.edit && <button type="button" className="btn" onClick={onChecked}>Checked today</button>}
        {/* "It worked" is only true once something was done about it. */}
        {open && can.agree && <button type="button" className="btn" onClick={onClose}>{v.actions.length ? 'It worked — close it' : 'Close it'}</button>}
        {!open && can.agree && <button type="button" className="btn btn-ghost" onClick={onReopen}>Reopen</button>}
      </div>
    </section>
  );
}
