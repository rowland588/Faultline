/* EDIT — the one door to change a stage, a test or a fix, in its drawer.
 *
 * Rowland, 8 October: "If I'm opening up something, there are multiple doors
 * to edit something." (docs/DOORS.md, slice 2.) The drawer had four: "change"
 * beside the day it was done, "Change the dates or who ›", "Say how it went",
 * and the record's own page. Now its five lines are read at rest and one Edit
 * opens every box the record has, in the order the lines read them — what it
 * is, the plan, who, what was agreed, the day and what was done — with one
 * Save. "Say it" sits at the top of the same form: a voice note fills the
 * same boxes (ui/RecordSay), so speaking and typing are one door, not two.
 *
 * Save keeps what changed and nothing else, with one Undo. A finish pushed
 * later asks why first (ui/WhyMoved) and keeps the reason as a move on the
 * plan, as the dates form did. What was agreed — the "passes if", "done
 * means" — is the owner's once written (lib/access mayWriteAgreement): anybody
 * else reads it here, not a box that the database would refuse.
 *
 * What it prints: nothing new — every box is a field the plan, the record's
 * card and the client report already read. */
import { useState } from 'react';
import { forget, hasKept, useKept } from '../lib/kept';
import { mayWriteAgreement, type Can } from '../lib/access';
import { fixFlag } from '../lib/critical';
import { uid } from '../lib/ids';
import { GATE_WORD } from '../lib/install';
import { isRunTest, productRuns } from '../lib/run';
import { movedLater, overlapOf } from '../lib/story';
import { gateOf, live, plannedEnd, wordsOf, type Test, type TestItem } from '../lib/testing';
import type { useTesting } from '../lib/useTesting';
import { niceDay } from '../lib/weeks';
import { BetterWords } from './BetterWords';
import { CriticalFields, criticalDraftOf, criticalPatch } from './CriticalFields';
import { SayIt, SayStep } from './RecordSay';
import { offerUndo } from './Undo';
import { WhyMoved, followingSummary, recordMove, type ProblemFill } from './WhyMoved';

type TT = ReturnType<typeof useTesting>;

/** The boxes, as the form holds them — every one a string, '' for none. */
type Boxes = Record<'title' | 'assetId' | 'fromTestId' | 'plannedFor' | 'plannedTo' | 'withWhom'
  | 'planned' | 'passesIf' | 'ranOn' | 'ranTo' | 'product' | 'result', string>;

const boxesOf = (t: Test): Boxes => ({
  title: t.title, assetId: t.assetId ?? '', fromTestId: t.fromTestId ?? '',
  plannedFor: t.plannedFor ?? '', plannedTo: t.plannedTo ?? '', withWhom: t.withWhom ?? '',
  planned: t.planned ?? '', passesIf: t.passesIf ?? '', ranOn: t.ranOn ?? '', ranTo: t.ranTo ?? '',
  product: t.product ?? '', result: t.result ?? '',
});

/** What Save keeps: the boxes that changed, as the record's fields — an
 *  emptied box clears its field. A one-day plan or a one-day run has no last
 *  day; a title is never emptied. Exported for the tests. */
export function editPatch(t: Test, b: Boxes, mayAgree: boolean): Partial<Test> {
  const was = boxesOf(t);
  const tidy: Boxes = { ...b };
  (Object.keys(tidy) as (keyof Boxes)[]).forEach(k => { tidy[k] = tidy[k].trim(); });
  if (!tidy.title) tidy.title = was.title;
  if (!tidy.plannedFor || (tidy.plannedTo && tidy.plannedTo <= tidy.plannedFor)) tidy.plannedTo = '';
  if (!tidy.ranOn || (tidy.ranTo && tidy.ranTo <= tidy.ranOn)) tidy.ranTo = '';
  if (!mayAgree) tidy.passesIf = was.passesIf;
  const patch: Partial<Test> = {};
  (Object.keys(tidy) as (keyof Boxes)[]).forEach(k => {
    if (tidy[k] !== was[k].trim()) (patch as Record<string, string | undefined>)[k] = tidy[k] || undefined;
  });
  return patch;
}

