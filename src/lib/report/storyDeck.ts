/* THE STORY AS SLIDES — a chapter as a 16:9 deck the consultant can open in PowerPoint and present (8 November, docs/STORY.md §4, S4).
 * The same snapshot as the report (lib/report/storyPaper) — never a second reading: the cover with the client and who prepared it;
 * the headline and the four figures; this update's words; where the money is (a bar a finding); what we have found; what is being
 * done; what is proved; next. The consultant's brand on every slide's foot. pptxgenjs, loaded only when a deck is asked for. */
import type { AgreedStory, StoryChapter } from '../study';
import { readBrand, preparedBy, type Brand } from '../brand';
import { fmtGBP } from '../cost';
import { dayWord, dayWordYear, storySentence, storyTiles } from '../clientStory';

const INK = '0F172A', INK2 = '475569', MUTED = '64748B', LINE = 'E6EAF0', BRAND = '2563EB', RED = 'C4281C', GREEN = '15803D', AMBER = 'B45309', WASH = 'F4F6F9';
const W = 10, H = 5.625, M = 0.5;

export interface StoryDeckInputs { story: AgreedStory; chapters: readonly StoryChapter[]; chapter: StoryChapter; brand?: Brand | null }

type Pptx = InstanceType<typeof import('pptxgenjs').default>;
type Slide = ReturnType<Pptx['addSlide']>;

