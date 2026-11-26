/* A CONVERSATION'S REPORT AS A FILE (docs/CONVERSATIONAL-DATA.md) — the same sections, poured as every Faultline paper is poured
 * (lib/report/flow: blocks that measure themselves), or laid out as 16:9 slides (pptxgenjs, as the Story's deck). Each chart is the
 * conversation's own drawing (lib/data/chartSvg) made a picture; each table is the result's own groups; each finding carries its kind in
 * words and the figures it rests on; a figure no result holds is printed with CHECK THIS beside it; a recommendation is printed as one.
 * The last page — or slide — says what every figure rests on: the source, the question, how many rows, worked by Faultline's code.
 * Browser only (it draws pictures). */
import { comparisonTable, guideFigure, guideSectionFigure, type GuideFigure } from './guideFigures';
import { stationSvg } from './presentationMedia';
import { chartSvg, svgToPng } from './chartSvg';
import { chartNow, evidenceSaid, processSteps, seriesOf, SECTION_WORD, type Chart, type ConvReport, type DataResult, type ReportSection } from './outputs';
import { INK, INK2, LINE, MUTED, WARN, BRAND } from '../reportKit';

export interface ReportInputs { report: ConvReport; results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; by?: string; printed: string }

const fmt = (v: number | string | null) => (v === null ? 'not recorded' : typeof v === 'number' ? (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-GB') : String(Math.round(v * 100) / 100)) : v);

/** Every chart the report shows, drawn once as a picture. */
async function pictures(i: ReportInputs): Promise<Map<string, { dataUrl: string; width?: number; height?: number; why?: string }>> {
  const out = new Map<string, { dataUrl: string; width?: number; height?: number; why?: string }>();
  for (const s of i.report.sections) {
    if (s.kind !== 'chart' || !s.chartId || out.has(s.chartId)) continue;
    const c = i.charts.get(s.chartId);
    if (!c) { out.set(s.chartId, { dataUrl: '', why: 'The chart is not in the conversation any more.' }); continue; }
    const spec = chartNow(c);
    const ser = seriesOf(spec, i.results);
    if ('why' in ser) { out.set(s.chartId, { dataUrl: '', why: ser.why }); continue; }
    const png = await svgToPng(chartSvg(spec, ser, { mainLabel: i.results.get(spec.resultId)?.title, compareLabel: spec.compareLabel ?? (spec.compareResultId ? i.results.get(spec.compareResultId)?.title : undefined) }));
    out.set(s.chartId, { dataUrl: png.dataUrl, width: png.width, height: png.height });
  }
  return out;
}

const chartNotes = (s: ReportSection, i: ReportInputs): string[] => {
  const c = s.chartId ? i.charts.get(s.chartId) : undefined;
  if (!c) return [];
  const ser = seriesOf(chartNow(c), i.results);
  return 'why' in ser ? [] : ser.notes;
};
/** A section's kind above its heading — only where it tells the reader what weight to give it: plain words and a picture need no label. */
const kindSaid = (s: ReportSection): string | undefined => (s.kind === 'text' || s.kind === 'chart' ? undefined : SECTION_WORD[s.kind].toUpperCase());
const usedResults = (i: ReportInputs): DataResult[] => [...new Set(i.report.sections.flatMap(s => s.evidence ?? []))].map(id => i.results.get(id)).filter((r): r is DataResult => !!r);

/** Share each station illustration across repeated steps in a single export. */
async function stationPictures(report: ConvReport) {
  const art = new Set(report.sections.filter(s => s.kind === 'process').flatMap(s => processSteps(s.text).map(stationSvg)));
  return new Map(await Promise.all([...art].map(async svg => [svg, (await svgToPng(svg)).dataUrl] as const)));
}

/* ------------------------------------------------------------------ the paper */
export async function reportPdf(i: ReportInputs): Promise<Blob> {
  const [{ jsPDF }, flow, blocks, lean, { bandPage }, kit] = await Promise.all([
    import('jspdf'), import('../report/flow'), import('../report/blocks'), import('../report/lean'), import('../lean'), import('../reportKit'),
  ]);
  const { SIZE, box, heading, rows, text, wrap, font } = blocks;
  const [pics, stations] = await Promise.all([pictures(i), stationPictures(i.report)]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const PW = 595.28, PH = 841.89, M = 42, CW = PW - 2 * M;
  const out: import('../report/flow').Block[] = [];
  out.push(lean.leanBand(bandPage('REPORT · WITH LUNA', { name: i.report.title }, undefined, undefined, [['Made', i.printed], ...(i.by ? [['By', i.by] as [string, string]] : []), ['Sections', String(i.report.sections.length)]]), i.printed));
  if (i.report.sourceNote) out.push(text({text:i.report.sourceNote,size:SIZE.small,colour:MUTED,after:8}));
  const addGuideFigure = (guide: GuideFigure) => {
    out.push(heading(guide.title, guide.kind === 'bench' ? 'ILLUSTRATED EXAMPLE' : undefined, { size: 14 }));
    const column = (width: number) => (width - (guide.panels.length - 1) * 10) / guide.panels.length;
    const photoHeight = (width: number) => guide.kind === 'bench' ? column(width) * 467 / 608 : 0;
    out.push(box(f => {
      const width = column(f.w) - 12;
      return photoHeight(f.w) + 26 + Math.max(...guide.panels.map(p => wrap(f.doc,p.label,width,10,'bold').length * 13 + wrap(f.doc,p.detail,width,9).length * 12));
    }, (f, y) => {
      const width = column(f.w);
      guide.panels.forEach((p, index) => {
        const x = f.x + index * (width + 10), top = y + photoHeight(f.w);
        if (p.photo) f.doc.addImage(p.photo.data, 'JPEG', x, y, width, photoHeight(f.w));
        f.doc.setFillColor(guide.kind === 'changeover' && index === 1 ? '#AD762B' : '#328476');
        f.doc.rect(x, top, width, 3, 'F');
        font(f.doc, 10, 'bold', INK);
        const label = wrap(f.doc, p.label, width - 12, 10, 'bold');
        f.doc.text(label, x + 3, top + 17);
        font(f.doc, 9, 'normal', INK2);
        f.doc.text(wrap(f.doc,p.detail,width - 12,9), x + 3, top + 19 + label.length * 13);
      });
    }));
    if (guide.takeaway) out.push(text({ text:guide.takeaway, size:SIZE.small, after:9 }));
  };
  const guide = guideFigure(i.report);
  if (guide) addGuideFigure(guide);
  else if (i.report.sections.some(s => s.kind === 'finding' || s.evidence?.length || s.chartId || s.resultId)) out.push(text({ text: 'Every figure here was worked out by Faultline’s code from the source named at the end. A FINDING rests on those figures; a RECOMMENDATION is a view, to be weighed; CHECK THIS marks a figure written that none of its results holds.', size: SIZE.small, colour: MUTED, after: 10 }));
  for (const s of i.report.sections) {
    out.push(heading(s.heading || SECTION_WORD[s.kind], kindSaid(s), { size: 12.5 }));
    const inset = guideSectionFigure(i.report,s);
    if (inset) addGuideFigure(inset);
    const comparison = s.kind === 'text' && comparisonTable(s.text);
    if (comparison) {
      const width = CW / comparison.headings.length;
      const row = (cells: string[], header: boolean) => ({
        h: (f: import('../report/flow').Frame) => 11 + Math.max(...cells.map(c => wrap(f.doc,c,width-12,9,header?'bold':'normal').length))*12,
        draw: (f: import('../report/flow').Frame, y: number) => cells.forEach((c, index) => {
          font(f.doc,9,header?'bold':'normal',header?BRAND:INK);
          f.doc.text(wrap(f.doc,c,width-12,9,header?'bold':'normal'), f.x+index*width+3,y+11);
        }),
      });
      out.push(rows({ header:row(comparison.headings,true), rows:comparison.rows.map(r=>row(r,false)), after:'s' }));
    } else if (s.kind === 'process') {
      for (const [index, step] of processSteps(s.text).entries()) {
        const image = stations.get(stationSvg(step));
        out.push(box(f => Math.max(32, wrap(f.doc, step, f.w - 52, 11).length * 14 + 12), (f, y) => {
          if (image) f.doc.addImage(image, 'PNG', f.x, y, 28, 27);
          font(f.doc, 9, 'bold', MUTED);
          f.doc.text(String(index + 1), f.x + 31, y + 16);
          font(f.doc, 11, 'normal', INK);
          f.doc.text(wrap(f.doc, step, f.w - 52, 11), f.x + 49, y + 16);
        }));
      }
    } else if (s.text) for (const para of s.text.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean)) out.push(text({ text: para, size: SIZE.body, after: 7, colour: s.kind === 'recommendation' ? INK2 : INK }));
    if (s.unbacked?.length) out.push(text({ text: `CHECK THIS — ${s.unbacked.join(', ')}: not in the results this rests on.`, size: SIZE.small, colour: WARN, style: 'bold', after: 7 }));
    if (s.kind === 'recommendation') out.push(text({ text: `A recommendation — ${s.by === 'person' ? 'the person’s' : 'Luna’s'} view, not a finding.`, size: SIZE.small, colour: MUTED, after: 7 }));
    if (s.kind === 'chart' && s.chartId) {
      const p = pics.get(s.chartId);
      if (p?.dataUrl) {
        const fit = (width: number) => { const ratio = (p.height ?? 400) / (p.width ?? 720); const h = Math.min(350, width * ratio); return { w: h / ratio, h }; };
        out.push(box(f => fit(f.w).h + 8, (f, y) => { const image = fit(f.w); const x = f.x + (f.w - image.w) / 2; try { f.doc.addImage(p.dataUrl, 'PNG', x, y, image.w, image.h); } catch { /* the values below still print */ } f.doc.setDrawColor(LINE); f.doc.rect(x, y, image.w, image.h); }));
      } else out.push(text({ text: p?.why ?? 'The chart could not be drawn.', size: SIZE.small, colour: WARN, after: 7 }));
      for (const n of chartNotes(s, i)) out.push(text({ text: n, size: SIZE.small, colour: MUTED, after: 3 }));
      const chart = i.charts.get(s.chartId);
      const series = chart ? seriesOf(chartNow(chart), i.results) : undefined;
      if (series && !('why' in series)) {
        out.push(heading('All plotted values', 'CHART DATA', { size: 10 }));
        for (let j = 0; j < series.labels.length; j++) {
          const value = (v: number | null) => v === null ? 'not recorded' : `${v.toLocaleString('en-GB', { maximumFractionDigits: 20 })}${series.unit === '%' ? '%' : series.unit ? ` ${series.unit}` : ''}`;
          out.push(text({ text: `${series.labels[j]} — ${value(series.values[j])}${series.compare ? `; comparison ${value(series.compare[j])}` : ''}`, size: SIZE.small, colour: INK2, after: 2 }));
        }
      }
    }
    if (s.kind === 'table' && s.resultId) {
      const r = i.results.get(s.resultId);
      if (r) {
        const cols = [...(r.result.groupBy.length ? r.result.groupBy : ['']), ...r.result.measures];
        const lines = r.result.groups.slice(0, 40).map(g => [...(g.key.length ? g.key : ['All']), ...g.values.map(fmt)]);
        const wcol = CW / cols.length;
        const row = (cells: string[], bold: boolean) => ({
          h: () => 16,
          draw: (f: import('../report/flow').Frame, y: number) => {
            cells.forEach((c, k) => { font(f.doc, 8.5, bold ? 'bold' : 'normal', bold ? INK : INK2); f.doc.text(wrap(f.doc, c, wcol - 6, 8.5)[0] ?? '', f.x + k * wcol, y + 11); });
            f.doc.setDrawColor(LINE); f.doc.line(f.x, y + 15, f.x + f.w, y + 15);
          },
        });
        out.push(rows({ header: row(cols, true), rows: lines.map(l => row(l.map(String), false)), after: 's' }));
        out.push(text({ text: `Totals: ${r.result.totals.map(fmt).join(', ')}${r.result.groups.length > 40 ? ` · the first 40 of ${r.result.groups.length} groups` : ''}.`, size: SIZE.small, colour: MUTED, after: 7 }));
      }
    }
  }
  const used = usedResults(i);
  if (used.length) {
    out.push(heading('What the figures rest on', 'SOURCES AND METHOD', { size: 12.5 }));
    for (const r of used) {
      out.push(text({ text: `${r.title} — ${evidenceSaid(r)}`, size: SIZE.small, colour: INK2, after: 4 }));
      for (const n of r.result.notes) out.push(text({ text: `· ${n}`, size: SIZE.small, colour: MUTED, after: 2 }));
    }
  }
  const base = { doc, x: M, w: CW, top: M, bottom: PH - M - 20 };
  const density = await flow.chooseDensity(base, () => out);
  await flow.pour({ ...base, density, dry: false }, out, () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); font(doc, 7.5, 'normal', MUTED); doc.text(`${i.report.title} — made with Luna in Faultline · printed ${i.printed} · page ${p} of ${pages}`, M, PH - 18); }
  kit.stampBrand(doc);
  return doc.output('blob') as Blob;
}

/* ------------------------------------------------------------------ the slides */
const HEX = (c: string) => c.replace('#', '').toUpperCase();
export async function reportDeck(i: ReportInputs): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const [pics, stations] = await Promise.all([pictures(i), stationPictures(i.report)]);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = i.report.title;
  const W = 10, H = 5.625, M = 0.5;
  let n = 0;
  const slide = (title?: string, tag?: string) => {
    const sl = pptx.addSlide(); n++;
    sl.background = { color: 'FFFFFF' };
    if (title) {
      if (tag) sl.addText(tag, { x: M, y: 0.22, w: 6, h: 0.3, fontFace: 'Calibri', fontSize: 10, bold: true, color: HEX(BRAND), charSpacing: 2 });
      sl.addText(title, { x: M, y: 0.48, w: W - 2 * M, h: 0.5, fontFace: 'Calibri', fontSize: 22, bold: true, color: HEX(INK), fit: 'shrink' });
      sl.addShape(pptx.ShapeType.line, { x: M, y: 1.02, w: W - 2 * M, h: 0, line: { color: HEX(LINE), width: 0.75 } });
    }
    sl.addText(`${i.report.title} · ${n}`, { x: W - M - 5, y: H - 0.38, w: 5, h: 0.3, fontFace: 'Calibri', fontSize: 9, color: HEX(MUTED), align: 'right' });
    sl.addText('Made with Luna in Faultline', { x: M, y: H - 0.38, w: 4, h: 0.3, fontFace: 'Calibri', fontSize: 9, color: HEX(MUTED) });
    return sl;
  };
  { const sl = slide(); sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.18, fill: { color: HEX(BRAND) } }); sl.addText(i.report.title, { x: M, y: 1.6, w: W - 2 * M, h: 1.2, fontFace: 'Calibri', fontSize: 34, bold: true, color: HEX(INK), fit: 'shrink' }); sl.addText([i.printed, i.by, i.report.sourceNote].filter(Boolean).join(' · '), { x: M, y: 2.9, w: W - 2 * M, h: 0.4, fontFace: 'Calibri', fontSize: 14, color: HEX(INK2) }); }
  const addGuideFigure = (guide: GuideFigure) => {
    const visual = slide(guide.title, guide.kind === 'bench' ? 'ILLUSTRATED EXAMPLE' : undefined);
    const width = (W - 2*M - (guide.panels.length-1)*.15) / guide.panels.length;
    guide.panels.forEach((p,index) => {
      const x = M + index*(width+.15);
      const height = p.photo ? 2.45 : 0;
      if (p.photo) {
        const imageWidth = height*608/467;
        visual.addImage({data:p.photo.data, altText:p.photo.alt, x:x+(width-imageWidth)/2, y:1.12, w:imageWidth, h:height});
      }
      const y = 1.17 + height;
      visual.addShape(pptx.ShapeType.rect,{x,y,w:width,h:.05,line:{type:'none'},fill:{color:guide.kind==='changeover'&&index===1?'AD762B':'328476'}});
      visual.addText(p.label,{x,y:y+.08,w:width,h:.45,bold:true,fontSize:16,fit:'shrink',color:HEX(INK)});
      visual.addText(p.detail,{x,y:y+.54,w:width,h:p.photo ? .62 : 2.3,fontSize:p.photo?12:15,fit:'shrink',valign:'top',color:HEX(INK2)});
    });
    if (guide.takeaway) visual.addText(guide.takeaway,{x:M,y:4.85,w:W-2*M,h:.32,fontSize:10,fit:'shrink',color:HEX(MUTED)});
  }
  const lead = guideFigure(i.report);
  if (lead) addGuideFigure(lead);
  for (const s of i.report.sections) {
    const inset = guideSectionFigure(i.report,s);
    if (inset) addGuideFigure(inset);
    const sl = slide(s.heading || SECTION_WORD[s.kind], kindSaid(s));
    let y = 1.2;
    const comparison = s.kind === 'text' && comparisonTable(s.text);
    if (comparison) {
      sl.addTable([comparison.headings.map(cell => ({text:cell,options:{bold:true,color:HEX(BRAND)}})), ...comparison.rows.map(row => row.map(text => ({text})))],
        {x:M,y,w:W-2*M,fontSize:13,fontFace:'Calibri',color:HEX(INK),border:{type:'solid',pt:.5,color:HEX(LINE)},autoPage:true,autoPageRepeatHeader:true,autoPageSlideStartY:1.2});
      continue;
    }
    if (s.kind === 'process') {
      const steps = processSteps(s.text);
      let card = sl;
      for (const [index, step] of steps.entries()) {
        if (index > 0 && index % 4 === 0) card = slide(s.heading, 'PROCESS · CONTINUED');
        const row = index % 4;
        const image = stations.get(stationSvg(step));
        if (image) card.addImage({ data: image, x: M, y: 1.22 + row * .82, w: .68, h: .65 });
        card.addText(`${index + 1}.  ${step}`, { x: M + .9, y: 1.22 + row * .82, w: W - 2 * M - .9, h: .65, fontFace: 'Calibri', fontSize: 19, fit: 'shrink', color: HEX(INK) });
      }
      if (s.unbacked?.length) card.addText(`Check this: ${s.unbacked.join(', ')}`, { x: M, y: 4.63, w: W - 2 * M, h: .4, fontSize: 11, color: HEX(WARN) });
      continue;
    }
    if (s.kind === 'chart' && s.chartId) {
      const p = pics.get(s.chartId);
      if (p?.dataUrl) { const ratio = (p.height ?? 400) / (p.width ?? 720); const h = Math.min(3.4, (W - 2 * M) * ratio), w = h / ratio; sl.addImage({ data: p.dataUrl, x: (W - w) / 2, y, w, h }); y += h + 0.1; }
      else sl.addText(p?.why ?? 'The chart could not be drawn.', { x: M, y, w: W - 2 * M, h: 0.4, fontFace: 'Calibri', fontSize: 12, color: HEX(WARN) });
      const notes = chartNotes(s, i).slice(0, 2).join(' ');
      if (notes) sl.addText(notes, { x: M, y: Math.min(y, H - 0.9), w: W - 2 * M, h: 0.4, fontFace: 'Calibri', fontSize: 9, color: HEX(MUTED), fit: 'shrink' });
      const chart = i.charts.get(s.chartId);
      const series = chart ? seriesOf(chartNow(chart), i.results) : undefined;
      if (series && !('why' in series)) {
        const value = (v: number | null) => v === null ? 'not recorded' : `${v.toLocaleString('en-GB', { maximumFractionDigits: 20 })}${series.unit === '%' ? '%' : series.unit ? ` ${series.unit}` : ''}`;
        for (let start = 0; start < series.labels.length; start += 10) {
          const page = slide(`${s.heading || 'Chart'} — values ${start + 1}–${Math.min(start + 10, series.labels.length)}`, 'CHART DATA');
          const header = ['Category', 'Value', ...(series.compare ? ['Comparison'] : [])];
          const rows = series.labels.slice(start, start + 10).map((label, offset) => {
            const j = start + offset;
            return [label, value(series.values[j]), ...(series.compare ? [value(series.compare[j])] : [])];
          });
          page.addTable([header, ...rows].map(row => row.map(cell => ({ text: cell }))), { x: M, y: 1.2, w: W - 2 * M, fontFace: 'Calibri', fontSize: 11, color: HEX(INK2), border: { type: 'solid', pt: 0.5, color: HEX(LINE) }, autoPage: false });
        }
      }
      continue;
    }
    if (s.kind === 'table' && s.resultId) {
      const r = i.results.get(s.resultId);
      if (r) {
        const head = [...(r.result.groupBy.length ? r.result.groupBy : ['']), ...r.result.measures].map(t => ({ text: t, options: { bold: true, color: HEX(INK) } }));
        const body = r.result.groups.slice(0, 12).map(g => [...(g.key.length ? g.key : ['All']), ...g.values.map(fmt)].map(t => ({ text: String(t) })));
        sl.addTable([head, ...body], { x: M, y, w: W - 2 * M, fontFace: 'Calibri', fontSize: 11, color: HEX(INK2), border: { type: 'solid', pt: 0.5, color: HEX(LINE) }, autoPage: false });
      }
      continue;
    }
    const tail = [s.unbacked?.length ? `CHECK THIS — ${s.unbacked.join(', ')}: not in the results this rests on.` : '', s.kind === 'recommendation' ? `A recommendation — ${s.by === 'person' ? 'the person’s' : 'Luna’s'} view, not a finding.` : ''].filter(Boolean).join('  ');
    sl.addText(s.text ?? '', { x: M, y, w: W - 2 * M, h: 3.4, fontFace: 'Calibri', fontSize: 16, color: HEX(INK), valign: 'top', fit: 'shrink' });
    if (tail) sl.addText(tail, { x: M, y: 4.65, w: W - 2 * M, h: 0.4, fontFace: 'Calibri', fontSize: 10, color: HEX(s.unbacked?.length ? WARN : MUTED), fit: 'shrink' });
  }
  const used = usedResults(i);
  if (used.length) {
    const sl = slide('What the figures rest on', 'SOURCES AND METHOD');
    sl.addText(used.map(r => `${r.title} — ${evidenceSaid(r)}`).join('\n\n'), { x: M, y: 1.2, w: W - 2 * M, h: 3.6, fontFace: 'Calibri', fontSize: 11, color: HEX(INK2), valign: 'top', fit: 'shrink' });
  }
  return await pptx.write({ outputType: 'blob' }) as Blob;
}
