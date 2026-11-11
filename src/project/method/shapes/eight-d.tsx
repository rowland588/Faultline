/* THE 8D BOARD — D0 to D8 as the report form (docs/METHODS.md §16). Drawn at the top of the project's 8D page: each discipline
 * with its state in words (lib/eightD), D2's is / is-not side by side, the corrective actions as a list (who, by when, done), and
 * at the questions a tool answers, what the project's own record of that tool says, read-only, with a button to open it —
 * never required. The long answers stay as boxes under each section; this board keeps the structured parts. A client reads. */
import { useEffect, useState } from 'react';
import type { Shape, ShapeProps } from './index';
import { DISCIPLINES, ISNOT_ROWS, actionRows, allStates, closingLine, isId, isnotId, nextActionN } from '../../../lib/eightD';
import { listStudies, onDataChange } from '../../../db';
import type { ToolStudy } from '../../../lib/study';
import { toolByKey } from '../../../catalogue/registry';
import { usesOfTool } from '../../../screens/ProductionLineScreen';
import { openFold } from '../../../ui/Fold';
import { BoardFold, boardFoldId } from './BoardFold';
import './eight-d.css';

function Box({ id, label, value, canEdit, save, rows = 2 }: { id: string; label: string; value: string; canEdit: boolean; save: (f: string, w: string) => void; rows?: number }) {
  return canEdit
    ? <textarea className="text-input e8-in" rows={rows} defaultValue={value} key={value} aria-label={label} onBlur={e => save(id, e.target.value.trim())} />
    : <span className="e8-ro" aria-label={label}>{value || 'Not written yet.'}</span>;
}

function Line({ id, label, value, placeholder, empty, canEdit, save }: { id: string; label: string; value: string; placeholder: string; empty: string; canEdit: boolean; save: (f: string, w: string) => void }) {
  return canEdit
    ? <input key={value} className="text-input e8-in" defaultValue={value} aria-label={label} placeholder={placeholder} onBlur={e => save(id, e.target.value.trim())} />
    : <span>{value || empty}</span>;
}

