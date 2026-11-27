/* THE CHART LUNA DID NOT DRAW (12 November — Rowland: "Show me B's trend month by month … the question definitely included a graph, now
 * I have to ask for a graph").
 *
 * A trend is a picture. When a turn worked out a series over time (a result grouped by day, week, month or year), or the person asked
 * for a graph, chart or trend and a result came of it, and Luna drew nothing — the app draws it itself, from that result, through the
 * same make_chart the colleague would have called: no second answer from the AI service, no figure that is not the result's own.
 * This only DECIDES; the screen runs make_chart. Pure. */
import type { Chart, DataResult } from '../lib/data/outputs';
import type { Used } from './conversation';
import { presentForm } from './presentAsk';

/** Asked for a picture, or for what a picture answers best — a pattern, a ranking, what is hurting — in the person's own words
 *  (Rowland, 12 November: "what patterns are forming with the shifts? What products are hurting every shift? … also kicks out a graph"). */
const ASKED = /\b(graph\w*|chart\w*|plot\w*|picture|visual\w*|trend\w*|pattern\w*|hurt\w*|worst|best|rank\w*|biggest|largest|highest|lowest|top \w+|compar\w*|break ?down|over time|month by month|week by week|day by day|year by year|by month|by week|per month|per week|show me)\b/i;
/** The follow-up the app offers when it drew nothing, and answers itself when it is said or tapped. */
export const GRAPH_OFFER = 'Show that as a graph';
/** The whole of what was said is a request for a graph of what was just worked out — nothing else in it. */
const GRAPH_ONLY = /^(yes|yeah|yep|ok|okay|sure|go on)?[,. ]*(please)?[,. ]*((can|could) (you|we)|i'?d like( you)? to|let'?s)?[,. ]*(please )?(show|put|give|draw|make|do|see|have|plot|chart|graph)?( me| us)?( that| it| this| them| those)?( as| in| on| into)?( a| the)? ?(graph|chart|plot)( format| form)?( of (that|it|this))?( for me| for us)?[,. ]*(please|thanks|thank you)?[.!?]*$/i;
const GRAPH_IT = /^(yes|ok|okay)?[,. ]*(please )?(graph|chart|plot) (it|that|this|them|those)( for me| for us)?[,. ]*(please)?[.!?]*$/i;
const GRAPH_BARE = /^(yes|ok|okay)?[,. ]*(please )?(as|in|on) (a |the )?(graph|chart|plot)( format| form)?[,. ]*(please|thanks|thank you)?[.!?]*$/i;
const YES_ONLY = /^(yes|yeah|yep|ok|okay|sure|go on)[,. ]*(please|thanks|thank you)?[.!]*$/i;
/** Luna already drew, changed or laid out a picture this turn. */
const DREW = new Set(['make_chart', 'refine_chart', 'build_report']);

export interface AutoChart { resultId: string; type: 'line' | 'column' | 'bar' }

/** A graph asked for and nothing else: "show that as a graph", "graph it", "yes please, show me in a graph" — or a bare "yes please"
 *  when the graph was what was just offered. */
export function graphAsked(said: string, offered: boolean): boolean {
  const s = said.trim();
  if (!s || s.length > 80) return false;
  if (offered && /^graphs?$/i.test(s)) return true;
  return (/(graph|chart|plot)/i.test(s) && (GRAPH_ONLY.test(s) || GRAPH_IT.test(s) || GRAPH_BARE.test(s))) || (offered && YES_ONLY.test(s));
}
/** The newest result of the conversation no chart has been drawn from — two points is enough for a comparison they asked to graph. */
export function resultToDraw(results: readonly DataResult[], drawn: ReadonlySet<string>): AutoChart | null {
  const r = [...results].sort((a, b) => b.at - a.at)[0];
  if (!r || drawn.has(r.id)) return null;
  const points = r.result.groups.filter(g => typeof g.values[0] === 'number').length;
  if (points < 2) return null;
  return { resultId: r.id, type: typeOf(r, points) };
}
const typeOf = (r: DataResult, points: number): AutoChart['type'] => ((r.query as { time?: unknown }).time ? 'line' : points > 6 ? 'bar' : 'column');
/** A result was worked out this turn and no picture was made of it nor is one worth drawing unasked — the app offers it. */
export function offerWorth(steps: readonly Used[], results: ReadonlyMap<string, DataResult>): boolean {
  const done = steps.filter(s => s.status === 'done');
  if (done.some(s => DREW.has(s.name))) return false;
  return done.flatMap(s => s.refs.filter(r => r.kind === 'result').map(r => results.get(r.id))).some(r => !!r && r.result.groups.filter(g => typeof g.values[0] === 'number').length >= 3);
}

