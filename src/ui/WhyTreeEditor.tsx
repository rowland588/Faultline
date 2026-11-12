/* THE WHY TREE, EDITED (knowledge/specs/FC-148-why-tree.md, part B) — under a cause the team asks "why?"; a why can
 * have several answers, a branch ends in a root or at "Same root as…" another branch's, and the "five" is a prompt, not
 * a limit. A cause written as a chain before the tree reads as one branch and is turned into a tree the first time it
 * is branched. Pure of the database: the sheet that holds it saves. */
import type { ReactNode } from 'react';
import { blamesAPerson, GRADES, KNOWN_WORD, WHY_OF_CAUSE, type Cause, type Grade, type Why } from '../lib/sixm';
import { addAnswer, dropAnswer, readTree, setRoot, setSameAs, sharedRootChoices, treeOf, treeSays, whyForest, type WhyNode } from '../lib/whyTree';
import { uid } from '../lib/ids';
import { GradeMeter } from './fishbone/marks';
import { LineField } from './fishbone/LineField';
import './whyTree.css';

const known = (g: Grade) => KNOWN_WORD[g].charAt(0).toUpperCase() + KNOWN_WORD[g].slice(1);
const gradeOf = (g?: Grade) => GRADES.find(x => x.key === g);
const short = (s: string, n = 56) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export interface WhyTreeEditorProps {
  c: Cause;
  /** May it be changed — `can.edit`. */
  edit: boolean;
  /** The whys are open: the cause is confirmed (or already has whys). */
  open: boolean;
  /** Why they are not, in a sentence. */
  closedSays: string;
  set: (patch: Partial<Cause>) => void;
  focusWhy: string | null;
  setFocusWhy: (id: string | null) => void;
}

/** The cause keeps its own `root` flag true while any why is a root, so everything that reads it keeps working. */
const withRoot = (whys: Why[]): Partial<Cause> => ({ whys, root: readTree({ whys }).roots.length > 0 });

export function WhyTreeEditor({ c, edit, open, closedSays, set, focusWhy, setFocusWhy }: WhyTreeEditorProps): ReactNode {
  const whys = treeOf(c);
  const forest = whyForest({ whys, root: c.root }, { keepEmpty: true });
  const change = (fn: (w: Why[]) => Why[]) => set(withRoot(fn(treeOf(c))));
  const patch = (id: string, p: Partial<Why>) => change(w => w.map(x => (x.id === id ? { ...x, ...p } : x)));
  const ask = (under: string) => { const id = uid(); change(w => addAnswer(w, under, id)); setFocusWhy(id); };
  const hasAny = whys.length > 0;
  const deepest = readTree({ whys }).depth;
  const live = { whys, root: c.root };

  const node = (n: WhyNode, parentText: string): ReactNode => {
    const w = n.why;
    const blame = w.text.trim() ? blamesAPerson(w.text) : null;
    const wg = gradeOf(w.grade);
    const choices = sharedRootChoices(live, w.id);
    const ended = n.end === 'root' || n.end === 'same';
    return (
      <li key={w.id} className={'wt-node is-' + n.end}>
        <div className="wt-h">
          <span className="wt-q">{parentText.trim() ? <>Why does “{short(parentText.trim())}” happen?</> : 'Why does that happen?'}</span>
          {n.end === 'root' && <span className="wt-tag is-root">Root</span>}
          {n.end === 'same' && n.sameAs && <span className="wt-tag">Same root as “{short(n.sameAs.why.text, 36)}”</span>}
          {n.end === 'open' && w.text.trim() && <span className="wt-tag is-open">Not yet at a root</span>}
          {edit && (
            <span className="wt-tools">
              <select className="cs-why-g" aria-label={`How this answer is known`} value={w.grade ?? ''}
                onChange={e => patch(w.id, { grade: (e.target.value || undefined) as Grade | undefined })}>
                <option value="">How known?</option>
                {GRADES.map(x => <option key={x.key} value={x.key}>{known(x.key)}</option>)}
              </select>
              <button type="button" className="cs-x" onClick={() => change(x => dropAnswer(x, w.id))} aria-label={`Take out “${short(w.text || 'this answer', 30)}”`}>×</button>
            </span>
          )}
        </div>
        {edit
          ? <LineField label={`Because (${short(w.text || 'new answer', 24)})`} value={w.text} placeholder="Because…" autoFocus={focusWhy === w.id}
              onChange={v => patch(w.id, { text: v })} onEnter={() => { if (w.text.trim() && !ended && open) ask(w.id); }} />
          : <p className="cs-why-a">{w.text}{wg && <span className="cs-why-gw"><GradeMeter grade={wg.key} /> {KNOWN_WORD[wg.key]}</span>}</p>}
        {blame && <p className="cs-ask" role="note">{blame}</p>}
        {edit && w.text.trim() && (
          <div className="wt-acts">
            {open && !ended && <button type="button" className="btn wt-b" onClick={() => ask(w.id)}>Why?</button>}
            {open && <button type="button" className="btn btn-ghost wt-b" onClick={() => ask(w.of ?? WHY_OF_CAUSE)}>Another answer</button>}
            <label className="wt-root">
              <input type="checkbox" checked={!!w.root} onChange={e => change(x => setRoot(x, w.id, e.target.checked))} />
              <span><b>This is a root</b> — something the team can put right so it does not come back</span>
            </label>
            {!w.root && choices.length > 0 && (
              <label className="wt-same">
                <span>Same root as…</span>
                <select aria-label="Same root as" value={w.sameAs ?? ''} onChange={e => change(x => setSameAs(x, w.id, e.target.value || undefined))}>
                  <option value="">—</option>
                  {choices.map(r => <option key={r.id} value={r.id}>{short(r.text, 48)}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
        {n.children.length > 0 && <ol className="wt-list">{n.children.map(k => node(k, w.text))}</ol>}
      </li>
    );
  };

  return (
    <div className="cs-f cs-whys wt">
      <span className="cs-k">Why does it happen?</span>
      {hasAny && <p className="wt-says" role="status">{treeSays(live)}</p>}
      {!hasAny && !edit && <p className="cs-quiet">Nobody has asked why yet.</p>}
      {!hasAny && edit && !open && <p className="wt-closed" role="note">{closedSays}</p>}
      {hasAny && <ol className="wt-list">{forest.top.map(n => node(n, c.text))}</ol>}
      {forest.repaired.length > 0 && <p className="cs-quiet">{forest.repaired.length === 1 ? 'One answer' : `${forest.repaired.length} answers`} pointed at something that is not here; {forest.repaired.length === 1 ? 'it is' : 'they are'} shown under the cause so nothing is lost.</p>}
      {edit && open && (
        <div className="cs-why-add">
          <button type="button" className="btn cs-ask-b" onClick={() => ask(WHY_OF_CAUSE)}
            disabled={whys.some(w => !w.text.trim())}>
            + {hasAny ? 'Another answer to the cause' : 'Ask why'}
          </button>
          {deepest >= 5 && <span className="cs-quiet">Five is a guide, not a limit — stop where the team can act.</span>}
        </div>
      )}
      {edit && hasAny && !open && <p className="wt-closed" role="note">{closedSays}</p>}
      <p className="cs-quiet wt-note">A why can have several answers. A branch ends at a root, or at “Same root as…” another branch reached — that way of drawing it is LUNAR’s own; the five whys is a guide, not a rule.</p>
    </div>
  );
}
