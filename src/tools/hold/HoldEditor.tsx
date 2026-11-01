/* THE HOLDS ON THE PAGE — a card a hold: what is held and how many packs, where, whether it is segregated, why and the cause, who raised it and when, who may
   release it and the day the decision is due; then the fate with who decided, when and on what grounds. The state of a card (what is unsaid, the days, the money)
   comes from the module (hold.readHold), never worked out here. Edits go to the record through the caller (ScoredScreen's Record). */
import { useState } from 'react';
import { uid } from '../../lib/ids';
import { todayISO, niceDay } from '../../lib/weeks';
import type { HoldData, ScoredRow } from '../../lib/study';
import { CAUSES, FATES, PART_WORD, readHold, type Fate, type HoldInputs } from './hold';

const num = (t: string): number | undefined => (t.trim() === '' || !Number.isFinite(Number(t)) || Number(t) < 0 ? undefined : Number(t));
/** What the line itself can say of the prices — offered in one tap, never assumed. */
export interface HoldLine { name: string; rate?: number; margin?: number }
export type HoldPatch = { costToDate?: number; margin?: number; carryPct?: number };

export function HoldEditor({ rows, canEdit, study, onChange, rate, onRate, line, onInputs }: {
  rows: ScoredRow[]; canEdit: boolean; study: { agreed?: { scored?: HoldInputs } }; onChange: (next: ScoredRow[]) => void;
  rate?: number; onRate: (v: number | undefined) => void; line?: HoldLine; onInputs: (patch: HoldPatch) => void;
}) {
  const sc = study.agreed?.scored, today = todayISO(), inputs: HoldInputs = { rate, costToDate: sc?.costToDate, margin: sc?.margin, carryPct: sc?.carryPct };
  const [undo, setUndo] = useState<{ label: string; rows: ScoredRow[] } | null>(null);
  const change = (next: ScoredRow[]) => { setUndo(null); onChange(next); };
  const set = (id: string, patch: Partial<HoldData>) => change(rows.map(r => (r.id === id ? { ...r, hold: { ...r.hold, ...patch } } : r)));
  const rename = (id: string, name: string) => change(rows.map(r => (r.id === id ? { ...r, name } : r)));
  const remove = (r: ScoredRow) => { onChange(rows.filter(x => x.id !== r.id)); setUndo({ label: `${r.name.trim() || 'The hold'} taken off.`, rows }); };
  const add = () => change([...rows, { id: uid(), name: '', hold: { raisedOn: today } }]);
  const text = (id: string, key: 'lot' | 'label' | 'where' | 'reason' | 'raisedBy' | 'decider' | 'decidedBy' | 'grounds' | 'ref', f: HoldData, label: string, placeholder = '') => (
    <label className="field"><span className="field-label">{label}</span>
      <input className="text-input" aria-label={label} disabled={!canEdit} value={f[key] ?? ''} placeholder={placeholder} onChange={e => set(id, { [key]: e.target.value })} /></label>
  );
  const numBox = (id: string, key: 'qty' | 'life' | 'lossPerPack' | 'hours' | 'extra' | 'disposal', f: HoldData, label: string) => (
    <label className="field"><span className="field-label">{label}</span>
      <input className="text-input scored-num" inputMode="decimal" aria-label={label} disabled={!canEdit} value={f[key] ?? ''} onChange={e => set(id, { [key]: num(e.target.value) })} /></label>
  );
  const day = (id: string, key: 'raisedOn' | 'decideBy' | 'decidedOn', f: HoldData, label: string) => (
    <label className="field"><span className="field-label">{label}</span>
      <input className="text-input" type="date" aria-label={label} disabled={!canEdit} value={f[key] ?? ''} onChange={e => set(id, { [key]: e.target.value || undefined })} /></label>
  );
  const price = (label: string, value: number | undefined, offer: number | undefined, offerWords: string, apply: (v: number | undefined) => void) => (
    <label className="field scored-rate"><span className="field-label">{label}</span>
      <input className="text-input scored-num" inputMode="decimal" aria-label={label} disabled={!canEdit} value={value ?? ''} onChange={e => apply(num(e.target.value))} />
      {canEdit && offer !== undefined && value !== offer && <button type="button" className="cw-link" onClick={() => apply(offer)}>{offerWords}</button>}
    </label>
  );
  return (
    <div className="fm hd" data-holds>
      <details className="fm-more cp-prices" open={!!(rate || sc?.costToDate || sc?.margin || sc?.carryPct)}>
        <summary>What a hold costs — to say it in money (optional)</summary>
        <div className="fm-grid">
          {price('What a pack has cost to this point, £ (materials and labour)', sc?.costToDate, undefined, '', v => onInputs({ costToDate: v }))}
          {price('The margin a pack, £', sc?.margin, line?.margin, `Use ${line?.name ?? 'the line'}’s margin, £${line?.margin} a pack`, v => onInputs({ margin: v }))}
          {price('£ an hour for a review or rework', rate, line?.rate, `Use ${line?.name ?? 'the line'}’s £${line?.rate} an hour`, onRate)}
          {price('Carrying rate, % a year', sc?.carryPct, undefined, '', v => onInputs({ carryPct: v }))}
        </div>
        <p className="sub">Money tied up while a hold is open is not a loss; a decided hold says what was lost. Each is optional — the page names what it still lacks and nothing waits.</p>
      </details>
      {rows.map((r, i) => {
        const f = r.hold ?? {}, read = readHold(r, i + 1, today, inputs), fate = f.fate;
        return (
          <section key={r.id} className="fm-card" data-hold-row={r.id} aria-label={`Hold ${i + 1}`}>
            <header className="fm-head">
              <b className="fm-no">{i + 1}</b>
              <label className="field fm-mode"><span className="field-label">What is held</span>
                <input className="text-input" aria-label={`Hold ${i + 1}`} disabled={!canEdit} value={r.name} placeholder="e.g. Maris 500 g — failed seal check" onChange={e => rename(r.id, e.target.value)} /></label>
              <span className={'fm-ap' + (read.open ? ' is-H' : ' is-L')} data-state={read.open ? 'held' : 'decided'}>{!read.named ? 'Not named' : read.open ? `Held${read.days !== undefined ? ` · ${read.days} d` : ''}` : FATES.find(x => x.key === fate)?.word}</span>
            </header>
            {read.named && read.missing.length > 0 && <p className="sub fm-why" data-missing>Still to say: {read.missing.map(m => PART_WORD[m]).join(' · ')}.</p>}
            {read.overdue && <p className="ie-warn" role="status">The decision was due {niceDay(f.decideBy)} and is not made.</p>}
            <div className="fm-grid">
              {numBox(r.id, 'qty', f, 'How many packs')}
              {text(r.id, 'lot', f, 'Lot or batch', 'e.g. M2310-14')}
              {text(r.id, 'label', f, 'Hold label number', 'e.g. H-014')}
              {text(r.id, 'where', f, 'Where it is', 'e.g. Quarantine cage 2')}
              <label className="field fm-tick"><input type="checkbox" aria-label="Segregated and labelled" disabled={!canEdit} checked={!!f.segregated} onChange={e => set(r.id, { segregated: e.target.checked || undefined })} /> <span>Physically segregated or locked in the system, and labelled</span></label>
              {text(r.id, 'reason', f, 'Why it is held — the check, the complaint, the deviation', 'e.g. Seal pull failed, 3 of 5 below 8 N')}
              <label className="field"><span className="field-label">Cause — for the Pareto</span>
                <input className="text-input" list="hd-causes" aria-label="Cause" disabled={!canEdit} value={f.cause ?? ''} placeholder="Seal, Weight, Code or label…" onChange={e => set(r.id, { cause: e.target.value })} /></label>
              {day(r.id, 'raisedOn', f, 'Raised on')}
              {text(r.id, 'raisedBy', f, 'Raised by', 'e.g. Sam')}
              {text(r.id, 'decider', f, 'Who may release it — the authority', 'e.g. Priya (QA lead)')}
              {day(r.id, 'decideBy', f, 'Decision due by')}
              {numBox(r.id, 'life', f, 'Shelf life in all, days (optional)')}
            </div>
            <fieldset className="fm-after hd-fate">
              <legend>The decision</legend>
              <label className="field"><span className="field-label">What became of it</span>
                <select className="text-input" aria-label="What became of it" disabled={!canEdit} value={fate ?? ''} onChange={e => set(r.id, { fate: (e.target.value || undefined) as Fate | undefined, ...(e.target.value && !f.decidedOn ? { decidedOn: today } : {}) })}>
                  <option value="">Still held</option>
                  {FATES.map(x => <option key={x.key} value={x.key}>{x.word} — {x.means}</option>)}
                </select></label>
              {fate && (
                <div className="fm-grid">
                  {day(r.id, 'decidedOn', f, 'Decided on')}
                  {text(r.id, 'decidedBy', f, 'Decided by', 'the authority, by name')}
                  {text(r.id, 'grounds', f, 'On what grounds', 'e.g. Re-test of 20 packs, all above 8 N')}
                  {text(r.id, 'ref', f, 'Corrective action reference', 'e.g. 8D-0042')}
                  {(fate === 'release' || fate === 'rework') && numBox(r.id, 'hours', f, 'Hours the review or rework took')}
                  {fate === 'rework' && numBox(r.id, 'extra', f, 'Materials added in the rework, £')}
                  {(fate === 'concession' || fate === 'regrade') && numBox(r.id, 'lossPerPack', f, 'Price lost a pack, £')}
                  {fate === 'destroy' && numBox(r.id, 'disposal', f, 'Disposal cost, £')}
                </div>
              )}
            </fieldset>
            {read.tiedUp !== undefined && <p className="sub" data-tied>£{Math.round(read.tiedUp).toLocaleString('en-GB')} tied up — not lost unless the product is.</p>}
            {read.lost !== undefined && <p className="sub" data-lost>£{Math.round(read.lost).toLocaleString('en-GB')} lost.</p>}
            {read.lifeUsed !== undefined && <p className="sub">{Math.round(read.lifeUsed * 100)}% of its shelf life gone while held.</p>}
            {canEdit && <button type="button" className="cw-link sp-rm" aria-label={`Take off hold ${i + 1}`} onClick={() => remove(r)}>Take off</button>}
          </section>
        );
      })}
      <datalist id="hd-causes">{CAUSES.map(c => <option key={c} value={c} />)}</datalist>
      {canEdit && <div className="cp-acts"><button type="button" className="btn" onClick={add}>+ Add a hold</button></div>}
      {undo && <p className="sub" role="status">{undo.label} <button type="button" className="linkish" onClick={() => { onChange(undo.rows); setUndo(null); }}>Undo</button></p>}
    </div>
  );
}
