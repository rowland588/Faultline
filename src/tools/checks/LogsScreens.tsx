/* THE LOGS PAGES — the factory's hub, one kind's list, and the part a line's page and a project's Tools carry
 * (knowledge/specs/FC-236-check-logs.md §10; docs/STRUCTURE.md §5.1: a running log is listed under a scope's Logs).
 *
 *   #/logs                    every kind of log, grouped, with what this scope has of each: how many, how many
 *                             checks overdue, failed or due now. ?line= narrows it to a line, ?project= to a project.
 *   #/log/:key                one kind's logs in this scope, the most urgent first, and New from its starter list.
 *   #/lines/:ws?view=logs     the line's Logs: Stops timed (the line's first log) and the check logs on it.
 *
 * A new log is started from its definition's starter list, on a line (a log is always a line's: its machines, its rate
 * and its problems are the line's), and in a project when it is started inside one. */
import { useEffect, useMemo, useState } from 'react';
import { putStudy } from '../../db';
import { useAccess } from '../../cloud/access';
import { useCanStartProjects } from '../../cloud/access';
import { can as canAt } from '../../lib/access';
import { asked, machineOntoLine } from '../../lib/lines';
import { inProject, inScope, startLine, type ProjectScope } from '../../lib/inProject';
import { useInProject } from '../../lib/useInProject';
import { useFactoryLines } from '../../lib/useFactoryLines';
import { useMachinesOf } from '../../lib/useLineRecords';
import { now as clock } from '../../lib/ids';
import { plural } from '../../lib/format';
import { nav } from '../../state/useRoute';
import type { ToolStudy } from '../../lib/study';
import { MoreMenu, PageHeader, RecordRow, RecordRows, Section } from '../../ui/parts';
import { ProjectScopeChips } from '../../ui/ProjectScope';
import { Sheet } from '../../ui/Sheet';
import { removeStudy, StudyRowName } from '../../ui/StudyActs';
import type { LogDef } from './def';
import { defGroups, defOf, logHref, LOG_DEFS } from './registry';
import { isLog, scopeCounts, statusOf, type LogStatus } from './owed';
import { newLogStudy, starterLog } from './start';
import { freqWords, logOf } from './checks';
import { useLogStudies, useNow } from './useLogData';

const OWNER = canAt('owner');

/** The scope a Logs page reads from its address: a line, a project (and what of it), or the factory. */
export function useLogScope() {
  const line = useMemo(() => asked('line'), []);
  const inP = useInProject();
  const [scope, setScope] = useState<ProjectScope>('project');
  const all = useLogStudies();
  const lines = useFactoryLines(line);
  const shown = useMemo(() => (all ? (line ? all.filter(s => s.workspaceId === line) : inP.id ? inScope(all, scope, inP.id, inP.lineIds) : all) : undefined), [all, line, inP.id, inP.lineIds, scope]);
  const lineName = line ? lines.find(l => l.id === line)?.name : undefined;
  return { line, lineName, inP, scope, setScope, shown, lines };
}

/** Where a page of the logs opens, in the scope it was reached in. */
const hereHref = (to: string, line: string | undefined, project: string | undefined): string => (project ? inProject(to, project) : line ? `${to}${to.includes('?') ? '&' : '?'}line=${encodeURIComponent(line)}` : to);

const toneOf = (t: LogStatus): 'r' | 'a' | 'g' | 'n' => t.tone;

/* ------------------------------------------------------------------------------ the hub */

