import type { MediaPin, MediaRef } from '../types';
import type { Test, TestItem } from '../lib/testing';
import { useBlobUrl, useBlobSource } from '../lib/useBlobUrl';
import { uid } from '../lib/ids';
import { VideoPlayer } from './VideoPlayer';
import { Icon } from './Icon';
import { useState } from 'react';
import { ShareSheet } from './ShareLink';
import PinImage, { type Pin } from '../snag/PinImage';

/** "2 marks" — said the same on a thumbnail, a row and paper. */
export const marksWord = (n: number): string => `${n} mark${n === 1 ? '' : 's'}`;

/** The marks a picture carries — a clip has none (they belong to a still). */
export const pinsOf = (m: MediaRef): MediaPin[] => (m.kind === 'photo' ? m.pins ?? [] : []);

/** The list with one picture's marks replaced; none left, no `pins` at all. */
export function withPins(list: MediaRef[] | undefined, id: string, pins: MediaPin[]): MediaRef[] {
  return (list ?? []).map(m => {
    if (m.id !== id) return m;
    const { pins: _was, ...rest } = m;
    return pins.length ? { ...rest, pins } : rest;
  });
}

/** WHERE A PICTURE ON A JOB IS KEPT, ITS MARKS GO BACK TO — the test, fix or
 *  stage it is on, or the thing found under one. Every live record holding it
 *  is written, so a photo a fix shares with the problem that booked it reads
 *  the same on both. For the viewer's `onPins`, where `can.edit`. */
export function pinsOnJob(tt: {
  tests: Test[]; items: TestItem[];
  patchTest: (id: string, p: (cur: Test) => Partial<Test>) => Promise<void>;
  patchItem: (id: string, p: (cur: TestItem) => Partial<TestItem>) => Promise<void>;
}, mediaId: string): (pins: MediaPin[]) => void {
  const holds = (r: { media?: MediaRef[]; deletedAt?: number }) => !r.deletedAt && (r.media ?? []).some(m => m.id === mediaId);
  return pins => {
    for (const t of tt.tests.filter(holds)) void tt.patchTest(t.id, cur => ({ media: withPins(cur.media, mediaId, pins) }));
    for (const i of tt.items.filter(holds)) void tt.patchItem(i.id, cur => ({ media: withPins(cur.media, mediaId, pins) }));
  };
}

export function EvidenceThumb({ media, onClick, size = 54, still }: {
  media: MediaRef; onClick?: () => void; size?: number;
  /** Only a picture — for inside something that is itself the button (a fix's
   *  box on the Fixes page), where a button in a button is not allowed. */
  still?: boolean;
}) {
  const url = useBlobUrl(media.thumbKey ?? (media.kind === 'photo' ? media.blobKey : undefined));
  const marks = pinsOf(media).length;
  const inner = <>
    {url ? <img src={url} alt="" /> : <span className="ev-ph" aria-hidden><Icon name={media.kind === 'video' ? 'play' : 'camera'} size="1em" /></span>}
    {media.kind === 'video' && <span className="ev-play" aria-hidden><Icon name="play" size="1em" /></span>}
    {/* What is pointed at on it — the count only; the marks and their words
        are in the picture when it opens. */}
    {marks > 0 && <span className="ev-marks" aria-hidden>{marksWord(marks)}</span>}
  </>;
  if (still) return <span className="ev-thumb" style={{ width: size, height: size }} aria-hidden>{inner}</span>;
  return (
    <button type="button" className="ev-thumb" style={{ width: size, height: size }} onClick={onClick}
      aria-label={media.kind === 'video' ? 'Play the clip' : `Open the photo${marks ? ` — ${marksWord(marks)}` : ''}`}>
      {inner}
    </button>
  );
}

/** Full-screen lightbox for one piece of evidence. */
/** `onRemove`, where the screen allows it: a photo attached to the wrong
 *  test, or a blurred one, could be looked at and never taken off again.
 *  `share`, where the person may send it outside (the owner, signed in, and
 *  only a test's own pictures — ui/ShareLink): the picture being looked at is
 *  the one the link opens, so the way to send it is here and nowhere else.
 *  `onPins`, where the screen can write the picture back (`can.edit`): tap
 *  where the problem is and say what is wrong there. Without it the marks a
 *  photo has are shown, numbered, with their words — never hidden. */
