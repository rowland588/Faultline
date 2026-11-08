/* AI MODE, OUT LOUD — the colleague's replies spoken by the phone's own voice, and a conversation held hands-free.
 *
 * SPEAK REPLIES: each reply read out with the browser's speech synthesis — a British English voice where the device has
 * one — its markdown taken out first; stopped the moment the person starts talking or taps the microphone. Nothing goes
 * to a server: the voice is the device's.
 * CONVERSATION: after a reply is spoken, the microphone opens again (tools/talk/hearing, as Line Talk listens) so the
 * person can answer without touching the phone — while the screen is on. A phone stops listening when it locks or the
 * app goes out of sight, and the screen says so; the words said so far stay in the box. */

/** The words as they are spoken: no **bold**, no list marks, no links' brackets. */
export function speakable(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*(?:[-•*]|\d+[.)])\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#`_]/g, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

interface Synth { speak(u: SpeechSynthesisUtterance): void; cancel(): void; getVoices(): SpeechSynthesisVoice[]; speaking: boolean }
const synth = (): Synth | undefined => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis as unknown as Synth : undefined);

/** Whether this device can speak at all. */
export const canSpeak = (): boolean => !!synth() && typeof SpeechSynthesisUtterance !== 'undefined';

/** The voice: British English first, then any English. */
export function pickVoice(voices: readonly Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'default'>[]): number {
  const gb = voices.findIndex(v => /^en[-_]GB/i.test(v.lang));
  if (gb >= 0) return gb;
  return voices.findIndex(v => /^en/i.test(v.lang));
}

let speakingNow = false;

/** Say it; `onDone` when it has been said (or could not be). Cancels anything still being said. */
export function speak(text: string, onDone?: () => void): void {
  const s = synth();
  const words = speakable(text);
  if (!s || !words || typeof SpeechSynthesisUtterance === 'undefined') { onDone?.(); return; }
  s.cancel();
  const u = new SpeechSynthesisUtterance(words.slice(0, 4000));
  const voices = s.getVoices();
  const i = pickVoice(voices);
  if (i >= 0) { u.voice = voices[i]; u.lang = voices[i].lang; } else u.lang = 'en-GB';
  u.rate = 1.02;
  speakingNow = true;
  let done = false;
  const end = () => { if (done) return; done = true; speakingNow = false; onDone?.(); };
  u.onend = end;
  u.onerror = end;
  s.speak(u);
}

/** Stop speaking at once — the person has started talking. */
export function stopSpeaking(): void {
  speakingNow = false;
  try { synth()?.cancel(); } catch { /* nothing to stop */ }
}

export const isSpeaking = (): boolean => speakingNow;

/** The device settings' keys. */
export const SPEAK_KEY = 'faultline.aiSpeak';
export const CONVERSATION_KEY = 'faultline.aiConversation';

/** What the Conversation switch promises — said on the screen, honestly. */
export const CONVERSATION_SAID = 'Conversation: after each reply is spoken, the microphone opens again so you can answer without a tap. It works while the screen is on — it stops when the phone locks or Faultline goes out of sight.';
