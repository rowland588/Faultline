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
  ANSWERS, CONDITIONS, FIELD_TYPES, FLOW_SCHEMA, KEY_RE, LIMITS, RULE_OPS, TIMER_UNITS, isNumberBox, isTypedNumber, numbersOf,
  type FlowAnswer, type FlowCondition, type FlowDefinition, type FlowField, type FlowMeasure, type FlowNeed, type FlowRole, type FlowRule,
  type FlowStage, type FlowStepDef, type FieldType,
} from './definition';
import { ANALYSIS_BLOCKS, BLOCKS, WHEN_OPS, blockOf, isGroupColumn, isNumberColumn, type FlowAnalysis, type FlowWhen } from './analysis';
/* the blocks that read a target, said from the registry — so a new one is named the day it is written */
const TARGET_READERS = (() => {
  const names = ANALYSIS_BLOCKS.filter(id => BLOCKS[id].needs.target !== 'none').map(id => BLOCKS[id].name.toLowerCase());
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? 'none';
})();
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

      /* a log: what each entry asks, and what the entries add up to */
      const columns = answer === 'log' ? readFields(t.columns, tp, `${twhere} (${title || tkey})`, err, 'columns', 'column') : [];
      if (answer === 'log' && !columns.length) err(`${tp}.columns`, `${twhere} (${title}) is a log with no columns — say what each entry asks.`);
      const analyses = answer === 'log' ? readAnalyses(t.analyses, columns, fields, tp, `${twhere} (${title || tkey})`, err) : [];
      if (answer === 'log' && columns.length && !analyses.length) warn(`${tp}.analyses`, `${twhere} (${title}) logs entries but works nothing out from them — add an analysis (a total, a Pareto, a trend…).`);
      const minEntries = answer === 'log' ? num(t.minEntries) : undefined;
      if (minEntries !== undefined && (minEntries < 1 || minEntries > 10000)) err(`${tp}.minEntries`, `${twhere} (${title}) needs ${minEntries} entries — say a number from 1 to 10000.`);

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

      /* a decision on what is found — read here, checked against the step it reads below */
      let onlyIf: FlowRule | undefined;
      if (isObj(t.onlyIf)) {
        const op = t.onlyIf.op;
        const value = typeof t.onlyIf.value === 'boolean' ? t.onlyIf.value : num(t.onlyIf.value) ?? optStr(t.onlyIf.value, 80);
        if (!(RULE_OPS as readonly unknown[]).includes(op)) err(`${tp}.onlyIf`, `${twhere} (${title}) is decided with "${String(op)}" — use > ≥ < ≤ = or ≠.`);
        else if (value === undefined) err(`${tp}.onlyIf`, `${twhere} (${title}) says when it is needed, but not the value to compare.`);
        else onlyIf = { step: str(t.onlyIf.step, 40), field: str(t.onlyIf.field, 40), op: op as FlowRule['op'], value };
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
        ...(columns.length ? { columns } : {}),
        ...(analyses.length ? { analyses } : {}),
        ...(minEntries !== undefined && minEntries >= 1 && minEntries <= 10000 && Math.round(minEntries) !== 1 ? { minEntries: Math.round(minEntries) } : {}),
        ...(onlyIf ? { onlyIf } : {}),
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
  /* ---- decisions on what is found: each reads a figure of a step before it ---- */
  const orderOf = new Map([...stepIndex.keys()].map((k, i) => [k, i]));
  for (const [k, { step }] of stepIndex) {
    const r = step.onlyIf;
    if (!r) continue;
    const dep = stepIndex.get(r.step);
    if (!dep) { err(`step:${k}.onlyIf`, `"${step.title}" is decided by a step that is not on the method: "${r.step}".`); continue; }
    if ((orderOf.get(r.step) ?? 0) >= (orderOf.get(k) ?? 0)) { err(`step:${k}.onlyIf`, `"${step.title}" is decided by "${dep.step.title}", which does not come before it — a step is decided by what is found before it.`); continue; }
    const asNumber = numbersOf(dep.step).find(f => f.key === r.field);
    const asWords = (dep.step.fields ?? []).find(f => f.key === r.field && ['choice', 'yesno', 'text', 'person'].includes(f.type));
    if (!asNumber && !asWords) { err(`step:${k}.onlyIf`, `"${step.title}" is decided by "${r.field}", which is not a box or a figure of “${dep.step.title}”.`); continue; }
    if (asNumber && typeof r.value !== 'number') err(`step:${k}.onlyIf`, `"${step.title}" compares “${asNumber.label}”, a number, with "${String(r.value)}" — give a number.`);
    else if (!asNumber && asWords && typeof r.value === 'number' && asWords.type !== 'text') err(`step:${k}.onlyIf`, `"${step.title}" compares “${asWords.label}” with a number — it is words: say which of them.`);
    else if (!asNumber && r.op !== '=' && r.op !== '!=') err(`step:${k}.onlyIf`, `"${step.title}" compares “${asWords?.label}” by size — words are only the same (=) or not (≠).`);
  }
  /* ---- a before and an after: each compares with a log before it, on the same column ---- */
  for (const [k, { step }] of stepIndex) {
    for (const a of step.analyses ?? []) {
      if (!a.from) continue;
      const aw = `"${step.title}", the analysis “${a.label}”,`;
      const dep = stepIndex.get(a.from);
      if (!dep) { err(`step:${k}.analyses`, `${aw} compares with a step that is not on the method: "${a.from}".`); continue; }
      if (dep.step.answer !== 'log') { err(`step:${k}.analyses`, `${aw} compares with “${dep.step.title}”, which is not a log.`); continue; }
      if ((orderOf.get(a.from) ?? 0) >= (orderOf.get(k) ?? 0)) { err(`step:${k}.analyses`, `${aw} compares with “${dep.step.title}”, which does not come before it — the before is logged first.`); continue; }
      const label = (key: string) => step.columns?.find(c => c.key === key)?.label ?? key;
      if (a.of && !(dep.step.columns ?? []).some(c => c.key === a.of && isNumberColumn(c))) err(`step:${k}.analyses`, `${aw} compares “${label(a.of)}”, which “${dep.step.title}” does not log as a number.`);
      if (a.when && !(dep.step.columns ?? []).some(c => c.key === a.when?.column)) err(`step:${k}.analyses`, `${aw} counts the entries where “${label(a.when.column)}” — which “${dep.step.title}” does not log.`);
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
          else if (field && !isNumberBox(field.type)) err(`${cp}.field`, `${cw} compares "${field.label}", which is not a number.`);
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

  /* ---- what it needs that no block does yet: said, kept, never run ---- */
  const needs: FlowNeed[] = [];
  const rawNeeds = arr(input.needs);
  if (rawNeeds.length > LIMITS.needs) err('needs', `A method may name at most ${LIMITS.needs} things for development.`);
  rawNeeds.slice(0, LIMITS.needs).forEach((x, ni) => {
    if (!isObj(x)) return;
    const what = str(x.what), why = str(x.why, LIMITS.longText);
    if (!what || !why) { warn(`needs[${ni}]`, `A need for development is left out: it must say what is needed and why.`); return; }
    needs.push({ what, why, ...maybe('inputs', optStr(x.inputs, LIMITS.longText)), ...maybe('method', optStr(x.method, LIMITS.longText)), ...maybe('check', optStr(x.check, LIMITS.longText)) });
  });

  const def: FlowDefinition = { schema: FLOW_SCHEMA, name, purpose, kind, roles, stages, ...(measures.length ? { measures } : {}), ...(needs.length ? { needs } : {}) };
  return errors.length ? { ok: false, errors, warnings } : { ok: true, def, errors, warnings };
}

function readFields(raw: unknown, tp: string, twhere: string, err: (p: string, m: string) => void, at: 'fields' | 'columns' = 'fields', one = 'field'): FlowField[] {
  const list = arr(raw);
  if (list.length > LIMITS.fieldsPerStep) err(`${tp}.${at}`, `${twhere} has more than ${LIMITS.fieldsPerStep} ${one}s.`);
  const fields: FlowField[] = [];
  const keys = new Set<string>();
  list.slice(0, LIMITS.fieldsPerStep).forEach((f, fi) => {
    const fp = `${tp}.${at}[${fi}]`;
    if (!isObj(f)) { err(fp, `${twhere}, ${one} ${ordinal(fi)} is not readable.`); return; }
    const key = str(f.key, 40), label = str(f.label);
    if (!KEY_RE.test(key)) { err(`${fp}.key`, `${twhere}, ${one} ${ordinal(fi)}${label ? ` (${label})` : ''} needs a short key of lower-case letters and numbers.`); return; }
    if (keys.has(key)) { err(`${fp}.key`, `${twhere} has two ${one}s with the key "${key}".`); return; }
    keys.add(key);
    if (!label) err(`${fp}.label`, `${twhere}, ${one} "${key}" has no label.`);
    const type = oneOf<FieldType>(f.type, FIELD_TYPES, 'text');
    if (f.type !== undefined && f.type !== type) err(`${fp}.type`, `${twhere}, field "${label || key}" is a kind the app does not know: "${String(f.type)}".`);
    const min = num(f.min), max = num(f.max);
    if (min !== undefined && max !== undefined && min > max) err(fp, `${twhere}, "${label}" must be at least ${min} and at most ${max} — the lower limit is above the upper.`);
    const options = arr(f.options).map(o => str(o, 80)).filter(Boolean).slice(0, 30);
    if (type === 'choice' && options.length < 2) err(`${fp}.options`, `${twhere}, "${label}" is a choice with fewer than two options.`);
    const formula = optStr(f.formula);
    if (type === 'calc' && !formula) err(`${fp}.formula`, `${twhere}, "${label}" is worked out but has no formula.`);
    /* a timed box keeps its time in seconds, minutes or hours — nothing else is a time */
    const unit = optStr(f.unit, 40);
    if (type === 'timer' && unit && !(TIMER_UNITS as readonly string[]).includes(unit)) err(`${fp}.unit`, `${twhere}, "${label}" is timed, so it is kept in ${TIMER_UNITS.join(', ')} — not "${unit}".`);
    fields.push({
      key, label, type,
      ...(type === 'timer' ? { unit: unit && (TIMER_UNITS as readonly string[]).includes(unit) ? unit : 's' } : maybe('unit', unit)),
      ...(isTypedNumber(type) && min !== undefined ? { min } : {}),
      ...(isTypedNumber(type) && max !== undefined ? { max } : {}),
      ...(type === 'choice' ? { options } : {}),
      ...(type === 'calc' && formula ? { formula } : {}),
      ...(f.required === true && type !== 'calc' ? { required: true } : {}),
      ...maybe('help', optStr(f.help, LIMITS.longText)),
    });
  });
  /* formulas read this step's numbers only, and no circle */
  const numeric = new Map(fields.filter(f => isNumberBox(f.type)).map(f => [f.key, f]));
  const deps = new Map<string, string[]>();
  for (const f of fields) {
    if (f.type !== 'calc' || !f.formula) continue;
    try {
      const refs = formulaRefs(parseFormula(f.formula));
      for (const r of refs) {
        if (!numeric.has(r)) err(`${tp}.${at}`, `${twhere}, "${f.label}" works out from "${r}", which is not a number ${at === 'columns' ? 'in the same entry' : 'on this step'}.`);
      }
      deps.set(f.key, refs);
    } catch (e) {
      err(`${tp}.${at}`, `${twhere}, "${f.label}": ${e instanceof FormulaError ? e.message : 'the formula cannot be read.'}`);
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
  for (const k of deps.keys()) if (visit(k)) { err(`${tp}.${at}`, `${twhere} has worked-out ${one}s that depend on each other in a circle.`); break; }
  return fields;
}

/** A log's analyses — each a block the app has (lib/flow/analysis), on
 *  columns that are there and of the kind it needs. */
function readAnalyses(raw: unknown, columns: FlowField[], fields: FlowField[], tp: string, twhere: string, err: (p: string, m: string) => void): FlowAnalysis[] {
  const list = arr(raw);
  if (list.length > LIMITS.analysesPerStep) err(`${tp}.analyses`, `${twhere} has more than ${LIMITS.analysesPerStep} analyses.`);
  const out: FlowAnalysis[] = [];
  const taken = new Set([...columns, ...fields].map(c => c.key));
  const colOf = (k?: string) => columns.find(c => c.key === k);
  list.slice(0, LIMITS.analysesPerStep).forEach((a, ai) => {
    const ap = `${tp}.analyses[${ai}]`;
    if (!isObj(a)) { err(ap, `${twhere}, analysis ${ordinal(ai)} is not readable.`); return; }
    const key = str(a.key, 40);
    const block = blockOf(str(a.block, 20));
    const label = str(a.label) || (block ? block.name : '');
    const aw = `${twhere}, the analysis ${label ? `“${label}”` : ordinal(ai)}`;
    if (!KEY_RE.test(key) || key.includes('-')) { err(`${ap}.key`, `${aw} needs a short key of lower-case letters, numbers and _.`); return; }
    if (taken.has(key)) { err(`${ap}.key`, `${aw} has the key "${key}", which a column, a box or another analysis already has.`); return; }
    if (!block) { err(`${ap}.block`, `${aw} uses a way of working out the app does not have: "${String(a.block)}". It has ${ANALYSIS_BLOCKS.join(', ')}.`); return; }
    taken.add(key);
    const of = optStr(a.of, 40), by = optStr(a.by, 40);
    let ok = true;
    if (block.needs.of === 'required' && !of) { err(`${ap}.of`, `${aw} needs a column to work on.`); ok = false; }
    if (of) {
      const c = colOf(of);
      if (!c) { err(`${ap}.of`, `${aw} works on "${of}", which is not a column of the log.`); ok = false; }
      else if (block.numeric && !isNumberColumn(c)) { err(`${ap}.of`, `${aw} works on “${c.label}”, which is not a number.`); ok = false; }
      else if (block.needs.of === 'none') { err(`${ap}.of`, `${aw} counts entries — it works on no column.`); ok = false; }
    }
    if (block.needs.by === 'required' && !by) { err(`${ap}.by`, `${aw} needs a column to group by.`); ok = false; }
    if (by) {
      const c = colOf(by);
      if (!c) { err(`${ap}.by`, `${aw} groups by "${by}", which is not a column of the log.`); ok = false; }
      else if (!isGroupColumn(c)) { err(`${ap}.by`, `${aw} groups by “${c.label}”, a number — group by words (a choice, a reason, a person).`); ok = false; }
    }
    let when: FlowWhen | undefined;
    if (isObj(a.when)) {
      const column = str(a.when.column, 40), op = a.when.op, c = colOf(column);
      const value = typeof a.when.value === 'boolean' ? a.when.value : num(a.when.value) ?? optStr(a.when.value, 80);
      if (!c) { err(`${ap}.when`, `${aw} counts entries by "${column}", which is not a column of the log.`); ok = false; }
      else if (!(WHEN_OPS as readonly unknown[]).includes(op)) { err(`${ap}.when`, `${aw} compares with "${String(op)}" — use = ≠ ≥ ≤ > or <.`); ok = false; }
      else if (value === undefined) { err(`${ap}.when`, `${aw} says which entries count, but not the value to compare.`); ok = false; }
      else if (op !== '=' && op !== '!=' && (!isNumberColumn(c) || typeof value !== 'number')) { err(`${ap}.when`, `${aw} compares “${c.label}” by size — that needs a number column and a number.`); ok = false; }
      else when = { column, op: op as FlowWhen['op'], value };
    }
    if (block.needs.when === 'required' && !when && ok) { err(`${ap}.when`, `${aw} is a share — say which entries it counts.`); ok = false; }
    const against = optStr(a.against, 40);
    if (block.needs.against === 'required' && !against) { err(`${ap}.against`, `${aw} reads one column against another — say which (“against”).`); ok = false; }
    if (against) {
      const c = colOf(against);
      if (block.needs.against === 'none') { err(`${ap}.against`, `${aw} reads no second column — only a relationship does.`); ok = false; }
      else if (!c) { err(`${ap}.against`, `${aw} reads against "${against}", which is not a column of the log.`); ok = false; }
      else if (!isNumberColumn(c)) { err(`${ap}.against`, `${aw} reads against “${c.label}”, which is not a number.`); ok = false; }
      else if (against === of) { err(`${ap}.against`, `${aw} reads “${c.label}” against itself — pick a second column.`); ok = false; }
    }
    /* what drives it: more number columns read with "against", each once */
    const also: string[] = [];
    for (const raw of arr(a.also)) {
      const k = str(raw, 40), c = colOf(k);
      if (!k) continue;
      if ((block.needs.also ?? 'none') === 'none') { err(`${ap}.also`, `${aw} reads no more columns — only what drives it does.`); ok = false; break; }
      if (!c) { err(`${ap}.also`, `${aw} reads "${k}", which is not a column of the log.`); ok = false; continue; }
      if (!isNumberColumn(c)) { err(`${ap}.also`, `${aw} reads “${c.label}”, which is not a number.`); ok = false; continue; }
      if (k === of || k === against || also.includes(k)) { err(`${ap}.also`, `${aw} reads “${c.label}” twice — each column once.`); ok = false; continue; }
      also.push(k);
    }
    if (also.length > 5) { err(`${ap}.also`, `${aw} reads more than six columns together — fewer, or more entries than any line keeps.`); ok = false; }
    const target = a.target === undefined || a.target === null || a.target === '' ? undefined : num(a.target);
    if (a.target !== undefined && a.target !== null && a.target !== '' && target === undefined) { err(`${ap}.target`, `${aw} has a target that is not a number.`); ok = false; }
    if (target !== undefined && block.needs.target === 'none') { err(`${ap}.target`, `${aw} has a target, but only ${TARGET_READERS} read${TARGET_READERS.includes(' and ') || TARGET_READERS.includes(', ') ? '' : 's'} one — judge the figure in a gate or a measure.`); ok = false; }
    /* …or the target typed on the floor, in a number box of the same step (a figure the method cannot know) */
    const targetFrom = optStr(a.targetFrom, 40);
    if (targetFrom) {
      const box = fields.find(f => f.key === targetFrom);
      if (block.needs.target === 'none') { err(`${ap}.targetFrom`, `${aw} reads a target from a box, but only ${TARGET_READERS} read one.`); ok = false; }
      else if (!box) { err(`${ap}.targetFrom`, `${aw} reads its target from "${targetFrom}", which is not a box of the step.`); ok = false; }
      else if (!isNumberColumn(box)) { err(`${ap}.targetFrom`, `${aw} reads its target from “${box.label}”, which is not a number.`); ok = false; }
      else if (target !== undefined) { err(`${ap}.targetFrom`, `${aw} has a target and reads one from “${box.label}” — one or the other.`); ok = false; }
    }
    if (target === undefined && !targetFrom && block.needs.target === 'required') { err(`${ap}.target`, `${aw} needs ${block.targetSays ?? 'its target'} — give it one, or a number box on the step to type it in.`); ok = false; }
    /* a worked-out figure: arithmetic over the figures before it and the step's number boxes, nothing else */
    const formula = optStr(a.formula, 300);
    if (block.needs.formula === 'required' && !formula) { err(`${ap}.formula`, `${aw} is worked out — say how (e.g. "stop_minutes_a_day * cost_of_a_minute").`); ok = false; }
    if (formula && block.needs.formula !== 'required') { err(`${ap}.formula`, `${aw} has arithmetic, but only a worked-out figure has any.`); ok = false; }
    if (formula && block.needs.formula === 'required') {
      try {
        const refs = formulaRefs(parseFormula(formula));
        const before = new Set(out.filter(x => blockOf(x.block)?.output !== 'series').map(x => x.key));
        const boxes = new Set(fields.filter(f => isNumberColumn(f)).map(f => f.key));
        const stray = refs.filter(r => !before.has(r) && !boxes.has(r));
        if (!refs.length) { err(`${ap}.formula`, `${aw} reads nothing — name the figures before it or the step's number boxes.`); ok = false; }
        else if (stray.length) { err(`${ap}.formula`, `${aw} reads ${stray.map(x => `"${x}"`).join(', ')}, which ${stray.length === 1 ? 'is' : 'are'} not a figure before it or a number box of the step.`); ok = false; }
      } catch (e) { err(`${ap}.formula`, `${aw}'s arithmetic cannot be read: ${e instanceof FormulaError ? e.message : 'it is not a formula'}`); ok = false; }
    }
    /* a before and an after: the earlier log is checked once every step is read */
    const from = optStr(a.from, 40);
    if (block.needs.from === 'required' && !from) { err(`${ap}.from`, `${aw} compares this log with an earlier one — say which.`); ok = false; }
    if (from && (block.needs.from ?? 'none') === 'none') { err(`${ap}.from`, `${aw} reads no earlier log — only a before-and-after does.`); ok = false; }
    const better = a.better === 'higher' || a.better === 'lower' ? a.better : undefined;
    if (a.better !== undefined && a.better !== null && a.better !== '' && !better) { err(`${ap}.better`, `${aw} says better is "${String(a.better)}" — higher or lower.`); ok = false; }
    if (better && (block.needs.from ?? 'none') === 'none') { err(`${ap}.better`, `${aw} says which way is better, but only a before-and-after reads it — judge the figure in a gate or a measure.`); ok = false; }
    if (block.id === 'overdue' && of && colOf(of) && colOf(of)?.type !== 'date') { err(`${ap}.of`, `${aw} judges “${colOf(of)?.label}” as the day it is due, but it is not a date — give it a date column.`); ok = false; }
    if (block.id === 'cpk' && of && colOf(of) && colOf(of)?.min === undefined && colOf(of)?.max === undefined) { err(`${ap}.of`, `${aw} judges “${colOf(of)?.label}” against its limits, but the column has none — give it an at least or an at most.`); ok = false; }
    if (!ok) return;
    out.push({ key, label, block: block.id, ...(of ? { of } : {}), ...(by ? { by } : {}), ...(when ? { when } : {}), ...(against ? { against } : {}), ...(also.length ? { also } : {}), ...(target !== undefined ? { target } : {}), ...(targetFrom ? { targetFrom } : {}), ...(formula ? { formula } : {}), ...(from ? { from } : {}), ...(better ? { better } : {}), ...maybe('unit', optStr(a.unit, 40)) });
  });
  return out;
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
