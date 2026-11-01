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
  return (
    <section className="kata" aria-label="The Kata storyboard">
      <h2 className="kata-h">The storyboard</h2>
      <p className="kata-says">{pl.says}</p>
      <div className="kata-cells">
        <div className="kata-cell" aria-label="Challenge">
          <h3>1 · Challenge</h3>
          <Box id="challenge" p={p} /><Box id="coach" p={p} />
        </div>
        <div className="kata-cell" aria-label="Current condition">
          <h3>2 · Current condition</h3>
          <Box id="measure" p={p} /><Box id="current" p={p} />
          <Fall tool="capability" name="Capability study" fc="FC-094" studies={studies} onTool={p.onTool} canEdit={p.canEdit} />
          <Fall tool="chart" name="Control chart" fc="FC-086" studies={studies} onTool={p.onTool} canEdit={p.canEdit} />
        </div>
        <div className="kata-cell" aria-label="Target condition">
          <h3>3 · Target condition</h3>
          <Box id="target" p={p} /><Box id="target_by" p={p} />
        </div>
        <div className="kata-cell" aria-label="Obstacles">
          <h3>4 · Obstacles</h3>
          <Box id="obstacles" p={p} /><Box id="obstacle_now" p={p} />
        </div>
      </div>

      <h3 className="kata-h3">5 · Experiments — one small step at a time</h3>
      <p className="kata-hint">Write what you expect before the step; write what happened after. The next step comes from what was learned.</p>
      <ol className="kata-rows" aria-label="Experiments">
        {Array.from({ length: n }, (_, i) => i + 1).map(r => (
          <li key={r} className="kata-row" aria-label={`Experiment ${r}`}>
            <b className="kata-n">Experiment {r}</b>
            {ROW_FIELDS.map(f => <Box key={f} id={rowKey(r, f)} p={p} rows={2} q={`${ROW_LABELS[f]} — experiment ${r}`} hint={r === 1 ? label(f)?.hint : undefined} />)}
          </li>
        ))}
      </ol>
      {p.canEdit && <p><button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown(n + 1)}>Add an experiment</button></p>}
      <Fall tool="analysis" name="Analysis (did it change?)" fc="FC-105" studies={studies} onTool={p.onTool} canEdit={p.canEdit} />

      <h3 className="kata-h3">The five coaching questions</h3>
      <ol className="kata-coach" aria-label="The five coaching questions">
        {coaching(p.answers).map(c => (
          <li key={c.n} className="kata-coach-q">
            <b>{c.n}. {c.ask}</b>
            {c.said.length ? c.said.map((s, i) => <span key={i} className="kata-ro">{s}</span>) : <span className="kata-missing">{c.missing}</span>}
          </li>
        ))}
      </ol>
      <Box id="see_by" p={p} />
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
