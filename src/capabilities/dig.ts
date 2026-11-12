/* SHE DIGS (10 November, docs/LUNA-NEXT.md L2, L4).
 *   explain_change  read   a measure of any source over two periods — the totals, where the change sits field by field, the field that
 *                          concentrates it, and within its biggest mover the next field down; kept as a result (before · after · change)
 *   explain_variance read  plan against actual — in one sheet (two columns) or two (a plan sheet and an actual sheet, matched by
 *                          field name): the totals, where the variance sits field by field, and within its biggest contributor the
 *                          next field down; kept as a result (plan · actual · variance)
 *   join_results    read   any two results matched by their labels — both values, the difference and the ratio, and what matched on one
 *                          side only, named; kept as a result
 * Every figure is the code's (lib/data/change, lib/data/join); a field the source does not hold is "cannot be said". */
import type { Filter, Query } from '../lib/workbook/query';
import { changeOf, changeResult, changeSaid, type Change } from '../lib/data/change';
import { joinResults, joinSaid, type JoinRule } from '../lib/data/join';
import { varianceOf, varianceResult, varianceSaid, type Better } from '../lib/data/variance';
import { askSource, fieldsOfSource, keepResult, resultsOfConversation } from './data';
import { anyone } from './access';
import { checkObject } from './check';
import type { CapCtx, CapResult, Capability, Checked } from './types';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
interface Period { from: string; to: string; label?: string }
interface ChangeIn { source: string; sheet?: string; title: string; measure: { op: 'sum' | 'count'; column?: string }; date: string; before: Period; after: Period; by?: string[]; filters?: Filter[]; unit?: string }

function checkPeriod(v: unknown, which: string): Period | string {
  const p = v as Partial<Period> | null;
  if (!p || typeof p !== 'object' || typeof p.from !== 'string' || typeof p.to !== 'string' || !DAY.test(p.from) || !DAY.test(p.to)) return `${which}: from and to as YYYY-MM-DD.`;
  if (p.from > p.to) return `${which}: from must not be after to.`;
  return { from: p.from, to: p.to, ...(typeof p.label === 'string' && p.label.trim() ? { label: p.label.trim().slice(0, 40) } : {}) };
}
function checkChange(raw: unknown): Checked<ChangeIn> {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return { ok: false, why: 'The question is missing.' };
  for (const k of ['source', 'title', 'date']) if (typeof o[k] !== 'string' || !(o[k] as string).trim()) return { ok: false, why: `${k}: needed.` };
  const m = o.measure as { op?: string; column?: string } | undefined;
  if (!m || (m.op !== 'sum' && m.op !== 'count') || (m.op === 'sum' && typeof m.column !== 'string')) return { ok: false, why: 'measure: sum of a number field, or count (of rows, or of a field).' };
  const before = checkPeriod(o.before, 'before'), after = checkPeriod(o.after, 'after');
  if (typeof before === 'string') return { ok: false, why: before };
  if (typeof after === 'string') return { ok: false, why: after };
  const by = Array.isArray(o.by) ? o.by.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 6) : undefined;
  const filters = Array.isArray(o.filters) ? (o.filters as Filter[]).slice(0, 8) : undefined;
  if (filters?.some(f => typeof f?.column !== 'string' || typeof f?.op !== 'string')) return { ok: false, why: 'filters: each a field and an op.' };
  const extra = Object.keys(o).filter(k => !['source', 'sheet', 'title', 'measure', 'date', 'before', 'after', 'by', 'filters', 'unit'].includes(k));
  if (extra.length) return { ok: false, why: `The question has fields it does not take: ${extra.join(', ')}.` };
  return { ok: true, input: { source: String(o.source).trim(), title: String(o.title).trim().slice(0, 120), date: String(o.date).trim(), measure: { op: m.op, ...(m.column ? { column: m.column } : {}) } as ChangeIn['measure'], before, after, ...(typeof o.sheet === 'string' ? { sheet: o.sheet } : {}), ...(by?.length ? { by } : {}), ...(filters?.length ? { filters } : {}), ...(typeof o.unit === 'string' && o.unit.trim() ? { unit: o.unit.trim().slice(0, 20) } : {}) } };
}

