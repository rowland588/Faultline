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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  listTreeNodes, putTreeNode, putTreeNodes, deleteTreeBranch,
  onDataChange, type TreeNodeRow, type NodeStatus,
} from '../db';
import { uid, now } from '../lib/ids';
import { nav } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { AccountMenu } from '../ui/AccountMenu';
import { useProject } from '../lib/useProjects';
import { useSyncedAt } from '../cloud/session';
import { useSticky } from '../lib/useSticky';
import { parsePastedRows } from '../lib/pastedRows';
import { TrackerPicker, actionText } from './TrackerPicker';
import { usePaceSnapshots } from '../lib/usePaceSnapshots';

/* How far in and out the tree will go. Below about a third the words stop being
 * words; above 1.6 there is no reason to be on this screen rather than reading
 * one box. */
const ZOOM_MIN = 0.3, ZOOM_MAX = 1.6;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

/** What each depth is called. Past the fourth we stop naming them — the tree is
 *  the user's to shape, and a level with no name is better than a wrong one. */
const LEVELS = ['Desired outcome', 'What needs to be true', 'Required conditions', 'Required actions'];
const levelName = (depth: number) => LEVELS[depth] ?? `Level ${depth + 1}`;

/* Where a box has got to. In the order work actually travels, so the list reads
 * as a course rather than a palette. */
const STATUSES: { k: NodeStatus; label: string }[] = [
  { k: 'n', label: 'Not started' },
  { k: 'w', label: 'In progress' },
  { k: 'a', label: 'At risk' },
  { k: 'r', label: 'Blocked' },
  { k: 'g', label: 'Done' },
];
const statusLabel = (k: NodeStatus) => STATUSES.find(s => s.k === k)?.label ?? 'Not started';

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

/** How deep a row sits, walked from the row itself — the rendered tree knows
 *  this already, but the fold-all needs it before anything is rendered. */
function depthOf(n: TreeNodeRow, all: TreeNodeRow[]): number {
  let d = 0;
  for (let p = n; p.parentId; d++) {
    const up = all.find(x => x.id === p.parentId);
    if (!up || d > 24) break;
    p = up;
  }
  return d;
}

/* ---------- one box ---------- */

