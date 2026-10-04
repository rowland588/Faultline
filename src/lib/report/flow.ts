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
  split?(f: Frame, room: number): [Block, Block] | null;
  /** Keep with the start of the next block: a heading. */
  keepWithNext?: boolean;
  /** The least of this block worth starting a page with — what a heading
   *  before it asks to come with it. Defaults to the whole block, capped. */
  lead?(f: Frame): number;
  /** Pages of its own (a landscape plan, the line standard): the flow ends
   *  the page it is on, calls this, and carries on on a fresh page. */
  insert?(f: Frame): Promise<void> | void;
  /** An insert that may wait: when everything after it (up to the next
   *  insert) fits in the room left on this page, that goes first and the
   *  insert follows — rather than a page holding one small table alone. */
  float?: boolean;
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
  let y = f.top, pages = 1, fresh = true;
  /* A NEW PAGE ONLY WHEN SOMETHING GOES ON IT. Breaking marks a page as
     wanted; it is added when the next block is drawn — so pages of their own
     at the end (the line standard) leave no blank page behind them. */
  let wanted = false;
  const nextPage = () => { wanted = true; y = f.top; fresh = true; };
  const place = () => { if (wanted) { if (!f.dry) newPage(); pages++; wanted = false; } };

  for (let i = 0; i < queue.length; i++) {
    const b = queue[i];
    if (b.insert) {
      if (b.float) {
        let j = i + 1, rest = 0;
        while (j < queue.length && !queue[j].insert) rest += queue[j++].height(f);
        if (rest > 0 && y + rest <= f.bottom) {
          // What follows fits here: it goes first, the insert after it.
          queue.splice(i, 1);
          queue.splice(j - 1, 0, { ...b, float: false });
          i--;
          continue;
        }
      }
      // Its own pages follow whatever page the flow is on; the flow resumes on a fresh one.
      wanted = true; y = f.top; fresh = true;
      if (!f.dry) await b.insert(f);
      continue;
    }
    const h = b.height(f);
    if (h <= 0) continue;

    /* A heading travels with the start of what follows it. */
    let need = h;
    if (b.keepWithNext) {
      const next = queue.slice(i + 1).find(n => n.insert || n.height(f) > 0);
      if (next && !next.insert) need += Math.min(next.lead ? next.lead(f) : next.height(f), (f.bottom - f.top) / 3);
    }

    if (y + need <= f.bottom) {
      place();
      if (!f.dry) b.draw(f, y);
      y += h; fresh = false;
      continue;
    }

    // It does not fit in the room left.
    if (b.split && !b.keepWithNext) {
      const parts = b.split(f, f.bottom - y);
      if (parts) {
        place();
        if (!f.dry) parts[0].draw(f, y);
        nextPage();
        queue.splice(i, 1, parts[1]);
        i--;
        continue;
      }
    }
    if (!fresh) { nextPage(); i--; continue; }

    /* At the top of a page and still too tall: split it if it can be split
       at all; a block that cannot (a picture) is drawn and runs to the foot. */
    const parts = b.split?.(f, f.bottom - y);
    place();
    if (parts) {
      if (!f.dry) parts[0].draw(f, y);
      nextPage();
      queue.splice(i, 1, parts[1]);
      i--;
      continue;
    }
    if (!f.dry) b.draw(f, y);
    y += h; fresh = false;
  }
  return { pages, lastFill: Math.min(1, (y - f.top) / (f.bottom - f.top)) };
}

/** Pour once to measure at each density and keep the one that wastes least:
 *  compact only when it saves a page that would have been nearly empty. */
export async function chooseDensity(base: Omit<Frame, 'density' | 'dry'>, build: (d: Density) => Block[]): Promise<Density> {
  const roomy = await pour({ ...base, density: 'comfortable', dry: true }, build('comfortable'), () => undefined);
  if (roomy.pages === 1 || roomy.lastFill >= 0.2) return 'comfortable';
  const tight = await pour({ ...base, density: 'compact', dry: true }, build('compact'), () => undefined);
  return tight.pages < roomy.pages ? 'compact' : 'comfortable';
}
