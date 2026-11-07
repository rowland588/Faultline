/* A LINE'S ACTION TRACKER ON PAPER — the project's meeting paper (lib/projectActionsPdf), never a third kind: the line's tracker
 * rows (lineActions trackerRows) said as its rows — what, priority, machine, who, by when, late in red — and what was done in the
 * last 30 days. One person's own list the same paper narrowed to them. */
import { listAllSnags, listSnagAssets } from '../../db';
import type { DoneThing, ProjectAction } from '../../lib/projectActions';
import { trackerRows, type TrackerRow } from './lineActions';

const iso = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** A tracker row as the meeting paper's row. */
export const asAction = (r: TrackerRow, whatOf: (id: string) => string = () => ''): ProjectAction => ({
  key: r.id, kind: 'Problem', what: r.what,
  ...(r.after.length ? { why: `Waits for: ${r.after.map(whatOf).filter(Boolean).join('; ')}${r.clash ? ` — ${r.clash}` : ''}` } : {}), priority: r.priority, ...(r.machine ? { where: r.machine } : {}), who: r.owner,
  ...(r.due != null ? { due: iso(r.due) } : {}), late: r.state === 'late', soon: r.state === 'soon',
});

export async function saveLineActionsPdf(wsId: string, lineName: string, person?: string): Promise<void> {
  const [snags, assets] = await Promise.all([listAllSnags(), listSnagAssets(wsId)]);
  const now = Date.now();
  const all = trackerRows(snags, wsId, now, { withDone: true, machineOf: s => (s.assetId ? assets.find(a => a.id === s.assetId)?.name : s.targetAsset) });
  const mine = (r: TrackerRow) => !person || r.owner === person;
  const rows = all.filter(r => r.state !== 'done' && mine(r)).map(r => asAction(r, id => snags.find(s => s.id === id)?.problem ?? ''));
  const done: DoneThing[] = all.filter(r => r.state === 'done' && r.closed != null && mine(r)).map(r => ({ what: r.what, on: iso(r.closed as number) }));
  const { saveActionsPdf } = await import('../../lib/projectActionsPdf');
  await saveActionsPdf({ project: lineName, printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), today: iso(now), rows, done, ...(person ? { person } : {}) });
}

/** The line's tracker as a workbook (lib/listXlsx) — the same rows, done ones of the last 30 days included, for Excel. */
export async function saveLineActionsXlsx(wsId: string, lineName: string): Promise<void> {
  const [snags, assets] = await Promise.all([listAllSnags(), listSnagAssets(wsId)]);
  const now = Date.now();
  const rows = trackerRows(snags, wsId, now, { withDone: true, machineOf: s => (s.assetId ? assets.find(a => a.id === s.assetId)?.name : s.targetAsset) });
  const { trackerSheet, saveXlsx } = await import('../../lib/listXlsx');
  await saveXlsx([trackerSheet(rows, id => snags.find(s => s.id === id)?.problem ?? '')], lineName, 'action tracker', iso(now));
}
