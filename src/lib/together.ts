/* ALL TOGETHER — one product on its line, its three tools read on one page.
 *
 * Rowland, 17 October: "my concern is you make it complex ... but also what
 * about option to do it all together this way when appropriate we have the
 * option". The three stay three tools — Line standard (who stands where),
 * Line balance (what each person does, timed against takt), Line capacity
 * (what the line can make, where it is held) — each changed only in its
 * own place. This reads them side by side, the way the floor sees a line:
 * station by station, what the station makes, whether it is the bottleneck,
 * who works there and how their timed work sits against their takt.
 *
 * Pure: the product's record and its newest line balance in, what the page
 * and its paper print out — the screen (ui/Together) and the PDF
 * (lib/togetherPdf) both read this, so the two never part. Nothing is worked
 * out here that a tool does not already work out: the capacity is
 * lib/capacity's, the people lib/ie/balance's, the link lib/ie/balanceLink's. */
import { analyse, bottleneckCost, bottleneckCostSays, fmtN, labourInputs, shortSays, type Capacity, type CapacityResult, type StationResult } from './capacity';
import type { Workspace } from '../types';
import { aPiece, balance, balanceSays, secs, type BalanceFigures, type PersonFigures } from './ie/balance';
import { agreedFor, crewKept, stationsOf } from './ie/balanceLink';
import { headcount, hasMap, type Standard } from './standard';
import type { AgreedBalance, ToolStudy } from './study';
import type { Tone } from './ie/sample';

/** What a product's Line capacity says in a line: "Bagger limits at 58
 *  bags/min · 2 short of 60", and whether it is short — the only part that
 *  wears red. One sentence for every place that names it. */
export function capacitySays(cap: Capacity | undefined): { text: string; short: boolean } {
  const n = cap?.stations.length ?? 0;
  if (!cap || n === 0) return { text: 'No stations yet — open it and write the line’s stations for this product', short: false };
  const r = analyse(cap);
  return { text: shortSays(r) ?? `${n} station${n === 1 ? '' : 's'} — speeds still to fill in`, short: (r.gap ?? 0) > 0 };
}

/** One person at a station, as the page says them. */
export interface TogetherPerson { who: string; says: string; over: boolean; untimed: boolean }

/** One station, in flow order. */
export interface TogetherStation {
  id: string;
  name: string;
  /** Which of several lines it is on. */
  lane?: string;
  kind: 'machine' | 'people';
  /** "70 bags/min" — what it can make once its own stops count, in its own unit — or why it cannot be counted yet. */
  makes: string;
  /** Its capacity against the bottleneck's, percent — 100 at the bottleneck. */
  ofLimit?: number;
  limit: boolean;
  people: TogetherPerson[];
}

export interface Together {
  product: string;
  /** Line capacity's sentence, and whether the line is short of its target. */
  capacity: { text: string; short: boolean };
  /** What the bottleneck costs a pack (lib/capacity bottleneckCost), when the people and their rate are known. */
  money?: { text: string; short: boolean };
  /** The line balance's sentence — or what to do when there is none. */
  balance: { text: string; tone: Tone; red: string[] };
  /** People on the map, and what the work needs at this takt. */
  people: string;
  stations: TogetherStation[];
  /** People in the line balance at no station. */
  loose: TogetherPerson[];
  /** The line balance's people, for their bars against takt. */
  figures?: BalanceFigures;
  agreed?: AgreedBalance;
  hasMap: boolean;
  hasBalance: boolean;
}

const personSays = (p: PersonFigures): TogetherPerson => ({
  who: p.who, over: p.overBy > 0, untimed: p.source === 'none',
  says: p.source === 'none' ? `${secs(p.work)}${aPiece(p)} so far — not all timed`
    : p.takt ? `${secs(p.work)} of ${secs(p.takt)}${aPiece(p)} takt${p.overBy ? ` — over by ${secs(p.overBy)}` : p.spare ? ` — ${secs(p.spare)} to spare` : ''}`
      : `${secs(p.work)}${aPiece(p)} a cycle`,
});

/** Every counted station, wherever the capacity worked it out — one chain, each of several lines, or after they merge. */
function results(r: CapacityResult | undefined): Map<string, StationResult> {
  const out = new Map<string, StationResult>();
  if (!r) return out;
  for (const x of r.ok) out.set(x.station.id, x);
  for (const sec of r.lanes?.sections ?? []) for (const x of sec.result.ok) out.set(x.station.id, x);
  for (const x of r.lanes?.merged?.ok ?? []) out.set(x.station.id, x);
  return out;
}

/** The product, all together. `study`: its newest line balance, if any;
 *  `line`: the line it is on, for its labour rate and margin. */
export function togetherOf(s: Standard, study?: ToolStudy | null, line?: Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'marginPerPack'>): Together {
  const cap = s.capacity;
  const r = cap?.stations.length ? analyse(cap) : undefined;
  const byId = results(r);
  const limitId = r?.limit?.station.id;
  const limitEff = r?.limit?.effective;
  const crew = study ? crewKept(study.facts.crew ?? [], cap) : [];
  const a = study ? agreedFor(study.agreed?.balance, cap, !!study.closedAt) : undefined;
  /* the line balance read as its own page reads it (ui/WorkBalance figuresFor) */
  const figures = study ? balance(study.facts.steps, a, crew) : undefined;
  const onMap = headcount(s);
  const unit = r?.unit;
  const stations: TogetherStation[] = stationsOf(cap).map(p => {
    const x = byId.get(p.id);
    const st = cap?.stations.find(y => y.id === p.id);
    const who = crew.filter(c => c.stationId === p.id).map(c => c.who);
    return {
      id: p.id, name: p.name, ...(p.lane ? { lane: p.lane } : {}), kind: p.kind,
      makes: x ? `${fmtN(x.does)} ${p.unit || 'units'}/min${unit && x.factor !== 1 ? ` · ${fmtN(x.effective)} ${unit}` : ''}` : st ? 'not counted yet' : '—',
      ...(x && limitEff ? { ofLimit: Math.round((x.effective / limitEff) * 100) } : {}),
      limit: p.id === limitId,
      people: (figures?.people ?? []).filter(q => who.includes(q.who)).map(personSays),
    };
  });
  const placed = new Set(crew.filter(c => c.stationId && stations.some(x => x.id === c.stationId)).map(c => c.who));
  const said = figures ? balanceSays(figures, onMap || undefined) : undefined;
  const li = labourInputs(cap, onMap || undefined, line);
  const bk = r ? bottleneckCost(r, li.people, li.rate, line?.marginPerPack) : undefined;
  return {
    product: s.product,
    capacity: capacitySays(cap),
    ...(bk && r ? { money: bottleneckCostSays(bk, r) } : {}),
    balance: said
      ? { text: said.text, tone: said.tone, red: said.lines.filter(l => l.tone === 'r').map(l => l.text) }
      : { text: 'No line balance yet — time each person’s work against takt.', tone: 'n', red: [] },
    people: `${onMap} ${onMap === 1 ? 'person' : 'people'} on the map${figures?.fewest !== undefined ? ` · the work needs ${figures.fewest}` : ''}${figures ? ` · ${figures.people.length} in the line balance` : ''}`,
    stations,
    loose: (figures?.people ?? []).filter(q => !placed.has(q.who)).map(personSays),
    ...(figures ? { figures } : {}),
    ...(a ? { agreed: a } : {}),
    hasMap: hasMap(s),
    hasBalance: !!study,
  };
}
