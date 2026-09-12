/* THE GM REPORT, DRAWN AS A REAL PDF.
 *
 * Not a screenshot. Earlier versions rasterised the live page with html2canvas,
 * which renders a CLONE of the document in a hidden iframe — and that clone has
 * to re-fetch the stylesheet, re-evaluate the media queries and finish before it
 * is captured. On a developer machine it always won that race; on a real device,
 * over a network, behind a service worker, it did not, and the report came out
 * unstyled, mis-sized or soft. Four different symptoms, one cause: the output
 * depended on the browser's state at the moment you pressed the button.
 *
 * So nothing here depends on the browser. Every rule, box and glyph is drawn
 * from the numbers, in points, on an A3 landscape page. The result is a proper
 * vector PDF — real selectable text, sharp at any zoom, a few hundred KB — and
 * byte-for-byte the same document on every device, every time.
 *
 * The layout deliberately mirrors the on-screen report: the same sections in the
 * same order, the same palette, the same chart geometry. */
import type { jsPDF } from 'jspdf';

/* ---------- the app's palette, as the report uses it ---------- */
const INK = '#0c1f26', INK2 = '#35505a', MUTED = '#6b8892', LINE = '#dbe8e6';
const ACCENT = '#0a6d5b', BRAND = '#0b7d68', SURF2 = '#e9f2f0';
const OK = '#2e9e5b', WARN = '#b8721a', DANGER = '#cc4436', BLUE = '#1c6fb8';
/** The validated chart pair — actual vs target (target is also dashed, so the
 *  two never rely on colour alone). */
const ACTUAL = '#1c6fb8', TARGET = '#b8721a';

export interface PaceReportData {
  now: number;
  /** Whose project this is. The report used to say "Project Pace" because there
   *  was only one; now it says whatever the project is called, and who leads it,
   *  because the person receiving it needs to know who to go to. */
  title: string;
  lead?: string;
  /** What the lead IS on this report — the project's lead, or, on a line's own
   *  deck, that line's owner. The page prints the same words. */
  leadRole: string;
  subtitle: string;
  lines: {
    key: string; name: string; variant?: string;
    owner?: string; sponsor?: string;
    q1: number; q2: number; q3: number; q4: number; weekly: (number | null)[];
  }[];
  atTarget: number;
  pctDone: number; complete: number; total: number; openTotal: number; openOnTrack: number; late: number;
  openSnags: number; winsThisWeek: number;
  /** The roll-up: one row per line, each number coming from that line's own
   *  pack. On a line's own deck this is the single line it covers. */
  byLine: {
    name: string; owner: string;
    open: number; late: number; done: number; total: number;
    nextOpen: number; nextDone: number; snags: number; wins: number;
    ppm: number | null; target: number;
  }[];
  lateActions: { line: string; what: string; owner: string; due: string }[];
  lateMore: number;
  todos: { state: 'todo' | 'waiting'; what: string; who: string; when: string }[];
  /** Finished lines and what came of them. A Next step marked Done used to drop
   *  out of the report entirely, taking its outcome with it — which is the one
   *  part the GM most wants to read. */
  completed: { what: string; who: string; outcome: string }[];
  completedMore: number;
  /** `line` is which line's walk it came off. On the project's report the
   *  snags are merged from every line, so without it the GM reads six problems
   *  with no idea whose they are. Empty on a line's own deck, where the answer
   *  is on the masthead. */
  snags: { problem: string; owner: string; days: number; status: string; line: string }[];
  /* `impact` is the claim as it should read. When the win carries a proof it is
     the derived sentence and `verdict` says which way it went; with no proof it
     is whatever somebody typed and `verdict` is absent. The page draws the two
     differently on purpose — a measured claim should not look like a typed one. */
  wins: { title: string; impact: string; story: string; who: string; where: string;
          verdict?: 'proven' | 'better' | 'flat' | 'worse' }[];
  /** The project's lever tree, flat — parent ids, drawn into a page of its own.
   *  Empty when nobody has drawn one, and then the page is not printed at all
   *  rather than printed blank. */
  tree: { id: string; parentId?: string; text: string; rag: string; sort: number }[];
}

/* ---------- small drawing helpers ---------- */
type Doc = jsPDF;

/** jsPDF's built-in fonts are WinAnsi-encoded, which has no arrows and no
 *  general Unicode: an impact typed as "44 → 49 ppm" came out as "44 !' 49 ppm"
 *  and mis-measured its own pill. Map the characters people actually type onto
 *  ones the encoding has. (·, —, ’, “ ” and … are all in WinAnsi, so they stay.) */
function san(t: string): string {
  return t
    .replace(/[\u2192\u27A1\u2794]/g, '->')
    .replace(/[\u2190]/g, '<-')
    .replace(/[\u2713\u2714]/g, 'v')
    .replace(/[\u2022]/g, '·')
    .replace(/[\u00A0\u202F\u2009]/g, ' ')
    // anything still outside Latin-1 would draw as noise; drop it rather than
    // print rubbish in a report going to the GM
    .replace(/[^\u0000-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2026]/g, '');
}

const setFont = (d: Doc, size: number, weight: 'normal' | 'bold', colour: string) => {
  d.setFont('helvetica', weight);
  d.setFontSize(size);
  d.setTextColor(colour);
};