function useStudies(projectId: string) {
  const [s, setS] = useState<ToolStudy[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void listStudies(projectId).then(r => { if (live) setS(r); });
    load(); const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return s;
}

function Insertion({ toolKey, studies, canEdit, onTool }: { toolKey: string; studies: ToolStudy[]; canEdit: boolean; onTool: (fc: string) => void }) {
  const t = toolByKey(toolKey);
  if (!t || !t.reads || t.reads === 'standard') return null;
  const mine = usesOfTool(t.reads, studies).sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = mine[0];
  return (
    <p className="e8-in-tool sub" data-tool={t.key}>
      <span>{latest ? `${t.label} in this project: “${latest.name}”${mine.length > 1 ? ` and ${mine.length - 1} more` : ''}.` : `No ${t.label} study in this project yet — nothing waits on it.`}</span>
      <button type="button" className="chip" onClick={() => onTool(t.id)} aria-label={`${latest ? 'Open' : canEdit ? 'Start' : 'Open'} ${t.label} for this step`}>{latest ? 'Open' : 'Start'} {t.label}</button>
    </p>
  );
}

function Board({ projectId, answers, canEdit, save, onTool, ready }: ShapeProps) {
  const studies = useStudies(projectId);
  const st = allStates(answers);
  const acts = actionRows(answers);
  const [shown, setShown] = useState<string | null>(null);
  const [jumps, setJumps] = useState(0);
  /* THE FORM, CALM (11 November, docs/DESIGN.md): the discipline in hand — the first not all written — decides which part is open:
     D2's is / is not while D2 is in hand, the corrective actions while D5 or D6 is; every other part one line, opening to all it
     held. A discipline tapped on the strip opens its part, as a tap on its fold would. */
  const inHand = st.findIndex(x => x.word !== 'All written');
  const partOf = (key: string) => (key === 'D2' ? 'd2' : key === 'D5' || key === 'D6' ? 'actions' : ['D3', 'D4', 'D7'].includes(key) ? 'tools' : undefined);
  const jump = (key: string) => {
    const part = partOf(key);
    if (part) openFold(boardFoldId('eight-d', part));
    setShown(key); setJumps(j => j + 1);
    window.setTimeout(() => document.getElementById(`e8-${part === 'tools' ? 'D3' : part === 'actions' ? 'D6' : key}`)?.scrollIntoView({ block: 'nearest' }), 0);
  };
  const remount = (part: string) => (shown && partOf(shown) === part ? `${part}-${jumps}` : part);
  const toolsAt = (keys: string[]) => keys.map(k => <Insertion key={k} toolKey={k} studies={studies} canEdit={canEdit} onTool={onTool} />);
  return (
    <section className="e8" aria-label="The 8D report form">
      <div className="e8-strip" role="list" aria-label="The eight disciplines">
        {DISCIPLINES.map((d, i) => (
          <button key={d.key} type="button" role="listitem" className={`e8-d ${st[i].word === 'All written' ? 'is-done' : st[i].word === 'Under way' ? 'is-under' : ''}`} onClick={() => jump(d.key)} aria-label={`${d.key} ${d.name}: ${st[i].says}`}>
            <b>{d.key}</b><span>{st[i].word}</span>
          </button>
        ))}
      </div>
      <p className="e8-says" role="status">{closingLine(answers)}</p>

      <div className="e8-steps mb-steps">
      <div key={remount('d2')} className="e8-card mb-step" id="e8-D2" aria-label="D2 is and is not" data-open={shown === 'D2' || undefined}>
        <BoardFold method="eight-d" part="d2" here={inHand === 2} ready={ready}
          title="D2 · Describe the problem" says={`Is and is not · ${st[2].says}${inHand === 2 ? ' · the discipline in hand' : ''}`}>
        <div className="e8-isnot">
          <span className="e8-h" />
          <span className="e8-h">Is</span>
          <span className="e8-h">Is not</span>
          {ISNOT_ROWS.map(r => (
            <div key={r.k} className="e8-pair">
              <b>{r.q}</b>
              <label><span className="sub">{r.is}</span><Box id={isId(r.k)} label={`Is — ${r.q}`} value={answers[isId(r.k)] ?? ''} canEdit={canEdit} save={save} /></label>
              <label><span className="sub">{r.isnot}</span><Box id={isnotId(r.k)} label={`Is not — ${r.q}`} value={answers[isnotId(r.k)] ?? ''} canEdit={canEdit} save={save} /></label>
            </div>
          ))}
        </div>
        {toolsAt(DISCIPLINES[2].tools)}
        </BoardFold>
      </div>

      <div key={remount('actions')} className="e8-card mb-step" id="e8-D6" aria-label="D5 and D6 the actions">
        <BoardFold method="eight-d" part="actions" here={inHand === 5 || inHand === 6} ready={ready}
          title="D5–D6 · The corrective actions" says={`Who, by when, done · ${st[6].says}${inHand === 5 || inHand === 6 ? ' · the discipline in hand' : ''}`}>
        {acts.length === 0 && <p className="sub">No action is listed yet.{canEdit ? ' Add each action the permanent fix needs.' : ''}</p>}
        {acts.map(r => (
          <div key={r.n} className="e8-act" data-action={r.n}>
            <Box id={`act@${r.n}`} label={`Action ${r.n}`} value={r.what} canEdit={canEdit} save={save} />
            <Line id={`actwho@${r.n}`} label={`Action ${r.n} — who`} value={r.who} placeholder="Who" empty="No one yet" canEdit={canEdit} save={save} />
            <Line id={`actdue@${r.n}`} label={`Action ${r.n} — by when`} value={r.due} placeholder="By when, e.g. 7 Nov" empty="No day" canEdit={canEdit} save={save} />
            {canEdit
              ? <button type="button" className="btn btn-sm" aria-pressed={r.done} onClick={() => save(`actdone@${r.n}`, r.done ? '' : 'yes')}>{r.done ? 'Done ✓' : 'Open — mark done'}</button>
              : <span>{r.done ? 'Done' : 'Open'}</span>}
          </div>
        ))}
        {canEdit && <p><button type="button" className="btn btn-ghost btn-sm" onClick={() => save(`act@${nextActionN(answers)}`, 'New action')}>Add an action</button></p>}
        {toolsAt(DISCIPLINES[6].tools)}
        </BoardFold>
      </div>

      <div key={remount('tools')} className="e8-card mb-step" id="e8-D3" aria-label="Where the tools fall in">
        <BoardFold method="eight-d" part="tools" here={false} ready={ready}
          title="Tools at the questions they answer" says="D3 containment · D4 root cause · D7 prevent recurrence">
        <p className="sub">D3 containment — checks in this project:</p>{toolsAt(DISCIPLINES[3].tools)}
        <p className="sub">D4 root cause — evidence:</p>{toolsAt(DISCIPLINES[4].tools)}
        <p className="sub">D7 prevent recurrence — hold the gain:</p>{toolsAt(DISCIPLINES[7].tools)}
        </BoardFold>
      </div>
      </div>
    </section>
  );
}

export const EightDShape: Shape = { Board, sectionBoxes: 'default' };
