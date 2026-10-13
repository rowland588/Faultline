/* A JOB SEES ITS LINES' PROGRAMS (docs/BLUEPRINT.md, Stage 2: "a job seeing
 * them"). The programs planned on a line with no job — the line's own — shown
 * on the job's Programs page, the same records, never copies: where each has
 * got to and when it is tested. On a stage-gate job one can be put to a test
 * in Commission — its proving test names it (Test.programId), and passing it
 * proves the line's program on the day it ran (db/programs followTest), so
 * the line, the control room and the job all read "proved" at once.
 *
 * Planned and changed on the line's Programs, one tap away. */
import { useMemo } from 'react';
import type { Project } from '../types';
import { STATE_WORD, isProved, provingTitle, standingOf, stateOf, todayISO } from '../lib/programs';
import { machineKey, machineOfProgram, machinesOnLine, programsOnLine } from '../lib/lineRecords';
import { useLineRecords } from '../lib/useLineRecords';
import type { useTesting } from '../lib/useTesting';
import { provingTestOf, testCell } from '../lib/commission';
import { niceDay } from '../lib/weeks';
import type { Can } from '../lib/access';
import { nav } from '../state/useRoute';
import { openRecord } from './RecordDrawer';

export function LineProgramsOnJob({ project, tt, can }: { project: Project; tt?: ReturnType<typeof useTesting>; can: Can }) {
  const rec = useLineRecords();
  const today = todayISO();
  const lines = useMemo(() => {
    const ids = new Set(rec.jobLines.filter(l => l.projectId === project.id && l.workspaceId && !l.deletedAt).map(l => l.workspaceId as string));
    return rec.all.filter(w => ids.has(w.id) && !w.archived).map(w => ({
      w, machines: machinesOnLine(w, rec.machines, rec.jobLines),
      own: programsOnLine(w.id, rec.programs, rec.jobLines).filter(p => !p.projectId),
    }));
  }, [rec, project.id]);
  if (rec.loading || !lines.length) return null;

  return (
    <>
      {lines.map(({ w, machines, own }) => (
        <section key={w.id} className="lpj" aria-label={`On ${w.name}, with no job`}>
          <h2>On {w.name}, with no job</h2>
          <p className="sub">
            {own.length
              ? `The line's own programs — ${own.length}, ${own.filter(isProved).length} proved. The same records the line and the control room show${project.commissioning ? '; one put to a test in Commission is proved by it' : ''}.`
              : `No programs planned on ${w.name} outside a job.`}
            {' '}<button type="button" className="cw-link" onClick={() => nav(`/programs?line=${encodeURIComponent(w.id)}`)}>{w.name}&rsquo;s programs ›</button>
          </p>
          {own.length > 0 && (
            <ul className="lpj-rows">
              {own.map(p => {
                const m = machineOfProgram(p, machines);
                const late = standingOf(p, today) === 'overdue';
                const test = tt ? provingTestOf(p, tt.tests) : undefined;
                /* The job's machine of the same name, so its test sits on it. */
                const onJob = m && tt ? tt.assets.find(a => !a.deletedAt && machineKey(a.name) === machineKey(m.name)) : undefined;
                const planTest = async () => {
                  if (!tt) return;
                  const [id] = await tt.planTests([{ title: provingTitle(p), ...(onJob ? { assetId: onJob.id } : {}),
                    extra: { programId: p.id, ...(p.runs ? { planned: p.runs } : {}), ...(p.testOn ? { plannedFor: p.testOn } : {}), ...(p.from ? { withWhom: p.from } : {}) } }]);
                  if (id) openRecord(project.id, id);
                };
                return (
                  <li key={p.id} className="lpj-row" data-program={p.id}>
                    <span className="lpj-row-main">
                      <b>{p.what}</b>
                      <span className="sub">{[m?.name ?? 'the line itself', p.runs ? `runs ${p.runs}` : '', p.note ?? ''].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className={'pg-state-sel is-pg-' + stateOf(p)}>{STATE_WORD[stateOf(p)]}</span>
                    <span className={late ? 'is-r' : 'sub'}>{isProved(p) ? `proved ${niceDay(p.provedOn)}` : p.testOn ? `${late ? 'test was ' : 'test '}${niceDay(p.testOn)}` : 'no test day'}</span>
                    {project.commissioning && tt && (test
                      ? <span className="sub">Its test in Commission: <span className={'cg-pstate is-' + testCell(test, today).tone}>{testCell(test, today).word}</span>{' '}<button type="button" className="cw-link" onClick={() => openRecord(project.id, test.id)}>Open it</button></span>
                      : !isProved(p) && can.edit && <button type="button" className="cw-link" onClick={() => void planTest()}>Prove it in Commission</button>)}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}
