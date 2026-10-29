/* WHERE A STUDY SITS, AND WHAT IT IS USED FOR (docs/TOOLKIT.md, Part 0;
 * docs/BUILD.md, 2e–2f).
 *
 * Rowland, 10 October: "You use the tool, connect it to a problem, connect it
 * to a project, connect it to a fix." Four places, and it can be in all of
 * them: on its own (a quick session), on a line, on a job, and for something
 * inside that job. Each is one tap from the study:
 *   Put on a line      the line's people see it
 *   Attach to a job    the jobs on its line first; only jobs you may change
 *   Use it for…        a test it proves; a fix it shows is needed, or proves
 *   Make it better     raises a fix with this study as its evidence, the
 *                      figures already in its words — from a value stream,
 *                      from one step (its wait or its waste)
 * Work moves, evidence links: the study never moves into the job — the job's
 * records point at it, and the drawer's branch (ui/StudyLinks) reads the same
 * link from the other end. */
import { useEffect, useMemo, useState } from 'react';
import { allPaceLines, listProjectCases, onDataChange, patchStudy, putPaceTodo, putTest } from '../db';
import { onlyLineOf } from '../lib/lineRecords';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useProject } from '../lib/useProjects';
import { planModel } from '../lib/planModel';
import { useActions } from '../lib/actions';
import { causeRefOf } from '../lib/fishbone';
import type { SixM } from '../lib/sixm';
import { useProjects } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { useAccessByJob } from './JobsBoard';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { live, nextFrom, type Test } from '../lib/testing';
import { niceDay } from '../lib/weeks';
import { betterWords, worthBetter, linkOf, countermeasureFrom, recordHref, ROLE_WORD, studyMachineOf, usedForGroups, type StudyContext } from '../lib/studyLinks';
import type { StudyUse, ToolStudy } from '../lib/study';
import type { Can } from '../lib/access';
import { StudyProves } from './ProveProgram';
import { BelongsTo } from './parts';


/** THE STUDY ON PAPER (lib/studiesPdf) — on its own, on a line or on a job: what it is, where it
 *  sits, its sentence and its table (docs/AUDIT.md, bar 3). Made from the tool shell's Report ▾
 *  (docs/STRUCTURE.md §5.5, B4), where the PDF beside "where it sits" was. */
