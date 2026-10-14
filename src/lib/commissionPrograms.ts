/* PROGRAMS IN COMMISSION — which a job may test, and which its board counts.
 *
 * Rowland, 14 October: "I want to be able to easily go into commission, find
 * the programs that should be available because they're in programs ... so
 * that should be available to pick ... you can't pick a program from
 * commissioning, which you should be able to." And then: "the ui is poor
 * and makes no sense ... reach it only from programs and improve the ui to
 * actually run it?" — so every one is tested on its row on Programs
 * (ui/ProgramTest, read by programsToPick), and Commission's board opens each
 * machine's programs from its cell (commissionPrograms).
 *
 * A program was proved in Commission only from the other end: the Programs
 * page's "Prove it in Commission", or a test's record naming one — and the
 * record offered the job's programs alone, never the line's own (Stage 2).
 * And a test proving a line's program, once made, sat on no square of the
 * board: the board counted the job's programs only.
 *
 * Two readings, no new record (the test's programId is the link, as before):
 *
 *   programsToPick       every program this job may prove — its own, then
 *                        each of its lines' own — each with its machine on
 *                        THIS job (a line's machine is the job's machine of
 *                        the same name), whether it is proved, and the test
 *                        that proves it when there is one
 *   commissionPrograms   what the board and Needs you count: the job's own,
 *                        and a line's program once this job has a test for
 *                        it — tested here, so owed here. A line's program nobody
 *                        tested is the line's, not owed by this job (thirty
 *                        of the OEM's on a line would be thirty rows of
 *                        "no test yet" on every job on it).
 *
 * Its machine is the job's: a line's program names the line's machine
 * record, and the board's rows are the job's machines — matched by name
 * (lib/lineRecords machineKey), as the Programs page's "Prove it" does. */
import type { Asset, Test, TestItem } from './testing';
import { programsReading } from './programsReport';
import { resultNow } from './noted';
import type { AnswerHolder } from './install';
import { isProved, live as liveProgs, type Program } from './programs';
import { machineKey, machineOfProgram, type JobLinePrograms } from './lineRecords';
import { provingTestOf } from './commission';

export interface PickRow {
  program: Program;
  /** The machine's name on this job, when it is on one. */
  machine?: string;
  /** This job's machine it sits on — the proving test's machine. */
  assetId?: string;
  proved: boolean;
  /** The test on this job that proves it, as it stands now. */
  test?: Test;
}

export interface PickGroup {
  /** 'job', or the line's id. */
  key: string;
  /** "This job's programs" · "Line 2A's own programs". */
  title: string;
  rows: PickRow[];
}

const onJob = (assets: readonly Asset[], name?: string): Asset | undefined =>
  name ? assets.find(a => !a.deletedAt && machineKey(a.name) === machineKey(name)) : undefined;

/** Every program this job may prove in Commission, grouped: the job's own,
 *  then each of its lines' own, in the lists' own order. A group with none
 *  is left out. */
export function programsToPick(jobPrograms: readonly Program[], lines: readonly JobLinePrograms[], assets: readonly Asset[], tests: Test[]): PickGroup[] {
  const job: PickRow[] = liveProgs([...jobPrograms]).map(p => {
    const a = p.assetId ? assets.find(x => x.id === p.assetId && !x.deletedAt) : undefined;
    const test = provingTestOf(p, tests);
    return { program: p, ...(a ? { machine: a.name, assetId: a.id } : {}), proved: isProved(p), ...(test ? { test } : {}) };
  });
  const groups: PickGroup[] = job.length ? [{ key: 'job', title: 'This job’s programs', rows: job }] : [];
  for (const l of lines) {
    const rows: PickRow[] = liveProgs([...l.programs]).map(p => {
      const m = machineOfProgram(p, l.machines);
      const a = onJob(assets, m?.name);
      const test = provingTestOf(p, tests);
      return { program: p, ...(m ? { machine: m.name } : {}), ...(a ? { assetId: a.id } : {}), proved: isProved(p), ...(test ? { test } : {}) };
    });
    if (rows.length) groups.push({ key: l.id, title: `${l.name}’s own programs`, rows });
  }
  return groups;
}

/** What the board and Needs you count: the job's own programs, and each of
 *  its lines' programs this job has a test for — its machine put as the
 *  job's, so it is counted on that machine's row. */
export function commissionPrograms(jobPrograms: readonly Program[], lines: readonly JobLinePrograms[], assets: readonly Asset[], tests: Test[]): Program[] {
  const own = liveProgs([...jobPrograms]);
  const seen = new Set(own.map(p => p.id));
  const picked: Program[] = [];
  for (const l of lines) {
    for (const p of liveProgs([...l.programs])) {
      if (seen.has(p.id) || !provingTestOf(p, tests)) continue;
      seen.add(p.id);
      const a = onJob(assets, machineOfProgram(p, l.machines)?.name);
      const { assetId: _lineMachine, ...rest } = p;
      picked.push(a ? { ...rest, assetId: a.id } : rest);
    }
  }
  return [...own, ...picked];
}

/** A line on a machine's "Programs loaded" with no program record — how most
 *  jobs hold their programs — as the board counts it: its own id
 *  (`part:<id>`), its machine, and proved on the day the floor said it
 *  passed (or reached baseline). Tested on Programs, its record is made and
 *  this stands aside for it (ui/ProgramTest). */
export function stagePrograms(x: { tests: Test[]; items: TestItem[]; assets: Asset[]; programs: Program[]; holder?: AnswerHolder; projectId: string; today?: string }): Program[] {
  const r = programsReading({ tests: x.tests, items: x.items, assets: x.assets, programs: x.programs, holder: x.holder, ...(x.today ? { today: x.today } : {}) });
  return (r?.lines ?? []).filter(l => l.partId && !l.programId).map(l => {
    const part = x.items.find(i => i.id === l.partId);
    const done = l.bucket === 'done' || l.bucket === 'baseline';
    const on = part && (resultNow(part)?.on ?? (part.doneAt != null ? new Date(part.doneAt).toISOString().slice(0, 10) : undefined));
    return {
      id: `part:${l.partId}`, projectId: x.projectId, what: l.what, ...(l.assetId ? { assetId: l.assetId } : {}),
      state: 'onMachine' as const, ...(done && on ? { provedOn: on } : {}), sort: 0, createdAt: 0, updatedAt: 0,
    };
  });
}

/** Everything the board, Needs you and the commissioning paper count: the
 *  job's programs, its lines' it has a test for, and its machines'
 *  "Programs loaded" lines — the Programs page's programs, one answer. */
export function boardPrograms(x: { jobPrograms: readonly Program[]; lines: readonly JobLinePrograms[]; assets: Asset[]; tests: Test[]; items: TestItem[]; holder?: AnswerHolder; projectId: string; today?: string }): Program[] {
  return [
    ...commissionPrograms(x.jobPrograms, x.lines, x.assets, x.tests),
    ...stagePrograms({ tests: x.tests, items: x.items, assets: x.assets, programs: [...x.jobPrograms], holder: x.holder, projectId: x.projectId, ...(x.today ? { today: x.today } : {}) }),
  ];
}
