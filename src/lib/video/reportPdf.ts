/* THE VIDEO STUDY ON PAPER (docs/VIDEO.md, reports; docs/REPORTS.md;
 * docs/LEAN-PAGE.md).
 *
 * The lean page: the band (what, where, when), the tiles (counted figures,
 * each said of what it is out of), then the study in the order a reader
 * needs it — what was asked and of what footage; how it was read (every
 * setting, so it can be read again the same way); each station's work, its
 * cycles and waiting with their units; the people's work stacked against
 * takt, drawn; what it says, each line saying whether it was measured from
 * the footage, worked out, proposed (never said to be safe) or not known;
 * every event with its time in the footage, how it is known and what a
 * person decided; and what is still unverified. Made from the accepted
 * events by lib/video/study — the same figures the screen shows. Laid out by
 * the report engine (src/lib/report/), never by a hand-kept y. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block, type Density, type Frame } from '../report/flow';
import { box, font, gap, rows, text, wrap } from '../report/blocks';
import { leanBand, leanClosing, leanHead, leanTiles } from '../report/lean';
import { DANGER, INK2, LINE, MUTED, OK, WARN, BLUE } from '../reportKit';
import type { LeanPage } from '../lean';
import { BASIS_WORD, EVENT_WORD, KIND_WORD, type VideoEvent, type VideoSource } from './record';
import { clock, FINDING_WORD, findings, sec1, standing, type VideoStudyFigures } from './study';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const TONE = { r: DANGER, a: WARN, g: OK, n: INK2 } as const;

export interface VideoReport {
  name: string;
  line?: string;
  job?: string;
  v: VideoSource;
  /** The footage deleted, when and by whom (lib/video/footage footageGone). */
  gone?: { at: number; by?: string };
  events: readonly VideoEvent[];
  f: VideoStudyFigures;
  printed: string;
}

/** The band and the tiles, as the lean page reads them. */
export function videoLean(r: VideoReport): LeanPage {
  const { f, v } = r;
  const st = standing(f);
  const b = f.bottleneck;
  return {
    eyebrow: 'VIDEO STUDY', title: r.name, sub: [r.line ?? 'On no line', r.job ? `for ${r.job}` : '', v.kind ? KIND_WORD[v.kind] : 'Line balance'].filter(Boolean).join(' · '),
    verdict: { text: st.text, tone: st.tone },
    facts: [['Footage', `${clock(v.facts.durationSec)} · ${v.facts.width}×${v.facts.height}`], ['Printed', r.printed]],
    tiles: [
      { k: 'Events accepted', v: String(f.accepted), of: `of ${f.accepted + f.candidates} not rejected`, tone: f.candidates ? 'a' : 'g' },
      { k: 'Slowest station', v: b?.workTime ? sec1(b.workTime.mean) : '—', of: b ? `${b.zone.label}, a cycle` : 'nothing timed yet' },
      { k: 'Rate it allows', v: f.ratePerMin ? `${f.ratePerMin.toFixed(1)}/min` : '—', of: f.ratePerMin ? `${Math.round(f.ratePerMin * 60)} an hour` : 'nothing timed yet' },
      { k: 'Takt', v: f.takt ? sec1(f.takt) : '—', of: f.takt ? `${f.overTakt.length} station${f.overTakt.length === 1 ? '' : 's'} over it` : 'demand not given', tone: f.overTakt.length ? 'r' : f.takt ? 'g' : 'n' },
      { k: 'Evenly spread', v: f.efficiency !== undefined ? `${Math.round(f.efficiency * 100)}%` : '—', of: 'work ÷ (stations × the most)', tone: f.efficiency !== undefined && f.efficiency < 0.85 ? 'a' : 'n' },
    ],
    insights: [], actions: [], actionsEmpty: '',
    closing: f.verified
      ? { text: `Every event has been reviewed: the figures are from ${f.accepted} accepted events.`, tone: 'g' }
      : { text: `${f.candidates} event${f.candidates === 1 ? '' : 's'} still to review — the figures use only the ${f.accepted} accepted, and the study is not verified until every one is reviewed.`, tone: 'a' },
  };
}

