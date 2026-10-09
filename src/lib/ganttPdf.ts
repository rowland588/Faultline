/* THE GANTT, ON PAPER — the same chart the project page draws (lib/gantt lays
 * it out; this only draws), on landscape A4.
 *
 * Rowland: "print the Gantt charts as well, and PDF." On paper there is no
 * scrolling, so the whole job is fitted across the page: a day is however wide
 * the page allows, and the calendar band says days, or weeks, or only months,
 * whichever the width can carry legibly. Rows that do not fit carry on over the
 * page with the calendar drawn again at the top, so every sheet reads alone.
 *
 * Used twice: on its own from the plan ("Download the plan"), and inside the
 * client report, straight after the front page. Grouped the way the screen
 * is: by machine (a header band each — lib/gantt withMachines) or by gate.
 */
import type { jsPDF } from 'jspdf';
import { badWords, partsWords, WORST, type Gantt, type GanttGroup, type GanttMachine, type GanttPart, type GanttRow, type GanttSub, type GanttTone, type PartState } from './gantt';
import type { PlanMark } from './standing';
import { pdfFamily, san } from './reportKit';
import { walkMarkers } from './walkSnags';

const PW = 842, PH = 595, M = 30, LAB = 186;
const INK = '#0f1a2e', INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', SURF2 = '#eef3f9', WEEKEND = '#f1f4f8';
const BRAND = '#1f63e0', OK = '#1e6b4b', DANGER = '#9b3227', AMBER = '#8a5f14', BOOKED = '#4f46b8';
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/* A reminder from the meeting notes — its own colour, on paper as on screen. */
const REMIND = '#b8237a';
const NOTE_TONE: Record<GanttTone, { fill: string; stroke: string; text: string }> = {
  done: { fill: REMIND, stroke: REMIND, text: '#ffffff' },
  failed: { fill: '#fbe7f1', stroke: DANGER, text: REMIND },
  ran: { fill: '#fbe7f1', stroke: REMIND, text: REMIND },
  problem: { fill: '#fbe7f1', stroke: AMBER, text: REMIND },
  late: { fill: '#fbe7f1', stroke: DANGER, text: REMIND },
  booked: { fill: '#fbe7f1', stroke: REMIND, text: REMIND },
  none: { fill: '#fbe7f1', stroke: REMIND, text: REMIND },
};

const TONE: Record<GanttTone, { fill: string; stroke: string; text: string }> = {
  /* Done is quiet on paper as on screen — what is wrong is what stands out. */
  done: { fill: '#e3efe9', stroke: OK, text: OK },
  failed: { fill: DANGER, stroke: DANGER, text: '#ffffff' },
  ran: { fill: AMBER, stroke: AMBER, text: '#ffffff' },
  late: { fill: '#f8ecea', stroke: DANGER, text: DANGER },
  /* A problem that lost no time — amber, waiting on something, not late. */
  problem: { fill: '#f7eedb', stroke: AMBER, text: AMBER },
  booked: { fill: '#e6e4f6', stroke: BOOKED, text: BOOKED },
  none: { fill: SURF2, stroke: '#c6d2e3', text: MUTED },
};

const HEAD_TOP = 74;          // where the calendar band starts on a page
const MONTH_H = 13, DAY_H = 17;
const ROW_H = 17, GROUP_H = 13, BAND_H = 22, GATE_H = 10, SUB_H = 12;
/* By stage, a machine's row sits in under its stage's heading, as on screen. */
const NEST = 8;
const FOOT = 64;              // room left at the bottom for the handover labels, the key (two lines when it is long) and the foot

/* ---------------------------------------------------------------------------
 * FOLDED FOR PAPER — docs/REPORTS.md: big content scales by structure.
 *
 * A row per step per machine is right for a job of two machines and
 * unreadable for twelve: the huge job's plan ran to fourteen landscape pages.
 * When the rows would take more than two pages, each group folds — a stage
 * becomes one lane with every machine's mark on it, tests and fixes fold by
 * machine — and marks on the same days merge into one with a count, the way
 * the control room's board merges them (visual rule 5). The label says how
 * many and how many are late, so nothing is hidden by the fold. The screen's
 * plan scrolls and keeps every row; this is the paper's version of it.
 * ------------------------------------------------------------------------- */
type Bit = { start: number; span: number; tone: GanttTone };
type PaperRow = GanttRow & { bits?: Bit[]; sub?: string };
type Line = { group: string; n: number; cont?: boolean } | { row: PaperRow; fix?: boolean; nest?: boolean } | { walk: true }
  /* A part of the plan, a branch under its stage (lib/noted partsOf). */
  | { part: GanttPart; nest?: boolean }
  /* By machine: a machine's header, and the name of each gate where it starts. */
  | { band: GanttMachine; cont?: boolean } | { gate: string }
  /* By stage: a stage's heading over its machines (or a machine's over its tests). */
  | { sub: GanttSub; cont?: boolean };
/* The colour a state's WORDS are printed in — the same five as the screen. */
const SAY: Record<GanttTone, string> = { done: OK, failed: DANGER, ran: AMBER, problem: AMBER, booked: BOOKED, late: DANGER, none: MUTED };
/* A part's mark on its day, and the colour its state's words wear: only what
   is abnormal (late, due within two days) carries colour in the words. */
const PART: Record<PartState, { fill: string; stroke: string; words: string }> = {
  done: { fill: '#e3f0e9', stroke: OK, words: MUTED }, late: { fill: '#f8ecea', stroke: DANGER, words: DANGER },
  soon: { fill: '#f7eedb', stroke: AMBER, words: AMBER }, booked: { fill: '#e6e4f6', stroke: BOOKED, words: MUTED },
  todo: { fill: SURF2, stroke: MUTED, words: MUTED },
  /* Its status (lib/noted resultNow): failed is a failure, solid red;
     baseline achieved is under way, indigo, its words quiet. */
  failed: { fill: DANGER, stroke: DANGER, words: DANGER }, baseline: { fill: '#e6e4f6', stroke: BOOKED, words: MUTED },
};
/* A reminder's state, in the words the screen uses. */
const noteSays = (t: GanttTone) => (t === 'done' ? 'talked about' : t === 'late' ? 'late' : 'to come');

/* The screen's order of what is most abnormal (lib/gantt WORST). */
const worst = (ts: GanttTone[]): GanttTone => WORST.find(t => ts.includes(t)) ?? 'none';
const STAGE = new Set<PlanMark['kind']>(['install', 'setup', 'handover']);
const NOUN: Partial<Record<PlanMark['kind'], [string, string]>> = {
  install: ['machine', 'machines'], setup: ['machine', 'machines'], handover: ['machine', 'machines'],
  test: ['test', 'tests'], fix: ['fix', 'fixes'], material: ['material', 'materials'], program: ['program', 'programs'],
  machine: ['machine arriving', 'machines arriving'], note: ['reminder', 'reminders'], action: ['action', 'actions'],
};
const stepOf = (r: GanttRow) => (r.on && r.label.startsWith(`${r.on} — `) ? r.label.slice(r.on.length + 3) : r.label);