export function RecordEdit({ t, tt, can, names, onProblem, onClose }: {
  t: Test; tt: TT; can: Can;
  /** Everyone named on the job, for "who". */
  names: string[];
  /** A voice note that said it hit a problem — the drawer opens the problem
   *  form with it, filled. */
  onProblem: (f: ProblemFill) => void;
  onClose: () => void;
}) {
  const kind = t.kind ?? 'test';
  const words = wordsOf(t);
  /* WHAT HAS BEEN TYPED, over the record: a box nobody has touched reads the
     record as it is now, so a voice note — which writes the record itself
     (ui/RecordSay) — shows in the boxes the moment it lands. */
  /* KEPT AS TYPED (lib/kept): ×, Escape, back or another page leave what
     was typed here, and Edit opens with it next time; Save and Cancel are
     the only two ends of a change. */
  const K = `edit:${t.id}:`;
  const [restored] = useState(() => hasKept(K));
  const [typed, setTyped] = useKept<Partial<Boxes>>(K + 'typed', {});
  const b: Boxes = { ...boxesOf(t), ...typed };
  const set = (k: keyof Boxes) => (v: string) => setTyped(cur => ({ ...cur, [k]: v }));
  const setMany = (p: Partial<Boxes>) => setTyped(cur => ({ ...cur, ...p }));
  const [ok, setOk] = useKept<boolean | undefined>(K + 'ok', t.overlapOk);
  const [asking, setAsking] = useState(false);
  const mayAgree = mayWriteAgreement(can, t.passesIf);
  /* A FIX'S FLAG — critical or high risk, kept on the problem it is for
     (lib/critical fixFlag): "for any fix have a critical or high risk". */
  const fixProblem = kind === 'fix' ? fixFlag(t.id, tt.items).problem : undefined;
  const [crit, setCrit] = useKept(K + 'crit', () => criticalDraftOf(fixProblem));
  /* A FIX READS AS ITS STORY (Rowland, 9 October): what's the problem, the
     concerns and consequences to the business, then what's the fix — every
     part editable here. The problem and its concerns are the fix's problem
     record (made when the fix has none), its words mirrored as the fix's
     "The problem" where the owner may write it. */
  const probWas = (fixProblem?.what ?? t.passesIf ?? '').trim();
  const [probText, setProbText] = useKept(K + 'prob', probWas);
  const [concern, setConcern] = useKept(K + 'concern', fixProblem?.impact ?? '');
  /* The two ends of a change: what was kept goes with them. */
  const finish = () => { forget(K); onClose(); };
  const flagsNow = criticalPatch({ ...crit, impact: concern });
  const critChanged = kind === 'fix' && (JSON.stringify(flagsNow) !== JSON.stringify(criticalPatch(criticalDraftOf(fixProblem)))
    || probText.trim() !== probWas);
  const isRun = isRunTest(t);
  const done = !!t.ranOn || t.outcome !== 'planned';

  const end = b.plannedFor ? (b.plannedTo && b.plannedTo > b.plannedFor ? b.plannedTo : b.plannedFor) : undefined;
  /* A finished one's dates are corrected, not overrun: no "why did it move?". */
  const was = t.outcome === 'passed' ? undefined : plannedEnd(t);
  const later = !!end && movedLater(was, end);
  const over = kind !== 'fix' && b.plannedFor && end
    ? overlapOf({ ...t, plannedFor: b.plannedFor, plannedTo: end > b.plannedFor ? end : undefined }, tt.tests, true)?.title
    : undefined;
  const patch: Partial<Test> = { ...editPatch(t, b, mayAgree),
    /* The fix's own "The problem" follows the problem's words, where the
       owner may write it. */
    ...(kind === 'fix' && mayAgree && probText.trim() && probText.trim() !== (t.passesIf ?? '').trim() ? { passesIf: probText.trim() } : {}) };
  const okNow = over && ok !== undefined && ok !== t.overlapOk ? ok : undefined;
  const all: Partial<Test> = { ...patch, ...(okNow !== undefined ? { overlapOk: okNow } : {}) };
  const changed = Object.keys(all).length > 0 || critChanged;

  /* One write, one Undo — the reason for a move, its fix and its knock-on
     come back with it. */
  const keep = async (a?: Parameters<typeof recordMove>[2]) => {
    const before = Object.fromEntries(Object.keys(all).map(k => [k, t[k as keyof Test]])) as Partial<Test>;
    if (Object.keys(all).length) await tt.patchTest(t.id, all);
    const back = a && was && end ? await recordMove(tt, [{ step: t, from: was, to: end }], a) : undefined;
    /* The flag, on the fix's problem — or on one made now from "The problem",
       found on what the fix is for (the fix itself when it is for nothing). */
    let flagBack: (() => Promise<void>) | undefined;
    const flags = flagsNow;
    if (critChanged && fixProblem) {
      const { critical: _c, risk: _r, impact: _i, ways: _w, ...rest } = fixProblem;
      await tt.saveItem({ ...rest, what: probText.trim() || fixProblem.what, ...flags, updatedAt: Date.now() });
      flagBack = () => tt.saveItem(fixProblem);
    } else if (critChanged && (flags.critical || flags.risk || flags.impact || probText.trim())) {
      const at = Date.now();
      const made: TestItem = {
        id: uid(), projectId: t.projectId, testId: t.fromTestId ?? t.id, kind: 'found',
        what: (probText.trim() || b.title.trim() || t.title), becameTestId: t.id, ...flags, sort: at, createdAt: at, updatedAt: at,
      };
      await tt.saveItem(made);
      flagBack = () => tt.saveItem({ ...made, deletedAt: Date.now() });
    }
    const wasFlag = fixProblem?.critical ? 'critical' : fixProblem?.risk ? 'risk' : 'none';
    const nowFlag = flags.critical ? 'critical' : flags.risk ? 'risk' : 'none';
    const flagWord = critChanged && wasFlag !== nowFlag ? (nowFlag === 'critical' ? ', flagged critical' : nowFlag === 'risk' ? ', flagged high risk' : ', flag taken off') : '';
    offerUndo(`${(all.title as string | undefined) ?? t.title} — changed${a ? ', reason kept' : ''}${a?.fix ? ', fix booked' : ''}${flagWord}`, async () => {
      if (Object.keys(before).length) await tt.patchTest(t.id, before);
      if (back) await back();
      if (flagBack) await flagBack();
    });
    finish();
  };

  if (asking && was && end) {
    return <WhyMoved from={was} to={end} following={followingSummary(t, tt.tests, end)}
      onCancel={() => setAsking(false)} onSave={a => void keep(a)} onSkip={() => void keep()} />;
  }

  /* What a fix can be for: a test, or a step of the install. */
  const tests = live(tt.tests).filter(x => (x.kind ?? 'test') === 'test' && x.id !== t.id)
    .sort((x, y) => (y.ranOn ?? y.plannedFor ?? '').localeCompare(x.ranOn ?? x.plannedFor ?? ''));
  const steps = live(tt.tests).filter(x => x.kind === 'install').sort((x, y) => x.sort - y.sort);
  const machineOf = (x: Test) => tt.assets.find(a => a.id === x.assetId)?.name ?? 'The line';
  const spelled = [t.title, ...tt.assets.map(a => a.name)];

  return (
    <form className="re-form" onSubmit={e => {
      e.preventDefault();
      if (!changed) return;
      if (later) { setAsking(true); return; }
      void keep();
    }}>
      {restored && <p className="kept-note re-wide" role="status">Not saved yet — what you typed is back. Save keeps it; Cancel throws it away.</p>}
      {/* SAY IT, in the form — what was said lands in these boxes. */}
      <div className="re-say">
        {kind === 'install'
          ? <SayStep step={t} tt={tt} onDone={finish} onProblem={onProblem} />
          : <SayIt test={t} tt={tt} can={can} onFilled={() => undefined} />}
      </div>

      {/* A FIX: the problem, its concerns and consequences, the flag, then
          the fix — the order it is thought through, and read. */}
      {kind === 'fix' ? <>
        <label className="cw-f re-wide"><span>What’s the problem?</span>
          <textarea className="text-area" rows={2} value={probText} placeholder="Film creases as the web enters the former"
            onChange={e => setProbText(e.target.value)} /></label>
        <label className="cw-f re-wide"><span>Concerns and consequences to the business</span>
          <textarea className="text-area" rows={3} value={concern}
            placeholder="Every 2 kg pack creased is a reject — at 60 ppm that is the Tesco trial on Thursday at risk."
            onChange={e => setConcern(e.target.value)} /></label>
        <div className="re-wide">
          <CriticalFields value={crit} onChange={setCrit} names={[t.title, ...tt.assets.map(x => x.name)]} noCould noImpact />
        </div>
        <label className="cw-f re-wide"><span>What’s the fix?</span>
          <input value={b.title} placeholder="Re-set the former shoulder and re-track the film" onChange={e => set('title')(e.target.value)} /></label>
      </> : (
        <label className="cw-f re-wide"><span>{kind === 'install' ? 'The stage' : 'The test'}</span>
          <input value={b.title} onChange={e => set('title')(e.target.value)} /></label>
      )}

      {kind === 'fix' && (
        <label className="cw-f re-wide"><span>What is it for?</span>
          <select value={b.fromTestId} onChange={e => set('fromTestId')(e.target.value)}>
            <option value="">Not from a test or a stage</option>
            {tests.length > 0 && <optgroup label="Tests">{tests.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</optgroup>}
            {(['install', 'setup', 'handover'] as const).map(g => {
              const inGate = steps.filter(x => gateOf(x) === g);
              return inGate.length > 0 && (
                <optgroup key={g} label={`${GATE_WORD[g]} stages`}>{inGate.map(x => <option key={x.id} value={x.id}>{machineOf(x)} — {x.title}</option>)}</optgroup>
              );
            })}
          </select></label>
      )}

      <label className="cw-f"><span>Machine</span>
        <select value={b.assetId} onChange={e => set('assetId')(e.target.value)}>
          <option value="">The line itself</option>
          {tt.assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>

      {/* THE PLAN — a day, or a block of them; the last day empty is one day. */}
      <div className="ig-dates re-wide">
        <label className="cw-f ig-f"><span>{kind === 'fix' ? 'Agreed for' : 'Starts'}</span>
          <input type="date" value={b.plannedFor} onChange={e => setMany({ plannedFor: e.target.value, ...(b.plannedTo && e.target.value > b.plannedTo ? { plannedTo: '' } : {}) })} /></label>
        <label className="cw-f ig-f"><span>Finishes <span className="cw-f-opt">blank = one day</span></span>
          <input type="date" value={b.plannedTo} min={b.plannedFor || undefined} onChange={e => set('plannedTo')(e.target.value)} /></label>
      </div>
      {over && (
        <div className="ig-over re-wide">
          <span>These dates start before <b>{over}</b> has finished. Is the overlap OK?</span>
          <span className="cw-seg" role="group" aria-label="Is the overlap OK?">
            <button type="button" className={'chip' + (ok === true ? ' on' : '')} aria-pressed={ok === true} onClick={() => setOk(true)}>Yes — it’s the plan</button>
            <button type="button" className={'chip' + (ok === false ? ' on' : '')} aria-pressed={ok === false} onClick={() => setOk(false)}>No — flag it</button>
          </span>
        </div>
      )}
      {later && <p className="sub ig-why-note re-wide">That is later than it was ({niceDay(was)}) — Save will ask why.</p>}

      <label className="cw-f re-wide"><span>{words.withWhom}</span>
        <input list="re-names" value={b.withWhom} placeholder="Ilapak UK" onChange={e => set('withWhom')(e.target.value)} /></label>
      <datalist id="re-names">{names.map(n => <option key={n} value={n} />)}</datalist>

      {kind === 'test' && !(isRun && productRuns(t).length > 0) && (
        <label className="cw-f re-wide"><span>Product we plan to run</span>
          <input value={b.planned} placeholder="Jacks Piper 2kg" onChange={e => set('planned')(e.target.value)} /></label>
      )}

      {/* WHAT WAS AGREED — the owner's once written (lib/access). A fix's is
          its problem, asked above. */}
      {kind === 'fix' ? null : mayAgree ? (
        <label className="cw-f re-wide"><span>{words.expectation}</span>
          <textarea className="text-area" rows={2} value={b.passesIf} onChange={e => set('passesIf')(e.target.value)}
            placeholder={kind === 'install' ? 'Bolted down, level to 1 mm, guards on' : '65 ppm held for 30 minutes, under 2% waste'} /></label>
      ) : t.passesIf ? (
        <p className="re-wide re-agreed"><span className="re-l">{words.expectation}</span> {t.passesIf} <span className="sub">· agreed, the owner’s to change</span></p>
      ) : null}


      {/* THE DAY — once it has been done, or worked on. */}
      {done && <>
        <div className="ig-dates re-wide">
          <label className="cw-f ig-f"><span>{kind === 'test' ? 'Ran on' : 'Done on'}</span>
            <input type="date" value={b.ranOn} aria-label="The day it was done" onChange={e => setMany({ ranOn: e.target.value, ...(b.ranTo && e.target.value >= b.ranTo ? { ranTo: '' } : {}) })} /></label>
          <label className="cw-f ig-f"><span>Last day <span className="cw-f-opt">if more than one</span></span>
            <input type="date" value={b.ranTo} min={b.ranOn || undefined} onChange={e => set('ranTo')(e.target.value)} /></label>
        </div>
        {kind === 'test' && !isRun && (
          <label className="cw-f re-wide"><span>Product we ran</span>
            <input value={b.product} placeholder={b.planned || 'what went down the machine'} onChange={e => set('product')(e.target.value)} /></label>
        )}
      </>}
      <label className="cw-f re-wide"><span>{words.happened}</span>
        <textarea className="text-area" rows={3} value={b.result} onChange={e => set('result')(e.target.value)}
          placeholder={kind === 'fix' ? 'Roller re-aligned, ran clean for the rest of the shift'
            : kind === 'install' ? 'Air on and tested; the regulator is missing, so it is on a fix'
              : '61 ppm, 3 leaked in 20'} /></label>
      <BetterWords text={b.result} field="account" names={spelled} onUse={set('result')} />

      <span className="ig-plan-acts re-wide">
        <button className="btn btn-primary" type="submit" disabled={!changed}>Save</button>
        <button className="btn btn-ghost" type="button" onClick={finish}>Cancel</button>
      </span>
    </form>
  );
}
