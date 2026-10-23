/* WHO OWES WHAT, BY WHEN — the client report's owes sheet, the same debts as
 * page 1 sorted by who owes them (docs/STEADY.md, S4). */
import {
  INK, INK2, MUTED, LINE, BRAND, WARN, DANGER, setFont, fit, panel, wash, type Doc
} from '../reportKit';
import { ASK, type OweTone, type Party } from '../owes';
import type { PaceReportData } from './data';

/* ============== WHO OWES WHAT, BY WHEN — page 3 ==============================
 *
 * Page 1 is the story of each thing being proved; page 2 is where the job is.
 * This is the page the meeting ends on: what each side has to do before the
 * next one. One card per party, the suppliers first and the site last. Each
 * line says what has to happen, what it hangs off, and by when — red when the
 * date has gone. Each card closes with the ask, in a sentence, because it is
 * read aloud.
 *
 * The lines are lib/owes's, off the same strands page 1 draws, so the two pages
 * cannot disagree about who owes what.
 */

const O_PAD = 14;          // inside a card
const O_GAP = 14;          // between cards
const O_HEAD = 44;         // the party's name, its count, the rule
const O_WHEN_W = 82;       // the date column, right

interface OwesRow { what: string[]; about: string[]; when: string; tone: OweTone; h: number }
interface OwesParty { p: Party; rows: OwesRow[]; ask: string[]; askH: number }

/* ---- THE PAGE FLOWS; A PARTY IS NEVER CUT SHORT ----
 *
 * One card per party, packed like the test cards, was the shape until a real
 * job hit it: the site owed twenty-two things, the card was capped at fourteen
 * with "+8 more — see the screens", and because the card was the tallest thing
 * on the page it went on a sheet of its own with the other two columns white.
 * Four sheets, each half empty, and eight debts the client never saw.
 *
 * So the page is a column flow, the way a newspaper runs a long list: the
 * parties in order, each one's rows running down the column, the next party
 * starting under it, and whatever does not fit continuing at the top of the
 * next column — or the next sheet — under the party's name again with
 * "continued" after it. Every row is printed. Every column is full before the
 * next one is started. Nothing points at a screen. */
interface OwesSeg { party: number; from: number; to: number; ask: boolean; cont: boolean;
  sheet: number; col: number; y: number; h: number }

function planOwesParty(d: Doc, p: Party, w: number): OwesParty {
  const textW = w - 2 * O_PAD - O_WHEN_W - 8;
  const rows = p.lines.map(l => {
    setFont(d, 8.5, 'bold', INK);
    const what = d.splitTextToSize(l.what, textW) as string[];
    setFont(d, 7.5, 'normal', MUTED);
    const about = d.splitTextToSize([l.about, l.person].filter(Boolean).join(' · '), textW) as string[];
    return { what, about, when: l.when, tone: l.tone, h: what.length * 10.5 + about.length * 9 + 8 };
  });
  /* The ask, without the words the label above it already says. */
  const said = p.ask.startsWith(ASK) ? p.ask.slice(ASK.length) : p.ask;
  const askText = said.charAt(0).toUpperCase() + said.slice(1);
  setFont(d, 8, 'normal', INK);
  const ask = d.splitTextToSize(askText, w - 2 * O_PAD - 16) as string[];
  return { p, rows, ask, askH: 4 + 18 + ask.length * 10.5 };
}

/** Where every row of every party goes. Pure, so it can be asserted on and so
 *  the page count is known before anything is drawn. `parties` carries each
 *  party's row heights and the height of its closing ask. */
export function flowOwes(parties: { rows: number[]; askH: number }[], cols: number, room: number,
  firstRoom = room): { segs: OwesSeg[]; sheets: number } {
  const segs: OwesSeg[] = [];
  let sheet = 0, col = 0, y = 0;
  const advance = () => { col += 1; y = 0; if (col >= cols) { col = 0; sheet += 1; } };
  parties.forEach((pt, party) => {
    const n = pt.rows.length;
    let from = 0, cont = false;
    for (;;) {
      const avail = (sheet === 0 ? firstRoom : room) - y;
      let h = O_HEAD + 2, to = from;
      /* The last row and the ask travel together: a continuation that is a
         party's name over nothing but its ask box reads as a mistake. */
      const withAsk = (i: number) => (i === n - 1 ? pt.askH : 0);
      while (to < n && h + pt.rows[to] + withAsk(to) + O_PAD <= avail) { h += pt.rows[to]; to += 1; }
      let ask = false;
      if (to === n) { h += pt.askH; ask = true; }
      const took = to - from;
      /* A party opens in a column only when the whole of it fits there or at
         least three rows do; otherwise it starts at the top of the next
         column. Nothing fitting at all in a column that already has something
         in it means the same. A fresh column that still cannot take one row
         is not a case a sheet has — a row is three lines at most — but the
         guard below never loops on it: the row is placed and the column
         moves on. */
      const opening = !cont && !ask && took < Math.min(3, n);
      if ((took === 0 && y > 0) || (opening && y > 0)) { advance(); continue; }
      if (took === 0 && from < n) { h += pt.rows[from]; to = from + 1; if (to === n) { h += pt.askH; ask = true; } }
      const seg: OwesSeg = { party, from, to, ask, cont, sheet, col, y, h: h + O_PAD };
      segs.push(seg);
      y += seg.h + O_GAP;
      if (to === n && ask) break;
      from = to; cont = true;
      advance();
    }
  });
  return { segs, sheets: parties.length ? sheet + 1 : 0 };
}

/** Two columns for a party or two, three past that — a card is read at either
 *  width, and three narrow ones hold more of a long list on a sheet. */
