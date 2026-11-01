/* THE DOCUMENTS — their pages (knowledge/specs/FC-240-documents.md; 1 November 2026).
 *
 *   #/doc              the hub: every kind of document by group, how many are saved, the saved ones below
 *   #/doc/:key         one kind: what it is for, its saved ones, New
 *   #/doc/:key/:id     one saved document: its boxes left, the live reading right, its agreement
 *
 * A document is a study of tool `doc` (lib/study): on a line, in a project, or on none. Its page and its paper are drawn from the
 * definition's own reading (./doc, ./defs/<key>) so the screen, the paper and the acceptance script say one thing. Access as the other
 * tools: a team member types the words (can.edit), the owner agrees it and deletes it (can.agree, can.remove), a client reads it and
 * takes the paper. */
import './doc.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStudy, listAllStudies, onDataChange, patchStudy, putBlob, putStudy } from '../../db';
import { useAccess } from '../../cloud/access';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { can as canAt } from '../../lib/access';
import { asked } from '../../lib/lines';
import { inScope, startLine, type ProjectScope } from '../../lib/inProject';
import { useInProject } from '../../lib/useInProject';
import { useFactoryLines, useArchivedPlaces } from '../../lib/useFactoryLines';
import { useProjects } from '../../lib/useProjects';
import { now, uid } from '../../lib/ids';
import { bandPage } from '../../lib/lean';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import type { ToolStudy } from '../../lib/study';
import { studyHref } from '../../lib/studyLinks';
import { PageHeader, Section } from '../../ui/parts';
import { Sheet } from '../../ui/Sheet';
import { ProjectScopeChips } from '../../ui/ProjectScope';
import { LeanActions, LeanClosing, LeanPanel } from '../../ui/Lean';
import { offerUndo } from '../../ui/Undo';
import { StudyBand, removeStudy, StudyRowName } from '../../ui/StudyActs';
import { UsedFor, WhereItSits, useBetter } from '../../ui/StudyPlace';
import { raisedFrom } from '../losses/lossLean';
import { docByKey, docGroups } from './registry';
import { docSays, newDocStudy, runDoc, studyPhotos, studyRaw, withValue } from './doc';
import { useDocCtx } from './context';
import { DocForm } from './DocForm';
import { ReadingView, SignBox } from './DocView';
import type { DocDef, DocPhoto, DocRow, DocValue, DocValues } from './types';

const OWNER = canAt('owner');

/** The three pages. */
export function DocScreen({ docKey, id }: { docKey?: string; id?: string }) {
  if (id) return <DocRecord id={id} />;
  if (docKey) return <DocList docKey={docKey} />;
  return <DocHub />;
}

/* --------------------------------------------------------------- what is saved */

/** Every saved document on this device, newest first, kept current. */
function useDocs(): ToolStudy[] | null {
  const [list, setList] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => setList((await listAllStudies()).filter(s => s.tool === 'doc')), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return list;
}

/** Which of them a page shows: a line's own, a project's own (and its lines'), else all — the same rule every tool's list keeps. */
function useShown(list: ToolStudy[] | null) {
  const onLine = useMemo(() => asked('line'), []);
  const inP = useInProject();
  const [scope, setScope] = useState<ProjectScope>('project');
  const put = useArchivedPlaces();
  const shown = useMemo(() => {
    const base = inScope(list ?? [], scope, inP.id, inP.lineIds).filter(s => {
      const k = s.workspaceId ? `ws:${s.workspaceId}` : s.projectId ? `job:${s.projectId}` : 'none';
      return !put.has(k) || (inP.id && s.projectId === inP.id);
    });
    return onLine ? base.filter(s => s.workspaceId === onLine) : base;
  }, [list, scope, inP.id, inP.lineIds, put, onLine]);
  return { shown, onLine, inP, scope, setScope };
}

/** A saved document on a list: its name, what it says, where it stands — renamed and deleted where it sits. */
function DocListRow({ s, withTitle }: { s: ToolStudy; withTitle: boolean }) {
  const jobCan = useAccess(s.projectId ?? '');
  const may = s.projectId ? jobCan : OWNER;
  const [naming, setNaming] = useState(false);
  const said = docSays(s);
  const def = docByKey(s.agreed?.doc?.def);
  if (naming) return <li className="lt-li is-naming" data-study={s.id}><StudyRowName s={s} onDone={() => setNaming(false)} /></li>;
  return (
    <li className="lt-li" data-study={s.id}>
      <button type="button" className="lt-row" onClick={() => nav(studyHref(s))}>
        <b className="lt-what">{s.name || 'Not named'}</b>
        <span className={'lt-says ie-tone is-' + said.tone}>{said.text}</span>
        <span className="lt-where">{withTitle ? `${def?.title ?? 'Document'} · ` : ''}{said.verdict}</span>
      </button>
      {((may.edit && !s.closedAt) || may.remove) && (
        <span className="lt-acts">
          {may.edit && !s.closedAt && <button type="button" className="cw-link" onClick={() => setNaming(true)} aria-label={`Rename ${s.name || 'this document'}`}>Rename</button>}
          {may.remove && <button type="button" className="cw-link sp-rm" onClick={() => void removeStudy(s)} aria-label={`Delete ${s.name || 'this document'}`}>Delete</button>}
        </span>
      )}
    </li>
  );
}

