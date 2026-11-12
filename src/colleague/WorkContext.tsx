/* THE WORK IN CONTEXT — what the conversation is on, brought into the environment (11 November, docs/LUNAR-ENVIRONMENT.md — Rowland: "If I
 * say, 'LUNA, let's investigate the packing line', she should understand the context and bring the relevant factory and line information
 * into the working environment").
 *
 * Once the conversation is on a line (its thread's scope — set by Luna's resolve and update_context, or by where it was started), the
 * line itself comes into view beside it: its state in a word, its open problems worst first, its machines, and the records in use on it,
 * each opening the real page as the work. Read from the same records the line's own page reads; nothing worked out here that the app does
 * not already say. A project the same: its name, its method and its open problems. */
import { useEffect, useMemo, useState } from 'react';
import { listAllSnags, listAllStudies, onDataChange } from '../db';
import type { ToolStudy } from '../lib/study';
import type { Snag } from '../snag/types';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useProjects } from '../lib/useProjects';
import { lineState } from '../lib/today';
import { studyHref } from '../lib/studyLinks';
import { kindOfRecord } from './recordKind';
import { isConversation } from './conversation';
import { lineHref } from '../ui/rail';
import { Icon } from '../ui/Icon';

const RANK: Record<string, number> = { critical: 0, high: 1, low: 2 };
const HIDDEN = new Set(['talk', 'story']);

