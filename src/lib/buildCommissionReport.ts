/* FROM THE RECORDS TO THE SHEET, WITH NO SECOND OPINION IN BETWEEN.
 *
 * The drawer (lib/commissionPdf) knows nothing about the database: hand it plain
 * strings and data URLs and it draws the same A3 anywhere. This is the part that
 * goes and gets them — and, more importantly, the part that refuses to form its
 * own view.
 *
 * THE VERDICT IS NOT RECOMPUTED HERE. canSignOff, the blockers and every count
 * come straight out of readiness(), the same function the screen reads. The first
 * version of the report had its own idea of what "ready" meant, and a sheet that
 * disagrees with the screen it was exported from is worse than no sheet: it is
 * the one that gets read out in front of the OEM. So this file is allowed to
 * FORMAT, and not to decide.
 *
 * What it does decide is wording — "51 ppm · 14 Sep · witnessed by A. Shaw" — and
 * that is the sheet's real work. A handover argument is always the same shape:
 * this is what we agreed, this is what it actually did. Every row prints both,
 * side by side, so the reader can check the verdict instead of trusting it.
 *
 * Photographs are re-encoded on the way through rather than embedded whole. A
 * walk still is a full-resolution video frame; four of them straight into a PDF
 * makes a file too big to email, which defeats the point of the sheet.
 */
import { getBlob } from '../db';
import { loadPdfLib, deliverPdf } from './savePdf';
import {
  byAsset, standing, programStatus, materialStatus, bestRun, isOpen, stateOf,
  conditionOf, daysBetween, isStale, materialsOf, supersededIds, transitions,
  type Asset, type CommissionItem, type Material, type Pack, type Program, type Standing,
} from './commissioning';
import type { HandoverAsset, HandoverReport, HandoverRow, ReportBand, Shot } from './commissionPdf';
import type { WalkSnag } from './useCommissionEvidence';

const MAX_EDGE = 1400;
const QUALITY = 0.82;

const short = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const shortISO = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? short(t) : iso;
};
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/* ------------------------------ the wording ------------------------------ */

/** The domain word for where a record stands. Deliberately not the generic
 *  'blocked / at risk' the colours use: on a handover sheet "No program" and
 *  "Below rate" are two different conversations and both would otherwise print
 *  as "blocked". */
export function whereItStands(i: CommissionItem, superseded: Set<string> = new Set()): string {
  switch (i.kind) {
    case 'program':
      return ({
        missing: 'No program', untested: 'Not run', below: 'Below rate',
        proven: 'Proven', stale: 'Re-prove',
      } as const)[programStatus(i, superseded)];
    case 'material':
      return { have: 'On site', awaited: 'On order', short: 'Not ordered', late: 'Overdue' }[materialStatus(i)];
    case 'check':
      return i.outcome === 'fail' ? 'FAILED'
        : i.outcome === 'pass' ? (isStale(i, superseded) ? 'Re-test' : 'Passed')
          : 'Not run';
    case 'punch':
      return isOpen(i) ? `Open (${i.severity})` : 'Closed';
    case 'task':
      return { todo: 'Not started', doing: 'In progress', waiting: 'Waiting', done: 'Done' }[i.state];
  }
}

/** What the word WHAT column says. The severity is part of it, because "Defect"
 *  on its own does not say whether it stops the handover. */
const kindLabel = (i: CommissionItem): string =>
  i.kind === 'punch' ? `Defect ${i.severity}`
    : i.kind === 'program' ? 'Program'
      : i.kind === 'material' ? 'Material'
        : i.kind === 'check' ? 'Acceptance'
          : 'Obligation';

/** WHAT WAS AGREED — the left half of the argument, and always the contractual
 *  side of it: the rate before the machine shipped, the quantity the line needs,
 *  the criterion somebody signed, the grade the defect was given. */
function agreedOf(i: CommissionItem): string {
  switch (i.kind) {
    case 'program': return `${i.agreedRate} ${i.rateUnit ?? 'ppm'}`;
    case 'material': return `${i.need}${i.unit ? ' ' + i.unit : ''}`;
    case 'check': return i.criterion;
    case 'punch': return i.severity === 'A' ? 'A — blocks sign-off'
      : i.severity === 'B' ? 'B — before production' : 'C — can follow';
    case 'task': return '—';
  }
}

/** WHAT ACTUALLY HAPPENED — the right half. Empty is never printed as a blank:
 *  "not run" and "nothing on order" are findings, and a blank cell reads as an
 *  oversight by whoever filled the sheet in rather than a gap in the handover. */
