/* THE LINE TOOLS — every line standard, or every line balance, on every line
 * and every job, beside the snags in the rail.
 *
 * Rowland, 8 October: "we want line standard and line balancing as tools like
 * snag ... same principle: use independent or connect to project." They were
 * built as tools on a line on 7 October (LINE_TOOLS.sql), but reached only
 * from inside a line's study — a tool nobody could find is not a tool.
 *
 * One record each (lib/standard Standard — one per product per line): its
 * map says who stands where, its balance where the line is limited. The two
 * pages are the same records, seen for the tool you came for; a product opens
 * at its map, or at its balance. A new one asks which line (or a new line),
 * which product, and a job when it is for one — none is a real answer, as on
 * a snag. Attaching it to a job later is on its own page (StandardScreen
 * BelongsTo), and an attached one shows in that job's line standard too. */
import { LineCapacityHero } from '../ui/LineCapacityHero';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addLineToFactory, asked } from '../lib/lines';
import { deleteStudy, listAllStandards, listAllStudies, listWorkspaces, onDataChange, putStandard } from '../db';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useArchivedPlaces } from '../lib/useFactoryLines';
import type { ToolStudy } from '../lib/study';
import { changeoverLine, currentBalance, currentChangeover, studyHref, studyLine } from '../lib/studyLinks';
import { offerUndo } from '../ui/Undo';
import { useProjects } from '../lib/useProjects';
import { headcount, inCapacityTool, inMapTool, removingSays, thingsOf, type Standard } from '../lib/standard';
import { removeFromTool } from '../ui/StandardsCard';
import { useAccess } from '../cloud/access';
import { can as canOf } from '../lib/access';
import { productsOnLine, programsOnLine } from '../lib/lineRecords';
import { useLineRecords } from '../lib/useLineRecords';
import { analyse, shortSays } from '../lib/capacity';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { Sheet } from '../ui/Sheet';
import type { Workspace } from '../types';
import { AskingNote, useAsking, withFor } from '../ui/flow/Asking';

export type LineTool = 'map' | 'balance' | 'work';
const NEW_LINE = '__new__';

const WORDS: Record<LineTool, { title: string; lede: string; add: string; none: string }> = {
  map: {
    title: 'Line standard',
    lede: 'Who stands where, and what they do, on each product — on every line. Use one on a line with no job, or attach it to a job.',
    add: 'New line standard', none: 'No line standards yet.',
  },
  /* THE LINE BALANCE, its own tool (Rowland, 17 October: "line balance is
     about a more manual people process flow analysis ... what is happening
     where and what people are doing") — it was Line capacity's People tab */
  work: {
    title: 'Line balance',
    lede: 'What each person does on each product, timed at the line against takt — work, walking and waiting — where each works on the line, and what the bottleneck costs a pack and a minute. On a line with no job, or attached to one.',
    add: 'New line balance', none: 'No line balances yet.',
  },
  balance: {
    title: 'Line capacity',
    lede: 'Where each line is limited, product by product — the stations in the order the product flows, machines at their plate speed and people at their standard time, put into one unit; the bottleneck and the V-curve either side of it. On a line with no job, or attached to one.',
    add: 'New line capacity', none: 'No line capacity yet.',
  },
};

/** Where one opens: its line's own address, or — a map made inside a job
 *  before maps could live on a line — its job's; at its balance when that is
 *  the tool. */
export const openOf = (s: Pick<Standard, 'id' | 'projectId' | 'workspaceId'>, tool: LineTool): string => {
  const base = s.workspaceId ? `/w/${s.workspaceId}/standards/${s.id}` : `/project/${s.projectId}/standard/${s.id}`;
  return tool === 'balance' ? `${base}?at=balance` : tool === 'work' ? `${base}?at=work` : base;
};

/** What a product's balance says in a line: "Filler limits at 42 packs/min ·
 *  3 short of 45", and whether it is short — the only part that wears red. */
export function balanceSays(s: Pick<Standard, 'capacity'>): { text: string; short: boolean } {
  const cap = s.capacity;
  const n = cap?.stations.length ?? 0;
  if (!cap || n === 0) return { text: 'No stations yet — open it and write the line’s stations for this product', short: false };
  const r = analyse(cap);
  return { text: shortSays(r) ?? `${n} station${n === 1 ? '' : 's'} — speeds still to fill in`, short: (r.gap ?? 0) > 0 };
}