export function useStudyPaper(s: ToolStudy): () => Promise<void> {
  const { projects } = useProjects();
  const lines = useFactoryLines(s.workspaceId);
  const line = lines.find(l => l.id === s.workspaceId);
  const job = projects.find(p => p.id === s.projectId);
  const where = `${line ? `On ${line.name}` : 'On no line'} · ${job ? `attached to ${job.name}` : 'on no project'}`;
  return async () => {
    try {
      const [{ saveStudiesPdf }, { listAllStandards, listWorkspaces, listObservations, listStudiesForLine, listPaceTodos, listTests, listAllSnags }, { studyTitle }] = await Promise.all([
        import('../lib/studiesPdf'), import('../db'), import('../lib/studyLinks')]);
      const [standards, workspaces, observations] = await Promise.all([listAllStandards(), listWorkspaces(), s.workspaceId ? listObservations(s.workspaceId) : Promise.resolve([])]);
      /* a loss count prints as the lean page: its line's other counts and what was raised from it */
      /* and SMED (slice 6): what was raised from its elements, its plan and its money */
      const lean = s.tool === 'losses' || s.tool === 'changeover' || s.tool === 'capability' || s.tool === 'sampling' || s.tool === 'map' || s.tool === 'reliability' || s.tool === 'chart' || s.tool === 'analysis' || s.tool === 'calc' || s.tool === 'log' || s.tool === 'board' || s.tool === 'scored';
      const [history, actions, fixes] = await Promise.all([
        (s.tool === 'losses' || s.tool === 'board') && s.workspaceId ? listStudiesForLine(s.workspaceId) : Promise.resolve([]),
        lean && s.projectId ? listPaceTodos(s.projectId) : Promise.resolve([]),
        lean && s.projectId ? listTests(s.projectId) : Promise.resolve([]),
      ]);
      await saveStudiesPdf({ title: studyTitle(s), printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        items: [{ s, where }], standards, ctx: { observations, workspaces }, ...(s.tool === 'log' ? { snags: await listAllSnags() } : {}),
        ...(lean ? { lean: true, history, records: { actions, fixes }, ...(line ? { lineName: line.name } : {}) } : {}) }, studyTitle(s));
    } catch (e) {
      console.error('study pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    }
  };
}

export function WhereItSits({ s, can }: { s: ToolStudy; can: Can }) {
  const { projects } = useProjects();
  const accessOn = useAccessByJob(projects);
  /* the lines of Your factory, in floor order, and the line it is on (lib/useFactoryLines) */
  const lines = useFactoryLines(s.workspaceId);
  const [picking, setPicking] = useState<'line' | 'job' | null>(null);
  /* Change, pressed: the ways to move it, under the line that says where it is */
  const [changing, setChanging] = useState(false);
  const line = lines.find(l => l.id === s.workspaceId);
  const job = projects.find(p => p.id === s.projectId);
  /* The jobs on its line first; only the ones this person may change (a
     link into a job needs can.edit — the cloud refuses the rest). */
  const jobs = useMemo(() => projects.filter(p => !p.deletedAt && !p.archivedAt && accessOn(p.id).edit)
    .sort((a, b) => Number(!!s.workspaceId && b.workspaceIds.includes(s.workspaceId)) - Number(!!s.workspaceId && a.workspaceIds.includes(s.workspaceId))),
  [projects, accessOn, s.workspaceId]);
  const set = (p: Partial<ToolStudy>) => { void patchStudy(s.id, p); setPicking(null); setChanging(false); };
  /* ON A JOB, ON ITS LINE (flow audit #15): a study on no line takes the
     job's line when the job is on one — "attached to Line 2 commissioning"
     beside "On no line" was two answers to where it is. */
  const attach = async (projectId: string) => {
    const ws = s.workspaceId ? undefined : onlyLineOf(projectId, await allPaceLines());
    set({ projectId, ...(ws ? { workspaceId: ws } : {}) });
  };
  /* Off a job is the owner's (the cloud keeps it for anyone else); a quick
     session or a line's, its people's. */
  const mayLeaveJob = can.remove;

  return (
    <div className="ie-place" aria-label="Where it sits">
      {/* BELONGS TO — one control, the same on every tool (docs/STRUCTURE.md §5.5, B4): its line and
          its project, each a way to it, and Change for whoever may move it — the ways to move it come
          out under it, where they were always out before (F8: said three ways). */}
      <div className="ie-place-w">
        <BelongsTo line={line ? { name: line.name, open: () => nav(`/lines/${line.id}`) } : undefined}
          project={job ? { name: job.name, open: () => nav(`/project/${job.id}`) } : undefined}
          onChange={can.edit ? () => { setChanging(c => !c); setPicking(null); } : undefined} />
        {!line && !job && <span className="sub"> — a quick session, yours alone</span>}
      </div>
      {can.edit && changing && picking === null && (
        <span className="ie-place-acts">
          <button type="button" className="linkish" onClick={() => setPicking('line')}>{line ? 'Move to another line' : 'Put on a line'}</button>
          {!job && <button type="button" className="linkish" onClick={() => setPicking('job')}>Attach to a project</button>}
          {line && !job && <button type="button" className="linkish" onClick={() => set({ workspaceId: undefined })}>Take it off the line</button>}
          {job && mayLeaveJob && <button type="button" className="linkish" onClick={() => set({ projectId: undefined, uses: [] })}>Take it off the project</button>}
        </span>
      )}
      {picking === 'line' && (
        <select className="text-input ie-pick" autoFocus defaultValue="" aria-label="Put it on which line" onChange={e => e.target.value && set({ workspaceId: e.target.value })} onBlur={() => setPicking(null)}>
          <option value="" disabled>Which line?</option>
          {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}
      {picking === 'job' && (
        <select className="text-input ie-pick" autoFocus defaultValue="" aria-label="Attach it to which project" onChange={e => { if (e.target.value) void attach(e.target.value); }} onBlur={() => setPicking(null)}>
          <option value="" disabled>Which project?</option>
          {jobs.map(p => <option key={p.id} value={p.id}>{p.name}{s.workspaceId && p.workspaceIds.includes(s.workspaceId) ? ' — on this line' : ''}</option>)}
        </select>
      )}
      {/* the program it shows proved (flow audit #21) — a branch off the study */}
      <StudyProves s={s} />
    </div>
  );
}

/** The pick-list's headings, in the order the work runs. */
const GROUPS: [StudyUse['kind'], string][] = [['cause', 'Causes on the fishbone'], ['action', 'Countermeasures on the board'], ['test', 'Tests'], ['fix', 'Fixes']];

/** One record inside its job a study can be used for, and how. */
interface Target { k: StudyUse['kind']; ref: string; title: string; roles: StudyUse['role'][]; bone?: SixM; lineId?: string;
  /** A stage-gate test's or fix's machine — the pick-list groups by it. */
  machine?: string;
  /** What tells it from another of the same name on the same machine — the
   *  products it runs and its day ("Performance run at the agreed rate" was
   *  twice on the flow wrapper: the first try and its re-test). */
  apart?: string;
  /** Shown when linked, but not offered for a new link: a closed problem's cause, a ruled-out one. */
  past?: boolean }

/** A running line's causes on its fishbones, kept current: "<caseId>:<causeId>".
 *  One on a closed problem, or ruled out, is past: its link still shows. */
function useJobCauses(projectId: string, lineWs: string[]): Target[] {
  const [list, setList] = useState<Target[]>([]);
  const key = lineWs.join('|');
  useEffect(() => {
    if (!projectId) return;
    const load = () => void listProjectCases(projectId, key ? key.split('|') : []).then(cases => setList(cases.flatMap(c =>
      (c.causes ?? []).map(x => ({ k: 'cause' as const, ref: causeRefOf(c.id, x.id), title: `${x.text} — ${c.title}`, roles: ['evidence' as const], bone: x.m,
        ...(c.lineId ? { lineId: c.lineId } : {}), ...(c.status !== 'open' || x.status === 'ruled_out' ? { past: true } : {}) })))));
    load();
    return onDataChange(load);
  }, [projectId, key]);
  return list;
}

/** MAKE IT BETTER, and what a study can be used for on its job — one place,
 *  so the study's Used for, a value stream step's sheet and a loss count's
 *  bar raise the same record the same way. `ctx`: what a loss count reads
 *  beside its facts — the line's stops and cost model (lib/studyLinks). */
export function useBetter(s: ToolStudy, me?: string, ctx?: StudyContext) {
  const pid = s.projectId ?? '';
  const { project } = useProject(pid);
  /* A stage-gate job's evidence serves its tests and fixes; a running line's
     (6M, lever tree) serves its causes and the countermeasures on its board. */
  const board = !!project && planModel(project) !== 'commissioning';
  const tt = useTesting(pid);
  const ax = useActions(pid);
  const causes = useJobCauses(board ? pid : '', ax.lines.flatMap(l => (l.workspaceId ? [l.workspaceId] : [])));
  const targets: Target[] = !s.projectId ? [] : board
    ? [...causes, ...ax.steps.map(a => ({ k: 'action' as const, ref: a.id, title: a.what.trim() || 'An action with no words yet',
      /* how we know it was needed, while it is still to do; proof, any time */
      roles: a.state === 'done' ? ['proof' as const] : ['evidence' as const, 'proof' as const] }))]
    : live(tt.tests).flatMap(t => {
      const k = t.kind ?? 'test';
      const roles: StudyUse['role'][] = k === 'test' ? ['proof'] : k === 'fix' ? ['evidence', 'proof'] : [];
      const products = [...new Set([...(t.runs ?? []).map(r => r.product?.trim()), t.product?.trim(), t.planned?.trim()].filter((x): x is string => !!x))];
      const day = t.ranOn ?? t.plannedFor;
      const apart = [products.join(', '), day ? niceDay(day) : '', t.fromTestId ? 're-test' : ''].filter(Boolean).join(' · ');
      return roles.length ? [{ k: k as StudyUse['kind'], ref: t.id, title: t.title, roles, ...(t.assetId ? { machine: t.assetId } : {}), ...(apart ? { apart } : {}) }] : [];
    });
  const byRef = new Map(targets.map(x => [x.ref, x]));

  /* MAKE IT BETTER — its words the study's figures (or, from a value stream,
     one step's), this study its evidence; then it opens. On a stage-gate job
     a fix on the test it proves (or on its own); on a running line a
     countermeasure on the board, on the cause the study is evidence for when
     it is one. */
  const better = async (step?: string) => {
    if (!s.projectId) return;
    const projectId = s.projectId;
    const words = betterWords(s, step, ctx), at = now();
    if (board) {
      const onCause = s.uses.find(u => u.kind === 'cause' && u.role === 'evidence' && byRef.has(u.ref));
      /* on that cause only while its problem is open — not a closed one's */
      const c = onCause && !byRef.get(onCause.ref)?.past ? byRef.get(onCause.ref) : undefined;
      const lineId = ax.lines.find(l => !!l.workspaceId && l.workspaceId === s.workspaceId)?.id ?? c?.lineId;
      const row = countermeasureFrom(s, { id: uid(), at, ...(lineId ? { lineId } : {}), ...(c ? { causeRef: c.ref } : {}), ...(c?.bone && !step ? { bone: c.bone } : {}), ...(step ? { step } : {}) }, ctx);
      await putPaceTodo(row);
      await patchStudy(s.id, cur => ({ uses: [...cur.uses, linkOf('action', row.id, 'evidence', at, me, uid(), step)] }));
      nav(recordHref(projectId, { kind: 'action', ref: row.id }));
      return;
    }
    const tests = new Map(live(tt.tests).map(x => [x.id, x]));
    const proved = s.uses.find(u => u.kind === 'test' && u.role === 'proof' && tests.has(u.ref));
    const parent = proved ? tests.get(proved.ref) : undefined;
    const fix: Test = parent ? nextFrom(parent, uid, at, words, 'fix', words)
      : { id: uid(), projectId, kind: 'fix', title: words, passesIf: words, ...(s.assetId ? { assetId: s.assetId } : {}), outcome: 'planned', sort: at, createdAt: at, updatedAt: at };
    await putTest(fix);
    await patchStudy(s.id, cur => ({ uses: [...cur.uses, linkOf('fix', fix.id, 'evidence', at, me, uid(), step)] }));
    nav(recordHref(projectId, { kind: 'fix', ref: fix.id }));
  };
  /* the records themselves — for the action plan's owner and day (lib/ie/lossLean raisedFrom) */
  return { board, targets, byRef, better, assets: tt.assets, steps: ax.steps, tests: tt.tests };
}

export function UsedFor({ s, can, me }: { s: ToolStudy; can: Can; me?: string }) {
  const { board, targets, byRef, better, assets } = useBetter(s, me);
  const [picking, setPicking] = useState(false);
  if (!s.projectId) return null;
  const projectId = s.projectId;
  const uses = s.uses.filter(u => byRef.has(u.ref));
  /* What it could be used for — not what it is already linked to that way. */
  const options = targets.filter(x => !x.past).flatMap(x => x.roles.filter(r => !s.uses.some(u => u.ref === x.ref && u.role === r)).map(r => ({ x, r })));
  const link = (v: string) => {
    const o = options.find(y => `${y.x.ref}|${y.r}` === v);
    if (!o) return;
    void patchStudy(s.id, cur => ({ uses: [...cur.uses, linkOf(o.x.k, o.x.ref, o.r, now(), me, uid())] }));
    setPicking(false);
  };
  const unlink = (id: string) => void patchStudy(s.id, cur => ({ uses: cur.uses.filter(u => u.id !== id) }));

  return (
    <div className="ie-used">
      <small className="ie-h">Used for</small>
      {uses.length === 0 && <p className="sub">{board ? 'Nothing on the project yet — use it for a cause it shows, or a countermeasure on the board.' : 'Nothing on the project yet — use it for a test it proves, or a fix.'}</p>}
      <ul className="ie-uses">
        {uses.map(u => (
          <li key={u.id}>
            <span className="sub">{ROLE_WORD[`${u.kind}:${u.role}`] ?? u.role}:</span>{' '}
            <button type="button" className="linkish" onClick={() => nav(recordHref(projectId, u))}>{byRef.get(u.ref)?.title}</button>
            {can.edit && <button type="button" className="linkish ie-unlink" onClick={() => unlink(u.id)} aria-label="Unlink">Unlink</button>}
          </li>
        ))}
      </ul>
      {can.edit && (
        <div className="ie-used-acts">
          {!picking && options.length > 0 && <button type="button" className="btn" onClick={() => setPicking(true)}>Use it for…</button>}
          {picking && (
            <select className="text-input ie-pick" autoFocus defaultValue="" aria-label="Use it for" onChange={e => link(e.target.value)} onBlur={() => setPicking(false)}>
              <option value="" disabled>Use it for…</option>
              {/* A running line's: its causes, then its countermeasures. A
                  stage-gate job's: machine by machine, the study's own
                  first and named (lib/studyLinks usedForGroups). */}
              {(board
                ? GROUPS.map(([k, label]) => ({ label, items: options.filter(o => o.x.k === k) }))
                : usedForGroups(options.map(o => ({ ...o, machine: o.x.machine, kind: o.x.k })), assets, studyMachineOf(s, assets))
              ).map(g => g.items.length ? (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map(o => {
                    /* two of one name under one machine are told apart */
                    const twin = o.x.apart && g.items.some(y => y !== o && y.r === o.r && y.x.title.trim() === o.x.title.trim());
                    return <option key={`${o.x.ref}|${o.r}`} value={`${o.x.ref}|${o.r}`}>{ROLE_WORD[`${o.x.k}:${o.r}`]}: {o.x.title}{twin ? ` — ${o.x.apart}` : ''}</option>;
                  })}
                </optgroup>
              ) : null)}
            </select>
          )}
          {worthBetter(s) && <button type="button" className="btn btn-primary" onClick={() => void better()}>{board ? 'Make it better — a countermeasure' : 'Make it better — raise a fix'}</button>}
        </div>
      )}
    </div>
  );
}
