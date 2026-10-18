/* IS THIS A METHOD THE APP CAN RUN? — the one check every definition passes
 * before it is saved, approved, started or changed, whoever wrote it.
 *
 * A definition arrives from a form, from the cloud, or from the assistant's
 * proposal; all three are read here as unknown data. What comes out is
 * rebuilt field by field from the closed vocabulary (lib/flow/definition):
 * anything the app does not know is dropped, never stored, so a proposal
 * cannot smuggle a property in. Every reference — a step a gate names, a
 * field a formula reads, a role a step is given — is checked to exist, and
 * every problem is said in words a person can act on ("Stage 3, step 2 has
 * no title"), because the review screen shows them. */
import {
  ANSWERS, CONDITIONS, FIELD_TYPES, FLOW_SCHEMA, KEY_RE, LIMITS, numbersOf,
  type FlowAnswer, type FlowCondition, type FlowDefinition, type FlowField, type FlowMeasure, type FlowRole,
  type FlowStage, type FlowStepDef, type FieldType,
} from './definition';
import { FormulaError, formulaRefs, parseFormula } from './formula';
import { componentOf } from './components';

export interface Issue { path: string; message: string }
export interface Checked {
  ok: boolean;
  /** The definition as the app will keep it — present when ok. */
  def?: FlowDefinition;
  errors: Issue[];
  warnings: Issue[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max: number = LIMITS.text): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const optStr = (v: unknown, max: number = LIMITS.text): string | undefined => { const s = str(v, max); return s || undefined; };
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** The property when there is a value, else nothing — so an empty field is
 *  absent, not blank. */
const maybe = <K extends string, V>(k: K, v: V | undefined): Partial<Record<K, V>> =>
  (v === undefined ? {} : { [k]: v } as Record<K, V>);
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list as readonly unknown[]).includes(v) ? v as T : fallback;

const ordinal = (i: number) => `${i + 1}`;