const periodWord = (p: Period) => p.label ?? (p.from === p.to ? p.from : `${p.from} to ${p.to}`);

export const explainChange: Capability = {
  name: 'explain_change', title: 'Find what changed', kind: 'read',
  validate: raw => checkChange(raw),
  allowed: anyone,
  async run(ctx: CapCtx, input: ChangeIn): Promise<CapResult> {
    const fl = await fieldsOfSource(ctx, input.source, input.sheet);
    if (!fl.ok) return fl;
    const measure = input.measure.op === 'count' ? { op: 'count' as const, ...(input.measure.column ? { column: input.measure.column } : {}) } : { op: 'sum' as const, column: input.measure.column as string };
    const base = input.filters ?? [];
    const within = (p: Period, more: Filter[] = []): Omit<Query, 'sheet'> => ({ measures: [measure], filters: [...base, ...more, { column: input.date, op: 'between', from: p.from, to: p.to }], limit: 200 });
    /* the fields to break it by: those named, else every field of words with a few values (never one naming a row each) */
    const skip = new Set([input.date.toLowerCase(), (input.measure.column ?? '').toLowerCase(), 'shown by the filter']);
    const by = input.by ?? fl.fields.filter(f => (f.type === 'text' || f.type === 'yes/no') && !f.unique && (f.distinct ?? 0) >= 2 && (f.distinct ?? 0) <= 60 && !skip.has(f.name.toLowerCase())).map(f => f.name).slice(0, 5);
    const tb = await askSource(ctx, input.source, fl.sheet, within(input.before));
    if (!tb.ok) return tb.cannot ?? { ok: false, why: tb.why };
    const ta = await askSource(ctx, input.source, fl.sheet, within(input.after));
    if (!ta.ok) return ta.cannot ?? { ok: false, why: ta.why };
    const tot = { before: Number(tb.result.totals[0] ?? 0) || 0, after: Number(ta.result.totals[0] ?? 0) || 0 };
    const fieldsOf = async (names: string[], more: Filter[]) => {
      const out: { field: string; before: typeof tb.result.groups; after: typeof tb.result.groups }[] = [];
      for (const f of names) {
        const b = await askSource(ctx, input.source, fl.sheet, { ...within(input.before, more), groupBy: [f] });
        const a = await askSource(ctx, input.source, fl.sheet, { ...within(input.after, more), groupBy: [f] });
        if (b.ok && a.ok) out.push({ field: f, before: b.result.groups, after: a.result.groups });
      }
      return out;
    };
    const c = changeOf(tot, await fieldsOf(by, []));
    /* within the biggest mover of the field that concentrates it, the next field down */
    let inner: { key: string; change: Change } | undefined;
    const top = c.best?.movers[0];
    if (c.best && top && top.change && top.key !== '(not recorded)') {
      const more: Filter[] = [{ column: c.best.field, op: 'eq', value: top.key }];
      const rest = by.filter(f => f !== c.best?.field).slice(0, 4);
      if (rest.length) inner = { key: top.key, change: changeOf({ before: top.before, after: top.after }, await fieldsOf(rest, more)) };
    }
    const periods = { before: periodWord(input.before), after: periodWord(input.after) };
    const says = changeSaid(c, input.title, periods, input.unit, inner);
    const notes = [...new Set([...tb.result.notes, ...ta.result.notes])];
    const show = c.best ?? c.fields[0];
    const kept = show ? await keepResult(ctx, { title: `${input.title} — by ${show.field}`, source: { kind: tb.kind, id: tb.id, name: tb.name, ...(tb.sheet ? { sheet: tb.sheet } : {}), ...(tb.sourceId ? { sourceId: tb.sourceId } : {}) }, query: { explain: input }, result: changeResult(show, c, tb.sheet ?? tb.name, notes) }) : undefined;
    const id = kept && !('why' in kept) ? kept.id : undefined;
    return {
      ok: true, refs: [],
      says: `${says}${id ? ` [result ${id} — before, after and change by ${show?.field}]` : ''}${notes.length ? ` ${notes.join(' ')}` : ''}${!by.length ? ' No field of words with a few values was found to break it by — name the fields (by) to look at.' : ''}`,
      data: {
        before: c.before, after: c.after, change: c.change, pct: c.pct, best: c.best?.field ?? null, ...(id ? { resultId: id } : {}),
        fields: c.fields.map(f => ({ field: f.field, movers: f.movers.slice(0, 8).map(m => ({ key: m.key, before: m.before, after: m.after, change: m.change, sharePct: m.share === null ? null : m.share * 100 })) })),
        ...(inner ? { within: { key: inner.key, best: inner.change.best?.field ?? null, movers: (inner.change.best?.movers ?? []).slice(0, 5).map(m => ({ key: m.key, change: m.change, sharePct: m.share === null ? null : m.share * 100 })) } } : {}),
      },
    };
  },
};