/** Trim to fit a column, with an ellipsis — the exec cut, never a wrapped essay. */
function fit(d: Doc, text: string, maxW: number): string {
  if (d.getTextWidth(text) <= maxW) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (d.getTextWidth(text.slice(0, mid) + '…') <= maxW) lo = mid; else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + '…';
}

/** A bordered section panel with the numbered head the on-screen report uses. */
function panel(d: Doc, x: number, y: number, w: number, h: number, n: string, title: string, sowhat: string): number {
  d.setDrawColor(LINE); d.setLineWidth(0.8);
  d.setFillColor('#ffffff');
  d.roundedRect(x, y, w, h, 6, 6, 'FD');

  const cy = y + 18;
  d.setFillColor('#141b26');
  d.circle(x + 22, cy, 8, 'F');
  setFont(d, 8, 'bold', '#ffffff');
  d.text(n, x + 22, cy + 2.8, { align: 'center' });

  setFont(d, 11.5, 'bold', '#141b26');
  d.text(title, x + 36, cy + 3.5);
  setFont(d, 8, 'normal', MUTED);
  d.text(sowhat, x + w - 14, cy + 3, { align: 'right' });

  const ruleY = y + 30;
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x + 12, ruleY, x + w - 12, ruleY);
  return ruleY;                    // content starts below this
}

/* ---------- one line chart, same geometry as the on-screen SVG ---------- */
function chart(d: Doc, x: number, y: number, w: number, h: number, l: PaceReportData['lines'][number]) {
  d.setDrawColor(LINE); d.setLineWidth(0.8); d.setFillColor('#ffffff');
  d.roundedRect(x, y, w, h, 5, 5, 'FD');

  const target = l.q1;
  const vals = l.weekly.filter((v): v is number => v != null);
  const last = vals.length ? vals[vals.length - 1] : null;
  const delta = last == null ? null : last - target;

  /* head: name + variant on the left, latest reading and delta on the right */
  setFont(d, 11.5, 'bold', INK);
  d.text(san(l.name), x + 12, y + 18);
  // Who is against this line. It sits where the variant used to on its own,
  // because a chart with a name on it is somebody's number rather than just a
  // number — and the sub-line is read before the plot is.
  const people = [l.owner && `Owner ${l.owner}`, l.sponsor && `Sponsor ${l.sponsor}`]
    .filter(Boolean).join('  ·  ');
  const sub = [people, l.variant].filter(Boolean).join('  ·  ');
  if (sub) { setFont(d, 7, 'normal', MUTED); d.text(fit(d, sub, w * 0.6), x + 12, y + 28); }

  if (last != null) {
    setFont(d, 17, 'bold', INK);
    d.text(String(last), x + w - 12, y + 20, { align: 'right' });
    setFont(d, 6.5, 'normal', MUTED);
    d.text('ppm latest', x + w - 12, y + 28, { align: 'right' });
    setFont(d, 7.5, 'bold', delta! >= 0 ? OK : DANGER);
    d.text(`${delta! >= 0 ? '+' : ''}${delta} vs Q1 target`, x + w - 12, y + 37, { align: 'right' });
  }

  /* legend — always present, both series named */
  const lgY = y + 46;
  d.setDrawColor(ACTUAL); d.setLineWidth(1.6);
  d.setLineDashPattern([], 0);
  d.line(x + 12, lgY, x + 26, lgY);
  setFont(d, 7, 'normal', INK2); d.text('Actual', x + 30, lgY + 2.4);
  const t0 = x + 30 + d.getTextWidth('Actual') + 10;
  d.setDrawColor(TARGET); d.setLineDashPattern([3, 2], 0);
  d.line(t0, lgY, t0 + 14, lgY);
  d.setLineDashPattern([], 0);
  setFont(d, 7, 'normal', INK2);
  d.text(`Q1 target · ${target} ppm`, t0 + 18, lgY + 2.4);

  /* plot area */
  const qH = 26;                                   // quarterly cells at the foot
  const pL = x + 34, pR = x + w - 52;
  const pT = y + 58, pB = y + h - qH - 20;
  const n = l.weekly.length;

  const lo = Math.min(target, ...vals), hi = Math.max(target, ...vals);
  const pad = Math.max(4, (hi - lo) * 0.35);
  const yMin = Math.floor(lo - pad), yMax = Math.ceil(hi + pad);
  const px = (i: number) => pL + (i * (pR - pL)) / Math.max(1, n - 1);
  const py = (v: number) => pT + ((yMax - v) / (yMax - yMin)) * (pB - pT);

  // recessive gridlines + y labels
  const grid = [yMin, Math.round((yMin + yMax) / 2), yMax];
  d.setLineWidth(0.4);
  for (const g of grid) {
    d.setDrawColor('#eef3f8'); d.setLineDashPattern([2, 2], 0);
    d.line(pL, py(g), pR, py(g));
    d.setLineDashPattern([], 0);
    setFont(d, 6, 'normal', MUTED);
    d.text(String(g), pL - 5, py(g) + 2, { align: 'right' });
  }
  // week labels
  setFont(d, 6, 'normal', MUTED);
  for (let i = 0; i < n; i++) d.text(`W${i + 1}`, px(i), pB + 11, { align: 'center' });

  // target line, dashed, labelled at the right
  d.setDrawColor(TARGET); d.setLineWidth(1.2); d.setLineDashPattern([4, 3], 0);
  d.line(pL, py(target), pR, py(target));
  d.setLineDashPattern([], 0);
  setFont(d, 6.5, 'bold', TARGET);
  d.text('Target', pR + 5, py(target) + 2);

  // actual: contiguous runs only — a missing week breaks the line rather than
  // inventing a reading across it
  d.setDrawColor(ACTUAL); d.setLineWidth(1.8);
  let run: number[] = [];
  const flush = () => {
    for (let k = 1; k < run.length; k++) {
      d.line(px(run[k - 1]), py(l.weekly[run[k - 1]]!), px(run[k]), py(l.weekly[run[k]]!));
    }
    run = [];
  };
  l.weekly.forEach((v, i) => { if (v == null) flush(); else run.push(i); });
  flush();
  d.setFillColor(ACTUAL);
  l.weekly.forEach((v, i) => { if (v != null) d.circle(px(i), py(v), 2.2, 'F'); });
  if (last != null) {
    const li = l.weekly.lastIndexOf(last);
    setFont(d, 6.5, 'bold', ACTUAL);
    d.text(String(last), px(li) + 5, py(last) + 2);
  }

  /* quarterly targets, Q1 highlighted as the one in play */
  const qs: [string, number][] = [['Q1', l.q1], ['Q2', l.q2], ['Q3', l.q3], ['Q4', l.q4]];
  const qW = (w - 24 - 3 * 5) / 4;
  qs.forEach(([lab, val], i) => {
    const qx = x + 12 + i * (qW + 5), qy = y + h - qH - 6;
    const now = i === 0;
    d.setFillColor(now ? '#fdf0e0' : SURF2);
    d.setDrawColor(now ? WARN : SURF2); d.setLineWidth(0.8);
    d.roundedRect(qx, qy, qW, qH, 4, 4, 'FD');
    setFont(d, 6, 'bold', now ? WARN : MUTED);
    d.text(lab, qx + qW / 2, qy + 10, { align: 'center' });
    setFont(d, 9.5, 'bold', now ? WARN : INK);
    d.text(String(val), qx + qW / 2, qy + 21, { align: 'center' });
  });
}

