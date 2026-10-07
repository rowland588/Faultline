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
import { commissionGrid, commissionNeeds, programsWords, type CommissionRow, type TestCell } from '../lib/commission';
import { stepsNamed, untouched, usualStages } from '../lib/install';
import { provingTitle, type Program } from '../lib/programs';
import { outcomeWord, type Asset, type Outcome, type Test } from '../lib/testing';
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
  /* Which phone card shows its not-yet-added usual tests, one at a time. */
  const [picking, setPicking] = useState<string | null>(null);
  const rowKey = (r: CommissionRow) => r.asset?.id ?? 'line';
  /* A phone gets a card per machine, its tests down the card with the state
     in words — as Install does; the laptop keeps the grid. */
  const phone = usePhone();
  const today = todayISO();
  const usual = usualStages(project, projects, 'commission');
  const { columns, usualCount, rows } = commissionGrid(tt.assets, tt.tests, programs, usual.stages, today);
  const anyPrograms = rows.some(r => r.programs);
  const anyOthers = rows.some(r => r.others.length > 0);
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
              {/* The tests it has. The usual ones it has not got yet are one
                  line — "Add the 5 missing", or choose which — not five
                  empty rows on every card. */}
              {can.edit && r.missing > 0 && (
                <button className="cw-link igm-pick" onClick={() => setPicking(p => (p === rowKey(r) ? null : rowKey(r)))}>
                  {picking === rowKey(r) ? 'Hide the ones not added' : 'or choose which'}
                </button>
              )}
              <div className="igm-list">
                {r.cells.map((c, i) => (c || (picking === rowKey(r) && i < usualCount && can.edit)) && (
                  <button key={columns[i]} className={'igm-st ' + (c ? cellClass(c) : 'is-empty')} disabled={!c && !can.edit}
                    aria-label={`${rowName(r.asset)} — ${columns[i]}: ${c ? c.word : 'not added yet'}`}
                    onClick={() => (c ? openRecord(project.id, c.test.id)
                      : void add([{ title: columns[i], assetId: r.asset?.id }], `Added “${columns[i]}” to ${rowName(r.asset)}`))}>
                    <span className="igm-sq" aria-hidden />
                    <span className="igm-name">{columns[i]}</span>
                    <span className="igm-word">{c ? c.word : can.edit ? '+ add' : 'not added yet'}{c && runShort(c.test) ? ` · ${runShort(c.test)}` : ''}</span>
                  </button>
                ))}
                {/* This machine's other tests — its own, in its own card. */}
                {r.others.map(o => (
                  <button key={o.test.id} className={'igm-st ' + cellClass(o)} aria-label={`${rowName(r.asset)} — ${o.test.title}: ${o.word}`}
                    onClick={() => openRecord(project.id, o.test.id)}>
                    <span className="igm-sq" aria-hidden />
                    <span className="igm-name">{o.test.title}</span>
                    <span className="igm-word">{o.word}{runShort(o.test) ? ` · ${runShort(o.test)}` : ''}</span>
                  </button>
                ))}
                {r.programs && (
                  <button className={'igm-st' + (r.programs.proved === r.programs.total ? ' is-done' : r.programs.wrong ? ' is-late' : '')}
                    onClick={() => nav(`/project/${project.id}/programs`)}>
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
              {columns.map(s => <th key={s} scope="col"><span className="ig-colh" style={{ cursor: 'default' }} title={s}>{shortName(s)}</span></th>)}
              {anyPrograms && <th scope="col"><span className="ig-colh cg-progh" style={{ cursor: 'default' }}>Programs</span></th>}
              {anyOthers && <th scope="col"><span className="ig-colh cg-extra" style={{ cursor: 'default' }} title="Tests on this machine that are not on the usual list">Its other tests</span></th>}
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
                        onClick={() => nav(`/project/${project.id}/programs`)}>
                        <span>{r.programs.proved} of {r.programs.total} proved</span>
                        {r.programs.wrong > 0 && <b className="pt-late">{r.programs.wrong} gone wrong</b>}
                      </button>
                    ) : <span className="ig-cell is-empty cg-none">none</span>}
                  </td>
                )}
                {/* THIS MACHINE'S OTHER TESTS — its own, in its own row: one
                    small square each, never a column across every machine. */}
                {anyOthers && (
                  <td className="cg-others">
                    {r.others.map(o => (
                      <button key={o.test.id} className={'ig-cell cg-other ' + cellClass(o)} title={`${o.test.title} — ${o.word}`}
                        onClick={() => openRecord(project.id, o.test.id)}>
                        <span className="cg-other-t">{o.test.title}</span>
                        <span className="cg-run">{o.word}{runShort(o.test) ? ` · ${runShort(o.test)}` : ''}</span>
                      </button>
                    ))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      <p className="sub tw-note cg-key">
        Tap a square to open its test · <b>+</b> adds that test to the machine
      </p>
    </section>
  );
}

/* NEEDS YOU — what is owed on Commission, and only that (lib/commission
 * commissionNeeds, docs/SIMPLE.md). Rowland, 7 October: "they want to know the
 * current status ... the failures of why we're not where we should be, and
 * then what we're going to do about it next." Each row says what is wrong,
 * why when the record says, and carries the next move on it: answer the
 * verdict, plan the re-test, plan the program's test, or open it to re-date.
 *
 * It replaces three lists that repeated the board — Next up (every booked
 * test: the indigo squares), Tests so far (every one that ran: the green and
 * red squares, each opening its whole record) and Programs to prove (the
 * programs column, and the Programs page). What was owed in them is here. */
export function NeedsYou({ project, tt, programs, can }: { project: Project; tt: TT; programs: Program[]; can: Can }) {
  const today = todayISO();
  const needs = commissionNeeds(tt.tests, programs, today);
  const machine = (id?: string) => tt.assets.find(a => a.id === id)?.name ?? 'The line';
  const answer = (t: Test, outcome: Outcome) => {
    const before = { outcome: t.outcome, ranOn: t.ranOn };
    void tt.patchTest(t.id, cur => ({ outcome, ranOn: cur.ranOn ?? today }));
    offerUndo(`${t.title} — ${outcomeWord({ kind: 'test', outcome })}`, async () => { await tt.patchTest(t.id, before); });
  };
  const planProgram = async (p: Program) => {
    const [id] = await tt.planTests([{ title: provingTitle(p), assetId: p.assetId,
      extra: { programId: p.id, ...(p.runs ? { planned: p.runs } : {}), ...(p.testOn ? { plannedFor: p.testOn } : {}), ...(p.from ? { withWhom: p.from } : {}) } }]);
    if (id) openRecord(project.id, id);
  };
  return (
    <section className="cmp-sec cg-needs" aria-label="Needs you">
      <div className="cw-sec-h">
        <h2 className="cmp-h">Needs you</h2>
        {needs.length > 0 && <span className="cmp-h-n">{needs.length}</span>}
      </div>
      {needs.length === 0
        ? <p className="sub tw-note">Nothing — every test is passed, booked or still to plan, with nothing late.</p>
        : (
          <ul className="nd-list">
            {needs.map(n => (
              <li key={n.test?.id ?? n.program?.id} className={'nd-row is-' + n.kind}>
                <button type="button" className="nd-main" onClick={() => (n.test ? openRecord(project.id, n.test.id) : nav(`/project/${project.id}/programs`))}>
                  <span className={'nd-tag is-' + n.kind}>{n.word}</span>
                  <b>{n.test?.title ?? n.program?.what}</b>
                  <span className="sub">{machine(n.test?.assetId ?? n.program?.assetId)}{n.why ? ` — ${n.why}` : ''}</span>
                </button>
                {can.edit && n.kind === 'verdict' && n.test && (
                  <span className="nd-acts">
                    <button type="button" className="btn btn-sm" onClick={() => answer(n.test as Test, 'passed')}>Passed</button>
                    <button type="button" className="btn btn-sm ig-bad" onClick={() => answer(n.test as Test, 'failed')}>Didn’t pass</button>
                  </span>
                )}
                {can.edit && n.kind === 'failed' && n.test && (
                  <span className="nd-acts">
                    <button type="button" className="btn btn-sm" onClick={() => void (async () => openRecord(project.id, await tt.planNextFrom(n.test as Test)))()}>Plan the re-test</button>
                  </span>
                )}
                {can.edit && n.kind === 'program' && n.program && (
                  <span className="nd-acts">
                    <button type="button" className="btn btn-sm" onClick={() => void planProgram(n.program as Program)}>Plan its test</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
