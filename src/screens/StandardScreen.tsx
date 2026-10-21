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
import { framesForProject, getProject, getWorkspace, listSnagAssets, putBlob, putStandard, followStandard } from '../db';
import { nav, useRoute } from '../state/useRoute';
import { uid, now } from '../lib/ids';
import { pdfFileName } from '../lib/fileName';
import { todayISO } from '../lib/weeks';
import { useBlobUrl } from '../lib/useBlobUrl';
import { usePrograms } from '../lib/usePrograms';
import { planModel } from '../lib/planModel';
import { bottlenecksOf, dashOf, FADED_ALPHA, FILLS, LABEL_KEY, LABEL_MODES, labelModeHere, LINES, mapLabel, weightOf, WORD_DIRS, wordsUp, type LabelMode, type ShapeFill, type ShapeLine,
  BOARDS, boardOf, colourOf, copyFor, hasMap, removingSays, type ProductTool, inMapTool, headcount, ICON_GROUPS, isShape, MARKS, markOf, nextRole, peopleOf, PERSON_COLOURS, reshaped, SHAPES, thingsOf, TONES, type BoardShape, type MarkKind, type PersonColour, type ShapeKind, type ShapeTone, type Standard, type StandardMark } from '../lib/standard';
import { useStandards } from '../ui/StandardsCard';
import { Sheet } from '../ui/Sheet';
import { offerUndo } from '../ui/Undo';
import { deleteMap, removeFromTool } from '../ui/StandardsCard';
import { CapacityPanel } from './CapacityPanel';
import { balanceSays } from './LineToolsScreen';
import { WorkView, useBalanceFor, workOf } from '../ui/WorkBalance';
import { capacitySays } from '../lib/together';
import { Together } from '../ui/Together';
import { ChangeoverLines } from '../ui/ChangeoverLines';
import { mins } from '../lib/ie/changeover';
import { useProjects } from '../lib/useProjects';
import type { SnagAsset } from '../snag/types';
import { Icon } from '../ui/Icon';
import { useAccess } from '../cloud/access';
import type { Can } from '../lib/access';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const printedToday = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const pdfName = (list: Standard[], name: string) =>
  pdfFileName(name, list.length === 1 ? `line standard ${list[0].product}` : 'line standard', todayISO());

async function standardsPdf(list: Standard[], name: string) {
  const { loadPdfLib } = await import('../lib/savePdf');
  const { drawStandards } = await import('../lib/standardPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const { worksFor } = await import('../ui/WorkBalance');
  const { shiftShortsFor } = await import('../ui/ShiftCapacity');
  await drawStandards(doc, list, name, printedToday(), await worksFor(list), await shiftShortsFor(list));
  return doc;
}

/* THE CARD, SEEN BEFORE IT PRINTS. Rowland: "print doesn't work and I can't
   see the print format." Each card is drawn once as a picture; the picture is
   what is shown here and what goes into the PDF, so there is nothing to guess.
   Anything that goes wrong says so, rather than the button doing nothing. */
function PrintSheet({ list, name, onClose }: { list: Standard[]; name: string; onClose: () => void }) {
  const [cards, setCards] = useState<{ img: string; product: string; notes: boolean }[] | null>(null);
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
        const { cardPages } = await import('../lib/standardCard');
        const { worksFor } = await import('../ui/WorkBalance');
        const { shiftShortsFor } = await import('../ui/ShiftCapacity');
        const works = await worksFor(list), shifts = await shiftShortsFor(list);
        const out: { img: string; product: string; notes: boolean }[] = [];
        for (const st of list) (await cardPages(st, name, printedToday(), works[st.id], shifts[st.id])).forEach((img, k) => out.push({ img, product: st.product, notes: k > 0 }));
        if (live) setCards(out);
      } catch (e) {
        console.error('line standard card failed', e);
        if (live) setErr('The card could not be drawn on this device. Please try again.');
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `sig` is the list, by what can change
  }, [sig, name]);
  const go = async (how: 'download' | 'print') => {
    setBusy(true); setErr(null);
    try {
      const doc = await standardsPdf(list, name);
      if (how === 'print') {
        const url = URL.createObjectURL(doc.output('blob') as Blob);
        const w = window.open(url, '_blank');
        if (!w) { const { deliverPdf } = await import('../lib/savePdf'); await deliverPdf(doc, pdfName(list, name), { brand: false }); /* the sheet is a picture edge to edge, with its own heading */ }
        setTimeout(() => URL.revokeObjectURL(url), 120_000);
      } else {
        const { deliverPdf } = await import('../lib/savePdf');
        await deliverPdf(doc, pdfName(list, name), { brand: false }); /* the sheet is a picture edge to edge, with its own heading */
      }
    } catch (e) {
      console.error('line standard PDF failed', e);
      setErr('The PDF could not be made. Please try again.');
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={list.length === 1 ? `Line standard — ${list[0].product}` : `Line standard — ${list.length} products`}>
      <div className="ls-print-acts">
        <button className="btn btn-primary" onClick={() => void go('download')} disabled={busy || !cards}>{busy ? 'Making it…' : 'PDF'}</button>
        {wide && <button className="btn" onClick={() => void go('print')} disabled={busy || !cards}>Print</button>}
        <span className="sub">A4 landscape · {!cards ? '' : cards.length === 1 ? 'one page' : list.length === 1 ? `${cards.length} pages — the card, then its notes in full` : `${cards.length} pages — a card a product${cards.some(c => c.notes) ? ', each followed by its notes where it has them' : ''}`}</span>
      </div>
      {err && <p className="ls-print-err">{err}</p>}
      {!cards && !err && <p className="sub">Drawing the card…</p>}
      <div className="ls-print-cards">
        {cards?.map((c, i) => <img key={i} className="ls-print-card" src={c.img} alt={`${c.notes ? 'Notes' : 'Line standard card'} for ${c.product}`} />)}
      </div>
    </Sheet>
  );
}

/** One icon, as the palette and the map both draw it. */
export function MarkIcon({ kind, size = 30, colour }: { kind: MarkKind; size?: number; colour?: string }) {
  const k = markOf(kind);
  return (
    <svg className="ls-ic" width={size} height={size} viewBox="-4 -4 32 32" aria-hidden>
      <circle cx="12" cy="12" r="15" fill="#fff" />
      <circle cx="12" cy="12" r="13.5" fill={colour ?? k.colour} />
      <path d={k.glyph} fill="#fff" fillRule={k.rule ?? 'evenodd'} transform="translate(2.4 2.4) scale(0.8)" />
    </svg>
  );
}

