/* THE INSTALL GRID — every machine's installation on one screen, captured fast.
 *
 * Rowland: "if you can imagine two, three, four, five assets all being
 * installed, I need to capture each of the six steps within each of them
 * assets. And I need to do it fast."
 *
 * Machines down the side, the job's stages across the top, one cell where they
 * cross. Tap a cell: Done today is the first button, so a step is two taps.
 * Tap a STAGE at the top to act on it for every machine at once — plan the
 * day, say who, add it where it is missing. Tap a MACHINE to give it the
 * usual stages or plan everything left on it. Every change can be undone from
 * the toast, and every cell still opens the step's own page for the detail.
 *
 * Nothing new is stored: a cell is an install step (see lib/testing), read
 * through lib/install's installGrid.
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { deleteTest } from '../db';
import { foldInto, installGrid, stepsNamed, untouched, type StepView, type usualStages } from '../lib/install';
import { UsualStages } from './UsualStages';
import { ProblemForm, WhyMoved, followingSummary, recordMove, recordProblem, type Following, type WhyAnswer } from './WhyMoved';
import { movedLater } from '../lib/story';
import { MachineCard } from '../screens/TestsScreen';
import type { Project } from '../types';
import { ASSET_STATE_WORD, assetStateOf, assetStateOn, hasRun, isSettled, live, plannedEnd, type Asset, type StepGate, type Test } from '../lib/testing';
import { niceDay, todayISO } from '../lib/weeks';
import { offerUndo } from './Undo';
import { VoiceNote, VoiceReview } from './Voice';
import { changesFor, contextFor, type VoiceResult } from '../lib/voice';
import type { useTesting } from '../lib/useTesting';
import { Icon } from './Icon';

type TT = ReturnType<typeof useTesting>;
type Open = { t: 'cell'; row: number; col: number } | { t: 'col'; col: number } | { t: 'row'; row: number } | { t: 'stages' } | null;

const short = (iso?: string) => (iso ? niceDay(iso) : '');

/** A day, or a block of them as the cell can hold it: "9 Oct", "5–9 Oct",
 *  "30 Sep–2 Oct". The start is half of what a block says. */
export function spanShort(from?: string, to?: string): string {
  if (!from) return to ? short(to) : '';
  if (!to || to <= from) return short(from);
  return from.slice(0, 7) === to.slice(0, 7) ? `${Number(from.slice(8))}–${short(to)}` : `${short(from)}–${short(to)}`;
}

/** What a cell says, in as few characters as will do. */
function cellWord(s: StepView): string {
  const t = s.step;
  switch (s.tone) {
    case 'done': return t.ranOn ? short(t.ranOn) : 'Done';
    case 'problem': return 'Problem';
    case 'asking': return 'Done?';
    case 'late': return 'Late';
    default: { const on = spanShort(t.plannedFor, plannedEnd(t)); return on || '—'; }
  }
}

