import { openSearch } from './JumpTo';
/* EVERYTHING — the whole of Faultline, one discreet layer away (11 November, docs/LUNAR-ENVIRONMENT.md — Rowland: "Traditional navigation
 * should become secondary … Nothing important should disappear or become difficult to find. But the user shouldn't be confronted with
 * dozens of navigation options when they first open Faultline").
 *
 * Opened from the environment's bar (and anything that calls openEverything): one box that finds a line, a project, a place or a record
 * as you type; the places of the application; the work you were last in; your conversations with Luna; and the one thing anyone may need
 * at any moment — raise a problem. Every row opens the real page — never a copy of it. Opened from the environment, the page becomes the
 * work and Luna stays beside it (a desk) or a bar at its foot (a phone), the way a record she names opens (docs/LUNA-WORKSPACE.md W2) —
 * except Data connections, which is the factory page itself, never a sheet over the empty orb. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { Icon } from './Icon';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useProjects } from '../lib/useProjects';
import { listAllStudies, onDataChange } from '../db';
import type { ToolStudy } from '../lib/study';
import { isConversation, conversationTitle, factsOfConversation } from '../colleague/conversation';
import { studyHref } from '../lib/studyLinks';
import { kindOfRecord } from '../colleague/recordKind';
import { recentPlaces, lineIdFromPlace, projectIdFromPlace } from '../lib/recentPlaces';
import { useClientScope } from '../lib/activeClient';
import { toolsHref } from '../lib/toolWorkspace';
import { lineHref } from './rail';
import { openQuickSnag } from '../snag/QuickSnag';
import { onEverything, isEnvRoute, showInEnvironment } from '../colleague/environment';
import { useAiMode } from '../colleague/aiMode';
import { PRODUCT, COLLEAGUE } from '../lib/product';
import { FINDS, PLACES, openAccount, placeWords, type Place } from './everythingPlaces';
import { matches } from '../lib/findWords';

/* the places, and the words each is found by: ui/everythingPlaces */
export { PLACES } from './everythingPlaces';

const HIDDEN_TOOLS = new Set(['talk', 'story', 'brain']);

/** Data connections is a factory page of its own — never a work-pane sheet over empty Luna (24 November). */
function leavesEnv(to: string): boolean {
  return to.split('?')[0] === '/factory/data';
}

/** Opened from the environment: the page becomes the work, Luna stays beside it. Data connections, and anywhere else that is
 *  not the environment: simply the page. */
function openPlace(to: string, fromEnv: boolean, label: string): void {
  if (!fromEnv || leavesEnv(to)) { nav(to); return; }
  showInEnvironment(to, label);
}

export function EverythingHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => onEverything(() => setOpen(true)), []);
  /* ⌘. or Ctrl+. — Everything, from any page */
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === '.') { e.preventDefault(); setOpen(o => !o); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return open ? <Everything onClose={() => setOpen(false)} /> : null;
}

