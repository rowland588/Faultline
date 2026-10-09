/* THE USUAL STAGES — what "Add the usual stages" puts on a machine, shown and
 * edited in place on the Install screen.
 *
 * Rowland: "Allow me to edit the 6 install names that you have made as
 * default." Changing them changes what the NEXT machine gets. A step already
 * on a machine is its own record, and is never rewritten behind somebody's
 * back — that would change what the client was already sent.
 *
 * But renaming a stage and leaving its old name on every machine is how the
 * grid grew a seventh column nobody could remove. So a rename ASKS, once,
 * whether the steps already called the old name should take the new one.
 *
 * Taking a stage OUT has the same trap: the list changed, the column stayed,
 * and clearing it was a second job hidden inside the column. So saving a list
 * with a stage missing asks too — take it off the machines as well? — and the
 * only steps it ever removes are ones nobody has touched.
 */
import { useState } from 'react';
import { updateProject } from '../db';
import { offerUndo } from './Undo';
import { SITE_NAME, appStages, cleanStages, keepStages, keepUsualDetails, stageRenames, stepsNamed, usualAgreed, usualKey, usualWith,
  type ListGate, type UsualAgreed, type UsualWith, type usualStages } from '../lib/install';
import { isSettled, type Asset, type Test } from '../lib/testing';
import { isRunTest } from '../lib/run';
import type { Project } from '../types';
import { Icon } from './Icon';
import { can as canOf, type Can } from '../lib/access';

/** One entry's details as typed — who it is with, and (a test) what it
 *  must show, the numbers as typed. */
type Det = { with: UsualWith; passesIf: string; rate: string; minutes: string; rejectsMax: string };

