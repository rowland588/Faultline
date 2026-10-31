import type { ScoredRow, ToolStudy } from '../study';
import { font, lead, rows, SIZE, text, wrap, type Row } from './blocks';
import { INK2, LINE, MUTED } from '../reportKit';
import { leanHead } from './lean';
import type { Block, Frame } from './flow';
import { studyScored } from '../../tools/scored/scored';
import type { ScoredDef, ScoredField, ScoredRanked, ScoredTable } from '../../tools/scored/types';

/** The matrix: cells wrap inside their columns, a row as tall as its longest cell, the foot (counts, score, rank) in bold. */
function matrixTable(t: ScoredTable): Block {
  const LH = 9.5;
  const cells = (f: Frame, row: string[], bold: boolean) => row.map((c, i) => wrap(f.doc, c, f.w * t.shares[i] - 6, 8, bold ? 'bold' : 'normal'));
  const make = (row: string[], bold: boolean, rule: boolean): Row => ({
    h: f => Math.max(...cells(f, row, bold).map(l => l.length), 1) * LH + 5,
    draw: (fr, y) => {
      let x = fr.x;
      cells(fr, row, bold).forEach((ls, i) => {
        font(fr.doc, 8, bold ? 'bold' : 'normal', bold && rule ? MUTED : INK2);
        ls.forEach((l, k) => fr.doc.text(l, x, y + 8 + k * LH));
        x += fr.w * t.shares[i];
      });
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4);
      const h = Math.max(...cells(fr, row, bold).map(l => l.length), 1) * LH + 3;
      fr.doc.line(fr.x, y + h, fr.x + fr.w, y + h);
    },
  });
  return rows({ header: make(t.head, true, true), rows: [...t.rows.map(r => make(r, false, false)), ...t.foot.map(r => make(r, true, false))], after: 'm' });
}

export function scoredPaperBlocks(s: ToolStudy): Block[] {
  const x = studyScored(s);
  if (!x?.result) return [text({ text: 'Nothing scored yet.' })];
  const r = x.result;
  if (x.def.matrix && x.table) {
    /* the band, the tiles, "What it says" and the closing line are the study page's own (studiesPdf); this is the matrix between them */
    return [
      leanHead('The matrix — each option against the datum', '+ better · S same · − worse than the datum'),
      matrixTable(x.table),
      ...(r.also ? [leanHead(r.also.title), ...r.also.lines.map(l => text({ text: `· ${l}`, size: 9 }))] : []),
      leanHead('What this does not say'),
      ...[...r.caveats, ...x.def.limits].map(c => text({ text: `· ${c}`, size: 9 })),
    ];
  }
  const ranked = x.ranked && 'ok' in x.ranked ? x.ranked.ok : [];
  const tableRows: Row[] = x.def.fields && x.def.paperInputs ? inputTable(x.def.noun ?? 'machine', x.def.fields, x.def.columns ?? [], ranked, x.rows) : machineTable(ranked);
  return [
    leanHead(r.verdict, x.def.paperInputs ? undefined : r.sentence.slice(0, 80)),
    ...r.tiles.map(t => text({ text: `${t.k}: ${t.v} — ${t.of ?? ''}` })),
    text({ text: r.sentence }),
    ...(r.money ?? []).map(m => text({ text: m })),
    ...(x.left?.length ? [text({ text: `Left out of the order: ${x.left.join(' ')}` })] : []),
    ...(x.def.paperInputs && x.def.help ? [text({ text: x.def.help, size: SIZE.small, colour: MUTED })] : []),
    rows({ rows: tableRows }),
    text({ text: 'What this does not say' }),
    ...r.caveats.map(c => text({ text: `· ${c}` })),
    text({ text: r.closing }),
  ];
}

/** The criticality paper's table — machine, score, class (unchanged). */
function machineTable(ranked: ScoredRanked[]): Row[] {
  const tableRows: Row[] = [{
    h: () => 14,
    draw: (fr, y) => {
      fr.doc.setFont('helvetica', 'bold');
      fr.doc.text('Machine', fr.x, y + 10);
      fr.doc.text('Score', fr.x + fr.w * 0.55, y + 10);
      fr.doc.text('Class', fr.x + fr.w * 0.75, y + 10);
    },
  }];
  for (const row of ranked) {
    tableRows.push({
      h: () => 12,
      draw: (fr, y) => {
        fr.doc.setFont('helvetica', 'normal');
        fr.doc.text(row.name, fr.x, y + 9);
        fr.doc.text(String(row.score), fr.x + fr.w * 0.55, y + 9);
        fr.doc.text(row.class, fr.x + fr.w * 0.75, y + 9);
      },
    });
  }
  return tableRows;
}

/** A table with every box the register asked and every column it works out — a cell wraps, a row grows (FC-144). */
function inputTable(noun: string, fields: NonNullable<ScoredDef['fields']>, cols: NonNullable<ScoredDef['columns']>, ranked: ScoredRanked[], inputs: ScoredRow[]): Row[] {
  const cell = (r: ScoredRanked, f: ScoredField): string => {
    const row = inputs.find(i => i.id === r.id);
    const v = row?.[f.id];
    return v === undefined || v === false ? '—' : v === true ? 'yes' : f.kind === 'money' ? `£${v.toLocaleString('en-GB')}` : String(v);
  };
  const heads = ['#', noun[0].toUpperCase() + noun.slice(1), ...fields.map(f => f.label), ...cols.map(c => c.label)];
  const body = ranked.map(r => [String(r.score), r.name, ...fields.map(f => cell(r, f)), ...cols.map(c => c.of(r))]);
  /* the name takes 24%; the other columns share the rest by what their words need */
  const weight = heads.map((h, i) => (i === 1 ? 0 : Math.min(20, Math.max(h.length + 5, ...body.map(b => b[i].length + 1), 8))));
  const others = weight.reduce((s, w) => s + w, 0);
  const share = (i: number) => (i === 1 ? 0.24 : (0.76 * weight[i]) / others);
  const edges = (w: number) => { let at = 0; return heads.map((_, i) => { const x0 = at; at += w * share(i); return [x0, w * share(i)] as const; }); };
  const rowOf = (cells: string[], bold: boolean): Row => ({
    h: f => Math.max(...cells.map((c, i) => wrap(f.doc, c, edges(f.w)[i][1] - 4, SIZE.small, bold ? 'bold' : 'normal').length)) * lead(SIZE.small, f.density) + 3,
    draw: (f, y) => {
      const e = edges(f.w);
      cells.forEach((c, i) => {
        font(f.doc, SIZE.small, bold ? 'bold' : 'normal');
        wrap(f.doc, c, e[i][1] - 4, SIZE.small, bold ? 'bold' : 'normal').forEach((ln, k) => f.doc.text(ln, f.x + e[i][0], y + SIZE.small * 0.92 + 1 + k * lead(SIZE.small, f.density)));
      });
    },
  });
  return [rowOf(heads, true), ...body.map(b => rowOf(b, false))];
}
