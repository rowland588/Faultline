/* ARE WE ON TARGET? — the answer, at the top of the page.
 *
 * Rowland, 6 October: "the header must clearly show the answer to the
 * question: ARE WE ON TARGET?" The question, the answer in a word in its
 * colour (red behind, amber at risk, a quiet green on target, grey not
 * measured), and the reason beside it in words — so it survives a
 * black-and-white print and colour-blind eyes. Worked out by lib/onTarget,
 * the one function every page that shows it calls. */
import { onTargetSays, type OnTarget } from '../lib/onTarget';

export function OnTargetLine({ v, asOf, dark }: {
  v: OnTarget;
  /** Said when the page is about another day — the answer is always today's. */
  asOf?: string;
  /** On the dark band of the job's front page. */
  dark?: boolean;
}) {
  return (
    <p className={'ot is-' + v.tone + (dark ? ' is-dark' : '')} aria-label={`Are we on target? ${onTargetSays(v)}`}>
      <span className="ot-q">Are we on target?{asOf ? ` · ${asOf}` : ''}</span>
      <span className="ot-a"><b className="ot-w">{v.word}</b> <span className="ot-r">— {v.reason}</span></span>
    </p>
  );
}
