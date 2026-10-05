/* THE ENGINE EVERY REPORT IS POURED THROUGH — docs/REPORTS.md.
 *
 * A report is a list of blocks. Each block knows how tall it is at the page's
 * width, measured with the real font; the engine places them top to bottom
 * and starts a page when the next one will not fit. The report says WHAT is
 * on it; this decides WHERE. That is the whole point: no report keeps its own
 * `y`, guesses a row height or cuts a list short any more.
 *
 * The rules (docs/REPORTS.md §2): nothing is cut — a block too tall for the
 * room left splits, between rows or between lines; a heading is never left at
 * the foot of a page; a block with nothing to say has height 0 and is not
 * drawn; and a small overflow is absorbed by pouring again at the compact
 * density rather than starting a page for a few lines. */
import type { jsPDF } from 'jspdf';

export type Density = 'comfortable' | 'compact';

export interface Frame {
  doc: jsPDF;
  /** Left edge and width of the column blocks are poured into. */
  x: number;
  w: number;
  /** The first and last y a block may use on a page. */
  top: number;
  bottom: number;
  density: Density;
  /** A dry run measures and counts pages without drawing anything. */
  dry: boolean;
}

export interface Block {
  /** How tall it is at the frame's width. 0 means nothing to draw. */
  height(f: Frame): number;
  draw(f: Frame, y: number): void;
  /** Break into a first part no taller than `room` and the rest — or null
   *  when no useful first part fits (the block then starts the next page). */
  split?(f: Frame, room: number, o?: { allowOne?: boolean }): [Block, Block] | null;
  /** Keep with the start of the next block: a heading. */
  keepWithNext?: boolean;
  /** The space after it, included in `height`. It may fall off the foot of a
   *  page — only ink has to fit. Counting it as ink moved a table that fitted
   *  to the next page, stranding its heading (found by the random test). */
  after?(f: Frame): number;
  /** The least of this block worth starting a page with — what a heading
   *  before it asks to come with it. Defaults to the whole block, capped. */
  lead?(f: Frame): number;
  /** Pages of its own (a landscape plan, the line standard): the flow ends
   *  the page it is on, calls this, and carries on on a fresh page. */
  insert?(f: Frame): Promise<void> | void;
  /** An insert that waits for the next page break the flow makes anyway, and
   *  goes there — so the pages around it break exactly where they would
   *  without it. Placed at once, it left a page holding one line before the
   *  plan (found by the random-job stress run); moved only when everything
   *  after it fitted, it still did whenever that was not so. */
  float?: boolean;
  /** The heading drawn again at the top of every page this block starts on
   *  part-way through its section — "Problem 3 — … (continued)" — so a long
   *  section that runs over a page says whose it is. It goes with what is left
   *  of the block after a split, and is drawn once per block; never on the
   *  page the section began on (that page carries the section's own heading). */
  runHead?: Block;
  /** The room the section this block opens asks for below it, to be read on
   *  one page — a problem's fish and its four parts. When less is left and
   *  the page is already a quarter used, the block starts the next page (a
   *  quarter, so the page it leaves is never near-empty). At most a page. */
  keep?(f: Frame): number;
}

export interface Poured {
  /** Portrait pages the flow itself filled (inserts not counted). */
  pages: number;
  /** How much of the last page is used, 0–1. */
  lastFill: number;
}