function evidenceOf(i: CommissionItem, materials: Material[] = [], superseded: Set<string> = new Set()): string {
  const said = evidenceWords(i);
  /* THE CONDITIONS, ON PAPER. A rate with no spec beside it is the number an OEM
     quotes back at you six weeks later. When the spec has been withdrawn the row
     has to say so in the same breath, or the sheet is the thing that lies. */
  const cond = conditionOf(i, materials, superseded);
  return cond ? `${said} \u00b7 ${cond}` : said;
}

function evidenceWords(i: CommissionItem): string {
  switch (i.kind) {
    case 'program': {
      if (!i.written) return 'Not written on the machine';
      const best = bestRun(i);
      if (!best) return 'No run recorded';
      const unit = i.rateUnit ?? 'ppm';
      return [
        `${best.achieved} ${unit}`,
        best.minutes ? `over ${best.minutes} min` : '',
        best.wastePct != null ? `${best.wastePct}% waste` : '',
        short(best.at),
        best.by ? `witnessed by ${best.by}` : '',
      ].filter(Boolean).join(' · ');
    }
    case 'material': {
      const on = i.onOrder ?? 0;
      if (i.have >= i.need) return `All ${i.need}${i.unit ? ' ' + i.unit : ''} on site`;
      return [
        `${i.have} of ${i.need} here`,
        on > 0 ? `${on} on order` : 'nothing on order',
        i.due ? `wanted ${shortISO(i.due)}` : '',
      ].filter(Boolean).join(' · ');
    }
    case 'check': {
      if (i.outcome === 'notRun') return 'Not run yet';
      return [
        i.result?.trim() || (i.outcome === 'pass' ? 'Met the criterion' : 'Did not meet the criterion'),
        i.at ? short(i.at) : '',
        i.witnessedBy ? `witnessed by ${i.witnessedBy}` : 'no witness recorded',
      ].filter(Boolean).join(' · ');
    }
    case 'punch':
      if (isOpen(i)) return `Open since ${short(i.raisedAt)}`;
      // A closed defect always has a date; asking rather than asserting it means
      // one written by an older build still prints as closed instead of crashing.
      return i.closedAt ? `Closed ${short(i.closedAt)}` : 'Closed';
    case 'task':
      return i.note?.trim() || whereItStands(i);
  }
}

const whoOf = (i: CommissionItem): string | undefined => {
  if (i.kind === 'punch') return i.fixBy ?? i.owner;
  if (i.kind === 'check') return i.witnessedBy ?? i.owner;
  return i.owner;
};

/** The second-best run, when a program has been run more than once. The only
 *  place on the sheet that can show movement: "76 ppm (was 61 ppm)" is an
 *  argument where "76 ppm" is a number. */
function previousBest(p: Program): string | undefined {
  const runs = (p.runs ?? []).filter(r => r !== bestRun(p));
  if (!runs.length) return undefined;
  const prev = runs.reduce((b, r) => (r.achieved > b.achieved ? r : b), runs[0]);
  return `${prev.achieved} ${p.rateUnit ?? 'ppm'}`;
}

/* --------------------------- the one-line summary --------------------------- */

/** What the blockers are MADE OF, in one line. The list beside it says which
 *  ones; this says the shape of the problem, which is what somebody repeats when
 *  they are asked how commissioning is going. */
export function headlineFor(st: Standing, anything: boolean): string {
  if (!anything) return 'Nothing recorded yet — this handover file is empty.';
  if (st.clear) return 'Every claim met. This line can be accepted.';
  const r = st.counts;
  const bits: string[] = [];
  if (r.punch.openA) bits.push(`${plural(r.punch.openA, 'grade-A defect')} open`);
  if (r.checks.fail) bits.push(`${plural(r.checks.fail, 'test')} failed`);
  if (r.programs.missing) bits.push(`${plural(r.programs.missing, 'program')} not written`);
  const owed = r.materials.short + r.materials.late;
  if (owed) bits.push(`${plural(owed, 'material line')} not landed`);
  // Ahead of "short of rate" on purpose: a result that no longer counts is the
  // one somebody in the room still believes, and it has to be said out loud.
  if (st.stale) bits.push(`${plural(st.stale, 'result')} got on a withdrawn spec`);
  if (r.programs.below) bits.push(`${plural(r.programs.below, 'program')} short of rate`);
  if (r.programs.untested) bits.push(`${plural(r.programs.untested, 'program')} never run`);
  if (r.checks.notRun) bits.push(`${plural(r.checks.notRun, 'test')} still to run`);
  const open = r.tasks.total - r.tasks.done;
  if (open) bits.push(`${plural(open, 'obligation')} outstanding`);
  // Four is what fits at 13pt across two thirds of an A3; the panel beside it
  // carries the rest, so truncating here loses nothing.
  return bits.slice(0, 4).join(' \u00b7 ');
}

