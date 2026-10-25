/* A CALCULATOR'S INPUTS — one form for every definition (knowledge/specs/FC-235-calculators.md). Each box says what it is, its
 * unit and where on the floor to find it; a choice says whose it is when it is Faultline's starting point; a box the line's cost
 * model can fill says what it would put in, and where to give it when the line has none; the money boxes sit apart under "In money
 * — all optional", and nothing waits on them. Typed live: the result beside it is worked out from what is in the boxes, saved a
 * moment after the last key. */
import { useState } from 'react';
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
}

const unitFirst = (f: Field): boolean => !!f.unit && /^£/.test(f.unit);
const said = (f: Field, n: number): string => (unitFirst(f) ? gbp(n) : `${fmt(n, 2)}${f.unit ? ` ${f.unit}` : ''}`);

function Box({ f, p }: { f: Field; p: Props }) {
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

export function CalcForm(p: Props) {
  const v = valuesOf(p.def, p.draft);
  const asked = askedFields(p.def, v);
  const plain = asked.filter(f => !f.money), money = asked.filter(f => f.money);
  const given = money.some(f => p.draft[f.id] !== undefined && p.draft[f.id] !== '');
  const [open, setOpen] = useState(false);
  return (
    <div className="calc-form" aria-label="The figures">
      {plain.map(f => <Box key={f.id} f={f} p={p} />)}
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
