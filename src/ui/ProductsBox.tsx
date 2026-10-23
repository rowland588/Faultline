/* THE PRODUCTS A PROGRAM RUNS — one program often runs several (Rowland, 23
 * October: "I have a program 10 ... that does 4 products"). Each product a
 * chip with its ×, and a box to add the next: Enter or Add puts it on the
 * list; what is typed and not yet added is kept too, so Save never loses it.
 * The value is the one text the program keeps (lib/programs productsOf,
 * productsText), so every row and paper that says "runs …" says them all. */
import { useEffect, useRef, useState } from 'react';
import { productsOf, productsText } from '../lib/programs';

export function ProductsBox({ value, onChange, suggest, listId, wide }: {
  value: string;
  onChange: (runs: string) => void;
  /** The line's products, offered as the box is typed in. */
  suggest?: readonly string[];
  listId?: string;
  wide?: boolean;
}) {
  const [list, setList] = useState<string[]>(() => productsOf(value));
  const [typed, setTyped] = useState('');
  const said = useRef(value);
  /* a value set from outside (the form reset after an add) starts the list again */
  useEffect(() => {
    if (value === said.current) return;
    said.current = value;
    setList(productsOf(value));
    setTyped('');
  }, [value]);
  const tell = (l: string[], t: string) => {
    const v = productsText([...l, t]) ?? '';
    said.current = v;
    onChange(v);
  };
  const add = () => {
    const next = productsOf([...list, typed].join(', '));
    setList(next); setTyped('');
    tell(next, '');
  };
  const drop = (i: number) => {
    const next = list.filter((_, j) => j !== i);
    setList(next);
    tell(next, typed);
  };
  const id = listId ?? undefined;
  return (
    <div className={'prods-box' + (wide ? ' spp-f-wide' : '')} role="group" aria-label="Products it runs">
      <span className="prods-box-h">Products it runs</span>
      {list.length > 0 && (
        <ul className="prods-chips">
          {list.map((p, i) => (
            <li key={p}>
              <span className="prods-chip">{p}
                <button type="button" className="prods-x" aria-label={`Take ${p} off`} onClick={() => drop(i)}>×</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <span className="prods-add">
        <input value={typed} list={id} maxLength={80} placeholder={list.length ? 'Another product' : 'Finest Red 2kg'}
          aria-label={list.length ? 'Another product it runs' : 'A product it runs'}
          onChange={e => { setTyped(e.target.value); tell(list, e.target.value); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (typed.trim()) add(); } }} />
        <button type="button" className="btn btn-sm btn-ghost" disabled={!typed.trim()} onClick={add}>Add</button>
      </span>
      {suggest && id && <datalist id={id}>{suggest.filter(s => !list.some(l => l.toLowerCase() === s.toLowerCase())).map(s => <option key={s} value={s} />)}</datalist>}
    </div>
  );
}
