/* PROVED — ASKED, NEVER ASSERTED (flow audit #21, 13 October: "A line's
 * program is Proved by a dropdown, with no test and no evidence";
 * LEAN40 principle 6: proved, not asserted).
 *
 * Saying a program is proved asks two things: the day, and what showed it —
 * in words (what was run, what was seen), or a study on its line that shows
 * it (a capability study of its packs, a loss count of its run). A test in
 * Commission proves one on its own (lib/programs programAfterTest); where
 * that is the way, the form says where it is done.
 *
 * WHICH RECORD: the program (lib/programs — state, provedOn; what showed it
 * is its commentary, `note`) and, for a study, the study that names it
 * (ToolStudy.programId). No new record. WHERE IT SHOWS: under the program's
 * state, as lib/programsReport proofOf says it — the line's Programs and its
 * paper, the job's Programs list, a job's view of its line's programs — and
 * on the study's own page ("Shows … proved"). */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isProved, type Program } from '../lib/programs';
import type { ToolStudy } from '../lib/study';
import { niceDay, todayISO } from '../lib/weeks';
import { studyLine } from '../lib/studyLinks';
import { studyWords } from '../lib/programsReport';
import { lineOfProgram } from '../lib/lineRecords';
import { allPaceLines, listAllPrograms, onDataChange, patchStudy, putProgram } from '../db';
import { nav } from '../state/useRoute';

export function ProveProgram({ p, studies = [], testDoor, onClose }: {
  p: Program;
  /** Studies that could show it — those on its line. Offered only when there are some. */
  studies?: readonly ToolStudy[];
  /** Where a test proves it instead, when there is one to plan. */
  testDoor?: ReactNode;
  onClose: () => void;
}) {
  const [on, setOn] = useState(todayISO());
  const [how, setHow] = useState<'words' | 'study'>('words');
  const [words, setWords] = useState('');
  const [studyId, setStudyId] = useState('');
  const busy = useRef(false);
  const ready = !!on && (how === 'words' ? !!words.trim() : !!studyId);
  const id = `pv-${p.id}`;

  const write = async () => {
    /* The booked test day comes off with the proving (usePrograms markProved). */
    const proved: Program = { ...p, state: 'proved', provedOn: on, testOn: undefined };
    if (how === 'study') {
      await patchStudy(studyId, { programId: p.id });
      await putProgram(proved);
      return;
    }
    /* What showed it is the program's commentary from here; a study that
       named it is no longer what showed it. */
    for (const s of studies.filter(x => x.programId === p.id)) await patchStudy(s.id, { programId: undefined });
    await putProgram({ ...proved, note: words.trim() });
  };
  const prove = () => {
    if (!ready || busy.current) return;
    busy.current = true;
    void write().then(onClose).finally(() => { busy.current = false; });
  };

  return (
    <div className="mt-mark pv-form" role="group" aria-label={`Prove ${p.what}`}>
      <label className="mt-mark-l" htmlFor={id}>Proved on</label>
      <input id={id} className="mt-due" type="date" value={on} aria-label={`The day ${p.what} was proved`} onChange={e => setOn(e.target.value)} />
      <div className="pv-how">
        <span className="field-label">What showed it</span>
        {studies.length > 0 && (
          <span className="chip-row" role="group" aria-label="What showed it">
            <button type="button" className={'chip' + (how === 'words' ? ' on' : '')} aria-pressed={how === 'words'} onClick={() => setHow('words')}>In words</button>
            <button type="button" className={'chip' + (how === 'study' ? ' on' : '')} aria-pressed={how === 'study'} onClick={() => setHow('study')}>A study on the line</button>
          </span>
        )}
        {how === 'words' ? (
          <>
            <textarea className="text-input pv-words" rows={2} maxLength={400} value={words} aria-label={`What showed ${p.what} works`}
              placeholder="What was run and what was seen — e.g. 500 packs at 60 a minute, no rejects, seals checked by QA"
              onChange={e => setWords(e.target.value)} />
            {p.note?.trim() && <small className="sub">It becomes its commentary, in place of “{p.note.trim()}”.</small>}
          </>
        ) : (
          <select className="text-input" value={studyId} aria-label={`The study that showed ${p.what} works`} onChange={e => setStudyId(e.target.value)}>
            <option value="">Pick the study…</option>
            {studies.map(s => <option key={s.id} value={s.id}>{studyWords(s)} — {studyLine(s).text.slice(0, 80)}</option>)}
          </select>
        )}
        {testDoor && <small className="sub pv-test">{testDoor}</small>}
      </div>
      <button type="button" className="btn btn-primary btn-sm" disabled={!ready} onClick={prove}>It&rsquo;s proved</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
    </div>
  );
}

/** ON THE STUDY'S PAGE — the program it shows proved, one tap to it on its
 *  line's Programs: a branch off the study, where it sits (CLAUDE.md, rule 5:
 *  anything new shows wherever its parent shows). */
export function StudyProves({ s }: { s: Pick<ToolStudy, 'id' | 'programId'> }) {
  const [p, setP] = useState<Program | undefined>(undefined);
  const [lineId, setLineId] = useState<string | undefined>(undefined);
  useEffect(() => {
    let live = true;
    if (!s.programId) { setP(undefined); return; }
    const load = () => void Promise.all([listAllPrograms(), allPaceLines()]).then(([all, jobLines]) => {
      if (!live) return;
      const found = all.find(x => x.id === s.programId);
      setP(found);
      setLineId(found ? lineOfProgram(found, jobLines) : undefined);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [s.programId]);
  if (!p || !s.programId) return null;
  return (
    <p className="sub ie-proves">
      {isProved(p) ? <>Shows program <b>{p.what}</b> proved{p.provedOn ? `, ${niceDay(p.provedOn)}` : ''}</> : <>About program <b>{p.what}</b> — not proved now</>}
      {lineId && <>{' '}<button type="button" className="cw-link" onClick={() => nav(`/programs?line=${encodeURIComponent(lineId)}`)}>Its line&rsquo;s programs ›</button></>}
    </p>
  );
}
