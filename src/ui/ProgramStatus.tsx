/* A PROGRAM'S STATUS SECTION on its row (Rowland, 2 November: "a clear program status section this can be manually inputted by the
 * user. Programs status done, doing etc, best speed. Speed production can run at .. any caveats"): where the work stands, the best
 * speed it has been run at, the speed production can run it at and what to watch — said under the row when anything is, set and
 * changed here by whoever may change the work, taken off with Undo. The words are lib/programStatus's, the same the programs report
 * prints. Kept on the program record (programs.run_status); a line with no record yet has it made on the first save. */
import { useState } from 'react';
import { putProgram } from '../db';
import type { Program } from '../lib/programs';
import { AHEAD_SAYS, CAVEATS_MAX, WORKS, WORK_TONE, WORK_WORD, aheadOfBest, draftOf, draftProblem, speedWord, statusFrom, type StatusDraft } from '../lib/programStatus';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { now } from '../lib/ids';
import { offerUndo } from './Undo';

export function ProgramStatusSection({ program, edit, ensure }: {
  program?: Program;
  /** May change the work (useAccess can.edit — a client reads it). */
  edit: boolean;
  /** Make its program record, the first time something is said of a line kept only on the list. */
  ensure?: () => Promise<Program | undefined>;
}) {
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  const s = program?.status;
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<StatusDraft>(() => draftOf(s));
  if (!s && !edit) return null;
  const problem = draftProblem(d);
  const begin = () => { setD(draftOf(s)); setOpen(true); };
  const write = async (status: Program['status'], said: string) => {
    const cur = program ?? (await ensure?.());
    if (!cur) return;
    const next: Program = { ...cur, updatedAt: now() };
    if (status) next.status = status; else delete next.status;
    await putProgram(next);
    offerUndo(said, () => putProgram(cur));
  };
  const keep = async () => {
    if (problem) return;
    const next = statusFrom(d, now(), me);
    await write(next, next ? `Status of “${program?.what ?? 'the program'}” — saved` : 'Status taken off');
    setOpen(false);
  };
  return (
    <section className="pgs" aria-label="Program status" data-program-status>
      <div className="pgs-h">
        <span className="pgs-t">Status</span>
        {s && <span className={'status-pill is-' + WORK_TONE[s.work]}>{WORK_WORD[s.work]}</span>}
        {!s && !open && <span className="sub pgs-none">Nothing said yet</span>}
        {s?.bestSpeed != null && <span className="pgs-f"><span className="sub">Best speed</span> <b>{speedWord(s.bestSpeed)}</b></span>}
        {s?.runAt != null && <span className="pgs-f"><span className="sub">Production can run at</span> <b>{speedWord(s.runAt)}</b></span>}
        {edit && !open && <button type="button" className="cw-link pgs-edit" onClick={begin} title="Where the work stands, the best speed run, the speed production can run at, any caveats">{s ? 'Change the status' : 'Set the status'}</button>}
      </div>
      {s?.caveats && <p className="pgs-cav"><span className="sub">Caveats</span> {s.caveats}</p>}
      {aheadOfBest(s) && <p className="pgs-warn">{AHEAD_SAYS}</p>}
      {open && (
        <form className="pgs-form" onSubmit={e => { e.preventDefault(); void keep(); }}>
          <div className="chip-row" role="radiogroup" aria-label="Where the work stands">
            {WORKS.map(w => (
              <button key={w} type="button" role="radio" aria-checked={d.work === w} className={'chip' + (d.work === w ? ' on' : '')} onClick={() => setD({ ...d, work: w })}>{WORK_WORD[w]}</button>
            ))}
          </div>
          <label className="field"><span className="field-label">Best speed run — packs a minute</span>
            <input className="text-input" inputMode="decimal" value={d.bestSpeed} placeholder="75" aria-label="Best speed run" onChange={e => setD({ ...d, bestSpeed: e.target.value })} /></label>
          <label className="field"><span className="field-label">Production can run at — packs a minute</span>
            <input className="text-input" inputMode="decimal" value={d.runAt} placeholder="70" aria-label="Production can run at" onChange={e => setD({ ...d, runAt: e.target.value })} /></label>
          <label className="field"><span className="field-label">Caveats — what to watch</span>
            <textarea className="text-input" rows={2} maxLength={CAVEATS_MAX} value={d.caveats} placeholder="Only on the 2 kg film; film tension to be checked each reel" aria-label="Caveats" onChange={e => setD({ ...d, caveats: e.target.value })} /></label>
          {problem && <p className="pgs-warn" role="alert">{problem}</p>}
          <span className="pgs-acts">
            <button type="submit" className="btn btn-primary" disabled={!!problem}>Keep the status</button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            {s && <button type="button" className="btn sp-rm" onClick={() => { void write(undefined, 'Status taken off'); setOpen(false); }}>Take the status off</button>}
          </span>
        </form>
      )}
    </section>
  );
}
