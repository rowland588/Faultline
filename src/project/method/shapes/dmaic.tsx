/* DMAIC'S BOARD (docs/METHODS.md §16; ISO 13053-1) — the five phases as a gate strip with a review (who, when, what it decided) per
 * phase, the charter at Define, and under each phase what the project's own tools already say. It reads and writes the same answers
 * as the questions under each section (the reviews are answers `rv_<phase>_…`); a tool is offered, never required; a client reads and
 * writes nothing. The model is shapes/dmaicModel — the Charter paper reads the same one. */
import { useEffect, useState } from 'react';
import { listStudies, onDataChange } from '../../../db';
import { inProject } from '../../../lib/inProject';
import { nav } from '../../../state/useRoute';
import { toolByKey } from '../../../catalogue/registry';
import type { ToolStudy } from '../../../lib/study';
import type { Shape, ShapeProps } from './index';
import { RESULTS, charterOf, currentGate, dayWords, gatesOf, gatesSay, insertionsOf, reviewId, waitingOn, type Gate, type Insertion } from './dmaicModel';
import './dmaic.css';

function Review({ g, answers, save, canEdit }: { g: Gate; answers: Record<string, string>; save: ShapeProps['save']; canEdit: boolean }) {
  const r = g.review, id = (p: 'who' | 'when' | 'result' | 'note') => reviewId(g.key, p);
  if (!canEdit) {
    return <p className="dm-card-sub">{r.who || r.when || r.result
      ? `Review: ${RESULTS.find(z => z.k === r.result)?.word ?? 'booked'}${r.who ? ` — ${r.who}` : ''}${r.when ? `, ${dayWords(r.when)}` : ''}.${r.note ? ` ${r.note}` : ''}`
      : 'No review held or booked yet.'}</p>;
  }
  return (
    <div className="dm-review" role="group" aria-label={`${g.name} review`}>
      <label>Reviewed by
        <input className="text-input" defaultValue={answers[id('who')] ?? ''} key={answers[id('who')] ?? ''} aria-label={`${g.name} review — who`} onBlur={e => save(id('who'), e.target.value.trim())} />
      </label>
      <label>Review date
        <input className="text-input" type="date" defaultValue={answers[id('when')] ?? ''} key={answers[id('when')] ?? ''} aria-label={`${g.name} review — when`} onChange={e => save(id('when'), e.target.value)} />
      </label>
      <div className="dm-wide dm-results" role="group" aria-label={`${g.name} review — what it decided`}>
        {RESULTS.map(z => (
          <button key={z.k} type="button" className={'chip' + (r.result === z.k ? ' on' : '')} aria-pressed={r.result === z.k} onClick={() => save(id('result'), r.result === z.k ? '' : z.k)}>{z.word}</button>
        ))}
      </div>
      <label className="dm-wide">What it decided, and any conditions
        <textarea className="text-input" rows={2} defaultValue={answers[id('note')] ?? ''} key={answers[id('note')] ?? ''} aria-label={`${g.name} review — note`} onBlur={e => save(id('note'), e.target.value.trim())} />
      </label>
    </div>
  );
}

function Tools({ list, projectId, canEdit, onTool }: { list: Insertion[]; projectId: string; canEdit: boolean; onTool: (fc: string) => void }) {
  if (!list.length) return null;
  return (
    <div className="dm-tools">
      {list.map(i => {
        const t = toolByKey(i.tool);
        return (
          <div key={i.id} className="dm-tool" data-insert={i.id}>
            <p><b>{i.question}</b> — {i.says ? <>{i.name}: {i.says}</> : <>{i.at ? 'no charter page in this project yet.' : `no ${i.toolName} study in this project yet.`}</>}</p>
            {i.says && t && <button type="button" className="btn btn-sm" onClick={() => nav(inProject(i.at ?? t.to, projectId))}>Open {i.toolName}</button>}
            {!i.says && canEdit && <button type="button" className="btn btn-sm" onClick={() => onTool(i.fc)}>{i.at ? 'Start the charter' : `Start ${i.toolName}`}</button>}
          </div>
        );
      })}
    </div>
  );
}

function Board({ projectId, answers, canEdit, save, onTool }: ShapeProps) {
  const [studies, setStudies] = useState<ToolStudy[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void listStudies(projectId).then(s => { if (live) setStudies(s); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  const gates = gatesOf(answers), cur = currentGate(gates), c = charterOf(answers), ins = insertionsOf(studies);
  const jump = (k: string) => document.getElementById(`dm-${k}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  return (
    <section className="dm" aria-label="DMAIC — phase gates">
      <p className="dm-says" role="status">{gatesSay(gates)}</p>
      <ol className="dm-strip" aria-label="The five phases and their reviews">
        {gates.map((g, i) => (
          <li key={g.key}>
            <button type="button" className="dm-gate" data-tone={g.tone} data-phase={g.key} aria-current={cur?.key === g.key ? 'step' : undefined} onClick={() => jump(g.key)}>
              <b>{i + 1}. {g.name}</b>
              <span className="dm-word" data-tone={g.tone}>{g.state}</span>
              <span>{g.written} of {g.fields} written{g.review.when ? ` · ${dayWords(g.review.when)}` : ''}</span>
            </button>
          </li>
        ))}
      </ol>
      {gates.map(g => {
        const wait = waitingOn(gates, g.key);
        return (
          <article key={g.key} id={`dm-${g.key}`} className="dm-card" aria-label={g.key === 'define' ? 'Charter and Define review' : `${g.name} review`}>
            <h3>{g.key === 'define' ? 'Charter' : g.name} — <span className="dm-word" data-tone={g.tone}>{g.state}</span></h3>
            <p className="dm-card-sub">{g.asks}{wait ? ` ${wait}` : ''}</p>
            {g.key === 'define' && (
              <>
                <p className="dm-card-sub">{c.says} The questions are answered under Define below.</p>
                <dl className="dm-charter">
                  {c.rows.map(r => (
                    <div key={r.id}><dt>{r.label}</dt><dd className={r.value ? '' : 'is-empty'}>{r.value || 'Not written yet.'}</dd></div>
                  ))}
                </dl>
              </>
            )}
            <Tools list={ins.filter(i => i.phase === g.key)} projectId={projectId} canEdit={canEdit} onTool={onTool} />
            <Review g={g} answers={answers} save={save} canEdit={canEdit} />
          </article>
        );
      })}
    </section>
  );
}

export const DMAIC_SHAPE: Shape = { Board, sectionBoxes: 'default' };
