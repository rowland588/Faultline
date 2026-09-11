/* THE LEVER TREE — the project as it is drawn on paper.
 *
 * The desired outcome at the top; what has to be true for it underneath; the
 * conditions under those; and the work at the bottom. Every box is typed by the
 * person who owns the project, and every colour is set by them too.
 *
 * That last part is deliberate and was argued about. An earlier design had the
 * app compute each colour from the tracker's statuses and the ppm readings —
 * clever, and wrong. This is a thinking surface before it is a reporting one:
 * you draw the tree to work out what has to be true, often before there is any
 * data about it at all. A tool that overrides the colour you chose is arguing
 * with the person holding the pen.
 *
 * The only thing that arrives from elsewhere is the work at the bottom, and it
 * arrives by being pasted — a block of lines from the tracker becomes one node
 * per line, in one go, because typing twenty actions back in by hand is how a
 * tool gets abandoned in week two.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listTreeNodes, putTreeNode, putTreeNodes, deleteTreeBranch,
  onDataChange, type TreeNodeRow, type Rag,
} from '../db';
import { uid, now } from '../lib/ids';
import { nav } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { AccountMenu } from '../ui/AccountMenu';
import { useProject } from '../lib/useProjects';
import { useSyncedAt } from '../cloud/session';

/** What each depth is called. Past the fourth we stop naming them — the tree is
 *  the user's to shape, and a level with no name is better than a wrong one. */
const LEVELS = ['Desired outcome', 'What needs to be true', 'Required conditions', 'Required actions'];
const levelName = (depth: number) => LEVELS[depth] ?? `Level ${depth + 1}`;

const RAGS: { k: Rag; label: string }[] = [
  { k: 'g', label: 'On track' },
  { k: 'a', label: 'At risk' },
  { k: 'r', label: 'Off track' },
  { k: 'n', label: 'No colour' },
];

interface Tree { node: TreeNodeRow; depth: number; kids: Tree[] }

/** Rows into a tree, sorted, with anything orphaned lifted to the top rather
 *  than silently vanishing — a node you cannot see is a node you cannot fix. */
function build(rows: TreeNodeRow[]): Tree[] {
  const byId = new Map(rows.map(r => [r.id, r]));
  const kids = new Map<string, TreeNodeRow[]>();
  for (const r of rows) {
    const p = r.parentId && byId.has(r.parentId) ? r.parentId : '';
    kids.set(p, [...(kids.get(p) ?? []), r]);
  }
  const make = (n: TreeNodeRow, depth: number): Tree => ({
    node: n, depth,
    kids: (kids.get(n.id) ?? []).sort((a, b) => a.sort - b.sort).map(k => make(k, depth + 1)),
  });
  return (kids.get('') ?? []).sort((a, b) => a.sort - b.sort).map(n => make(n, 0));
}

/* ---------- one box ---------- */

function Box({
  t, onChange, onAdd, onDelete, onPaste, onMove, drag,
}: {
  t: Tree;
  onChange: (patch: Partial<TreeNodeRow>) => void;
  onAdd: () => void;
  onDelete: () => void;
  onPaste: () => void;
  onMove: (dir: -1 | 1) => void;
  drag: {
    id: string | null;
    start: (id: string) => void;
    over: string | null;
    setOver: (id: string | null) => void;
    drop: (targetId: string) => void;
  };
}) {
  const { node } = t;
  const ta = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(node.text);

  // Follow the stored value when it changes underneath us (another device,
  // an undo) — but never while this box is the one being typed into.
  useEffect(() => {
    if (document.activeElement !== ta.current) setText(node.text);
  }, [node.text]);

  // Grow to fit. A box that scrolls its own text hides half the thought in it.
  const fit = useCallback(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);
  useEffect(fit, [text, fit]);

  const commit = () => { if (text !== node.text) onChange({ text }); };

  return (
    <div
      className={'lt-box is-' + node.rag + (drag.over === node.id ? ' is-drop' : '') + (drag.id === node.id ? ' is-dragging' : '')}
      draggable
      onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; drag.start(node.id); }}
      onDragOver={e => { if (drag.id && drag.id !== node.id) { e.preventDefault(); e.stopPropagation(); drag.setOver(node.id); } }}
      onDragLeave={() => { if (drag.over === node.id) drag.setOver(null); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); drag.drop(node.id); }}
    >
      <textarea
        ref={ta} className="lt-text" rows={1} value={text}
        placeholder={levelName(t.depth)}
        aria-label={levelName(t.depth)}
        onChange={e => { setText(e.target.value); fit(); }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
          if (e.key === 'Escape') { setText(node.text); (e.target as HTMLTextAreaElement).blur(); }
        }}
      />

      <div className="lt-tools">
        <div className="lt-rags" role="group" aria-label="Colour">
          {RAGS.map(r => (
            <button
              key={r.k} type="button" title={r.label} aria-label={r.label}
              aria-pressed={node.rag === r.k}
              className={'lt-rag is-' + r.k + (node.rag === r.k ? ' on' : '')}
              onClick={() => onChange({ rag: r.k })}
            />
          ))}
        </div>
        <div className="lt-acts">
          <button type="button" className="lt-mini" title="Move up" aria-label="Move up" onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="lt-mini" title="Move down" aria-label="Move down" onClick={() => onMove(1)}>↓</button>
          <button type="button" className="lt-mini" title="Add to its right" aria-label="Add to its right" onClick={onAdd}>＋</button>
          <button type="button" className="lt-mini" title="Paste a list to its right" aria-label="Paste a list to its right" onClick={onPaste}>⇱</button>
          <button type="button" className="lt-mini is-del" title="Delete" aria-label="Delete" onClick={onDelete}>×</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- the tree ---------- */

