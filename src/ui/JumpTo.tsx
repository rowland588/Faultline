/* JUMP TO — ⌘K / Ctrl-K, or the button in the top bar on a phone: type two
 * letters, Enter, you are there (docs/upgrade-plan.md F3; lib/jumpTo). The
 * factory's lines, the jobs, the products on each line, the tools and the
 * control room's pages — one list, nothing to set up. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { allPaceLines, listAllAssets, listAllSnags, listAllStandards, listWorkspaces } from '../db';
import { openProblem } from '../snag/ProblemPanel';
import { placesOf } from '../lib/jumpPlaces';
import { jumpTo, TOOL_PLACES, type Place } from '../lib/jumpTo';
import { useProjects } from '../lib/useProjects';
import { nav } from '../state/useRoute';
import { Icon } from './Icon';

const KIND: Record<Place['kind'], string> = { line: 'Line', job: 'Project', product: 'Product', tool: 'Tool', page: '', machine: 'Machine', problem: 'Problem' };

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
      const [ws, std, snags, assets, jobLines] = await Promise.all([listWorkspaces(), listAllStandards(), listAllSnags(), listAllAssets(), allPaceLines()]);
      setPlaces(placesOf({ ws, std, snags, assets, jobLines, projects }));
    })();
  }, [open, projects]);

  const hits = useMemo(() => jumpTo(q, places), [q, places]);
  const go = (p?: Place) => { if (!p) return; setOpen(false); if (p.problemId) openProblem(p.problemId); else nav(p.href); };

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
              {hits.map((p, i) => (
                <li key={`${p.kind}:${p.href}`} role="option" aria-selected={i === at}>
                  <button type="button" className={'jt-row' + (i === at ? ' on' : '')} onMouseEnter={() => setAt(i)} onClick={() => go(p)}>
                    <span className="jt-l">{p.label}</span>
                    {p.sub && <span className="jt-s">{p.sub}</span>}
                    {KIND[p.kind] && <span className="jt-k">{KIND[p.kind]}</span>}
                  </button>
                </li>
              ))}
              {!hits.length && <li className="sub jt-none">Nothing found — try a word from a problem, or two letters of a line, machine, project or tool.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
