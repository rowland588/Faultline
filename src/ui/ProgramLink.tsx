/* PROGRAMS AND COMMISSION, JOINED — the branch in the drawer.
 *
 * Rowland, 6 October: "programs are directly linked to commissioning, so make
 * the link." A program is loaded at Set up and proved at Commission by a test.
 * So the drawer says it from both ends:
 *
 *   on a TEST      which program it proves, and where that program stands —
 *                  changeable here, and passing the test proves it
 *                  (lib/programs programAfterTest)
 *   on SET UP's    the machine's programs, each with its Commission test or
 *   programs stage   "no test yet", opened from here
 *
 * The program record stays the one on the Programs page; nothing is copied. */
import { useJobPrograms } from '../lib/useJobPrograms';
import { STATE_WORD, isProgramsStage, isProved, stateOf, type Program } from '../lib/programs';
import { provingTestOf, testCell } from '../lib/commission';
import type { Test, TestItem } from '../lib/testing';
import { answerOf, type AnswerHolder } from '../lib/install';
import { niceDay, todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { partStatus, partsOf } from '../lib/noted';
import { openMachine } from './MachinePanel';
import type { Can } from '../lib/access';

const progWords = (p: Program, tests: Test[], today: string): { word: string; tone: string } => {
  if (isProved(p)) return { word: `proved ${niceDay(p.provedOn)}`, tone: 'g' };
  const t = provingTestOf(p, tests);
  if (t) { const c = testCell(t, today); return { word: `${STATE_WORD[stateOf(p)].toLowerCase()} · test ${c.word}`, tone: c.tone }; }
  return { word: `${STATE_WORD[stateOf(p)].toLowerCase()} · no test yet`, tone: 'n' };
};

/* Set up's stage about programs (lib/programs isProgramsStage), still
   offered from here for the screens that read it from here. */
export { isProgramsStage };

export function ProgramLink({ projectId, t, tests, onPatch, can, holder, items }: {
  projectId: string; t: Test; tests: Test[];
  /** The job and what is on its stages, so the programs stage is the one
   *  its answer says (lib/install answerOf, docs/PANELS.md). */
  holder?: AnswerHolder; items?: TestItem[];
  /** Kept for the callers; a program's run opens from its own line now. */
  onOpen?: (id: string) => void;
  onPatch: (patch: Partial<Test>) => void;
  can: Can;
}) {
  /* the job's and its lines' own (lib/useJobPrograms) — a test in Commission
     may prove a line's program (Rowland, 14 October) */
  const { all, job, lines, loading } = useJobPrograms(projectId);
  const today = todayISO();
  if (loading) return null;
  const kind = t.kind ?? 'test';

  if (kind === 'test') {
    if (!all.length) return null;
    const p = all.find(x => x.id === t.programId);
    /* The machine's own programs first in the picker — the one it proves is
       nearly always on the same machine. */
    const choices = [...all].sort((a, b) => Number((b.assetId ?? '') === (t.assetId ?? '')) - Number((a.assetId ?? '') === (t.assetId ?? '')));
    if (!p && !can.edit) return null;
    const said = p && progWords(p, tests, today);
    return (
      <div className="rd-blk rd-prog">
        <small>Proves the program</small>
        {p && said && <span><b>{p.what}</b>{p.runs ? ` — runs ${p.runs}` : ''} · <span className={'cg-pstate is-' + said.tone}>{isProved(p) ? said.word : STATE_WORD[stateOf(p)].toLowerCase()}</span></span>}
        {can.edit && (
          <select value={t.programId ?? ''} aria-label="Which program this test proves"
            onChange={e => onPatch({ programId: e.target.value || undefined })}>
            <option value="">{p ? 'Not about a program' : 'Not about a program — pick one it proves'}</option>
            {lines.some(l => l.programs.length)
              ? <>
                {job.length > 0 && <optgroup label="This project’s programs">{choices.filter(x => job.some(j => j.id === x.id)).map(x => <option key={x.id} value={x.id}>{x.what}{x.runs ? ` — ${x.runs}` : ''}</option>)}</optgroup>}
                {lines.filter(l => l.programs.length).map(l => (
                  <optgroup key={l.id} label={`${l.name}’s own programs`}>{l.programs.map(x => <option key={x.id} value={x.id}>{x.what}{x.runs ? ` — ${x.runs}` : ''}</option>)}</optgroup>
                ))}
              </>
              : choices.map(x => <option key={x.id} value={x.id}>{x.what}{x.runs ? ` — ${x.runs}` : ''}</option>)}
          </select>
        )}
        <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/programs`)}>Programs ›</button>
        {p && !isProved(p) && <p className="sub tw-note">Passing this test marks {p.what} proved on the day it ran.</p>}
      </div>
    );
  }

  if (!isProgramsStage(t, answerOf(t, holder, items))) return null;
  /* ITS PROGRAMS, SAID — NOT EDITED A SECOND TIME (docs/STAGEGATE-UX.md
     slice 4; Rowland, 16 October: "find dorrs that open othe rthings"). The
     drawer listed every program again with its whole editor, under a big
     door to Programs and a link to its report — 2,825 px for one stage.
     Here: how many and how they stand, each in its words, and one way to
     where they are worked on — the machine's own page (its programs as on
     Programs), or Programs for the line itself. The report is on Programs
     and the Reports sheet. */
  const parts = items ? partsOf(t.id, items) : [];
  const said = parts.map(p => ({ p, s: partStatus(p, today, 0, 2) }));
  /* how many and how many done is said once, beside the stage's state at the
     top of the drawer (ui/StageParts PartsMark) */
  return (
    <div className="rd-blk rd-prog-door">
      <small>Its programs</small>
      {!parts.length && <span className="sub">None written on it yet</span>}
      {said.length > 0 && (
        <ul className="rd-progs">
          {said.map(({ p, s }) => <li key={p.id}><span>{p.what}</span><span className={'spp-pill is-' + s.tone}>{s.word}</span></li>)}
        </ul>
      )}
      <button type="button" className="btn btn-sm btn-primary" onClick={() => (t.assetId ? openMachine(projectId, t.assetId) : nav(`/project/${projectId}/programs`))}>
        {t.assetId ? 'Change them, or say how they went — on the machine’s page ›' : 'Change them, or say how they went — on Programs ›'}</button>
    </div>
  );
}
