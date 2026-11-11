/* THE KATA STORYBOARD — the improvement kata drawn as its learner's board (docs/METHODS.md §16; lib/kataBoard; Rother, Toyota Kata).
 * Left, the board's four cells (challenge, current condition, target condition, obstacles); under them the experiments record — a
 * table of as many rows as the learning takes (step, what we expect, what happened, what we learned, the day); and the coach's
 * five questions answered from the board, with the day we go and see. Tools fall in where one answers: the latest capability
 * study and control chart of THIS project under the current condition, the analysis under a result, the Gemba walk's freshness
 * under the coaching — each read-only, with a button to open or start the tool, never required. Writes the same answers the
 * default boxes would (`method:kata:<field>`, extra rows `…@<n>`). A client reads and writes nothing. */
import { useEffect, useState } from 'react';
import { listStudies, onDataChange } from '../../../db';
import { nav } from '../../../state/useRoute';
import type { ToolStudy, StudyTool } from '../../../lib/study';
import { usesOfTool } from '../../../screens/ProductionLineScreen';
import { studyLine } from '../../../lib/studyLinks';
import { fieldsOf } from '../../../lib/methodSheet';
import { ROW_FIELDS, ROW_LABELS, coaching, pulse, rowCount, rowKey } from '../../../lib/kataBoard';
import { todayISO } from '../../../lib/weeks';
import { useProjectLooking } from '../../../tools/gemba/useLooking';
import { projectSays, stalestFirst } from '../../../tools/gemba/looking';
import type { Shape, ShapeProps } from './index';
import { BoardFold } from './BoardFold';
import './kata.css';

const label = (id: string) => fieldsOf('kata', 'Understand the direction').concat(fieldsOf('kata', 'Grasp the current condition'), fieldsOf('kata', 'Establish the next target condition'), fieldsOf('kata', 'Experiment toward it')).find(x => x.id === id);

function Box({ id, p, rows = 3, q, hint }: { id: string; p: ShapeProps; rows?: number; q?: string; hint?: string }) {
  const fl = label(id.replace(/@\d+$/, ''));
  const name = q ?? fl?.label ?? id;
  const value = p.answers[id] ?? '';
  const line = !!fl?.line;
  return (
    <label className="kata-f">
      <span className="kata-q">{name}</span>
      {(hint ?? fl?.hint) && <span className="kata-hint">{hint ?? fl?.hint}</span>}
      {p.canEdit
        ? (line
          ? <input className="text-input kata-in" type={['ran', 'target_by'].includes(id.replace(/@\d+$/, '')) ? 'date' : 'text'} defaultValue={value} key={value} aria-label={name} onBlur={e => p.save(id, e.target.value.trim())} />
          : <textarea className="text-input kata-in" rows={rows} defaultValue={value} key={value} aria-label={name} onBlur={e => p.save(id, e.target.value.trim())} />)
        : <span className="kata-ro">{value || 'Not written yet.'}</span>}
    </label>
  );
}

/** A tool falling in: what the project's own latest record of it says, with a way to open or start it. */
function Fall({ tool, name, fc, studies, onTool, canEdit }: { tool: StudyTool; name: string; fc: string; studies: ToolStudy[] | null; onTool: (fc: string) => void; canEdit: boolean }) {
  if (!studies) return null;
  const mine = usesOfTool(tool, studies).sort((a, b) => b.updatedAt - a.updatedAt);
  const s = mine[0];
  return (
    <div className="kata-fall" aria-label={`${name} in this project`}>
      <p className="kata-fall-says">{s ? <><b>{name}</b> — {s.name}: {studyLine(s).text}{mine.length > 1 ? ` (latest of ${mine.length})` : ''}</> : <><b>{name}</b> — none in this project yet. Not needed to write the cell.</>}</p>
      {(s || canEdit) && <button type="button" className="btn btn-sm" onClick={() => onTool(fc)} aria-label={`${s ? 'Open' : 'Start'} ${name}`}>{s ? `Open ${name}` : `Start ${name}`}</button>}
    </div>
  );
}

/** The board's four cells and the boxes each holds, in the storyboard's order. */
const CELLS = [
  { name: 'Challenge', ids: ['challenge', 'coach'] },
  { name: 'Current condition', ids: ['measure', 'current'] },
  { name: 'Target condition', ids: ['target', 'target_by'] },
  { name: 'Obstacles', ids: ['obstacles', 'obstacle_now'] },
] as const;

