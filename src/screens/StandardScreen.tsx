/* THE LINE STANDARD — who stands where, on each product. See lib/standard.ts.
 *
 * Two views on one route: the products (/project/:id/standard) and one
 * product's map (/project/:id/standard/:sid). The map is the evidence
 * system's picture — a photo of the line or a frame off the walk — with
 * icons dropped on it instead of pins: pick an icon, tap the picture; drag
 * to move; tap to say who it is and what they do.
 *
 * SCREEN AND PAPER TOGETHER: whatever is placed here prints as one A4 page
 * per product (lib/standardPdf), the same picture, the same icons, the same
 * roles, with the headcount counted off the people. */
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Project } from '../types';
import { deleteStandard, framesForProject, getProject, putBlob, putStandard } from '../db';
import { nav } from '../state/useRoute';
import { uid, now } from '../lib/ids';
import { useBlobUrl } from '../lib/useBlobUrl';
import { usePrograms } from '../lib/usePrograms';
import { planModel } from '../lib/planModel';
import { copyFor, headcount, ICON_GROUPS, isShape, MARKS, markOf, nextRole, peopleOf, SHAPES, thingsOf, TONES, type MarkKind, type ShapeKind, type ShapeTone, type Standard, type StandardMark } from '../lib/standard';
import { Crumbs } from '../ui/Crumbs';
import { useStandards } from '../ui/StandardsCard';
import { Sheet } from '../ui/Sheet';
import { offerUndo } from '../ui/Undo';
import type { SnagAsset } from '../snag/types';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const printedToday = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const pdfName = (list: Standard[], project: Project) =>
  `${(list.length === 1 ? `${project.name} line standard - ${list[0].product}` : `${project.name} line standard`).replace(/[\\/:*?"<>|—–]+/g, ' - ').replace(/\s+/g, ' ').trim()}.pdf`;

async function standardsPdf(list: Standard[], project: Project) {
  const { loadPdfLib } = await import('../lib/savePdf');
  const { drawStandards } = await import('../lib/standardPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  await drawStandards(doc, list, project.name, printedToday());
  return doc;
}

/* THE CARD, SEEN BEFORE IT PRINTS. Rowland: "print doesn't work and I can't
   see the print format." Each card is drawn once as a picture; the picture is
   what is shown here and what goes into the PDF, so there is nothing to guess.
   Anything that goes wrong says so, rather than the button doing nothing. */
function PrintSheet({ list, project, onClose }: { list: Standard[]; project: Project; onClose: () => void }) {
  const [cards, setCards] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wide = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 900px)').matches;
  /* Redrawn when a card's contents change, not on every render — the editor
     hands a fresh array each time. */
  const sig = JSON.stringify(list.map(x => [x.id, x.product, x.photoKey, x.marks, x.note]));
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const { cardImage } = await import('../lib/standardCard');
        const out: string[] = [];
        for (const st of list) out.push(await cardImage(st, project.name, printedToday()));
        if (live) setCards(out);
      } catch (e) {
        console.error('line standard card failed', e);
        if (live) setErr('The card could not be drawn on this device. Please try again.');
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `sig` is the list, by what can change
  }, [sig, project.name]);
  const go = async (how: 'download' | 'print') => {
    setBusy(true); setErr(null);
    try {
      const doc = await standardsPdf(list, project);
      if (how === 'print') {
        const url = URL.createObjectURL(doc.output('blob') as Blob);
        const w = window.open(url, '_blank');
        if (!w) { const { deliverPdf } = await import('../lib/savePdf'); await deliverPdf(doc, pdfName(list, project)); }
        setTimeout(() => URL.revokeObjectURL(url), 120_000);
      } else {
        const { deliverPdf } = await import('../lib/savePdf');
        await deliverPdf(doc, pdfName(list, project));
      }
    } catch (e) {
      console.error('line standard PDF failed', e);
      setErr('The PDF could not be made. Please try again.');
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={list.length === 1 ? `Line standard — ${list[0].product}` : `Line standard — ${list.length} products`}>
      <div className="ls-print-acts">
        <button className="btn btn-primary" onClick={() => void go('download')} disabled={busy || !cards}>{busy ? 'Making it…' : 'Download PDF'}</button>
        {wide && <button className="btn" onClick={() => void go('print')} disabled={busy || !cards}>Print</button>}
        <span className="sub">A4 landscape · {list.length === 1 ? 'one page' : `${list.length} pages, one a product`}</span>
      </div>
      {err && <p className="ls-print-err">{err}</p>}
      {!cards && !err && <p className="sub">Drawing the card…</p>}
      <div className="ls-print-cards">
        {cards?.map((c, i) => <img key={i} className="ls-print-card" src={c} alt={`Line standard card for ${list[i]?.product}`} />)}
      </div>
    </Sheet>
  );
}

