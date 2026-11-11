/* PICTURES, VIDEOS AND LINKS — the button on a part of a tool and the sheet it opens (docs/ATTACHMENTS.md; lib/attachments).
 *
 * Rowland, 6 November: "add ability to put pictures and videos to any work station ... URL links ... across all of the tools". One sheet for every
 * tool: take a photo, add photos or videos from the phone or the laptop, or paste a link; each with a caption, each taken off with Undo. A video is
 * seen (its first frame and a play arrow) and plays in the app; on paper it is a link that opens it here. A page address with ?media=<id> opens that
 * attachment straight away — that is what a video on paper links to. */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ToolStudy } from '../lib/study';
import { patchStudy } from '../db';
import { captureMedia, pickExistingMedia, savePhotoBlob, saveVideoBlob } from '../lib/media';
import { VideoRecorder, videoCaptureSupported } from '../tools/video/VideoRecorder';
import { uid, now } from '../lib/ids';
import { attachLink, attachName, attachSaid, attachmentsOf, asMedia, cleanUrl, fromMedia, hostOf, type Attachment } from '../lib/attachments';
import { studyHref } from '../lib/studyLinks';
import { useRoute } from '../state/useRoute';
import { EvidenceThumb, EvidenceViewer } from './Evidence';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { offerUndo } from './Undo';
import { afterPanelBack } from './backCloses';
import { raiseProblemHere } from './ToolProblems';

/** Change the list in one go (read, change, write — the way every list of facts is kept). */
const change = (id: string, f: (list: Attachment[]) => Attachment[]) => patchStudy(id, cur => ({ facts: { ...cur.facts, attach: f(cur.facts.attach ?? []) } }));

