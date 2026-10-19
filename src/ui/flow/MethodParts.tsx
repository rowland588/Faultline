/* THE PARTS OF A METHOD, ON A SCREEN — a step and a gate's condition, each
 * read in words, and written in a sheet while the method is a draft
 * (screens/MethodScreen). Every box commits when the person is done with it
 * (Enter or leaving it), never a write per keystroke; the validator
 * (lib/flow/validate) then says what is still wrong with the whole. */
import { useEffect, useState } from 'react';
import {
  ANSWERS, ANSWER_WORD, FIELD_TYPES, FIELD_WORD, RULE_OPS, TIMER_UNITS, allSteps, fieldKeyOf, isTypedNumber, keyOf, measureKeyOf, numbersOf, roleName, timerUnit,
  type FlowCondition, type FlowDefinition, type FlowField, type FlowMeasure, type FlowRule, type FlowStage, type FlowStepDef,
} from '../../lib/flow/definition';
import { COMPONENTS, componentOf } from '../../lib/flow/components';
import { ANALYSIS_BLOCKS, BLOCKS, WHEN_OPS, isGroupColumn, isNumberColumn, type FlowAnalysis, type WhenOp } from '../../lib/flow/analysis';
import { Sheet } from '../Sheet';
import { ruleSaid } from '../../lib/flow/runtime';

/** What each answer asks of the person on the floor. */
export const ANSWER_SAYS: Record<FlowStepDef['answer'], string> = {
  done: 'A task — done, or it hit a problem.',
  check: 'A test — passed, or did not pass.',
  paperwork: 'Here they are — at least one file or photo.',
  signoff: 'Signed — always asks who signed.',
  measure: 'Numbers against their limits — passes, or does not.',
  form: 'The step’s boxes, filled in.',
  log: 'Many entries, each its columns — added up by its analyses (a Pareto, a trend, a total, Cpk…).',
};

export const CONDITION_WORD: Record<FlowCondition['type'], string> = {
  stepsDone: 'Every step in the stage done',
  stepDone: 'One step done',
  evidence: 'A step has its photos or files',
  signedOff: 'A sign-off signed',
  fieldMeets: 'A measurement meets a figure',
  measureMet: 'A measure meets its target',
  noOpenProblems: 'No open problems',
  dateReached: 'Not before a day',
  manual: 'A check confirmed by hand',
};

/** A condition in words, as the method reads it — before any project runs it. */
export function conditionSaid(def: FlowDefinition, c: FlowCondition): string {
  const title = (k: string) => def.stages.flatMap(s => s.steps).find(s => s.key === k)?.title ?? k;
  if (c.label && c.type !== 'manual') return c.label;
  switch (c.type) {
    case 'stepsDone': return 'Every step in the stage done';
    case 'stepDone': return `“${title(c.step)}” done`;
    case 'evidence': return `“${title(c.step)}” has ${c.min} ${c.kind}${c.min === 1 ? '' : 's'}`;
    case 'signedOff': return `“${title(c.step)}” signed`;
    case 'fieldMeets': {
      const st = def.stages.flatMap(s => s.steps).find(s => s.key === c.step);
      const f = st ? numbersOf(st).find(x => x.key === c.field) : undefined;
      const u = f?.unit ? ` ${f.unit}` : '';
      const op = c.op === '>=' ? `at least ${c.value}${u}` : c.op === '<=' ? `at most ${c.value}${u}` : c.op === '=' ? `exactly ${c.value}${u}` : `between ${c.value} and ${c.value2 ?? c.value}${u}`;
      return `“${title(c.step)}”: ${f?.label ?? c.field} ${op}`;
    }
    case 'measureMet': {
      const m = def.measures?.find(x => x.key === c.measure);
      return m ? `${m.name} ${m.better === 'lower' ? 'at most' : 'at least'} ${m.target ?? '—'}${m.unit ? ` ${m.unit}` : ''}` : `The measure “${c.measure}” meets its target`;
    }
    case 'noOpenProblems': return c.priority === 'any' ? 'No open problems' : c.priority === 'critical' ? 'No open critical problems' : 'No open high or critical problems';
    case 'dateReached': return `Not before ${c.dueDays} day${c.dueDays === 1 ? '' : 's'} from the start`;
    case 'manual': return c.label;
  }
}

/** A step in one line of words — under its title in the method. */
/** A decision in words, on the method — "Log the readings finds Signals above 0". */
export function ruleWords(def: FlowDefinition, r: FlowRule): string {
  const dep = allSteps(def).find(x => x.step.key === r.step)?.step;
  const f = dep ? [...numbersOf(dep), ...(dep.fields ?? [])].find(x => x.key === r.field) : undefined;
  return `“${dep?.title ?? r.step}” finds ${ruleSaid(r, f)}`;
}

export function stepSaid(def: FlowDefinition, s: FlowStepDef): string {
  const parts = [
    s.per === 'machine' ? 'every machine' : 'once',
    ANSWER_WORD[s.answer].toLowerCase(),
    s.component ? `with ${componentOf(s.component.tool)?.name ?? s.component.tool}` : '',
    s.role ? roleName(def, s.role) ?? s.role : '',
    s.evidence?.photos ? `${s.evidence.photos} photo${s.evidence.photos === 1 ? '' : 's'}` : '',
    s.evidence?.files ? `${s.evidence.files} file${s.evidence.files === 1 ? '' : 's'}` : '',
    s.fields?.length ? `${s.fields.length} box${s.fields.length === 1 ? '' : 'es'}` : '',
    s.answer === 'log' && s.columns?.length ? `${s.columns.length} column${s.columns.length === 1 ? '' : 's'} an entry` : '',
    s.answer === 'log' && s.analyses?.length ? `works out ${s.analyses.map(a => a.label.toLowerCase()).join(', ')}` : '',
    s.dueDays !== undefined ? `due day ${s.dueDays}` : '',
    s.after?.length ? `after ${s.after.map(a => `“${def.stages.flatMap(x => x.steps).find(x => x.key === a)?.title ?? a}”`).join(', ')}` : '',
    s.onlyIf ? `only when ${ruleWords(def, s.onlyIf)}` : '',
  ];
  return parts.filter(Boolean).join(' · ');
}

