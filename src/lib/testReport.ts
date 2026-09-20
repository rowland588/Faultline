/* THE A3: EVERY TEST, AND WHAT CAME OUT OF IT.
 *
 * One page per handful of tests, in the order the cycle runs, so the sheet reads
 * the way the meeting does: what we planned, what happened, what we found, what
 * we agreed to do.
 *
 * THE VERDICT IS NOT RECOMPUTED HERE. The sentence at the top comes straight out
 * of standing(), the same function both screens read. A sheet that disagrees
 * with the app it was exported from is worse than no sheet — it is the one that
 * gets read out in front of the OEM.
 *
 * It replaced 1,100 lines that drew a readiness verdict, a machine-by-machine
 * panel, a programme band and a five-kind detail table. None of those exist any
 * more, and neither does the code.
 */
import { getBlob } from '../db';
import { loadPdfLib, deliverPdf } from './savePdf';
import {
  ACCENT, BRAND, DANGER, INK, INK2, LINE, MUTED, OK, WARN,
  fit, san, setFont, type Doc,
} from './reportKit';
import { OUTCOME_WORD, isOpen, itemsOf, live, standing } from './testing';
import type { Asset, Test, TestItem } from './testing';

const MAX_EDGE = 1200;
const QUALITY = 0.8;

export interface Shot { data: string; w: number; h: number }

export interface TestReport {
  title: string;
  lead?: string;
  now: number;
  /** The sentence both screens lead with. */
  sentence: string;
  ran: number;
  total: number;
  plannedAt?: string;
  expectedAt?: string;
  rows: ReportTest[];
}

export interface ReportTest {
  title: string;
  machine: string;
  when: string;
  outcome: Test['outcome'];
  passesIf?: string;
  product?: string;
  result?: string;
  found: { what: string; owner?: string; open: boolean }[];
  next: { what: string; owner?: string; due?: string; open: boolean }[];
  shots?: Shot[];
}

const shortISO = (iso?: string): string => {
  if (!iso) return '';
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : iso;
};

/** Everything the drawer needs except the pictures. Pure, so the sheet's numbers
 *  can be tested without a browser. */
export function buildTestReport(input: {
  title: string; lead?: string; now?: number;
  tests: Test[]; items: TestItem[]; assets: Asset[];
  plannedAt?: string; expectedAt?: string;
  shots?: Map<string, Shot[]>;
}): TestReport {
  const st = standing(input.tests, input.items);
  const name = new Map(live(input.assets).map(a => [a.id, a.name]));

  // Done first, newest first, then what is still planned: the sheet is a record
  // of what happened, with the diary at the end.
  const ordered = [...st.done, ...st.upcoming];

  return {
    title: input.title,
    lead: input.lead,
    now: input.now ?? Date.now(),
    sentence: st.sentence,
    ran: st.ran,
    total: st.total,
    plannedAt: input.plannedAt,
    expectedAt: input.expectedAt,
    rows: ordered.map((t): ReportTest => ({
      title: t.title,
      machine: (t.assetId && name.get(t.assetId)) || 'The line',
      when: shortISO(t.ranOn ?? t.plannedFor) || 'no date',
      outcome: t.outcome,
      passesIf: t.passesIf,
      product: t.product ?? t.planned,
      result: t.result,
      found: itemsOf(input.items, t.id, 'found').map(i => ({ what: i.what, owner: i.owner, open: isOpen(i) })),
      next: itemsOf(input.items, t.id, 'next').map(i => ({ what: i.what, owner: i.owner, due: shortISO(i.due), open: isOpen(i) })),
      shots: input.shots?.get(t.id),
    })),
  };
}

const colourOf = (o: Test['outcome']): string =>
  o === 'passed' ? OK : o === 'failed' ? DANGER : o === 'notRun' ? WARN : MUTED;

