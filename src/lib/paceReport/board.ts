/* THE BOARD, ON PAPER — the client report's action board laid out by measuring
 * (layBoard), the same lines the screen prints on its cards (docs/STEADY.md,
 * S4). */
import {
  INK, INK2, MUTED, OK, WARN, DANGER, BLUE, setFont, fit, type Doc
} from '../reportKit';
import { boardSheets, runHeight, BOARD_ACT_H, BOARD_ACT_GAP, BOARD_AVAIL, BOARD_AREA_CHROME,
  BOARD_MIN_SCALE, BOARD_MAX_SCALE, areaBlockHeight, PILLARS, type PillarKey } from '../pillars';
import type { PaceReportData } from './data';

/** The board sheet's footer. Extracted because the board can spill onto a
 *  second sheet, and both have to say the same thing about what is not on it. */
export function footBoard(d: Doc, data: PaceReportData, page: number, pages: number, sheet: number): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — the board${sheet > 1 ? ` (${sheet})` : ''}`, (W - 56) * 0.8), 28, H - 28 + 6);
  d.text(data.boardUnplaced > 0
    ? `${data.boardUnplaced} action${data.boardUnplaced === 1 ? '' : 's'} not given a column yet`
    : 'Every action is on the board.', W - 28, H - 28 + 6, { align: 'right' });
}

export const TREE_STATUS: Record<string, { c: string; label: string }> = {
  n: { c: MUTED,  label: 'Not started' },
  w: { c: BLUE, label: 'In progress' },
  a: { c: WARN,   label: 'At risk' },
  r: { c: DANGER, label: 'Late' },
  g: { c: OK,     label: 'Done' },
};

/* ---------- the board, laid out before it is drawn ----------
 *
 * SIX LANES, AND EVERY WORD OF EVERY ACTION. The board used to print three
 * columns and cut each action to its first line with "…". Six lanes on the
 * same sheet are half as wide, and a cut that loses the end of "Replace the
 * worn sealing jaw before the peak" is the report choosing which words the
 * client reads (docs/REPORTS.md rule 1). So a card is as tall as its words:
 * the title wraps, the owner and the day wrap, and the card grows a line at a
 * time.
 *
 * The fit is still lib/pillars' arithmetic — a card is BOARD_ACT_H tall when
 * it is one line, and each further line adds its leading — so a board of
 * one-line actions lands exactly where it always did. A card's lines depend
 * on the scale (the type grows with it, the lanes do not), so each sheet's
 * scale is the largest that still fits, found by measuring rather than
 * assumed. An area too tall for a sheet even at the floor scale is continued
 * on the next one, lane by lane, never cut.
 *
 * This is also what the screen draws: readPages hands the laid-out sheets back
 * to the report screen, which prints the same lines on the same cards. */
export interface BoardCardDrawn {
  /** The action's title, broken into the lines it prints as. */
  title: string[];
  /** The state in words — "OVERDUE", "WAITING", "IN PROGRESS"… */
  status: string;
  /** Owner and due day, broken into lines beside the state word. */
  meta: string[];
  rag: string;
  /** Height at scale 1, in points. */
  h: number;
}
export interface BoardLaneDrawn { key: PillarKey; label: string; count: number; cards: BoardCardDrawn[] }
export interface BoardBlockDrawn {
  area: string;
  /** 1 for the area's own block; 2, 3… when it is continued on the next sheet. */
  part: number;
  total: number; done: number;
  lanes: BoardLaneDrawn[];
  /** Height at scale 1, in points — lib/pillars' areaBlockHeight. */
  h: number;
}
export interface BoardSheetDrawn {
  scale: number; blocks: BoardBlockDrawn[];
  /** The geometry the file drew with, carried so the screen (which does not
   *  load this module until it has to) draws with the same numbers. */
  geom: { laneGap: number; titleLead: number; metaLead: number };
}

/** The gap between two lanes, in points, at every scale. */
export const BOARD_LANE_GAP = 10;
/** Leading of a further line of title, and of owner-and-due, at scale 1. */
export const BOARD_TITLE_LEAD = 9.2;
export const BOARD_META_LEAD = 7.8;
/** How wide each of the six lanes is on a sheet `cw` wide (the panel's width). */
export const boardLaneW = (cw: number): number =>
  (cw - 24 - BOARD_LANE_GAP * (PILLARS.length - 1)) / PILLARS.length;

/** What the state is called on the board. Red on the board is only ever an
 *  action past its day, amber one waiting on somebody. */
export const boardStatus = (rag: string): string =>
  rag === 'r' ? 'Late' : rag === 'a' ? 'Waiting' : (TREE_STATUS[rag] ?? TREE_STATUS.n).label;

type BoardRow = PaceReportData['board'][number];
interface BlockPlan { area: string; part: number; total: number; done: number; lanes: { key: PillarKey; label: string; count: number; rows: BoardRow[] }[] }

function measureCard(d: Doc, b: BoardRow, laneW: number, k: number): BoardCardDrawn {
  const textW = laneW - 14 * k;
  setFont(d, 7.8 * k, 'bold', INK);
  const title = (d.splitTextToSize(b.title, textW) as string[]).filter(l => l !== '');
  const status = boardStatus(b.rag).toUpperCase();
  setFont(d, 6.5 * k, 'bold', INK);
  const stW = d.getTextWidth(status);
  setFont(d, 6.5 * k, 'normal', INK2);
  /* "due 3 Oct" is one thing and never breaks across a line — a day on one
     line and its month on the next reads as two facts. */
  const said = [b.owner, b.due && ('due ' + b.due).replace(/ /g, '\u00a0')].filter(Boolean).join(' \u00b7 ');
  const meta = said ? (d.splitTextToSize(said, Math.max(20, textW - stW - 6 * k)) as string[]).filter(l => l !== '') : [];
  const h = BOARD_ACT_H + Math.max(0, title.length - 1) * BOARD_TITLE_LEAD + Math.max(0, meta.length - 1) * BOARD_META_LEAD;
  return { title: title.length ? title : [''], status, meta, rag: b.rag, h };
}

/** A lane's height in lib/pillars' unit: how many one-line cards it is as tall as. */
const laneCount = (cards: { h: number }[]): number =>
  cards.reduce((t, c) => t + c.h + BOARD_ACT_GAP, 0) / (BOARD_ACT_H + BOARD_ACT_GAP);

function measureBlock(d: Doc, bp: BlockPlan, laneW: number, k: number): BoardBlockDrawn & { counts: number[] } {
  const lanes = bp.lanes.map(l => ({ key: l.key, label: l.label, count: l.count, cards: l.rows.map(r => measureCard(d, r, laneW, k)) }));
  const counts = lanes.map(l => laneCount(l.cards));
  return { area: bp.area, part: bp.part, total: bp.total, done: bp.done, lanes, counts, h: areaBlockHeight(counts) };
}

export function layBoard(d: Doc, data: PaceReportData, cw: number, avail: number = BOARD_AVAIL): BoardSheetDrawn[] {
  if (data.board.length === 0) return [];
  const laneW = boardLaneW(cw);
  const plans: BlockPlan[] = [];
  /* The sheet holds this much at the floor scale, in points at scale 1. */
  const room = avail / BOARD_MIN_SCALE;
  for (const area of [...new Set(data.board.map(b => b.area))]) {
    const mine = data.board.filter(b => b.area === area);
    const whole: BlockPlan = {
      area, part: 1, total: mine.length, done: mine.filter(b => b.rag === 'g').length,
      lanes: PILLARS.map(p => {
        const rows = mine.filter(b => b.pillar === p.key);
        return { key: p.key, label: p.label, count: rows.length, rows };
      }),
    };
    const atFloor = measureBlock(d, whole, laneW, BOARD_MIN_SCALE);
    if (atFloor.h <= room) { plans.push(whole); continue; }
    /* Too tall for any sheet: each lane is continued, a card at a time, in the
       same order, onto as many blocks as it takes. */
    const laneRoom = room - BOARD_AREA_CHROME;
    const chunks = whole.lanes.map((l, li) => {
      const out: BoardRow[][] = [[]];
      let used = 0;
      l.rows.forEach((r, ri) => {
        const c = atFloor.lanes[li].cards[ri].h + BOARD_ACT_GAP;
        if (used + c > laneRoom && out[out.length - 1].length) { out.push([]); used = 0; }
        out[out.length - 1].push(r); used += c;
      });
      return out;
    });
    const parts = Math.max(...chunks.map(c => c.length));
    for (let p = 0; p < parts; p++) {
      plans.push({ ...whole, part: p + 1, lanes: whole.lanes.map((l, li) => ({ ...l, rows: chunks[li][p] ?? [] })) });
    }
  }

  const floor = plans.map(bp => ({ bp, counts: measureBlock(d, bp, laneW, BOARD_MIN_SCALE).counts }));
  return boardSheets(floor, avail).map(group => {
    const at = (k: number) => group.map(g => measureBlock(d, g.bp, laneW, k));
    const fits = (k: number) => k * runHeight(at(k)) <= avail;
    let k = BOARD_MAX_SCALE;
    if (!fits(k)) {
      let lo = BOARD_MIN_SCALE, hi = BOARD_MAX_SCALE;
      for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
      k = lo;
    }
    return {
      scale: k, blocks: at(k).map(({ counts: _c, ...b }) => b),
      geom: { laneGap: BOARD_LANE_GAP, titleLead: BOARD_TITLE_LEAD, metaLead: BOARD_META_LEAD },
    };
  });
}