export async function makeStoryDeck(i: StoryDeckInputs): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = (i.brand === undefined ? readBrand() : i.brand)?.name || 'Faultline';
  pptx.company = (i.brand === undefined ? readBrand() : i.brand)?.business || '';
  const b = i.brand === undefined ? readBrand() : i.brand;
  const { story, chapter: c } = i;
  const s = c.snapshot;
  const n = i.chapters.filter(x => x.approvedAt && x.at <= c.at).length || 1;
  const client = story.client || 'The factory';
  pptx.title = `${client} — the story, chapter ${n}`;
  const foot = [b?.name, b?.business].filter(Boolean).join(' · ');
  let count = 0;

  const slide = (title?: string, aside?: string): Slide => {
    const sl = pptx.addSlide();
    count += 1;
    sl.background = { color: 'FFFFFF' };
    if (title) {
      sl.addText(title, { x: M, y: 0.35, w: W - 2 * M - 3, h: 0.5, fontFace: 'Calibri', fontSize: 22, bold: true, color: INK });
      if (aside) sl.addText(aside, { x: W - M - 3, y: 0.4, w: 3, h: 0.4, fontFace: 'Calibri', fontSize: 11, color: MUTED, align: 'right' });
      sl.addShape(pptx.ShapeType.line, { x: M, y: 0.92, w: W - 2 * M, h: 0, line: { color: LINE, width: 0.75 } });
    }
    /* the foot: who prepared it · the chapter · the slide */
    sl.addText(foot || 'Made with Faultline', { x: M, y: H - 0.38, w: 5, h: 0.3, fontFace: 'Calibri', fontSize: 9, color: MUTED });
    sl.addText(`${client} · chapter ${n} · ${count}`, { x: W - M - 4, y: H - 0.38, w: 4, h: 0.3, fontFace: 'Calibri', fontSize: 9, color: MUTED, align: 'right' });
    return sl;
  };

  /* 1 · THE COVER */
  {
    const sl = slide();
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.18, fill: { color: BRAND } });
    if (b?.logo) { try { sl.addImage({ data: b.logo.replace(/^data:/, ''), x: W - M - 1.6, y: 0.5, w: 1.6, h: 0.8, sizing: { type: 'contain', w: 1.6, h: 0.8 } }); } catch { /* a logo the deck could not take is left off */ } }
    sl.addText('THE STORY · CHAPTER ' + n, { x: M, y: 1.0, w: 6, h: 0.35, fontFace: 'Calibri', fontSize: 12, bold: true, color: BRAND, charSpacing: 2 });
    sl.addText(client, { x: M, y: 1.35, w: W - 2 * M - 2, h: 0.9, fontFace: 'Calibri', fontSize: 36, bold: true, color: INK });
    sl.addText(story.brief || ' ', { x: M, y: 2.25, w: W - 2 * M - 1, h: 0.7, fontFace: 'Calibri', fontSize: 16, color: INK2, italic: true });
    sl.addText(c.headline, { x: M, y: 3.0, w: W - 2 * M - 1, h: 0.6, fontFace: 'Calibri', fontSize: 18, bold: true, color: INK });
    sl.addText(`Update of ${dayWordYear(c.at)} · the story since ${dayWordYear(story.startedAt)}`, { x: M, y: 3.65, w: W - 2 * M, h: 0.35, fontFace: 'Calibri', fontSize: 12, color: MUTED });
    const prep = preparedBy(b);
    if (prep) {
      sl.addText(prep, { x: M, y: 4.3, w: 7, h: 0.35, fontFace: 'Calibri', fontSize: 13, bold: true, color: INK });
      const under = [b?.strapline, b?.contact].filter(Boolean).join(' · ');
      if (under) sl.addText(under, { x: M, y: 4.62, w: 8, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: INK2 });
    }
  }

  /* 2 · THE FOUR FIGURES */
  {
    const sl = slide('Where we are', dayWordYear(c.at));
    const tiles = storyTiles(s);
    const tw = (W - 2 * M - 0.3 * 3) / 4;
    tiles.forEach((t, k) => {
      const x = M + k * (tw + 0.3);
      const tone = t.tone === 'r' ? RED : t.tone === 'a' ? AMBER : t.tone === 'g' ? GREEN : INK;
      sl.addShape(pptx.ShapeType.rect, { x, y: 1.2, w: tw, h: 2.2, fill: { color: WASH }, line: { color: LINE, width: 0.5 } });
      sl.addShape(pptx.ShapeType.rect, { x, y: 1.2, w: tw, h: 0.06, fill: { color: tone }, line: { color: tone, width: 0 } });
      sl.addText(t.k.toUpperCase(), { x: x + 0.15, y: 1.35, w: tw - 0.3, h: 0.3, fontFace: 'Calibri', fontSize: 10, bold: true, color: MUTED, charSpacing: 1 });
      sl.addText(t.v, { x: x + 0.15, y: 1.65, w: tw - 0.3, h: 0.8, fontFace: 'Calibri', fontSize: t.v.length > 14 ? 20 : 30, bold: true, color: tone, fit: 'shrink', valign: 'top' });
      sl.addText(t.of ?? '', { x: x + 0.15, y: 2.5, w: tw - 0.3, h: 0.8, fontFace: 'Calibri', fontSize: 11, color: INK2, fit: 'shrink', valign: 'top' });
    });
    sl.addText(storySentence(s), { x: M, y: 3.7, w: W - 2 * M, h: 0.9, fontFace: 'Calibri', fontSize: 14, color: INK, fit: 'shrink' });
  }

  /* 3 · THIS UPDATE — the words, three paragraphs a slide */
  for (let k = 0; k < c.narrative.length; k += 3) {
    const part = c.narrative.slice(k, k + 3);
    const sl = slide(k === 0 ? 'This update' : 'This update (continued)', c.by === 'assistant' ? 'drafted by the assistant, edited by the consultant' : undefined);
    sl.addText(part.map(p => ({ text: p, options: { breakLine: true, paraSpaceAfter: 10 } })), { x: M, y: 1.15, w: W - 2 * M, h: H - 1.15 - 0.6, fontFace: 'Calibri', fontSize: 15, color: INK, valign: 'top', fit: 'shrink' });
  }

  /* 4 · WHERE THE MONEY IS */
  const priced = s.findings.filter(f => f.poundsDay != null).slice(0, 8);
  if (priced.length) {
    const sl = slide('Where the money is', 'a day, from what was timed and counted on the line');
    sl.addChart(pptx.ChartType.bar, [{ name: '£ a day', labels: priced.map(f => f.what.length > 40 ? `${f.what.slice(0, 38)}…` : f.what).reverse(), values: priced.map(f => Math.round(f.poundsDay as number)).reverse() }],
      { x: M, y: 1.1, w: W - 2 * M, h: H - 1.1 - 0.6, barDir: 'bar', chartColors: [BRAND], showValue: true, dataLabelFormatCode: '£#,##0', dataLabelFontSize: 10, catAxisLabelFontSize: 11, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false, dataLabelColor: INK, catAxisLabelColor: INK });
  }

  /* 5 · WHAT WE HAVE FOUND */
  {
    const sl = slide('What we have found', `${s.findings.length} open${s.found.costDay != null ? ` · ${fmtGBP(s.found.costDay)} a day` : ''}`);
    const head = ['What', 'Where', 'A day', 'Who'].map(h => ({ text: h, options: { bold: true, color: MUTED, fontSize: 10, fill: { color: WASH } } }));
    const rows = s.findings.slice(0, 10).map(f => [
      { text: f.what, options: { color: f.late || f.priority === 'critical' ? RED : INK, bold: true } },
      { text: `${f.line}${f.machine ? ` · ${f.machine}` : ''}`, options: { color: INK2 } },
      { text: f.poundsDay != null ? fmtGBP(f.poundsDay) : 'not priced', options: { color: INK, align: 'right' as const } },
      { text: f.owner ?? 'nobody yet', options: { color: f.owner ? INK2 : AMBER } },
    ]);
    if (!rows.length) sl.addText('Nothing open on the register.', { x: M, y: 1.3, w: 6, h: 0.4, fontFace: 'Calibri', fontSize: 14, color: MUTED });
    else sl.addTable([head, ...rows], { x: M, y: 1.1, w: W - 2 * M, colW: [4.2, 2.3, 1.2, 1.3], fontFace: 'Calibri', fontSize: 11, border: { type: 'solid', color: LINE, pt: 0.5 }, autoPage: false, rowH: 0.34 });
    if (s.findings.length > 10) sl.addText(`and ${s.findings.length - 10} more on the register`, { x: M, y: H - 0.75, w: 6, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: MUTED });
  }

  /* 6 · WHAT IS BEING DONE */
  {
    const sl = slide('What is being done', `${s.fixing.open} actions${s.fixing.late ? ` · ${s.fixing.late} late` : ''}`);
    const head = ['Action', 'Who', 'By when'].map(h => ({ text: h, options: { bold: true, color: MUTED, fontSize: 10, fill: { color: WASH } } }));
    const rows = s.actions.slice(0, 10).map(a => [
      { text: a.what, options: { color: INK } },
      { text: a.who || 'nobody yet', options: { color: a.who ? INK2 : AMBER } },
      { text: a.due ? `${dayWord(Date.parse(a.due))}${a.late ? ' · late' : ''}` : 'no day agreed', options: { color: a.late ? RED : INK2, bold: a.late } },
    ]);
    if (!rows.length) sl.addText('Nothing owed yet.', { x: M, y: 1.3, w: 6, h: 0.4, fontFace: 'Calibri', fontSize: 14, color: MUTED });
    else sl.addTable([head, ...rows], { x: M, y: 1.1, w: W - 2 * M, colW: [5.2, 2, 1.8], fontFace: 'Calibri', fontSize: 11, border: { type: 'solid', color: LINE, pt: 0.5 }, autoPage: false, rowH: 0.34 });
  }

  /* 7 · WHAT IS PROVED */
  {
    const sl = slide('What is proved', 'before → after, the same number counted again');
    if (!s.provedFixes.length) sl.addText('No fix proved yet — a fix is proved when the same number is counted again and has moved the right way.', { x: M, y: 1.3, w: W - 2 * M, h: 0.8, fontFace: 'Calibri', fontSize: 14, color: MUTED });
    else sl.addText(s.provedFixes.slice(0, 8).map(p => ({ text: `${p.what} — ${p.line}, ${p.machine}: ${p.proof}`, options: { bullet: { code: '25A0' }, color: GREEN, breakLine: true, paraSpaceAfter: 8 } })), { x: M, y: 1.2, w: W - 2 * M, h: H - 1.2 - 0.6, fontFace: 'Calibri', fontSize: 14, valign: 'top', fit: 'shrink' });
  }

  /* 8 · NEXT */
  {
    const sl = slide('Next');
    const late = s.actions.filter(a => a.late), next = (late.length ? late : s.actions).slice(0, 4);
    const items = next.length ? next.map(a => ({ text: `${a.what} — ${a.who || 'nobody yet'}${a.due ? `, ${a.late ? 'was due' : 'due'} ${dayWord(Date.parse(a.due))}` : ''}`, options: { bullet: true, color: a.late ? RED : INK, breakLine: true, paraSpaceAfter: 8 } })) : [{ text: 'Nothing owed — the next update says what the lines show.', options: { color: MUTED } }];
    sl.addText(items, { x: M, y: 1.2, w: W - 2 * M, h: 2.6, fontFace: 'Calibri', fontSize: 15, valign: 'top', fit: 'shrink' });
    sl.addShape(pptx.ShapeType.rect, { x: M, y: 4.0, w: W - 2 * M, h: 0.7, fill: { color: WASH }, line: { color: BRAND, width: 0.75 } });
    sl.addText(storySentence(s), { x: M + 0.15, y: 4.05, w: W - 2 * M - 0.3, h: 0.6, fontFace: 'Calibri', fontSize: 12, bold: true, color: INK, fit: 'shrink' });
  }

  const out = await pptx.write({ outputType: 'blob' });
  return out instanceof Blob ? out : new Blob([out as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}
