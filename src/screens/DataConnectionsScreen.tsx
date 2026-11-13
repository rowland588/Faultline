/* SET UP › DATA CONNECTIONS (11 November, docs/DATA-CONNECTIONS.md — Rowland: "Production data connectivity is a core platform capability
 * … Luna should connect directly to the customer's production systems wherever possible").
 *
 * One calm page (docs/DESIGN.md): what this is and how the connections stand, one primary (Add a connection), then one list — each
 * connection its name, its kind and line, and its health in words. A connection opened (?c=) shows what to give the business's system
 * (where to send, the token — shown ONCE when made, never again), its key for a pull (straight to the cloud's vault), its latest rows,
 * and, in folds, the mapping and Bring in a file or sample — the app's own import path through the same core the ingest function runs.
 * Reads and writes the connections and the production records (db/production); the line's own records are untouched. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Workspace } from '../types';
import { listWorkspaces, onDataChange } from '../db';
import { listConnections, listProduction, patchConnection, putConnection, removeConnection } from '../db/production';
import type { DataConnectionRow, ProductionRecordRow } from '../db/rows';
import { bringIn, flushPendingTokens, ingestEndpoint, issueToken, newConnection, saveSecret, tokenWaiting } from '../lib/production/connections';
import { DEFAULT_PATHS, FIELD_WORDS, PRODUCTION_FIELDS, unfetchable, type ProductionField } from '../lib/production/ingestCore';
import { healthSaid } from '../lib/production/production';
import { nav, useRoute } from '../state/useRoute';
import { useCanStartProjects } from '../cloud/access';
import { PageHeader, StateTag } from '../ui/parts';
import { Fold } from '../ui/Fold';
import { offerUndo } from '../ui/Undo';
import { PRODUCT } from '../lib/product';
import { productionDataOn, PRODUCTION_DATA_HELD } from '../lib/production/switch';

const KIND_WORD: Record<string, string> = { push: 'Your system sends', pull: `${PRODUCT.name} fetches` };
/** The sentence after the word — the word is already beside it, in its colour. */
const after = (says: string) => says.replace(/^\w+ — /, '');
const here = (c?: string) => `/factory/data${c ? `?c=${encodeURIComponent(c)}` : ''}`;