export function LeverTree({ projectId }: { projectId: string }) {
  const { project } = useProject(projectId);
  const [rows, setRows] = useState<TreeNodeRow[] | null>(null);
  const [pasteInto, setPasteInto] = useState<TreeNodeRow | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const syncedAt = useSyncedAt();

  const load = useCallback(async () => { setRows(await listTreeNodes(projectId)); }, [projectId]);
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load, syncedAt]);

  const nodes = rows ?? [];
  const tree = build(nodes);
  const siblingsOf = (parentId?: string) =>
    nodes.filter(n => (n.parentId ?? '') === (parentId ?? '')).sort((a, b) => a.sort - b.sort);

  const addNode = async (parentId?: string) => {
    const sibs = siblingsOf(parentId);
    const t = now();
    await putTreeNode({
      id: uid(), projectId, parentId, text: '', rag: 'n',
      sort: sibs.length ? sibs[sibs.length - 1].sort + 1 : 0,
      createdAt: t, updatedAt: t,
    });
    await load();
  };

  const change = async (n: TreeNodeRow, patch: Partial<TreeNodeRow>) => {
    await putTreeNode({ ...n, ...patch });
    await load();
  };

  const remove = async (n: TreeNodeRow) => {
    const kids = nodes.filter(k => k.parentId === n.id).length;
    const what = n.text.trim() || 'this empty box';
    const msg = kids
      ? `Delete “${what}” and the ${kids} box${kids === 1 ? '' : 'es'} under it?`
      : `Delete “${what}”?`;
    if (!window.confirm(msg + '\n\nNothing in the tracker is touched.')) return;
    await deleteTreeBranch(projectId, n.id);
    await load();
  };

  /** Swap with the sibling either side — reordering without dragging, which is
   *  the only way this works on a phone. */
  const move = async (n: TreeNodeRow, dir: -1 | 1) => {
    const sibs = siblingsOf(n.parentId);
    const i = sibs.findIndex(s => s.id === n.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sibs.length) return;
    await putTreeNodes([{ ...n, sort: sibs[j].sort }, { ...sibs[j], sort: n.sort }]);
    await load();
  };

  /** Re-parent by dragging one box onto another. Refuses to drop a box inside
   *  its own branch, which would detach that whole branch from the tree. */
  const drop = async (targetId: string) => {
    const id = dragId;
    setDragId(null); setOverId(null);
    if (!id || id === targetId) return;
    const moving = nodes.find(n => n.id === id);
    if (!moving) return;
    for (let p = nodes.find(n => n.id === targetId); p; p = nodes.find(n => n.id === p!.parentId)) {
      if (p.id === id) return;   // target is inside the branch being moved
    }
    const sibs = siblingsOf(targetId);
    await putTreeNode({
      ...moving, parentId: targetId,
      sort: sibs.length ? sibs[sibs.length - 1].sort + 1 : 0,
    });
    await load();
  };

  /** A pasted block becomes one box per line. This is how the tracker's work
   *  gets in: copy the column, paste it, done. */
  const commitPaste = async () => {
    const parent = pasteInto;
    const lines = pasteText.split('\n').map(l => l.replace(/^[\s•\-*•]+/, '').trim()).filter(Boolean);
    setPasteInto(null); setPasteText('');
    if (!parent || lines.length === 0) return;
    const sibs = siblingsOf(parent.id);
    let sort = sibs.length ? sibs[sibs.length - 1].sort + 1 : 0;
    const t = now();
    await putTreeNodes(lines.map(text => ({
      id: uid(), projectId, parentId: parent.id, text, rag: 'n' as Rag,
      sort: sort++, createdAt: t, updatedAt: t,
    })));
    await load();
  };

  const dragApi = { id: dragId, start: setDragId, over: overId, setOver: setOverId, drop };

  const render = (t: Tree) => (
    <li className="lt-node" key={t.node.id}>
      {/* the two halves of the vertical bar joining a row of children; the
          first child drops its upper half and the last its lower, which leaves
          the bar running exactly from the first centre to the last */}
      <span className="lt-arm lt-arm-up" aria-hidden />
      <span className="lt-arm lt-arm-dn" aria-hidden />
      <Box
        t={t}
        onChange={p => void change(t.node, p)}
        onAdd={() => void addNode(t.node.id)}
        onDelete={() => void remove(t.node)}
        onPaste={() => { setPasteInto(t.node); setPasteText(''); }}
        onMove={d => void move(t.node, d)}
        drag={dragApi}
      />
      {t.kids.length > 0 && <ul className="lt-kids">{t.kids.map(render)}</ul>}
    </li>
  );

  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub">That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }

  const depth = Math.max(1, ...nodes.map(n => {
    let d = 0;
    for (let p = n; p?.parentId; p = nodes.find(x => x.id === p!.parentId)!) { d++; if (d > 12) break; }
    return d + 1;
  }));

  return (
    <div className="wrap pace lt-screen">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Lever tree' },
      ]} />

      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">Lever tree</h1>
          <p className="pace-lede">
            The outcome, what has to be true for it, and the work underneath. Type into any box;
            paste a list to fill a row in one go.
          </p>
        </div>
        <div className="pace-head-actions">
          <button className="btn" onClick={() => window.print()}>Print</button>
          <AccountMenu />
        </div>
      </header>

      {rows === null ? (
        <p className="sub">Loading…</p>
      ) : tree.length === 0 ? (
        <div className="lt-empty">
          <p className="lt-empty-t">Start with the outcome</p>
          <p className="sub">
            One box at the top — what this project has to deliver. Everything else hangs off it.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => void addNode(undefined)}>
            ＋ Add the desired outcome
          </button>
        </div>
      ) : (
        <>
          <div className="lt-canvas">
            <div className="lt-scroll">
              {/* the level names, on the same pitch as the columns below */}
              <div className="lt-legend">
                {LEVELS.slice(0, depth).map(l => <span key={l} className="lt-legend-i">{l}</span>)}
              </div>
              <ul className="lt-root">{tree.map(render)}</ul>
            </div>
          </div>
          <div className="lt-foot">
            <button className="btn" onClick={() => void addNode(undefined)}>＋ Another outcome</button>
            <span className="sub">
              Drag a box onto another to move it there · ↑ ↓ reorder · ＋ adds to its right · ⇱ pastes a list
            </span>
          </div>
        </>
      )}

      {pasteInto && (
        <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Paste a list">
          <div className="lt-paste">
            <h2 className="lt-paste-t">Paste underneath “{pasteInto.text.trim() || 'this box'}”</h2>
            <p className="sub">One box per line. Copy the column straight out of the tracker.</p>
            <textarea
              className="text-input lt-paste-ta" autoFocus value={pasteText}
              placeholder={'Re-time the bagger changeover\nOrder the guard brackets\nRebuild Bagger 3 infeed'}
              onChange={e => setPasteText(e.target.value)}
            />
            <div className="row-end">
              <button className="btn btn-ghost" onClick={() => { setPasteInto(null); setPasteText(''); }}>Cancel</button>
              <button className="btn btn-primary" disabled={!pasteText.trim()} onClick={() => void commitPaste()}>
                Add {pasteText.split('\n').filter(l => l.trim()).length || ''} box{pasteText.split('\n').filter(l => l.trim()).length === 1 ? '' : 'es'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