/** The list's paper: every document shown, a page each (lib/studiesPdf). */
function useListPaper(shown: ToolStudy[], title: string) {
  const { projects } = useProjects();
  const lines = useFactoryLines();
  return async () => {
    try {
      const [{ saveStudiesPdf }, { listAllStandards }] = await Promise.all([import('../../lib/studiesPdf'), import('../../db')]);
      const items = shown.map(s => {
        const line = lines.find(l => l.id === s.workspaceId), job = projects.find(p => p.id === s.projectId);
        return { s, where: `${line ? `On ${line.name}` : 'On no line'} · ${job ? `attached to ${job.name}` : 'on no project'}` };
      });
      await saveStudiesPdf({ title, printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), items, standards: await listAllStandards(), ctx: { workspaces: lines } }, title);
    } catch (e) {
      console.error('documents pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    }
  };
}

/* --------------------------------------------------------------------- the hub */

function DocHub() {
  const list = useDocs();
  const { shown, onLine, inP, scope, setScope } = useShown(list);
  const lines = useFactoryLines(onLine);
  const lineName = onLine ? lines.find(l => l.id === onLine)?.name ?? 'this line' : undefined;
  const paper = useListPaper(shown, lineName ? `Documents — ${lineName}` : inP.project && scope === 'project' ? `Documents — ${inP.project.name}` : 'Documents');
  const by = (key: string) => shown.filter(s => s.agreed?.doc?.def === key);
  const query = onLine ? `?line=${encodeURIComponent(onLine)}` : inP.id ? `?project=${encodeURIComponent(inP.id)}` : '';
  return (
    <div className="wrap qsl ie-list doc-hub">
      <PageHeader title="Documents" says={<span className="sub">A page the team agrees — a charter, a SIPOC, what the customer needs, an 8D report. Fill in the boxes, see what is still needed and what it says, have it agreed by name and date, and print it.</span>}
        papers={shown.length ? [{ label: 'Documents — every one shown', for: 'each with what it says and the boxes filled in', make: paper }] : []} />
      {inP.id && <ProjectScopeChips name={inP.project?.name} lines={inP.lineIds.length} scope={scope} onScope={setScope} />}
      {onLine && (
        <div className="chip-row qsl-f" role="group" aria-label="Which line">
          <button type="button" className="chip on" aria-pressed>{lineName}</button>
          <button type="button" className="chip" onClick={() => nav('/doc')}>All lines</button>
        </div>
      )}
      {docGroups().map(g => (
        <Section key={g.group} title={g.group} count={`${g.docs.length} kind${g.docs.length === 1 ? '' : 's'} of document`} label={g.group}>
          <ul className="calc-cards">
            {g.docs.map(c => {
              const mine = by(c.key), latest = mine[0];
              return (
                <li key={c.key}>
                  <button type="button" className="calc-card" data-doc-card={c.key} onClick={() => nav(`/doc/${c.key}${query}`)}>
                    <b>{c.title}</b>
                    <span className="sub">{c.says}</span>
                    <span className={'calc-card-n' + (mine.length ? '' : ' is-none')}>{mine.length ? `${mine.length} saved` : 'none saved yet'}</span>
                    {latest && <span className="sub calc-card-latest">{latest.name}: {docSays(latest).verdict}</span>}
                    <span className="pl-tool-go" aria-hidden>›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
      <Section title="Saved documents" count={`${shown.length}`} label="Saved documents">
        {list && shown.length === 0
          ? <p className="sub qsl-empty-p">{onLine ? `None on ${lineName} yet.` : inP.id && scope !== 'all' ? `None ${scope === 'project' ? 'on' : 'on the lines of'} ${inP.project?.name ?? 'this project'} yet.` : 'None yet — pick a kind above, name it, and fill in the boxes.'}</p>
          : <ul className="lt-rows">{shown.map(s => <DocListRow key={s.id} s={s} withTitle />)}</ul>}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------- one kind's list */

function DocList({ docKey }: { docKey: string }) {
  const def = docByKey(docKey);
  const list = useDocs();
  const { shown: all, onLine, inP, scope, setScope } = useShown(list);
  const lines = useFactoryLines(onLine);
  const mayP = useAccess(inP.id ?? '');
  const mayAdd = !inP.id || mayP.edit;
  const [adding, setAdding] = useState(() => asked('add') === '1');
  const shown = all.filter(s => s.agreed?.doc?.def === docKey);
  const lineName = onLine ? lines.find(l => l.id === onLine)?.name ?? 'this line' : undefined;
  const paper = useListPaper(shown, `${def?.title ?? 'Document'}${lineName ? ` — ${lineName}` : ''}`);
  const { projects } = useProjects();
  const groups = useMemo(() => {
    const by = new Map<string, ToolStudy[]>();
    for (const s of shown) { const k = s.workspaceId ? `ws:${s.workspaceId}` : s.projectId ? `job:${s.projectId}` : 'none'; by.set(k, [...(by.get(k) ?? []), s]); }
    return [...by.entries()].sort(([a], [b]) => (a === 'none' ? -1 : b === 'none' ? 1 : a.localeCompare(b)));
  }, [shown]);
  const groupName = (k: string) => (k === 'none' ? 'Not filed' : k.startsWith('ws:') ? lines.find(l => l.id === k.slice(3))?.name ?? 'A line' : `Project: ${projects.find(p => p.id === k.slice(4))?.name ?? 'a project'}`);
  if (!def) {
    return (
      <div className="wrap ie"><h1>That document isn’t in this version</h1><p className="sub">It may be newer than this build of the app.</p>
        <button type="button" className="btn" onClick={() => nav('/doc')}>Every document</button></div>
    );
  }
  const back = onLine ? `?line=${encodeURIComponent(onLine)}` : inP.id ? `?project=${encodeURIComponent(inP.id)}` : '';
  return (
    <div className="wrap qsl ie-list doc-list-page" data-doc-list={def.key}>
      <PageHeader eyebrow={<button type="button" className="linkish" onClick={() => nav(`/doc${back}`)}>All documents</button>} title={def.title}
        says={<span className="sub">{def.says}. {def.question}</span>}
        primary={mayAdd ? { label: `New ${def.noun}`, run: () => setAdding(true) } : undefined}
        papers={shown.length ? [{ label: `${def.title} — every one shown`, for: 'each with what it says and the boxes filled in', make: paper }] : []} />
      {inP.id && <ProjectScopeChips name={inP.project?.name} lines={inP.lineIds.length} scope={scope} onScope={setScope} />}
      {onLine && (
        <div className="chip-row qsl-f" role="group" aria-label="Which line">
          <button type="button" className="chip on" aria-pressed>{lineName}</button>
          <button type="button" className="chip" onClick={() => nav(`/doc/${def.key}`)}>All lines</button>
        </div>
      )}
      {list && groups.length === 0 && (
        <div className="qsl-empty">
          <p>{onLine ? `None on ${lineName} yet.` : `No ${def.noun} yet. Name it, fill in the boxes, and see what it says as you type.`}</p>
          {mayAdd && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>New {def.noun}</button>}
        </div>
      )}
      {groups.map(([k, rows]) => (
        <section key={k} className="qsl-g">
          <div className="qsl-gh"><h2>{groupName(k)}</h2><span className="sub">{rows.length} saved{k === 'none' ? ' — yours alone until you put one on a line' : ''}</span></div>
          <ul className="lt-rows">{rows.map(s => <DocListRow key={s.id} s={s} withTitle={false} />)}</ul>
        </section>
      ))}
      {(def.see ?? []).length > 0 && (
        <p className="sub calc-see">{def.see?.map(x => {
          const c = docByKey(x.key);
          return c ? <span key={x.key}><button type="button" className="linkish" onClick={() => nav(`/doc/${c.key}${back}`)}>{c.title}</button> — {x.why}. </span> : null;
        })}</p>
      )}
      <NewDoc open={adding} def={def} onClose={() => setAdding(false)} onLine={onLine} project={inP.project && mayAdd ? { id: inP.project.id, name: inP.project.name, lineIds: inP.lineIds } : undefined} />
    </div>
  );
}

/** A NEW ONE — what it is of, and the line when it is known. */
function NewDoc({ open, def, onClose, onLine, project }: { open: boolean; def: DocDef; onClose: () => void; onLine?: string; project?: { id: string; name: string; lineIds: string[] } }) {
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState(onLine ?? '');
  const [busy, setBusy] = useState(false);
  const pLines = project?.lineIds;
  useEffect(() => { if (open && !lineId && pLines) setLineId(startLine(pLines)); }, [open, lineId, pLines]);
  const factoryLines = useFactoryLines(onLine);
  const lines = useMemo(() => (pLines?.length ? [...factoryLines.filter(l => pLines.includes(l.id)), ...factoryLines.filter(l => !pLines.includes(l.id))] : factoryLines), [factoryLines, pLines]);
  const ready = !!name.trim() && !busy;
  const make = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const s = newDocStudy(def, { name: name.trim(), now: now(), ...(lineId ? { workspaceId: lineId } : {}), ...(project ? { projectId: project.id } : {}) });
      await putStudy(s);
      setName(''); onClose();
      nav(studyHref(s));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={`New ${def.noun}`}>
      <form className="lt-new" onSubmit={e => { e.preventDefault(); void make(); }}>
        {project && <p className="sub ie-for" data-for-project={project.id}>For <b>{project.name}</b> — it is the project’s, with everything else in it.</p>}
        <label className="field"><span className="field-label">What is it of?</span>
          <input className="text-input" value={name} maxLength={120} placeholder={`e.g. ${def.noun === 'charter' ? 'Give-away on Line 3' : 'Line 3 packing'}`} autoFocus onChange={e => setName(e.target.value)} aria-label="What is it of?" />
        </label>
        <label className="field"><span className="field-label">Which line? <i className="sub">optional — its cost figures can then be offered</i></span>
          <select className="text-input" value={lineId} aria-label="Which line" onChange={e => setLineId(e.target.value)}>
            <option value="">No line yet — a quick session</option>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={!ready}>Start it</button>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ one record */

function DocRecord({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (s === null) {
    return (
      <div className="wrap ie"><h1>This document isn’t on this device</h1><p className="sub">It may have been deleted, or not synced here yet.</p>
        <button type="button" className="btn" onClick={() => nav('/doc')}>Every document</button></div>
    );
  }
  const def = docByKey(s.agreed?.doc?.def);
  if (!def) {
    return (
      <div className="wrap ie"><h1>{s.name || 'A document'}</h1><p className="sub">{s.agreed?.doc ? 'Its kind of document isn’t in this version of the app — a newer build has it. Nothing has been lost: what was typed is kept.' : 'It has no kind of document yet.'}</p>
        <button type="button" className="btn" onClick={() => nav('/doc')}>Every document</button></div>
    );
  }
  return <Record s={s} def={def} can={can} me={me} />;
}

function Record({ s, def, can, me }: { s: ToolStudy; def: DocDef; can: ReturnType<typeof canAt>; me?: string }) {
  const signed = s.agreed?.doc?.signed;
  const closed = !!s.closedAt;
  const canEdit = can.edit && !closed && !signed;
  const id = s.id;
  const ctx = useDocCtx(s, me);
  const kept = studyRaw(s);
  /* the boxes as they are now; the record follows a moment after the last key, never a write for every one */
  const [draft, setDraft] = useState<DocValues>(kept);
  const queue = useRef<Record<string, DocValue | undefined>>({});
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  /* writes on their way: what is read back while one is in flight may predate it, so the boxes are not reset from it */
  const inflight = useRef(0);
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const q = queue.current;
    queue.current = {};
    dirty.current = false;
    if (!Object.keys(q).length) return;
    inflight.current++;
    void patchStudy(id, cur => {
      let v: DocValues = { ...(cur.facts?.docValues ?? {}) };
      for (const [k, x] of Object.entries(q)) v = withValue(v, k, x);
      return { facts: { ...cur.facts, docValues: v } };
    }).finally(() => { inflight.current--; });
  }, [id]);
  const keptKey = JSON.stringify(kept);
  useEffect(() => { if (!dirty.current && inflight.current === 0) setDraft(kept); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [keptKey]);
  useEffect(() => () => flush(), [flush]);
  const stage = (field: string, value: DocValue | undefined) => {
    setDraft(d => withValue(d, field, value));
    queue.current[field] = value;
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 500);
  };
  const photos = studyPhotos(s);
  const world = useMemo(() => ctx ?? { today: isoDay(Date.now()), ...(me ? { me } : {}) }, [ctx, me]);
  const run = useMemo(() => runDoc(def, draft, photos, world, signed), [def, draft, photos, world, signed]);
  const { steps, tests } = useBetter(s, me);

  /* a row taken out can be put back where it was */
  const rows = (field: string, next: DocRow[], undo?: string) => {
    const was: DocRow[] = Array.isArray(draft[field]) ? (draft[field] as DocRow[]) : [];
    stage(field, next);
    if (undo) {
      const gone = was.map((r, i) => ({ r, i })).filter(x => !next.some(n => n.id === x.r.id));
      offerUndo(undo, async () => {
        flush();
        await patchStudy(id, cur => {
          const now_: DocRow[] = Array.isArray(cur.facts?.docValues?.[field]) ? [...(cur.facts?.docValues?.[field] as DocRow[])] : [];
          for (const g of gone) now_.splice(Math.min(g.i, now_.length), 0, g.r);
          return { facts: { ...cur.facts, docValues: withValue({ ...(cur.facts?.docValues ?? {}) }, field, now_) } };
        });
      });
    }
  };

  /* photos: kept the moment they are picked, in the media store and on the record */
  const addPhotos = async (field: string, files: File[]) => {
    const added: DocPhoto[] = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const at = Date.now(), blobKey = `doc-${uid()}`;
      await putBlob(blobKey, f);
      added.push({ id: uid(), field, blobKey, mime: f.type || 'image/jpeg', at, ...(me ? { by: me } : {}) });
    }
    if (added.length) await patchStudy(id, cur => ({ facts: { ...cur.facts, docPhotos: [...(cur.facts?.docPhotos ?? []), ...added] } }));
  };
  const caption = (pid: string, text: string) => void patchStudy(id, cur => ({ facts: { ...cur.facts, docPhotos: (cur.facts?.docPhotos ?? []).map(p => (p.id === pid ? { ...p, caption: text } : p)) } }));
  const strike = (pid: string, struck: boolean) => patchStudy(id, cur => ({ facts: { ...cur.facts, docPhotos: (cur.facts?.docPhotos ?? []).map(p => (p.id === pid ? { ...p, struck } : p)) } }));
  const removePhoto = (pid: string) => { void strike(pid, true); offerUndo('Removed a photo', () => strike(pid, false)); };

  const sign = (by: string) => { flush(); void patchStudy(id, cur => ({ agreed: { ...cur.agreed, doc: { def: def.key, ...(cur.agreed?.doc ?? {}), signed: { by, at: now() } } } })); };
  const unsign = () => void patchStudy(id, cur => { const { signed: _s, ...rest } = cur.agreed?.doc ?? { def: def.key }; void _s; return { agreed: { ...cur.agreed, doc: { ...rest, def: def.key } } }; });

  const names = [...new Set([me, world.lead].filter((x): x is string => !!x))];
  const page = bandPage(def.title, s, run.status.word, run.status.tone, [['Catalogue', def.fc]]);
  return (
    <div className="wrap ie ie-doc" data-doc-record={def.key} data-doc-status={run.status.key}>
      <StudyBand page={page} s={s} what={def.title} canEdit={can.edit && !closed} canRemove={can.remove} />
      <div className="ln-under">
        <p className="sub ie-where">{def.question}</p>
        <WhereItSits s={s} can={can} />
      </div>
      <SignBox def={def} run={run} canAgree={can.agree && !closed} canEdit={can.edit} {...(me ? { me } : {})} onSign={sign} onUnsign={unsign} />
      {!canEdit && !closed && !signed && <p className="sub doc-ro" role="status">You can read this and take its paper; the words are changed by the people doing the work.</p>}
      {def.reads && ctx && !ctx.problems && <p className="sub doc-reads" role="status">{def.reads}</p>}
      <div className="doc-body">
        <DocForm def={def} draft={draft} read={run.values} photos={photos} ctx={world} disabled={!canEdit} problems={run.problems} names={names}
          onField={(f, v) => stage(f, v)} onRows={rows} onBlur={flush} onPhotos={(f, files) => void addPhotos(f, files)} onCaption={caption} onRemovePhoto={removePhoto} />
        <div className="doc-out">
          <ReadingView run={run} />
        </div>
      </div>
      <UsedFor s={s} can={can} me={me} />
      <LeanPanel title="Action plan" className="ln-solo ln-plan-p">
        <LeanActions actions={raisedFrom(s, steps, tests)} empty="Nothing raised from it yet — Make it better raises a fix or a countermeasure from what it found." />
      </LeanPanel>
      <LeanClosing closing={{ text: run.result.closing, tone: run.result.tone === 'r' || run.result.tone === 'a' ? run.result.tone : run.status.tone }} />
      {s.createdAt && <p className="sub calc-when">Started {niceDay(isoDay(s.startedAt))}{s.updatedAt ? ` · last changed ${niceDay(isoDay(s.updatedAt))}` : ''}.</p>}
    </div>
  );
}
