/* THE INGEST CORE — the one place a business's system rows become Luna's production records (11 November, docs/DATA-CONNECTIONS.md
 * §1 — Rowland: "Retain data provenance, apply calculations through the app's own deterministic logic and distinguish actual system
 * data from reported or estimated information").
 *
 * Every kind of connection (push, pull, and the kinds designed after them) passes its rows through here: the same mapping (a JSON path
 * for JSON, a column header for CSV), the same checks, the same refusals with why, the same id (`connection : the system's id`, so a
 * row sent twice replaces itself). Nothing worked out is stored. A blank is NOT RECORDED (null), never zero.
 *
 * SELF-CONTAINED on purpose — no imports — so the `ingest` edge function runs this very file (copied by scripts/sync-assist.mjs into
 * supabase/functions/ingest/core.ts, held equal by src/lib/production/__tests__/ingest.test.ts). Pure. */

/** The fields of a production record a system's row can carry, by the name a mapping uses. */
export const PRODUCTION_FIELDS = ['id', 'line', 'day', 'shift', 'product', 'planned', 'run', 'output', 'target', 'good', 'rejects', 'downtime', 'reason'] as const;
export type ProductionField = typeof PRODUCTION_FIELDS[number];

/** What each field means, in words — for the mapping on the page and the answer to a refusal. */
export const FIELD_WORDS: Record<ProductionField, string> = {
  id: 'the system’s own id for the row', line: 'the line', day: 'the day', shift: 'the shift', product: 'the product',
  planned: 'planned minutes', run: 'run minutes', output: 'units made', target: 'target units', good: 'good units', rejects: 'rejects',
  downtime: 'downtime minutes', reason: 'downtime reason',
};

/** The names looked for when a mapping leaves a field out — a system that sends Luna's own names needs no mapping at all. */
export const DEFAULT_PATHS: Record<ProductionField, string> = {
  id: 'id', line: 'line', day: 'day', shift: 'shift', product: 'product', planned: 'planned_minutes', run: 'run_minutes', output: 'output',
  target: 'target', good: 'good', rejects: 'rejects', downtime: 'downtime_minutes', reason: 'downtime_reason',
};

export interface IngestMapping {
  /** Where the rows are in a JSON answer ("data.items"); none = the body is the rows, or `{ rows: [...] }`. */
  rows?: string;
  /** A field's path in a row (JSON) or its column header (CSV). */
  fields?: Partial<Record<ProductionField, string>>;
}

export interface IngestConnection {
  id: string;
  /** The connection's own line — a row naming no line lands on it. */
  workspaceId?: string;
  /** The system's names for its lines → Luna's line ids. */
  lineMap?: Record<string, string>;
  mapping?: IngestMapping;
}

/** A production record as it is stored — one row a line × day × shift × product (docs/DATA-CONNECTIONS.md §3). */
export interface ProductionRecord {
  id: string;
  workspaceId: string;
  connectionId: string;
  sourceId: string;
  day: string;
  shift?: string;
  product?: string;
  plannedMinutes?: number;
  runMinutes?: number;
  output?: number;
  target?: number;
  good?: number;
  rejects?: number;
  downtimeMinutes?: number;
  downtimeReason?: string;
  howKnown: 'system';
  importedAt: number;
  updatedAt: number;
  ownerId?: string;
  deletedAt?: number;
}

export interface Refused { row: number; why: string }
export interface IngestOutcome { received: number; records: ProductionRecord[]; refused: Refused[] }

export const INGEST_LIMITS = { rows: 5000, bytes: 5_000_000 };

export const recordId = (connectionId: string, sourceId: string): string => `${connectionId}:${sourceId}`;

/* ------------------------------------------------------------------ reading a path */
/** A value at a path — "qty", "result.good", "lines[0].name", "$.data.items". */
export function getPath(obj: unknown, path: string): unknown {
  const parts = path.replace(/^\$\.?/, '').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) { const i = Number(p); cur = Number.isInteger(i) ? cur[i] : undefined; continue; }
    if (typeof cur !== 'object') return undefined;
    const o = cur as Record<string, unknown>;
    if (p in o) { cur = o[p]; continue; }
    /* a header or key in another case or spacing is the same key */
    const k = Object.keys(o).find(x => norm(x) === norm(p));
    cur = k === undefined ? undefined : o[k];
  }
  return cur;
}
const norm = (s: string): string => s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');

