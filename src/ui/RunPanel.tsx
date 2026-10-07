/* THE RUN — the numbers a performance run is accepted on (lib/run).
 *
 * Rowland, 7 October: "people ask how fast did we run, what did we net —
 * speed, packs per minute — issues, status ... this is my time of acceptance."
 *
 * One board, read the same on the test's page and in its drawer: the net
 * rate against what was agreed (the number everybody asks for, so the biggest),
 * the speed it ran at, the packs made, the rejects, how long it ran — and what
 * those numbers say about the verdict, in words. The boxes that fill it are
 * open until the first numbers are in, then fold behind one button.
 *
 * Colour follows the house rules: only a number that missed what was agreed
 * carries red; met is a quiet green wash; nothing agreed is plain ink. */
import { useState } from 'react';
import type { Test } from '../lib/testing';
import { agreedWords, cleanRun, numbersSay, readRun, runTiles, type RunAgreed, type RunDay } from '../lib/run';
import { mayWriteAgreement, type Can } from '../lib/access';
import { DraftField, DraftNumber } from './Draft';
import { todayISO } from '../lib/weeks';

type Patch = (fn: (cur: Test) => Partial<Test>) => void;

/** The board. `compact` for the drawer: the same tiles, smaller. Always
 *  the five figures — a dash where nothing is in yet — so the shape of the
 *  run is on the screen before the day: Rowland, 7 October, could not find
 *  it behind a line that only said "not run yet". */
export function RunBoard({ t, compact }: { t: Test; compact?: boolean }) {
  const r = readRun(t);
  const product = t.product ?? t.planned;
  const agreed = agreedWords(r.agreed);
  const say = numbersSay(r);
  return (
    <div className={'run-board' + (compact ? ' is-compact' : '')}>
      {product && <p className="run-product"><span>Product</span> <b>{product}</b></p>}
      {!r.ran && (
        <p className="run-none">
          <b>{t.ranOn || t.outcome !== 'planned' ? 'No run numbers in yet.' : 'Not run yet.'}</b>{' '}
          {agreed ? <>Agreed: {agreed}.</> : 'No rate agreed yet.'}
        </p>
      )}
      <div className="run-tiles">
        {runTiles(r).map((x, i) => (
          <div key={x.label} className={'run-tile' + (i === 0 ? ' is-lead' : '') + (x.tone ? ` is-${x.tone}` : '')}>
            <span className="run-l">{x.label}</span>
            <b className="run-v">{x.value}{x.unit && x.value !== '—' && <small> {x.unit}</small>}</b>
            <span className="run-s">{x.sub}</span>
          </div>
        ))}
      </div>
      {say && <p className={'run-say' + (r.meets ? ' is-met' : ' is-short')}>{say}</p>}
    </div>
  );
}

/** WHAT IT IS JUDGED ON — the rate, how long, the most rejects. Agreed before
 *  the day: a team member may write it once; after that it is the owner's
 *  (lib/access, and the database keeps it so — PERFORMANCE_RUN.sql). */
export function RunAgreedFields({ t, can, patch, atOpen }: { t: Test; can: Can; patch: Patch;
  /** What was agreed when the boxes were opened — a team member's own first
   *  numbers do not lock under their fingers. */
  atOpen?: RunAgreed }) {
  const locked = !can.edit || !mayWriteAgreement(can, agreedWords(atOpen ?? {}) ? 'agreed' : '');
  const a = t.runAgreed ?? {};
  const set = (k: keyof RunAgreed) => (v?: number) => patch(cur => ({ runAgreed: cleanRun({ ...(cur.runAgreed ?? {}), [k]: v }) }));
  if (locked) {
    return (
      <div className="tc-f">
        <span className="tc-f-l">The run is judged on</span>
        <p className={'tc-f-t' + (agreedWords(a) ? '' : ' is-none')}>{agreedWords(a) || 'No rate agreed yet'}</p>
        {can.edit && <p className="sub tw-note">Agreed — only the owner changes it.</p>}
      </div>
    );
  }
  return (
    <div className="run-form cw-f-wide">
      <span className="run-form-h">The run is judged on <span className="cw-f-opt">agreed before the day</span></span>
      <label className="cw-f run-f"><span>Net rate <span className="cw-f-opt">ppm</span></span>
        <DraftNumber className="text-input" value={a.rate} placeholder="e.g. 60" label="Agreed net rate, packs a minute" onSave={set('rate')} /></label>
      <label className="cw-f run-f"><span>For <span className="cw-f-opt">minutes</span></span>
        <DraftNumber className="text-input" value={a.minutes} placeholder="e.g. 60" label="Agreed run length, minutes" onSave={set('minutes')} /></label>
      <label className="cw-f run-f"><span>Rejects at most <span className="cw-f-opt">%</span></span>
        <DraftNumber className="text-input" value={a.rejectsMax} placeholder="e.g. 1" label="Most rejects allowed, per cent" onSave={set('rejectsMax')} /></label>
    </div>
  );
}

