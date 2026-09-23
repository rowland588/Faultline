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
import { pickFiles } from '../media';

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

  it('attaches the input, because a detached one never opens on iOS', () => {
    void pickFiles('image/*');
    expect(openedPicker().isConnected).toBe(true);
  });
});
