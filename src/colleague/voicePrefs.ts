/* THE VOICE ON THIS DEVICE — the person's settings and what the phone offers, each found out at run time (9 November;
 * docs/VOICE.md). Rowland: "Do not assume every Samsung device has the same speech recognition services or capabilities … Do
 * not assume every Android device has identical voices installed."
 *
 *   settings   which voice, how fast, how long a pause is waited, whether Faultline listens while it speaks, whether the words
 *              are written down on the phone itself — kept on this device only (localStorage), never synced
 *   voices     the device's own voices (speechSynthesis.getVoices — on Android the phone's text-to-speech engine: Samsung's or
 *              Google's, whichever is set), English first, each saying whether it is on the phone or needs the network
 *   on-device  whether this browser can write speech down on the phone itself for British English (the Web Speech API's
 *              SpeechRecognition.available with processLocally, Chrome 139 and later) — offered only when it says so
 *   headset    whether a Bluetooth or wired headset is among the audio devices (navigator.mediaDevices, labels once the
 *              microphone is allowed) — the sound and the microphone follow the phone's own routing; a web page cannot pick
 *              them, and the screen says so */
import { useEffect, useState } from 'react';
import type { PauseLength } from './speech';

export interface VoicePrefs {
  /** A voice's voiceURI; absent = British English first. */
  voiceURI?: string;
  /** 0.8 – 1.3; 1.02 by default. */
  rate: number;
  pause: PauseLength;
  /** Listen while Faultline speaks, so the person can talk over it: auto = with a headset (no echo from the speaker). */
  talkOver: 'auto' | 'on' | 'off';
  /** Write the words down on the phone itself, where this browser can. */
  onDevice: boolean;
}

export const VOICE_PREFS_KEY = 'faultline.voice';
export const DEFAULT_PREFS: VoicePrefs = { rate: 1.02, pause: 'normal', talkOver: 'auto', onDevice: false };
const EVENT = 'faultline-voice-prefs';