/** Read, rebuild and check a definition. */
export function validateDefinition(input: unknown): Checked {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (path: string, message: string) => { errors.push({ path, message }); };
  const warn = (path: string, message: string) => { warnings.push({ path, message }); };

  if (!isObj(input)) return { ok: false, errors: [{ path: '', message: 'This is not a method definition.' }], warnings };
  if (input.schema !== undefined && input.schema !== FLOW_SCHEMA) err('schema', `It was written for version ${String(input.schema)} of the format; this app reads version ${FLOW_SCHEMA}.`);

  const name = str(input.name);
  if (!name) err('name', 'The method has no name.');
  const purpose = str(input.purpose, LIMITS.longText);
  if (!purpose) warn('purpose', 'Say in a sentence what the method is for — it is the first line people read.');
  const kind = oneOf(input.kind, ['stagegate', 'investigation', 'improvement', 'other'] as const, 'other');

  /* ---- roles ---- */
  const roles: FlowRole[] = [];
  const roleKeys = new Set<string>();
  arr(input.roles).slice(0, LIMITS.roles + 1).forEach((r, i) => {
    const p = `roles[${i}]`;
    if (!isObj(r)) { err(p, `Role ${ordinal(i)} is not readable.`); return; }
    const key = str(r.key, 40), rname = str(r.name);
    if (!KEY_RE.test(key)) { err(`${p}.key`, `Role ${ordinal(i)}${rname ? ` (${rname})` : ''} needs a short key of lower-case letters and numbers.`); return; }
    if (roleKeys.has(key)) { err(`${p}.key`, `Two roles share the key "${key}".`); return; }
    if (!rname) err(`${p}.name`, `Role "${key}" has no name.`);
    roleKeys.add(key);
    const side = r.side === 'supplier' || r.side === 'site' ? r.side : undefined;
    roles.push({ key, name: rname, ...(side ? { side } : {}), ...maybe('note', optStr(r.note)) });
  });
  if (arr(input.roles).length > LIMITS.roles) err('roles', `A method may have at most ${LIMITS.roles} roles.`);

  /* ---- stages and steps ---- */
  const rawStages = arr(input.stages);
  if (!rawStages.length) err('stages', 'The method has no stages.');
  if (rawStages.length > LIMITS.stages) err('stages', `A method may have at most ${LIMITS.stages} stages.`);
  const stageKeys = new Set<string>();
  const stepIndex = new Map<string, { stage: number; step: FlowStepDef }>();
  const stages: FlowStage[] = [];

  rawStages.slice(0, LIMITS.stages).forEach((s, si) => {
    const sp = `stages[${si}]`;
    const where = `Stage ${ordinal(si)}`;
    if (!isObj(s)) { err(sp, `${where} is not readable.`); return; }
    const key = str(s.key, 40), sname = str(s.name);
    if (!KEY_RE.test(key)) err(`${sp}.key`, `${where}${sname ? ` (${sname})` : ''} needs a short key of lower-case letters and numbers.`);
    else if (stageKeys.has(key)) err(`${sp}.key`, `Two stages share the key "${key}".`);
    stageKeys.add(key);
    if (!sname) err(`${sp}.name`, `${where} has no name.`);

    const rawSteps = arr(s.steps);
    if (rawSteps.length > LIMITS.stepsPerStage) err(`${sp}.steps`, `${where} has more than ${LIMITS.stepsPerStage} steps.`);
    const steps: FlowStepDef[] = [];
    rawSteps.slice(0, LIMITS.stepsPerStage).forEach((t, ti) => {
      const tp = `${sp}.steps[${ti}]`;
      const twhere = `${where}, step ${ordinal(ti)}`;
      if (!isObj(t)) { err(tp, `${twhere} is not readable.`); return; }
      const tkey = str(t.key, 40), title = str(t.title);
      if (!title) err(`${tp}.title`, `${twhere} has no title.`);
      if (!KEY_RE.test(tkey)) { err(`${tp}.key`, `${twhere}${title ? ` (${title})` : ''} needs a short key of lower-case letters and numbers.`); return; }
      if (stepIndex.has(tkey)) { err(`${tp}.key`, `Two steps share the key "${tkey}" — every step's key is unique across the method.`); return; }
      const answer = oneOf<FlowAnswer>(t.answer, ANSWERS, 'done');
      if (t.answer !== undefined && t.answer !== answer) err(`${tp}.answer`, `${twhere} (${title}) has an answer the app does not know: "${String(t.answer)}".`);
      const per = t.per === 'machine' ? 'machine' : 'line';
      const role = optStr(t.role, 40);
      if (role && !roleKeys.has(role)) err(`${tp}.role`, `${twhere} (${title}) is given to a role that is not on the method: "${role}".`);

      const fields = readFields(t.fields, tp, `${twhere} (${title || tkey})`, err);
      if (answer === 'form' && !fields.length) warn(`${tp}.fields`, `${twhere} (${title}) is a form with no fields — it will read as a tick.`);

      const ev = isObj(t.evidence) ? t.evidence : {};
      const photos = num(ev.photos), files = num(ev.files);
      const evidence = {
        ...(photos && photos > 0 ? { photos: Math.min(20, Math.round(photos)) } : {}),
        ...(files && files > 0 ? { files: Math.min(20, Math.round(files)) } : {}),
      };
      const dueDays = num(t.dueDays);
      if (dueDays !== undefined && (dueDays < 0 || dueDays > 3650)) err(`${tp}.dueDays`, `${twhere} (${title}) is due ${dueDays} days from the start — say a number of days between 0 and 3650.`);
      const after = arr(t.after).map(a => str(a, 40)).filter(Boolean);
      let component: FlowStepDef['component'];
      if (isObj(t.component)) {
        const tool = str(t.component.tool, 40);
        if (!componentOf(tool)) err(`${tp}.component`, `${twhere} (${title}) uses a tool the app does not have: "${tool}".`);
        else component = { tool, ...maybe('note', optStr(t.component.note)) };
      }
      /* measured: a box with a number, or a tool that fills one */
      if (answer === 'measure' && !numbersOf({ fields, ...(component ? { component } : {}) } as FlowStepDef).length) {
        err(`${tp}.fields`, `${twhere} (${title}) is measured but has no number to measure.`);
      }

      const step: FlowStepDef = {
        key: tkey, title, per, answer,
        ...(role ? { role } : {}),
        ...maybe('passesIf', optStr(t.passesIf, LIMITS.longText)),
        ...(fields.length ? { fields } : {}),
        ...(Object.keys(evidence).length ? { evidence } : {}),
        ...(dueDays !== undefined && dueDays >= 0 ? { dueDays: Math.round(dueDays) } : {}),
        ...(after.length ? { after } : {}),
        ...(component ? { component } : {}),
        ...maybe('help', optStr(t.help, LIMITS.longText)),
      };
      stepIndex.set(tkey, { stage: si, step });
      steps.push(step);
    });

    stages.push({
      key, name: sname, steps,
      ...maybe('purpose', optStr(s.purpose, LIMITS.longText)),
      gate: { conditions: [] },
    });
  });

  /* ---- dependencies: they exist, come no later, and go round no circle ---- */
  for (const [k, { stage, step }] of stepIndex) {
    for (const a of step.after ?? []) {
      const dep = stepIndex.get(a);
      if (!dep) err(`step:${k}.after`, `"${step.title}" waits on a step that is not on the method: "${a}".`);
      else if (dep.stage > stage) err(`step:${k}.after`, `"${step.title}" waits on "${dep.step.title}", which is in a later stage.`);
      else if (a === k) err(`step:${k}.after`, `"${step.title}" waits on itself.`);
    }
  }
  const cyc = findCycle(stepIndex);
  if (cyc) err('after', `These steps wait on each other in a circle: ${cyc.map(k => `"${stepIndex.get(k)?.step.title ?? k}"`).join(' → ')}.`);

  /* ---- what it measures: each fed by numbers the method really has ---- */
  const measures: FlowMeasure[] = [];
  const rawMeasures = arr(input.measures);
  if (rawMeasures.length > LIMITS.measures) err('measures', `A method may have at most ${LIMITS.measures} measures.`);
  rawMeasures.slice(0, LIMITS.measures).forEach((m, mi) => {
    const mp = `measures[${mi}]`;
    if (!isObj(m)) { err(mp, `Measure ${ordinal(mi)} is not readable.`); return; }
    const key = str(m.key, 40), mname = str(m.name);
    const mw = `The measure ${mname ? `“${mname}”` : ordinal(mi)}`;
    if (!KEY_RE.test(key)) { err(`${mp}.key`, `${mw} needs a short key of lower-case letters and numbers.`); return; }
    if (measures.some(x => x.key === key)) { err(`${mp}.key`, `Two measures share the key "${key}".`); return; }
    if (!mname) err(`${mp}.name`, `Measure "${key}" has no name.`);
    const better = m.better === 'lower' ? 'lower' : 'higher';
    const target = num(m.target);
    const from: FlowMeasure['from'] = [];
    for (const f of arr(m.from).slice(0, 20)) {
      if (!isObj(f)) continue;
      const sk = str(f.step, 40), fk = str(f.field, 40);
      const st = stepIndex.get(sk)?.step;
      if (!st) { err(`${mp}.from`, `${mw} is fed by a step that is not on the method: "${sk}".`); continue; }
      if (!numbersOf(st).some(x => x.key === fk)) { err(`${mp}.from`, `${mw} is fed by "${fk}", which is not a number on “${st.title}”.`); continue; }
      if (!from.some(x => x.step === sk && x.field === fk)) from.push({ step: sk, field: fk });
    }
    if (!from.length) err(`${mp}.from`, `${mw} is not fed by any step — say which step's number it reads.`);
    measures.push({ key, name: mname, better, from, ...maybe('unit', optStr(m.unit, 40)), ...maybe('target', target) });
  });

  /* ---- gates ---- */
  rawStages.slice(0, LIMITS.stages).forEach((s, si) => {
    const stage = stages[si];
    if (!stage || !isObj(s)) return;
    const gp = `stages[${si}].gate`;
    const gwhere = `${stage.name || `Stage ${ordinal(si)}`}'s gate`;
    const rawConds = arr(isObj(s.gate) ? s.gate.conditions : undefined);
    if (rawConds.length > LIMITS.conditionsPerGate) err(gp, `${gwhere} has more than ${LIMITS.conditionsPerGate} conditions.`);
    const ids = new Set<string>();
    rawConds.slice(0, LIMITS.conditionsPerGate).forEach((c, ci) => {
      const cp = `${gp}.conditions[${ci}]`;
      const cw = `${gwhere}, condition ${ordinal(ci)}`;
      if (!isObj(c)) { err(cp, `${cw} is not readable.`); return; }
      const type = c.type as string;
      if (!(CONDITIONS as readonly string[]).includes(type)) { err(`${cp}.type`, `${cw} is a kind of condition the app does not know: "${String(c.type)}".`); return; }
      let id = str(c.id, 40);
      if (!KEY_RE.test(id) || ids.has(id)) id = `${type.toLowerCase()}-${ci + 1}`;
      ids.add(id);
      const policy = c.policy === 'warn' ? 'warn' : 'block';
      const label = optStr(c.label);
      const base = { id, policy, ...(label ? { label } : {}) } as const;
      const stepHere = (key: unknown, what: string): FlowStepDef | undefined => {
        const k = str(key, 40);
        const found = stepIndex.get(k);
        if (!found) { err(`${cp}.step`, `${cw} ${what} a step that is not on the method: "${k}".`); return undefined; }
        if (found.stage > si) { err(`${cp}.step`, `${cw} ${what} "${found.step.title}", which comes in a later stage.`); return undefined; }
        return found.step;
      };
      let cond: FlowCondition | undefined;
      switch (type) {
        case 'stepsDone':
          if (!stage.steps.length) warn(cp, `${cw} needs every step done, and the stage has none.`);
          cond = { ...base, type: 'stepsDone' };
          break;
        case 'stepDone': { const st = stepHere(c.step, 'needs'); if (st) cond = { ...base, type: 'stepDone', step: st.key }; break; }
        case 'signedOff': {
          const st = stepHere(c.step, 'needs the sign-off of');
          if (st && st.answer !== 'signoff') err(`${cp}.step`, `${cw} needs "${st.title}" signed, but that step is not a sign-off.`);
          if (st) cond = { ...base, type: 'signedOff', step: st.key };
          break;
        }
        case 'evidence': {
          const st = stepHere(c.step, 'needs the evidence of');
          const kindE = c.kind === 'file' ? 'file' : 'photo';
          const min = Math.max(1, Math.min(20, Math.round(num(c.min) ?? 1)));
          if (st) cond = { ...base, type: 'evidence', step: st.key, kind: kindE, min };
          break;
        }
        case 'fieldMeets': {
          const st = stepHere(c.step, 'reads');
          const op = oneOf(c.op, ['>=', '<=', '=', 'between'] as const, '>=');
          const value = num(c.value), value2 = num(c.value2);
          if (value === undefined) err(`${cp}.value`, `${cw} has no number to meet.`);
          if (op === 'between' && value2 === undefined) err(`${cp}.value2`, `${cw} needs a second number for "between".`);
          const fkey = str(c.field, 40);
          /* a box typed on the step, or a figure its tool fills (lib/flow/components) */
          const field = st ? numbersOf(st).find(f => f.key === fkey) ?? st.fields?.find(f => f.key === fkey) : undefined;
          if (st && !field) err(`${cp}.field`, `${cw} reads a field "${fkey}" that "${st.title}" does not have.`);
          else if (field && !['number', 'reading', 'calc'].includes(field.type)) err(`${cp}.field`, `${cw} compares "${field.label}", which is not a number.`);
          if (st && field && value !== undefined) cond = { ...base, type: 'fieldMeets', step: st.key, field: field.key, op, value, ...(op === 'between' && value2 !== undefined ? { value2 } : {}) };
          break;
        }
        case 'measureMet': {
          const mk = str(c.measure, 40);
          const m = measures.find(x => x.key === mk);
          if (!m) err(`${cp}.measure`, `${cw} needs a measure that is not on the method: "${mk}".`);
          else if (m.target === undefined) err(`${cp}.measure`, `${cw} needs “${m.name}” to meet its target, and it has none — give the measure a target.`);
          else cond = { ...base, type: 'measureMet', measure: m.key };
          break;
        }
        case 'noOpenProblems':
          cond = { ...base, type: 'noOpenProblems', priority: oneOf(c.priority, ['critical', 'high', 'any'] as const, 'critical') };
          break;
        case 'dateReached': {
          const d = num(c.dueDays);
          if (d === undefined || d < 0) err(`${cp}.dueDays`, `${cw} needs a number of days from the start.`);
          else cond = { ...base, type: 'dateReached', dueDays: Math.round(d) };
          break;
        }
        case 'manual': {
          const l = str(c.label);
          if (!l) err(`${cp}.label`, `${cw} is a check with nothing said to check.`);
          else cond = { ...base, type: 'manual', label: l };
          break;
        }
      }
      if (cond) stage.gate.conditions.push(cond);
    });
    if (!stage.gate.conditions.length && stage.steps.length) {
      warn(gp, `${gwhere} needs nothing — it can be passed at any time. Add "every step done" if the stage must be finished first.`);
    }
  });

  if (!roles.length) warn('roles', 'No roles are named — nobody will be asked to do anything by name.');
  const def: FlowDefinition = { schema: FLOW_SCHEMA, name, purpose, kind, roles, stages, ...(measures.length ? { measures } : {}) };
  return errors.length ? { ok: false, errors, warnings } : { ok: true, def, errors, warnings };
}

