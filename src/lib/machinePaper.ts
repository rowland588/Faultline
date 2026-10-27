/* A MACHINE ON PAPER — the words a machine's page says, put in the shape every machine paper draws
 * (lib/machinePaperPdf): the machine report from its own page (in a project, or on its line), the project's
 * Machines report (a row a machine, then a page each) and the factory's machines (a row a machine, line by line).
 *
 * Rowland, 27 October: "Machines is good but no report system"; "projects, machines shows the page I have been
 * wanting .. but still no report abilities". No new reading: a machine in a project is read by lib/machineRecord
 * (its gates, what is open, its tests) and the Programs report (its programs); on its line by lib/lineMachine.
 * Every word here is theirs. Pure. */
import type { GateTone } from './install';
import type { MachineRecord, MachineTone } from './machineRecord';
import { machineTests, openOnMachine } from './machineRecord';
import type { ProgramLine } from './programsReport';
import { badgeOf } from './programsReport';
import type { LineMachineView } from './lineMachine';
import { STOP_DAYS } from './lineMachine';

/** The house's five colours, one meaning each (CLAUDE.md): red gone or failed, amber waiting, violet under way or
 *  ahead, green done, grey not started. */
export type PaperTone = 'r' | 'a' | 'w' | 'g' | 'n';

export interface PaperRow { what: string; says?: string; word: string; tone: PaperTone }
export interface PaperSection { title: string; count: string; rows: PaperRow[]; empty: string }

export interface MachinePaper {
  /** "MACHINE · Line 2 commissioning" */
  eyebrow: string;
  name: string;
  status?: { word: string; tone: PaperTone };
  /** Who made it, when it came, its line — each a short fact. */
  facts: string[];
  /** "Going through Line 2 commissioning — a stage-gate project — up to Commission." */
  inProject?: string;
  gates?: { label: string; says: string; tone: PaperTone }[];
  sections: PaperSection[];
}

/** A row on a list of machines: its name, its status, its line of words and what is next. */
export interface MachinesPaperRow { n?: number; name: string; status?: { word: string; tone: PaperTone }; says: string; right: string; rightTone?: PaperTone }

/** Several machines: a front of rows (grouped by line, or one group), then — when any — a page a machine. */
export interface MachinesPaper {
  eyebrow: string;
  title: string;
  says: string;
  groups: { head?: string; rows: MachinesPaperRow[]; empty?: string }[];
  machines: MachinePaper[];
  /** The foot of every page. */
  foot: string;
}

const LINE_TONE: Record<MachineTone, PaperTone> = { done: 'g', failed: 'r', late: 'r', problem: 'a', asking: 'a', ahead: 'w', none: 'n' };
const GATE_TONE: Record<GateTone, PaperTone> = { done: 'g', going: 'w', late: 'r', problem: 'a', failed: 'r', ahead: 'n', none: 'n' };

/** A program's word on paper: its badge (as the Programs report badges it), then its state when that says more. */
const progWord = (l: ProgramLine): string => { const b = badgeOf(l); return l.word.trim().toUpperCase() === b ? b : `${b} — ${l.word}`; };

/** A status word's colour — handed over green, not here yet grey, the rest under way. */
export const statusTone = (word: string): PaperTone => (word === 'Handed over' ? 'g' : word === 'Not here yet' ? 'n' : 'w');

/** A machine in a stage-gate project, as its page says it: its status, the project it is going through and where it
 *  is up to, its gates, what is open on it, its tests and its programs. */
