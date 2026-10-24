/* LINE CAPACITY, READ FOR PAPER — one product's capacity on a line, as its
 * own page (lib/capacityPaperPdf; docs/CAPACITY.md; docs/AUDIT.md, bar 3).
 *
 * Rowland, 13 October: "I find that I'm always asking for reports, or cards,
 * to be able to present things in a certain way that would seem to be
 * obvious, but aren't, because you're not building them." Line capacity was
 * worked out on its page — the stations, the capacity sheet, the V, what a
 * shift makes, what a pack costs — and none of it reached paper on its own.
 *
 * The page answers the three questions in their order (docs/SIMPLE.md):
 *  · where we are — what limits the line and by how much, in one line, the
 *    module's sentence under it (lib/capacity analyse, shortSays);
 *  · why — where it is limited: the V either side of the bottleneck, the
 *    bottleneck walked, the capacity sheet a row a station, and only what
 *    is wrong said in words (a station not counted, a unit to check);
 *  · what it means and what we are doing about it — a shift's make, what
 *    a pack costs in labour and one more person, the what-ifs tried with
 *    what each would do, the people's work against takt.
 *
 * Every sentence is the one the page says, made by the module that makes it
 * there — so the screen and the paper are one statement. Nothing is cut.
 * Only the abnormal carries colour: a station the target needs more than it
 * can do (red), one under the V or a machine not on its plate speed (amber),
 * a person over takt (red). The bottleneck is marked, not coloured — it is
 * the limit, not a failure. */
import { allowanceOf, analyse, bottleneckCost, bottleneckCostSays, changedWords, compareSays, fmtMoney, labourCost, oneMorePerson, shiftCapacity, screenCapacity, vCurve, whatIfCapacity, whatIfLabour, whatIfStations, type Capacity, type ChangeoverIn, type LabourInputs, type ShiftIn, type Station } from './capacity';
import { cycleWords, fmtBig, fmtN, oneOf } from './capacityWords';
import { shortSays } from './capacitySays';
import type { WalkVerdict } from '../../lib/ie/walk';
import { planToTarget } from './capacityPlan';

export type Tone = 'r' | 'a' | 'n';

export interface CapacityPaperRow {
  /** Its place in the flow, from 1. */
  n: number;
  name: string;
  people: boolean;
  /** "×2" when more than one side by side. */
  crew?: string;
  /** Its unit and the chain to the line's: "baskets · 12 bags each", or the
   *  line's own unit at the front. */
  unit: string;
  /** Its speed as typed, in its own unit: "5.5 baskets a minute". */
  speed: string;
  /** How the speed is known: "on the plate", "timed — not its plate speed". */
  how: string;
  /** A machine whose speed is not off its plate (docs/CAPACITY.md §1). */
  notPlate: boolean;
  stops: string;
  good: string;
  /** In the line's unit, once its own stops count. */
  perMin: string;
  perHour: string;
  /** "the bottleneck", or its share of the bottleneck's — "118%". */
  ofNeck: string;
  /** Under the V the owner agreed. */
  under: boolean;
  /** What the target needs of it — "109%"; absent with no target. */
  needs?: string;
  /** The target needs more than it can do. */
  over: boolean;
  limit: boolean;
  /** Its share of the bottleneck as a number — once its own stops count,
   *  while running, and what the agreed V asks — for the V drawn on paper. */
  pct?: number; runningPct?: number; guide?: number;
  /** Which line it is on, or "After the lines merge", when several lines feed
   *  one place (lib/capacity Lane) — each group has its own V and its own
   *  bottleneck. Absent on a single line. */
  group?: string;
}

/** A group of rows with its own V — a line, or the place they merge. */
export interface CapacityPaperGroup {
  name: string;
  /** "on its own, 68.3 units/min" · "what they send, 137 units/min, against what the shared stations take". */
  says: string;
  /** The target as a share of this group's bottleneck, where the target is for it. */
  targetPct?: number;
  /** Its V in words — the sentence the page says under each line's V. */
  v?: { text: string; tone: Tone };
}

