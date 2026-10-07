/* COMMISSION, MACHINE BY MACHINE — the usual tests on a grid, and the
 * programs proved here.
 *
 * Rowland, 6 October: "in commissioning we don't yet have a default set that
 * you made for the other gates — I now want this. Also programs are directly
 * linked to commissioning, so make the link."
 *
 * The same grid the other three gates have (ui/InstallGrid): machines down
 * the side, the job's usual tests across the top, a square where they cross
 * in the house colours with the state in words. A gap is a test not on that
 * machine yet, one tap to add it. The last column is the machine's programs,
 * loaded at Set up and proved here, one test each — tap it for the list
 * underneath, where each program's test is planned and opened.
 *
 * Every square is an ordinary test (lib/commission reads them; nothing is
 * stored), so it opens in the same drawer and prints on the same report. */
import { runShort } from '../lib/run';
import { useState } from 'react';
import { deleteTest } from '../db';
import { commissionGrid, programsToProve, programsWords, type CommissionRow, type TestCell } from '../lib/commission';
import { stepsNamed, untouched, usualStages } from '../lib/install';
import { provingTitle, type Program } from '../lib/programs';
import type { Asset } from '../lib/testing';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';
import type { Project } from '../types';
import { openRecord } from './RecordDrawer';
import { UsualStages } from './UsualStages';
import { usePhone } from './InstallGrid';
import { offerUndo } from './Undo';
import { Icon } from './Icon';
import { nav } from '../state/useRoute';
import { todayISO } from '../lib/weeks';

type TT = ReturnType<typeof useTesting>;

/** The square's class — the Install grid's five states, so the two read alike:
 *  done a quiet green wash, didn't pass solid red, late a heavy red edge,
 *  owed a verdict amber, booked indigo, no day grey. */
const cellClass = (c: TestCell): string =>
  c.tone === 'g' ? 'is-done'
    : c.tone === 'r' ? (c.test.outcome === 'failed' || c.test.outcome === 'notRun' ? 'is-problem' : 'is-late')
      : c.tone === 'a' ? 'is-asking' : c.tone === 'w' ? 'is-booked' : '';

/** The square's heading — the words before any bracket, so six columns fit;
 *  the whole name is on the square's title and in the list. */
const shortName = (s: string) => s.replace(/\s*\(.*\)\s*$/, '').trim() || s;

