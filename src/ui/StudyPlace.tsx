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
import { listProjectCases, listWorkspaces, onDataChange, patchStudy, putPaceTodo, putTest } from '../db';
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
import { betterWords, worthBetter, linkOf, countermeasureFrom, recordHref, ROLE_WORD, type StudyContext } from '../lib/studyLinks';
import type { StudyUse, ToolStudy } from '../lib/study';
import type { Can } from '../lib/access';
import type { Workspace } from '../types';


export function WhereItSits({ s, can }: { s: ToolStudy; can: Can }) {
  const { projects } = useProjects();
  const accessOn = useAccessByJob(projects);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [picking, setPicking] = useState<'line' | 'job' | null>(null);
  useEffect(() => {
    const load = () => void listWorkspaces().then(setLines);
    load();
    return onDataChange(load);
  }, []);
  const line = lines.find(l => l.id === s.workspaceId);
  const job = projects.find(p => p.id === s.projectId);
  /* The jobs on its line first; only the ones this person may change (a
     link into a job needs can.edit — the cloud refuses the rest). */
  const jobs = useMemo(() => projects.filter(p => !p.deletedAt && !p.archivedAt && accessOn(p.id).edit)
    .sort((a, b) => Number(!!s.workspaceId && b.workspaceIds.includes(s.workspaceId)) - Number(!!s.workspaceId && a.workspaceIds.includes(s.workspaceId))),
  [projects, accessOn, s.workspaceId]);
  const set = (p: Partial<ToolStudy>) => { void patchStudy(s.id, p); setPicking(null); };
  /* Off a job is the owner's (the cloud keeps it for anyone else); a quick
     session or a line's, its people's. */
  const mayLeaveJob = can.remove;

  return (
    <div className="ie-place" aria-label="Where it sits">
      <span className="ie-place-w">
        {line ? <>On <b>{line.name}</b></> : 'On no line'}
        {' · '}
        {job ? <>attached to <b>{job.name}</b></> : 'on no job'}
        {!line && !job && <span className="sub"> — a quick session, yours alone</span>}
      </span>
      {can.edit && picking === null && (
        <span className="ie-place-acts">
          <button type="button" className="linkish" onClick={() => setPicking('line')}>{line ? 'Move to another line' : 'Put on a line'}</button>
          {!job && <button type="button" className="linkish" onClick={() => setPicking('job')}>Attach to a job</button>}
          {line && !job && <button type="button" className="linkish" onClick={() => set({ workspaceId: undefined })}>Take it off the line</button>}
          {job && mayLeaveJob && <button type="button" className="linkish" onClick={() => set({ projectId: undefined, uses: [] })}>Take it off the job</button>}
        </span>
      )}
      {picking === 'line' && (
        <select className="text-input ie-pick" autoFocus defaultValue="" aria-label="Put it on which line" onChange={e => e.target.value && set({ workspaceId: e.target.value })} onBlur={() => setPicking(null)}>
          <option value="" disabled>Which line?</option>
          {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}
      {picking === 'job' && (
        <select className="text-input ie-pick" autoFocus defaultValue="" aria-label="Attach it to which job" onChange={e => e.target.value && set({ projectId: e.target.value })} onBlur={() => setPicking(null)}>
          <option value="" disabled>Which job?</option>
          {jobs.map(p => <option key={p.id} value={p.id}>{p.name}{s.workspaceId && p.workspaceIds.includes(s.workspaceId) ? ' — on this line' : ''}</option>)}
        </select>
      )}
    </div>
  );
}

/** The pick-list's headings, in the order the work runs. */
const GROUPS: [StudyUse['kind'], string][] = [['cause', 'Causes on the fishbone'], ['action', 'Countermeasures on the board'], ['test', 'Tests'], ['fix', 'Fixes']];

/** One record inside its job a study can be used for, and how. */
interface Target { k: StudyUse['kind']; ref: string; title: string; roles: StudyUse['role'][]; bone?: SixM; lineId?: string;
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
      return roles.length ? [{ k: k as StudyUse['kind'], ref: t.id, title: t.title, roles }] : [];
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
  return { board, targets, byRef, better };
}

export function UsedFor({ s, can, me }: { s: ToolStudy; can: Can; me?: string }) {
  const { board, targets, byRef, better } = useBetter(s, me);
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
      {uses.length === 0 && <p className="sub">{board ? 'Nothing on the job yet — use it for a cause it shows, or a countermeasure on the board.' : 'Nothing on the job yet — use it for a test it proves, or a fix.'}</p>}
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
              {GROUPS.map(([k, label]) => {
                const here = options.filter(o => o.x.k === k);
                return here.length ? (
                  <optgroup key={k} label={label}>
                    {here.map(o => <option key={`${o.x.ref}|${o.r}`} value={`${o.x.ref}|${o.r}`}>{ROLE_WORD[`${o.x.k}:${o.r}`]}: {o.x.title}</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
          )}
          {worthBetter(s) && <button type="button" className="btn btn-primary" onClick={() => void better()}>{board ? 'Make it better — a countermeasure' : 'Make it better — raise a fix'}</button>}
        </div>
      )}
    </div>
  );
}
