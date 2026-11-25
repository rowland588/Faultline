/* A PROJECT'S METHOD — its sections, and the tools that fit each (docs/METHODS.md, slice M3).
 *
 * Rowland, 31 October: "the method equals the project … build the methods and we simply insert the tools where
 * required … always allowing to add whatever tool is best, there is a default." So the front page of a project that
 * runs a method is the method: its question, its sections in order, and under each section the tools that fit it by
 * default (src/lib/methods) — each said honestly (built, a mode of another tool, built into the app, not built yet),
 * each with how often it has been used in THIS project, and New on every tool that exists. A section is lit by
 * evidence — a tool used in it — never locked behind the one before. A tool that does not fit any section is added
 * with Add a tool; it starts in the project and is listed under "Also here".
 *
 * Nothing new is stored: the method is the project's `method` (M2), the uses are the project's own studies and
 * standards (the same count the project's Tools page makes), the tools are the catalogue's. */
import { useEffect, useMemo, useState } from 'react';
import { useProject } from '../../lib/useProjects';
import { usePaceLines } from '../../lib/usePaceLines';
import { useAccess } from '../../cloud/access';
import { inProject } from '../../lib/inProject';
import { nav, useRoute } from '../../state/useRoute';
import { APP_TOOLS, type AppTool } from '../../catalogue/registry';
import { kindFacts } from '../projectKind';
import { methodByKey, methodOfProject } from '../../lib/methods';
import { PageHeader, RecordRow, RecordRows } from '../../ui/parts';
import { Fold, showFold } from '../../ui/Fold';
import { PhaseActions } from './PhaseActions';
import { GuideFold, StepMeans } from '../../ui/StepGuide';
import { MethodSheet, useAnswers, useSaveAnswer } from './MethodSheet';
import { BOARD_TITLES, SHAPES } from './shapes';
import { sectionState } from '../../lib/methodSheet';
import './methodSheet.css';
import { dmaicEvidence } from './dmaicEvidence';
import { MethodDashboard } from './MethodDashboard';
import { dashboardOf, useProjectEvidence } from './useDashboard';
import { useStudyContext } from '../../ui/ShiftLosses';
import { guideOfSection } from '../../lib/methodGuide';
import { usesOf } from '../../screens/ProjectToolsScreen';
import { workInMethodSection } from './phaseWork';
import { methodToolHref } from '../../lib/methodPlacement';
import { attachMethodEvidence } from '../../db/methodEvidence';
import { howTool, openable, matchesMethodTool, toolStateWord } from './methodTools';
import { useProjectLooking } from '../../tools/gemba/useLooking';
import { projectSays, stalestFirst } from '../../tools/gemba/looking';
import { useMeasures } from '../../lib/useMeasures';
import { numbersSays } from '../../lib/measureProof';
import { useProjectSpread } from '../../tools/yokoten/useYokoten';

const savedDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const slug = (w: string) => w.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The 6M tool inside a method (S4, 1 November): its pages there are the project's own Fishbone, Board and Results, so its rows open the
 *  fishbone. Since 13 November 6M is also a tool of its own in the registry (src/tools/sixm — a 6M on a line); inside a method project its
 *  row still opens THIS project's fishbone, never the line's list of 6Ms — so it is tested before the registry's address. */
const SIXM_IDS = new Set(['FC-146', 'FC-147', 'FC-148']);
/** The team's own weekly number (FC-117 trended, FC-201 proved): the A3's Target, the Kata's challenge, the Kaizen event's 30-day check. It is kept on the project (its
 *  measures, targets and readings) and read on the project's Results — its row says what the project holds and opens it. */
const NUMBER_IDS = new Set(['FC-117', 'FC-201']);

