/* THE A3 BOARD — Toyota's one sheet, two columns (docs/METHODS.md §16; knowledge/methods/rca/a3.md). Left: how it is now —
 * background, current condition, target. Right: what is to be done — analysis, countermeasures, plan, follow-up. It reads and writes
 * the same answers as the method's boxes (lib/methodSheets/a3), from the one model the paper takes (shapes/a3Model), so the page on
 * screen and "A3 on one page" cannot part. Tools fall in at the block they answer: the project's own latest study speaks under the
 * current condition and the follow-up, and the fishbone and the Actions are one tap from the analysis and the countermeasures —
 * read only, never required. A client reads, and writes nothing. */
import { useEffect, useState } from 'react';
import { listStudies, onDataChange } from '../../../db';
import type { ToolStudy } from '../../../lib/study';
import { studyHref, studyLine, studyTitle } from '../../../lib/studyLinks';
import { APP_TOOLS } from '../../../catalogue/registry';
import { nav } from '../../../state/useRoute';
import { inProject } from '../../../lib/inProject';
import type { ShapeProps } from './index';
import { loadCauses } from './a3Causes';
import type { CauseRead } from './a3Model';
import { CM_COLUMNS, a3Sheet, cmField, cmRows, evidencePair, joinCm, type A3Block, type A3Evidence, type A3Field, type Countermeasure } from './a3Model';
import './a3.css';