/* ---------- a simple table ---------- */
function table(
  d: Doc, x: number, y: number, w: number,
  cols: { head: string; width: number; align?: 'left' | 'right'; }[],
  rows: { text: string; colour?: string; bold?: boolean }[][],
  maxY: number,
): number {
  const xs: number[] = [];
  let cx = x;
  for (const c of cols) { xs.push(cx); cx += c.width * w; }

  setFont(d, 6.5, 'bold', MUTED);
  cols.forEach((c, i) => {
    const tx = c.align === 'right' ? xs[i] + c.width * w - 6 : xs[i];
    d.text(c.head.toUpperCase(), tx, y, { align: c.align === 'right' ? 'right' : 'left' });
  });
  let cy = y + 5;
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x, cy, x + w, cy);

  for (const row of rows) {
    if (cy + 16 > maxY) break;                    // never spill past the panel
    cy += 13;
    row.forEach((cell, i) => {
      const c = cols[i];
      setFont(d, 8, cell.bold ? 'bold' : 'normal', cell.colour ?? INK);
      const tx = c.align === 'right' ? xs[i] + c.width * w - 6 : xs[i];
      d.text(fit(d, cell.text, c.width * w - 10), tx, cy, { align: c.align === 'right' ? 'right' : 'left' });
    });
    d.setDrawColor('#eef3f8'); d.setLineWidth(0.4);
    d.line(x, cy + 4, x + w, cy + 4);
  }
  return cy;
}

/* ============================================================ */
/* ---------- the lever tree ----------
 * Laid out left to right, exactly as it is on screen: the outcome on the left,
 * each level a column to its right, children stacked and their parent centred
 * against them. Two passes — measure every subtree's height, then place — which
 * is the only way a parent can sit level with the middle of its own children.
 *
 * Everything is drawn. A report that quietly dropped the bottom row would be
 * hiding the work, so when the tree is bigger than the sheet the whole thing is
 * scaled down instead. */
const TREE_STATUS: Record<string, { c: string; label: string }> = {
  n: { c: MUTED,  label: 'Not started' },
  w: { c: '#1c6fb8', label: 'In progress' },
  a: { c: WARN,   label: 'At risk' },
  r: { c: DANGER, label: 'Blocked' },
  g: { c: OK,     label: 'Done' },
};

/** A pale wash of a colour, mixed toward white as a REAL rgb.
 *
 *  jsPDF has no alpha in setFillColor: an eight-digit hex like '#1f8a4c14' is
 *  not read as "green at 8%", it falls through to black — which is how the
 *  first version of this page came out with every box filled solid black and
 *  dark text on top of it. Mixing here means the colour that goes in is the
 *  colour that comes out. */
function wash(hex: string, amount: number): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.round(255 - (255 - c) * amount);
  return [m(r), m(g), m(b)];
}

interface TreeIn { id: string; parentId?: string; text: string; rag: string; sort: number }
interface TreeBox { text: string; rag: string; depth: number; kids: TreeBox[]; h: number; y: number }

