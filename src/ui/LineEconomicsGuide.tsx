/* Guided Line economics for the Loss Engine (v3) — versions on the workspace record. */
import { useState } from 'react';
import type { Workspace } from '../types';
import { economicsStatus, snapshotEconomics } from '../lib/lossEngine/economicsRecord';
import { hasLabour, labourPerHour, fmtGBP, burdenOf } from '../lib/cost';

export function LineEconomicsGuide({ workspace, onSave, may }: {
  workspace: Workspace;
  onSave: (patch: Partial<Workspace>, msg: string) => Promise<void>;
  may: boolean;
}) {
  const status = economicsStatus(workspace);
  const [assumed, setAssumed] = useState(!!workspace.lossEngineEconomics?.assumed);

  const saveVersion = async () => {
    const snap = snapshotEconomics(workspace, assumed);
    await onSave({ lossEngineEconomics: snap }, `Line economics v${snap.version} saved`);
  };

  return (
    <section className="card line-economics-guide" aria-labelledby="line-economics-h" data-line-economics>
      <h2 id="line-economics-h">Line economics</h2>
      <p className="sub">Every minute priced from this line’s own numbers — labour £ and contribution £ stay separate. Used by the Loss Engine and import.</p>
      <p className={`le-status is-${status.word}`} data-le-status role="status">{status.says}</p>
      <ol className="le-steps">
        <li className={workspace.crew && workspace.labourRatePerHour ? 'done' : ''}>People on the line and £ an hour each (below under Crew and costs).</li>
        <li className={workspace.packsPerMin ? 'done' : ''}>Rated speed in packs a minute.</li>
        <li className={workspace.marginPerPack !== undefined ? 'done' : ''}>Margin a pack for lost output.</li>
        <li className={workspace.materialsPerPack !== undefined ? 'done' : ''}>Materials a pack for scrap on rejects.</li>
      </ol>
      {hasLabour(workspace) && (
        <p className="le-readout">While down: <b>{fmtGBP(labourPerHour(workspace))}/hr labour</b>
          <span className="sub"> ({workspace.crew} × £{workspace.labourRatePerHour}{burdenOf(workspace) !== 1 ? ` × ${burdenOf(workspace)}` : ''})</span>
        </p>
      )}
      {workspace.lossEngineEconomics?.version && (
        <p className="sub">Saved version {workspace.lossEngineEconomics.version}
          {' · '}{new Date(workspace.lossEngineEconomics.savedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      )}
      {may && (
        <div className="le-actions">
          <label className="le-assume">
            <input type="checkbox" checked={assumed} onChange={e => setAssumed(e.target.checked)} />
            Mark unset optional fields as Assumed for this version
          </label>
          <button type="button" className="btn btn-primary" data-le-save disabled={!status.complete} onClick={() => void saveVersion()}>
            Save line economics version
          </button>
        </div>
      )}
    </section>
  );
}