/* PLAN AGAINST ACTUAL (12 November, docs/LUNA-DEMO.md). The plan and the actual may sit in one sheet (two number columns on each row)
 * or in two (a plan or budget sheet and a log of what was made), matched by the fields they share by name — or by the names the person
 * gave (`same`). A field on one side only cannot be broken by; it is named, never guessed at. */
interface Side { sheet?: string; column: string; date?: string }
interface VarianceIn { source: string; title: string; plan: Side; actual: Side; from?: string; to?: string; by?: string[]; same?: { plan: string; actual: string }[]; filters?: Filter[]; unit?: string; better?: Better }

function checkSide(v: unknown, which: string): Side | string {
  const o = v as Partial<Side> | null;
  if (!o || typeof o !== 'object' || typeof o.column !== 'string' || !o.column.trim()) return `${which}: the number field to add up (column), and its sheet when it is not the same as the other's.`;
  return { column: o.column.trim(), ...(typeof o.sheet === 'string' && o.sheet.trim() ? { sheet: o.sheet.trim() } : {}), ...(typeof o.date === 'string' && o.date.trim() ? { date: o.date.trim() } : {}) };
}
function checkVariance(raw: unknown): Checked<VarianceIn> {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return { ok: false, why: 'The question is missing.' };
  for (const k of ['source', 'title']) if (typeof o[k] !== 'string' || !(o[k] as string).trim()) return { ok: false, why: `${k}: needed.` };
  const extra = Object.keys(o).filter(k => !['source', 'title', 'plan', 'actual', 'from', 'to', 'by', 'same', 'filters', 'unit', 'better'].includes(k));
  if (extra.length) return { ok: false, why: `The question has fields it does not take: ${extra.join(', ')}.` };
  const plan = checkSide(o.plan, 'plan'), actual = checkSide(o.actual, 'actual');
  if (typeof plan === 'string') return { ok: false, why: plan };
  if (typeof actual === 'string') return { ok: false, why: actual };
  const from = typeof o.from === 'string' ? o.from : undefined, to = typeof o.to === 'string' ? o.to : undefined;
  if ((from || to) && (!from || !to || !DAY.test(from) || !DAY.test(to))) return { ok: false, why: 'from and to: both, as YYYY-MM-DD — or neither for every row.' };
  if (from && to && from > to) return { ok: false, why: 'from must not be after to.' };
  if (from && !plan.date && !actual.date) return { ok: false, why: 'A period needs the date field it is read on (plan.date, actual.date — the same name on both if they share it).' };
  const by = Array.isArray(o.by) ? o.by.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 6) : undefined;
  const same = Array.isArray(o.same) ? (o.same as { plan?: unknown; actual?: unknown }[]).filter(x => x && typeof x.plan === 'string' && typeof x.actual === 'string').map(x => ({ plan: String(x.plan), actual: String(x.actual) })).slice(0, 8) : undefined;
  const filters = Array.isArray(o.filters) ? (o.filters as Filter[]).slice(0, 8) : undefined;
  if (filters?.some(f => typeof f?.column !== 'string' || typeof f?.op !== 'string')) return { ok: false, why: 'filters: each a field and an op.' };
  const better = o.better === 'higher' || o.better === 'lower' ? o.better : undefined;
  return { ok: true, input: { source: String(o.source).trim(), title: String(o.title).trim().slice(0, 120), plan, actual,
    ...(from && to ? { from, to } : {}), ...(by?.length ? { by } : {}), ...(same?.length ? { same } : {}), ...(filters?.length ? { filters } : {}),
    ...(typeof o.unit === 'string' && o.unit.trim() ? { unit: o.unit.trim().slice(0, 20) } : {}), ...(better ? { better } : {}) } };
}

