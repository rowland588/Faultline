/* THE BRIEF AND ITS ASKS, on the Story page (8 November, docs/STORY.md §7, S6–S8).
 *
 * Rowland, 8 November: "if a brief is available to upload, allow a brief to be uploaded … then use AI for possible steps … any
 * information within the tools … assign it directly to the brief … Here's the proof. Here's the evidence … If we can build it with
 * code, of course, build it with code. If not, then not." And: "don't let this be any stopper … if I don't have a brief, I don't
 * have a brief … It'll tell me no brief … nothing happens, nothing builds."
 *
 *   BriefPanel — the brief: Write it · Upload it (a PDF, a Word file, a text file, a photo). The file is kept on this device (db
 *                putBlob) and named on the story (briefFile); its words read in code (tools/story/briefText) and shown in a box to
 *                check before Use this as the brief; a photo or a scan offered to the assistant (Read it with the assistant · uses AI).
 *                No brief: one line, and nothing else changes.
 *   AsksPanel  — the asks under the brief: ＋ Add an ask, Split the brief into asks (the assistant proposes, each with its quoted
 *                sentence, ticked and edited, nothing kept until Keep these), edited in place, moved up and down, deleted with Undo;
 *                each with its scope chips (or the names in its words) and its evidence by the rules (lib/storyAsks askEvidence):
 *                found · being done · proved · still to show; Also found — what answers no ask, one tap to assign. */
import { useMemo, useRef, useState } from 'react';
import { putBlob } from '../db';
import type { AgreedStory, BriefAsk, StoryBriefFile, ToolStudy } from '../lib/study';
import { asksEvidence, assignTo, scopeOf, type AskEvidence, type AskRecords, type AskScope } from '../lib/storyAsks';
import { APP_TOOLS, toolLabel } from '../catalogue/registry';
import { uid } from '../lib/ids';
import { DraftText } from '../ui/Draft';
import { nav } from '../state/useRoute';
import { readBrief, type BriefRead } from '../tools/story/briefText';
import { readBriefPages, splitBrief } from '../tools/story/briefAsk';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const kb = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
const READ_BY: Record<StoryBriefFile['readBy'], string> = { code: 'read as text in the app', assistant: 'read by the assistant', none: 'typed by you' };

type Save = (next: AgreedStory) => Promise<void>;

