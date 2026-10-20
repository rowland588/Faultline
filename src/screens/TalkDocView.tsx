/* A LINE TALK DOCUMENT, OPENED — the line-walk report, the summary, the
 * engineering report or the punch list Line Talk wrote, edited where it
 * stands and put on paper (docs/LINE-TALK.md, What comes out).
 *
 * Rowland, 20 October: "Make the output professional, editable and suitable
 * for printing or exporting using existing functionality. Include pictures in
 * the document when requested, with useful captions."
 *
 * WHICH RECORD: the answer it came in — a turn of the talk (lib/talk, a
 * `reply` with its `doc`). Every change is kept as the person makes it; what
 * Line Talk first wrote is kept beside it (`docFirst`) and can be gone back
 * to. Each point says where it comes from — observed, a Faultline record, or
 * Line Talk's assessment — and the person can change which. WHERE IT SHOWS:
 * the answer's card in the talk, here, and on paper (lib/talkDocPdf through
 * lib/saveTalkDoc, the report engine and the house look). */
import { useEffect, useRef, useState } from 'react';
import { useBlobUrl } from '../lib/useBlobUrl';
import { BASIS_WORD, DOC_KIND_WORD, figuresIn, type TalkBasis, type TalkDoc, type TalkDocKind } from '../lib/talkAssist';
import type { TalkTurn } from '../lib/talk';
import type { ToolStudy } from '../lib/study';
import type { can as canAt } from '../lib/access';
import { offerUndo } from '../ui/Undo';

const KINDS = Object.keys(DOC_KIND_WORD) as TalkDocKind[];
const BASES = Object.keys(BASIS_WORD) as TalkBasis[];
const docWords = (d: TalkDoc) => [d.title, ...d.sections.flatMap(s => [s.heading, s.text, ...s.points.flatMap(p => [p.text, p.owner, p.due]), ...s.photos.map(p => p.caption)])].join('\n');

function Thumb({ blobKey, label }: { blobKey?: string; label: string }) {
  const url = useBlobUrl(blobKey);
  return url ? <img className="tk-dph-i" src={url} alt={`Photo ${label}`} /> : <span className="tk-dph-none sub">{label} is on another device</span>;
}

