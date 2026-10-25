/* A CHECK LOG ON PAPER (knowledge/specs/FC-236-check-logs.md §7, "The report") — the checks as agreed, compliance by
 * check, a value's readings against its limits, a checklist's audits, the tags, the failures and what each held, what
 * the list rests on and what is still to confirm. Laid out by the report engine (lib/report); every sentence and figure
 * is figures.ts', the module the page reads — nothing here works a number out.
 *
 *   logBodyBlocks    the parts between the tiles and the action plan: the study's own paper and the line report both print them
 *   logPaperBlocks   the whole page: band, tiles, what it says, the body, the action plan, the closing line */
import type { Block, Frame } from '../../lib/report/flow';
import { font, gap, label, rows, text, wrap } from '../../lib/report/blocks';
import { boxed, leanActions, leanBand, leanClosing, leanHead, leanInsights, leanTiles } from '../../lib/report/lean';
import { bandPage } from '../../lib/lean';
import type { Density } from '../../lib/report/flow';
import type { LogCheck, ToolStudy } from '../../lib/study';
import type { Snag } from '../../snag/types';
import type { LogDef } from './def';
import { freqWords, valueSays, verdictOf, when, MIN, type ValueTrend } from './checks';
import { checkRow, logFigures, type LogFigures, type ScoreSeries } from './figures';
import { failureLine, logActions, logClosing, logInsights, logSays, logTiles, resultWords } from './says';
import type { LogCtx } from './hold';
import { judgedBy } from './RoundParts';

const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', DANGER = '#c4281c', BAR = '#c3cfcf';

function table(header: string[], body: string[][], shares: number[], red?: (i: number) => boolean): Block {
  const LH = 9;
  const lines = (f: Frame, cells: string[], bold: boolean) => cells.map((c, i) => { font(f.doc, 7.5, bold ? 'bold' : 'normal', INK2); return wrap(f.doc, c, f.w * shares[i] - 6, 7.5, bold ? 'bold' : 'normal'); });
  const row = (cells: string[], bold: boolean, isRed = false): Parameters<typeof rows>[0]['rows'][number] => ({
    h: (f: Frame) => Math.max(1, ...lines(f, cells, bold).map(l => l.length)) * LH + 4,
    draw: (fr: Frame, y: number) => {
      let x = fr.x;
      lines(fr, cells, bold).forEach((ls, i) => { font(fr.doc, 7.5, bold ? 'bold' : 'normal', bold ? MUTED : isRed ? DANGER : INK2); ls.forEach((l, k) => fr.doc.text(l, x, y + 8 + k * LH)); x += fr.w * shares[i]; });
      if (bold) { fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4); const h = Math.max(1, ...lines(fr, cells, bold).map(l => l.length)) * LH + 2; fr.doc.line(fr.x, y + h, fr.x + fr.w, y + h); }
    },
  });
  return rows({ header: row(header, true), rows: body.map((b, i) => row(b, false, red?.(i) ?? false)), after: 'm' });
}

/** A value's readings against its limits: the limits dashed, a reading outside them drawn larger and red. */
function valueBlock(c: LogCheck, t: ValueTrend): Block {
  const pts = t.points, HB = 120;
  const vs = [...pts.map(p => p.v), ...(c.lo !== undefined ? [c.lo] : []), ...(c.hi !== undefined ? [c.hi] : [])];
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const pad = Math.max((hi - lo) * 0.12, Math.abs(hi) * 0.002, 1e-9); lo -= pad; hi += pad;
  return rows({ rows: [{
    h: () => HB + 14,
    draw: (fr: Frame, y: number) => {
      const x0 = fr.x + 6, w = fr.w - 84, yy = (v: number) => y + 6 + (1 - (v - lo) / (hi - lo)) * (HB - 12), xx = (i: number) => x0 + (pts.length <= 1 ? w / 2 : (i / (pts.length - 1)) * w);
      for (const [v, nm] of [[c.hi, 'upper limit'], [c.lo, 'lower limit']] as const) {
        if (v === undefined) continue;
        fr.doc.setDrawColor(DANGER); fr.doc.setLineWidth(0.6); fr.doc.setLineDashPattern([2, 2], 0); fr.doc.line(x0, yy(v), x0 + w, yy(v)); fr.doc.setLineDashPattern([], 0);
        font(fr.doc, 6.5, 'normal', DANGER); fr.doc.text(`${nm} ${+v.toFixed(2)}`, x0 + w + 4, yy(v) + 2);
      }
      fr.doc.setDrawColor(INK2); fr.doc.setLineWidth(0.7);
      pts.forEach((p, i) => { if (i) fr.doc.line(xx(i - 1), yy(pts[i - 1].v), xx(i), yy(p.v)); });
      pts.forEach((p, i) => { fr.doc.setFillColor(p.bad ? DANGER : INK2); fr.doc.circle(xx(i), yy(p.v), p.bad ? 2.6 : 1.7, 'F'); });
      fr.doc.setDrawColor(LINE); fr.doc.line(x0, y + HB - 6, x0 + w, y + HB - 6);
    },
  }], after: 'm' });
}

