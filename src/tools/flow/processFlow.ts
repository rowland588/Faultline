/* THE PROCESS FLOW CHART — operation, transport, inspection, delay, storage (FC-003; knowledge/specs/FC-003-process-flow-chart.md;
 * knowledge/methods/lean/process-flow-chart.md).
 *
 * Every step of ONE thing — a tray, a pallet, an ingredient's batch — in order as it happens on the floor, each classed by the five
 * ASME symbols (ASME Standard 101, 1947; ILO, Introduction to Work Study, ch. 8): an OPERATION changes the product, a TRANSPORT moves
 * it, an INSPECTION checks it, a DELAY holds it unplanned, a STORAGE holds it by design. Each step carries its time and, for a
 * transport, its distance. The totals by class say how much of the path changes the product and how much is waiting; the questioning
 * that follows (eliminate, combine, rearrange, simplify — FC-028) is the person's. Pure: the page, the paper and the acceptance script
 * read these figures and sentences. Nothing is read from a machine; a step without a time is said, never given one. */
export type FlowKind = 'operation' | 'transport' | 'inspection' | 'delay' | 'storage';
export const FLOW_KINDS: readonly FlowKind[] = ['operation', 'transport', 'inspection', 'delay', 'storage'];
export type FlowSymbol = 'O' | 'T' | 'I' | 'D' | 'S';
export const SYMBOL: Record<FlowKind, FlowSymbol> = { operation: 'O', transport: 'T', inspection: 'I', delay: 'D', storage: 'S' };
export const FLOW_WORD: Record<FlowKind, { name: string; means: string }> = {
  operation: { name: 'Operation', means: 'the product is changed — mixed, cooked, filled, sealed, packed' },
  transport: { name: 'Transport', means: 'it is moved from one place to another' },
  inspection: { name: 'Inspection', means: 'it is checked or counted — nothing about it changes' },
  delay: { name: 'Delay', means: 'it waits, unplanned — for a forklift, for QA release' },
  storage: { name: 'Storage', means: 'it waits by design — a chill, a proving time, a store' },
};
export const isFlowKind = (v: unknown): v is FlowKind => (FLOW_KINDS as readonly unknown[]).includes(v);

export interface FlowStep { what: string; kind: FlowKind; /** minutes; absent = not timed */ min?: number; /** metres, a transport's */ m?: number }

export interface FlowFigures {
  n: number;
  count: Record<FlowKind, number>;
  minutes: Record<FlowKind, number>;
  /** Σ the transports' metres. */
  metres: number;
  /** Σ every timed step. */
  total: number;
  /** Steps with no time typed, and transports with no distance — said, never filled. */
  untimed: number;
  noDistance: number;
  /** Operations' share of all the time; delay + storage's share; operations' share of the time that is not storage (storage is by design). */
  opsShare?: number;
  waitShare?: number;
  opsLessStorage?: number;
  longestTransport?: { step: number; what: string; m: number };
  longestDelay?: { step: number; what: string; min: number };
}

const zero = (): Record<FlowKind, number> => ({ operation: 0, transport: 0, inspection: 0, delay: 0, storage: 0 });

export function flowFigures(steps: readonly FlowStep[]): FlowFigures {
  const count = zero(), minutes = zero();
  let metres = 0, untimed = 0, noDistance = 0;
  let longestTransport: FlowFigures['longestTransport'], longestDelay: FlowFigures['longestDelay'];
  steps.forEach((s, i) => {
    count[s.kind]++;
    if (s.min === undefined) untimed++; else minutes[s.kind] += s.min;
    if (s.kind === 'transport') {
      if (s.m === undefined) noDistance++;
      else { metres += s.m; if (!longestTransport || s.m > longestTransport.m) longestTransport = { step: i + 1, what: s.what, m: s.m }; }
    }
    if (s.kind === 'delay' && s.min !== undefined && (!longestDelay || s.min > longestDelay.min)) longestDelay = { step: i + 1, what: s.what, min: s.min };
  });
  const total = FLOW_KINDS.reduce((t, k) => t + minutes[k], 0);
  const rest = total - minutes.storage;
  return {
    n: steps.length, count, minutes, metres, total, untimed, noDistance,
    ...(total > 0 ? { opsShare: minutes.operation / total, waitShare: (minutes.delay + minutes.storage) / total } : {}),
    ...(rest > 0 ? { opsLessStorage: minutes.operation / rest } : {}),
    ...(longestTransport ? { longestTransport } : {}), ...(longestDelay ? { longestDelay } : {}),
  };
}

/** MONEY (knowledge/MONEY.md §4, FC-003: the same model as the map — labour L, inventory H): the people's minutes on the moves and the checks, and what holding
 *  the product through its delays and storage costs, a day. Every input optional. */
export interface FlowMoneyIn { perDay?: number; rate?: number; loadValue?: number; carry?: number }
export interface FlowMoney {
  /** People's minutes a day on transports and inspections (a person to each, as the chart says), and their cost at the hourly rate. */
  moveMinPerDay?: number; labourPerDay?: number;
  /** £ to hold one load through its delays and storage, and a day's, at the typed annual rate. */
  carryPerLoad?: number; carryPerDay?: number; carryDelayPerDay?: number; carryStoragePerDay?: number;
  missing: string[];
}
export const MIN_PER_YEAR = 365 * 24 * 60;

export function flowMoney(f: FlowFigures, x: FlowMoneyIn): FlowMoney {
  const out: FlowMoney = { missing: [] };
  const moveMin = f.minutes.transport + f.minutes.inspection;
  if (x.perDay === undefined) out.missing.push('Give how many times a day this path is followed to say the moves and the waiting in money a day.');
  else {
    if (x.rate === undefined) out.missing.push('Give the line a wage (Set up the line), or type what an hour of the person moving and checking costs, to say the labour in money.');
    else { out.moveMinPerDay = moveMin * x.perDay; out.labourPerDay = (moveMin * x.perDay / 60) * x.rate; }
    if (x.loadValue === undefined) out.missing.push('Give what one load is worth to say what holding it costs.');
    if (x.carry === undefined) out.missing.push('Give the cost of holding stock for a year (finance will have it; the industry quotes 15–35% a year — Luna never fills it in) to say what the waiting costs.');
    if (x.loadValue !== undefined && x.carry !== undefined) {
      const held = x.loadValue * x.carry / 100 / MIN_PER_YEAR;
      out.carryPerLoad = held * (f.minutes.delay + f.minutes.storage);
      out.carryPerDay = out.carryPerLoad * x.perDay;
      out.carryDelayPerDay = held * f.minutes.delay * x.perDay;
      out.carryStoragePerDay = held * f.minutes.storage * x.perDay;
    }
  }
  return out;
}