export function DataConnectionsScreen() {
  const route = useRoute();
  const open = route.query.get('c') ?? '';
  const on = productionDataOn();
  const may = useCanStartProjects() && on;
  const [conns, setConns] = useState<DataConnectionRow[] | null>(null);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [rows, setRows] = useState<ProductionRecordRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [shown, setShown] = useState<{ id: string; token: string; sent: boolean } | null>(null);
  const load = useCallback(async () => {
    const [c, l, r] = await Promise.all([listConnections(), listWorkspaces(), listProduction()]);
    setConns(c); setLines(l.filter(w => !w.archived)); setRows(r);
  }, []);
  useEffect(() => { void load(); void flushPendingTokens().then(load); return onDataChange(() => void load()); }, [load]);

  const lineName = useCallback((id?: string) => lines.find(l => l.id === id)?.name, [lines]);
  const failing = (conns ?? []).filter(c => healthSaid(c).word === 'Failing').length;
  const says = !on ? PRODUCTION_DATA_HELD : conns === null ? 'Reading the connections…'
    : conns.length ? `${conns.length} connection${conns.length === 1 ? '' : 's'} to your own systems — ${rows.length.toLocaleString('en-GB')} production row${rows.length === 1 ? '' : 's'} kept on your lines as system data${failing ? `, ${failing} failing` : ''}.`
      : `None yet. Connect your MES, ERP or monitoring system and its production figures land on your lines as system data — what your system recorded, kept apart from what is measured or said — so ${PRODUCT.name} can answer why a line missed target.`;
  const conn = (conns ?? []).find(c => c.id === open);

  return (
    <div className="wrap qsl dc-page" data-page="data-connections">
      <PageHeader eyebrow="FACTORY · SET UP" title="Data connections" back={{ to: '/factory', label: 'Set up' }}
        says={<span className="sub" data-dc-says>{says}</span>}
        primary={may && !adding && !conn ? { label: 'Add a connection', run: () => setAdding(true) } : undefined} />

      {shown && <TokenOnce shown={shown} name={(conns ?? []).find(c => c.id === shown.id)?.name ?? ''} onDone={() => setShown(null)} />}

      {adding && may && <AddConnection lines={lines} onCancel={() => setAdding(false)} onMade={async (c, token) => {
        setAdding(false);
        if (token) setShown({ id: c.id, ...token });
        await load();
        nav(here(c.id));
      }} />}

      {conn ? <ConnectionDetail c={conn} lines={lines} rows={rows.filter(r => r.connectionId === conn.id)} may={may} lineName={lineName}
        onToken={t => setShown({ id: conn.id, ...t })} />
        : conns && conns.length > 0 && (
          <ul className="lt-rows dc-rows" aria-label="Data connections">
            {conns.map(c => {
              const h = healthSaid(c);
              return (
                <li key={c.id} className="lt-li" data-connection={c.name}>
                  <button type="button" className="lt-row" onClick={() => nav(here(c.id))} aria-label={`Open ${c.name}`}>
                    <b className="lt-what">{c.name}</b>
                    <span className="lt-says" data-dc-health>{after(h.says)}</span>
                    <span className="lt-where">{KIND_WORD[c.kind] ?? c.kind}{c.system ? ` · ${c.system}` : ''}{lineName(c.workspaceId) ? ` · ${lineName(c.workspaceId)}` : ''}</span>
                  </button>
                  <span className="lt-acts"><StateTag tone={h.state}>{h.word}</StateTag></span>
                </li>
              );
            })}
          </ul>
        )}
      {!conn && open && conns && <p className="sub" role="status">That connection is not on this device — it may have been taken off. <a href={`#${here()}`}>Every connection</a></p>}
    </div>
  );
}

/* ------------------------------------------------------------------ the token, once */
function TokenOnce({ shown, name, onDone }: { shown: { token: string; sent: boolean }; name: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(shown.token); setCopied(true); } catch { setCopied(false); } };
  return (
    <section className="dc-token" aria-label="The token, shown once" data-dc-token-once>
      <h2>The token for {name} — copy it now</h2>
      <p className="sub">It is shown this once. {PRODUCT.name} keeps only a fingerprint of it, so it cannot be shown again; if it is lost, make a new one and the old stops working.</p>
      <code className="dc-code" data-dc-token>{shown.token}</code>
      <p className="sub" data-dc-token-state>{shown.sent ? 'It works now.' : 'It works once this device has reached the cloud (sign in, with signal) — the page sends it by itself.'}</p>
      <div className="dc-acts">
        <button type="button" className="btn btn-sm" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onDone}>I have kept it</button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ add */