/** A row of a simple table: cells across, the first bold. */
function cells(xs: string[], widths: number[], o: { bold?: boolean; colour?: string } = {}) {
  const size = 8.2;
  const lines = (f: Frame) => xs.map((x, i) => wrap(f.doc, x, widths[i] * f.w - 6, size, o.bold || i === 0 ? 'bold' : 'normal'));
  return {
    h: (f: Frame) => 6 + Math.max(...lines(f).map(l => l.length)) * 10.2,
    draw: (f: Frame, y: number) => {
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
      let x = f.x;
      lines(f).forEach((l, i) => { font(f.doc, size, o.bold || i === 0 ? 'bold' : 'normal', o.colour ?? INK2); f.doc.text(l, x, y + 10); x += widths[i] * f.w; });
    },
  };
}

/** The people's work stacked against takt — each station a bar, its waiting lighter, takt a line. */
function stacksBox(f: VideoStudyFigures): Block | undefined {
  const ss = f.stations.filter(s => s.workTime);
  if (!ss.length) return undefined;
  const H0 = 150;
  return box(() => H0 + 28, (fr, y) => {
    const most = Math.max(...ss.map(s => (s.workTime?.mean ?? 0) + (s.waitTime?.mean ?? 0)), f.takt ?? 0) * 1.12;
    const left = fr.x + 30, w = fr.w - 40, bw = Math.min(70, w / ss.length - 18);
    const yOf = (sec: number) => y + H0 - (sec / most) * H0;
    font(fr.doc, 7, 'normal', MUTED);
    for (let k = 0; k <= 4; k++) { const s = (most / 4) * k; fr.doc.setDrawColor(LINE); fr.doc.line(left, yOf(s), left + w, yOf(s)); fr.doc.text(`${s.toFixed(0)} s`, left - 4, yOf(s) + 2, { align: 'right' }); }
    ss.forEach((s, i) => {
      const x = left + 10 + i * (w / ss.length);
      const work = s.workTime?.mean ?? 0, wait = s.waitTime?.mean ?? 0;
      fr.doc.setFillColor(s === f.bottleneck ? '#2b3640' : BLUE); fr.doc.rect(x, yOf(work), bw, (work / most) * H0, 'F');
      if (wait > 0) { fr.doc.setFillColor('#dfe5e7'); fr.doc.rect(x, yOf(work + wait), bw, (wait / most) * H0, 'F'); }
      font(fr.doc, 7.5, 'bold', INK2); fr.doc.text(sec1(work), x + bw / 2, yOf(work) - 3, { align: 'center' });
      font(fr.doc, 7.5, 'normal', INK2); fr.doc.text(wrap(fr.doc, s.zone.label, w / ss.length - 6, 7.5), x + bw / 2, y + H0 + 10, { align: 'center' });
    });
    if (f.takt) { fr.doc.setDrawColor(DANGER); fr.doc.setLineWidth(1); fr.doc.setLineDashPattern([4, 3], 0); fr.doc.line(left, yOf(f.takt), left + w, yOf(f.takt)); fr.doc.setLineDashPattern([], 0); font(fr.doc, 7.5, 'bold', DANGER); fr.doc.text(`takt ${sec1(f.takt)}`, left + w, yOf(f.takt) - 3, { align: 'right' }); }
    font(fr.doc, 7, 'normal', MUTED); fr.doc.text('Each station: its work a cycle (dark, the slowest darkest) and its waiting between (light), seconds.', fr.x, y + H0 + 24);
  }, fr => gap(fr.density, 'm'));
}

