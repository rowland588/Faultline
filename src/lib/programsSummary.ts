/* THE PROGRAMS IN ONE TABLE (4 November — Rowland: "what we're missing at the top is actually a summary. And think of a table form ... the program number, the
 * program name, the run speed that we achieved, and the caveat next to it ... so somebody can go to a meeting and say, well, that's where we are. These are
 * the details below it"). One row a program, in the report's order — machine by machine — read from the same lines the detail below is drawn from, so the
 * summary and the detail can never say different things. Pure. */
import { WORK_WORD, WORK_TONE, speedWord } from './programStatus';
import { badgeOf, type ProgTone, type ProgramLine, type ProgramsReading } from './programsReport';

export interface SummaryRow {
  /** The program's number as written on the machine — "PR-12", "CW-3", "10" — when its name begins with one; '' otherwise. */
  no: string;
  /** The rest of its name. */
  name: string;
  machine: string;
  /** What it runs, products a comma apart. */
  runs: string;
  /** Where it stands: the status a person typed (Doing, Done …) when there is one, else the state the tests say (PASSED, BOOKED …) — in its colour. */
  status: { word: string; tone: ProgTone };
  /** The best speed it has run at: the one typed, else its fastest passing test — "75 ppm" / "72 ppm (tested)" / "—". */
  runSpeed: string;
  /** The speed production can run it at, as typed — "70 ppm" / "—". */
  canRunAt: string;
  /** What to watch, as typed; '' when none. */
  caveat: string;
  /** Production would run it faster than it has been shown to run (the typed speeds say so) — said in amber. */
  ahead: boolean;
}

/** "PR-12 Express 1.25 kg" → { no: 'PR-12', name: 'Express 1.25 kg' }; "Program 10" → { no: '10', name: 'Program 10' }; a name with no number → no ''. */
export function splitName(what: string): { no: string; name: string } {
  const w = what.trim().replace(/\s+/g, ' ');
  const code = /^([A-Za-z]{1,6}[- ]?\d+[A-Za-z]?)(?:\s+|$)/.exec(w);
  if (code && /\d/.test(code[1]) && /[-]/.test(code[1])) return { no: code[1].toUpperCase(), name: w.slice(code[0].length).trim() || w };
  const prog = /^(?:program|prog)\s+#?(\d+[A-Za-z]?)\b\s*(.*)$/i.exec(w);
  if (prog) return { no: prog[1], name: w };
  return { no: '', name: w };
}

const rowOf = (l: ProgramLine): SummaryRow => {
  const { no, name } = splitName(l.what);
  const s = l.status;
  const best = s?.bestSpeed ?? undefined;
  const runSpeed = best != null ? speedWord(best) : l.testedSpeed != null ? `${speedWord(l.testedSpeed)} (tested)` : '—';
  const shown = best ?? l.testedSpeed;
  const b = badgeOf(l);
  return {
    no, name, machine: l.machine, runs: l.runs ?? '',
    status: s ? { word: WORK_WORD[s.work], tone: WORK_TONE[s.work] as ProgTone } : { word: b, tone: l.tone },
    runSpeed, canRunAt: s?.runAt != null ? speedWord(s.runAt) : '—',
    caveat: s?.caveats?.trim() ?? '',
    ahead: s?.runAt != null && shown != null && s.runAt > shown,
  };
};

/** Every program of the reading, machine by machine, a row each. */
export function programsSummary(reading: ProgramsReading): SummaryRow[] {
  return reading.machines.flatMap(m => m.lines.map(rowOf));
}
