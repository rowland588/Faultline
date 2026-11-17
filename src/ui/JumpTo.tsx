/* JUMP TO — ⌘K / Ctrl-K, or the button in the top bar on a phone: type two
 * letters, Enter, you are there (docs/upgrade-plan.md F3; lib/jumpTo). The
 * factory's lines, the jobs, the products on each line, the tools and the
 * control room's pages — one list, nothing to set up. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { allPaceLines, listAllAssets, listAllSnags, listAllStandards, listAllStudies, listWorkspaces } from '../db';
import { openProblem } from '../snag/ProblemPanel';
import { placesOf } from '../lib/jumpPlaces';
import { jumpTo, TOOL_PLACES, type Place } from '../lib/jumpTo';
import { useProjects } from '../lib/useProjects';
import { useClientScope } from '../lib/activeClient';
import { nav } from '../state/useRoute';
import { toolsHref } from '../lib/toolWorkspace';
import { Icon } from './Icon';

const KIND: Record<Place['kind'], string> = { line: 'Line', job: 'Project', product: 'Product', tool: 'Tool', page: '', machine: 'Machine', problem: 'Problem' };

export const OPEN_SEARCH = 'faultline:open-search';
export const openSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH));

export function JumpTo() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const [places, setPlaces] = useState<Place[]>(TOOL_PLACES);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { projects } = useProjects();
  /* the active client's places only (lib/activeClient, docs/CONSULTANT-WORKSPACE.md C1); under All clients each says whose */
  const cs = useClientScope();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    const requested = () => setOpen(true);
    window.addEventListener(OPEN_SEARCH, requested);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener(OPEN_SEARCH, requested); };
  }, []);
  /* opened afresh: an empty box — never cleared again while it is open */
  useEffect(() => { if (open) { setQ(''); setAt(0); } }, [open]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    void (async () => {
      const [ws, std, snags, assets, jobLines, studies] = await Promise.all([listWorkspaces(), listAllStandards(), listAllSnags(), listAllAssets(), allPaceLines(), listAllStudies()]);
      if (!active) return;
      setPlaces(placesOf({ ws: ws.filter(w => cs.line(w.id)), std: std.filter(s => cs.record(s)), snags: snags.filter(s => cs.record(s)), assets, jobLines, studies: studies.filter(s => cs.record(s)),
        projects: projects.filter(p => cs.project(p.id)), ...(cs.all ? { whose: { line: cs.lineClient, project: (id: string) => cs.whose({ projectId: id }) } } : {}) }));
    })().catch(() => {
      if (active) { setPlaces(TOOL_PLACES); setLoadError(true); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, projects, cs]);

  const hits = useMemo(() => loading ? [] : jumpTo(q, places), [q, places, loading]);
  const go = (p?: Place) => { if (!p) return; setOpen(false); if (p.problemId) openProblem(p.problemId); else nav(p.kind === 'tool' || p.kind === 'product' ? toolsHref(p.href) : p.href); };

  return (
    <>
      <button type="button" className="nv-jump" onClick={() => setOpen(true)} aria-label="Search lines, machines, problems, projects and tools (Ctrl K)">
        <Icon name="search" size="1.05em" /><span className="nv-jump-l">Search lines, machines, problems, projects and tools</span><kbd className="nv-jump-k">⌘K</kbd>
      </button>
      {open && (
        <div className="jt-scrim" onClick={() => setOpen(false)}>
          <div className="jt" role="dialog" aria-modal="true" aria-label="Jump to" onClick={e => e.stopPropagation()}>
            <input ref={input} autoFocus className="jt-in" value={q} placeholder="A line, a machine, a problem, a project or a tool…" aria-label="Jump to"
              onChange={e => { setQ(e.target.value); setAt(0); }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setAt(i => Math.min(hits.length - 1, i + 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setAt(i => Math.max(0, i - 1)); }
                else if (e.key === 'Enter') { e.preventDefault(); go(hits[at]); }
              }} />
            <ul className="jt-list" role="listbox" aria-label="Places">
              {loading && <li className="sub jt-none" role="status">Loading saved work…</li>}
              {loadError && <li className="sub jt-none" role="status">Saved work could not be loaded. Close search and try again.</li>}
              {hits.map((p, i) => (
                <li key={`${p.kind}:${p.href}`} role="option" aria-selected={i === at}>
                  <button type="button" className={'jt-row' + (i === at ? ' on' : '')} onMouseEnter={() => setAt(i)} onClick={() => go(p)}>
                    <span className="jt-l">{p.label}</span>
                    {p.sub && <span className="jt-s">{p.sub}</span>}
                    {KIND[p.kind] && <span className="jt-k">{KIND[p.kind]}</span>}
                  </button>
                </li>
              ))}
              {!loading && !loadError && !hits.length && <li className="sub jt-none">Nothing found — try a word from a problem, or two letters of a line, machine, project or tool.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