/* Mutable, and set for the duration of one page by withTreeScale below. jsPDF
 * has no transform to scale a drawing after the fact, so the geometry itself is
 * what shrinks — which keeps the text legible rather than squashing it. */
let BOX_W = 150, BOX_GAP_Y = 7, COL_GAP = 34, LINE_H = 8.4, PAD = 6;
let FS_BIG = 8, FS_SMALL = 7, FS_PILL = 5.6;
const TREE_BASE = { BOX_W: 150, BOX_GAP_Y: 7, COL_GAP: 34, LINE_H: 8.4, PAD: 6, FS_BIG: 8, FS_SMALL: 7, FS_PILL: 5.6 };

/** Draw the tree at `k` of its natural size, then put the geometry back. */
function withTreeScale(k: number, draw: () => void): void {
  BOX_W = TREE_BASE.BOX_W * k; BOX_GAP_Y = TREE_BASE.BOX_GAP_Y * k;
  COL_GAP = TREE_BASE.COL_GAP * k; LINE_H = TREE_BASE.LINE_H * k; PAD = TREE_BASE.PAD * k;
  // Type never goes below 5pt — under that it is a grey smear on paper, and a
  // tree nobody can read is not a smaller tree, it is no tree.
  FS_BIG = Math.max(5, TREE_BASE.FS_BIG * k);
  FS_SMALL = Math.max(4.6, TREE_BASE.FS_SMALL * k);
  FS_PILL = Math.max(4.2, TREE_BASE.FS_PILL * k);
  try { draw(); } finally { Object.assign(
    { }, TREE_BASE);
    BOX_W = TREE_BASE.BOX_W; BOX_GAP_Y = TREE_BASE.BOX_GAP_Y; COL_GAP = TREE_BASE.COL_GAP;
    LINE_H = TREE_BASE.LINE_H; PAD = TREE_BASE.PAD;
    FS_BIG = TREE_BASE.FS_BIG; FS_SMALL = TREE_BASE.FS_SMALL; FS_PILL = TREE_BASE.FS_PILL;
  }
}

function treeShape(rows: TreeIn[]): TreeBox[] {
  const has = new Set(rows.map(r => r.id));
  const kids = new Map<string, TreeIn[]>();
  for (const r of rows) {
    const k = r.parentId && has.has(r.parentId) ? r.parentId : '';
    kids.set(k, [...(kids.get(k) ?? []), r]);
  }
  const make = (r: TreeIn, depth: number): TreeBox => ({
    text: san(r.text) || '-', rag: r.rag, depth, h: 0, y: 0,
    kids: (kids.get(r.id) ?? []).sort((a, b) => a.sort - b.sort).map(k => make(k, depth + 1)),
  });
  return (kids.get('') ?? []).sort((a, b) => a.sort - b.sort).map(r => make(r, 0));
}

/** Height of the box itself, and then of everything under it. A parent is as
 *  tall as its children stacked, or as tall as its own box — whichever wins. */
function treeMeasure(d: Doc, b: TreeBox): number {
  setFont(d, b.depth >= 3 ? FS_SMALL : FS_BIG, 'bold', INK);
  const lines = d.splitTextToSize(b.text, BOX_W - PAD * 2) as string[];
  const own = PAD * 2 + lines.length * LINE_H + FS_PILL + 3;
  const kidsH = b.kids.length
    ? b.kids.reduce((t, k) => t + treeMeasure(d, k), 0) + (b.kids.length - 1) * BOX_GAP_Y
    : 0;
  b.h = Math.max(own, kidsH);
  return b.h;
}

function treeDraw(d: Doc, b: TreeBox, x: number, top: number): void {
  const st = TREE_STATUS[b.rag] ?? TREE_STATUS.n;
  const small = b.depth >= 3;
  setFont(d, small ? FS_SMALL : FS_BIG, 'bold', INK);
  const lines = d.splitTextToSize(b.text, BOX_W - PAD * 2) as string[];
  const own = PAD * 2 + lines.length * LINE_H + FS_PILL + 3;
  const by = top + (b.h - own) / 2;            // centred against its own subtree

  const [wr, wg, wb] = wash(st.c, b.rag === 'n' ? 0.05 : 0.11);
  d.setFillColor(wr, wg, wb);                   // a wash of its own status
  d.setDrawColor(st.c);
  d.setLineWidth(b.rag === 'n' ? 0.4 : 0.7);
  d.roundedRect(x, by, BOX_W, own, 2.5, 2.5, 'FD');
  // the status stripe down the left, so the state reads even in mono
  d.setFillColor(st.c);
  d.rect(x, by + 1, 2, own - 2, 'F');

  setFont(d, small ? FS_SMALL : FS_BIG, 'bold', INK);
  lines.forEach((ln, i) => d.text(ln, x + PAD, by + PAD + LINE_H * 0.72 + i * LINE_H));
  setFont(d, FS_PILL, 'bold', st.c);
  d.text(st.label.toUpperCase(), x + PAD, by + own - PAD + 1.5);

  if (b.kids.length === 0) return;

  // stem out of this box, the bar down its children, and a stub into each
  const cx = x + BOX_W, cy = by + own / 2;
  const kidX = x + BOX_W + COL_GAP;
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(cx, cy, cx + COL_GAP / 2, cy);

  let ky = top;
  const centres: number[] = [];
  for (const k of b.kids) {
    treeDraw(d, k, kidX, ky);
    const kOwn = (() => {
      setFont(d, k.depth >= 3 ? FS_SMALL : FS_BIG, 'bold', INK);
      const kl = d.splitTextToSize(k.text, BOX_W - PAD * 2) as string[];
      return PAD * 2 + kl.length * LINE_H + FS_PILL + 3;
    })();
    const kcy = ky + (k.h - kOwn) / 2 + kOwn / 2;
    centres.push(kcy);
    d.setDrawColor(LINE); d.setLineWidth(0.6);
    d.line(cx + COL_GAP / 2, kcy, kidX, kcy);
    ky += k.h + BOX_GAP_Y;
  }
  if (centres.length > 1) {
    d.setDrawColor(LINE); d.setLineWidth(0.6);
    d.line(cx + COL_GAP / 2, centres[0], cx + COL_GAP / 2, centres[centres.length - 1]);
  }
}

