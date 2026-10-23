/* THE LEVER TREE, ON PAPER — the client report's tree, scaled to its page by
 * changing the geometry (docs/STEADY.md, S4). */
import {
  INK, MUTED, LINE,
  san, setFont, fit, wash, type Doc
} from '../reportKit';
import { TREE_STATUS } from './board';

/* ---------- the lever tree ----------
 * Laid out left to right, exactly as it is on screen: the outcome on the left,
 * each level a column to its right, children stacked and their parent centred
 * against them. Two passes — measure every subtree's height, then place — which
 * is the only way a parent can sit level with the middle of its own children.
 *
 * Everything is drawn. A report that quietly dropped the bottom row would be
 * hiding the work, so when the tree is bigger than the sheet the whole thing is
 * scaled down instead. */
interface TreeIn { id: string; parentId?: string; text: string; rag: string; sort: number; number?: string; state?: string }
export interface TreeBox { text: string; rag: string; number?: string; state?: string; depth: number; kids: TreeBox[]; h: number; y: number }

/* Mutable, and set for the duration of one page by withTreeScale below. jsPDF
 * has no transform to scale a drawing after the fact, so the geometry itself is
 * what shrinks — which keeps the text legible rather than squashing it. */
export let BOX_W = 150, BOX_GAP_Y = 7, COL_GAP = 34, LINE_H = 8.4, PAD = 6;
let FS_BIG = 8, FS_SMALL = 7, FS_PILL = 5.6;
const TREE_BASE = { BOX_W: 150, BOX_GAP_Y: 7, COL_GAP: 34, LINE_H: 8.4, PAD: 6, FS_BIG: 8, FS_SMALL: 7, FS_PILL: 5.6 };

/** Draw the tree at `k` of its natural size, then put the geometry back. */
export function withTreeScale(k: number, draw: () => void): void {
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

export function treeShape(rows: TreeIn[]): TreeBox[] {
  const has = new Set(rows.map(r => r.id));
  const kids = new Map<string, TreeIn[]>();
  for (const r of rows) {
    const k = r.parentId && has.has(r.parentId) ? r.parentId : '';
    kids.set(k, [...(kids.get(k) ?? []), r]);
  }
  const make = (r: TreeIn, depth: number): TreeBox => ({
    text: san(r.text) || '-', rag: r.rag, depth, h: 0, y: 0,
    number: r.number ? san(r.number) : undefined, state: r.state ? san(r.state) : undefined,
    kids: (kids.get(r.id) ?? []).sort((a, b) => a.sort - b.sort).map(k => make(k, depth + 1)),
  });
  return (kids.get('') ?? []).sort((a, b) => a.sort - b.sort).map(r => make(r, 0));
}

/** Height of the box itself, and then of everything under it. A parent is as
 *  tall as its children stacked, or as tall as its own box — whichever wins. */
/** The box itself: its words, the number under them when it follows one, and
 *  the status line. One function, because three places used to work this out
 *  and a fourth line in the box would have had to be added to all three. */
function treeOwn(d: Doc, b: TreeBox): { lines: string[]; own: number } {
  setFont(d, b.depth >= 3 ? FS_SMALL : FS_BIG, 'bold', INK);
  const lines = d.splitTextToSize(b.text, BOX_W - PAD * 2) as string[];
  const own = PAD * 2 + lines.length * LINE_H + (b.number ? LINE_H * 0.9 : 0) + FS_PILL + 3;
  return { lines, own };
}

export function treeMeasure(d: Doc, b: TreeBox): number {
  const { own } = treeOwn(d, b);
  const kidsH = b.kids.length
    ? b.kids.reduce((t, k) => t + treeMeasure(d, k), 0) + (b.kids.length - 1) * BOX_GAP_Y
    : 0;
  b.h = Math.max(own, kidsH);
  return b.h;
}

export function treeDraw(d: Doc, b: TreeBox, x: number, top: number): void {
  const st = TREE_STATUS[b.rag] ?? TREE_STATUS.n;
  const small = b.depth >= 3;
  const { lines, own } = treeOwn(d, b);
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
  // the number the colour came from, in the same small type as the status
  if (b.number) {
    setFont(d, FS_SMALL, 'normal', MUTED);
    d.text(fit(d, b.number, BOX_W - PAD * 2), x + PAD, by + PAD + LINE_H * 0.72 + lines.length * LINE_H);
  }
  setFont(d, FS_PILL, 'bold', st.c);
  d.text((b.state ?? st.label).toUpperCase(), x + PAD, by + own - PAD + 1.5);

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
    const kOwn = treeOwn(d, k).own;
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
