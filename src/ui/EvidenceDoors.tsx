/* The Evidence block — Camera · Video · On the phone — shared by the step
 * screen and the "why did it move?" question on the plan, so a picture taken in
 * either place behaves the same. Moved here unchanged from TestScreen. */
import { useState } from 'react';
import type { MediaRef } from '../types';
import { EvidenceThumb } from './Evidence';
import { VideoRecorder, videoCaptureSupported } from './VideoRecorder';
import { captureMedia, pickExistingMedia, saveVideoBlob } from '../lib/media';
import { overCloudLimit, CLOUD_FILE_LIMIT } from '../cloud/sync';
import { Icon } from './Icon';

/** THE EVIDENCE — photos and clips, on a test, on a fix, or on one thing found.
 *
 *  Rowland: "the power of the evidence is not available in fixes and in the
 *  tests; photo still isn't live camera from the phone, it only does gallery;
 *  what we have in the media looks a little messy."
 *
 *  Three things were wrong with the strip this replaces, and they were one
 *  fault: it had no name, no count and no shape. Thumbnails and three dashed
 *  buttons wrapped together in whatever order the width allowed, so a fix
 *  with one photo showed a purple square beside "Photo" and "Upload" on a
 *  line of its own, and nothing on the screen said what any of it was for.
 *
 *  So it is a block with a heading — EVIDENCE, and how much there is — a grid
 *  of what has been taken, and three doors that say where they go:
 *
 *      Camera       the phone's lens, straight away, for what is in front
 *                   of you now. `capture` set, so it never stops at a chooser.
 *      Video        filmed in the app, several clips back to back.
 *      On the phone photos AND clips already taken — somebody else's phone,
 *                   the OEM's engineer, the laptop. Several at once.
 *
 *  Camera used to drop `capture` on these screens so that the phone would
 *  "offer the gallery too", which on Android meant it offered ONLY the
 *  gallery: the lens was never reachable from a test. The gallery has its
 *  own door now, so the camera can be the camera.
 *
 *  IT GOES THROUGH lib/media, the door the line walk already uses: a clip is
 *  sniffed for its real type, converted so it plays on other devices, and a
 *  photo gets a thumbnail. One door, so a clip on a fix behaves like every
 *  other clip in the app. And what is taken here is what the test's card and
 *  the fix's card print — see trialCardPdf. */
export function Evidence({ media, kind, onAdd, onView }: {
  media: MediaRef[];
  kind: 'test' | 'fix' | 'install' | 'found';
  /** Absent for somebody who changes nothing (a client, lib/access): the
   *  pictures without the doors that take them, and nothing at all when there
   *  are none. */
  onAdd?: (refs: MediaRef[]) => Promise<void>;
  onView: (m: MediaRef) => void;
}) {
  const [filming, setFilming] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  /* NOTHING HERE IS EVER DISABLED WHILE A PICKER IS OPEN, and that is the
     point. It was, for one build: tap a door, change your mind, back out of
     the picker, and every button in the row was dead until you left the
     screen — because a picker that is dismissed rather than used reports
     nothing at all on some browsers, so the "still working" flag never came
     off. A second tap while one is open is a far cheaper fault than a row
     that cannot be tapped at all, so the word is the only thing that changes. */
  const take = async (busyNote: string | null, get: () => Promise<MediaRef[]>) => {
    if (!onAdd) return;
    setNote(busyNote);
    try {
      const refs = await get();
      if (refs.length) await onAdd(refs);
      /* Over the cloud's limit: kept here, and said now — not found out by
         the laptop that waits for it for ever (cloud/sync, tooBig). */
      const big = await overCloudLimit(refs.map(r => r.blobKey));
      setNote(big.length
        ? `${big.length === 1 ? 'That file is' : `${big.length} files are`} ${big.map(b => `${Math.round(b / 1048576)} MB`).join(', ')} — over the ${Math.round(CLOUD_FILE_LIMIT / 1048576)} MB the cloud takes. ${big.length === 1 ? 'It is' : 'They are'} kept on this device but will not reach your other devices. A shorter clip will.`
        : null);
    } catch {
      setNote('That wouldn’t attach — the device may be out of room.');
    }
  };

  const photos = media.filter(m => m.kind === 'photo').length;
  const clips = media.length - photos;
  const count = [photos && `${photos} photo${photos === 1 ? '' : 's'}`, clips && `${clips} clip${clips === 1 ? '' : 's'}`]
    .filter(Boolean).join(' · ');
  const why = kind === 'fix' ? 'The problem, and it fixed — a picture of each is the proof.'
    : kind === 'install' ? 'How it was left — a picture is the proof it is done, or of what stopped it.'
    : kind === 'test' ? 'What the machine did, as it did it. The card prints them.'
      : 'A picture of what you saw.';
  if (!onAdd && media.length === 0) return null;

  return (
    <div className="tw-ev">
      <span className="tw-ev-h">
        <b>Evidence</b>
        <span className="sub">{count || 'none yet'}</span>
      </span>
      {media.length > 0
        ? <div className="tw-ev-grid">
          {media.map(m => <EvidenceThumb key={m.id} media={m} size={72} onClick={() => onView(m)} />)}
        </div>
        : <p className="sub tw-ev-why">{why}</p>}
      {onAdd && <div className="tw-ev-doors">
        <button className="tw-door"
          onClick={() => void take(null, async () => {
            const r = await captureMedia('photo');
            return r ? [r] : [];
          })}>
          <Icon name="camera" />Camera
        </button>
        {videoCaptureSupported() && (
          <button className="tw-door" onClick={() => setFilming(true)}><Icon name="video" />Video</button>
        )}
        <button className="tw-door"
          onClick={() => void take('Adding…', () => pickExistingMedia())}>
          <Icon name="photo" />On the phone
        </button>
      </div>}
      {note && <span className="sub" role="status">{note}</span>}

      {/* THE CAMERA STAYS UP AFTER A CLIP, as it does on the walk and the
          capture screen: the recorder counts what it has saved ("keep filming
          or tap Done"), and closing it on the first Stop meant that count was
          never seen and a second clip of the same fault was a second trip
          through the Video door. Done closes it. */}
      {filming && (
        <VideoRecorder
          onCapture={b => { void take('Saving the clip…', async () => [await saveVideoBlob(b)]); }}
          onClose={() => setFilming(false)} />
      )}
    </div>
  );
}