/** THE BRIEF — written, or uploaded and read. */
export function BriefPanel({ ag, save, canEdit }: { ag: AgreedStory; save: Save; canEdit: boolean }) {
  const [writing, setWriting] = useState(false);
  const [words, setWords] = useState('');
  const [up, setUp] = useState<{ file: Omit<StoryBriefFile, 'readBy'>; read: BriefRead; text: string; by: StoryBriefFile['readBy']; typing?: boolean } | null>(null);
  const [busy, setBusy] = useState('');
  const [said, setSaid] = useState('');
  const fileIn = useRef<HTMLInputElement>(null);
  const has = !!ag.brief.trim();

  const onFile = async (f: File) => {
    setSaid(''); setBusy(`Reading ${f.name}…`);
    const mediaId = `story-brief-${uid()}`;
    await putBlob(mediaId, f);
    const read = await readBrief(f, f.name);
    setBusy('');
    setWriting(false);
    setUp({ file: { mediaId, name: f.name, mime: f.type || 'application/octet-stream', bytes: f.size }, read, text: read.ok ? read.text : '', by: read.ok ? 'code' : 'none' });
  };
  const askAssistant = async () => {
    if (!up || up.read.ok || !('pages' in up.read)) return;
    setBusy('The assistant is reading the pages…');
    const r = await readBriefPages(up.read.pages);
    setBusy('');
    if (!r.ok) { setSaid(r.why); setUp(u => (u ? { ...u, typing: true } : u)); return; }
    setUp(u => (u ? { ...u, text: r.value, by: 'assistant', typing: true } : u));
  };
  const use = async () => {
    if (!up || !up.text.trim()) return;
    await save({ ...ag, brief: up.text.trim(), briefFile: { ...up.file, readBy: up.by } });
    setUp(null); setSaid(`The brief is ${up.file.name}’s words — ${READ_BY[up.by]}.`);
  };
  const keepWritten = async () => {
    await save({ ...ag, brief: words.trim() });
    setWriting(false); setSaid(words.trim() ? 'The brief is kept.' : 'The brief is taken off — the story works on the records alone.');
  };

  return (
    <section className="ep-panel stb-brief" aria-label="The brief" data-story-brief>
      <h2 className="ln-h">The brief</h2>
      {!has && !writing && !up && <p className="sub stb-none" data-story-no-brief>No brief yet — the story works on the records alone.</p>}
      {has && !writing && !up && (
        <>
          <p className="stb-brief-text" data-story-brief-text>{ag.brief}</p>
          {ag.briefFile && <p className="sub stb-file" data-story-brief-file>From {ag.briefFile.name} · {kb(ag.briefFile.bytes)} · {READ_BY[ag.briefFile.readBy]}</p>}
        </>
      )}
      {busy && <p className="sub" role="status" data-story-brief-busy>{busy}</p>}
      {said && !busy && <p className="sub stb-said" role="status" data-story-brief-said>{said}</p>}

      {writing && (
        <div className="stb-write">
          <textarea className="text-input stb-box" rows={4} value={words} onChange={e => setWords(e.target.value)} placeholder="e.g. Why are we losing output in the packing hall?" aria-label="The brief, in the client’s words" maxLength={12000} />
          <div className="st-acts">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void keepWritten()}>Keep the brief</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWriting(false)}>Cancel</button>
          </div>
        </div>
      )}

      {up && (
        <div className="stb-read" data-story-brief-read>
          <p className="stb-file"><b>{up.file.name}</b> <span className="sub">· {kb(up.file.bytes)} · kept on this device</span></p>
          {up.read.ok && <p className="sub">Read as text — check the words, put them right, then use them as the brief.</p>}
          {!up.read.ok && 'pages' in up.read && !up.typing && (
            <div className="stb-offer" data-story-brief-offer>
              <p className="sub">{up.read.why} The assistant can read {up.read.pages.length === 1 ? 'it' : `its ${up.read.pages.length} pages`} into words for you to check — or type the brief yourself.</p>
              <div className="st-acts">
                <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => void askAssistant()}>Read it with the assistant <span className="stb-ai">uses AI</span></button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUp(u => (u ? { ...u, typing: true } : u))}>Type it instead</button>
              </div>
            </div>
          )}
          {!up.read.ok && !('pages' in up.read) && <p className="st-unsure">{up.read.why}</p>}
          {(up.read.ok || up.typing) && (
            <>
              {up.by === 'assistant' && <p className="sub">Read by the assistant — check every word against the page before you use it.</p>}
              <textarea className="text-input stb-box" rows={8} value={up.text} onChange={e => { const v = e.target.value; setUp(u => (u ? { ...u, text: v } : u)); }} aria-label="The brief as read — check it" maxLength={12000} data-story-brief-box />
            </>
          )}
          <div className="st-acts">
            {(up.read.ok || up.typing) && <button type="button" className="btn btn-primary btn-sm" disabled={!up.text.trim()} onClick={() => void use()}>Use this as the brief</button>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUp(null)}>Cancel</button>
          </div>
        </div>
      )}

      {canEdit && !writing && !up && (
        <div className="st-acts">
          <button type="button" className="btn btn-sm" onClick={() => { setWords(ag.brief); setWriting(true); setSaid(''); }}>{has ? 'Change it' : 'Write it'}</button>
          <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => fileIn.current?.click()}>Upload it</button>
          <input ref={fileIn} type="file" hidden accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" data-story-brief-file-input
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onFile(f); }} />
          <span className="sub stb-hint">A PDF, a Word file, a text file or a photo.</span>
        </div>
      )}
    </section>
  );
}