/** One icon, as the palette and the map both draw it. */
export function MarkIcon({ kind, size = 30 }: { kind: MarkKind; size?: number }) {
  const k = markOf(kind);
  return (
    <svg className="ls-ic" width={size} height={size} viewBox="-4 -4 32 32" aria-hidden>
      <circle cx="12" cy="12" r="15" fill="#fff" />
      <circle cx="12" cy="12" r="13.5" fill={k.colour} />
      <path d={k.glyph} fill="#fff" fillRule={k.rule ?? 'evenodd'} transform="translate(2.4 2.4) scale(0.8)" />
    </svg>
  );
}

export function StandardScreen({ projectId, standardId }: { projectId: string; standardId?: string }) {
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  useEffect(() => { void getProject(projectId).then(p => setProject(p ?? null)); }, [projectId]);
  const list = useStandards(projectId);
  if (project === undefined || list == null) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }
  const one = standardId ? list.find(s => s.id === standardId) : undefined;
  if (standardId && one) return <MapEditor project={project} s={one} all={list} />;
  return <Products project={project} list={list} />;
}

/* ------------------------------ the products ----------------------------- */

function Products({ project, list }: { project: Project; list: Standard[] }) {
  const progs = usePrograms(project.id);
  const [adding, setAdding] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [typed, setTyped] = useState('');
  const mapped = new Set(list.map(s => s.product.trim().toLowerCase()));
  const offered = [...new Map(progs.programs.map(p => [p.what.trim(), p])).values()]
    .filter(p => !mapped.has(p.what.trim().toLowerCase()));
  const commissioning = planModel(project) === 'commissioning';

  const create = async (product: string, programId?: string) => {
    const name = product.trim();
    if (!name) return;
    const t = now();
    /* A new map starts from the last one's picture: the line does not move
       between products, the people do. */
    const last = list[list.length - 1];
    const s: Standard = { id: uid(), projectId: project.id, product: name, programId, photoKey: last?.photoKey, marks: [], sort: t, createdAt: t, updatedAt: t };
    await putStandard(s);
    nav(`/project/${project.id}/standard/${s.id}`);
  };

  return (
    <div className="wrap pace">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${project.id}` },
        // Where it is held: Hand over on a stage-gate job, Lines on the others.
        commissioning
          ? { label: 'Hand over', to: `/project/${project.id}/handover` }
          : { label: 'Lines', to: `/project/${project.id}?view=lines` },
        { label: 'Line standard' },
      ]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">A tool · {commissioning ? 'part of handing over' : 'People'}</p>
          <h1 className="pace-title">Line standard</h1>
          <p className="pace-lede">
            Who stands where, and what they do, on each product. A picture of the line with the people and
            the kit placed on it — one map per product, printed and put up at the line.
          </p>
        </div>
        <div className="pace-head-actions">
          {list.length > 0 && <button className="btn btn-ghost" onClick={() => setPrinting(true)}>Print all</button>}
          <button className="btn btn-primary" onClick={() => setAdding(true)}>New map</button>
        </div>
      </header>

      {list.length === 0 ? (
        <div className="pace-empty">
          <p className="sub">No maps yet. Start with the product you run most.</p>
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>Make the first map</button>
        </div>
      ) : (
        <div className="ls-grid">
          {list.map(s => <ProductCard key={s.id} s={s} onOpen={() => nav(`/project/${project.id}/standard/${s.id}`)} />)}
        </div>
      )}

      {printing && <PrintSheet list={list} project={project} onClose={() => setPrinting(false)} />}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Which product?">
        {offered.length > 0 && (
          <>
            <p className="sub" style={{ marginTop: 0 }}>{commissioning ? 'From this job’s programs:' : 'From the programs:'}</p>
            <div className="ls-pick">
              {offered.map(p => <button key={p.id} className="ls-pick-b" onClick={() => void create(p.what, p.id)}>{p.what}</button>)}
            </div>
          </>
        )}
        <div className="field-label" style={{ marginTop: 12 }}>{offered.length ? 'Or type one' : 'The product'}</div>
        <form className="ls-type" onSubmit={e => { e.preventDefault(); void create(typed); }}>
          <input className="text-input" autoFocus={offered.length === 0} value={typed} placeholder="Maris Piper 2kg — Tall" onChange={e => setTyped(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={!typed.trim()}>Make the map</button>
        </form>
      </Sheet>
    </div>
  );
}

function ProductCard({ s, onOpen }: { s: Standard; onOpen: () => void }) {
  const url = useBlobUrl(s.photoKey);
  const n = headcount(s);
  return (
    <button className="ls-card" onClick={onOpen}>
      <span className="ls-card-pic">
        {url ? <img src={url} alt="" /> : <span className="ls-card-blank" />}
        {s.marks.map(m => (isShape(m)
          ? m.shape !== 'arrow' && m.shape !== 'text' && (
            <span key={m.id} className={'ls-card-shape' + (m.shape === 'circle' ? ' is-round' : '')}
              style={{ left: `${m.x - (m.w ?? 0) / 2}%`, top: `${m.y - (m.h ?? 0) / 2}%`, width: `${m.w}%`, height: `${m.h}%`, borderColor: TONES[m.tone ?? 'blue'].stroke, background: TONES[m.tone ?? 'blue'].fill }} />
          )
          : <span key={m.id} className="ls-card-dot" style={{ left: `${m.x}%`, top: `${m.y}%`, background: markOf(m.kind).colour }} />))}
      </span>
      <span className="ls-card-t">{s.product}</span>
      <span className="ls-card-s"><b>{plural(n, 'person', 'people')}</b>{thingsOf(s) ? ` · ${thingsOf(s)}` : ''}</span>
    </button>
  );
}

/* -------------------------------- the map -------------------------------- */

type Tool = { t: 'select' } | { t: 'icon'; kind: MarkKind } | { t: 'shape'; shape: ShapeKind };
type Drag = { id: string; mode: 'move' | 'resize' | 'start' | 'end'; x0: number; y0: number; orig: StandardMark; moved: boolean };
type Draw = { shape: ShapeKind; x0: number; y0: number; x1: number; y1: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

/** A shape's outline, in board pixels — the same geometry the card draws. */
function ShapeSvg({ m, bw, bh, selected, onDown }: {
  m: StandardMark; bw: number; bh: number; selected: boolean;
  onDown: (e: RPointerEvent, mode: Drag['mode']) => void;
}) {
  const t = TONES[m.tone ?? (m.shape === 'text' ? 'grey' : 'blue')];
  const w = ((m.w ?? 10) / 100) * bw, h = ((m.h ?? 10) / 100) * bh;
  const cx = (m.x / 100) * bw, cy = (m.y / 100) * bh;
  const sw = Math.max(1.5, bw * 0.0022);
  if (m.shape === 'arrow') {
    const x2 = cx + w, y2 = cy + h, ang = Math.atan2(h, w), head = Math.max(10, bw * 0.014);
    const p1 = `${x2 - head * Math.cos(ang - 0.45)},${y2 - head * Math.sin(ang - 0.45)}`;
    const p2 = `${x2 - head * Math.cos(ang + 0.45)},${y2 - head * Math.sin(ang + 0.45)}`;
    return (
      <g className={'ls-shape' + (selected ? ' is-on' : '')}>
        <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="transparent" strokeWidth={Math.max(18, sw * 8)} onPointerDown={e => onDown(e, 'move')} />
        <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={t.stroke} strokeWidth={sw * 1.6} strokeLinecap="round" pointerEvents="none" />
        <polygon points={`${x2},${y2} ${p1} ${p2}`} fill={t.stroke} pointerEvents="none" />
        {selected && <>
          <circle className="ls-handle" cx={cx} cy={cy} r={8} onPointerDown={e => onDown(e, 'start')} />
          <circle className="ls-handle" cx={x2} cy={y2} r={8} onPointerDown={e => onDown(e, 'end')} />
        </>}
      </g>
    );
  }
  const x = cx - w / 2, y = cy - h / 2;
  const body = m.shape === 'circle'
    ? <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} />
    : m.shape === 'triangle'
      ? <polygon points={`${cx},${y} ${x + w},${y + h} ${x},${y + h}`} />
      : <rect x={x} y={y} width={w} height={h} rx={m.shape === 'text' ? 4 : Math.min(8, w * 0.06)} />;
  return (
    <g className={'ls-shape' + (selected ? ' is-on' : '') + (m.shape === 'text' ? ' is-text' : '')}
      fill={m.shape === 'text' ? 'transparent' : t.fill} stroke={m.shape === 'text' ? (selected ? t.stroke : 'transparent') : t.stroke}
      strokeWidth={sw} strokeDasharray={m.shape === 'text' ? '4 3' : undefined}
      onPointerDown={e => onDown(e, 'move')}>
      {body}
      {selected && <rect className="ls-handle" x={x + w - 8} y={y + h - 8} width={16} height={16} rx={3}
        onPointerDown={e => { e.stopPropagation(); onDown(e, 'resize'); }} />}
    </g>
  );
}

function MapEditor({ project, s, all }: { project: Project; s: Standard; all: Standard[] }) {
  const progs = usePrograms(project.id);
  const url = useBlobUrl(s.photoKey);
  const [tool, setTool] = useState<Tool>({ t: 'icon', kind: 'person' });
  const [marks, setMarks] = useState<StandardMark[]>(s.marks);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [icons, setIcons] = useState(false);
  const [picture, setPicture] = useState(false);
  const [copying, setCopying] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [product, setProduct] = useState(s.product);
  const [size, setSize] = useState({ bw: 0, bh: 0 });
  const [draw, setDraw] = useState<Draw | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const commissioning = planModel(project) === 'commissioning';

  // Another device's edit, or an undo, arrives as a new record: take it,
  // unless something is being dragged right now.
  useEffect(() => { if (!drag.current) setMarks(s.marks); }, [s.marks]);
  useEffect(() => { setProduct(s.product); }, [s.product]);
  /* The board's size in pixels: shapes are drawn in pixels so a square stays
     square and a line stays a line at any width. */
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const read = () => setSize({ bw: el.clientWidth, bh: el.clientHeight });
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : undefined;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [url]);

  const save = (patch: Partial<Standard>) => putStandard({ ...s, marks, ...patch });
  const saveMarks = (next: StandardMark[]) => { setMarks(next); void putStandard({ ...s, marks: next }); };
  const patchMark = (id: string, p: Partial<StandardMark>) => setMarks(ms => ms.map(m => (m.id === id ? { ...m, ...p } : m)));

  const pct = (e: { clientX: number; clientY: number }) => {
    const r = boardRef.current?.getBoundingClientRect();
    if (!r) return { x: 50, y: 50 };
    return { x: r1(clamp(((e.clientX - r.left) / r.width) * 100, 0, 100)), y: r1(clamp(((e.clientY - r.top) / r.height) * 100, 0, 100)) };
  };
  /** How many percent of height make the same pixels as `w` percent of width. */
  const sameH = (w: number) => (size.bh ? (w * size.bw) / size.bh : w);

  /* ---- the board: place an icon, draw a shape, or let go of a selection ---- */
  const boardDown = (e: RPointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as Element).classList.contains('ls-photo') && !(e.target as Element).classList.contains('ls-svg')) return;
    if (tool.t === 'shape') {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      const at = pct(e);
      setDraw({ shape: tool.shape, x0: at.x, y0: at.y, x1: at.x, y1: at.y });
      return;
    }
    if (tool.t === 'select') { setSelected(null); return; }
    const at = pct(e);
    const m: StandardMark = { id: uid(), kind: tool.kind, x: clamp(at.x, 2, 98), y: clamp(at.y, 3, 97), label: tool.kind === 'person' ? nextRole({ marks }) : undefined };
    saveMarks([...marks, m]);
    if (tool.kind === 'person') setEditing(m.id);
  };
  const finishDraw = () => {
    const d = draw;
    setDraw(null);
    if (!d) return;
    const dx = d.x1 - d.x0, dy = d.y1 - d.y0;
    const tiny = Math.abs(dx) < 2 && Math.abs(dy) < 2;
    let m: StandardMark;
    if (d.shape === 'arrow') {
      m = { id: uid(), kind: 'shape', shape: 'arrow', x: d.x0, y: d.y0, w: tiny ? 15 : r1(dx), h: tiny ? 0 : r1(dy), tone: 'grey' };
    } else {
      let w = tiny ? (d.shape === 'text' ? 18 : 16) : Math.abs(dx);
      let h = tiny ? (d.shape === 'text' ? 7 : sameH(16) * (d.shape === 'rect' ? 0.62 : 1)) : Math.abs(dy);
      if (d.shape === 'square' || d.shape === 'circle') {
        const px = Math.max(w * size.bw, h * size.bh) / 100;
        w = size.bw ? (px / size.bw) * 100 : w; h = size.bh ? (px / size.bh) * 100 : h;
      }
      const cx = tiny ? d.x0 : Math.min(d.x0, d.x1) + w / 2, cy = tiny ? d.y0 : Math.min(d.y0, d.y1) + h / 2;
      m = { id: uid(), kind: 'shape', shape: d.shape, x: r1(cx), y: r1(cy), w: r1(w), h: r1(h), tone: d.shape === 'text' ? 'grey' : 'blue', label: '' };
    }
    /* Shapes go under everything placed on them, so a person stands on the
       machine rather than behind it. */
    const shapes = marks.filter(isShape), rest = marks.filter(x => !isShape(x));
    saveMarks([...shapes, m, ...rest]);
    setSelected(m.id);
    setTool({ t: 'select' });
    if (d.shape !== 'arrow') setEditing(m.id);
  };

  /* ---- dragging: an icon or a shape moves; a handle resizes ---- */
  const down = (e: RPointerEvent, id: string, mode: Drag['mode'] = 'move') => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const orig = marks.find(m => m.id === id);
    if (orig) drag.current = { id, mode, x0: e.clientX, y0: e.clientY, orig, moved: false };
  };
  const move = (e: RPointerEvent) => {
    if (draw) { const at = pct(e); setDraw({ ...draw, x1: at.x, y1: at.y }); return; }
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
    d.moved = true;
    const r = boardRef.current?.getBoundingClientRect();
    if (!r) return;
    const dx = ((e.clientX - d.x0) / r.width) * 100, dy = ((e.clientY - d.y0) / r.height) * 100;
    const o = d.orig;
    if (d.mode === 'move') patchMark(d.id, { x: r1(clamp(o.x + dx, 0, 100)), y: r1(clamp(o.y + dy, 0, 100)) });
    else if (d.mode === 'end') patchMark(d.id, { w: r1((o.w ?? 0) + dx), h: r1((o.h ?? 0) + dy) });
    else if (d.mode === 'start') patchMark(d.id, { x: r1(o.x + dx), y: r1(o.y + dy), w: r1((o.w ?? 0) - dx), h: r1((o.h ?? 0) - dy) });
    else {
      const left = o.x - (o.w ?? 0) / 2, top = o.y - (o.h ?? 0) / 2;
      const w = Math.max(3, (o.w ?? 0) + dx);
      let h = Math.max(3, (o.h ?? 0) + dy);
      if (o.shape === 'square' || o.shape === 'circle') h = sameH(w);
      patchMark(d.id, { w: r1(w), h: r1(h), x: r1(left + w / 2), y: r1(top + h / 2) });
    }
  };
  const up = () => {
    if (draw) { finishDraw(); return; }
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) { setMarks(ms => { void putStandard({ ...s, marks: ms }); return ms; }); return; }
    const m = marks.find(x => x.id === d.id);
    if (m && isShape(m)) {
      // first tap selects; a tap on what is already selected opens it
      if (selected === m.id) setEditing(m.id); else setSelected(m.id);
    } else setEditing(d.id);
  };

  const addOperatorBy = (shape: StandardMark) => {
    const right = shape.shape === 'arrow' ? shape.x + (shape.w ?? 0) : shape.x + (shape.w ?? 0) / 2;
    const p: StandardMark = {
      id: uid(), kind: 'person', x: r1(clamp(right + 3, 2, 98)), y: r1(clamp(shape.y, 3, 97)),
      label: nextRole({ marks }), task: shape.label?.trim() ? `On ${shape.label.trim()}` : undefined,
    };
    saveMarks([...marks, p]);
    setEditing(p.id);
  };

  const addPhoto = async (file: File) => {
    const key = `blob-${uid()}`;
    await putBlob(key, file);
    await save({ photoKey: key });
    setPicture(false);
  };
  const remove = async () => {
    if (!window.confirm(`Delete the map for “${s.product}”?`)) return;
    const undo = await deleteStandard(s.id);
    offerUndo(`Map for ${s.product} deleted`, undo);
    nav(`/project/${project.id}/standard`);
  };
  const copyTo = async (name: string, programId?: string) => {
    const c = copyFor({ ...s, marks }, name.trim(), uid, now(), programId);
    await putStandard(c);
    setCopying(false);
    nav(`/project/${project.id}/standard/${c.id}`);
  };

  const people = peopleOf({ marks });
  const editingMark = marks.find(m => m.id === editing);
  const others = [...new Map(progs.programs.map(p => [p.what.trim(), p])).values()]
    .filter(p => !all.some(x => x.product.trim().toLowerCase() === p.what.trim().toLowerCase()));
  const shapes = marks.filter(isShape), icons_ = marks.filter(m => !isShape(m));
  const say = tool.t === 'shape' ? `Drag on the board to draw a ${SHAPES.find(x => x.shape === tool.shape)?.word.toLowerCase()} — or just tap for one.`
    : tool.t === 'icon' ? `Tap the board to place ${tool.kind === 'person' ? 'a person' : `a ${markOf(tool.kind).word.toLowerCase()}`}. Drag to move.`
      : 'Tap a shape to select it, drag to move, pull the corner to resize. Tap it again to name it.';
  const fontPx = Math.max(10, size.bw * 0.017);

  return (
    <div className="wrap pace ls">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${project.id}` },
        // Where it is held: Hand over on a stage-gate job, Lines on the others.
        commissioning
          ? { label: 'Hand over', to: `/project/${project.id}/handover` }
          : { label: 'Lines', to: `/project/${project.id}?view=lines` },
        { label: 'Line standard', to: `/project/${project.id}/standard` },
        { label: s.product },
      ]} />

      <header className="ls-head">
        <div className="ls-head-main">
          <p className="pace-eyebrow">Line standard · {plural(people.length, 'person', 'people')}</p>
          <input className="ls-product" value={product} aria-label="Product" list="ls-products"
            onChange={e => setProduct(e.target.value)}
            onBlur={() => { const v = product.trim(); if (v && v !== s.product) void save({ product: v }); else setProduct(s.product); }} />
          <datalist id="ls-products">{progs.programs.map(p => <option key={p.id} value={p.what} />)}</datalist>
        </div>
        <div className="ls-head-actions">
          <button className="btn btn-ghost" onClick={() => setPrinting(true)}>Print</button>
          <button className="btn btn-ghost" onClick={() => setCopying(true)}>Copy to another product</button>
        </div>
      </header>

      <div className="ls-tools" role="toolbar" aria-label="What to place">
        <button className={'ls-tool' + (tool.t === 'select' ? ' is-on' : '')} aria-pressed={tool.t === 'select'} onClick={() => setTool({ t: 'select' })}>
          <span className="ls-ti" aria-hidden>↖</span><span>Select</span>
        </button>
        <span className="ls-tool-sep" aria-hidden />
        {SHAPES.map(sh => (
          <button key={sh.shape} className={'ls-tool is-shape' + (tool.t === 'shape' && tool.shape === sh.shape ? ' is-on' : '')}
            aria-pressed={tool.t === 'shape' && tool.shape === sh.shape} title={sh.word} aria-label={sh.word}
            onClick={() => setTool({ t: 'shape', shape: sh.shape })}>
            <ShapeGlyph shape={sh.shape} />
          </button>
        ))}
        <span className="ls-tool-sep" aria-hidden />
        <button className={'ls-tool' + (tool.t === 'icon' && tool.kind === 'person' ? ' is-on' : '')}
          aria-pressed={tool.t === 'icon' && tool.kind === 'person'} onClick={() => setTool({ t: 'icon', kind: 'person' })}>
          <MarkIcon kind="person" size={24} /><span>Person</span>
        </button>
        {tool.t === 'icon' && tool.kind !== 'person' && (
          <button className="ls-tool is-on" aria-pressed onClick={() => setIcons(true)}>
            <MarkIcon kind={tool.kind} size={24} /><span>{markOf(tool.kind).word}</span>
          </button>
        )}
        <button className="ls-tool" onClick={() => setIcons(true)}><span className="ls-ti" aria-hidden>＋</span><span>Icons</span></button>
      </div>
      <p className="sub ls-tools-say">{say}</p>

      <div className="ls-body">
        <div className="ls-board-wrap">
          <div ref={boardRef} className={'ls-board' + (url ? '' : ' is-blank') + (tool.t !== 'select' ? ' is-placing' : '')}
            onPointerDown={boardDown} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {url && <img className="ls-photo" src={url} alt="" draggable={false} onLoad={() => {
              const el = boardRef.current; if (el) setSize({ bw: el.clientWidth, bh: el.clientHeight });
            }} />}
            {size.bw > 0 && (
              <svg className="ls-svg" width={size.bw} height={size.bh} viewBox={`0 0 ${size.bw} ${size.bh}`}>
                {shapes.map(m => (
                  <ShapeSvg key={m.id} m={m} bw={size.bw} bh={size.bh} selected={selected === m.id}
                    onDown={(e, mode) => down(e, m.id, mode)} />
                ))}
                {draw && (() => {
                  const x = Math.min(draw.x0, draw.x1), y = Math.min(draw.y0, draw.y1);
                  return draw.shape === 'arrow'
                    ? <line x1={(draw.x0 / 100) * size.bw} y1={(draw.y0 / 100) * size.bh} x2={(draw.x1 / 100) * size.bw} y2={(draw.y1 / 100) * size.bh} className="ls-draft" />
                    : <rect x={(x / 100) * size.bw} y={(y / 100) * size.bh} width={(Math.abs(draw.x1 - draw.x0) / 100) * size.bw} height={(Math.abs(draw.y1 - draw.y0) / 100) * size.bh} className="ls-draft" />;
                })()}
              </svg>
            )}
            {/* the words in the middle of each shape */}
            {shapes.filter(m => m.shape !== 'arrow' && m.label).map(m => (
              <span key={`t-${m.id}`} className={'ls-shape-t' + (m.shape === 'triangle' ? ' is-tri' : '')}
                style={{
                  left: `${m.x - (m.w ?? 0) / 2}%`, top: `${m.y - (m.h ?? 0) / 2}%`, width: `${m.w}%`, height: `${m.h}%`,
                  color: TONES[m.tone ?? 'blue'].ink, fontSize: fontPx,
                }}>{m.label}</span>
            ))}
            {icons_.map(m => (
              <button key={m.id} type="button" className={'ls-mark' + (editing === m.id ? ' is-on' : '')}
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
                aria-label={`${markOf(m.kind).word}${m.label ? ` — ${m.label}` : ''}`}
                onPointerDown={e => down(e, m.id)} onClick={e => e.stopPropagation()}>
                <MarkIcon kind={m.kind} />
                {m.label && <span className="ls-mark-l">{m.label}</span>}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm ls-pic-b" onClick={() => setPicture(true)}>
            {url ? 'Change the picture' : 'Add a picture of the line — or draw it with shapes'}
          </button>
        </div>

        <aside className="ls-side">
          <div className="ls-count"><b>{people.length}</b><span>{people.length === 1 ? 'person on this product' : 'people on this product'}</span></div>
          {thingsOf({ marks }) && <p className="sub ls-things">{thingsOf({ marks })}</p>}
          <h3 className="ls-side-h">Who does what</h3>
          {people.length === 0 && <p className="sub">Pick Person and tap the board where they stand — or select a shape and add an operator to it.</p>}
          {people.map(p => (
            <div key={p.id} className="ls-person">
              <MarkIcon kind="person" size={22} />
              <input className="ls-role" value={p.label ?? ''} aria-label="Role" placeholder="Op 1"
                onChange={e => patchMark(p.id, { label: e.target.value })}
                onBlur={() => void putStandard({ ...s, marks })} />
              <textarea className="ls-task" rows={2} value={p.task ?? ''} aria-label="What they do" placeholder="What they do on this product"
                onChange={e => patchMark(p.id, { task: e.target.value })}
                onBlur={() => void putStandard({ ...s, marks })} />
            </div>
          ))}
          <button className="btn btn-ghost btn-sm ls-del" onClick={() => void remove()}>Delete this map</button>
        </aside>
      </div>

      {/* One mark: a shape's words and colour, or who a person is and what they do. */}
      <Sheet open={!!editingMark} onClose={() => { if (editingMark) void putStandard({ ...s, marks }); setEditing(null); }}
        title={editingMark ? (isShape(editingMark) ? SHAPES.find(x => x.shape === editingMark.shape)?.word ?? 'Shape' : markOf(editingMark.kind).word) : ''}>
        {editingMark && isShape(editingMark) && (
          <>
            {editingMark.shape !== 'arrow' && (
              <>
                <div className="field-label">{editingMark.shape === 'text' ? 'The words' : 'Name it'} <span className="opt">written in the middle</span></div>
                <textarea className="text-area" rows={2} autoFocus value={editingMark.label ?? ''} placeholder="Bagger 1"
                  onChange={e => patchMark(editingMark.id, { label: e.target.value })} />
              </>
            )}
            <div className="field-label" style={{ marginTop: 10 }}>Colour</div>
            <div className="ls-tones">
              {(Object.keys(TONES) as ShapeTone[]).map(k => (
                <button key={k} className={'ls-tone' + ((editingMark.tone ?? 'blue') === k ? ' is-on' : '')}
                  style={{ background: TONES[k].fill, borderColor: TONES[k].stroke, color: TONES[k].ink }}
                  onClick={() => patchMark(editingMark.id, { tone: k })}>{TONES[k].word}</button>
              ))}
            </div>
            <div className="snag-editor-foot">
              <button className="btn btn-primary" onClick={() => { void putStandard({ ...s, marks }); setEditing(null); }}>Done</button>
              {editingMark.shape !== 'text' && (
                <button className="btn" onClick={() => { const sh = editingMark; void putStandard({ ...s, marks }); setEditing(null); addOperatorBy(sh); }}>＋ Add an operator here</button>
              )}
              <button className="btn btn-ghost" style={{ color: 'var(--danger)' }}
                onClick={() => { saveMarks(marks.filter(m => m.id !== editingMark.id)); setEditing(null); setSelected(null); }}>Delete</button>
            </div>
          </>
        )}
        {editingMark && !isShape(editingMark) && (
          <>
            <div className="field-label">{editingMark.kind === 'person' ? 'Role' : 'Label'} <span className="opt">{editingMark.kind === 'person' ? 'e.g. Op 2, Line lead' : 'optional'}</span></div>
            <input className="text-input" autoFocus value={editingMark.label ?? ''}
              onChange={e => patchMark(editingMark.id, { label: e.target.value })} />
            {editingMark.kind === 'person' && (
              <>
                <div className="field-label" style={{ marginTop: 10 }}>What they do <span className="opt">on this product</span></div>
                <textarea className="text-area" rows={3} value={editingMark.task ?? ''} placeholder="Load film, check the weigher every 30 minutes"
                  onChange={e => patchMark(editingMark.id, { task: e.target.value })} />
              </>
            )}
            <div className="snag-editor-foot">
              <button className="btn btn-primary" onClick={() => { void putStandard({ ...s, marks }); setEditing(null); }}>Done</button>
              <button className="btn btn-ghost" style={{ color: 'var(--danger)' }}
                onClick={() => { saveMarks(marks.filter(m => m.id !== editingMark.id)); setEditing(null); }}>Take it off</button>
            </div>
          </>
        )}
      </Sheet>

      {/* EVERY ICON, by group — pick one, then tap the board. */}
      <Sheet open={icons} onClose={() => setIcons(false)} title="Icons">
        {ICON_GROUPS.map(g => (
          <section key={g.group} className="ls-icon-group">
            <h4 className="ls-icon-h">{g.word}</h4>
            <div className="ls-icon-grid">
              {MARKS.filter(k => k.group === g.group).map(k => (
                <button key={k.kind} className={'ls-icon-b' + (tool.t === 'icon' && tool.kind === k.kind ? ' is-on' : '')}
                  onClick={() => { setTool({ t: 'icon', kind: k.kind }); setIcons(false); }}>
                  <MarkIcon kind={k.kind} size={34} /><span>{k.word}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </Sheet>

      <Sheet open={picture} onClose={() => setPicture(false)} title="The picture of the line">
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) void addPhoto(f); }} />
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>📷 Take or choose a photo</button>
        <WalkFrames projectId={project.id} onPick={async f => { await save({ photoKey: f.stillKey }); setPicture(false); }} />
        {url && <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => { void save({ photoKey: undefined }); setPicture(false); }}>Use a plain board and draw it instead</button>}
      </Sheet>

      {printing && <PrintSheet list={[{ ...s, marks, product }]} project={project} onClose={() => setPrinting(false)} />}

      <Sheet open={copying} onClose={() => setCopying(false)} title="Copy to another product">
        <p className="sub" style={{ marginTop: 0 }}>The same picture and the same places — then move what differs.</p>
        {others.length > 0 && (
          <div className="ls-pick">
            {others.map(p => <button key={p.id} className="ls-pick-b" onClick={() => void copyTo(p.what, p.id)}>{p.what}</button>)}
          </div>
        )}
        <CopyTyped onCopy={name => void copyTo(name)} />
      </Sheet>
    </div>
  );
}

/** A shape, small, for the toolbar. */
function ShapeGlyph({ shape }: { shape: ShapeKind }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      {shape === 'rect' && <rect x="2" y="6" width="20" height="12" rx="2" {...p} />}
      {shape === 'square' && <rect x="4" y="4" width="16" height="16" rx="2" {...p} />}
      {shape === 'circle' && <circle cx="12" cy="12" r="8.5" {...p} />}
      {shape === 'triangle' && <polygon points="12,3.5 21,20 3,20" {...p} strokeLinejoin="round" />}
      {shape === 'arrow' && <><line x1="3" y1="12" x2="19" y2="12" {...p} strokeLinecap="round" /><polygon points="21,12 15,8 15,16" fill="currentColor" /></>}
      {shape === 'text' && <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor">T</text>}
    </svg>
  );
}

function CopyTyped({ onCopy }: { onCopy: (name: string) => void }) {
  const [v, setV] = useState('');
  return (
    <form className="ls-type" style={{ marginTop: 12 }} onSubmit={e => { e.preventDefault(); if (v.trim()) onCopy(v); }}>
      <input className="text-input" value={v} placeholder="Another product" onChange={e => setV(e.target.value)} />
      <button className="btn btn-primary" type="submit" disabled={!v.trim()}>Copy</button>
    </form>
  );
}

/** A frame off the filmed walk, as the picture — the evidence system's own. */
function WalkFrames({ projectId, onPick }: { projectId: string; onPick: (f: SnagAsset) => void }) {
  const [frames, setFrames] = useState<SnagAsset[] | null>(null);
  useEffect(() => { void framesForProject(projectId).then(fs => setFrames(fs.map(f => f.frame))); }, [projectId]);
  if (!frames || frames.length === 0) return null;
  return (
    <>
      <p className="sub" style={{ margin: '14px 0 8px' }}>Or a frame from the filmed walk:</p>
      <div className="otl-grid">{frames.map(f => <FrameThumb key={f.id} f={f} onPick={() => onPick(f)} />)}</div>
    </>
  );
}

function FrameThumb({ f, onPick }: { f: SnagAsset; onPick: () => void }) {
  const url = useBlobUrl(f.stillKey);
  return (
    <button type="button" className="otl-thumb" onClick={onPick}>
      {url ? <img src={url} alt="" /> : <span className="otl-frame-ph">…</span>}
      <span className="otl-thumb-n">{f.name}</span>
    </button>
  );
}
