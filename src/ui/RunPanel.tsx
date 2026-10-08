/* THE RUN — a performance run's products and the numbers each is accepted
 * on (lib/run).
 *
 * Rowland, 7 October: "Commissioning runs are MULTIPLE PRODUCTS. While I'm
 * prepping I want to plan: this is the product I'm going to run — Save. Next
 * one — Save. Then when I'm on the line all I do is put in the numbers at the
 * end, and it calculates for me whether it passed or failed. I don't need to
 * do that myself."
 *
 * One list, read the same on the test's page and in its drawer:
 *
 *   THE TOTALS LINE   where the run is, in words — "2 of 3 products run —
 *                     1 passed, 1 didn't pass" — and the test's verdict,
 *                     which the numbers set (lib/run patchRuns)
 *   A ROW PER PRODUCT what it is judged on, then the numbers off the
 *                     machine: still to run, the boxes are out and nothing
 *                     else is asked; judged, the figures, Passed or Didn't
 *                     pass in words and colour, and what fell short
 *   ADD A PRODUCT RUN the product and what it is judged on — Save, and the
 *                     form is ready for the next, the agreed numbers carried
 *                     over from the one before
 *
 * Who may do what (lib/access): a team member writes a product's agreed
 * numbers the first time, never changes them after (the database keeps them
 * so — PERFORMANCE_RUNS.sql); taking a product off the list is the owner's;
 * a client reads.
 *
 * Colour follows the house rules: only a number that missed what was agreed
 * carries red; met is a quiet green; still to run is indigo; nothing agreed
 * is plain ink. */
