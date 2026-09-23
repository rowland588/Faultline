/* @vitest-environment jsdom */
/* THE PICKER HAS TO OFFER THE VIDEO THAT IS ALREADY ON THE PHONE.
 *
 * The fault this guards was invisible: an "upload" button whose input said
 * `accept="image/*"` opens a perfectly ordinary picker that simply does not
 * list any video, so the clip you are trying to attach is not there and nothing
 * on screen explains why. It shipped on tests and on observations at once,
 * because the code was copied.
 *
 * Two attributes decide it and neither is visible in a screenshot, which is
 * exactly why they are asserted here rather than left to the eye.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { captureMedia, pickFiles } from '../media';

/** The input pickFiles just put in the document. It is attached on purpose —
 *  iOS Safari ignores .click() on a detached one — which is what lets us read
 *  it. The returned promise never settles here, since nothing picks a file. */
const openedPicker = (): HTMLInputElement =>
  document.querySelector('input[type="file"]') as HTMLInputElement;

afterEach(() => { document.querySelectorAll('input[type="file"]').forEach(n => n.remove()); });

describe('the file picker', () => {
  it('offers video as well as photos when asked for both', () => {
    void pickFiles('image/*,video/*', { multiple: true });
    const el = openedPicker();
    expect(el.accept).toContain('video/');
    expect(el.multiple).toBe(true);
  });

  it('does not carry capture unless the user asked to shoot something', () => {
    /* With capture set, a phone goes straight to the camera and never offers
       the gallery — so an upload button carrying it cannot upload anything. */
    void pickFiles('image/*,video/*', { multiple: true });
    expect(openedPicker().getAttribute('capture')).toBeNull();
  });

  it('goes straight to the camera when the user did ask to shoot', () => {
    void pickFiles('image/*', { camera: true });
    expect(openedPicker().getAttribute('capture')).toBe('environment');
  });

  /* Rowland: "make photo offer the gallery too." On a test or a fix the
     close-up has usually been taken already, and `capture` is what stops the
     phone listing it. */
  it('lets the camera be offered alongside the gallery, not instead of it', async () => {
    void captureMedia('photo', { gallery: true });
    await Promise.resolve();
    expect(openedPicker().getAttribute('capture')).toBeNull();
    expect(openedPicker().accept).toBe('image/*');
  });

  it('still goes straight to the lens when nothing says otherwise', async () => {
    void captureMedia('photo');
    await Promise.resolve();
    expect(openedPicker().getAttribute('capture')).toBe('environment');
  });

  it('attaches the input, because a detached one never opens on iOS', () => {
    void pickFiles('image/*');
    expect(openedPicker().isConnected).toBe(true);
  });

  /* BACKING OUT IS NOT AN ERROR, AND IT MUST NOT LEAVE THE CALLER WAITING.
     For one build the strip on a test disabled its own buttons while a pick was
     in flight, and dismissing the picker fires `cancel` rather than `change` —
     so the promise never settled, the flag never came off, and every door in
     the row was dead until you left the screen. Reported as, exactly, "photos
     and video and upload video don't work". */
  it('settles with nothing when the picker is dismissed', async () => {
    const picked = pickFiles('image/*,video/*', { multiple: true });
    openedPicker().dispatchEvent(new Event('cancel'));
    await expect(picked).resolves.toEqual([]);
  });

  it('takes the dismissed input back out of the document', async () => {
    const picked = pickFiles('image/*');
    const el = openedPicker();
    el.dispatchEvent(new Event('cancel'));
    await picked;
    expect(el.isConnected).toBe(false);
  });
});
