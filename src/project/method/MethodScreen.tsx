/* A PROJECT'S METHOD — its sections, and the tools that fit each (docs/METHODS.md, slice M3).
 *
 * Rowland, 31 October: "the method equals the project … build the methods and we simply insert the tools where
 * required … always allowing to add whatever tool is best, there is a default." So the front page of a project that
 * runs a method is the method: its question, its sections in order, and under each section the tools that fit it by
 * default (src/lib/methods) — each said honestly (built, a mode of another tool, built into the app, not built yet),
 * each with how often it has been used in THIS project, and New on every tool that exists. A section is lit by
 * evidence — a tool used in it — never locked behind the one before. A tool that does not fit any section is added
 * with Add a tool; it starts in the project and is listed under "Also used here".
 *
 * Nothing new is stored: the method is the project's `method` (M2), the uses are the project's own studies and
 * standards (the same count the project's Tools page makes), the tools are the catalogue's. */
import { useEffect, useMemo, useState } from 'react';
import { listStandards, listStudies, onDataChange } from '../../db';
import { useProject } from '../../lib/useProjects';
import { useAccess } from '../../cloud/access';
import { inProject } from '../../lib/inProject';
import { nav } from '../../state/useRoute';
import { APP_TOOLS, type AppTool } from '../../catalogue/registry';
import { methodByKey, methodOfProject, type MethodSection } from '../../lib/methods';
import type { ToolStudy } from '../../lib/study';
import type { Standard } from '../../tools/linestandard/standard';
import { PageHeader, RecordRow, RecordRows } from '../../ui/parts';
import { GuideFold, StepMeans } from '../../ui/StepGuide';
import { MethodSheet, useAnswers, useSaveAnswer } from './MethodSheet';
import { SHAPES } from './shapes';
import { PAPERS } from './papers';
import { sectionState } from '../../lib/methodSheet';
import './methodSheet.css';
import { MethodDashboard } from './MethodDashboard';
import { dashboardOf, useProjectEvidence } from './useDashboard';
import { printMethodReport } from './MethodReportScreen';
import { useStudyContext } from '../../ui/ShiftLosses';
import { guideOfSection } from '../../lib/methodGuide';
import { usesOf } from '../../screens/ProjectToolsScreen';
import { howTool, openable, toolStateWord } from './methodTools';
import { useProjectLooking } from '../../tools/gemba/useLooking';
import { projectSays, stalestFirst } from '../../tools/gemba/looking';
import { useMeasures } from '../../lib/useMeasures';
import { numbersSays } from '../../lib/measureProof';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** The 6M tool inside a method (S4, 1 November): it has no page of its own in the catalogue's registry — its pages are the project's Fishbone, Board and Results — so its rows open the fishbone. */
const SIXM_IDS = new Set(['FC-146', 'FC-147', 'FC-148']);
/** The team's own weekly number (FC-117 trended, FC-201 proved): the A3's Target, the Kata's challenge, the Kaizen event's 30-day check. It is kept on the project (its
 *  measures, targets and readings) and read on the project's Results — its row says what the project holds and opens it. */
const NUMBER_IDS = new Set(['FC-117', 'FC-201']);

