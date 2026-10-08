/* A FAKE SUPABASE, in one Node process, for scripts/sync-two-devices.mjs.
 *
 * Just enough of the three services the app's sync actually calls — read off
 * src/cloud/sync.ts, client.ts, access.ts, admin.ts and the supabase-js code in
 * node_modules, not guessed:
 *
 *   PostgREST  /rest/v1/<table>   select with eq/gt/gte/lt/lte/neq/in/is filters,
 *                                 order, limit/offset; upsert (on_conflict, merge);
 *                                 update (PATCH) by filter; /rest/v1/rpc/<fn>.
 *              Every row write stamps `rev` from ONE global sequence, exactly as
 *              the DB trigger in supabase/SYNC_UPGRADE.sql does — the pull's
 *              cursor depends on it.
 *   Storage    /storage/v1/object/<bucket>/<path>   multipart upload (POST/PUT),
 *              download (GET), exists (HEAD). A missing object answers the way
 *              the real one does — HTTP 400 with statusCode "404" in the body.
 *              The live bucket's rules are enforced too: an upload whose key no
 *              row references yet is refused (faultline_can_see_media), and an
 *              object over the global limit gets the real 413.
 *   Auth       /auth/v1/user, /auth/v1/token, /auth/v1/logout — one fixed user.
 *   Realtime   /realtime/v1/websocket — a minimal Phoenix socket that answers a
 *              postgres_changes join and announces every row write. Off unless
 *              asked for, because the app must not depend on it.
 *
 * Fault injection is by plain fields on the returned object (the harness runs
 * in the same process): `failUploads` (the next N uploads die mid-way),
 * `refuseRow(table,row)` (a policy refusal — the WHOLE statement fails, as
 * Postgres does), `maxObjectBytes`, `realtime`.
 *
 * What it is NOT: Postgres. There is no RLS beyond the media rule above, no
 * check constraints, no column list — a column the live database lacks is
 * check-live-schema.mjs's business, not this. */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';

/* THE MEDIA RULE IN FORCE — which table's which columns may name an uploaded
   file (supabase/SNAG_MEDIA.sql; a newer definition moves this, and the one in
   src/cloud/__tests__/sync-schema.test.ts). */