/** A checklist's audits as bars — the score of each, the score to reach dashed. */
function scoreBlock(sc: ScoreSeries): Block {
  const bars = sc.audits.filter(a => a.figures.pct !== undefined).slice(-24), HB = 100;
  return rows({ rows: [{
    h: () => HB + 14,
    draw: (fr: Frame, y: number) => {
      const x0 = fr.x + 30, w = fr.w - 36, bw = w / Math.max(bars.length, 1), yy = (v: number) => y + 6 + (1 - v / 100) * (HB - 12);
      for (const g of [0, 50, 100]) { fr.doc.setDrawColor(LINE); fr.doc.line(x0, yy(g), x0 + w, yy(g)); font(fr.doc, 6.5, 'normal', MUTED); fr.doc.text(`${g}%`, fr.x, yy(g) + 2); }
      bars.forEach((b, i) => {
        const v = b.figures.pct ?? 0;
        fr.doc.setFillColor(i === bars.length - 1 ? INK2 : BAR); fr.doc.rect(x0 + i * bw + 2, yy(v), Math.max(1, bw - 4), yy(0) - yy(v), 'F');
        font(fr.doc, 6.5, 'normal', INK2); fr.doc.text(`${Math.round(v)}%`, x0 + i * bw + bw / 2, yy(v) - 2, { align: 'center' });
      });
      if (sc.check.passPct !== undefined) { fr.doc.setDrawColor(DANGER); fr.doc.setLineDashPattern([2, 2], 0); fr.doc.line(x0, yy(sc.check.passPct), x0 + w, yy(sc.check.passPct)); fr.doc.setLineDashPattern([], 0); }
    },
  }], after: 'm' });
}

const pct0 = (n: number | undefined) => (n === undefined ? '—' : `${Math.round(n)}%`);

export interface LogPaperInput { s: ToolStudy; def: LogDef; f: LogFigures; snags: readonly Snag[]; lineName?: string; where: string }