/* ------------------------------------------------------------------ CSV */
/** RFC 4180 CSV — quoted fields, doubled quotes, commas and newlines inside quotes; a ; or tab separator when the header uses one. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, '');
  const first = t.split(/\r?\n/, 1)[0] ?? '';
  const sep = [',', ';', '\t'].map(c => [c, first.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const out: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
      continue;
    }
    if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(c => c.trim() !== '')) out.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c.trim() !== '')) out.push(row);
  return out;
}

/** The rows of a body, as objects — CSV by its header row, JSON at the mapping's path (or the body itself, or its `rows`). */
export function rowsOfBody(body: string, contentType: string, mapping: IngestMapping = {}): { rows: Record<string, unknown>[] } | { why: string } {
  const csv = /csv|text\/plain/i.test(contentType) || (!/json/i.test(contentType) && !/^\s*[[{]/.test(body));
  if (csv) {
    const grid = parseCsv(body);
    if (grid.length < 2) return { why: 'The CSV has no rows under its header.' };
    const head = grid[0].map(h => h.trim());
    return { rows: grid.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()]))) };
  }
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { return { why: 'The body is not JSON or CSV that could be read.' }; }
  return rowsOfJson(parsed, mapping);
}

export function rowsOfJson(parsed: unknown, mapping: IngestMapping = {}): { rows: Record<string, unknown>[] } | { why: string } {
  const at = mapping.rows ? getPath(parsed, mapping.rows) : Array.isArray(parsed) ? parsed : (parsed as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(at)) return { why: mapping.rows ? `No list of rows at “${mapping.rows}” in the answer.` : 'No list of rows — send an array, or { "rows": [ … ] }, or say where the rows are.' };
  return { rows: at.map(r => (r && typeof r === 'object' && !Array.isArray(r) ? r as Record<string, unknown> : {})) };
}

/* ------------------------------------------------------------------ one value */
type Num = { ok: true; v: number | undefined } | { ok: false; why: string };
function numOf(v: unknown, field: ProductionField): Num {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return { ok: true, v: undefined };
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim().replace(/,(?=\d{3}\b)/g, '').replace(/\s+/g, '')) : NaN;
  if (!Number.isFinite(n)) return { ok: false, why: `${FIELD_WORDS[field]} is “${String(v).slice(0, 40)}”, not a number` };
  if (n < 0) return { ok: false, why: `${FIELD_WORDS[field]} is negative (${n})` };
  return { ok: true, v: n };
}
const textOf = (v: unknown): string | undefined => (v === undefined || v === null ? undefined : String(v).trim() || undefined);