export function drawPaceReport(d: Doc, raw: PaceReportData): void {
  // sanitise once, at the boundary — everything below draws known-safe text
  const data: PaceReportData = {
    ...raw,
    title: san(raw.title) || 'Project',
    subtitle: san(raw.subtitle),
    lead: raw.lead ? san(raw.lead) : undefined,
    leadRole: san(raw.leadRole) || 'Lead',
    lines: raw.lines.map(l => ({
      ...l, name: san(l.name),
      variant: l.variant ? san(l.variant) : undefined,
      owner: l.owner ? san(l.owner) : undefined,
      sponsor: l.sponsor ? san(l.sponsor) : undefined,
    })),
    byLine: raw.byLine.map(r => ({ ...r, name: san(r.name), owner: san(r.owner) })),
    lateActions: raw.lateActions.map(a => ({ line: san(a.line), what: san(a.what), owner: san(a.owner), due: san(a.due) })),
    todos: raw.todos.map(t => ({ ...t, what: san(t.what), who: san(t.who), when: san(t.when) })),
    completed: raw.completed.map(c => ({ what: san(c.what), who: san(c.who), outcome: san(c.outcome) })),
    snags: raw.snags.map(s2 => ({ ...s2, problem: san(s2.problem), owner: san(s2.owner), line: san(s2.line) })),
    wins: raw.wins.map(w => ({
      title: san(w.title), impact: san(w.impact), story: san(w.story),
      who: san(w.who), where: san(w.where), verdict: w.verdict,
    })),
  };
  const W = d.internal.pageSize.getWidth();        // 1190.55pt
  const H = d.internal.pageSize.getHeight();       // 841.89pt
  const M = 26;
  const CW = W - 2 * M;

  const dateLong = new Date(data.now).toLocaleDateString(undefined,
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* ================= PAGE 1 — LINE PACE ================= */
  setFont(d, 8, 'bold', BRAND);
  d.text('IMPROVEMENT INITIATIVE · WEEKLY EXECUTIVE REPORT', M, M + 8);
  setFont(d, 24, 'bold', '#141b26');
  d.text(fit(d, data.title, CW * 0.6), M, M + 34);
  setFont(d, 9, 'normal', INK2);
  d.text(fit(d, data.subtitle, CW * 0.62), M, M + 48);

  setFont(d, 7, 'bold', MUTED);
  d.text('STATUS AS AT', W - M, M + 8, { align: 'right' });
  setFont(d, 11, 'bold', '#141b26');
  d.text(dateLong, W - M, M + 24, { align: 'right' });
  setFont(d, 8, 'normal', MUTED);
  d.text('Prepared for the General Manager', W - M, M + 37, { align: 'right' });
  if (data.lead) {
    setFont(d, 8, 'bold', BRAND);
    d.text(fit(d, `${data.leadRole} · ${data.lead}`, CW * 0.35), W - M, M + 48, { align: 'right' });
  }

  d.setDrawColor('#141b26'); d.setLineWidth(1.4);
  d.line(M, M + 56, W - M, M + 56);

  /* KPI tiles */
  // On a line's own deck "0/1 lines at target" is a riddle; the number the
  // owner is judged on is the reading itself, against their target.
  const only = data.lines.length === 1 ? data.lines[0] : null;
  const onlyLast = only ? [...only.weekly].reverse().find((v): v is number => v != null) ?? null : null;
  const tiles: [string, string, string, string][] = [
    only
      ? [onlyLast == null ? '--' : String(onlyLast), 'ppm latest',
         onlyLast == null ? `Q1 target ${only.q1}` : `${onlyLast - only.q1 >= 0 ? '+' : ''}${onlyLast - only.q1} vs Q1 target ${only.q1}`,
         onlyLast == null ? MUTED : onlyLast >= only.q1 ? OK : DANGER]
      : [`${data.atTarget}/${data.lines.length}`, 'Lines at target', 'latest week vs Q1',
         data.atTarget === data.lines.length ? OK : data.atTarget === 0 ? DANGER : WARN],
    [`${data.pctDone}%`, 'Actions complete', `${data.complete} of ${data.total}`, OK],
    [String(data.openTotal), 'Still open', 'in flight', BRAND],
    [String(data.late), 'Overdue', 'past their date', data.late > 0 ? DANGER : OK],
    [String(data.openSnags), 'Open evidence', 'from the line walk', data.openSnags > 0 ? WARN : OK],
    [String(data.winsThisWeek), 'Wins this week', 'what worked', OK],
  ];
  const tGap = 8, tW = (CW - tGap * 5) / 6, tY = M + 68, tH = 54;
  tiles.forEach(([n, label, sub, colour], i) => {
    const tx = M + i * (tW + tGap);
    d.setFillColor('#ffffff'); d.setDrawColor(LINE); d.setLineWidth(0.8);
    d.roundedRect(tx, tY, tW, tH, 5, 5, 'FD');
    d.setFillColor(colour);                                  // the status band
    d.roundedRect(tx, tY, tW, 3, 1.5, 1.5, 'F');
    setFont(d, 19, 'bold', colour === BRAND ? '#141b26' : colour);
    d.text(n, tx + 10, tY + 26);
    setFont(d, 8, 'bold', '#141b26');
    d.text(label, tx + 10, tY + 38);
    setFont(d, 6.5, 'normal', MUTED);
    d.text(sub, tx + 10, tY + 47);
  });

  /* line pace */
  const lpY = tY + tH + 12;
  const lpH = H - M - lpY - 18;
  const ruleY = panel(d, M, lpY, CW, lpH, '1', 'Line pace', 'Weekly packs per minute against the quarterly targets');
  /* The grid follows how many lines there actually are. A line's own deck has
   * one chart, and one chart drawn in a quarter of the page leaves three
   * quarters of an A3 blank — so one line gets the whole panel, two get a row
   * each, and three or four get the two-by-two the project has always had. */
  const cGap = 10;
  const n = Math.min(data.lines.length, 4);
  const cols = n <= 1 ? 1 : 2;
  const rows = n <= 2 ? 1 : 2;
  const cW = (CW - 24 - (cols - 1) * cGap) / cols;
  const cH = (lpY + lpH - ruleY - 20 - (rows - 1) * cGap) / rows;
  data.lines.slice(0, 4).forEach((l, i) => {
    const cx = M + 12 + (i % cols) * (cW + cGap);
    const cy = ruleY + 10 + Math.floor(i / cols) * (cH + cGap);
    chart(d, cx, cy, cW, cH, l);
  });

  const pages = data.tree.length > 0 ? 3 : 2;
  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · weekly executive report · page 1 of ${pages} — line pace`, CW * 0.8), M, H - M + 6);
  d.text('The tracker workbook is the system of record; this report reads it.', W - M, H - M + 6, { align: 'right' });

  /* ================= THE PLAN — the lever tree, its own sheet =================
   * Only when there is one. A page with a heading and nothing under it is worse
   * than no page. */
  if (data.tree.length > 0) {
    d.addPage('a3', 'landscape');
    const tpY = panel(d, M, M, CW, H - 2 * M - 14, "2", "The plan",
      'What has to be true for the outcome, and where each part has got to');

    const roots = treeShape(data.tree);
    for (const r of roots) treeMeasure(d, r);
    const totalH = roots.reduce((t, r) => t + r.h, 0) + Math.max(0, roots.length - 1) * BOX_GAP_Y * 2;
    const depth = (function deepest(bs: TreeBox[], at = 1): number {
      return bs.reduce((m, b) => Math.max(m, b.kids.length ? deepest(b.kids, at + 1) : at), at);
    })(roots);
    const totalW = depth * BOX_W + (depth - 1) * COL_GAP;

    // One scale for the whole drawing, so a big tree shrinks rather than
    // spilling off the sheet or losing its bottom row.
    const availW = CW - 24, availH = (H - M - 20) - tpY;
    /* Up as well as down. A four-box tree drawn at 1:1 on an A3 is a postage
     * stamp in the middle of a blank page; a big one still has to shrink to
     * fit. Capped at 1.7 so the boxes stay boxes rather than becoming posters. */
    const k = Math.min(1.7, availW / totalW, availH / totalH);

    withTreeScale(k, () => {
      // re-measured at the page's own scale — wrapping changes with the width
      for (const r of roots) treeMeasure(d, r);
      const th = roots.reduce((t, r) => t + r.h, 0) + Math.max(0, roots.length - 1) * BOX_GAP_Y * 2;
      let y = tpY + Math.max(0, (availH - th) / 2);
      const x0 = M + 12 + Math.max(0, (availW - totalW * k) / 2);
      for (const r of roots) {
        treeDraw(d, r, x0, y);
        y += r.h + BOX_GAP_Y * 2;
      }
    });

    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, `${data.title} · weekly executive report · page 2 of ${pages} — the plan`, CW * 0.8), M, H - M + 6);
    d.text('Kept by hand on the project\u2019s lever tree; the work under it comes off the tracker.',
      W - M, H - M + 6, { align: 'right' });
  }

  /* ================= TRACKER, ATTENTION & MOVEMENT ================= */
  d.addPage('a3', 'landscape');

  const gap = 12;
  const colW = (CW - gap * 2) / 3;
  const rowH1 = (H - 2 * M - 18 - gap) * 0.56;
  const rowH2 = (H - 2 * M - 18 - gap) - rowH1;
  const r1y = M, r2y = M + rowH1 + gap;

  /* 2 — action tracker */
  const atRule = panel(d, M, r1y, colW, rowH1, '2',
    data.byLine.length > 1 ? 'Action tracker & the lines' : 'Action tracker',
    data.byLine.length > 1
      ? `${data.total} actions — and what each line's own pack holds`
      : `${data.total} actions`);
  const barY = atRule + 14, barW = colW - 24, barX = M + 12;
  const seg = (v: number) => (data.total ? (v / data.total) * barW : 0);
  d.setFillColor(SURF2); d.roundedRect(barX, barY, barW, 14, 3, 3, 'F');
  let sx = barX;
  ([[data.complete, OK], [data.openOnTrack, BRAND], [data.late, DANGER]] as [number, string][])
    .forEach(([v, c]) => { const sw = seg(v); if (sw > 0.5) { d.setFillColor(c); d.rect(sx, barY, sw, 14, 'F'); sx += sw; } });

  let lx = barX;
  ([['Complete', data.complete, OK], ['Open', data.openOnTrack, BRAND], ['Overdue', data.late, DANGER]] as [string, number, string][])
    .forEach(([lab, v, c]) => {
      d.setFillColor(c); d.roundedRect(lx, barY + 22, 7, 7, 1.5, 1.5, 'F');
      setFont(d, 7.5, 'normal', '#141b26');
      d.text(lab, lx + 11, barY + 28.5);
      const lw = d.getTextWidth(lab);
      setFont(d, 7.5, 'bold', '#141b26');
      d.text(String(v), lx + 14 + lw, barY + 28.5);
      lx += 14 + lw + d.getTextWidth(String(v)) + 12;
    });

  /* The roll-up. Every column after the name is somebody else's pack read from
   * here: their actions, their next steps, their walk, their wins. */
  table(d, barX, barY + 46, barW,
    [{ head: 'Line', width: 0.19 }, { head: 'Owner', width: 0.19 },
     { head: 'ppm', width: 0.11, align: 'right' },
     { head: 'Open', width: 0.10, align: 'right' }, { head: 'Late', width: 0.10, align: 'right' },
     { head: 'Next', width: 0.11, align: 'right' }, { head: 'Evid.', width: 0.10, align: 'right' },
     { head: 'Wins', width: 0.10, align: 'right' }],
    data.byLine.map(r => [
      { text: r.name, bold: true },
      { text: r.owner, colour: MUTED },
      { text: r.ppm == null ? '--' : String(r.ppm), bold: true,
        colour: r.ppm == null ? MUTED : r.ppm >= r.target ? OK : DANGER },
      { text: String(r.open) },
      { text: String(r.late), colour: r.late > 0 ? DANGER : INK, bold: r.late > 0 },
      { text: String(r.nextOpen) },
      { text: String(r.snags), colour: r.snags > 0 ? WARN : INK },
      { text: String(r.wins), colour: r.wins > 0 ? OK : INK },
    ]),
    r1y + rowH1 - 10);

  /* 3 — overdue & at risk (spans two columns) */
  const odX = M + colW + gap, odW = colW * 2 + gap;
  const odRule = panel(d, odX, r1y, odW, rowH1, '3', 'Overdue & at risk', 'The actions past their date — where help is needed');
  const endY = table(d, odX + 12, odRule + 14, odW - 24,
    [{ head: 'Line', width: 0.10 }, { head: 'Action', width: 0.55 },
     { head: 'Owner', width: 0.22 }, { head: 'Due', width: 0.13, align: 'right' }],
    data.lateActions.map(a => [
      { text: a.line, bold: true },
      { text: a.what },
      { text: a.owner, colour: INK2 },
      { text: a.due, colour: DANGER, bold: true },
    ]),
    r1y + rowH1 - 22);
  if (data.lateMore > 0) {
    setFont(d, 7, 'bold', DANGER);
    d.text(`+${data.lateMore} more overdue — see the tracker`, odX + 12, endY + 16);
  }

  /* 4 — next steps */
  const nsRule = panel(d, M, r2y, colW, rowH2, '4', 'Next steps', 'To do, waiting, and what came of the finished ones');
  const nsBottom = r2y + rowH2 - 10;
  let ny = table(d, M + 12, nsRule + 14, colW - 24,
    [{ head: 'State', width: 0.20 }, { head: 'What', width: 0.44 }, { head: 'Who', width: 0.20 }, { head: 'When', width: 0.16 }],
    data.todos.map(t => [
      { text: t.state === 'waiting' ? 'Waiting' : 'To do', colour: t.state === 'waiting' ? WARN : ACCENT, bold: true },
      { text: t.what },
      { text: t.who, colour: INK2 },
      { text: t.when, colour: INK2 },
    ]),
    nsBottom);

  /* Finished, with the outcome — the part that used to vanish the moment a line
   * was ticked off. Two lines each so the verdict has room to be read. */
  if (data.completed.length && ny + 30 < nsBottom) {
    ny += 18;
    setFont(d, 6.5, 'bold', OK);
    d.text('DONE — WHAT CAME OF IT', M + 12, ny);
    ny += 4;
    d.setDrawColor(LINE); d.setLineWidth(0.6);
    d.line(M + 12, ny, M + colW - 12, ny);
    for (const c of data.completed) {
      if (ny + 24 > nsBottom) break;
      ny += 12;
      setFont(d, 8, 'bold', '#141b26');
      d.text(fit(d, c.what, colW - 70), M + 12, ny);
      if (c.who) {
        setFont(d, 7, 'normal', ACCENT);
        d.text(fit(d, c.who, 52), M + colW - 12, ny, { align: 'right' });
      }
      if (c.outcome) {
        ny += 9;
        setFont(d, 7.5, 'normal', INK2);
        d.text(fit(d, c.outcome, colW - 26), M + 12, ny);
      }
      ny += 4;
    }
    if (data.completedMore > 0 && ny + 12 < nsBottom) {
      ny += 11;
      setFont(d, 7, 'bold', MUTED);
      d.text(`+${data.completedMore} more finished`, M + 12, ny);
    }
  }

  /* 5 — line walk */
  const lwX = M + colW + gap;
  const lwRule = panel(d, lwX, r2y, colW, rowH2, '5', 'Line walk',
    `${data.openSnags} open snag${data.openSnags === 1 ? '' : 's'}`);
  let sy = lwRule + 18;
  if (data.snags.length === 0) {
    setFont(d, 8, 'normal', MUTED);
    d.text('No open snags on the walk.', lwX + 12, sy);
  }
  for (const s of data.snags) {
    if (sy + 14 > r2y + rowH2 - 10) break;
    d.setFillColor(s.status === 'in_progress' ? WARN : DANGER);
    d.circle(lwX + 16, sy - 2.5, 3, 'F');
    setFont(d, 8, 'normal', '#141b26');
    d.text(fit(d, s.problem, colW - 118), lwX + 24, sy);
    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, [s.line, s.owner, `${s.days}d`].filter(Boolean).join(' · '), 94),
      lwX + colW - 12, sy, { align: 'right' });
    d.setDrawColor('#eef3f8'); d.setLineWidth(0.4);
    d.line(lwX + 12, sy + 5, lwX + colW - 12, sy + 5);
    sy += 17;
  }

  /* 6 — what worked */
  const wwX = M + (colW + gap) * 2;
  const wwRule = panel(d, wwX, r2y, colW, rowH2, '6', 'What we tried', 'What worked, what didn\'t');
  let wy = wwRule + 18;
  if (data.wins.length === 0) {
    setFont(d, 8, 'normal', MUTED);
    d.text('Nothing logged yet.', wwX + 12, wy);
  }
  const VERDICT: Record<string, { label: string; c: string }> = {
    proven: { label: 'PROVEN', c: OK },
    better: { label: 'NOT YET PROVEN', c: BLUE },
    flat:   { label: 'NO CHANGE', c: MUTED },
    worse:  { label: 'WORSE', c: DANGER },
  };
  for (const win of data.wins) {
    if (wy + 34 > r2y + rowH2 - 8) break;
    /* A proved win wears its verdict as the pill and prints the derived
       sentence on its own line — the sentence carries both means and both week
       counts, so it is far too long to squeeze in beside a title. An unproved
       one keeps the old typed pill, in ink rather than green: a number somebody
       typed should not be dressed as a result. */
    const v = win.verdict ? VERDICT[win.verdict] : null;
    const pill = v ? v.label : win.impact;
    const pillC = v ? v.c : INK2;
    let pillW = 0;
    if (pill) {
      setFont(d, 7, 'bold', pillC);
      pillW = d.getTextWidth(pill) + 12;
      const [pr, pg, pb] = wash(pillC, 0.12);
      d.setFillColor(pr, pg, pb); d.setDrawColor(pillC); d.setLineWidth(0.6);
      d.roundedRect(wwX + colW - 12 - pillW, wy - 8, pillW, 12, 6, 6, 'FD');
      setFont(d, 7, 'bold', pillC);
      d.text(pill, wwX + colW - 12 - pillW / 2, wy, { align: 'center' });
    }
    setFont(d, 8.5, 'bold', '#141b26');
    d.text(fit(d, win.title, colW - 30 - pillW), wwX + 12, wy);
    wy += 11;
    if (v && win.impact) {
      setFont(d, 7.5, 'bold', pillC);
      d.text(fit(d, win.impact, colW - 24), wwX + 12, wy);
      wy += 10;
    }
    if (win.story) {
      setFont(d, 7.5, 'normal', INK2);
      for (const ln of d.splitTextToSize(win.story, colW - 24).slice(0, 2)) {
        if (wy + 10 > r2y + rowH2 - 8) break;
        d.text(ln as string, wwX + 12, wy); wy += 9;
      }
    }
    setFont(d, 7, 'bold', ACCENT);
    d.text(fit(d, [win.who, win.where].filter(Boolean).join(' · '), colW - 24), wwX + 12, wy);
    wy += 15;
  }

  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · weekly executive report · page ${pages} of ${pages} — tracker, attention & movement`, CW * 0.8), M, H - M + 6);
  d.text(`Generated ${new Date(data.now).toLocaleString(undefined,
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    W - M, H - M + 6, { align: 'right' });
}