function Everything({ onClose }: { onClose: () => void }) {
  const route = useRoute();
  const aiOn = useAiMode();
  const cs = useClientScope();
  const fromEnv = isEnvRoute(route, aiOn);
  const lines = useFactoryLines();
  const { projects } = useProjects();
  const [studies, setStudies] = useState<ToolStudy[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void listAllStudies().then(all => { if (live) setStudies(all.filter(s => !s.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  const [q, setQ] = useState('');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { box.current?.focus(); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const go = (to: string, label = 'The work') => { onClose(); openPlace(to, fromEnv, label); };
  const talk = (id?: string) => { onClose(); nav(id ? `/ai?c=${encodeURIComponent(id)}` : '/'); };

  const words = q.trim().toLowerCase();
  /* word by word, in any order, the little words of a question left out (lib/findWords) — "archive client" finds Customers */
  const has = (s: string) => !words || matches(s, q);
  /* a place opened: its page — or the Account sheet, which is no page */
  const openIt = (p: Place) => { if (p.to === 'account') { onClose(); openAccount(); } else go(p.to, p.label); };
  const recentWork = useMemo(() => studies.filter(s => cs.ready && cs.record(s) && !HIDDEN_TOOLS.has(s.tool) && !isConversation(s)).slice(0, words ? 40 : 6).map(s => ({
    id: s.id, label: s.name || kindOfRecord(s.tool, !!(s.facts as { video?: unknown } | undefined)?.video), kind: kindOfRecord(s.tool, !!(s.facts as { video?: unknown } | undefined)?.video), on: [cs.all ? cs.whose(s) : '', lines.find(l => l.id === s.workspaceId)?.name].filter(Boolean).join(' · '), to: toolsHref(studyHref(s)),
  })), [studies, lines, words, cs]);
  const talks = useMemo(() => studies.filter(s => cs.ready && cs.record(s) && isConversation(s)).slice(0, words ? 30 : 4).map(s => ({ id: s.id, label: conversationTitle(factsOfConversation(s), 'A conversation'), at: s.updatedAt, client: cs.all ? cs.whose(s) : '' })), [studies, words, cs]);
  const places = recentPlaces().filter(p => cs.ready && (p.kind === 'line' ? cs.line(lineIdFromPlace(p.to)) : cs.project(projectIdFromPlace(p.to)))).slice(0, 4).map(p => ({ ...p, client: cs.all ? p.kind === 'line' ? cs.lineClient(lineIdFromPlace(p.to)) : cs.whose({ projectId: projectIdFromPlace(p.to) }) : '' }));
  const shown = {
    /* the ten, and — only once something is typed — what is found by typing alone (people, templates, the account) */
    places: [...PLACES, ...(words ? FINDS : [])].filter(p => has(placeWords(p))),
    lines: lines.filter(l => cs.ready && cs.line(l.id) && has(`${l.name} ${l.lineType ?? ''} ${l.areaName ?? ''}`)).slice(0, words ? 12 : 6),
    projects: projects.filter(p => cs.ready && cs.project(p.id) && has(p.name)).slice(0, words ? 12 : 5),
    work: recentWork.filter(w => has(`${w.label} ${w.kind} ${w.on ?? ''}`)).slice(0, words ? 12 : 6),
    talks: talks.filter(t => has(t.label)),
  };
  const firstPlace = shown.places[0];
  const first = shown.lines[0] ? lineHref(shown.lines[0].id) : shown.projects[0] ? `/project/${shown.projects[0].id}` : firstPlace && firstPlace.to !== 'account' ? firstPlace.to : shown.work[0]?.to;
  const nothing = cs.ready && words && !shown.places.length && !shown.lines.length && !shown.projects.length && !shown.work.length && !shown.talks.length;

  return (
    <div className="evy" role="dialog" aria-modal="true" aria-label={`Everything in ${PRODUCT.name}`} data-everything>
      <button type="button" className="evy-scrim" aria-label="Close" onClick={onClose} />
      <div className="evy-in">
        <header className="evy-h">
          <Icon name="search" size="1.2em" />
          <input ref={box} className="evy-q" value={q} onChange={e => setQ(e.target.value)} placeholder="Find a line, a project, a page or a record…" aria-label="Find anything in Faultline"
            onKeyDown={e => { if (e.key !== 'Enter') return; if (first) go(first); else if (firstPlace) openIt(firstPlace); }} data-everything-q />
          <button type="button" className="evy-x" onClick={onClose} aria-label="Close everything"><Icon name="close" size="1.1em" /></button>
        </header>
        <div className="evy-body">
          <button type="button" className="btn btn-ghost evy-search-records" onClick={() => { onClose(); openSearch(); }}>Search all lines, machines and problems</button>
          {!words && (
            <section className="evy-luna" aria-label={`Ask ${COLLEAGUE.name}`}>
              <button type="button" className="evy-luna-b" onClick={() => talk()} data-everything-luna>
                <span className="evy-orb" aria-hidden />
                <span><b>Ask {COLLEAGUE.name}</b><span className="sub">Say what you want to understand or get done — she brings the work to you.</span></span>
              </button>
              <button type="button" className="evy-act" onClick={() => { onClose(); openQuickSnag(); }} data-everything-problem><Icon name="warning" size="1.05em" />Raise a problem</button>
            </section>
          )}
          {!cs.ready && <p role="status" className="sub">Loading this client’s work…</p>}
          {nothing && <p className="sub evy-none">Nothing in {PRODUCT.name} matches “{q.trim()}”. Ask {COLLEAGUE.name} — she can look further.</p>}
          {shown.places.length > 0 && (
            <section aria-label="Places">
              <p className="evy-k">Places</p>
              <div className="evy-places">
                {shown.places.map(p => (
                  <button key={p.key} type="button" className="evy-place" onClick={() => openIt(p)} data-everything-place={p.key}>
                    <Icon name={p.icon} size="1.15em" /><span><b>{p.label}</b><span className="sub">{p.says}</span></span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {!words && places.length > 0 && (
            <section aria-label="Where you were">
              <p className="evy-k">Where you were</p>
              <ul className="evy-rows">{places.map(p => <li key={p.to}><button type="button" className="evy-row" onClick={() => go(p.to, p.scope)}><b>{p.scope}</b><span className="sub">{[p.client, p.page ?? (p.kind === 'line' ? 'Line' : 'Project')].filter(Boolean).join(' · ')}</span></button></li>)}</ul>
            </section>
          )}
          <div className="evy-cols">
            {shown.lines.length > 0 && (
              <section aria-label="Lines">
                <p className="evy-k">Lines</p>
                <ul className="evy-rows">{shown.lines.map(l => <li key={l.id}><button type="button" className="evy-row" onClick={() => go(lineHref(l.id), l.name)} data-everything-line={l.id}><b>{l.name}</b><span className="sub">{[cs.all ? cs.lineClient(l.id) : '', l.areaName, l.lineType].filter(Boolean).join(' · ') || 'Line'}</span></button></li>)}</ul>
              </section>
            )}
            {shown.projects.length > 0 && (
              <section aria-label="Projects">
                <p className="evy-k">Projects</p>
                <ul className="evy-rows">{shown.projects.map(p => <li key={p.id}><button type="button" className="evy-row" onClick={() => go(`/project/${p.id}`, p.name)}><b>{p.name}</b><span className="sub">{[cs.all ? cs.whose({ projectId: p.id }) : '', 'Project'].filter(Boolean).join(' · ')}</span></button></li>)}</ul>
              </section>
            )}
          </div>
          <div className="evy-cols">
            {shown.work.length > 0 && (
              <section aria-label="Recent work">
                <p className="evy-k">{words ? 'Records' : 'Recent work'}</p>
                <ul className="evy-rows">{shown.work.map(w => <li key={w.id}><button type="button" className="evy-row" onClick={() => go(w.to, w.label)} data-everything-record={w.id}><b>{w.label}</b><span className="sub">{w.kind}{w.on ? ` · ${w.on}` : ''}</span></button></li>)}</ul>
              </section>
            )}
            {shown.talks.length > 0 && (
              <section aria-label={`Conversations with ${COLLEAGUE.name}`}>
                <p className="evy-k">Conversations with {COLLEAGUE.name}</p>
                <ul className="evy-rows">{shown.talks.map(t => <li key={t.id}><button type="button" className="evy-row" onClick={() => talk(t.id)} data-everything-talk={t.id}><b>{t.label}</b><span className="sub">{[t.client, new Date(t.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}</span></button></li>)}</ul>
              </section>
            )}
          </div>
        </div>
        <footer className="evy-f sub">Everything in {PRODUCT.name} is here, one tap away. ⌘. opens this from any page.</footer>
      </div>
    </div>
  );
}

/** The environment's button for it. */
export function EverythingButton() {
  return (
    <button type="button" className="nv-evy" onClick={() => window.dispatchEvent(new Event('lunar-everything'))} aria-label="Everything — every page, line, project and record" title="Everything (⌘.)" data-everything-open>
      <Icon name="grip" size="1.1em" /><span className="nv-evy-l">Everything</span>
    </button>
  );
}