export function StandardScreen({ projectId, standardId }: { projectId: string; standardId?: string }) {
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  useEffect(() => { void getProject(projectId).then(p => setProject(p ?? null)); }, [projectId]);
  const list = useStandards(projectId);
  /* Who may do what (lib/access): the team draws and copies maps, deleting one
     is the owner's, and a client reads them and takes the PDF. */
  const can = useAccess(projectId);
  if (project === undefined || list == null) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/room')}>Back to the control room</button>
      </div>
    );
  }
  const home: StdHome = { name: project.name, base: `/project/${project.id}/standard`, project };
  return <StandardsAt home={home} list={list} standardId={standardId} can={can} />;
}

/** WHERE A SET OF LINE STANDARDS LIVES — a job (as they always have), or a
 *  LINE (LINE_TOOLS.sql): Rowland, 7 October, "a tool, but can be attached".
 *  The name it is printed under, the address of its list, and — on a job —
 *  the job, whose programs offer the products; on a line, the line, whose
 *  filmed frames offer the picture. */
export interface StdHome { name: string; base: string; project?: Project; wsId?: string }

/** The list, or one map — the same screens wherever they live. */
export function StandardsAt({ home, list, standardId, can }: { home: StdHome; list: Standard[]; standardId?: string; can: Can }) {
  const one = standardId ? list.find(s => s.id === standardId) : undefined;
  if (standardId && one) return <MapEditor home={home} s={one} all={list} can={can} />;
  /* A link to a map that is gone lands on the list AND says so — it fell
     through silently, which read as the wrong page rather than a deleted map. */
  return <Products home={home} list={list} gone={!!standardId && !one} can={can} />;
}

/* ------------------------------ the products ----------------------------- */

function Products({ home, list: every, gone, can }: { home: StdHome; list: Standard[]; gone?: boolean; can: Can }) {
  /* the products mapped — a product worked out only for capacity is Line
     capacity's, not a map here (lib/standard inMapTool) */
  const list = every.filter(inMapTool);
  const progs = usePrograms(home.project?.id ?? '');
  const [adding, setAdding] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [typed, setTyped] = useState('');
  const mapped = new Set(list.map(s => s.product.trim().toLowerCase()));
  const offered = [...new Map(progs.programs.map(p => [p.what.trim(), p])).values()]
    .filter(p => !mapped.has(p.what.trim().toLowerCase()));
  const commissioning = !!home.project && planModel(home.project) === 'commissioning';

  const detach = async (x: Standard) => {
    await putStandard({ ...x, projectId: '' });
    await followStandard(x.id, '');
    offerUndo(`${x.product} taken off this project — still on its line`, async () => { await putStandard(x); await followStandard(x.id, x.projectId); });
  };
  const create = async (product: string, programId?: string) => {
    const name = product.trim();
    if (!name) return;
    /* a product already here (its capacity worked out) is the same record — its map opens */
    const same = every.find(x => !x.deletedAt && x.product.trim().toLowerCase() === name.toLowerCase());
    if (same) { setAdding(false); nav(`${home.base}/${same.id}`); return; }
    const t = now();
    /* A new map starts from the last one's picture: the line does not move
       between products, the people do. */
    const last = list[list.length - 1];
    const s: Standard = { id: uid(), projectId: home.project?.id ?? '', ...(home.wsId ? { workspaceId: home.wsId } : {}),
      product: name, programId, photoKey: last?.photoKey, marks: [], sort: t, createdAt: t, updatedAt: t };
    await putStandard(s);
    nav(`${home.base}/${s.id}`);
  };

  return (
    <div className="wrap pace">
      {gone && <p className="ls-gone">That map isn’t here any more — it was deleted, or the link is to a map on another project. The maps that are here:</p>}
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Line standard</h1>
          <p className="pace-lede">
            Who stands where, and what they do, on each product — a picture of the line with the people and the kit
            placed on it, one per product. Where the line is limited is Line capacity.
          </p>
        </div>
        <div className="pace-head-actions">
          {list.length > 0 && <button className="btn btn-ghost" onClick={() => setPrinting(true)}>PDF (all products)</button>}
          {can.edit && <button className="btn btn-primary" onClick={() => setAdding(true)}>New map</button>}
        </div>
      </header>

      {list.length === 0 ? (
        <div className="pace-empty">
          <p className="sub">{can.edit ? 'No maps yet. Start with the product you run most.' : 'No maps yet.'}</p>
          {can.edit && <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>Make the first map</button>}
        </div>
      ) : (
        <div className="ls-grid">
          {list.map(s => (
            <div key={s.id} className="ls-card-wrap">
              <ProductCard s={s} onOpen={() => nav(`${home.base}/${s.id}`)} />
              {/* One that belongs to a line is taken off the job, never deleted
                  from here: it is still the line's tool (LINE_TOOLS.sql). */}
              {can.remove && (s.workspaceId && home.project
                ? <button type="button" className="cw-link ls-card-del" onClick={() => void detach(s)} aria-label={`Take ${s.product} off this project`}>Take off this project</button>
                : <button type="button" className="cw-link sp-rm ls-card-del" onClick={() => void deleteMap(s)} aria-label={`Delete the map for ${s.product}`}>Delete</button>)}
            </div>
          ))}
        </div>
      )}

      {printing && <PrintSheet list={list} name={home.name} onClose={() => setPrinting(false)} />}

      <Sheet open={adding && can.edit} onClose={() => setAdding(false)} title="Which product?">
        {offered.length > 0 && (
          <>
            <p className="sub" style={{ marginTop: 0 }}>{commissioning ? 'From this project’s programs:' : 'From the programs:'}</p>
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
          : <span key={m.id} className="ls-card-dot" style={{ left: `${m.x}%`, top: `${m.y}%`, background: colourOf(m) }} />))}
      </span>
      <span className="ls-card-t">{s.product}</span>
      <span className="ls-card-s"><b>{plural(n, 'person', 'people')}</b>{thingsOf(s) ? ` · ${thingsOf(s)}` : ''}</span>
      {(s.capacity?.changeovers ?? []).length > 0 && (
        <span className="ls-card-s ls-card-co">SMED: {(s.capacity?.changeovers ?? []).map(a => `${mins(a.minutes * 60)} stopped${a.from ? ` from ${a.from}` : ''}`).join(' · ')}</span>
      )}
    </button>
  );
}

