/* VOICE, ON THE PHONE — record, send, and turn what came back into changes a
 * person can see before any of them is made.
 *
 * Rowland: "on every part of the app I can talk the information into it — a
 * fix, an observation, etc." The server (api/voice.ts) reads a recording into
 * the fields of the ONE form the person is on. This side does the rest:
 *
 *   RECORD      the phone's own recorder, whatever format it makes
 *   CONVERT     to 16 kHz mono WAV, which every model reads — Chrome records
 *               WebM, an iPhone records MP4, and neither is on every list
 *   SEND        with the sign-in the phone already holds
 *   PROPOSE     each field it heard as a change: the field, what it says now,
 *               what it would say — nothing is written until they say so
 */
import type { VoiceContext, VoiceForm, VoiceResult } from '../../api/voice';
import { supabase } from '../cloud/client';
import { OUTCOME_WORD, FIX_OUTCOME_WORD, INSTALL_OUTCOME_WORD, type Asset, type Outcome, type Test } from './testing';
import { niceDay } from './weeks';

export type { VoiceForm, VoiceResult };

/* --------------------------------- convert -------------------------------- */

/** Any recording the browser can play → 16 kHz mono 16-bit WAV, base64. */
export async function toWavBase64(blob: Blob): Promise<string> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const rate = 16_000;
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const mono = (await off.startRendering()).getChannelData(0);
    return bytesToBase64(wav(mono, rate));
  } finally {
    void ctx.close();
  }
}

/** Samples in -1..1 → a WAV file. */
export function wav(samples: Float32Array, rate: number): Uint8Array {
  const out = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(out.buffer);
}

function bytesToBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

/* ---------------------------------- send ---------------------------------- */

export class VoiceError extends Error {}

/* TRYING AGAIN BY ITSELF. Rowland: "add automatic retry". The free Gemini
   tier is often busy; the server already walks down its Flash models inside
   one request, and when every one of them is busy it says `retry`. The phone
   then waits and asks again — twice more, a few seconds apart — before it
   says so. Signed out, a bad recording or a missing key are not retried:
   asking again would get the same answer. */
export const RETRY_WAITS_MS = [3000, 7000];

export async function askVoice(form: VoiceForm, audio: string, context: VoiceContext,
  onRetry?: (attempt: number, of: number) => void,
  wait: (ms: number) => Promise<void> = ms => new Promise(r => setTimeout(r, ms))): Promise<VoiceResult> {
  if (!navigator.onLine) throw new VoiceError('No signal — the recording is kept. Try again when you have some.');
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  if (!token) throw new VoiceError('Sign in to use voice.');
  const of = RETRY_WAITS_MS.length + 1;
  for (let attempt = 1; ; attempt++) {
    let res: Response | undefined;
    try {
      res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ form, audio, mime: 'audio/wav', context }),
      });
    } catch {
      /* A dropped connection mid-request is worth another go while there is
         signal; with none, say so now. */
      if (!navigator.onLine || attempt >= of) throw new VoiceError('No signal — the recording is kept. Try again when you have some.');
    }
    if (res) {
      const body = await res.json().catch(() => ({})) as VoiceResult & { error?: string; retry?: boolean };
      if (res.ok) return body;
      if (!body.retry || attempt >= of) {
        throw new VoiceError(attempt > 1 && body.retry
          ? 'Voice is busy right now — tried three times. The recording is kept; try again in a minute.'
          : body.error || 'That could not be read. Try again.');
      }
    }
    onRetry?.(attempt + 1, of);
    await wait(RETRY_WAITS_MS[attempt - 1]);
  }
}

/* --------------------------------- propose -------------------------------- */

/** One change a voice note would make — shown, ticked, then made. */
export interface Change {
  key: string;
  label: string;
  /** What it says now, in words; empty when it is blank. */
  before: string;
  after: string;
  patch: Partial<Test>;
}

