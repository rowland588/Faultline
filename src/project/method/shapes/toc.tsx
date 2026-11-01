/* THEORY OF CONSTRAINTS — the five focusing steps as a board, reading the line's own numbers (docs/METHODS.md §16).
 *
 * A strip of the five steps with where each stands in words, then a card a step: Goldratt's step, what the line itself says of it
 * (the constraint from Line capacity, the losses at it from the loss count, the buffer and the week's orders, the options to
 * elevate it — all read, never typed twice: shapes/tocModel), and the tool that answers it with the project's own record of it and
 * a button to open or start it. The method's questions stay as boxes under each section; a tool is offered, never required. Going
 * again is a list of passes — the constraint now, carried into the next pass. A client reads and writes nothing. */
import { useEffect, useMemo, useState } from 'react';
import { getWorkspace, listObservations, listStandards, listStudies, onDataChange } from '../../../db';
import type { Standard } from '../../../tools/linestandard/standard';
import type { ToolStudy } from '../../../lib/study';
import type { Observation, Workspace } from '../../../types';
import { toolByKey } from '../../../catalogue/registry';
import { nav } from '../../../state/useRoute';
import { inProject } from '../../../lib/inProject';
import type { ShapeProps } from './index';
import { nextPass, tocPasses, tocSteps, type TocRecords } from './tocModel';
import './toc.css';

/** The project's own records the board and the paper read (the same loader both use). */
export async function loadTocRecords(projectId: string): Promise<TocRecords> {
  const [standards, studies] = await Promise.all([listStandards(projectId), listStudies(projectId)]);
  const wsId = standards.find(s => s.capacity?.stations.length && s.workspaceId)?.workspaceId ?? studies.find(s => s.tool === 'losses' && s.workspaceId)?.workspaceId;
  const ws: Workspace | undefined = wsId ? await getWorkspace(wsId) : undefined;
  const observations: Observation[] | undefined = wsId ? await listObservations(wsId) : undefined;
  return { standards: standards as Standard[], studies: studies as ToolStudy[], ...(ws ? { ws } : {}), ...(observations ? { observations } : {}) };
}

export function useTocRecords(projectId: string): TocRecords | null {
  const [rec, setRec] = useState<TocRecords | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void loadTocRecords(projectId).then(r => { if (live) setRec(r); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return rec;
}

function TocBoard({ projectId, answers, canEdit, save, onTool }: ShapeProps) {
  const rec = useTocRecords(projectId);
  const steps = useMemo(() => (rec ? tocSteps(answers, rec) : []), [rec, answers]);
  const passes = tocPasses(answers), next = nextPass(answers);
  if (!rec) return null;
  const record = (key: 'linebalance' | 'losses', has: boolean) => {
    const t = toolByKey(key);
    if (!t) return null;
    return (
      <p className="toc-tool">
        <span className="toc-tool-says">{has ? `This project’s ${t.label} is read here.` : `No ${t.label} in this project yet.`}</span>
        <button type="button" className="btn btn-sm" aria-label={has ? `Open ${t.label}` : `Start ${t.label}`}
          onClick={() => (has || !canEdit ? nav(inProject(t.to, projectId)) : onTool(t.id))}>{has || !canEdit ? 'Open' : 'Start'}</button>
      </p>
    );
  };
  return (
    <section className="toc" aria-label="The five focusing steps">
      <h2 className="toc-h">The five focusing steps</h2>
      <p className="toc-sub">The figures come from this project’s Line capacity and loss count. Your own judgement goes in the boxes under each step.</p>
      <div className="toc-cards">
        {steps.map(s => (
          <article key={s.n} id={`toc-step-${s.n}`} className="toc-card" aria-label={`Step ${s.n} — ${s.section}`}>
            <p className="toc-step">Step {s.n} · {s.title}</p>
            <p className="toc-says">{s.says}</p>
            {s.lines.length > 0 && <ul className="toc-lines">{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
            {s.missing.map((m, i) => <p key={i} className="toc-missing"><b>Missing</b> · {m}</p>)}
            {s.tool && record(s.tool.key, s.tool.has)}
          </article>
        ))}
      </div>
      <div className="toc-passes" aria-label="Going again">
        <h3 className="toc-h3">Going again — the passes round the loop</h3>
        <ol className="toc-pass-list">
          {passes.map(p => (
            <li key={p.n} className="toc-pass"><b>Pass {p.n}</b> · the constraint {p.constraint ? <i>{p.constraint}</i> : <i>not written yet</i>}
              {p.n > 1 && canEdit
                ? <label className="toc-pass-in">Where it moved to <input className="text-input" defaultValue={p.moved} key={p.moved} aria-label={`Pass ${p.n} — where the constraint moved to`} onBlur={e => save(`moved@${p.n}`, e.target.value.trim())} /></label>
                : p.n > 1 ? <span> · moved to {p.moved || 'not written yet'}</span> : p.moved ? <span> · moved to {p.moved}</span> : null}
            </li>
          ))}
        </ol>
        {canEdit && (next
          ? <button type="button" className="btn btn-sm" onClick={() => save(`constraint@${next.n}`, next.constraint)}>Go again — start pass {next.n} at {next.constraint}</button>
          : <p className="toc-sub">Write where the constraint is now (step 5) and the next pass starts from it.</p>)}
      </div>
    </section>
  );
}

export const TOC_SHAPE = { Board: TocBoard };