/* -------------------------------- the map -------------------------------- */

type Tool = { t: 'select' } | { t: 'icon'; kind: MarkKind } | { t: 'shape'; shape: ShapeKind };
/** Which side of a shape is pulled: n s e w, or a corner (ne, sw …). */
type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type Drag = { id: string; mode: 'move' | 'resize' | 'start' | 'end'; edge?: Edge; x0: number; y0: number; orig: StandardMark; moved: boolean };
type Draw = { shape: ShapeKind; x0: number; y0: number; x1: number; y1: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

/** A box as tall as what is written in it — a paragraph a person typed is
 *  read, not scrolled through two lines at a time (to 16 lines, then it scrolls). */
const taskRows = (t?: string): number => {
  if (!t) return 2;
  const lines = t.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 34)), 0);
  return Math.min(16, Math.max(2, lines));
};

const EDGE_WORD: Record<Edge, string> = { n: 'top', s: 'bottom', e: 'right', w: 'left', ne: 'top right', nw: 'top left', se: 'bottom right', sw: 'bottom left' };

/** A shape's outline, in board pixels — the same geometry the card draws. */
function ShapeSvg({ m, bw, bh, selected, onDown }: {
  m: StandardMark; bw: number; bh: number; selected: boolean;
  onDown: (e: RPointerEvent, mode: Drag['mode'], edge?: Edge) => void;
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
        <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={t.stroke} strokeWidth={sw * 1.6 * weightOf(m.line)} strokeLinecap="round" strokeDasharray={dashOf(m.line, sw * 1.6 * weightOf(m.line)).join(' ') || undefined} pointerEvents="none" />
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
    <g className={'ls-shape' + (selected ? ' is-on' : '') + (m.shape === 'text' ? ' is-text' : '') + (m.bottleneck ? ' is-bn' : '')}
      fill={m.shape === 'text' || m.fill === 'none' ? 'transparent' : m.fill === 'faded' ? t.stroke : t.fill}
      fillOpacity={m.shape !== 'text' && m.fill === 'faded' ? FADED_ALPHA : undefined}
      stroke={m.shape === 'text' ? (selected ? t.stroke : 'transparent') : t.stroke}
      strokeWidth={sw * weightOf(m.line) * (m.bottleneck ? 1.6 : 1)}
      strokeDasharray={m.shape === 'text' ? '4 3' : dashOf(m.line, sw * weightOf(m.line)).join(' ') || undefined}
      onPointerDown={e => onDown(e, 'move')}>
      {body}
      {/* STRETCHED FROM ANY SIDE (Rowland, 15 October: "I can't stretch
          anything from a side. I can only make things bigger or smaller") —
          a handle on each side and each corner; a square or a circle keeps
          its shape, so only its corners */}
      {selected && ((m.shape === 'square' || m.shape === 'circle') ? (['nw', 'ne', 'sw', 'se'] as Edge[]) : (['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'] as Edge[])).map(ed => {
        const hx = ed.includes('w') ? x : ed.includes('e') ? x + w : x + w / 2;
        const hy = ed.includes('n') ? y : ed.includes('s') ? y + h : y + h / 2;
        return <rect key={ed} className={'ls-handle is-' + ed} x={hx - 8} y={hy - 8} width={16} height={16} rx={3} aria-label={`Stretch from the ${EDGE_WORD[ed]}`}
          onPointerDown={e => { e.stopPropagation(); onDown(e, 'resize', ed); }} />;
      })}
    </g>
  );
}

