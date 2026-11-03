/* THE LINE'S FULL PACKAGE — what goes in it, in what order (3 November).
 *
 * Rowland: "If I go to line 2A and I build a report, I don't have the line standards on there … what I'm trying to do
 * here is send almost a package of information to my client … here is everything on the line, what's happening,
 * problems, programs, tests, the failures, all of it, including the maps … I'm not asking for a summary of any tests.
 * It actually prints off its actual report itself … we could have the line as a short report, which is almost a
 * summary, which is kind of happening now. Or we go line full report, and the full report actually prints off the
 * tools, individual reports … literally what you would see, all the graphics, everything, and then that gets sent."
 *
 * So two worlds on one page (lib/lineBundle, the summary, unchanged): the SUMMARY, and the FULL PACKAGE — a cover and
 * contents, the line at a glance (the summary's own first part, tools left out), then every paper the line already
 * has, each drawn by its own drawer and joined whole: the problems report with each problem's journey, the programs
 * report with every test and the notes written on it, the machines report with every machine in full, the line
 * standards' cards with their maps, Line capacity's pages with the V, and each tool record's own paper. Nothing is
 * redrawn or shortened here — a section is the paper that tool prints on its own, so the two can never disagree.
 *
 * Pure: the bundle and the ticks in, the ordered list of sections out. The paper (linePackagePdf) and the page
 * (LineReportScreen) both read it. */
import type { Workspace } from '../../types';
import type { BundleItem, LineBundle, LinePart } from './lineBundle';

export type PackageKind = 'glance' | 'problems' | 'problemcards' | 'programs' | 'testcards' | 'machines' | 'standards' | 'capacity' | 'study';

export interface PackageSection {
  /** Stable: `glance` · `problems:<line>` · `programs:<line>` · `machines:<line>` · `standards:<line>` · `capacity:<line>` · `study:<key>`. */
  id: string;
  kind: PackageKind;
  /** As the contents say it — "Programs", or "Line 2a — Programs" on a dual line. */
  title: string;
  /** What is in it, in a few words — under the title on the contents. */
  what: string;
  part?: LinePart;
  /** The records in it: the standards on the cards, the capacity papers, the one study. */
  items: BundleItem[];
}

/** Which of the line's own whole-line papers go in (the records are ticked one by one). */
export interface PackageFlags { problems: boolean; problemCards: boolean; programs: boolean; testCards: boolean; machines: boolean }
export const ALL_IN: PackageFlags = { problems: true, problemCards: true, programs: true, testCards: true, machines: true };

/** What the line holds that the bundle does not count: every problem on it (open and closed, none put away by Start fresh) and the
 *  tests of its programs, every attempt (3 November — Rowland: "add the closed problems and test cards"). */
export interface PackageRecords { problemsOn: (lineId: string) => { open: number; closed: number }; testsOn: (part: LinePart) => number }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** THE SECTIONS, in the order they are printed. A paper with nothing to print is left out, never printed empty:
 *  no problem open, no program, no machine, no record ticked. */
export function packageSections(bundle: LineBundle, picks: ReadonlySet<string>, flags: PackageFlags = ALL_IN, rec?: PackageRecords): PackageSection[] {
  const out: PackageSection[] = [{ id: 'glance', kind: 'glance', title: 'The line at a glance', what: 'the line in one sentence, what is open, who owes what by when', items: [] }];
  for (const part of bundle.parts) {
    const t = (name: string) => (bundle.dual ? `${part.title} — ${name}` : name);
    const pr = rec?.problemsOn(part.line.id) ?? { open: part.problems.open, closed: 0 };
    const nProblems = pr.open + pr.closed;
    if (flags.problems && nProblems > 0) out.push({ id: `problems:${part.line.id}`, kind: 'problems', title: t('Problems'), part, items: [],
      what: `${plural(pr.open, 'problem')} open${part.problems.late ? `, ${part.problems.late} late` : ''}${pr.closed ? `, ${pr.closed} closed` : ''}, each with its plan and journey` });
    if (flags.problemCards && nProblems > 0) out.push({ id: `problemcards:${part.line.id}`, kind: 'problemcards', title: t('Problem cards'), part, items: [],
      what: `${plural(nProblems, 'card')} — a page for each problem, open or closed, for the board` });
    if (flags.programs && part.kit.programs.length) out.push({ id: `programs:${part.line.id}`, kind: 'programs', title: t('Programs'), part, items: [],
      what: `${plural(part.kit.programs.length, 'program')}, machine by machine, every test and how it went` });
    const nTests = rec?.testsOn(part) ?? 0;
    if (flags.testCards && nTests > 0) out.push({ id: `testcards:${part.line.id}`, kind: 'testcards', title: t('Test cards'), part, items: [],
      what: `${plural(nTests, 'test card')} — each test: what was agreed, what was seen, what we do next` });
    if (flags.machines && part.kit.machines.length) out.push({ id: `machines:${part.line.id}`, kind: 'machines', title: t('Machines'), part, items: [],
      what: `${plural(part.kit.machines.length, 'machine')} in full — every test, every program, every step, the studies` });
    const standards = part.items.filter(i => picks.has(i.key) && i.key.startsWith('standard:'));
    if (standards.length) out.push({ id: `standards:${part.line.id}`, kind: 'standards', title: t('Line standards'), part, items: standards,
      what: `${plural(standards.length, 'card')} with the map and who does what: ${standards.map(s => s.name).join(', ')}` });
    const caps = part.items.filter(i => picks.has(i.key) && i.key.startsWith('capacity:'));
    if (caps.length) out.push({ id: `capacity:${part.line.id}`, kind: 'capacity', title: t('Line capacity'), part, items: caps,
      what: `${caps.map(s => s.name).join(', ')} — the V, the capacity sheet, the bottleneck` });
    for (const it of part.items) if (it.study && picks.has(it.key)) out.push({ id: it.key, kind: 'study', title: t(`${it.tool} — ${it.name}`), part, items: [it], what: it.says.length <= 90 ? it.says : `${it.says.slice(0, 87)}…` });
  }
  return out;
}

/** The sentence over the choices — what the package holds. */
export function packageSays(sections: readonly PackageSection[]): string {
  const papers = sections.length;
  return `${plural(papers, 'paper')} after the cover: ${sections.map(s => s.title).join(' · ')}`;
}

export const packageFileWhat = (line: Pick<Workspace, 'name'>): [string, string] => [line.name, 'full line report'];
