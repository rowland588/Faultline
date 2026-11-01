/* PRODUCT ON HOLD — a line's register of holds (FC-135; knowledge/specs/FC-135-product-on-hold.md).
 *
 * The list is the registers (one a line); a register's page is the lean page: the band and its verdict, the tiles, what it says and
 * what it means in money, then the holds — On hold now (one card each: its number, its product and lot, how much, why, how long, who
 * decides by when, what is tied up; Decide), Decided (each fate, who, on what grounds), why holds happen, the action plan (each hold
 * owed a decision) and the closing line. A failed check raises a hold in one tap from here. A client reads and changes nothing. */
import { useEffect, useMemo, useState } from 'react';
import { listStudiesForLine, onDataChange } from '../../db';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { readNumber, plural } from '../../lib/format';
import { uid, now as clock } from '../../lib/ids';
import { bandPage } from '../../lib/lean';
import { todayISO } from '../../lib/weeks';
import { useFactoryLines } from '../../lib/useFactoryLines';
import type { ToolStudy } from '../../lib/study';
import { LeanActions, LeanClosing, LeanPanel, LeanTiles } from '../../ui/Lean';
import { StudyBand } from '../../ui/StudyActs';
import { WhereItSits } from '../../ui/StudyPlace';
import { Sheet } from '../../ui/Sheet';
import { offerUndo } from '../../ui/Undo';
import { defOf } from '../checks/registry';
import { logFigures } from '../checks/figures';
import { when as whenWords } from '../checks/checks';
import { useLogCtx, useNow, useSnags } from '../checks/useLogData';
import { NewOnLine, RecordFrame, RegisterList, type RowSays } from '../registers/Shell';
import { DISPOSITIONS, UNITS, costEachOf, dispositionWord, gbp, heldQty, holdActions, holdClosing, holdFigures, holdMoney, holdSays, holdWords, label, liveHolds, nextNo, outcomesOf, qtyWords, tiedUpOf, REPEAT_DAYS, REPEAT_HOLDS, type AgreedHolds, type Disposition, type Hold, type HoldCtx, type HoldFrom, type HoldUnit } from './hold';
import { holdTiles } from './holdLean';
import { HOLD_LIMITS, holdStudySays } from './holdPaper';
import { addHold, addOutcome, changeHold, strikeHold, strikeOutcome } from './store';

/** A new register: one a line. */
export function newHoldStudy(o: { name: string; workspaceId: string; projectId?: string; now: number }): ToolStudy {
  return { id: uid(), tool: 'ledger', name: o.name, workspaceId: o.workspaceId, ...(o.projectId ? { projectId: o.projectId } : {}), agreed: { holds: { since: o.now } }, facts: { holds: [] }, uses: [], startedAt: o.now, createdAt: o.now, updatedAt: o.now };
}

/** What a register says of itself on a list, and in the line's words. */
export function holdRowSays(s: ToolStudy, ctx: HoldCtx, today: string = todayISO()): RowSays {
  const said = holdStudySays(s, ctx, today);
  return { text: said.text, tone: said.tone, where: `${plural(liveHolds(s.facts.holds).length, 'hold')} on the register` };
}

export function HoldScreen({ id }: { id?: string }) {
  if (id) return <RecordFrame id={id} regKey="holds">{p => <Register s={p.s} can={p.can} />}</RecordFrame>;
  return <HoldList />;
}

function HoldList() {
  const lines = useFactoryLines();
  return (
    <RegisterList regKey="holds" title="Product on hold" eyebrow="PRODUCT ON HOLD · FC-135"
      says="Product set aside with a number, a reason and someone to decide — what is on hold, since when, why and what it has cost. One register a line."
      empty="No hold register is started yet. A register is a line’s: start one and raise a hold when a check fails or a problem sets product aside."
      newLabel="New register"
      rowOf={s => { const w = lines.find(l => l.id === s.workspaceId); return holdRowSays(s, { materialsPerPack: w?.materialsPerPack, marginPerPack: w?.marginPerPack }); }}
      renderNew={p => <NewOnLine {...p} title="New register of holds" regKey="holds" make={newHoldStudy} nameHint={n => `Product on hold — ${n}`} noun="register" />} />
  );
}