const mapSays = (s: Standard): string => {
  const n = headcount(s), things = thingsOf(s);
  if (!n && !things) return 'Nothing placed yet';
  return [`${n} ${n === 1 ? 'person' : 'people'}`, things].filter(Boolean).join(' · ');
};

export function LineToolsScreen({ tool }: { tool: LineTool }) {
  const w = WORDS[tool];
  const { projects } = useProjects();
  const [list, setList] = useState<Standard[] | null>(null);
  const [lines, setLines] = useState<Workspace[]>([]);
  /* opened from a line's own page: on that line, and New starts there */
  const [lineF, setLineF] = useState(() => (asked('line') ? `ws:${asked('line')}` : 'all'));
  /* ?add=1 — opened from a method's step done with the line balance (ui/flow/RunParts): New is open at once */
  const [adding, setAdding] = useState(() => asked('add') === '1');
  /* The line's changeovers (tool 6): its newest is said under the line, beside its maps and balances. */
  const [studies, setStudies] = useState<ToolStudy[]>([]);

  const load = useCallback(async () => {
    const [all, ws, ss] = await Promise.all([listAllStandards(), listWorkspaces(), listAllStudies()]);
    setList(all); setLines(ws); setStudies(ss);
  }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  /* a new map or balance is put on a line of Your factory, in floor order (lib/useFactoryLines) */
  const factory = useFactoryLines(asked('line'));
  const lineName = (id: string) => lines.find(x => x.id === id)?.name ?? 'A line';
  const jobName = (id?: string) => (id ? projects.find(p => p.id === id)?.name : undefined);
  /* By line; a map made inside a job with no line of its own sits under
     "Job: <its name>", never dressed as a line. */
  /* an archived job's own records — on no line, or on its own walk — go into the
     archive with it; a record on a line of the factory is the line's and stays */
  const put = useArchivedPlaces();
  /* EACH TOOL LISTS ITS OWN (lib/standard inCapacityTool): a product mapped
     and never worked out for capacity is not in Line capacity, and the other
     way round (Rowland, 13 October: "in line capacity why do I still see line
     standard cards in there"). */
  /* the line balance lists the products with a balance timed on them */
  const withBalance = useMemo(() => new Set(studies.filter(x => x.tool === 'balance' && !x.deletedAt && x.standardId).map(x => x.standardId as string)), [studies]);
  const inTool = useMemo(() => (tool === 'balance' ? inCapacityTool : tool === 'work' ? (s: Standard) => withBalance.has(s.id) : inMapTool), [tool, withBalance]);
  const groups = useMemo(() => {
    const by = new Map<string, Standard[]>();
    for (const s of (list ?? []).filter(inTool)) {
      const k = s.workspaceId ? `ws:${s.workspaceId}` : `job:${s.projectId}`;
      if (put.has(k)) continue;
      by.set(k, [...(by.get(k) ?? []), s]);
    }
    return [...by.entries()];
  }, [list, put, inTool]);
  const groupName = (k: string) => (k.startsWith('ws:') ? lineName(k.slice(3)) : `Job: ${jobName(k.slice(4)) ?? 'a job'}`);
  const shown = groups.filter(([k]) => lineF === 'all' || k === lineF);

  /* PAPER FOR EVERYTHING SHOWN (docs/AUDIT.md, bar 3) — Line capacity's
     report, a front and each product's own page (lib/capacityPaper); Line
     standard's cards, a card each under its place's name (ui/ToolPapers). */
  const [making, setMaking] = useState(false);
  const shownCount = shown.reduce((n, [, rows]) => n + rows.length, 0);
  const paper = async () => {
    if (making || !shownCount) return;
    setMaking(true);
    try {
      const name = lineF === 'all' ? w.title : groupName(lineF);
      if (tool === 'work') {
        /* every balance shown, each person's work against takt and what the bottleneck costs (lib/studiesPdf) */
        const [{ saveStudiesPdf }, { listObservations }] = await Promise.all([import('../lib/studiesPdf'), import('../db')]);
        const rows = shown.flatMap(([, rs]) => rs);
        const items = rows.map(s => ({ s: currentBalance(studies, s.id), where: `${s.product} · ${s.workspaceId ? lineName(s.workspaceId) : 'on no line'}${jobName(s.projectId) ? ` · for ${jobName(s.projectId)}` : ' · on no job'}` }))
          .filter((x): x is { s: ToolStudy; where: string } => !!x.s);
        const wsIds = [...new Set(rows.map(s => s.workspaceId).filter((x): x is string => !!x))];
        const observations = (await Promise.all(wsIds.map(id => listObservations(id)))).flat();
        await saveStudiesPdf({ title: name, printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), items, standards: list ?? [], ctx: { observations, workspaces: lines } }, name);
      } else if (tool === 'balance') {
        const { saveCapacityPdf } = await import('../lib/capacityPaperLoad');
        await saveCapacityPdf(shown.flatMap(([, rows]) => rows), { scope: lineF === 'all' ? 'every product shown' : groupName(lineF), name });
      } else {
        const { saveStandardCards } = await import('../ui/ToolPapers');
        /* each card under its place's name — the line's, or the job's, as on that job's own page */
        await saveStandardCards(shown.map(([k, rows]) => ({ name: k.startsWith('job:') ? jobName(k.slice(4)) ?? 'A job' : groupName(k), list: rows })), name);
      }
    } catch (e) {
      console.error('line tool paper failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setMaking(false); }
  };

  return (
    <div className="wrap qsl lt">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1>{w.title}</h1>
          <p className="sub">{w.lede}</p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn" disabled={making || !shownCount} onClick={() => void paper()}
            aria-label={tool === 'balance' ? 'PDF (all shown) — Line capacity for every product shown' : tool === 'work' ? 'PDF (all shown) — the line balance for every product shown' : 'PDF (all shown) — a line standard card for every product shown'}>
            {making ? 'Making…' : 'PDF (all shown)'}</button>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>{w.add}</button>
        </div>
      </header>
      {/* on one line (from its own page): its name, and the way back to every line */}
      {lineF !== 'all' && !groups.some(([k]) => k === lineF) && list && list.length > 0 && (
        <div className="qsl-empty">
          <p><b>None on {groupName(lineF)} yet.</b> Pick a product — one per product, on the line.</p>
          <div className="chip-row">
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>{w.add}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setLineF('all')}>Every line</button>
          </div>
        </div>
      )}
      {(groups.length > 1 || (lineF !== 'all' && groups.length > 0)) && (
        <div className="chip-row qsl-f" role="group" aria-label="Which line">
          <button type="button" className={'chip' + (lineF === 'all' ? ' on' : '')} aria-pressed={lineF === 'all'} onClick={() => setLineF('all')}>Every line</button>
          {groups.map(([k]) => (
            <button key={k} type="button" className={'chip' + (lineF === k ? ' on' : '')} aria-pressed={lineF === k} onClick={() => setLineF(k)}>{groupName(k)}</button>
          ))}
        </div>
      )}
      {list && list.length === 0 && (
        <div className="qsl-empty">
          <p><b>{w.none}</b> Pick a line and a product — one per product, on the line, attached to a job if it is for one.</p>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>{w.add}</button>
        </div>
      )}
      {shown.map(([k, rows]) => (
        <section key={k} className="qsl-g">
          <div className="qsl-gh">
            <h2>{groupName(k)}</h2>
            <span className="sub">{rows.length} product{rows.length === 1 ? '' : 's'}</span>
          </div>
          {/* WHAT THE LINE CAN MAKE (docs/upgrade-plan.md, C) — the line's
              answer above its products: what its counted shifts proved, where it
              is held, what changed, where the time went */}
          {tool === 'balance' && k.startsWith('ws:') && <LineCapacityHero wsId={k.slice(3)} products={rows} lineName={groupName(k)} />}
          {(() => {
            /* THE LINE'S CHANGEOVER — its newest, in one line, one tap to it:
               the minutes, the external work inside, how often each product runs. */
            const co = k.startsWith('ws:') ? currentChangeover(studies, { workspaceId: k.slice(3) }) : undefined;
            const said = co ? changeoverLine(co) : undefined;
            return co ? (
              <button type="button" className="lt-co" onClick={() => nav(studyHref(co))}>
                <span className="lt-co-k">SMED</span>
                <span className={'lt-co-t' + (said?.tone === 'a' ? ' is-a' : '')}>{said?.text ?? `${co.name}: not timed yet`}</span>
                <span className="lt-co-go" aria-hidden>›</span>
              </button>
            ) : null;
          })()}
          <ul className="lt-rows">
            {rows.map(s => <ToolRow key={s.id} s={s} tool={tool} job={jobName(s.projectId)} all={list ?? []} studies={studies} />)}
          </ul>
        </section>
      ))}
      <NewOne open={adding} tool={tool} lines={factory} list={list ?? []} onClose={() => setAdding(false)} onLine={lineF.startsWith('ws:') ? lineF.slice(3) : undefined} />
    </div>
  );
}

/** ONE PRODUCT ON THE LIST — opened with a tap; its name changed and the tool
 *  deleted where it sits (Rowland, 13 October: "cant delete a line capacity
 *  anywhere ... always implement deletes and editing in everything"). Deleting
 *  takes this tool off the product and keeps the other (lib/standard
 *  afterRemoving), with Undo. On a job the job's access says who may (the
 *  owner deletes, the team renames); on a line with no job, the line's people. */
function ToolRow({ s, tool, job, all, studies }: { s: Standard; tool: LineTool; job?: string; all: Standard[]; studies: ToolStudy[] }) {
  const jobCan = useAccess(s.projectId ?? '');
  const may = s.projectId ? jobCan : canOf('owner');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(s.product);
  const bal = tool === 'work' ? currentBalance(studies, s.id) : undefined;
  const said = tool === 'balance' ? balanceSays(s) : tool === 'work' ? (bal ? (l => ({ text: l.text, short: l.tone === 'r' }))(studyLine(bal)) : { text: 'Not timed yet', short: false }) : { text: mapSays(s), short: false };
  const clash = all.find(x => x.id !== s.id && !x.deletedAt && x.workspaceId === s.workspaceId && (x.projectId ?? '') === (s.projectId ?? '')
    && x.product.trim().toLowerCase() === name.trim().toLowerCase());
  const rename = async () => {
    const v = name.trim();
    if (!v || clash) return;
    if (v !== s.product) await putStandard({ ...s, product: v });
    setNaming(false);
  };
  const remove = async () => {
    /* a line balance is its studies on the product: taken off with an Undo, the product and its other tools kept */
    if (tool === 'work') {
      const mine = studies.filter(x => x.tool === 'balance' && x.standardId === s.id && !x.deletedAt);
      if (!mine.length || !window.confirm(`Delete the line balance for “${s.product}”? Its map and its Line capacity stay.`)) return;
      const backs = await Promise.all(mine.map(x => deleteStudy(x.id)));
      offerUndo(`Line balance for ${s.product} deleted — its map and Line capacity kept`, async () => { for (const b of backs) await b(); });
      return;
    }
    if (!window.confirm(removingSays(s, tool).ask)) return;
    await removeFromTool(s, tool);
  };
  if (naming) return (
    <li className="lt-li is-naming">
      <form className="lt-name" onSubmit={e => { e.preventDefault(); void rename(); }}>
        <input className="text-input" autoFocus value={name} aria-label={`The product's name — ${s.product}`} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setName(s.product); setNaming(false); } }} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim() || !!clash}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setName(s.product); setNaming(false); }}>Cancel</button>
        {clash && <span className="sub lt-clash">{clash.product} is already on this line — pick another name, or open that one.</span>}
      </form>
    </li>
  );
  return (
    <li className="lt-li">
      <button type="button" className="lt-row" onClick={() => nav(openOf(s, tool))}>
        <b className="lt-what">{s.product}</b>
        <span className={'lt-says' + (said.short ? ' is-short' : '')}>{said.text}</span>
        {/* WHERE IT BELONGS — on a job, or a tool on the line alone. */}
        <span className="lt-where">{job ? <>On <b>{job}</b></> : s.workspaceId ? 'On no job' : ''}</span>
      </button>
      {(may.edit || may.remove) && (
        <span className="lt-acts">
          {may.edit && <button type="button" className="cw-link" onClick={() => setNaming(true)} aria-label={`Rename ${s.product}`}>Rename</button>}
          {may.remove && <button type="button" className="cw-link sp-rm" onClick={() => void remove()} aria-label={`Delete ${tool === 'balance' ? 'the Line capacity' : tool === 'work' ? 'the line balance' : 'the line standard'} for ${s.product}`}>Delete</button>}
        </span>
      )}
    </li>
  );
}