export const owesColumns = (n: number): number => (n <= 2 ? 2 : 3);

const partyTitle = (p: Party, cont: boolean): string =>
  (p.kind === 'nobody' ? 'No one named yet — needs an owner' : `${p.who} owes`) + (cont ? ' — continued' : '');

function drawOwesSeg(d: Doc, pt: OwesParty, seg: OwesSeg, x: number, y: number, w: number): void {
  const { p } = pt;
  const tone = p.late > 0 ? DANGER : p.kind === 'nobody' ? WARN : p.kind === 'site' ? INK2 : BRAND;
  d.setDrawColor(LINE); d.setLineWidth(0.8); d.setFillColor('#ffffff');
  d.roundedRect(x, y, w, seg.h, 5, 5, 'FD');
  d.setFillColor(tone);                                   // the party's band
  d.roundedRect(x, y, 3.5, seg.h, 1.5, 1.5, 'F');

  const count = `${p.lines.length} thing${p.lines.length === 1 ? '' : 's'}`
    + (p.late ? ` · ${p.late} late` : '');
  setFont(d, 8, p.late ? 'bold' : 'normal', p.late ? DANGER : MUTED);
  const countW = d.getTextWidth(count);
  d.text(count, x + w - O_PAD, y + 22, { align: 'right' });
  setFont(d, 13, 'bold', INK);
  d.text(fit(d, partyTitle(p, seg.cont), w - 2 * O_PAD - countW - 12), x + O_PAD, y + 23);
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x + O_PAD, y + O_HEAD - 10, x + w - O_PAD, y + O_HEAD - 10);

  let cy = y + O_HEAD + 2;
  for (const r of pt.rows.slice(seg.from, seg.to)) {
    setFont(d, 8.5, 'bold', INK);
    r.what.forEach((ln, i) => d.text(ln, x + O_PAD, cy + i * 10.5));
    setFont(d, 7.5, 'normal', MUTED);
    r.about.forEach((ln, i) => d.text(ln, x + O_PAD, cy + r.what.length * 10.5 + i * 9 - 1));
    const colour = r.tone === 'late' ? DANGER : r.tone === 'since' ? WARN : r.tone === 'due' ? INK2 : MUTED;
    setFont(d, 8, r.tone === 'late' ? 'bold' : 'normal', colour);
    d.text(r.when, x + w - O_PAD, cy, { align: 'right' });
    cy += r.h;
  }
  if (!seg.ask) return;

  /* The ask, on a wash of the brand, so it reads as the conclusion of the card
     rather than one more line in it. */
  const boxY = cy + 4;
  const boxH = 18 + pt.ask.length * 10.5;
  d.setFillColor(...wash(p.late ? DANGER : BRAND, 0.08));
  d.roundedRect(x + O_PAD, boxY, w - 2 * O_PAD, boxH, 4, 4, 'F');
  setFont(d, 6.5, 'bold', p.late ? DANGER : BRAND);
  d.text('BEFORE THE NEXT REPORT', x + O_PAD + 8, boxY + 11);
  setFont(d, 8, 'normal', INK);
  pt.ask.forEach((ln, i) => d.text(ln, x + O_PAD + 8, boxY + 22 + i * 10.5));
}

interface OwesPlan { parties: OwesParty[]; cols: number; cw: number; flow: ReturnType<typeof flowOwes> }

/** The room the cards get on a sheet whose panel starts at `top`. */
export const owesRoom = (H: number, M: number, top: number): number => (H - M - 14 - top) - 30 - 24;

/** `firstTop` puts the first sheet's panel under something else — the plan —
 *  and the flow starts in what is left of that sheet. */
export function planOwes(d: Doc, data: PaceReportData, W: number, H: number, M: number, firstTop = M): OwesPlan | undefined {
  const o = data.owes;
  if (!o || o.parties.length === 0) return undefined;
  const CW = W - 2 * M;
  const cols = owesColumns(o.parties.length);
  const cw = (CW - 28 - (cols - 1) * O_GAP) / cols;
  const parties = o.parties.map(p => planOwesParty(d, p, cw));
  return { parties, cols, cw, flow: flowOwes(parties.map(pt => ({ rows: pt.rows.map(r => r.h), askH: pt.askH })),
    cols, owesRoom(H, M, M), owesRoom(H, M, firstTop)) };
}

export function owesSheet(d: Doc, data: PaceReportData, plan: OwesPlan, sheet: number, page: number, pages: number,
  place?: { top: number; n?: string }): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;
  const title = sheet === 0 ? 'Who owes what, by when' : 'Who owes what, by when — continued';
  const top = place?.top ?? M;
  /* The panel stops where its cards stop when it shares a sheet; on its own
     sheet it is the sheet. */
  const mine = plan.flow.segs.filter(seg => seg.sheet === sheet);
  const used = mine.reduce((n, seg) => Math.max(n, seg.y + seg.h), 0);
  const panelH = place ? Math.min(H - M - 14 - top, 30 + 12 + used + 14) : H - 2 * M - 14;
  const ruleY = panel(d, M, top, CW, panelH, place ? (place.n ?? '') : String(page), title, data.owes?.says ?? '');
  for (const seg of mine) {
    drawOwesSeg(d, plan.parties[seg.party], seg, M + 14 + seg.col * (plan.cw + O_GAP), ruleY + 12 + seg.y, plan.cw);
  }
  if (place) return;
  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — who owes what, by when`, CW * 0.6), M, H - M + 6);
  d.text('The same debts as page 1, sorted by who owes them. Every line names what it hangs off.',
    W - M, H - M + 6, { align: 'right' });
}
