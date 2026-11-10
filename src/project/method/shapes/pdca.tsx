/* PDCA'S BOARD — the four-quarter loop with the cycle in hand and the list of cycles (docs/METHODS.md §16). Plan → Do → Check → Act,
 * and Act's "again" back round into the next cycle's Plan. The questions are lib/methodSheet's (one set a cycle, lib/methodPdca keeps
 * the cycles); the paper is lib/report/pdcaPaper from the same module. Where a tool answers a question, what the project's own record
 * of it already says is shown beside the question, with a way to open or start it — never required. A client reads and writes nothing. */
import { useEffect, useState } from 'react';
import { listStandards, listStudies, onDataChange } from '../../../db';
import { usesOf } from '../../../screens/ProjectToolsScreen';
import { studySays } from '../../../lib/studyLinks';
import { inProject } from '../../../lib/inProject';
import { nav } from '../../../state/useRoute';
import { todayISO } from '../../../lib/weeks';
import { cycleKey, cyclesOf, nextCycleSeed, QUARTERS, type CycleView } from '../../../lib/methodPdca';
import type { ToolStudy } from '../../../lib/study';
import type { Standard } from '../../../tools/linestandard/standard';
import { howTool, openable } from '../methodTools';
import type { ShapeProps } from './index';
import './pdca.css';

/** What a project's own record of a tool says, read-only, with a way to open or start the tool. */
function ToolHere({ ids, projectId, studies, standards, canEdit, onTool, why }: {
  ids: readonly string[]; projectId: string; studies: ToolStudy[]; standards: Standard[]; canEdit: boolean; onTool: (id: string) => void; why: string;
}) {
  return (
    <>
      {ids.map(id => {
        const t = openable(howTool(id));
        if (!t) return null;
        const u = usesOf(t, studies, standards);
        const latest = t.reads && t.reads !== 'standard' ? studies.filter(s => !s.deletedAt && s.tool === t.reads && !s.facts?.video).sort((a, b) => b.updatedAt - a.updatedAt)[0] : undefined;
        const says = latest ? studySays(latest).text : undefined;
        return (
          <div key={id} className="pdca-tool" role="note">
            <p className="pdca-tool-says">
              {u.n
                ? <><b>{t.label}</b> in this project — {u.latest ? `${u.latest}: ` : ''}{says ?? `${u.n} on record.`}</>
                : <><b>{t.label}</b> — none in this project yet. {why}</>}
            </p>
            <span className="pdca-tool-do">
              {u.n ? <button type="button" className="chip" aria-label={`Open ${t.label} in this project`} onClick={() => nav(inProject(t.to, projectId))}>Open {t.label}</button> : null}
              {canEdit ? <button type="button" className="chip" aria-label={`Start ${t.label} for ${why}`} onClick={() => onTool(id)}>{u.n ? 'Another' : 'Start'} {t.label.toLowerCase()}</button> : null}
            </span>
          </div>
        );
      })}
    </>
  );
}

/** Which tools fall in at which question — a question has an answer in words whether or not one is used. */
const AT: Partial<Record<string, { ids: string[]; why: string }>> = {
  number: { ids: ['FC-094'], why: 'It says how the number behaves and what it can be held to.' },
  result: { ids: ['FC-105', 'FC-086'], why: 'It says whether the number moved beyond the noise.' },
  standard: { ids: ['FC-006'], why: 'The line standard is where the new way is written down.' },
};

import { useLunaAnswers } from '../../../colleague/lunaAnswers';
import { fieldsOf } from '../../../lib/methodSheet';
import { isLunaDraft, LunaMark } from '../../../colleague/LunaMark';

