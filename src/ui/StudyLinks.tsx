/* A RECORD'S STUDIES — the branch off a test or a fix in its drawer
 * (docs/TOOLKIT.md, Part 0: "Where a study shows"; docs/BUILD.md, 2f).
 *
 *   a test   Proved by: its capability study's sentence, tap to open it.
 *            "Take the readings" starts one, named for the test, on its
 *            machine, proving it. Its verdict can become the test's — a
 *            person presses it, the app never sets it.
 *   a fix    How we know: the study that showed it was needed. Proved by:
 *            the study taken after. "Prove it" starts the same study again on
 *            the same scope, so before and after measure the same thing; then
 *            before → after says what moved.
 *
 * One link, read from both ends (lib/studyLinks): the study's "Used for" and
 * this branch are the same `uses` entry. Nothing here is a list of its own —
 * a line under the record, as everything that hangs off a record is. */
import { useCallback, useEffect, useState } from 'react';
import { listStudies, onDataChange, putStudy } from '../db';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { now, uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { linkedTo, studyLine, studySays, owedOf, beforeAfter, proveItFrom, readingsFor, studyHref, studyTitle, type FixKind } from '../lib/studyLinks';
import type { Test } from '../lib/testing';
import type { ToolStudy } from '../lib/study';
import type { Can } from '../lib/access';

const href = (s: ToolStudy) => studyHref(s);

/** A job's studies, kept current. */
export function useJobStudies(projectId: string): ToolStudy[] {
  const [list, setList] = useState<ToolStudy[]>([]);
  const load = useCallback(async () => setList(await listStudies(projectId)), [projectId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return list;
}

function StudyRow({ s }: { s: ToolStudy }) {
  const line = studyLine(s), owed = owedOf(s);
  return (
    <button type="button" className="sl-row" onClick={() => nav(href(s))}>
      <b>{studyTitle(s)}</b>
      <span className={'sl-say is-' + line.tone}>{owed && !(s.facts.readings ?? []).length ? `${owed} readings to take.` : line.text}</span>
    </button>
  );
}

export function StudyLinks({ t, machine, can, onVerdict }: {
  t: Test; machine?: string; can: Can;
  /** Make the test's verdict the study's — pressed by a person. */
  onVerdict: (o: 'passed' | 'failed') => void;
}) {
  const studies = useJobStudies(t.projectId);
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  const kind = t.kind ?? 'test';
  const start = async (s: ToolStudy) => { await putStudy(s); nav(href(s)); };

  if (kind === 'test') {
    const proofs = linkedTo(studies, 'test', t.id, 'proof');
    if (!proofs.length && !can.edit) return null;
    const said = proofs[0] ? studySays(proofs[0]) : undefined;
    const verdict = proofs[0]?.overrule?.verdict ?? said?.verdict;
    const as: 'passed' | 'failed' | undefined = verdict === 'Passed' ? 'passed' : verdict === 'Didn’t pass' ? 'failed' : undefined;
    return (
      <div className="rd-blk sl">
        <small>Proved by</small>
        {proofs.map(s => <StudyRow key={s.id} s={s} />)}
        <div className="rd-acts">
          {can.edit && !proofs.length && (
            <button type="button" className="btn" onClick={() => void start(readingsFor(t, machine, { at: now(), by: me, id: uid(), useId: uid() }))}>Take the readings</button>
          )}
          {can.edit && as && t.outcome !== as && (
            <button type="button" className="btn" onClick={() => onVerdict(as)}>Use its verdict — {verdict}</button>
          )}
        </div>
      </div>
    );
  }

  if (kind === 'fix') return <FixStudies projectId={t.projectId} kind="fix" id={t.id} can={can} />;
  return null;
}

/** A FIX'S STUDIES — a stage-gate fix's, or a running line's countermeasure on
 *  the board: how we know it was needed, what proved it, before → after, and
 *  Prove it (the same study, after). Nothing when it has none. */
export function FixStudies({ projectId, kind, id, can }: { projectId: string; kind: FixKind; id: string; can: Can }) {
  const studies = useJobStudies(projectId);
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  const evidence = linkedTo(studies, kind, id, 'evidence');
  const proofs = linkedTo(studies, kind, id, 'proof');
  if (!evidence.length && !proofs.length) return null;
  const ba = beforeAfter(studies, id, kind);
  const start = async (s: ToolStudy) => { await putStudy(s); nav(href(s)); };
  return (
    <div className="rd-blk sl">
      {evidence.length > 0 && <small>How we know</small>}
      {evidence.map(s => <StudyRow key={s.id} s={s} />)}
      {proofs.length > 0 && <small>Proved by</small>}
      {proofs.map(s => <StudyRow key={s.id} s={s} />)}
      {ba && <p className={'sl-ba is-' + ba.tone}><b>Before → after:</b> {ba.text}</p>}
      {can.edit && evidence[0] && !proofs.length && (
        <div className="rd-acts">
          <button type="button" className="btn btn-primary" onClick={() => void start(proveItFrom(evidence[0], id, { at: now(), by: me, id: uid(), useId: uid() }, kind))}>{evidence[0].tool === 'map' ? 'Prove it — walk the line again' : evidence[0].tool === 'changeover' ? 'Prove it — time the changeover again' : 'Prove it — the same study, after'}</button>
        </div>
      )}
    </div>
  );
}

/** A CAUSE'S STUDIES on a running line's fishbone — how we know it. */
export function CauseStudies({ projectId, causeRef }: { projectId: string; causeRef: string }) {
  const studies = linkedTo(useJobStudies(projectId), 'cause', causeRef, 'evidence');
  if (!studies.length) return null;
  return (
    <div className="sl sl-cause">
      <small>How we know</small>
      {studies.map(s => <StudyRow key={s.id} s={s} />)}
    </div>
  );
}