function Board(p: ShapeProps) {
  const [studies, setStudies] = useState<ToolStudy[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void listStudies(p.projectId).then(r => { if (live) setStudies(r); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [p.projectId]);
  const looking = useProjectLooking(p.projectId);
  const [shown, setShown] = useState(1);
  const n = Math.max(rowCount(p.answers), shown);
  const today = todayISO();
  const pl = pulse(p.answers, today);
  const worst = looking?.length ? stalestFirst(looking)[0] : undefined;
  const firstWords = (v: string) => (v.length > 60 ? `${v.slice(0, 58)}…` : v);
  const cellState = (ids: readonly string[]) => {
    const vals = ids.map(id => (p.answers[id] ?? '').trim());
    const w = vals.filter(Boolean).length;
    return { written: w, word: w === 0 ? 'Not written' : w === ids.length ? 'Written' : 'Under way', first: firstWords(vals.find(Boolean) ?? '') };
  };
  const rowState = (r: number) => {
    const vals = ROW_FIELDS.map(f => (p.answers[rowKey(r, f)] ?? '').trim());
    const w = vals.filter(Boolean).length;
    return { word: w === 0 ? 'Not written' : w === ROW_FIELDS.length ? 'Written' : 'Under way', first: firstWords((p.answers[rowKey(r, 'learning')] ?? '').trim() || (p.answers[rowKey(r, 'step')] ?? '').trim()) };
  };
  const cellHere = CELLS.find(c => cellState(c.ids).word !== 'Written')?.name;
  const written = rowCount(p.answers);
  const coached = coaching(p.answers).filter(c => c.said.length).length;
  return (
    <section className="kata" aria-label="The Kata storyboard">
      <h2 className="kata-h">The storyboard</h2>
      <p className="kata-says">{pl.says}</p>
      {/* THE STORYBOARD, CALM (11 November, docs/DESIGN.md): the cell in hand — the first with a box not written — open; once the four
          are written the latest experiment is the step in hand. Every other cell and experiment one line, opening to all it held. */}
      <div className="kata-cells mb-steps">
        {CELLS.map((c, i) => {
          const st = cellState(c.ids);
          return (
            <div key={c.name} className="kata-cell mb-step" aria-label={c.name}>
              <BoardFold method="kata" part={c.name} here={c.name === cellHere} ready={p.ready}
                title={`${i + 1} · ${c.name}`}
                says={`${st.word} · ${st.written} of ${c.ids.length} written${c.name === cellHere ? ' · the cell in hand' : st.first ? ` · ${st.first}` : ''}`}>
                {c.ids.map(id => <Box key={id} id={id} p={p} />)}
                {c.name === 'Current condition' && <>
                  <Fall tool="capability" name="Capability study" fc="FC-094" studies={studies} onTool={p.onTool} canEdit={p.canEdit} />
                  <Fall tool="chart" name="Control chart" fc="FC-086" studies={studies} onTool={p.onTool} canEdit={p.canEdit} />
                </>}
              </BoardFold>
            </div>
          );
        })}
      </div>

      <h3 className="kata-h3">5 · Experiments — one small step at a time</h3>
      <p className="kata-hint">Write what you expect before the step; write what happened after. The next step comes from what was learned.</p>
      <ol className="kata-rows mb-steps" aria-label="Experiments">
        {Array.from({ length: n }, (_, i) => i + 1).map(r => {
          const st = rowState(r);
          const here = r === n && (cellHere === undefined || r > written);
          return (
            <li key={r} className="kata-row mb-step" aria-label={`Experiment ${r}`}>
              <BoardFold method="kata" part={`experiment-${r}`} here={here} ready={p.ready}
                title={<b className="kata-n">Experiment {r}</b>}
                says={`${st.word}${here ? ' · the step in hand' : st.first ? ` · ${st.first}` : ''}`}>
                <div className="kata-row-f">
                  {ROW_FIELDS.map(f => <Box key={f} id={rowKey(r, f)} p={p} rows={2} q={`${ROW_LABELS[f]} — experiment ${r}`} hint={r === 1 ? label(f)?.hint : undefined} />)}
                </div>
              </BoardFold>
            </li>
          );
        })}
      </ol>
      {p.canEdit && <p><button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown(n + 1)}>Add an experiment</button></p>}
      <Fall tool="analysis" name="Analysis (did it change?)" fc="FC-105" studies={studies} onTool={p.onTool} canEdit={p.canEdit} />

      <div className="kata-coaching mb-step">
        <BoardFold method="kata" part="coaching" here={false} ready={p.ready}
          title="The five coaching questions" says={`${coached} of 5 answered from the board${p.answers['see_by'] ? ` · we go and see ${p.answers['see_by']}` : ''}`}>
      <ol className="kata-coach" aria-label="The five coaching questions">
        {coaching(p.answers).map(c => (
          <li key={c.n} className="kata-coach-q">
            <b>{c.n}. {c.ask}</b>
            {c.said.length ? c.said.map((s, i) => <span key={i} className="kata-ro">{s}</span>) : <span className="kata-missing">{c.missing}</span>}
          </li>
        ))}
      </ol>
      <Box id="see_by" p={p} />
        </BoardFold>
      </div>
      {worst && looking ? (
        <div className="kata-fall" aria-label="The Gemba walk on this project’s lines">
          <p className="kata-fall-says"><b>The Gemba walk</b> — {projectSays(looking)}</p>
          <button type="button" className="btn btn-sm" onClick={() => nav(`/lines/${worst.id}`)} aria-label="Open the stalest line">Open {worst.name}</button>
        </div>
      ) : null}
    </section>
  );
}

export const KATA_SHAPE: Shape = { Board, sectionBoxes: 'none' };
