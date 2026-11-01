/* WHAT A DOCUMENT MAY READ OF ITS WORLD — the project and the line it is on, and what the project holds (src/project/projectRead, the one
 * reader of a project). Loaded for the page and for the paper by the same function, so the two cannot read a project two ways; the
 * pure pieces are tested, the loading is not stored anywhere. A document never copies what it reads: change the problem on the
 * register and the 8D report says the new thing. */
import { getProject, getWorkspace, listCases, onDataChange } from '../../db';
import { labourPerHour } from '../../lib/cost';
import type { ToolStudy } from '../../lib/study';
import { studyHref, studySays, studyTitle } from '../../lib/studyLinks';
import { isoDay, todayISO } from '../../lib/weeks';
import { loadOwnRecords } from '../../project/projectRead';
import { SIXM } from '../../lib/sixm';
import { useEffect, useState } from 'react';
import type { DocPaperExtras } from '../../lib/report/docPaper';
import { shrinkPicture, type Picture } from '../talk/talkPictures';
import type { CtxAction, CtxCause, CtxProblem, CtxStudy, DocCtx } from './types';

const BONE = new Map(SIXM.map(b => [b.key as string, b.label]));

/** The project's records as a document reads them. */
export async function loadDocCtx(s: ToolStudy, me?: string): Promise<DocCtx> {
  const ctx: DocCtx = { today: todayISO(), ...(me ? { me } : {}) };
  const [project, line] = await Promise.all([s.projectId ? getProject(s.projectId) : Promise.resolve(undefined), s.workspaceId ? getWorkspace(s.workspaceId) : Promise.resolve(undefined)]);
  if (project) { ctx.projectName = project.name; if (project.lead) ctx.lead = project.lead; ctx.projectStarted = isoDay(project.createdAt); }
  if (line) {
    ctx.lineName = line.name;
    const l = labourPerHour(line);
    if (l > 0) ctx.labourPerHour = l;
  }
  if (!s.projectId) return ctx;
  const own = await loadOwnRecords(s.projectId);
  const lineName = (id?: string) => own.lines.find(l => l.workspaceId === id)?.name;
  ctx.problems = own.register.filter(p => !p.deletedAt && !p.archivedAt).map((p): CtxProblem => ({
    id: p.id, problem: p.problem, status: p.status, ...(p.priority ? { priority: p.priority } : {}), ...(p.owner ? { owner: p.owner } : {}),
    ...(p.raisedAt ? { raisedOn: isoDay(p.raisedAt) } : {}), ...(p.closedAt ? { closedOn: isoDay(p.closedAt) } : {}), ...(p.dueAt ? { due: isoDay(p.dueAt) } : {}), ...(p.line ? { line: p.line } : {}),
  }));
  ctx.actions = own.steps.map((a): CtxAction => ({
    id: a.id, what: a.what, who: a.who, state: a.state, ...(a.due ? { due: a.due } : {}), ...(a.doneOn ? { doneOn: a.doneOn } : {}), ...(a.why ? { why: a.why } : {}),
  }));
  ctx.studies = own.studies.filter(x => x.tool !== 'doc' && !x.deletedAt).map((x): CtxStudy => {
    let said = { text: '', verdict: '', tone: 'n' as const };
    try { const y = studySays(x); said = { text: y.text, verdict: y.verdict, tone: (y.tone === 'r' || y.tone === 'a' || y.tone === 'g' ? y.tone : 'n') as 'n' }; } catch { /* a study this build cannot say stays listed */ }
    return { id: x.id, name: x.name, tool: x.tool, title: studyTitle(x), verdict: said.verdict, tone: said.tone, says: said.text, href: studyHref(x) };
  });
  const lineIds = [...new Set(own.lines.map(l => l.workspaceId).filter((x): x is string => !!x))];
  const cases = (await Promise.all(lineIds.map(id => listCases(id)))).flat().filter(c => c.projectId === s.projectId && !c.deletedAt);
  ctx.causes = cases.flatMap(c => (c.causes ?? []).map((k): CtxCause => ({ id: k.id, bone: BONE.get(k.m) ?? k.m, text: k.text, root: !!k.root, whys: k.whys.length, ...(k.by ? { by: k.by } : {}) })));
  void lineName;
  return ctx;
}

/** The context kept current for a page: read once, and again whenever the device's records change. `null` while it is being read. */
export function useDocCtx(s: ToolStudy | null | undefined, me?: string): DocCtx | null {
  const [ctx, setCtx] = useState<DocCtx | null>(null);
  const id = s?.id, pid = s?.projectId, wid = s?.workspaceId;
  useEffect(() => {
    if (!s) return;
    let alive = true;
    const load = () => void loadDocCtx(s, me).then(c => { if (alive) setCtx(c); }).catch(() => { if (alive) setCtx({ today: todayISO(), ...(me ? { me } : {}) }); });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
    // the record's place and the reader; the boxes are not read here, so typing never reloads the project
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pid, wid, me]);
  return ctx;
}

/** What a document's paper needs besides the record: the project's records it reads and its photos made small — read before the paper is poured. */
export async function docPaperExtras(s: ToolStudy, me?: string): Promise<DocPaperExtras> {
  const ctx = await loadDocCtx(s, me);
  const pictures = new Map<string, Picture>();
  for (const p of (s.facts.docPhotos ?? []).filter(x => !x.struck)) {
    const pic = await shrinkPicture(p.blobKey, 900, 0.8);
    if (pic) pictures.set(p.blobKey, pic);
  }
  return { ctx, pictures };
}