/* ------------------------------------------------------------------------------------------------ a failed check, offered as a hold */

interface Failed { key: string; from: HoldFrom; reason: string; packs?: number; words: string }

/** The failed checks on this line that no hold has been raised from — each a hold in one tap. */
function useFailedChecks(wsId: string | undefined, raised: Set<string>, now: number): Failed[] {
  const ctx = useLogCtx(wsId);
  const snags = useSnags();
  const [logs, setLogs] = useState<ToolStudy[]>([]);
  useEffect(() => {
    if (!wsId) return;
    let live = true;
    const load = () => void listStudiesForLine(wsId).then(r => { if (live) setLogs(r.filter(s => s.tool === 'log' && !s.deletedAt && !!s.agreed?.log)); }).catch(() => {});
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [wsId]);
  return useMemo(() => logs.flatMap(s => {
    const def = defOf(s.agreed?.log?.key);
    const f = def ? logFigures({ s, def, now, ctx, snags }) : undefined;
    return (f?.failures ?? []).filter(r => !r.f.continues && !raised.has(r.f.result.id)).map((r): Failed => {
      const when = whenWords(r.f.result.at, now);
      return { key: r.f.result.id, from: { kind: 'check', studyId: s.id, checkId: r.f.check.id, resultId: r.f.result.id, words: `${r.f.check.name} failed ${when}` },
        reason: `${r.f.check.name} failed${r.f.result.note ? ` — ${r.f.result.note}` : ''}`, ...(r.hold.packs ? { packs: Math.round(r.hold.packs) } : {}), words: `${r.f.check.name}, ${when}${r.hold.packs ? ` — ${Math.round(r.hold.packs).toLocaleString('en-GB')} packs since the last good check` : ''}` };
    });
  }), [logs, now, ctx, snags, raised]);
}

/* ------------------------------------------------------------------------------------------------ a register's page */

function Register({ s, can }: { s: ToolStudy; can: ReturnType<typeof import('../../lib/access').can> }) {
  const line = useFactoryLines(s.workspaceId).find(l => l.id === s.workspaceId);
  const ctx: HoldCtx = { materialsPerPack: line?.materialsPerPack, marginPerPack: line?.marginPerPack };
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  const now = useNow(60_000, s.updatedAt);
  const today = todayISO(new Date(now));
  const agreed: AgreedHolds = s.agreed?.holds ?? { since: s.startedAt };
  const holds = liveHolds(s.facts.holds);
  const f = holdFigures(s.facts.holds, today, ctx, agreed);
  const said = holdSays(f);
  const closed = !!s.closedAt;
  const mayEdit = can.edit && !closed;
  const [raising, setRaising] = useState<{ was?: Hold; from?: Failed } | null>(null);
  const [deciding, setDeciding] = useState<Hold | null>(null);
  const [settings, setSettings] = useState(false);
  const raised = useMemo(() => new Set(holds.flatMap(h => (h.from?.resultId ? [h.from.resultId] : []))), [holds]);
  const failed = useFailedChecks(s.workspaceId, raised, now);
  const page = bandPage('PRODUCT ON HOLD', s, said.verdict, said.tone, [['Line', line?.name ?? 'No line'], ['Holds', String(f.holds)]]);
  const money = holdMoney(f, agreed);
  const closing = holdClosing(f);
  const plan = holdActions(f, today);
  const strike = (h: Hold) => {
    void strikeHold(s.id, h.id, true);
    offerUndo(`${label(h)} struck off the register`, async () => { await strikeHold(s.id, h.id, false); });
  };
  return (
    <div className="wrap ie hd" data-hold-register>
      <StudyBand page={page} s={s} what="Product on hold" canEdit={mayEdit} canRemove={can.remove}
        primary={mayEdit ? { label: 'Raise a hold', run: () => setRaising({}) } : undefined}
        extra={can.agree && !closed ? [{ label: 'Who decides, and the carrying rate', run: () => setSettings(true) }] : undefined} />
      <WhereItSits s={s} can={can} />
      <LeanTiles tiles={holdTiles(f)} className="ie-strip hd-tiles" />
      <div className="ie-says"><p className={'ie-say is-' + said.tone} data-says>{said.text}</p></div>
      {money.map(m => <p key={m} className="sub hd-money" data-money>{m}</p>)}

      {mayEdit && failed.length > 0 && (
        <LeanPanel title="Failed checks with nothing on hold" className="hd-failed">
          <ul className="hd-fl" aria-label="Failed checks">
            {failed.map(x => <li key={x.key} data-failed={x.key}><span>{x.words}</span> <button type="button" className="btn btn-sm" aria-label={`Raise a hold — ${x.from.words}`} onClick={() => setRaising({ from: x })}>Put it on hold</button></li>)}
          </ul>
        </LeanPanel>
      )}

      <section className="hd-sec" aria-label="On hold now" data-sec="open">
        <h2 className="lg-h2">On hold now <span className="sub">{plural(f.open.length, 'hold')}</span></h2>
        {f.open.length === 0 && <p className="sub" data-none-open>{f.holds ? 'Nothing is on hold.' : 'Nothing has been put on hold yet.'}</p>}
        <ul className="hd-cards">
          {f.open.map(h => {
            const w = holdWords(h, today, ctx);
            const cost = costEachOf(h, ctx);
            return (
              <li key={h.id} className={'hd-card is-' + w.tone} data-hold={h.id} data-no={label(h)}>
                <div className="hd-card-h"><b className="hd-no">{label(h)}</b> <b>{h.product || 'Product'}</b>{h.lot ? <span className="sub"> · lot {h.lot}</span> : null}{h.where ? <span className="sub"> · {h.where}</span> : null}</div>
                <p className={'ie-tone is-' + w.tone} data-hold-words>{w.text}</p>
                <p className="sub">Why: {h.reason || 'not said'}{h.from?.words ? ` · from ${h.from.words}` : ''}</p>
                <p className="sub">{h.owner?.trim() ? `Decides: ${h.owner.trim()}` : 'Nobody is named to decide'} · raised {h.raisedOn}{h.raisedBy ? ` by ${h.raisedBy}` : ''}{cost?.from === 'line' ? ' · cost a piece is the line’s materials a pack' : ''}</p>
                {outcomesOf(h).length > 0 && <p className="sub">Already decided: {outcomesOf(h).map(o => `${o.qty.toLocaleString('en-GB')} ${dispositionWord(o.disposition)}`).join(', ')}</p>}
                {mayEdit && (
                  <div className="hd-act">
                    <button type="button" className="btn btn-primary" aria-label={`Decide — ${label(h)}`} onClick={() => setDeciding(h)}>Decide</button>
                    <button type="button" className="linkish" aria-label={`Edit — ${label(h)}`} onClick={() => setRaising({ was: h })}>Edit</button>
                    {can.remove && <button type="button" className="linkish is-danger" aria-label={`Strike — ${label(h)}`} onClick={() => strike(h)}>Strike</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="hd-sec" aria-label="Decided" data-sec="decided">
        <h2 className="lg-h2">Decided <span className="sub">{plural(f.closed.length, 'hold')}</span></h2>
        {f.closed.length === 0 && <p className="sub" data-none-decided>Nothing has been decided in full yet.</p>}
        <ul className="hd-cards">
          {f.closed.map(h => (
            <li key={h.id} className="hd-card is-g" data-hold={h.id} data-no={label(h)}>
              <div className="hd-card-h"><b className="hd-no">{label(h)}</b> <b>{h.product || 'Product'}</b>{h.lot ? <span className="sub"> · lot {h.lot}</span> : null}</div>
              <p className="ie-tone is-g">{holdWords(h, today, ctx).text}</p>
              <ul className="hd-oc" aria-label={`${label(h)} decisions`}>
                {outcomesOf(h).map(o => (
                  <li key={o.id} data-outcome={o.id}>{o.qty.toLocaleString('en-GB')} {h.unit} {dispositionWord(o.disposition)} — {o.by || 'not named'}, {o.on}{o.grounds ? ` — ${o.grounds}` : ''}{o.extra !== undefined ? ` · ${gbp(o.extra)}` : ''}
                    {mayEdit && <> <button type="button" className="linkish" aria-label={`Take back — ${label(h)} ${dispositionWord(o.disposition)}`} onClick={() => { void strikeOutcome(s.id, h.id, o.id, true); offerUndo(`${label(h)} decision taken back`, async () => { await strikeOutcome(s.id, h.id, o.id, false); }); }}>Take back</button></>}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {f.reasons.length > 0 && (
        <LeanPanel title="Why holds happen">
          <table className="lg-tbl" aria-label="Holds by reason"><thead><tr><th scope="col">Reason</th><th scope="col">Holds</th><th scope="col">Quantity</th></tr></thead>
            <tbody>{f.reasons.map(r => <tr key={r.reason}><th scope="row">{r.reason}</th><td>{r.n}</td><td>{qtyWords(r.qty)}</td></tr>)}</tbody></table>
          <p className={'sub' + (f.repeat ? ' ie-tone is-a' : '')} data-repeat>{f.repeat ? `${f.repeat.reason} has held product ${f.repeat.n} times in the last ${REPEAT_DAYS} days — an 8D is the next step.` : `A reason that holds product ${REPEAT_HOLDS} times in ${REPEAT_DAYS} days is a repeat, and the next step is an 8D.`}</p>
        </LeanPanel>
      )}
      <LeanPanel title="Who decides">
        <p data-authority>{agreed.authority?.length ? `May decide a hold: ${agreed.authority.join(', ')}.` : 'No names are listed as having the authority to decide a hold — anyone can. List them under More ▾.'}</p>
        {f.unauthorised.length > 0 && <p className="ie-tone is-a" data-unauthorised>{f.unauthorised.length} decision{f.unauthorised.length === 1 ? ' was' : 's were'} made by someone not on the list: {f.unauthorised.map(u => `${label(u.hold)} by ${u.outcome.by || 'no name'}`).join(', ')}.</p>}
      </LeanPanel>
      <section className="ln-panel lg-plan"><h2 className="ln-h">Action plan</h2><LeanActions actions={plan} empty="No hold is waiting for a decision." /></section>
      <LeanClosing closing={closing} />
      <LeanPanel title="What this register does not do"><ul className="lg-confirm" aria-label="Limits">{HOLD_LIMITS.map(l => <li key={l}>{l}</li>)}</ul></LeanPanel>
      {!can.edit && <p className="sub">You can read this register; it is kept by its team.</p>}
      {raising && <RaiseSheet s={s} was={raising.was} from={raising.from} ctx={ctx} me={me} holds={s.facts.holds ?? []} authority={agreed.authority} onClose={() => setRaising(null)} />}
      {deciding && <DecideSheet s={s} h={deciding} ctx={ctx} me={me} authority={agreed.authority} onClose={() => setDeciding(null)} />}
      {settings && <SettingsSheet s={s} agreed={agreed} onClose={() => setSettings(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ the sheets */

function RaiseSheet({ s, was, from, ctx, me, holds, authority, onClose }: { s: ToolStudy; was?: Hold; from?: Failed; ctx: HoldCtx; me?: string; holds: Hold[]; authority?: string[]; onClose: () => void }) {
  const [product, setProduct] = useState(was?.product ?? '');
  const [lot, setLot] = useState(was?.lot ?? '');
  const [qty, setQty] = useState(was ? String(was.qty) : from?.packs ? String(from.packs) : '');
  const [unit, setUnit] = useState<HoldUnit>(was?.unit ?? 'packs');
  const [where, setWhere] = useState(was?.where ?? '');
  const [reason, setReason] = useState(was?.reason ?? from?.reason ?? '');
  const [owner, setOwner] = useState(was?.owner ?? '');
  const [decideBy, setDecideBy] = useState(was?.decideBy ?? '');
  const [cost, setCost] = useState(was?.costEach !== undefined ? String(was.costEach) : '');
  const [life, setLife] = useState(was?.lifeDays !== undefined ? String(was.lifeDays) : '');
  const q = readNumber(qty), c = readNumber(cost), l = readNumber(life);
  const bad = [cost, life].some(t => t.trim() !== '' && readNumber(t) === undefined);
  const problem = !product.trim() ? 'Say what product it is.' : !(q !== undefined && q > 0) ? 'Say how much is held — a number above zero.' : !reason.trim() ? 'Say why it is held.' : bad ? 'Numbers only in the cost and the shelf life.' : undefined;
  const lineCost = unit === 'packs' && ctx.materialsPerPack ? ctx.materialsPerPack : undefined;
  const save = async () => {
    if (problem || q === undefined) return;
    const base = {
      product: product.trim(), qty: q, unit, reason: reason.trim(),
      ...(lot.trim() ? { lot: lot.trim() } : {}), ...(where.trim() ? { where: where.trim() } : {}), ...(owner.trim() ? { owner: owner.trim() } : {}),
      ...(decideBy ? { decideBy } : {}), ...(c !== undefined ? { costEach: c } : {}), ...(l !== undefined && l > 0 ? { lifeDays: l } : {}),
    };
    if (was) await changeHold(s.id, was.id, h => { const { lot: _a, where: _b, owner: _c, decideBy: _d, costEach: _e, lifeDays: _f, ...rest } = h; void [_a, _b, _c, _d, _e, _f]; return { ...rest, ...base }; });
    else await addHold(s.id, { id: uid(), no: nextNo(holds), ...base, ...(from ? { from: from.from } : {}), raisedOn: todayISO(), raisedAt: clock(), ...(me ? { raisedBy: me } : {}) });
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={was ? `Edit — ${label(was)}` : 'Raise a hold'}>
      <form className="lt-new hd-form" data-sheet="hold" onSubmit={e => { e.preventDefault(); void save(); }}>
        {from && <p className="sub" data-from>From a failed check: {from.words}</p>}
        <label className="field"><span className="field-label">Product</span><input className="text-input" value={product} maxLength={120} autoFocus aria-label="Product" onChange={e => setProduct(e.target.value)} /></label>
        <div className="ie-agree-grid">
          <label className="field"><span className="field-label">Lot or batch <i className="sub">optional</i></span><input className="text-input" value={lot} maxLength={60} aria-label="Lot" onChange={e => setLot(e.target.value)} /></label>
          <label className="field"><span className="field-label">Where it is <i className="sub">optional</i></span><input className="text-input" value={where} maxLength={80} aria-label="Where it is" placeholder="the hold cage" onChange={e => setWhere(e.target.value)} /></label>
        </div>
        <div className="ie-agree-grid">
          <label className="field"><span className="field-label">How much</span><input className="text-input" inputMode="decimal" value={qty} aria-label="How much" onChange={e => setQty(e.target.value)} /></label>
          <label className="field"><span className="field-label">In</span>
            <select className="text-input" value={unit} aria-label="Unit" onChange={e => setUnit(e.target.value as HoldUnit)}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></label>
        </div>
        <label className="field"><span className="field-label">Why it is held</span><input className="text-input" value={reason} maxLength={200} aria-label="Why it is held" placeholder="the seal check failed" onChange={e => setReason(e.target.value)} /></label>
        <div className="ie-agree-grid">
          <label className="field"><span className="field-label">Who decides <i className="sub">quality, not production</i></span>
            <input className="text-input" value={owner} maxLength={60} aria-label="Who decides" list={authority?.length ? 'hd-auth' : undefined} onChange={e => setOwner(e.target.value)} />
            {authority?.length ? <datalist id="hd-auth">{authority.map(a => <option key={a} value={a} />)}</datalist> : null}</label>
          <label className="field"><span className="field-label">Decide by</span><input className="text-input" type="date" value={decideBy} aria-label="Decide by" onChange={e => setDecideBy(e.target.value)} /></label>
        </div>
        <div className="ie-agree-grid">
          <label className="field"><span className="field-label">Cost a {unit === 'packs' ? 'pack' : 'unit'}, £ <i className="sub">optional — materials and labour to here</i></span>
            <input className="text-input" inputMode="decimal" value={cost} aria-label="Cost a piece" placeholder={lineCost !== undefined ? `${lineCost} — the line’s materials a pack` : ''} onChange={e => setCost(e.target.value)} /></label>
          <label className="field"><span className="field-label">Shelf life, days <i className="sub">optional</i></span><input className="text-input" inputMode="decimal" value={life} aria-label="Shelf life" onChange={e => setLife(e.target.value)} /></label>
        </div>
        {lineCost === undefined && c === undefined && <p className="sub" data-cost-hint>With no cost a piece the money tied up is not said. Give it here, or the line’s materials a pack in Set up the line.</p>}
        {problem && <p className="ie-problem" role="alert">{problem}</p>}
        <div className="lg-sheet-act"><button type="submit" className="btn btn-primary" disabled={!!problem}>{was ? 'Save the hold' : 'Put it on hold'}</button><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
      </form>
    </Sheet>
  );
}

function DecideSheet({ s, h, ctx, me, authority, onClose }: { s: ToolStudy; h: Hold; ctx: HoldCtx; me?: string; authority?: string[]; onClose: () => void }) {
  const [d, setD] = useState<Disposition | undefined>();
  const [qty, setQty] = useState(String(heldQty(h)));
  const [by, setBy] = useState(me ?? h.owner ?? '');
  const [grounds, setGrounds] = useState('');
  const [extra, setExtra] = useState('');
  const q = readNumber(qty), e = readNumber(extra);
  const def = DISPOSITIONS.find(x => x.key === d);
  const off = !!authority?.length && !!by.trim() && !authority.some(a => a.trim().toLowerCase() === by.trim().toLowerCase());
  const needGrounds = d === 'release' || d === 'concession';
  const problem = !d ? 'Choose what becomes of it.' : !(q !== undefined && q > 0 && q <= heldQty(h)) ? `Say how much — more than 0, and no more than the ${heldQty(h).toLocaleString('en-GB')} still held.` : !by.trim() ? 'Say who decided.' : needGrounds && !grounds.trim() ? 'Say on what grounds — a release without grounds is a guess.' : extra.trim() !== '' && e === undefined ? 'Numbers only in the cost.' : undefined;
  const save = async () => {
    if (problem || !d || q === undefined) return;
    const t = clock();
    await addOutcome(s.id, h.id, { id: uid(), disposition: d, qty: q, on: todayISO(), at: t, by: by.trim(), ...(grounds.trim() ? { grounds: grounds.trim() } : {}), ...(e !== undefined ? { extra: e } : {}) });
    onClose();
  };
  const t = tiedUpOf(h, ctx);
  return (
    <Sheet open onClose={onClose} title={`Decide — ${label(h)} ${h.product}`}>
      <form className="lt-new hd-form" data-sheet="decide" onSubmit={ev => { ev.preventDefault(); void save(); }}>
        <p className="sub">{qtyWords({ [h.unit]: heldQty(h) })} still held{t !== undefined ? `, ${gbp(t)} tied up` : ''}. Why: {h.reason}</p>
        <div className="chip-row" role="radiogroup" aria-label="What becomes of it">
          {DISPOSITIONS.map(x => <button key={x.key} type="button" role="radio" aria-checked={d === x.key} className={'chip' + (d === x.key ? ' on' : '')} onClick={() => setD(x.key)}>{x.word}</button>)}
        </div>
        {def && <p className="sub" data-help>{def.word}: {def.help}.</p>}
        <div className="ie-agree-grid">
          <label className="field"><span className="field-label">How much of it</span><input className="text-input" inputMode="decimal" value={qty} aria-label="How much of it" onChange={ev => setQty(ev.target.value)} /></label>
          <label className="field"><span className="field-label">Decided by</span><input className="text-input" value={by} maxLength={60} aria-label="Decided by" onChange={ev => setBy(ev.target.value)} /></label>
        </div>
        {off && <p className="sub ie-tone is-a" data-off-list>{by.trim()} is not on the list of who may decide a hold — it is recorded, and flagged.</p>}
        <label className="field"><span className="field-label">On what grounds {needGrounds ? '' : <i className="sub">optional</i>}</span><input className="text-input" value={grounds} maxLength={240} aria-label="Grounds" placeholder={d === 'release' ? 'the re-test passed' : d === 'concession' ? 'the customer agreed in writing' : ''} onChange={ev => setGrounds(ev.target.value)} /></label>
        {def?.extra && <label className="field"><span className="field-label">{def.extra} <i className="sub">optional</i></span><input className="text-input" inputMode="decimal" value={extra} aria-label={def.extra} onChange={ev => setExtra(ev.target.value)} /></label>}
        {d === 'release' && <p className="sub">A release costs the review’s hours only, which are not priced here.</p>}
        {problem && <p className="ie-problem" role="alert">{problem}</p>}
        <div className="lg-sheet-act"><button type="submit" className="btn btn-primary" disabled={!!problem}>Record the decision</button><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
      </form>
    </Sheet>
  );
}

function SettingsSheet({ s, agreed, onClose }: { s: ToolStudy; agreed: AgreedHolds; onClose: () => void }) {
  const [auth, setAuth] = useState((agreed.authority ?? []).join(', '));
  const [rate, setRate] = useState(agreed.carryPct !== undefined ? String(agreed.carryPct) : '');
  const r = readNumber(rate);
  const bad = rate.trim() !== '' && (r === undefined || r < 0 || r > 100);
  const save = async () => {
    if (bad) return;
    const { patchStudy } = await import('../../db');
    const names = auth.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
    await patchStudy(s.id, cur => ({ agreed: { ...cur.agreed, holds: { since: cur.agreed?.holds?.since ?? cur.startedAt, ...(names.length ? { authority: names } : {}), ...(r !== undefined ? { carryPct: r } : {}) } }, updatedAt: clock() }));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Who decides, and the carrying rate">
      <form className="lt-new hd-form" data-sheet="hold-settings" onSubmit={e => { e.preventDefault(); void save(); }}>
        <label className="field"><span className="field-label">Who may decide a hold <i className="sub">names, separated by commas — quality, not production</i></span><input className="text-input" value={auth} aria-label="Who may decide" onChange={e => setAuth(e.target.value)} /></label>
        <label className="field"><span className="field-label">Carrying rate, % a year <i className="sub">optional — the cost of money tied up and of space; none is assumed</i></span><input className="text-input" inputMode="decimal" value={rate} aria-label="Carrying rate" onChange={e => setRate(e.target.value)} /></label>
        {bad && <p className="ie-problem" role="alert">A percentage, 0 to 100.</p>}
        <div className="lg-sheet-act"><button type="submit" className="btn btn-primary" disabled={bad}>Save</button><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
      </form>
    </Sheet>
  );
}