export function PdcaBoard({ projectId, answers, canEdit, save, onTool }: ShapeProps) {
  /* what Luna wrote on the board, marked where it stands (W5) — cycle 1's boxes are the sheet's own questions */
  const luna = useLunaAnswers(projectId, QUARTERS.flatMap(name => fieldsOf('pdca', name).map(f => ({ id: f.id, label: f.label }))));
  const cycles = cyclesOf(answers);
  const latest = cycles[cycles.length - 1].n;
  const [sel, setSel] = useState<number | null>(null);
  const n = sel && cycles.some(c => c.n === sel) ? sel : sel && sel > latest ? sel : latest;
  const c: CycleView = cycles.find(x => x.n === n) ?? cyclesOf({ ...answers, [cycleKey('opened', n)]: '' }).find(x => x.n === n) ?? cycles[0];
  const [got, setGot] = useState<{ studies: ToolStudy[]; standards: Standard[] }>({ studies: [], standards: [] });
  useEffect(() => {
    let live = true;
    const load = () => void Promise.all([listStudies(projectId), listStandards(projectId)]).then(([studies, standards]) => { if (live) setGot({ studies, standards }); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);

  const startNext = () => {
    const seed = nextCycleSeed(answers, n, todayISO());
    for (const [k, v] of Object.entries(seed)) save(k, v);
    setSel(n + 1);
  };
  const next = n < latest;
  const again = (c.answers.again ?? '').trim();

  return (
    <section className="pdca" aria-label="The PDCA cycle">
      <div className="pdca-cycles" role="tablist" aria-label="Cycles">
        {cyclesOf({ ...answers, ...(n > latest ? { [cycleKey('opened', n)]: '-' } : {}) }).map(x => (
          <button key={x.n} type="button" role="tab" aria-selected={x.n === n} className={`pdca-cycle${x.n === n ? ' on' : ''}`} onClick={() => setSel(x.n)}>
            <b>Cycle {x.n}</b><span>{x.status}</span>
          </button>
        ))}
      </div>

      <div className="pdca-loop" aria-label={`Cycle ${n} — the loop`}>
        {QUARTERS.map((name, i) => {
          const q = c.quarters[i];
          return (
            <div key={name} className={`pdca-q${c.inHand === name ? ' hand' : ''}`} data-q={name} aria-label={`${name} — cycle ${n}`}>
              <div className="pdca-qh">
                <h2 className="pdca-qt"><span className="pdca-step">{i + 1}</span> {name}{i < 3 ? <span className="pdca-arrow" aria-hidden="true"> →</span> : <span className="pdca-arrow" aria-hidden="true"> ↺</span>}</h2>
                <p className="msheet-state" role="status"><b>{q.word}</b> · {q.written} of {q.fields.length} written{c.inHand === name ? ' · the cycle is here' : ''}</p>
              </div>
              {q.fields.map(fl => {
                const key = cycleKey(fl.id, n), value = c.answers[fl.id] ?? '';
                const at = AT[fl.id];
                const mark = key === fl.id ? luna.get(fl.id) : undefined;
                const fromLuna = isLunaDraft(mark, value);
                return (
                  <label key={fl.id} className={'msheet-f' + (fromLuna ? ' is-luna' : '')} data-luna-answer={fromLuna ? fl.id : undefined}>
                    <span className="msheet-q">{fl.label}</span>
                    <span className="msheet-hint">{fl.hint}</span>
                    {fromLuna && <LunaMark mark={mark} canEdit={canEdit} onNot={() => save(key, '', fl.label)} />}
                    {canEdit
                      ? (fl.line
                        ? <input className="text-input msheet-in" defaultValue={value} key={`${key}:${value}`} aria-label={fl.label} onBlur={e => save(key, e.target.value.trim(), fl.label)} />
                        : <textarea className="text-input msheet-in" rows={3} defaultValue={value} key={`${key}:${value}`} aria-label={fl.label} onBlur={e => save(key, e.target.value.trim(), fl.label)} />)
                      : <span className="msheet-ro">{value || 'Not written yet.'}</span>}
                    {at && <ToolHere ids={at.ids} projectId={projectId} studies={got.studies} standards={got.standards} canEdit={canEdit} onTool={onTool} why={fl.label} />}
                    {fl.id === 'cause' && (
                      <div className="pdca-tool" role="note">
                        <p className="pdca-tool-says"><b>Fishbone and five whys</b> — if the cause is not clear, draw it before choosing the change.</p>
                        <span className="pdca-tool-do"><button type="button" className="chip" aria-label="Open the fishbone for the cause" onClick={() => nav(`/project/${projectId}/fishbone`)}>Open the fishbone</button></span>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="pdca-next">
          <p className="sub">{next ? `Cycle ${n + 1} has been started.` : again ? `Act says: “${again}”. The next cycle starts from it, with the same number and cause, and the figure this one ended at.` : 'Act’s “next cycle’s change” is blank — the next cycle’s Plan will start without a change.'}</p>
          <button type="button" className="btn" disabled={next} onClick={startNext}>Start the next cycle</button>
        </div>
      )}
    </section>
  );
}


