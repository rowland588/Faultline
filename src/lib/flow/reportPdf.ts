/* A PROJECT RUNNING A METHOD, ON PAPER — the method report (lib/flow;
 * docs/LEAN-PAGE.md, docs/REPORTS.md).
 *
 * The lean page the project's screen draws (lib/flow/view flowLean): the
 * band, the tiles, then the method's own picture — every stage in order,
 * each step on each machine with its word and why, and what its gate needs,
 * met or not, with the pass and any reason it was passed over — then what it
 * means, the action plan and the closing line; under it, what has happened
 * — the project's activity log, the screen's own panel, newest first, each
 * line saying who and when and whether the assistant proposed it (a move
 * to another version of the method among them). Nothing is cut: a long
 * method runs on to the next page rather than leaving a step out. Laid out
 * by the report engine (src/lib/report/), never by a hand-kept y. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block, type Density, type Frame } from '../report/flow';
import { font, gap, rows, text, wrap } from '../report/blocks';
import { leanActions, leanBand, leanClosing, leanHead, leanInsights, leanTiles } from '../report/lean';
import { DANGER, INK2, LINE, MUTED, OK, WARN, BLUE } from '../reportKit';
import type { LeanPage } from '../lean';
import { niceDay, todayISO } from '../weeks';
import type { FlowProject } from './operations';
import type { ActivityEntry } from './records';
import { stageWord, stepSquare, stepWhy, stepWord, type Square } from './view';
import { measureNumber, type StepInstance } from './runtime';
import { entryValues, fmtNumber, type AnalysisResult } from './analysis';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const GREY = '#6b7588';
const TONE: Record<Square, string> = { r: DANGER, a: WARN, g: OK, w: BLUE, n: GREY };

export interface FlowReport { fp: FlowProject; page: LeanPage; printed: string; log?: readonly ActivityEntry[] }

/** A list row: what on the left (and its why under it), the word on the right in its colour. */
function line(what: string, why: string, word: string, tone: Square): { h: (f: Frame) => number; draw: (f: Frame, y: number) => void } {
  const rightW = 150;
  const parts = (f: Frame) => ({ w: wrap(f.doc, what, f.w - rightW - 10, 9, 'bold'), y: why ? wrap(f.doc, why, f.w - rightW - 10, 8) : [], r: wrap(f.doc, word, rightW, 8.5, tone === 'n' ? 'normal' : 'bold') });
  return {
    h: f => { const p = parts(f); return 7 + Math.max(p.w.length * 11 + p.y.length * 10, p.r.length * 10.5); },
    draw: (f, top) => {
      const p = parts(f);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, top, f.x + f.w, top);
      font(f.doc, 9, 'bold', INK2); f.doc.text(p.w, f.x, top + 11);
      if (p.y.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.y, f.x, top + 11 + p.w.length * 11 - 1); }
      font(f.doc, 8.5, tone === 'n' ? 'normal' : 'bold', TONE[tone]);
      p.r.forEach((s, i) => f.doc.text(s, f.x + f.w, top + 11 + i * 10.5, { align: 'right' }));
    },
  };
}

/** An analysis's picture on paper — bars (a Pareto with its running share,
 *  a trend by day, a histogram), in neutral ink, as on the screen
 *  (ui/flow/LogParts AnalysisChart). */
function chartBlock(res: AnalysisResult, kind: string): Block {
  const pts = (res.series ?? []).slice(0, 24);
  const H0 = 96;
  return {
    height: () => (pts.length ? H0 + 6 : 0),
    draw: (f, y) => {
      if (!pts.length) return;
      const w = Math.min(f.w, 420), x0 = f.x + 10, top = y + 8, base = y + H0 - 22;
      const max = Math.max(...pts.map(p => p.value), 0) || 1, bw = (w - 10) / pts.length;
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(x0, base, x0 + w - 10, base);
      pts.forEach((p, i) => {
        const h = (base - top) * (p.value / max), bx = x0 + i * bw + bw * 0.12;
        f.doc.setFillColor(i === 0 && kind === 'pareto' ? INK2 : '#9aa6ab');
        if (h > 0) f.doc.rect(bx, base - h, bw * 0.76, h, 'F');
        font(f.doc, 6.5, 'normal', INK2); f.doc.text(fmtNumber(p.value), bx + bw * 0.38, base - h - 2, { align: 'center' });
        font(f.doc, 6.5, 'normal', MUTED);
        const lab = /^\d{4}-\d{2}-\d{2}$/.test(p.label) ? niceDay(p.label) : p.label;
        f.doc.text(lab.slice(0, Math.max(4, Math.floor(bw / 3.6))), bx + bw * 0.38, base + 9, { align: 'center' });
      });
      if (kind === 'pareto' && pts.length > 1) {
        f.doc.setDrawColor(INK2); f.doc.setLineWidth(0.8);
        for (let i = 1; i < pts.length; i++) {
          const ya = base - (base - top) * ((pts[i - 1].cum ?? 0) / 100), yb = base - (base - top) * ((pts[i].cum ?? 0) / 100);
          f.doc.line(x0 + (i - 1) * bw + bw / 2, ya, x0 + i * bw + bw / 2, yb);
        }
        font(f.doc, 6.5, 'normal', MUTED); f.doc.text('line: the running share', x0 + w - 10, top - 2, { align: 'right' });
      }
    },
  };
}

