/* THE PLAN'S TABS — the four gates and the timeline, one place.
 *
 * Rowland, 16 October: "when i show peole the app, i get losst in it, find
 * dorrs that open othe rthings" (docs/STAGEGATE-UX.md, slice 2). Install,
 * Set up, Commission and Hand over were four lines in the rail, each opening
 * the same shape of page; with the timeline a fifth. They are one Plan: the
 * rail says "Plan" once and these tabs move between its views, each with its
 * count as the rail said it — the whole number neutral, only the late part
 * red and in words (CLAUDE.md, visual rule 3). The routes are unchanged, so
 * every link into a gate still lands on its tab.
 *
 * THE PLAN TAB'S SWITCHER (27 October — Rowland: a second row of tabs under the project's own, with its own "Now",
 * "None of that should be there ... it's a mess"). The project's tabs are Now · Plan · Machines · Problems · Reports ·
 * More; this row shows only on Plan's own pages, and Now is no longer in it. */
import { useEffect, useRef } from 'react';
import { useStanding } from '../lib/useStanding';
import { GATE_KEYS, GATE_PATH, type GateKey } from './rail';

const WORD: Record<GateKey, string> = { install: 'Install', setup: 'Set up', testing: 'Commission', handover: 'Hand over' };

export function PlanTabs({ projectId, on }: { projectId: string; on: GateKey | 'timeline' | 'programs' }) {
  const { counts } = useStanding(projectId);
  const p = `#/project/${projectId}`;
  /* On a phone the tabs scroll sideways: the one you are on is brought into view. */
  const row = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('.plt-t.on');
    if (el && row.current) row.current.scrollLeft = Math.max(0, el.offsetLeft - (row.current.clientWidth - el.clientWidth) / 2);
  }, [on]);
  return (
    <nav className="plt" aria-label="The plan — its gates, the timeline and programs">
      {/* THE MACHINES TAB'S VIEWS (26 October, docs/STAGEGATE-RESEARCH.md §4): the gates, the timeline and the
          programs. Since 27 October they are the project's own, under Now — its front page first — and no longer the
          Machines tab's (Rowland: "If I go to projects, I should be able to see my project status ... If I go to
          machine, I want to be able to see everything associated to my machine"). The heading that said MACHINES over
          them went with it. */}
      <span className="plt-tabs" ref={row}>
        {GATE_KEYS.map(k => {
          const c = counts[k];
          return (
            <a key={k} href={`${p}/${GATE_PATH[k]}`} className={'plt-t' + (on === k ? ' on' : '')} aria-current={on === k ? 'page' : undefined}>
              {WORD[k]}
              {c && c.n > 0 && <span className="plt-n">{c.n}{c.late > 0 && <> · <b>{c.late} late</b></>}</span>}
              {c && c.n === 0 && c.done > 0 && <span className="plt-n is-done">done</span>}
            </a>
          );
        })}
        <a href={`${p}/plan`} className={'plt-t plt-time' + (on === 'timeline' ? ' on' : '')} aria-current={on === 'timeline' ? 'page' : undefined}>Timeline</a>
        <a href={`${p}/programs`} className={'plt-t plt-progs' + (on === 'programs' ? ' on' : '')} aria-current={on === 'programs' ? 'page' : undefined}>Programs</a>
      </span>
    </nav>
  );
}