export const explainVariance: Capability = {
  name: 'explain_variance', title: 'Find where a variance sits', kind: 'read',
  validate: raw => checkVariance(raw),
  allowed: anyone,
  async run(ctx: CapCtx, input: VarianceIn): Promise<CapResult> {
    const pf = await fieldsOfSource(ctx, input.source, input.plan.sheet ?? input.actual.sheet);
    if (!pf.ok) return pf;
    const af = (input.actual.sheet ?? input.plan.sheet)?.toLowerCase() === pf.sheet?.toLowerCase() ? pf : await fieldsOfSource(ctx, input.source, input.actual.sheet ?? input.plan.sheet);
    if (!af.ok) return af;
    const oneSheet = pf.sheet === af.sheet;
    const low = (s: string) => s.trim().toLowerCase();
    const has = (fl: { fields: { name: string }[] }, n: string) => fl.fields.find(f => low(f.name) === low(n))?.name;
    /* the plan side's name for a field named on the actual side: the person's word first, else the same name */
    const planName = (actualName: string) => input.same?.find(x => low(x.actual) === low(actualName))?.plan ?? has(pf, actualName);
    const planDate = input.plan.date ?? input.actual.date, actualDate = input.actual.date ?? input.plan.date;
    const period = (date: string | undefined): Filter[] => input.from && input.to && date ? [{ column: date, op: 'between', from: input.from, to: input.to }] : [];
    const filtersFor = (side: 'plan' | 'actual'): { ok: Filter[]; left: string[] } => {
      const ok: Filter[] = [], left: string[] = [];
      for (const f of input.filters ?? []) {
        const n = side === 'actual' ? has(af, f.column) : planName(f.column) ?? has(pf, f.column);
        if (n) ok.push({ ...f, column: n }); else left.push(f.column);
      }
      return { ok, left };
    };
    const fp = filtersFor('plan'), fa = filtersFor('actual');
    const ask = (side: 'plan' | 'actual', groupBy?: string[], more: Filter[] = []) => askSource(ctx, input.source, side === 'plan' ? pf.sheet : af.sheet, {
      measures: [{ op: 'sum', column: side === 'plan' ? input.plan.column : input.actual.column }],
      filters: [...(side === 'plan' ? fp.ok : fa.ok), ...period(side === 'plan' ? planDate : actualDate), ...more], limit: 200, ...(groupBy ? { groupBy } : {}),
    });
    const tp = await ask('plan'); if (!tp.ok) return tp.cannot ?? { ok: false, why: tp.why };
    const ta = await ask('actual'); if (!ta.ok) return ta.cannot ?? { ok: false, why: ta.why };
    const tot = { plan: Number(tp.result.totals[0] ?? 0) || 0, actual: Number(ta.result.totals[0] ?? 0) || 0 };
    /* the fields to break it by: those named, else every field of words with a few values on the actual side that the plan side has too */
    const skip = new Set([input.plan.column, input.actual.column, planDate ?? '', actualDate ?? ''].map(low));
    const named = input.by ?? af.fields.filter(f => (f.type === 'text' || f.type === 'yes/no') && !f.unique && (f.distinct ?? 0) >= 2 && (f.distinct ?? 0) <= 60 && !skip.has(low(f.name))).map(f => f.name);
    const pairs: { field: string; plan: string }[] = [], oneSide: string[] = [];
    for (const n of named) {
      const a = has(af, n), p = planName(n);
      if (a && p) pairs.push({ field: a, plan: p }); else oneSide.push(n);
    }
    const by = pairs.slice(0, 5);
    const fieldsOf = async (list: { field: string; plan: string }[], more: { plan: Filter[]; actual: Filter[] }) => {
      const out: { field: string; plan: typeof tp.result.groups; actual: typeof tp.result.groups }[] = [];
      for (const f of list) {
        const p = await ask('plan', [f.plan], more.plan), a = await ask('actual', [f.field], more.actual);
        if (p.ok && a.ok) out.push({ field: f.field, plan: p.result.groups, actual: a.result.groups });
      }
      return out;
    };
    const v = varianceOf(tot, await fieldsOf(by, { plan: [], actual: [] }));
    let inner: { key: string; change: ReturnType<typeof varianceOf> } | undefined;
    const top = v.best?.movers[0];
    if (v.best && top && top.change && top.key !== '(not recorded)') {
      const pn = by.find(x => x.field === v.best?.field)?.plan ?? v.best.field;
      const rest = by.filter(f => f.field !== v.best?.field).slice(0, 4);
      if (rest.length) inner = { key: top.key, change: varianceOf({ plan: top.before, actual: top.after }, await fieldsOf(rest, { plan: [{ column: pn, op: 'eq', value: top.key }], actual: [{ column: v.best.field, op: 'eq', value: top.key }] })) };
    }
    const says = varianceSaid(v, input.title, input.unit, inner, input.better);
    const sheets = oneSheet ? `from ${pf.sheet ?? pf.name} (${input.plan.column} against ${input.actual.column})` : `the plan from ${pf.sheet} (${input.plan.column}), the actual from ${af.sheet} (${input.actual.column})`;
    const notes = [...new Set([...tp.result.notes, ...ta.result.notes])];
    const cautions = [
      oneSide.length ? `Not broken by ${oneSide.join(', ')}: ${oneSheet ? 'not a field of this sheet' : `held on one side only — say which field of the other sheet is the same, if one is`}.` : '',
      fp.left.length || fa.left.length ? `A filter on ${[...new Set([...fp.left, ...fa.left])].join(', ')} could not be applied to the ${fp.left.length ? 'plan' : 'actual'} side — the two sides are not filtered alike.` : '',
      input.from && (!planDate || !actualDate) ? 'The period is applied to one side only.' : '',
    ].filter(Boolean);
    const show = v.best ?? v.fields[0];
    const kept = show ? await keepResult(ctx, { title: `${input.title} — by ${show.field}`, source: { kind: ta.kind, id: ta.id, name: ta.name, ...(ta.sheet ? { sheet: ta.sheet } : {}), ...(ta.sourceId ? { sourceId: ta.sourceId } : {}) }, query: { variance: input }, result: varianceResult(show, v, ta.sheet ?? ta.name, notes) }) : undefined;
    const id = kept && !('why' in kept) ? kept.id : undefined;
    return {
      ok: true, refs: [],
      says: `${says} (Worked by the app over every row: ${sheets}.)${id ? ` [result ${id} — plan, actual and variance by ${show?.field}]` : ''}${cautions.length ? ` ${cautions.join(' ')}` : ''}${notes.length ? ` ${notes.join(' ')}` : ''}${!by.length ? ' No field shared by both sides with a few values was found to break it by — name the fields (by), and which are the same (same).' : ''}`,
      data: {
        plan: v.before, actual: v.after, variance: v.change, pct: v.pct, best: v.best?.field ?? null, sheets: { plan: pf.sheet ?? null, actual: af.sheet ?? null }, ...(id ? { resultId: id } : {}),
        fields: v.fields.map(f => ({ field: f.field, contributors: f.movers.slice(0, 8).map(m => ({ key: m.key, plan: m.before, actual: m.after, variance: m.change, sharePct: m.share === null ? null : m.share * 100, ...(m.onlyIn ? { only: m.onlyIn === 'before' ? 'plan' : 'actual' } : {}) })) })),
        ...(inner ? { within: { key: inner.key, best: inner.change.best?.field ?? null, contributors: (inner.change.best?.movers ?? []).slice(0, 5).map(m => ({ key: m.key, plan: m.before, actual: m.after, variance: m.change, sharePct: m.share === null ? null : m.share * 100 })) } } : {}),
        ...(oneSide.length ? { notBrokenBy: oneSide } : {}),
      },
    };
  },
};