/** A day as YYYY-MM-DD — an ISO date, a date-time (its own date, as written), or dd/mm/yyyy. */
export function dayOf(v: unknown): string | undefined {
  const s = textOf(v);
  if (!s) return undefined;
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(s);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s);
  if (m) return valid(+m[3], +m[2], +m[1]);
  return undefined;
}
function valid(y: number, mo: number, d: number): string | undefined {
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return undefined;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ the rows */
export interface LineName { id: string; name: string }

/** Every row mapped and checked: the records kept and the rows refused, each with why (its number counts from 1, after the header). */
export function mapRows(raw: readonly Record<string, unknown>[], conn: IngestConnection, now: number, lines: readonly LineName[] = []): IngestOutcome {
  const path = (f: ProductionField) => conn.mapping?.fields?.[f]?.trim() || DEFAULT_PATHS[f];
  const lineMap = new Map(Object.entries(conn.lineMap ?? {}).map(([k, v]) => [norm(k), v]));
  const byName = new Map(lines.map(l => [norm(l.name), l.id]));
  const kept = new Map<string, ProductionRecord>();
  const refused: Refused[] = [];
  raw.forEach((r, i) => {
    const row = i + 1;
    const get = (f: ProductionField) => getPath(r, path(f));
    const sourceId = textOf(get('id'));
    if (!sourceId) { refused.push({ row, why: `no id — the system’s own id for the row is needed (looked for “${path('id')}”)` }); return; }
    if (sourceId.length > 200) { refused.push({ row, why: 'its id is longer than 200 characters' }); return; }
    const lineSaid = textOf(get('line'));
    const workspaceId = lineSaid ? lineMap.get(norm(lineSaid)) ?? byName.get(norm(lineSaid)) : conn.workspaceId;
    if (!workspaceId) { refused.push({ row, why: lineSaid ? `line “${lineSaid}” is not mapped to a line` : 'no line, and the connection has no line of its own' }); return; }
    const day = dayOf(get('day'));
    if (!day) { refused.push({ row, why: get('day') === undefined || textOf(get('day')) === undefined ? `no day (looked for “${path('day')}”)` : `the day “${String(get('day')).slice(0, 30)}” is not a date` }); return; }
    const nums: Partial<Record<ProductionField, number>> = {};
    for (const f of ['planned', 'run', 'output', 'target', 'good', 'rejects', 'downtime'] as const) {
      const n = numOf(get(f), f);
      if (!n.ok) { refused.push({ row, why: n.why }); return; }
      if (n.v !== undefined) nums[f] = n.v;
    }
    if (nums.output !== undefined && nums.rejects !== undefined && nums.rejects > nums.output) { refused.push({ row, why: `rejects (${nums.rejects}) are more than units made (${nums.output})` }); return; }
    if (nums.output !== undefined && nums.good !== undefined && nums.good > nums.output) { refused.push({ row, why: `good units (${nums.good}) are more than units made (${nums.output})` }); return; }
    const shift = textOf(get('shift')), product = textOf(get('product')), reason = textOf(get('reason'));
    kept.set(sourceId, {
      id: recordId(conn.id, sourceId), workspaceId, connectionId: conn.id, sourceId, day,
      ...(shift ? { shift: shift.slice(0, 60) } : {}), ...(product ? { product: product.slice(0, 120) } : {}),
      ...(nums.planned !== undefined ? { plannedMinutes: nums.planned } : {}), ...(nums.run !== undefined ? { runMinutes: nums.run } : {}),
      ...(nums.output !== undefined ? { output: nums.output } : {}), ...(nums.target !== undefined ? { target: nums.target } : {}),
      ...(nums.good !== undefined ? { good: nums.good } : {}), ...(nums.rejects !== undefined ? { rejects: nums.rejects } : {}),
      ...(nums.downtime !== undefined ? { downtimeMinutes: nums.downtime } : {}), ...(reason ? { downtimeReason: reason.slice(0, 200) } : {}),
      howKnown: 'system', importedAt: now, updatedAt: now,
    });
  });
  return { received: raw.length, records: [...kept.values()], refused };
}

/** A whole body: size and row limits, then the rows. */
export function ingestBody(body: string, contentType: string, conn: IngestConnection, now: number, lines: readonly LineName[] = []): IngestOutcome | { why: string; status: number } {
  if (body.length > INGEST_LIMITS.bytes) return { why: `More than ${INGEST_LIMITS.bytes / 1_000_000} MB in one call — send it in parts.`, status: 413 };
  const r = rowsOfBody(body, contentType, conn.mapping);
  if ('why' in r) return { why: r.why, status: 400 };
  if (r.rows.length > INGEST_LIMITS.rows) return { why: `${r.rows.length.toLocaleString('en-GB')} rows in one call — at most ${INGEST_LIMITS.rows.toLocaleString('en-GB')}; send it in parts.`, status: 413 };
  return mapRows(r.rows, conn, now, lines);
}

/** One answer to the system, the same from the function and from the app. */
export function outcomeSaid(o: IngestOutcome): string {
  const kept = o.records.length;
  return `${kept.toLocaleString('en-GB')} of ${o.received.toLocaleString('en-GB')} row${o.received === 1 ? '' : 's'} kept${o.refused.length ? `, ${o.refused.length} refused (${o.refused.slice(0, 3).map(r => `row ${r.row}: ${r.why}`).join('; ')}${o.refused.length > 3 ? '; …' : ''})` : ', none refused'}.`;
}

/* ------------------------------------------------------------------ what a pull may fetch (no SSRF) */
/** An address that must never be fetched from the cloud: private, loopback, link-local (the metadata range among them), carrier-grade
 *  NAT, multicast and reserved; IPv6 loopback, unspecified, unique-local (fc00::/7), link-local (fe80::/10), multicast, and IPv4 written
 *  inside IPv6. `ip` is a literal address (v4 or v6); anything that is not an address is refused. */
export function privateAddress(ip: string): boolean {
  const a = ip.trim().toLowerCase().replace(/^\[|\]$/g, '');
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(a);
  if (v4) {
    const o = [1, 2, 3, 4].map(i => Number(v4[i]));
    if (o.some(x => x > 255)) return true;
    const [o1, o2] = o;
    return o1 === 0 || o1 === 10 || o1 === 127 || (o1 === 169 && o2 === 254) || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168)
      || (o1 === 100 && o2 >= 64 && o2 <= 127) || o1 >= 224;
  }
  if (!a.includes(':')) return true;
  if (a === '::' || a === '::1') return true;
  const mapped = /^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(a);
  if (mapped) return privateAddress(mapped[1]);
  if (a.startsWith('::ffff:') || a.startsWith('64:ff9b:')) return true;   // IPv4 inside IPv6 in hex: refused rather than decoded
  const first = parseInt(a.split(':')[0] || '0', 16);
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00;
}

const BLOCKED_HOST = /(^|\.)(localhost|local|internal|localdomain|supabase\.co|supabase\.in|supabase\.net)$/i;

/** Why an address the business typed may not be fetched, or undefined when it may — checked before the host is resolved; the function
 *  then checks every address the host resolves to with privateAddress, and every redirect again from the start. */
export function unfetchable(u: string): string | undefined {
  let p: URL;
  try { p = new URL(u); } catch { return 'the address is not a web address'; }
  if (p.protocol !== 'https:') return 'only https addresses are fetched';
  if (p.username || p.password) return 'a key goes in the key box, never in the address';
  const h = p.hostname.toLowerCase().replace(/\.$/, '');
  if (!h) return 'the address has no host';
  if (BLOCKED_HOST.test(h)) return 'that host cannot be reached from Luna’s cloud';
  const literal = /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith('[') || h.includes(':');
  if (literal && privateAddress(h)) return 'a private, loopback or link-local address cannot be reached from the cloud';
  if (!literal && (/^[\d.]+$/.test(h) || /^0x/i.test(h))) return 'an address written as a number is not fetched';
  return undefined;
}