function MapEditor({ home, s, all, can }: { home: StdHome; s: Standard; all: Standard[]; can: Can }) {
  /* A CLIENT READS THE MAP (lib/access): the picture, the marks and who does
     what, and the PDF — no tools, nothing that moves, nothing to type into. */
  const ro = !can.edit;
  const progs = usePrograms(home.project?.id ?? '');
  const url = useBlobUrl(s.photoKey);
  const [tool, setTool] = useState<Tool>({ t: 'icon', kind: 'person' });
  const [marks, setMarks] = useState<StandardMark[]>(s.marks);
  /* NAMES ON THE MAP — short, full or numbers; how this device shows the map,
     not a fact about it, so it is kept here, never on the record */
  const [labels, setLabelsState] = useState<LabelMode>(labelModeHere);
  const setLabels = (m: LabelMode) => { setLabelsState(m); try { localStorage.setItem(LABEL_KEY, m); } catch { /* private mode */ } };
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [icons, setIcons] = useState(false);
  const [picture, setPicture] = useState(false);
  const [copying, setCopying] = useState(false);
  /* TWO TOOLS, ONE RECORD (Rowland, 10 October: "you open 1 of them and see
     both of them"). A product on a line is one record holding its map and its
     balance (LINE_TOOLS.sql); Line balance opens the balance alone
     (?at=balance), Line standard the map alone, each one tap from the other.
     It used to be one page, the balance scrolled to under the map. */
  const route = useRoute();
  const atBalance = route.query.get('at') === 'balance';
  /* THE LINE BALANCE, ITS OWN PAGE (Rowland, 17 October): the people and
     their work, timed against takt (ui/WorkBalance) — it was Line capacity's
     second tab, "People"; that address still opens it. */
  const atWork = route.query.get('at') === 'work' || (atBalance && route.query.get('view') === 'work');
  /* ALL TOGETHER — the map, the people's times and the capacity on one page,
     each read from its own tool, each a door to change it there. */
  const atAll = route.query.get('at') === 'all';
  const balanceStudy = useBalanceFor(s.id);
  const here = window.location.hash.slice(1).split('?')[0] || home.base;
  const [printing, setPrinting] = useState(false);
  const [paperBusy, setPaperBusy] = useState(false);
  const [product, setProduct] = useState(s.product);
  const [size, setSize] = useState({ bw: 0, bh: 0 });
  const [draw, setDraw] = useState<Draw | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /* A TAP ON THE BOARD, not a touch (Rowland, 13 October: "I can't drag the
     interface down ... I only have a small surface area to play with"). A
     finger on the empty board scrolls the page and pinches to zoom; a person
     or a shape under the finger is dragged. So a person is placed when the
     finger lifts where it went down — a scroll never drops one. */
  const tap = useRef<{ x: number; y: number } | null>(null);
  const toolRef = useRef(tool);
  toolRef.current = tool;
  /* THE WHOLE SCREEN for the board — the toolbar and the board, nothing else. */
  const [full, setFull] = useState(false);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    /* A touch that starts on something to drag, or while a shape is being
       drawn, is the board's — the page does not scroll under it. Every other
       touch is the page's to scroll (the board's touch-action). */
    const own = (e: TouchEvent) => {
      const t = e.target as Element | null;
      if (toolRef.current.t === 'shape' || t?.closest?.('.ls-mark, .ls-shape, .ls-handle')) e.preventDefault();
    };
    el.addEventListener('touchstart', own, { passive: false });
    return () => el.removeEventListener('touchstart', own);
  }, [url]);

  // Another device's edit, or an undo, arrives as a new record: take it,
  // unless something is being dragged right now — or TYPED. Leaving the role
  // box writes the map, the store reloads it a beat later, and this adopted
  // that copy over the first letters already typed into the task box beside
  // it: "Watch the splice" came back "atch the splice". A box that has focus
  // keeps its draft, the rule every other field in the app follows; the
  // record is taken again the moment it is left.
  const typing = useRef(false);
  useEffect(() => { if (!drag.current && !typing.current && !editing) setMarks(s.marks); }, [s.marks, editing]);
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
    if (ro) return;
    if (e.target !== e.currentTarget && !(e.target as Element).classList.contains('ls-photo') && !(e.target as Element).classList.contains('ls-svg')) return;
    if (tool.t === 'shape') {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      const at = pct(e);
      setDraw({ shape: tool.shape, x0: at.x, y0: at.y, x1: at.x, y1: at.y });
      return;
    }
    /* placing, or letting go of a selection, waits for the finger to lift */
    tap.current = { x: e.clientX, y: e.clientY };
  };
  const tapped = (e: RPointerEvent) => {
    const t = tap.current;
    tap.current = null;
    if (!t || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 8) return;
    if (tool.t === 'select') { setSelected(null); return; }
    if (tool.t !== 'icon') return;
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
  const down = (e: RPointerEvent, id: string, mode: Drag['mode'] = 'move', edge?: Edge) => {
    e.stopPropagation();
    if (ro) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const orig = marks.find(m => m.id === id);
    if (orig) drag.current = { id, mode, ...(edge ? { edge } : {}), x0: e.clientX, y0: e.clientY, orig, moved: false };
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
      /* the side pulled moves; the one opposite stays where it is */
      const ed = d.edge ?? 'se';
      let left = o.x - (o.w ?? 0) / 2, right = o.x + (o.w ?? 0) / 2, top = o.y - (o.h ?? 0) / 2, bottom = o.y + (o.h ?? 0) / 2;
      if (ed.includes('e')) right = Math.max(left + 3, right + dx);
      if (ed.includes('w')) left = Math.min(right - 3, left + dx);
      if (ed.includes('s')) bottom = Math.max(top + 3, bottom + dy);
      if (ed.includes('n')) top = Math.min(bottom - 3, top + dy);
      if (o.shape === 'square' || o.shape === 'circle') {
        const h = sameH(right - left);
        if (ed.includes('n')) top = bottom - h; else bottom = top + h;
      }
      patchMark(d.id, { w: r1(right - left), h: r1(bottom - top), x: r1((left + right) / 2), y: r1((top + bottom) / 2) });
    }
  };
  const up = (e: RPointerEvent) => {
    if (draw) { finishDraw(); return; }
    const d = drag.current;
    drag.current = null;
    if (!d) { tapped(e); return; }
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
  /* ONE TOOL OFF THE PRODUCT (lib/standard afterRemoving): the map, or its
     Line capacity — the other kept; the record goes only when nothing is left */
  const removeTool = async (tool: ProductTool) => {
    if (!window.confirm(removingSays(s, tool).ask)) return;
    await removeFromTool(s, tool);
    nav(tool === 'balance' && s.workspaceId ? `/balances?line=${encodeURIComponent(s.workspaceId)}` : home.base);
  };
  const remove = () => removeTool('map');
  const copyTo = async (name: string, programId?: string) => {
    const c = copyFor({ ...s, marks }, name.trim(), uid, now(), programId);
    await putStandard(c);
    setCopying(false);
    nav(`${home.base}/${c.id}`);
  };

  const people = peopleOf({ marks });
  const editingMark = marks.find(m => m.id === editing);
  const others = [...new Map(progs.programs.map(p => [p.what.trim(), p])).values()]
    .filter(p => !all.some(x => x.product.trim().toLowerCase() === p.what.trim().toLowerCase()));
  const shapes = marks.filter(isShape), icons_ = marks.filter(m => !isShape(m));
  const say = tool.t === 'shape' ? `Drag on the board to draw a ${SHAPES.find(x => x.shape === tool.shape)?.word.toLowerCase()} — or just tap for one.`
    : tool.t === 'icon' ? `Tap the board to place ${tool.kind === 'person' ? 'a person' : `a ${markOf(tool.kind).word.toLowerCase()}`}. Drag one to move it; drag the empty board to scroll.`
      : 'Tap a shape to select it, drag to move, pull the corner to resize. Tap it again to name it. Drag the empty board to scroll.';
  const fontPx = Math.max(10, size.bw * 0.017);

  /* THE LINE BALANCE — the people's work, timed at the line, against takt:
     its own page, one tap from its Line capacity and its map. */
  if (atWork) return (
    <div className="wrap pace ls lb">
      <header className="ls-head is-band">
        <div className="ls-head-main">
          <p className="sub"><button type="button" className="cw-link" onClick={() => nav(s.workspaceId ? `/linebalance?line=${encodeURIComponent(s.workspaceId)}` : home.base)}>Line balance</button>{home.name ? ` · ${home.name}` : ''}</p>
          {ro ? <h1 className="ls-product is-read">{s.product}</h1> : (
            <input className="ls-product" value={product} aria-label="Product"
              onChange={e => setProduct(e.target.value)}
              onBlur={() => { const v = product.trim(); if (v && v !== s.product) void save({ product: v }); else setProduct(s.product); }} />
          )}
        </div>
        <div className="ls-head-actions">
          <button type="button" className="btn btn-ghost" onClick={() => nav(`${here}?at=all`)}>All together</button>
          <button type="button" className="btn btn-ghost" onClick={() => nav(`${here}?at=balance`)}>Its Line capacity ›</button>
          {hasMap(s) && <button type="button" className="btn btn-ghost" onClick={() => nav(here)}>Its line standard ›</button>}
        </div>
      </header>
      <BelongsTo s={s} home={home} can={can} onJob={projectId => { void save({ projectId }); void followStandard(s.id, projectId); }} />
      <div id="ls-balance" className="ls-balance"><WorkView s={s} can={can} /></div>
    </div>
  );
  if (atAll) return <Together s={s} name={home.name} here={here} />;

  /* THE LINE BALANCE — the balance alone: the stations in order, each at its
     own speed, and the one that holds the line back (lib/capacity). */
  if (atBalance) return (
    <div className="wrap pace ls lb">
      <header className="ls-head is-band">
        <div className="ls-head-main">
          {/* LINE CAPACITY'S OWN PAGE — back to Line capacity on this line, never
              to the line standard's list (Rowland, 13 October) */}
          <p className="sub"><button type="button" className="cw-link" onClick={() => nav(s.workspaceId ? `/balances?line=${encodeURIComponent(s.workspaceId)}` : home.base)}>Line capacity</button>{home.name ? ` · ${home.name}` : ''}</p>
          {/* THE PRODUCT'S NAME, changed here as on its map — one record, one name */}
          {ro ? <h1 className="ls-product is-read">{s.product}</h1> : (
            <input className="ls-product" value={product} aria-label="Product"
              onChange={e => setProduct(e.target.value)}
              onBlur={() => { const v = product.trim(); if (v && v !== s.product) void save({ product: v }); else setProduct(s.product); }} />
          )}
          {/* the band's verdict (docs/LEAN-PAGE.md): what limits the line, red when short */}
          {(s.capacity?.stations.length ?? 0) > 0 && (() => { const c = capacitySays(s.capacity); return <span className={'ln-verdict' + (c.short ? ' is-r' : '')}><b>{c.text}</b></span>; })()}
        </div>
        <div className="ls-head-actions">
          {/* its line balance and its line standard, one tap away — the
              balance its own page now (it was the People tab here) */}
          <button type="button" className="btn btn-ghost" onClick={() => nav(`${here}?at=work`)}>Its line balance ›</button>
          <button type="button" className="btn btn-ghost" onClick={() => nav(`${here}?at=all`)}>All together</button>
          {hasMap(s) && <button type="button" className="btn btn-ghost" onClick={() => nav(here)}>Its line standard ›</button>}
          {/* ITS PAPER — the product's capacity as its own page (lib/capacityPaper) */}
          <button type="button" className="btn btn-ghost" disabled={paperBusy} onClick={() => {
            setPaperBusy(true);
            void import('../lib/capacityPaperLoad').then(m => m.saveCapacityPdf([s], { name: home.name }))
              .catch(e => { console.error('line capacity PDF failed', e); window.alert('Sorry — the PDF could not be made. Please try again.'); })
              .finally(() => setPaperBusy(false));
          }}>{paperBusy ? 'Making…' : 'PDF'}</button>
          {/* deleting is the owner's (lib/access), as the map's is */}
          {can.remove && <button type="button" className="btn btn-ghost ls-del" onClick={() => void removeTool('balance')}>Delete this capacity</button>}
        </div>
      </header>
      <BelongsTo s={s} home={home} can={can} onJob={projectId => { void save({ projectId }); void followStandard(s.id, projectId); }} />
      <div id="ls-balance" className="ls-balance">
        <CapacityPanel projectId={s.projectId} board={false} can={can}
          line={{ id: s.id, name: s.product, ...(s.workspaceId ? { workspaceId: s.workspaceId } : {}), ...(s.capacity ? { capacity: s.capacity } : {}) }}
          onSave={cap => save({ capacity: cap })} walk={{ standardId: s.id, product: s.product }} mapPeople={headcount(s)} />
      </div>
    </div>
  );
  const balanceSaid = balanceSays(s);
  const work = workOf(balanceStudy, people.length || undefined, s.capacity);
  const workFor = (label?: string) => work?.people.find(w => w.who === (label ?? '').trim());

  return (
    <div className={'wrap pace ls' + (full ? ' is-full' : '')}>
      {full && (
        <div className="ls-full-bar">
          <b>{s.product}</b><span className="sub">{plural(people.length, 'person', 'people')}</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setFull(false)}>Done</button>
        </div>
      )}
      <header className="ls-head">
        <div className="ls-head-main">
          {/* The way back to the list of maps, now the spine is gone: the
              rail's Hand over (or Lines) is a level above this. */}
          <p className="sub"><button type="button" className="cw-link" onClick={() => nav(home.base)}>Line standard</button> · {plural(people.length, 'person', 'people')}</p>
          {ro ? <h1 className="ls-product is-read">{s.product}</h1> : <>
          <input className="ls-product" value={product} aria-label="Product" list="ls-products"
            onChange={e => setProduct(e.target.value)}
            onBlur={() => { const v = product.trim(); if (v && v !== s.product) void save({ product: v }); else setProduct(s.product); }} />
          <datalist id="ls-products">{progs.programs.map(p => <option key={p.id} value={p.what} />)}</datalist>
          </>}
        </div>
        <div className="ls-head-actions">
          <button className="btn btn-ghost" onClick={() => setPrinting(true)}>PDF</button>
          {!ro && <button className="btn btn-ghost" onClick={() => setCopying(true)}>Copy to another product</button>}
        </div>
      </header>

      {!ro && <>
      <div className="ls-tools" role="toolbar" aria-label="What to place">
        <button className={'ls-tool' + (tool.t === 'select' ? ' is-on' : '')} aria-pressed={tool.t === 'select'} onClick={() => setTool({ t: 'select' })}>
          <span className="ls-ti" aria-hidden><Icon name="pointer" size="1.15em" /></span><span>Select</span>
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
        <button className="ls-tool" onClick={() => setIcons(true)}><span className="ls-ti" aria-hidden><Icon name="plus" size="1.15em" /></span><span>Icons</span></button>
        {/* THE WHOLE SCREEN for the board (13 October: "a small surface area");
            its bar's Done comes back */}
        {!full && <>
          <span className="ls-tool-sep" aria-hidden />
          <button className="ls-tool" onClick={() => setFull(true)}>
            <span className="ls-ti" aria-hidden><Icon name="eye" size="1.15em" /></span><span>Full screen</span>
          </button>
        </>}
      </div>
      <p className="sub ls-tools-say">{say}</p>
      </>}

      <div className="ls-body">
        <div className="ls-board-wrap">
          <div ref={boardRef} className={'ls-board' + (url ? '' : ' is-blank') + (tool.t !== 'select' && !ro ? ' is-placing' : '') + (tool.t === 'shape' && !ro ? ' is-drawing' : '') + (ro ? ' is-read' : '')}
            style={url ? undefined : { aspectRatio: `${BOARDS[boardOf(s)].w} / ${BOARDS[boardOf(s)].h}` }}
            onPointerDown={boardDown} onPointerMove={move} onPointerUp={up}
            onPointerCancel={() => { tap.current = null; if (draw) setDraw(null); const d = drag.current; drag.current = null; if (d?.moved) setMarks(ms => { void putStandard({ ...s, marks: ms }); return ms; }); }}>
            {url && <img className="ls-photo" src={url} alt="" draggable={false} onLoad={() => {
              const el = boardRef.current; if (el) setSize({ bw: el.clientWidth, bh: el.clientHeight });
            }} />}
            {size.bw > 0 && (
              <svg className="ls-svg" width={size.bw} height={size.bh} viewBox={`0 0 ${size.bw} ${size.bh}`}>
                {shapes.map(m => (
                  <ShapeSvg key={m.id} m={m} bw={size.bw} bh={size.bh} selected={selected === m.id}
                    onDown={(e, mode, edge) => down(e, m.id, mode, edge)} />
                ))}
                {draw && (() => {
                  const x = Math.min(draw.x0, draw.x1), y = Math.min(draw.y0, draw.y1);
                  return draw.shape === 'arrow'
                    ? <line x1={(draw.x0 / 100) * size.bw} y1={(draw.y0 / 100) * size.bh} x2={(draw.x1 / 100) * size.bw} y2={(draw.y1 / 100) * size.bh} className="ls-draft" />
                    : <rect x={(x / 100) * size.bw} y={(y / 100) * size.bh} width={(Math.abs(draw.x1 - draw.x0) / 100) * size.bw} height={(Math.abs(draw.y1 - draw.y0) / 100) * size.bh} className="ls-draft" />;
                })()}
              </svg>
            )}
            {/* THE BOTTLENECK, said on the area — in words, at its top */}
            {shapes.filter(m => m.bottleneck && m.shape !== 'arrow').map(m => (
              <span key={`bn-${m.id}`} className="ls-bn-tag is-area" style={{ left: `${m.x - (m.w ?? 0) / 2}%`, top: `${m.y - (m.h ?? 0) / 2}%` }}>Bottleneck</span>
            ))}
            {/* the words in the middle of each shape */}
            {shapes.filter(m => m.shape !== 'arrow' && m.label).map(m => {
              /* up a tall, narrow shape, read from the bottom (lib/standard wordsUp) — as the card writes it */
              const up = wordsUp(m, ((m.w ?? 0) / 100) * size.bw, ((m.h ?? 0) / 100) * size.bh, fontPx);
              return (
                <span key={`t-${m.id}`} className={'ls-shape-t' + (m.shape === 'triangle' && !up ? ' is-tri' : '') + (up ? ' is-up' : '')}
                  style={{
                    left: `${m.x - (m.w ?? 0) / 2}%`, top: `${m.y - (m.h ?? 0) / 2}%`, width: `${m.w}%`, height: `${m.h}%`,
                    color: TONES[m.tone ?? 'blue'].ink, fontSize: fontPx,
                  }}>{up ? <span className="ls-shape-up">{m.label}</span> : m.label}</span>
              );
            })}
            {icons_.map(m => (
              <button key={m.id} type="button" className={'ls-mark' + (editing === m.id ? ' is-on' : '') + (m.bottleneck ? ' is-bn' : '')} disabled={ro}
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
                aria-label={`${markOf(m.kind).word}${m.label ? ` — ${m.label}` : ''}${m.bottleneck ? ' — the bottleneck' : ''}`}
                title={m.label ? `${m.label}${m.task ? ` — ${m.task}` : ''}` : undefined}
                onPointerDown={e => down(e, m.id)} onClick={e => e.stopPropagation()}>
                {m.bottleneck && <span className="ls-bn-tag">Bottleneck</span>}
                <MarkIcon kind={m.kind} colour={colourOf(m)} />
                {(() => { const l = mapLabel(m, labels, people); return l ? <span className={'ls-mark-l' + (labels === 'number' && m.kind === 'person' ? ' is-n' : '')}>{l}</span> : null; })()}
              </button>
            ))}
          </div>
          {/* NAMES ON THE MAP — short, full or numbers; the whole of each, and
              what they do, are in Who does what */}
          <div className="chip-row ls-names" role="group" aria-label="Names on the map">
            <span className="sub">Names on the map:</span>
            {LABEL_MODES.map(x => (
              <button key={x.mode} type="button" className={'chip' + (labels === x.mode ? ' on' : '')} aria-pressed={labels === x.mode} onClick={() => setLabels(x.mode)}>{x.word}</button>
            ))}
          </div>
          {!ro && <div className="ls-board-foot">
            <button className="btn btn-ghost btn-sm ls-pic-b" onClick={() => setPicture(true)}>
              {url ? 'Change the picture' : 'Add a picture of the line — or draw it with shapes'}
            </button>
            {/* THE BOARD'S SHAPE — more room below, everything kept where it stands (lib/standard reshaped) */}
            {!url && (
              <span className="chip-row ls-shape-pick" role="group" aria-label="The board's shape">
                {(Object.keys(BOARDS) as BoardShape[]).map(b => (
                  <button key={b} type="button" className={'chip' + (boardOf(s) === b ? ' on' : '')} aria-pressed={boardOf(s) === b}
                    onClick={() => { if (b === boardOf(s)) return; const next = reshaped(marks, boardOf(s), b); setMarks(next); void putStandard({ ...s, marks: next, board: b }); }}>
                    {BOARDS[b].word}
                  </button>
                ))}
              </span>
            )}
          </div>}
        </div>

        <aside className="ls-side">
          <div className="ls-count"><b>{people.length}</b><span>{people.length === 1 ? 'person on this product' : 'people on this product'}</span></div>
          {/* THE BOTTLENECK, in words, first (13 October: "a little summary
              there saying ... bottleneck ... this area is this person's") */}
          {bottlenecksOf({ marks }).length > 0 && (
            <div className="ls-bn-sum" role="note">
              <span className="ls-bn-tag">Bottleneck</span>
              {bottlenecksOf({ marks }).map(b => <p key={b.id} className="ls-bn-words">{b.words}</p>)}
            </div>
          )}
          {thingsOf({ marks }) && <p className="sub ls-things">{thingsOf({ marks })}</p>}
          <h3 className="ls-side-h">Who does what</h3>
          {people.length === 0 && <p className="sub">{ro ? 'Nobody placed on this product yet.' : 'Pick Person and tap the board where they stand — or select a shape and add an operator to it.'}</p>}
          {ro && people.map((p, i) => (
            <div key={p.id} className={'ls-person' + (p.bottleneck ? ' is-bn' : '')}>
              <span className="ls-pn" style={{ background: colourOf(p) }} aria-hidden>{i + 1}</span>
              <span className="ls-role">{p.label || 'Unnamed'}{p.bottleneck && <span className="ls-bn-tag is-inline">Bottleneck</span>}</span>
              {work && workFor(p.label) && <span className={'ls-work' + (workFor(p.label)?.over ? ' is-r' : '')}>{(workFor(p.label)?.work ?? 0).toFixed(1)} s {workFor(p.label)?.untimed ? 'so far — not all timed' : `of ${(workFor(p.label)?.takt ?? work.taktSec).toFixed(1)} s${workFor(p.label)?.piece ?? ''}`}</span>}
              {p.task && <p className="ls-task-r">{p.task}</p>}
            </div>
          ))}
          {!ro && people.map((p, i) => (
            <div key={p.id} className={'ls-person' + (p.bottleneck ? ' is-bn' : '')}>
              <span className="ls-pn" style={{ background: colourOf(p) }} aria-hidden>{i + 1}</span>
              <input className="ls-role" value={p.label ?? ''} aria-label="Role" placeholder="Op 1"
                onFocus={() => { typing.current = true; }}
                onChange={e => patchMark(p.id, { label: e.target.value })}
                onBlur={() => { typing.current = false; void putStandard({ ...s, marks }); }} />
              {work && workFor(p.label) && <span className={'ls-work' + (workFor(p.label)?.over ? ' is-r' : '')}>{(workFor(p.label)?.work ?? 0).toFixed(1)} s {workFor(p.label)?.untimed ? 'so far — not all timed' : `of ${(workFor(p.label)?.takt ?? work.taktSec).toFixed(1)} s${workFor(p.label)?.piece ?? ''} takt`}</span>}
              <textarea className="ls-task" rows={taskRows(p.task)} value={p.task ?? ''} aria-label="What they do" placeholder="What they do on this product"
                onFocus={() => { typing.current = true; }}
                onChange={e => patchMark(p.id, { task: e.target.value })}
                onBlur={() => { typing.current = false; void putStandard({ ...s, marks }); }} />
              <button type="button" className={'chip ls-bn-b' + (p.bottleneck ? ' on' : '')} aria-pressed={!!p.bottleneck}
                aria-label={`${p.label || 'This person'} is the bottleneck`}
                onClick={() => saveMarks(marks.map(m => (m.id === p.id ? { ...m, bottleneck: !m.bottleneck || undefined } : m)))}>
                {p.bottleneck ? 'The bottleneck ✓' : 'The bottleneck?'}
              </button>
            </div>
          ))}
          {/* Deleting is the owner's (lib/access) — the database keeps the
              map for anyone else, so the button is not offered to them. */}
          {can.remove && <button className="btn btn-ghost btn-sm ls-del" onClick={() => void remove()}>Delete this map</button>}
        </aside>
      </div>

      {/* One mark: a shape's words and colour, or who a person is and what they do. */}
      {/* WHERE IT BELONGS (LINE_TOOLS.sql) — its line, and the job it is
          attached to, if any: a tool on a line first, attached when it is
          wanted. Changing the job is the owner's, as the map is. */}
      <BelongsTo s={s} home={home} can={can} onJob={projectId => { void save({ projectId }); void followStandard(s.id, projectId); }} />

      {/* THE LINE BALANCE for this product — a branch off the map, one line:
          where the line is limited, and the door to the balance itself
          (?at=balance). The panel is on its own page. */}
      <div className="ls-balance-line">
        <span className="ls-bl-h">Line capacity</span>
        <span className={'ls-bl-say' + (balanceSaid.short ? ' is-short' : '')}>{balanceSaid.text}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`${here}?at=balance`)}>Open its Line capacity ›</button>
      </div>
      {/* THE LINE BALANCE (ui/WorkBalance) — a branch off the map too: what
          the people's work comes to against takt, and the door to it. */}
      <div className="ls-balance-line">
        <span className="ls-bl-h">Line balance{work?.set ? ' · the standard' : ''}</span>
        <span className={'ls-bl-say' + (work?.people.some(w => w.over) ? ' is-short' : '')}>{work ? work.text : 'Not timed yet — time each person’s work against takt.'}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`${here}?at=work`)}>{work ? 'Open its line balance ›' : 'Time the work ›'}</button>
      </div>
      <p className="ls-together sub"><button type="button" className="linkish" onClick={() => nav(`${here}?at=all`)}>See it all together ›</button> — the map, the people’s times and the capacity on one page</p>
      {/* THE CHANGEOVER INTO THIS PRODUCT (ui/ChangeoverLines) — a branch off
          the map too: the newest changeover timed into it, the agreed
          sequence the standard holds, and the doors to both. */}
      <ChangeoverLines s={s} can={can} />

      <Sheet open={!!editingMark && !ro} onClose={() => { if (editingMark) void putStandard({ ...s, marks }); setEditing(null); }}
        title={editingMark ? (isShape(editingMark) ? SHAPES.find(x => x.shape === editingMark.shape)?.word ?? 'Shape' : markOf(editingMark.kind).word) : ''}>
        {editingMark && isShape(editingMark) && (
          <>
            {editingMark.shape !== 'arrow' && (
              <>
                <div className="field-label">{editingMark.shape === 'text' ? 'The words' : 'Name it'} <span className="opt">written in the middle</span></div>
                <textarea className="text-area" rows={Math.min(8, Math.max(2, (editingMark.label ?? '').split('\n').length + Math.floor((editingMark.label ?? '').length / 40)))} autoFocus value={editingMark.label ?? ''} placeholder="Bagger 1"
                  onChange={e => patchMark(editingMark.id, { label: e.target.value })} />
                <div className="field-label" style={{ marginTop: 10 }}>The words run <span className="opt">Auto writes them up a tall, narrow shape</span></div>
                <div className="chip-row" role="group" aria-label="Which way the words run">
                  {WORD_DIRS.map(d => (
                    <button key={d.word} type="button" className={'chip' + (editingMark.dir === d.dir ? ' on' : '')} aria-pressed={editingMark.dir === d.dir}
                      onClick={() => patchMark(editingMark.id, { dir: d.dir })}>{d.word}</button>
                  ))}
                </div>
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
            {editingMark.shape !== 'text' && editingMark.shape !== 'arrow' && <>
              <div className="field-label" style={{ marginTop: 10 }}>Fill <span className="opt">faded: the colour itself, the picture still seen under it</span></div>
              <div className="chip-row" role="group" aria-label="Fill">
                {FILLS.map(f => (
                  <button key={f.fill} type="button" className={'chip' + ((editingMark.fill ?? 'light') === f.fill ? ' on' : '')} aria-pressed={(editingMark.fill ?? 'light') === f.fill}
                    onClick={() => patchMark(editingMark.id, { fill: f.fill === 'light' ? undefined : f.fill as ShapeFill })}>{f.word}</button>
                ))}
              </div>
            </>}
            {editingMark.shape !== 'text' && <>
              <div className="field-label" style={{ marginTop: 10 }}>Line</div>
              <div className="chip-row" role="group" aria-label="Line">
                {LINES.map(l => (
                  <button key={l.line} type="button" className={'chip' + ((editingMark.line ?? 'solid') === l.line ? ' on' : '')} aria-pressed={(editingMark.line ?? 'solid') === l.line}
                    onClick={() => patchMark(editingMark.id, { line: l.line === 'solid' ? undefined : l.line as ShapeLine })}>{l.word}</button>
                ))}
              </div>
            </>}
            {editingMark.shape !== 'arrow' && (
              <label className="ls-bn-check">
                <input type="checkbox" checked={!!editingMark.bottleneck} onChange={e => patchMark(editingMark.id, { bottleneck: e.target.checked || undefined })} />
                <span>This area is the bottleneck <span className="opt">said on the map and in Who does what</span></span>
              </label>
            )}
            <div className="snag-editor-foot">
              <button className="btn btn-primary" onClick={() => { void putStandard({ ...s, marks }); setEditing(null); }}>Done</button>
              {editingMark.shape !== 'text' && (
                <button className="btn" onClick={() => { const sh = editingMark; void putStandard({ ...s, marks }); setEditing(null); addOperatorBy(sh); }}><Icon name="plus" /> Add an operator here</button>
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
                <textarea className="text-area" rows={Math.max(3, taskRows(editingMark.task))} value={editingMark.task ?? ''} placeholder="Load film, check the weigher every 30 minutes"
                  onChange={e => patchMark(editingMark.id, { task: e.target.value })} />
                {/* THEIR COLOUR (13 October) — on the board, in Who does what and on the card */}
                <div className="field-label" style={{ marginTop: 10 }}>Colour <span className="opt">on the board and the card</span></div>
                <div className="ls-pcols" role="group" aria-label="Their colour">
                  {(Object.keys(PERSON_COLOURS) as PersonColour[]).map(k => {
                    const on = (editingMark.colour ?? 'blue') === k;
                    return (
                      <button key={k} type="button" className={'ls-pcol' + (on ? ' is-on' : '')} aria-pressed={on}
                        onClick={() => patchMark(editingMark.id, { colour: k === 'blue' ? undefined : k })}>
                        <span className="ls-pcol-dot" style={{ background: PERSON_COLOURS[k].hex }} aria-hidden />{PERSON_COLOURS[k].word}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {/* a person, or the machine itself, holding the line */}
            <label className="ls-bn-check">
              <input type="checkbox" checked={!!editingMark.bottleneck} onChange={e => patchMark(editingMark.id, { bottleneck: e.target.checked || undefined })} />
              <span>{editingMark.kind === 'person' ? 'This person is the bottleneck' : `This ${markOf(editingMark.kind).word.toLowerCase()} is the bottleneck`} <span className="opt">said on the map and in Who does what</span></span>
            </label>
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
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Icon name="camera" /> Take or choose a photo</button>
        <WalkFrames home={home} onPick={async f => { await save({ photoKey: f.stillKey }); setPicture(false); }} />
        {url && <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => { void save({ photoKey: undefined }); setPicture(false); }}>Use a plain board and draw it instead</button>}
      </Sheet>

      {printing && <PrintSheet list={[{ ...s, marks, product }]} name={home.name} onClose={() => setPrinting(false)} />}

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
function WalkFrames({ home, onPick }: { home: StdHome; onPick: (f: SnagAsset) => void }) {
  const [frames, setFrames] = useState<SnagAsset[] | null>(null);
  /* A job's filmed walks, or the line's own. */
  const pid = home.project?.id, ws = home.wsId;
  useEffect(() => {
    if (pid) void framesForProject(pid).then(fs => setFrames(fs.map(f => f.frame)));
    else if (ws) void listSnagAssets(ws).then(setFrames);
  }, [pid, ws]);
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

/** The line a standard belongs to and the job it is attached to — one line
 *  under the map. From a line: pick a job, or none. From a job: the line it
 *  came from, when it has one. */
function BelongsTo({ s, home, can, onJob }: { s: Standard; home: StdHome; can: Can; onJob: (projectId: string) => void }) {
  const { projects } = useProjects();
  const [line, setLine] = useState<string | undefined>(undefined);
  useEffect(() => { if (s.workspaceId) void getWorkspace(s.workspaceId).then(w => setLine(w?.name)); }, [s.workspaceId]);
  const job = projects.find(p => p.id === s.projectId);
  const open = projects.filter(p => !p.deletedAt && !p.archivedAt);
  if (!s.workspaceId && home.project) return null;
  return (
    <p className="ls-belongs sub">
      {s.workspaceId && <>On <b>{line ?? 'its line'}</b> · </>}
      {can.edit && home.wsId ? (
        <label className="ls-job">On a project:{' '}
          <select value={s.projectId} onChange={e => onJob(e.target.value)} aria-label="Attach to a project">
            <option value="">None — a tool on the line</option>
            {open.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      ) : job ? <>attached to <b>{job.name}</b></> : 'on no project'}
      {job && home.wsId && <> · <button type="button" className="cw-link" onClick={() => nav(`/project/${job.id}/standard/${s.id}`)}>Open it in the project ›</button></>}
    </p>
  );
}
