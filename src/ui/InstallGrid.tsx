/* THE INSTALL GRID — every machine's installation on one screen, captured fast.
 *
 * Rowland: "if you can imagine two, three, four, five assets all being
 * installed, I need to capture each of the six steps within each of them
 * assets. And I need to do it fast."
 *
 * Machines down the side, the job's stages across the top, one cell where they
 * cross. Tap a cell: the step opens in the drawer (ui/RecordDrawer) over the
 * grid — Done today is its first button, so a step is two taps. Tap a STAGE
 * at the top to act on it for every machine at once — plan the day, say who,
 * add it where it is missing. Tap a MACHINE to give it the usual stages or
 * plan everything left on it. Every change can be undone from the toast.
 *
 * Nothing new is stored: a cell is an install step (see lib/testing), read
 * through lib/install's installGrid.
 */
import { Fragment, useEffect, useState } from 'react';
import { deleteTest } from '../db';
import type { Program } from '../lib/programs';
import { doneTodayPatch, foldInto, installGrid, whoFor, lateByWords, stepsNamed, untouched, type StepView, type usualStages } from '../lib/install';
import { UsualStages } from './UsualStages';
import { WhyMoved, changeTests, moveTestsWithWhy, type WhyAnswer } from './WhyMoved';
import { movedLater } from '../lib/story';
import { MachineCard } from '../screens/TestsScreen';
import { DrawerShell } from './DrawerShell';
import type { Project } from '../types';
import { ASSET_STATE_WORD, assetStateOf, assetStateOn, hasRun, isSettled, live, plannedEnd, type Asset, type StepGate, type Test } from '../lib/testing';
import { daysBetween, niceDay, staggered, todayISO } from '../lib/weeks';
import { partsOf, partsSaid } from '../lib/noted';
import { PartsMark } from './StageParts';
import { criticalCount, criticalOn, riskOn } from '../lib/critical';
import { offerUndo } from './Undo';
import { openRecord } from './RecordDrawer';
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
export function stageWord(s: StepView): string {
  const t = s.step;
  switch (s.tone) {
    case 'done': return `${t.ranOn ? `done ${short(t.ranOn)}` : 'done'}${s.lateBy ? ` · ${lateByWords(s.lateBy)}` : ''}`;
    case 'problem': return s.late ? 'a problem · late' : 'a problem';
    case 'asking': return 'done? — say so';
    /* Late because a problem pushed its finish: the day is still to come, so
       it says where it moved to, not "was". */
    case 'late': return `late · ${(plannedEnd(t) ?? '') >= todayISO() ? 'moved to' : 'was'} ${short(plannedEnd(t))}`;
    default: return spanShort(t.plannedFor, plannedEnd(t)) || 'no day yet';
  }
}

/** A phone, by the same width the folds and the plan use (ui/Fold, ui/Gantt),
 *  kept up to date when the phone turns. */
export function usePhone(): boolean {
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
    /* Done after its day says so: "7 Oct · 1 day late". */
    case 'done': return `${t.ranOn ? short(t.ranOn) : 'Done'}${s.lateBy ? ` · ${lateByWords(s.lateBy)}` : ''}`;
    /* Both facts, when both are true — a problem past its finish is late too. */
    case 'problem': return s.late ? 'Problem · late' : 'Problem';
    case 'asking': return 'Done?';
    case 'late': return 'Late';
    /* No day yet: grey, and the one that is next says so in words — the
       colour rules keep indigo for a day that is booked (still ahead). */
    default: { const on = spanShort(t.plannedFor, plannedEnd(t)); return on || (s.next ? 'Next' : '—'); }
  }
}

