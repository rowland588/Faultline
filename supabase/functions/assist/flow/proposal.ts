// COPIED FROM src/lib/flow by scripts/sync-assist.mjs — edit the source, then run it.
/* A METHOD PROPOSED — the shape the assistant answers in, and how that
 * answer becomes a definition (docs/PLATFORM-REVIEW.md §6.4; slice 4).
 *
 * The assistant never writes a definition directly. It fills this flatter
 * shape — names and words, the closed vocabulary's choices, no keys — under
 * a JSON schema the API holds it to; the app then gives every role, step
 * and box its key (lib/flow/definition keyOf, fieldKeyOf), finds each gate
 * condition's step and box by their words, and hands the result to the one
 * validator every definition goes through. So a proposal can only ever be
 * a method the app can already run, check and print — and anything in it
 * the app does not recognise is dropped, never trusted.
 *
 * Shared with the gateway (supabase/functions/assist, copied by
 * scripts/sync-assist.mjs) so the server and the screen read a proposal the
 * same way. */
import {
  ANSWERS, CONDITIONS, FIELD_TYPES, FLOW_SCHEMA, fieldKeyOf, keyOf, measureKeyOf, numbersOf,
  type FlowCondition, type FlowDefinition, type FlowField, type FlowMeasure, type FlowRole, type FlowStage, type FlowStepDef,
} from './definition.ts';
import { COMPONENTS, componentOf } from './components.ts';
import { ANALYSIS_BLOCKS, WHEN_OPS, blockOf, isNumberColumn, type FlowAnalysis, type WhenOp } from './analysis.ts';

const S = { type: 'string' } as const;
const NUMQ = { anyOf: [{ type: 'number' }, { type: 'null' }] } as const;
const INTQ = { anyOf: [{ type: 'integer' }, { type: 'null' }] } as const;
const obj = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const FIELD = obj({
  label: S, type: { type: 'string', enum: [...FIELD_TYPES] }, unit: S, min: NUMQ, max: NUMQ,
  options: { type: 'array', items: S }, formula: S, required: { type: 'boolean' },
});

/** The JSON schema the assistant's answer is held to (structured outputs:
 *  every object closed, every property present — null or empty when there
 *  is nothing to say). */
export const PROPOSAL_SCHEMA = obj({
  name: S,
  purpose: S,
  kind: { type: 'string', enum: ['stagegate', 'investigation', 'improvement', 'other'] },
  roles: { type: 'array', items: obj({ name: S, side: { type: 'string', enum: ['supplier', 'site', 'either'] } }) },
  stages: {
    type: 'array',
    items: obj({
      name: S,
      purpose: S,
      steps: {
        type: 'array',
        items: obj({
          title: S,
          per: { type: 'string', enum: ['machine', 'line'] },
          answer: { type: 'string', enum: [...ANSWERS] },
          role: S,
          passes_if: S,
          photos: { type: 'integer' },
          files: { type: 'integer' },
          due_days: INTQ,
          after: { type: 'array', items: S },
          tool: { type: 'string', enum: ['', ...COMPONENTS.map(c => c.id)] },
          fields: { type: 'array', items: FIELD },
          /* a log: what each entry asks, what the entries add up to, how many it needs */
          columns: { type: 'array', items: FIELD },
          analyses: {
            type: 'array',
            items: obj({
              label: S, block: { type: 'string', enum: [...ANALYSIS_BLOCKS] }, of: S, by: S,
              when_column: S, when_op: { type: 'string', enum: ['', ...WHEN_OPS] }, when_value: S, unit: S,
              against: S, target: NUMQ,
            }),
          },
          min_entries: INTQ,
          help: S,
        }),
      },
      gate: {
        type: 'array',
        items: obj({
          type: { type: 'string', enum: [...CONDITIONS] },
          policy: { type: 'string', enum: ['block', 'warn'] },
          step: S, field: S,
          op: { type: 'string', enum: ['>=', '<=', '=', 'between'] },
          value: NUMQ, value2: NUMQ,
          evidence: { type: 'string', enum: ['photo', 'file'] },
          min: INTQ,
          measure: S,
          priority: { type: 'string', enum: ['critical', 'high', 'any'] },
          due_days: INTQ,
          label: S,
        }),
      },
    }),
  },
  measures: {
    type: 'array',
    items: obj({
      name: S, unit: S, better: { type: 'string', enum: ['higher', 'lower'] }, target: NUMQ,
      from: { type: 'array', items: obj({ step: S, field: S }) },
    }),
  },
  needs: { type: 'array', items: obj({ what: S, why: S, inputs: S, method: S, check: S }) },
  assumptions: { type: 'array', items: S },
  questions: { type: 'array', items: S },
});