const wordsFor = (kind: Test['kind']) =>
  kind === 'fix' ? FIX_OUTCOME_WORD : kind === 'install' ? INSTALL_OUTCOME_WORD : OUTCOME_WORD;
const day = (iso?: string) => (iso ? niceDay(iso, { weekday: 'short' }) : '');

/** A machine as it was heard → the machine on the job, by name. */
export function machineNamed(name: string | undefined, assets: Asset[]): Asset | undefined {
  const k = (name ?? '').trim().toLowerCase();
  if (!k) return undefined;
  return assets.find(a => !a.deletedAt && a.name.trim().toLowerCase() === k);
}

/** What the fields heard would change on this record. Only fields that were
 *  heard and differ from what is there already. */
export function changesFor(t: Test, fields: Record<string, unknown>, assets: Asset[], today: string): Change[] {
  const s = (k: string) => (typeof fields[k] === 'string' ? (fields[k] as string).trim() : '');
  const out: Change[] = [];
  const text = (key: keyof Test, label: string) => {
    const v = s(key as string);
    if (v && v !== (t[key] ?? '')) out.push({ key: key as string, label, before: String(t[key] ?? ''), after: v, patch: { [key]: v } as Partial<Test> });
  };
  if (t.kind === 'fix') text('title', 'What we are fixing');
  const m = machineNamed(s('machine'), assets);
  if (m && m.id !== t.assetId) {
    out.push({ key: 'machine', label: 'Machine', before: assets.find(a => a.id === t.assetId)?.name ?? 'The line itself', after: m.name, patch: { assetId: m.id } });
  }
  if (t.kind === 'fix') {
    const p = s('problem');
    if (p && p !== (t.passesIf ?? '')) out.push({ key: 'problem', label: 'The problem', before: t.passesIf ?? '', after: p, patch: { passesIf: p } });
  }
  text('withWhom', t.kind === 'test' ? 'Done with' : 'Who is doing it');
  const planned = s('plannedFor');
  if (planned && planned !== t.plannedFor) out.push({ key: 'plannedFor', label: 'Planned for', before: day(t.plannedFor), after: day(planned), patch: { plannedFor: planned } });
  text('product', 'Product we ran');
  const said = s('result');
  if (said && said !== (t.result ?? '')) {
    /* Added to what is there, never over it: a second voice note on the same
       day is more of the story, not a correction of the first. */
    const after = t.result?.trim() ? `${t.result.trim()}\n${said}` : said;
    out.push({ key: 'result', label: t.kind === 'fix' || t.kind === 'install' ? 'What was done' : 'What happened', before: t.result ?? '', after, patch: { result: after } });
  }
  const ran = s('ranOn');
  const outcome = s('outcome') as Outcome | '';
  /* Saying how it went IS saying it happened — today, unless a day was said. */
  const ranOn = ran || (outcome && !t.ranOn ? today : '');
  if (ranOn && ranOn !== t.ranOn) out.push({ key: 'ranOn', label: 'On the day', before: day(t.ranOn), after: day(ranOn), patch: { ranOn } });
  if (outcome && outcome !== t.outcome) {
    const w = wordsFor(t.kind);
    out.push({ key: 'outcome', label: 'How it went', before: w[t.outcome], after: w[outcome], patch: { outcome } });
  }
  return out;
}

/** The job's names, for the model to spell against. */
export function contextFor(assets: Asset[], tests: Test[], today: string, on?: Test): VoiceContext {
  const liveAssets = assets.filter(a => !a.deletedAt);
  const suppliers = [...new Set([
    ...liveAssets.map(a => a.oem?.trim()),
    ...tests.filter(t => !t.deletedAt).map(t => t.withWhom?.trim()),
  ].filter((x): x is string => !!x))];
  return {
    today,
    machines: liveAssets.map(a => a.name),
    suppliers,
    ...(on ? { on: { title: on.title, machine: liveAssets.find(a => a.id === on.assetId)?.name } } : {}),
  };
}