export function EvidenceViewer({ media, onClose, onRemove, share, onPins }: {
  media: MediaRef; onClose: () => void; onRemove?: () => void;
  share?: { projectId: string; testId: string; onMade?: () => void };
  onPins?: (pins: MediaPin[]) => void;
}) {
  const { url, state } = useBlobSource(media.blobKey);
  const [sharing, setSharing] = useState(false);
  /* The marks while it is open: each change is written at once (onPins) and
     drawn from here, so a second mark never waits on the first one's write. */
  const [pins, setPins] = useState<MediaPin[]>(pinsOf(media));
  const marked = media.kind === 'photo' && (pins.length > 0 || !!onPins);
  return (
    <div className="ev-viewer" onClick={onClose}>
      <button className="ev-close" onClick={onClose} aria-label="Close"><Icon name="close" size="1.1em" /></button>
      {onRemove && (
        <button className="ev-remove" onClick={e => { e.stopPropagation(); onRemove(); }}>Remove</button>
      )}
      {share && (
        <button className="ev-share" onClick={e => { e.stopPropagation(); setSharing(true); }}>Share a link</button>
      )}
      <div className={'ev-stage' + (marked ? ' ev-marked' : '')} onClick={e => e.stopPropagation()}>
        {media.kind === 'photo'
          ? (url ? (marked
            ? <Marks src={url} pins={pins} onPins={onPins ? next => { setPins(next); onPins(next); } : undefined} />
            : <img src={url} alt="Evidence" />)
            : <div className="video-msg">{state === 'loading' ? <span className="sub">Loading…</span> : <><span className="video-msg-ic" aria-hidden><Icon name="cloud" size="1em" /></span><b>Not on this device yet</b><span className="sub">It'll download on the next sync.</span></>}</div>)
          : <VideoPlayer blobKey={media.blobKey} autoPlay />}
        {/* Inside the stage on purpose: the sheet is portalled to <body>, but
            React still bubbles its taps up through here, and the stage stops
            them — so a tap on the sheet's scrim closes the sheet, not the
            picture as well. */}
        {share && <ShareSheet open={sharing} onClose={() => setSharing(false)} media={media}
          projectId={share.projectId} testId={share.testId} onMade={share.onMade} />}
      </div>
    </div>
  );
}

/** THE MARKS ON A PICTURE — the walk's own pins (snag/PinImage) on any photo.
 *  Rowland, 6 October: "press the picture and then say what's wrong within
 *  the picture at certain locations." Tap a spot: a numbered pin and "What's
 *  wrong here?". Tap a pin: change its words, move it (tap the picture while
 *  it is chosen) or delete it. The words are listed under the picture by
 *  number — the same numbers the paper prints beside it (lib/testReport). */
function Marks({ src, pins, onPins }: { src: string; pins: MediaPin[]; onPins?: (next: MediaPin[]) => void }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [words, setWords] = useState('');
  const on = pins.find(p => p.id === chosen);
  const n = on ? pins.indexOf(on) + 1 : pins.length + 1;

  const place = (x: number, y: number) => {
    if (!onPins) return;
    if (on) { onPins(pins.map(p => (p.id === on.id ? { ...p, x, y } : p))); return; }   // chosen: it moves
    if (!draft) setWords('');                                                           // a new one, empty —
    setDraft({ x, y });                                                                 // tapped again, it moves
  };
  const pick = (id: string) => {
    if (id === '__draft') return;
    const p = pins.find(q => q.id === id && q.id !== chosen);                          // tapped again: let go
    setDraft(null); setChosen(p?.id ?? null); setWords(p?.note ?? '');
  };
  const done = () => { setDraft(null); setChosen(null); setWords(''); };
  const save = () => {
    const note = words.trim();
    if (!note || !onPins) return;
    if (draft) onPins([...pins, { id: uid(), x: draft.x, y: draft.y, note }]);
    else if (on) onPins(pins.map(p => (p.id === on.id ? { ...p, note } : p)));
    done();
  };

  const shown: Pin[] = pins.map((p, i) => ({ id: p.id, xPct: p.x, yPct: p.y, color: 'var(--danger)', label: p.note, n: i + 1, active: p.id === chosen }));
  if (draft) shown.push({ id: '__draft', xPct: draft.x, yPct: draft.y, color: 'var(--brand)', n, active: true });
  const open = !!onPins && (!!draft || !!on);

  return (
    <>
      <PinImage src={src} pins={shown} alt="Evidence" readOnly={!onPins} onPlace={place} onPinTap={pick} />
      {open ? (
        <div className="evm-box">
          <label className="evm-l" htmlFor="evm-words"><span className={'evm-n' + (draft ? ' is-new' : '')}>{n}</span>What’s wrong here?</label>
          <textarea id="evm-words" className="text-area" rows={2} autoFocus value={words} maxLength={300}
            placeholder="e.g. Guard bolt missing" onChange={e => setWords(e.target.value)} />
          <span className="evm-acts">
            <button type="button" className="btn btn-primary btn-sm" disabled={!words.trim()} onClick={save}>Save</button>
            {on && <button type="button" className="btn btn-ghost btn-sm evm-del" onClick={() => { onPins?.(pins.filter(p => p.id !== on.id)); done(); }}>Delete</button>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={done}>Cancel</button>
            <span className="evm-hint">{on ? 'Tap the picture to move it there.' : 'Wrong spot? Tap the picture again.'}</span>
          </span>
        </div>
      ) : onPins && <p className="evm-say">{pins.length ? 'Tap a mark to change it — or the picture to mark another spot.' : 'Tap the picture where the problem is.'}</p>}
      {pins.length > 0 && (
        <ol className="evm-list" aria-label="Marked on the picture">
          {pins.map((p, i) => (
            <li key={p.id}>
              <button type="button" className={p.id === chosen ? 'on' : ''} onClick={() => pick(p.id)}>
                <span className="evm-n">{i + 1}</span><span>{p.note}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
