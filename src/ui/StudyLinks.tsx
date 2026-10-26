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
import { linkedTo, TOOL_NAME, studyLine, studySays, owedOf, beforeAfter, proveItFrom, readingsFor, studyHref, studyTitle, type FixKind, type StudyContext } from '../lib/studyLinks';
import { useStudyContext } from './ShiftLosses';
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

function StudyRow({ s, ctx }: { s: ToolStudy; ctx?: StudyContext }) {
  const line = studyLine(s, ctx), owed = owedOf(s);
  return (
    <button type="button" className="sl-row" onClick={() => nav(href(s))}>
      <b>{studyTitle(s)}</b>
      <span className={'sl-say is-' + line.tone}>{owed && !(s.facts.readings ?? []).length ? `${owed} readings to take.` : line.text}</span>
    </button>
  );
}

/** The tools that can prove a test — each a study of its own, named for what it is. */
const PROOF_TOOLS: ToolStudy['tool'][] = ['capability', 'chart', 'analysis', 'reliability', 'sampling', 'losses'];

export function StudyLinks({ t, machine, can, onVerdict }: {
  t: Test; machine?: string; can: Can;
  /** Make the test's verdict the study's — pressed by a person. */
  onVerdict: (o: 'passed' | 'failed') => void;
}) {
  const studies = useJobStudies(t.projectId);
  const ctx = useStudyContext(studies);
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  const kind = t.kind ?? 'test';
  /* the readings can be named for what they are — "60 ppm" — not only for the program's title (Rowland, 26 October) */
  const [readingName, setReadingName] = useState('');
  /* …and by the tool that proves it: not only a capability study (Rowland, 26 October) */
  const [readingTool, setReadingTool] = useState<ToolStudy['tool']>('capability');
  const start = async (s: ToolStudy) => { await putStudy(s); nav(href(s)); };
  /* one study of the test: named as typed; with others already, never the same name twice */
  const made = (): ToolStudy => {
    const base = readingsFor(t, machine, { at: now(), by: me, id: uid(), useId: uid() });
    const n = linkedTo(studies, 'test', t.id, 'proof').length;
    return { ...base, tool: readingTool, name: readingName.trim() || (n ? `${t.title} — study ${n + 1}` : t.title) };
  };

  if (kind === 'test') {
    const proofs = linkedTo(studies, 'test', t.id, 'proof');
    if (!proofs.length && !can.edit) return null;
    const said = proofs[0] ? studySays(proofs[0], ctx) : undefined;
    const verdict = proofs[0]?.overrule?.verdict ?? said?.verdict;
    const as: 'passed' | 'failed' | undefined = verdict === 'Passed' ? 'passed' : verdict === 'Didn’t pass' ? 'failed' : undefined;
    return (
      <div className="rd-blk sl">
        <small>Proved by</small>
        {proofs.map(s => <StudyRow key={s.id} s={s} ctx={ctx} />)}
        <div className="rd-acts">
          {can.edit && (
            <span className="sl-name">
              <select className="text-input sl-tool" value={readingTool} aria-label="Which tool proves it" onChange={e => setReadingTool(e.target.value as ToolStudy['tool'])}>
                {PROOF_TOOLS.map(k => <option key={k} value={k}>{TOOL_NAME[k]}</option>)}
              </select>
              <input className="text-input" value={readingName} maxLength={120} aria-label="Name for the readings"
                placeholder={proofs.length ? 'Name the next study — e.g. 75 ppm' : `Name it — e.g. 60 ppm (else ${t.title})`} onChange={e => setReadingName(e.target.value)} />
              {/* AS MANY STUDIES AS THE PROGRAM NEEDS (Rowland, 26 October: "I can't then put another study ready to go ... as many studies as I want ... quickly get them ready, go through the list"): line one up and stay, or open it now */}
              <button type="button" className="btn" onClick={() => { void putStudy(made()); setReadingName(''); }}>Line it up</button>
              <button type="button" className="btn btn-primary" onClick={() => void start(made())}>{proofs.length ? 'Take the readings now' : 'Take the readings'}</button>
            </span>
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
  const ctx = useStudyContext(studies);
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  const evidence = linkedTo(studies, kind, id, 'evidence');
  const proofs = linkedTo(studies, kind, id, 'proof');
  if (!evidence.length && !proofs.length) return null;
  const ba = beforeAfter(studies, id, kind, ctx);
  const start = async (s: ToolStudy) => { await putStudy(s); nav(href(s)); };
  return (
    <div className="rd-blk sl">
      {evidence.length > 0 && <small>How we know</small>}
      {evidence.map(s => <StudyRow key={s.id} s={s} ctx={ctx} />)}
      {proofs.length > 0 && <small>Proved by</small>}
      {proofs.map(s => <StudyRow key={s.id} s={s} ctx={ctx} />)}
      {ba && <p className={'sl-ba is-' + ba.tone}><b>Before → after:</b> {ba.text}</p>}
      {can.edit && evidence[0] && !proofs.length && (
        <div className="rd-acts">
          <button type="button" className="btn btn-primary" onClick={() => void start(proveItFrom(evidence[0], id, { at: now(), by: me, id: uid(), useId: uid() }, kind))}>{evidence[0].tool === 'map' ? 'Prove it — walk the line again' : evidence[0].tool === 'changeover' ? 'Prove it — time the changeover again' : evidence[0].tool === 'losses' ? 'Prove it — count the next shift' : 'Prove it — the same study, after'}</button>
        </div>
      )}
    </div>
  );
}

/** A CAUSE'S STUDIES on a running line's fishbone — how we know it. */
export function CauseStudies({ projectId, causeRef }: { projectId: string; causeRef: string }) {
  const all = useJobStudies(projectId);
  const ctx = useStudyContext(all);
  const studies = linkedTo(all, 'cause', causeRef, 'evidence');
  if (!studies.length) return null;
  return (
    <div className="sl sl-cause">
      <small>How we know</small>
      {studies.map(s => <StudyRow key={s.id} s={s} ctx={ctx} />)}
    </div>
  );
}
