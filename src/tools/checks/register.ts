/* THE MISTAKE-PROOFING REGISTER, AS DATA (FC-014; knowledge/specs/FC-014-mistake-proofing.md, Calculations case 3).
 *
 * A poka-yoke device is a check on the list (tools/checks/defs/mistake-proofing). Its register fields — the error it
 * prevents, its type (Shingo: contact, fixed-value, motion-step) and its function (control, warning) — are three optional
 * fields of the check. This module reads them, counts them, narrows the list by them and says them in the page's words;
 * the page, the paper and the tests all read it, so they cannot disagree (CLAUDE.md rule 2). Pure.
 *
 * A log started before the fields existed wrote the type and function as the first words of "passes if" —
 * "Contact · control. A known-bad pack …" — and the error after "— prevents" in the name. Those are READ as the fields
 * (and said to have been read from the words) so that an older log's register counts the same; nothing is rewritten. */
import type { LogCheck } from '../../lib/study';

export type DeviceType = NonNullable<LogCheck['deviceType']>;
export type DeviceFunction = NonNullable<LogCheck['deviceFunction']>;

export const DEVICE_TYPES: { key: DeviceType; word: string; help: string }[] = [
  { key: 'contact', word: 'Contact', help: 'a shape or a sensor that fits only the right part or the right place' },
  { key: 'fixed-value', word: 'Fixed-value', help: 'a count or a quantity that must be reached — all six labels used, the weight in band' },
  { key: 'motion-step', word: 'Motion-step', help: 'the steps must happen in order — the guard shut before the start' },
];
export const DEVICE_FUNCTIONS: { key: DeviceFunction; word: string; help: string }[] = [
  { key: 'control', word: 'Control', help: 'the machine stops, will not start, or the pack is rejected' },
  { key: 'warning', word: 'Warning', help: 'a light or a sound; a person has to act' },
];
export const typeWord = (t: DeviceType): string => DEVICE_TYPES.find(x => x.key === t)?.word ?? t;
export const functionWord = (f: DeviceFunction): string => DEVICE_FUNCTIONS.find(x => x.key === f)?.word ?? f;

/** The old form of the type and function: the first words of "passes if". */
const LEGACY = /^\s*(contact|fixed-value|motion-step)\s*·\s*(control|warning)\s*\.\s*/i;
/** The old form of the error: "… — prevents a pack with no label". */
const LEGACY_ERROR = /\s[—–-]\s*prevents?\s+(.+)$/i;

/** A "passes if" without the type and function words the old starter list put in front of it. */
export const withoutLegacyWords = (criterion: string | undefined): string => (criterion ?? '').replace(LEGACY, '').trim();

export interface Device {
  check: LogCheck;
  /** The check is a device (it has a type, a function or an error) and not a routine check on the devices. */
  isDevice: boolean;
  error?: string;
  type?: DeviceType;
  fn?: DeviceFunction;
  /** The fields were read from the old words, not set. */
  fromWords: boolean;
}

/** What a check says of itself as a device: its fields, else the old words. */
export function deviceOf(c: LogCheck): Device {
  const m = LEGACY.exec(c.criterion ?? '');
  const e = LEGACY_ERROR.exec(c.name);
  const error = c.error?.trim() || (e ? e[1].trim() : undefined);
  const type = c.deviceType ?? (m ? (m[1].toLowerCase() as DeviceType) : undefined);
  const fn = c.deviceFunction ?? (m ? (m[2].toLowerCase() as DeviceFunction) : undefined);
  const fromWords = (!c.deviceType && !!m) || (!c.deviceFunction && !!m) || (!c.error?.trim() && !!e);
  return { check: c, isDevice: !!(type || fn || error), ...(error ? { error } : {}), ...(type ? { type } : {}), ...(fn ? { fn } : {}), fromWords };
}

