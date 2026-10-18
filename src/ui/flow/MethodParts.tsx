/* THE PARTS OF A METHOD, ON A SCREEN — a step and a gate's condition, each
 * read in words, and written in a sheet while the method is a draft
 * (screens/MethodScreen). Every box commits when the person is done with it
 * (Enter or leaving it), never a write per keystroke; the validator
 * (lib/flow/validate) then says what is still wrong with the whole. */
import { useEffect, useState } from 'react';
import {
  ANSWERS, ANSWER_WORD, FIELD_TYPES, FIELD_WORD, fieldKeyOf, keyOf, roleName,
  type FlowCondition, type FlowDefinition, type FlowField, type FlowStage, type FlowStepDef,
} from '../../lib/flow/definition';
import { Sheet } from '../Sheet';

/** What each answer asks of the person on the floor. */
export const ANSWER_SAYS: Record<FlowStepDef['answer'], string> = {
  done: 'A task — done, or it hit a problem.',
  check: 'A test — passed, or did not pass.',
  paperwork: 'Here they are — at least one file or photo.',
  signoff: 'Signed — always asks who signed.',
  measure: 'Numbers against their limits — passes, or does not.',
  form: 'The step’s boxes, filled in.',
};

export const CONDITION_WORD: Record<FlowCondition['type'], string> = {
  stepsDone: 'Every step in the stage done',
  stepDone: 'One step done',
  evidence: 'A step has its photos or files',
  signedOff: 'A sign-off signed',
  fieldMeets: 'A measurement meets a figure',
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
      const f = def.stages.flatMap(s => s.steps).find(s => s.key === c.step)?.fields?.find(x => x.key === c.field);
      const u = f?.unit ? ` ${f.unit}` : '';
      const op = c.op === '>=' ? `at least ${c.value}${u}` : c.op === '<=' ? `at most ${c.value}${u}` : c.op === '=' ? `exactly ${c.value}${u}` : `between ${c.value} and ${c.value2 ?? c.value}${u}`;
      return `“${title(c.step)}”: ${f?.label ?? c.field} ${op}`;
    }
    case 'noOpenProblems': return c.priority === 'any' ? 'No open problems' : c.priority === 'critical' ? 'No open critical problems' : 'No open high or critical problems';
    case 'dateReached': return `Not before ${c.dueDays} day${c.dueDays === 1 ? '' : 's'} from the start`;
    case 'manual': return c.label;
  }
}