function useLineRecords(lineId?: string, projectId?: string, problemId?: string): { snags: Snag[]; studies: ToolStudy[]; problem?: Snag } | null {
  const [got, setGot] = useState<{ snags: Snag[]; studies: ToolStudy[]; problem?: Snag } | null>(null);
  useEffect(() => {
    if (!lineId && !projectId && !problemId) { setGot(null); return; }
    let live = true;
    const load = () => void Promise.all([listAllSnags(), listAllStudies()]).then(([snags, studies]) => {
      if (!live) return;
      const mine = (x: { workspaceId?: string | null; projectId?: string | null }) => (lineId ? x.workspaceId === lineId : x.projectId === projectId);
      setGot({
        snags: snags.filter(s => (lineId ? s.workspaceId === lineId : false) && s.status !== 'closed' && !s.archivedAt),
        studies: studies.filter(s => !s.deletedAt && !HIDDEN.has(s.tool) && !isConversation(s) && mine(s)).sort((a, b) => b.updatedAt - a.updatedAt),
        ...(problemId ? { problem: snags.find(x => x.id === problemId && !x.deletedAt) } : {}),
      });
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [lineId, projectId, problemId]);
  return got;
}

const same = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const PRIORITY_WORD = (p?: string) => (p === 'critical' ? 'Critical' : p === 'high' ? 'High' : 'Low');
const dayOf = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The line or project the conversation is on, as the work beside it — and, when it is about one, the machine and the problem (12
 *  November — Rowland: "extend contextual display to machines and problems, not just lines and projects"). `open` opens a record's
 *  real page as the work. Every word read from the records the app's own pages read. */
export function WorkContext({ lineId, projectId, machine, problemId, open }: { lineId?: string; projectId?: string; machine?: string; problemId?: string; open: (href: string) => void }) {
  const lines = useFactoryLines();
  const { projects } = useProjects();
  const line = lineId ? lines.find(l => l.id === lineId) : undefined;
  const project = !line && projectId ? projects.find(p => p.id === projectId) : undefined;
  const rec = useLineRecords(line?.id, project?.id, problemId);
  const problem = rec?.problem;
  const problemLine = problem ? lines.find(l => l.id === problem.workspaceId) : undefined;
  const machineName = machine ?? (problem?.targetAsset || undefined);
  const machineLine = line ?? problemLine;
  const onMachine = machineName && machineLine ? (rec?.snags ?? []).filter(x => same(x.targetAsset, machineName) && x.id !== problem?.id) : [];
  const machineWork = machineName ? (rec?.studies ?? []).filter(x => same(x.machine, machineName)).slice(0, 3) : [];
  const knownMachine = machineName && machineLine ? (machineLine.assets ?? []).find(a => same(a, machineName)) ?? machineName : undefined;
  const late = problem?.dueAt && problem.status !== 'closed' && problem.dueAt < Date.now();
  const problemBlock = problem ? (
    <section className="wctx" aria-label={`The problem, in context`} data-work-context="problem">
      <header className="wctx-h">
        <span className="wctx-k">The problem</span>
        <button type="button" className="wctx-t" onClick={() => open(`/snags?open=${encodeURIComponent(problem.id)}`)} data-wctx-open-problem>{problem.problem}<Icon name="chevron" size={14} /></button>
        <span className="sub">{[problemLine?.name, problem.targetAsset].filter(Boolean).join(' · ')}</span>
      </header>
      <p className="wctx-m" data-wctx-problem-state>
        <span className={`wctx-p is-${problem.priority === 'critical' ? 'r' : problem.priority === 'high' ? 'a' : 'n'}`}>{PRIORITY_WORD(problem.priority)}</span>
        {' '}{problem.status === 'closed' ? 'Closed' : 'Open'} · {problem.owner ? `${problem.owner} has it` : 'nobody has it yet'}
        {problem.dueAt ? <> · <span className={late ? 'wctx-late' : ''}>{late ? 'late — due ' : 'due '}{dayOf(problem.dueAt)}</span></> : null}
      </p>
      {problem.latestUpdate && <p className="sub" data-wctx-latest>Latest: {problem.latestUpdate}</p>}
      {(problem.journey ?? []).length > 0 && <p className="sub">{(problem.journey ?? []).length} step{(problem.journey ?? []).length === 1 ? '' : 's'} on its journey</p>}
    </section>
  ) : null;
  const machineBlock = knownMachine && machineLine ? (
    <section className="wctx" aria-label={`${knownMachine}, in context`} data-work-context="machine">
      <header className="wctx-h">
        <span className="wctx-k">The machine</span>
        <button type="button" className="wctx-t" onClick={() => open(`/lines/${encodeURIComponent(machineLine.id)}/machine/${encodeURIComponent(knownMachine)}`)} data-wctx-open-machine>{knownMachine}<Icon name="chevron" size={14} /></button>
        <span className="sub">on {machineLine.name}</span>
      </header>
      {onMachine.length > 0
        ? <ul className="wctx-list" aria-label="Open problems on the machine">{onMachine.slice(0, 3).map(x => (
            <li key={x.id}><button type="button" className="wctx-row" onClick={() => open(`/snags?open=${encodeURIComponent(x.id)}`)} data-wctx-machine-problem={x.id}>
              <span className={`wctx-p is-${x.priority === 'critical' ? 'r' : x.priority === 'high' ? 'a' : 'n'}`}>{PRIORITY_WORD(x.priority)}</span><span className="wctx-w">{x.problem}</span>
            </button></li>))}</ul>
        : <p className="sub" data-wctx-machine-none>{problem ? 'No other open problem on it.' : 'No open problem on it.'}</p>}
      {machineWork.length > 0 && <ul className="wctx-list" aria-label="Records on the machine">{machineWork.map(x => (
        <li key={x.id}><button type="button" className="wctx-row" onClick={() => open(studyHref(x))} data-wctx-machine-record={x.id}>
          <span className="wctx-tool">{kindOfRecord(x.tool, !!(x.facts as { video?: unknown } | undefined)?.video)}</span><span className="wctx-w">{x.name}</span>
        </button></li>))}</ul>}
    </section>
  ) : null;
  const worst = useMemo(() => (rec?.snags ?? []).slice().sort((a, b) => (RANK[a.priority ?? 'low'] ?? 3) - (RANK[b.priority ?? 'low'] ?? 3) || b.raisedAt - a.raisedAt), [rec]);
  if (!line && !project) return problemBlock || machineBlock ? <>{problemBlock}{machineBlock}</> : null;
  const critical = worst.filter(s => s.priority === 'critical').length;
  const st = lineState(worst.length, critical);
  const name = line?.name ?? project?.name ?? '';
  const href = line ? lineHref(line.id) : `/project/${project?.id ?? ''}`;
  const where = line ? [line.siteName, line.areaName, line.lineType].filter(Boolean).join(' · ') : 'Project';
  const machines = line?.assets ?? [];
  const work = (rec?.studies ?? []).slice(0, 4);
  return (
    <>
    {problemBlock}
    {machineBlock}
    <section className="wctx" aria-label={`${name}, in context`} data-work-context={line ? 'line' : 'project'}>
      <header className="wctx-h">
        <span className="wctx-k">{line ? 'The line' : 'The project'}</span>
        <button type="button" className="wctx-t" onClick={() => open(href)} data-wctx-open>{name}<Icon name="chevron" size={14} /></button>
        {where && <span className="sub">{where}</span>}
      </header>
      {line && (
        <p className={`wctx-state is-${st.state}`} data-wctx-state><span className="wctx-dot" aria-hidden />{st.word}</p>
      )}
      {worst.length > 0 && (
        <ul className="wctx-list" aria-label="Open problems">
          {worst.slice(0, 3).map(s => (
            <li key={s.id}><button type="button" className="wctx-row" onClick={() => open(`/snags?open=${encodeURIComponent(s.id)}`)}>
              <span className={`wctx-p is-${s.priority === 'critical' ? 'r' : s.priority === 'high' ? 'a' : 'n'}`}>{s.priority === 'critical' ? 'Critical' : s.priority === 'high' ? 'High' : 'Low'}</span>
              <span className="wctx-w">{s.problem}</span>
            </button></li>
          ))}
          {worst.length > 3 && <li className="sub">and {worst.length - 3} more on the line’s Problems</li>}
        </ul>
      )}
      {machines.length > 0 && (
        <p className="wctx-m"><span className="wctx-k">Machines</span>{machines.slice(0, 8).join(' → ')}{machines.length > 8 ? ` and ${machines.length - 8} more` : ''}</p>
      )}
      {work.length > 0 && (
        <div className="wctx-work">
          <span className="wctx-k">In use here</span>
          <ul className="wctx-list">
            {work.map(s => (
              <li key={s.id}><button type="button" className="wctx-row" onClick={() => open(studyHref(s))} data-wctx-record={s.id}>
                <span className="wctx-tool">{kindOfRecord(s.tool, !!(s.facts as { video?: unknown } | undefined)?.video)}</span><span className="wctx-w">{s.name}</span>
              </button></li>
            ))}
          </ul>
        </div>
      )}
      {rec && worst.length === 0 && work.length === 0 && <p className="sub">Nothing recorded on it yet — Luna can start a study with you.</p>}
    </section>
    </>
  );
}

/** THE ENVIRONMENT'S STARTING POINTS (docs/LUNAR-ENVIRONMENT.md): under Luna's greeting, what is happening on the lines — worst first,
 *  each a sentence for her — and where you were, each opening that page as the work beside her. Read from the records; nothing new. */
export function EnvStart({ onAsk, onOpen }: { onAsk: (words: string) => void; onOpen: (href: string, label: string) => void }) {
  const lines = useFactoryLines();
  const [snags, setSnags] = useState<Snag[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void listAllSnags().then(s => { if (live) setSnags(s.filter(x => x.status !== 'closed' && !x.archivedAt)); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  const [places, setPlaces] = useState<{ to: string; scope: string; page?: string }[]>([]);
  useEffect(() => { void import('../lib/recentPlaces').then(m => setPlaces(m.recentPlaces().slice(0, 3))); }, []);
  const happening = useMemo(() => lines.map(l => {
    const mine = (snags ?? []).filter(s => s.workspaceId === l.id);
    const st = lineState(mine.length, mine.filter(s => s.priority === 'critical').length);
    return { l, st, n: mine.length, crit: st.state === 'r' ? 1 : 0 };
  }).filter(x => x.n > 0).sort((a, b) => b.crit - a.crit || b.n - a.n).slice(0, 3), [lines, snags]);
  if (!happening.length && !places.length) return null;
  return (
    <div className="env-start" data-env-start>
      {happening.length > 0 && (
        <section className="env-s" aria-label="What is happening">
          <p className="env-k">On the lines now</p>
          {happening.map(x => (
            <button key={x.l.id} type="button" className="env-row" onClick={() => onAsk(`Let’s look at ${x.l.name} — what is going on there?`)} data-env-line={x.l.id}>
              <span className={`wctx-dot is-${x.st.state}`} aria-hidden /><b>{x.l.name}</b><span className="sub">{x.st.word}</span>
            </button>
          ))}
        </section>
      )}
      {places.length > 0 && (
        <section className="env-s" aria-label="Carry on">
          <p className="env-k">Carry on</p>
          {places.map(p => (
            <button key={p.to} type="button" className="env-row" onClick={() => onOpen(p.to, p.scope)} data-env-place>
              <Icon name="chevron" size={14} /><b>{p.scope}</b><span className="sub">{p.page ?? ''}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