function blocksOf(r: VideoReport, d: Density): Block[] {
  const { f, v } = r;
  const out: Block[] = [];
  const page = videoLean(r);
  out.push(leanBand(page, r.printed));
  out.push(leanTiles(page.tiles));

  out.push(leanHead('What was asked, of what footage'));
  out.push(text({ text: v.objective ? `“${v.objective}”` : 'A line balance: the work at each station in view, timed from the footage.', size: 9.5, style: 'bold', colour: INK2, after: 3 }));
  out.push(text({ text: `${v.facts.fileName}: ${clock(v.facts.durationSec)} of footage, ${v.facts.width}×${v.facts.height}${v.facts.fps ? `, ${v.facts.fps} frames a second` : ''}${v.facts.codec ? `, ${v.facts.codec}` : ''}, ${(v.facts.bytes / (1024 * 1024)).toFixed(1)} MB.${r.gone ? ` The footage was deleted from the study on ${new Date(r.gone.at).toLocaleDateString('en-GB')}${r.gone.by ? ` by ${r.gone.by}` : ''}; what was found in it is kept.` : ''}`, size: 8.5, colour: MUTED, after: gap(d, 's') }));

  out.push(leanHead('How it was read'));
  const c = v.job.config;
  out.push(text({ text: `A frame every ${c.sampleSec} s, read ${c.readWidth} pixels wide, compared with the one before at each station: work is movement more than ${c.sensitivity} times the station's own quiet spread; gaps under ${c.joinGapSec} s are joined and anything under ${c.minEventSec} s left out. Boundaries are halfway between frames, so each is within ${(c.sampleSec / 2).toFixed(2)} s of the movement. Reading ${c.version}${v.job.key ? `, key ${v.job.key}` : ''}. Every event found was a candidate until a person reviewed it; the figures below count only what was accepted. Nobody was identified: a worker is a label at a station.`, size: 8.5, colour: INK2, after: 3 }));
  out.push(text({ text: `Stations: ${c.zones.map(z => `${z.label} (${z.track}), ${Math.round(z.x0 * 100)}–${Math.round(z.x1 * 100)}% across`).join('; ')}.`, size: 8.5, colour: MUTED, after: gap(d, 's') }));

  out.push(leanHead('Each station', `from ${f.accepted} accepted event${f.accepted === 1 ? '' : 's'}`));
  const wd = [0.22, 0.14, 0.1, 0.16, 0.14, 0.14, 0.1];
  out.push(rows({
    header: cells(['Station', 'Work a cycle', 'Cycles', 'Range', 'A cycle every', 'Waiting', 'Working'], wd, { bold: true, colour: MUTED }),
    rows: f.stations.map(s => cells([
      `${s.zone.label} · ${s.zone.track}`,
      s.workTime ? `${sec1(s.workTime.mean)} (median ${sec1(s.workTime.median)})` : '—',
      `${s.workTime?.n ?? 0}${s.partial.length ? ` + ${s.partial.length} cut off` : ''}`,
      s.workTime ? `${s.workTime.min.toFixed(1)}–${s.workTime.max.toFixed(1)} s${s.workTime.cv !== undefined ? `, ${Math.round(s.workTime.cv * 100)}% CV` : ''}` : '—',
      s.cycleTime ? sec1(s.cycleTime.mean) : '—',
      s.waitTime ? sec1(s.waitTime.mean) : '—',
      s.utilisation !== undefined ? `${Math.round(s.utilisation * 100)}%` : '—',
    ], wd)),
  }));
  const chart = stacksBox(f);
  if (chart) out.push(chart);
  if (f.takt && v.demand) out.push(text({ text: `Takt: ${v.demand.availableMin} minutes a ${v.demand.per} × 60 ÷ ${v.demand.units} ${v.demand.unit} = ${sec1(f.takt)} a unit.`, size: 8.5, colour: INK2, after: 3 }));

  out.push(leanHead('What it says'));
  for (const x of findings(f)) {
    out.push(text({ text: `${FINDING_WORD[x.kind]} — ${x.text}`, size: 8.5, style: x.kind === 'proposed' ? 'normal' : 'bold', colour: x.kind === 'unknown' ? MUTED : TONE[x.tone], after: 3 }));
  }

  out.push(leanHead('Every event, on the footage', `${r.events.length} in all`));
  const we = [0.15, 0.16, 0.12, 0.33, 0.24];
  out.push(rows({
    header: cells(['In the footage', 'Station', 'What', 'Seen (and believed)', 'How known · decided'], we, { bold: true, colour: MUTED }),
    rows: r.events.map(e => cells([
      `${clock(e.start)}–${clock(e.end)} (${sec1(e.end - e.start)})`,
      `${v.job.config.zones.find(z => z.id === e.zone)?.label ?? e.zone}${e.track ? ` · ${e.track}` : ''}`,
      EVENT_WORD[e.category],
      `${e.observed}${e.inferred ? ` (believed: ${e.inferred})` : ''}`,
      `${BASIS_WORD[e.basis]}${e.basis !== 'person' ? `, ${Math.round(e.confidence * 100)}%` : ''} · ${e.review === 'candidate' ? 'NOT REVIEWED' : e.review === 'accepted' ? `accepted${e.by ? ` by ${e.by}` : ''}` : 'rejected'}${e.proposed ? `; corrected from ${clock(e.proposed.start)}–${clock(e.proposed.end)}` : ''}`,
    ], we, { colour: e.review === 'rejected' ? MUTED : INK2 })),
  }));
  out.push(leanClosing(page.closing));
  return out;
}

export async function drawVideoReport(doc: jsPDF, r: VideoReport): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, dd => blocksOf(r, dd));
  await pour({ ...base, density, dry: false }, blocksOf(r, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`${r.name} — video study  ·  ${r.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