export function LogsHubScreen() {
  const sc = useLogScope();
  const now = useNow();
  const mayStart = useCanStartProjects();
  /* inside a project, New is for whoever may change its work — a client reads (lib/access) */
  const pCan = useAccess(sc.inP.id ?? '');
  const canNew = sc.inP.project ? pCan.edit : mayStart;
  const rows = useMemo(() => sc.shown ?? [], [sc.shown]);
  const total = useMemo(() => scopeCounts(rows, now), [rows, now]);
  const where = sc.lineName ? `ON ${sc.lineName.toUpperCase()}` : sc.inP.project ? `IN ${sc.inP.project.name.toUpperCase()}` : 'FACTORY';
  const says = !sc.shown ? 'Reading the logs…'
    : total.logs === 0 ? 'No check log is started here yet — start one from a kind below, from its starter list.'
      : `${plural(total.logs, 'check log')} here${total.overdue || total.failed || total.due ? ` — ${[total.overdue ? `${total.overdue} overdue` : '', total.failed ? `${total.failed} failed` : '', total.due ? `${total.due} due now` : ''].filter(Boolean).join(' · ')}` : ' — every check up to date'}.`;
  return (
    <div className="wrap qsl lg-hub" data-page="logs">
      <PageHeader eyebrow={`LOGS · ${where}`} title="Check logs" says={<span data-hub-says className={total.overdue || total.failed ? 'ie-tone is-r' : undefined}>{says}</span>} />
      {sc.inP.id && <ProjectScopeChips name={sc.inP.project?.name} lines={sc.inP.lineIds.length} scope={sc.scope} onScope={sc.setScope} />}
      {sc.line && (
        <div className="chip-row qsl-f" role="group" aria-label="Which line">
          <button type="button" className="chip on" aria-pressed>{sc.lineName ?? 'This line'}</button>
          <button type="button" className="chip" onClick={() => nav('/logs')}>All lines</button>
        </div>
      )}
      {defGroups().map(g => (
        <Section key={g.group} title={g.group} count={plural(g.defs.length, 'kind')} label={g.group}>
          <RecordRows label={g.group}>
            {g.defs.map(d => {
              const mine = rows.filter(s => s.agreed?.log?.key === d.key);
              const c = scopeCounts(mine, now);
              const parts = [c.overdue ? `${c.overdue} overdue` : '', c.failed ? `${c.failed} failed` : '', c.due ? `${c.due} due now` : ''].filter(Boolean);
              return (
                <RecordRow key={d.key} what={d.title}
                  says={mine.length ? `${plural(mine.length, 'log')}${parts.length ? ` · ${parts.join(' · ')}` : ' · up to date'}` : 'None here yet'}
                  tone={c.overdue || c.failed ? 'r' : c.due ? 'a' : mine.length ? 'g' : 'n'}
                  where={<>{d.says} <span className="sub">· {d.fc}</span></>}
                  onOpen={() => nav(hereHref(logHref(d.key), sc.line, sc.inP.id))}
                  aside={canNew ? <button type="button" className="btn btn-sm" aria-label={`New — ${d.title}`} onClick={() => nav(hereHref(`${logHref(d.key)}?add=1`, sc.line, sc.inP.id))}>New</button> : undefined} />
              );
            })}
          </RecordRows>
        </Section>
      ))}
      {LOG_DEFS.length === 0 && <p className="sub">No kind of check log is built into this version.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------------------ one kind's list */

export function LogListScreen({ logKey }: { logKey: string }) {
  const def = defOf(logKey);
  const sc = useLogScope();
  const now = useNow();
  const mayStart = useCanStartProjects();
  const [adding, setAdding] = useState(() => asked('add') === '1');
  const mine = useMemo(() => (sc.shown ?? []).filter(s => s.agreed?.log?.key === logKey), [sc.shown, logKey]);
  const sorted = useMemo(() => [...mine].sort((a, b) => {
    const A = statusOf(a, now), B = statusOf(b, now);
    return (B.overdue + B.failed) - (A.overdue + A.failed) || B.due - A.due || b.updatedAt - a.updatedAt;
  }), [mine, now]);
  const pCan = useAccess(sc.inP.id ?? '');
  if (!def) return (
    <div className="wrap qsl"><h1>No such kind of log</h1><p className="sub">“{logKey}” is not a check log this version of Faultline has.</p><button type="button" className="btn" onClick={() => nav('/logs')}>Every check log</button></div>
  );
  const canNew = sc.inP.project ? pCan.edit : mayStart;
  const total = scopeCounts(mine, now);
  return (
    <div className="wrap qsl ie-list lg-list-page" data-page="log-list" data-log-kind={def.key}>
      <PageHeader eyebrow={`${def.group.toUpperCase()} · ${def.fc}`} title={def.title}
        says={<span className="sub">{def.says}.{total.logs ? ` ${plural(total.logs, 'log')} here${total.overdue || total.failed ? ` — ${total.overdue ? `${total.overdue} overdue` : ''}${total.overdue && total.failed ? ' · ' : ''}${total.failed ? `${total.failed} failed` : ''}` : ''}.` : ''}</span>}
        primary={canNew ? { label: `New ${def.noun} log`, run: () => setAdding(true) } : undefined} />
      {sc.inP.id && <ProjectScopeChips name={sc.inP.project?.name} lines={sc.inP.lineIds.length} scope={sc.scope} onScope={sc.setScope} />}
      {sc.line && (
        <div className="chip-row qsl-f" role="group" aria-label="Which line">
          <button type="button" className="chip on" aria-pressed>{sc.lineName ?? 'This line'}</button>
          <button type="button" className="chip" onClick={() => nav(logHref(def.key))}>All lines</button>
        </div>
      )}
      <details className="lg-rests"><summary>What this rests on, and what is still to confirm</summary>
        <p data-standard>{def.standard.rests}</p>
        <ul aria-label="To confirm">{def.standard.confirm.map(x => <li key={x}>{x}</li>)}</ul>
      </details>
      {sc.shown && sorted.length === 0 && (
        <div className="qsl-empty">
          <p>No {def.title.toLowerCase()} log is started {sc.lineName ? `on ${sc.lineName}` : sc.inP.project ? `for ${sc.inP.project.name}` : 'yet'}. Start one from the starter list — {def.starterChecks.length} checks to edit to your plan.</p>
          {canNew && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>New {def.noun} log</button>}
        </div>
      )}
      {sorted.length > 0 && (
        <ul className="lt-rows" aria-label={`${def.title} logs`}>
          {sorted.map(s => <LogRow key={s.id} s={s} def={def} now={now} line={sc.lines.find(l => l.id === s.workspaceId)?.name} project={sc.inP.id} />)}
        </ul>
      )}
      {adding && <NewLogSheet def={def} onClose={() => setAdding(false)} line={sc.line} project={sc.inP.project && canNew ? { id: sc.inP.project.id, name: sc.inP.project.name, lineIds: sc.inP.lineIds } : undefined} />}
    </div>
  );
}

/** One log on a list: its state in words and colour, opened with a tap; renamed and deleted where it sits. */
export function LogRow({ s, def, now, line, project }: { s: ToolStudy; def?: LogDef; now: number; line?: string; project?: string }) {
  const jobCan = useAccess(s.projectId ?? '');
  const may = s.projectId ? jobCan : OWNER;
  const [naming, setNaming] = useState(false);
  const st = statusOf(s, now);
  const d = def ?? defOf(s.agreed?.log?.key);
  if (naming) return <li className="lt-li is-naming" data-study={s.id}><StudyRowName s={s} onDone={() => setNaming(false)} /></li>;
  return (
    <li className="lt-li" data-study={s.id}>
      <button type="button" className="lt-row" onClick={() => nav(project ? inProject(logHref(logOf(s).key, s.id), project) : logHref(logOf(s).key, s.id))}>
        <b className="lt-what">{s.name || 'Not named'}{line ? <span className="ie-li-m"> · {line}</span> : null}</b>
        <span className={'lt-says ie-tone is-' + toneOf(st)}>{st.words}</span>
        <span className="lt-where">{d ? `${d.title} · ` : ''}{plural(st.checks, 'check')} · {plural(st.results, 'result')}{s.closedAt ? ' · closed' : ''}</span>
      </button>
      {((may.edit && !s.closedAt) || may.remove) && (
        <span className="lt-acts">
          {may.edit && !s.closedAt && <button type="button" className="cw-link" onClick={() => setNaming(true)} aria-label={`Rename ${s.name || 'this log'}`}>Rename</button>}
          {may.remove && <button type="button" className="cw-link sp-rm" onClick={() => void removeStudy(s)} aria-label={`Delete ${s.name || 'this log'}`}>Delete</button>}
        </span>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------------------ a new log */

export function NewLogSheet({ def, onClose, line, project }: { def: LogDef; onClose: () => void; line?: string; project?: { id: string; name: string; lineIds: string[] } }) {
  const factoryLines = useFactoryLines(line);
  const pLines = project?.lineIds;
  const lines = useMemo(() => (pLines?.length ? [...factoryLines.filter(l => pLines.includes(l.id)), ...factoryLines.filter(l => !pLines.includes(l.id))] : factoryLines), [factoryLines, pLines]);
  const [lineId, setLineId] = useState(line ?? '');
  useEffect(() => { if (!lineId && pLines) setLineId(startLine(pLines)); }, [lineId, pLines]);
  const [machine, setMachine] = useState('');
  const [name, setName] = useState('');
  const [pick, setPick] = useState<Set<number>>(() => new Set(def.starterChecks.map((_, i) => i)));
  const [busy, setBusy] = useState(false);
  const machines = useMachinesOf(lineId || undefined);
  const lineName = lines.find(l => l.id === lineId)?.name;
  const area = def.whereLabel.toLowerCase();
  const suggested = `${def.title}${machine.trim() ? ` — ${machine.trim()}` : lineName ? ` — ${lineName}` : ''}`;
  const ready = !!lineId && pick.size > 0 && !busy;
  const make = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const t = clock();
      const s = newLogStudy(def, { since: t, now: t, name: name.trim() || suggested, workspaceId: lineId, ...(project ? { projectId: project.id } : {}), ...(machine.trim() ? { machine: machine.trim(), where: machine.trim() } : {}), pick: [...pick].sort((a, b) => a - b) });
      await putStudy(s);
      if (machine.trim()) await machineOntoLine(lineId, machine);
      onClose();
      nav(project ? inProject(logHref(def.key, s.id), project.id) : logHref(def.key, s.id));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={`New ${def.noun} log`}>
      <form className="lt-new lg-new" data-sheet="new-log" onSubmit={e => { e.preventDefault(); void make(); }}>
        {project && <p className="sub ie-for" data-for-project={project.id}>For <b>{project.name}</b> — it is the project’s, with everything else in it.</p>}
        <label className="field"><span className="field-label">Which line?</span>
          <select className="text-input" value={lineId} aria-label="Which line" onChange={e => setLineId(e.target.value)}>
            <option value="">Pick the line…</option>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <span className="sub">A log is a line’s: its machines, its rate and its problems are the line’s.</span>
        </label>
        <label className="field"><span className="field-label">{def.whereLabel} <i className="sub">optional — filled into every check that has none</i></span>
          <input className="text-input" value={machine} maxLength={80} list={machines.length ? 'new-log-where' : undefined} aria-label={def.whereLabel} onChange={e => setMachine(e.target.value)} placeholder={area === 'detector' ? 'Metal detector' : area === 'machine' ? 'Wrapper' : 'Packing hall'} />
          {machines.length > 0 && <datalist id="new-log-where">{machines.map(m => <option key={m} value={m} />)}</datalist>}
        </label>
        <label className="field"><span className="field-label">Name <i className="sub">optional</i></span>
          <input className="text-input" value={name} maxLength={120} aria-label="Name" placeholder={suggested} onChange={e => setName(e.target.value)} /></label>
        <fieldset className="lg-fs"><legend className="field-label">The starter list <i className="sub">a starting point to edit — not the standard</i></legend>
          <ul className="lg-pick">
            {def.starterChecks.map((c, i) => (
              <li key={c.name}><label><input type="checkbox" checked={pick.has(i)} aria-label={c.name} onChange={() => setPick(p => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
                <span><b>{c.name}</b> <span className="sub">{freqWords(c.when)}{c.kind === 'scored' ? ` · ${(c.items ?? []).length} questions` : ''}</span></span></label></li>
            ))}
          </ul>
        </fieldset>
        <p className="sub">{def.standard.confirm.length} thing{def.standard.confirm.length === 1 ? '' : 's'} to confirm against your own plan are listed on the log.</p>
        <button type="submit" className="btn btn-primary" disabled={!ready}>Start it</button>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------------------------ a line's Logs */

/** The line's Logs part (its page, ?view=logs and the overview): Stops timed, the line's first log, and every check
 *  log on the line with its state, a New for each kind. `studies` are the line's, read by its page. */
export function LinesLogs({ wsId, studies, stops, may, view }: { wsId: string; studies: ToolStudy[]; stops: ReactStopsRow; may: boolean; view: boolean }) {
  const now = useNow();
  const mine = useMemo(() => studies.filter(isLog), [studies]);
  const total = scopeCounts(mine, now);
  const rows = [...mine].sort((a, b) => { const A = statusOf(a, now), B = statusOf(b, now); return (B.overdue + B.failed) - (A.overdue + A.failed) || B.due - A.due; });
  return (
    <section className="pl-sec lg-line" aria-label="Logs on this line" data-section="logs">
      <div className="pl-sec-h"><h2>Logs on this line</h2>
        {view && may && <MoreMenu label="New" items={LOG_DEFS.map(d => ({ label: d.title, run: () => nav(`${logHref(d.key)}?add=1&line=${encodeURIComponent(wsId)}`) }))} />}
      </div>
      <p className="sub lg-line-says" data-line-logs-says>{mine.length === 0 ? 'No check log on this line yet — a log is a list of checks done on a schedule, with what a failure holds.' : `${plural(mine.length, 'check log')}${total.overdue || total.failed || total.due ? ` — ${[total.overdue ? `${total.overdue} overdue` : '', total.failed ? `${total.failed} failed` : '', total.due ? `${total.due} due now` : ''].filter(Boolean).join(' · ')}` : ' — every check up to date'}.`}</p>
      <ul className="pl-tools">
        {stops}
        {rows.map(s => {
          const st = statusOf(s, now);
          return (
            <li key={s.id}>
              <button type="button" className="pl-tool" data-log-row={s.id} onClick={() => nav(logHref(logOf(s).key, s.id))}>
                <b>{s.name}</b>
                <span className={'pl-tool-says ie-tone is-' + st.tone}>{st.words}</span>
                <span className="sub">{defOf(s.agreed?.log?.key)?.title ?? 'A check log'} · {plural(st.checks, 'check')}</span>
                <span className="pl-tool-go" aria-hidden>›</span>
              </button>
            </li>
          );
        })}
      </ul>
      {view && <p className="sub"><button type="button" className="linkish" onClick={() => nav(`/logs?line=${encodeURIComponent(wsId)}`)}>Every kind of check log on this line</button></p>}
    </section>
  );
}
type ReactStopsRow = React.ReactNode;

export { starterLog };