/** THE ASKS — the brief as the questions the client asked, each with what answers it. */
export function AsksPanel({ ag, save, records, canEdit }: { ag: AgreedStory; save: Save; records: AskRecords | null; canEdit: boolean }) {
  const asks = useMemo(() => [...(ag.asks ?? [])].sort((a, b) => a.order - b.order), [ag.asks]);
  const ev = useMemo(() => (records ? asksEvidence({ asks }, records) : null), [asks, records]);
  const [adding, setAdding] = useState(false);
  const [typed, setTyped] = useState('');
  const [proposed, setProposed] = useState<{ text: string; from: string; on: boolean }[] | null>(null);
  const [busy, setBusy] = useState('');
  const [said, setSaid] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [undo, setUndo] = useState<BriefAsk | null>(null);

  const put = (next: BriefAsk[]) => save({ ...ag, asks: next.map((a, k) => ({ ...a, order: k + 1 })) });
  const add = async () => {
    if (!typed.trim()) return;
    const a: BriefAsk = { id: uid(), text: typed.trim(), order: asks.length + 1 };
    await put([...asks, a]); setTyped(''); setAdding(false); setOpen(a.id); setSaid('');
  };
  const split = async () => {
    setSaid(''); setBusy('The assistant is reading the brief for the client’s asks…');
    const r = await splitBrief(ag.brief);
    setBusy('');
    if (!r.ok) { setSaid(r.why); return; }
    setProposed(r.value.map(a => ({ ...a, on: true })));
  };
  const keep = async () => {
    if (!proposed) return;
    const picked = proposed.filter(p => p.on && p.text.trim());
    await put([...asks, ...picked.map(p => ({ id: uid(), text: p.text.trim(), ...(p.from ? { from: p.from } : {}), order: 0 }))]);
    setProposed(null); setSaid(`${plural(picked.length, 'ask')} kept from the brief.`);
  };
  const move = (k: number, by: -1 | 1) => { const next = [...asks]; const [a] = next.splice(k, 1); next.splice(k + by, 0, a); void put(next); };
  const remove = (a: BriefAsk) => { setUndo(a); void put(asks.filter(x => x.id !== a.id)); };
  const bringBack = () => { if (!undo) return; const next = [...asks]; next.splice(Math.max(0, undo.order - 1), 0, undo); setUndo(null); void put(next); };
  const change = (a: BriefAsk) => put(asks.map(x => (x.id === a.id ? a : x)));

  return (
    <section className="ep-panel stb-asks" aria-label="The asks" data-story-asks>
      <h2 className="ln-h">What the client asked <span className="act-col-n">{asks.length}</span></h2>
      {!asks.length && !proposed && <p className="sub">No asks yet — split the brief into the questions the client asked, or add them one by one. The story works without them.</p>}
      {busy && <p className="sub" role="status">{busy}</p>}
      {said && !busy && <p className="sub stb-said" role="status" data-story-asks-said>{said}</p>}

      {proposed && (
        <div className="stb-proposed" data-story-proposed>
          <p className="sub">The assistant read these asks from the brief — tick the ones to keep, put the words right, then Keep these. Nothing is kept until then.</p>
          <ol className="stb-list">
            {proposed.map((p, k) => (
              <li key={k} className="stb-prop" data-proposed={k}>
                <label className="stb-tick"><input type="checkbox" checked={p.on} onChange={e => { const on = e.target.checked; setProposed(ps => ps && ps.map((x, i) => (i === k ? { ...x, on } : x))); }} aria-label={`Keep ask ${k + 1}`} /></label>
                <div className="stb-prop-body">
                  <input className="text-input" value={p.text} maxLength={300} aria-label={`Proposed ask ${k + 1}`} onChange={e => { const text = e.target.value; setProposed(ps => ps && ps.map((x, i) => (i === k ? { ...x, text } : x))); }} />
                  {p.from ? <p className="sub stb-quote">From the brief: “{p.from}”</p> : <p className="sub stb-quote">Not quoted from the brief — check it is what the client asked.</p>}
                </div>
              </li>
            ))}
          </ol>
          <div className="st-acts">
            <button type="button" className="btn btn-primary btn-sm" disabled={!proposed.some(p => p.on && p.text.trim())} onClick={() => void keep()}>Keep these ({proposed.filter(p => p.on && p.text.trim()).length})</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProposed(null)}>Discard</button>
          </div>
        </div>
      )}

      {ev && asks.length > 0 && (
        <ol className="stb-list">
          {ev.asks.map((e, k) => (
            <AskRow key={e.ask.id} e={e} n={k + 1} last={k === asks.length - 1} open={open === e.ask.id} records={records as AskRecords} canEdit={canEdit}
              onOpen={() => setOpen(open === e.ask.id ? null : e.ask.id)} onMove={by => move(k, by)} onDelete={() => remove(e.ask)} onChange={a => void change(a)} />
          ))}
        </ol>
      )}
      {undo && <p className="sub stb-undo" role="status" data-story-ask-undo>Ask taken off — “{undo.text}”. <button type="button" className="linkish" onClick={bringBack}>Undo</button></p>}

      {canEdit && !proposed && (adding ? (
        <div className="stb-add">
          <input className="text-input" value={typed} autoFocus maxLength={300} placeholder="e.g. Why does Line 3 lose output on nights?" aria-label="The ask, in the client’s words" onChange={e => setTyped(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); if (e.key === 'Escape') setAdding(false); }} />
          <button type="button" className="btn btn-primary btn-sm" disabled={!typed.trim()} onClick={() => void add()}>Add</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <div className="st-acts">
          <button type="button" className="btn btn-sm" onClick={() => { setAdding(true); setSaid(''); }}>＋ Add an ask</button>
          {ag.brief.trim() && <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => void split()}>Split the brief into asks <span className="stb-ai">uses AI</span></button>}
        </div>
      ))}

      {ev && asks.length > 0 && ev.alsoFound.length > 0 && (
        <div className="stb-also" data-story-also>
          <h3>Also found <span className="sub">— on the lines and answering no ask; one tap puts it under one</span></h3>
          <ul>
            {ev.alsoFound.map(x => (
              <li key={`${x.kind}:${x.id}`} data-also={x.id}>
                <button type="button" className="linkish" onClick={() => nav(x.href)}>{x.what}</button>
                <span className="sub"> · {[x.line, x.machine].filter(Boolean).join(' · ')}</span>
                {canEdit && <span className="stb-assign">{asks.map((a, k) => <button key={a.id} type="button" className="chip stb-chip" aria-label={`Assign “${x.what}” to ask ${k + 1}`} onClick={() => records && void change(assignTo(a, x, records.lines))}>Ask {k + 1}</button>)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const TOOL_CHIPS = APP_TOOLS.filter(t => t.kind === 'study' || t.kind === 'standard');

function AskRow({ e, n, last, open, records, canEdit, onOpen, onMove, onDelete, onChange }: {
  e: AskEvidence; n: number; last: boolean; open: boolean; records: AskRecords; canEdit: boolean;
  onOpen: () => void; onMove: (by: -1 | 1) => void; onDelete: () => void; onChange: (a: BriefAsk) => void;
}) {
  const a = e.ask;
  const lineName = (id: string) => records.lines.find(l => l.id === id)?.name ?? id;
  const machines = [...new Set(records.lines.flatMap(l => l.machines))];
  const products = [...new Set(records.lines.flatMap(l => l.products ?? []))];
  const toggle = (k: keyof AskScope, v: string) => {
    const s = scopeOf(a, records.lines).scope;
    const list = s[k];
    const on = list.some(x => x.toLowerCase() === v.toLowerCase());
    onChange({ ...a, ...s, [k]: on ? list.filter(x => x.toLowerCase() !== v.toLowerCase()) : [...list, v] });
  };
  const chip = (k: keyof AskScope, v: string, label = v) => {
    const on = e.scope[k].some(x => x.toLowerCase() === v.toLowerCase());
    return <button key={`${k}:${v}`} type="button" className={'chip stb-chip' + (on ? ' on' : '')} aria-pressed={on} disabled={!canEdit} onClick={() => toggle(k, v)}>{label}</button>;
  };
  return (
    <li className={'stb-ask' + (open ? ' is-open' : '')} data-ask={a.id}>
      <div className="stb-ask-h">
        <button type="button" className="stb-ask-b" aria-expanded={open} onClick={onOpen}>
          <span className="st-ch-n">Ask {n}</span>
          <b className="stb-ask-t">{a.text}</b>
          <span className="sub stb-says" data-ask-says>{e.says}{e.doing.some(d => d.late) ? '' : ''}</span>
        </button>
        {canEdit && (
          <span className="stb-ask-tools">
            <button type="button" className="chip-move" aria-label={`Move ask ${n} up`} disabled={n === 1} onClick={() => onMove(-1)}>↑</button>
            <button type="button" className="chip-move" aria-label={`Move ask ${n} down`} disabled={last} onClick={() => onMove(1)}>↓</button>
            <button type="button" className="linkish" aria-label={`Delete ask ${n}`} onClick={onDelete}>Delete</button>
          </span>
        )}
      </div>
      {open && (
        <div className="stb-ask-body" data-ask-open>
          {canEdit && <DraftText value={a.text} className="text-input stb-ask-edit" max={300} ariaLabel={`Ask ${n}, its words`} onSave={v => v.trim() && v.trim() !== a.text && onChange({ ...a, text: v.trim() })} />}
          {a.from && <p className="sub stb-quote">From the brief: “{a.from}”</p>}
          <p className="sub">{e.fromWords ? (e.scope.lines.length || e.scope.machines.length || e.scope.products.length ? 'Read from its words — tap a chip to set what it is about yourself.' : 'Its words name no line or machine — tap what it is about.') : 'What it is about, as picked:'}</p>
          <div className="stb-scope">
            {records.lines.length > 0 && <div className="chip-row"><span className="chip-label sub">Lines</span>{records.lines.map(l => chip('lines', l.id, l.name))}</div>}
            {machines.length > 0 && <div className="chip-row"><span className="chip-label sub">Machines</span>{machines.map(m => chip('machines', m))}</div>}
            {products.length > 0 && <div className="chip-row"><span className="chip-label sub">Products</span>{products.map(p => chip('products', p))}</div>}
            <details className="stb-tools"><summary className="sub">Tools{e.scope.tools.length ? ` · ${e.scope.tools.map(toolLabel).join(', ')}` : ''}</summary><div className="chip-row">{TOOL_CHIPS.map(t => chip('tools', t.key, t.label))}</div></details>
          </div>
          <div className="stb-ev">
            <div>
              <h3>What we found <span className="sub">{e.found.findings.length + e.found.records.length}</span></h3>
              {!e.found.findings.length && !e.found.records.length ? <p className="sub">Nothing on the lines answers it yet.</p> : (
                <ul data-ask-found>
                  {e.found.findings.map(f => <li key={f.id} className={f.late || f.priority === 'critical' ? 'is-r' : ''}><button type="button" className="linkish" onClick={() => nav(`/snags?open=${encodeURIComponent(f.id)}`)}>{f.what}</button><span className="sub"> · {f.line}{f.machine ? ` · ${f.machine}` : ''}</span></li>)}
                  {e.found.records.map(x => <li key={x.id}><button type="button" className="linkish" onClick={() => nav(x.href)}>{x.title}</button>{x.lineId && <span className="sub"> · {lineName(x.lineId)}</span>}</li>)}
                </ul>
              )}
            </div>
            <div>
              <h3>Being done <span className="sub">{e.doing.length}{e.doing.some(d => d.late) ? ` · ${e.doing.filter(d => d.late).length} late` : ''}</span></h3>
              {!e.doing.length ? <p className="sub">Nothing owed on it yet.</p> : <ul data-ask-doing>{e.doing.map((d, i) => <li key={i} className={d.late ? 'is-r' : ''}>{d.what}<span className="sub"> · {d.who || 'nobody yet'}{d.due ? ` · ${d.late ? 'was due' : 'due'} ${new Date(Date.parse(d.due)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}{d.late ? ' · late' : ''}</span></li>)}</ul>}
            </div>
            <div>
              <h3>Proved <span className="sub">{e.proved.length}</span></h3>
              {!e.proved.length ? <p className="sub">No fix proved on it yet.</p> : <ul data-ask-proved>{e.proved.map(p => <li key={p.id} className="is-g"><b>{p.what}</b><span className="sub"> · {p.line} · {p.proof}</span></li>)}</ul>}
            </div>
            <div>
              <h3>Still to show <span className="sub">{e.missing.length}</span></h3>
              {!e.missing.length ? <p className="sub">Nothing missing — the records answer it.</p> : <ul data-ask-missing>{e.missing.map((m, i) => <li key={i} className="is-a">{m.text} <button type="button" className="linkish" onClick={() => nav(m.href)}>{m.lineId ? `Start it on ${lineName(m.lineId)} ›` : `Open ${toolLabel(m.tool)} ›`}</button></li>)}</ul>}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