import { useRef, useState } from 'react';
import type { Test, TestItem } from '../lib/testing';
import { OUTCOME_WORD } from '../lib/testing';
import {
  agreedWords, cleanRun, productFigures, productName, productRuns, patchRuns, readRuns, runAgain, runsSay, withDay,
  type ProductReading, type ProductRun, type RunAgreed, type RunDay,
} from '../lib/run';
import { mayWriteAgreement, type Can } from '../lib/access';
import { readNumber } from '../lib/format';
import { uid } from '../lib/ids';
import { niceDay, todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { DraftField, DraftNumber } from './Draft';
import { offerUndo } from './Undo';

type Patch = (fn: (cur: Test) => Partial<Test>) => void;

const DAY_BOXES: { k: keyof RunDay; label: string; unit?: string; hint: string; ph: string }[] = [
  { k: 'minutes', label: 'Ran for', unit: 'min', hint: 'Ran for, minutes', ph: 'e.g. 60' },
  { k: 'packs', label: 'Packs made', hint: 'Packs made, on the counter', ph: 'e.g. 3600' },
  { k: 'rejects', label: 'Rejects', hint: 'Rejects', ph: 'e.g. 0' },
  { k: 'speed', label: 'Ran at', unit: 'ppm', hint: 'Ran at, packs a minute', ph: 'e.g. 62' },
  { k: 'stops', label: 'Stood', unit: 'min', hint: 'Stood, minutes', ph: 'e.g. 0' },
];

/** THE RUN — the totals line, a row per product, and the form that adds the
 *  next. `compact` for the drawer: the same rows, narrower. */
export function RunProducts({ t, can, patch, compact, onProblem, problemsOf }: {
  t: Test; can: Can; patch: Patch; compact?: boolean;
  /** HIT A PROBLEM ON ONE PRODUCT — the record's own write-up, opened for
   *  that product's run (ui/RecordDrawer), as a program line hits one. */
  onProblem?: (run: ProductRun) => void;
  /** The problems written on a product's run (lib/programRun problemsOnRun). */
  problemsOf?: (runId: string) => TestItem[];
}) {
  const rr = readRuns(t);
  /* THE BOXES STAY OUT on a row that was still to run when the run was
     opened, or was added since — the last number typed must not fold them
     away under the fingers. */
  const [boxes, setBoxes] = useState<Set<string>>(() => new Set(rr.products.filter(p => p.state === 'toRun' || p.state === 'partial').map(p => p.run.id)));
  /* One row open for changing its plan at a time, with what was agreed on it
     at that moment — a team member's own first numbers do not lock under
     their fingers, and after that they are the owner's. */
  const [changing, setChanging] = useState<{ id: string; agreed?: RunAgreed } | null>(null);
  const [adding, setAdding] = useState(() => can.edit && rr.products.length === 0);
  const today = todayISO();
  const setRuns = (fn: (runs: ProductRun[]) => ProductRun[]) => patch(cur => patchRuns(cur, fn(productRuns(cur)), today));
  const setRun = (id: string, fn: (p: ProductRun) => ProductRun) => setRuns(rs => rs.map(p => (p.id === id ? fn(p) : p)));

  const remove = (p: ProductRun) => {
    const at = productRuns(t).findIndex(x => x.id === p.id);
    setRuns(rs => rs.filter(x => x.id !== p.id));
    setChanging(null);
    offerUndo(`Took ${productName(p)} off the run`, async () => {
      setRuns(rs => (rs.some(x => x.id === p.id) ? rs : [...rs.slice(0, at), p, ...rs.slice(at)]));
    });
  };
  /* RUN IT AGAIN — a product that didn't pass, planned again under it on
     the same agreed numbers: the later row is the one that counts. */
  const again = (p: ProductRun) => {
    const id = uid();
    setRuns(rs => runAgain(rs, [p.id], () => id));
    setBoxes(b => new Set(b).add(id));
  };

  const auto = rr.verdict;
  return (
    <div className={'pr' + (compact ? ' is-compact' : '')}>
      {rr.products.length > 0 && (
        <p className={'pr-say' + (auto === 'passed' ? ' is-met' : auto === 'failed' ? ' is-short' : '')}>
          {runsSay(rr)}
          {/* THE TEST'S VERDICT, said where it came from. */}
          {t.outcome !== 'planned' && auto !== 'planned' && (
            <span className="pr-verdict-note">
              {t.outcome === auto ? ` The test is marked ${OUTCOME_WORD[t.outcome].toLowerCase()} from the numbers.`
                : ` Marked ${OUTCOME_WORD[t.outcome].toLowerCase()} by hand — the numbers say ${OUTCOME_WORD[auto].toLowerCase()}.`}
            </span>
          )}
        </p>
      )}
      {rr.products.length > 0 && (
        <ol className="pr-list">
          {rr.products.map(p => (
            <ProductRow key={p.run.id} p={p} can={can} compact={compact} programsHref={`/project/${t.projectId}/programs`}
              problems={problemsOf?.(p.run.id) ?? []} onProblem={onProblem && !p.rerun ? () => onProblem(p.run) : undefined}
              boxes={can.edit && (boxes.has(p.run.id) || p.state === 'toRun' || p.state === 'partial')}
              changing={changing?.id === p.run.id ? changing : null}
              onChange={() => setChanging(c => (c?.id === p.run.id ? null : { id: p.run.id, agreed: p.run.agreed }))}
              onDay={(k, v) => setRun(p.run.id, x => withDay(x, k, v, today))}
              onPlan={fn => setRun(p.run.id, fn)}
              onRemove={() => remove(p.run)}
              onAgain={() => again(p.run)} />
          ))}
        </ol>
      )}
      {can.edit && (adding
        ? <AddProduct before={productRuns(t)[productRuns(t).length - 1]} first={rr.products.length === 0}
            onSave={(product, agreed) => {
              const id = uid();
              setRuns(rs => [...rs, { id, product, ...(agreed ? { agreed } : {}) }]);
              setBoxes(b => new Set(b).add(id));
            }}
            onDone={rr.products.length ? () => setAdding(false) : undefined} />
        : <button type="button" className="btn btn-sm pr-add-open" onClick={() => setAdding(true)}>+ Add a product run</button>)}
      {!can.edit && rr.products.length === 0 && <p className="sub">No products planned on this run yet.</p>}
    </div>
  );
}

/** ONE PRODUCT — what it is judged on, the numbers, what they say. */
function ProductRow({ p, can, compact, boxes, changing, onChange, onDay, onPlan, onRemove, onAgain, programsHref, problems = [], onProblem }: {
  p: ProductReading; can: Can; compact?: boolean; boxes: boolean;
  /** Where its program is, when it was planned from one. */
  programsHref?: string;
  problems?: TestItem[];
  onProblem?: () => void;
  changing: { id: string; agreed?: RunAgreed } | null;
  onChange: () => void;
  onDay: (k: keyof RunDay, v: number | undefined) => void;
  onPlan: (fn: (p: ProductRun) => ProductRun) => void;
  onRemove: () => void;
  onAgain: () => void;
}) {
  const f = productFigures(p);
  const { run, r, state } = p;
  const open = boxes || !!changing;
  const lockAgreed = !mayWriteAgreement(can, agreedWords(changing?.agreed ?? {}) ? 'agreed' : '');
  const setAgreed = (k: keyof RunAgreed) => (v?: number) => onPlan(x => {
    const agreed = cleanRun({ ...(x.agreed ?? {}), [k]: v });
    return { id: x.id, product: x.product, ...(x.program ? { program: x.program } : {}), ...(x.note ? { note: x.note } : {}), ...(agreed ? { agreed } : {}), ...(x.day ? { day: x.day } : {}), ...(x.ranOn ? { ranOn: x.ranOn } : {}) };
  });
  const tone = (t: string) => (t ? ` is-${t}` : '');
  return (
    <li className={'pr-row is-' + state + (p.rerun ? ' is-rerun' : '')}>
      <div className="pr-top">
        <b className="pr-name">{productName(run)}</b>
        {/* PLANNED FROM ITS PROGRAM (lib/programRun) — back to it. */}
        {run.program && programsHref && <button type="button" className="cw-link pr-prog" onClick={() => nav(programsHref)}>its program ›</button>}
        <span className={'pr-word is-' + (p.rerun ? 'rerun' : state)}>{p.rerun ? `${p.word} — run again below` : p.word}</span>
      </div>
      <p className="pr-agreed">{f.agreed ? <>Judged on {f.agreed}</> : 'Nothing agreed to judge it on yet'}{run.ranOn ? ` · ran ${niceDay(run.ranOn)}` : ''}</p>

      {changing && (
        <div className="pr-plan">
          <label className="cw-f pr-f-wide"><span>Product</span>
            <DraftField value={run.product} placeholder="what goes down the machine" onSave={v => onPlan(x => ({ ...x, product: v.trim() }))} /></label>
          {lockAgreed ? (
            <p className="sub tw-note pr-f-wide">What it is judged on is agreed — only the owner changes it.</p>
          ) : <>
            <label className="cw-f"><span>Net rate <span className="cw-f-opt">ppm</span></span>
              <DraftNumber className="text-input" value={run.agreed?.rate} placeholder="e.g. 60" label="Agreed net rate, packs a minute" onSave={setAgreed('rate')} /></label>
            <label className="cw-f"><span>For <span className="cw-f-opt">min</span></span>
              <DraftNumber className="text-input" value={run.agreed?.minutes} placeholder="e.g. 60" label="Agreed run length, minutes" onSave={setAgreed('minutes')} /></label>
            <label className="cw-f"><span>Rejects at most <span className="cw-f-opt">%</span></span>
              <DraftNumber className="text-input" value={run.agreed?.rejectsMax} placeholder="e.g. 1" label="Most rejects allowed, per cent" onSave={setAgreed('rejectsMax')} /></label>
          </>}
        </div>
      )}

      <div className={'pr-figs' + (compact ? ' is-compact' : '')}>
        <div className={'pr-fig is-net' + tone(f.netTone)}>
          <span className="pr-l">Net rate</span>
          <b className="pr-v">{f.net}</b>
        </div>
        {DAY_BOXES.map(b => {
          const v = r.day[b.k];
          const t = b.k === 'rejects' ? f.rejectsTone : b.k === 'minutes' ? f.lengthTone : '';
          return open && can.edit ? (
            <label key={b.k} className={'pr-fig is-box' + tone(t)}>
              <span className="pr-l">{b.label}{b.unit && <span className="cw-f-opt"> {b.unit}</span>}</span>
              <DraftNumber className="text-input" value={v} placeholder={b.ph} label={`${productName(run)} — ${b.hint}`} onSave={x => onDay(b.k, x)} />
            </label>
          ) : (
            <div key={b.k} className={'pr-fig' + tone(t)}>
              <span className="pr-l">{b.label}</span>
              <b className="pr-v">{v != null ? (b.k === 'rejects' ? f.rejects : `${v.toLocaleString('en-GB')}${b.unit ? ` ${b.unit}` : ''}`) : '—'}</b>
            </div>
          );
        })}
      </div>

      {/* WHAT WAS SEEN on this product's run — its own words, as a program's
          status carries them. */}
      {can.edit && (open || run.note) ? (
        <label className="cw-f pr-note-f"><span>What was seen</span>
          <DraftField value={run.note ?? ''} max={400} placeholder="e.g. Seals good at 45 ppm; film tracking drifts after 40 minutes"
            ariaLabel={`${productName(run)} — what was seen`} onSave={v => onPlan(x => { const note = v.trim(); const { note: _old, ...rest } = x; return note ? { ...rest, note } : rest; })} /></label>
      ) : run.note ? <p className="pr-note">{run.note}</p> : null}
      {/* ITS PROBLEMS, as a branch under it — what, and how each stands. */}
      {problems.length > 0 && (
        <ul className="spp-probs pr-probs">
          {problems.map(x => (
            <li key={x.id} className={x.doneAt == null ? 'is-open' : 'is-sorted'}>
              <b>Problem:</b> {x.what}{x.hoursLost ? ` · ${x.hoursLost} h lost` : ''} · {x.doneAt == null ? 'open' : 'sorted'}
            </li>
          ))}
        </ul>
      )}
      {state === 'short' && p.gap && <p className="pr-gap">Short: {p.gap}</p>}
      {state === 'partial' && p.missing.length > 0 && <p className="pr-missing">Put in the {p.missing.join(' and ')} and it is judged.</p>}
      {state === 'unjudged' && <p className="pr-missing">No rate agreed, so the numbers cannot judge it{can.agree ? ' — Change to agree one' : ''}.</p>}

      {can.edit && (
        <div className="pr-acts">
          {state === 'short' && !p.rerun && <button type="button" className="btn btn-sm" onClick={onAgain}>Run it again</button>}
          {onProblem && <button type="button" className="btn btn-sm spp-prob" onClick={onProblem}>Hit a problem</button>}
          <button type="button" className="cw-link" aria-expanded={!!changing} onClick={onChange}>{changing ? 'Done' : 'Change'}</button>
          {changing && can.remove && <button type="button" className="cw-link pr-remove" onClick={onRemove}>Take it off the run</button>}
        </div>
      )}
    </li>
  );
}

/** ADD A PRODUCT RUN — the product and what it is judged on. Save keeps the
 *  form out for the next, its agreed numbers carried over from the one
 *  before, so planning five products is five saves. */
function AddProduct({ before, first, onSave, onDone }: {
  before?: ProductRun; first: boolean;
  onSave: (product: string, agreed?: RunAgreed) => void;
  /** Absent while the run has no products — the form is the run's start. */
  onDone?: () => void;
}) {
  const carry = (k: keyof RunAgreed) => (before?.agreed?.[k] != null ? String(before.agreed[k]) : '');
  const [product, setProduct] = useState('');
  const [rate, setRate] = useState(carry('rate'));
  const [minutes, setMinutes] = useState(carry('minutes'));
  const [rejectsMax, setRejectsMax] = useState(carry('rejectsMax'));
  const [said, setSaid] = useState('');
  const name = useRef<HTMLInputElement>(null);
  const save = () => {
    const p = product.trim();
    if (!p) { name.current?.focus(); return; }
    onSave(p, cleanRun({ rate: readNumber(rate), minutes: readNumber(minutes), rejectsMax: readNumber(rejectsMax) }));
    setSaid(`${p} added — next product?`);
    setProduct('');
    name.current?.focus();
  };
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save(); } };
  return (
    <form className="pr-add" onSubmit={e => { e.preventDefault(); save(); }}>
      <span className="pr-add-h">{first ? 'Plan the run — a product at a time' : 'Add a product run'}</span>
      <label className="cw-f pr-f-wide"><span>Product</span>
        <input ref={name} className="text-input" value={product} placeholder="e.g. Finest Red 2kg" aria-label="Product to run"
          onChange={e => { setProduct(e.target.value); setSaid(''); }} onKeyDown={enter} /></label>
      <label className="cw-f"><span>Net rate <span className="cw-f-opt">ppm</span></span>
        <input className="text-input" inputMode="decimal" value={rate} placeholder="e.g. 60" aria-label="Agreed net rate, packs a minute" onChange={e => setRate(e.target.value)} onKeyDown={enter} /></label>
      <label className="cw-f"><span>For <span className="cw-f-opt">min</span></span>
        <input className="text-input" inputMode="decimal" value={minutes} placeholder="e.g. 60" aria-label="Agreed run length, minutes" onChange={e => setMinutes(e.target.value)} onKeyDown={enter} /></label>
      <label className="cw-f"><span>Rejects at most <span className="cw-f-opt">%</span></span>
        <input className="text-input" inputMode="decimal" value={rejectsMax} placeholder="e.g. 1" aria-label="Most rejects allowed, per cent" onChange={e => setRejectsMax(e.target.value)} onKeyDown={enter} /></label>
      <div className="pr-add-acts">
        <button type="submit" className="btn btn-primary btn-sm" disabled={!product.trim()}>Save</button>
        {onDone && <button type="button" className="btn btn-sm" onClick={onDone}>Done</button>}
        {said && <span className="sub pr-said" role="status">{said}</span>}
      </div>
    </form>
  );
}

/** THE RUN IN THE DRAWER — the same list, compact. */
export function RunBlock({ t, can, patch, onProblem, problemsOf }: {
  t: Test; can: Can; patch: Patch; onProblem?: (run: ProductRun) => void; problemsOf?: (runId: string) => TestItem[];
}) {
  return (
    <div className="rd-blk run-blk">
      <small>The run</small>
      <RunProducts t={t} can={can} patch={patch} compact onProblem={onProblem} problemsOf={problemsOf} />
    </div>
  );
}
