/* THE CONTROL PLAN ON THE PAGE — a card a characteristic: what is checked, against what, how, how often, by whom, recorded where, what is done when it is out;
   which FMEA failure mode it controls and which check of a check log does it. The state of a row (the six parts, the linked check) comes from the module
   (cplan.readPlanRow), never worked out here. Edits go to the record through the caller (ScoredScreen's Record). */
import { useMemo, useState } from 'react';
import { uid } from '../../lib/ids';
import { todayISO } from '../../lib/weeks';
import type { PlanData, ScoredRow, ToolStudy } from '../../lib/study';
import { AP_WORD } from '../fmea/fmea';
import { PART_WORD, besideOf, fromFmea, readPlanRow } from './cplan';

const num = (t: string): number | undefined => (t.trim() === '' || !Number.isFinite(Number(t)) || Number(t) < 0 ? undefined : Number(t));
/** What the line itself can say of the plan's prices — offered in one tap, never assumed. */
export interface PlanLine { name: string; rate?: number; speed?: number; packCost?: number; shiftMin?: number }

export function PlanEditor({ rows, canEdit, study, studies, onChange, rate, onRate, line, onInputs }: {
  rows: ScoredRow[]; canEdit: boolean; study: ToolStudy; studies: readonly ToolStudy[]; onChange: (next: ScoredRow[]) => void;
  rate?: number; onRate: (v: number | undefined) => void; line?: PlanLine; onInputs: (patch: { speed?: number; packCost?: number; shiftMin?: number }) => void;
}) {
  const sc = study.agreed?.scored, inputs = { rate, speed: sc?.speed, packCost: sc?.packCost, shiftMin: sc?.shiftMin };
  const now = Date.now();
  const beside = useMemo(() => besideOf({ today: todayISO(new Date(now)), now, studies, self: { id: study.id, ...(study.workspaceId ? { workspaceId: study.workspaceId } : {}), ...(study.projectId ? { projectId: study.projectId } : {}) } }), [studies, study.id, study.workspaceId, study.projectId, now]);
  const [undo, setUndo] = useState<{ label: string; rows: ScoredRow[] } | null>(null);
  const change = (next: ScoredRow[]) => { setUndo(null); onChange(next); };
  const set = (id: string, patch: Partial<PlanData>) => change(rows.map(r => (r.id === id ? { ...r, plan: { ...r.plan, ...patch } } : r)));
  const rename = (id: string, name: string) => change(rows.map(r => (r.id === id ? { ...r, name } : r)));
  const remove = (r: ScoredRow) => { onChange(rows.filter(x => x.id !== r.id)); setUndo({ label: `${r.name.trim() || 'The characteristic'} taken off.`, rows }); };
  const add = () => change([...rows, { id: uid(), name: '', plan: {} }]);
  const starters = useMemo(() => fromFmea(rows, beside, uid), [rows, beside]);
  const text = (id: string, key: 'step' | 'spec' | 'method' | 'sample' | 'event' | 'owner' | 'record' | 'reaction', f: PlanData, label: string, placeholder = '') => (
    <label className="field"><span className="field-label">{label}</span>
      <input className="text-input" aria-label={label} disabled={!canEdit} value={f[key] ?? ''} placeholder={placeholder} onChange={e => set(id, { [key]: e.target.value })} /></label>
  );
  const numBox = (id: string, key: 'everyMin' | 'minutes' | 'n', f: PlanData, label: string) => (
    <label className="field"><span className="field-label">{label}</span>
      <input className="text-input scored-num" inputMode="decimal" aria-label={label} disabled={!canEdit} value={f[key] ?? ''} onChange={e => set(id, { [key]: num(e.target.value) })} /></label>
  );
  const price = (label: string, value: number | undefined, offer: number | undefined, offerWords: string, apply: (v: number | undefined) => void) => (
    <label className="field scored-rate"><span className="field-label">{label}</span>
      <input className="text-input scored-num" inputMode="decimal" aria-label={label} disabled={!canEdit} value={value ?? ''} onChange={e => apply(num(e.target.value))} />
      {canEdit && offer !== undefined && value !== offer && <button type="button" className="cw-link" onClick={() => apply(offer)}>{offerWords}</button>}
    </label>
  );
  return (
    <div className="fm cp" data-cplan>
      <details className="fm-more cp-prices" open={!!(rate || sc?.speed || sc?.packCost || sc?.shiftMin)}>
        <summary>What the checks cost — to price the plan (optional)</summary>
        <div className="fm-grid">
          {price('£ an hour for the people checking', rate, line?.rate, `Use ${line?.name ?? 'the line'}’s £${line?.rate} an hour`, onRate)}
          {price('Minutes in a shift', sc?.shiftMin, line?.shiftMin, `Use ${line?.name ?? 'the line'}’s ${line?.shiftMin} minutes`, v => onInputs({ shiftMin: v }))}
          {price('The line’s speed, packs a minute', sc?.speed, line?.speed, `Use ${line?.name ?? 'the line'}’s ${line?.speed} a minute`, v => onInputs({ speed: v }))}
          {price('What a pack held is worth, £', sc?.packCost, line?.packCost, `Use ${line?.name ?? 'the line'}’s margin, £${line?.packCost} a pack`, v => onInputs({ packCost: v }))}
        </div>
        <p className="sub">Each is optional; the plan names what it still lacks and nothing waits on it.</p>
      </details>
      {rows.map((r, i) => {
        const f = r.plan ?? {}, read = readPlanRow(r, i + 1, beside, inputs);
        const modes = beside.fmeas.flatMap(x => x.modes.map(m => ({ key: `${x.study.id}/${m.id}`, label: `${m.mode} — ${AP_WORD[m.ap]}`, studyId: x.study.id, rowId: m.id })));
        const checks = beside.checks;
        return (
          <section key={r.id} className="fm-card" data-cplan-row={r.id} aria-label={`Characteristic ${i + 1}`}>
            <header className="fm-head">
              <b className="fm-no">{i + 1}</b>
              <label className="field fm-mode"><span className="field-label">Characteristic — what is checked</span>
                <input className="text-input" aria-label={`Characteristic ${i + 1}`} disabled={!canEdit} value={r.name} placeholder="e.g. Seal strength" onChange={e => rename(r.id, e.target.value)} /></label>
              <span className={'fm-ap' + (read.complete ? ' is-L' : ' is-M')} data-complete={read.complete ? 'yes' : 'no'}>{!read.named ? 'Not named' : read.complete ? 'Complete' : `${read.missing.length} to say`}</span>
            </header>
            {read.named && read.missing.length > 0 && <p className="sub fm-why" data-missing>Still to say: {read.missing.map(m => PART_WORD[m]).join(' · ')}.</p>}
            <div className="fm-grid">
              {text(r.id, 'step', f, 'Process step', 'e.g. Sealing')}
              <label className="field"><span className="field-label">Product or process</span>
                <select className="text-input" aria-label="Product or process" disabled={!canEdit} value={f.kind ?? ''} onChange={e => set(r.id, { kind: (e.target.value || undefined) as PlanData['kind'] })}>
                  <option value="">—</option><option value="product">Product — a feature of the pack</option><option value="process">Process — a setting or a condition</option></select></label>
              {text(r.id, 'spec', f, 'Against what — the specification or limit', 'e.g. ≥ 8 N per 15 mm')}
              {text(r.id, 'method', f, 'How — the method and the gauge', 'e.g. Pull test, force gauge')}
              {text(r.id, 'sample', f, 'The sample', 'e.g. 1 pack per head')}
              {numBox(r.id, 'everyMin', f, 'How often — minutes between checks')}
              {text(r.id, 'event', f, 'Or when — an event that triggers it', 'e.g. at every changeover')}
              {numBox(r.id, 'minutes', f, 'Minutes one check takes')}
              {text(r.id, 'owner', f, 'Who checks', 'e.g. Technician')}
              {text(r.id, 'record', f, 'Recorded where', 'e.g. Seal log')}
            </div>
            <label className="field"><span className="field-label">If it is out — the reaction: contain, correct, tell, and what happens to the product since the last good check</span>
              <textarea className="text-input" rows={2} aria-label="If it is out" disabled={!canEdit} value={f.reaction ?? ''} onChange={e => set(r.id, { reaction: e.target.value })} placeholder="e.g. Stop; hold the packs since the last good check; re-set; re-test" /></label>
            <details className="fm-more" open={!!(f.fmea || f.link || f.haccp)}>
              <summary>What it controls, and the check that does it</summary>
              <div className="fm-grid">
                <label className="field"><span className="field-label">The failure mode it controls <i className="sub">from an FMEA on this line or project</i></span>
                  <select className="text-input" aria-label="The failure mode it controls" disabled={!canEdit} value={f.fmea ? `${f.fmea.studyId}/${f.fmea.rowId}` : ''}
                    onChange={e => { const m = modes.find(x => x.key === e.target.value); set(r.id, { fmea: m ? { studyId: m.studyId, rowId: m.rowId } : undefined }); }}>
                    <option value="">{modes.length ? 'None picked' : 'No FMEA here yet'}</option>
                    {modes.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select></label>
                <label className="field"><span className="field-label">The check of a check log that does it <i className="sub">its due, overdue and failed read here</i></span>
                  <select className="text-input" aria-label="The check log that does it" disabled={!canEdit} value={f.link ? `${f.link.logId}/${f.link.checkId}` : ''}
                    onChange={e => { const c = checks.find(x => `${x.logId}/${x.checkId}` === e.target.value); set(r.id, { link: c ? { logId: c.logId, checkId: c.checkId } : undefined }); }}>
                    <option value="">{checks.length ? 'None picked' : 'No check log here yet'}</option>
                    {checks.map(c => <option key={`${c.logId}/${c.checkId}`} value={`${c.logId}/${c.checkId}`}>{c.log} — {c.name}</option>)}
                  </select></label>
                <label className="field fm-tick"><input type="checkbox" aria-label="A critical control point" disabled={!canEdit} checked={!!f.haccp} onChange={e => set(r.id, { haccp: e.target.checked || undefined })} /> <span>A critical control point or food-safety hazard — it belongs in the HACCP plan; this plan points to it</span></label>
              </div>
            </details>
            {read.linkedState && <p className="sub fm-status" data-linked>{read.linkedName}: {read.linkedState.words}.</p>}
            {read.mismatch && <p className="ie-warn" role="status">The plan says every {read.mismatch.plan} min; the log runs every {read.mismatch.log} min. One of them is wrong.</p>}
            {read.fmea && <p className="sub">Controls: {read.fmea.mode} ({AP_WORD[read.fmea.ap]}).</p>}
            {canEdit && <button type="button" className="cw-link sp-rm" aria-label={`Take off characteristic ${i + 1}`} onClick={() => remove(r)}>Take off</button>}
          </section>
        );
      })}
      {canEdit && (
        <div className="cp-acts">
          <button type="button" className="btn" onClick={add}>+ Add a characteristic</button>
          {starters.length > 0 && <button type="button" className="btn" onClick={() => change([...rows.filter(r => r.name.trim() || Object.keys(r.plan ?? {}).length), ...starters])}>+ From the FMEA — {starters.length} without a check</button>}
        </div>
      )}
      {undo && <p className="sub" role="status">{undo.label} <button type="button" className="linkish" onClick={() => { onChange(undo.rows); setUndo(null); }}>Undo</button></p>}
    </div>
  );
}
