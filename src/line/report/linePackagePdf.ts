/* THE LINE'S FULL PACKAGE ON PAPER (3 November; src/line/report/linePackage).
 *
 * Every section is the paper that tool prints on its own, drawn by its own drawer into a document of its own — so its
 * own page numbers, footers, orientation (the line standard's cards are landscape pictures) and typeface stay exactly
 * what they are everywhere else — and the documents are then joined whole (pdf-lib) behind a cover and contents.
 * Nothing is summarised: the programs report is the programs report, the line standard's card is the card.
 *
 * The cover is drawn twice if it must be: the contents give each section's page in the package, and that depends on
 * how many pages the cover itself took. Every page leaves with its package page, small, at the foot. */
import type { jsPDF } from 'jspdf';
import type { Snag } from '../../snag/types';
import type { Workspace } from '../../types';
import type { ToolStudy } from '../../lib/study';
import type { Test } from '../../lib/testing';
import type { StudyContext } from '../../lib/studyLinks';
import type { ProgramsReading } from '../../lib/programsReport';
import type { Standard } from '../../tools/linestandard/standard';
import type { LineReading } from '../../lib/lineLean';
import type { LineBundle } from './lineBundle';
import type { PackageSection } from './linePackage';
import { chooseDensity, pour, type Block, type Frame } from '../../lib/report/flow';
import { box, font, gap, rows, text, wrap } from '../../lib/report/blocks';
import { leanBand } from '../../lib/report/lean';
import { bandPage } from '../../lib/lean';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#12171c', INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489';

export interface PackageInputs {
  bundle: LineBundle;
  printed: string;
  today: string;
  /** Ticked records, by key — the standards, capacity papers and studies in the sections are already these. */
  picks: ReadonlySet<string>;
  readings: ReadonlyMap<string, LineReading>;
  programs: ReadonlyMap<string, ProgramsReading | undefined>;
  standards: Standard[];
  ctx?: StudyContext;
  dual?: [string, string];
  /** Every problem on any line, for the Problems section to narrow to its part. */
  snags: readonly Snag[];
  lineName: (id: string) => string;
  jobName: (id?: string) => string | undefined;
  /** The tests of the line's programs, every attempt (lib/programJourney attemptsOf) — a card each. */
  testsOf: (partLineId: string) => readonly Test[];
  /** A test's project, for its card's band — a line's own test is the line's. */
  projectOf: (projectId: string, lineId: string) => { name: string; lead?: string };
}

export interface PackageMade {
  blob: Blob;
  /** The package's pages in all, cover included. */
  pages: number;
  /** The contents as printed: each section's title and the package page it starts on. */
  contents: { title: string; page: number }[];
}

type SectionDoc = { doc: jsPDF; brand: boolean };

