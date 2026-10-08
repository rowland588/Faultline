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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createWorkspace, listAllStandards, listWorkspaces, onDataChange, putStandard } from '../db';
import { useProjects } from '../lib/useProjects';
import { headcount, thingsOf, type Standard } from '../lib/standard';
import { analyse, shortSays } from '../lib/capacity';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { Sheet } from '../ui/Sheet';
import type { Workspace } from '../types';

export type LineTool = 'map' | 'balance';
const NEW_LINE = '__new__';

const WORDS: Record<LineTool, { title: string; lede: string; add: string; none: string }> = {
  map: {
    title: 'Line standard',
    lede: 'Who stands where, and what they do, on each product — on every line. Use one on a line with no job, or attach it to a job.',
    add: 'New line standard', none: 'No line standards yet.',
  },
  balance: {
    title: 'Line balance',
    lede: 'Where each line is limited, product by product — the stations in order, each at its own speed. On a line with no job, or attached to one.',
    add: 'New line balance', none: 'No line balances yet.',
  },
};

/** Where one opens: its line's own address, or — a map made inside a job
 *  before maps could live on a line — its job's; at its balance when that is
 *  the tool. */
export const openOf = (s: Pick<Standard, 'id' | 'projectId' | 'workspaceId'>, tool: LineTool): string => {
  const base = s.workspaceId ? `/w/${s.workspaceId}/standards/${s.id}` : `/project/${s.projectId}/standard/${s.id}`;
  return tool === 'balance' ? `${base}?at=balance` : base;
};

/** What a product's balance says in a line: "Filler limits at 42 packs/min ·
 *  3 short of 45", and whether it is short — the only part that wears red. */
export function balanceSays(s: Pick<Standard, 'capacity'>): { text: string; short: boolean } {
  const cap = s.capacity;
  const n = cap?.stations.length ?? 0;
  if (!cap || n === 0) return { text: 'No stations yet', short: false };
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
  const [lineF, setLineF] = useState('all');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [all, ws] = await Promise.all([listAllStandards(), listWorkspaces()]);
    setList(all); setLines(ws);
  }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const lineName = (id: string) => lines.find(x => x.id === id)?.name ?? 'A line';
  const jobName = (id?: string) => (id ? projects.find(p => p.id === id)?.name : undefined);
  /* By line; a map made inside a job with no line of its own sits under
     "Job: <its name>", never dressed as a line. */
  const groups = useMemo(() => {
    const by = new Map<string, Standard[]>();
    for (const s of list ?? []) {
      const k = s.workspaceId ? `ws:${s.workspaceId}` : `job:${s.projectId}`;
      by.set(k, [...(by.get(k) ?? []), s]);
    }
    return [...by.entries()];
  }, [list]);
  const groupName = (k: string) => (k.startsWith('ws:') ? lineName(k.slice(3)) : `Job: ${jobName(k.slice(4)) ?? 'a job'}`);
  const shown = groups.filter(([k]) => lineF === 'all' || k === lineF);

  return (
    <div className="wrap qsl lt">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1>{w.title}</h1>
          <p className="sub">{w.lede}</p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>{w.add}</button>
        </div>
      </header>
      {groups.length > 1 && (
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
          <ul className="lt-rows">
            {rows.map(s => {
              const said = tool === 'balance' ? balanceSays(s) : { text: mapSays(s), short: false };
              const job = jobName(s.projectId);
              return (
                <li key={s.id}>
                  <button type="button" className="lt-row" onClick={() => nav(openOf(s, tool))}>
                    <b className="lt-what">{s.product}</b>
                    <span className={'lt-says' + (said.short ? ' is-short' : '')}>{said.text}</span>
                    {/* WHERE IT BELONGS — on a job, or a tool on the line alone. */}
                    <span className="lt-where">{job ? <>On <b>{job}</b></> : s.workspaceId ? 'On no job' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <NewOne open={adding} tool={tool} lines={lines} list={list ?? []} onClose={() => setAdding(false)} />
    </div>
  );
}

/** A NEW ONE — which line (or a new line), which product, and the job it is
 *  for, if any. It opens at the tool it was made for. */
function NewOne({ open, tool, lines, list, onClose }: { open: boolean; tool: LineTool; lines: Workspace[]; list: Standard[]; onClose: () => void }) {
  const { projects } = useProjects();
  const [line, setLine] = useState('');
  const [newLine, setNewLine] = useState('');
  const [product, setProduct] = useState('');
  const [job, setJob] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setLine(l => (lines.some(x => x.id === l) ? l : lines[0]?.id ?? NEW_LINE)); }, [open, lines]);
  const jobs = projects.filter(p => !p.deletedAt && !p.archivedAt);
  const ready = !!product.trim() && (line !== NEW_LINE || !!newLine.trim()) && !busy;

  const make = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const workspaceId = line === NEW_LINE ? (await createWorkspace(newLine.trim())).id : line;
      const t = now();
      /* The line does not move between products, the people do: a new map
         starts from the line's last picture. */
      const last = list.filter(s => s.workspaceId === workspaceId).pop();
      const s: Standard = { id: uid(), projectId: job, workspaceId, product: product.trim(),
        ...(last?.photoKey ? { photoKey: last.photoKey } : {}), marks: [], sort: t, createdAt: t, updatedAt: t };
      await putStandard(s);
      setProduct(''); setNewLine(''); onClose();
      nav(openOf(s, tool));
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={WORDS[tool].add}>
      <form className="lt-new" onSubmit={e => { e.preventDefault(); void make(); }}>
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
        <label className="field"><span className="field-label">Which product</span>
          <input className="text-input" value={product} placeholder="e.g. Maris Piper 2kg — Tall" onChange={e => setProduct(e.target.value)} />
        </label>
        <label className="field"><span className="field-label">For a job?</span>
          <select value={job} onChange={e => setJob(e.target.value)} aria-label="Attach to a job">
            <option value="">No — a tool on the line</option>
            {jobs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={!ready}>{tool === 'balance' ? 'Make it and balance the line' : 'Make it and draw the map'}</button>
      </form>
    </Sheet>
  );
}
