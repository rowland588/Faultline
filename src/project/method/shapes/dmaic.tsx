/* DMAIC'S BOARD (docs/METHODS.md §16; ISO 13053-1) — the five phases as a gate strip with a review (who, when, what it decided) per
 * phase, the charter at Define, and under each phase what the project's own tools already say. It reads and writes the same answers
 * as the questions under each section (the reviews are answers `rv_<phase>_…`); a tool is offered, never required; a client reads and
 * writes nothing. The model is shapes/dmaicModel — the Charter paper reads the same one. */
import { nav } from '../../../state/useRoute';
import { OTHER_DMAIC_EVIDENCE, type DmaicRecord } from '../dmaicEvidence';
import type { Shape, ShapeProps } from './index';
import { RESULTS, charterOf, currentGate, dayWords, gatesOf, gatesSay, insertionsOf, reviewId, waitingOn, type Gate, type Insertion } from './dmaicModel';
import { BoardFold } from './BoardFold';
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

function SavedRecords({ records }: { records: DmaicRecord[] }) {
  return records.map(r => <p key={r.href}><a href={'#' + r.href}>{r.label}</a> · {r.value}</p>);
}

function Tools({ list, canEdit, onTool }: { list: Insertion[]; canEdit: boolean; onTool: (fc: string) => void }) {
  if (!list.length) return null;
  return <div className="dm-tools">{list.map(i => <div key={i.id} className="dm-tool" data-insert={i.id}>
    <b>{i.question}</b>
    {i.records.map(r => <div key={r.id}><p>{r.label} · {r.value}</p>
      <button type="button" className="btn btn-sm" onClick={() => nav(r.href)}>Open {i.toolName}</button></div>)}
    {!i.records.length && canEdit && <button type="button" className="btn btn-sm" onClick={() => onTool(i.fc)}>{i.id === 'charter' ? 'Start the charter' : `Start ${i.toolName}`}</button>}
  </div>)}</div>;
}

function Board({ answers, sections, dmaicRecords = [], canEdit, save, onTool, ready }: ShapeProps) {
  const gates = gatesOf(answers), cur = currentGate(gates), c = charterOf(answers), ins = insertionsOf(dmaicRecords);
  const recommendedRecords = new Set(ins.flatMap(slot => slot.records));
  const others = dmaicRecords.filter(record => !recommendedRecords.has(record));
  return (
    <section className="dm" aria-label="DMAIC — phase gates">
      <p className="dm-says" role="status">{gatesSay(gates)}</p>
      <div className="mb-steps">
      {gates.map(g => {
        const wait = waitingOn(gates, g.key);
        const state = g.state === 'Not started' ? sections?.find(s => s.name === g.name)?.progress ?? 'No review recorded' : g.state;
        const when = g.review.when ? ` · ${g.review.result ? 'reviewed' : 'review scheduled for'} ${dayWords(g.review.when)}` : '';
        return (
          <article key={g.key} id={`dm-${g.key}`} className="dm-card mb-step" data-phase={g.key} data-review-next={cur?.key === g.key || undefined} aria-label={g.key === 'define' ? 'Charter and Define review' : `${g.name} review`}>
            {/* the phase in hand open; a phase passed or still ahead one line — its state in words — opening to all it held (docs/DESIGN.md) */}
            <BoardFold method="dmaic" part={g.key} here={cur?.key === g.key} ready={ready}
              title={g.key === 'define' ? 'Define — the charter' : g.name}
              says={<><span className="dm-word" data-tone={g.tone}>{state}</span> · {g.written} of {g.fields} written{when}{cur?.key === g.key ? ' · next review' : ''}</>}>
            <p className="dm-card-sub">{g.asks}{wait ? ` ${wait}` : ''} <b>{g.written} of {g.fields} written{when}</b></p>
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
            <Tools list={ins.filter(i => i.phase === g.key)} canEdit={canEdit} onTool={id => onTool(id, g.name)} />
            <SavedRecords records={others.filter(record => record.phase === g.name)} />
            <Review g={g} answers={answers} save={save} canEdit={canEdit} />
            </BoardFold>
          </article>
        );
      })}
      </div>
      {others.some(r => r.phase === OTHER_DMAIC_EVIDENCE) && <details><summary>{OTHER_DMAIC_EVIDENCE}</summary>
        <SavedRecords records={others.filter(record => record.phase === OTHER_DMAIC_EVIDENCE)} /></details>}
    </section>
  );
}

export const DMAIC_SHAPE: Shape = { Board, sectionBoxes: 'default' };
