/* THE WEEK'S SCHEDULE, AND THE BUFFER IN FRONT OF THE CONSTRAINT — on a line's capacity page, beside *Will next week's orders fit?*
 * (FC-179, FC-043; knowledge/specs/FC-179-week-schedule.md, FC-043-drum-buffer-rope.md).
 *
 * The orders typed for the week are laid on the line's constraint in the order given (tools/plan/schedule): what starts and ends when,
 * what is late, what does not fit, what the changeovers take — in money where the line has it. Under it, *Protect the constraint*
 * (tools/plan/dbr): a time buffer in hours of the drum's running time, each order's place in it in words (plenty · watch · expedite — a
 * state colour only beside the word), what the rope says to release when, the stock the buffer holds, and how its arrivals tune it.
 * The orders live inside each product's capacity (no new record); a client sees all of it and changes nothing. */
import { useEffect, useMemo, useState } from 'react';
import type { Workspace } from '../../types';
import type { Standard } from '../linestandard/standard';
import type { ToolStudy } from '../../lib/study';
import { listAllStudies, onDataChange, putStandard } from '../../db';
import { useAccess } from '../../cloud/access';
import { can as canOf } from '../../lib/access';
import { DraftNumber } from '../../ui/Draft';
import { offerUndo } from '../../ui/Undo';
import { uid } from '../../lib/ids';
import { todayISO } from '../../lib/weeks';
import type { LineRead } from '../../lib/lineRead';
import { saveWeekPlanPdf } from '../../lib/report/planPaper';
import { bufferOf, planOf } from './planInputs';
import type { PlanOrder } from './types';
import './plan.css';

const big = (n: number) => Math.round(n).toLocaleString('en-GB');

