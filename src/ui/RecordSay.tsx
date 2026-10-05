/* SAY IT — one voice note into a record's own boxes.
 *
 * Rowland: "on every part of the app I can talk the information into it."
 * Two readings of a note, each moved here unchanged from where it was
 * written, so the drawer (ui/RecordDrawer) and the record's page
 * (screens/TestScreen) share them rather than each keeping a copy:
 *
 *   SayStep  a stage, from the square or its drawer (was ui/InstallGrid).
 *            What was heard is shown first and put in only when you say so;
 *            said that it hit a problem, the problem form opens filled.
 *   SayIt    a test or a fix (was screens/TestScreen). What only ADDS goes
 *            straight into the boxes with one Undo; what would replace
 *            something already there is asked.
 */
import { useState } from 'react';
import { mayWriteAgreement, type Can } from '../lib/access';
import type { Test } from '../lib/testing';
import type { useTesting } from '../lib/useTesting';
import { contextFor, proposalFrom, type Change, type VoiceResult } from '../lib/voice';
import { todayISO } from '../lib/weeks';
import { offerUndo } from './Undo';
import { VoiceNote, VoiceReview } from './Voice';
import type { ProblemFill } from './WhyMoved';

type TT = ReturnType<typeof useTesting>;

/** Say how a step went, from the square itself — into the boxes this sheet
 *  and its step already have (Rowland, 4 October: "where I'm saying should
 *  make sense to put … not build anything new"). Done, the day, who and what
 *  was done are shown, then put in. Said that it hit a problem, the "Hit a
 *  problem" sheet opens with its boxes filled from the note (onProblem), so
 *  the finish, the reason and the fix are kept the way that sheet keeps them.
 *  Nothing said is lost: what did not fit a box is in "What was done"
 *  (lib/voice proposalFrom), and the words can be put right before they go in. */
export function SayStep({ step, tt, onDone, onProblem }: { step: Test; tt: TT; onDone: () => void; onProblem: (f: ProblemFill) => void }) {
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

/* STRAIGHT INTO THE BOXES. Rowland: "that's where I would expect what I say
   to be entered ... make sure when I voice it goes into the appropriate
   boxes — what was done, for example." What adds to the record goes in at
   once and glows where it landed, with one Undo: the account of the work is
   ADDED to the box, never over it; an empty box is filled; a verdict nobody
   has given yet is given. What would REPLACE something already there — a
   different day, a different name, a changed verdict — is still asked, so
   nothing anybody wrote is lost to a mishearing. And an account that fitted
   no box goes into the commentary box rather than being put to one side. */
export function SayIt({ test, tt, can, onFilled }: { test: Test; tt: TT; can: Can; onFilled: (keys: string[]) => void }) {
  const [asking, setAsking] = useState<{ heard: VoiceResult; changes: Change[] } | null>(null);
  const today = todayISO();
  const kind = test.kind ?? 'test';

  const heard = (r: VoiceResult) => void (async () => {
    /* What did not fit a box joins the account; said something and none of it
       landed anywhere, it is the account (lib/voice proposalFrom — the stage
       sheet on the install grid reads a note the same way). */
    const proposed = proposalFrom(test, r, tt.assets, today);
    const notes = proposed.notes;
    let changes = proposed.changes;
    /* A written "passes if" is the owner's to change — a voice note does not
       get round that for anybody else (lib/access). */
    if (!mayWriteAgreement(can, test.passesIf)) changes = changes.filter(c => c.key !== 'problem');
    /* The account goes straight in when it only adds: there was none, or the
       new words go under it. When the reader rewrote the account with the new
       note worked in (r.merged), it is asked — shown to edit — because it
       changes words already there. */
    const adds = (c: Change) => (c.key === 'result' ? !r.merged || !test.result?.trim() : !c.before)
      || (c.key === 'outcome' && test.outcome === 'planned') || (c.key === 'ranOn' && !test.ranOn);
    const now = changes.filter(adds);
    const ask = changes.filter(c => !adds(c));

    if (now.length) {
      const patch = Object.assign({}, ...now.map(c => c.patch)) as Partial<Test>;
      const before = Object.fromEntries(Object.keys(patch).map(k => [k, test[k as keyof Test]])) as Partial<Test>;
      await tt.patchTest(test.id, patch);
      offerUndo(`Put in what you said — ${now.map(c => c.label.toLowerCase()).join(', ')}`, () => tt.patchTest(test.id, before));
    }
    /* Things found along the way are new rows — nothing to overwrite. */
    for (const [i, n] of notes.entries()) {
      await tt.addItem(test.id, 'found', n.what, { owner: n.owner || undefined, note: i === 0 ? `Said: “${r.transcript}”` : undefined });
    }
    onFilled([...now.map(c => c.key), ...(notes.length ? ['found'] : [])]);
    if (ask.length) setAsking({ heard: r, changes: ask });
  })();

  return (
    <div className="vo-say">
      {!asking && (
        <VoiceNote form={kind === 'fix' ? 'fix' : kind === 'install' ? 'install' : 'test'}
          label={kind === 'fix' ? 'Say the fix' : kind === 'install' ? 'Say how it went' : 'Say how the test went'}
          context={() => contextFor(tt.assets, tt.tests, today, test)} onHeard={heard} />
      )}
      {asking && (
        <>
          <p className="vo-ask">This would change what is already there — tick what should change.</p>
          <VoiceReview heard={asking.heard} applyLabel="Change it"
            rows={asking.changes.map(c => ({ key: c.key, label: c.label, before: c.before, after: c.after, editable: c.key === 'result' }))}
            onApply={(keys, edits) => void (async () => {
              const picked = asking.changes.filter(c => keys.includes(c.key));
              const patch = Object.assign({}, ...picked.map(c => c.patch)) as Partial<Test>;
              if (keys.includes('result') && edits.result != null) patch.result = edits.result.trim() || undefined;
              const before = Object.fromEntries(Object.keys(patch).map(k => [k, test[k as keyof Test]])) as Partial<Test>;
              await tt.patchTest(test.id, patch);
              offerUndo(`Changed ${picked.length} thing${picked.length === 1 ? '' : 's'}`, () => tt.patchTest(test.id, before));
              onFilled(picked.map(c => c.key));
              setAsking(null);
            })()}
            onDiscard={() => setAsking(null)} />
        </>
      )}
    </div>
  );
}