interface JoinIn { a: string; b: string; title: string; measureA?: number; measureB?: number; rules?: JoinRule[] }
export const joinResultsCap: Capability = {
  name: 'join_results', title: 'Put two results side by side', kind: 'read',
  validate: raw => {
    const { rules, ...rest } = (raw ?? {}) as Record<string, unknown>;
    const c = checkObject(rest, {
      a: { kind: 'string', label: 'the first result', required: true, max: 40 }, b: { kind: 'string', label: 'the second result', required: true, max: 40 },
      title: { kind: 'string', label: 'what the comparison is ("Budget against actual downtime by reason")', required: true, max: 120 },
      measureA: { kind: 'int', label: 'which measure of the first', min: 0, max: 5 }, measureB: { kind: 'int', label: 'which measure of the second', min: 0, max: 5 },
    });
    if (!c.ok) return c;
    if (rules !== undefined && (!Array.isArray(rules) || rules.some(r => !r || typeof (r as JoinRule).a !== 'string' || typeof (r as JoinRule).b !== 'string'))) return { ok: false, why: 'rules: a list of { a, b } — a label of the first that is the same as a label of the second, as the person said.' };
    return { ok: true, input: { ...c.input, ...(Array.isArray(rules) ? { rules: (rules as JoinRule[]).slice(0, 40) } : {}) } as JoinIn };
  },
  allowed: anyone,
  async run(ctx: CapCtx, input: JoinIn): Promise<CapResult> {
    const all = await resultsOfConversation(ctx);
    const a = all.get(input.a), b = all.get(input.b);
    if (!a || !b) return { ok: false, why: `There is no result ${!a ? input.a : input.b} in this conversation — work each out with query_data first.` };
    const j = joinResults(a, b, input.measureA ?? 0, input.measureB ?? 0, input.rules ?? []);
    if ('why' in j) return { ok: false, why: j.why };
    const kept = await keepResult(ctx, { title: input.title, source: { kind: 'dataset', id: `join:${a.id}+${b.id}`, name: `${a.source.name} with ${b.source.name}` }, query: { join: { a: a.id, b: b.id, measureA: input.measureA ?? 0, measureB: input.measureB ?? 0, rules: input.rules ?? [] } }, result: j.result, from: a.id });
    const id = 'why' in kept ? undefined : kept.id;
    return { ok: true, refs: [], says: `${joinSaid(j, input.title, a, b)}${id ? ` [result ${id}]` : ''}`, data: { ...(id ? { resultId: id } : {}), rows: j.rows.slice(0, 40), onlyA: j.onlyA, onlyB: j.onlyB, totals: j.totals } };
  },
};

export const DIG: readonly Capability[] = [explainChange, explainVariance, joinResultsCap];
