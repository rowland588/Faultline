/* A CALCULATOR'S INPUTS — one form for every definition (knowledge/specs/FC-235-calculators.md). Each box says what it is, its
 * unit and where on the floor to find it; a choice says whose it is when it is Faultline's starting point; a box the line's cost
 * model can fill says what it would put in, and where to give it when the line has none; the money boxes sit apart under "In money
 * — all optional", and nothing waits on them. Typed live: the result beside it is worked out from what is in the boxes, saved a
 * moment after the last key. */
import { useEffect, useState } from 'react';
import { nav } from '../../state/useRoute';
import { fieldProblems, offered, valuesOf, askedFields, type LineFacts } from './calc';
import { fmt, gbp } from './format';
import type { CalcDef, Field, Inputs, Problem } from './types';

interface Props {
  def: CalcDef;
  draft: Inputs;
  src: Record<string, string> | undefined;
  disabled: boolean;
  line: (LineFacts & { id?: string }) | undefined;
  onEdit: (id: string, value: string | number) => void;
  onUse: (id: string, value: number, from: string) => void;
  onBlur: () => void;
  problems: Problem[];
  /** Only the set-up boxes, or only the station grid (drawn full width by the page). Absent: both. */
  part?: 'main' | 'grid';
  /** What the stops have cost so far, said over the grid. */
  total?: string;
}

const unitFirst = (f: Field): boolean => !!f.unit && /^£/.test(f.unit);
const said = (f: Field, n: number): string => (unitFirst(f) ? gbp(n) : `${fmt(n, 2)}${f.unit ? ` ${f.unit}` : ''}`);