function readFields(raw: unknown, tp: string, twhere: string, err: (p: string, m: string) => void): FlowField[] {
  const list = arr(raw);
  if (list.length > LIMITS.fieldsPerStep) err(`${tp}.fields`, `${twhere} has more than ${LIMITS.fieldsPerStep} fields.`);
  const fields: FlowField[] = [];
  const keys = new Set<string>();
  list.slice(0, LIMITS.fieldsPerStep).forEach((f, fi) => {
    const fp = `${tp}.fields[${fi}]`;
    if (!isObj(f)) { err(fp, `${twhere}, field ${ordinal(fi)} is not readable.`); return; }
    const key = str(f.key, 40), label = str(f.label);
    if (!KEY_RE.test(key)) { err(`${fp}.key`, `${twhere}, field ${ordinal(fi)}${label ? ` (${label})` : ''} needs a short key of lower-case letters and numbers.`); return; }
    if (keys.has(key)) { err(`${fp}.key`, `${twhere} has two fields with the key "${key}".`); return; }
    keys.add(key);
    if (!label) err(`${fp}.label`, `${twhere}, field "${key}" has no label.`);
    const type = oneOf<FieldType>(f.type, FIELD_TYPES, 'text');
    if (f.type !== undefined && f.type !== type) err(`${fp}.type`, `${twhere}, field "${label || key}" is a kind the app does not know: "${String(f.type)}".`);
    const min = num(f.min), max = num(f.max);
    if (min !== undefined && max !== undefined && min > max) err(fp, `${twhere}, "${label}" must be at least ${min} and at most ${max} — the lower limit is above the upper.`);
    const options = arr(f.options).map(o => str(o, 80)).filter(Boolean).slice(0, 30);
    if (type === 'choice' && options.length < 2) err(`${fp}.options`, `${twhere}, "${label}" is a choice with fewer than two options.`);
    const formula = optStr(f.formula);
    if (type === 'calc' && !formula) err(`${fp}.formula`, `${twhere}, "${label}" is worked out but has no formula.`);
    fields.push({
      key, label, type,
      ...maybe('unit', optStr(f.unit, 40)),
      ...((type === 'reading' || type === 'number') && min !== undefined ? { min } : {}),
      ...((type === 'reading' || type === 'number') && max !== undefined ? { max } : {}),
      ...(type === 'choice' ? { options } : {}),
      ...(type === 'calc' && formula ? { formula } : {}),
      ...(f.required === true && type !== 'calc' ? { required: true } : {}),
      ...maybe('help', optStr(f.help, LIMITS.longText)),
    });
  });
  /* formulas read this step's numbers only, and no circle */
  const numeric = new Map(fields.filter(f => f.type === 'number' || f.type === 'reading' || f.type === 'calc').map(f => [f.key, f]));
  const deps = new Map<string, string[]>();
  for (const f of fields) {
    if (f.type !== 'calc' || !f.formula) continue;
    try {
      const refs = formulaRefs(parseFormula(f.formula));
      for (const r of refs) {
        if (!numeric.has(r)) err(`${tp}.fields`, `${twhere}, "${f.label}" works out from "${r}", which is not a number on this step.`);
      }
      deps.set(f.key, refs);
    } catch (e) {
      err(`${tp}.fields`, `${twhere}, "${f.label}": ${e instanceof FormulaError ? e.message : 'the formula cannot be read.'}`);
    }
  }
  const seen = new Set<string>(), stack = new Set<string>();
  const visit = (k: string): boolean => {
    if (stack.has(k)) return true;
    if (seen.has(k)) return false;
    seen.add(k); stack.add(k);
    const bad = (deps.get(k) ?? []).some(visit);
    stack.delete(k);
    return bad;
  };
  for (const k of deps.keys()) if (visit(k)) { err(`${tp}.fields`, `${twhere} has worked-out fields that depend on each other in a circle.`); break; }
  return fields;
}

function findCycle(index: Map<string, { step: FlowStepDef }>): string[] | undefined {
  const state = new Map<string, 1 | 2>();
  const path: string[] = [];
  const visit = (k: string): string[] | undefined => {
    if (state.get(k) === 1) return [...path.slice(path.indexOf(k)), k];
    if (state.get(k) === 2) return undefined;
    state.set(k, 1); path.push(k);
    for (const a of index.get(k)?.step.after ?? []) {
      if (!index.has(a)) continue;
      const c = visit(a);
      if (c) return c;
    }
    path.pop(); state.set(k, 2);
    return undefined;
  };
  for (const k of index.keys()) { const c = visit(k); if (c) return c; }
  return undefined;
}

/** The errors as a sentence for a banner. */
export const issuesSaid = (issues: Issue[], max = 3): string =>
  issues.length === 0 ? '' : issues.slice(0, max).map(i => i.message).join(' ') + (issues.length > max ? ` And ${issues.length - max} more.` : '');
