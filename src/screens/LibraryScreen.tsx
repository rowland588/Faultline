/* THE LIBRARY — #/library (11 November, docs/CONSULTANT-WORKSPACE.md C4 — Rowland: "Where is my overall library of work? … All reports
 * I've created … Photographs and supporting evidence. Completed studies. Working documents and data capture sheets … I need to be able to
 * browse my work across businesses, but also open an individual business and see everything associated with it … distinguish between my
 * own internal working documents and finished client-facing reports").
 *
 * Three views of what is already kept, nothing copied:
 *   · PAPERS — every PDF you have made (lib/keptPdfs; synced, supabase/KEPT_PAPERS.sql), newest first: its name, whose, what paper it is,
 *     client-facing or internal, when and how big; the row opens the very file, ⋯ downloads it, says whom it is for, renames it or takes it
 *     off (Undo). Search by name is always there; audience and kind are in the fold.
 *   · PHOTOS — the customer's photographs and videos where they already are: a tool's attachments (facts.attach), a problem's pictures,
 *     a walk's photographs filed to a line, a department or a project — each opening the record it came from.
 *   · WORKING RECORDS — the customer's tool records and documents, newest first, each opening itself.
 * The customer is the active one (lib/activeClient, the top bar) — All customers names whose each row is. The calm page (docs/DESIGN.md):
 * one header, one row of views, rows with hairlines, the less-used filters in a fold; no primary — the library is read, its rows are the
 * doors. Reached from Factory reports (the rail's foot) and a Saved copies sheet; nothing is added to the menu. */
import { useEffect, useMemo, useState } from 'react';
import { listAllStudies, listAllSnags, onDataChange } from '../db';
import type { PaperAudience } from '../db/rows';
import {
  declineOldCopies, dropKept, keptBlob, listKept, moveOldToLibrary, oldCopies, onKeptChange, patchKept, sizeWords, type KeptPdf,
} from '../lib/keptPdfs';
import { AUDIENCE_WORDS, kindWord, libraryRows, librarySaid, oldCopiesOffer, PAPER_KINDS } from '../lib/library';
import { setActiveClient, useClientScope } from '../lib/activeClient';
import { attachmentsOf } from '../lib/attachments';
import { studyHref, studyTitle } from '../lib/studyLinks';
import { isConversation } from '../colleague/conversation';
import { walkPhotosFor } from '../lib/walk';
import { areaHref } from '../lib/areas';
import { deliverBlob } from '../lib/savePdf';
import { nav } from '../state/useRoute';
import { PageHeader, ViewTabs, StateTag, useMenu } from '../ui/parts';
import { Fold } from '../ui/Fold';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { offerUndo } from '../ui/Undo';
import type { MediaRef, Workspace } from '../types';
import type { ToolStudy } from '../lib/study';
import type { Snag } from '../snag/types';

const when = (at: number): string => new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
type ViewKey = 'papers' | 'photos' | 'records';
const VIEW_KEY = 'faultline.library.view';
const readView = (): ViewKey => { try { const v = localStorage.getItem(VIEW_KEY); return v === 'photos' || v === 'records' ? v : 'papers'; } catch { return 'papers'; } };

/** Everything the library reads, read once and again on any write. */
function useLibrary() {
  const [papers, setPapers] = useState<KeptPdf[] | null>(null);
  const [old, setOld] = useState<{ count: number; declined: boolean }>({ count: 0, declined: true });
  const [studies, setStudies] = useState<ToolStudy[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [lines, setLines] = useState<Workspace[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void (async () => {
      const db = await import('../db');
      const [p, o, s, sn, ws] = await Promise.all([listKept(), oldCopies(), listAllStudies(), listAllSnags(), (await db.getDB()).getAll('workspaces')]);
      if (!live) return;
      setPapers(p); setOld(o); setStudies(s); setSnags(sn); setLines(ws);
    })().catch(() => undefined);
    load();
    const off1 = onKeptChange(load);
    const off2 = onDataChange(load);
    return () => { live = false; off1(); off2(); };
  }, []);
  return { papers, old, studies, snags, lines };
}

