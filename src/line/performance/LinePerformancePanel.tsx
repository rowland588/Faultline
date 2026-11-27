import { useMemo, useState } from 'react';
import type { Workspace } from '../../types';
import { runLossEngine, economicsFromWorkspace } from '../../lib/lossEngine';
import { economicsStatus, lineEconomicsFromRecord } from '../../lib/lossEngine/economicsRecord';
import { guessMapping, parseLossShiftCsv, type LossImportMapping } from '../../lib/lossEngine/importShiftCsv';
import { immediateLossSays } from '../../lib/lossEngine/reportSays';
import { formatPence } from '../../lib/lossEngine/money';
import type { LossEngineReport } from '../../lib/lossEngine/types';
import { nav } from '../../state/useRoute';
import { lineHref } from '../../ui/rail';

type Step = 'import' | 'mapping' | 'report';

export function LinePerformancePanel({ workspace, wsId, may }: { workspace: Workspace; wsId: string; may: boolean }) {
  const [step, setStep] = useState<Step>('import');
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<LossImportMapping>({});
  const [parsed, setParsed] = useState<ReturnType<typeof parseLossShiftCsv> | null>(null);
  const [report, setReport] = useState<LossEngineReport | null>(null);
  const econSay = economicsStatus(workspace);

  const onFile = async (file: File) => {
    const text = await file.text();
    setRaw(text);
    setFileName(file.name);
    const headers = parseLossShiftCsv(text).headers;
    const preview = parseLossShiftCsv(text, guessMapping(headers.length ? headers : ['row_type', 'sigma_minutes', 'good_packs']));
    setMapping(preview.mapping);
    setParsed(preview);
    setStep('mapping');
    setReport(null);
  };

  const confirmMap = () => {
    if (!raw) return;
    const p = parseLossShiftCsv(raw, mapping);
    setParsed(p);
    if (p.refused.length) return;
    const econ = workspace.lossEngineEconomics
      ? lineEconomicsFromRecord(workspace.lossEngineEconomics)
      : economicsFromWorkspace(workspace);
    if (!econ) return;
    const rate = p.facts.ratePerMin ?? econ.ratePerMin;
    const input = {
      sigmaMinutes: p.facts.sigmaMinutes,
      goodPacks: p.facts.goodPacks,
      rejectPacks: p.facts.rejectPacks,
      economics: { ...econ, ratePerMin: rate },
      ledger: p.ledger,
    };
    setReport(runLossEngine(input));
    setStep('report');
  };

  const said = useMemo(() => (report ? immediateLossSays(report) : null), [report]);

  return (
    <section className="pl-sec line-performance" aria-label="Performance" data-line-performance>
      <h2>Performance</h2>
      <p className="sub">Import shift production data, confirm how the columns map, then read the immediate loss report — every figure from the Loss Engine.</p>
      <p className={`le-status is-${econSay.word}`} data-le-economics-check>{econSay.says}</p>
      {!econSay.complete && may && (
        <button type="button" className="btn btn-sm" onClick={() => nav(lineHref(wsId, 'setup'))}>Line economics in Settings ›</button>
      )}

      {step === 'import' && (
        <div className="card" data-le-import>
          <div className="field-label">Import shift file</div>
          <p className="sub">CSV with fact rows (sigma_minutes, good_packs, …) and ledger rows (family, minutes, label).</p>
          <input type="file" accept=".csv,.tsv,.txt" data-le-file aria-label="Import CSV"
            onChange={e => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
          {fileName && <p className="sub">Selected: {fileName}</p>}
        </div>
      )}

      {step === 'mapping' && parsed && (
        <div className="card" data-le-mapping>
          <h3>Confirm column mapping</h3>
          <p className="sub">Headers: {parsed.headers.join(', ')}</p>
          <ul className="le-map-list">
            {Object.entries(mapping).map(([k, v]) => (
              <li key={k}><span className="le-map-k">{k}</span> → <b>{v}</b></li>
            ))}
          </ul>
          {parsed.refused.length > 0 && (
            <p className="is-a" role="alert">{parsed.refused.join(' ')}</p>
          )}
          <div className="row-inline">
            <button type="button" className="btn" onClick={() => setStep('import')}>Back</button>
            <button type="button" className="btn btn-primary" data-le-confirm-map disabled={!may || !econSay.complete || !!parsed.refused.length} onClick={confirmMap}>
              Run Loss Engine
            </button>
          </div>
        </div>
      )}

      {step === 'report' && report && said && (
        <div className="card" data-le-report data-status={said.status}>
          <h3 data-le-report-headline>{said.headline}</h3>
          <dl className="le-tiles">
            <div><dt>Σ</dt><dd data-le-sigma>{report.sigmaMinutes.toFixed(3)} min</dd></div>
            <div><dt>OEE</dt><dd data-le-oee>{report.oee.toFixed(7)}</dd></div>
            <div><dt>Idle labour</dt><dd data-le-labour>{formatPence(report.money.idleLabourPence)}</dd></div>
            <div><dt>Contribution</dt><dd data-le-contribution>{report.money.contributionPence !== undefined ? formatPence(report.money.contributionPence) : '—'}</dd></div>
            <div><dt>Scrap</dt><dd data-le-scrap>{report.money.scrapPence !== undefined ? formatPence(report.money.scrapPence) : '—'}</dd></div>
          </dl>
          <ul className="le-report-lines">
            {said.lines.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
          <button type="button" className="btn btn-sm" onClick={() => { setStep('import'); setReport(null); }}>Import another file</button>
        </div>
      )}
    </section>
  );
}