/** A step in one line of words — under its title in the method. */
export function stepSaid(def: FlowDefinition, s: FlowStepDef): string {
  const parts = [
    s.per === 'machine' ? 'every machine' : 'once',
    ANSWER_WORD[s.answer].toLowerCase(),
    s.role ? roleName(def, s.role) ?? s.role : '',
    s.evidence?.photos ? `${s.evidence.photos} photo${s.evidence.photos === 1 ? '' : 's'}` : '',
    s.evidence?.files ? `${s.evidence.files} file${s.evidence.files === 1 ? '' : 's'}` : '',
    s.fields?.length ? `${s.fields.length} box${s.fields.length === 1 ? '' : 'es'}` : '',
    s.dueDays !== undefined ? `due day ${s.dueDays}` : '',
    s.after?.length ? `after ${s.after.map(a => `“${def.stages.flatMap(x => x.steps).find(x => x.key === a)?.title ?? a}”`).join(', ')}` : '',
  ];
  return parts.filter(Boolean).join(' · ');
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
  const setField = (i: number, patch: Partial<FlowField>) => {
    const next = fields.map((f, j) => {
      if (j !== i) return f;
      const g: FlowField = { ...f, ...patch };
      for (const k of Object.keys(patch) as (keyof FlowField)[]) if (patch[k] === undefined) delete g[k];
      return g;
    });
    set({ fields: next });
  };
  const addField = () => {
    const key = fieldKeyOf(`box ${fields.length + 1}`, fields.map(f => f.key));
    set({ fields: [...fields, { key, label: `Box ${fields.length + 1}`, type: step.answer === 'measure' ? 'reading' : 'text' }] });
  };
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
              /* a measurement needs a number to measure: give it one to start */
              set(answer === 'measure' && !fields.some(f => f.type === 'reading' || f.type === 'number')
                ? { answer, fields: [...fields, { key: fieldKeyOf('reading', fields.map(f => f.key)), label: 'Reading', type: 'reading', required: true }] }
                : { answer });
            }}>
            {ANSWERS.map(a => <option key={a} value={a}>{ANSWER_WORD[a]}</option>)}
          </select>
          <span className="sub">{ANSWER_SAYS[step.answer]}</span>
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

        <div className="fw-f"><span className="field-label">Boxes to fill in{step.answer === 'measure' ? ' — the readings and their limits' : ''}</span>
          {fields.length === 0 && <p className="sub">None — {step.answer === 'measure' ? 'a measurement needs at least one number.' : 'the step is answered without boxes.'}</p>}
          {fields.map((f, i) => (
            <div key={f.key} className="fw-field" data-field={f.key}>
              <div className="fw-field-r">
                <Words value={f.label} label={`Box ${i + 1}'s name`} onSave={v => { if (v) setField(i, { label: v }); }} disabled={ro} />
                <select className="text-input fw-in" value={f.type} disabled={ro} aria-label={`Box ${i + 1}'s kind`}
                  onChange={e => setField(i, { type: e.target.value as FlowField['type'] })}>
                  {FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_WORD[t]}</option>)}
                </select>
                {!ro && <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove box ${f.label}`} onClick={() => set({ fields: fields.filter((_, j) => j !== i) })}>Remove</button>}
              </div>
              {(f.type === 'number' || f.type === 'reading' || f.type === 'calc') && (
                <div className="fw-field-r">
                  <Words value={f.unit ?? ''} label={`${f.label}'s unit`} placeholder="unit — packs/min, mm" onSave={v => setField(i, { unit: v || undefined })} disabled={ro} />
                  {f.type !== 'calc' && <Num value={f.min} label={`${f.label}: at least`} placeholder="at least" onSave={v => setField(i, { min: v })} disabled={ro} />}
                  {f.type !== 'calc' && <Num value={f.max} label={`${f.label}: at most`} placeholder="at most" onSave={v => setField(i, { max: v })} disabled={ro} />}
                </div>
              )}
              {f.type === 'calc' && (
                <div className="fw-field-r">
                  <Words value={f.formula ?? ''} label={`${f.label}'s sum`} placeholder={`e.g. ${fields.filter(x => x.type === 'number' || x.type === 'reading').map(x => x.key).slice(0, 2).join(' / ') || 'packs / minutes'}`}
                    onSave={v => setField(i, { formula: v || undefined })} disabled={ro} />
                  <span className="sub">Worked out by the app from the boxes, by their keys: {fields.filter(x => x.key !== f.key && x.type !== 'text').map(x => x.key).join(', ') || 'none yet'}.</span>
                </div>
              )}
              {f.type === 'choice' && (
                <div className="fw-field-r">
                  <Words value={(f.options ?? []).join(', ')} label={`${f.label}'s options`} placeholder="options, separated by commas"
                    onSave={v => setField(i, { options: v ? v.split(',').map(x => x.trim()).filter(Boolean) : undefined })} disabled={ro} />
                </div>
              )}
              {f.type !== 'calc' && (
                <label className="fw-check"><input type="checkbox" disabled={ro} checked={!!f.required} onChange={e => setField(i, { required: e.target.checked || undefined })} />
                  <span>Must be filled before it is done</span></label>
              )}
            </div>
          ))}
          {!ro && <button type="button" className="btn btn-sm" onClick={addField}>Add a box</button>}
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
      const s = steps.find(x => (x.fields ?? []).some(f => f.type === 'number' || f.type === 'reading' || f.type === 'calc'));
      const f = s?.fields?.find(x => x.type === 'number' || x.type === 'reading' || x.type === 'calc');
      return { id, type, policy: 'block', step: s?.key ?? first, field: f?.key ?? '', op: '>=', value: 0 };
    }
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
  const numeric = (k: string) => (steps.find(s => s.key === k)?.fields ?? []).filter(f => f.type === 'number' || f.type === 'reading' || f.type === 'calc');
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