function Box({
  t, onChange, onAddBelow, onAddRight, onDelete, onPaste, onDropText, onMove,
  folded, onFold, drag, moving, onPickUp, onPutHere,
}: {
  t: Tree;
  /** id of the box being moved by tapping, anywhere in the tree */
  moving: string | null;
  onPickUp: () => void;
  onPutHere: () => void;
  folded: boolean;
  onFold: () => void;
  onChange: (patch: Partial<TreeNodeRow>) => void;
  onAddBelow: () => void;
  onAddRight: () => void;
  onDelete: () => void;
  onPaste: () => void;
  onDropText: (text: string) => void;
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

  // The work at the bottom is a LIST, and should look like one: tight rows in a
  // column, not full cards. Four actions rendered as cards made their branch
  // taller than everything else on the page and pushed the next condition down
  // out of sight, which is the opposite of a tree you can take in at a glance.
  const act = t.depth >= 3;
  const n = t.kids.length;

  // A box being moved cannot be dropped inside itself, and the one you picked
  // up is not a place to put it.
  const isMoving = moving === node.id;
  const canTake = !!moving && !isMoving;

  return (
    <div
      className={'lt-box is-' + node.rag + (act ? ' is-act' : '')
        + (drag.over === node.id ? ' is-drop' : '') + (drag.id === node.id ? ' is-dragging' : '')
        + (isMoving ? ' is-lifted' : '')}
      draggable
      onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; drag.start(node.id); }}
      onDragOver={e => {
        // two kinds of drag land here: a box being moved inside the tree, and a
        // selection dragged in from a spreadsheet. Both are welcome.
        const text = e.dataTransfer.types.includes('text/plain');
        if ((drag.id && drag.id !== node.id) || text) {
          e.preventDefault(); e.stopPropagation(); drag.setOver(node.id);
        }
      }}
      onDragLeave={() => { if (drag.over === node.id) drag.setOver(null); }}
      onDrop={e => {
        e.preventDefault(); e.stopPropagation();
        const text = e.dataTransfer.getData('text/plain');
        // dropped from outside — every row becomes a box underneath this one
        if (!drag.id && text.trim()) { drag.setOver(null); onDropText(text); return; }
        drag.drop(node.id);
      }}
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

      {/* Fold this branch away. On a condition that is "hide the actions"; on a
          line it is "hide that whole line's thinking" — same control, and the
          count stays visible so nothing is hidden without saying so. */}
      {n > 0 && (
        <button
          type="button" className={'lt-fold' + (folded ? ' is-folded' : '')}
          onClick={onFold} aria-expanded={!folded}
          title={folded ? `Show the ${n} under this` : `Hide the ${n} under this`}
          aria-label={folded ? `Show the ${n} under this` : `Hide the ${n} under this`}
        >
          <span className="lt-fold-c" aria-hidden>{folded ? '▸' : '▾'}</span>
          {folded && <span className="lt-fold-n">{n}</span>}
        </button>
      )}

      {/* While something is being moved, every other box turns into a target.
          An overlay rather than a click handler on the box, because the box is
          a textarea and tapping it has always meant "edit this". */}
      {canTake && (
        <button type="button" className="lt-take" onClick={onPutHere}>
          Put it here
        </button>
      )}

      <div className="lt-tools">
        {/* The status says its name. A coloured square on its own tells you a
            box is orange and not what orange means — and says nothing at all on
            paper, or to anybody who cannot separate red from green. */}
        <label className={'lt-status is-' + node.rag}>
          <span className="lt-status-dot" aria-hidden />
          <span className="lt-status-l">{statusLabel(node.rag)}</span>
          <select
            className="lt-status-sel" value={node.rag} aria-label="Status"
            onChange={e => onChange({ rag: e.target.value as NodeStatus })}
          >
            {STATUSES.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
          </select>
        </label>
        <div className="lt-acts">
          {/* Tapping this picks the box up; tapping another box drops it there.
              Drag-and-drop does not exist on touch at all, so on a phone this
              is the ONLY way to move a box — and it works the same on a
              computer, so there is one thing to learn rather than two. */}
          <button
            type="button" className={'lt-mini' + (isMoving ? ' is-on' : '')}
            title={isMoving ? 'Cancel the move' : 'Move this box somewhere else'}
            aria-label={isMoving ? 'Cancel the move' : 'Move this box somewhere else'}
            onClick={onPickUp}
          >⠿</button>
          <button type="button" className="lt-mini" title="Move up" aria-label="Move up" onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="lt-mini" title="Move down" aria-label="Move down" onClick={() => onMove(1)}>↓</button>
          {/* ＋ is the one that gets pressed, so it does the common thing:
              another box at THIS level, below this one. Going a level deeper is
              the rarer move and gets its own button rather than the default. */}
          <button type="button" className="lt-mini" title="Add another below" aria-label="Add another below" onClick={onAddBelow}>＋</button>
          <button type="button" className="lt-mini" title="Add the next level to its right" aria-label="Add the next level to its right" onClick={onAddRight}>＋›</button>
          {/* The tracker is already in the app, so this opens THIS WEEK'S
              ACTIONS to be picked from rather than sending anybody back to
              Excel to copy a column. Typing is behind a link inside it. */}
          <button type="button" className="lt-mini" title="Add work from the tracker" aria-label="Add work from the tracker" onClick={onPaste}>☰</button>
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
  /** 'pick' = choose off the tracker (the normal way); 'type' = write it out. */
  const [addMode, setAddMode] = useState<'pick' | 'type'>('pick');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const syncedAt = useSyncedAt();

  /* THE TREE IS ALWAYS LANDSCAPE, phone included. An earlier build folded it
   * into an indented list below 720px, which is a perfectly good list and not a
   * lever tree — the shape IS the point, and a shape that changes with the
   * screen cannot be talked through with somebody looking over your shoulder.
   * So it keeps its columns everywhere and you zoom instead.
   *
   * Zoom is the CSS `zoom` property rather than a transform: it reflows, so the
   * scrollbars and the scroll extent come out right by themselves. A transform
   * scales the paint and leaves the container the wrong size, which is how you
   * end up unable to scroll to the part you just zoomed towards. */
  const [zoom, setZoom] = useSticky<number>('tree:' + projectId, 'zoom', 1);

  /* Which branches are folded away, remembered per project. Kept as a list of
   * ids rather than a flag on the row: it is how YOU are looking at the tree
   * right now, not something about the tree, and it has no business syncing to
   * anybody else's screen or showing up as a change on another device. */
  const [foldedIds, setFoldedIds] = useSticky<string[]>('tree:' + projectId, 'folded', []);
  const folded = new Set(foldedIds);
  const toggleFold = (id: string) =>
    setFoldedIds(folded.has(id) ? foldedIds.filter(f => f !== id) : [...foldedIds, id]);
  const canvas = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);

  /** Scale the whole tree to the width available — the "show me all of it" that
   *  a phone needs before anything else. */
  const fit = useCallback(() => {
    const box = canvas.current, inner = scroll.current;
    if (!box || !inner) return;
    const natural = inner.scrollWidth / (zoom || 1);
    if (natural > 0) setZoom(clampZoom((box.clientWidth - 8) / natural));
  }, [zoom, setZoom]);

  // Two fingers on the tree zooms it, which is what everybody's thumbs already
  // try to do. The page itself must not zoom with it, hence preventDefault.
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const gap = (t: React.TouchList) => {
    const a = t.item(0), b = t.item(1);
    return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0;
  };

  // This week's tracker, already uploaded and parsed — the work that gets hung
  // on the tree comes from here, not from the clipboard.
  const pace = usePaceSnapshots(projectId);
  const trackerActions = pace.snapshots[0]?.actions ?? [];

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

  /** Another box at the SAME level, directly below this one — what ＋ does.
   *  Slotted between this row's sort and the next one's rather than appended,
   *  so "add one here" puts it here and not at the bottom of the column. */
  const addBelow = async (n: TreeNodeRow) => {
    const sibs = siblingsOf(n.parentId);
    const i = sibs.findIndex(s => s.id === n.id);
    const next = sibs[i + 1];
    const t = now();
    await putTreeNode({
      id: uid(), projectId, parentId: n.parentId, text: '', rag: 'n',
      sort: next ? (n.sort + next.sort) / 2 : n.sort + 1,
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
    const lines = parsePastedRows(pasteText);
    setPasteInto(null); setPasteText('');
    if (!parent || lines.length === 0) return;
    const sibs = siblingsOf(parent.id);
    let sort = sibs.length ? sibs[sibs.length - 1].sort + 1 : 0;
    const t = now();
    await putTreeNodes(lines.map(text => ({
      id: uid(), projectId, parentId: parent.id, text, rag: 'n' as NodeStatus,
      sort: sort++, createdAt: t, updatedAt: t,
    })));
    await load();
  };

  /** Hang the picked tracker rows under a box, in the order they were listed. */
  const addPicked = async (parent: TreeNodeRow, picked: { ref: string }[]) => {
    setPasteInto(null);
    const sibs = siblingsOf(parent.id);
    let sort = sibs.length ? sibs[sibs.length - 1].sort + 1 : 0;
    const t = now();
    await putTreeNodes(picked.map(a => ({
      id: uid(), projectId, parentId: parent.id,
      text: actionText(a as never), rag: 'n' as NodeStatus,
      sort: sort++, createdAt: t, updatedAt: t,
    })));
    await load();
  };

  /** Everything already on the tree, lower-cased, so the picker can say which
   *  rows are hung on it somewhere already. */
  const alreadyOn = new Set(nodes.map(n => n.text.trim().toLowerCase()).filter(Boolean));

  const dragApi = { id: dragId, start: setDragId, over: overId, setOver: setOverId, drop };

  /** Move by tapping: pick a box up, then tap where it belongs. Shares the same
   *  guard as the drag — a box can never be put inside its own branch. */
  const putUnder = async (targetId: string | null) => {
    const id = moving;
    setMoving(null);
    if (!id || id === targetId) return;
    const box = nodes.find(n => n.id === id);
    if (!box) return;
    if (targetId) {
      for (let p = nodes.find(n => n.id === targetId); p; p = nodes.find(n => n.id === p!.parentId)) {
        if (p.id === id) return;
      }
    }
    const sibs = siblingsOf(targetId ?? undefined);
    await putTreeNode({
      ...box, parentId: targetId ?? undefined,
      sort: sibs.length ? sibs[sibs.length - 1].sort + 1 : 0,
    });
    await load();
  };
  const movingBox = moving ? nodes.find(n => n.id === moving) : null;

  /** Every box that has actions hanging off it — the one fold that gets used
   *  most, because it is the difference between the shape of the project and
   *  the detail of this week's work. */
  const actionParents = nodes
    .filter(n => nodes.some(k => k.parentId === n.id && depthOf(k, nodes) >= 3))
    .map(n => n.id);
  const actionsFolded = actionParents.length > 0 && actionParents.every(id => folded.has(id));
  const foldActions = () =>
    setFoldedIds(actionsFolded
      ? foldedIds.filter(f => !actionParents.includes(f))
      : [...new Set([...foldedIds, ...actionParents])]);
  const pasteRows = pasteText.trim() ? parsePastedRows(pasteText) : [];

  const render = (t: Tree) => (
    <li className="lt-node" key={t.node.id}>
      {/* the two halves of the vertical bar joining a row of children; the
          first child drops its upper half and the last its lower, which leaves
          the bar running exactly from the first centre to the last */}
      <span className="lt-arm lt-arm-up" aria-hidden />
      <span className="lt-arm lt-arm-dn" aria-hidden />
      <Box
        t={t}
        folded={folded.has(t.node.id)}
        onFold={() => toggleFold(t.node.id)}
        moving={moving}
        onPickUp={() => setMoving(moving === t.node.id ? null : t.node.id)}
        onPutHere={() => void putUnder(t.node.id)}
        onChange={p => void change(t.node, p)}
        onAddBelow={() => void addBelow(t.node)}
        onAddRight={() => void addNode(t.node.id)}
        onDelete={() => void remove(t.node)}
        onPaste={() => { setPasteInto(t.node); setPasteText(''); setAddMode('pick'); }}
        onDropText={text => { setPasteInto(t.node); setPasteText(text); setAddMode('type'); }}
        onMove={d => void move(t.node, d)}
        drag={dragApi}
      />
      {t.kids.length > 0 && !folded.has(t.node.id) && <ul className="lt-kids">{t.kids.map(render)}</ul>}
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
          {actionParents.length > 0 && (
            <button className="btn" onClick={foldActions}>
              {actionsFolded ? 'Show actions' : 'Hide actions'}
            </button>
          )}
          <div className="lt-zoom" role="group" aria-label="Zoom">
            <button className="lt-zoom-b" aria-label="Zoom out" onClick={() => setZoom(clampZoom(zoom - 0.15))}>−</button>
            <button className="lt-zoom-n" onClick={fit} title="Fit the whole tree on screen">{Math.round(zoom * 100)}%</button>
            <button className="lt-zoom-b" aria-label="Zoom in" onClick={() => setZoom(clampZoom(zoom + 0.15))}>＋</button>
          </div>
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
          <div
            className="lt-canvas" ref={canvas}
            onTouchStart={e => { if (e.touches.length === 2) pinch.current = { d: gap(e.touches), z: zoom }; }}
            onTouchMove={e => {
              if (e.touches.length !== 2 || !pinch.current) return;
              e.preventDefault();
              setZoom(clampZoom(pinch.current.z * (gap(e.touches) / pinch.current.d)));
            }}
            onTouchEnd={() => { pinch.current = null; }}
          >
            <div className="lt-scroll" ref={scroll} style={{ zoom }}>
              {/* the level names, on the same pitch as the columns below */}
              <div className="lt-legend">
                {LEVELS.slice(0, depth).map(l => <span key={l} className="lt-legend-i">{l}</span>)}
              </div>
              <ul className="lt-root">{tree.map(render)}</ul>
            </div>
          </div>
          {movingBox && (
            <div className="lt-moving" role="status">
              <span className="lt-moving-t">
                Moving <b>{movingBox.text.trim() || 'an empty box'}</b> — tap the box it belongs under
              </span>
              <button className="btn btn-ghost" onClick={() => void putUnder(null)}>Put it at the top</button>
              <button className="btn" onClick={() => setMoving(null)}>Cancel</button>
            </div>
          )}

          <div className="lt-foot">
            <button className="btn" onClick={() => void addNode(undefined)}>＋ Another outcome</button>
            <span className="sub">
              ☰ hang this week’s tracker work under a box · ⠿ move a box · ↑ ↓ reorder
              {' '}· ＋ another below · ＋› the next level along · pinch to zoom, or tap the
              percentage to fit it all on.
            </span>
          </div>
        </>
      )}

      {pasteInto && addMode === 'pick' && (
        <TrackerPicker
          title={pasteInto.text.trim() || 'this box'}
          actions={trackerActions}
          alreadyOn={alreadyOn}
          onAdd={picked => void addPicked(pasteInto, picked)}
          onClose={() => setPasteInto(null)}
          onTypeInstead={() => setAddMode('type')}
        />
      )}

      {pasteInto && addMode === 'type' && (
        <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Type or paste a list">
          <div className="lt-paste">
            <h2 className="lt-paste-t">Paste underneath “{pasteInto.text.trim() || 'this box'}”</h2>
            <p className="sub">
              One box per row. Select the column in the tracker, copy, paste here — several
              columns at once is fine, they end up in the same box.
            </p>
            <textarea
              className="text-input lt-paste-ta" autoFocus value={pasteText}
              placeholder={'Re-time the bagger changeover\nOrder the guard brackets\nRebuild Bagger 3 infeed'}
              onChange={e => setPasteText(e.target.value)}
            />
            {/* what it will actually make, before it makes it — a paste out of a
                spreadsheet rarely looks the way you expected in the box */}
            {pasteRows.length > 0 && (
              <div className="lt-preview">
                <p className="lt-preview-h">{pasteRows.length} box{pasteRows.length === 1 ? '' : 'es'}</p>
                <ol className="lt-preview-l">
                  {pasteRows.slice(0, 8).map((r, i) => <li key={i}>{r}</li>)}
                  {pasteRows.length > 8 && <li className="sub">…and {pasteRows.length - 8} more</li>}
                </ol>
              </div>
            )}
            <div className="row-end">
              {trackerActions.length > 0 && (
                <button className="btn btn-ghost" onClick={() => setAddMode('pick')}>‹ Pick off the tracker</button>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost" onClick={() => { setPasteInto(null); setPasteText(''); }}>Cancel</button>
              <button className="btn btn-primary" disabled={pasteRows.length === 0} onClick={() => void commitPaste()}>
                Add {pasteRows.length || ''} box{pasteRows.length === 1 ? '' : 'es'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