/** Pour blocks into pages. `newPage` adds a page (never called on a dry run). */
export async function pour(f: Frame, blocks: Block[], newPage: () => void): Promise<Poured> {
  const queue = blocks.slice();
  let y = f.top, pages = 1;
  /* A NEW PAGE ONLY WHEN SOMETHING GOES ON IT. Breaking marks a page as
     wanted; it is added when the next block is drawn — so pages of their own
     at the end (the line standard) leave no blank page behind them. */
  let wanted = false;
  /** Nothing on this page yet but headings — the run that travels together. */
  let headOnly = true;
  /** Floating inserts waiting for the next break, and whether one is due. */
  const waiting: Block[] = [];
  let due = false;
  /** Blocks that have had their run heading drawn above them. */
  const headed = new Set<Block>();
  /** What is left of a block after a split carries its run heading on. */
  const carry = (rest: Block, from: Block): Block => (from.runHead && !rest.runHead ? { ...rest, runHead: from.runHead } : rest);
  const nextPage = () => { wanted = true; y = f.top; headOnly = true; if (waiting.length) due = true; };
  const place = () => { if (wanted) { if (!f.dry) newPage(); pages++; wanted = false; } };
  /* Its own pages follow whatever page the flow is on; the flow resumes on a
     fresh one. The state is set before the await, never after it. */
  const insert = async (list: Block[]) => {
    for (const x of list) {
      wanted = true; y = f.top; headOnly = true;
      if (!f.dry) await x.insert?.(f);
    }
  };

  for (let i = 0; i < queue.length; i++) {
    if (due) { due = false; await insert(waiting.splice(0)); }
    const b = queue[i];
    if (b.insert) {
      // A float waits — unless the flow is at a break already (nothing on the page to come).
      if (b.float && !wanted) { waiting.push(b); continue; }
      await insert([...waiting.splice(0), b]);
      continue;
    }
    const h = b.height(f);
    if (h <= 0) continue;
    const page = f.bottom - f.top;

    /* A page that opens part-way through a section says whose it is — when
       the block can begin under that heading (whole, or split there). */
    if (wanted && b.runHead && !headed.has(b)) {
      headed.add(b);
      const rh = b.runHead.height(f);
      if (rh > 0 && (rh + h - (b.after?.(f) ?? 0) <= page || b.split)) { queue.splice(i, 0, b.runHead); i--; continue; }
    }
    /* A section that a page could hold, kept on one page: started overleaf
       when it will not fit in what is left of a page already a quarter used. */
    if (b.keep && !wanted && !headOnly && y - f.top >= page * 0.25 && y + Math.min(b.keep(f), page) > f.bottom) { nextPage(); i--; continue; }

    /* A heading travels with the start of what follows it — and "the start"
       is checked, not guessed: the whole run of headings from here (a section
       heading and a sub-heading under it) and then the first thing they
       introduce must be able to begin in the room left, whole or split there.
       Found by the random-report test: a guessed allowance, or checking only
       the next heading, left headings alone at the foot of a page. */
    const ink = h - (b.after?.(f) ?? 0);
    let fits = y + ink <= f.bottom;
    if (fits && b.keepWithNext && !headOnly) {
      let j = i + 1, chain = h;
      // A floating insert is not in the way: it waits for a break and is placed at it.
      const skip = (x: Block) => x.insert ? !!x.float : x.keepWithNext || x.height(f) <= 0;
      while (j < queue.length && skip(queue[j])) { if (!queue[j].insert) chain += queue[j].height(f); j++; }
      const next = queue[j];
      if (next && !next.insert) {
        const after = f.bottom - (y + chain);
        const want = Math.min(next.lead ? next.lead(f) : next.height(f), (f.bottom - f.top) / 3);
        fits = after >= want && (next.height(f) - (next.after?.(f) ?? 0) <= after || !!next.split?.(f, after));
      } else fits = y + chain <= f.bottom;
    }

    if (fits) {
      place();
      if (!f.dry) b.draw(f, y);
      y += h;
      if (!b.keepWithNext) headOnly = false;
      continue;
    }

    // It does not fit in the room left.
    if (b.split && !b.keepWithNext) {
      /* Under headings, a table may start with a single row: a heading left
         alone at the foot is worse than a heading with one row under it. */
      const parts = b.split(f, f.bottom - y, { allowOne: headOnly && y > f.top + 0.5 });
      if (parts) {
        place();
        if (!f.dry) parts[0].draw(f, y);
        nextPage();
        queue.splice(i, 1, carry(parts[1], b));
        i--;
        continue;
      }
    }
    /* Not at the top of a page: move on. (A page holding only headings has
       already offered this block its room — a split into it was tried above;
       if not even that fits, the block and the headings could never share a
       page, and the block starts the next one.) */
    if (!headOnly || y > f.top + 0.5) { nextPage(); i--; continue; }

    /* At the top of a page and still too tall: split it if it can be split
       at all; a block that cannot (a picture) is drawn and runs to the foot. */
    const parts = b.split?.(f, f.bottom - y);
    place();
    if (parts) {
      if (!f.dry) parts[0].draw(f, y);
      nextPage();
      queue.splice(i, 1, carry(parts[1], b));
      i--;
      continue;
    }
    if (!f.dry) b.draw(f, y);
    y += h;
    if (!b.keepWithNext) headOnly = false;
  }
  const lastFill = Math.min(1, (y - f.top) / (f.bottom - f.top));
  // No break came: what still waits goes after the last page.
  await insert(waiting.splice(0));
  return { pages, lastFill };
}

/** Pour once to measure at each density and keep the one that wastes least:
 *  compact only when it saves a page that would have been nearly empty. */
export async function chooseDensity(base: Omit<Frame, 'density' | 'dry'>, build: (d: Density) => Block[]): Promise<Density> {
  const roomy = await pour({ ...base, density: 'comfortable', dry: true }, build('comfortable'), () => undefined);
  if (roomy.pages === 1 || roomy.lastFill >= 0.2) return 'comfortable';
  const tight = await pour({ ...base, density: 'compact', dry: true }, build('compact'), () => undefined);
  return tight.pages < roomy.pages ? 'compact' : 'comfortable';
}
