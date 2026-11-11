/* A STUDY, RENAMED AND DELETED WHERE IT SITS — on its own page and on every
 * row of its tool's list (Rowland, 13 October: "always implement deletes and
 * editing in everything"; docs/AUDIT.md, bar 2).
 *
 * Until now no study could be deleted anywhere — db/studies deleteStudy had
 * no caller — and a value stream map or a work sampling study could not be
 * renamed even on its own page. One name-and-delete for all five tools'
 * pages, the three copies of the capability study's, SMED's and the loss
 * count's own Name merged into it, so a tool added later has both for free.
 *
 * Who may: on a job, the job's rule (lib/access — the team renames, the owner
 * deletes: the cloud keeps a study's deleted_at for anyone else, STUDIES.sql);
 * a quick session or a line's, its people, as on a problem (TOOLKIT 3.6).
 * The delete asks first, saying what goes with it (lib/studyLinks
 * studyRemovingSays), and Undo puts it back whole. */
import { useState } from 'react';
import { deleteStudy, patchStudy } from '../db';
import { nav } from '../state/useRoute';
import { offerUndo } from './Undo';
import { studyRemovingSays, toolListHref } from '../lib/studyLinks';
import type { ToolStudy } from '../lib/study';
import type { LeanPage } from '../lib/lean';
import { LeanBand } from './Lean';
import { MoreMenu, ReportMenu, type MoreItem, type Paper } from './parts';
import { useStudyPaper } from './StudyPlace';
import { useSaveOnArrival } from '../lib/useSaveOnArrival';
import { ShareReadings } from './ShareReadings';
import { shareOffer } from '../lib/sharedReadings';
import { toolProblemMenu } from './ToolProblems';

/** Asked, deleted, and offered back. True when it went. */
export async function removeStudy(s: ToolStudy): Promise<boolean> {
  const said = studyRemovingSays(s);
  if (!window.confirm(said.ask)) return false;
  offerUndo(said.done, await deleteStudy(s.id));
  return true;
}

/** The study's name as its page's heading — typed over in its place when More ▾'s Rename is
 *  pressed (docs/STRUCTURE.md §5.5, B4: Rename and Delete were links beside the name). */
export function StudyName({ s, naming, onDone }: { s: ToolStudy; naming: boolean; onDone: () => void }) {
  const [v, setV] = useState(s.name);
  if (!naming) return <h1 className="ie-name">{s.name || 'Not named'}</h1>;
  const save = () => { if (v.trim() && v.trim() !== s.name) void patchStudy(s.id, { name: v.trim() }); onDone(); };
  return (
    <form className="ie-name-f" onSubmit={e => { e.preventDefault(); save(); }}>
      <input className="text-input" value={v} maxLength={120} autoFocus onChange={e => setV(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === 'Escape') { setV(s.name); onDone(); } }} aria-label="What it is of" />
    </form>
  );
}

/** THE TOOL SHELL'S MENUS on a study (docs/STRUCTURE.md §5.5, B4) — More ▾: Rename, and Delete
 *  with Undo, going back to the tool's list (on its line, when it is on one); Report ▾: its papers. */
export function StudyMenus({ s, canEdit, canRemove, onRename, papers = [], extra = [], primary }: {
  s: ToolStudy; canEdit: boolean; canRemove: boolean; onRename: () => void; papers?: Paper[];
  /** The tool's own actions in More ▾, before Rename and Delete (a tool may add its own). */
  extra?: MoreItem[];
  /** The tool's one primary action, beside More ▾ and Report ▾ (the page header's: one primary). */
  primary?: { label: string; run: () => void };
}) {
  const more: MoreItem[] = [
    ...extra,
    /* LINE TALK FROM THE TOOL (5 November): talk about what this tool found, on its line */
    ...(canEdit && s.workspaceId ? [{ label: 'Talk about this on the line', run: () => nav(`/talk?line=${encodeURIComponent(s.workspaceId as string)}`) }] : []),
    ...(canEdit ? [{ label: 'Rename', run: onRename }] : []),
    ...(canRemove ? [{ label: 'Delete', danger: true, run: () => void removeStudy(s).then(gone => { if (gone) nav(toolListHref(s)); }) }] : []),
  ];
  if (!more.length && !papers.length && !primary) return null;
  return (
    <div className="ln-band-acts">
      <MoreMenu items={more} />
      <ReportMenu papers={papers} />
      {primary && <button type="button" className="btn btn-primary" onClick={primary.run}>{primary.label}</button>}
    </div>
  );
}

/** THE TOOL SHELL'S HEADER on a study — the lean page's band (what, where, when, its verdict), the
 *  record's name, and its menus: one header on every tool (§5.5). `what` names its paper. */
export function StudyBand({ page, s, what, canEdit, canRemove, extra, primary }: { page: LeanPage; s: ToolStudy; what: string; canEdit: boolean; canRemove: boolean; extra?: MoreItem[]; primary?: { label: string; run: () => void } }) {
  const [naming, setNaming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const paper = useStudyPaper(s);
  /* ?save=1 — every tool's record makes its own paper on arrival (docs/AI-OPERATING.md: AI Mode's make_report opens it so) */
  useSaveOnArrival(paper.ready, paper);
  /* USE THESE READINGS IN… (knowledge/specs/FC-094-shared-readings.md): Capability, Control chart and Analysis start from one
     another's readings — one mechanism here, so the three tools have it from one place; shown disabled, with its reason, when
     there is nothing to share, and never to a client */
  const offer = canEdit ? shareOffer(s) : undefined;
  /* RAISE A PROBLEM HERE · LINK A PROBLEM… (docs/TOOL-PROBLEMS.md, slice 2) — on every tool record, for somebody who may change the work */
  const held = toolProblemMenu(s, canEdit);
  const shared: MoreItem[] = offer ? [{ label: 'Use these readings in…', run: () => setSharing(true), disabled: !offer.targets.length, ...(offer.targets.length ? {} : { hint: offer.why }) }] : [];
  const all = [...(extra ?? []), ...shared, ...held];
  const items: MoreItem[] | undefined = all.length ? all : undefined;
  return (
    <LeanBand className="ep-tool-band" page={page} title={<StudyName s={s} naming={naming} onDone={() => setNaming(false)} />}>
      <StudyMenus s={s} canEdit={canEdit} canRemove={canRemove} onRename={() => setNaming(true)} extra={items} primary={primary}
        papers={[{ label: `${what} — on paper`, for: 'What it is, where it sits, what it says and its figures', make: paper }]} />
      {sharing && <ShareReadings s={s} onClose={() => setSharing(false)} />}
    </LeanBand>
  );
}

/** The same two on a row of a tool's list: the name typed over in the row,
 *  Delete with Undo. `naming` is the row's own state, so the list draws the
 *  form in the row's place. */
export function StudyRowName({ s, onDone }: { s: ToolStudy; onDone: () => void }) {
  const [v, setV] = useState(s.name);
  const save = async () => {
    const t = v.trim();
    if (!t) return;
    if (t !== s.name) await patchStudy(s.id, { name: t });
    onDone();
  };
  return (
    <form className="lt-name" onSubmit={e => { e.preventDefault(); void save(); }}>
      <input className="text-input" autoFocus value={v} maxLength={120} aria-label={`The study's name — ${s.name || 'Not named'}`} onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onDone(); }} />
      <button type="submit" className="btn btn-primary btn-sm" disabled={!v.trim()}>Save</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
    </form>
  );
}