const MEDIA_RULE_FILE = new URL('../supabase/SNAG_MEDIA.sql', import.meta.url);
const MEDIA_RULE = [...readFileSync(MEDIA_RULE_FILE, 'utf8').matchAll(/from public\.(\w+) where ([^']*)'/g)]
  .map(m => [m[1], [...m[2].matchAll(/(\w+)\s*(?:=|@>)/g)].map(c => c[1])]);


export function startFakeCloud({ port = 54392, user } = {}) {
  const tables = new Map();          // table -> Map(id -> row)
  const objects = new Map();         // `${bucket}/${path}` -> { bytes, type }
  let seq = 0;
  const log = [];                    // every request, for the report
  const sockets = new Set();         // realtime clients
  const cloud = {
    port, url: `http://127.0.0.1:${port}`, tables, objects, log,
    failUploads: 0,                  // next N uploads: connection dropped mid-body
    uploadAttempts: 0, uploadsOk: 0, uploadsRefused: { policy: 0, tooLarge: 0, dropped: 0 },
    refuseRow: null,                 // (table, row) => boolean
    refusedWrites: 0,
    maxObjectBytes: 50 * 1024 * 1024,
    downloadDelayMs: 0,              // a slow line: every file download waits this long
    uploadDelayMs: 0,                // a slow phone: every file upload lands this long after it starts
    enforceMediaPolicy: true,
    realtime: false,
    rows: (t) => [...(tables.get(t)?.values() ?? [])],
    live: (t) => cloud.rows(t).filter(r => r.deleted_at == null),
    revNow: () => seq,
    close: () => new Promise(r => { for (const s of sockets) s.destroy(); server.close(() => r()); server.closeAllConnections?.(); }),
  };
  const table = (t) => { if (!tables.has(t)) tables.set(t, new Map()); return tables.get(t); };

  /* ---------- helpers ---------- */
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
    'access-control-expose-headers': 'content-range, content-length, content-type, x-total-count',
    'access-control-max-age': '600',
  };
  const send = (res, status, body, headers = {}) => {
    const isBuf = Buffer.isBuffer(body);
    const payload = body === undefined ? '' : isBuf ? body : JSON.stringify(body);
    res.writeHead(status, { ...cors, ...(isBuf ? {} : { 'content-type': 'application/json' }), ...headers });
    res.end(payload);
  };
  const readBody = (req) => new Promise((resolve, reject) => {
    const parts = []; req.on('data', c => parts.push(c)); req.on('end', () => resolve(Buffer.concat(parts))); req.on('error', reject);
  });
  const coerce = (v) => (v !== '' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v);
  const cmp = (a, b) => {
    if (a == null && b == null) return 0; if (a == null) return -1; if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    const na = Number(a), nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== '' && String(b).trim() !== '') return na - nb;
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  };
  const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
  function filters(q) {
    const out = [];
    for (const [col, raw] of q) {
      if (RESERVED.has(col)) continue;
      const dot = raw.indexOf('.');
      const op = raw.slice(0, dot), val = raw.slice(dot + 1);
      out.push(row => {
        const v = row[col];
        switch (op) {
          case 'eq': return cmp(v, coerce(val)) === 0 && v != null;
          case 'neq': return v == null || cmp(v, coerce(val)) !== 0;
          case 'gt': return v != null && cmp(v, coerce(val)) > 0;
          case 'gte': return v != null && cmp(v, coerce(val)) >= 0;
          case 'lt': return v != null && cmp(v, coerce(val)) < 0;
          case 'lte': return v != null && cmp(v, coerce(val)) <= 0;
          case 'is': return val === 'null' ? v == null : val === 'true' ? v === true : val === 'false' ? v === false : false;
          case 'in': {
            const list = val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, ''));
            return list.some(x => cmp(v, coerce(x)) === 0);
          }
          default: throw Object.assign(new Error(`fake cloud: filter op ${op} not implemented`), { code: 'FAKE' });
        }
      });
    }
    return out;
  }
  function select(rows, q) {
    let out = rows.filter(r => filters(q).every(f => f(r)));
    const order = q.get('order');
    if (order) {
      const keys = order.split(',').map(s => { const [c, dir] = s.split('.'); return { c, desc: dir === 'desc' }; });
      out.sort((a, b) => { for (const k of keys) { const d = cmp(a[k.c], b[k.c]); if (d) return k.desc ? -d : d; } return 0; });
    }
    const offset = Number(q.get('offset') ?? 0);
    const limit = q.has('limit') ? Number(q.get('limit')) : Infinity;
    const total = out.length;
    out = out.slice(offset, offset + limit);
    const cols = q.get('select');
    if (cols && cols !== '*') {
      const want = cols.split(',').map(s => s.trim());
      out = out.map(r => Object.fromEntries(want.map(c => [c, r[c] ?? null])));
    }
    return { out, total, offset };
  }

  /* Every row write announces itself, the way the publication does. */
  function announce(t, row, type) {
    if (!cloud.realtime) return;
    for (const s of sockets) {
      if (!s.joined) continue;
      wsSend(s, [null, null, s.joined.topic, 'postgres_changes', {
        ids: s.joined.ids,
        data: { schema: 'public', table: t, commit_timestamp: new Date().toISOString(), type, record: {}, old_record: {}, columns: [], errors: null },
      }]);
    }
  }

  function write(t, row, merge) {
    const m = table(t);
    const prev = m.get(row.id);
    const next = merge && prev ? { ...prev, ...row } : { ...row };
    next.rev = ++seq;
    m.set(row.id, next);
    announce(t, next, prev ? 'UPDATE' : 'INSERT');
    return next;
  }

  /* Does a row name this media key IN A COLUMN THE LIVE RULE LOOKS IN?
     (faultline_can_see_media). It used to be any column of any row, which
     passed snags whose photos sat in snags.media while the live rule looked
     only at their two old photo columns — every Snag-button photo refused live
     for a week, every scenario green here (8 October). Now the columns are
     read from the definition in force, the same file the schema test reads. */
  function referenced(key) {
    const k = key.includes('/') ? key.split('/').pop() : key;
    for (const [t, cols] of MEDIA_RULE) {
      const m = tables.get(t);
      if (!m) continue;
      for (const r of m.values()) {
        if (r.deleted_at != null) continue;
        if (cols.some(c => r[c] != null && (typeof r[c] === 'string' ? r[c] === k : JSON.stringify(r[c]).includes(`"${k}"`)))) return true;
      }
    }
    return false;
  }

  function parseMultipart(buf, ctype) {
    const b = /boundary=(?:"([^"]+)"|([^;]+))/.exec(ctype ?? '');
    if (!b) return null;
    const boundary = Buffer.from('--' + (b[1] ?? b[2]));
    const files = []; const fields = {};
    let pos = buf.indexOf(boundary);
    while (pos !== -1) {
      const start = pos + boundary.length;
      if (buf.slice(start, start + 2).toString() === '--') break;
      const headEnd = buf.indexOf('\r\n\r\n', start);
      const head = buf.slice(start + 2, headEnd).toString();
      const next = buf.indexOf(boundary, headEnd);
      const body = buf.slice(headEnd + 4, next - 2);
      const name = /name="([^"]*)"/.exec(head)?.[1] ?? '';
      const type = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1];
      if (/filename=/.test(head) || type) files.push({ name, type: type ?? 'application/octet-stream', bytes: body });
      else fields[name] = body.toString();
      pos = next;
    }
    return { files, fields };
  }

  /* ---------- the server ---------- */
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, cloud.url);
    if (req.method === 'OPTIONS') {
      return send(res, 204, undefined, { 'access-control-allow-headers': req.headers['access-control-request-headers'] ?? '*' });
    }
    const entry = { at: Date.now(), method: req.method, path: u.pathname, search: u.search, from: /Mobile/.test(req.headers['user-agent'] ?? '') ? 'phone' : 'laptop' };
    log.push(entry);
    try {
      /* ---- auth ---- */
      if (u.pathname === '/auth/v1/user') return send(res, 200, user);
      if (u.pathname === '/auth/v1/token') {
        await readBody(req);
        return send(res, 200, { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake', user });
      }
      if (u.pathname === '/auth/v1/logout') return send(res, 204);
      if (u.pathname.startsWith('/auth/v1/')) return send(res, 200, {});

      /* ---- storage ---- */
      const so = /^\/storage\/v1\/object\/(?:authenticated\/|public\/)?([^/]+)\/(.+)$/.exec(u.pathname);
      if (so) {
        const bucket = so[1], path = decodeURIComponent(so[2]);
        const id = `${bucket}/${path}`;
        if (req.method === 'POST' || req.method === 'PUT') {
          cloud.uploadAttempts++;
          if (cloud.failUploads > 0) {
            /* A dropped connection, half way through a film: read a little and
               hang up, the way a phone walking out of signal does. */
            cloud.failUploads--; cloud.uploadsRefused.dropped++;
            entry.result = 'dropped';
            req.once('data', () => { req.socket.destroy(); });
            req.on('end', () => req.socket.destroy());
            return;
          }
          const buf = await readBody(req);
          if (cloud.uploadDelayMs) await new Promise(r => setTimeout(r, cloud.uploadDelayMs));
          const mp = parseMultipart(buf, req.headers['content-type']);
          const file = mp ? mp.files[0] : { type: req.headers['content-type'] ?? 'application/octet-stream', bytes: buf };
          if (!file) return send(res, 400, { statusCode: '400', error: 'invalid', message: 'no file in form' });
          if (file.bytes.length > cloud.maxObjectBytes) {
            cloud.uploadsRefused.tooLarge++; entry.result = '413';
            return send(res, 413, { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' });
          }
          if (cloud.enforceMediaPolicy && bucket === 'media' && !referenced(path)) {
            cloud.uploadsRefused.policy++; entry.result = 'policy';
            return send(res, 400, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
          }
          if (objects.has(id) && req.method === 'POST' && req.headers['x-upsert'] !== 'true') {
            return send(res, 400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
          }
          objects.set(id, { bytes: file.bytes, type: file.type, at: Date.now() });
          cloud.uploadsOk++; entry.result = 'ok'; entry.bytes = file.bytes.length;
          return send(res, 200, { Key: id, Id: crypto.randomUUID() });
        }
        if (req.method === 'GET' || req.method === 'HEAD') {
          const o = objects.get(id);
          if (!o) return send(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
          if (cloud.downloadDelayMs && req.method === 'GET') await new Promise(r => setTimeout(r, cloud.downloadDelayMs));
          if (req.method === 'HEAD') { res.writeHead(200, { ...cors, 'content-type': o.type, 'content-length': o.bytes.length }); return res.end(); }
          return send(res, 200, o.bytes, { 'content-type': o.type, 'content-length': String(o.bytes.length) });
        }
        if (req.method === 'DELETE') { objects.delete(id); return send(res, 200, {}); }
      }
      if (u.pathname.startsWith('/storage/v1/')) return send(res, 404, { statusCode: '404', error: 'not_found', message: 'fake cloud: not implemented ' + u.pathname });

      /* ---- PostgREST ---- */
      const rpc = /^\/rest\/v1\/rpc\/(.+)$/.exec(u.pathname);
      if (rpc) {
        await readBody(req);
        const fn = rpc[1];
        const answers = { can_start_projects: true, push_public_key: null };
        return send(res, 200, fn in answers ? answers[fn] : null);
      }
      const rt = /^\/rest\/v1\/([^/?]+)$/.exec(u.pathname);
      if (rt) {
        const t = rt[1];
        const q = u.searchParams;
        if (req.method === 'GET' || req.method === 'HEAD') {
          let rows = cloud.rows(t);
          if (t === 'profiles' && rows.length === 0) rows = [{ id: user.id, email: user.email, is_super: false, created_at: new Date().toISOString() }];
          const { out, total, offset } = select(rows, q);
          entry.rows = out.length;
          return send(res, 200, out, { 'content-range': `${out.length ? `${offset}-${offset + out.length - 1}` : '*'}/${total}` });
        }
        if (req.method === 'POST') {
          const body = JSON.parse((await readBody(req)).toString() || '[]');
          const list = Array.isArray(body) ? body : [body];
          const merge = /merge-duplicates/.test(req.headers.prefer ?? '') || q.has('on_conflict');
          /* ONE STATEMENT: if any row is refused, none of them land. */
          const bad = cloud.refuseRow ? list.find(r => cloud.refuseRow(t, r)) : undefined;
          if (bad) {
            cloud.refusedWrites++; entry.result = 'refused';
            return send(res, 403, { code: '42501', details: null, hint: null, message: `new row violates row-level security policy for table "${t}"` });
          }
          const written = list.map(r => write(t, r, merge));
          entry.rows = written.length;
          const wantRep = /return=representation/.test(req.headers.prefer ?? '');
          return send(res, wantRep ? 201 : 201, wantRep ? written : undefined);
        }
        if (req.method === 'PATCH') {
          const patch = JSON.parse((await readBody(req)).toString() || '{}');
          const fs = filters(q);
          const hit = cloud.rows(t).filter(r => fs.every(f => f(r)));
          if (cloud.refuseRow && hit.some(r => cloud.refuseRow(t, { ...r, ...patch }))) {
            cloud.refusedWrites++;
            return send(res, 403, { code: '42501', details: null, hint: null, message: `new row violates row-level security policy for table "${t}"` });
          }
          for (const r of hit) write(t, { ...r, ...patch }, true);
          entry.rows = hit.length;
          return send(res, 204);
        }
        if (req.method === 'DELETE') {
          const fs = filters(q);
          for (const r of cloud.rows(t).filter(r => fs.every(f => f(r)))) table(t).delete(r.id);
          return send(res, 204);
        }
      }
      return send(res, 404, { message: 'fake cloud: no route ' + u.pathname });
    } catch (e) {
      entry.result = 'error ' + e.message;
      return send(res, 500, { code: e.code ?? 'FAKE', message: String(e.message) });
    }
  });

  /* ---------- a minimal Phoenix websocket, for realtime ---------- */
  function wsSend(sock, msg) {
    const data = Buffer.from(JSON.stringify(msg));
    const len = data.length;
    const head = len < 126 ? Buffer.from([0x81, len])
      : len < 65536 ? Buffer.from([0x81, 126, len >> 8, len & 255])
        : (() => { const h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); return h; })();
    try { sock.write(Buffer.concat([head, data])); } catch { /* gone */ }
  }
  server.on('upgrade', (req, sock) => {
    if (!cloud.realtime || !req.url.startsWith('/realtime/v1/websocket')) { sock.destroy(); return; }
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    sockets.add(sock);
    let buf = Buffer.alloc(0);
    sock.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (buf.length < 2) return;
        const op = buf[0] & 0x0f; let len = buf[1] & 0x7f; let off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        const masked = buf[1] & 0x80; const mask = masked ? buf.slice(off, off + 4) : null; if (masked) off += 4;
        if (buf.length < off + len) return;
        const payload = Buffer.from(buf.slice(off, off + len));
        if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
        buf = buf.slice(off + len);
        if (op === 0x8) { sockets.delete(sock); sock.end(); return; }
        if (op === 0x9) { sock.write(Buffer.from([0x8a, 0])); continue; }
        if (op !== 0x1) continue;
        let m; try { m = JSON.parse(payload.toString()); } catch { continue; }
        const [joinRef, ref, topic, event, pl] = m;
        if (event === 'phx_join') {
          const pcs = (pl?.config?.postgres_changes ?? []).map((f, i) => ({ ...f, id: 1000 + i }));
          sock.joined = { topic, ids: pcs.map(p => p.id) };
          wsSend(sock, [joinRef, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: pcs } }]);
        } else {
          wsSend(sock, [joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }]);
        }
      }
    });
    sock.on('close', () => sockets.delete(sock));
    sock.on('error', () => sockets.delete(sock));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(cloud));
  });
}