export interface Proposed {
  def: FlowDefinition;
  /** What the assistant took for granted — said to the person before they keep it. */
  assumptions: string[];
  /** What it could not know and would ask — a limit not given, who signs. */
  questions: string[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => ((list as readonly unknown[]).includes(v) ? v as T : fallback);
const words = (v: unknown, n: number, max = 300): string[] => arr(v).map(x => str(x, max)).filter(Boolean).slice(0, n);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A proposal read into a definition: keys given, references found by their
 *  words, anything unreadable left out. Not yet checked — that is
 *  validateDefinition's, always next. */
export function fromProposal(input: unknown): Proposed {
  const p = isObj(input) ? input : {};
  const roles: FlowRole[] = [];
  for (const r of arr(p.roles).slice(0, 30)) {
    if (!isObj(r)) continue;
    const name = str(r.name);
    if (!name || roles.some(x => same(x.name, name))) continue;
    const side = r.side === 'supplier' || r.side === 'site' ? r.side : undefined;
    roles.push({ key: keyOf(name, roles.map(x => x.key)), name, ...(side ? { side } : {}) });
  }
  const roleKey = (name: string) => roles.find(r => same(r.name, name))?.key;

  const stepKeys: string[] = [];
  const stageKeys: string[] = [];
  const pendingMeasure: { stage: number; at: number; id: string; policy: 'block' | 'warn'; name: string }[] = [];
  /* every step seen so far, by its title — a gate or a waits-on may only name a step at or before it */
  const seen: { title: string; key: string; fields: FlowField[] }[] = [];
  const stages: FlowStage[] = [];
  for (const raw of arr(p.stages).slice(0, 30)) {
    if (!isObj(raw)) continue;
    const name = str(raw.name) || `Stage ${stages.length + 1}`;
    const key = keyOf(name, stageKeys); stageKeys.push(key);
    const steps: FlowStepDef[] = [];
    for (const t of arr(raw.steps).slice(0, 80)) {
      if (!isObj(t)) continue;
      const title = str(t.title);
      if (!title) continue;
      const skey = keyOf(title, stepKeys); stepKeys.push(skey);
      const fields = proposedFields(t.fields);
      const answer = oneOf(t.answer, ANSWERS, 'done');
      const columns = answer === 'log' ? proposedFields(t.columns, fields.map(f => f.key)) : [];
      const analyses = answer === 'log' ? proposedAnalyses(t.analyses, columns, [...fields, ...columns].map(f => f.key)) : [];
      const minEntries = num(t.min_entries);
      const photos = num(t.photos), files = num(t.files), due = num(t.due_days);
      const after = words(t.after, 10).map(a => seen.find(s => same(s.title, a))?.key ?? steps.map(x => ({ title: x.title, key: x.key })).find(s => same(s.title, a))?.key).filter((k): k is string => !!k);
      const role = roleKey(str(t.role));
      const passesIf = str(t.passes_if, 2000), help = str(t.help, 2000);
      const tool = componentOf(str(t.tool, 40))?.id;
      const step: FlowStepDef = {
        key: skey, title, per: t.per === 'machine' ? 'machine' : 'line', answer,
        ...(role ? { role } : {}),
        ...(passesIf ? { passesIf } : {}),
        ...(fields.length ? { fields } : {}),
        ...((photos && photos > 0) || (files && files > 0) ? { evidence: { ...(photos && photos > 0 ? { photos: Math.round(photos) } : {}), ...(files && files > 0 ? { files: Math.round(files) } : {}) } } : {}),
        ...(due !== undefined && due >= 0 ? { dueDays: Math.round(due) } : {}),
        ...(after.length ? { after: [...new Set(after)] } : {}),
        ...(tool ? { component: { tool } } : {}),
        ...(columns.length ? { columns } : {}),
        ...(analyses.length ? { analyses } : {}),
        ...(minEntries !== undefined && minEntries > 1 ? { minEntries: Math.round(minEntries) } : {}),
        ...(help ? { help } : {}),
      };
      steps.push(step);
    }
    /* a step's numbers: its boxes, and its tool's figures */
    for (const s of steps) seen.push({ title: s.title, key: s.key, fields: numbersOf(s).concat((s.fields ?? []).filter(f => !numbersOf(s).includes(f))) });

    const conditions: FlowCondition[] = [];
    const ids: string[] = [];
    for (const c of arr(raw.gate).slice(0, 20)) {
      if (!isObj(c)) continue;
      const type = oneOf(c.type, CONDITIONS, 'stepsDone');
      const policy = c.policy === 'warn' ? 'warn' : 'block';
      const label = str(c.label);
      const id = keyOf(type, ids); ids.push(id);
      const step = seen.find(s => same(s.title, str(c.step)));
      const base = { id, policy, ...(label && type !== 'manual' ? { label } : {}) } as const;
      switch (type) {
        case 'stepsDone': conditions.push({ ...base, type }); break;
        case 'stepDone': if (step) conditions.push({ ...base, type, step: step.key }); break;
        case 'signedOff': if (step) conditions.push({ ...base, type, step: step.key }); break;
        case 'evidence': if (step) conditions.push({ ...base, type, step: step.key, kind: c.evidence === 'file' ? 'file' : 'photo', min: Math.max(1, Math.round(num(c.min) ?? 1)) }); break;
        case 'fieldMeets': {
          const field = step?.fields.find(f => same(f.label, str(c.field)) || f.key === str(c.field));
          const value = num(c.value), value2 = num(c.value2);
          const op = oneOf(c.op, ['>=', '<=', '=', 'between'] as const, '>=');
          if (step && field && value !== undefined) conditions.push({ ...base, type, step: step.key, field: field.key, op, value, ...(op === 'between' && value2 !== undefined ? { value2 } : {}) });
          break;
        }
        case 'noOpenProblems': conditions.push({ ...base, type, priority: oneOf(c.priority, ['critical', 'high', 'any'] as const, 'critical') }); break;
        case 'dateReached': { const d = num(c.due_days); if (d !== undefined && d >= 0) conditions.push({ ...base, type, dueDays: Math.round(d) }); break; }
        case 'manual': if (label) conditions.push({ ...base, type, label }); break;
        /* a measure is named by its name — found once the measures are read, below */
        case 'measureMet': { const m = str(c.measure); if (m) pendingMeasure.push({ stage: stages.length, at: conditions.length, id, policy, name: m }); break; }
      }
    }
    if (!conditions.length && !pendingMeasure.some(x => x.stage === stages.length)) conditions.push({ id: 'every-step', type: 'stepsDone', policy: 'block' });
    const purpose = str(raw.purpose, 2000);
    stages.push({ key, name, ...(purpose ? { purpose } : {}), steps, gate: { conditions } });
  }

  /* WHAT IT MEASURES — each fed by a step's box or tool figure, found by their words */
  const measures: FlowMeasure[] = [];
  for (const m of arr(p.measures).slice(0, 12)) {
    if (!isObj(m)) continue;
    const name = str(m.name);
    if (!name || measures.some(x => same(x.name, name))) continue;
    const from: FlowMeasure['from'] = [];
    for (const f of arr(m.from).slice(0, 20)) {
      if (!isObj(f)) continue;
      const st = seen.find(x => same(x.title, str(f.step)));
      const field = st?.fields.find(x => same(x.label, str(f.field)) || x.key === str(f.field));
      if (st && field && (field.type === 'number' || field.type === 'reading' || field.type === 'calc') && !from.some(x => x.step === st.key && x.field === field.key)) from.push({ step: st.key, field: field.key });
    }
    if (!from.length) continue;
    const unit = str(m.unit, 40), target = num(m.target);
    measures.push({ key: measureKeyOf(name, measures.map(x => x.key)), name, better: m.better === 'higher' ? 'higher' : 'lower', from, ...(unit ? { unit } : {}), ...(target !== undefined ? { target } : {}) });
  }
  /* the gates that wait on a measure, now the measures are known — in the place they were asked */
  for (const pm of [...pendingMeasure].reverse()) {
    const m = measures.find(x => same(x.name, pm.name));
    const st = stages[pm.stage];
    if (m && m.target !== undefined && st) st.gate.conditions.splice(pm.at, 0, { id: pm.id, type: 'measureMet', policy: pm.policy, measure: m.key });
  }
  for (const st of stages) if (!st.gate.conditions.length) st.gate.conditions.push({ id: 'every-step', type: 'stepsDone', policy: 'block' });

  /* what it needs that no block does — work for development, said as asked */
  const needs = arr(p.needs).slice(0, 10).filter(isObj).map(x => ({
    what: str(x.what), why: str(x.why, 2000),
    ...(str(x.inputs, 2000) ? { inputs: str(x.inputs, 2000) } : {}), ...(str(x.method, 2000) ? { method: str(x.method, 2000) } : {}), ...(str(x.check, 2000) ? { check: str(x.check, 2000) } : {}),
  })).filter(x => x.what && x.why);

  const def: FlowDefinition = {
    schema: FLOW_SCHEMA,
    name: str(p.name) || 'A proposed method',
    purpose: str(p.purpose, 2000),
    kind: oneOf(p.kind, ['stagegate', 'investigation', 'improvement', 'other'] as const, 'other'),
    roles, stages,
    ...(measures.length ? { measures } : {}),
    ...(needs.length ? { needs } : {}),
  };
  return { def, assumptions: words(p.assumptions, 12, 400), questions: words(p.questions, 8, 400) };
}

/** Boxes as proposed — a step's fields or a log's columns. */
function proposedFields(raw: unknown, taken: readonly string[] = []): FlowField[] {
  const fields: FlowField[] = [];
  for (const f of arr(raw).slice(0, 30)) {
    if (!isObj(f)) continue;
    const label = str(f.label);
    if (!label) continue;
    const type = oneOf(f.type, FIELD_TYPES, 'text');
    const min = num(f.min), max = num(f.max);
    const unit = str(f.unit, 40), formula = str(f.formula, 300);
    const options = words(f.options, 30, 80);
    fields.push({
      key: fieldKeyOf(label, [...taken, ...fields.map(x => x.key)]), label, type,
      ...(unit && (type === 'number' || type === 'reading' || type === 'calc') ? { unit } : {}),
      ...(min !== undefined && type !== 'calc' ? { min } : {}),
      ...(max !== undefined && type !== 'calc' ? { max } : {}),
      ...(type === 'choice' && options.length ? { options } : {}),
      ...(type === 'calc' && formula ? { formula } : {}),
      ...(f.required === true && type !== 'calc' ? { required: true } : {}),
    });
  }
  return fields;
}

/** A log's analyses as proposed — each column named by its label, found here. */
function proposedAnalyses(raw: unknown, columns: FlowField[], taken: readonly string[]): FlowAnalysis[] {
  const out: FlowAnalysis[] = [];
  const colOf = (v: unknown) => { const w = str(v, 80); return w ? columns.find(c => same(c.label, w) || c.key === w) : undefined; };
  for (const a of arr(raw).slice(0, 20)) {
    if (!isObj(a)) continue;
    const block = blockOf(str(a.block, 20));
    if (!block) continue;
    const label = str(a.label) || block.name;
    const of = colOf(a.of), by = colOf(a.by), wc = colOf(a.when_column), against = colOf(a.against);
    const op = (WHEN_OPS as readonly string[]).includes(str(a.when_op, 4)) ? str(a.when_op, 4) as WhenOp : undefined;
    const raw2 = str(a.when_value, 80);
    const value = wc && raw2 ? (isNumberColumn(wc) && Number.isFinite(Number(raw2)) ? Number(raw2) : wc.type === 'yesno' ? /^(y|yes|true)$/i.test(raw2) : raw2) : undefined;
    const unit = str(a.unit, 40);
    out.push({
      key: fieldKeyOf(label, [...taken, ...out.map(x => x.key)]), label, block: block.id,
      ...(of ? { of: of.key } : {}), ...(by ? { by: by.key } : {}),
      ...(wc && op && value !== undefined ? { when: { column: wc.key, op, value } } : {}),
      ...(against ? { against: against.key } : {}),
      ...(typeof a.target === 'number' && Number.isFinite(a.target) ? { target: a.target } : {}),
      ...(unit ? { unit } : {}),
    });
  }
  return out;
}

/** A definition said back in the proposal's shape — names and words, no
 *  keys — so the assistant can be asked to change a method as it stands. */
export function toProposal(def: FlowDefinition): Record<string, unknown> {
  const titleOf = (k: string) => def.stages.flatMap(s => s.steps).find(s => s.key === k)?.title ?? '';
  const roleOf = (k?: string) => (k ? def.roles.find(r => r.key === k)?.name ?? '' : '');
  return {
    name: def.name, purpose: def.purpose, kind: def.kind,
    roles: def.roles.map(r => ({ name: r.name, side: r.side ?? 'either' })),
    stages: def.stages.map(st => ({
      name: st.name, purpose: st.purpose ?? '',
      steps: st.steps.map(s => ({
        title: s.title, per: s.per, answer: s.answer, role: roleOf(s.role), passes_if: s.passesIf ?? '',
        photos: s.evidence?.photos ?? 0, files: s.evidence?.files ?? 0, due_days: s.dueDays ?? null,
        after: (s.after ?? []).map(titleOf).filter(Boolean),
        tool: s.component?.tool ?? '',
        fields: (s.fields ?? []).map(fieldSaid),
        columns: (s.columns ?? []).map(fieldSaid),
        analyses: (s.analyses ?? []).map(a => {
          const lab = (k?: string) => (k ? s.columns?.find(c => c.key === k)?.label ?? k : '');
          return { label: a.label, block: a.block, of: lab(a.of), by: lab(a.by), when_column: lab(a.when?.column), when_op: a.when?.op ?? '', when_value: a.when ? String(a.when.value) : '', unit: a.unit ?? '', against: lab(a.against), target: a.target ?? null };
        }),
        min_entries: s.minEntries ?? null,
        help: s.help ?? '',
      })),
      gate: st.gate.conditions.map(c => {
        const step = 'step' in c ? def.stages.flatMap(x => x.steps).find(x => x.key === c.step) : undefined;
        return {
          type: c.type, policy: c.policy, step: step?.title ?? '',
          field: c.type === 'fieldMeets' && step ? numbersOf(step).find(f => f.key === c.field)?.label ?? '' : '',
          op: c.type === 'fieldMeets' ? c.op : '>=', value: c.type === 'fieldMeets' ? c.value : null,
          value2: c.type === 'fieldMeets' ? c.value2 ?? null : null,
          evidence: c.type === 'evidence' ? c.kind : 'photo', min: c.type === 'evidence' ? c.min : null,
          priority: c.type === 'noOpenProblems' ? c.priority : 'any', due_days: c.type === 'dateReached' ? c.dueDays : null,
          measure: c.type === 'measureMet' ? def.measures?.find(m => m.key === c.measure)?.name ?? '' : '',
          label: c.label ?? '',
        };
      }),
    })),
    measures: (def.measures ?? []).map(m => ({
      name: m.name, unit: m.unit ?? '', better: m.better, target: m.target ?? null,
      from: m.from.map(f => {
        const st = def.stages.flatMap(x => x.steps).find(x => x.key === f.step);
        return { step: st?.title ?? '', field: st ? numbersOf(st).find(x => x.key === f.field)?.label ?? f.field : f.field };
      }),
    })),
    needs: (def.needs ?? []).map(x => ({ what: x.what, why: x.why, inputs: x.inputs ?? '', method: x.method ?? '', check: x.check ?? '' })),
    assumptions: [], questions: [],
  };
}

const fieldSaid = (f: FlowField) => ({
  label: f.label, type: f.type, unit: f.unit ?? '', min: f.min ?? null, max: f.max ?? null, options: f.options ?? [],
  formula: f.formula ?? '', required: !!f.required,
});