/** One section, drawn by its own drawer. */
async function sectionDoc(s: PackageSection, i: PackageInputs): Promise<SectionDoc | undefined> {
  const { loadPdfLib, titlePdf } = await import('../../lib/savePdf');
  const { jsPDF } = await loadPdfLib();
  const portrait = () => new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const line: Workspace = s.part?.line ?? i.bundle.line;
  switch (s.kind) {
    case 'glance': {
      const { drawLineBundle } = await import('./lineBundlePdf');
      const doc = portrait();
      await drawLineBundle(doc, { bundle: i.bundle, picks: i.picks, printed: i.printed, readings: i.readings, programs: i.programs, standards: i.standards, capacity: new Map(),
        glance: true, ...(i.ctx ? { ctx: i.ctx } : {}), ...(i.dual ? { dual: i.dual } : {}) });
      return { doc, brand: true };
    }
    case 'problems': {
      const { problemsReadingFor, scopeOfAll } = await import('../../lib/problemsPdf');
      const { snagsReportDoc } = await import('../../lib/buildSnagsReport');
      /* open and closed alike — what was put right is part of what happened; "Start fresh" put-away ones stay away */
      const mine = i.snags.filter(x => x.workspaceId === line.id && !x.deletedAt && !x.archivedAt);
      if (!mine.length) return undefined;
      const doc = await snagsReportDoc(problemsReadingFor({ title: `${line.name} — problems`, snags: mine, jobs: [], lineName: i.lineName, jobName: i.jobName, scopeOf: await scopeOfAll() }, { closed: true }), `${line.name} — problems`);
      return { doc, brand: true };
    }
    case 'problemcards': {
      const { problemCardsDoc } = await import('../../lib/buildSnagCards');
      const mine = i.snags.filter(x => x.workspaceId === line.id && !x.deletedAt && !x.archivedAt);
      if (!mine.length) return undefined;
      return { doc: await problemCardsDoc(mine.map(snag => ({ line: { snag, assetName: snag.targetAsset?.trim() || 'No machine named' } })), line.name), brand: true };
    }
    case 'testcards': {
      const { testCardsDoc } = await import('../../lib/testCards');
      const doc = await testCardsDoc(i.testsOf(line.id), pid => i.projectOf(pid, line.id));
      /* each card's band carries the mark, as one card's does — a picture to the edge */
      return doc ? { doc, brand: false } : undefined;
    }
    case 'programs': {
      const reading = i.programs.get(line.id);
      if (!reading?.lines.length) return undefined;
      const { drawProgramsReport } = await import('../../lib/programsReportPdf');
      const doc = portrait();
      await drawProgramsReport(doc, { name: line.lineType ? `${line.name} (${line.lineType})` : line.name, printed: i.printed, reading, eyebrow: 'PROGRAMS · PRODUCTION LINE' });
      return { doc, brand: true };
    }
    case 'machines': {
      const { lineMachinesPaper } = await import('../../lib/machineDossier');
      const { drawMachinesPaper } = await import('../../lib/machinePaperPdf');
      const paper = await lineMachinesPaper(line.id);
      if (!paper) return undefined;
      const doc = portrait();
      await drawMachinesPaper(doc, paper, i.printed);
      return { doc, brand: true };
    }
    case 'standards': {
      const { standardCardsDoc } = await import('../../ui/ToolPapers');
      const doc = await standardCardsDoc([{ name: line.name, list: s.items.flatMap(x => (x.standard ? [x.standard] : [])) }]);
      /* the card is a picture edge to edge, with its own heading and mark */
      return doc ? { doc, brand: false } : undefined;
    }
    case 'capacity': {
      const { capacityPdf } = await import('../../tools/linebalance/capacityPaperLoad');
      const list = s.items.flatMap(x => (x.standard ? [x.standard] : []));
      return list.length ? { doc: await capacityPdf(list, { scope: line.name }), brand: true } : undefined;
    }
    case 'study': {
      const it = s.items[0];
      if (!it?.study) return undefined;
      const { drawStudies } = await import('../../lib/studiesPdf');
      const doc = portrait();
      await drawStudies(doc, { title: it.name, printed: i.printed, items: [{ s: it.study as ToolStudy, where: `On ${line.name}` }], standards: i.standards, ...(i.ctx ? { ctx: i.ctx } : {}) });
      titlePdf(doc, `${it.tool} — ${it.name}`);
      return { doc, brand: true };
    }
  }
}