export interface CapacityPaperShift {
  name: string; time: string; breaks: string; changeovers: string; making: string; made: string; without?: string;
}

export interface CapacityPaper {
  product: string;
  /** The line it is on — its name, or "On no line" for a map made inside a job. */
  line: string;
  /** The job it is for, by name — absent on a tool on the line alone. */
  job?: string;
  printed: string;
  unit: string;
  /** Where we are, in a few words: "Basketer limits at 55.2 bags/min · 4.8 short of 60". */
  headline: string;
  /** Short of its target — the one state on the page that is red. */
  short: boolean;
  /** The module's sentence (lib/capacity analyse). */
  sentence: string;
  /** "60 bags a minute", when a target is set. */
  target?: string;
  /** The target as a share of the bottleneck, for the V drawn on paper. */
  targetPct?: number;
  /** Every station counted, in flow order. */
  rows: CapacityPaperRow[];
  /** Several lines feeding one place: the groups the rows fall in, in order. */
  groups?: CapacityPaperGroup[];
  /** The V either side of the bottleneck (lib/capacity vCurve) — with two or more counted. */
  v?: { text: string; tone: Tone };
  /** The bottleneck walked, against the sums (lib/ie/walk). */
  walk?: { text: string; tone: Tone };
  /** What to check before trusting the sums — a station not counted, a unit
   *  counted one-for-one. Only what is wrong. */
  check: string[];
  /** The way to the target, worked out (lib/capacityPlan) — only while short of it. */
  /** The way to the target (lib/capacityPlan): its sentence, its steps, and
   *  — when it reaches the target — the whole in a few words ("1 more person
   *  and 1 more machine. The line then makes 70."), so the steps need not be
   *  said twice. */
  plan?: { says: string; steps: string[]; sum?: string };
  /** Capacity a shift (lib/capacity shiftCapacity). */
  shift?: { rows: CapacityPaperShift[]; day?: CapacityPaperShift; sentence: string };
  /** What a pack costs in labour, and one more person at the bottleneck. */
  labour?: { says: string; more?: string };
  /** WHAT THE BOTTLENECK COSTS A PACK, under the headline (lib/capacity
   *  bottleneckCost) — red when the line is short of its target. */
  money?: { text: string; short: boolean };
  /** The people's work against takt (lib/ie/balance), its over-takt lines red. */
  work?: { text: string; lines: { text: string; tone: Tone }[] };
  /** Each what-if tried, what it would do against the line as run. */
  whatIfs: { name: string; says: string; changed: string[]; onBoard: boolean; labour?: string }[];
  /** THE FIGURES the lean page's tiles say (lib/capacityLean, docs/LEAN-PAGE.md):
   *  what the line makes and who holds it, the target and the gap, labour a
   *  pack now and at the target, the people and where the number came from. */
  figures: {
    stations: number; line?: number; limit?: string; target?: number; gap?: number;
    perPack?: number; perHour?: number; perPackThen?: number; extraPerPack?: number; against?: 'target' | 'next';
    /** What the line would make without the bottleneck, the station that would hold it then, £ a minute paid for packs not made, contribution lost a minute. */
    then?: number; next?: string; perMin?: number; contributionPerMin?: number;
    people?: number; peopleFrom?: LabourInputs['peopleFrom'];
  };
}

const PER: Record<NonNullable<Station['ratePer']>, string> = { sec: 'a second', min: 'a minute', hour: 'an hour' };
const HOW: Record<NonNullable<Station['source']>, string> = { plate: 'on the plate', timed: 'timed', standard: 'standard time — the line balance', estimate: 'a guess' };

/** A station's speed as it was typed, in the unit it was typed in — its own,
 *  or the one before's for a palletiser timed per basket — the capacity
 *  sheet's words. `prevUnit`: the unit of the station before it. */