/* HOW MUCH FITS. Worked from the geometry once and used by both the counting and
 * the drawing, so the footer can never stamp "page 2 of 3" on a four-page sheet
 * — a fault this app has shipped before. */
const M = 26, HEAD = 92, FOOT = 34;
const cardHeight = (r: ReportTest): number =>
  62 + (r.passesIf ? 12 : 0) + (r.result ? 12 : 0)
     + (r.found.length + r.next.length) * 11
     + (r.shots?.length ? 74 : 0);

export function testSheets(data: TestReport, pageH = 842): ReportTest[][] {
  const room = pageH - HEAD - FOOT - M;
  const pages: ReportTest[][] = [];
  let page: ReportTest[] = [], used = 0;
  for (const r of data.rows) {
    const h = cardHeight(r);
    if (page.length && used + h > room) { pages.push(page); page = []; used = 0; }
    page.push(r); used += h + 10;
  }
  if (page.length || !pages.length) pages.push(page);
  return pages;
}

export function drawTestReport(d: Doc, data: TestReport): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const CW = W - 2 * M;
  const pages = testSheets(data, H);

  pages.forEach((rows, p) => {
    if (p > 0) d.addPage();

    /* masthead */
    setFont(d, 8.5, 'bold', BRAND);
    d.text('TESTING', M, M + 10);
    setFont(d, 24, 'bold', INK);
    d.text(fit(d, san(data.title), CW * 0.6), M, M + 36);
    setFont(d, 9, 'normal', MUTED);
    d.text(`As at ${new Date(data.now).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      W - M, M + 14, { align: 'right' });
    if (data.lead) {
      setFont(d, 9, 'bold', INK2);
      d.text(san(data.lead), W - M, M + 28, { align: 'right' });
    }
    if (data.expectedAt) {
      setFont(d, 9, 'bold', INK);
      d.text(`Ours by ${shortISO(data.expectedAt)}`, W - M, M + 42, { align: 'right' });
    }
    d.setDrawColor(BRAND); d.setLineWidth(1.4);
    d.line(M, M + 48, W - M, M + 48);

    /* the answer, once, on page 1 */
    let y = M + 66;
    if (p === 0) {
      setFont(d, 12.5, 'bold', INK);
      const said = d.splitTextToSize(san(data.sentence), CW) as string[];
      d.text(said.slice(0, 2), M, y);
      y += said.length > 1 ? 30 : 18;
    }

    for (const r of rows) {
      const h = cardHeight(r);
      d.setDrawColor(LINE); d.setLineWidth(0.7); d.setFillColor('#ffffff');
      d.roundedRect(M, y, CW, h - 4, 5, 5, 'FD');

      // the stripe says how it went without a word being read
      d.setFillColor(colourOf(r.outcome));
      d.roundedRect(M, y, 3.5, h - 4, 2, 2, 'F');

      let ty = y + 15;
      setFont(d, 11.5, 'bold', INK);
      d.text(fit(d, san(r.title), CW * 0.62), M + 12, ty);
      setFont(d, 9, 'bold', colourOf(r.outcome));
      d.text(OUTCOME_WORD[r.outcome].toUpperCase(), W - M - 10, ty, { align: 'right' });

      ty += 12;
      setFont(d, 8.2, 'normal', MUTED);
      d.text(fit(d, san([r.machine, r.when, r.product].filter(Boolean).join('  ·  ')), CW - 24), M + 12, ty);

      if (r.passesIf) {
        ty += 12;
        setFont(d, 8.4, 'normal', INK2);
        d.text(fit(d, san('Passes if: ' + r.passesIf), CW - 24), M + 12, ty);
      }
      if (r.result) {
        ty += 12;
        setFont(d, 8.8, 'bold', INK);
        d.text(fit(d, san('What happened: ' + r.result), CW - 24), M + 12, ty);
      }

      /* what we found and what's next, side by side — the two halves of the
         conversation that follows any test */
      const half = (CW - 34) / 2;
      let ly = ty + 15, ry = ty + 15;
      if (r.found.length) {
        setFont(d, 7.4, 'bold', DANGER);
        d.text('WHAT WE FOUND', M + 12, ly); ly += 10;
        for (const f of r.found) {
          setFont(d, 8.2, 'normal', f.open ? INK : MUTED);
          d.text(fit(d, san(`${f.open ? '•' : '✓'} ${f.what}${f.owner ? ` — ${f.owner}` : ''}`), half), M + 12, ly);
          ly += 11;
        }
      }
      if (r.next.length) {
        const rx = M + 22 + half;
        setFont(d, 7.4, 'bold', ACCENT);
        d.text('WHAT WE DO NEXT', rx, ry); ry += 10;
        for (const nx of r.next) {
          setFont(d, 8.2, 'normal', nx.open ? INK : MUTED);
          d.text(fit(d, san(`${nx.open ? '•' : '✓'} ${nx.what}${nx.owner ? ` — ${nx.owner}` : ''}${nx.due ? `, ${nx.due}` : ''}`), half), rx, ry);
          ry += 11;
        }
      }

      if (r.shots?.length) {
        let sx = M + 12;
        const sy = Math.max(ly, ry) + 4;
        for (const s of r.shots.slice(0, 5)) {
          const sw = Math.min(96, (s.w / s.h) * 62);
          if (sx + sw > W - M - 12) break;
          try { d.addImage(s.data, 'JPEG', sx, sy, sw, 62); } catch { /* a bad frame must not cost the words */ }
          sx += sw + 6;
        }
      }

      y += h + 6;
    }

    /* foot */
    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, `${san(data.title)} · testing · page ${p + 1} of ${pages.length}`, CW * 0.7), M, H - 20);
    d.text(`${data.ran} of ${data.total} tests run`, W - M, H - 20, { align: 'right' });
  });
}

/* ------------------------------- the pictures ------------------------------ */

async function shotFrom(key: string): Promise<Shot> {
  const blob = await getBlob(key);
  if (!blob) throw new Error('not on this device');
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
    return { data: cv.toDataURL('image/jpeg', QUALITY), w: cv.width, h: cv.height };
  } finally { URL.revokeObjectURL(url); }
}

/** The pictures of each test's day, keyed by test id. A video contributes its
 *  poster frame — the frame somebody chose when they filmed it. */
export async function resolveShots(tests: Test[], items: TestItem[]): Promise<Map<string, Shot[]>> {
  const out = new Map<string, Shot[]>();
  for (const t of live(tests)) {
    const keys = [
      ...(t.media ?? []).map(m => (m.kind === 'photo' ? m.blobKey : m.thumbKey)),
      ...live(items).filter(i => i.testId === t.id)
        .flatMap(i => (i.media ?? []).map(m => (m.kind === 'photo' ? m.blobKey : m.thumbKey))),
    ].filter((k): k is string => !!k);
    const shots: Shot[] = [];
    for (const k of keys.slice(0, 5)) {
      // One unreadable picture must not cost the sheet its other pictures.
      try { shots.push(await shotFrom(k)); } catch { /* send the words */ }
    }
    if (shots.length) out.set(t.id, shots);
  }
  return out;
}

/** Build it, draw it, hand it to the device. */
export async function saveTestReport(input: {
  title: string; lead?: string;
  tests: Test[]; items: TestItem[]; assets: Asset[];
  plannedAt?: string; expectedAt?: string;
}): Promise<'shared' | 'downloaded' | 'opened'> {
  const shots = await resolveShots(input.tests, input.items);
  const data = buildTestReport({ ...input, shots });
  const { jsPDF } = await loadPdfLib();
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  drawTestReport(pdf, data);
  const slug = input.title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'Project';
  return deliverPdf(pdf, `${slug}-testing-${new Date().toISOString().slice(0, 10)}.pdf`);
}