export function LibraryScreen() {
  const cs = useClientScope();
  const { papers, old, studies, snags, lines } = useLibrary();
  const [view, setViewState] = useState<ViewKey>(readView);
  const setView = (v: string) => { setViewState(v as ViewKey); try { localStorage.setItem(VIEW_KEY, v); } catch { /* this visit only */ } };
  const [q, setQ] = useState('');
  const [audience, setAudience] = useState<PaperAudience | ''>('');
  const [kind, setKind] = useState('');
  const [note, setNote] = useState('');

  /* THE CUSTOMER: the active one's only once two are named; All customers names whose each row is */
  const filter = { client: cs.client, filtering: cs.filtering };
  const mine = useMemo(() => libraryRows(papers ?? [], filter), [papers, cs.client, cs.filtering]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(() => libraryRows(mine, { ...filter, kind, audience, q }), [mine, kind, audience, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const kindsHere = PAPER_KINDS.filter(k => mine.some(p => p.kind === k));
  const offer = oldCopiesOffer(old.count, old.declined);

  /* the customer's records: placed as every list since C1 places them (their line, else their project) */
  const lineName = (id?: string) => lines.find(l => l.id === id)?.name;
  const records = useMemo(() => studies
    .filter(s => s.tool !== 'story' && s.tool !== 'department' && !isConversation(s) && cs.record(s))
    .sort((a, b) => b.updatedAt - a.updatedAt), [studies, cs]);
  const photos = useMemo(() => photosOf(studies, snags, lines, cs), [studies, snags, lines, cs]);

  const whose = cs.filtering ? cs.client : cs.all ? 'every customer' : cs.client;
  const says = view === 'papers'
    ? <>{librarySaid(mine)}{whose ? <> — {cs.filtering ? <>for <b>{whose}</b></> : whose}</> : null}.</>
    : view === 'photos' ? <>{photos.length} {photos.length === 1 ? 'photo or video' : 'photos and videos'}{whose ? <> — {cs.filtering ? <>of <b>{whose}</b></> : whose}</> : null}, where each was taken.</>
      : <>{records.length} working {records.length === 1 ? 'record' : 'records'}{whose ? <> — {cs.filtering ? <>of <b>{whose}</b></> : whose}</> : null}, the newest first.</>;

  return (
    <div className="wrap lib" data-library>
      <PageHeader eyebrow="Your work" title="Library" says={says}>
        {cs.filtering && (
          <p className="sub lib-who">Showing {cs.client}’s only · <button type="button" className="linkish" data-lib-all onClick={() => setActiveClient('')}>All customers</button></p>
        )}
      </PageHeader>

      {offer && (
        <div className="lib-offer" role="region" aria-label="Copies on this device" data-lib-offer>
          <p><b>{offer}</b> <span className="sub">{old.count === 1 ? 'It was' : 'They were'} kept on this device only, before the library — in the library {old.count === 1 ? "it reaches" : "they reach"} your other devices too.</span></p>
          <div className="lib-offer-a">
            <button type="button" className="btn" data-lib-offer-yes onClick={() => void moveOldToLibrary().then(n => setNote(`${n} ${n === 1 ? 'copy is' : 'copies are'} in your library.`))}>{old.count === 1 ? 'Keep it in the library' : 'Keep them in the library'}</button>
            <button type="button" className="linkish" data-lib-offer-no onClick={() => void declineOldCopies()}>{old.count === 1 ? 'Leave it on this device' : 'Leave them on this device'}</button>
          </div>
        </div>
      )}
      {note && <p className="sub" role="status">{note}</p>}

      <ViewTabs label="What the library holds" value={view} onChange={setView} views={[
        { key: 'papers', label: 'Papers', count: mine.length },
        { key: 'photos', label: 'Photos', count: photos.length },
        { key: 'records', label: 'Working records', count: records.length },
      ]} />

      {view === 'papers' && (
        <section aria-label="Papers" data-lib-papers>
          <label className="lib-search">
            <span className="sr-only">Find a paper by its name</span>
            <input type="search" className="text-input" placeholder="Find a paper by its name, customer or kind" value={q} onChange={e => setQ(e.target.value)} data-lib-q />
          </label>
          <Fold id="library-filters" start={false} title="Who it is for, and what paper" says={audience || kind ? [audience ? AUDIENCE_WORDS[audience] : '', kind ? kindWord(kind) : ''].filter(Boolean).join(' · ') : 'Every paper'}>
            <div className="chip-row" role="group" aria-label="Who it is for" data-lib-audience>
              {(['', 'client', 'internal'] as const).map(a => (
                <button key={a || 'all'} type="button" className={'chip' + (audience === a ? ' on' : '')} aria-pressed={audience === a} onClick={() => setAudience(a)} data-lib-aud={a || 'all'}>
                  {a ? AUDIENCE_WORDS[a] : 'Both'}
                </button>
              ))}
            </div>
            {kindsHere.length > 1 && (
              <div className="chip-row" role="group" aria-label="What paper" data-lib-kinds>
                <button type="button" className={'chip' + (!kind ? ' on' : '')} aria-pressed={!kind} onClick={() => setKind('')} data-lib-kind="all">Every kind</button>
                {kindsHere.map(k => (
                  <button key={k} type="button" className={'chip' + (kind === k ? ' on' : '')} aria-pressed={kind === k} onClick={() => setKind(k)} data-lib-kind={k}>{kindWord(k)}</button>
                ))}
              </div>
            )}
          </Fold>
          {papers === null ? <p className="sub">Reading the library…</p>
            : shown.length === 0 ? <p className="sub" data-lib-empty>{mine.length ? 'No paper here says that.' : 'No papers yet. Every report you make — from any page’s Report ▾ — is kept here, the very file you handed over.'}</p>
              : (
                <ul className="lt-rows lib-rows">
                  {shown.map(p => <PaperRow key={p.id} p={p} named={cs.all || !cs.several} />)}
                </ul>
              )}
        </section>
      )}

      {view === 'photos' && (
        <section aria-label="Photos" data-lib-photos>
          {photos.length === 0 ? <p className="sub" data-lib-empty>No photos yet. Pictures put on a tool, a problem’s photos and the photographs filed from a walk show here, each with where it came from.</p> : (
            <ul className="lt-rows lib-rows">{photos.map(ph => <PhotoRow key={ph.key} ph={ph} />)}</ul>
          )}
        </section>
      )}

      {view === 'records' && (
        <section aria-label="Working records" data-lib-records>
          {records.length === 0 ? <p className="sub" data-lib-empty>No working records yet. Every study, log, calculation and document you start is here.</p> : (
            <ul className="lt-rows lib-rows">
              {records.map(s => {
                const ln = lineName(s.workspaceId);
                const who = cs.all ? cs.whose(s) : '';
                return (
                  <li key={s.id} className="lt-li" data-lib-record={s.id}>
                    <button type="button" className="lt-row" onClick={() => nav(studyHref(s))}>
                      <b className="lt-what">{studyTitle(s)}</b>
                      <span className="lt-where">{[who, ln ? `On ${ln}` : 'On no line', `changed ${when(s.updatedAt)}`].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** A PAPER'S ROW — the row opens the very file; ⋯ the rest. */
function PaperRow({ p, named }: { p: KeptPdf; named: boolean }) {
  const menu = useMenu();
  const [naming, setNaming] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  const read = async (download: boolean) => {
    const blob = await keptBlob(p);
    if (!blob) { setSaid('That file is not on this device yet — it comes down from the cloud by itself.'); return; }
    if (download) { await deliverBlob(blob, p.name, { keep: false }); return; }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const other: PaperAudience = p.audience === 'client' ? 'internal' : 'client';
  const takeOff = async () => {
    menu.setOpen(false);
    const undo = await dropKept(p.id);
    offerUndo(`Took “${p.name.length > 40 ? `${p.name.slice(0, 39)}…` : p.name}” off the library`, undo);
  };
  const save = async () => { if (naming !== null && naming.trim()) await patchKept(p.id, { name: naming }); setNaming(null); };
  return (
    <li className="lt-li lib-row" data-lib-paper={p.id} data-lib-audience-is={p.audience} data-lib-kind-is={p.kind}>
      {naming !== null ? (
        <form className="lt-name" onSubmit={e => { e.preventDefault(); void save(); }}>
          <label className="sr-only" htmlFor={`lib-n-${p.id}`}>The paper’s name</label>
          <input id={`lib-n-${p.id}`} className="text-input" value={naming} autoFocus onChange={e => setNaming(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setNaming(null); }} data-lib-name-box />
          <button type="submit" className="btn" disabled={!naming.trim()} data-lib-name-save>Save</button>
          <button type="button" className="linkish" onClick={() => setNaming(null)}>Cancel</button>
        </form>
      ) : (
        <button type="button" className="lt-row" onClick={() => void read(false)} data-lib-open={p.id} aria-label={`${p.name} — open the file`}>
          <b className="lt-what">{p.name}</b>
          <span className="lt-says"><StateTag tone={p.audience === 'client' ? 'w' : 'n'}>{AUDIENCE_WORDS[p.audience]}</StateTag></span>
          <span className="lt-where" data-lib-meta>
            {[named && p.client ? p.client : named ? 'No customer' : '', kindWord(p.kind), when(p.at), sizeWords(p.size), p.local ? 'on this device only' : ''].filter(Boolean).join(' · ')}
          </span>
        </button>
      )}
      {naming === null && (
        <div className="part-menu lib-more" ref={menu.box}>
          <button ref={menu.button} type="button" className="lib-more-b" aria-haspopup="menu" aria-expanded={menu.open} aria-label={`More for ${p.name}`} onClick={() => menu.setOpen(o => !o)} data-lib-more={p.id}>⋯</button>
          {menu.open && (
            <div className="part-menu-list" role="menu" aria-label={`More for ${p.name}`}>
              <button type="button" role="menuitem" className="part-menu-i" onClick={() => { menu.setOpen(false); void read(true); }} data-lib-down={p.id}><b>Download</b></button>
              {!p.local && (
                <button type="button" role="menuitem" className="part-menu-i" onClick={() => { menu.setOpen(false); void patchKept(p.id, { audience: other }); }} data-lib-mark={other}>
                  <b>Mark {other === 'client' ? 'client-facing' : 'internal'}</b><span className="part-menu-hint">{other === 'client' ? 'A finished report for the customer' : 'Your own working paper'}</span>
                </button>
              )}
              <button type="button" role="menuitem" className="part-menu-i" onClick={() => { menu.setOpen(false); setNaming(p.name); }} data-lib-rename={p.id}><b>Rename</b></button>
              <button type="button" role="menuitem" className="part-menu-i" onClick={() => void takeOff()} data-lib-drop={p.id}><b>Take off</b><span className="part-menu-hint">Out of the library, on every device — Undo for a few seconds</span></button>
            </div>
          )}
        </div>
      )}
      {said && <p className="sub is-a lib-said" role="status">{said}</p>}
    </li>
  );
}

/* ---------------------------------------------------------------- the photos, where they already are ------ */

interface LibPhoto { key: string; media: MediaRef; at: number; from: string; where: string; to: string; caption?: string }
type Scope = ReturnType<typeof useClientScope>;

/** The customer's photographs and videos, read from the records that hold them — a tool's attachments, a problem's pictures, a walk's
 *  photographs filed to a line, a department or a project — the newest first, each with where it came from. Nothing is copied. */
function photosOf(studies: readonly ToolStudy[], snags: readonly Snag[], lines: readonly Workspace[], cs: Scope): LibPhoto[] {
  const out: LibPhoto[] = [];
  const lineName = (id?: string) => lines.find(l => l.id === id)?.name ?? '';
  for (const s of studies) {
    if (s.tool === 'story' || isConversation(s) || !cs.record(s)) continue;
    for (const a of attachmentsOf(s)) {
      if (a.kind === 'link' || !a.blobKey) continue;
      out.push({ key: `a:${s.id}:${a.id}`, at: a.at, from: studyTitle(s), where: lineName(s.workspaceId), to: studyHref(s), ...(a.caption ? { caption: a.caption } : {}),
        media: { id: a.id, kind: a.kind === 'video' ? 'video' : 'photo', blobKey: a.blobKey, ...(a.thumbKey ? { thumbKey: a.thumbKey } : {}), mime: a.mime ?? 'image/jpeg', capturedAt: a.at } as MediaRef });
    }
  }
  for (const n of snags) {
    if (n.deletedAt || !cs.record(n)) continue;
    for (const m of n.media ?? []) {
      out.push({ key: `p:${n.id}:${m.id}`, at: m.capturedAt, from: `Problem — ${n.problem}`, where: lineName(n.workspaceId), to: `/snags?open=${encodeURIComponent(n.id)}`, media: m });
    }
  }
  /* a walk's photographs filed to the customer's lines, departments and projects (lib/walk) — the photograph itself, kept on its walk */
  const conversations = studies.filter(isConversation);
  const departments = studies.filter(s => s.tool === 'department');
  const seen = new Set<string>();
  const walk = (q: Parameters<typeof walkPhotosFor>[1], to: string, where: string) => {
    for (const p of walkPhotosFor(conversations, q)) {
      const k = `w:${p.conversationId}:${p.turnId}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ key: k, at: p.at, from: 'A walk with Luna', where: p.where || where, to, ...(p.caption ? { caption: p.caption } : {}),
        media: { id: p.turnId, kind: 'photo', blobKey: p.blobKey, mime: p.mime, capturedAt: p.at } as MediaRef });
    }
  };
  for (const l of lines) if (cs.line(l.id)) walk({ lineId: l.id }, `/lines/${l.id}`, l.name);
  for (const d of departments) {
    const f = (d.facts as unknown as { department?: { client?: string; site?: string; area: string } }).department;
    if (!f?.area || (cs.filtering && (f.client ?? '').trim().toLowerCase() !== cs.client.trim().toLowerCase())) continue;
    walk({ departmentId: d.id }, areaHref({ area: f.area, ...(f.client ? { client: f.client } : {}), ...(f.site ? { site: f.site } : {}) }).replace(/^#/, ''), f.area);
  }
  return out.sort((a, b) => b.at - a.at);
}

function PhotoRow({ ph }: { ph: LibPhoto }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="lt-li lib-photo" data-lib-photo={ph.key}>
      <EvidenceThumb media={ph.media} size={64} onClick={() => setOpen(true)} />
      <button type="button" className="lt-row" onClick={() => nav(ph.to)}>
        <b className="lt-what">{ph.from}</b>
        {ph.caption && <span className="lt-says">“{ph.caption}”</span>}
        <span className="lt-where">{[ph.where, when(ph.at), ph.media.kind === 'video' ? 'video' : 'photo'].filter(Boolean).join(' · ')}</span>
      </button>
      {open && <EvidenceViewer media={ph.media} onClose={() => setOpen(false)} />}
    </li>
  );
}

