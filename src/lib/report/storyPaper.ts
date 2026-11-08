/* THE STORY REPORT — a chapter on paper (8 November, docs/STORY.md §4). The cover: the client, who prepared it (lib/report/cover), the
 * brief, the four figures; this chapter: the headline, the narrative, every finding with its sentence and money, what is being done
 * and by whom, what is proved; the chapters before in a line each; what the figures rest on. Every figure is the chapter's snapshot —
 * the Factory page's readers frozen the day the update was run — never a second reading. A4, the lean page's blocks. */
import type { jsPDF } from 'jspdf';
import type { StoryChapter, AgreedStory, StoryAction } from '../study';
import { chooseDensity, pour, type Block, type Frame } from './flow';
import { font, rows, text, wrap } from './blocks';
import { leanActions, leanBand, leanClosing, leanHead, leanInsights, leanTiles } from './lean';
import { bandPage, type LeanAction } from '../lean';
import { preparedByBlocks } from './cover';
import { BRAND, INK, INK2, LINE, MUTED } from '../reportKit';
import { fmtGBP } from '../cost';
import { dayWord, dayWordYear, storySentence, storyTiles, unsureIn } from '../clientStory';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface StoryPaperInputs { story: AgreedStory; chapters: readonly StoryChapter[]; chapter: StoryChapter; printed: string }

const actionRow = (a: StoryAction): LeanAction => ({ what: a.what, ...(a.who ? { who: a.who } : {}), ...(a.due ? { due: dayWord(Date.parse(a.due)) } : {}), state: a.late ? 'Late' : a.who ? 'Open' : 'Nobody yet', tone: a.late ? 'r' : a.who ? 'n' : 'a' });

