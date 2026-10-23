/* THE CONTEXT BAR — where you are, and the way to anywhere else (docs/STRUCTURE.md §5.2, B2).
 *
 * It replaced the top bar's "Which project" select, which listed the control room and the projects
 * and nothing else, said "Your factory" on every line's page and "Tools" on every tool's (16 of 59
 * screens did not name the place, docs/STRUCTURE.md §15). Now the bar says the scope and the page:
 * Factory › Control room; Factory › Line 7 › Tools; Factory › Line 2 commissioning › Plan. The
 * scope's name is its switcher — every line and every project, found by typing — and Factory is the
 * way up. The mark is Home. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import type { Project, Workspace } from '../types';
import { matchScore, type Scope } from '../lib/scope';
import { LogoMark } from './Logo';
import { Icon } from './Icon';
import { AccountMenu } from './AccountMenu';
import { JumpTo } from './JumpTo';
import { QuickSnagButton } from '../snag/QuickSnag';
import { Sheet } from './Sheet';
import { lineHref } from './rail';

export function ContextBar({ scope, page, tool, toolTo, projects, lines, projectId }: {
  scope: Scope;
  /** The page of the scope you are on — the rail's line that is on. */
  page?: string;
  /** On a tool's page: the tool's name, after the page. */
  tool?: string;
  /** On one of a tool's records: its list in this scope — the tool's name is the way back to it. */
  toolTo?: string;
  projects: Project[];
  lines: Workspace[];
  /** The project the Problem button takes a problem for. */
  projectId?: string;
}) {
  const name = scope.kind === 'home' || scope.kind === 'factory' ? 'Factory'
    : scope.kind === 'line' ? lines.find(l => l.id === scope.wsId)?.name ?? 'A line'
      : projects.find(p => p.id === scope.projectId)?.name ?? 'A project';
  const [open, setOpen] = useState(false);
  const under = scope.kind === 'line' || scope.kind === 'project';
  return (
    <header className="nv-top">
      <button type="button" className="nv-mark" onClick={() => nav('/')} aria-label="Faultline — the factory">
        <LogoMark size={28} id="nv" />
        <span className="nv-name">Faultline</span>
      </button>
      <nav className="nv-ctx" aria-label="You are in">
        {/* THE WAY BACK, ALWAYS SAID (23 October): ‹ Factory from a line, ‹ Projects from a project */}
        {under && <><button type="button" className="nv-crumb nv-up" onClick={() => nav(scope.kind === 'project' ? '/projects' : '/room')} aria-label={scope.kind === 'project' ? 'Back to Projects' : 'Back to the factory'}><Icon name="chevronLeft" size={14} /><span className="nv-up-l">{scope.kind === 'project' ? 'Projects' : 'Factory'}</span></button><span className="nv-sep" aria-hidden>›</span></>}
        <button type="button" className="nv-job" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} aria-label={`${name} — switch to another line or project`}>
          <span className="nv-job-l">{name}</span>
          <Icon name="chevronDown" size={14} />
        </button>
        {page && <><span className="nv-sep" aria-hidden>›</span><span className={'nv-crumb nv-page' + (tool ? '' : ' is-last')}>{page}</span></>}
        {tool && <><span className="nv-sep" aria-hidden>›</span>{toolTo
          ? <button type="button" className="nv-crumb nv-page is-last" onClick={() => nav(toolTo)} aria-label={`${tool} — every one here`}>{tool}</button>
          : <span className="nv-crumb nv-page is-last">{tool}</span>}</>}
      </nav>
      <span className="nv-gap" aria-hidden />
      <JumpTo />
      <QuickSnagButton projectId={projectId} />
      <AccountMenu />
      {open && <Switcher scope={scope} projects={projects} lines={lines} onClose={() => setOpen(false)} />}
    </header>
  );
}

/** The rows that match what was typed, the best first (lib/scope matchScore); all, as they are, when nothing is. */
function ranked<T>(rows: T[], name: (r: T) => string, words: string): T[] {
  if (!words) return rows;
  return rows.map((r, i) => ({ r, i, s: matchScore(name(r), words) })).filter(x => x.s < 3).sort((a, b) => a.s - b.s || a.i - b.i).map(x => x.r);
}

/** EVERY LINE AND PROJECT, ONE TAP AWAY — found by typing a few letters (docs/STRUCTURE.md §5.2, §18:
 *  any line or project in three keystrokes at 30 lines and 50 projects). */
function Switcher({ scope, projects, lines, onClose }: { scope: Scope; projects: Project[]; lines: Workspace[]; onClose: () => void }) {
  const [q, setQ] = useState('');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { box.current?.focus(); }, []);
  const words = q.trim().toLowerCase();
  /* the best match first: a name that starts with what was typed, then a word in it that does, then
     anywhere in it — so "pac" is Line 7 pace before Line 2A — capacity */
  const shownLines = useMemo(() => ranked(lines, l => `${l.name} ${l.lineType ?? ''}`, words), [lines, words]);
  const shownProjects = useMemo(() => ranked(projects, p => p.name, words), [projects, words]);
  const best = useMemo(() => {
    const l = shownLines[0], p = shownProjects[0];
    if (!l) return p ? `/project/${p.id}` : null;
    if (!p) return lineHref(l.id);
    return matchScore(p.name, words) < matchScore(`${l.name} ${l.lineType ?? ''}`, words) ? `/project/${p.id}` : lineHref(l.id);
  }, [shownLines, shownProjects, words]);
  const go = (to: string) => { onClose(); nav(to); };
  const on = (k: 'home' | 'factory') => scope.kind === k || (k === 'factory' && scope.kind === 'home');
  return (
    <Sheet open onClose={onClose} title="Go to">
      <div className="nv-sw">
        <input ref={box} className="text-input nv-sw-q" value={q} onChange={e => setQ(e.target.value)} placeholder="A line or a project — type a few letters" aria-label="Find a line or a project"
          onKeyDown={e => { if (e.key === 'Enter' && best) go(best); }} />
        {!words && (
          <div className="nv-sw-g">
            <button type="button" className={'nv-sw-i' + (on('factory') ? ' is-on' : '')} onClick={() => go('/room')}><b>Factory</b><span>every line and project at once</span></button>
          </div>
        )}
        {shownLines.length > 0 && <p className="nv-sw-h">Lines</p>}
        <div className="nv-sw-g">
          {shownLines.map(l => (
            <button key={l.id} type="button" className={'nv-sw-i' + (scope.kind === 'line' && scope.wsId === l.id ? ' is-on' : '')} onClick={() => go(lineHref(l.id))}>
              <b>{l.name}</b>{l.lineType && <span>{l.lineType}</span>}
            </button>
          ))}
        </div>
        {shownProjects.length > 0 && <p className="nv-sw-h">Projects</p>}
        <div className="nv-sw-g">
          {shownProjects.map(p => (
            <button key={p.id} type="button" className={'nv-sw-i' + (scope.kind === 'project' && scope.projectId === p.id ? ' is-on' : '')} onClick={() => go(`/project/${p.id}`)}>
              <b>{p.name}</b>
            </button>
          ))}
        </div>
        {words && !shownLines.length && !shownProjects.length && <p className="sub">No line or project has “{q.trim()}” in its name.</p>}
      </div>
    </Sheet>
  );
}