export function InstallGrid({ tt, project, stages, otherName, gate = 'install' }: {
  tt: TT; project: Project;
  /** The job's usual stages, and where they came from — see lib/install. */
  stages: ReturnType<typeof usualStages>;
  otherName?: string;
  /** Which gate this grid is — Install, Set up or Hand over. */
  gate?: StepGate;
}) {
  const projectId = project.id;
  const usual = stages.stages;
  const today = todayISO();
  const grid = installGrid(tt.assets, tt.tests, tt.items, today, usual, gate);
  const [open, setOpen] = useState<Open>(null);
  const [stepName, setStepName] = useState('');
  const [problem, setProblem] = useState(false);

  if (grid.rows.length === 0) return null;

  /* Everyone named anywhere on the job, for the "who" box. */
  const names = [...new Set([
    ...live(tt.tests).map(t => t.withWhom?.trim()),
    ...live(tt.assets).map(a => a.oem?.trim()),
  ].filter((x): x is string => !!x))].sort();

  const rowName = (a?: Asset) => a?.name ?? 'The line itself';
  const openStep = (id: string, problem = false) => nav(`/project/${projectId}/testing/${encodeURIComponent(id)}${problem ? '?problem=1' : ''}`);

  /* ---- the writes, each with its own undo ---- */
  const snapshot = (ts: Test[]) => ts.map(t => ({ id: t.id, outcome: t.outcome, ranOn: t.ranOn, plannedFor: t.plannedFor, plannedTo: t.plannedTo, withWhom: t.withWhom }));
  const change = async (ts: Test[], patch: (t: Test) => Partial<Test>, said: string) => {
    if (!ts.length) return;
    const before = snapshot(ts);
    for (const t of ts) await tt.patchTest(t.id, patch(t));
    offerUndo(said, async () => { for (const b of before) await tt.patchTest(b.id, b); });
  };
  /* A PUSH LATER, KEPT WITH ITS REASON. The dates change, and the reason — its
     words, film and pictures, and a fix if one was booked — is kept on each
     step that moved (lib/story). One Undo takes back all of it. */
  const pushesOf = (ts: Test[], end: string) => {
    const pushed = ts.filter(t => movedLater(plannedEnd(t), end));
    return { n: pushed.length, was: pushed.map(t => plannedEnd(t) as string).sort().pop() };
  };
  const moveWithWhy = async (ts: Test[], from: string, to: string | undefined, a: WhyAnswer, said: string) => {
    const end = to ?? from;
    const before = snapshot(ts);
    const pushed = ts.filter(t => movedLater(plannedEnd(t), end)).map(t => ({ step: t, from: plannedEnd(t) as string, to: end }));
    for (const t of ts) await tt.patchTest(t.id, { plannedFor: from, plannedTo: to });
    const back = await recordMove(tt, pushed, a);
    offerUndo(said, async () => { for (const b of before) await tt.patchTest(b.id, b); await back(); });
  };
  const add = async (pairs: { title: string; assetId?: string }[], said: string) => {
    if (!pairs.length) return;
    const ids: string[] = [];
    /* Grouped per machine, so each machine's steps are numbered in order. */
    const byMachine = new Map<string | undefined, string[]>();
    for (const p of pairs) byMachine.set(p.assetId, [...(byMachine.get(p.assetId) ?? []), p.title]);
    for (const [assetId, titles] of byMachine) ids.push(...await tt.planSteps(titles, assetId, gate));
    offerUndo(said, async () => { for (const id of ids) await deleteTest(id, projectId); });
  };

  /* The machines with no stages at all yet. When there are several, one tap
     gives them all the job's stages — said as exactly that. */
  /* Already in and running before anybody kept install steps — only the
     install gate says so; every gate after it is still to do. */
  const isIn = (a?: Asset) => gate === 'install' && !!a && ['installed', 'running'].includes(assetStateOf(a));
  const bare = grid.rows.filter(r => r.asset && r.view.total === 0 && !isIn(r.asset));
  const giveStages = (rows: typeof grid.rows) => add(
    rows.flatMap(r => usual.map(title => ({ title, assetId: r.asset?.id }))),
    rows.length === 1 ? `Added the ${usual.length} stages to ${rowName(rows[0].asset)}` : `Added the ${usual.length} stages to ${rows.length} machines`);
  const markInstalled = async (a: Asset) => {
    await tt.saveAsset({ ...a, installedOn: today });
    offerUndo(`${a.name} marked installed`, () => tt.saveAsset({ ...a }));
  };

  /* A COLUMN THAT IS NOT ONE OF THE JOB'S STAGES — a name steps were given
     before the stages changed. Cleared from its own heading or from the
     stage editor, by the same two moves. */
  const stepsIn = (col: string) => grid.rows.map(r => r.cells[grid.columns.indexOf(col)]).filter((c): c is StepView => !!c).map(c => c.step);
  const moveColumn = (col: string, target: string): boolean => {
    const { move, clash } = foldInto(stepsIn(col), tt.tests, target, gate);
    if (!move.length) { alert(`Every machine here already has “${target}”. Open the steps to remove or rename them one by one.`); return false; }
    if (clash.length && !confirm(`${move.length} will move into “${target}”. ${clash.length} stay${clash.length === 1 ? 's' : ''} where ${clash.length === 1 ? 'it is' : 'they are'} — ${clash.length === 1 ? 'that machine' : 'those machines'} already ${clash.length === 1 ? 'has' : 'have'} it.`)) return false;
    void (async () => {
      for (const t of move) await tt.patchTest(t.id, { title: target });
      offerUndo(`Moved ${move.length} into “${target}”`, async () => { for (const t of move) await tt.patchTest(t.id, { title: t.title }); });
    })();
    return true;
  };
  const removeColumn = (col: string, asked = false): boolean => {
    const fresh = stepsIn(col).filter(t => untouched(t, tt.tests, tt.items));
    if (!fresh.length || (!asked && !confirm(`Remove “${col}” from ${fresh.length} machine${fresh.length === 1 ? '' : 's'}? None of them was started.`))) return false;
    void (async () => {
      const back: (() => Promise<void>)[] = [];
      for (const t of fresh) back.push(await deleteTest(t.id, projectId));
      offerUndo(`Removed “${col}” from ${fresh.length} machine${fresh.length === 1 ? '' : 's'}`, async () => { for (const r of back) await r(); });
    })();
    return true;
  };
  /* Stages taken out of the list in one go: every never-started step of them
     goes, and ONE undo brings back the steps and the list. */
  const dropColumns = async (cols: string[], restoreList: () => Promise<void>) => {
    const fresh = cols.flatMap(c => stepsIn(c).filter(t => untouched(t, tt.tests, tt.items)));
    if (!fresh.length) return;
    const back: (() => Promise<void>)[] = [];
    for (const t of fresh) back.push(await deleteTest(t.id, projectId));
    offerUndo(`Removed ${cols.length === 1 ? `“${cols[0]}”` : `${cols.length} stages`} and its ${fresh.length} step${fresh.length === 1 ? '' : 's'}`,
      async () => { await restoreList(); for (const r of back) await r(); });
  };
  const extras = grid.columns.slice(usual.length).map(col => {
    const st = stepsIn(col);
    return { col, n: st.length, fresh: st.filter(t => untouched(t, tt.tests, tt.items)).length };
  });

  const sheet = (() => {
    if (!open) return null;
    if (open.t === 'stages') {
      return (
        <Sheet title="The stages" sub="What each machine gets, in the order they happen" onClose={() => setOpen(null)}>
          <UsualStages project={project} usual={stages} otherName={otherName} tests={tt.tests} gate={gate}
            extras={extras} onMove={moveColumn} onRemove={removeColumn} onDrop={dropColumns}
            isFresh={t => untouched(t, tt.tests, tt.items)}
            renameSteps={async (pairs) => {
              const done: { id: string; title: string }[] = [];
              for (const { from, to } of pairs) {
                for (const t of stepsNamed(tt.tests, from, gate)) { await tt.patchTest(t.id, { title: to }); done.push({ id: t.id, title: t.title }); }
              }
              if (done.length) offerUndo(`Renamed ${done.length} step${done.length === 1 ? '' : 's'} to match`, async () => { for (const d of done) await tt.patchTest(d.id, { title: d.title }); });
            }} />
        </Sheet>
      );
    }
    if (open.t === 'cell') {
      const row = grid.rows[open.row];
      const col = grid.columns[open.col];
      const s = row.cells[open.col];
      if (!s) {
        return (
          <Sheet title={`${rowName(row.asset)} — ${col}`} sub="Not on this machine yet" onClose={() => setOpen(null)}>
            <button className="btn btn-primary ig-big" onClick={() => { void add([{ title: col, assetId: row.asset?.id }], `Added “${col}” to ${rowName(row.asset)}`); setOpen(null); }}>
              Add “{col}” here
            </button>
          </Sheet>
        );
      }
      const t = s.step;
      /* WHERE IT STANDS, said first, and the buttons follow from it. The sheet
         used to offer the same three buttons whatever the step was — "Hit a
         problem" on a step that already had one — and never said which state
         it was in, so a step pressed by mistake went red with nothing saying
         how to put it back. Whatever it is, one tap here puts it back. */
      const stateWord = t.outcome === 'passed' ? `Done${t.ranOn ? ` ${short(t.ranOn)}` : ''}`
        : t.outcome === 'failed' ? `Hit a problem${t.ranOn ? ` ${short(t.ranOn)}` : ''}`
          : t.outcome === 'notRun' ? 'Did not happen'
            : t.outcome === 'planned' && t.ranOn ? 'Worked on — not called yet' : 'Not done yet';
      const backWord = t.outcome === 'passed' ? 'Not done after all — put it back'
        : t.outcome === 'failed' ? 'Not a problem after all — put it back'
          : 'Put it back to planned';
      return (
        <Sheet title={`${rowName(row.asset)} — ${t.title}`}
          sub={[stateWord, t.withWhom || 'nobody named', plannedEnd(t) ? `planned ${spanShort(t.plannedFor, plannedEnd(t))}` : 'no day yet'].join(' · ')}
          onClose={() => { setOpen(null); setProblem(false); }}>
          {/* HIT A PROBLEM, answered here: what, the pictures, whether it pushes
              the finish and to when, a fix. The plan hears all of it. */}
          {problem ? (
            <ProblemForm step={t} tests={tt.tests} onCancel={() => setProblem(false)}
              onSave={a => {
                void recordProblem(tt, t, a, `${t.title} hit a problem${a.to && movedLater(plannedEnd(t), a.to) ? ` — finish now ${short(a.to)}` : ''}${a.fix ? ', fix booked' : ''}`);
                setProblem(false); setOpen(null);
              }} />
          ) : <>
          <div className="ig-acts">
            {t.outcome !== 'passed' && (
              <button className="btn btn-primary ig-big" onClick={() => {
                void change([t], cur => ({ outcome: 'passed', ranOn: cur.ranOn ?? today }), `${t.title} done — ${rowName(row.asset)}`);
                setOpen(null);
              }}>Done today</button>
            )}
            {/* A stage can hit more than one problem — the button stays. */}
            <button className="btn ig-big ig-bad" onClick={() => setProblem(true)}>
              {t.outcome === 'failed' ? 'Another problem — write it up' : 'Hit a problem — write it up'}
            </button>
            {(t.outcome !== 'planned' || !!t.ranOn) && (
              <button className="btn btn-ghost ig-big" onClick={() => {
                void change([t], () => ({ outcome: 'planned', ranOn: undefined }), `${t.title} back to planned`);
                setOpen(null);
              }}>{backWord}</button>
            )}
          </div>
          <SayStep step={t} tt={tt} onDone={() => setOpen(null)} />
          {/* A START AND A FINISH, SAVED TOGETHER. Rowland: "it doesn't have a
              save button, and it doesn't close." Two boxes that each wrote the
              moment they changed gave no sign anything was kept and left the
              sheet open. Now they are held until Save, which writes both,
              says so, and closes. Finish empty = one day. */}
          <DatesForm key={t.id} start={t.plannedFor} finish={t.plannedTo} was={plannedEnd(t)}
            following={end => followingSummary(t, tt.tests, end)}
            onMove={(from, to, a) => {
              void moveWithWhy([t], from, to, a, `${t.title} moved to ${short(to ?? from)} — reason kept${a.fix ? ', fix booked' : ''}`);
              setOpen(null);
            }}
            onSave={(from, to) => {
              void change([t], () => ({ plannedFor: from, plannedTo: to }),
                `${t.title} ${from ? (to && to > from ? `planned ${short(from)} to ${short(to)}` : `planned ${short(from)}`) : 'has no dates'}`);
              setOpen(null);
            }} />
          {/* Save closes the sheet, as Done today and the dates do. */}
          <Who names={names} value={t.withWhom ?? ''} onSave={v => { void change([t], () => ({ withWhom: v || undefined }), `${t.title} — ${v || 'nobody named'}`); setOpen(null); }} />
          <button className="cw-link" onClick={() => openStep(t.id)}>Open the step — pictures, what was found, fixes ›</button>
          </>}
        </Sheet>
      );
    }
    if (open.t === 'col') {
      const col = grid.columns[open.col];
      const cells = grid.rows.map(r => r.cells[open.col]);
      const steps = cells.filter((c): c is StepView => !!c).map(c => c.step);
      const left = steps.filter(t => !isSettled(t));
      const lacking = grid.rows.filter((_r, i) => !cells[i]).map(r => ({ title: col, assetId: r.asset?.id }));
      /* NOT ONE OF THE JOB'S STAGES — a name steps were given before the
         stages were edited. Say so, and offer the two ways to clear it: move
         them into a stage, or remove the ones nobody has touched. */
      if (open.col >= usual.length) {
        const fresh = steps.filter(t => untouched(t, tt.tests, tt.items));
        const worked = steps.filter(t => !untouched(t, tt.tests, tt.items));
        return (
          <Sheet title={col} sub={`Not one of the job’s stages · on ${steps.length} machine${steps.length === 1 ? '' : 's'}`} onClose={() => setOpen(null)}>
            <p className="ig-why">
              Steps were given this name before the stages changed, so it shows as a column of its own.
              Move them into one of the stages, or remove the ones never started.
            </p>
            <label className="cw-f ig-f"><span>Move them into</span>
              <select defaultValue="" onChange={e => {
                if (e.target.value && moveColumn(col, e.target.value)) setOpen(null);
              }}>
                <option value="">Choose a stage…</option>
                {usual.map(u => <option key={u} value={u}>{u}</option>)}
              </select></label>
            {fresh.length > 0 && (
              <button className="btn ig-big ig-bad" onClick={() => { if (removeColumn(col)) setOpen(null); }}>Remove from the {fresh.length === 1 ? 'one' : fresh.length} never started</button>
            )}
            {worked.length > 0 && (
              <p className="sub tw-note">
                {worked.length === 1 ? 'One has' : `${worked.length} have`} work on {worked.length === 1 ? 'it' : 'them'} — done, written up or pictured — so {worked.length === 1 ? 'it is' : 'they are'} kept.
                Move {worked.length === 1 ? 'it' : 'them'} into a stage above, or open {worked.length === 1 ? 'it' : 'each'} to decide.
              </p>
            )}
          </Sheet>
        );
      }
      return (
        <Sheet title={col} sub={`${steps.length - left.length} of ${grid.rows.length} machines done`} onClose={() => setOpen(null)}>
          <div className="ig-acts">
            {lacking.length > 0 && (
              <button className="btn btn-primary ig-big" onClick={() => { void add(lacking, `Added “${col}” to ${lacking.length} machine${lacking.length === 1 ? '' : 's'}`); setOpen(null); }}>
                Add to {lacking.length === grid.rows.length ? 'every machine' : `the ${lacking.length} without it`}
              </button>
            )}
            {left.length > 0 && (
              <button className="btn ig-big" onClick={() => {
                if (left.length > 1 && !confirm(`Mark “${col}” done today on ${left.length} machines?`)) return;
                void change(left, cur => ({ outcome: 'passed', ranOn: cur.ranOn ?? today }), `${col} done on ${left.length} machine${left.length === 1 ? '' : 's'}`);
                setOpen(null);
              }}>Done today on {left.length === 1 ? 'the one left' : `all ${left.length} left`}</button>
            )}
          </div>
          {left.length > 0 && (
            <>
              <PlanWindow label="Plan it for every machine not done"
                saveLabel="Save" onPlan={(from, to) => { void change(left, () => ({ plannedFor: from, plannedTo: to }), `${col} planned on ${left.length} machine${left.length === 1 ? '' : 's'}`); setOpen(null); }}
                pushes={end => pushesOf(left, end)}
                onMove={(from, to, a) => { void moveWithWhy(left, from, to, a, `${col} moved — reason kept`); setOpen(null); }} />
              <Who names={names} value="" label="Who is doing it, on every machine not done"
                onSave={v => { if (!v) return; void change(left, () => ({ withWhom: v }), `${col} — ${v}, ${left.length} machine${left.length === 1 ? '' : 's'}`); setOpen(null); }} />
            </>
          )}
        </Sheet>
      );
    }
    const row = grid.rows[open.row];
    const left = row.cells.filter((c): c is StepView => !!c && !isSettled(c.step)).map(c => c.step);
    const missing = grid.columns.slice(0, usual.length).filter((_, i) => !row.cells[i]);
    return (
      <Sheet title={rowName(row.asset)} sub={row.view.says} onClose={() => setOpen(null)}>
        <div className="ig-acts">
          {missing.length > 0 && (
            <button className="btn btn-primary ig-big" onClick={() => {
              void add(missing.map(title => ({ title, assetId: row.asset?.id })), `Added ${missing.length} stage${missing.length === 1 ? '' : 's'} to ${rowName(row.asset)}`);
              setOpen(null);
            }}>Add the {missing.length} missing stage{missing.length === 1 ? '' : 's'}</button>
          )}
          {row.view.ready && row.asset && (
            <button className="btn ig-big" onClick={() => { if (row.asset) void markInstalled(row.asset); setOpen(null); }}>Mark it installed today</button>
          )}
        </div>
        {/* THE MACHINE ITSELF — name, supplier, its four dates, remove. It
            lived on Testing too; Install is where machines live now. */}
        {row.asset && (
          <MachineCard a={row.asset}
            ran={tt.tests.filter(t => t.assetId === row.asset?.id && (t.kind ?? 'test') === 'test' && hasRun(t)).length}
            save={tt.saveAsset} remove={async id => { await tt.removeAsset(id); setOpen(null); }} />
        )}
        {/* A stage of its own, for this machine only — the guard run, the
            conveyor tie-in. */}
        <form className="ig-who" onSubmit={e => {
          e.preventDefault();
          const title = stepName.trim();
          if (!title) return;
          void add([{ title, assetId: row.asset?.id }], `Added “${title}” to ${rowName(row.asset)}`);
          setStepName(''); setOpen(null);
        }}>
          <label className="cw-f ig-f"><span>A step of its own</span>
            <input value={stepName} onChange={e => setStepName(e.target.value)}
              placeholder={gate === 'setup' ? 'Label printer set, date coder checked…' : gate === 'handover' ? 'Lubrication schedule, tool kit…' : 'Guards fitted, conveyor tie-in…'} /></label>
          <button className="btn" type="submit" disabled={!stepName.trim()}>Add</button>
        </form>
        {left.length > 0 && (
          <>
            <PlanWindow label="Plan every step left on it"
              saveLabel="Save" onPlan={(from, to) => { void change(left, () => ({ plannedFor: from, plannedTo: to }), `${rowName(row.asset)}: ${left.length} step${left.length === 1 ? '' : 's'} planned`); setOpen(null); }}
              pushes={end => pushesOf(left, end)}
              onMove={(from, to, a) => { void moveWithWhy(left, from, to, a, `${rowName(row.asset)} moved — reason kept`); setOpen(null); }} />
            <Who names={names} value="" label="Who is doing every step left on it"
              onSave={v => { if (!v) return; void change(left, () => ({ withWhom: v }), `${rowName(row.asset)}: ${v}`); setOpen(null); }} />
          </>
        )}
      </Sheet>
    );
  })();

  return (
    <section className="ig">
      <p className="sub ig-hint">
        Tap a square to mark it done or plan it. Tap a stage name or a machine to do it for all of them.
        {bare.length > 1 && (
          <> <button className="cw-link" onClick={() => void giveStages(bare)}>Give the {bare.length} new machines the {usual.length} stages</button></>
        )}
      </p>
      <div className="ig-wrap">
        <table className="ig-grid">
          <thead>
            <tr>
              <th scope="col" className="ig-corner">
                {/* The stages themselves are edited here, where they are read. */}
                <button className="ig-colh ig-edit" onClick={() => setOpen({ t: 'stages' })}>Machine · <u>edit stages</u></button>
              </th>
              {grid.columns.map((c, i) => (
                <th key={c} scope="col">
                  <button className="ig-colh" onClick={() => setOpen({ t: 'col', col: i })}>{c}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((r, ri) => (
              <Fragment key={r.asset?.id ?? 'line'}>
                <tr className="ig-row">
                  <th scope="row">
                    <button className="ig-rowh" onClick={() => setOpen({ t: 'row', row: ri })}>
                      <b>{rowName(r.asset)}</b>
                      {r.asset?.oem && <span>{r.asset.oem}</span>}
                    </button>
                  </th>
                  {r.view.total === 0 && isIn(r.asset) ? (
                    /* In before anybody kept steps: say so, offer nothing. */
                    <td colSpan={grid.columns.length}>
                      <span className="ig-in">
                        {r.asset && `${ASSET_STATE_WORD[assetStateOf(r.asset)]}${assetStateOn(r.asset) ? ` since ${short(assetStateOn(r.asset))}` : ''} — no install steps kept`}
                      </span>
                    </td>
                  ) : r.view.total === 0 ? (
                    /* A machine with no stages yet: one button, not six empty
                       squares asking the same question six times. */
                    <td colSpan={grid.columns.length}>
                      <button className="ig-give" onClick={() => void giveStages([r])}><Icon name="plus" size="1.15em" /> Add the {usual.length} stages</button>
                    </td>
                  ) : r.cells.map((s, ci) => (
                    <td key={ci}>
                      <button className={'ig-cell' + (s ? ` is-${s.tone}${s.next ? ' is-next' : ''}` : ' is-empty')}
                        onClick={() => setOpen({ t: 'cell', row: ri, col: ci })}
                        aria-label={`${rowName(r.asset)} — ${grid.columns[ci]}: ${s ? cellWord(s) : 'not added'}`}>
                        {s ? cellWord(s) : '+'}
                      </button>
                    </td>
                  ))}
                </tr>
                {/* WHERE IT HAS GOT TO, under its own squares — the sentence the
                    cards used to carry, and the one question it can ask. */}
                {r.view.total > 0 && (
                <tr className="ig-says-row">
                  <td colSpan={grid.columns.length + 1}>
                    <span className="ig-says">
                      {r.view.says}
                      {r.view.ready && r.asset && (
                        <button className="cw-link" onClick={() => { if (r.asset) void markInstalled(r.asset); }}>Mark it installed today</button>
                      )}
                    </span>
                  </td>
                </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {sheet}
    </section>
  );
}

export function Sheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  /* THE SAME CLOSE AS EVERY OTHER SHEET (ui/Sheet): Escape shuts it, and the
     tap that opened it cannot also shut it — on a phone the click that
     follows a touch lands where the finger was, which is now the scrim. */
  const openedAt = useRef(Date.now());
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ig-scrim" onClick={() => { if (Date.now() - openedAt.current > 450) onClose(); }}>
      <div className="ig-sheet" role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="ig-sheet-h">
          <span><b>{title}</b>{sub && <span className="sub">{sub}</span>}</span>
          <button className="ig-x" onClick={onClose} aria-label="Close"><Icon name="close" size="1.1em" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** ONE STEP'S START AND FINISH, held until Save. */
export function DatesForm({ start, finish, was, onSave, onMove, following }: {
  start?: string; finish?: string;
  /** What follows on the machine, for a finish this late — the knock-on. */
  following?: (end: string) => Following;
  /** The finish it has now — a push past it asks why. */
  was?: string;
  onSave: (from: string | undefined, to: string | undefined) => void;
  onMove: (from: string, to: string | undefined, a: WhyAnswer) => void;
}) {
  const [from, setFrom] = useState(start ?? '');
  const [to, setTo] = useState(finish ?? '');
  const [asking, setAsking] = useState(false);
  const changed = from !== (start ?? '') || to !== (finish ?? '');
  const end = from ? (to || from) : undefined;
  if (asking && was && end) {
    return <WhyMoved from={was} to={end} following={following?.(end)} onCancel={() => setAsking(false)} onSave={a => onMove(from, to || undefined, a)}
      onSkip={() => onSave(from || undefined, from ? (to || undefined) : undefined)} />;
  }
  return (
    <div className="ig-plan">
      <div className="ig-dates">
        <label className="cw-f ig-f"><span>Starts</span>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); if (to && e.target.value > to) setTo(''); }} /></label>
        <label className="cw-f ig-f"><span>Finishes <span className="cw-f-opt">blank = one day</span></span>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        <button className="btn btn-primary" type="button" disabled={!changed}
          onClick={() => {
            /* PUSHED LATER? Then it asks why before anything is kept. */
            if (movedLater(was, end)) { setAsking(true); return; }
            onSave(from || undefined, from ? (to || undefined) : undefined);
          }}>Save</button>
      </div>
      {movedLater(was, end) && <p className="sub ig-why-note">That is later than it was ({short(was)}) — Save will ask why.</p>}
    </div>
  );
}

/** A START AND A FINISH for several steps at once, applied together with one
 *  tap so a half-chosen window is never written. Finish empty = one day. */
function PlanWindow({ label, onPlan, saveLabel = 'Plan', pushes, onMove }: {
  label: string; onPlan: (from: string, to: string | undefined) => void; saveLabel?: string;
  /** Which of the steps this would push later, and the latest finish among them. */
  pushes?: (end: string) => { n: number; was?: string };
  onMove?: (from: string, to: string | undefined, a: WhyAnswer) => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [asking, setAsking] = useState(false);
  const end = from ? (to || from) : '';
  const push = end && pushes ? pushes(end) : { n: 0 };
  if (asking && push.was && end && onMove) {
    return <WhyMoved from={push.was} to={end} many={push.n} allowFix={false} onCancel={() => setAsking(false)}
      onSkip={() => { onPlan(from, to || undefined); setFrom(''); setTo(''); setAsking(false); }}
      onSave={a => { onMove(from, to || undefined, a); setFrom(''); setTo(''); setAsking(false); }} />;
  }
  return (
    <div className="ig-plan">
      <span className="ig-plan-l">{label}</span>
      <div className="ig-dates">
        <label className="cw-f ig-f"><span>Starts</span>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); if (to && e.target.value > to) setTo(''); }} /></label>
        <label className="cw-f ig-f"><span>Finishes</span>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        <button className="btn" type="button" disabled={!from}
          onClick={() => {
            if (push.n > 0 && onMove) { setAsking(true); return; }
            onPlan(from, to || undefined); setFrom(''); setTo('');
          }}>{saveLabel}</button>
      </div>
      {push.n > 0 && <p className="sub ig-why-note">That pushes {push.n === 1 ? 'one machine' : `${push.n} machines`} later than planned — Save will ask why.</p>}
    </div>
  );
}

/** Who is doing it — typed, or picked from everyone already named on the job. */
function Who({ names, value, label = 'Who is doing it', onSave }: {
  names: string[]; value: string; label?: string; onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <form className="ig-who" onSubmit={e => { e.preventDefault(); onSave(v.trim()); }}>
      <label className="cw-f ig-f"><span>{label}</span>
        <input list="ig-names" value={v} onChange={e => setV(e.target.value)} placeholder="Brillopak fitter, site electrician…" /></label>
      <datalist id="ig-names">{names.map(n => <option key={n} value={n} />)}</datalist>
      <button className="btn" type="submit" disabled={v.trim() === value.trim()}>Save</button>
    </form>
  );
}

/** Say how a step went, from the square itself — shown, then put in. */
function SayStep({ step, tt, onDone }: { step: Test; tt: TT; onDone: () => void }) {
  const [heard, setHeard] = useState<VoiceResult | null>(null);
  const today = todayISO();
  if (!heard) {
    return <VoiceNote form="install" label="Say how it went" context={() => contextFor(tt.assets, tt.tests, today, step)} onHeard={setHeard} />;
  }
  const changes = changesFor(step, heard.fields, tt.assets, today);
  return (
    <VoiceReview heard={heard}
      rows={changes.map(c => ({ key: c.key, label: c.label, before: c.before, after: c.after }))}
      onApply={keys => void (async () => {
        const picked = changes.filter(c => keys.includes(c.key));
        const patch = Object.assign({}, ...picked.map(c => c.patch)) as Partial<Test>;
        const before = Object.fromEntries(Object.keys(patch).map(k => [k, step[k as keyof Test]])) as Partial<Test>;
        await tt.patchTest(step.id, patch);
        offerUndo(`${step.title}: put in what you said`, () => tt.patchTest(step.id, before));
        onDone();
      })()}
      onLeftover={text => void tt.addItem(step.id, 'found', text, { note: `Said: “${heard.transcript}”` })}
      onDiscard={() => setHeard(null)} />
  );
}