/** The chart worth drawing for this turn, or null. `said` is what the person asked; `steps` what the turn ran, in order. */
export function chartWorth(said: string, steps: readonly Used[], results: ReadonlyMap<string, DataResult>): AutoChart | null {
  const done = steps.filter(s => s.status === 'done');
  if (done.some(s => DREW.has(s.name))) return null;
  const ids = done.flatMap(s => s.refs.filter(r => r.kind === 'result').map(r => r.id));
  const r = [...ids].reverse().map(id => results.get(id)).find((x): x is DataResult => !!x);
  if (!r) return null;
  const points = r.result.groups.filter(g => typeof g.values[0] === 'number').length;
  if (points < 3) return null;
  const overTime = !!(r.query as { time?: unknown }).time;
  if (!overTime && !ASKED.test(said)) return null;
  return { resultId: r.id, type: typeOf(r, points) };
}

/** An explicit instruction to create a dashboard can also accompany fresh analysis. */
export function dashboardAsked(words: string): boolean {
  if (!/\b(?:html\s+)?dashboard\b/i.test(words) || /\b(?:no|without|skip|don['’]?t|do not|instead of|rather than)\b/i.test(words)) return false;
  const command = words.trim().replace(/^(?:hey\s+)?(?:luna[, ]+)?(?:please[, ]+)?(?:(?:can|could|would) you\s+)?(?:please\s+)?/i, '');
  if (/^(?:make|create|build|turn|convert|export|put|save|give)\b/i.test(command)) return true;
  return /^(?:show|analyse|analyze|compare|plot|graph|chart)\b.+\b(?:as|into|in|on)\s+(?:an?\s+)?(?:interactive\s+|animated\s+)?(?:html\s+)?dashboard\b/i.test(command);
}

export function graphsRequested(words: string): boolean {
  if (dashboardAsked(words)) return true;
  if (presentForm(words) === 'graphs') return true;
  return /\b(graphs|charts|plots|visuals|visualisations|visualizations)\b/i.test(words) && !/\b(no|without|skip) (?:any )?(graphs|charts|plots|visuals)\b/i.test(words);
}

export function chartViews(said: string, steps: readonly Used[], results: ReadonlyMap<string, DataResult>, charts: ReadonlyMap<string, Chart>) {
  const refs = steps.filter(step => step.status === 'done').flatMap(step => step.refs);
  const existing = new Map<string, { chart: Chart; version: number }>();
  for (const ref of refs.filter(r => r.kind === 'chart')) {
    const [id, v] = ref.id.split('@');
    const chart = charts.get(id);
    const version = Number(v) || chart?.versions.length || 0;
    if (chart?.versions[version - 1]) existing.set(ref.id, { chart, version });
  }
  const views = [...existing.values()];
  const covered = new Set(views.flatMap(({ chart, version }) => {
    const spec = chart.versions[version - 1];
    return [spec.resultId, spec.compareResultId];
  }));
  const missing: AutoChart[] = [];
  if (graphsRequested(said)) {
    for (const ref of refs) {
      if (ref.kind !== 'result' || covered.has(ref.id)) continue;
      const r = results.get(ref.id);
      if (!r) continue;
      const count = r.result.groups.filter(g => typeof g.values[0] === 'number').length;
      if (count < 2) continue;
      missing.push({ resultId: ref.id, type: typeOf(r, count) });
      covered.add(ref.id);
    }
  }
  return { views, missing };
}

/** The ordered charts a reply actually displays, including previews from older saved results. */
export function replyChartItems(request: string, steps: readonly Used[], results: ReadonlyMap<string, DataResult>, charts: ReadonlyMap<string, Chart>) {
  const { views, missing } = chartViews(request, steps, results, charts);
  const entries = views.map(v => ({ ...v, preview: false }));
  for (const want of missing) {
    const result = results.get(want.resultId);
    if (!result) continue;
    entries.push({ chart: { id: result.id, at: result.at, versions: [{ ...want, title: result.title, measure: 0 }] }, version: 1, preview: true });
  }
  const order = steps.flatMap(s => s.refs.filter(r => r.kind === 'result').map(r => r.id));
  return entries.map(item => {
    const spec = item.chart.versions[item.version - 1];
    const result = results.get(spec.resultId);
    const groups = result?.result.groupBy ?? [];
    const key = groups.join(' × ') || spec.title;
    const sort = result?.query.order as { by?: unknown; desc?: boolean } | undefined;
    const limited = result && result.result.groups.length < result.result.groupsTotal;
    const direction = limited && typeof sort?.by === 'number' ? (sort.desc === false ? 'lowest' : 'highest') : '';
    const name = key === key.toUpperCase() ? key.charAt(0) + key.slice(1).toLowerCase() : key;
    return { ...item, spec, label: direction ? name + ' · ' + direction : name, order: order.indexOf(spec.resultId) };
  }).sort((a,b) => a.order - b.order);
}