export function PlanPanel({ products, read, ws, lineName }: { products: Standard[]; read: LineRead; ws?: Workspace; lineName?: string }) {
  const withCap = products.filter(p => !p.deletedAt && p.capacity?.stations.length);
  const [studies, setStudies] = useState<ToolStudy[]>([]);
  const [from, setFrom] = useState(todayISO());
  const [pick, setPick] = useState('');
  const [qty, setQty] = useState('');
  const [due, setDue] = useState('');
  useEffect(() => {
    let live = true;
    const load = async () => { const all = await listAllStudies(); if (live) setStudies(all.filter(s => s.tool === 'changeover' && !s.deletedAt)); };
    void load();
    const off = onDataChange(() => void load());
    return () => { live = false; off(); };
  }, []);
  const plan = useMemo(() => planOf({ products: withCap, studies, read, ...(ws ? { ws } : {}), from }), [withCap, studies, read, ws, from]);
  /* on a project the project's people may change its orders — a client reads (the same rule as the orders' weekly quantity beside it) */
  const pid = withCap.find(p => p.projectId)?.projectId;
  const jobCan = useAccess(pid ?? '');
  const mayAny = (pid ? jobCan : canOf('owner')).edit;
  const chosen = withCap.find(p => p.id === (pick || withCap[0]?.id));
  if (!withCap.length) return null;
  const sched = plan.sched;
  const nextSeq = Math.max(0, ...plan.orders.map(o => o.order.seq)) + 1;

  const put = (p: Standard, orders: PlanOrder[], say?: string, before?: PlanOrder[]) => {
    const was = before ?? p.capacity?.orders;
    void putStandard({ ...p, capacity: { ...(p.capacity as NonNullable<Standard['capacity']>), orders } });
    if (say) offerUndo(say, async () => { await putStandard({ ...p, capacity: { ...(p.capacity as NonNullable<Standard['capacity']>), ...(was ? { orders: was } : { orders: undefined }) } }); });
  };
  const add = () => {
    const q = Number(qty.replace(/,/g, ''));
    if (!chosen || !(q > 0)) return;
    put(chosen, [...(chosen.capacity?.orders ?? []), { id: uid(), qty: q, seq: nextSeq, ...(due ? { due } : {}) }], `Order added — ${big(q)} ${chosen.product}`);
    setQty(''); setDue('');
  };
  const swap = (id: string, dir: -1 | 1) => {
    const i = plan.orders.findIndex(o => o.order.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= plan.orders.length) return;
    const a = plan.orders[i], b = plan.orders[j];
    const set = (p: Standard, oid: string, seq: number) => put(p, (p.capacity?.orders ?? []).map(o => (o.id === oid ? { ...o, seq } : o)));
    if (a.product.id === b.product.id) put(a.product, (a.product.capacity?.orders ?? []).map(o => (o.id === a.order.id ? { ...o, seq: b.order.seq } : o.id === b.order.id ? { ...o, seq: a.order.seq } : o)));
    else { set(a.product, a.order.id, b.order.seq); set(b.product, b.order.id, a.order.seq); }
  };
  const patch = (p: Standard, id: string, change: Partial<PlanOrder>) => put(p, (p.capacity?.orders ?? []).map(o => (o.id === id ? { ...o, ...change } : o)));
  const remove = (p: Standard, o: PlanOrder) => put(p, (p.capacity?.orders ?? []).filter(x => x.id !== o.id), `Order taken off — ${big(o.qty)} ${p.product}`, p.capacity?.orders);
  const setBuffer = (h: number | undefined) => { for (const p of withCap) void putStandard({ ...p, capacity: { ...(p.capacity as NonNullable<Standard['capacity']>), bufferH: h } }); };
  const arrived = (p: Standard, o: PlanOrder, consumed: number) => patch(p, o.id, { arrived: { at: Date.now(), consumed } });
  const dbrRow = (id: string) => plan.dbr?.rows.find(r => r.orderId === id);

  return (
    <details className="lch-lev pln" open={plan.orders.length > 0}>
      <summary className="lch-h">The week’s schedule — will every order make its day? <span className="sub">type the orders in the order the line will run them</span></summary>
      <p className="pln-says" aria-live="polite"><b>{plan.needs ?? sched?.says}</b></p>
      <label className="pln-from sub">The week starts <input type="date" className="text-input" value={from} aria-label="The first running day" onChange={e => e.target.value && setFrom(e.target.value)} />
        {sched ? <span> · it runs {plan.days.length} day{plan.days.length === 1 ? '' : 's'} — {plan.planned.says}</span> : null}</label>
      {plan.orders.length > 0 && (
        <ol className="pln-orders" aria-label="The week’s orders, in order">
          {plan.orders.map(({ product, order }, i) => {
            const row = sched?.rows.find(r => r.orderId === order.id);
            const z = dbrRow(order.id);
            return (
              <li key={order.id} className={'pln-order' + (row && ((row.lateDays ?? 0) > 0 || row.spills) ? ' is-late' : '')}>
                <span className="pln-n">{i + 1}</span>
                <span className="pln-p"><b>{product.product}</b>{row ? <span className="sub"> {sched?.lines[sched.rows.indexOf(row)]?.replace(/^\d+\. [^—]*— /, '')}</span> : <span className="sub"> — no speed worked out for it</span>}</span>
                {mayAny && (
                  <span className="pln-ctl">
                    <DraftNumber className="text-input pln-qty" value={order.qty} label={`Quantity of order ${i + 1}, ${product.product}`} onSave={v => v != null && v > 0 && patch(product, order.id, { qty: v })} />
                    <input type="date" className="text-input pln-due" value={order.due ?? ''} aria-label={`Due day of order ${i + 1}`} onChange={e => patch(product, order.id, e.target.value ? { due: e.target.value } : { due: undefined })} />
                    <button type="button" className="btn btn-sm" aria-label={`Move order ${i + 1} up`} disabled={i === 0} onClick={() => swap(order.id, -1)}>▲</button>
                    <button type="button" className="btn btn-sm" aria-label={`Move order ${i + 1} down`} disabled={i === plan.orders.length - 1} onClick={() => swap(order.id, 1)}>▼</button>
                    <button type="button" className="linkish" aria-label={`Take order ${i + 1} off`} onClick={() => remove(product, order)}>Take off</button>
                  </span>
                )}
                {plan.bufferH && z && <span className={'pln-zone is-' + z.tone} role="status">{z.word}</span>}
              </li>
            );
          })}
        </ol>
      )}
      {mayAny && (
        <form className="pln-add" onSubmit={e => { e.preventDefault(); add(); }}>
          <label className="field"><span className="field-label">Product</span>
            <select className="text-input" value={chosen?.id ?? ''} aria-label="Product ordered" onChange={e => setPick(e.target.value)}>{withCap.map(p => <option key={p.id} value={p.id}>{p.product}</option>)}</select></label>
          <label className="field"><span className="field-label">Quantity ({read.unit})</span>
            <input className="text-input" inputMode="numeric" value={qty} placeholder="e.g. 54,000" aria-label="Quantity ordered" onChange={e => setQty(e.target.value)} /></label>
          <label className="field"><span className="field-label">Due</span>
            <input type="date" className="text-input" value={due} aria-label="Day the order is due" onChange={e => setDue(e.target.value)} /></label>
          <button type="submit" className="btn" disabled={!(Number(qty.replace(/,/g, '')) > 0)}>Add the order</button>
        </form>
      )}
      {sched && sched.rows.length > 0 && (
        <>
          {sched.moneyLines.map(m => <p key={m} className="pln-money">{m}</p>)}
          {sched.missing.map(m => <p key={m} className="sub pln-missing">{m}</p>)}
          <p className="sub pln-limit">Laid end to end on the constraint in the order given, at the rate the line can be planned on, a changeover between two products; a day’s running time is the minutes its pattern gives. Which order is best — earliest due day, shortest run, fewest changeovers — is the planner’s; this says what each choice does.</p>
        </>
      )}

      {/* PROTECT THE CONSTRAINT — drum, buffer, rope */}
      <details className="pln-dbr" open={!!plan.bufferH}>
        <summary className="lch-h">Protect the constraint — a time buffer before it <span className="sub">drum, buffer, rope</span></summary>
        <label className="pln-buf field"><span className="field-label">The buffer, hours of the drum’s running time</span>
          {mayAny ? <DraftNumber className="text-input pln-bufin" value={plan.bufferH ?? bufferOf(withCap)} placeholder="e.g. 6" label="The buffer in hours" onSave={setBuffer} /> : <b>{plan.bufferH ?? '—'}</b>}
          <span className="sub">A start: about half the current lead time from release to the constraint — then tuned from the arrivals below.</span></label>
        {!plan.bufferH && <p className="sub">Give the buffer to see each order’s place in it.</p>}
        {plan.dbr && (
          <>
            <p className={'pln-dsays is-' + plan.dbr.tone} aria-live="polite"><b>{plan.dbr.says}</b></p>
            <ul className="pln-drows">
              {plan.dbr.rows.filter(r => r.zone !== 'done').map(r => {
                const o = plan.orders.find(x => x.order.id === r.orderId);
                return (
                  <li key={r.orderId} className={'pln-drow is-' + r.tone}>
                    <span className={'pln-zone is-' + r.tone}>{r.word}</span>
                    <span className="pln-dtext">{r.says}</span>
                    {mayAny && o && (
                      <span className="pln-dctl">
                        <label className="sub">Done <DraftNumber className="text-input pln-done" value={o.order.done} placeholder="0" label={`Percent of ${o.product.product} done`} onSave={v => patch(o.product, o.order.id, { done: v == null ? undefined : Math.max(0, Math.min(100, v)) })} />%</label>
                        {!o.order.arrived && r.zone !== 'here' && r.consumed != null && <button type="button" className="btn btn-sm" aria-label={`${o.product.product} has arrived at the constraint`} onClick={() => arrived(o.product, o.order, r.consumed ?? 0)}>Arrived</button>}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <ul className="pln-dlines">{plan.dbr.lines.filter(l => !plan.dbr?.rows.some(r => l.startsWith(r.product + ' —'))).map(l => <li key={l}>{l}</li>)}</ul>
            {plan.dbr.missing.map(m => <p key={m} className="sub pln-missing">{m}</p>)}
            <p className="sub pln-limit">Time here is the drum’s running time, not the clock. The drum is where the orders marked done leave it. A hole in the drum is the run it cannot make; a share of the buffer is a person’s tap, never a machine’s.</p>
          </>
        )}
      </details>
      {sched && sched.rows.length > 0 && (
        <button type="button" className="btn btn-sm pln-paper" onClick={() => void saveWeekPlanPdf({ line: lineName ?? 'This line', printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), plan })}>The week’s plan on paper</button>
      )}
    </details>
  );
}
