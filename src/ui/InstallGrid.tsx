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
import { StageStory } from './StageStory';
import { ProblemForm, WhyMoved, followingSummary, recordMove, recordProblem, type Following, type ProblemFill, type WhyAnswer } from './WhyMoved';
import { movedLater } from '../lib/story';
import { MachineCard } from '../screens/TestsScreen';
import type { Project } from '../types';
import { ASSET_STATE_WORD, assetStateOf, assetStateOn, hasRun, isSettled, live, plannedEnd, type Asset, type StepGate, type Test } from '../lib/testing';
import { niceDay, todayISO } from '../lib/weeks';
import { offerUndo } from './Undo';
import { VoiceNote, VoiceReview } from './Voice';
import { contextFor, proposalFrom, type VoiceResult } from '../lib/voice';
import type { useTesting } from '../lib/useTesting';
import { Icon } from './Icon';
import { can as canOf, type Can } from '../lib/access';

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

/** What a stage says on a phone card, where a whole line has room for the
 *  words a square has to shorten: "done 27 Sept", "late · was 3 Oct". */
function stageWord(s: StepView): string {
  const t = s.step;
  switch (s.tone) {
    case 'done': return t.ranOn ? `done ${short(t.ranOn)}` : 'done';
    case 'problem': return s.late ? 'a problem · late' : 'a problem';
    case 'asking': return 'done? — say so';
    case 'late': return `late · was ${short(plannedEnd(t))}`;
    default: return spanShort(t.plannedFor, plannedEnd(t)) || 'no day yet';
  }
}

/** A phone, by the same width the folds and the plan use (ui/Fold, ui/Gantt),
 *  kept up to date when the phone turns. */