export function foldForPaper(g: Gantt, capacity: number): Gantt {
  const lines = g.groups.reduce((n, gr) => n + 1 + (gr.subs?.length ?? 0) + gr.rows.reduce((m, r) => m + 1 + (r.fixes?.length ?? 0) + (r.parts?.length ?? 0), 0), 0);
  if (lines <= capacity * 2) return g;
  const groups = g.groups.map((gr): GanttGroup => {
    /* By stage, a heading folds to one lane: the stage with every machine's
       mark on it, or the machine with every test's. */
    const subOf = new Map(gr.subs?.flatMap(sb => sb.rows.map(r => [r, sb.label] as const)) ?? []);
    const keyOf = (r: GanttRow) => subOf.get(r) ?? (STAGE.has(gr.kind) ? stepOf(r) : r.on ?? (gr.kind === 'machine' ? 'Every machine' : r.label));
    const byKey = new Map<string, GanttRow[]>();
    for (const r of gr.rows) byKey.set(keyOf(r), [...(byKey.get(keyOf(r)) ?? []), r]);
    if (byKey.size === gr.rows.length) return gr;          // nothing to fold
    const noun = NOUN[gr.kind] ?? ['item', 'items'];
    const rows: PaperRow[] = [...byKey].map(([key, rs]) => {
      const bad = badWords(rs);
      const fixes = rs.flatMap(r => r.fixes ?? []);
      /* Folded, a stage's parts are counted on its lane — still seen, never lost. */
      const parts = rs.flatMap(r => r.parts ?? []);
      const row: PaperRow = {
        ...rs[0], label: key, on: undefined, slip: undefined, marks: undefined, overlap: undefined, next: undefined, parts: undefined, partsSay: undefined,
        start: Math.min(...rs.map(r => r.start)), span: 1, tone: worst(rs.map(r => r.tone)),
        bits: rs.map(r => ({ start: r.start, span: r.span, tone: r.tone })),
        critical: rs.reduce((n, r) => n + (r.critical ?? 0), 0) || undefined, risk: rs.reduce((n, r) => n + (r.risk ?? 0), 0) || undefined,
        sub: `${rs.length} ${rs.length === 1 ? noun[0] : noun[1]}${bad ? ` · ${bad}` : ''}${parts.length ? ` · ${partsWords(parts)}` : ''}`,
        fixes: fixes.length ? [{ ...fixes[0], label: `${fixes.length} fix${fixes.length === 1 ? '' : 'es'} on it`, bits: fixes.map(f => ({ start: f.start, span: f.span, tone: f.tone })) } as PaperRow] : undefined,
      };
      return row;
    });
    return { kind: gr.kind, label: gr.label, rows };
  });
  return { ...g, groups };
}

/* BY MACHINE, FOLDED — the same rule for the same reason: when a job's
   machines would take more than two pages row by row, each machine keeps its
   band and its header, and each of its gates becomes one lane with every
   stage's mark on it, saying how many and how many are late. The machine's
   status is never what folds. */
const GATE_NOUN: Partial<Record<PlanMark['kind'], [string, string]>> = {
  machine: ['date', 'dates'], install: ['stage', 'stages'], setup: ['stage', 'stages'], handover: ['stage', 'stages'],
  test: ['test', 'tests'], fix: ['fix', 'fixes'], material: ['material', 'materials'], program: ['program', 'programs'],
  note: ['reminder', 'reminders'], action: ['action', 'actions'],
};
export function foldBands(g: Gantt, capacity: number): Gantt {
  if (!g.machines) return g;
  const lines = g.machines.reduce((n, b) => n + 1 + (b.walk ? 1 : 0)
    + b.groups.reduce((m, gr) => m + 1 + gr.rows.reduce((k, r) => k + 1 + (r.fixes?.length ?? 0) + (r.parts?.length ?? 0), 0), 0), 0);
  if (lines <= capacity * 2) return g;
  const fold = (gr: GanttGroup): GanttGroup => {
    if (gr.rows.length < 2 && !gr.rows.some(r => r.fixes?.length || r.parts?.length)) return { ...gr, rows: gr.rows.map(r => ({ ...r, label: `${gr.label}: ${r.label}` })) };
    const rs = gr.rows;
    const noun = GATE_NOUN[gr.kind] ?? ['item', 'items'];
    const bad = badWords(rs);
    const fixes = rs.flatMap(r => r.fixes ?? []);
    const parts = rs.flatMap(r => r.parts ?? []);
    const row: PaperRow = {
      ...rs[0], label: gr.label, on: undefined, slip: undefined, marks: undefined, overlap: undefined, next: undefined, parts: undefined, partsSay: undefined,
      start: Math.min(...rs.map(r => r.start)), span: 1, tone: worst(rs.map(r => r.tone)),
      bits: rs.map(r => ({ start: r.start, span: r.span, tone: r.tone })),
      critical: rs.reduce((n, r) => n + (r.critical ?? 0), 0) || undefined, risk: rs.reduce((n, r) => n + (r.risk ?? 0), 0) || undefined,
      sub: `${rs.length} ${rs.length === 1 ? noun[0] : noun[1]}${bad ? ` · ${bad}` : ''}${parts.length ? ` · ${partsWords(parts)}` : ''}`,
      fixes: fixes.length ? [{ ...fixes[0], label: `${fixes.length} fix${fixes.length === 1 ? '' : 'es'} on it`, bits: fixes.map(f => ({ start: f.start, span: f.span, tone: f.tone })) } as PaperRow] : undefined,
    };
    return { ...gr, rows: [row] };
  };
  return { ...g, machines: g.machines.map(b => ({ ...b, groups: b.groups.map(fold), folded: true })) };
}

/** Marks that share days become one, with how many and the worst state. */
function cluster(bits: Bit[]): (Bit & { n: number })[] {
  const out: (Bit & { n: number })[] = [];
  for (const b of [...bits].sort((a, c) => a.start - c.start)) {
    const last = out[out.length - 1];
    if (last && b.start <= last.start + last.span) {
      const end = Math.max(last.start + last.span, b.start + b.span);
      last.span = end - last.start; last.tone = worst([last.tone, b.tone]); last.n++;
    } else out.push({ ...b, n: 1 });
  }
  return out;
}

/** Draw the Gantt from the CURRENT page on (which must be landscape A4), adding
 *  landscape pages as the rows need them. Returns the page numbers it drew on,
 *  so a report can put its own foot on them. */
