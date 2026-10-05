/* A CAUSE, TAPPED — what it is, how it is known, how sure, where it came
 * from, the five whys under it, the "therefore" read back, and what is being
 * done about it (docs/SIXM.md, "A cause, tapped").
 *
 * One sheet for a cause already on the fishbone, a suggestion being looked
 * at before it is added (a draft), and a blank cause started from a bone's
 * Add. Nothing is written until the button is pressed — a write per
 * keystroke was one of the four defects found in the first thirty seconds
 * of using the commissioning screen (CLAUDE.md).
 *
 * Access (lib/access): without `can.edit` the sheet reads, with no boxes;
 * without `can.remove` there is no Remove. The countermeasures are the
 * board's own actions pointing at this cause (`causeRef`), never a second
 * list. Pure: the parent loads and saves. */
import { useState } from 'react';
import type { Can } from '../lib/access';
import type { ProblemView } from '../lib/problems';
import type { PaceAction } from '../lib/tracker';
import { blamesAPerson, GRADES, KNOWN_WORD, SIXM, sixmLabel, type Cause, type CauseSource, type CauseStatus, type Grade, type Why } from '../lib/sixm';
import { statusOfAction } from '../lib/treeBind';
import { uid } from '../lib/ids';
import { plural } from '../lib/format';
import { Sheet } from './Sheet';
import { GradeMeter, RootTag, StatusGlyph } from './fishbone/marks';
import { LineField } from './fishbone/LineField';
import { lossWords, STATUS_WORD } from './fishbone/layout';
import { therefore } from '../lib/fishbone';
import { Evidence } from './EvidenceDoors';
import { EvidenceViewer } from './Evidence';
import type { MediaRef } from '../types';

export interface CauseSheetProps {
  open: boolean;
  view: ProblemView;
  cause: Cause | null;
  /** Not on the fishbone yet — a suggestion being looked at, or a bone's Add. */
  draft?: boolean;
  can: Can;
  onSave: (c: Cause) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAddCountermeasure: (c: Cause) => void;
  onOpenSource: (s: CauseSource) => void;
  onClose: () => void;
}

const STATUSES: { key: CauseStatus; label: string }[] = [
  { key: 'suspected', label: 'Suspected' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'ruled_out', label: 'Ruled out' },
];

const SOURCE_WORD: Record<CauseSource['kind'], string> = {
  pareto: 'The Pareto', snag: 'Found on the walk', standard: 'The line standard', capacity: 'The line balance',
  material: 'A material', program: 'A program', reading: 'The readings', observation: 'Seen on the line',
};

/** The board's words for where an action stands — the house colours by name. */
const ACTION_STATE: Record<string, string> = {
  n: 'not started', w: 'under way', a: 'waiting on someone', r: 'past due', g: 'done',
};

const gradeOf = (g?: Grade) => GRADES.find(x => x.key === g);
/** How it is known, in the working method's words — Seen · Data · Counted ·
 *  Told (lib/sixm KNOWN_WORD) — so the sheet says what the problem card and
 *  the fish say. The stored keys do not change. */
const known = (g: Grade) => KNOWN_WORD[g].charAt(0).toUpperCase() + KNOWN_WORD[g].slice(1);
const filled = (w: Why[]) => w.filter(x => x.text.trim());
const short = (s: string, n = 64) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** What is saved: words trimmed, empty whys dropped, and "root" only while
 *  there is a chain under it and the cause still stands. */
export function tidyCause(c: Cause): Cause {
  const whys = filled(c.whys).map(w => ({ ...w, text: w.text.trim() }));
  return { ...c, text: c.text.trim(), whys, root: !!c.root && whys.length > 0 && c.status !== 'ruled_out', media: c.media?.length ? c.media : undefined };
}