export function MethodScreen({ projectId }: { projectId: string }) {
  const { project } = useProject(projectId);
  const can = useAccess(projectId);
  const [got, setGot] = useState<{ studies: ToolStudy[]; standards: Standard[] } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void Promise.all([listStudies(projectId), listStandards(projectId)])
      .then(([studies, standards]) => { if (live) setGot({ studies, standards }); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  /* uses in this project, by tool key */
  const uses = useMemo(() => {
    const m = new Map<string, { n: number; latest?: string }>();
    if (got) for (const t of APP_TOOLS) { const u = usesOf(t, got.studies, got.standards); m.set(t.key, { n: u.n ?? 0, latest: u.latest }); }
    return m;
  }, [got]);
  /* FC-199, how fresh the looking is: the project's lines, read for the Gemba walk row (tools/gemba) */
  const looking = useProjectLooking(projectId);
  const nums = useMeasures(projectId);
  const method = project ? methodByKey(methodOfProject(project) ?? 'pdca') : undefined;
  const { answers, items } = useAnswers(projectId, method?.key ?? 'pdca');
  const saveAnswer = useSaveAnswer(projectId, method?.key ?? 'pdca', items);
  const evidence = useProjectEvidence(projectId);
  const studyCtx = useStudyContext(evidence?.studies ?? []);
  if (!project || !method) return <p className="sub wrap">That project is not on this device.</p>;

  const dash = dashboardOf(method, answers, evidence?.studies ?? [], evidence?.owed ?? [], studyCtx);
  /* a calculator's row counts its own calculations (/calc/<key>), not every calculator in the project */
  const usesOf2 = (t: AppTool): { n: number; latest?: string } | undefined => (/^\/calc\/./.test(t.to)
    ? { n: (got?.studies ?? []).filter(x => x.tool === 'calc' && x.agreed?.calc?.key === t.to.slice(6)).length }
    : /^\/log\/./.test(t.to)   /* a check log's kind counts its own logs, not every check log in the project */
      ? { n: (got?.studies ?? []).filter(x => !x.deletedAt && x.tool === 'log' && x.agreed?.log?.key === t.to.split('/')[2]?.split('?')[0]).length }
      : uses.get(t.key));
  const usedIn = (s: MethodSection) => {
    const keys = new Set<string>();
    for (const id of s.tools) { const t = openable(howTool(id)); if (t && (usesOf2(t)?.n ?? 0) > 0) keys.add(`${t.key}${t.to}`); }
    return keys.size;
  };
  const placed = new Set(method.sections.flatMap(s => s.tools.map(id => openable(howTool(id))?.key).filter(Boolean) as string[]));
  const also = APP_TOOLS.filter(t => !placed.has(t.key) && (uses.get(t.key)?.n ?? 0) > 0);
  const total = [...uses.values()].reduce((n, u) => n + u.n, 0);
  const start = (t: AppTool) => nav(inProject(t.key === 'talk' ? t.to : `${t.to}?add=1`, projectId));

  return (
    <div className="wrap pmethod">
      <PageHeader
        eyebrow={`${method.name.toUpperCase()} · ${project.name.toUpperCase()}`}
        title={method.name}
        says={`${method.question} ${!got ? '' : total ? `${plural(total, 'use')} of tools in this project so far.` : 'No tool has been used yet — start with the first section.'}`}
        papers={[{ label: 'Project report', for: 'The journey, what each tool is telling us with its own figures, the money, what needs attention and what the team wrote — for the meeting.', make: () => printMethodReport(projectId) }, ...(PAPERS[method.key] ?? []).map(p => ({ label: p.label, ...(p.for ? { for: p.for } : {}), make: () => p.make(projectId) }))]}
      />
      <MethodDashboard dash={dash} projectId={projectId} />
      {(() => { const sh = SHAPES[method.key]; return sh ? <sh.Board projectId={projectId} method={method.key} answers={answers} items={items} canEdit={can.edit} save={saveAnswer} onTool={id => { const t = openable(howTool(id)); if (t) start(t); }} /> : null; })()}
      {method.sections.map((s, i) => {
        const lit = usedIn(s);
        return (
          <section key={s.name} className="part-sec pmethod-sec" aria-label={s.name}>
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">{i + 1}. {s.name}</h2>
              <p className="pace-sec-sub">{s.what}{(() => { const st = sectionState(method.key, s.name, answers); return st.fields ? ` · ${st.word}: ${st.written} of ${st.fields} written` : ''; })()}{lit ? ` · ${plural(lit, 'tool')} used here` : ''}</p>
              {s.note && <p className="chip-hint">{s.note}</p>}
              {(() => { const g = guideOfSection(method.key, s.name); return g ? <GuideFold summary="What this step means"><StepMeans means={g.means} doThis={g.doThis} youGet={g.youGet} /></GuideFold> : null; })()}
            </div>
            {SHAPES[method.key]?.sectionBoxes !== 'none' && <MethodSheet projectId={projectId} method={method.key} section={s.name} answers={answers} items={items} canEdit={can.edit}
              onTool={id => { const t = openable(howTool(id)); if (t) start(t); }} />}
            <RecordRows label={`Tools for ${s.name}`}>
              {s.tools.map(id => {
                const h = howTool(id);
                const t = openable(h);
                const u = t ? usesOf2(t) : undefined;
                const name = h.how === 'unknown' ? id : h.entry.name;
                /* the Gemba walk is not a page of its own: its row says how fresh the looking is on the project's lines and opens the stalest */
                const gemba = id === 'FC-199' && looking?.length ? looking : undefined;
                const worst = gemba ? stalestFirst(gemba)[0] : undefined;
                return (
                  <RecordRow key={id} what={name}
                    {...(worst && worst.looking.level !== 'fresh' ? { tone: worst.looking.level === 'stale' ? 'r' as const : 'a' as const } : {})}
                    says={gemba ? projectSays(gemba) : NUMBER_IDS.has(id) ? (nums.loading ? undefined : numbersSays(nums.measures, nums.readings)) : u?.n ? `${plural(u.n, 'use')} in this project` : undefined}
                    where={toolStateWord(h)}
                    onOpen={() => (worst ? nav(`/lines/${worst.id}`) : t ? nav(inProject(t.to, projectId)) : SIXM_IDS.has(id) ? nav(`/project/${projectId}/fishbone`) : NUMBER_IDS.has(id) ? nav(`/project/${projectId}?view=data`) : undefined)}
                    aside={t && can.edit && t.key !== 'talk'
                      ? <button type="button" className="btn btn-sm" aria-label={`New — ${name}`} onClick={() => start(t)}>New</button>
                      : undefined} />
                );
              })}
            </RecordRows>
            {can.edit && (
              <p className="pmethod-add">
                <button type="button" className="btn btn-ghost btn-sm" aria-expanded={adding === s.name}
                  onClick={() => setAdding(a => (a === s.name ? null : s.name))}>Add a tool</button>
                {adding === s.name && (
                  <span className="pmethod-add-list">
                    {APP_TOOLS.filter(t => t.key !== 'talk').map(t => (
                      <button key={t.key} type="button" className="chip" onClick={() => start(t)}>{t.label}</button>
                    ))}
                  </span>
                )}
              </p>
            )}
          </section>
        );
      })}
      {also.length > 0 && (
        <section className="part-sec pmethod-sec" aria-label="Also used here">
          <div className="pace-sec-head"><h2 className="pace-sec-title">Also used here</h2>
            <p className="pace-sec-sub">Tools used in this project that the method does not list.</p></div>
          <RecordRows label="Also used here">
            {also.map(t => (
              <RecordRow key={t.key} what={t.label} says={`${plural(uses.get(t.key)?.n ?? 0, 'use')} in this project`}
                where={uses.get(t.key)?.latest ? `Latest: ${uses.get(t.key)?.latest}` : t.says}
                onOpen={() => nav(inProject(t.to, projectId))} />
            ))}
          </RecordRows>
        </section>
      )}
    </div>
  );
}
