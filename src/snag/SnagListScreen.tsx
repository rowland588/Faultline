import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { listSegments, listSnagAssets, snagsForWorkspace, updateSnag, setSnagsStatus } from '../db';
import { useBlobUrl } from './useBlobUrl';
import { SNAG_STATUS_META, SNAG_STALE_DAYS, ageDays, isStaleOpen, type Snag, type SnagStatus, type SnagAsset } from './types';

const dateNice = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });

interface Row { snag: Snag; assetName: string; assetId: string; sequence: number; timestampS: number }

export function SnagListScreen() {
  const { workspace } = useWorkspace();
  const [rows, setRows] = useState<Row[]>([]);
  const [assets, setAssets] = useState<SnagAsset[]>([]);
  const [statusF, setStatusF] = useState<'all' | SnagStatus>('all');
  const [assetF, setAssetF] = useState('all');
  const [ownerF, setOwnerF] = useState('all');
  const [ageF, setAgeF] = useState<'all' | 'stale'>('all');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  const load = async () => {
    const [segs, as, snags] = await Promise.all([listSegments(workspace.id), listSnagAssets(workspace.id), snagsForWorkspace(workspace.id)]);
    const seq = new Map(segs.map(s => [s.id, s.sequence]));
    const aById = new Map(as.map(a => [a.id, a]));
    const rs: Row[] = snags.map(sn => { const a = aById.get(sn.assetId); return { snag: sn, assetName: a?.name ?? '—', assetId: sn.assetId, sequence: a ? (seq.get(a.segmentId) ?? 0) : 0, timestampS: a?.timestampS ?? 0 }; })
      .sort((x, y) => x.sequence - y.sequence || x.timestampS - y.timestampS || x.snag.raisedAt - y.snag.raisedAt);
    setRows(rs); setAssets(as);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [workspace.id]);

  const owners = useMemo(() => [...new Set(rows.map(r => r.snag.owner).filter(Boolean))] as string[], [rows]);
  const counts = useMemo(() => { const c = { open: 0, in_progress: 0, closed: 0, stale: 0 }; for (const r of rows) { c[r.snag.status]++; if (isStaleOpen(r.snag)) c.stale++; } return c; }, [rows]);

  const filtered = rows.filter(({ snag, assetId }) => {
    if (statusF !== 'all' && snag.status !== statusF) return false;
    if (assetF !== 'all' && assetId !== assetF) return false;
    if (ownerF !== 'all' && (snag.owner ?? '') !== ownerF) return false;
    if (ageF === 'stale' && !isStaleOpen(snag)) return false;
    if (search.trim() && !((snag.problem + ' ' + (snag.proposedSolution ?? '')).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const changeStatus = async (r: Row, status: SnagStatus) => {
    setRows(rs => rs.map(x => x.snag.id === r.snag.id ? { ...x, snag: { ...x.snag, status } } : x));
    await updateSnag({ ...r.snag, status, closedAt: status === 'closed' ? Date.now() : undefined });
  };
  const changeOwner = async (r: Row, owner: string) => { if (owner === (r.snag.owner ?? '')) return; await updateSnag({ ...r.snag, owner: owner || undefined }); void load(); };
  const bulk = async (status: SnagStatus) => { if (!sel.size) return; await setSnagsStatus([...sel], status); setSel(new Set()); await load(); };
  const toggleSel = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCsv = () => {
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Asset', 'Problem', 'Proposed solution', 'Status', 'Owner', 'Raised', 'Age (days)'].join(',')];
    for (const { snag, assetName } of filtered) lines.push([assetName, snag.problem, snag.proposedSolution ?? '', SNAG_STATUS_META[snag.status].label, snag.owner ?? '', dateNice(snag.raisedAt), String(ageDays(snag.raisedAt))].map(esc).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = `snags-${workspace.name.replace(/\W+/g, '-').toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  if (printing) return <PrintView wsName={workspace.name} assets={assets} rows={rows} onDone={() => setPrinting(false)} />;

  return (
    <div className="wrap">
      <div className="subhead">
        <button className="btn btn-ghost" onClick={() => nav(`/w/${workspace.id}/snags`)}>‹ Snag walk</button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={exportCsv}>CSV</button>
        <button className="btn" onClick={() => setPrinting(true)}>Print</button>
      </div>
      <div className="mark" style={{ fontSize: 22 }}>Snags</div>

      <div className="snag-summary">
        <span className="ss-pill"><b>{counts.open}</b> open</span>
        <span className="ss-pill"><b>{counts.in_progress}</b> in progress</span>
        <span className="ss-pill"><b>{counts.closed}</b> closed</span>
        <span className={'ss-pill' + (counts.stale > 0 ? ' ss-stale' : '')} title={`Open snags older than ${SNAG_STALE_DAYS} days`}><b>{counts.stale}</b> open &gt; {SNAG_STALE_DAYS}d</span>
      </div>

      <div className="snag-filters">
        <div className="chip-row">
          {(['all', 'open', 'in_progress', 'closed'] as const).map(s => <button key={s} className={'chip' + (statusF === s ? ' on' : '')} onClick={() => setStatusF(s)}>{s === 'all' ? 'All' : SNAG_STATUS_META[s].label}</button>)}
          <button className={'chip' + (ageF === 'stale' ? ' on' : '')} onClick={() => setAgeF(a => a === 'stale' ? 'all' : 'stale')}>Stale</button>
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
        {filtered.length === 0 ? <p className="sub">{rows.length === 0 ? 'No snags yet — mark assets and pin problems first.' : 'No snags match these filters.'}</p>
          : (
            <table className="snag-table">
              <thead><tr><th></th><th>Asset</th><th>Problem</th><th>Status</th><th>Owner</th><th>Age</th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.snag.id} className={isStaleOpen(r.snag) ? 'row-stale' : ''}>
                    <td className="st-check"><input type="checkbox" checked={sel.has(r.snag.id)} onChange={() => toggleSel(r.snag.id)} /></td>
                    <td data-label="Asset"><button className="linkish" onClick={() => nav(`/w/${workspace.id}/asset/${r.assetId}`)}>{r.assetName}</button></td>
                    <td className="st-problem" data-label="Problem">{r.snag.problem}{r.snag.proposedSolution ? <span className="st-sol"> → {r.snag.proposedSolution}</span> : ''}</td>
                    <td data-label="Status"><select className="mini-select" value={r.snag.status} onChange={e => changeStatus(r, e.target.value as SnagStatus)}>{(['open', 'in_progress', 'closed'] as SnagStatus[]).map(s => <option key={s} value={s}>{SNAG_STATUS_META[s].label}</option>)}</select></td>
                    <td data-label="Owner"><input className="mini-owner" defaultValue={r.snag.owner ?? ''} placeholder="—" onBlur={e => changeOwner(r, e.target.value.trim())} /></td>
                    <td className="st-num" data-label="Age">{ageDays(r.snag.raisedAt)}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

function PrintView({ wsName, assets, rows, onDone }: { wsName: string; assets: SnagAsset[]; rows: Row[]; onDone: () => void }) {
  const groups = assets.map(a => ({ asset: a, snags: rows.filter(r => r.assetId === a.id).map(r => r.snag) })).filter(g => g.snags.length > 0);
  return (
    <div className="wrap print-root">
      <div className="subhead no-print"><button className="btn btn-ghost" onClick={onDone}>‹ Back</button><div style={{ flex: 1 }} /><button className="btn btn-primary" onClick={() => window.print()}>Print</button></div>
      <div className="mark" style={{ fontSize: 22 }}>{wsName} — snag sheet</div>
      {groups.length === 0 ? <p className="sub" style={{ marginTop: 10 }}>No snags to print.</p> : groups.map(g => <PrintAsset key={g.asset.id} asset={g.asset} snags={g.snags} />)}
    </div>
  );
}
function PrintAsset({ asset, snags }: { asset: SnagAsset; snags: Snag[] }) {
  const url = useBlobUrl(asset.stillKey);
  return (
    <div className="print-asset">
      <h3 style={{ marginTop: 16 }}>{asset.name}{asset.code ? ` · ${asset.code}` : ''}</h3>
      <div className="print-still">{url && <img src={url} alt={asset.name} />}{snags.map((s, i) => <span key={s.id} className="print-pin" style={{ left: `${s.xPct}%`, top: `${s.yPct}%`, background: SNAG_STATUS_META[s.status].color }}>{i + 1}</span>)}</div>
      <ol className="print-snags">{snags.map(s => <li key={s.id}><b>{s.problem}</b>{s.proposedSolution ? ` — ${s.proposedSolution}` : ''} <span className="print-status">[{SNAG_STATUS_META[s.status].label}{s.owner ? `, ${s.owner}` : ''}]</span></li>)}</ol>
    </div>
  );
}