export function readPrefs(): VoicePrefs {
  try {
    const v = JSON.parse(localStorage.getItem(VOICE_PREFS_KEY) ?? '{}') as Partial<VoicePrefs>;
    return {
      ...DEFAULT_PREFS,
      ...(typeof v.voiceURI === 'string' ? { voiceURI: v.voiceURI } : {}),
      ...(typeof v.rate === 'number' && v.rate >= 0.6 && v.rate <= 1.6 ? { rate: v.rate } : {}),
      ...(v.pause === 'short' || v.pause === 'normal' || v.pause === 'long' ? { pause: v.pause } : {}),
      ...(v.talkOver === 'auto' || v.talkOver === 'on' || v.talkOver === 'off' ? { talkOver: v.talkOver } : {}),
      ...(typeof v.onDevice === 'boolean' ? { onDevice: v.onDevice } : {}),
    };
  } catch { return { ...DEFAULT_PREFS }; }
}
export function writePrefs(p: Partial<VoicePrefs>): VoicePrefs {
  const next = { ...readPrefs(), ...p };
  try { localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(next)); } catch { /* this visit only */ }
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* no window */ }
  return next;
}
export function useVoicePrefs(): [VoicePrefs, (p: Partial<VoicePrefs>) => void] {
  const [p, setP] = useState(readPrefs);
  useEffect(() => {
    const on = () => setP(readPrefs());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [p, x => setP(writePrefs(x))];
}

/* ------------------------------------------------------------------ the device's voices */

export interface DeviceVoice { uri: string; name: string; lang: string; local: boolean; isDefault: boolean }

/** The voices, English first (British first), then the rest — each as the device names it. */
export function sortVoices(vs: readonly DeviceVoice[]): DeviceVoice[] {
  const rank = (v: DeviceVoice) => (/^en[-_]GB/i.test(v.lang) ? 0 : /^en/i.test(v.lang) ? 1 : 2);
  return [...vs].sort((a, b) => rank(a) - rank(b) || Number(b.local) - Number(a.local) || a.name.localeCompare(b.name));
}

/** The device's voices — waited for briefly, as Chrome lists them a moment after the page opens. */
export function useDeviceVoices(): DeviceVoice[] {
  const [vs, setVs] = useState<DeviceVoice[]>([]);
  useEffect(() => {
    const s = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined;
    if (!s) return;
    const read = () => setVs(sortVoices(s.getVoices().map(v => ({ uri: v.voiceURI, name: v.name, lang: v.lang, local: v.localService, isDefault: v.default }))));
    read();
    s.addEventListener?.('voiceschanged', read);
    const t = window.setTimeout(read, 800);
    return () => { s.removeEventListener?.('voiceschanged', read); window.clearTimeout(t); };
  }, []);
  return vs;
}

/* ------------------------------------------------------------------ on-device recognition */

export type OnDevice = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown';
type RecognitionStatics = { available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>; install?: (o: { langs: string[]; processLocally?: boolean }) => Promise<boolean> };
const recognitionClass = (): RecognitionStatics | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionStatics; webkitSpeechRecognition?: RecognitionStatics };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/** Whether British English can be written down on the phone itself — asked of the browser, never assumed. */
export async function onDeviceStatus(lang = 'en-GB'): Promise<OnDevice> {
  const R = recognitionClass();
  if (!R?.available) return 'unknown';
  try {
    const a = await R.available({ langs: [lang], processLocally: true });
    return a === 'available' || a === 'downloadable' || a === 'downloading' || a === 'unavailable' ? a : 'unknown';
  } catch { return 'unknown'; }
}
/** Ask the browser to fetch its on-device model for the language — only when the person asks. */
export async function installOnDevice(lang = 'en-GB'): Promise<boolean> {
  const R = recognitionClass();
  if (!R?.install) return false;
  try { return !!(await R.install({ langs: [lang], processLocally: true })); } catch { return false; }
}
export const ON_DEVICE_SAID: Record<OnDevice, string> = {
  available: 'This phone can write your words down on the phone itself — nothing of your voice leaves it.',
  downloadable: 'This phone can write your words down on the phone itself once its British English model is fetched.',
  downloading: 'The phone is fetching its British English model.',
  unavailable: 'This browser writes your words down with its speech service over the network (Google’s, in Chrome on Android) — the sound of your voice goes there to be written down, not to Faultline.',
  unknown: 'This browser writes your words down with its own speech service — in Chrome on Android, Google’s, usually over the network. The sound of your voice goes there to be written down, not to Faultline.',
};

/* ------------------------------------------------------------------ a headset */

export interface AudioRoute { headset: boolean; name?: string; known: boolean }
const HEADSET = /bluetooth|headset|head-set|hands.?free|earbud|buds|airpods|headphone|\bbt\b|sco/i;
/* the phone's OWN microphone and speaker, whatever their words: Android names its built-in microphone "Headset earpiece" and
   "Speakerphone" (10 November — Rowland: "When the AI speaks it hears its own voice") — never a headset */
const BUILT_IN = /earpiece|speaker|built.?in|internal|default|communications/i;
/** Whether a device's name is a headset the person wears — so the phone's speaker is not what the microphone hears. */
export const isHeadset = (label: string): boolean => HEADSET.test(label) && !BUILT_IN.test(label);

/** What is plugged in or paired — known only once the microphone has been allowed (before that the device gives no names). */
export async function audioRoute(): Promise<AudioRoute> {
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!md?.enumerateDevices) return { headset: false, known: false };
  try {
    const ds = (await md.enumerateDevices()).filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput');
    const named = ds.filter(d => d.label);
    if (!named.length) return { headset: false, known: false };
    const h = named.find(d => isHeadset(d.label));
    return h ? { headset: true, name: h.label.replace(/\s*\([^)]*\)\s*$/, ''), known: true } : { headset: false, known: true };
  } catch { return { headset: false, known: false }; }
}
/** The route as it changes — a headset paired, dropped or put back. */
export function useAudioRoute(): AudioRoute {
  const [r, setR] = useState<AudioRoute>({ headset: false, known: false });
  useEffect(() => {
    let live = true;
    const read = () => void audioRoute().then(x => { if (live) setR(x); });
    read();
    const md = navigator.mediaDevices;
    md?.addEventListener?.('devicechange', read);
    return () => { live = false; md?.removeEventListener?.('devicechange', read); };
  }, []);
  return r;
}
/** Whether to listen while Faultline speaks: the person's setting, and with auto only when a headset keeps the speaker out of the
 *  microphone. */
export const listenWhileSpeaking = (p: Pick<VoicePrefs, 'talkOver'>, route: AudioRoute): boolean => p.talkOver === 'on' || (p.talkOver === 'auto' && route.headset);
