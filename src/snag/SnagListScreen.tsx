import { Fragment, useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { listSegments, listSnagAssets, snagsForWorkspace, updateSnag, setSnagsStatus } from '../db';
import { useBlobUrl } from './useBlobUrl';
import { useSyncedAt, useSession } from '../cloud/session';
import {
  SNAG_STATUS_META, SNAG_STALE_DAYS, ageDays, isStaleOpen, actionTarget,
  dueInDays, isOverdue, isDueSoon, closedDaysLate, compareReview, dueToInput, dueFromInput,
  type Snag, type SnagStatus, type SnagAsset,
} from './types';
import { TimeStrip, dueWord } from './TimeStrip';

const dateNice = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });

interface Row { snag: Snag; assetName: string; assetId: string; sequence: number; timestampS: number }

export function SnagListScreen() {
  const { workspace } = useWorkspace();
  const { session } = useSession();
  const myEmail = (session?.user.email ?? '').toLowerCase();
  const [rows, setRows] = useState<Row[]>([]);
  const [assets, setAssets] = useState<SnagAsset[]>([]);
  const [statusF, setStatusF] = useState<'all' | SnagStatus>('all');
  const [assetF, setAssetF] = useState('all');
  const [ownerF, setOwnerF] = useState('all');
  const [ageF, setAgeF] = useState<'all' | 'stale' | 'overdue'>('all');
  const [byOwner, setByOwner] = useState(false);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  const load = async () => {
    const [segs, as, snags] = await Promise.all([listSegments(workspace.id), listSnagAssets(workspace.id), snagsForWorkspace(workspace.id)]);
    const seq = new Map(segs.map(s => [s.id, s.sequence]));
    const aById = new Map(as.map(a => [a.id, a]));
    // board actions (no pin) sort first — they're the board's priorities
    const rs: Row[] = snags.map(sn => {
      if (!sn.assetId) return { snag: sn, assetName: actionTarget(sn) || 'From the board', assetId: '', sequence: -1, timestampS: 0 };
      const a = aById.get(sn.assetId);
      return { snag: sn, assetName: a?.name ?? '—', assetId: sn.assetId, sequence: a ? (seq.get(a.segmentId) ?? 0) : 0, timestampS: a?.timestampS ?? 0 };
    }).sort((x, y) => x.sequence - y.sequence || x.timestampS - y.timestampS || x.snag.raisedAt - y.snag.raisedAt);
    setRows(rs); setAssets(as);
  };
  const syncedAt = useSyncedAt();
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [workspace.id, syncedAt]);

  const owners = useMemo(() => [...new Set(rows.map(r => r.snag.owner).filter(Boolean))] as string[], [rows]);
  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, closed: 0, stale: 0, overdue: 0 };
    for (const r of rows) { c[r.snag.status]++; if (isStaleOpen(r.snag)) c.stale++; if (isOverdue(r.snag)) c.overdue++; }
    return c;
  }, [rows]);

  const filtered = rows.filter(({ snag, assetId }) => {
    if (statusF !== 'all' && snag.status !== statusF) return false;
    if (assetF !== 'all' && assetId !== assetF) return false;
    if (ownerF !== 'all' && (snag.owner ?? '') !== ownerF) return false;
    if (ageF === 'stale' && !isStaleOpen(snag)) return false;
    if (ageF === 'overdue' && !isOverdue(snag)) return false;
    if (search.trim() && !((snag.problem + ' ' + (snag.proposedSolution ?? '') + ' ' + (snag.latestUpdate ?? '')).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  // Review order: overdue first (most urgent leading), then dated, then the
  // rest, closed last — walk order survives within each band (stable sort).
  const ordered = useMemo(() => [...filtered].sort((x, y) => compareReview(x.snag, y.snag)), [filtered]);

  // The accountability view: who's carrying what. Heaviest plate first;
  // unassigned work sits last, visibly nobody's.
  const ownerGroups = useMemo(() => {
    if (!byOwner) return null;
    const m = new Map<string, Row[]>();
    for (const r of ordered) {
      const key = r.snag.owner?.trim() || 'Unassigned';
      const g = m.get(key) ?? [];
      g.push(r); m.set(key, g);
    }
    return [...m.entries()]
      .map(([name, rs]) => ({
        name, rows: rs,
        open: rs.filter(r => r.snag.status !== 'closed').length,
        overdue: rs.filter(r => isOverdue(r.snag)).length,
      }))
      .sort((a, b) => (a.name === 'Unassigned' ? 1 : 0) - (b.name === 'Unassigned' ? 1 : 0) || b.overdue - a.overdue || b.open - a.open || a.name.localeCompare(b.name));
  }, [byOwner, ordered]);

  const changeStatus = async (r: Row, status: SnagStatus) => {
    setRows(rs => rs.map(x => x.snag.id === r.snag.id ? { ...x, snag: { ...x.snag, status } } : x));
    await updateSnag({ ...r.snag, status, closedAt: status === 'closed' ? Date.now() : undefined });
  };
  const changeOwner = async (r: Row, owner: string) => { if (owner === (r.snag.owner ?? '')) return; await updateSnag({ ...r.snag, owner: owner || undefined }); void load(); };
  const changeDue = async (r: Row, v: string) => {
    const dueAt = dueFromInput(v);
    if (dueAt === r.snag.dueAt) return;
    await updateSnag({ ...r.snag, dueAt }); void load();
  };
  const changeUpdate = async (r: Row, text: string) => {
    const t = text.trim();
    if (t === (r.snag.latestUpdate ?? '')) return;
    await updateSnag({ ...r.snag, latestUpdate: t || undefined, latestUpdateAt: t ? Date.now() : undefined }); void load();
  };
  const bulk = async (status: SnagStatus) => { if (!sel.size) return; await setSnagsStatus([...sel], status); setSel(new Set()); await load(); };
  const toggleSel = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCsv = () => {
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Asset', 'Problem', 'Proposed solution', 'Status', 'Owner', 'Raised', 'Age (days)', 'Due', 'Overdue (days)', 'Latest update', 'Updated'].join(',')];
    for (const { snag, assetName } of ordered) {
      const d = dueInDays(snag);
      const late = closedDaysLate(snag);
      const over = snag.status === 'closed' ? (late != null && late > 0 ? late : '') : (d != null && d < 0 ? -d : '');
      lines.push([
        assetName, snag.problem, snag.proposedSolution ?? '', SNAG_STATUS_META[snag.status].label, snag.owner ?? '',
        dateNice(snag.raisedAt), String(ageDays(snag.raisedAt)),
        snag.dueAt ? dateNice(snag.dueAt) : '', String(over),
        snag.latestUpdate ?? '', snag.latestUpdateAt ? dateNice(snag.latestUpdateAt) : '',
      ].map(esc).join(','));
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = `snags-${workspace.name.replace(/\W+/g, '-').toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const activeFilters = [
    statusF !== 'all' ? SNAG_STATUS_META[statusF].label : null,
    ageF === 'stale' ? `stale (open > ${SNAG_STALE_DAYS}d)` : null,
    ageF === 'overdue' ? 'overdue' : null,
    assetF !== 'all' ? (assets.find(a => a.id === assetF)?.name ?? 'one asset') : null,
    ownerF !== 'all' ? ownerF : null,
    search.trim() ? `“${search.trim()}”` : null,
  ].filter(Boolean) as string[];

  if (printing) return <PrintView wsName={workspace.name} assets={assets} rows={ordered} filterNote={activeFilters.join(' · ')} onDone={() => setPrinting(false)} />;

  const renderRow = (r: Row) => (
    <tr key={r.snag.id} className={isOverdue(r.snag) ? 'row-over' : isStaleOpen(r.snag) ? 'row-stale' : ''}>
      <td className="st-check"><input type="checkbox" checked={sel.has(r.snag.id)} onChange={() => toggleSel(r.snag.id)} /></td>
      <td data-label="Asset">{r.assetId
        ? <button className="linkish" onClick={() => nav(`/w/${workspace.id}/asset/${r.assetId}`)}>{r.assetName}</button>
        : <span className="st-target" title="Raised from the Pareto board">⚑ {r.assetName}</span>}</td>
      <td className="st-problem" data-label="Problem">
        {r.snag.problem}{r.snag.proposedSolution ? <span className="st-sol"> → {r.snag.proposedSolution}</span> : ''}
        {/* the answer to "what's happening with this?" — editable right in the review */}
        <input className="mini-update" defaultValue={r.snag.latestUpdate ?? ''} placeholder="Latest update…"
          maxLength={200} onBlur={e => changeUpdate(r, e.target.value)} />
        {r.snag.latestUpdateAt ? <span className="st-upd-when">{dateNice(r.snag.latestUpdateAt)}</span> : null}
      </td>
      <td data-label="Status"><select className="mini-select" value={r.snag.status} onChange={e => changeStatus(r, e.target.value as SnagStatus)}>{(['open', 'in_progress', 'closed'] as SnagStatus[]).map(s => <option key={s} value={s}>{SNAG_STATUS_META[s].label}</option>)}</select></td>
      <td data-label="Owner"><input className="mini-owner" defaultValue={r.snag.owner ?? ''} placeholder="—" onBlur={e => changeOwner(r, e.target.value.trim())} /></td>
      <td className="st-due" data-label="Due">
        <div className="due-cell">
          <div className="due-cell-top">
            <input type="date" className="mini-due" defaultValue={dueToInput(r.snag.dueAt)} onChange={e => changeDue(r, e.target.value)} />
            {dueWord(r.snag) ? <span className={'due-word' + (isOverdue(r.snag) ? ' dw-over' : isDueSoon(r.snag) ? ' dw-soon' : '')}>{dueWord(r.snag)}</span> : null}
          </div>
          <TimeStrip snag={r.snag} />
        </div>
      </td>
      <td className="st-num" data-label="Age">{ageDays(r.snag.raisedAt)}d</td>
    </tr>
  );

  return (
    <div className="wrap">
      <div className="subhead">
        <button className="btn btn-ghost" onClick={() => nav(`/w/${workspace.id}/snags`)}>‹ Snag walk</button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={exportCsv}>CSV</button>
        <button className="btn" onClick={() => setPrinting(true)}>Print</button>
      </div>
      <p className="eyebrow">The eyes</p>
      <h1 className="h1">Snags</h1>

      <div className="snag-summary">
        <span className="ss-pill"><b>{counts.open}</b> open</span>
        <span className="ss-pill"><b>{counts.in_progress}</b> in progress</span>
        <span className="ss-pill"><b>{counts.closed}</b> closed</span>
        <span className={'ss-pill' + (counts.overdue > 0 ? ' ss-over' : '')} title="Open past their due date"><b>{counts.overdue}</b> overdue</span>
        <span className={'ss-pill' + (counts.stale > 0 ? ' ss-stale' : '')} title={`Open snags older than ${SNAG_STALE_DAYS} days`}><b>{counts.stale}</b> open &gt; {SNAG_STALE_DAYS}d</span>
      </div>

      <div className="snag-filters">
        <div className="chip-row">
          {(['all', 'open', 'in_progress', 'closed'] as const).map(s => <button key={s} className={'chip' + (statusF === s ? ' on' : '')} onClick={() => setStatusF(s)}>{s === 'all' ? 'All' : SNAG_STATUS_META[s].label}</button>)}
          <button className={'chip' + (ageF === 'overdue' ? ' on' : '')} onClick={() => setAgeF(a => a === 'overdue' ? 'all' : 'overdue')}>Overdue</button>
          <button className={'chip' + (ageF === 'stale' ? ' on' : '')} onClick={() => setAgeF(a => a === 'stale' ? 'all' : 'stale')}>Stale</button>
          <button className={'chip' + (byOwner ? ' on' : '')} title="Group by owner — who's carrying what" onClick={() => setByOwner(v => !v)}>By owner</button>
          {/* the fixer's view: one tap to "what's on MY plate" */}
          {myEmail && rows.some(r => (r.snag.owner ?? '').toLowerCase() === myEmail) && (
            <button className={'chip' + (ownerF.toLowerCase() === myEmail ? ' on' : '')}
              onClick={() => setOwnerF(f => (f.toLowerCase() === myEmail ? 'all' : (rows.find(r => (r.snag.owner ?? '').toLowerCase() === myEmail)?.snag.owner ?? 'all')))}>
              Mine
            </button>
          )}
        </div>
        <div className="snag-filter-row">
          <select className="mini-select" value={assetF} onChange={e => setAssetF(e.target.value)}><option value="all">All assets</option>{assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          {owners.length > 0 && <select className="mini-select" value={ownerF} onChange={e => setOwnerF(e.target.value)}><option value="all">All owners</option>{owners.map(o => <option key={o} value={o}>{o}</option>)}</select>}
          <input className="text-input" style={{ flex: 1, minWidth: 120 }} value={search} placeholder="Search…" onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {sel.size > 0 && (
        <div className="bulk-bar">
          <span>{sel.size} selected</span>
          {(['open', 'in_progress', 'closed'] as SnagStatus[]).map(s => <button key={s} className="btn" onClick={() => bulk(s)}>Mark {SNAG_STATUS_META[s].label.toLowerCase()}</button>)}
          <button className="btn btn-ghost" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        {ordered.length === 0 ? <p className="sub">{rows.length === 0 ? 'No snags yet — mark assets and pin problems first.' : 'No snags match these filters.'}</p>
          : (
            <table className="snag-table">
              <thead><tr><th></th><th>Asset</th><th>Problem</th><th>Status</th><th>Owner</th><th>Due</th><th>Age</th></tr></thead>
              <tbody>
                {ownerGroups
                  ? ownerGroups.map(g => (
                    <Fragment key={g.name}>
                      <tr className="owner-head"><td colSpan={7}>
                        {g.name}
                        <span className="oh-counts">{g.open} open{g.overdue > 0 ? <b className="oh-over"> · {g.overdue} overdue</b> : null}</span>
                      </td></tr>
                      {g.rows.map(renderRow)}
                    </Fragment>
                  ))
                  : ordered.map(renderRow)}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

function PrintView({ wsName, assets, rows, filterNote, onDone }: { wsName: string; assets: SnagAsset[]; rows: Row[]; filterNote: string; onDone: () => void }) {
  const groups = assets.map(a => ({ asset: a, snags: rows.filter(r => r.assetId === a.id).map(r => r.snag) })).filter(g => g.snags.length > 0);
  const actions = rows.filter(r => !r.snag.assetId).map(r => r.snag);
  const all = rows.map(r => r.snag);
  const c = { open: 0, in_progress: 0, closed: 0, stale: 0, overdue: 0 };
  for (const s of all) { c[s.status]++; if (isStaleOpen(s)) c.stale++; if (isOverdue(s)) c.overdue++; }
  const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="wrap print-root">
      <div className="subhead no-print">
        <button className="btn btn-ghost" onClick={onDone}>‹ Back</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => window.print()}>Save as PDF / Print</button>
      </div>
      <p className="sub no-print" style={{ marginTop: -4, marginBottom: 12 }}>In the print dialog choose “Save as PDF” as the destination to email it.</p>

      <header className="report-head">
        <h1>Snag report</h1>
        <p className="report-meta">{wsName} · {today}</p>
        {filterNote && <p className="report-filter">Showing: {filterNote}</p>}
        <div className="report-stats">
          <span className="report-stat"><b>{all.length}</b> snag{all.length === 1 ? '' : 's'}</span>
          <span className="report-stat"><b>{groups.length}</b> asset{groups.length === 1 ? '' : 's'}</span>
          <span className="report-stat st-open"><b>{c.open}</b> open</span>
          <span className="report-stat st-prog"><b>{c.in_progress}</b> in progress</span>
          <span className="report-stat st-closed"><b>{c.closed}</b> closed</span>
          {c.overdue > 0 && <span className="report-stat st-overdue"><b>{c.overdue}</b> overdue</span>}
          {c.stale > 0 && <span className="report-stat st-stale"><b>{c.stale}</b> stale</span>}
        </div>
      </header>

      {actions.length > 0 && (
        <section className="print-asset">
          <h2 className="print-asset-name">⚑ Actions from the board<span className="print-asset-count">{actions.length} action{actions.length === 1 ? '' : 's'}</span></h2>
          <ol className="print-snag-list">
            {actions.map((s, i) => (
              <li key={s.id}>
                <span className="print-snag-n" style={{ background: SNAG_STATUS_META[s.status].color }}>{i + 1}</span>
                <PrintSnagBody snag={s} target={actionTarget(s)} />
              </li>
            ))}
          </ol>
        </section>
      )}
      {groups.length === 0 && actions.length === 0 ? <p className="sub" style={{ marginTop: 16 }}>No snags to report.</p>
        : groups.map(g => <PrintAsset key={g.asset.id} asset={g.asset} snags={g.snags} />)}

      <p className="report-foot">Faultline · snag report · {wsName}</p>
    </div>
  );
}

/** One snag's print block: problem, then the who/when line — including the due
 *  date and, when the promise was missed, by how much (that's what gets read
 *  aloud in the review) — then the latest update if someone left one, and the
 *  after-photo when the fix left visual proof. */
function PrintSnagBody({ snag: s, target }: { snag: Snag; target?: string }) {
  const d = dueInDays(s);
  const late = closedDaysLate(s);
  return (
    <div className="print-snag-body">
      <div className="print-snag-problem">{s.problem}{s.proposedSolution ? <span className="print-snag-sol"> → {s.proposedSolution}</span> : null}</div>
      <div className="print-snag-meta">
        <span className={'print-badge st-' + s.status}>{SNAG_STATUS_META[s.status].label}</span>
        {target ? <span>· {target}</span> : null}
        {s.owner ? <span>· {s.owner}</span> : null}
        <span>· raised {dateNice(s.raisedAt)}</span>
        {s.dueAt ? <span>· due {dateNice(s.dueAt)}</span> : null}
        {s.status !== 'closed' && d != null && d < 0 ? <b className="print-over">· {-d}d overdue</b> : null}
        {s.closedAt ? <span>· closed {dateNice(s.closedAt)}{late != null ? (late <= 0 ? ' (on time)' : ` (${late}d late)`) : ''}</span> : <span>· {ageDays(s.raisedAt)}d old</span>}
      </div>
      {s.latestUpdate ? <div className="print-snag-update">↻ {s.latestUpdate}{s.latestUpdateAt ? ` — ${dateNice(s.latestUpdateAt)}` : ''}</div> : null}
      {s.fixedPhotoKey ? <FixedProof photoKey={s.fixedPhotoKey} /> : null}
    </div>
  );
}

/** The camera world's receipt: the after-photo, labelled as such. */
function FixedProof({ photoKey }: { photoKey: string }) {
  const url = useBlobUrl(photoKey);
  if (!url) return null;
  return (
    <div className="fixed-proof">
      <img src={url} alt="After — fixed" />
      <span className="fixed-proof-lbl">✓ after</span>
    </div>
  );
}

function PrintAsset({ asset, snags }: { asset: SnagAsset; snags: Snag[] }) {
  const url = useBlobUrl(asset.stillKey);
  return (
    <section className="print-asset">
      <h2 className="print-asset-name">
        {asset.name}{asset.code ? <span className="print-asset-code"> · {asset.code}</span> : null}
        <span className="print-asset-count">{snags.length} snag{snags.length === 1 ? '' : 's'}</span>
      </h2>
      <div className="print-asset-body">
        <div className="print-still">
          {url && <img src={url} alt={asset.name} />}
          {snags.map((s, i) => <span key={s.id} className="print-pin" style={{ left: `${s.xPct}%`, top: `${s.yPct}%`, background: SNAG_STATUS_META[s.status].color }}>{i + 1}</span>)}
        </div>
        <ol className="print-snag-list">
          {snags.map((s, i) => (
            <li key={s.id}>
              <span className="print-snag-n" style={{ background: SNAG_STATUS_META[s.status].color }}>{i + 1}</span>
              <PrintSnagBody snag={s} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