/** Everything between the tiles and the action plan. */
export function logBodyBlocks(i: LogPaperInput): Block[] {
  const { s, def, f } = i;
  const log = s.agreed!.log!;
  const out: Block[] = [];
  const checks = log.checks.filter(c => !c.removed);
  const byId = new Map(log.checks.map(c => [c.id, c]));
  const ins = logInsights(f);
  if (ins.length) { out.push(leanHead('What it means')); out.push(...leanInsights(ins)); }

  out.push(leanHead('The checks as agreed'));
  out.push(checks.length ? table(['Check', 'Where · who', 'How often', 'Judged by', 'If it fails'],
    checks.map(c => [c.name, [c.where, c.who].filter(Boolean).join(' · ') || '—', freqWords(c.when), judgedBy(c), c.reaction?.trim() || def.reactionWords]), [0.2, 0.15, 0.13, 0.24, 0.28])
    : text({ text: 'Nothing is on the list to check yet.', size: 9, colour: MUTED }));

  out.push(leanHead(`Checks done on time — the last 7 days`));
  out.push(table(['Check', 'Due', 'On time', 'Missed', 'Done', 'Longest gap'],
    [...checks.map(c => {
      const k = checkRow(s, c, f), done = (s.facts.results ?? []).filter(r => !r.struck && r.checkId === c.id && r.at >= f.period.from).length;
      return [c.name, k.expected ? String(k.expected) : '—', k.expected ? `${k.onTime} (${pct0(k.pct)})` : '—', k.expected ? String(k.missed) : '—', String(done), k.expected && k.longestGapMin !== undefined ? (k.longestGapMin >= 120 ? `${Math.round(k.longestGapMin / 60)} h` : `${k.longestGapMin} min`) : '—'];
    }), ['All checks', f.comp.expected ? String(f.comp.expected) : '—', f.comp.expected ? `${f.comp.onTime} (${pct0(f.comp.pct)})` : '—', String(f.comp.missed), String(f.results), '']],
    [0.34, 0.1, 0.18, 0.1, 0.1, 0.18], idx => idx < checks.length && checkRow(s, checks[idx], f).missed > 0));
  out.push(text({ text: 'A check every interval is due an interval after the last one was done; on time if done within a quarter of the interval (at least 5 minutes, at most 12 hours) of that; missed after. Checks done when something happens are counted, not scheduled.', size: 7.5, colour: MUTED, after: 6 }));

  for (const { check, trend } of f.values.filter(v => v.trend.n > 0)) {
    out.push(leanHead(`${check.name}${check.where ? ` — ${check.where}` : ''}: readings against the limits`));
    out.push(text({ text: `${valueSays(check, trend) ?? ''}.`, size: 8.5, colour: trend.nearing ? DANGER : INK2, after: 3 }));
    out.push(valueBlock(check, trend));
    out.push(table(['When', 'Reading', 'By'], trend.points.slice(-30).map(p => { const r = (s.facts.results ?? []).find(x => x.at === p.at && x.checkId === check.id); return [when(p.at, f.now), `${p.v}${check.unit ? ` ${check.unit}` : ''}${p.bad ? ' — outside' : ''}`, r?.by ?? '']; }), [0.4, 0.4, 0.2], i => trend.points.slice(-30)[i].bad));
  }

  for (const sc of f.scored.filter(x => x.audits.length)) {
    out.push(leanHead(`${sc.check.name}: the audits, in order`));
    out.push(scoreBlock(sc));
    if (sc.latest) {
      out.push(text({ text: `Latest: ${pct0(sc.latest.figures.pct)} — ${sc.latest.figures.points} of ${sc.latest.figures.max} on ${when(sc.latest.result.at, f.now)}${sc.latest.result.by ? ` by ${sc.latest.result.by}` : ''}.${sc.falling ? ` Fallen ${sc.falls} audits running.` : ''}`, size: 8.5, colour: INK2, after: 3 }));
      if (sc.latest.figures.groups.length) out.push(table(['Heading', 'Score', 'Share'], sc.latest.figures.groups.map(g => [`${g.name}${sc.weakest?.name === g.name ? ' (weakest)' : ''}`, `${g.points} of ${g.max}`, pct0(g.pct)]), [0.5, 0.25, 0.25]));
      const finds = sc.latest.result.answers?.filter(a => sc.latest!.findings.includes(a.id)) ?? [];
      if (finds.length) {
        out.push(label('Findings'));
        out.push(table(['Question', 'Scored', ''], finds.map(a => [`${a.group ? `${a.group} — ` : ''}${a.name}`, String(a.level), sc.latest!.repeats.includes(a.id) ? 'came back' : '']), [0.7, 0.12, 0.18], idx => sc.latest!.repeats.includes(finds[idx].id)));
      }
    }
  }

  if (f.tags && f.tags.raised > 0) {
    out.push(leanHead('Abnormality tags'));
    out.push(text({ text: `${f.tags.raised} raised: ${f.tags.open} open${f.tags.over7 ? `, ${f.tags.over7} older than a week` : ''}${f.tags.over14 ? ` (${f.tags.over14} older than a fortnight)` : ''}, ${f.tags.closed} closed.${f.tags.repeats.length ? ` ${f.tags.repeats.map(r => `${r.name} tagged ${r.n} times in 28 days`).join('; ')}.` : ''}`, size: 8.5, colour: INK2, after: 3 }));
    out.push(table(['When', 'Tag', 'Check', 'What was seen'], (s.facts.tags ?? []).filter(t => !t.struck).sort((a, b) => b.at - a.at).slice(0, 40).map(t => [when(t.at, f.now), t.colour === 'red' ? 'Red' : 'White', byId.get(t.checkId)?.name ?? '', t.what]), [0.16, 0.1, 0.3, 0.44]));
  }

  out.push(leanHead('Failures and what each held'));
  if (!f.failures.length) out.push(text({ text: `Nothing has failed${f.clean ? '' : ' yet'}.${f.clean ? ` ${f.clean.n} pass-or-fail checks and none failed: at most ${(f.clean.bound * 100).toFixed(1)}% of checks could fail, 95% sure.` : ''}`, size: 9, colour: INK2, after: 4 }));
  for (const r of f.failures) out.push(text({ text: `${failureLine(r, f.now)}${r.problemId ? ' A problem was raised on the register.' : ''}`, size: 8.5, style: 'bold', colour: DANGER, after: 3, bullet: '•', indent: 10 }));

  const recent = [...(s.facts.results ?? [])].filter(r => !r.struck).sort((a, b) => b.at - a.at).slice(0, 40);
  if (recent.length) {
    out.push(leanHead(`Every result — the latest ${recent.length}`));
    out.push(table(['When', 'Check', 'Result', 'By · note'], recent.map(r => { const c = byId.get(r.checkId); return [when(r.at, f.now), c?.name ?? 'A check taken off', resultWords(c, r, def), [r.by, r.note].filter(Boolean).join(' · ')]; }), [0.17, 0.33, 0.25, 0.25], idx => { const c = byId.get(recent[idx].checkId); return !!c && verdictOf(c, recent[idx], def) === 'bad'; }));
  }

  out.push(leanHead('What this list rests on'));
  out.push(text({ text: def.standard.rests, size: 8.5, colour: INK2, after: 3 }));
  out.push(label('To confirm'));
  for (const c of def.standard.confirm) out.push(text({ text: c, size: 8.5, colour: INK2, after: 2, bullet: '•', indent: 10 }));
  out.push(label('What this log does not do'));
  for (const c of def.limits) out.push(text({ text: c, size: 8.5, colour: INK2, after: 2, bullet: '•', indent: 10 }));
  return out;
}