export function drawGantt(doc: jsPDF, gIn: Gantt, head: { eyebrow: string; title: string; sub?: string }, moves: MoveLine[] = []): number[] {
  const font = (size: number, style: 'normal' | 'bold' = 'normal', colour = INK) => {
    doc.setFont(pdfFamily(), style); doc.setFontSize(size); doc.setTextColor(colour);
  };
  const capacity = Math.floor((PH - FOOT - (HEAD_TOP + MONTH_H + DAY_H)) / ROW_H);
  const g = gIn.machines ? foldBands(gIn, capacity) : foldForPaper(gIn, capacity);
  const x0 = M + LAB, CW = PW - 2 * M - LAB;
  const px = CW / Math.max(1, g.days);
  const X = (day: number) => x0 + day * px;

  /* Rows, with each gate's heading, cut into pages. */
  const rowLines = (row: PaperRow, nest = false): Line[] => [{ row, nest } as Line,
    ...(row.parts ?? []).map(pt => ({ part: pt, nest }) as Line), ...(row.fixes ?? []).map(f => ({ row: f, fix: true, nest }) as Line)];
  /* BY MACHINE: each machine's header, then its gates — each named where it
     starts, unless folded to one lane that is named for the gate itself. */
  const lines: Line[] = g.machines ? g.machines.flatMap(b => [{ band: b } as Line,
    ...b.groups.flatMap(gr => [...(b.folded ? [] : [{ gate: gr.label } as Line]), ...gr.rows.flatMap(r => rowLines(r))]),
    ...(b.walk ? [{ walk: true } as Line] : [])]) : g.groups.flatMap(gr => [{ group: gr.label, n: gr.rows.length } as Line,
    /* BY STAGE: each stage's heading, then a row per machine on it. */
    ...(gr.subs ? gr.subs.flatMap(sb => [{ sub: sb } as Line, ...sb.rows.flatMap(r => rowLines(r, true))]) : gr.rows.flatMap(r => rowLines(r)))]);
  /* WHAT THE WALK FOUND — one lane, after the gates and before the fixes, the
     same place the screen draws it. */
  if (!g.machines && g.walk && g.walk.days.length) {
    const at = lines.findIndex(l => 'group' in l && (l.group === 'Fixes' || l.group === 'Actions'));
    lines.splice(at < 0 ? lines.length : at, 0, { walk: true });
  }
  const bodyTop = HEAD_TOP + MONTH_H + DAY_H;
  const room = PH - FOOT - bodyTop;

  /* A ROW'S LABEL WRAPS AND THE ROW GROWS — it was cut to its first line, the
     step and the machine both. */
  const labelOf = (r: PaperRow, nest = false) => {
    const mach = r.on && r.label.startsWith(`${r.on} — `) ? r.on : '';
    const w = LAB - 12 - (nest ? NEST : 0);
    const cw = r.critical ? critW(r.critical) : r.risk ? riskW(r.risk) : 0;
    font(7.5, 'bold');
    /* A reminder's own words are on the calendar beside its mark; the label
       says what it is and when. "Next" takes room after the first line. */
    const name = r.kind === 'note' && !r.bits ? `Reminder · ${r.when}` : mach ? r.label.slice(mach.length + 3) : r.label;
    const step = doc.splitTextToSize(san(name), w - (r.next ? NEXT_W : 0) - cw) as string[];
    font(6, 'normal');
    /* Why it wears its colour, when the rule decided it — "late — 2 h lost" —
       and how many parts it has. */
    const under = r.sub ?? (r.kind === 'note' ? noteSays(r.tone) : [mach, r.says, r.partsSay].filter(Boolean).join(' · '));
    const sub = under ? doc.splitTextToSize(san(under), w) as string[] : [];
    return { step, sub };
  };
  /* A REMINDER'S WORDS beside its mark: on the side with room, wrapped to
     three lines at most. */
  const remOf = (r: PaperRow) => {
    const cx = X(r.start + 0.5), roomR = PW - M - 4 - (cx + 8), roomL = cx - 8 - (x0 + 4);
    const right = roomR >= 150 || roomR >= roomL;
    font(7, 'bold');
    let lines = doc.splitTextToSize(san(r.label), Math.max(40, Math.min(330, right ? roomR : roomL))) as string[];
    if (lines.length > 3) lines = [...lines.slice(0, 2), `${lines[2].replace(/\s+\S*$/, '')}…`];
    return { cx, right, lines };
  };
  const partLabel = (pt: GanttPart, nest = false) => { font(6.5, 'bold'); return doc.splitTextToSize(san(`> ${pt.label}${pt.owner ? ` (${pt.owner})` : ''}`), LAB - 18 - (nest ? NEST : 0)) as string[]; };
  const fixLabel = (r: PaperRow, nest = false) => { font(6.5, 'bold'); return doc.splitTextToSize(san(`> Fix: ${r.label}`), LAB - 18 - (nest ? NEST : 0)) as string[]; };
  const bandLabel = (b: GanttMachine, cont?: boolean) => {
    font(8, 'bold');
    const name = doc.splitTextToSize(san(cont ? `${b.name}  (continued)` : b.name), LAB - 16) as string[];
    font(6.5, 'bold');
    const says = doc.splitTextToSize(san(b.says), LAB - 16) as string[];
    return { name, says };
  };
  const GAP = 3, NEXT_W = 26;
  /* "1 CRITICAL" — solid red, white words, beside the stage's name. */
  const critWords = (n: number) => `${n} CRITICAL`;
  function critW(n: number) { font(5, 'bold'); return doc.getTextWidth(critWords(n)) + 9; }
  const riskWords = (n: number) => `${n} HIGH RISK`;
  function riskW(n: number) { font(5, 'bold'); return doc.getTextWidth(riskWords(n)) + 9; }
  const subLabel = (sb: GanttSub, cont?: boolean) => {
    const room = LAB - 14;
    font(7, 'bold');
    const head = doc.splitTextToSize(san(sb.label + (cont ? '  (continued)' : '')), room) as string[];
    const last = doc.getTextWidth(head[head.length - 1]);
    font(6, 'bold');
    /* Each "·" stands in a gap of its own; san() closes a run of spaces to one.
       What is abnormal is said part by part, each in its own colour. */
    const n0 = san(`· ${sb.n}`);
    const bad = sb.bad ? sb.bad.split(' · ').map(w => ({ w: san(`· ${w}`), colour: /a problem/.test(w) ? AMBER : DANGER })) : [];
    const inline = last + GAP + doc.getTextWidth(n0) + bad.reduce((x, b) => x + GAP + doc.getTextWidth(b.w), 0) <= room;
    return { head, n: inline ? n0 : san(sb.n), bad, inline };
  };
  const natural = (l: Line): number => {
    if ('group' in l) return GROUP_H;
    if ('gate' in l) return GATE_H;
    if ('sub' in l) { const sl = subLabel(l.sub, l.cont); return SUB_H + (sl.head.length - 1 + (sl.inline ? 0 : 1)) * 8; }
    if ('band' in l) { const { name, says } = bandLabel(l.band, l.cont); return Math.max(BAND_H, 8 + name.length * 8.5 + says.length * 7.5); }
    if ('walk' in l) return ROW_H;
    // The usual row is the step and its machine on one line each; a row only grows for lines beyond that.
    if ('part' in l) return ROW_H + Math.max(0, partLabel(l.part, l.nest).length - 1) * 7.5;
    if (l.fix) return ROW_H + Math.max(0, fixLabel(l.row, l.nest).length - 1) * 7.5;
    if (l.row.kind === 'note' && !l.row.bits) return ROW_H + Math.max(0, remOf(l.row).lines.length - 1) * 8;
    const { step, sub } = labelOf(l.row, l.nest);
    return ROW_H + Math.max(0, step.length - 1) * 8.5 + Math.max(0, sub.length - 1) * 6.5;
  };
  /* A SMALL OVERFLOW IS ABSORBED: rows close up a little rather than a page
     being started for three of them. Only the air between rows tightens —
     never the type. */
  const paginate = (k: number) => {
    const H = (l: Line) => natural(l) * k;
    const out: Line[][] = [];
    let cur: Line[] = [], used = 0, lastGroup = '';
    let lastBand: GanttMachine | undefined, lastSub: GanttSub | undefined;
    lines.forEach((l, i) => {
      const h = H(l);
      /* A heading never sits alone at the foot of a page. */
      const nextH = i + 1 < lines.length ? H(lines[i + 1]) : 0;
      /* A stage and its parts stay on one page — a branch is never left on
         the next sheet without the stage it comes off — and a heading goes
         over with the first of them, never alone at the foot of a page. */
      const blockAt = (j: number): number => {
        if (j >= lines.length) return 0;
        const lj = lines[j];
        let b = H(lj);
        if ('row' in lj && !lj.fix) for (let q = j + 1; q < lines.length && 'part' in lines[q]; q++) b += H(lines[q]);
        return b;
      };
      const isHead = (x: Line) => 'group' in x || 'gate' in x || 'sub' in x;
      let need = 'band' in l ? h + nextH : h;
      if (isHead(l)) {
        let q = i;
        need = 0;
        while (q < lines.length && isHead(lines[q])) need += H(lines[q++]);
        need += Math.max(blockAt(q), ROW_H * k);
      } else if ('row' in l && !l.fix) need = blockAt(i);
      /* A MACHINE STARTS A PAGE when it would not finish on this one but
         would on a fresh one — so long as this page is already well filled:
         a half-empty page is worse than a machine carried over. */
      let breakHere = used + need > room && cur.length > 0;
      if ('band' in l && cur.length && !breakHere) {
        let whole = 0;
        for (let j = i; j < lines.length && (j === i || !('band' in lines[j])); j++) whole += H(lines[j]);
        if (used + whole > room && whole <= room && used > room * 0.55) breakHere = true;
      }
      if (breakHere) {
        out.push(cur); cur = []; used = 0;
        if (g.machines) {
          if (!('band' in l) && lastBand) { const c: Line = { band: lastBand, cont: true }; cur.push(c); used += H(c); }
        } else if (!('group' in l)) {
          cur.push({ group: lastGroup, n: 0, cont: true }); used += GROUP_H * k;
          /* A stage carried over says whose rows these still are. */
          if (!('sub' in l) && lastSub) { cur.push({ sub: lastSub, cont: true }); used += SUB_H * k; }
        }
      }
      if ('group' in l) { lastGroup = l.group; lastSub = undefined; }
      if ('sub' in l) lastSub = l.sub;
      if ('band' in l) lastBand = l.band;
      cur.push(l); used += h;
    });
    if (cur.length || !out.length) out.push(cur);
    return out;
  };
  let k = 1;
  let pages = paginate(1);
  for (const tighter of [0.92, 0.85]) {
    if (pages.length < 2) break;
    const t = paginate(tighter);
    if (t.length < pages.length) { pages = t; k = tighter; break; }
  }
  const hOf = (l: Line) => natural(l) * k;

  const drawn: number[] = [];
  let lastKey = 0;
  pages.forEach((page, pi) => {
    if (pi > 0) doc.addPage('a4', 'landscape');
    drawn.push(doc.getNumberOfPages());
    /* What is printed over the day lines, once they are drawn: a reminder's words. */
    const over: (() => void)[] = [];

    /* ---- the heading ---- */
    font(8, 'bold', BRAND); doc.text(san(head.eyebrow), M, M + 6);
    font(17, 'bold'); doc.text(san(head.title) + (pages.length > 1 ? `  ·  ${pi + 1} of ${pages.length}` : ''), M, M + 26);
    if (head.sub) { font(9, 'normal', MUTED); doc.text(san(head.sub), M, M + 40, { maxWidth: PW - 2 * M }); }

    const bodyH = page.reduce((h, l) => h + hOf(l), 0);
    const bottom = bodyTop + bodyH;

    /* ---- the calendar band ---- */
    doc.setFillColor(SURF2); doc.rect(M, HEAD_TOP, PW - 2 * M, MONTH_H + DAY_H, 'F');
    font(7, 'bold', MUTED); doc.text('WHAT', M + 6, HEAD_TOP + MONTH_H + DAY_H - 6);
    for (const mo of g.months) {
      const x = X(mo.start), w = mo.span * px;
      doc.setDrawColor('#c6d2e3'); doc.setLineWidth(0.6); doc.line(x, HEAD_TOP, x, bottom);
      if (w >= 18) { font(7.5, 'bold', INK); doc.text(mo.label.toUpperCase(), x + 3, HEAD_TOP + 9.5, { maxWidth: w - 4 }); }
    }
    const dy = HEAD_TOP + MONTH_H;
    if (px >= 10) {
      /* Room for every day: its date and its weekday, weekends shaded. */
      for (const d of g.dayList) {
        const x = X(d.at);
        if (d.weekend) { doc.setFillColor(WEEKEND); doc.rect(x, bodyTop, px, bodyH, 'F'); doc.setFillColor('#e4e9f0'); doc.rect(x, dy, px, DAY_H, 'F'); }
        if (d.at === g.today) { doc.setFillColor(BRAND); doc.rect(x, dy, px, DAY_H, 'F'); }
        const c = d.at === g.today ? '#ffffff' : d.weekend ? MUTED : INK;
        font(px >= 14 ? 7 : 6, 'bold', c); doc.text(String(d.day), x + px / 2, dy + 7.5, { align: 'center' });
        font(5, 'normal', d.at === g.today ? '#ffffff' : MUTED); doc.text(DOW[d.dow], x + px / 2, dy + 13.5, { align: 'center' });
      }
    } else {
      /* Too narrow for days: a column per week, labelled by its Monday. */
      if (px >= 3) for (const d of g.dayList) if (d.weekend) { doc.setFillColor(WEEKEND); doc.rect(X(d.at), bodyTop, px, bodyH, 'F'); }
      for (const w of g.weeks) {
        const x = X(w.start);
        doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.line(x, dy, x, bottom);
        if (w.span * px >= 22) { font(6, 'bold', INK2); doc.text(w.label, x + 2, dy + 10, { maxWidth: w.span * px - 3 }); }
      }
    }

    /* ---- the rows ---- */
    let y = bodyTop;
    for (const l of page) {
      const RH = hOf(l);
      if ('group' in l) {
        doc.setFillColor(SURF2); doc.rect(M, y, LAB, RH, 'F');
        font(6.5, 'bold', INK2);
        doc.text(`${l.group.toUpperCase()}${l.cont ? '  (continued)' : `  ${l.n}`}`, M + 6, y + RH * 0.69);
        y += RH;
        continue;
      }
      if ('sub' in l) {
        /* "Dry run · 2 machines · 1 late" — the heading in ink, the count
           muted, and only what is abnormal in its colour; wrapped inside the
           label column, never over the calendar. */
        const { head, n, bad, inline } = subLabel(l.sub, l.cont);
        font(7, 'bold', INK2);
        head.forEach((h, i) => doc.text(h, M + 6, y + 8.5 * k + i * 8));
        let sx = M + 6, ty = y + 8.5 * k + (head.length - 1) * 8;
        if (inline) { font(7, 'bold'); sx += doc.getTextWidth(head[head.length - 1]) + GAP; } else ty += 8;
        font(6, 'normal', MUTED); doc.text(n, sx, ty); sx += doc.getTextWidth(n) + GAP;
        for (const b of bad) { font(6, 'bold', b.colour); doc.text(b.w, sx, ty); sx += doc.getTextWidth(b.w) + GAP; }
        y += RH;
        continue;
      }
      if ('gate' in l) {
        font(5.5, 'bold', MUTED);
        doc.text(san(l.gate.toUpperCase()), M + 6, y + RH - 2.5, { charSpace: 0.4 });
        y += RH;
        continue;
      }
      if ('band' in l) {
        /* ONE MACHINE'S HEADER — its name, where it stands in the words and
           colour of the strip, and a bar from its first date to its last. */
        const b = l.band;
        const bad = b.tone === 'late' || b.tone === 'failed';
        doc.setFillColor(bad ? '#fbf1ef' : b.tone === 'problem' ? '#fbf6ec' : SURF2); doc.rect(M, y, PW - 2 * M, RH, 'F');
        doc.setFillColor(b.tone === 'done' ? '#9fc5b3' : SAY[b.tone]); doc.rect(M, y, 2.5, RH, 'F');
        doc.setDrawColor('#c6d2e3'); doc.setLineWidth(0.6); doc.line(M, y, PW - M, y); doc.line(M, y + RH, PW - M, y + RH);
        const { name, says } = bandLabel(b, l.cont);
        font(8, 'bold', INK); doc.text(name, M + 8, y + 9, { lineHeightFactor: 8.5 / 8 });
        font(6.5, 'bold', SAY[b.tone]); doc.text(says, M + 8, y + 9 + name.length * 8.5 - 1, { lineHeightFactor: 7.5 / 6.5 });
        if (b.bar) {
          /* The span is the machine's plan, in no state's colour; on it its
             own stages' days, each in its own tone — the screen's lane. */
          const bh = 8, bx = X(b.bar.start) + 0.6, bw = Math.max(2.4, b.bar.span * px - 1.2), by = y + (RH - bh) / 2;
          doc.setDrawColor('#c6d2e3'); doc.setFillColor('#ffffff'); doc.setLineWidth(0.5);
          doc.roundedRect(bx, by, bw, bh, 2, 2, 'FD');
          for (const sg of b.bar.segs) {
            const t = TONE[sg.tone];
            const sx = X(sg.start) + 1.2, sw = Math.max(1.6, sg.span * px - 2.4);
            doc.setDrawColor(t.stroke); doc.setFillColor(t.fill); doc.setLineWidth(sg.tone === 'late' ? 0.9 : 0.6);
            doc.roundedRect(sx, by + 1.2, sw, bh - 2.4, 1, 1, 'FD');
          }
          font(6, 'bold', INK2);
          const ww = doc.getTextWidth(san(b.bar.when));
          const tx = bx + bw + 3 + ww <= PW - M - 2 ? bx + bw + 3 : bx - 3 - ww >= X(0) ? bx - 3 - ww : PW - M - ww - 2;
          doc.text(san(b.bar.when), tx, by + bh / 2 + 2.1);
        }
        y += RH;
        continue;
      }
      if ('walk' in l) {
        const lane = g.walk;
        doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.line(M, y + RH, PW - M, y + RH);
        if (lane) {
          if (lane.late) { doc.setFillColor(DANGER); doc.rect(M + 1, y + 3, 2, RH - 6, 'F'); }
          font(7.5, 'bold', INK); doc.text('Found on the walk', M + 6, y + 7.5);
          font(6, 'bold', lane.open ? DANGER : OK); doc.text(san(lane.words), M + 6, y + 14);
          const cy = y + RH / 2;
          for (const m of walkMarkers(lane, px, 13)) {
            const cx = X(m.start + m.span / 2);
            if (!m.open) { doc.setFillColor(OK); doc.circle(cx, cy, 2.4, 'F'); continue; }
            doc.setLineWidth(0.9); doc.setDrawColor(DANGER); doc.setFillColor(m.late ? DANGER : '#ffffff');
            doc.circle(cx, cy, 5.6, 'FD');
            font(6, 'bold', m.late ? '#ffffff' : DANGER); doc.text(String(m.open), cx, cy + 2.1, { align: 'center' });
          }
        }
        y += RH;
        continue;
      }
      if ('part' in l) {
        /* A PART OF THE PLAN, a branch under its stage: its words, its state
           in words, and on its day a mark in its state's colour. */
        const pt = l.part, pc = PART[pt.state], px0 = M + 14 + (l.nest ? NEST : 0);
        doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.line(M, y + RH, PW - M, y + RH);
        const pl = partLabel(pt, l.nest);
        font(6.5, 'bold', INK2); doc.text(pl, px0, y + 7.5 * k, { lineHeightFactor: 7.5 * k / 6.5 });
        font(5.5, pt.state === 'late' || pt.state === 'soon' || pt.state === 'failed' ? 'bold' : 'normal', pc.words);
        doc.text(san(pt.says), px0, y + (7.5 + pl.length * 7.5 - 1.5) * k);
        if (pt.at != null) {
          const cx = X(pt.at + 0.5), cy = y + RH / 2;
          doc.setDrawColor(pc.stroke); doc.setFillColor(pc.fill); doc.setLineWidth(pt.state === 'late' || pt.state === 'failed' ? 1.1 : 0.8);
          doc.circle(cx, cy, 3, 'FD');
          font(5.5, 'bold', INK2);
          const tw = doc.getTextWidth(san(pt.says));
          if (cx + 6 + tw <= PW - M - 2) doc.text(san(pt.says), cx + 6, cy + 1.9);
          else if (cx - 6 - tw >= x0 + 2) doc.text(san(pt.says), cx - 6 - tw, cy + 1.9);
        }
        y += RH;
        continue;
      }
      const r = l.row;
      doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.line(M, y + RH, PW - M, y + RH);
      /* A FOLDED ROW — every mark on one lane, those sharing days merged into
         one with how many, in the worst state among them. */
      if (r.bits) {
        if (l.fix) {
          font(6.5, 'bold', INK2); doc.text(fixLabel(r), M + 14, y + 7.5 * k, { lineHeightFactor: 7.5 * k / 6.5 });
        } else {
          const { step, sub } = labelOf(r);
          font(7.5, 'bold', INK); doc.text(step, M + 6, y + 7.5 * k, { lineHeightFactor: 8.5 * k / 7.5 });
          font(6, 'bold', r.tone === 'late' || r.tone === 'failed' ? DANGER : r.tone === 'problem' ? AMBER : MUTED);
          doc.text(sub, M + 6, y + (7.5 + step.length * 8.5 - 1.5) * k, { lineHeightFactor: 6.5 * k / 6 });
        }
        const bh = Math.min(RH - 8, 9), by = y + (RH - bh) / 2;
        for (const c of cluster(r.bits)) {
          const t = TONE[c.tone];
          const bx = X(c.start) + 0.6, bw = Math.max(c.n > 1 ? 9 : 2.4, c.span * px - 1.2);
          doc.setDrawColor(t.stroke); doc.setFillColor(t.fill); doc.setLineWidth(0.7);
          doc.roundedRect(bx, by, bw, bh, 2, 2, 'FD');
          if (c.n > 1) { font(5.5, 'bold', t.text); doc.text(String(c.n), bx + bw / 2, by + bh / 2 + 1.9, { align: 'center' }); }
        }
        y += RH;
        continue;
      }
      /* A FIX UNDER ITS STAGE — its dates, or open-ended, "no date agreed". */
      const nx = l.nest ? NEST : 0;
      if (l.fix) {
        const fl = fixLabel(r, l.nest);
        font(6.5, 'bold', INK2);
        doc.text(fl, M + 14 + nx, y + 7.5 * k, { lineHeightFactor: 7.5 * k / 6.5 });
        font(5.5, 'normal', MUTED); doc.text(san(r.when), M + 14 + nx, y + (7.5 + fl.length * 7.5 - 1.5) * k);
        const fx = X(r.start) + 0.6, fy = y + 5, fh = Math.min(RH - 10, 7);
        const open = (r as GanttRow & { open?: boolean }).open;
        if (open) {
          doc.setDrawColor(MUTED); doc.setLineWidth(0.6); doc.setLineDashPattern([2, 1.5], 0);
          doc.roundedRect(fx, fy, Math.max(4 * px, 46), fh, 2, 2, 'S'); doc.setLineDashPattern([], 0);
          font(5.5, 'normal', MUTED); doc.text('no date agreed', fx + 3, fy + fh / 2 + 1.9);
        } else {
          const ft = TONE[r.tone];
          const fw = Math.max(2.4, r.span * px - 1.2);
          doc.setDrawColor(ft.stroke); doc.setFillColor(ft.fill); doc.setLineWidth(0.6);
          doc.roundedRect(fx, fy, fw, fh, 1.5, 1.5, 'FD');
          font(5.5, 'bold', INK2); doc.text(san(r.when), fx + fw + 3, fy + fh / 2 + 1.9);
        }
        y += RH;
        continue;
      }
      /* "Wrapper — Dry run": the step, with its machine under it. Only the
         machine is split off — a title with a dash of its own stays whole. */
      const { step, sub } = labelOf(r, l.nest);
      const note = r.kind === 'note';
      font(7.5, 'bold', note ? REMIND : INK);
      const lines1 = step.length + sub.length;
      // The row's own air scales with it when a page is tightened (k); the type does not.
      const by0 = y + (lines1 === 1 ? RH / 2 + 2.6 : 7.5 * k);
      doc.text(step, M + 6 + nx, by0, { lineHeightFactor: 8.5 * k / 7.5 });
      const saidBold = !!r.says || (note && r.tone === 'late');
      if (sub.length) { font(6, saidBold ? 'bold' : 'normal', saidBold ? SAY[r.tone] : MUTED); doc.text(sub, M + 6 + nx, y + (7.5 + step.length * 8.5 - 1.5) * k, { lineHeightFactor: 6.5 * k / 6 }); }
      /* "NEXT" — the machine's next stage, in words, outlined in ink: never a state's colour. */
      if (r.next) {
        font(7.5, 'bold');
        const tx = M + 6 + nx + doc.getTextWidth(step[0]) + 4;
        font(5, 'bold', INK);
        const tw = doc.getTextWidth('NEXT') + 5;
        doc.setDrawColor(INK); doc.setLineWidth(0.6); doc.roundedRect(tx, by0 - 5.6, tw, 7, 1.5, 1.5, 'S');
        doc.text('NEXT', tx + 2.5, by0 - 0.4, { charSpace: 0.2 });
      }
      /* AN OPEN CRITICAL PROBLEM on the stage (lib/critical): its count in
         words, solid red — a problem's colour — after its name (and NEXT). */
      /* A HIGH RISK the same way, amber, when nothing on it is critical. */
      if (r.critical || r.risk) {
        font(7.5, 'bold');
        let tx = M + 6 + nx + doc.getTextWidth(step[0]) + 4;
        if (r.next) { font(5, 'bold'); tx += doc.getTextWidth('NEXT') + 5 + 3; }
        font(5, 'bold', '#ffffff');
        const words = r.critical ? critWords(r.critical) : riskWords(r.risk ?? 0);
        const tw = doc.getTextWidth(words) + 5;
        doc.setFillColor(r.critical ? DANGER : AMBER); doc.roundedRect(tx, by0 - 5.6, tw, 7, 1.5, 1.5, 'F');
        doc.text(words, tx + 2.5, by0 - 0.4, { charSpace: 0.2 });
      }
      /* A REMINDER — a mark you can see on its day, its own words beside it. */
      if (note) {
        const { cx, right, lines: words } = remOf(r);
        const cy = y + Math.min(RH / 2, 8.5);
        doc.setDrawColor(r.tone === 'late' ? DANGER : REMIND); doc.setFillColor('#fbe7f1'); doc.setLineWidth(1.1);
        doc.circle(cx, cy, 4.3, 'FD');
        doc.setFillColor(r.tone === 'done' ? '#e7a9c9' : REMIND); doc.circle(cx, cy, 1.9, 'F');
        /* Its words go on over the today and handover lines, on white, so no
           line runs through them. */
        over.push(() => {
          font(7, 'bold', r.tone === 'done' ? '#a06086' : REMIND);
          const tx = right ? cx + 8 : cx - 8;
          doc.setFillColor('#ffffff');
          words.forEach((ln, li) => {
            const w = doc.getTextWidth(ln);
            doc.rect((right ? tx : tx - w) - 1.5, cy + 2.4 + li * 8 - 5.8, w + 3, 7.6, 'F');
          });
          doc.text(words, tx, cy + 2.4, { align: right ? 'left' : 'right', lineHeightFactor: 8 / 7 });
        });
        y += RH;
        continue;
      }

      const t = (r.kind === 'note' ? NOTE_TONE : TONE)[r.tone];
      const bh = Math.min(RH - 8, 9), bx = X(r.start) + 0.6, bw = Math.max(2.4, r.span * px - 1.2), by = y + (RH - bh) / 2;
      doc.setDrawColor(t.stroke); doc.setFillColor(t.fill); doc.setLineWidth(0.7);
      doc.roundedRect(bx, by, bw, bh, 2, 2, 'FD');
      font(6, 'bold', t.text);
      const ww = doc.getTextWidth(san(r.when));
      /* THE OVERRUN — past the finish first planned: hatched red, with how far. */
      let after = bx + bw + 3;
      if (r.slip) {
        const sx = X(r.slip.start) + 0.4, sw = Math.max(2, r.slip.span * px - 0.8);
        doc.setFillColor('#f6dcd8'); doc.setDrawColor(DANGER); doc.setLineWidth(0.7);
        doc.roundedRect(sx, by, sw, bh, 2, 2, 'FD');
        doc.setDrawColor('#e3a59c'); doc.setLineWidth(0.5);
        for (let hx = sx - bh; hx < sx + sw; hx += 3.2) {
          const x1 = Math.max(hx, sx), y1 = by + bh - (x1 - hx), x2 = Math.min(hx + bh, sx + sw), y2 = by + bh - (x2 - hx);
          if (x2 > x1) doc.line(x1, Math.min(y1, by + bh), x2, Math.max(y2, by));
        }
        doc.setDrawColor(DANGER); doc.setLineWidth(0.7); doc.roundedRect(sx, by, sw, bh, 2, 2, 'S');
        after = Math.max(after, sx + sw + 3);
      }
      if (ww + 6 <= bw) doc.text(san(r.when), bx + 3, by + bh / 2 + 2.1);
      else { font(6, 'bold', INK2); doc.text(san(r.when), after, by + bh / 2 + 2.1); after += doc.getTextWidth(san(r.when)) + 3; }
      if (r.slip) { font(6, 'bold', DANGER); doc.text(`+${r.slip.days}d`, after, by + bh / 2 + 2.1); after += doc.getTextWidth(`+${r.slip.days}d`) + 3; }
      /* STARTS BEFORE THE STEP AHEAD HAS FINISHED — the same amber edge and
         words the screen shows, so the client reads the overlap too. */
      if (r.overlap) {
        doc.setFillColor(AMBER); doc.rect(M + 1, y + 3, 2, RH - 6, 'F');
        font(6, 'bold', AMBER); doc.text(san(`overlaps ${r.overlap}`), after, by + bh / 2 + 2.1);
      }
      /* SOMETHING HAPPENED HERE — a small red diamond on the day. */
      for (const mk of r.marks ?? []) {
        const cx = X(mk.at + 0.5), cy = y + 3;
        doc.setFillColor(DANGER); doc.setDrawColor('#ffffff'); doc.setLineWidth(0.5);
        doc.lines([[2.6, 2.6], [-2.6, 2.6], [-2.6, -2.6], [2.6, -2.6]], cx, cy - 2.6, [1, 1], 'FD', true);
      }
      y += RH;
    }
    doc.setDrawColor('#c6d2e3'); doc.setLineWidth(0.6); doc.line(x0, HEAD_TOP, x0, bottom);
    doc.rect(M, HEAD_TOP, PW - 2 * M, bottom - HEAD_TOP);

    /* ---- today and the handover, over the rows ---- */
    if (g.today != null) {
      const x = X(g.today + 0.5);
      doc.setDrawColor(BRAND); doc.setLineWidth(1.1); doc.line(x, bodyTop, x, bottom);
    }
    /* UNDER THE CHART, NOT ON IT. The two dates' labels sat over the last row,
       where a bar's own date could land on them ("8 Nov" over "Handover 7
       Nov"). Under the frame nothing else is drawn; two that would touch are
       staggered. */
    const labels: { x: number; w: number; words: string; colour: string }[] = [];
    const mark = (at: number, colour: string, words: string) => {
      const x = X(at + 0.5);
      doc.setDrawColor(colour); doc.setLineWidth(1); doc.setLineDashPattern([3, 2], 0);
      doc.line(x, bodyTop, x, bottom + 3); doc.setLineDashPattern([], 0);
      font(6.5, 'bold', colour);
      const w = doc.getTextWidth(words);
      labels.push({ x: Math.min(Math.max(M, x - w / 2), PW - M - w), w, words, colour });
    };
    if (g.agreed) mark(g.agreed.at, MUTED, `Agreed ${g.agreed.when}`);
    if (g.expected) mark(g.expected.at, OK, `Handover ${g.expected.when}`);
    over.forEach(f => f());
    let below = 0;
    labels.forEach((lb, i) => {
      const prev = labels[i - 1];
      const row = prev && lb.x < prev.x + prev.w + 6 && lb.x + lb.w + 6 > prev.x ? 1 : 0;
      below = Math.max(below, row);
      font(6.5, 'bold', lb.colour); doc.text(lb.words, lb.x, bottom + 10 + row * 9);
    });

    /* ---- the key ---- */
    let kx = M; let ky = Math.min(bottom + 24 + below * 9, PH - FOOT + 24);
    lastKey = ky;
    /* A key with every entry on it is wider than the page: carry on below. */
    const fit = (word: string, extra: number) => {
      font(7, 'normal', INK2);
      if (kx + extra + doc.getTextWidth(san(word)) > PW - M) { kx = M; ky += 11; lastKey = ky; }
    };
    for (const [tone, word] of [['done', 'done'], ['failed', 'ran, didn’t pass'], ['ran', 'ran, not yet called'], ['late', 'late — or hours lost'], ['problem', 'a problem — no time lost'], ['booked', 'still ahead']] as [GanttTone, string][]) {
      fit(word, 24);
      const c = TONE[tone];
      doc.setDrawColor(c.stroke); doc.setFillColor(c.fill); doc.setLineWidth(0.7);
      doc.roundedRect(kx, ky - 5.5, 12, 7, 1.5, 1.5, 'FD');
      font(7, 'normal', INK2); doc.text(san(word), kx + 15, ky);
      kx += 24 + doc.getTextWidth(san(word));
    }
    if (g.groups.some(x => x.rows.some(r => r.slip))) {
      fit('past the finish first planned', 24);
      doc.setFillColor('#f6dcd8'); doc.setDrawColor(DANGER); doc.setLineWidth(0.7);
      doc.roundedRect(kx, ky - 5.5, 12, 7, 1.5, 1.5, 'FD');
      font(7, 'normal', INK2); doc.text('past the finish first planned', kx + 15, ky);
      kx += 24 + doc.getTextWidth('past the finish first planned');
    }
    if (g.walk && g.walk.days.length) {
      fit('found on the walk - the number still open; solid, past due', 21);
      doc.setLineWidth(0.8); doc.setDrawColor(DANGER); doc.setFillColor('#ffffff'); doc.circle(kx + 4.5, ky - 2, 4.5, 'FD');
      font(5.5, 'bold', DANGER); doc.text('2', kx + 4.5, ky, { align: 'center' });
      const say = 'found on the walk - the number still open; solid, past due';
      font(7, 'normal', INK2); doc.text(say, kx + 12, ky);
      kx += 21 + doc.getTextWidth(say);
    }
    if (g.groups.some(x => x.rows.some(r => r.overlap))) {
      fit('starts before the step ahead has finished', 15);
      doc.setFillColor(AMBER); doc.rect(kx, ky - 6, 2.5, 8, 'F');
      font(7, 'normal', INK2); doc.text('starts before the step ahead has finished', kx + 6, ky);
      kx += 15 + doc.getTextWidth('starts before the step ahead has finished');
    }
    if (g.groups.some(x => x.rows.some(r => r.marks))) {
      fit('something happened', 18);
      doc.setFillColor(DANGER); doc.setDrawColor('#ffffff'); doc.setLineWidth(0.5);
      doc.lines([[2.6, 2.6], [-2.6, 2.6], [-2.6, -2.6], [2.6, -2.6]], kx + 3, ky - 5.2, [1, 1], 'FD', true);
      font(7, 'normal', INK2); doc.text('something happened', kx + 9, ky);
      kx += 18 + doc.getTextWidth('something happened');
    }
    if (g.groups.some(x => x.kind === 'note')) {
      fit('a reminder from the notes', 22);
      doc.setDrawColor(REMIND); doc.setFillColor('#fbe7f1'); doc.setLineWidth(1);
      doc.circle(kx + 4, ky - 2, 3.6, 'FD'); doc.setFillColor(REMIND); doc.circle(kx + 4, ky - 2, 1.5, 'F');
      font(7, 'normal', INK2); doc.text('a reminder from the notes', kx + 11, ky);
      kx += 22 + doc.getTextWidth('a reminder from the notes');
    }
    if (g.groups.some(x => x.rows.some(r => r.parts?.some(pt => pt.at != null)))) {
      fit('a part of the plan, on the day it is due', 20);
      doc.setDrawColor(BOOKED); doc.setFillColor('#e6e4f6'); doc.setLineWidth(0.8); doc.circle(kx + 3.5, ky - 2, 3, 'FD');
      font(7, 'normal', INK2); doc.text('a part of the plan, on the day it is due', kx + 10, ky);
      kx += 20 + doc.getTextWidth('a part of the plan, on the day it is due');
    }
    if (g.groups.some(x => x.rows.some(r => r.next))) {
      fit('NEXT each machine\u2019s next stage not yet done', 22);
      font(5, 'bold', INK);
      const tw = doc.getTextWidth('NEXT') + 5;
      doc.setDrawColor(INK); doc.setLineWidth(0.6); doc.roundedRect(kx, ky - 5.6, tw, 7, 1.5, 1.5, 'S');
      doc.text('NEXT', kx + 2.5, ky - 0.4, { charSpace: 0.2 });
      font(7, 'normal', INK2); doc.text(san('each machine\u2019s next stage not yet done'), kx + tw + 4, ky);
      kx += tw + 14 + doc.getTextWidth(san('each machine\u2019s next stage not yet done'));
    }
    fit('today handover', 60);
    doc.setDrawColor(BRAND); doc.setLineWidth(1.1); doc.line(kx, ky - 6, kx, ky + 1);
    font(7, 'normal', INK2); doc.text('today', kx + 4, ky); kx += 30;
    if (g.expected) {
      doc.setDrawColor(OK); doc.setLineDashPattern([3, 2], 0); doc.line(kx, ky - 6, kx, ky + 1); doc.setLineDashPattern([], 0);
      doc.text('handover', kx + 4, ky);
    }
  });

  /* ---- WHY THE PLAN MOVED — every push later, with its reason ---- */
  if (moves.length) {
    let y = lastKey + 22;
    const fresh = () => { doc.addPage('a4', 'landscape'); drawn.push(doc.getNumberOfPages()); y = M + 10; };
    if (y + 60 > PH - 34) fresh();
    font(11, 'bold'); doc.text('Why the plan moved', M, y); y += 6;
    doc.setDrawColor(LINE); doc.setLineWidth(0.6); doc.line(M, y, PW - M, y); y += 12;
    for (const mv of moves) {
      font(8, 'normal', INK2);
      const why = doc.splitTextToSize(san(mv.why), PW - 2 * M - 250) as string[];
      font(7, 'normal', MUTED);
      const fix = mv.fix ? doc.splitTextToSize(san(`Fix: ${mv.fix}`), PW - 2 * M - 250) as string[] : [];
      font(8, 'bold', INK);
      const stage = doc.splitTextToSize(san(mv.stage), 180) as string[]; // whole — it stopped at two lines
      const h = Math.max(stage.length * 9.5 + 10, why.length * 10 + fix.length * 9) + 8;
      if (y + h > PH - 34) fresh();
      font(8, 'bold', DANGER); doc.text(san(`+${mv.days}d`), M, y);
      font(8, 'bold', INK); doc.text(stage, M + 30, y);
      font(7, 'normal', MUTED); doc.text(san(`${mv.on}  ·  ${mv.from} > ${mv.to}`), M + 30, y + stage.length * 9.5);
      font(8, 'normal', INK2); doc.text(why, M + 250, y);
      if (fix.length) { font(7, 'normal', MUTED); doc.text(fix, M + 250, y + why.length * 10); }
      y += h;
      doc.setDrawColor(LINE); doc.setLineWidth(0.3); doc.line(M, y - 7, PW - M, y - 7);
    }
  }
  return drawn;
}

/** One push later, for the list under the chart. */
export interface MoveLine { on: string; stage: string; from: string; to: string; days: number; why: string; fix?: string }

/** The plan on its own — landscape A4, a foot on every page. */
export function drawGanttDoc(doc: jsPDF, g: Gantt, opts: { name: string; printed: string; dates?: string; moves?: MoveLine[]; asOf?: string }): void {
  const pages = drawGantt(doc, g, {
    eyebrow: `THE PLAN · ${opts.name.toUpperCase()}`,
    title: 'The plan',
    // The same stamp as the screen: a reader of the paper knows how current it was.
    sub: [`Printed ${opts.printed}`, opts.asOf, opts.dates].filter(Boolean).join('   ·   '),
  }, opts.moves);
  pages.forEach((p, i) => {
    doc.setPage(p);
    doc.setFont(pdfFamily(), 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED);
    doc.text(san(`${opts.name}  ·  the plan  ·  ${opts.printed}`), M, PH - 16);
    doc.text(`${i + 1} of ${pages.length}`, PW - M, PH - 16, { align: 'right' });
  });
}