/** The studies of this project, kept current. */
export function useProjectStudies(projectId: string): ToolStudy[] {
  const [got, setGot] = useState<ToolStudy[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void listStudies(projectId).then(s => { if (live) setGot(s); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return got;
}

/** What a study says — its title and its sentence, as the tool says it. */
export function evidenceOf(s: ToolStudy | undefined, studies: readonly ToolStudy[]): { ev: A3Evidence; study: ToolStudy } | undefined {
  return s ? { ev: { title: studyTitle(s), says: studyLine(s, { studies: [...studies] }).text }, study: s } : undefined;
}

function Field({ fd, canEdit, save }: { fd: A3Field; canEdit: boolean; save: (id: string, v: string) => void }) {
  return (
    <label className="a3-f">
      <span className="a3-q">{fd.label}</span>
      {canEdit
        ? (fd.line
          ? <input className="text-input a3-in" defaultValue={fd.value} key={fd.value} aria-label={fd.label} onBlur={e => save(fd.id, e.target.value.trim())} />
          : <textarea className="text-input a3-in" rows={3} defaultValue={fd.value} key={fd.value} aria-label={fd.label} onBlur={e => save(fd.id, e.target.value.trim())} />)
        : <span className="a3-ro">{fd.value || 'Not written yet.'}</span>}
    </label>
  );
}

function Countermeasures({ answers, canEdit, save, extra, addRow }: { answers: Record<string, string>; canEdit: boolean; save: (f: string, v: string) => void; extra: number; addRow: () => void }) {
  const rows = cmRows(answers);
  const shown = Math.max(rows.length, extra);
  const all = Array.from({ length: shown }, (_, i) => rows[i] ?? { n: i + 1, cm: { what: '', who: '', when: '', cause: '' } });
  const put = (n: number, cm: Countermeasure, key: keyof Countermeasure, v: string) => save(cmField(n), joinCm({ ...cm, [key]: v }));
  return (
    <div className="a3-cms" role="group" aria-label="Countermeasures">
      {all.map(({ n, cm }) => (
        <div key={`${n}:${joinCm(cm)}`} className="a3-cm" role="group" aria-label={`Countermeasure ${n}`}>
          <span className="a3-cm-n">{n}</span>
          {CM_COLUMNS.map(c => (
            <label key={c.key} className="a3-cm-f">
              <span className="a3-q">{c.label}</span>
              {canEdit
                ? <input className="text-input a3-in" defaultValue={cm[c.key]} aria-label={`${c.label} — countermeasure ${n}`} onBlur={e => put(n, cm, c.key, e.target.value.trim())} />
                : <span className="a3-ro">{cm[c.key] || '—'}</span>}
            </label>
          ))}
        </div>
      ))}
      {canEdit && <button type="button" className="btn btn-ghost btn-sm a3-add" onClick={addRow}>Add a countermeasure</button>}
    </div>
  );
}

export function A3Board({ projectId, answers, canEdit, save, onTool }: ShapeProps) {
  const studies = useProjectStudies(projectId);
  const [extra, setExtra] = useState(0);
  const [causes, setCauses] = useState<CauseRead[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void loadCauses(projectId).then(c => { if (live) setCauses(c); }).catch(() => undefined);
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  const pair = evidencePair(studies);
  const cur = evidenceOf(pair.current, studies), fol = evidenceOf(pair.followup, studies);
  const sheet = a3Sheet(answers, { ...(cur ? { current: cur.ev } : {}), ...(fol ? { followup: fol.ev } : {}), causes });
  const open = (s: ToolStudy) => nav(inProject(studyHref(s), projectId));
  const toolId = (key: string) => APP_TOOLS.find(t => t.key === key)?.id;
  const header = (id: string, label: string) => ({ id, label, hint: '', line: true, value: (answers[id] ?? '').trim() });

  const evidence = (b: A3Block) => {
    const e = b.n === 2 ? cur : b.n === 7 ? fol : undefined;
    const startKey = b.n === 2 ? 'capability' : 'analysis';
    const sid = toolId(startKey);
    return (
      <div className="a3-ev" aria-label={`${b.title} — what the project’s tools say`}>
        {e
          ? <>
              <p className="a3-ev-t">{e.ev.title}</p>
              <p className="a3-ev-s">{e.ev.says}</p>
              <button type="button" className="btn btn-ghost btn-sm" aria-label={`Open ${e.ev.title}`} onClick={() => open(e.study)}>Open it</button>
            </>
          : <>
              <p className="a3-ev-s">{b.n === 2 ? 'No study of the number in this project yet — the number can be written without one.' : 'No before-and-after in this project yet — the follow-up can be written without one.'}</p>
              {canEdit && sid && <button type="button" className="chip" aria-label={`Use ${startKey === 'capability' ? 'Capability' : 'Analysis'} for ${b.title}`} onClick={() => onTool(sid)}>{b.n === 2 ? 'Start a capability study' : 'Start a before-and-after'}</button>}
            </>}
      </div>
    );
  };
  const doorTo = (label: string, to: string) => <button type="button" className="btn btn-ghost btn-sm a3-door" onClick={() => nav(to)}>{label}</button>;

  const block = (b: A3Block) => (
    <section key={b.n} className="a3-blk" aria-label={`${b.n}. ${b.title}`}>
      <h3 className="a3-h"><span className="a3-n">{b.n}</span> {b.title}</h3>
      <p className="a3-asks">{b.asks}</p>
      {b.list
        ? <Countermeasures answers={answers} canEdit={canEdit} save={save} extra={extra} addRow={() => setExtra(Math.max(extra, cmRows(answers).length) + 1)} />
        : b.fields.map(fd => <Field key={fd.id} fd={fd} canEdit={canEdit} save={save} />)}
      {(b.n === 2 || b.n === 7) && evidence(b)}
      {b.n === 4 && b.evidence && <div className="a3-ev" aria-label="Analysis — what the project’s fishbone says"><p className="a3-ev-t">{b.evidence.title}</p><p className="a3-ev-s">{b.evidence.says}</p></div>}
      {b.n === 4 && doorTo('Open the fishbone and five whys', `/project/${projectId}/fishbone`)}
      {b.n === 5 && doorTo('Open this project’s Actions', `/project/${projectId}/actions`)}
      {b.n === 5 && sheet.noCause > 0 && <p className="a3-warn" role="status">{sheet.noCause} countermeasure{sheet.noCause === 1 ? ' names' : 's name'} no cause — without one it is a to-do, not a countermeasure.</p>}
    </section>
  );

  return (
    <section className="a3" aria-label="The A3 sheet">
      <div className="a3-head">
        <Field fd={header('problem', 'The problem, in one line')} canEdit={canEdit} save={save} />
        <Field fd={header('owner', 'Owner — and who must agree it')} canEdit={canEdit} save={save} />
      </div>
      <p className="a3-says" role="status">{sheet.says}</p>
      <div className="a3-cols">
        <div className="a3-col" aria-label="How it is now">
          <p className="a3-side">How it is now</p>
          {sheet.blocks.filter(b => b.side === 'left').map(block)}
        </div>
        <div className="a3-col" aria-label="What is to be done">
          <p className="a3-side">What is to be done</p>
          {sheet.blocks.filter(b => b.side === 'right').map(block)}
        </div>
      </div>
    </section>
  );
}