/** A NEW ONE — which line (or a new line), which product, and the job it is
 *  for, if any. It opens at the tool it was made for. */
function NewOne({ open, tool, lines, list, onClose, onLine }: { open: boolean; tool: LineTool; lines: Workspace[]; list: Standard[]; onClose: () => void; onLine?: string }) {
  const { projects } = useProjects();
  const [line, setLine] = useState('');
  const [newLine, setNewLine] = useState('');
  const [product, setProduct] = useState('');
  const [job, setJob] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setLine(l => (lines.some(x => x.id === l) ? l : onLine && lines.some(x => x.id === onLine) ? onLine : lines[0]?.id ?? NEW_LINE)); }, [open, lines, onLine]);
  /* THE LINE'S PRODUCTS (D2) — what its programs run and its other products,
     offered; one already on the line is the same record, never a second */
  const rec = useLineRecords();
  const onIt = list.filter(x => x.workspaceId === line && !x.deletedAt);
  const products = line === NEW_LINE ? [] : productsOnLine(programsOnLine(line, rec.programs, rec.jobLines), onIt);
  const already = onIt.find(x => x.product.trim().toLowerCase() === product.trim().toLowerCase());
  const jobs = projects.filter(p => !p.deletedAt && !p.archivedAt);
  const ready = !!product.trim() && (line !== NEW_LINE || !!newLine.trim()) && !busy;
  /* a method's step asking for this tool's record: said here — a product's
     Line capacity answers it as it is made or opened here; a line balance
     when it is started (ui/WorkBalance) */
  const asking = useAsking(tool === 'balance' ? 'capacity' : 'balance');

  const make = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      /* a new line goes into Your factory, at the end of the floor (lib/lines) */
      const workspaceId = line === NEW_LINE ? (await addLineToFactory(newLine.trim())).id : line;
      const t = now();
      /* A PRODUCT ALREADY ON THE LINE is that record — its map and its
         capacity are one product's — opened at this tool, its capacity
         started when that is the tool. */
      const same = list.find(x => x.workspaceId === workspaceId && !x.deletedAt && x.product.trim().toLowerCase() === product.trim().toLowerCase());
      if (same) {
        if (tool === 'balance' && !same.capacity) await putStandard({ ...same, capacity: { stations: [] } });
        const forStep = tool === 'balance' ? await asking.attach(same.id) : undefined;
        setProduct(''); setNewLine(''); onClose();
        nav(withFor(openOf(same, tool), forStep));
        return;
      }
      /* The line does not move between products, the people do: a new map
         starts from the line's last picture. */
      const last = list.filter(s => s.workspaceId === workspaceId).pop();
      /* made in Line capacity, it starts with an empty capacity and no
         picture — it is a capacity, not a map, until somebody maps it */
      const s: Standard = { id: uid(), projectId: job, workspaceId, product: product.trim(),
        ...(tool === 'map' && last?.photoKey ? { photoKey: last.photoKey } : {}),
        ...(tool === 'balance' ? { capacity: { stations: [] } } : {}), marks: [], sort: t, createdAt: t, updatedAt: t };
      await putStandard(s);
      const forStep = tool === 'balance' ? await asking.attach(s.id) : undefined;
      setProduct(''); setNewLine(''); onClose();
      nav(withFor(openOf(s, tool), forStep));
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={WORDS[tool].add}>
      <form className="lt-new" onSubmit={e => { e.preventDefault(); void make(); }}>
        {tool !== 'map' && <AskingNote asking={asking} />}
        <label className="field"><span className="field-label">Which line</span>
          <select value={line} onChange={e => setLine(e.target.value)}>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value={NEW_LINE}>A new line…</option>
          </select>
        </label>
        {line === NEW_LINE && (
          <label className="field"><span className="field-label">The new line’s name</span>
            <input className="text-input" value={newLine} maxLength={80} placeholder="e.g. Line 4" onChange={e => setNewLine(e.target.value)} />
          </label>
        )}
        <label className="field"><span className="field-label">Which product{tool === 'balance' && <i className="sub"> — a line’s capacity is per product: the speeds differ by product</i>}</span>
          <input className="text-input" value={product} list="lt-products" placeholder="e.g. Maris Piper 2kg — Tall" onChange={e => setProduct(e.target.value)} />
          <datalist id="lt-products">{products.map(x => <option key={x} value={x} />)}</datalist>
          {already && <span className="sub">{already.product} is already on this line — {tool === 'balance' ? (already.capacity ? 'its capacity opens' : 'its capacity starts on it') : tool === 'work' ? 'its line balance opens' : 'its map opens'}.</span>}
        </label>
        <label className="field"><span className="field-label">For a job?</span>
          <select value={job} onChange={e => setJob(e.target.value)} aria-label="Attach to a job">
            <option value="">No — a tool on the line</option>
            {jobs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={!ready}>{tool === 'balance' ? 'Make it and balance the line' : tool === 'work' ? 'Make it and time the people' : 'Make it and draw the map'}</button>
      </form>
    </Sheet>
  );
}
