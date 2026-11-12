/* WHAT LUNAR HAS FOUND ON THIS LINE (12 November, docs/LUNAR-BRAIN.md B1). The homework the app has done on the line's own stop
 * records before anybody asked (lib/brain), drawn in its own words: each finding's sentence, how sure it is and what it cannot say,
 * its money as the cost model says it, and whether the homework is up to date. Brought up to date when the line's records change;
 * read-only — nothing here writes anything but the homework itself. Inside the Overview's More about this line. */
import { useEffect, useState } from 'react';
import { onDataChange } from '../../db';
import { homeworkForLine, lineBrain, BRAIN_STATE_WORD, type LineBrain } from '../../lib/brain/homework';
import type { Finding } from '../../lib/brain/engine';
import type { Workspace } from '../../types';

export const SURE_WORD: Record<Finding['sure'], string> = { measured: 'Measured', significant: 'Unlikely to be chance', suggestive: 'Could be chance', thin: 'Too few records' };

export function LineFindings({ line }: { line: Workspace }) {
  const [brain, setBrain] = useState<LineBrain | null>(null);
  useEffect(() => {
    let live = true, t: ReturnType<typeof setTimeout> | undefined;
    const run = () => { void homeworkForLine(line, Date.now()).then(() => lineBrain(line)).then(b => { if (live) setBrain(b); }).catch(() => { /* the homework waits for the next change */ }); };
    run();
    const off = onDataChange(() => { clearTimeout(t); t = setTimeout(run, 1500); });
    return () => { live = false; clearTimeout(t); off(); };
  }, [line]);
  if (!brain) return null;
  return (
    <section className="pl-sec lf" aria-label="What LUNAR has found" data-line-findings data-brain-state={brain.state}>
      <div className="pl-sec-h">
        <h2>What LUNAR has found</h2>
        <span className="sub" data-brain-state-word>{BRAIN_STATE_WORD[brain.state]}{brain.at ? ` · worked ${new Date(brain.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</span>
      </div>
      {brain.findings.length === 0
        ? <p className="sub" data-brain-empty>Nothing timed on this line to work from yet — time its stops and LUNAR works out where the time goes.</p>
        : (
          <ul className="lf-list">
            {brain.findings.map((f, i) => (
              <li key={`${f.kind}-${i}`} className="lf-row" data-finding={f.kind}>
                <p className="lf-says">{f.says}</p>
                <p className="lf-how"><span className="lf-sure" data-sure={f.sure}>{SURE_WORD[f.sure]}</span> · {f.n} stop{f.n === 1 ? '' : 's'} · {f.method}</p>
                {f.money && <p className="lf-money">{f.money.words}</p>}
                <p className="lf-limits sub">Cannot say: {f.limits.join(' ')}</p>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
