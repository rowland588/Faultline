/* PROBLEMS HELD INSIDE A TOOL (docs/TOOL-PROBLEMS.md — Rowland, 11 November, on a live test at a customer: "inside the tool, you should be able
 * to raise a problem from inside the tool, because it could be a specific station or a specific place, specific asset, where it's then held within
 * the tool. Yes, you'll see it on a problem page … but it also will be held inside the tool itself").
 *
 * NO NEW RECORD. A problem is a problem (snag/types Snag, the register's); it names the tool records it is about in `tools` (snag/toolLink). Here:
 *   raiseProblemHere   opens the one problem sheet (snag/QuickSnag) with the record's line, project and the part as the machine, the part's pictures
 *                      offered to go with it (the same files), held by the record;
 *   PartProblems       a part's count, "1 problem open", a door to it;
 *   ToolProblems       the record's *Problems raised here* — rows that are doors, each with its part, priority, who, due and where it stands; Unlink
 *                      with Undo; *Link a problem…* for one raised elsewhere;
 *   ToolLinksBlock     on the problem: *Raised from …* and *Linked to …*, each a door to the record, Unlink, *Link to a tool record…*.
 * Every write checks the person may change the work (can.edit); a client sees the list and the links. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllSnags, listAllStudies, onDataChange, patchSnag } from '../db';
import type { Snag } from '../snag/types';
import type { ToolStudy } from '../lib/study';
import { linkedTo, partOn, problemLine, problemStands, problemsOn, toolLinksOf, withToolLink, withoutToolLink, type ToolLink } from '../snag/toolLink';
export { problemLine, problemStands };
import { openQuickSnag } from '../snag/QuickSnag';
import { openProblem } from '../snag/ProblemPanel';
import { attachmentsOf, asMedia } from '../lib/attachments';
import { partName, partsOf, raisedFromSaid, toolPartSaid } from '../lib/toolPart';
export { raisedFromSaid };
import { studyHref } from '../lib/studyLinks';
import type { MediaRef } from '../types';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';
import { offerUndo } from './Undo';
import type { MoreItem } from './parts';
import './toolProblems.css';

/* ----------------------------------------------------------------- reading */