export function InstallGrid({ tt, project, stages, otherName, gate = 'install', can = canOf('owner'), programs = [], holder }: {
  tt: TT; project: Project;
  /** What this person may do here (lib/access): a client reads the grid and
   *  opens a step; the team does the work but removes nothing. */
  can?: Can;
  /** The job's usual stages, and where they came from — see lib/install. */
  stages: ReturnType<typeof usualStages>;
  otherName?: string;
  /** Which gate this grid is — Install, Set up or Hand over. */
  gate?: StepGate;
  /** The job's programs — what a sign-off says was still open (lib/install
   *  doneTodayPatch). */
  programs?: readonly Program[];
  /** The job whose usual list this is (lib/install usualHolder) — who each
   *  stage is usually with, the supplier or the site. */
  holder?: Project;
}) {
  const projectId = project.id;
  const usual = stages.stages;
  const today = todayISO();
  const grid = installGrid(tt.assets, tt.tests, tt.items, today, usual, gate);
  const [open, setOpen] = useState<Open>(null);
  /* Phone: which machines show their done stages, and the every-machine list. */
  const [showDone, setShowDone] = useState<Set<string>>(new Set());
  const [allOpen, setAllOpen] = useState(false);
  const [stepName, setStepName] = useState('');
  const phone = usePhone();

  if (grid.rows.length === 0) return null;

  /* Everyone named anywhere on the job, for the "who" box. */
  const names = [...new Set([
    ...live(tt.tests).map(t => t.withWhom?.trim()),
    ...live(tt.assets).map(a => a.oem?.trim()),
  ].filter((x): x is string => !!x))].sort();

  const rowName = (a?: Asset) => a?.name ?? 'The line itself';
  /* A step opens in the drawer, over the grid; an empty square opens the
     small sheet that adds the stage to that machine. */
  const openCell = (s: StepView | undefined, row: number, col: number) => (s ? openRecord(projectId, s.step.id) : setOpen({ t: 'cell', row, col }));
  /* A stage's parts of the plan, in a few words — "2 parts · 1 done", and
     "· 1 late" in red when one is (lib/noted partsSaid). Rowland, 6 October:
     "It should appear like a branch ... you can see there's something else there." */
  const partsAt = (s?: StepView) => (s ? partsSaid(partsOf(s.step.id, tt.items), today) : undefined);
  /* AN OPEN CRITICAL PROBLEM on the stage (lib/critical) — "1 critical",
     solid red, on its square and its phone row, as its parts are. */
  const critAt = (s?: StepView) => (s ? criticalOn(s.step.id, tt.items, tt.tests).length : 0);
  const critMark = (n: number) => (n > 0 ? <b className="ig-crit">{criticalCount(n)}</b> : null);
  /* A HIGH RISK on it, amber, when nothing on it is critical. */
  const riskMark = (s?: StepView) => { const n = s ? riskOn(s.step.id, tt.items, tt.tests).length : 0; return n > 0 ? <b className="ig-crit is-risk">{n} high risk</b> : null; };

  /* ---- the writes, each with its own undo (ui/WhyMoved, shared with the drawer) ---- */
  const change = (ts: Test[], patch: (t: Test) => Partial<Test>, said: string) => changeTests(tt, ts, patch, said);
  const pushesOf = (ts: Test[], end: string) => {
    const pushed = ts.filter(t => movedLater(plannedEnd(t), end));
    return { n: pushed.length, was: pushed.map(t => plannedEnd(t) as string).sort().pop() };
  };
  const moveWithWhy = (ts: Test[], from: string, to: string | undefined, a: WhyAnswer, said: string, windowOf?: (t: Test) => { from: string; to?: string }) =>
    moveTestsWithWhy(tt, ts, from, to, a, said, windowOf);
  const add = async (pairs: { title: string; assetId?: string }[], said: string) => {
    if (!pairs.length) return;
    const ids: string[] = [];
    /* Grouped per machine, so each machine's steps are numbered in order. */
    const byMachine = new Map<string | undefined, string[]>();
    for (const p of pairs) byMachine.set(p.assetId, [...(byMachine.get(p.assetId) ?? []), p.title]);
    /* Each starts with who its usual stage is usually with — the machine's
       supplier, or the site for the site's own work (lib/install whoFor). */
    for (const [assetId, titles] of byMachine) {
      const oem = tt.assets.find(a => a.id === assetId)?.oem;
      ids.push(...await tt.planSteps(titles, assetId, gate, title => whoFor(holder ?? project, gate, title, oem)));
    }
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
            holder={holder} assets={tt.assets} onLines={(list, said) => changeTests(tt, list.map(x => x.t), t => list.find(x => x.t.id === t.id)?.patch ?? {}, said)}
            editing onDone={() => setOpen(null)} extras={extras} onMove={moveColumn} onRemove={removeColumn} onDrop={dropColumns}
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
      /* Only an EMPTY square comes here — a step opens in the drawer. */
      const row = grid.rows[open.row];
      const col = grid.columns[open.col];
      if (row.cells[open.col] || !can.edit) return null;
      return (
        <Sheet title={`${rowName(row.asset)} — ${col}`} sub="Not on this machine yet" onClose={() => setOpen(null)}>
          <button className="btn btn-primary ig-big" onClick={() => { void add([{ title: col, assetId: row.asset?.id }], `Added “${col}” to ${rowName(row.asset)}`); setOpen(null); }}>
            Add “{col}” here
          </button>
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
                /* The one write (lib/install doneTodayPatch): a sign-off keeps
                   what each machine still had open. */
                void change(left, cur => doneTodayPatch(cur, { tests: tt.tests, items: tt.items, assets: tt.assets, programs }, today)(cur), `${col} done on ${left.length} machine${left.length === 1 ? '' : 's'}`);
                setOpen(null);
              }}>Done today on {left.length === 1 ? 'the one left' : `all ${left.length} left`}</button>
            )}
          </div>
          {left.length > 0 && (
            <>
              {/* EVERY MACHINE AT ONCE, or ONE AFTER ANOTHER in the order the
                  grid lists them (docs/JOBSTART.md). */}
              <PlanWindow label="Plan it for every machine not done" many={left.length}
                saveLabel="Save" onPlan={(from, to, every) => {
                  const at = new Map(left.map((t, i) => [t.id, i]));
                  void change(left, t => (w => ({ plannedFor: w.from, plannedTo: w.to }))(every ? staggered(from, to, at.get(t.id) ?? 0, every) : { from, to }),
                    `${col} planned on ${left.length} machine${left.length === 1 ? '' : 's'}${every ? `, ${every} day${every === 1 ? '' : 's'} apart` : ''}`);
                  setOpen(null);
                }}
                pushes={end => pushesOf(left, end)}
                onMove={(from, to, a, every) => {
                  const at = new Map(left.map((t, i) => [t.id, i]));
                  void moveWithWhy(left, from, to, a, `${col} moved — reason kept`, every ? t => staggered(from, to, at.get(t.id) ?? 0, every) : undefined);
                  setOpen(null);
                }} />
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
            save={tt.saveAsset} />
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
        {/* REMOVE, IN WORDS AT THE FOOT — where every record keeps its delete
            (ui/RecordDrawer "Delete this stage"). It was a × beside the
            machine's name, while the panel's own × closes it: two × with
            opposite meanings, one of them destructive. Only the owner. */}
        {row.asset && can.remove && (
          <div className="rd-blk">
            <button type="button" className="btn btn-ghost btn-sm cw-del rd-del" onClick={() => {
              const a = row.asset;
              if (!a || !confirm(`Remove “${a.name}”?\n\nIts stages and tests stay — they just stop naming a machine.`)) return;
              void tt.removeAsset(a.id); setOpen(null);
            }}>Remove this machine</button>
          </div>
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
              {/* NORMAL RECEDES (docs/SIMPLE.md): the stages that are done fold
                  into one line — "4 done · 2 of them late" — and the card shows what
                  is still to do or wrong. One tap shows them. */}
              {(() => {
                const doneHere = r.cells.filter(cs => cs?.tone === 'done');
                const lateDone = doneHere.filter(cs => cs?.lateBy).length;
                const key = r.asset?.id ?? 'line';
                return doneHere.length > 1 && (
                  <button className="igm-done" aria-expanded={showDone.has(key)}
                    onClick={() => setShowDone(p => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; })}>
                    <span className="igm-sq" aria-hidden />
                    {/* "4 done · 2 late" read as two late still to do; it
                        meant two of the four were done late (docs/STAGEGATE.md). */}
                    <span>{doneHere.length} done{lateDone ? <> · <b className="ig-late-by">{lateDone === doneHere.length ? (lateDone === 2 ? 'both' : 'all') : lateDone} of them late</b></> : ''}</span>
                    <span className="cw-link">{showDone.has(key) ? 'hide' : 'show'}</span>
                  </button>
                );
              })()}
              <div className="igm-list">
                {r.cells.map((cs, ci) => {
                  if (cs?.tone === 'done' && r.cells.filter(c => c?.tone === 'done').length > 1 && !showDone.has(r.asset?.id ?? 'line')) return null;
                  const ps = partsAt(cs);
                  const crit = critAt(cs);
                  return (
                    <button key={ci}
                      className={'igm-st' + (cs ? ` is-${cs.tone}${cs.tone === 'ahead' && cs.step.plannedFor ? ' is-booked' : ''}` : ' is-empty')}
                      onClick={() => openCell(cs, ri, ci)}
                      disabled={!cs && !can.edit}
                      /* Named as the square is named on the laptop — machine,
                         stage and state — for a screen reader, and so the two
                         layouts are the same control by name. */
                      aria-label={`${rowName(r.asset)} — ${grid.columns[ci]}: ${cs ? cellWord(cs) : 'not added yet'}${ps ? `, ${ps.text}` : ''}${crit ? `, ${criticalCount(crit)}` : ''}`}>
                      <span className="igm-sq" aria-hidden />
                      <span className="igm-name">{grid.columns[ci]}{cs?.next && <span className="igm-next">Next</span>}
                        {crit ? critMark(crit) : riskMark(cs)}
                        <PartsMark said={ps} className="igm-parts" /></span>
                      <span className="igm-word">{cs && cs.tone === 'done' && cs.lateBy ? <>{cs.step.ranOn ? `done ${short(cs.step.ranOn)}` : 'done'} · <b className="ig-late-by">{lateByWords(cs.lateBy)}</b></> : cs ? stageWord(cs) : can.edit ? '+ add' : 'not added yet'}</span>
                    </button>
                  );
                })}
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
        {/* One stage for every machine at once — the less common job, one tap
            away rather than the whole list printed again under the cards. */}
        {can.edit && grid.columns.length > 0 && (allOpen ? <>
          <span className="sub">For every machine:</span>
          {grid.columns.map((c, i) => <button key={c} className="igm-chip" onClick={() => setOpen({ t: 'col', col: i })}>{c}</button>)}
        </> : <button className="cw-link" onClick={() => setAllOpen(true)}>Do a stage for every machine ›</button>)}
      </div>
    </div>
  );

  return (
    <section className="ig">
      {/* ONE SHAPE FOR A GATE (docs/STAGEGATE.md): "Machine by machine", with
          its one way to change the list on the right — as Commission has it.
          It was "Machine · edit stages" in the board's corner on a laptop and
          a link under the cards on a phone. */}
      <div className="cw-sec-h ig-head">
        <h2 className="cmp-h">Machine by machine</h2>
        <button className="cw-link" onClick={() => setOpen({ t: 'stages' })}>{can.agree ? 'Edit the stages' : 'The stages'}</button>
      </div>
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
          <>{nothingDone ? ' ' : ''}{bare.length} machines have none of the stages yet — <button className="cw-link" onClick={() => void giveStages(bare)}>give them all the {usual.length}</button></>
        )}
      </p>}
      {phone ? phoneCards() : (
      <div className="ig-wrap">
        <table className="ig-grid">
          <thead>
            <tr>
              <th scope="col" className="ig-corner">
                {/* The stages are changed from "Edit the stages" above the
                    board — one door, the same place on every gate. */}
                <span className="ig-colh" style={{ cursor: 'default' }}>Machine</span>
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
                  ) : r.cells.map((s, ci) => {
                    const ps = partsAt(s);
                    const crit = critAt(s);
                    return (
                      <td key={ci}>
                        <button className={'ig-cell' + (s ? ` is-${s.tone}${s.next ? ' is-next' : ''}${s.tone === 'ahead' && s.step.plannedFor ? ' is-booked' : ''}` : ' is-empty')}
                          onClick={() => openCell(s, ri, ci)}
                          disabled={!s && !can.edit}
                          aria-label={`${rowName(r.asset)} — ${grid.columns[ci]}: ${s ? cellWord(s) : 'not added yet'}${ps ? `, ${ps.text}` : ''}${crit ? `, ${criticalCount(crit)}` : ''}`}>
                          {s ? <span>{s.tone === 'done' && s.lateBy ? <>{s.step.ranOn ? short(s.step.ranOn) : 'Done'} <b className="ig-late-by">{lateByWords(s.lateBy)}</b></> : cellWord(s)}</span> : can.edit ? '+' : ''}
                          {/* ITS PARTS, A BRANCH UNDER ITS DAY (ui/StageParts). */}
                          {crit ? critMark(crit) : riskMark(s)}
                          <PartsMark said={ps} />
                        </button>
                      </td>
                    );
                  })}
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
  /* THE ONE PANEL (ui/DrawerShell) — a machine, a stage across every
     machine and the stage list open where a stage, a test or a fix opens:
     from the right on a laptop, from the bottom on a phone. It was a box of
     its own in the middle of the page — a third kind of overlay beside the
     drawer and the bottom sheets, and the one the back button walked out of:
     back with a machine open left Install. Now back closes it (`back`), as
     ×, Escape and a tap on the page around it do. */
  return (
    <DrawerShell label={title} onClose={onClose} back>
      <h2 className="rd-title">{title}</h2>
      {sub && <p className="sub ig-sheet-sub">{sub}</p>}
      <div className="ig-sheet-body">{children}</div>
    </DrawerShell>
  );
}