/* ------------------------------- the report ------------------------------- */

/** The order the five kinds read in within a machine: what it must run, then
 *  what it needs to run at all, then the tests, then the defects, then the
 *  paperwork. Anybody who has sat through a handover meeting recognises it. */
const KIND_ORDER: Record<CommissionItem['kind'], number> = {
  program: 0, material: 1, check: 2, punch: 3, task: 4,
};

export interface CommissionReportInput {
  title: string;
  lead?: string;
  items: CommissionItem[];
  /** The machines, so a row can name the one it sits on and the sheet can be
   *  grouped the way the job is argued. */
  assets?: Asset[];
  /** The packs, so a program prints the pack it belongs to. */
  packs?: Pack[];
  /** The two dates the job is judged on. ISO. */
  plannedAt?: string;
  expectedAt?: string;
  now?: number;
  /** Line-walk snags, so an item linked to one carries the picture it was
   *  proved or disproved by. Optional: the sheet is worth sending without them. */
  walk?: Map<string, WalkSnag>;
  /** Pictures per record id, already decoded. Keyed by ID RATHER THAN MATCHED
   *  BACK ONTO THE ROWS: the first version looked the record up again by asset,
   *  kind and title, which two items called "Film" on the same machine would
   *  have silently shared. */
  shots?: Map<string, Shot[]>;
}

/** Everything the drawer needs except the pictures, which need a DOM. Pure, and
 *  tested as such — the verdict on this sheet is the app's verdict or it is a
 *  liability. */
export function buildCommissionReport(input: CommissionReportInput): HandoverReport {
  const live = input.items.filter(i => !i.deletedAt);
  const st = standing(live);
  const superseded = supersededIds(live);
  const materials = materialsOf(live);
  const groups = byAsset(input.assets ?? [], live);
  const packName = new Map((input.packs ?? []).map(p => [p.id, p.name]));

  /* Each machine's own verdict, from the same function as the whole line's. A
     line is accepted one machine at a time, and "the checkweigher is proved and
     the wrapper is on the wrong film" is the sentence a single project
     percentage cannot say. */
  const assets: HandoverAsset[] = groups.map(g => {
    const own = standing(g.items);
    return {
      name: g.name,
      canSignOff: own.clear,
      blockers: own.blockers.length,
      pct: own.pct,
      isLine: !g.asset,
    };
  });

  // Which records are in the way, so the detail sheet can mark its own rows
  // without forming a second opinion about what "in the way" means.
  const blocking = new Set(st.blockers.map(b => b.id));

  const rows: HandoverRow[] = groups.flatMap(g =>
    [...g.items]
      .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.sort - b.sort)
      .map((i): HandoverRow => {
        const pack = i.packId ? packName.get(i.packId) : undefined;
        return {
          asset: g.name,
          kind: i.kind,
          kindLabel: kindLabel(i),
          /* The pack is part of the name on paper. "400g" on its own reads as a
             product; "400g on the flow wrapper" is the claim. */
          title: pack && pack !== i.title ? `${i.title} — ${pack}` : i.title,
          agreed: agreedOf(i),
          evidence: evidenceOf(i, materials, superseded),
          who: whoOf(i),
          due: i.due ? shortISO(i.due) : undefined,
          state: stateOf(i, superseded),
          stateLabel: whereItStands(i, superseded),
          blocking: blocking.has(i.id),
          passes: i.kind === 'program' ? i.runs?.length : undefined,
          was: i.kind === 'program' ? previousBest(i) : undefined,
          shots: input.shots?.get(i.id),
        };
      }),
  );

  return {
    title: input.title,
    lead: input.lead,
    now: input.now ?? Date.now(),
    band: bandFor(input, live),
    canSignOff: st.clear,
    blockers: st.blockers.map(b => ({
      what: b.what,
      /* The machine's name when there is one, and the line's own heading when
         there is not. Written as an explicit branch because the obvious
         one-liner — matching g.asset?.id against b.assetId — quietly matches
         undefined to undefined, so it only looked right by accident. */
      asset: b.assetId
        ? groups.find(g => g.asset?.id === b.assetId)?.name
        : groups.find(g => !g.asset)?.name,
    })),
    headline: headlineFor(st, live.length > 0),
    counts: st.counts,
    pct: st.pct,
    stale: st.stale,
    assets,
    rows,
  };
}

/** The band across the top of page 1: the two dates, then every changeover with
 *  the price of it.
 *
 *  It replaced a programme of stages drawn as beads on a thread. There are no
 *  stages, and the band now says the two things a reader needs before any
 *  detail — whether the job has moved, and what is about to stop counting. */