function usePhone(): boolean {
  const q = '(max-width: 640px)';
  const [phone, setPhone] = useState(() => { try { return window.matchMedia(q).matches; } catch { return false; } });
  useEffect(() => {
    let m: MediaQueryList;
    try { m = window.matchMedia(q); } catch { return; }
    const on = () => setPhone(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return phone;
}

/** What a cell says, in as few characters as will do. */
function cellWord(s: StepView): string {
  const t = s.step;
  switch (s.tone) {
    case 'done': return t.ranOn ? short(t.ranOn) : 'Done';
    /* Both facts, when both are true — a problem past its finish is late too. */
    case 'problem': return s.late ? 'Problem · late' : 'Problem';
    case 'asking': return 'Done?';
    case 'late': return 'Late';
    /* No day yet: grey, and the one that is next says so in words — the
       colour rules keep indigo for a day that is booked (still ahead). */
    default: { const on = spanShort(t.plannedFor, plannedEnd(t)); return on || (s.next ? 'Next' : '—'); }
  }
}

export function InstallGrid({ tt, project, stages, otherName, gate = 'install', can = canOf('owner') }: {
  tt: TT; project: Project;
  /** What this person may do here (lib/access): a client reads the grid and
   *  opens a step; the team does the work but removes nothing. */
  can?: Can;
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
  /* false: the stage sheet; true: Hit a problem, empty; filled: from a voice note. */
  const [problem, setProblem] = useState<boolean | ProblemFill>(false);
  /* The stage sheet's dates and who, opened from "Change dates or who". */
  const [planning, setPlanning] = useState(false);
  const phone = usePhone();

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
  const nothingDone = grid.rows.every(r => r.cells.every(c => !c || !isSettled(c.step)));
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
          <UsualStages project={project} usual={stages} otherName={otherName} tests={tt.tests} gate={gate} can={can}
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
        if (!can.edit) return null;
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
        : t.outcome === 'failed' ? `Hit a problem${t.ranOn ? ` ${short(t.ranOn)}` : ''}${s.late ? ' · late' : ''}`
          : t.outcome === 'notRun' ? 'Did not happen'
            : t.outcome === 'planned' && t.ranOn ? 'Worked on — not called yet' : 'Not done yet';
      const backWord = t.outcome === 'passed' ? 'Not done after all — put it back'
        : t.outcome === 'failed' ? 'Not a problem after all — put it back'
          : 'Put it back to planned';
      return (
        <Sheet title={`${rowName(row.asset)} — ${t.title}`}
          sub={[stateWord, t.withWhom || 'nobody named', plannedEnd(t) ? `planned ${spanShort(t.plannedFor, plannedEnd(t))}` : 'no day yet'].join(' · ')}
          onClose={() => { setOpen(null); setProblem(false); setPlanning(false); }}>
          {/* A CLIENT READS where it stands (the line above), what happened to
              it, and opens the step. */}
          {!can.edit ? <>
            <StageStory stepId={t.id} tt={tt} can={can} projectId={projectId} />
            <button className="cw-link" onClick={() => openStep(t.id)}>Open the step — pictures, what was found, fixes ›</button>
          </> : <>
          {/* HIT A PROBLEM, answered here: what, the pictures, whether it pushes
              the finish and to when, a fix. The plan hears all of it. */}
          {problem ? (
            <ProblemForm step={t} tests={tt.tests} assets={tt.assets} initial={typeof problem === 'object' ? problem : undefined} onCancel={() => setProblem(false)}
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
          <SayStep step={t} tt={tt} onDone={() => setOpen(null)} onProblem={f => setProblem(f)} />
          {/* WHAT HAPPENED TO IT — each problem with its pictures and the fix
              it booked, here where the problem was written (ui/StageStory).
              Rowland: "I marked it as a fix … it's just lost." */}
          <StageStory stepId={t.id} tt={tt} can={can} projectId={projectId} />
          {/* THE PLANNING, BEHIND ONE BUTTON. Rowland, 5 October, on the phone:
              "too much on a screen." The sheet opened on the floor's three
              actions and then a start, a finish and who, each with its own
              Save — three Saves on one sheet. The dates and who are what was
              planned, said in the line under the title; changing them is one
              tap away, and one Save keeps both (and asks why when the finish
              moves later, as before). */}
          {planning ? (
            <DatesForm key={t.id} start={t.plannedFor} finish={t.plannedTo} was={plannedEnd(t)}
              who={{ names, value: t.withWhom ?? '' }}
              following={end => followingSummary(t, tt.tests, end)}
              onMove={(from, to, a, who) => {
                void (async () => {
                  await moveWithWhy([t], from, to, a, `${t.title} moved to ${short(to ?? from)} — reason kept${a.fix ? ', fix booked' : ''}${who !== undefined ? ` · ${who || 'nobody named'}` : ''}`);
                  if (who !== undefined) await tt.patchTest(t.id, { withWhom: who || undefined });
                })();
                setPlanning(false); setOpen(null);
              }}
              onSave={(from, to, who) => {
                const dates = from !== t.plannedFor || to !== t.plannedTo;
                void change([t], () => ({ plannedFor: from, plannedTo: to, ...(who !== undefined ? { withWhom: who || undefined } : {}) }),
                  [dates ? `${t.title} ${from ? (to && to > from ? `planned ${short(from)} to ${short(to)}` : `planned ${short(from)}`) : 'has no dates'}` : t.title,
                    who !== undefined ? (who || 'nobody named') : ''].filter(Boolean).join(' — '));
                setPlanning(false); setOpen(null);
              }}
              onCancel={() => setPlanning(false)} />
          ) : (
            <button className="btn btn-ghost ig-plan-go" onClick={() => setPlanning(true)}>Change dates or who</button>
          )}
          <button className="cw-link" onClick={() => openStep(t.id)}>Open the step — pictures, what was found, fixes ›</button>
          </>}
          </>}
        </Sheet>
      );
    }
    if (open.t === 'col') {
      if (!can.edit) return null;
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
            {fresh.length > 0 && can.remove && (
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
    /* A CLIENT READS the machine — who supplied it and where it has got to. */
    if (!can.edit) {
      const a = row.asset;
      const on = a ? assetStateOn(a) : undefined;
      return (
        <Sheet title={rowName(a)} sub={row.view.says} onClose={() => setOpen(null)}>
          {a && <p className="sub">{a.oem && <>{a.oem} · </>}{ASSET_STATE_WORD[assetStateOf(a)]}{on && (assetStateOf(a) === 'awaited' ? ` — due ${short(on)}` : ` since ${short(on)}`)}</p>}
        </Sheet>
      );
    }
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
            save={tt.saveAsset} remove={can.remove ? async id => { await tt.removeAsset(id); setOpen(null); } : undefined} />
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

  /* ON A PHONE, ONE CARD PER MACHINE, ITS STAGES DOWN THE CARD. Rowland, 5
     October, on the phone: "too much on a screen ... difficult to get access
     to things." The grid was a table you swiped sideways: one and a half
     stages of each machine on the screen, the rest off the edge, and squares
     shortened to a date. Down the card every stage is on the screen, each
     saying its state in words beside its colour. The same rows, the same
     sheets: a stage opens the sheet a square opens, the machine's name the
     machine's, a stage's name above the cards does it for every machine. The
     laptop keeps the grid. */
  const phoneCards = () => (
    <div className="igm">
      {grid.rows.map((r, ri) => (
        <div key={r.asset?.id ?? 'line'} className="igm-card">
          <button className="igm-h" onClick={() => setOpen({ t: 'row', row: ri })}>
            <b>{rowName(r.asset)}</b>
            {r.asset?.oem && <span className="sub">{r.asset.oem}</span>}
          </button>
          {r.view.total === 0 && isIn(r.asset) ? (
            <span className="ig-in">
              {r.asset && `${ASSET_STATE_WORD[assetStateOf(r.asset)]}${assetStateOn(r.asset) ? ` since ${short(assetStateOn(r.asset))}` : ''} — no install steps kept`}
            </span>
          ) : r.view.total === 0 && !can.edit ? (
            <span className="ig-in">No stages added yet</span>
          ) : r.view.total === 0 ? (
            <button className="ig-give" onClick={() => void giveStages([r])}><Icon name="plus" size="1.15em" /> Add the {usual.length} stages</button>
          ) : (
            <>
              <div className="igm-list">
                {r.cells.map((cs, ci) => (
                  <button key={ci}
                    className={'igm-st' + (cs ? ` is-${cs.tone}${cs.tone === 'ahead' && cs.step.plannedFor ? ' is-booked' : ''}` : ' is-empty')}
                    onClick={() => setOpen({ t: 'cell', row: ri, col: ci })}
                    disabled={!cs && !can.edit}
                    /* Named as the square is named on the laptop — machine,
                       stage and state — for a screen reader, and so the two
                       layouts are the same control by name. */
                    aria-label={`${rowName(r.asset)} — ${grid.columns[ci]}: ${cs ? cellWord(cs) : 'not added yet'}`}>
                    <span className="igm-sq" aria-hidden />
                    <span className="igm-name">{grid.columns[ci]}{cs?.next && <span className="igm-next">Next</span>}</span>
                    <span className="igm-word">{cs ? stageWord(cs) : can.edit ? '+ add' : 'not added yet'}</span>
                  </button>
                ))}
              </div>
              <span className="ig-says">
                {r.view.says}
                {r.view.ready && r.asset && can.edit && (
                  <button className="cw-link" onClick={() => { if (r.asset) void markInstalled(r.asset); }}>Mark it installed today</button>
                )}
              </span>
            </>
          )}
        </div>
      ))}
      {/* Below the machines, not above them: what is done for every machine
          at once is the less common job, and the cards are what you came for. */}
      <div className="igm-all">
        <button className="cw-link" onClick={() => setOpen({ t: 'stages' })}>{can.agree ? 'Edit the stages' : 'The stages'}</button>
        {can.edit && grid.columns.length > 0 && <>
          <span className="sub">For every machine:</span>
          {grid.columns.map((c, i) => <button key={c} className="igm-chip" onClick={() => setOpen({ t: 'col', col: i })}>{c}</button>)}
        </>}
      </div>
    </div>
  );

  return (
    <section className="ig">
      {/* How the grid is worked is said while nothing on it is done yet; once
          a square is done the grid has been used and the line is in the way.
          The offer to give new machines their stages is an action, and stays. */}
      {(nothingDone || (bare.length > 1 && can.edit)) && <p className="sub ig-hint">
        {nothingDone && (can.edit
          ? phone ? 'Tap a stage to mark it done or plan it. Tap a machine’s name to do it for all its stages.'
            : 'Tap a square to mark it done or plan it. Tap a stage name or a machine to do it for all of them.'
          : phone ? 'Tap a stage to read it, or a machine’s name to read where it has got to.'
            : 'Tap a square to read its step, or a machine to read where it has got to.')}
        {bare.length > 1 && can.edit && (
          <> <button className="cw-link" onClick={() => void giveStages(bare)}>Give the {bare.length} new machines the {usual.length} stages</button></>
        )}
      </p>}
      {phone ? phoneCards() : (
      <div className="ig-wrap">
        <table className="ig-grid">
          <thead>
            <tr>
              <th scope="col" className="ig-corner">
                {/* The stages themselves are edited here, where they are read. */}
                <button className="ig-colh ig-edit" onClick={() => setOpen({ t: 'stages' })}>Machine · <u>{can.agree ? 'edit stages' : 'the stages'}</u></button>
              </th>
              {grid.columns.map((c, i) => (
                <th key={c} scope="col">
                  {/* A client has nothing to do for a whole stage: its name, read. */}
                  {can.edit
                    ? <button className="ig-colh" onClick={() => setOpen({ t: 'col', col: i })}>{c}</button>
                    : <span className="ig-colh" style={{ cursor: 'default' }}>{c}</span>}
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
                  ) : r.view.total === 0 && !can.edit ? (
                    <td colSpan={grid.columns.length}><span className="ig-in">No stages added yet</span></td>
                  ) : r.view.total === 0 ? (
                    /* A machine with no stages yet: one button, not six empty
                       squares asking the same question six times. */
                    <td colSpan={grid.columns.length}>
                      <button className="ig-give" onClick={() => void giveStages([r])}><Icon name="plus" size="1.15em" /> Add the {usual.length} stages</button>
                    </td>
                  ) : r.cells.map((s, ci) => (
                    <td key={ci}>
                      <button className={'ig-cell' + (s ? ` is-${s.tone}${s.next ? ' is-next' : ''}${s.tone === 'ahead' && s.step.plannedFor ? ' is-booked' : ''}` : ' is-empty')}
                        onClick={() => setOpen({ t: 'cell', row: ri, col: ci })}
                        disabled={!s && !can.edit}
                        aria-label={`${rowName(r.asset)} — ${grid.columns[ci]}: ${s ? cellWord(s) : 'not added yet'}`}>
                        {s ? cellWord(s) : can.edit ? '+' : ''}
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
                      {r.view.ready && r.asset && can.edit && (
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
      )}
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
export function DatesForm({ start, finish, was, onSave, onMove, following, who, onCancel }: {
  start?: string; finish?: string;
  /** What follows on the machine, for a finish this late — the knock-on. */
  following?: (end: string) => Following;
  /** The finish it has now — a push past it asks why. */
  was?: string;
  /** Who is doing it, in the same form and kept by the same Save (the stage
   *  sheet). The third argument of each save is the new name when it changed. */
  who?: { names: string[]; value: string };
  onSave: (from: string | undefined, to: string | undefined, who?: string) => void;
  onMove: (from: string, to: string | undefined, a: WhyAnswer, who?: string) => void;
  /** A way to close it without saving, where it was opened on purpose. */
  onCancel?: () => void;
}) {
  const [from, setFrom] = useState(start ?? '');
  const [to, setTo] = useState(finish ?? '');
  const [name, setName] = useState(who?.value ?? '');
  const [asking, setAsking] = useState(false);
  const whoNow = who && name.trim() !== who.value.trim() ? name.trim() : undefined;
  const changed = from !== (start ?? '') || to !== (finish ?? '') || whoNow !== undefined;
  const end = from ? (to || from) : undefined;
  if (asking && was && end) {
    return <WhyMoved from={was} to={end} following={following?.(end)} onCancel={() => setAsking(false)} onSave={a => onMove(from, to || undefined, a, whoNow)}
      onSkip={() => onSave(from || undefined, from ? (to || undefined) : undefined, whoNow)} />;
  }
  /* A FORM, so Enter in a date box saves, as it does in "Who is doing it"
     beside it. On a laptop the dates were the one pair Enter did nothing in. */
  return (
    <form className="ig-plan" onSubmit={e => {
      e.preventDefault();
      if (!changed) return;
      /* PUSHED LATER? Then it asks why before anything is kept. */
      if (movedLater(was, end)) { setAsking(true); return; }
      onSave(from || undefined, from ? (to || undefined) : undefined, whoNow);
    }}>
      <div className="ig-dates">
        <label className="cw-f ig-f"><span>Starts</span>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); if (to && e.target.value > to) setTo(''); }} /></label>
        <label className="cw-f ig-f"><span>Finishes <span className="cw-f-opt">blank = one day</span></span>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        {!who && <button className="btn btn-primary" type="submit" disabled={!changed}>Save</button>}
      </div>
      {who && <>
        <label className="cw-f ig-f"><span>Who is doing it</span>
          <input list="ig-names" value={name} onChange={e => setName(e.target.value)} placeholder="Brillopak fitter, site electrician…" /></label>
        <datalist id="ig-names">{who.names.map(n => <option key={n} value={n} />)}</datalist>
      </>}
      {movedLater(was, end) && <p className="sub ig-why-note">That is later than it was ({short(was)}) — Save will ask why.</p>}
      {who && (
        <span className="ig-plan-acts">
          <button className="btn btn-primary" type="submit" disabled={!changed}>Save</button>
          {onCancel && <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>}
        </span>
      )}
    </form>
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
  /* A form for the same reason as DatesForm: Enter saves. */
  return (
    <form className="ig-plan" onSubmit={e => {
      e.preventDefault();
      if (!from) return;
      if (push.n > 0 && onMove) { setAsking(true); return; }
      onPlan(from, to || undefined); setFrom(''); setTo('');
    }}>
      <span className="ig-plan-l">{label}</span>
      <div className="ig-dates">
        <label className="cw-f ig-f"><span>Starts</span>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); if (to && e.target.value > to) setTo(''); }} /></label>
        <label className="cw-f ig-f"><span>Finishes</span>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        <button className="btn" type="submit" disabled={!from}>{saveLabel}</button>
      </div>
      {push.n > 0 && <p className="sub ig-why-note">That pushes {push.n === 1 ? 'one machine' : `${push.n} machines`} later than planned — Save will ask why.</p>}
    </form>
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

/** Say how a step went, from the square itself — into the boxes this sheet
 *  and its step already have (Rowland, 4 October: "where I'm saying should
 *  make sense to put … not build anything new"). Done, the day, who and what
 *  was done are shown, then put in. Said that it hit a problem, the "Hit a
 *  problem" sheet opens with its boxes filled from the note (onProblem), so
 *  the finish, the reason and the fix are kept the way that sheet keeps them.
 *  Nothing said is lost: what did not fit a box is in "What was done"
 *  (lib/voice proposalFrom), and the words can be put right before they go in. */
function SayStep({ step, tt, onDone, onProblem }: { step: Test; tt: TT; onDone: () => void; onProblem: (f: ProblemFill) => void }) {
  const [heard, setHeard] = useState<VoiceResult | null>(null);
  const today = todayISO();
  if (!heard) {
    return <VoiceNote form="install" label="Say how it went" context={() => contextFor(tt.assets, tt.tests, today, step)}
      onHeard={r => {
        if (r.fields.outcome === 'failed') {
          const said = [typeof r.fields.result === 'string' ? r.fields.result : '', r.leftover ?? ''].map(x => x.trim()).filter(Boolean).join(' ') || r.transcript.trim();
          const to = typeof r.fields.plannedFor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.fields.plannedFor) ? r.fields.plannedFor : '';
          onProblem({ why: said, to, fix: false, fixOn: '', said: r.transcript });
          return;
        }
        setHeard(r);
      }} />;
  }
  const { changes, notes } = proposalFrom(step, heard, tt.assets, today);
  return (
    <VoiceReview heard={heard}
      rows={[
        ...changes.map(c => ({ key: c.key, label: c.label, before: c.before, after: c.after, editable: c.key === 'result' })),
        ...(notes.length ? [{ key: 'found', label: notes.length === 1 ? 'Found doing it' : `Found doing it — ${notes.length} things`, after: notes.map(n => n.what).join('\n') }] : []),
      ]}
      onApply={(keys, edits) => void (async () => {
        const picked = changes.filter(c => keys.includes(c.key));
        const patch = Object.assign({}, ...picked.map(c => c.patch)) as Partial<Test>;
        if (keys.includes('result') && edits.result != null) patch.result = edits.result.trim() || undefined;
        const before = Object.fromEntries(Object.keys(patch).map(k => [k, step[k as keyof Test]])) as Partial<Test>;
        if (Object.keys(patch).length) {
          await tt.patchTest(step.id, patch);
          offerUndo(`${step.title}: put in what you said`, () => tt.patchTest(step.id, before));
        }
        if (keys.includes('found')) {
          for (const [i, n] of notes.entries()) {
            await tt.addItem(step.id, 'found', n.what, { owner: n.owner || undefined, note: i === 0 ? `Said: “${heard.transcript}”` : undefined });
          }
        }
        onDone();
      })()}
      /* What did not fit a box is already in "What was done" (proposalFrom);
         offering it again as a note would say it twice. */
      onLeftover={changes.some(c => c.key === 'result') ? undefined
        : text => void tt.addItem(step.id, 'found', text, { note: `Said: “${heard.transcript}”` })}
      onDiscard={() => setHeard(null)} />
  );
}
