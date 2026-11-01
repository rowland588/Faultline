/* THE RESPONSE SURFACE ON THE PAGE — the setup (the factors, the design, the centre runs, what is wanted), the run sheet in the order to make the runs with a box for
   each response, and the confirmation run. What the runs say (the fit, the best setting) comes from the module (rsm.rsmAnalyse), never worked out here. Edits go to
   the record through the caller (ScoredScreen's Record). */
import { useEffect, useRef, useState } from 'react';
import { uid } from '../../lib/ids';
import type { RsmSetup, ScoredRow } from '../../lib/study';
import { DESIGNS, RSM_MAX_CENTRE, runCount, runPlan, setupProblem, settingsWords, type Design } from './rsm';

const num = (t: string): number | undefined => (t.trim() === '' || !Number.isFinite(Number(t)) ? undefined : Number(t));
const FRESH: RsmSetup = { factors: [{ name: '', low: 0, high: 1 }, { name: '', low: 0, high: 1 }], design: 'ccf', centre: 5, seed: 1, goal: 'min' };

export function RsmEditor({ rows, canEdit, study, onChange, onInputs }: {
  rows: ScoredRow[]; canEdit: boolean; study: { agreed?: { scored?: { rsm?: RsmSetup } } }; onChange: (next: ScoredRow[]) => void; onInputs: (patch: { rsm?: RsmSetup }) => void;
}) {
  /* the setup is one object kept whole on the record, so edits made in quick succession must build on each other, not on a render that has not caught up:
     the editor holds its own copy, sends every change, and takes the record's only when it is a change this editor did not send (Undo, a reload, another device) */
  const stored: RsmSetup = study.agreed?.scored?.rsm ?? FRESH, storedKey = JSON.stringify(stored);
  const [s, setS] = useState<RsmSetup>(stored), sRef = useRef<RsmSetup>(stored), sent = useRef<string[]>([]);
  useEffect(() => { if (!sent.current.includes(storedKey)) { sRef.current = stored; setS(stored); } }, [storedKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  const send = (next: RsmSetup) => { sRef.current = next; sent.current = [...sent.current.slice(-30), JSON.stringify(next)]; setS(next); onInputs({ rsm: next }); };
  const k = s.factors.length, problem = setupProblem(s), made = rows.some(r => r.run);
  const [undo, setUndo] = useState<{ label: string; rows: ScoredRow[]; setup: RsmSetup } | null>(null);
  const setup = (patch: Partial<RsmSetup>) => send({ ...sRef.current, ...patch });
  const setFactor = (j: number, patch: Partial<RsmSetup['factors'][number]>) => setup({ factors: sRef.current.factors.map((f, i) => (i === j ? { ...f, ...patch } : f)) });
  const addFactor = () => setup({ factors: [...sRef.current.factors, { name: '', low: 0, high: 1 }] });
  const dropFactor = (j: number) => setup({ factors: sRef.current.factors.filter((_, i) => i !== j) });
  const makeSheet = () => {
    if (problem) return;
    setUndo(made ? { label: 'The run sheet was made again — the earlier runs and their responses are gone.', rows, setup: s } : null);
    const seed = made ? s.seed + 1 : s.seed;
    send({ ...s, seed, ...(made ? { confirm: undefined } : {}) });
    onChange(runPlan(k, s.design, s.centre ?? 0, seed).map((x, i) => ({ id: uid(), name: `Run ${i + 1}`, run: { x } })));
  };
  const setY = (id: string, y: number | undefined) => onChange(rows.map(r => (r.id === id && r.run ? { ...r, run: { ...r.run, y } } : r)));
  const design = DESIGNS.find(d => d.key === s.design);
  const n = problem ? undefined : runCount(k, s.design, s.centre ?? 0);
  return (
    <div className="fm rs" data-rsm>
      <details className="fm-more" open={!made}>
        <summary>The design — the factors, the runs and what is wanted</summary>
        <div className="rs-factors">
          {s.factors.map((f, j) => (
            <div key={j} className="fm-grid rs-factor" data-factor={j}>
              <label className="field"><span className="field-label">Factor {j + 1}</span>
                <input className="text-input" aria-label={`Factor ${j + 1}`} disabled={!canEdit} value={f.name} placeholder="e.g. Filler speed" onChange={e => setFactor(j, { name: e.target.value })} /></label>
              <label className="field"><span className="field-label">Unit</span>
                <input className="text-input" aria-label={`Unit of factor ${j + 1}`} disabled={!canEdit} value={f.unit ?? ''} placeholder="e.g. a minute" onChange={e => setFactor(j, { unit: e.target.value || undefined })} /></label>
              <label className="field"><span className="field-label">Low</span>
                <input className="text-input scored-num" inputMode="decimal" aria-label={`Low of factor ${j + 1}`} disabled={!canEdit} value={Number.isFinite(f.low) ? f.low : ''} onChange={e => setFactor(j, { low: num(e.target.value) ?? NaN })} /></label>
              <label className="field"><span className="field-label">High</span>
                <input className="text-input scored-num" inputMode="decimal" aria-label={`High of factor ${j + 1}`} disabled={!canEdit} value={Number.isFinite(f.high) ? f.high : ''} onChange={e => setFactor(j, { high: num(e.target.value) ?? NaN })} /></label>
              {canEdit && k > 2 && <button type="button" className="cw-link sp-rm" aria-label={`Take off factor ${j + 1}`} onClick={() => dropFactor(j)}>Take off</button>}
            </div>
          ))}
          {canEdit && k < 3 && <button type="button" className="btn" onClick={addFactor}>+ Add a third factor</button>}
        </div>
        <div className="fm-grid">
          <label className="field"><span className="field-label">The design</span>
            <select className="text-input" aria-label="The design" disabled={!canEdit} value={s.design} onChange={e => setup({ design: e.target.value as Design })}>
              {DESIGNS.map(d => <option key={d.key} value={d.key}>{d.word}</option>)}</select>
            <span className="sub">{design?.says}</span></label>
          <label className="field"><span className="field-label">Runs at the centre <i className="sub">repeats, for the pure error</i></span>
            <input className="text-input scored-num" inputMode="numeric" aria-label="Centre runs" disabled={!canEdit} value={s.centre ?? ''} onChange={e => setup({ centre: num(e.target.value) })} /></label>
          <label className="field"><span className="field-label">What is wanted</span>
            <select className="text-input" aria-label="What is wanted" disabled={!canEdit} value={s.goal ?? 'min'} onChange={e => setup({ goal: e.target.value as 'min' | 'max' })}>
              <option value="min">The smallest response</option><option value="max">The largest response</option></select></label>
          <label className="field"><span className="field-label">The response — what is measured</span>
            <input className="text-input" aria-label="The response" disabled={!canEdit} value={s.response ?? ''} placeholder="e.g. Give-away" onChange={e => setup({ response: e.target.value || undefined })} /></label>
          <label className="field"><span className="field-label">Its unit</span>
            <input className="text-input" aria-label="The response unit" disabled={!canEdit} value={s.unit ?? ''} placeholder="e.g. g" onChange={e => setup({ unit: e.target.value || undefined })} /></label>
          <label className="field"><span className="field-label">Packs a run uses <i className="sub">optional</i></span>
            <input className="text-input scored-num" inputMode="decimal" aria-label="Packs a run uses" disabled={!canEdit} value={s.packsPerRun ?? ''} onChange={e => setup({ packsPerRun: num(e.target.value) })} /></label>
          <label className="field"><span className="field-label">Materials a pack, £ <i className="sub">optional</i></span>
            <input className="text-input scored-num" inputMode="decimal" aria-label="Materials a pack" disabled={!canEdit} value={s.materialsPerPack ?? ''} onChange={e => setup({ materialsPerPack: num(e.target.value) })} /></label>
        </div>
        {problem ? <p className="sub" data-setup-problem>{problem}</p> : <p className="sub">{n} runs ({DESIGNS.find(d => d.key === s.design)?.word.toLowerCase()}, {s.centre ?? 0} at the centre). Centre runs of {RSM_MAX_CENTRE} at most; two or more for the lack-of-fit test.</p>}
        {canEdit && <button type="button" className="btn btn-primary" disabled={!!problem} onClick={makeSheet}>{made ? 'Make the run sheet again' : 'Make the run sheet'}</button>}
      </details>
      {made && (
        <div className="rs-sheet">
          <p className="sub">Make the runs in this order — it was shuffled so a drifting machine does not look like a factor — and type each response as it is made.</p>
          <ol className="rs-runs">
            {rows.filter(r => r.run).map((r, i) => (
              <li key={r.id} className="fm-card rs-run" data-run={r.id}>
                <b className="fm-no">{i + 1}</b>
                <span className="rs-set">{settingsWords(s, r.run?.x ?? [])}</span>
                <label className="field"><span className="field-label">{s.response?.trim() || 'Response'}{s.unit ? `, ${s.unit}` : ''}</span>
                  <input className="text-input scored-num" inputMode="decimal" aria-label={`Response of run ${i + 1}`} disabled={!canEdit} value={r.run?.y ?? ''} onChange={e => setY(r.id, num(e.target.value))} /></label>
              </li>
            ))}
          </ol>
          <label className="field"><span className="field-label">Confirmation run — one run at the best setting, made after the design</span>
            <input className="text-input scored-num" inputMode="decimal" aria-label="Confirmation run" disabled={!canEdit} value={s.confirm ?? ''} onChange={e => setup({ confirm: num(e.target.value) })} /></label>
        </div>
      )}
      {undo && <p className="sub" role="status">{undo.label} <button type="button" className="linkish" onClick={() => { send(undo.setup); onChange(undo.rows); setUndo(null); }}>Undo</button></p>}
    </div>
  );
}
