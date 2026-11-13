/* A CALCULATOR'S INPUTS — one form for every definition (knowledge/specs/FC-235-calculators.md). Each box says what it is, its
 * unit and where on the floor to find it; a choice says whose it is when it is Faultline's starting point; a box the line's cost
 * model can fill says what it would put in, and where to give it when the line has none; the money boxes sit apart under "In money
 * — all optional", and nothing waits on them. Typed live: the result beside it is worked out from what is in the boxes, saved a
 * moment after the last key. */
import { useEffect, useState, type ReactNode } from 'react';
import { formatStops, parseStops, reasonsKnown, tidyReason } from './stopReasons';
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
  /** Something under each tile of the grid — the button for its pictures, videos and links (ui/AttachSheet). */
  tileExtra?: (tile: number) => ReactNode;
}

const unitFirst = (f: Field): boolean => !!f.unit && /^£/.test(f.unit);
const said = (f: Field, n: number): string => (unitFirst(f) ? gbp(n) : `${fmt(n, 2)}${f.unit ? ` ${f.unit}` : ''}`);

/** The stop timer on a minutes box: Stopped starts it, Running again adds the elapsed minutes and counts one stop. Kept on this device only. */
/** WHY (FC-241 part 7): the reasons already used on this record, one tap each, and Another reason… typed once. Never required. */
function ReasonPick({ value, known, label, onPick }: { value: string; known: string[]; label: string; onPick: (why: string) => void }) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const add = (): void => { const w = tidyReason(text); setTyping(false); setText(''); if (w) onPick(w); };
  if (typing) return (
    <span className="calc-why is-typing">
      <input className="text-input" autoFocus value={text} maxLength={60} aria-label={`${label} — another reason`} placeholder="The reason" data-why-input onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') { setTyping(false); setText(''); } }} />
      <button type="button" className="btn btn-sm" data-why-add onClick={add}>Add</button>
    </span>
  );
  const opts = value && !known.some(k => k.toLowerCase() === value.toLowerCase()) ? [value, ...known] : known;
  return (
    <select className="calc-why" aria-label={label} data-why value={value} onChange={e => { if (e.target.value === '\u0000new') setTyping(true); else onPick(e.target.value); }}>
      <option value="">Why? — not said</option>
      {opts.map(k => <option key={k} value={k}>{k}</option>)}
      <option value={'\u0000new'}>＋ Another reason…</option>
    </select>
  );
}

