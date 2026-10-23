/* YOUR FACTORY, READ FOR PAPER — every line in floor order, its type, what is
 * open on it and the jobs on it (screens/FactoryScreen, lib/factoryPdf).
 *
 * Rowland, 1 October, the reason the app exists: "show the business a formal
 * process, to show that I am in control of the project." The factory on one
 * page is the floor that every project, problem and tool hangs off — what is
 * there, and where it is not right. The counts are the work and stay neutral;
 * only the late carry red, in words beside it. */
import type { Workspace } from '../types';
import type { Snag } from '../snag/types';
import { dualOf, dualSaid, factorySays, lineFacts } from './lines';
import { snagRow } from './snagsReport';

import { isOpenOnLine } from './lineWork';
import { lineDay } from './lineLoss';
export interface FactoryRow {
  /** Its place on the floor, from 1. */
  n: number;
  name: string;
  type?: string;
  open: number;
  late: number;
  critical: number;
  /** The live jobs it is on, by name. */
  jobs: string[];
  /** Its shifts and crew, in a few words (lib/lines lineFacts) — absent when not said. */
  facts?: string;
  /** "made of Line 2a + line 2b" · "part of 2a 2b" (lib/lines dualSaid) — absent for an ordinary line. */
  dual?: string;
  /** A DAY OF IT, IN MARGIN (lib/lineLoss lineDay): its speed × its shifts
   *  less their breaks × its margin a pack — absent while any is unsaid,
   *  and `missing` names which. The lean page's money (lib/factoryLean). */
  margin?: number;
  missing?: string[];
}

export interface FactoryReading {
  /** "4 lines · 3 Packing · 1 Palletising". */
  says: string;
  /** "7 problems open · 2 late" — or "No problems open". */
  problems: string;
  printed: string;
  rows: FactoryRow[];
  open: number;
  late: number;
}

/** The factory read for paper. `lines` in floor order (lib/lines);
 *  `jobsOn` each line's live jobs by name. */
export function factoryReading(lines: readonly Workspace[], snags: readonly Snag[], jobsOn: ReadonlyMap<string, string[]>, printed: string, ref = Date.now(),
  /** Each line's machines and programs in words (lib/lineRecords lineKit
   *  `says`, with its late) — as Your factory's row says them. */
  kit: ReadonlyMap<string, string> = new Map()): FactoryReading {
  const rows: FactoryRow[] = lines.map((w, i) => {
    const mine = snags.filter(s => isOpenOnLine(s, w.id)).map(s => snagRow(s, w.name, undefined, undefined, ref));
    const day = lineDay(w);
    return {
      n: i + 1, name: w.name, type: w.lineType?.trim() || undefined,
      ...(day.margin != null ? { margin: day.margin } : { missing: day.missing }),
      open: mine.length, late: mine.filter(r => r.late).length, critical: mine.filter(r => r.priority === 'critical').length,
      jobs: jobsOn.get(w.id) ?? [],
      ...(dualSaid(dualOf(w, lines)) ? { dual: dualSaid(dualOf(w, lines)) } : {}),
      ...([lineFacts(w).short, kit.get(w.id)].filter(Boolean).length ? { facts: [lineFacts(w).short, kit.get(w.id)].filter(Boolean).join(' · ') } : {}),
    };
  });
  const open = rows.reduce((n, r) => n + r.open, 0), late = rows.reduce((n, r) => n + r.late, 0);
  return {
    says: factorySays(lines), printed, rows, open, late,
    problems: open ? `${open} problem${open === 1 ? '' : 's'} open${late ? ` · ${late} late` : ''}` : 'No problems open',
  };
}