export function TalkDocView({ s, t, doc, can, lineName, me, photos, onSave, onBack }: {
  s: ToolStudy; t: TalkTurn; doc: TalkDoc; can: ReturnType<typeof canAt>; lineName?: string; me?: string;
  /** Each photo of the talk by its label. */
  photos: Map<string, TalkTurn>;
  onSave: (doc: TalkDoc, first: TalkDoc) => Promise<void>;
  onBack: () => void;
}) {
  const edit = can.edit;
  const [d, setD] = useState<TalkDoc>(doc);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  /* the document as stored — another device's change comes in when nothing here is waiting to be kept */
  useEffect(() => { if (!dirty.current) setD(doc); }, [doc]);
  const first = useRef(doc);
  const keep = async (x: TalkDoc) => { await onSave(x, first.current); dirty.current = false; setSaid('Kept'); };
  /* kept a moment after the last keystroke */
  useEffect(() => {
    if (!dirty.current) return;
    const h = window.setTimeout(() => void keep(d), 600);
    return () => window.clearTimeout(h);
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (f: (x: TalkDoc) => TalkDoc) => { dirty.current = true; setSaid(null); setD(cur => f(cur)); };
  const sec = (i: number, f: (x: TalkDoc['sections'][number]) => TalkDoc['sections'][number]) =>
    change(x => ({ ...x, sections: x.sections.map((y, j) => (j === i ? f(y) : y)) }));
  const flush = async () => { if (dirty.current) await keep(d); };
  const back = async () => { await flush(); onBack(); };
  const print = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await flush();
      const { saveTalkDoc } = await import('../lib/saveTalkDoc');
      await saveTalkDoc(d, { talk: s.name, ...(lineName ? { line: lineName } : {}), ...(me ? { by: me } : {}), photos });
    } catch (e) {
      console.error('talk document pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    } finally { setBusy(false); }
  };
  const restore = () => {
    if (!t.docFirst) return;
    const was = d;
    change(() => t.docFirst as TalkDoc);
    offerUndo('Back to the document as Line Talk wrote it', async () => { change(() => was); });
  };
  /* a figure Line Talk was not given, still in the document — said until it is checked or taken out */
  const inIt = new Set(figuresIn(docWords(d)));
  const check = (t.unsure ?? []).filter(f => figuresIn(f).some(x => inIt.has(x)));
  const labels = [...photos.keys()].filter(Boolean);

  return (
    <div className="wrap ie tk tk-docv" data-doc={t.id}>
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">LINE TALK · DOCUMENT · <button type="button" className="linkish pl-fac" onClick={() => void back()}>‹ Back to the talk</button></p>
          {edit ? (
            <>
              <label className="field"><span className="field-label">What it is</span>
                <select className="text-input" value={d.kind} aria-label="What it is" onChange={e => change(x => ({ ...x, kind: e.target.value as TalkDocKind }))}>
                  {KINDS.map(k => <option key={k} value={k}>{DOC_KIND_WORD[k]}</option>)}
                </select>
              </label>
              <input className="text-input tk-dtitle" value={d.title} aria-label="Title" onChange={e => change(x => ({ ...x, title: e.target.value }))} />
            </>
          ) : <h1>{d.title}</h1>}
          <p className="pl-says">{DOC_KIND_WORD[d.kind]} from “{s.name}”{lineName ? ` · ${lineName}` : ''}. Each point says where it comes from — <b>Observed</b> (said, typed or photographed on the line), <b>Faultline record</b> (Faultline’s own data) or <b>Assessment</b> (Line Talk’s reading, to be checked).</p>
          {check.length > 0 && <p className="sub is-a tk-unsure">Check before you send it: {check.join(', ')} {check.length === 1 ? 'is' : 'are'} not in what was said or in Faultline’s records.</p>}
          <div className="tk-dacts">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void print()}>{busy ? 'Making the PDF…' : 'Save as PDF'}</button>
            {edit && t.docFirst && <button type="button" className="btn btn-ghost" onClick={restore}>As Line Talk wrote it</button>}
            {said && <span className="sub" role="status">{said}</span>}
          </div>
        </div>
      </header>

      {d.sections.map((x, i) => {
        const free = labels.filter(l => !x.photos.some(p => p.photo === l));
        return (
          <section key={i} className="tk-dsec" data-section={i}>
            {edit ? <input className="text-input tk-dh" value={x.heading} aria-label="Section heading" onChange={e => sec(i, y => ({ ...y, heading: e.target.value }))} /> : <h2 className="ln-h">{x.heading}</h2>}
            {edit
              ? <textarea className="text-input tk-dtext" rows={Math.min(8, Math.max(2, Math.ceil(x.text.length / 80)))} value={x.text} placeholder="A few words to open the section (optional)" aria-label="Section words" onChange={e => sec(i, y => ({ ...y, text: e.target.value }))} />
              : x.text && <p className="tk-dtext-r">{x.text}</p>}
            <ul className="tk-dpts">
              {x.points.map((p, j) => (
                <li key={j} className="tk-dpt" data-basis={p.basis}>
                  {edit ? (
                    <>
                      <select className="text-input tk-dbasis" value={p.basis} aria-label="Where it comes from" onChange={e => sec(i, y => ({ ...y, points: y.points.map((q, k) => (k === j ? { ...q, basis: e.target.value as TalkBasis } : q)) }))}>
                        {BASES.map(b => <option key={b} value={b}>{BASIS_WORD[b]}</option>)}
                      </select>
                      <textarea className="text-input" rows={Math.max(1, Math.ceil(p.text.length / 70))} value={p.text} aria-label="The point" onChange={e => sec(i, y => ({ ...y, points: y.points.map((q, k) => (k === j ? { ...q, text: e.target.value } : q)) }))} />
                      <span className="tk-dpt-m">
                        <input className="text-input" value={p.owner} placeholder="Owner" aria-label="Owner" onChange={e => sec(i, y => ({ ...y, points: y.points.map((q, k) => (k === j ? { ...q, owner: e.target.value } : q)) }))} />
                        <input className="text-input" value={p.due} placeholder="Due" aria-label="Due" onChange={e => sec(i, y => ({ ...y, points: y.points.map((q, k) => (k === j ? { ...q, due: e.target.value } : q)) }))} />
                        <button type="button" className="linkish" onClick={() => sec(i, y => ({ ...y, points: y.points.filter((_, k) => k !== j) }))}>Take out</button>
                      </span>
                    </>
                  ) : (
                    <><span className="tk-dbasis-r">{BASIS_WORD[p.basis]}</span> {p.text}{p.owner ? ` · Owner: ${p.owner}` : ''}{p.due ? ` · Due: ${p.due}` : ''}</>
                  )}
                </li>
              ))}
            </ul>
            {edit && <button type="button" className="linkish" onClick={() => sec(i, y => ({ ...y, points: [...y.points, { text: '', basis: 'observed', owner: '', due: '' }] }))}>Add a point</button>}
            {(x.photos.length > 0 || (edit && free.length > 0)) && (
              <div className="tk-dphotos">
                {x.photos.map((p, j) => (
                  <figure key={p.photo} className="tk-dph" data-photo={p.photo}>
                    <Thumb blobKey={photos.get(p.photo)?.media?.blobKey} label={p.photo} />
                    <figcaption>
                      <b>{p.photo}</b>
                      {edit
                        ? <input className="text-input" value={p.caption} aria-label={`Caption for ${p.photo}`} onChange={e => sec(i, y => ({ ...y, photos: y.photos.map((q, k) => (k === j ? { ...q, caption: e.target.value } : q)) }))} />
                        : <span> {p.caption}</span>}
                      {edit && <button type="button" className="linkish" onClick={() => sec(i, y => ({ ...y, photos: y.photos.filter((_, k) => k !== j) }))}>Take the photo out</button>}
                    </figcaption>
                  </figure>
                ))}
                {edit && free.length > 0 && (
                  <select className="text-input tk-daddph" value="" aria-label="Add a photo to this section" onChange={e => { const v = e.target.value; if (v) sec(i, y => ({ ...y, photos: [...y.photos, { photo: v, caption: '' }] })); }}>
                    <option value="">Add a photo…</option>
                    {free.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
              </div>
            )}
            {edit && (
              <span className="tk-dsec-a">
                {i > 0 && <button type="button" className="linkish" onClick={() => change(z => { const a = [...z.sections]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { ...z, sections: a }; })}>Move up</button>}
                <button type="button" className="linkish" onClick={() => { const was = d; change(z => ({ ...z, sections: z.sections.filter((_, k) => k !== i) })); offerUndo('Section taken out', async () => { change(() => was); }); }}>Take the section out</button>
              </span>
            )}
          </section>
        );
      })}
      {edit && <button type="button" className="btn" onClick={() => change(z => ({ ...z, sections: [...z.sections, { heading: 'New section', text: '', points: [], photos: [] }] }))}>Add a section</button>}
    </div>
  );
}
