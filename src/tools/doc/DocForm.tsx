/* A DOCUMENT'S BOXES — one editor for every definition (knowledge/specs/FC-240-documents.md). Each section says what it is for; each box
 * says what it is, whether it is needed, what to put in and where on the floor to find it; a list is a stack of rows with the same named
 * boxes in each, Add and Remove (Remove can be undone); photos are taken or chosen, kept the moment they are picked, each with a
 * caption. Typed live: the reading beside it is worked out from what is in the boxes, saved a moment after the last key. */
import { useRef } from 'react';
import { useBlobUrl } from '../../lib/useBlobUrl';
import { askedSections, isList, isPhotos, isScalar, newRow } from './doc';
import type { DocColumn, DocCtx, DocDef, DocField, DocList, DocPhoto, DocPhotos, DocProblem, DocRow, DocValues } from './types';

export interface FormProps {
  def: DocDef;
  /** What is in the boxes now (as typed, strings and all). */
  draft: DocValues;
  /** The same, read — decides which boxes are asked. */
  read: DocValues;
  photos: DocPhoto[];
  ctx: DocCtx;
  disabled: boolean;
  problems: DocProblem[];
  onField: (id: string, value: string | number) => void;
  onRows: (id: string, rows: DocRow[], undo?: string) => void;
  onBlur: () => void;
  onPhotos: (field: string, files: File[]) => void;
  onCaption: (photoId: string, caption: string) => void;
  onRemovePhoto: (photoId: string) => void;
  /** Names a person box may suggest (the signed-in person, the project's lead). */
  names: string[];
}

const textOf = (x: unknown): string => (x === undefined || x === null ? '' : String(x));

/** One box — a text, a long text, a person, a date, a number or a choice. `value` is what is typed. */
function Box({ f, value, disabled, onChange, onBlur, names, id }: { f: DocColumn | DocField; value: string; disabled: boolean; onChange: (v: string) => void; onBlur: () => void; names: string[]; id: string }) {
  if (f.kind === 'choice') {
    return (
      <div className={(f.options ?? []).length <= 4 ? 'ie-kinds doc-choices' : 'chip-row doc-choices'} role="radiogroup" aria-label={f.label}>
        {(f.options ?? []).map(o => {
          const on = value === o.value;
          return (f.options ?? []).length <= 4
            ? <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled} data-value={o.value} className={'ie-kind' + (on ? ' on' : '')} onClick={() => onChange(on ? '' : o.value)}><b>{o.label}</b>{o.help && <small>{o.help}</small>}</button>
            : <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled} data-value={o.value} title={o.help} className={'chip' + (on ? ' on' : '')} onClick={() => onChange(on ? '' : o.value)}>{o.label}</button>;
        })}
      </div>
    );
  }
  if (f.kind === 'long') {
    return <textarea className="text-input doc-long" rows={3} value={value} disabled={disabled} aria-label={f.label} data-field-input={id} maxLength={f.maxLength ?? 2000} placeholder={f.example}
      onChange={e => onChange(e.target.value)} onBlur={onBlur} />;
  }
  if (f.kind === 'date') {
    return <input className="text-input" type="date" value={value} disabled={disabled} aria-label={f.label} data-field-input={id} onChange={e => onChange(e.target.value)} onBlur={onBlur} />;
  }
  const num = f.kind === 'number';
  const list = f.kind === 'person' && names.length ? `${id}-names` : undefined;
  return (
    <span className="doc-in">
      <input className="text-input" inputMode={num ? 'decimal' : 'text'} value={value} disabled={disabled} aria-label={f.label} data-field-input={id} maxLength={f.maxLength ?? (num ? 24 : 160)} placeholder={f.example}
        {...(list ? { list } : {})} onChange={e => onChange(e.target.value)} onBlur={onBlur} />
      {num && f.unit && <i className="sub doc-unit">{f.unit}</i>}
      {list && <datalist id={list}>{names.map(n => <option key={n} value={n} />)}</datalist>}
    </span>
  );
}

function Scalar({ f, p }: { f: DocField; p: FormProps }) {
  const value = textOf(p.draft[f.id]);
  const mine = p.problems.filter(x => x.field === f.id);
  const off = f.offer?.(p.ctx);
  return (
    <div className="field doc-field" data-field={f.id}>
      <span className="field-label">{f.label}{f.required ? <i className="sub doc-req"> — needed</i> : <i className="sub"> — optional</i>}</span>
      <Box f={f} value={value} disabled={p.disabled} onChange={v => p.onField(f.id, v)} onBlur={p.onBlur} names={p.names} id={f.id} />
      {f.help && <span className="sub doc-help">{f.help}</span>}
      {off && !p.disabled && String(off.value) !== value && <button type="button" className="linkish doc-use" data-offer={f.id} onClick={() => p.onField(f.id, off.value)}>Use {off.words}</button>}
      {mine.map(x => <span key={x.say} className="ie-problem doc-problem is-warn" role="status">{x.say}</span>)}
    </div>
  );
}