function bandFor(input: CommissionReportInput, live: CommissionItem[]): ReportBand[] {
  const out: ReportBand[] = [];
  const slip = daysBetween(input.plannedAt, input.expectedAt);

  if (input.plannedAt) out.push({ label: 'Planned', value: shortISO(input.plannedAt), state: 'plain' });
  if (input.expectedAt) {
    out.push({
      label: 'Now expecting',
      value: shortISO(input.expectedAt),
      note: slip && slip > 0 ? `${plural(slip, 'day')} later` : slip && slip < 0 ? `${plural(-slip, 'day')} earlier` : undefined,
      state: slip == null || slip === 0 ? 'plain' : slip < 0 ? 'good' : slip > 7 ? 'bad' : 'warn',
    });
  }

  for (const t of transitions(live)) {
    const pct = Math.round(t.landed * 100);
    out.push({
      label: t.from ? `${t.from.spec ?? t.from.title} \u2192 ${t.to.spec ?? t.to.title}` : `Moving to ${t.to.spec ?? t.to.title}`,
      value: `${t.to.have} of ${t.to.need}${t.to.unit ? ' ' + t.to.unit : ''} here`,
      note: t.invalidated.length
        ? `${plural(t.invalidated.length, 'result')} stop${t.invalidated.length === 1 ? 's' : ''} counting`
        : `${pct}% delivered`,
      state: t.invalidated.length ? 'bad' : pct >= 100 ? 'good' : 'warn',
    });
  }
  return out;
}

/* ------------------------------- the pictures ------------------------------- */

/** One stored blob, re-encoded small enough to email and measured so the sheet
 *  can keep its aspect ratio. Throws when the blob is not on this device — a
 *  sheet without one of its photographs is still worth sending, so every caller
 *  catches. */
async function shotFrom(key: string, caption?: string): Promise<Shot> {
  const blob = await getBlob(key);
  if (!blob) throw new Error('that picture is not on this device');
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('decode failed'));
      i.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * scale));
    cv.height = Math.max(1, Math.round(img.height * scale));
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return { data: cv.toDataURL('image/jpeg', QUALITY), w: cv.width, h: cv.height, caption };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Pictures on the record itself, then stills off any line-walk snag it is
 *  linked to. A walk still is captioned with the snag's own words, because a
 *  photograph of a machine proves nothing until it says what is wrong with it. */
async function shotsFor(i: CommissionItem, walk?: Map<string, WalkSnag>): Promise<Shot[]> {
  const wanted: { key: string; caption?: string }[] = [];
  for (const m of i.photos ?? []) {
    // A video cannot go in a PDF; its poster frame can, and that is the frame
    // somebody chose when they filmed it.
    const key = m.kind === 'photo' ? m.blobKey : m.thumbKey;
    if (key) wanted.push({ key });
  }
  for (const id of i.snagIds ?? []) {
    const w = walk?.get(id);
    if (w?.stillKey) wanted.push({ key: w.stillKey, caption: w.snag.problem });
  }
  const out: Shot[] = [];
  for (const { key, caption } of wanted) {
    // One unreadable picture must not cost the sheet its other pictures, let
    // alone its words.
    try { out.push(await shotFrom(key, caption)); } catch { /* send the words */ }
  }
  return out;
}

/** Every record's pictures, keyed by record id. Split from the pure builder
 *  because this half needs a canvas and the verdict must be testable without
 *  one. */
export async function resolveShots(
  items: CommissionItem[], walk?: Map<string, WalkSnag>,
): Promise<Map<string, Shot[]>> {
  const out = new Map<string, Shot[]>();
  for (const i of items) {
    if (i.deletedAt) continue;
    if (!(i.photos?.length || i.snagIds?.length)) continue;
    const shots = await shotsFor(i, walk);
    if (shots.length) out.set(i.id, shots);
  }
  return out;
}

/** Build it, draw it, hand it to the device. Returns how it was delivered so the
 *  caller can say "it is open in a tab" — on a phone a silent download looks
 *  exactly like nothing happening. */
export async function saveCommissionReport(input: CommissionReportInput): Promise<'shared' | 'downloaded' | 'opened'> {
  const shots = input.shots ?? await resolveShots(input.items, input.walk);
  const data = buildCommissionReport({ ...input, shots });
  const { jsPDF } = await loadPdfLib();
  const { drawCommissionReport } = await import('./commissionPdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  drawCommissionReport(pdf, data);
  // The file lands in somebody's inbox on its own, so its NAME has to say which
  // line it is: "report.pdf" from three projects is three files nobody can tell
  // apart.
  const slug = input.title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'Project';
  return deliverPdf(pdf, `${slug}-handover-${new Date().toISOString().slice(0, 10)}.pdf`);
}