export function speedWords(s: Station, prevUnit?: string): string {
  const unit = (s.speedIn === 'before' && prevUnit?.trim() ? prevUnit : s.unit).trim() || 'units';
  if (s.rate != null && s.rate > 0) return `${fmtN(s.rate)} ${unit} ${PER[s.ratePer ?? 'min']}`;
  if (s.cycleSec) return cycleWords(s.perCycle ?? 1, s.cycleSec, unit);
  return 'no speed yet';
}

/** How it is known, as the capacity sheet says it: a machine goes by its
 *  plate (docs/CAPACITY.md §1) — any other source is said as not its plate. */
export function howWords(s: Station): { text: string; notPlate: boolean } {
  if (s.kind === 'machine') {
    if (s.source === 'plate') return { text: HOW.plate, notPlate: false };
    return { text: `${s.source ? HOW[s.source] : 'typed'} — not its plate speed`, notPlate: true };
  }
  return { text: s.source ? HOW[s.source] : 'not timed yet', notPlate: false };
}

/** The cost a pack, in the words the page says it (CapacityPanel, LabourBox). */
export function labourSays(r: ReturnType<typeof analyse>, li: LabourInputs): string | undefined {
  const cost = labourCost(r, li.people, li.rate);
  if (!cost) return undefined;
  const one = oneOf(r.unit);
  const good = r.goodOut != null && r.line != null && r.goodOut < r.line - 1e-9 ? ', good ones' : '';
  return `${fmtMoney(cost.perPack)} a ${one} — ${cost.people} ${cost.people === 1 ? 'person' : 'people'} × ${fmtMoney(cost.ratePerHour)} = ${fmtMoney(cost.perHour)} an hour; the line makes ${fmtBig(cost.packsPerHour)} ${r.unit} an hour (${fmtN(cost.packsPerHour / 60)} a minute${good}).`;
}

const FROM_PEOPLE: Record<NonNullable<LabourInputs['peopleFrom']>, string> = { typed: 'typed on the capacity', map: 'those placed on the line standard', line: 'the line’s crew' };
const FROM_RATE: Record<NonNullable<LabourInputs['rateFrom']>, string> = { typed: 'typed on the capacity', line: 'the line’s, with its on-costs' };

const mins = (m?: number) => (m == null ? '—' : `${fmtN(Math.round(m * 10) / 10)} min`);
const count = (n?: number) => (n == null ? '—' : Math.round(n).toLocaleString('en-GB'));

export interface CapacityPaperIn {
  product: string;
  line: string;
  job?: string;
  printed: string;
  capacity?: Capacity;
  /** The line's shifts (lib/capacity shiftsIn) — undefined when the product is on no line. */
  shifts?: ShiftIn[];
  /** The changeover into this product (lib/ie/changeover changeoverIn). */
  co?: ChangeoverIn;
  labour: LabourInputs;
  /** The line's contribution a pack (its margin), for what the packs not made are worth. */
  margin?: number;
  /** The latest walk's verdict, against the sums. */
  walk?: WalkVerdict;
  /** The people's work against takt (lib/ie/balance balanceSays). */
  work?: { text: string; lines: { text: string; tone: string }[] };
}