function StopTimer({ f, p, tile }: { f: Field; p: Props; tile?: number }) {
  const key = `fl-stop:${location.hash.split('?')[0]}:${f.id}`;
  const doneField = tile !== undefined ? f.timer?.done : undefined;
  const readWhy = (): string => { try { return localStorage.getItem(`${key}:why`) ?? ''; } catch { return ''; } };
  const [why, setWhy] = useState<string>(readWhy);
  const read = (): number | null => { try { const n = Number(localStorage.getItem(key)); return n > 0 ? n : null; } catch { return null; } };
  const [since, setSince] = useState<number | null>(read);
  const [, tick] = useState(0);
  useEffect(() => { if (since === null) return; const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, [since]);
  if (p.disabled) return null;
  const secs = since === null ? 0 : Math.max(0, Math.floor((Date.now() - since) / 1000));
  const say = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const press = (): void => {
    if (since === null) { const t = Date.now(); try { localStorage.setItem(key, String(t)); } catch { /* fine */ } setSince(t); return; }
    const now = Date.now();
    const add = Math.round((now - since) / 600) / 100;
    try { localStorage.removeItem(key); } catch { /* fine */ }
    setSince(null);
    const cur = Number(p.draft[f.id]) || 0;
    p.onEdit(f.id, Math.round((cur + add) * 100) / 100);
    const sf = f.timer?.stops;
    if (sf) p.onEdit(sf, (Number(p.draft[sf]) || 0) + 1);
    /* the moment it began (a stop) or the stretch (a watch), kept for the science — does it come in bursts? (stopsCluster) */
    const lg = f.timer?.log;
    if (lg) { const prev = String(p.draft[lg] ?? ''); p.onEdit(lg, `${prev}${prev ? ';' : ''}${sf ? since : `${since}-${now}`}`); }
    /* the stop as its own line — which part, when, how long, and the reason picked while it was stopped (part 7) */
    if (doneField && tile !== undefined) {
      p.onEdit(doneField, formatStops([...parseStops(p.draft[doneField]), { i: tile, at: since, min: add, why }]));
      try { localStorage.removeItem(`${key}:why`); } catch { /* fine */ }
      setWhy('');
    }
    p.onBlur();
  };
  const button = <button type="button" data-timer={f.id} className={'btn calc-timer' + (since !== null ? ' is-running' : '')} onClick={press}>{since === null ? (f.timer?.start ?? 'Stopped') : `${f.timer?.stop ?? 'Running again'} — ${say}`}</button>;
  if (doneField && tile !== undefined) {
    const all = parseStops(p.draft[doneField]);
    const known = reasonsKnown(all);
    const lastAt = all.reduce((best, x, k) => (x.i === tile && (best < 0 || x.at >= all[best].at) ? k : best), -1);
    /* stopped: the reason waits with the timer and is written when it runs again; running: the last stop's reason is changed where it sits */
    if (since !== null) return <>{button}<ReasonPick value={why} known={known} label="Why it is stopped" onPick={w => { setWhy(w); try { localStorage.setItem(`${key}:why`, w); } catch { /* fine */ } }} /></>;
    if (lastAt >= 0) return <>{button}<ReasonPick value={all[lastAt].why} known={known} label="Why it last stopped" onPick={w => { p.onEdit(doneField, formatStops(all.map((x, k) => (k === lastAt ? { ...x, why: w } : x)))); p.onBlur(); }} /></>;
  }
  return button;
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
        <div className={((f.options ?? []).length <= 4 && !f.compact) ? 'ie-kinds calc-choices' : 'chip-row calc-choices'} role="radiogroup" aria-label={f.label}>
          {(f.options ?? []).map(o => {
            const on = (raw ?? f.default) === o.value;
            return ((f.options ?? []).length <= 4 && !f.compact)
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

/** EVERY STOP TIMED (part 7): each as its own line, newest first — its reason changed and the stop taken off where it sits. Taking one
 *  off takes its minutes and its count off its workstation, and its moment out of the log the science reads. */
function StopsDone({ p }: { p: Props }) {
  const timed = p.def.inputs.filter(f => f.grid !== undefined && f.timer?.done);
  const doneField = timed[0]?.timer?.done;
  if (!doneField) return null;
  const all = parseStops(p.draft[doneField]);
  if (!all.length) return null;
  const v = valuesOf(p.def, p.draft);
  const known = reasonsKnown(all);
  const clock = (ms: number): string => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const set = (k: number, w: string): void => { p.onEdit(doneField, formatStops(all.map((x, j) => (j === k ? { ...x, why: w } : x)))); p.onBlur(); };
  const off = (k: number): void => {
    const x = all[k], f = timed.find(t => t.grid === x.i);
    p.onEdit(doneField, formatStops(all.filter((_, j) => j !== k)));
    if (f) {
      p.onEdit(f.id, Math.max(0, Math.round(((Number(p.draft[f.id]) || 0) - x.min) * 100) / 100));
      const sf = f.timer?.stops; if (sf) p.onEdit(sf, Math.max(0, (Number(p.draft[sf]) || 0) - 1));
      const lg = f.timer?.log; if (lg) { const parts = String(p.draft[lg] ?? '').split(';').filter(Boolean); const at = parts.indexOf(String(x.at)); if (at >= 0) parts.splice(at, 1); p.onEdit(lg, parts.join(';')); }
    }
    p.onBlur();
  };
  const none = all.filter(x => !x.why).length;
  const order = all.map((x, k) => ({ x, k })).sort((a, b) => b.x.at - a.x.at);
  return (
    <details className="calc-stops" data-stops-done>
      <summary>Every stop timed · {all.length}{none ? ` · ${none} with no reason` : ''}</summary>
      <ol className="calc-stops-l">
        {order.map(({ x, k }) => (
          <li key={`${x.i}-${x.at}`} className="calc-stops-r" data-stop={k}>
            <span className="calc-stops-n"><b>{p.def.tileName?.(v, x.i) ?? `Part ${x.i + 1}`}</b><span className="sub">{clock(x.at)} · {fmt(x.min, 2)} min</span></span>
            {p.disabled ? <span className="sub">{x.why || 'no reason given'}</span> : <>
              <ReasonPick value={x.why} known={known} label={`Why ${p.def.tileName?.(v, x.i) ?? 'it'} stopped at ${clock(x.at)}`} onPick={w => set(k, w)} />
              <button type="button" className="linkish calc-stops-off" data-stop-off onClick={() => off(k)}>Take off</button>
            </>}
          </li>
        ))}
      </ol>
    </details>
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
      {min && <StopTimer f={min} p={p} tile={i} />}
      <div className="calc-tile-nums">{min && input(min, 'calc-tile-min')}{stops && input(stops, 'calc-tile-stops')}</div>
      {rate && input(rate, 'calc-tile-rate')}
      <span className="sub calc-tile-says">{p.def.tileSays?.(v, i)}</span>
      {p.tileExtra?.(i)}
      {mine.map(x => <span key={x.say} className="ie-problem calc-problem" role="status">{x.say}</span>)}
    </div>
  );
}

export function CalcForm(p: Props) {
  const v = valuesOf(p.def, p.draft);
  const asked = askedFields(p.def, v).filter(f => !f.quietIf?.(v));
  const plain = asked.filter(f => !f.money && f.grid === undefined && f.place !== 'below'), money = asked.filter(f => f.money);
  const gridFields = asked.filter(f => !f.money && f.grid !== undefined);
  const below = asked.filter(f => !f.money && f.place === 'below');
  const tileIdx = [...new Set(gridFields.map(f => f.grid as number))];
  const given = money.some(f => p.draft[f.id] !== undefined && p.draft[f.id] !== '');
  const [open, setOpen] = useState(false);
  const grid = (tileIdx.length > 0 || below.length > 0) && p.part !== 'main' && (
    <div className="calc-grid-wrap">
      {p.total && <p className="calc-grid-total" role="status">{p.total}</p>}
      <div className="calc-tiles-grid" aria-label="The workstations">
        {tileIdx.map(i => <Tile key={i} i={i} fields={gridFields.filter(f => f.grid === i)} p={p} />)}
      </div>
      <StopsDone p={p} />
      {below.length > 0 && <div className="calc-below">{below.map(f => <Box key={f.id} f={f} p={p} />)}</div>}
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
