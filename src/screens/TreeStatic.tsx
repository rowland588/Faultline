/* The lever tree, read-only and scaled to fit a fixed box.
 *
 * The same tree the project is steered on, printed rather than edited: no
 * tools, no folds, no selects — the boxes, their status, and the lines between
 * them. It is DELIBERATELY the same markup and the same classes as the live
 * one, because a report that redraws the tree in its own style is a report
 * people stop trusting the moment the two disagree.
 *
 * Everything is shown. A client report that quietly drops the bottom row is hiding
 * the work, and the work is the half the tree exists to hold; so when the tree
 * outgrows the sheet it is scaled down rather than trimmed.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { listTreeNodes, type TreeNodeRow, type NodeStatus } from '../db';
import { boundNumber, boardWords, type NumberSources } from '../lib/treeBind';

/** A box's state in words — the tree's own, read by the job's front page too. */
export const LABEL: Record<NodeStatus, string> = {
  n: 'Not started', w: 'In progress', a: 'At risk', r: 'Overdue', g: 'Done',
};

interface Node { row: TreeNodeRow; depth: number; kids: Node[] }

function build(rows: TreeNodeRow[]): Node[] {
  const has = new Set(rows.map(r => r.id));
  const kids = new Map<string, TreeNodeRow[]>();
  for (const r of rows) {
    const p = r.parentId && has.has(r.parentId) ? r.parentId : '';
    kids.set(p, [...(kids.get(p) ?? []), r]);
  }
  const make = (row: TreeNodeRow, depth: number): Node => ({
    row, depth,
    kids: (kids.get(row.id) ?? []).sort((a, b) => a.sort - b.sort).map(k => make(k, depth + 1)),
  });
  return (kids.get('') ?? []).sort((a, b) => a.sort - b.sort).map(r => make(r, 0));
}

/** Read the tree for a project. Null while loading, [] when there isn't one —
 *  the caller needs to tell those apart to avoid flashing an empty page. */
export function useTreeNodes(projectId: string): TreeNodeRow[] | null {
  const [rows, setRows] = useState<TreeNodeRow[] | null>(null);
  useEffect(() => { void listTreeNodes(projectId).then(setRows).catch(() => setRows([])); }, [projectId]);
  return rows;
}

function Branch({ n, numbers }: { n: Node; numbers?: NumberSources }) {
  /* A box whose colour follows a number says the number and what it means, the
     same way the live tree does — the colour on paper is never the only carrier. */
  const num = boundNumber(n.row.bind, numbers);
  return (
    <li className="lt-node">
      <span className="lt-arm lt-arm-up" aria-hidden />
      <span className="lt-arm lt-arm-dn" aria-hidden />
      <div className={'lt-box is-' + n.row.rag + (n.depth >= 3 ? ' is-act' : '')}>
        <p className="lt-text-s">{n.row.text || '—'}</p>
        {num && <span className="lt-num">{num.figure}</span>}
        <span className={'lt-status is-' + n.row.rag}>
          <span className="lt-status-dot" aria-hidden />
          <span className="lt-status-l">{num ? num.words : boardWords(n.row.id, n.row.rag) ?? LABEL[n.row.rag] ?? LABEL.n}</span>
        </span>
      </div>
      {n.kids.length > 0 && <ul className="lt-kids">{n.kids.map(k => <Branch key={k.row.id} n={k} numbers={numbers} />)}</ul>}
    </li>
  );
}

export function TreeStatic({ rows, numbers, maxW, maxH }: {
  rows: TreeNodeRow[];
  /** The project's numbers, for the boxes whose colour follows one. */
  numbers?: NumberSources;
  maxW: number; maxH: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Measured at 1:1 and then scaled once, before paint, so the sheet never
  // shows the tree at the wrong size on the way to the right one.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.zoom = '1';
    const w = el.scrollWidth, h = el.scrollHeight;
    if (!w || !h) return;
    setScale(Math.min(1, maxW / w, maxH / h));
  }, [rows, maxW, maxH]);

  const tree = build(rows);
  return (
    <div className="lt-static" style={{ width: maxW, height: maxH }}>
      <div ref={box} className="lt-static-in" style={{ zoom: scale }}>
        <ul className="lt-root">{tree.map(n => <Branch key={n.row.id} n={n} numbers={numbers} />)}</ul>
      </div>
    </div>
  );
}