function ListBox({ l, p }: { l: DocList; p: FormProps }) {
  const rows: DocRow[] = Array.isArray(p.draft[l.id]) ? (p.draft[l.id] as DocRow[]) : [];
  const mine = p.problems.filter(x => x.field === l.id || x.field?.startsWith(`${l.id}.`));
  const set = (row: DocRow, col: string, v: string) => {
    const { [col]: _g, ...rest } = row.c;
    void _g;
    p.onRows(l.id, rows.map(r => (r.id === row.id ? { ...r, c: v === '' ? rest : { ...rest, [col]: v } } : r)));
  };
  const more = l.max === undefined || rows.length < l.max;
  return (
    <div className="doc-list" data-list={l.id}>
      <div className="doc-list-h"><b>{l.label}</b>{l.required ? <i className="sub doc-req"> — needed</i> : <i className="sub"> — optional</i>}</div>
      {l.help && <span className="sub doc-help">{l.help}</span>}
      {rows.map((r, i) => (
        <div key={r.id} className="doc-row" data-row={i}>
          <span className="doc-row-n">{l.rowWord.charAt(0).toUpperCase() + l.rowWord.slice(1)} {i + 1}</span>
          <div className="doc-cells">
            {l.columns.map(c => (
              <div key={c.id} className="field doc-cell" data-cell={c.id}>
                <span className="field-label">{c.label}{c.required ? <i className="sub doc-req"> *</i> : null}</span>
                <Box f={c} value={textOf(r.c[c.id])} disabled={p.disabled} onChange={v => set(r, c.id, v)} onBlur={p.onBlur} names={p.names} id={`${l.id}.${i}.${c.id}`} />
              </div>
            ))}
          </div>
          {!p.disabled && <button type="button" className="cw-link doc-row-rm" data-remove-row={i} aria-label={`Remove ${l.rowWord} ${i + 1}`}
            onClick={() => p.onRows(l.id, rows.filter(x => x.id !== r.id), `Removed ${l.rowWord} ${i + 1} from “${l.label}”`)}>Remove</button>}
        </div>
      ))}
      {!rows.length && <p className="sub doc-none">No {l.rowWord}s yet.</p>}
      {mine.map(x => <span key={x.say} className="ie-problem doc-problem is-warn" role="status">{x.say}</span>)}
      {!p.disabled && more && <button type="button" className="btn btn-sm doc-add" data-add-row={l.id} onClick={() => p.onRows(l.id, [...rows, newRow()])}>Add {l.rowWord}</button>}
    </div>
  );
}

function Photo({ ph, p }: { ph: DocPhoto; p: FormProps }) {
  const url = useBlobUrl(ph.blobKey);
  return (
    <figure className="doc-photo" data-photo={ph.id}>
      {url ? <img className="doc-photo-i" src={url} alt={ph.caption || 'A photo kept with this document'} /> : <span className="sub doc-photo-gone">The photo is on another device — it comes here once that device has synced.</span>}
      <input className="text-input doc-cap" value={ph.caption ?? ''} disabled={p.disabled} maxLength={160} placeholder="What it shows" aria-label="Photo caption" onChange={e => p.onCaption(ph.id, e.target.value)} />
      {!p.disabled && <button type="button" className="cw-link" data-remove-photo={ph.id} onClick={() => p.onRemovePhoto(ph.id)}>Remove photo</button>}
    </figure>
  );
}

function PhotosBox({ b, p }: { b: DocPhotos; p: FormProps }) {
  const input = useRef<HTMLInputElement>(null);
  const mine = p.photos.filter(x => x.field === b.id && !x.struck);
  const more = b.max === undefined || mine.length < b.max;
  return (
    <div className="doc-photos" data-photos={b.id}>
      <div className="doc-list-h"><b>{b.label}</b>{b.required ? <i className="sub doc-req"> — needed</i> : <i className="sub"> — optional</i>}</div>
      {b.help && <span className="sub doc-help">{b.help}</span>}
      <div className="doc-photo-grid">{mine.map(ph => <Photo key={ph.id} ph={ph} p={p} />)}</div>
      {!mine.length && <p className="sub doc-none">No photos yet.</p>}
      {!p.disabled && more && (
        <>
          <button type="button" className="btn btn-sm doc-add" data-add-photo={b.id} onClick={() => input.current?.click()}>Add photos</button>
          {/* no `capture`: the phone offers its camera and its photos alike */}
          <input ref={input} type="file" accept="image/*" multiple hidden aria-label={`Choose photos for ${b.label}`} data-photo-input={b.id}
            onChange={e => { p.onPhotos(b.id, [...(e.target.files ?? [])]); e.target.value = ''; }} />
        </>
      )}
    </div>
  );
}

export function DocForm(p: FormProps) {
  return (
    <div className="doc-form" aria-label="The document">
      {askedSections(p.def, p.read).map(sec => (
        <section key={sec.id} className="doc-sec" data-doc-section={sec.id} aria-label={sec.title}>
          <h2 className="ln-h doc-sec-h">{sec.title}</h2>
          {sec.help && <p className="sub doc-sec-help">{sec.help}</p>}
          {sec.items.map(it => (isScalar(it) ? <Scalar key={it.id} f={it} p={p} /> : isList(it) ? <ListBox key={it.id} l={it} p={p} /> : isPhotos(it) ? <PhotosBox key={it.id} b={it} p={p} /> : null))}
        </section>
      ))}
    </div>
  );
}
