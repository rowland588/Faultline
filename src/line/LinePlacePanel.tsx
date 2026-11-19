/* THE AREAS AND THEIR LINES, BESIDE A LINE'S PAGES (minimal v2, 19 November — docs/design/minimal-v2, layout change 1: "Line pages
 * get a 240px left panel listing areas and their lines (like Teams channels), each with its status square, the current line
 * highlighted. It must stack away on a phone").
 *
 * Presentation only. The lines are the Factory's own (lib/useFactoryLines), of the client in hand (lib/activeClient); grouped by the
 * areas the lines name (lib/areas areasOf) with the lines that name none under No area yet; each line's state read by the very reader
 * the Factory's board reads (db snagsForWorkspace → lib/lineWork lineProblems → ui/FactoryLineCard lineState), so the panel and the
 * board can never disagree. The state is a square AND its word (the house rule: colour is never the only carrier). Each line opens
 * its own page; nothing is written. Shown from 1100px; under that the line's own pages are the whole width. */
import { useEffect, useMemo, useState } from 'react';
import type { Workspace } from '../types';
import { onDataChange, snagsForWorkspace } from '../db';
import { lineProblems } from '../lib/lineWork';
import { lineState } from '../ui/FactoryLineCard';
import { areasOf } from '../lib/areas';
import { useClientScope } from '../lib/activeClient';
import { nav } from '../state/useRoute';

type Counts = { open: number; critical: number; late: number };

/** A line's state in a short word beside its square: what is late or critical first, then what is open, else that nothing is. */
function shortWord(c: Counts | undefined): { tone: 'r' | 'a' | 'g' | 'n'; word: string } {
  if (!c) return { tone: 'n', word: '' };
  const st = lineState({ problems: c } as Parameters<typeof lineState>[0]);
  if (st.tone === 'r') return { tone: 'r', word: c.late ? `${c.late} late` : `${c.critical} critical` };
  if (st.tone === 'a') return { tone: 'a', word: `${c.open} open` };
  return { tone: st.tone, word: st.word };
}

export function LinePlacePanel({ wsId, lines }: { wsId: string; lines: Workspace[] }) {
  const cs = useClientScope();
  const shown = useMemo(() => lines.filter(w => cs.line(w.id)), [lines, cs]);
  const key = shown.map(w => w.id).join(',');
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  useEffect(() => {
    let live = true;
    const load = () => void Promise.all(shown.map(async w => [w.id, lineProblems(await snagsForWorkspace(w.id), w)] as const)).then(rows => {
      if (live) setCounts(Object.fromEntries(rows.map(([id, p]) => [id, { open: p.open, critical: p.critical, late: p.late }])));
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the lines by key: the list is a new array every render
  }, [key]);
  if (!shown.length) return null;
  const { areas, noArea } = areasOf(shown);
  const groups = [...areas.map(a => ({ key: a.title, title: a.title, lines: a.lines })), ...(noArea.length ? [{ key: '-', title: areas.length ? 'No area yet' : '', lines: noArea }] : [])];
  const row = (w: Workspace) => {
    const st = shortWord(counts[w.id]);
    const on = w.id === wsId;
    return (
      <li key={w.id}>
        <button type="button" className={'lpp-line' + (on ? ' is-on' : '')} aria-current={on ? 'page' : undefined} data-place-line={w.name} onClick={() => { if (!on) nav(`/lines/${encodeURIComponent(w.id)}`); }}>
          <i className={'lpp-sq is-' + st.tone} aria-hidden />
          <span className="lpp-name">{w.name}</span>
          {/* normal recedes (the house's visual management, rule 2): the word stands beside a line only when something is wrong —
              late, critical or open — as MinLine draws it; a quiet line's state is said to a screen reader */}
          {st.word && (st.tone === 'r' || st.tone === 'a'
            ? <span className={'lpp-word is-' + st.tone}>{st.word}</span>
            : <span className="sr-only">{st.word}</span>)}
        </button>
      </li>
    );
  };
  return (
    <aside className="lpp" aria-label="Areas and lines" data-place-panel>
      <p className="lpp-h">{cs.filtering && cs.client ? cs.client : 'Factory'}</p>
      {groups.map(g => (
        <section key={g.key} className="lpp-g" aria-label={g.title || 'Lines'}>
          {g.title && <p className="lpp-gh">{g.title}</p>}
          <ul className="lpp-lines">{g.lines.map(row)}</ul>
        </section>
      ))}
    </aside>
  );
}
