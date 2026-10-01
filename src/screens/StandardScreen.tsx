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
import { copyFor, headcount, MARKS, markOf, nextRole, peopleOf, thingsOf, type MarkKind, type Standard, type StandardMark } from '../lib/standard';
import { Crumbs } from '../ui/Crumbs';
import { useStandards } from '../ui/StandardsCard';
import { Sheet } from '../ui/Sheet';
import { offerUndo } from '../ui/Undo';
import type { SnagAsset } from '../snag/types';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function printStandards(list: Standard[], project: Project) {
  const { loadPdfLib, deliverPdf } = await import('../lib/savePdf');
  const { drawStandards } = await import('../lib/standardPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  await drawStandards(doc, list, project.name, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
  const name = list.length === 1 ? `${project.name} line standard — ${list[0].product}` : `${project.name} line standard`;
  await deliverPdf(doc, `${name.replace(/[\\/:*?"<>|]+/g, ' ').trim()}.pdf`);
}

/** One icon, as the palette and the map both draw it. */
export function MarkIcon({ kind, size = 30 }: { kind: MarkKind; size?: number }) {
  const k = markOf(kind);
  return (
    <svg className="ls-ic" width={size} height={size} viewBox="-4 -4 32 32" aria-hidden>
      <circle cx="12" cy="12" r="15" fill="#fff" />
      <circle cx="12" cy="12" r="13.5" fill={k.colour} />
      <path d={k.glyph} fill="#fff" fillRule="evenodd" transform="translate(2.4 2.4) scale(0.8)" />
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
        ...(commissioning ? [{ label: 'Hand over', to: `/project/${project.id}/handover` }] : []),
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
          {list.length > 0 && <button className="btn btn-ghost" onClick={() => void printStandards(list, project)}>Print all</button>}
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
        {s.marks.map(m => (
          <span key={m.id} className="ls-card-dot" style={{ left: `${m.x}%`, top: `${m.y}%`, background: markOf(m.kind).colour }} />
        ))}
      </span>
      <span className="ls-card-t">{s.product}</span>
      <span className="ls-card-s"><b>{plural(n, 'person', 'people')}</b>{thingsOf(s) ? ` · ${thingsOf(s)}` : ''}</span>
    </button>
  );
}

/* -------------------------------- the map -------------------------------- */

function MapEditor({ project, s, all }: { project: Project; s: Standard; all: Standard[] }) {
  const progs = usePrograms(project.id);
  const url = useBlobUrl(s.photoKey);
  const [tool, setTool] = useState<MarkKind>('person');
  const [marks, setMarks] = useState<StandardMark[]>(s.marks);
  const [editing, setEditing] = useState<string | null>(null);
  const [picture, setPicture] = useState(false);
  const [copying, setCopying] = useState(false);
  const [product, setProduct] = useState(s.product);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; moved: boolean; x0: number; y0: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const commissioning = planModel(project) === 'commissioning';

  // Another device's edit, or an undo, arrives as a new record: take it,
  // unless a mark is being dragged right now.
  useEffect(() => { if (!drag.current) setMarks(s.marks); }, [s.marks]);
  useEffect(() => { setProduct(s.product); }, [s.product]);

  const save = (patch: Partial<Standard>) => putStandard({ ...s, marks, ...patch });
  const saveMarks = (next: StandardMark[]) => { setMarks(next); void putStandard({ ...s, marks: next }); };

  const pct = (e: { clientX: number; clientY: number }) => {
    const r = boardRef.current?.getBoundingClientRect();
    if (!r) return { x: 50, y: 50 };
    return {
      x: Math.round(Math.min(98, Math.max(2, ((e.clientX - r.left) / r.width) * 100)) * 10) / 10,
      y: Math.round(Math.min(97, Math.max(3, ((e.clientY - r.top) / r.height) * 100)) * 10) / 10,
    };
  };
  const place = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('ls-photo')) return;
    const at = pct(e);
    const m: StandardMark = { id: uid(), kind: tool, ...at, label: tool === 'person' ? nextRole({ marks }) : undefined };
    saveMarks([...marks, m]);
    if (tool === 'person') setEditing(m.id);
  };
  const down = (e: RPointerEvent, id: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { id, moved: false, x0: e.clientX, y0: e.clientY };
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
    d.moved = true;
    const at = pct(e);
    setMarks(ms => ms.map(m => (m.id === d.id ? { ...m, ...at } : m)));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) setMarks(ms => { void putStandard({ ...s, marks: ms }); return ms; });
    else setEditing(d.id);
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

  return (
    <div className="wrap pace ls">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${project.id}` },
        ...(commissioning ? [{ label: 'Hand over', to: `/project/${project.id}/handover` }] : []),
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
          <button className="btn btn-ghost" onClick={() => void printStandards([{ ...s, marks }], project)}>Print</button>
          <button className="btn btn-ghost" onClick={() => setCopying(true)}>Copy to another product</button>
        </div>
      </header>

      <div className="ls-tools" role="toolbar" aria-label="What to place">
        {MARKS.map(k => (
          <button key={k.kind} className={'ls-tool' + (tool === k.kind ? ' is-on' : '')} aria-pressed={tool === k.kind}
            onClick={() => setTool(k.kind)}>
            <MarkIcon kind={k.kind} size={26} /><span>{k.word}</span>
          </button>
        ))}
        <span className="ls-tools-say sub">Pick one, then tap the picture. Drag to move.</span>
      </div>

      <div className="ls-body">
        <div className="ls-board-wrap">
          <div ref={boardRef} className={'ls-board' + (url ? '' : ' is-blank')} onClick={place}
            onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {url && <img className="ls-photo" src={url} alt="" draggable={false} />}
            {marks.map(m => (
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
            {url ? 'Change the picture' : 'Add a picture of the line'}
          </button>
        </div>

        <aside className="ls-side">
          <div className="ls-count"><b>{people.length}</b><span>{people.length === 1 ? 'person on this product' : 'people on this product'}</span></div>
          {thingsOf({ marks }) && <p className="sub ls-things">{thingsOf({ marks })}</p>}
          <h3 className="ls-side-h">Who does what</h3>
          {people.length === 0 && <p className="sub">Pick Person and tap the picture where they stand.</p>}
          {people.map(p => (
            <div key={p.id} className="ls-person">
              <MarkIcon kind="person" size={22} />
              <input className="ls-role" value={p.label ?? ''} aria-label="Role" placeholder="Op 1"
                onChange={e => setMarks(ms => ms.map(m => (m.id === p.id ? { ...m, label: e.target.value } : m)))}
                onBlur={() => void putStandard({ ...s, marks })} />
              <textarea className="ls-task" rows={2} value={p.task ?? ''} aria-label="What they do" placeholder="What they do on this product"
                onChange={e => setMarks(ms => ms.map(m => (m.id === p.id ? { ...m, task: e.target.value } : m)))}
                onBlur={() => void putStandard({ ...s, marks })} />
            </div>
          ))}
          <button className="btn btn-ghost btn-sm ls-del" onClick={() => void remove()}>Delete this map</button>
        </aside>
      </div>

      {/* One mark: what it is, who, and what they do — or take it off. */}
      <Sheet open={!!editingMark} onClose={() => setEditing(null)} title={editingMark ? markOf(editingMark.kind).word : ''}>
        {editingMark && (
          <>
            <div className="field-label">{editingMark.kind === 'person' ? 'Role' : 'Label'} <span className="opt">{editingMark.kind === 'person' ? 'e.g. Op 2, Line lead' : 'optional'}</span></div>
            <input className="text-input" autoFocus value={editingMark.label ?? ''}
              onChange={e => setMarks(ms => ms.map(m => (m.id === editingMark.id ? { ...m, label: e.target.value } : m)))} />
            {editingMark.kind === 'person' && (
              <>
                <div className="field-label" style={{ marginTop: 10 }}>What they do <span className="opt">on this product</span></div>
                <textarea className="text-area" rows={3} value={editingMark.task ?? ''} placeholder="Load film, check the weigher every 30 minutes"
                  onChange={e => setMarks(ms => ms.map(m => (m.id === editingMark.id ? { ...m, task: e.target.value } : m)))} />
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

      <Sheet open={picture} onClose={() => setPicture(false)} title="The picture of the line">
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) void addPhoto(f); }} />
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>📷 Take or choose a photo</button>
        <WalkFrames projectId={project.id} onPick={async f => { await save({ photoKey: f.stillKey }); setPicture(false); }} />
        {url && <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => { void save({ photoKey: undefined }); setPicture(false); }}>Use a plain board instead</button>}
      </Sheet>

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
