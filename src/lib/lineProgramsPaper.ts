/* PROGRAMS ON A LINE — one reading and its papers (lib/lineRecords,
 * lib/programsReportPdf). Shared by the line's Overview, its Programs tab,
 * its programs report page, and each program's own report (29 October). */
import type { Workspace } from '../types';
import type { ProgramLine, ProgramsReading } from './programsReport';
import { readingForProgram, readingForProgramNamed } from './programsReport';
import { lineProgramsReading, machinesOnLine, programsOnLine } from './lineRecords';
import type { LineRecords } from './useLineRecords';
import { niceDay } from './weeks';

export function programsReadingOnLine(rec: LineRecords, line: Workspace, today: string,
  o: { floor: ReadonlyMap<string, { word: string; note?: string; tone?: ProgramLine['tone']; bucket?: ProgramLine['bucket'] }>;
    jobName: ReadonlyMap<string, string>; stageOnlyLines: ProgramLine[] }): ProgramsReading | undefined {
  const machines = machinesOnLine(line, rec.machines, rec.jobLines);
  const programs = programsOnLine(line.id, rec.programs, rec.jobLines);
  return lineProgramsReading([{ id: line.id, name: line.name, machines, programs }], today, {
    floor: o.floor, jobName: o.jobName, tests: rec.provingTests, studies: rec.studies, standards: rec.standards,
    stageOnly: new Map([[line.id, o.stageOnlyLines]]),
  });
}

export async function saveLineProgramsReport(line: Workspace, reading: ProgramsReading, today: string) {
  const { loadPdfLib, deliverPdf } = await import('./savePdf');
  const { drawProgramsReport } = await import('./programsReportPdf');
  const { pdfFileName } = await import('./fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const named = line.lineType ? `${line.name} (${line.lineType})` : line.name;
  await drawProgramsReport(doc, { name: named, printed: niceDay(today, { year: true }), reading, eyebrow: 'PROGRAMS · PRODUCTION LINE' });
  return deliverPdf(doc, pdfFileName(line.name, 'programs', today));
}

export async function saveOneProgramReport(line: Workspace, reading: ProgramsReading, programId: string, today: string) {
  const one = readingForProgram(reading, programId) ?? readingForProgramNamed(reading, programId);
  if (!one?.lines[0]) throw new Error('program not on this line');
  const { loadPdfLib, deliverPdf } = await import('./savePdf');
  const { drawOneProgramReport } = await import('./programsReportPdf');
  const { pdfFileName } = await import('./fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  await drawOneProgramReport(doc, { lineName: line.name, printed: niceDay(today, { year: true }), reading: one, eyebrow: 'PROGRAM · PRODUCTION LINE' });
  return deliverPdf(doc, pdfFileName(`${line.name} ${one.lines[0].what}`, 'program', today));
}