/** The stop timer on a minutes box: Stopped starts it, Running again adds the elapsed minutes and counts one stop. Kept on this device only. */
function StopTimer({ f, p }: { f: Field; p: Props }) {
  const key = `fl-stop:${location.hash.split('?')[0]}:${f.id}`;
  const read = (): number | null => { try { const n = Number(localStorage.getItem(key)); return n > 0 ? n : null; } catch { return null; } };
  const [since, setSince] = useState<number | null>(read);
  const [, tick] = useState(0);
  useEffect(() => { if (since === null) return; const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, [since]);
  if (p.disabled) return null;
  const secs = since === null ? 0 : Math.max(0, Math.floor((Date.now() - since) / 1000));
  const say = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const press = (): void => {
    if (since === null) { const t = Date.now(); try { localStorage.setItem(key, String(t)); } catch { /* fine */ } setSince(t); return; }
    const add = Math.round((Date.now() - since) / 600) / 100;
    try { localStorage.removeItem(key); } catch { /* fine */ }
    setSince(null);
    const cur = Number(p.draft[f.id]) || 0;
    p.onEdit(f.id, Math.round((cur + add) * 100) / 100);
    if (f.timer) p.onEdit(f.timer.stops, (Number(p.draft[f.timer.stops]) || 0) + 1);
    p.onBlur();
  };
  return <button type="button" data-timer={f.id} className={'btn calc-timer' + (since !== null ? ' is-running' : '')} onClick={press}>{since === null ? 'Stopped' : `Running again — ${say}`}</button>;
}

function Box({ f: f0, p }: { f: Field; p: Props }) {
  const f: Field = f0.dynamic ? { ...f0, ...f0.dynamic(valuesOf(p.def, p.draft)) } : f0;
  const raw = p.draft[f.id];
  const text = raw === undefined ? '' : String(raw);
  const mine = p.problems.filter(x => x.field === f.id && (x.block ? text !== '' : true));
  const off = f.from ? offered(f.from, p.line) : undefined;
  const from = p.src?.[f.id];
  const unit = f.unit && f.kind === 'number' ? <i className="sub calc-unit">{f.unit}</i> : null;
  return (
    <div className="field calc-field" data-field={f.id}>
      <span className="field-label">{f.label}{f.optional && !f.money ? <i className="sub"> — optional</i> : null}</span>
      {f.kind === 'choice' ? (
        <div className={(f.options ?? []).length <= 4 ? 'ie-kinds calc-choices' : 'chip-row calc-choices'} role="radiogroup" aria-label={f.label}>
          {(f.options ?? []).map(o => {
            const on = (raw ?? f.default) === o.value;
            return (f.options ?? []).length <= 4
              ? <button key={o.value} type="button" role="radio" aria-checked={on} disabled={p.disabled} data-value={o.value} className={'ie-kind' + (on ? ' on' : '')} onClick={() => p.onEdit(f.id, o.value)}><b>{o.label}</b>{o.help && <small>{o.help}</small>}</button>
              : <button key={o.value} type="button" role="radio" aria-checked={on} disabled={p.disabled} data-value={o.value} title={o.help} className={'chip' + (on ? ' on' : '')} onClick={() => p.onEdit(f.id, o.value)}>{o.label}</button>;
          })}
        </div>
      ) : (
        <span className="calc-in">
          <input className="text-input" inputMode={f.kind === 'number' ? 'decimal' : 'text'} value={text} disabled={p.disabled} aria-label={f.label} data-field-input={f.id} maxLength={f.kind === 'text' ? 40 : 24}
            onChange={e => p.onEdit(f.id, e.target.value)} onBlur={p.onBlur} />
          {unit}
        </span>
      )}
      {f.timer && <StopTimer f={f} p={p} />}
      {f.kind === 'choice' && f.optional && !f.default && !p.disabled && raw !== undefined && raw !== '' && (
        <button type="button" className="linkish calc-clear" data-clear={f.id} onClick={() => p.onEdit(f.id, '')}>Clear this choice</button>
      )}
      {f.help && <span className="sub calc-help">{f.help}</span>}
      {f.chosen && <span className="sub calc-chosen" data-chosen={f.id}><b>A choice, not a measurement.</b> {f.chosen}</span>}
      {f.from && !p.disabled && (
        off !== undefined
          ? (from && Number(raw) === off
            ? <span className="sub calc-from">From {from}.</span>
            : <button type="button" className="linkish calc-use" data-offer={f.id} onClick={() => p.onUse(f.id, off, `${p.line?.name ? `${p.line.name}’s` : 'the line’s'} set-up`)}>Use {p.line?.name ? `${p.line.name}’s` : 'the line’s'} {f.from.words}: {said(f, off)}</button>)
          : <span className="sub calc-from" data-offer-missing={f.id}>{p.line ? <>Give {p.line.name ?? 'the line'} {f.from.where} to have this offered{p.line.id ? <> · <button type="button" className="linkish" onClick={() => nav(`/lines/${p.line?.id}?view=setup`)}>open the line</button></> : null}.</> : 'Put this on a line to have the line’s figure offered.'}</span>
      )}
      {mine.map(x => <span key={x.say} className={'ie-problem calc-problem' + (x.block ? '' : ' is-warn')} role="status">{x.say}</span>)}
    </div>
  );
}

/** One station of the grid: its name, the Stopped button, the minutes and stops it has, and what it has cost so far — small, many to a row. */
function Tile({ fields, i, p }: { fields: Field[]; i: number; p: Props }) {
  const v = valuesOf(p.def, p.draft);
  const dyn = (f: Field): Field => (f.dynamic ? { ...f, ...f.dynamic(v) } : f);
  const by = (suffix: string): Field | undefined => fields.find(f => f.id.endsWith(suffix));
  const name = by('_name'), min = by('_min'), stops = by('_stops'), rate = by('_rate');
  const input = (f: Field, cls: string, ph?: string) => {
    const g = dyn(f);
    return (
      <span className={'calc-tile-in ' + cls} data-field={g.id}>
        <input className="text-input" inputMode={g.kind === 'number' ? 'decimal' : 'text'} value={p.draft[g.id] === undefined ? '' : String(p.draft[g.id])} disabled={p.disabled}
          aria-label={g.label} placeholder={ph} data-field-input={g.id} maxLength={g.kind === 'text' ? 40 : 24} onChange={e => p.onEdit(g.id, e.target.value)} onBlur={p.onBlur} />
        {g.kind === 'number' && g.unit ? <i className="sub">{g.unit}</i> : null}
      </span>
    );
  };
  const mine = p.problems.filter(x => fields.some(f => f.id === x.field) && (x.block ? true : false));
  return (
    <div className="calc-tile" data-tile={i}>
      {name && input(name, 'calc-tile-name', `Workstation ${i + 1}`)}
      {min && <StopTimer f={min} p={p} />}
      <div className="calc-tile-nums">{min && input(min, 'calc-tile-min')}{stops && input(stops, 'calc-tile-stops')}</div>
      {rate && input(rate, 'calc-tile-rate')}
      <span className="sub calc-tile-says">{p.def.tileSays?.(v, i)}</span>
      {mine.map(x => <span key={x.say} className="ie-problem calc-problem" role="status">{x.say}</span>)}
    </div>
  );
}

export function CalcForm(p: Props) {
  const v = valuesOf(p.def, p.draft);
  const asked = askedFields(p.def, v);
  const plain = asked.filter(f => !f.money && f.grid === undefined), money = asked.filter(f => f.money);
  const gridFields = asked.filter(f => !f.money && f.grid !== undefined);
  const tileIdx = [...new Set(gridFields.map(f => f.grid as number))];
  const given = money.some(f => p.draft[f.id] !== undefined && p.draft[f.id] !== '');
  const [open, setOpen] = useState(false);
  const grid = tileIdx.length > 0 && p.part !== 'main' && (
    <div className="calc-grid-wrap">
      {p.total && <p className="calc-grid-total" role="status">{p.total}</p>}
      <div className="calc-tiles-grid" aria-label="The workstations">
        {tileIdx.map(i => <Tile key={i} i={i} fields={gridFields.filter(f => f.grid === i)} p={p} />)}
      </div>
    </div>
  );
  if (p.part === 'grid') return grid || null;
  return (
    <div className="calc-form" aria-label="The figures">
      {plain.map(f => <Box key={f.id} f={f} p={p} />)}
      {p.part === undefined && grid}
      {money.length > 0 && (
        <details className="calc-money" open={open || given} onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>In money — all optional</summary>
          <p className="sub">Nothing waits on these: leave any blank and the answer is still given, with a line saying what to add.</p>
          {money.map(f => <Box key={f.id} f={f} p={p} />)}
        </details>
      )}
    </div>
  );
}

/** The boxes still blank that the answer needs, by their words. */
export function stillNeeded(def: CalcDef, draft: Inputs): string[] {
  const v = valuesOf(def, draft);
  return fieldProblems(def, v).filter(x => x.block && v[x.field ?? ''] === undefined).map(x => x.say);
}