/** The button on a part of a tool: a few small pictures and what is there, opening the sheet. Nothing at all on a part with none for a reader who may not add. */
export function AttachButton({ s, target, name, canEdit, by }: { s: ToolStudy; target?: string; name: string; canEdit: boolean; by?: string }) {
  const list = useMemo(() => attachmentsOf(s, target ?? ''), [s, target]);
  const wanted = useRoute().query.get('media');
  const [open, setOpen] = useState(false);
  /* a link from paper: this part's attachment asked for by the address opens its sheet and its viewer */
  const asked = wanted ? list.find(a => a.id === wanted) : undefined;
  useEffect(() => { if (asked) setOpen(true); }, [asked?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!canEdit && list.length === 0) return null;
  const shown = list.filter(a => a.kind !== 'link').slice(0, 3);
  return (
    <>
      <button type="button" className={'attach-btn' + (list.length ? ' has' : '')} data-attach-open={target ?? ''} onClick={() => setOpen(true)}
        aria-label={list.length ? `${name}: ${attachSaid(list)} — open` : `${name}: add pictures, videos or a link`}>
        {shown.map(a => { const m = asMedia(a); return m ? <EvidenceThumb key={a.id} media={m} size={26} still /> : null; })}
        <span className="attach-btn-t"><Icon name="camera" size="1em" /> {list.length ? list.length : 'Add'}</span>
      </button>
      <AttachSheet s={s} target={target} name={name} canEdit={canEdit} by={by} open={open} onClose={() => setOpen(false)} openFirst={asked?.id} />
    </>
  );
}

export function AttachSheet({ s, target, name, canEdit, by, open, onClose, openFirst }: {
  s: ToolStudy; target?: string; name: string; canEdit: boolean; by?: string; open: boolean; onClose: () => void; openFirst?: string;
}) {
  const list = attachmentsOf(s, target ?? '');
  const [busy, setBusy] = useState('');
  const [viewing, setViewing] = useState<string | undefined>(openFirst);
  const [linking, setLinking] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [bad, setBad] = useState('');
  useEffect(() => { if (openFirst) setViewing(openFirst); }, [openFirst]);

  const add = (more: Attachment[]) => more.length ? change(s.id, l => [...l, ...more]) : Promise.resolve();
  /* THE LIVE CAMERA (Rowland, 6 November: "live picture, live video"): the app's own camera opens on the sheet, a shutter for pictures and a record button for
     clips, and stays open for the next; a phone that cannot give one falls back to the phone's own camera for a picture and the gallery for a clip */
  const [live, setLive] = useState<'photo' | 'video' | null>(null);
  const canLive = videoCaptureSupported();
  const keep = async (make: () => Promise<Parameters<typeof fromMedia>[0]>) => { const m = await make(); await add([fromMedia(m, target, by)]); };
  const photo = async () => {
    if (canLive) { setLive('photo'); return; }
    setBusy('Opening the camera…');
    try { const m = await captureMedia('photo', { gallery: false }); if (m) await add([fromMedia(m, target, by)]); } finally { setBusy(''); }
  };
  const files = async () => {
    setBusy('Adding…');
    try {
      const refs = await pickExistingMedia((i, n, fr, step) => setBusy(`${step === 'fit' ? 'Making video ' + (i + 1) + ' of ' + n + ' small enough to send' : 'Preparing video ' + (i + 1) + ' of ' + n}… ${Math.round(fr * 100)}%`));
      await add(refs.map(m => fromMedia(m, target, by)));
    } finally { setBusy(''); }
  };
  const link = async () => {
    const clean = cleanUrl(url);
    if (!clean) { setBad('That does not look like a web address — for example www.youtube.com/watch?v=…'); return; }
    setBad('');
    await add([{ id: uid(), kind: 'link', ...(target ? { target } : {}), url: clean, ...(title.trim() ? { title: title.trim().slice(0, 80) } : {}), at: now(), ...(by ? { by } : {}) }]);
    setUrl(''); setTitle(''); setLinking(false);
  };
  const caption = (id: string, text: string) => void change(s.id, l => l.map(a => (a.id === id ? { ...a, caption: text } : a)));
  const strike = (id: string, struck: boolean) => change(s.id, l => l.map(a => {
    if (a.id !== id) return a;
    if (struck) return { ...a, struck: true };
    const { struck: _was, ...rest } = a; void _was;
    return rest;
  }));
  const remove = (a: Attachment) => { void strike(a.id, true); offerUndo(`Took off ${a.kind === 'link' ? 'a link' : a.kind === 'video' ? 'a video' : 'a picture'}`, () => strike(a.id, false)); };
  const copy = (a: Attachment) => { void navigator.clipboard?.writeText(attachLink(location.origin, studyHref(s), a)); offerUndo('Link to the video copied', async () => undefined); };

  const viewed = viewing ? list.find(a => a.id === viewing) : undefined;
  const viewedMedia = viewed ? asMedia(viewed) : undefined;
  return (
    <>
      <Sheet open={open} onClose={() => { setViewing(undefined); onClose(); }} title={`${name} — pictures, videos and links`}>
        <div className="attach-sheet" data-attach-sheet={target ?? ''}>
          {list.length === 0 && <p className="sub">Nothing here yet. A picture of the stop, a clip of it happening, or a link to a video — each prints with this part on the report.</p>}
          <ul className="attach-list">
            {list.map(a => {
              const m = asMedia(a);
              return (
                <li key={a.id} className="attach-item" data-attach={a.id} data-kind={a.kind}>
                  {m
                    ? <EvidenceThumb media={m} size={72} onClick={() => setViewing(a.id)} />
                    : <a className="attach-link" href={a.url} target="_blank" rel="noopener noreferrer"><Icon name="link" size="1.2em" /></a>}
                  <div className="attach-meta">
                    {a.kind === 'link'
                      ? <a href={a.url} target="_blank" rel="noopener noreferrer" className="attach-url">{attachName(a)} <span className="sub">{hostOf(a.url ?? '')}</span></a>
                      : <b className="attach-kind">{a.kind === 'video' ? 'Video' : 'Picture'}</b>}
                    {canEdit
                      ? <input className="text-input" value={a.caption ?? ''} placeholder="What it shows (printed with it)" aria-label="Caption" maxLength={200} onChange={e => caption(a.id, e.target.value)} />
                      : a.caption && <span className="sub">{a.caption}</span>}
                    <span className="attach-acts">
                      {a.kind === 'video' && <button type="button" className="linkish" onClick={() => copy(a)}>Copy link</button>}
                      {canEdit && <button type="button" className="linkish" data-attach-remove onClick={() => remove(a)}>Take off</button>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {busy && <p className="sub" role="status">{busy}</p>}
          {canEdit && (
            <div className="attach-add" role="group" aria-label="Add">
              <button type="button" className="btn" data-attach-photo disabled={!!busy} onClick={() => void photo()}><Icon name="camera" size="1.1em" /> Take a photo</button>
              {canLive && <button type="button" className="btn" data-attach-film disabled={!!busy} onClick={() => setLive('video')}><Icon name="video" size="1.1em" /> Film a clip</button>}
              <button type="button" className="btn" data-attach-files disabled={!!busy} onClick={() => void files()}><Icon name="plus" size="1.1em" /> Photos or videos</button>
              <button type="button" className="btn" data-attach-link disabled={!!busy} onClick={() => setLinking(v => !v)}><Icon name="link" size="1.1em" /> A link</button>
            </div>
          )}
          {/* SEEN SOMETHING HERE (docs/TOOL-PROBLEMS.md — Rowland, 11 November: "raise a problem from inside the tool … a specific station"):
              the problem sheet, this part as its machine, what is on it offered to go with it, held here and on Problems */}
          {canEdit && (
            <div className="attach-add attach-problem">
              <button type="button" className="btn" data-attach-problem disabled={!!busy}
                onClick={() => { setViewing(undefined); onClose(); window.setTimeout(() => afterPanelBack(() => raiseProblemHere(s, target)), 30); }}>
                <Icon name="warning" size="1.1em" /> Raise a problem here
              </button>
            </div>
          )}
          {canEdit && linking && (
            <form className="attach-linkform" onSubmit={e => { e.preventDefault(); void link(); }}>
              <input className="text-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste the address — a video, a page, a drawing" aria-label="Web address" inputMode="url" autoCapitalize="off" autoCorrect="off" />
              <input className="text-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="What to call it (optional)" aria-label="Link name" maxLength={80} />
              <button type="submit" className="btn btn-primary" data-attach-link-add disabled={!url.trim()}>Add the link</button>
              {bad && <span className="ie-problem" role="status">{bad}</span>}
            </form>
          )}
        </div>
      </Sheet>
      {live && createPortal(
        <VideoRecorder start={live} onPhoto={b => void keep(() => savePhotoBlob(b))} onCapture={b => void keep(() => saveVideoBlob(b))} onClose={() => setLive(null)} />,
        document.body)}
      {open && viewedMedia && viewed && <EvidenceViewer media={viewedMedia} onClose={() => setViewing(undefined)} {...(canEdit ? { onRemove: () => { setViewing(undefined); remove(viewed); } } : {})} />}
    </>
  );
}