export function CauseSheet(p: CauseSheetProps) {
  const { open, view, cause, draft, can, onSave, onRemove, onAddCountermeasure, onOpenSource, onClose } = p;
  /* The copy being worked on, started again whenever a different cause is opened. */
  const [base, setBase] = useState<Cause | null>(cause);
  const [c, setC] = useState<Cause | null>(cause);
  const [focusWhy, setFocusWhy] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  if (cause !== base) { setBase(cause); setC(cause); setErr(''); setFocusWhy(null); }

  if (!open || !cause || !c) return null;

  const edit = can.edit;
  const set = (patch: Partial<Cause>) => setC(x => (x ? { ...x, ...patch } : x));
  const dirty = JSON.stringify(tidyCause(c)) !== JSON.stringify(tidyCause(cause));
  const close = () => {
    if (edit && dirty && !busy && !window.confirm('Leave without saving? What you changed here will be lost.')) return;
    onClose();
  };
  const save = async () => {
    if (!edit || busy || !c.text.trim()) return;
    setBusy(true); setErr('');
    try { await onSave(tidyCause(c)); onClose(); } catch (e) {
      console.error('cause save failed', e);
      setErr('That did not save. Check the signal and press it again — nothing you typed is lost.');
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!can.remove || busy) return;
    if (!window.confirm(`Take this cause off the fishbone?\n\n"${cause.text}"`)) return;
    setBusy(true); setErr('');
    try { await onRemove(cause.id); onClose(); } catch (e) {
      console.error('cause remove failed', e);
      setErr('That did not go through. Press it again in a moment.');
    } finally { setBusy(false); }
  };

  /* THE FIVE WHYS. */
  const setWhy = (id: string, patch: Partial<Why>) => set({ whys: c.whys.map(w => (w.id === id ? { ...w, ...patch } : w)) });
  const addWhy = () => { const id = uid(); set({ whys: [...c.whys, { id, text: '' }] }); setFocusWhy(id); };
  const dropWhy = (id: string) => {
    const whys = c.whys.filter(w => w.id !== id);
    set({ whys, ...(filled(whys).length ? {} : { root: false }) });
  };
  const nextWhy = (i: number) => {
    const next = c.whys[i + 1];
    if (next) { setFocusWhy(null); requestAnimationFrame(() => setFocusWhy(next.id)); return; }
    if (c.whys[i]?.text.trim()) addWhy();
  };
  const chain = filled(c.whys);
  /* Read back from the root to the head, one link a line — each one has to hold. */
  const readBack = chain.length ? therefore(c, view.problem.title || 'the problem') : [];

  /* WHAT IS BEING DONE ABOUT IT — the board's actions that point here. */
  const ref = `${view.problem.id}:${cause.id}`;
  const cms = view.actions.filter(a => a.causeRef === ref);
  const tone = (a: PaceAction) => statusOfAction(a);
  const late = cms.filter(a => tone(a) === 'r').length, done = cms.filter(a => tone(a) === 'g').length;

  const title = draft ? (cause.source ? 'Suggested by the data' : `A new cause on ${sixmLabel(c.m)}`) : `A cause on ${sixmLabel(c.m)}`;
  const g = gradeOf(c.grade);

  return (
    <Sheet open onClose={close} title={title}>
      <div className="cs-body">
        {/* WHAT IT IS */}
        {edit ? (
          <label className="cs-f">
            <span className="cs-k">The cause</span>
            <LineField className="cs-text" label="The cause" value={c.text} autoFocus={draft && !cause.text}
              placeholder="e.g. Splices vary between shifts" onChange={v => set({ text: v })} onEnter={() => void save()} />
          </label>
        ) : (
          <p className="cs-ro-text">
            <StatusGlyph status={c.status} root={!!c.root && c.status !== 'ruled_out'} />
            <span>{c.text}</span>
            {c.root && c.status !== 'ruled_out' && <RootTag />}
          </p>
        )}

        {edit ? (
          <>
            <div className="cs-f">
              <span className="cs-k">On the bone</span>
              <div className="cs-chips" role="radiogroup" aria-label="Which bone">
                {SIXM.map(m => (
                  <button key={m.key} type="button" role="radio" aria-checked={c.m === m.key} title={m.blurb}
                    className={'cs-chip' + (c.m === m.key ? ' on' : '')} onClick={() => set({ m: m.key })}>{m.label}</button>
                ))}
              </div>
            </div>

            <div className="cs-f">
              <span className="cs-k">How it is known</span>
              <div className="cs-grades" role="radiogroup" aria-label="How it is known">
                {GRADES.map(x => (
                  <button key={x.key} type="button" role="radio" aria-checked={c.grade === x.key}
                    className={'cs-grade' + (c.grade === x.key ? ' on' : '')} onClick={() => set({ grade: x.key })}>
                    <GradeMeter grade={x.key} /><b>{known(x.key)}</b><span>{x.blurb}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="cs-f">
              <span className="cs-k">How sure</span>
              <div className="cs-seg" role="radiogroup" aria-label="How sure">
                {STATUSES.map(s => (
                  <button key={s.key} type="button" role="radio" aria-checked={c.status === s.key}
                    className={'cs-seg-b' + (c.status === s.key ? ' on' : '')} onClick={() => set({ status: s.key })}>
                    <StatusGlyph status={s.key} />{s.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="cs-ro-meta">
            On <b>{sixmLabel(c.m)}</b> · {g && <><GradeMeter grade={g.key} /> <b>{known(g.key)}</b> ({g.blurb})</>} · <b>{STATUS_WORD[c.status]}</b>
          </p>
        )}

        {/* WHERE IT CAME FROM */}
        <div className="cs-f cs-src">
          <span className="cs-k">Where it came from</span>
          <p className="cs-src-t">
            {c.source
              ? <>{SOURCE_WORD[c.source.kind]}{c.source.label ? `: ${c.source.label}` : ''}{lossWords(c.source.minutesWeek) ? ` · ${lossWords(c.source.minutesWeek)}` : ''}</>
              : 'Put on the fishbone by hand'}
            {(c.by || (!draft && c.at)) && <span className="cs-by"> · added {[c.by ? `by ${c.by}` : '', !draft && c.at ? new Date(c.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''].filter(Boolean).join(', ')}</span>}
            {/* Only where there is somewhere to go: something seen on the line
                is its own evidence (its words and photos are here), so an
                "Open it" on it was a link that did nothing. */}
            {c.source && c.source.kind !== 'observation' && <> <button type="button" className="cs-link" onClick={() => c.source && onOpenSource(c.source)}>Open it ›</button></>}
          </p>
        </div>

        {/* ITS PHOTOS — what "I saw…" took on the floor, and any added here.
            Saved on the cause (cases.causes[].media) and synced with the
            problem; the sheet never showed them, so a photo taken as evidence
            was on the record and nowhere on the screen. */}
        <Evidence media={c.media ?? []} kind="found" onView={setViewing}
          onAdd={edit ? async refs => { setC(x => (x ? { ...x, media: [...(x.media ?? []), ...refs] } : x)); } : undefined} />

        {/* THE FIVE WHYS */}
        <div className="cs-f cs-whys">
          <span className="cs-k">Why does it happen?</span>
          {c.whys.length === 0 && !edit && <p className="cs-quiet">Nobody has asked why yet.</p>}
          {c.whys.length > 0 && (
            <ol className="cs-chain">
              {(edit ? c.whys : chain).map((w, i, arr) => {
                const prev = i === 0 ? c.text : arr[i - 1]?.text ?? '';
                const ask = w.text.trim() ? blamesAPerson(w.text) : null;
                const wg = gradeOf(w.grade);
                return (
                  <li key={w.id} className="cs-why">
                    <div className="cs-why-h">
                      <span className="cs-why-q">{prev.trim() ? <>Why does “{short(prev.trim())}” happen?</> : 'Why does that happen?'}</span>
                      {edit && (
                        <span className="cs-why-tools">
                          <select className="cs-why-g" aria-label={`How why ${i + 1} is known`} value={w.grade ?? ''}
                            onChange={e => setWhy(w.id, { grade: (e.target.value || undefined) as Grade | undefined })}>
                            <option value="">How known?</option>
                            {GRADES.map(x => <option key={x.key} value={x.key}>{known(x.key)}</option>)}
                          </select>
                          <button type="button" className="cs-x" onClick={() => dropWhy(w.id)} aria-label={`Take out why ${i + 1}`}>×</button>
                        </span>
                      )}
                    </div>
                    {edit
                      ? <LineField label={`Why ${i + 1}`} value={w.text} placeholder="Because…" autoFocus={focusWhy === w.id}
                          onChange={v => setWhy(w.id, { text: v })} onEnter={() => nextWhy(i)} />
                      : <p className="cs-why-a">{w.text}{wg && <span className="cs-why-gw"><GradeMeter grade={wg.key} /> {KNOWN_WORD[wg.key]}</span>}</p>}
                    {ask && <p className="cs-ask" role="note">{ask}</p>}
                  </li>
                );
              })}
            </ol>
          )}
          {edit && (
            <div className="cs-why-add">
              <button type="button" className="btn cs-ask-b" onClick={addWhy}
                disabled={c.whys.length > 0 && !c.whys[c.whys.length - 1]?.text.trim()}>
                + {c.whys.length ? 'Ask why again' : 'Ask why'}
              </button>
              {c.whys.length >= 5 && <span className="cs-quiet">Five is a guide, not a limit — stop where the team can act.</span>}
            </div>
          )}

          {edit && chain.length > 0 && (
            <label className={'cs-root-t' + (c.status === 'ruled_out' ? ' is-off' : '')}>
              <input type="checkbox" checked={!!c.root && c.status !== 'ruled_out'} disabled={c.status === 'ruled_out'}
                onChange={e => set({ root: e.target.checked })} />
              <span><b>This is the root</b> — something the team can act on, and the read-back below holds all the way to the problem.</span>
            </label>
          )}
          {edit && c.root && c.status === 'suspected' && chain.length > 0 && (
            <p className="cs-quiet">Still suspected. Go and see, or check the data, before acting on it as the root.</p>
          )}

          {readBack.length > 0 && (
            <div className="cs-read">
              <span className="cs-k">Read it back, from the root up</span>
              <ol className="cs-read-l">{readBack.map((l, i) => {
                const at = l.indexOf(', therefore ');
                return <li key={i}>{at < 0 ? l : <>{l.slice(0, at)}<span className="cs-tf">, therefore </span>{l.slice(at + 12)}</>}.</li>;
              })}</ol>
              <span className="cs-quiet">If any line does not hold, the chain has not reached the root yet.</span>
            </div>
          )}
        </div>

        {/* WHAT IS BEING DONE ABOUT IT — "Fix", the working method's word for a
            countermeasure (docs/SIXM.md), as the problem card says it. */}
        {!draft && (
          <div className="cs-f cs-cms">
            <span className="cs-k">Fix</span>
            {cms.length > 0 ? (
              <>
                <p className="cs-cms-say">
                  {plural(cms.length, 'fix', 'fixes')}
                  {late > 0 && <> · <b className="is-r">{late} past due</b></>}
                  {done > 0 && <> · {done} done</>}
                </p>
                <ul className="cs-cm-list">
                  {cms.map(a => {
                    const t = tone(a);
                    return (
                      <li key={a.uid ?? a.ref} className={'cs-cm is-' + t}>
                        <i className={'cs-dot is-' + t} aria-hidden />
                        <span className="cs-cm-main">
                          <span className="cs-cm-t">{a.action || a.problem || 'An action with no words yet'}</span>
                          {a.expect && <span className="cs-cm-x">Should change: {a.expect}</span>}
                          <span className="cs-cm-s">
                            {[a.owner || a.who || 'Nobody named', a.due ? `due ${a.due}` : 'no date'].join(' · ')} · <span className={'cs-cm-st is-' + t}>{ACTION_STATE[t]}</span>
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : <p className="cs-quiet">Nothing is being done about it yet.</p>}
            {edit && (
              <button type="button" className="btn cs-cm-add" onClick={() => onAddCountermeasure(tidyCause(c))}>+ Add a fix</button>
            )}
          </div>
        )}

        {err && <p className="cs-err" role="alert">{err}</p>}

        <div className="cs-foot">
          {edit && can.remove && !draft && <button type="button" className="btn btn-ghost cs-del" onClick={() => void remove()} disabled={busy}>Remove</button>}
          <span className="cs-foot-gap" />
          {edit ? (
            <>
              <button type="button" className="btn" onClick={close}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy || !c.text.trim() || (!draft && !dirty)}>
                {busy ? 'Saving…' : draft ? 'Add to the fishbone' : 'Save'}
              </button>
            </>
          ) : <button type="button" className="btn" onClick={onClose}>Close</button>}
        </div>
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onRemove={edit ? () => { set({ media: (c.media ?? []).filter(m => m.id !== viewing.id) }); setViewing(null); } : undefined} />}
    </Sheet>
  );
}