export function MethodScreen({ projectId }: { projectId: string }) {
  const { project } = useProject(projectId);
  const can = useAccess(projectId);
  const evidence = useProjectEvidence(projectId);
  const [adding, setAdding] = useState<string | null>(null);
  /* uses in this project, by tool key */
  const uses = useMemo(() => {
    const m = new Map<string, { n: number; latest?: string }>();
    if (evidence) for (const t of APP_TOOLS) { const u = usesOf(t, evidence.studies, evidence.standards); m.set(t.key, { n: u.n ?? 0, latest: u.latest }); }
    return m;
  }, [evidence]);
  /* FC-199, how fresh the looking is: the project's lines, read for the Gemba walk row (tools/gemba) */
  const looking = useProjectLooking(projectId);
  const nums = useMeasures(projectId);
  /* FC-155, a proved fix offered to every line with the same machine: the project's lines, read for its row (tools/yokoten) */
  const spread = useProjectSpread(projectId);
  const method = project ? methodByKey(methodOfProject(project)) : undefined;
  const { answers, items, ready } = useAnswers(projectId, method?.key ?? 'pdca');
  const { query } = useRoute();
  const { lines } = usePaceLines(projectId);
  const selectedLine = lines.find(line => line.projectId === projectId && line.workspaceId && line.workspaceId === query.get('line'));
  const worksheetRow = query.get('worksheetRow');
  const phase = worksheetRow ? null : query.get('phase');
  const sourceField = query.get('finding');
  useEffect(() => {
    if (!ready || !method) return;
    if (worksheetRow) { showFold(`method-review-${method.key}`); return; }
    if (phase && method.sections.some(s => s.name === phase)) {
      showFold(`method-sec-${method.key}-${slug(phase)}`);
    }
  }, [ready, method, phase, worksheetRow]);
  const saveAnswer = useSaveAnswer(projectId, method?.key ?? 'pdca', items);
  const studyCtx = useStudyContext(evidence?.studies ?? []);
  if (!project) return <p className="sub wrap">That project is not on this device.</p>;
  if (!method) return <div className="wrap"><p>This project has no saved improvement method.</p><a href={`#/project/${projectId}`}>Open project</a></div>;
  if (!ready || !evidence) return <div className="wrap" aria-busy="true"><PageHeader title={method.name} says={project.name} /><p role="status">Loading project work…</p></div>;

  const context = { ...studyCtx, standards: evidence.standards };
  const dash = dashboardOf(method, answers, evidence.studies, evidence.owed, context);
  const workFor = (section: string) => workInMethodSection(method, section, evidence.owed, evidence.studies, evidence.standards);
  const Board = SHAPES[method.key]?.Board;
  const saved = [
    ...dash.findings.map(f => ({ kind: 'study' as const, id: f.id, title: f.title, href: f.href, phase: f.section,
      detail: f.says, tool: f.tool, at: f.at })),
    ...dash.standards.map(st => ({ kind: 'standard' as const, id: st.id, title: st.title, href: st.href, phase: st.section,
      detail: undefined, tool: st.tool, at: evidence.standards.find(row => row.id === st.id)?.updatedAt })),
  ];
  const otherEvidence = saved.filter(record => !method.sections.some(section => section.name === record.phase));
  const recordRow = (record: typeof saved[number]) => <RecordRow key={record.kind + record.id} what={record.title}
    where={[record.tool, record.at && 'Updated ' + savedDate.format(record.at)].filter(Boolean).join(' · ')}
    says={record.detail} onOpen={() => nav(record.href)} />;
  const placed = new Set(method.sections.flatMap(s => s.tools.map(id => openable(howTool(id))?.key).filter(Boolean) as string[]));
  const also = APP_TOOLS.filter(t => !placed.has(t.key) && (uses.get(t.key)?.n ?? 0) > 0);
  const total = saved.length;
  const special = (id: string) => SIXM_IDS.has(id) ? `/project/${projectId}/fishbone${selectedLine ? '?line=' + encodeURIComponent(selectedLine.id) : ''}` : NUMBER_IDS.has(id) ? `/project/${projectId}?view=data` : id === 'FC-194' ? `/project/${projectId}/actions` : id === 'FC-154' ? methodToolHref('/snags', projectId, undefined, false, selectedLine?.workspaceId) : undefined;
  const start = (t: AppTool, section?: string) => nav(special(t.id) ?? methodToolHref(t.to, projectId, section ? { method: method.key, section } : undefined, t.key !== 'talk', selectedLine?.workspaceId));
  const startId = (id: string, section?: string) => {
    const href = special(id);
    if (href) { nav(href); return; }
    const t = openable(howTool(id));
    if (t) start(t, section);
  };

  return (
    <div className="wrap pmethod">
      <PageHeader
        eyebrow={`${method.name.toUpperCase()} · ${project.name.toUpperCase()}`}
        title={method.name}
        says={`${method.question}${evidence && total ? ` ${plural(total, 'saved record')}.` : ''}`}
        primary={{ label: 'Project report', run: () => nav(method.key === 'stage-gate' ? kindFacts(project).reportTo(projectId) : `/project/${projectId}/method-report`) }}
        more={can.remove ? [{ label: 'Delete this project…', danger: true, run: () => nav(`/project/${projectId}/setup?delete=1`) }] : []}
      />
      {project.programKey === 'line-recovery' && <p className="pmethod-recovery"><a className="btn" href={`#/project/${projectId}/recovery`}>Back to line recovery</a></p>}
      {method.key === 'stage-gate'
        ? <p><a href={`#/project/${projectId}`}>View installation progress</a></p>
        : <MethodDashboard dash={dash} methodKey={method.key} />}
      {method.key !== 'stage-gate' && <Fold id={`method-review-${method.key}`} title={BOARD_TITLES[method.key]}
        start={false} need={SHAPES[method.key]?.sectionBoxes === 'none'}>
        {Board && <Board projectId={projectId} method={method.key} workFor={workFor} sections={dash.sections}
          answers={answers} items={items} canEdit={can.edit} ready={ready} save={saveAnswer} onTool={startId}
          dmaicRecords={method.key === 'dmaic' ? dmaicEvidence(projectId, evidence.owed, evidence.studies, context) : undefined} />}
      </Fold>}
      {method.sections.map((s, i) => {
        const placedHere = saved.filter(r => r.phase === s.name);
        const lit = placedHere.length;
        /* The overview starts with phase summaries. The current phase opens from Work on,
           or from its own row; a saved choice to keep a phase open still wins on this device. */
        const here = method.key !== 'stage-gate' && !!dash.sections[i]?.here;
        const st = sectionState(method.key, s.name, answers);
        const names = s.tools.map(id => { const h = howTool(id); return (h.how === 'unknown' ? id : h.entry.name).split(' — ')[0]; });
        const foldSays = [
          here ? 'Suggested next' : '',
          dash.sections[i]?.progress,
          st.fields ? `${st.written} of ${st.fields} questions written` : '',
          lit ? `${plural(lit, 'record')} used` : '',
          names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2} more` : '') : '',
        ].filter(Boolean).join(' · ');
        return (
          <section key={s.name} className={'part-sec pmethod-sec' + (here ? ' is-here' : '')} aria-label={s.name}>
            <Fold key={ready ? 'read' : 'reading'} id={`method-sec-${method.key}-${slug(s.name)}`} start={false}
              title={<span className="pace-sec-title">{i + 1}. {s.name}</span>}
              says={foldSays}>
            <div className="pace-sec-head">
              <p className="pace-sec-sub">{s.what}{st.fields ? ` · ${st.written} of ${st.fields} questions written` : ''}{lit ? ` · ${plural(lit, 'record')} here` : ''}</p>
              {s.note && <p className="chip-hint">{s.note}</p>}
              {(() => { const g = guideOfSection(method.key, s.name); return g ? <GuideFold summary="What this step means"><StepMeans means={g.means} doThis={g.doThis} youGet={g.youGet} /></GuideFold> : null; })()}
            </div>
            {SHAPES[method.key]?.sectionBoxes !== 'none' && <MethodSheet projectId={projectId} method={method.key} section={s.name} answers={answers} items={items} canEdit={can.edit}
              onTool={id => startId(id, s.name)} />}
            <PhaseActions key={phase === s.name ? sourceField : undefined} sourceField={phase === s.name ? sourceField : undefined} projectId={projectId} method={method} section={s.name} answers={answers} canEdit={can.edit} />
            {placedHere.length > 0 && <RecordRows label={`Saved work for ${s.name}`}>{placedHere.map(recordRow)}</RecordRows>}
            <RecordRows label={`Tools for ${s.name}`}>
              {s.tools.map(id => {
                const h = howTool(id);
                const t = openable(h);
                const matching = (evidence?.studies ?? []).filter(record => matchesMethodTool(id, record) && placedHere.some(r => r.kind === 'study' && r.id === record.id));
                const u = { n: matching.length };
                const name = h.how === 'unknown' ? id : h.entry.name;
                /* the Gemba walk is not a page of its own: its row says how fresh the looking is on the project's lines and opens the stalest */
                const gemba = id === 'FC-199' && looking?.length ? looking : undefined;
                const worst = gemba ? stalestFirst(gemba)[0] : undefined;
                const spreadRow = id === 'FC-155' ? spread : undefined;
                const href = worst ? `/lines/${worst.id}` : spreadRow ? `/lines/${spreadRow.lineId}` : special(id) ?? (t ? methodToolHref(t.to, projectId, { method: method.key, section: s.name }, false, selectedLine?.workspaceId) : undefined);
                return (
                  <RecordRow key={id} what={name}
                    {...(worst && worst.looking.level !== 'fresh' ? { tone: worst.looking.level === 'stale' ? 'r' as const : 'a' as const } : {})}
                    says={gemba ? projectSays(gemba) : spreadRow ? spreadRow.says : NUMBER_IDS.has(id) ? (nums.loading ? undefined : numbersSays(nums.measures, nums.readings)) : u?.n ? `${plural(u.n, 'use')} in this project` : undefined}
                    where={toolStateWord(h)}
                    onOpen={href ? () => nav(href) : undefined}
                    aside={t && !special(id) && can.edit && t.key !== 'talk'
                      ? <button type="button" className="btn btn-sm" aria-label={`New — ${name}`} onClick={() => startId(id, s.name)}>New</button>
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
                    {saved.some(r => r.phase !== s.name) && <label className="field">Assign a saved record to this phase
                      <select aria-label={`Assign a saved record to ${s.name}`} defaultValue="" onChange={e => {
                        const r = saved.find(row => row.kind + ':' + row.id === e.target.value);
                        if (r) void attachMethodEvidence({ projectId, method: method.key, section: s.name }, r.kind, r.id);
                        e.target.value = '';
                      }}><option value="">Choose a record…</option>{saved.filter(r => r.phase !== s.name).map(r => <option key={r.kind + r.id} value={r.kind + ':' + r.id}>{r.title}{r.phase && r.phase !== 'Project evidence' ? ` · move from ${r.phase}` : ''}</option>)}</select></label>}
                    {APP_TOOLS.map(t => (
                      <button key={t.key} type="button" className="chip" onClick={() => start(t, s.name)}>{t.label}</button>
                    ))}
                  </span>
                )}
              </p>
            )}
            </Fold>
          </section>
        );
      })}
      {otherEvidence.length > 0 && <Fold id={`method-other-evidence-${projectId}`} title="Other project evidence"
        says={plural(otherEvidence.length, 'saved record')} start={false}>
        <RecordRows label="Saved work without a phase">{otherEvidence.map(recordRow)}</RecordRows>
      </Fold>}
      {also.length > 0 && (
        <section className="part-sec pmethod-sec" aria-label="Also here">
          <Fold id="method-sec-also" start={false} title={<span className="pace-sec-title">Also here</span>}
            says={`${plural(also.length, 'tool')} the method does not list · ${also.slice(0, 2).map(t => t.label).join(', ')}${also.length > 2 ? ` +${also.length - 2} more` : ''}`}>
          <div className="pace-sec-head">
            <p className="pace-sec-sub">Tools used in this project that the method does not list.</p></div>
          <RecordRows label="Also here">
            {also.map(t => (
              <RecordRow key={t.key} what={t.label} says={`${plural(uses.get(t.key)?.n ?? 0, 'use')} in this project`}
                where={uses.get(t.key)?.latest ? `Latest: ${uses.get(t.key)?.latest}` : t.says}
                onOpen={() => nav(inProject(t.to, projectId))} />
            ))}
          </RecordRows>
          </Fold>
        </section>
      )}
    </div>
  );
}
