/* JUMP TO — ⌘K / Ctrl-K, or the button in the top bar on a phone: type two
 * letters, Enter, you are there (docs/upgrade-plan.md F3; lib/jumpTo). The
 * factory's lines, the jobs, the products on each line, the tools and the
 * control room's pages — one list, nothing to set up. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { listAllStandards, listWorkspaces } from '../db';
import { productionLines } from '../lib/lines';
import { jumpTo, TOOL_PLACES, type Place } from '../lib/jumpTo';
import { useProjects } from '../lib/useProjects';
import { nav } from '../state/useRoute';
import { Icon } from './Icon';

const KIND: Record<Place['kind'], string> = { line: 'Line', job: 'Job', product: 'Product', tool: 'Tool', page: '' };

export function JumpTo() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const [places, setPlaces] = useState<Place[]>(TOOL_PLACES);
  const { projects } = useProjects();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  /* opened afresh: an empty box — never cleared again while it is open */
  useEffect(() => { if (open) { setQ(''); setAt(0); } }, [open]);
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [ws, std] = await Promise.all([listWorkspaces(), listAllStandards()]);
      const lines = productionLines(ws);
      const name = new Map(ws.map(w => [w.id, w.name]));
      setPlaces([
        ...lines.map(w => ({ kind: 'line' as const, label: w.name, ...(w.lineType ? { sub: w.lineType } : {}), href: `#/lines/${w.id}` })),
        ...projects.map(p => ({ kind: 'job' as const, label: p.name, href: `#/project/${p.id}` })),
        ...std.filter(s => !s.deletedAt && s.workspaceId && name.has(s.workspaceId)).map(s => ({ kind: 'product' as const, label: s.product, sub: name.get(s.workspaceId as string), href: s.capacity?.stations.length ? `#/w/${s.workspaceId}/standards/${s.id}?at=balance` : `#/w/${s.workspaceId}/standards/${s.id}` })),
        ...TOOL_PLACES,
      ]);
    })();
  }, [open, projects]);

  const hits = useMemo(() => jumpTo(q, places), [q, places]);
  const go = (p?: Place) => { if (!p) return; setOpen(false); nav(p.href); };

  return (
    <>
      <button type="button" className="nv-jump" onClick={() => setOpen(true)} aria-label="Jump to a line, job, product or tool (Ctrl K)">
        <Icon name="pointer" size="1.05em" /><span className="nv-jump-l">Jump to…</span><kbd className="nv-jump-k">⌘K</kbd>
      </button>
      {open && (
        <div className="jt-scrim" onClick={() => setOpen(false)}>
          <div className="jt" role="dialog" aria-modal="true" aria-label="Jump to" onClick={e => e.stopPropagation()}>
            <input ref={input} autoFocus className="jt-in" value={q} placeholder="A line, a job, a product or a tool…" aria-label="Jump to"
              onChange={e => { setQ(e.target.value); setAt(0); }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setAt(i => Math.min(hits.length - 1, i + 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setAt(i => Math.max(0, i - 1)); }
                else if (e.key === 'Enter') { e.preventDefault(); go(hits[at]); }
              }} />
            <ul className="jt-list" role="listbox" aria-label="Places">
              {hits.map((p, i) => (
                <li key={`${p.kind}:${p.href}`} role="option" aria-selected={i === at}>
                  <button type="button" className={'jt-row' + (i === at ? ' on' : '')} onMouseEnter={() => setAt(i)} onClick={() => go(p)}>
                    <span className="jt-l">{p.label}</span>
                    {p.sub && <span className="jt-s">{p.sub}</span>}
                    {KIND[p.kind] && <span className="jt-k">{KIND[p.kind]}</span>}
                  </button>
                </li>
              ))}
              {!hits.length && <li className="sub jt-none">Nothing called that — try two letters of a line, job or tool.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
