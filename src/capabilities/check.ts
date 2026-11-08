/* THE CHECK ON WHAT A CAPABILITY IS GIVEN — hand-written, no library: an object with only the fields named, each of its kind,
 * the required ones there, a refusal said in a sentence the colleague can pass on. Mirrors schemas.ts (the gateway's check). */
import type { Checked } from './types';

export type FieldSpec =
  | { kind: 'string'; required?: boolean; max?: number; label: string; pattern?: RegExp; patternSays?: string }
  | { kind: 'int'; required?: boolean; min: number; max: number; label: string }
  | { kind: 'enum'; required?: boolean; values: readonly string[]; label: string }
  | { kind: 'strings'; required?: boolean; min?: number; max?: number; label: string }
  | { kind: 'record'; required?: boolean; label: string }
  | { kind: 'object'; required?: boolean; label: string; fields: Record<string, FieldSpec> };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** An object holding exactly these fields, each as said — strings trimmed, blanks dropped as not given. */
export function checkObject(raw: unknown, fields: Record<string, FieldSpec>, what = 'The request'): Checked<Record<string, unknown>> {
  const o = raw === undefined || raw === null ? {} : raw;
  if (!isObj(o)) return { ok: false, why: `${what} must be an object of named fields.` };
  const extra = Object.keys(o).filter(k => !(k in fields));
  if (extra.length) return { ok: false, why: `${what} has ${extra.length === 1 ? 'a field' : 'fields'} it does not take: ${extra.join(', ')}.` };
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(fields)) {
    let v = o[k];
    if (typeof v === 'string') v = v.trim();
    if (v === undefined || v === null || v === '') {
      if (f.required) return { ok: false, why: `Say ${f.label} — it is needed.` };
      continue;
    }
    switch (f.kind) {
      case 'string':
        if (typeof v !== 'string') return { ok: false, why: `${cap(f.label)} must be words.` };
        if (f.max && v.length > f.max) return { ok: false, why: `${cap(f.label)} is too long — at most ${f.max} characters.` };
        if (f.pattern && !f.pattern.test(v)) return { ok: false, why: f.patternSays ?? `${cap(f.label)} is not in the right form.` };
        break;
      case 'int':
        if (typeof v !== 'number' || !Number.isInteger(v)) return { ok: false, why: `${cap(f.label)} must be a whole number.` };
        if (v < f.min || v > f.max) return { ok: false, why: `${cap(f.label)} must be between ${f.min} and ${f.max}.` };
        break;
      case 'enum':
        if (typeof v !== 'string' || !f.values.includes(v)) return { ok: false, why: `${cap(f.label)} must be one of: ${f.values.join(', ')}.` };
        break;
      case 'strings': {
        if (!Array.isArray(v) || v.some(x => typeof x !== 'string' || !x.trim())) return { ok: false, why: `${cap(f.label)} must be a list of ids.` };
        const list = [...new Set(v.map(x => (x as string).trim()))];
        if (f.min && list.length < f.min) return { ok: false, why: `Give at least ${f.min} for ${f.label}.` };
        if (f.max && list.length > f.max) return { ok: false, why: `Give at most ${f.max} for ${f.label}.` };
        v = list;
        break;
      }
      case 'record':
        if (!isObj(v) || Object.values(v).some(x => typeof x !== 'number' && typeof x !== 'string')) return { ok: false, why: `${cap(f.label)} must be named figures, each a number or words.` };
        break;
      case 'object': {
        const inner = checkObject(v, f.fields, cap(f.label));
        if (!inner.ok) return inner;
        v = inner.input;
        break;
      }
    }
    out[k] = v;
  }
  return { ok: true, input: out };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const ID = (label: string, required = false): FieldSpec => ({ kind: 'string', label, max: 80, ...(required ? { required } : {}) });