export function storyBlocks(i: StoryPaperInputs): Block[] {
  const { story, chapter: c } = i;
  const s = c.snapshot;
  const n = i.chapters.filter(x => x.approvedAt && x.at <= c.at).length || 1;
  const out: Block[] = [];
  const band = bandPage('THE STORY · ' + (story.closedAt ? 'CLOSED' : 'IN PROGRESS'), { name: story.client || 'The story' }, undefined, undefined,
    [['Chapter', String(n)], ['Update', dayWordYear(c.at)], ['Since', dayWordYear(story.startedAt)]]);
  out.push(leanBand({ ...band, sub: story.brief, verdict: { text: c.headline, tone: s.found.critical || s.found.late ? 'r' : s.found.open ? 'a' : 'g' } }, i.printed));
  out.push(...preparedByBlocks({ client: story.client, today: i.printed }));
  out.push(leanTiles(storyTiles(s)));

  /* THIS UPDATE — the words */
  out.push(leanHead(`This update — ${dayWordYear(c.at)}`, c.by === 'assistant' ? 'drafted by the assistant, edited by the consultant' : undefined));
  for (const p of c.narrative) out.push(text({ text: p, size: 9.5, colour: INK, after: 6 }));
  const unsure = unsureIn(c.narrative, s);
  if (unsure.length) out.push(text({ text: `Check: ${unsure.map(u => (/^\d+$/.test(u) && Number(u) >= 100 ? `£${Number(u).toLocaleString('en-GB')}` : u)).join(', ')} — not among the figures the tools recorded.`, size: 8, colour: '#b45309', after: 8 }));

  /* WHAT WE HAVE FOUND */
  out.push(leanHead('What we have found', `${plural(s.findings.length, 'problem')} open${s.found.costDay != null ? ` · ${fmtGBP(s.found.costDay)} a day` : ''}`));
  if (!s.findings.length) out.push(text({ text: 'Nothing open on the register.', size: 9, colour: MUTED, after: 10 }));
  else out.push(rows({
    rows: s.findings.map(f => ({
      h: (fr: Frame) => 8 + wrap(fr.doc, f.what, fr.w - 110, 9.5, 'bold').length * 12 + (f.words ? wrap(fr.doc, f.words, fr.w - 110, 8).length * 10 : 0) + 4,
      draw: (fr: Frame, y: number) => {
        const d = fr.doc;
        d.setDrawColor(LINE); d.setLineWidth(0.5); d.line(fr.x, y, fr.x + fr.w, y);
        const t = wrap(d, f.what, fr.w - 110, 9.5, 'bold');
        font(d, 9.5, 'bold', INK); d.text(t, fr.x, y + 13);
        let yy = y + 13 + (t.length - 1) * 12;
        if (f.words) { const w = wrap(d, f.words, fr.w - 110, 8); font(d, 8, 'normal', INK2); d.text(w, fr.x, yy + 11); yy += w.length * 10; }
        font(d, 8, 'bold', f.priority === 'critical' || f.late ? '#c4281c' : INK2);
        d.text(`${f.line}${f.machine ? ` · ${f.machine}` : ''}`, fr.x + fr.w, y + 13, { align: 'right' });
        font(d, 9.5, 'bold', INK); d.text(f.poundsDay != null ? `${fmtGBP(f.poundsDay)} a day` : 'not priced', fr.x + fr.w, y + 25, { align: 'right' });
        if (f.late || f.owner) { font(d, 7.5, 'normal', f.late ? '#c4281c' : MUTED); d.text(`${f.late ? 'late' : ''}${f.late && f.owner ? ' · ' : ''}${f.owner ?? ''}`, fr.x + fr.w, y + 35, { align: 'right' }); }
      },
    })),
    after: 'm',
  }));

  /* WHAT IS BEING DONE */
  out.push(leanHead('What is being done', `${plural(s.fixing.open, 'action')}${s.fixing.late ? ` · ${s.fixing.late} late` : ''}`));
  out.push(...leanActions(s.actions.map(actionRow), 'Nothing owed yet.'));

  /* WHAT IS PROVED */
  out.push(leanHead('What is proved', s.proved ? 'before → after moved the right way' : undefined));
  out.push(...(s.provedFixes.length ? leanInsights(s.provedFixes.map(p => ({ text: `${p.what} on ${p.line} (${p.machine}) — ${p.proof}`, tone: 'g' as const }))) : [text({ text: 'No fix proved yet — a fix is proved when the same number is counted again and has moved the right way.', size: 9, colour: MUTED, after: 10 })]));

  /* THE CHAPTERS BEFORE */
  const before = i.chapters.filter(x => x.approvedAt && x.at < c.at).sort((a, b) => b.at - a.at);
  if (before.length) {
    out.push(leanHead('The story so far', `${plural(before.length, 'chapter')} before this one`));
    out.push(rows({
      rows: before.map(x => ({
        h: (fr: Frame) => 6 + wrap(fr.doc, x.headline, fr.w - 150, 9, 'bold').length * 11.5 + 4,
        draw: (fr: Frame, y: number) => {
          const d = fr.doc; d.setDrawColor(LINE); d.setLineWidth(0.5); d.line(fr.x, y, fr.x + fr.w, y);
          font(d, 8, 'normal', MUTED); d.text(dayWord(x.at), fr.x, y + 12);
          font(d, 9, 'bold', INK); d.text(wrap(d, x.headline, fr.w - 150, 9, 'bold'), fr.x + 46, y + 12);
          font(d, 8, 'normal', INK2); d.text(`${x.snapshot.found.open} open${x.snapshot.found.costDay != null ? ` · ${fmtGBP(x.snapshot.found.costDay)} a day` : ''} · ${x.snapshot.proved} proved`, fr.x + fr.w, y + 12, { align: 'right' });
        },
      })),
      after: 'm',
    }));
  }

  /* WHAT THE FIGURES REST ON */
  out.push(leanHead('What the figures rest on'));
  out.push(text({ text: s.toolsUsed.length ? `Recorded on the client’s lines in Faultline: ${s.toolsUsed.map(t => `${t.label} (${t.n})`).join(' · ')}. Every figure above is a tool’s own, counted or timed on the line; money is the line’s own cost model (wage, speed, margin, materials a pack). A problem with no price says so.` : 'No tool record on the client’s lines yet — the figures are the register’s problems and the actions.', size: 8, colour: INK2, after: 8 }));
  out.push(leanClosing({ text: storySentence(s), tone: s.found.late || s.found.critical ? 'r' : s.found.open ? 'a' : 'g' }));
  return out;
}

export async function makeStoryPaper(i: StoryPaperInputs): Promise<jsPDF> {
  const { loadPdfLib } = await import('../savePdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, () => storyBlocks(i));
  await pour({ ...base, density, dry: false }, storyBlocks(i), () => doc.addPage('a4', 'portrait'));
  /* page numbers at the foot */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); font(doc, 7, 'normal', MUTED); doc.text(`${i.story.client || 'The story'} · chapter ${i.chapters.filter(x => x.approvedAt && x.at <= i.chapter.at).length || 1} · page ${p} of ${pages}`, W / 2, H - 14, { align: 'center' }); }
  void BRAND;
  return doc;
}