export function CommissionGrid({ project, projects, tt, programs, can }: {
  project: Project; projects: Project[]; tt: TT; programs: Program[]; can: Can;
}) {
  const [editing, setEditing] = useState(false);
  /* A phone gets a card per machine, its tests down the card with the state
     in words — as Install does; the laptop keeps the grid. */
  const phone = usePhone();
  const today = todayISO();
  const usual = usualStages(project, projects, 'commission');
  const { columns, usualCount, rows } = commissionGrid(tt.assets, tt.tests, programs, usual.stages, today);
  const anyPrograms = rows.some(r => r.programs);
  const otherName = usual.otherId ? projects.find(p => p.id === usual.otherId)?.name : undefined;
  const rowName = (a?: Asset) => a?.name ?? 'The line itself';

  /* Adding tests is one write and one undo, said as exactly what it did. */
  const add = async (list: { title: string; assetId?: string }[], said: string) => {
    const ids = await tt.planTests(list);
    if (ids.length) offerUndo(said, async () => { for (const id of ids) await deleteTest(id, project.id); });
  };
  const missingOf = (r: CommissionRow) => usual.stages.filter((_, i) => !r.cells[i]).map(title => ({ title, assetId: r.asset?.id }));
  const giveAll = (rs: CommissionRow[]) => add(rs.flatMap(missingOf),
    rs.length === 1 ? `Added ${missingOf(rs[0]).length} tests to ${rowName(rs[0].asset)}` : `Added the usual tests to ${rs.length} machines`);
  const bare = rows.filter(r => r.asset && r.missing === usual.stages.length);

  if (!rows.length && !editing) {
    return (
      <section className="cmp-sec cg">
        <div className="cw-sec-h"><h2 className="cmp-h">Machine by machine</h2>
          <button className="cw-link" onClick={() => setEditing(true)}>{can.agree ? 'Edit the usual tests' : 'The usual tests'}</button></div>
        <p className="sub tw-note">Each machine gets the usual {usual.stages.length} tests here once it is named on Install.</p>
      </section>
    );
  }

  return (
    <section className="cmp-sec cg">
      <div className="cw-sec-h">
        <h2 className="cmp-h">Machine by machine</h2>
        <button className="cw-link" onClick={() => setEditing(e => !e)}>
          {editing ? 'Done' : can.agree ? 'Edit the usual tests' : 'The usual tests'}
        </button>
      </div>
      {editing && (
        <UsualStages project={project} usual={usual} otherName={otherName} tests={tt.tests} gate="commission" can={can}
          renameSteps={async pairs => {
            for (const { from, to } of pairs) for (const t of stepsNamed(tt.tests, from, 'commission')) await tt.patchTest(t.id, { title: to });
          }}
          isFresh={t => untouched(t, tt.tests, tt.items)}
          onDrop={async (cols, restoreList) => {
            const gone = cols.flatMap(c => stepsNamed(tt.tests, c, 'commission').filter(t => untouched(t, tt.tests, tt.items)));
            const back: (() => Promise<void>)[] = [];
            for (const t of gone) back.push(await deleteTest(t.id, project.id));
            offerUndo(`Took ${cols.length === 1 ? `“${cols[0]}”` : `${cols.length} tests`} off the list and ${gone.length} machine${gone.length === 1 ? '' : 's'}`,
              async () => { await restoreList(); for (const b of back) await b(); });
          }} />
      )}
      {can.edit && bare.length > 1 && (
        <p className="sub tw-note">
          {bare.length} machines have none of the usual tests yet — <button className="cw-link" onClick={() => void giveAll(bare)}>give them all the {usual.stages.length}</button>
        </p>
      )}
      {phone ? (
        <div className="igm">
          {rows.map(r => (
            <div key={r.asset?.id ?? 'line'} className="igm-card">
              <div className="igm-h"><b>{rowName(r.asset)}</b>
                <span className="sub">{r.missing === 0 ? `all ${usualCount} usual tests` : `${usualCount - r.missing} of ${usualCount} usual tests`}</span></div>
              {can.edit && r.missing > 0 && (
                <button className="ig-give" onClick={() => void giveAll([r])}><Icon name="plus" size="1.15em" /> Add {r.missing === usualCount ? `the ${r.missing}` : `the ${r.missing} missing`}</button>
              )}
              <div className="igm-list">
                {r.cells.map((c, i) => (c || i < usualCount) && (
                  <button key={columns[i]} className={'igm-st ' + (c ? cellClass(c) : 'is-empty')} disabled={!c && !can.edit}
                    aria-label={`${rowName(r.asset)} — ${columns[i]}: ${c ? c.word : 'not added yet'}`}
                    onClick={() => (c ? openRecord(project.id, c.test.id)
                      : void add([{ title: columns[i], assetId: r.asset?.id }], `Added “${columns[i]}” to ${rowName(r.asset)}`))}>
                    <span className="igm-sq" aria-hidden />
                    <span className="igm-name">{columns[i]}</span>
                    <span className="igm-word">{c ? c.word : can.edit ? '+ add' : 'not added yet'}{c && runShort(c.test) ? ` · ${runShort(c.test)}` : ''}</span>
                  </button>
                ))}
                {r.programs && (
                  <button className={'igm-st' + (r.programs.proved === r.programs.total ? ' is-done' : r.programs.wrong ? ' is-late' : '')}
                    onClick={() => document.getElementById('cm-programs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                    <span className="igm-sq" aria-hidden />
                    <span className="igm-name">Programs</span>
                    <span className="igm-word">{r.programs.proved} of {r.programs.total} proved{r.programs.wrong ? ` · ${r.programs.wrong} gone wrong` : ''}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div className="ig-wrap">
        <table className="ig-grid cg-grid">
          <thead>
            <tr>
              <th scope="col" className="ig-corner">Machine</th>
              {columns.map((s, i) => <th key={s} scope="col"><span className={'ig-colh' + (i >= usualCount ? ' cg-extra' : '')} style={{ cursor: 'default' }} title={i >= usualCount ? `${s} — not one of the usual tests` : s}>{shortName(s)}</span></th>)}
              {anyPrograms && <th scope="col"><span className="ig-colh cg-progh" style={{ cursor: 'default' }}>Programs</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.asset?.id ?? 'line'}>
                <th scope="row">
                  <span className="ig-rowh" style={{ cursor: 'default' }}>
                    <b>{rowName(r.asset)}</b>
                    <span>{r.missing === 0 ? `all ${usualCount} usual tests` : `${usualCount - r.missing} of ${usualCount} usual tests`}</span>
                  </span>
                  {can.edit && r.missing > 0 && (
                    <button className="ig-give" onClick={() => void giveAll([r])}>
                      <Icon name="plus" size="1.15em" /> Add {r.missing === usual.stages.length ? `the ${r.missing}` : `the ${r.missing} missing`}
                    </button>
                  )}
                </th>
                {r.cells.map((c, i) => (
                  <td key={columns[i]}>
                    {c ? (
                      <button className={'ig-cell ' + cellClass(c)} title={`${columns[i]} — ${c.word}`}
                        onClick={() => openRecord(project.id, c.test.id)}>
                        {c.word}
                        {/* A run at a rate says what it netted against what
                            was agreed, on its square (lib/run). */}
                        {runShort(c.test) && <span className="cg-run">{runShort(c.test)}</span>}
                      </button>
                    ) : can.edit ? (
                      <button className="ig-cell is-empty" aria-label={`Add “${columns[i]}” to ${rowName(r.asset)}`}
                        onClick={() => void add([{ title: columns[i], assetId: r.asset?.id }], `Added “${columns[i]}” to ${rowName(r.asset)}`)}>+</button>
                    ) : <span className="ig-cell is-empty cg-none">not added yet</span>}
                  </td>
                ))}
                {anyPrograms && (
                  <td>
                    {r.programs ? (
                      <button className={'ig-cell cg-prog' + (r.programs.proved === r.programs.total ? ' is-done' : r.programs.wrong ? ' is-late' : '')}
                        title={programsWords(r.programs)}
                        onClick={() => document.getElementById('cm-programs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                        <span>{r.programs.proved} of {r.programs.total} proved</span>
                        {r.programs.wrong > 0 && <b className="pt-late">{r.programs.wrong} gone wrong</b>}
                      </button>
                    ) : <span className="ig-cell is-empty cg-none">none</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      <p className="sub tw-note cg-key">
        Tap a square to open its test · <b>+</b> adds it to that machine · every test here is on the plan and the client report
      </p>
    </section>
  );
}

/* THE PROGRAMS, PROVED HERE. Each program on the job not yet proved, with
 * the test that proves it: open it, or plan one. Passing that test proves the
 * program on the day it ran (lib/programs programAfterTest) — the Programs
 * page, Set up's "Programs loaded" and the report all read the same row. */
export function ProgramsToProve({ project, tt, programs, can }: { project: Project; tt: TT; programs: Program[]; can: Can }) {
  const today = todayISO();
  const list = programsToProve(programs, tt.tests, today);
  const proved = programs.filter(p => !p.deletedAt).length - list.length;
  if (!programs.some(p => !p.deletedAt)) return null;
  const machine = (id?: string) => tt.assets.find(a => a.id === id)?.name ?? 'The line';
  const planFor = async (ps: Program[]) => {
    const ids = await tt.planTests(ps.map(p => ({
      title: provingTitle(p), assetId: p.assetId,
      extra: { programId: p.id, ...(p.runs ? { planned: p.runs } : {}), ...(p.testOn ? { plannedFor: p.testOn } : {}), ...(p.from ? { withWhom: p.from } : {}) },
    })));
    if (ids.length === 1) openRecord(project.id, ids[0]);
    else if (ids.length) offerUndo(`Planned ${ids.length} program tests`, async () => { for (const id of ids) await deleteTest(id, project.id); });
  };
  const untested = list.filter(x => !x.test).map(x => x.program);
  return (
    <section className="cmp-sec cg-progs" id="cm-programs">
      <div className="cw-sec-h">
        <h2 className="cmp-h">Programs to prove</h2>
        <span className="cmp-h-n">{list.length ? `${list.length} to prove · ${proved} proved` : `all ${proved} proved`}</span>
        <button className="cw-link" onClick={() => nav(`/project/${project.id}/programs`)}>Programs</button>
      </div>
      <p className="sub tw-note">Loaded at Set up, proved here. Passing a program’s test marks it proved on the day it ran; a fail puts it back to on the machine.</p>
      {list.length > 0 && (
        <ul className="cg-plist">
          {list.map(({ program: p, test, tone, word }) => (
            <li key={p.id} className="cg-prow">
              <span className="cg-pwhat"><b>{p.what}</b><span className="sub"> {machine(p.assetId)}{p.runs ? ` · runs ${p.runs}` : ''}{p.from ? ` · from ${p.from}` : ''}</span></span>
              <span className={'cg-pstate is-' + tone}>{word}</span>
              {test
                ? <button className="cw-link" onClick={() => openRecord(project.id, test.id)}>Open its test</button>
                : can.edit && <button className="cw-link" onClick={() => void planFor([p])}>Plan its test</button>}
            </li>
          ))}
        </ul>
      )}
      {can.edit && untested.length > 1 && (
        <button className="cw-add" onClick={() => void planFor(untested)}>
          <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Plan a test for each of the {untested.length} with none
        </button>
      )}
    </section>
  );
}