/** "Contact · control — prevents: a pack with no label" — a device in one line (empty for a routine check). */
export function deviceLine(d: Device): string {
  const kind = [d.type ? typeWord(d.type) : undefined, d.fn ? functionWord(d.fn).toLowerCase() : undefined].filter(Boolean).join(' · ');
  const parts = [kind, d.error ? `prevents: ${d.error}` : ''].filter(Boolean);
  return parts.join(' — ');
}

export interface RegisterFigures {
  devices: Device[];
  routines: Device[];
  byType: Record<DeviceType, number>;
  byFunction: Record<DeviceFunction, number>;
  noType: number;
  noFunction: number;
  noError: number;
  /** Devices whose fields were read from the old words. */
  fromWords: number;
}

/** The register of a log's live checks. */
export function registerOf(checks: readonly LogCheck[]): RegisterFigures {
  const all = checks.filter(c => !c.removed).map(deviceOf);
  const devices = all.filter(d => d.isDevice), routines = all.filter(d => !d.isDevice);
  const byType: Record<DeviceType, number> = { contact: 0, 'fixed-value': 0, 'motion-step': 0 };
  const byFunction: Record<DeviceFunction, number> = { control: 0, warning: 0 };
  for (const d of devices) { if (d.type) byType[d.type]++; if (d.fn) byFunction[d.fn]++; }
  return {
    devices, routines, byType, byFunction,
    noType: devices.filter(d => !d.type).length, noFunction: devices.filter(d => !d.fn).length, noError: devices.filter(d => !d.error).length,
    fromWords: devices.filter(d => d.fromWords).length,
  };
}

const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** The register in the page's words: "7 devices — 2 contact · 2 fixed-value · 3 motion-step; 6 control · 1 warning — and 2 routine checks on them." */
export function registerSays(r: RegisterFigures): string {
  if (!r.devices.length && !r.routines.length) return 'Nothing is on the list yet — no device is registered.';
  if (!r.devices.length) return `${n(r.routines.length, 'routine check')} on the list and no device is registered yet — give a check its type, function and the error it prevents to register it.`;
  const types = DEVICE_TYPES.filter(t => r.byType[t.key]).map(t => `${r.byType[t.key]} ${t.key}`).join(' · ');
  const fns = DEVICE_FUNCTIONS.filter(f => r.byFunction[f.key]).map(f => `${r.byFunction[f.key]} ${f.key}`).join(' · ');
  const gaps = [r.noType ? `${r.noType} with no type yet` : '', r.noFunction ? `${r.noFunction} with no function yet` : '', r.noError ? `${r.noError} with no error named` : ''].filter(Boolean);
  return `${n(r.devices.length, 'device')}${types || fns ? ` — ${[types, fns].filter(Boolean).join('; ')}` : ''}${r.routines.length ? ` — and ${n(r.routines.length, 'routine check')} on them` : ''}.${gaps.length ? ` ${gaps.join(', ')}.` : ''}`;
}

/** What to say of the warning devices, if there are any (the record's rule: a warning depends on a person's reaction). */
export const warningNote = (r: RegisterFigures): string | undefined =>
  r.byFunction.warning ? `${n(r.byFunction.warning, 'warning device')} depend${r.byFunction.warning === 1 ? 's' : ''} on a person’s reaction; where the error is a food-safety one a control — a stop or a reject — is the stronger protection. Which errors are food-safety ones is the site’s own call.` : undefined;

/** The register narrowed by type and by function (either may be absent); routine checks are never shown by a filter. */
export function narrow(devices: readonly Device[], f: { type?: DeviceType; fn?: DeviceFunction }): Device[] {
  return devices.filter(d => (!f.type || d.type === f.type) && (!f.fn || d.fn === f.fn));
}

/** "Contact · control" for a table cell; "—" when neither is given. */
export const kindCell = (d: Device): string => [d.type ? typeWord(d.type) : undefined, d.fn ? functionWord(d.fn) : undefined].filter(Boolean).join(' · ') || '—';