/** Every live problem on this device, kept current. */
export function useAllProblems(): Snag[] | null {
  const [list, setList] = useState<Snag[] | null>(null);
  const load = useCallback(async () => setList(await listAllSnags()), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return list;
}

/** Every live tool record on this device, kept current — what a problem's links are said by. */
export function useToolRecords(): ToolStudy[] | null {
  const [list, setList] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => setList((await listAllStudies()).filter(s => !s.deletedAt)), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return list;
}

/* ----------------------------------------------------------------- raising */

/** Open the problem sheet as raised from this record — or from one part of it, named as the machine, its pictures offered to go with it. */
export function raiseProblemHere(s: ToolStudy, part?: string): void {
  const media = attachmentsOf(s, part ?? '').map(asMedia).filter((m): m is MediaRef => !!m);
  const name = part ? partName(s, part) : '';
  openQuickSnag(undefined, {
    tool: { studyId: s.id, ...(part ? { part } : {}) },
    said: toolPartSaid(s, part),
    ...(s.workspaceId ? { workspaceId: s.workspaceId } : {}),
    ...(s.projectId ? { projectId: s.projectId } : {}),
    ...(name ? { machine: name } : s.machine ? { machine: s.machine } : {}),
    ...(media.length ? { media } : {}),
  });
}

/** Link a problem to a record (and part) — and how to take it back. */
async function link(snagId: string, l: ToolLink): Promise<void> {
  await patchSnag(snagId, cur => ({ tools: withToolLink(cur.tools, l), updatedAt: Date.now() }));
}
async function unlink(p: Snag, studyId: string, part?: string, said?: string): Promise<void> {
  const was = (p.tools ?? []).find(l => l.studyId === studyId && (l.part ?? '') === (part ?? ''));
  await patchSnag(p.id, cur => ({ tools: withoutToolLink(cur.tools, studyId, part), updatedAt: Date.now() }));
  offerUndo(`Unlinked “${short(p.problem)}”${said ? ` from ${said}` : ''}`, async () => { if (was) await link(p.id, was); });
}
const short = (w: string) => (w.trim().length > 40 ? `${w.trim().slice(0, 39)}…` : w.trim() || 'the problem');

/* LINK A PROBLEM… is pressed in the header's More ▾ (ui/StudyActs) and its sheet belongs to the record's list (below, under the notes): the
   list listens for its record's id. */
const linkAsked = new Map<string, () => void>();
export const askToLink = (studyId: string): void => linkAsked.get(studyId)?.();

/** The record's More ▾: Raise a problem here, Link a problem… — for somebody who may change the work. Every tool on the study shell has them
 *  (StudyBand), the list answering under its notes (Commentary). */
export function toolProblemMenu(s: ToolStudy, canEdit: boolean, onLink: () => void = () => askToLink(s.id)): MoreItem[] {
  if (!canEdit) return [];
  return [
    { label: 'Raise a problem here', run: () => raiseProblemHere(s), hint: 'Held on this record and on Problems' },
    { label: 'Link a problem…', run: onLink, hint: 'One already raised on the line' },
  ];
}

/* ----------------------------------------------------------- on the record */

/** A PART'S PROBLEMS — "1 problem open", a door: one opens itself, several the record's list. Nothing when it holds none. */
export function PartProblems({ s, part, all }: { s: ToolStudy; part: string; all: Snag[] | null }) {
  const mine = useMemo(() => problemsOn(all ?? [], s.id, part), [all, s.id, part]);
  if (!mine.length) return null;
  const open = mine.filter(p => p.status !== 'closed');
  const red = open.some(p => problemStands(p).red);
  const said = open.length ? `${open.length} problem${open.length === 1 ? '' : 's'} open` : `${mine.length} problem${mine.length === 1 ? '' : 's'} closed`;
  const go = () => {
    if (mine.length === 1) { openProblem(mine[0].id); return; }
    document.getElementById('tool-problems')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <button type="button" className={'tp-chip' + (red ? ' is-r' : '')} data-part-problems={part} onClick={go}
      aria-label={`${partName(s, part)}: ${said}${red ? ' — one is late or critical' : ''} — open`}>
      {said}{red && <span className="tp-chip-w"> · {open.some(p => problemStands(p).late) ? 'late' : 'critical'}</span>}
    </button>
  );
}

/** THE RECORD'S PROBLEMS, ON ITS OWN — what every tool's notes carry (ui/Commentary): the list read here, Link a problem… answered here. */
export function ToolProblemsHere({ s, canEdit }: { s: ToolStudy; canEdit: boolean }) {
  const all = useAllProblems();
  const [linking, setLinking] = useState(false);
  useEffect(() => { linkAsked.set(s.id, () => setLinking(true)); return () => { linkAsked.delete(s.id); }; }, [s.id]);
  return <ToolProblems s={s} canEdit={canEdit} all={all} linking={linking} onLinking={setLinking} />;
}

/** PROBLEMS RAISED HERE — on the record, only once it holds one (or one is being linked); each row a door to the problem. */
export function ToolProblems({ s, canEdit, all, linking, onLinking }: { s: ToolStudy; canEdit: boolean; all: Snag[] | null; linking: boolean; onLinking: (v: boolean) => void }) {
  const mine = useMemo(() => problemsOn(all ?? [], s.id), [all, s.id]);
  const open = mine.filter(p => p.status !== 'closed').length;
  return (
    <>
      {mine.length > 0 && (
        <section className="tp" id="tool-problems" aria-label="Problems raised here" data-tool-problems={s.id}>
          <div className="tp-h">
            <h2>Problems raised here</h2>
            <span className="sub">{open} open{mine.length > open ? ` · ${mine.length - open} closed` : ''}</span>
          </div>
          <ul className="tp-rows">
            {mine.map(p => {
              const part = partOn(p, s.id);
              const st = problemStands(p);
              return (
                <li key={p.id} className={'tp-row' + (p.status === 'closed' ? ' is-closed' : '')} data-tool-problem={p.id}>
                  <button type="button" className="tp-open" onClick={() => openProblem(p.id)}>
                    <span className="tp-what">{p.problem.trim() || 'A problem with no words yet'}</span>
                    <span className="tp-meta">{part ? <b>{partName(s, part)}</b> : 'The whole record'} · {problemLine(p)}</span>
                  </button>
                  <span className={'tp-state' + (st.red ? ' is-r' : p.status === 'closed' ? ' is-g' : '')}>{st.word}</span>
                  {canEdit && <button type="button" className="linkish tp-unlink" data-tp-unlink onClick={() => void unlink(p, s.id, part || undefined, 'this record')}>Unlink</button>}
                </li>
              );
            })}
          </ul>
          {canEdit && (
            <div className="tp-acts">
              <button type="button" className="btn" data-tp-raise onClick={() => raiseProblemHere(s)}>Raise a problem here</button>
              <button type="button" className="btn btn-ghost" data-tp-link onClick={() => onLinking(true)}>Link a problem…</button>
            </div>
          )}
        </section>
      )}
      {canEdit && <LinkProblemSheet s={s} all={all} open={linking} onClose={() => onLinking(false)} />}
    </>
  );
}

/** LINK A PROBLEM — the line's open problems not held here yet; which part it is about, if any. */
function LinkProblemSheet({ s, all, open, onClose }: { s: ToolStudy; all: Snag[] | null; open: boolean; onClose: () => void }) {
  const parts = useMemo(() => partsOf(s), [s]);
  const [part, setPart] = useState('');
  const offered = useMemo(() => (all ?? []).filter(p => !p.deletedAt && !p.archivedAt && p.status !== 'closed' && !linkedTo(p, s.id)
    && (!s.workspaceId || p.workspaceId === s.workspaceId)).sort((a, b) => b.raisedAt - a.raisedAt), [all, s.id, s.workspaceId]);
  const pick = async (p: Snag) => {
    const l: ToolLink = { studyId: s.id, ...(part ? { part } : {}) };
    await link(p.id, l);
    offerUndo(`Linked “${short(p.problem)}”`, async () => { await patchSnag(p.id, cur => ({ tools: withoutToolLink(cur.tools, s.id, part || undefined), updatedAt: Date.now() })); });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Link a problem to this record">
      <div className="tp-sheet" data-tp-link-sheet>
        {parts.length > 0 && (
          <div className="tp-parts" role="group" aria-label="Which part">
            <span className="sub">About</span>
            <div className="chip-row">
              <button type="button" className={'chip' + (part === '' ? ' on' : '')} aria-pressed={part === ''} onClick={() => setPart('')}>The whole record</button>
              {parts.map(x => <button key={x.id} type="button" className={'chip' + (part === x.id ? ' on' : '')} aria-pressed={part === x.id} onClick={() => setPart(x.id)}>{x.name}</button>)}
            </div>
          </div>
        )}
        {offered.length === 0
          ? <p className="sub">No open problem on this line is waiting to be linked — raise one here instead.</p>
          : (
            <ul className="tp-rows">
              {offered.map(p => (
                <li key={p.id} className="tp-row">
                  <button type="button" className="tp-open" data-tp-pick={p.id} onClick={() => void pick(p)}>
                    <span className="tp-what">{p.problem.trim() || 'A problem with no words yet'}</span>
                    <span className="tp-meta">{[p.targetAsset, problemLine(p)].filter(Boolean).join(' · ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------ on the problem */

/** The address that opens a record at a part. */
export const toolLinkHref = (st: ToolStudy, part?: string): string => `${studyHref(st)}${part ? `${studyHref(st).includes('?') ? '&' : '?'}part=${encodeURIComponent(part)}` : ''}`;

/** ON THE PROBLEM: where it was raised from and the records it is linked to, each a door; Unlink; Link to a tool record…. */
export function ToolLinksBlock({ p, edit, className = 'pe-f pe-wide', label = 'pe-k', onGo }: { p: Snag; edit: boolean; className?: string; label?: string; onGo?: () => void }) {
  const records = useToolRecords();
  const [picking, setPicking] = useState(false);
  const links = toolLinksOf(p);
  if (!links.length && !edit) return null;
  return (
    <div className={`${className} tp-links`} data-tool-links={p.id}>
      <span className={label}>TOOL RECORDS <i className="cw-f-opt">where it was raised, and what it is linked to</i></span>
      {links.length > 0 && (
        <ul className="tp-links-l">
          {links.map(l => {
            const st = records?.find(r => r.id === l.studyId);
            const said = st ? toolPartSaid(st, l.part) : 'a tool record not on this device';
            return (
              <li key={`${l.studyId}:${l.part ?? ''}`} data-tool-link={l.studyId}>
                <span className="sub">{l.raised ? 'Raised from' : 'Linked to'}</span>{' '}
                {st ? <button type="button" className="linkish tp-door" onClick={() => { const to = toolLinkHref(st, l.part); if (onGo) { onGo(); window.setTimeout(() => nav(to), 60); } else nav(to); }}>{said} ›</button> : <span>{said}</span>}
                {edit && <button type="button" className="linkish tp-unlink" data-tp-unlink onClick={() => void unlink(p, l.studyId, l.part, said)}>Unlink</button>}
              </li>
            );
          })}
        </ul>
      )}
      {edit && (picking
        ? <LinkRecordForm p={p} records={records} onDone={() => setPicking(false)} />
        : <button type="button" className="linkish tp-link-rec" data-tp-link-record onClick={() => setPicking(true)}>Link to a tool record…</button>)}
    </div>
  );
}

/** Which of the line's tool records, and which part of it. */
function LinkRecordForm({ p, records, onDone }: { p: Snag; records: ToolStudy[] | null; onDone: () => void }) {
  const offered = useMemo(() => (records ?? []).filter(r => r.workspaceId === p.workspaceId && r.tool !== 'story' && !linkedTo(p, r.id))
    .sort((a, b) => (b.updatedAt ?? b.startedAt) - (a.updatedAt ?? a.startedAt)), [records, p]);
  const [rec, setRec] = useState('');
  const [part, setPart] = useState('');
  const st = offered.find(r => r.id === rec);
  const parts = st ? partsOf(st) : [];
  const go = async () => {
    if (!st) return;
    await link(p.id, { studyId: st.id, ...(part ? { part } : {}) });
    offerUndo(`Linked to ${toolPartSaid(st, part || undefined)}`, async () => { await patchSnag(p.id, cur => ({ tools: withoutToolLink(cur.tools, st.id, part || undefined), updatedAt: Date.now() })); });
    onDone();
  };
  if (!offered.length) return <p className="sub">No tool record on this line to link it to yet. <button type="button" className="linkish" onClick={onDone}>Close</button></p>;
  return (
    <form className="tp-link-form" onSubmit={e => { e.preventDefault(); void go(); }}>
      <select className="text-input" value={rec} aria-label="Which tool record" onChange={e => { setRec(e.target.value); setPart(''); }}>
        <option value="">Which tool record?</option>
        {offered.map(r => <option key={r.id} value={r.id}>{toolPartSaid(r)}</option>)}
      </select>
      {parts.length > 0 && (
        <select className="text-input" value={part} aria-label="Which part of it" onChange={e => setPart(e.target.value)}>
          <option value="">The whole record</option>
          {parts.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      )}
      <button type="submit" className="btn btn-primary" disabled={!st}>Link it</button>
      <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
    </form>
  );
}