export function UsualStages({ project, usual, otherName, tests = [], renameSteps, extras = [], onMove, onRemove, onDrop, isFresh, gate = 'install', can = canOf('owner'), editing = false, onDone, holder, assets = [], onLines }: {
  /** Saved, or cancelled, in a panel of its own: close it (ui/InstallGrid,
   *  ui/CommissionGrid). Without it the list shows again in place. */
  onDone?: () => void;
  /** Open on the editor (docs/STAGEGATE.md): "Edit the stages" was two doors
   *  — a list to read, then its own "Edit". Whoever may change the list now
   *  lands on the boxes; Cancel shows the list as it is. */
  editing?: boolean;
  /** What this person may do (lib/access). The list is what was AGREED, so
   *  only the owner edits it; the team may still move steps into a stage. */
  can?: Can;
  /** Which gate's list — each is the job's own, edited as freely. Commission's
   *  is its usual TESTS, and says so in every word below. */
  gate?: ListGate;
  project: Project; usual: ReturnType<typeof usualStages>; otherName?: string;
  /** The job's records, to count the steps a rename would touch. */
  tests?: Test[];
  renameSteps?: (pairs: { from: string; to: string }[]) => Promise<void>;
  /** Columns on the grid that are not one of these stages — steps given a
   *  name before the stages changed. Rowland went to "edit stages" to remove
   *  one and it was not there; now it is, with the ways to clear it. */
  extras?: { col: string; n: number; fresh: number }[];
  onMove?: (col: string, target: string) => boolean;
  onRemove?: (col: string, asked?: boolean) => boolean;
  /** Remove every never-started step of these stages, as ONE undo that also
   *  puts the list back — see `save`. */
  onDrop?: (cols: string[], restoreList: () => Promise<void>) => Promise<void>;
  /** Is this step untouched — safe to remove? */
  isFresh?: (t: Test) => boolean;
  /** The job whose list this is (lib/install usualHolder) — who each line is
   *  usually with, and what each usual test must show. */
  holder?: Project;
  /** The machines, to say who a line moved to (its supplier). */
  assets?: Asset[];
  /** Put the lines already on machines in step with what was just agreed —
   *  one write, one Undo (docs/JOBSTART.md). */
  onLines?: (list: { t: Test; patch: Partial<Test> }[], said: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string[] | null>(() => (editing && can.agree ? [...usual.stages] : null));
  /* WHO EACH IS WITH, AND WHAT EACH TEST MUST SHOW (docs/JOBSTART.md) —
     beside each name, kept in step with the names as they are moved. */
  const from = holder ?? project;
  const detOf = (name: string): Det => {
    const a = usualAgreed(from, name);
    const n = (v?: number) => (typeof v === 'number' ? String(v) : '');
    return { with: usualWith(from, gate, name), passesIf: a?.passesIf ?? '', rate: n(a?.runAgreed?.rate), minutes: n(a?.runAgreed?.minutes), rejectsMax: n(a?.runAgreed?.rejectsMax) };
  };
  const [det, setDet] = useState<Det[]>(() => usual.stages.map(detOf));
  const w = gate === 'commission'
    ? { one: 'test', many: 'tests', steps: 'tests', Steps: 'Tests' }
    : { one: 'stage', many: 'stages', steps: 'steps', Steps: 'Steps' };
  /* Renames that have steps on machines still wearing the old name. */
  const [asking, setAsking] = useState<{ from: string; to: string; n: number }[] | null>(null);

  /* Stages taken out of the list that steps on machines still carry. */
  const [dropping, setDropping] = useState<{ col: string; n: number; fresh: number }[] | null>(null);

  const save = async () => {
    if (!draft) return;
    /* What each name now says: who it is with, and (a test) what it must
       show. Kept for this gate's names; the other gates' are left alone. */
    const mine = (k: string) => k.startsWith(`${gate}:`);
    const withMap: Record<string, UsualWith> = Object.fromEntries(Object.entries(project.gateStages?.usualWith ?? {}).filter(([k]) => !mine(k)));
    const agreedMap: Record<string, UsualAgreed> = Object.fromEntries(Object.entries(project.gateStages?.usualAgreed ?? {}).filter(([k]) => !mine(k)));
    const changed: { name: string; was: Det; now: Det }[] = [];
    draft.forEach((raw, i) => {
      const name = raw.trim();
      if (!name) return;
      const d = det[i] ?? detOf(name);
      withMap[usualKey(gate, name)] = d.with;
      if (gate === 'commission') {
        const num = (v: string) => { const x = Number(v); return v.trim() && Number.isFinite(x) ? x : undefined; };
        const run = { rate: num(d.rate), minutes: num(d.minutes), rejectsMax: num(d.rejectsMax) };
        const runAgreed = Object.fromEntries(Object.entries(run).filter(([, v]) => v != null));
        if (d.passesIf.trim() || Object.keys(runAgreed).length) {
          agreedMap[usualKey(gate, name)] = { ...(d.passesIf.trim() ? { passesIf: d.passesIf.trim() } : {}), ...(Object.keys(runAgreed).length ? { runAgreed } : {}) };
        }
      }
      changed.push({ name, was: detOf(name), now: d });
    });
    const after = cleanStages(draft, gate) ?? [...appStages(gate)];
    const renamed = stageRenames(usual.stages, after)
      .map(r => ({ ...r, n: stepsNamed(tests, r.from, gate).length }))
      .filter(r => r.n > 0);
    const key = (x: string) => x.trim().toLowerCase();
    const renamedFrom = new Set(renamed.map(r => key(r.from)));
    const dropped = usual.stages
      .filter(old => !after.some(a => key(a) === key(old)) && !renamedFrom.has(key(old)))
      .map(col => {
        const st = stepsNamed(tests, col, gate);
        return { col, n: st.length, fresh: isFresh ? st.filter(isFresh).length : 0 };
      })
      .filter(d => d.n > 0);
    const listed = { ...project, ...keepStages(project, gate, cleanStages(draft, gate)) };
    await updateProject({ ...listed, ...keepUsualDetails(listed, { usualWith: withMap, usualAgreed: agreedMap }), updatedAt: Date.now() });
    setDraft(null);
    /* THE LINES ALREADY ON MACHINES follow what was just agreed, where they
       still carry what they were given: a line with the supplier moves to
       the site (or back) unless somebody named someone else on it; a test
       with nothing agreed to show takes what its usual test now says. Done
       lines keep theirs — that is what they were done against. */
    if (onLines) {
      const oemOf = (t: Test) => assets.find(a => a.id === t.assetId)?.oem?.trim();
      const whoBy = (w: UsualWith, t: Test) => (w === 'site' ? SITE_NAME : oemOf(t));
      const list: { t: Test; patch: Partial<Test> }[] = [];
      for (const c of changed) {
        for (const t of stepsNamed(tests, c.name, gate).filter(x => !isSettled(x))) {
          const patch: Partial<Test> = {};
          if (c.was.with !== c.now.with && (t.withWhom?.trim() ?? '') === (whoBy(c.was.with, t) ?? '')) {
            const to = whoBy(c.now.with, t);
            if (to) patch.withWhom = to;
          }
          if (gate === 'commission') {
            const a = agreedMap[usualKey(gate, c.name)];
            if (a?.passesIf && !t.passesIf?.trim()) patch.passesIf = a.passesIf;
            if (a?.runAgreed && !Object.values(t.runAgreed ?? {}).some(v => typeof v === 'number') && !t.runs?.length) patch.runAgreed = a.runAgreed;
          }
          if (Object.keys(patch).length) list.push({ t, patch });
        }
      }
      if (list.length) await onLines(list, `${list.length} line${list.length === 1 ? '' : 's'} on the machines brought into line with the list`);
    }
    /* TAKING A STAGE OUT TAKES IT OUT. Rowland, twice: "deleted a stage in
       edits but it never deleted." The first fix asked a second question after
       Save, and a stage stayed on the grid for anybody who missed it or said
       "leave them". Now the stage goes from the list AND the never-started
       steps go from the machines in the same tap, with one Undo that brings
       back both. Only steps with work on them are kept — and the sheet says so. */
    const restoreList = async () => { await updateProject({ ...project, updatedAt: Date.now() }); };
    const gone = usual.stages.filter(old => !after.some(a => key(a) === key(old)) && !renamedFrom.has(key(old)));
    const freshCols = dropped.filter(d => d.fresh > 0).map(d => d.col);
    if (gone.length && freshCols.length && onDrop) await onDrop(freshCols, restoreList);
    else if (gone.length) offerUndo(`Removed ${gone.length === 1 ? `“${gone[0]}”` : `${gone.length} stages`} from the list`, restoreList);
    const kept = dropped.filter(d => d.fresh < d.n);
    if (renamed.length && renameSteps) setAsking(renamed);
    else if (kept.length) setDropping(kept);
    else onDone?.();
  };

  if (dropping) {
    return (
      <section className="in-usual is-asking">
        <div className="in-usual-h"><b>{dropping.length === 1 ? `One ${w.one}` : `${dropping.length} ${w.many}`} still on the machines</b></div>
        <ul className="in-usual-list">
          {dropping.map(d => {
            const worked = d.n - d.fresh;
            return <li key={d.col}>“{d.col}” — {worked === d.n ? '' : `${d.fresh} never started, removed. `}{worked} {worked === 1 ? 'machine has' : 'machines have'} work on it, so {worked === 1 ? 'it was' : 'they were'} kept.</li>;
          })}
        </ul>
        <div className="in-usual-go">
          <button className="btn btn-primary" onClick={() => { setDropping(null); onDone?.(); }}>OK</button>
        </div>
        <p className="sub tw-note">They stay as a column of their own on the grid. Open one to remove it step by step, or clear it from “also on the grid”.</p>
      </section>
    );
  }
  if (asking) {
    return (
      <section className="in-usual is-asking">
        <div className="in-usual-h"><b>Rename the {w.steps} already on machines?</b></div>
        <ul className="in-usual-list">
          {asking.map(r => <li key={r.from}>“{r.from}” → “{r.to}” · on {r.n} machine{r.n === 1 ? '' : 's'}</li>)}
        </ul>
        <div className="in-usual-go">
          <button className="btn btn-primary" onClick={() => void (async () => { await renameSteps?.(asking); setAsking(null); onDone?.(); })()}>Rename them too</button>
          <button className="btn btn-ghost" onClick={() => { setAsking(null); onDone?.(); }}>Keep their old names</button>
        </div>
        <p className="sub tw-note">Keeping them leaves the old name as a column of its own on the grid.</p>
      </section>
    );
  }
  const set = (i: number, v: string) => setDraft(d => (d ? d.map((x, k) => (k === i ? v : x)) : d));
  const setD = (i: number, p: Partial<Det>) => setDet(ds => ds.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const swap = <T,>(a: T[], i: number, j: number): T[] => { const n = [...a]; [n[i], n[j]] = [n[j], n[i]]; return n; };
  const move = (i: number, by: number) => {
    const j = i + by;
    if (!draft || j < 0 || j >= draft.length) return;
    setDraft(d => (d ? swap(d, i, j) : d));
    setDet(ds => swap(ds, i, j));
  };
  const startEditing = (names: string[]) => { setDraft(names); setDet(names.map(detOf)); };

  /* Columns not on the list, with the ways to clear them — shown under the
     list and under the editor alike, so opening on the editor hides nothing. */
  const extraBlock = (
    <>
      {extras.length > 0 && (
        <div className="in-extra">
          <b className="in-extra-h">Also on the grid — not one of these {w.many}</b>
          <p className="sub tw-note">
            {can.agree ? 'Steps given this name before the stages changed. Move them into a stage, remove the ones never started, or keep it as a stage of its own.'
              : can.edit ? 'Steps given this name before the stages changed. Move them into a stage, or leave it for the owner to keep or remove.'
                : 'Steps given this name before the stages changed.'}
          </p>
          {extras.map(x => (
            <div key={x.col} className="in-extra-row">
              <span className="in-extra-n"><b>{x.col}</b> <span className="sub">on {x.n} machine{x.n === 1 ? '' : 's'}</span></span>
              {can.edit && <span className="in-extra-acts">
                <select defaultValue="" aria-label={`Move “${x.col}” into`} onChange={e => { if (e.target.value) onMove?.(x.col, e.target.value); e.target.value = ''; }}>
                  <option value="">Move into…</option>
                  {usual.stages.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {x.fresh > 0 && can.remove && <button className="btn btn-ghost in-extra-b is-bad" onClick={() => onRemove?.(x.col)}>Remove{x.fresh < x.n ? ` ${x.fresh} never started` : ''}</button>}
                {can.agree && <button className="btn btn-ghost in-extra-b" onClick={() => void updateProject({ ...project, ...keepStages(project, gate, cleanStages([...usual.stages, x.col], gate)), updatedAt: Date.now() })}>Make it a stage</button>}
              </span>}
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (!draft) {
    return (
      <section className="in-usual">
        <div className="in-usual-h">
          <b>The usual {w.many}</b>
          <span className="sub">
            {usual.from === 'job' ? 'this job’s own'
              : usual.from === 'other' ? `taken from ${otherName ?? 'another job'}`
                : can.agree ? 'the app’s standard set — make them yours' : 'the app’s standard set'}
          </span>
          {can.agree && <button className="cw-link" onClick={() => startEditing([...usual.stages])}>Edit</button>}
        </div>
        <ol className="in-usual-list">
          {/* Each with who it is usually with, and a test with what it must show. */}
          {usual.stages.map((s, i) => {
            const d = detOf(s);
            return (
              <li key={i}>{s}
                {d.with === 'site' && <span className="sub"> — with the site</span>}
                {gate === 'commission' && d.passesIf.trim() && <span className="sub in-usual-agreed"> — passes if: {d.passesIf.trim()}</span>}
              </li>
            );
          })}
        </ol>
        {extraBlock}
      </section>
    );
  }

  const cleaned = cleanStages(draft, gate) ?? [...appStages(gate)];
  return (
    <section className="in-usual is-editing">
      <div className="in-usual-h"><b>The usual {w.many}</b><span className="sub">in the order they happen</span></div>
      <ol className="in-usual-edit">
        {draft.map((s, i) => {
          const d = det[i] ?? detOf(s);
          return (
            <li key={i}>
              <span className="in-usual-n">{i + 1}</span>
              <input value={s} onChange={e => set(i, e.target.value)} aria-label={`${w.one === 'test' ? 'Test' : 'Stage'} ${i + 1}`}
                placeholder={`Name the ${w.one}`} autoFocus={i === draft.length - 1 && s === ''} />
              <button className="btn btn-ghost in-usual-b" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><Icon name="arrowUp" size="1.1em" /></button>
              <button className="btn btn-ghost in-usual-b" onClick={() => move(i, 1)} disabled={i === draft.length - 1} aria-label="Move down"><Icon name="arrowDown" size="1.1em" /></button>
              <button className="btn btn-ghost in-usual-b" onClick={() => { setDraft(dr => (dr ? dr.filter((_, k) => k !== i) : dr)); setDet(ds => ds.filter((_, k) => k !== i)); }}
                aria-label={`Remove ${s || `this ${w.one}`}`}><Icon name="close" size="1.1em" /></button>
              {/* WHO IT IS USUALLY WITH — what a new line starts as. */}
              <span className="in-usual-det">
                <span className="cw-seg" role="group" aria-label={`${s || `This ${w.one}`} is usually with`}>
                  <button type="button" className={'chip' + (d.with === 'supplier' ? ' on' : '')} aria-pressed={d.with === 'supplier'} onClick={() => setD(i, { with: 'supplier' })}>With the supplier</button>
                  <button type="button" className={'chip' + (d.with === 'site' ? ' on' : '')} aria-pressed={d.with === 'site'} onClick={() => setD(i, { with: 'site' })}>With the site</button>
                </span>
                {/* WHAT IT MUST SHOW — once, for every machine's test. */}
                {gate === 'commission' && (
                  <input className="in-usual-pass" value={d.passesIf} onChange={e => setD(i, { passesIf: e.target.value })}
                    aria-label={`${s || 'This test'} passes if`} placeholder="Passes if — e.g. every e-stop stops it inside 2 s" />
                )}
                {gate === 'commission' && isRunTest({ kind: 'test', title: s }) && (
                  <span className="in-usual-run">
                    <label className="cw-f"><span>Packs a minute</span><input type="number" inputMode="decimal" value={d.rate} onChange={e => setD(i, { rate: e.target.value })} /></label>
                    <label className="cw-f"><span>For minutes</span><input type="number" inputMode="numeric" value={d.minutes} onChange={e => setD(i, { minutes: e.target.value })} /></label>
                    <label className="cw-f"><span>Rejects at most %</span><input type="number" inputMode="decimal" value={d.rejectsMax} onChange={e => setD(i, { rejectsMax: e.target.value })} /></label>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <button className="cw-add" onClick={() => { setDraft(d => (d ? [...d, ''] : d)); setDet(ds => [...ds, { with: 'supplier', passesIf: '', rate: '', minutes: '', rejectsMax: '' }]); }}>
        <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add a {w.one}
      </button>
      <div className="in-usual-go">
        {/* The one thing to press here, so it wears the press colour, as Save does
            on every other sheet. */}
        <button className="btn btn-primary" onClick={() => void save()} disabled={cleaned.length === 0}>
          Save {cleaned.length} {cleaned.length === 1 ? w.one : w.many}
        </button>
        <button className="btn btn-ghost" onClick={() => { setDraft(null); onDone?.(); }}>Cancel</button>
        <button className="cw-link" onClick={() => startEditing([...appStages(gate)])}>Back to the app’s {appStages(gate).length}</button>
      </div>
      <p className="sub tw-note">
        This is what the next machine gets. {w.Steps} already on a machine keep their names — tap one to rename it.
      </p>
      {extraBlock}
    </section>
  );
}