/** A measure in one line of words — what it reads, which way, to what. */
export function measureSaid(def: FlowDefinition, m: FlowMeasure): string {
  const from = m.from.map(f => {
    const st = allSteps(def).find(r => r.step.key === f.step)?.step;
    const n = st ? numbersOf(st).find(x => x.key === f.field) : undefined;
    return st ? `${n?.label ?? f.field} on “${st.title}”` : f.field;
  });
  const goal = m.target !== undefined ? `${m.better === 'lower' ? 'at most' : 'at least'} ${m.target}${m.unit ? ` ${m.unit}` : ''}` : `${m.better} is better, no target`;
  return `${goal} · read from ${from.join(', ') || 'nothing yet'}`;
}

/* ------------------------------------------------------------- the boxes */

/** Words that save when the person is done with the box. */
export function Words({ value, onSave, label, placeholder, long, disabled }: {
  value: string; onSave: (v: string) => void; label: string; placeholder?: string; long?: boolean; disabled?: boolean;
}) {
  const [d, setD] = useState(value);
  useEffect(() => { setD(value); }, [value]);
  const commit = () => { if (d.trim() !== value.trim()) onSave(d.trim()); };
  return long
    ? <textarea className="text-input fw-in" rows={2} value={d} aria-label={label} placeholder={placeholder} disabled={disabled}
      onChange={e => setD(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Escape') setD(value); }} />
    : <input className="text-input fw-in" value={d} aria-label={label} placeholder={placeholder} disabled={disabled} maxLength={300}
      onChange={e => setD(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setD(value); }} />;
}

/** A number that saves when the person is done with it; empty is none. */
export function Num({ value, onSave, label, placeholder, disabled }: {
  value: number | undefined; onSave: (v: number | undefined) => void; label: string; placeholder?: string; disabled?: boolean;
}) {
  const shown = value === undefined ? '' : String(value);
  const [d, setD] = useState(shown);
  useEffect(() => { setD(shown); }, [shown]);
  const commit = () => {
    const t = d.trim();
    if (t === shown) return;
    if (!t) { onSave(undefined); return; }
    const n = Number(t);
    if (Number.isFinite(n)) onSave(n); else setD(shown);
  };
  return (
    <input className="text-input fw-in fw-num" inputMode="decimal" value={d} aria-label={label} placeholder={placeholder ?? '—'} disabled={disabled}
      onChange={e => setD(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setD(shown); }} />
  );
}

/* --------------------------------------------------------------- a step */

/** EDIT A STEP — every part of it, in the order a person thinks of them:
 *  what it is, where it is done, how it is answered, who does it, what it
 *  must show, when, and what comes first. */
/** WHAT NO BLOCK DOES YET — a method's needs for development, said as asked
 *  (FlowDefinition.needs): what, why, from what, by what method, checked how.
 *  Never run; the method runs on what exists until a block is written. */
export function NeedsList({ def }: { def: FlowDefinition }) {
  const needs = def.needs ?? [];
  if (!needs.length) return null;
  return (
    <div className="fw-needs" role="note" aria-label="Needs development">
      <span className="field-label">Needs development — what no block does yet</span>
      <p className="sub">The method runs on what exists; these are work for development, and nothing here is run until a block is written and tested for it.</p>
      <ul className="fw-list">
        {needs.map((n, i) => (
          <li key={i} data-need={i}><b>{n.what}</b> <span className="sub">— {n.why}</span>
            {(n.inputs || n.method || n.check) && <span className="sub"><br />{[n.inputs ? `From: ${n.inputs}` : '', n.method ? `Method: ${n.method}` : '', n.check ? `Checked by: ${n.check}` : ''].filter(Boolean).join(' · ')}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A step's boxes, or a log's columns — named, typed, limited, worked out. */
function BoxesEditor({ boxes, onChange, ro, one, newType = 'text' }: { boxes: FlowField[]; onChange: (next: FlowField[]) => void; ro: boolean; one: 'box' | 'column'; newType?: FlowField['type'] }) {
  const Name = one === 'box' ? 'Box' : 'Column';
  const setBox = (i: number, patch: Partial<FlowField>) => onChange(boxes.map((f, j) => {
    if (j !== i) return f;
    const g: FlowField = { ...f, ...patch };
    for (const k of Object.keys(patch) as (keyof FlowField)[]) if (patch[k] === undefined) delete g[k];
    return g;
  }));
  return (
    <>
      {boxes.map((f, i) => (
        <div key={f.key} className="fw-field" data-field={f.key}>
          <div className="fw-field-r">
            <Words value={f.label} label={`${Name} ${i + 1}'s name`} onSave={v => { if (v) setBox(i, { label: v }); }} disabled={ro} />
            <select className="text-input fw-in" value={f.type} disabled={ro} aria-label={`${Name} ${i + 1}'s kind`}
              onChange={e => { const type = e.target.value as FlowField['type']; setBox(i, { type, ...(type === 'timer' ? { unit: timerUnit(f) } : {}) }); }}>
              {FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_WORD[t]}</option>)}
            </select>
            {!ro && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${one} ${f.label}`} onClick={() => onChange(boxes.filter((_, j) => j !== i))}>Remove</button>}
          </div>
          {f.type === 'timer' && (
            <div className="fw-field-r">
              <select className="text-input fw-in" value={timerUnit(f)} disabled={ro} aria-label={`${f.label}: kept in`} onChange={e => setBox(i, { unit: e.target.value })}>
                {TIMER_UNITS.map(u => <option key={u} value={u}>{u === 's' ? 'seconds' : u === 'min' ? 'minutes' : 'hours'}</option>)}
              </select>
              <Num value={f.min} label={`${f.label}: at least`} placeholder="at least" onSave={v => setBox(i, { min: v })} disabled={ro} />
              <Num value={f.max} label={`${f.label}: at most`} placeholder="at most" onSave={v => setBox(i, { max: v })} disabled={ro} />
              <span className="sub">Timed on the floor with a tap — Start, Stop{one === 'column' ? ', Lap for the next' : ''} — or typed.</span>
            </div>
          )}
          {(f.type === 'number' || f.type === 'reading' || f.type === 'calc') && (
            <div className="fw-field-r">
              <Words value={f.unit ?? ''} label={`${f.label}'s unit`} placeholder="unit — packs/min, mm" onSave={v => setBox(i, { unit: v || undefined })} disabled={ro} />
              {f.type !== 'calc' && <Num value={f.min} label={`${f.label}: at least`} placeholder="at least" onSave={v => setBox(i, { min: v })} disabled={ro} />}
              {f.type !== 'calc' && <Num value={f.max} label={`${f.label}: at most`} placeholder="at most" onSave={v => setBox(i, { max: v })} disabled={ro} />}
            </div>
          )}
          {f.type === 'calc' && (
            <div className="fw-field-r">
              <Words value={f.formula ?? ''} label={`${f.label}'s sum`} placeholder={`e.g. ${boxes.filter(x => isTypedNumber(x.type)).map(x => x.key).slice(0, 2).join(' / ') || 'packs / minutes'}`}
                onSave={v => setBox(i, { formula: v || undefined })} disabled={ro} />
              <span className="sub">Worked out by the app from the {one === 'box' ? 'boxes' : 'same entry’s columns'}, by their keys: {boxes.filter(x => x.key !== f.key && x.type !== 'text').map(x => x.key).join(', ') || 'none yet'}.</span>
            </div>
          )}
          {f.type === 'choice' && (
            <div className="fw-field-r">
              <Words value={(f.options ?? []).join(', ')} label={`${f.label}'s options`} placeholder="options, separated by commas"
                onSave={v => setBox(i, { options: v ? v.split(',').map(x => x.trim()).filter(Boolean) : undefined })} disabled={ro} />
            </div>
          )}
          {f.type !== 'calc' && (
            <label className="fw-check"><input type="checkbox" disabled={ro} checked={!!f.required} onChange={e => setBox(i, { required: e.target.checked || undefined })} />
              <span>Must be filled{one === 'column' ? ' in every entry' : ' before it is done'}</span></label>
          )}
        </div>
      ))}
      {!ro && <button type="button" className="btn btn-sm" onClick={() => onChange([...boxes, { key: fieldKeyOf(`${one} ${boxes.length + 1}`, boxes.map(f => f.key)), label: `${Name} ${boxes.length + 1}`, type: newType }])}>Add a {one}</button>}
    </>
  );
}

/** What a log's entries add up to — each a block (lib/flow/analysis) on its columns. */
function AnalysesEditor({ step, onChange, ro, earlier = [] }: { step: FlowStepDef; onChange: (next: FlowAnalysis[]) => void; ro: boolean; earlier?: readonly FlowStepDef[] }) {
  const cols = step.columns ?? [];
  const list = step.analyses ?? [];
  const setA = (i: number, patch: Partial<FlowAnalysis>) => onChange(list.map((a, j) => {
    if (j !== i) return a;
    const b: FlowAnalysis = { ...a, ...patch };
    for (const k of Object.keys(patch) as (keyof FlowAnalysis)[]) if (patch[k] === undefined) delete b[k];
    return b;
  }));
  const taken = () => [...cols, ...(step.fields ?? [])].map(c => c.key).concat(list.map(a => a.key));
  return (
    <div className="fw-f fw-analyses"><span className="field-label">What the entries add up to — each worked out by the app</span>
      {list.length === 0 && <p className="sub">Nothing worked out yet — add a total, a Pareto, a trend.</p>}
      {list.map((a, i) => {
        const b = BLOCKS[a.block];
        const ofCols = cols.filter(c => (b.id === 'overdue' ? c.type === 'date' : b.numeric ? isNumberColumn(c) : true));
        return (
          <div key={a.key} className="fw-field" data-analysis={a.key}>
            <div className="fw-field-r">
              <Words value={a.label} label={`Analysis ${i + 1}'s name`} onSave={v => { if (v) setA(i, { label: v }); }} disabled={ro} />
              <select className="text-input fw-in" value={a.block} disabled={ro} aria-label={`Analysis ${i + 1}: worked out as`}
                onChange={e => {
                  /* what the new block does not read is let go, so the validator is never left a stray column */
                  const nb = BLOCKS[e.target.value as FlowAnalysis['block']];
                  setA(i, {
                    block: nb.id,
                    ...(nb.needs.of === 'none' || (nb.numeric && !isNumberColumn(cols.find(c => c.key === a.of))) ? { of: undefined } : {}),
                    ...(nb.needs.by === 'none' ? { by: undefined } : {}),
                    ...(nb.needs.when === 'none' ? { when: undefined } : {}),
                    ...(nb.needs.against === 'none' ? { against: undefined } : {}),
                    ...(nb.needs.target === 'none' ? { target: undefined } : {}),
                    ...(nb.needs.formula !== 'required' ? { formula: undefined } : {}),
                    ...((nb.needs.from ?? 'none') === 'none' ? { from: undefined, better: undefined } : {}),
                  });
                }}>
                {ANALYSIS_BLOCKS.map(id => <option key={id} value={id}>{BLOCKS[id].name}</option>)}
              </select>
              {!ro && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove analysis ${a.label}`} onClick={() => onChange(list.filter((_, j) => j !== i))}>Remove</button>}
            </div>
            <span className="sub">{b.says}.</span>
            <div className="fw-field-r">
              {b.needs.of !== 'none' && (
                <select className="text-input fw-in" value={a.of ?? ''} disabled={ro} aria-label={`Analysis ${i + 1}: of`} onChange={e => setA(i, { of: e.target.value || undefined })}>
                  <option value="">{b.needs.of === 'required' ? 'of which column?' : 'count the entries'}</option>
                  {ofCols.map(c => <option key={c.key} value={c.key}>of {c.label}</option>)}
                </select>
              )}
              {b.needs.by !== 'none' && (
                <select className="text-input fw-in" value={a.by ?? ''} disabled={ro} aria-label={`Analysis ${i + 1}: by`} onChange={e => setA(i, { by: e.target.value || undefined })}>
                  <option value="">grouped by which column?</option>
                  {cols.filter(isGroupColumn).map(c => <option key={c.key} value={c.key}>by {c.label}</option>)}
                </select>
              )}
              {b.needs.against !== 'none' && (
                <select className="text-input fw-in" value={a.against ?? ''} disabled={ro} aria-label={`Analysis ${i + 1}: against`} onChange={e => setA(i, { against: e.target.value || undefined })}>
                  <option value="">against which column?</option>
                  {cols.filter(c => isNumberColumn(c) && c.key !== a.of).map(c => <option key={c.key} value={c.key}>against {c.label}</option>)}
                </select>
              )}
              {(b.needs.from ?? 'none') !== 'none' && (
                <select className="text-input fw-in" value={a.from ?? ''} disabled={ro} aria-label={`Analysis ${i + 1}: compared with`} onChange={e => setA(i, { from: e.target.value || undefined })}>
                  <option value="">{earlier.length ? 'compared with which log before it?' : 'no log before this one to compare with'}</option>
                  {earlier.map(s => <option key={s.key} value={s.key}>against {s.title}</option>)}
                </select>
              )}
              {(b.needs.from ?? 'none') !== 'none' && (
                <select className="text-input fw-in" value={a.better ?? ''} disabled={ro} aria-label={`Analysis ${i + 1}: better when`} onChange={e => setA(i, { better: (e.target.value || undefined) as FlowAnalysis['better'] })}>
                  <option value="">better either way — how sure it changed</option>
                  <option value="lower">better lower — how sure it fell</option>
                  <option value="higher">better higher — how sure it rose</option>
                </select>
              )}
              {b.needs.target !== 'none' && (
                <Num value={a.target} label={`Analysis ${i + 1}: target`} placeholder="the target it is heading for" disabled={ro} onSave={v => setA(i, { target: v })} />
              )}
            </div>
            {b.needs.formula === 'required' && (() => {
              /* what it may read: the figures before it, and the step's number boxes */
              const names = [...list.slice(0, i).filter(x => BLOCKS[x.block].output !== 'series').map(x => x.key), ...(step.fields ?? []).filter(isNumberColumn).map(f => f.key)];
              return (
                <div className="fw-field-r">
                  <Words value={a.formula ?? ''} label={`Analysis ${i + 1}: worked out as`} placeholder={names.length >= 2 ? `e.g. ${names[0]} * ${names[1]}` : 'e.g. rejects_a_day * cost_of_a_pack'} disabled={ro} onSave={v => setA(i, { formula: v.trim().toLowerCase() || undefined })} />
                  <Words value={a.unit ?? ''} label={`Analysis ${i + 1}: its unit`} placeholder="unit (£ for money)" disabled={ro} onSave={v => setA(i, { unit: v.trim() || undefined })} />
                  <span className="sub">{names.length ? `From: ${names.join(', ')}` : 'Add a figure before it, or a number box on the step, for it to read.'}</span>
                </div>
              );
            })()}
            {b.needs.when !== 'none' && (
              <div className="fw-field-r">
                <select className="text-input fw-in" value={a.when?.column ?? ''} disabled={ro} aria-label={`Analysis ${i + 1}: only entries where`}
                  onChange={e => setA(i, { when: e.target.value ? { column: e.target.value, op: a.when?.op ?? '=', value: a.when?.value ?? '' } : undefined })}>
                  <option value="">{b.needs.when === 'required' ? 'counting entries where…' : 'every entry'}</option>
                  {cols.map(c => <option key={c.key} value={c.key}>where {c.label}</option>)}
                </select>
                {a.when && <>
                  <select className="text-input fw-in" value={a.when.op} disabled={ro} aria-label={`Analysis ${i + 1}: compared`}
                    onChange={e => setA(i, { when: { ...(a.when as NonNullable<FlowAnalysis['when']>), op: e.target.value as WhenOp } })}>
                    {WHEN_OPS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <Words value={String(a.when.value)} label={`Analysis ${i + 1}: value`} placeholder="value" disabled={ro}
                    onSave={v => {
                      const c = cols.find(x => x.key === a.when?.column);
                      const value = c && isNumberColumn(c) && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : v;
                      setA(i, { when: { ...(a.when as NonNullable<FlowAnalysis['when']>), value } });
                    }} />
                </>}
              </div>
            )}
          </div>
        );
      })}
      {!ro && <button type="button" className="btn btn-sm" onClick={() => onChange([...list, { key: fieldKeyOf(`analysis ${list.length + 1}`, taken()), label: 'Entries', block: 'count' }])}>Add an analysis</button>}
    </div>
  );
}

const RULE_SAID: Record<FlowRule['op'], string> = { '>': 'is above', '>=': 'is at least', '<': 'is below', '<=': 'is at most', '=': 'is', '!=': 'is not' };

/** A DECISION ON WHAT IS FOUND (FlowStepDef.onlyIf): needed always, or only
 *  when an earlier step's box, tool number or log's figure says so. */
function RuleEditor({ def, earlier, rule, ro, onChange }: {
  def: FlowDefinition; earlier: { key: string; title: string }[]; rule?: FlowRule; ro: boolean; onChange: (r: FlowRule | undefined) => void;
}) {
  const stepOf = (k?: string) => allSteps(def).find(x => x.step.key === k)?.step;
  const figuresOf = (k?: string): FlowField[] => {
    const st = stepOf(k);
    if (!st) return [];
    const nums = numbersOf(st);
    return [...nums, ...(st.fields ?? []).filter(f => ['choice', 'yesno'].includes(f.type) && !nums.some(n => n.key === f.key))];
  };
  const candidates = earlier.filter(e => figuresOf(e.key).length > 0);
  if (!candidates.length && !rule) return null;
  const figs = figuresOf(rule?.step);
  const fig = figs.find(f => f.key === rule?.field);
  const words = !!fig && ['choice', 'yesno'].includes(fig.type);
  const valueOf = (raw: string, f?: FlowField): FlowRule['value'] => (f && !['choice', 'yesno'].includes(f.type) && raw.trim() !== '' && Number.isFinite(Number(raw)) ? Number(raw) : f?.type === 'yesno' ? /^y/i.test(raw) : raw);
  const begin = (k: string) => {
    if (!k) { onChange(undefined); return; }
    const f = figuresOf(k)[0];
    if (f) onChange({ step: k, field: f.key, op: ['choice', 'yesno'].includes(f.type) ? '=' : '>', value: f.type === 'yesno' ? true : f.type === 'choice' ? f.options?.[0] ?? '' : 0 });
  };
  return (
    <div className="fw-f fw-rule" data-rule={rule ? 'on' : 'off'}>
      <span className="field-label">Needed</span>
      <div className="fw-field-r">
        <select className="text-input fw-in" aria-label="Needed always, or only when an earlier step finds" disabled={ro} value={rule?.step ?? ''} onChange={e => begin(e.target.value)}>
          <option value="">Always</option>
          {candidates.map(c => <option key={c.key} value={c.key}>Only when “{c.title}” finds…</option>)}
        </select>
        {rule && <>
          <select className="text-input fw-in" aria-label="Its figure" disabled={ro} value={rule.field}
            onChange={e => { const f = figs.find(x => x.key === e.target.value); if (f) onChange({ ...rule, field: f.key, op: ['choice', 'yesno'].includes(f.type) ? '=' : rule.op, value: valueOf(String(rule.value), f) }); }}>
            {figs.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <select className="text-input fw-in" aria-label="Compared" disabled={ro} value={rule.op} onChange={e => onChange({ ...rule, op: e.target.value as FlowRule['op'] })}>
            {RULE_OPS.filter(o => !words || o === '=' || o === '!=').map(o => <option key={o} value={o}>{RULE_SAID[o]}</option>)}
          </select>
          {fig?.type === 'choice'
            ? <select className="text-input fw-in" aria-label="The value" disabled={ro} value={String(rule.value)} onChange={e => onChange({ ...rule, value: e.target.value })}>
              {(fig.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            : fig?.type === 'yesno'
              ? <select className="text-input fw-in" aria-label="The value" disabled={ro} value={rule.value === true ? 'yes' : 'no'} onChange={e => onChange({ ...rule, value: e.target.value === 'yes' })}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
              : <Words value={String(rule.value)} label="The value" disabled={ro} onSave={v => onChange({ ...rule, value: valueOf(v, fig) })} />}
        </>}
      </div>
      {rule && <span className="sub">Decided once “{stepOf(rule.step)?.title}” is done; until then it waits on it. Decided against, it reads “Not needed”, says why, and holds nothing up.</span>}
    </div>
  );
}

export function StepEditor({ def, stageIndex, step, open, onClose, onChange, onRemove, onMove, readOnly }: {
  def: FlowDefinition; stageIndex: number; step: FlowStepDef; open: boolean; onClose: () => void;
  onChange: (next: FlowStepDef) => void; onRemove: () => void; onMove: (by: -1 | 1) => void; readOnly: boolean;
}) {
  const set = (patch: Partial<FlowStepDef>) => {
    const next: FlowStepDef = { ...step, ...patch };
    for (const k of Object.keys(patch) as (keyof FlowStepDef)[]) if (patch[k] === undefined) delete next[k];
    onChange(next);
  };
  /* the steps that may come first: every step in this stage before it, and every step of the stages before */
  const earlier = def.stages.slice(0, stageIndex + 1).flatMap((s, si) => {
    const list = si < stageIndex ? s.steps : s.steps.slice(0, s.steps.findIndex(x => x.key === step.key));
    return list.map(x => ({ key: x.key, title: x.title, stage: s.name }));
  });
  const fields = step.fields ?? [];
  const ro = readOnly;
  return (
    <Sheet open={open} onClose={onClose} title={ro ? step.title : 'Edit the step'}>
      <div className="fw-sheet fw-edit">
        <label className="fw-f"><span className="field-label">What it is</span>
          <Words value={step.title} label="The step's title" onSave={v => { if (v) set({ title: v }); }} disabled={ro} /></label>

        <div className="fw-f"><span className="field-label">Done</span>
          <div className="fw-seg" role="radiogroup" aria-label="Done once or on every machine">
            {(['machine', 'line'] as const).map(p => (
              <button key={p} type="button" role="radio" aria-checked={step.per === p} className={'fw-seg-b' + (step.per === p ? ' on' : '')} disabled={ro}
                onClick={() => set({ per: p })}>{p === 'machine' ? 'On every machine' : 'Once for the job'}</button>
            ))}
          </div>
        </div>

        <label className="fw-f"><span className="field-label">How it is answered</span>
          <select className="text-input fw-in" value={step.answer} disabled={ro} aria-label="How it is answered"
            onChange={e => {
              const answer = e.target.value as FlowStepDef['answer'];
              /* a measurement needs a number to measure: give it one to start;
                 a log, a column and a count, to start from */
              set(answer === 'measure' && !fields.some(f => isTypedNumber(f.type))
                ? { answer, fields: [...fields, { key: fieldKeyOf('reading', fields.map(f => f.key)), label: 'Reading', type: 'reading', required: true }] }
                : answer === 'log' && !(step.columns ?? []).length
                  ? { answer, columns: [{ key: 'value', label: 'Value', type: 'number' }], analyses: [{ key: 'entries', label: 'Entries', block: 'count' }] }
                  : { answer });
            }}>
            {ANSWERS.map(a => <option key={a} value={a}>{ANSWER_WORD[a]}</option>)}
          </select>
          <span className="sub">{ANSWER_SAYS[step.answer]}</span>
        </label>

        <label className="fw-f"><span className="field-label">Done with one of the app’s tools</span>
          <select className="text-input fw-in" value={step.component?.tool ?? ''} disabled={ro} aria-label="Done with a tool"
            onChange={e => set({ component: e.target.value ? { tool: e.target.value } : undefined })}>
            <option value="">No tool — answered on the step</option>
            {COMPONENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {step.component && (
            <span className="sub">
              {componentOf(step.component.tool)?.gives}.{' '}
              {componentOf(step.component.tool)?.figures.length
                ? `It is answered by attaching one; its figures — ${componentOf(step.component.tool)?.figures.map(f => f.label.toLowerCase()).join(', ')} — come into the step for a gate or a measure.`
                : 'It is opened on the line and the step is ticked by hand.'}
            </span>
          )}
        </label>

        <label className="fw-f"><span className="field-label">Who does it</span>
          <select className="text-input fw-in" value={step.role ?? ''} disabled={ro} aria-label="Who does it"
            onChange={e => set({ role: e.target.value || undefined })}>
            <option value="">Nobody named</option>
            {def.roles.map(r => <option key={r.key} value={r.key}>{r.name || r.key}</option>)}
          </select>
          {!def.roles.length && <span className="sub">Add the roles on the method first — the OEM’s fitter, the site engineer.</span>}
        </label>

        <label className="fw-f"><span className="field-label">Passes if — what it must show, agreed before the day</span>
          <Words value={step.passesIf ?? ''} label="Passes if" long onSave={v => set({ passesIf: v || undefined })} disabled={ro}
            placeholder="e.g. 60 packs a minute for two hours, under 1% rejects" /></label>

        <div className="fw-f fw-row3">
          <label><span className="field-label">Photos it needs</span><Num value={step.evidence?.photos} label="Photos it needs" disabled={ro}
            onSave={v => set({ evidence: { ...(step.evidence ?? {}), photos: v && v > 0 ? Math.round(v) : undefined } })} /></label>
          <label><span className="field-label">Files it needs</span><Num value={step.evidence?.files} label="Files it needs" disabled={ro}
            onSave={v => set({ evidence: { ...(step.evidence ?? {}), files: v && v > 0 ? Math.round(v) : undefined } })} /></label>
          <label><span className="field-label">Due — days from the start</span><Num value={step.dueDays} label="Due, days from the start" disabled={ro}
            onSave={v => set({ dueDays: v === undefined ? undefined : Math.max(0, Math.round(v)) })} /></label>
        </div>

        {earlier.length > 0 && (
          <div className="fw-f"><span className="field-label">Waits on</span>
            <div className="fw-checks">
              {earlier.map(e => (
                <label key={e.key} className="fw-check">
                  <input type="checkbox" disabled={ro} checked={(step.after ?? []).includes(e.key)}
                    onChange={ev => {
                      const now = new Set(step.after ?? []);
                      if (ev.target.checked) now.add(e.key); else now.delete(e.key);
                      set({ after: now.size ? [...now] : undefined });
                    }} />
                  <span>{e.title}<span className="sub"> · {e.stage}</span></span>
                </label>
              ))}
            </div>
          </div>
        )}

        {earlier.length > 0 && <RuleEditor def={def} earlier={earlier} rule={step.onlyIf} ro={ro} onChange={r => set({ onlyIf: r })} />}

        {step.answer === 'log' && <>
          <div className="fw-f fw-log-cols"><span className="field-label">What each entry asks — its columns</span>
            <BoxesEditor boxes={step.columns ?? []} one="column" ro={ro} onChange={columns => set({ columns: columns.length ? columns : undefined })} />
          </div>
          <AnalysesEditor step={step} ro={ro} earlier={(() => { const all = allSteps(def).map(r => r.step), at = all.findIndex(x => x.key === step.key); return at < 0 ? [] : all.slice(0, at).filter(x => x.answer === 'log'); })()}
            onChange={analyses => set({ analyses: analyses.length ? analyses : undefined })} />
          <label className="fw-f"><span className="field-label">Entries it needs before it can be done</span>
            <Num value={step.minEntries} label="Entries it needs" placeholder="1" disabled={ro} onSave={v => set({ minEntries: v && v > 1 ? Math.round(v) : undefined })} /></label>
        </>}

        <div className="fw-f"><span className="field-label">Boxes to fill in{step.answer === 'measure' ? ' — the readings and their limits' : step.answer === 'log' ? ' — once for the whole log, beside its entries' : ''}</span>
          {fields.length === 0 && <p className="sub">None — {step.answer === 'measure' ? 'a measurement needs at least one number.' : 'the step is answered without boxes.'}</p>}
          <BoxesEditor boxes={fields} one="box" ro={ro} newType={step.answer === 'measure' ? 'reading' : 'text'} onChange={next => set({ fields: next.length ? next : undefined })} />
        </div>

        <label className="fw-f"><span className="field-label">How to do it — a note for whoever does it</span>
          <Words value={step.help ?? ''} label="How to do it" long onSave={v => set({ help: v || undefined })} disabled={ro} /></label>

        {!ro && (
          <div className="fw-acts">
            <button type="button" className="btn btn-sm" onClick={() => onMove(-1)}>Move up</button>
            <button type="button" className="btn btn-sm" onClick={() => onMove(1)}>Move down</button>
            <span className="fw-gap" />
            <button type="button" className="btn btn-ghost btn-sm is-danger" onClick={onRemove}>Delete the step</button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------- a condition */

const blankOf = (type: FlowCondition['type'], id: string, stage: FlowStage, def: FlowDefinition): FlowCondition => {
  const steps = def.stages.flatMap(s => s.steps);
  const first = stage.steps[0]?.key ?? steps[0]?.key ?? '';
  switch (type) {
    case 'stepsDone': return { id, type, policy: 'block' };
    case 'stepDone': return { id, type, policy: 'block', step: first };
    case 'evidence': return { id, type, policy: 'block', step: first, kind: 'photo', min: 1 };
    case 'signedOff': return { id, type, policy: 'block', step: steps.find(s => s.answer === 'signoff')?.key ?? first };
    case 'fieldMeets': {
      const s = steps.find(x => numbersOf(x).length > 0);
      const f = s ? numbersOf(s)[0] : undefined;
      return { id, type, policy: 'block', step: s?.key ?? first, field: f?.key ?? '', op: '>=', value: 0 };
    }
    case 'measureMet': return { id, type, policy: 'block', measure: def.measures?.find(m => m.target !== undefined)?.key ?? def.measures?.[0]?.key ?? '' };
    case 'noOpenProblems': return { id, type, policy: 'block', priority: 'critical' };
    case 'dateReached': return { id, type, policy: 'warn', dueDays: 7 };
    case 'manual': return { id, type, policy: 'block', label: 'Checked and agreed' };
  }
};

/** A GATE'S CONDITION — what it is, and whether it stops the gate or warns. */
export function ConditionEditor({ def, stageIndex, cond, open, onClose, onSave, onRemove }: {
  def: FlowDefinition; stageIndex: number; cond?: FlowCondition; open: boolean; onClose: () => void;
  onSave: (c: FlowCondition) => void; onRemove?: () => void;
}) {
  const stage = def.stages[stageIndex];
  const ids = stage.gate.conditions.map(c => c.id);
  const [c, setC] = useState<FlowCondition>(() => cond ?? blankOf('stepsDone', keyOf('every-step', ids), stage, def));
  useEffect(() => { if (open) setC(cond ?? blankOf('stepsDone', keyOf('every-step', ids), stage, def)); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when opened
  /* the steps a gate may ask about: its own stage's and the stages before — never a later one's */
  const steps = def.stages.slice(0, stageIndex + 1).flatMap(s => s.steps);
  const numeric = (k: string) => { const st = steps.find(s => s.key === k); return st ? numbersOf(st) : []; };
  const put = (patch: Record<string, unknown>) => setC(x => ({ ...x, ...patch }) as FlowCondition);
  return (
    <Sheet open={open} onClose={onClose} title={cond ? 'Edit what the gate needs' : 'What the gate needs'}>
      <div className="fw-sheet fw-edit">
        <label className="fw-f"><span className="field-label">It needs</span>
          <select className="text-input fw-in" value={c.type} aria-label="What the gate needs"
            onChange={e => setC(blankOf(e.target.value as FlowCondition['type'], cond?.id ?? keyOf(e.target.value, ids), stage, def))}>
            {(Object.keys(CONDITION_WORD) as FlowCondition['type'][]).map(t => <option key={t} value={t}>{CONDITION_WORD[t]}</option>)}
          </select>
        </label>
        {'step' in c && (
          <label className="fw-f"><span className="field-label">Which step</span>
            <select className="text-input fw-in" value={c.step} aria-label="Which step" onChange={e => {
              const f = numeric(e.target.value)[0];
              put(c.type === 'fieldMeets' ? { step: e.target.value, field: f?.key ?? '' } : { step: e.target.value });
            }}>
              {steps.filter(s => c.type !== 'signedOff' || s.answer === 'signoff').filter(s => c.type !== 'fieldMeets' || numeric(s.key).length).map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
            </select>
          </label>
        )}
        {c.type === 'evidence' && (
          <div className="fw-f fw-row3">
            <label><span className="field-label">Of</span>
              <select className="text-input fw-in" value={c.kind} aria-label="Photos or files" onChange={e => put({ kind: e.target.value })}>
                <option value="photo">photos</option><option value="file">files</option>
              </select></label>
            <label><span className="field-label">At least</span><Num value={c.min} label="At least" onSave={v => put({ min: Math.max(1, Math.round(v ?? 1)) })} /></label>
          </div>
        )}
        {c.type === 'fieldMeets' && (
          <div className="fw-f fw-row3">
            <label><span className="field-label">The box</span>
              <select className="text-input fw-in" value={c.field} aria-label="Which box" onChange={e => put({ field: e.target.value })}>
                {numeric(c.step).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select></label>
            <label><span className="field-label">Is</span>
              <select className="text-input fw-in" value={c.op} aria-label="Is" onChange={e => put({ op: e.target.value })}>
                <option value=">=">at least</option><option value="<=">at most</option><option value="=">exactly</option><option value="between">between</option>
              </select></label>
            <label><span className="field-label">The figure</span><Num value={c.value} label="The figure" onSave={v => put({ value: v ?? 0 })} /></label>
            {c.op === 'between' && <label><span className="field-label">and</span><Num value={c.value2} label="and" onSave={v => put({ value2: v })} /></label>}
          </div>
        )}
        {c.type === 'measureMet' && (
          <label className="fw-f"><span className="field-label">Which measure</span>
            {(def.measures ?? []).length
              ? <select className="text-input fw-in" value={c.measure} aria-label="Which measure" onChange={e => put({ measure: e.target.value })}>
                {(def.measures ?? []).map(m => <option key={m.key} value={m.key}>{m.name}{m.target === undefined ? ' (no target yet)' : ''}</option>)}
              </select>
              : <span className="sub">The method measures nothing yet — add a measure under What it measures first.</span>}
          </label>
        )}
        {c.type === 'noOpenProblems' && (
          <label className="fw-f"><span className="field-label">Which problems</span>
            <select className="text-input fw-in" value={c.priority} aria-label="Which problems" onChange={e => put({ priority: e.target.value })}>
              <option value="critical">No critical problem open</option><option value="high">No high or critical problem open</option><option value="any">No problem open at all</option>
            </select></label>
        )}
        {c.type === 'dateReached' && (
          <label className="fw-f"><span className="field-label">Days from the start</span><Num value={c.dueDays} label="Days from the start" onSave={v => put({ dueDays: Math.max(0, Math.round(v ?? 0)) })} /></label>
        )}
        <label className="fw-f"><span className="field-label">{c.type === 'manual' ? 'What is checked' : 'In your words (optional)'}</span>
          <Words value={c.label ?? ''} label={c.type === 'manual' ? 'What is checked' : 'In your words'} onSave={v => put({ label: v || (c.type === 'manual' ? 'Checked and agreed' : undefined) })} /></label>
        <div className="fw-f"><span className="field-label">If it is not met</span>
          <div className="fw-seg" role="radiogroup" aria-label="Block or warn">
            <button type="button" role="radio" aria-checked={c.policy === 'block'} className={'fw-seg-b' + (c.policy === 'block' ? ' on' : '')} onClick={() => put({ policy: 'block' })}>The gate waits</button>
            <button type="button" role="radio" aria-checked={c.policy === 'warn'} className={'fw-seg-b' + (c.policy === 'warn' ? ' on' : '')} onClick={() => put({ policy: 'warn' })}>It warns, and can pass</button>
          </div>
          <span className="sub">{c.policy === 'block' ? 'Only the owner can pass it then, with a reason that is kept.' : 'The gate can pass; the pass says it was open.'}</span>
        </div>
        <div className="fw-acts">
          <button type="button" className="btn btn-primary" onClick={() => { onSave(c); onClose(); }}>{cond ? 'Save' : 'Add it to the gate'}</button>
          <span className="fw-gap" />
          {onRemove && <button type="button" className="btn btn-ghost btn-sm is-danger" onClick={() => { onRemove(); onClose(); }}>Take it off the gate</button>}
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------ a measure */

/** WHAT IT MEASURES — a number the work has to move: its name, which way is
 *  better, its target, and the step boxes or tool figures that feed it. */
export function MeasureEditor({ def, measure, open, onClose, onSave, onRemove }: {
  def: FlowDefinition; measure?: FlowMeasure; open: boolean; onClose: () => void; onSave: (m: FlowMeasure) => void; onRemove?: () => void;
}) {
  const fresh = (): FlowMeasure => ({ key: measureKeyOf('a measure', (def.measures ?? []).map(m => m.key)), name: 'A measure', better: 'lower', from: [] });
  const [m, setM] = useState<FlowMeasure>(() => measure ?? fresh());
  useEffect(() => { if (open) setM(measure ?? fresh()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when opened
  const sources = allSteps(def).flatMap(r => numbersOf(r.step).map(f => ({ step: r.step.key, field: f.key, says: `${f.label}${f.unit ? ` (${f.unit})` : ''} — “${r.step.title}”, ${r.stage.name}` })));
  const on = (s: { step: string; field: string }) => m.from.some(f => f.step === s.step && f.field === s.field);
  return (
    <Sheet open={open} onClose={onClose} title={measure ? 'Edit the measure' : 'What it measures'}>
      <div className="fw-sheet fw-edit">
        <label className="fw-f"><span className="field-label">The number</span>
          <Words value={m.name} label="The measure's name" placeholder="e.g. Changeover minutes" onSave={v => { if (v) setM(x => ({ ...x, name: v, ...(measure ? {} : { key: measureKeyOf(v, (def.measures ?? []).map(y => y.key)) }) })); }} /></label>
        <div className="fw-f fw-row3">
          <label><span className="field-label">Unit</span><Words value={m.unit ?? ''} label="The measure's unit" placeholder="min, packs, %" onSave={v => setM(x => { const y = { ...x, unit: v || undefined }; if (!v) delete y.unit; return y; })} /></label>
          <label><span className="field-label">Better is</span>
            <select className="text-input fw-in" value={m.better} aria-label="Better is" onChange={e => setM(x => ({ ...x, better: e.target.value === 'higher' ? 'higher' : 'lower' }))}>
              <option value="lower">lower</option><option value="higher">higher</option>
            </select></label>
          <label><span className="field-label">Target</span><Num value={m.target} label="The target" onSave={v => setM(x => { const y = { ...x, target: v }; if (v === undefined) delete y.target; return y; })} /></label>
        </div>
        <div className="fw-f"><span className="field-label">Read from — the first reading is the before, the latest is now</span>
          {sources.length === 0 && <p className="sub">No step has a number yet — give a step a number box, or a tool, first.</p>}
          <div className="fw-checks">
            {sources.map(s => (
              <label key={`${s.step}/${s.field}`} className="fw-check">
                <input type="checkbox" checked={on(s)} onChange={e => setM(x => ({ ...x, from: e.target.checked ? [...x.from, { step: s.step, field: s.field }] : x.from.filter(f => !(f.step === s.step && f.field === s.field)) }))} />
                <span>{s.says}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="fw-acts">
          <button type="button" className="btn btn-primary" disabled={!m.from.length || !m.name.trim()} onClick={() => { onSave(m); onClose(); }}>{measure ? 'Save' : 'Add the measure'}</button>
          <span className="fw-gap" />
          {onRemove && <button type="button" className="btn btn-ghost btn-sm is-danger" onClick={() => { onRemove(); onClose(); }}>Take it off the method</button>}
        </div>
      </div>
    </Sheet>
  );
}
