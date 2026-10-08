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
import { usePrograms } from '../lib/usePrograms';
import { STATE_WORD, isProgramsStage, isProved, stateOf, type Program } from '../lib/programs';
import { provingTestOf, testCell } from '../lib/commission';
import { live, type Test } from '../lib/testing';
import { niceDay, todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
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

export function ProgramLink({ projectId, t, tests, onOpen, onPatch, can }: {
  projectId: string; t: Test; tests: Test[];
  onOpen: (id: string) => void;
  onPatch: (patch: Partial<Test>) => void;
  can: Can;
}) {
  const { programs, loading, move } = usePrograms(projectId);
  const today = todayISO();
  const all = programs.filter(p => !p.deletedAt);
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
            {choices.map(x => <option key={x.id} value={x.id}>{x.what}{x.runs ? ` — ${x.runs}` : ''}</option>)}
          </select>
        )}
        <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/programs`)}>Programs ›</button>
        {p && !isProved(p) && <p className="sub tw-note">Passing this test marks {p.what} proved on the day it ran.</p>}
      </div>
    );
  }

  if (!isProgramsStage(t)) return null;
  const onThis = (p: Program) => (p.assetId ?? '') === (t.assetId ?? '');
  const mine = all.filter(onThis);
  const proved = mine.filter(isProved).length;
  return (
    <div className="rd-blk">
      <small>The programs{mine.length ? ` · ${proved} of ${mine.length} proved in Commission` : ''}</small>
      {mine.length ? (
        <ul className="cg-plist">
          {mine.map((p, k) => {
            const said = progWords(p, tests, today);
            const test = provingTestOf(p, live(tests));
            return (
              <li key={p.id} className="cg-prow">
                {/* ▲ ▼ — this machine's programs in the order the person wants
                    them; the Programs page and the report read the same order. */}
                {can.edit && mine.length > 1 && (
                  <span className="pg-move is-inline" role="group" aria-label={`Move ${p.what}`}>
                    <button type="button" className="pg-move-b" disabled={k === 0} aria-label={`Move ${p.what} up`} onClick={() => void move(p.id, -1, onThis)}>▲</button>
                    <button type="button" className="pg-move-b" disabled={k === mine.length - 1} aria-label={`Move ${p.what} down`} onClick={() => void move(p.id, 1, onThis)}>▼</button>
                  </span>
                )}
                <span className="cg-pwhat"><b>{p.what}</b>{p.runs && <span className="sub"> runs {p.runs}</span>}</span>
                <span className={'cg-pstate is-' + said.tone}>{said.word}</span>
                {test && <button type="button" className="cw-link" onClick={() => onOpen(test.id)}>Open its test</button>}
              </li>
            );
          })}
        </ul>
      ) : <p className="sub">No programs on this machine yet.</p>}
      <span className="rd-prog">
        <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/programs`)}>Programs ›</button>
        <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/testing`)}>Prove them in Commission ›</button>
        <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/report?doc=programs`)}>Programs report ›</button>
      </span>
    </div>
  );
}