/** A log on paper, under its step: its entries counted, each analysis said,
 *  its pictures drawn. Every entry is printed at the end of the report. */
function logBlocks(s: StepInstance): Block[] {
  if (s.def.answer !== 'log') return [];
  const out: Block[] = [text({ text: `The log — ${s.def.title}${s.machine ? `, ${s.machine}` : ''}: ${s.entries ?? 0} entr${s.entries === 1 ? 'y' : 'ies'}`, size: 8.5, style: 'bold', colour: INK2, indent: 10, before: 2, after: 2 })];
  for (const a of s.def.analyses ?? []) {
    const res = s.analysis?.[a.key];
    if (!res) continue;
    out.push(text({ text: res.says, size: 8, colour: INK2, indent: 10, after: 2 }));
    if (res.series?.length) out.push(chartBlock(res, a.block));
  }
  return out;
}

function blocksOf(r: FlowReport, d: Density): Block[] {
  const { fp, page } = r;
  const out: Block[] = [];
  out.push(leanBand(page, r.printed));
  out.push(leanTiles(page.tiles));
  const def = fp.method.definition;
  if (def.purpose) out.push(text({ text: def.purpose, size: 9, colour: MUTED, after: gap(d, 'm') }));

  /* WHAT IT MEASURES — the screen's panel: each number before → now against its target, every reading */
  if (fp.state.measures.length) {
    out.push(leanHead('What it measures', `${fp.state.measures.filter(m => m.met === true).length} of ${fp.state.measures.filter(m => m.def.target !== undefined).length} targets met`));
    for (const m of fp.state.measures) {
      out.push(text({ text: m.says, size: 9, style: 'bold', colour: m.met === true ? OK : INK2, after: 2 }));
      if (m.readings.length) out.push(text({ text: `Readings: ${m.readings.map(r => `${measureNumber(m.def, r.value)} (${r.step}${r.machine ? `, ${r.machine}` : ''}${r.on ? `, ${niceDay(r.on)}` : ''})`).join('; ')}.`, size: 8, colour: MUTED, indent: 10, after: 4 }));
    }
  }

  /* WHAT NO BLOCK DOES YET — the method's needs for development, as on its page */
  if (def.needs?.length) {
    out.push(leanHead('Needs development', `${def.needs.length} — not run until a block is written`));
    for (const n of def.needs) {
      out.push(text({ text: `${n.what} — ${n.why}`, size: 8.5, style: 'bold', colour: INK2, after: 2 }));
      const more = [n.inputs ? `From: ${n.inputs}` : '', n.method ? `Method: ${n.method}` : '', n.check ? `Checked by: ${n.check}` : ''].filter(Boolean).join(' · ');
      if (more) out.push(text({ text: more, size: 8, colour: MUTED, indent: 10, after: 4 }));
    }
  }

  for (const st of fp.state.stages) {
    out.push(leanHead(`${st.index + 1}. ${st.name}`, stageWord(st)));
    const purpose = def.stages[st.index]?.purpose;
    if (purpose) out.push(text({ text: purpose, size: 8.5, colour: MUTED, after: 4 }));
    if (st.steps.length) {
      out.push(rows({
        rows: st.steps.map(s => line(`${s.def.title}${s.machine ? ` — ${s.machine}` : ''}`, [stepWhy(s), s.tool ? `answered by ${s.tool.name}${s.tool.verdict ? ` — ${s.tool.verdict}` : ''}` : '', s.who && !s.complete ? `for ${s.who}` : ''].filter(Boolean).join(' · '), stepWord(s), stepSquare(s))),
        after: 's',
      }));
      for (const s of st.steps) out.push(...logBlocks(s));
    } else out.push(text({ text: 'No steps in this stage.', size: 8.5, colour: MUTED }));
    /* ITS GATE — each thing it needs, met or not, in words (no marks the paper's font may not hold) */
    const g = st.gate;
    const said = g.passed
      ? `The gate: passed${g.pass?.doneOn ? ` ${niceDay(g.pass.doneOn)}` : ''}${g.pass?.who ? ` by ${g.pass.who}` : ''}${g.pass?.override ? ` — over what was unmet: "${g.pass.override}"` : ''}.`
      : g.waitsOn ? `The gate waits on ${g.waitsOn}.` : g.canPass ? 'The gate is ready to pass.' : 'The gate is not met yet.';
    out.push(text({ text: said, size: 8.5, style: 'bold', colour: g.passed ? OK : g.canPass ? WARN : INK2, before: 4, after: 3 }));
    for (const c of g.conditions) {
      const word = c.met ? 'Met' : c.manual ? (g.pass?.checks?.[c.id] ? `Confirmed by ${g.pass.checks[c.id]}` : 'Confirmed at the pass') : c.policy === 'warn' ? 'Warning' : 'Not met';
      out.push(text({ text: `${word} — ${c.label}${c.manual ? '' : ` (${c.why})`}`, size: 8, colour: c.met || (c.manual && g.pass?.checks?.[c.id]) ? OK : c.manual ? MUTED : c.policy === 'warn' ? WARN : DANGER, indent: 10, after: 2 }));
    }
    if (g.pass?.openAtPass?.length) out.push(text({ text: `Open when it was passed: ${g.pass.openAtPass.join('; ')}.`, size: 8, colour: MUTED, indent: 10, after: 2 }));
    out.push({ height: f => gap(f.density, 'm'), draw: () => undefined });
  }

  out.push(leanHead('What it means'));
  out.push(...leanInsights(page.insights));
  out.push(leanHead('The action plan', page.actions.length ? `${fp.state.outstanding.length} outstanding` : undefined));
  out.push(...leanActions(page.actions, page.actionsEmpty));
  out.push(leanClosing(page.closing));

  /* EVERY ENTRY IN EVERY LOG — nothing cut; a struck one said struck */
  const logs = fp.state.stages.flatMap(st => st.steps).filter(s => s.def.answer === 'log' && (s.record?.entries ?? []).length);
  if (logs.length) {
    out.push(leanHead('Every entry', `${logs.reduce((n, s) => n + (s.record?.entries ?? []).length, 0)} in ${logs.length} log${logs.length === 1 ? '' : 's'}`));
    for (const s of logs) {
      const cols = s.def.columns ?? [];
      out.push(text({ text: `${s.def.title}${s.machine ? ` — ${s.machine}` : ''}`, size: 8.5, style: 'bold', colour: INK2, before: 2, after: 2 }));
      for (const e of [...(s.record?.entries ?? [])].sort((a, b) => a.on.localeCompare(b.on) || a.at - b.at)) {
        const v = entryValues(cols, e.values);
        const said = cols.map(c => { const x = v[c.key]; return x === undefined ? '' : `${c.label} ${typeof x === 'number' ? `${fmtNumber(x)}${c.unit ? ` ${c.unit}` : ''}` : typeof x === 'boolean' ? (x ? 'yes' : 'no') : x}`; }).filter(Boolean).join(' · ');
        out.push(text({ text: `${niceDay(e.on)} — ${said}${e.who ? ` (${e.who})` : ''}${e.struck ? ' — struck, not counted' : ''}`, size: 8, colour: e.struck ? MUTED : INK2, indent: 10, after: 1 }));
      }
    }
  }

  /* WHAT HAS HAPPENED — the screen's panel, on paper; every line, oldest last */
  const log = r.log ?? [];
  out.push(leanHead('What has happened', log.length ? `${log.length} thing${log.length === 1 ? '' : 's'} recorded` : undefined));
  if (!log.length) out.push(text({ text: 'Nothing recorded yet.', size: 8.5, colour: MUTED }));
  for (const e of log) {
    out.push(text({
      text: `${niceDay(todayISO(new Date(e.at)))} — ${e.summary} (${e.who}${e.source === 'assistant' ? ', proposed by the assistant' : ''})`,
      size: 8, colour: INK2, after: 2,
    }));
  }
  return out;
}

/** Draw the method report into `doc` — as many pages as the method needs. */
export async function drawFlowReport(doc: jsPDF, r: FlowReport): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, dd => blocksOf(r, dd));
  await pour({ ...base, density, dry: false }, blocksOf(r, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`${r.fp.project.name} — ${r.fp.method.definition.name}, version ${r.fp.method.version}  ·  ${r.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