export function projectMachinePaper(i: { project: string; m: MachineRecord; status: string; programs: readonly ProgramLine[]; line?: string }): MachinePaper {
  const { m } = i;
  const open = openOnMachine(m), tests = machineTests(m), progs = i.programs.filter(l => l.assetId === m.id);
  const handed = m.at.startsWith('Handed over');
  return {
    eyebrow: `MACHINE · ${i.project}`,
    name: m.name,
    ...(i.status ? { status: { word: i.status, tone: statusTone(i.status) } } : {}),
    facts: [m.oem ? `Made by ${m.oem}` : '', m.arrival, i.line ? `On ${i.line}` : ''].filter(Boolean),
    inProject: `Going through ${i.project} — a stage-gate project — ${handed ? m.at.toLowerCase() : `up to ${m.at.replace(/^at /, '')}`}.`,
    gates: m.gates.map(g => ({ label: g.label, says: g.says, tone: GATE_TONE[g.tone] })),
    sections: [
      { title: 'What is open on it', count: open.length ? String(open.length) : 'nothing',
        rows: open.map(l => ({ what: l.title, says: [l.where, l.who].filter(Boolean).join(' · '), word: l.word, tone: LINE_TONE[l.tone] })),
        empty: 'Nothing open on it — no stage, fix or problem waiting.' },
      { title: 'Its tests', count: tests.length ? `${tests.filter(t => t.tone === 'done').length} of ${tests.length} passed` : 'none yet',
        rows: tests.map(l => ({ what: l.title, ...(l.who ? { says: l.who } : {}), word: l.word, tone: LINE_TONE[l.tone] })),
        empty: 'No tests on it yet — they are planned on the project’s Commission.' },
      { title: 'Its programs', count: progs.length ? String(progs.length) : 'none',
        rows: progs.map(l => ({ what: l.what, says: [l.runs, l.note].filter(Boolean).join(' · '), word: progWord(l), tone: l.tone })),
        empty: 'No programs on it.' },
    ],
  };
}

const PRIORITY_WORD = { critical: 'Critical', high: 'High', low: 'Low' } as const;

/** A machine on its line, as its line's page says it: every project's work on it, its programs, its problems, the
 *  studies of it and its stops. */
export function lineMachinePaper(line: string, v: LineMachineView): MachinePaper {
  const openProblems = v.problems.filter(p => p.open).length;
  return {
    eyebrow: `MACHINE · ${line}`,
    name: v.name,
    facts: [v.says, v.oem ? `Made by ${v.oem}` : ''].filter(Boolean),
    sections: [
      { title: 'The projects on it', count: v.projects.length ? String(v.projects.length) : 'none',
        rows: v.projects.map(p => ({ what: p.name, says: [`${p.tests} ${p.tests === 1 ? 'test' : 'tests'}`, p.last ? `last: ${p.last}` : ''].filter(Boolean).join(' · '),
          word: [p.open ? `${p.open} open` : 'none open', p.failed ? `${p.failed} didn’t pass` : ''].filter(Boolean).join(' · '), tone: p.failed ? 'r' as const : p.open ? 'w' as const : 'g' as const })),
        empty: 'No project has worked on it.' },
      { title: 'Its programs', count: v.programs.length ? String(v.programs.length) : 'none',
        rows: v.programs.map(l => ({ what: l.what, ...(l.runs ? { says: l.runs } : {}), word: progWord(l), tone: l.tone })),
        empty: 'No programs on it.' },
      { title: 'Its problems', count: v.problems.length ? `${openProblems} open of ${v.problems.length}` : 'none',
        rows: v.problems.map(p => ({ what: p.what, word: p.open ? PRIORITY_WORD[p.priority] : 'closed', tone: !p.open ? 'g' as const : p.priority === 'critical' ? 'r' as const : p.priority === 'high' ? 'a' as const : 'n' as const })),
        empty: 'No problem on the register names it.' },
      { title: 'Studies of it', count: v.studies.length ? String(v.studies.length) : 'none',
        rows: v.studies.map(s => ({ what: s.name, word: s.tool, tone: 'n' as const })),
        empty: 'No study names it yet.' },
      { title: 'Its stops', count: v.stops.n ? `${v.stops.n} in ${STOP_DAYS} days` : 'none',
        rows: v.stops.n ? [{ what: `${v.stops.n} ${v.stops.n === 1 ? 'stop' : 'stops'} timed in the last ${STOP_DAYS} days`, word: `${v.stops.minutes} minutes`, tone: 'n' as const }] : [],
        empty: `No stops timed on it in the last ${STOP_DAYS} days.` },
    ],
  };
}