/** The cover and the contents. `offset` is the number of pages the cover takes, so a section's page is right. */
async function coverDoc(i: PackageInputs, entries: { title: string; what: string; pages: number }[], offset: number): Promise<jsPDF> {
  const { loadPdfLib } = await import('../../lib/savePdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const b = i.bundle;
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  let page = offset + 1;
  const starts = entries.map(e => { const p = page; page += e.pages; return p; });
  const blocksOf = (d: import('../../lib/report/flow').Density): Block[] => {
    const out: Block[] = [];
    const band = bandPage(`PRODUCTION LINE${b.line.lineType ? ` · ${b.line.lineType.toUpperCase()}` : ''} · THE FULL LINE REPORT`, { name: b.line.name }, undefined, undefined,
      [...(i.dual ? [i.dual] : []), ['Papers', String(entries.length)], ['Pages', String(page - 1)]]);
    out.push(leanBand({ ...band, verdict: { text: 'Everything on the line', tone: 'n' } }, i.printed));
    out.push(text({ text: 'What is in this package', size: 11, style: 'bold', colour: BRAND, before: gap(d, 'm'), after: 4 }));
    out.push(text({ text: 'Each paper after this page is the report that tool prints on its own — nothing is summarised. The page numbers are this package’s; each paper also keeps its own.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
    out.push(rows({
      rows: entries.map((e, k) => ({
        h: (f: Frame) => 10 + wrap(f.doc, e.title, f.w - 70, 10, 'bold').length * 12.5 + wrap(f.doc, e.what, f.w - 70, 8).length * 10,
        draw: (f: Frame, y: number) => {
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
          const t = wrap(f.doc, e.title, f.w - 70, 10, 'bold'), w = wrap(f.doc, e.what, f.w - 70, 8);
          font(f.doc, 10, 'bold', INK); f.doc.text(t, f.x, y + 14);
          font(f.doc, 8, 'normal', MUTED); f.doc.text(w, f.x, y + 14 + (t.length - 1) * 12.5 + 11);
          font(f.doc, 10, 'bold', INK2); f.doc.text(e.pages > 1 ? `${starts[k]}–${starts[k] + e.pages - 1}` : String(starts[k]), f.x + f.w, y + 14, { align: 'right' });
        },
      })),
      after: 'm',
    }));
    out.push(box(() => 14, () => { /* breathing room */ }));
    return out;
  };
  const density = await chooseDensity(base, d => blocksOf(d));
  await pour({ ...base, density, dry: false }, blocksOf(density), () => doc.addPage('a4', 'portrait'));
  const { stampBrand } = await import('../../lib/reportKit');
  stampBrand(doc);
  return doc;
}

const bytesOf = (doc: jsPDF): ArrayBuffer => doc.output('arraybuffer') as ArrayBuffer;

/** THE PACKAGE: each section drawn, a cover and contents in front, all joined, each page numbered in the package. */
export async function makeLinePackage(sections: readonly PackageSection[], i: PackageInputs, progress?: (done: number, of: number, title: string) => void): Promise<PackageMade> {
  const { stampBrand } = await import('../../lib/reportKit');
  const made: { s: PackageSection; bytes: ArrayBuffer; pages: number; stamp: boolean }[] = [];
  let n = 0;
  for (const s of sections) {
    progress?.(n++, sections.length, s.title);
    const d = await sectionDoc(s, i);
    if (!d) continue;
    if (d.brand) stampBrand(d.doc);
    made.push({ s, bytes: bytesOf(d.doc), pages: d.doc.getNumberOfPages(), stamp: d.brand });
  }
  const entries = made.map(m => ({ title: m.s.title, what: m.s.what, pages: m.pages }));
  /* the cover takes as many pages as it takes; the contents must be told after one pass */
  let cover = await coverDoc(i, entries, 1);
  if (cover.getNumberOfPages() !== 1) cover = await coverDoc(i, entries, cover.getNumberOfPages());
  const coverPages = cover.getNumberOfPages();

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const out = await PDFDocument.create();
  const add = async (bytes: ArrayBuffer) => {
    const src = await PDFDocument.load(bytes);
    for (const p of await out.copyPages(src, src.getPageIndices())) out.addPage(p);
  };
  await add(bytesOf(cover));
  for (const m of made) await add(m.bytes);
  /* each page's place in the package, small, at the very foot — below the paper's own footer */
  const f = await out.embedFont(StandardFonts.Helvetica);
  const all = out.getPages();
  /* a sheet that is a picture edge to edge (the line standard's card) has no room at its foot — its page is in the contents */
  const bare = new Set<number>();
  let at = coverPages;
  for (const m of made) { if (!m.stamp) for (let k = 0; k < m.pages; k++) bare.add(at + k); at += m.pages; }
  all.forEach((pg, k) => {
    if (bare.has(k)) return;
    const label = `Package page ${k + 1} of ${all.length}`;
    const { width } = pg.getSize();
    pg.drawText(label, { x: (width - f.widthOfTextAtSize(label, 6.5)) / 2, y: 7, size: 6.5, font: f, color: rgb(0.45, 0.5, 0.52) });
  });
  out.setTitle(`${i.bundle.line.name} — the full line report`);
  out.setCreator('Faultline');
  const bytes = await out.save();
  let page = coverPages + 1;
  const contents = made.map(m => { const c = { title: m.s.title, page }; page += m.pages; return c; });
  return { blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }), pages: all.length, contents };
}