function AddConnection({ lines, onCancel, onMade }: { lines: Workspace[]; onCancel: () => void; onMade: (c: DataConnectionRow, token?: { token: string; sent: boolean }) => void }) {
  const [kind, setKind] = useState<'push' | 'pull'>('push');
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');
  const [line, setLine] = useState(lines[0]?.id ?? '');
  const [url, setUrl] = useState('');
  const [header, setHeader] = useState('Authorization');
  const [prefix, setPrefix] = useState('Bearer');
  const [every, setEvery] = useState('60');
  const [rowsAt, setRowsAt] = useState('');
  const [why, setWhy] = useState('');
  const make = async () => {
    if (!name.trim()) { setWhy('Give it a name — what the system is and what it sends.'); return; }
    if (kind === 'pull') {
      const bad = unfetchable(url.trim());
      if (bad) { setWhy(`That address cannot be fetched: ${bad}.`); return; }
      if (!(Number(every) >= 15)) { setWhy('Fetched at most every 15 minutes.'); return; }
    }
    const c = newConnection({ name, kind, system, workspaceId: line || undefined, ...(kind === 'pull' ? { pullUrl: url, pullAuthHeader: header, pullAuthPrefix: prefix, scheduleMinutes: Number(every), mapping: rowsAt.trim() ? { rows: rowsAt.trim() } : {} } : {}) });
    await putConnection(c);
    onMade(c, kind === 'push' ? await issueToken(c.id) : undefined);
  };
  return (
    <form className="dc-add" aria-label="Add a connection" onSubmit={e => { e.preventDefault(); void make(); }}>
      <h2>Add a connection</h2>
      <div className="dc-kinds" role="radiogroup" aria-label="How the rows arrive">
        <button type="button" role="radio" aria-checked={kind === 'push'} className={`chip${kind === 'push' ? ' is-on' : ''}`} onClick={() => setKind('push')}>Your system sends</button>
        <button type="button" role="radio" aria-checked={kind === 'pull'} className={`chip${kind === 'pull' ? ' is-on' : ''}`} onClick={() => setKind('pull')}>{PRODUCT.name} fetches</button>
      </div>
      <p className="sub">{kind === 'push'
        ? 'Your MES, ERP or integration tool posts JSON rows or a CSV to Luna with a token made here.'
        : 'Luna asks your system’s web address for its rows on a schedule, with a key kept only in the cloud’s vault.'}</p>
      <label className="dc-field">Name<input className="text-input" value={name} maxLength={120} placeholder="e.g. MES shift totals" aria-label="The connection’s name" onChange={e => setName(e.target.value)} /></label>
      <label className="dc-field">The system<input className="text-input" value={system} maxLength={80} placeholder="e.g. SAP, the MES" aria-label="The system" onChange={e => setSystem(e.target.value)} /></label>
      <label className="dc-field">Its line, for rows that name none
        <select className="text-input" value={line} aria-label="The connection’s line" onChange={e => setLine(e.target.value)}>
          <option value="">None — every row names its line</option>
          {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      {kind === 'pull' && <>
        <label className="dc-field">Address<input className="text-input" value={url} inputMode="url" placeholder="https://mes.example.com/api/shifts?since={since}" aria-label="The address to fetch" onChange={e => setUrl(e.target.value)} /></label>
        <label className="dc-field">Where the rows are in the answer<input className="text-input" value={rowsAt} placeholder="e.g. data.items — empty if the answer is the list" aria-label="Where the rows are" onChange={e => setRowsAt(e.target.value)} /></label>
        <div className="dc-pair">
          <label className="dc-field">The key’s header<input className="text-input" value={header} aria-label="The key’s header" onChange={e => setHeader(e.target.value)} /></label>
          <label className="dc-field">Before the key<input className="text-input" value={prefix} aria-label="The word before the key" onChange={e => setPrefix(e.target.value)} /></label>
          <label className="dc-field">Every (minutes)<input className="text-input" value={every} inputMode="numeric" aria-label="Fetch every how many minutes" onChange={e => setEvery(e.target.value)} /></label>
        </div>
      </>}
      {why && <p className="ie-tone is-a" role="alert">{why}</p>}
      <div className="dc-acts">
        <button type="submit" className="btn btn-primary">{kind === 'push' ? 'Make it and its token' : 'Make it'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ one connection */
function ConnectionDetail({ c, lines, rows, may, lineName, onToken }: { c: DataConnectionRow; lines: Workspace[]; rows: ProductionRecordRow[]; may: boolean; lineName: (id?: string) => string | undefined; onToken: (t: { token: string; sent: boolean }) => void }) {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => { void tokenWaiting(c.id).then(setWaiting); }, [c.id, c.tokenSetAt]);
  const h = healthSaid(c, waiting);
  const latest = useMemo(() => [...rows].sort((a, b) => b.day.localeCompare(a.day) || b.updatedAt - a.updatedAt).slice(0, 8), [rows]);
  const takeOff = async () => {
    const undo = await removeConnection(c.id);
    nav(here());
    offerUndo(`Took “${c.name}” off, with the ${rows.length} rows it brought in`, undo);
  };
  return (
    <section className="dc-one" aria-label={c.name} data-dc-connection={c.name}>
      <h2 className="dc-name"><a href={`#${here()}`} className="cw-link">Data connections</a> › {c.name}</h2>
      <p className="dc-health" data-dc-health-one><StateTag tone={h.state}>{h.word}</StateTag> <span>{after(h.says)}</span></p>
      <p className="sub">{KIND_WORD[c.kind] ?? c.kind}{c.system ? ` · ${c.system}` : ''}{lineName(c.workspaceId) ? ` · rows naming no line land on ${lineName(c.workspaceId)}` : ''} · {c.rowsTotal.toLocaleString('en-GB')} rows received in all · how known: system</p>

      {c.kind === 'push' && (
        <div className="dc-give" data-dc-give>
          <p><b>Send to</b> <code className="dc-code">{ingestEndpoint()}</code></p>
          <p className="sub">POST JSON — <code>{'{ "rows": [ … ] }'}</code> — or a CSV with a header row, with <code>Authorization: Bearer</code> and the token{c.tokenHint ? <> (the one ending <b data-dc-hint>…{c.tokenHint}</b>)</> : null}. Each row needs the system’s own id; sent twice, a row replaces itself.</p>
          {may && <button type="button" className="btn btn-sm" onClick={() => void issueToken(c.id).then(onToken)}>{c.tokenSetAt ? 'Make a new token' : 'Make its token'}</button>}
        </div>
      )}
      {c.kind === 'pull' && <PullKey c={c} may={may} />}

      <h3 className="dc-h">Latest rows</h3>
      {latest.length ? (
        <div className="dc-scroll">
          <table className="dc-table" aria-label="Latest rows from the system">
            <thead><tr><th>Line</th><th>Day</th><th>Shift</th><th>Product</th><th>Made</th><th>Target</th><th>Down (min)</th><th>Reason</th></tr></thead>
            <tbody>{latest.map(r => (
              <tr key={r.id} data-dc-row={r.sourceId}>
                <td>{lineName(r.workspaceId) ?? '—'}</td><td>{r.day}</td><td>{r.shift ?? '—'}</td><td>{r.product ?? '—'}</td>
                <td>{r.good ?? r.output ?? '—'}</td><td>{r.target ?? '—'}</td><td>{r.downtimeMinutes ?? '—'}</td><td>{r.downtimeReason ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="sub" data-dc-norows>Nothing has arrived yet.</p>}

      {may && <Fold id={`dc-bring-${c.id}`} title="Bring in a file or sample" says="A CSV or JSON your system made — taken in exactly as a push would be" start={false}>
        <BringIn c={c} lines={lines} />
      </Fold>}
      <Fold id={`dc-map-${c.id}`} title="How its fields are read" says={Object.keys(c.mapping.fields ?? {}).length ? `${Object.keys(c.mapping.fields ?? {}).length} fields named differently` : 'Faultline’s own names — id, day, shift, line, output, target …'} start={false}>
        <Mapping c={c} may={may} />
      </Fold>
      {may && (
        <div className="dc-acts dc-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void patchConnection(c.id, { status: c.status === 'paused' ? 'active' : 'paused' })}>{c.status === 'paused' ? 'Resume' : 'Pause'}</button>
          <button type="button" className="cw-link sp-rm" onClick={() => void takeOff()}>Take it off</button>
        </div>
      )}
    </section>
  );
}

function PullKey({ c, may }: { c: DataConnectionRow; may: boolean }) {
  const [key, setKey] = useState('');
  const [said, setSaid] = useState('');
  const save = async () => { const r = await saveSecret(c.id, key); setKey(''); setSaid(r.ok ? 'Saved in the cloud’s vault — it is not kept on this device.' : r.why); };
  return (
    <div className="dc-give" data-dc-pull>
      <p><b>Fetches</b> <code className="dc-code">{c.pullUrl}</code> every {c.scheduleMinutes} minutes{c.mapping.rows ? `, rows at “${c.mapping.rows}”` : ''}.</p>
      {c.pullAuthHeader && <p className="sub">Its key goes in <code>{c.pullAuthHeader}</code>{c.pullAuthPrefix ? ` after “${c.pullAuthPrefix}”` : ''} — {c.secretSetAt ? 'saved.' : 'not saved yet.'}</p>}
      {may && c.pullAuthHeader && (
        <form className="dc-pair" onSubmit={e => { e.preventDefault(); void save(); }}>
          <input className="text-input" type="password" autoComplete="off" value={key} aria-label="The API key" placeholder={c.secretSetAt ? 'A new key replaces it' : 'The API key'} onChange={e => setKey(e.target.value)} />
          <button type="submit" className="btn btn-sm" disabled={!key.trim()}>Save the key</button>
        </form>
      )}
      {said && <p className="sub" role="status" data-dc-key-said>{said}</p>}
    </div>
  );
}

function BringIn({ c, lines }: { c: DataConnectionRow; lines: Workspace[] }) {
  const [text, setText] = useState('');
  const [said, setSaid] = useState<{ ok: boolean; words: string; refused?: { row: number; why: string }[] } | null>(null);
  const run = async (body: string, type: string) => {
    const r = await bringIn(c, body, type, lines.map(l => ({ id: l.id, name: l.name })));
    setSaid(r.ok ? { ok: true, words: r.said, refused: r.outcome.refused } : { ok: false, words: r.why });
  };
  return (
    <div className="dc-bring">
      <label className="dc-field">A file<input type="file" accept=".csv,.json,text/csv,application/json" aria-label="A CSV or JSON file from the system"
        onChange={e => { const input = e.target; const f = input.files?.[0]; input.value = ''; if (f) void f.text().then(body => run(body, f.type || (f.name.endsWith('.json') ? 'application/json' : 'text/csv'))); }} /></label>
      <label className="dc-field">Or paste what it sends<textarea className="text-input" rows={4} value={text} aria-label="Rows pasted from the system" placeholder={'id,line,day,shift,product,output,target,downtime_minutes,downtime_reason'} onChange={e => setText(e.target.value)} /></label>
      <button type="button" className="btn btn-sm" disabled={!text.trim()} onClick={() => void run(text, /^\s*[[{]/.test(text) ? 'application/json' : 'text/csv')}>Bring these in</button>
      {said && <div role="status" data-dc-brought className={said.ok ? 'sub' : 'ie-tone is-a'}>
        <p>{said.words}</p>
        {said.refused && said.refused.length > 0 && <ul className="dc-refused">{said.refused.slice(0, 12).map(r => <li key={r.row}>Row {r.row}: {r.why}</li>)}</ul>}
      </div>}
    </div>
  );
}

function Mapping({ c, may }: { c: DataConnectionRow; may: boolean }) {
  const [f, setF] = useState<Record<string, string>>(c.mapping.fields ?? {});
  const [saved, setSaved] = useState(false);
  const save = async () => {
    const fields = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    await patchConnection(c.id, { mapping: { ...c.mapping, fields } });
    setSaved(true);
  };
  return (
    <form className="dc-map" onSubmit={e => { e.preventDefault(); void save(); }}>
      <p className="sub">Where each field is in your system’s row — a column’s header for a CSV, a path such as <code>qty.made</code> for JSON. Left empty, Faultline’s own name is used.</p>
      {PRODUCTION_FIELDS.map((k: ProductionField) => (
        <label key={k} className="dc-field dc-map-row">{FIELD_WORDS[k]}
          <input className="text-input" value={f[k] ?? ''} placeholder={DEFAULT_PATHS[k]} disabled={!may} aria-label={`Where ${FIELD_WORDS[k]} is`} onChange={e => { setF({ ...f, [k]: e.target.value }); setSaved(false); }} />
        </label>
      ))}
      {may && <div className="dc-acts"><button type="submit" className="btn btn-sm">Keep the mapping</button>{saved && <span className="sub" role="status">Kept.</span>}</div>}
    </form>
  );
}