/** WHAT THE DAY DID — the product and the numbers off the machine. Keeping
 *  any of them stamps the day it ran, as giving the verdict does, so the
 *  verdict is asked for next (lib/testing needsVerdict). */
export function RunDayFields({ t, patch }: { t: Test; patch: Patch }) {
  const d = t.run ?? {};
  const set = (k: keyof RunDay) => (v?: number) =>
    patch(cur => ({ run: cleanRun({ ...(cur.run ?? {}), [k]: v }), ranOn: cur.ranOn ?? (v != null ? todayISO() : undefined) }));
  return (
    <div className="run-form cw-f-wide">
      <span className="run-form-h">The run, off the machine</span>
      {/* The same box, under the same name, as on every other test and on the
          card: what went down the machine. */}
      <label className="cw-f run-f run-f-wide"><span>Product we ran</span>
        <DraftField value={t.product ?? ''} placeholder={t.planned ?? 'what went down the machine'}
          onSave={v => patch(() => ({ product: v.trim() || undefined }))} /></label>
      <label className="cw-f run-f"><span>Ran for <span className="cw-f-opt">minutes</span></span>
        <DraftNumber className="text-input" value={d.minutes} placeholder="e.g. 60" label="Ran for, minutes" onSave={set('minutes')} /></label>
      <label className="cw-f run-f"><span>Packs made <span className="cw-f-opt">counter</span></span>
        <DraftNumber className="text-input" value={d.packs} placeholder="e.g. 3600" label="Packs made" onSave={set('packs')} /></label>
      <label className="cw-f run-f"><span>Rejects</span>
        <DraftNumber className="text-input" value={d.rejects} placeholder="e.g. 0" label="Rejects" onSave={set('rejects')} /></label>
      <label className="cw-f run-f"><span>Ran at <span className="cw-f-opt">ppm, machine speed</span></span>
        <DraftNumber className="text-input" value={d.speed} placeholder="e.g. 62" label="Ran at, packs a minute" onSave={set('speed')} /></label>
      <label className="cw-f run-f"><span>Stood <span className="cw-f-opt">minutes, if it stopped</span></span>
        <DraftNumber className="text-input" value={d.stops} placeholder="e.g. 0" label="Stood, minutes" onSave={set('stops')} /></label>
    </div>
  );
}

/** THE RUN IN THE DRAWER — the board, and under it the boxes, OPEN until
 *  the first numbers are in: on the floor the job is to put them in, not to
 *  find where they go. The board above them works the net rate out as they
 *  are typed. Once there are numbers, the boxes fold behind one button. */
export function RunBlock({ t, can, patch }: { t: Test; can: Can; patch: Patch }) {
  /* Decided when the drawer opens, and kept: the first number typed must not
     fold the boxes away under the fingers. */
  const [open, setOpen] = useState(() => can.edit && !readRun(t).ran);
  const [atOpen, setAtOpen] = useState<RunAgreed | undefined>(t.runAgreed);
  return (
    <div className="rd-blk run-blk">
      <small>The run</small>
      <RunBoard t={t} compact />
      {open && <div className="tc-form run-boxes"><RunAgreedFields t={t} can={can} atOpen={atOpen} patch={patch} /><RunDayFields t={t} patch={patch} /></div>}
      {can.edit && (
        <button type="button" className={open ? 'btn btn-sm' : 'btn btn-primary btn-sm'} onClick={() => { setAtOpen(t.runAgreed); setOpen(o => !o); }}>
          {open ? 'Done' : readRun(t).ran ? 'Change the run numbers' : 'Put the run numbers in'}
        </button>
      )}
    </div>
  );
}
