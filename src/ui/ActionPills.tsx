/* THE ACTION ROW'S TWO PILLS (docs/ENTERPRISE-UI.md, E4) — the shared
 * `.status-pill` language, drawn once for every place an action row is drawn
 * (a project's Actions, the control room's Every action, Now's rows).
 *
 * The priority is RAG with its word, as it always was (Critical red, High
 * amber, Low green — CLAUDE.md, Visual management 1); the date is red when it
 * has gone and amber when it is soon, said in the same words as the paper
 * (`whenWord`), and a date that is neither stays plain words — normal
 * recedes. Colour is never the only carrier: the word is in the pill. */
import { PRIORITY_WORD, type ProjectAction } from '../lib/projectActions';
import { whenWord } from '../lib/projectActionsPdf';

const TONE: Record<NonNullable<ProjectAction['priority']>, 'r' | 'a' | 'g'> = { critical: 'r', high: 'a', low: 'g' };

/** A priority, in its colour and its word. `act-pri is-<priority>` stay on it for the scripts that look for them. */
export function PriorityPill({ priority }: { priority: NonNullable<ProjectAction['priority']> }) {
  return <span className={`status-pill is-${TONE[priority]} act-pri is-${priority}`}>{PRIORITY_WORD[priority]}</span>;
}

/** When it is due: a red pill when late, amber when soon, plain words otherwise. */
export function WhenPill({ a }: { a: Pick<ProjectAction, 'due' | 'late' | 'soon'> }) {
  const w = whenWord(a);
  return a.late ? <span className="status-pill is-r act-late">{w}</span> : a.soon ? <span className="status-pill is-a act-soon">{w}</span> : <span>{w}</span>;
}