/** The whole page of one log. */
export function logPaperBlocks(i: LogPaperInput, printed: string, d: Density): Block[] {
  const { s, def, f } = i;
  const said = logSays(f, s, def);
  const out: Block[] = [leanBand(bandPage(def.title.toUpperCase(), s, said.verdict, said.tone, [['Line', i.lineName ?? 'No line'], ['Read over', 'the last 7 days']]), printed)];
  out.push(text({ text: i.where, size: 8, colour: MUTED, after: gap(d, 's') }));
  out.push(leanTiles(logTiles(f, def)));
  out.push(leanHead('What it says'));
  out.push(text({ text: said.text, size: 9, colour: said.tone === 'r' ? DANGER : INK2, after: gap(d, 's') }));
  out.push(...logBodyBlocks(i));
  out.push(leanHead('Action plan'));
  out.push(...leanActions(logActions(f, s, i.snags), 'No problem has been raised from this log.'));
  out.push(leanClosing(logClosing(f, s)));
  return out;
}

/** What the log's paper reads — made from the study, the line's cost model and the register. */
export function paperInput(s: ToolStudy, def: LogDef, ctx: LogCtx, snags: readonly Snag[], where: string, lineName?: string, now = Date.now()): LogPaperInput | undefined {
  const f = logFigures({ s, def, now, ctx, snags });
  return f ? { s, def, f, snags, where, ...(lineName ? { lineName } : {}) } : undefined;
}

export { boxed, MIN };