/** A START AND A FINISH for several steps at once, applied together with one
 *  tap so a half-chosen window is never written. Finish empty = one day. */
export function PlanWindow({ label, onPlan, saveLabel = 'Plan', pushes, onMove, many = 0 }: {
  label: string;
  /** `every`: one after another, each machine that many days after the one
   *  before (lib/weeks staggered); absent, every machine on the same days. */
  onPlan: (from: string, to: string | undefined, every?: number) => void; saveLabel?: string;
  /** Which of the steps this would push later, and the latest finish among
   *  them — given the last machine's finish. */
  pushes?: (end: string) => { n: number; was?: string };
  onMove?: (from: string, to: string | undefined, a: WhyAnswer, every?: number) => void;
  /** How many machines it plans: two or more offer "one after another"
   *  (docs/JOBSTART.md) — a line is installed a machine at a time. */
  many?: number;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [asking, setAsking] = useState(false);
  const [seq, setSeq] = useState(false);
  const [gapTyped, setGap] = useState('');
  const span = from ? daysBetween(from, to || from) + 1 : 1;
  const every = seq ? Math.max(1, Math.round(Number(gapTyped) || span)) : undefined;
  const last = from && every ? staggered(from, to || undefined, many - 1, every) : undefined;
  const end = from ? (last ? last.to ?? last.from : to || from) : '';
  const push = end && pushes ? pushes(end) : { n: 0 };
  const clear = () => { setFrom(''); setTo(''); setGap(''); setSeq(false); };
  if (asking && push.was && end && onMove) {
    return <WhyMoved from={push.was} to={end} many={push.n} allowFix={false} onCancel={() => setAsking(false)}
      onSkip={() => { onPlan(from, to || undefined, every); clear(); setAsking(false); }}
      onSave={a => { onMove(from, to || undefined, a, every); clear(); setAsking(false); }} />;
  }
  /* A form, so Enter in a date box saves (as in a record's Edit). */
  return (
    <form className="ig-plan" onSubmit={e => {
      e.preventDefault();
      if (!from) return;
      if (push.n > 0 && onMove) { setAsking(true); return; }
      onPlan(from, to || undefined, every); clear();
    }}>
      <span className="ig-plan-l">{label}</span>
      {many > 1 && (
        <span className="cw-seg ig-seq" role="group" aria-label="Every machine on">
          <button type="button" className={'chip' + (!seq ? ' on' : '')} aria-pressed={!seq} onClick={() => setSeq(false)}>Same days</button>
          <button type="button" className={'chip' + (seq ? ' on' : '')} aria-pressed={seq} onClick={() => setSeq(true)}>One after another</button>
        </span>
      )}
      <div className="ig-dates">
        <label className="cw-f ig-f"><span>{seq ? 'The first starts' : 'Starts'}</span>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); if (to && e.target.value > to) setTo(''); }} /></label>
        <label className="cw-f ig-f"><span>{seq ? 'The first finishes' : 'Finishes'}</span>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        {seq && (
          <label className="cw-f ig-f ig-gap"><span>Days apart</span>
            <input type="number" min={1} inputMode="numeric" value={gapTyped} placeholder={String(span)} onChange={e => setGap(e.target.value)} /></label>
        )}
        <button className="btn" type="submit" disabled={!from}>{saveLabel}</button>
      </div>
      {seq && from && last && (
        <p className="sub ig-why-note">{many} machines in turn, {every} day{every === 1 ? '' : 's'} apart, in the order listed — the last {niceDay(last.from)}{last.to && last.to !== last.from ? `–${niceDay(last.to)}` : ''}.</p>
      )}
      {push.n > 0 && <p className="sub ig-why-note">That pushes {push.n === 1 ? 'one machine' : `${push.n} machines`} later than planned — Save will ask why.</p>}
    </form>
  );
}

/** Who is doing it — typed, or picked from everyone already named on the job. */
export function Who({ names, value, label = 'Who is doing it', onSave }: {
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