/** One product's capacity, read for its page. */
export function capacityPaper(x: CapacityPaperIn): CapacityPaper {
  const cap: Capacity = x.capacity ?? { stations: [] };
  const r = analyse(cap);
  const n = cap.stations.length;
  const head = shortSays(r);
  const base = { product: x.product, line: x.line, ...(x.job ? { job: x.job } : {}), printed: x.printed, unit: r.unit };
  if (!n) {
    return { ...base, headline: 'No stations yet — the line’s stations for this product are still to be written down', short: false,
      sentence: r.sentence, rows: [], check: [], whatIfs: [],
      figures: { stations: 0, ...(x.labour.people != null ? { people: x.labour.people, ...(x.labour.peopleFrom ? { peopleFrom: x.labour.peopleFrom } : {}) } : {}) } };
  }
  /* A SINGLE LINE is one group; several lines are a group each and the place
     they merge (lib/capacity LanesView) — a V is read along ONE line. */
  const sections: { name: string; says: string; res: typeof r; target?: number }[] = r.lanes
    ? [...r.lanes.sections.filter(x => x.result.ok.length > 0).map(x => ({ name: x.name, says: `on its own, ${fmtN(x.result.line as number)} ${r.unit}/min`, res: x.result })),
       ...(r.lanes.merged ? [{ name: 'After the lines merge', says: `what they send, ${fmtN(r.lanes.sends)} ${r.unit}/min, against what the shared stations take`, res: r.lanes.merged, ...(r.target != null ? { target: r.target } : {}) }] : [])]
    : [{ name: '', says: '', res: r, ...(r.target != null ? { target: r.target } : {}) }];
  const vs = sections.map(sec => ({ sec, v: sec.res.ok.length ? vCurve(sec.res, cap.vMarginPct) : undefined }));
  const v = !r.lanes && r.ok.length ? vs[0]?.v : undefined;
  const target = r.target;
  const rows: CapacityPaperRow[] = vs.flatMap(({ sec, v: sv }) => {
    const pts = new Map((sv?.points ?? []).map(p => [p.index, p]));
    return sec.res.ok.map((o, k) => {
      const s = o.station, p = pts.get(o.index), isLimit = sec.res.limit?.index === o.index;
      const t = sec.target;
      const need = t != null && o.effective > 0 ? (t / o.effective) * 100 : undefined;
      const how = howWords(s);
      const crew = s.crew != null && s.crew > 1 ? `×${fmtN(s.crew)}` : undefined;
      const prevUnit = sec.res.ok[k - 1]?.station.unit ?? cap.stations[o.index - 1]?.unit;
      return {
        n: o.index + 1, name: s.name.trim() || `Station ${o.index + 1}`, people: s.kind === 'people', ...(crew ? { crew } : {}),
        unit: `${k === 0 ? `${s.unit.trim() || 'units'} — the line’s unit` : o.chain}${s.kind === 'people' ? ` · ${fmtN(s.crew ?? 1)} ${(s.crew ?? 1) === 1 ? 'person' : 'people'}` : ''}`,
        /* a person's time with their rest allowance said beside it (docs/CAPACITY.md §1) */
        speed: `${speedWords(s, prevUnit)}${allowanceOf(s) > 0 ? ` + ${fmtN(allowanceOf(s) * 100)}% rest` : ''}`, how: how.text, notPlate: how.notPlate,
        stops: s.runningPct != null && s.runningPct < 100 ? `${fmtN(100 - s.runningPct)}%` : '—',
        good: s.goodPct != null && s.goodPct < 100 ? `${fmtN(s.goodPct)}%` : '—',
        perMin: fmtN(o.effective), perHour: fmtN(o.effective * 60),
        ofNeck: isLimit ? 'the bottleneck' : p ? `${fmtN(Math.round(p.pct))}%${p.under ? ' · under the V' : ''}` : '—',
        under: !!p?.under,
        ...(t != null ? { needs: need != null ? `${fmtN(Math.round(need))}%` : '—' } : {}),
        over: need != null && need > 100 + 1e-9,
        limit: isLimit,
        ...(p ? { pct: p.pct, runningPct: p.runningPct, ...(p.guide != null ? { guide: p.guide } : {}) } : {}),
        ...(sec.name ? { group: sec.name } : {}),
      };
    });
  });
  const groups: CapacityPaperGroup[] | undefined = r.lanes
    ? vs.map(({ sec, v: sv }) => ({ name: sec.name, says: sec.says, ...(sv && sec.res.ok.length >= 2 ? { v: { text: sv.sentence, tone: (sv.under.length ? 'a' : 'n') as Tone } } : {}),
        ...(sec.target != null && sec.res.limit && sec.res.limit.effective > 0 ? { targetPct: (sec.target / sec.res.limit.effective) * 100 } : {}) }))
    : undefined;

  /* WHAT TO CHECK — only what is wrong: a station not counted and why, a
     conversion that reads like a missing number. */
  const check = [
    ...r.skipped.map(k => `${k.station.name.trim() || `Station ${k.index + 1}`} is not counted: ${k.why}.`),
    ...r.notes,
    /* the page's "Check the numbers", in the same words (lib/capacity screenCapacity) */
    ...screenCapacity(cap, r).map(c => c.text),
  ];

  const plan = planToTarget(cap);

  /* A SHIFT — the line's own shifts, less the breaks it stops for and the
     changeovers SMED timed into this product, at the bottleneck. */
  const sc = x.shifts ? shiftCapacity(r, x.shifts, x.co) : undefined;
  const shift = sc ? {
    rows: sc.rows.map(s => ({
      name: s.name, time: mins(s.min),
      breaks: s.breakMin == null ? 'not set' : s.breakMin === 0 ? 'relief — 0' : mins(s.breakMin),
      changeovers: s.changeoverMin == null ? (x.co ? 'not counted' : 'none timed') : mins(s.changeoverMin),
      making: mins(s.making), made: count(s.made), ...(s.without != null ? { without: `${count(s.without)} with none` } : {}),
    })),
    ...(sc.rows.length > 1 && sc.day ? { day: { name: 'A day', time: '', breaks: '', changeovers: sc.day.changeoverMin != null ? mins(sc.day.changeoverMin) : '', making: '', made: count(sc.day.made),
      ...(sc.day.without != null ? { without: `${count(sc.day.without)} with none` } : {}) } } : {}),
    sentence: sc.sentence,
  } : undefined;

  /* WHAT A PACK COSTS IN LABOUR — and where its people and rate came from,
     so a stand-in is never read as a decision. */
  const says = labourSays(r, x.labour);
  const bk = bottleneckCost(r, x.labour.people, x.labour.rate, x.margin);
  const money = bk ? bottleneckCostSays(bk, r) : undefined;
  const more = oneMorePerson(cap, r, x.labour.people, x.labour.rate);
  const from = [x.labour.peopleFrom ? `people: ${FROM_PEOPLE[x.labour.peopleFrom]}` : '', x.labour.rateFrom ? `rate: ${FROM_RATE[x.labour.rateFrom]}` : ''].filter(Boolean).join('; ');
  const machine = says && !more && r.limit && r.limit.station.kind === 'machine'
    ? `The bottleneck is a machine — ${r.limit.station.name.trim() || 'it'}: another person there adds an hour’s cost and no ${r.unit}.` : undefined;
  const unsaid = x.labour.people == null && x.labour.rate == null ? 'how many people are on the line and what one costs an hour are'
    : x.labour.people == null ? 'how many people are on the line is' : 'what one person costs an hour is';
  const labour = r.line == null ? undefined : says
    ? { says: `${says}${from ? ` (${from})` : ''}`, ...(more ? { more: more.sentence } : machine ? { more: machine } : {}) }
    : { says: `Not worked out — ${unsaid} not said yet.` };

  /* THE WHAT-IFS — each a copy of the line with one thing changed, said
     against the line as run, and whether it is on the board. */
  const whatIfs = (cap.whatIfs ?? []).map(w => {
    const wc = whatIfCapacity(cap, w), wr = analyse(wc);
    const wl = whatIfLabour(cap, r, wc, wr, x.labour.people, x.labour.rate);
    return { name: w.name, says: compareSays(r, wr, w.name), changed: changedWords(cap.stations, whatIfStations(cap.stations, w)), onBoard: !!w.action,
      ...(wl ? { labour: wl.sentence } : {}) };
  });

  return {
    ...base,
    headline: head ?? `${n} station${n === 1 ? '' : 's'} — speeds still to fill in`,
    ...(money ? { money } : {}),
    short: (r.gap ?? 0) > 0 && (!!r.next || !!r.lanes),
    sentence: r.sentence,
    ...(target != null ? { target: `${fmtN(target)} ${r.unit} a minute` } : {}),
    ...(target != null && r.limit && r.limit.effective > 0 ? { targetPct: (target / r.limit.effective) * 100 } : {}),
    rows,
    ...(groups ? { groups } : {}),
    ...(v && r.ok.length >= 2 ? { v: { text: v.sentence, tone: (v.under.length ? 'a' : 'n') as Tone } } : {}),
    ...(x.walk ? { walk: { text: x.walk.sentence, tone: (x.walk.against === 'disagrees' ? 'a' : 'n') as Tone } } : {}),
    check,
    ...(plan && plan.steps.length ? { plan: { says: plan.sentence, steps: plan.steps.map(x => x.text), ...(plan.reached ? { sum: plan.sentence.split(' — ').pop() as string } : {}) } } : {}),
    ...(shift ? { shift } : {}),
    ...(labour ? { labour } : {}),
    ...(x.work ? { work: { text: x.work.text, lines: x.work.lines.map(l => ({ text: l.text, tone: (l.tone === 'r' || l.tone === 'a' ? l.tone : 'n') as Tone })) } } : {}),
    whatIfs,
    figures: (() => {
      const lc = labourCost(r, x.labour.people, x.labour.rate);
      return {
        stations: n, ...(r.line != null ? { line: r.line } : {}), ...(r.limit ? { limit: r.limit.station.name.trim() || `Station ${r.limit.index + 1}` } : {}),
        ...(target != null ? { target } : {}), ...(r.gap != null && r.gap > 1e-9 && target != null ? { gap: r.gap } : {}),
        ...(lc ? { perPack: lc.perPack, perHour: lc.perHour } : {}),
        ...(bk?.perPackThen != null ? { perPackThen: bk.perPackThen } : {}), ...(bk?.extraPerPack != null ? { extraPerPack: bk.extraPerPack } : {}), ...(bk?.against ? { against: bk.against } : {}),
        ...(bk?.then != null ? { then: bk.then } : {}), ...(bk?.next ? { next: bk.next } : {}), ...(bk?.perMin != null ? { perMin: bk.perMin } : {}), ...(bk?.contributionPerMin != null ? { contributionPerMin: bk.contributionPerMin } : {}),
        ...(x.labour.people != null ? { people: x.labour.people, ...(x.labour.peopleFrom ? { peopleFrom: x.labour.peopleFrom } : {}) } : {}),
      };
    })(),
  };
}

/** Every product shown, in a sentence for the front of the paper:
 *  "5 products on 2 lines — 2 short of their target, 1 with no stations yet."
 *  A product whose stations are written down but none counted yet (no
 *  speed) has its stations: it is said as speeds still to fill in. */
export function capacityPapersSay(papers: (Pick<CapacityPaper, 'line' | 'short' | 'rows'> & { check?: string[] })[]): string {
  const lines = new Set(papers.map(p => p.line)).size;
  const short = papers.filter(p => p.short).length;
  const none = papers.filter(p => !p.rows.length && !p.check?.length).length;
  const unfilled = papers.filter(p => !p.rows.length && !!p.check?.length).length;
  const tail = [short ? `${short} short of ${short === 1 ? 'its' : 'their'} target` : '', none ? `${none} with no stations yet` : '',
    unfilled ? `${unfilled} with ${unfilled === 1 ? 'its' : 'their'} speeds still to fill in` : ''].filter(Boolean).join(', ');
  return `${papers.length} product${papers.length === 1 ? '' : 's'} on ${lines} line${lines === 1 ? '' : 's'}${tail ? ` — ${tail}` : ''}.`;
}
