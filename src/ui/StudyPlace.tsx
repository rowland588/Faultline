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
 *                      figures already in its words
 * Work moves, evidence links: the study never moves into the job — the job's
 * records point at it, and the drawer's branch (ui/StudyLinks) reads the same
 * link from the other end. */
import { useEffect, useMemo, useState } from 'react';
import { listWorkspaces, onDataChange, patchStudy, putTest } from '../db';
import { useProjects } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { useAccessByJob } from './JobsBoard';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { live, nextFrom, type Test } from '../lib/testing';
import { betterWords, worthBetter, linkOf } from '../lib/studyLinks';
import type { StudyUse, ToolStudy } from '../lib/study';
import type { Can } from '../lib/access';
import type { Workspace } from '../types';

const recordHref = (projectId: string, u: Pick<StudyUse, 'kind' | 'ref'>) =>
  `/project/${projectId}/${u.kind === 'fix' ? 'fixes' : 'testing'}?open=${encodeURIComponent(u.ref)}`;
const ROLE_WORD: Record<string, string> = { 'test:proof': 'Proves', 'fix:evidence': 'How we know it was needed', 'fix:proof': 'Proves it worked' };

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

export function UsedFor({ s, can, me }: { s: ToolStudy; can: Can; me?: string }) {
  const pid = s.projectId ?? '';
  const tt = useTesting(pid);
  const [picking, setPicking] = useState(false);
  if (!s.projectId) return null;
  const projectId = s.projectId;
  const byId = new Map(live(tt.tests).map(t => [t.id, t]));
  const uses = s.uses.filter(u => byId.has(u.ref));
  /* What it could be used for, inside its job: its tests (proof) and fixes
     (evidence or proof) — not ones it is already linked to that way. */
  const options = live(tt.tests).flatMap(t => {
    const k = t.kind ?? 'test';
    const roles: StudyUse['role'][] = k === 'test' ? ['proof'] : k === 'fix' ? ['evidence', 'proof'] : [];
    return roles.filter(r => !s.uses.some(u => u.ref === t.id && u.role === r)).map(r => ({ t, k: k as StudyUse['kind'], r }));
  });
  const link = (v: string) => {
    const o = options.find(x => `${x.t.id}|${x.r}` === v);
    if (!o) return;
    void patchStudy(s.id, cur => ({ uses: [...cur.uses, linkOf(o.k, o.t.id, o.r, now(), me, uid())] }));
    setPicking(false);
  };
  const unlink = (id: string) => void patchStudy(s.id, cur => ({ uses: cur.uses.filter(u => u.id !== id) }));

  /* MAKE IT BETTER — a fix on the test it proves (or on its own), its words
     the study's figures, this study its evidence; then the fix opens. */
  const better = async () => {
    const words = betterWords(s), at = now();
    const proved = s.uses.find(u => u.kind === 'test' && u.role === 'proof' && byId.has(u.ref));
    const parent = proved ? byId.get(proved.ref) : undefined;
    const fix: Test = parent ? nextFrom(parent, uid, at, words, 'fix', words)
      : { id: uid(), projectId, kind: 'fix', title: words, passesIf: words, ...(s.assetId ? { assetId: s.assetId } : {}), outcome: 'planned', sort: at, createdAt: at, updatedAt: at };
    await putTest(fix);
    await patchStudy(s.id, cur => ({ uses: [...cur.uses, linkOf('fix', fix.id, 'evidence', at, me, uid())] }));
    nav(recordHref(projectId, { kind: 'fix', ref: fix.id }));
  };

  return (
    <div className="ie-used">
      <small className="ie-h">Used for</small>
      {uses.length === 0 && <p className="sub">Nothing on the job yet — use it for a test it proves, or a fix.</p>}
      <ul className="ie-uses">
        {uses.map(u => (
          <li key={u.id}>
            <span className="sub">{ROLE_WORD[`${u.kind}:${u.role}`] ?? u.role}:</span>{' '}
            <button type="button" className="linkish" onClick={() => nav(recordHref(projectId, u))}>{byId.get(u.ref)?.title}</button>
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
              {options.map(o => <option key={`${o.t.id}|${o.r}`} value={`${o.t.id}|${o.r}`}>{ROLE_WORD[`${o.k}:${o.r}`]}: {o.t.title}</option>)}
            </select>
          )}
          {worthBetter(s) && <button type="button" className="btn btn-primary" onClick={() => void better()}>Make it better — raise a fix</button>}
        </div>
      )}
    </div>
  );
}
