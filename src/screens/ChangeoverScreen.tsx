/* ONE CHANGEOVER — from one product to the next, timed step by step, and its
 * interval (docs/TOOLKIT.md, tool 6; lib/ie/changeover).
 *
 * The frame every tool shares (TOOLKIT 3.1), in the order of the three
 * questions: where are we (the strip — the minutes now, internal and
 * external, with the external work out, what a week buys back, the
 * interval); why are we not where we should be (the sentence, and the split
 * bar — external work still done with the line stopped is the abnormal, and
 * the only thing that wears colour); what are we doing about it (Make it
 * better on a step, Set as the standard, Prove it from the fix).
 *
 * ON THE PHONE AT THE LINE: Lap. Say the step and tap Internal or External,
 * Start as it begins, Next step as it ends — its time is the time between
 * taps, the next step already running. Steps can also be typed. Proving a
 * fix, the steps come carried from the changeover before and Lap times the
 * one up next.
 *
 * Nothing worked out is stored: the figures and every sentence come from
 * lib/ie/changeover on each render; Set as the standard writes the agreed
 * sequence onto the product's line standard (its capacity.changeovers) and
 * closes the study as a receipt. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, listStandardsForLine, onDataChange, patchStudy, putStandard } from '../db';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt, type Can } from '../lib/access';
import { now, uid } from '../lib/ids';
import { niceDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import type { Standard } from '../lib/standard';
import { changeoverFigures, changeoverSays, intervalOf, intervalSays, mins, runMinOf, standardFrom, standardLine, stepFigure, type ChangeoverFigures, type IntervalFigures } from '../lib/ie/changeover';
import { dur, parseDur } from '../lib/ie/steps';
import type { ChangeoverProduct, ChangeoverSide, ChangeoverStep, StandardChangeover, StudyUse, ToolStudy } from '../lib/study';
import { TOOL_WORDS } from './StudiesScreen';
import { UsedFor, useBetter, WhereItSits } from '../ui/StudyPlace';
import { recordHref } from '../lib/studyLinks';
import { Sheet } from '../ui/Sheet';

const OWNER = canAt('owner');
const day = (ms: number) => niceDay(new Date(ms).toISOString().slice(0, 10));

export function ChangeoverScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const [standards, setStandards] = useState<Standard[]>([]);
  const load = useCallback(async () => {
    const st = await getStudy(id);
    setS(st ?? null);
    setStandards(st?.workspaceId ? await listStandardsForLine(st.workspaceId) : []);
  }, [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  /* On a job, the job's rule; on its own or on a line, its people may do all
     of it, as on any study (TOOLKIT 3.6). */
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  if (s === undefined) return <div className="wrap ie co"><p className="sub">Opening…</p></div>;
  if (s === null) return (
    <div className="wrap ie co">
      <h1>This changeover isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/changeover')}>Every changeover</button>
    </div>
  );
  return <Changeover s={s} can={can} me={me} standards={standards} />;
}

/** The product's line standard this changeover is INTO — named on the study,
 *  else the one on the line for the product changed to. */
function standardFor(s: ToolStudy, standards: Standard[]): Standard | undefined {
  const to = (s.facts.toProduct ?? s.product ?? '').trim().toLowerCase();
  return standards.find(x => x.id === s.standardId) ?? (to ? standards.find(x => x.product.trim().toLowerCase() === to) : undefined);
}

/** The agreed changeover this one stands against: the one from the same
 *  product when the standard holds it, else the standard's newest. */
function agreedFor(std: Standard | undefined, from?: string): StandardChangeover | undefined {
  const list = std?.capacity?.changeovers ?? [];
  const f = (from ?? '').trim().toLowerCase();
  return list.find(a => (a.from ?? '').trim().toLowerCase() === f && f) ?? [...list].sort((a, b) => b.agreedAt - a.agreedAt)[0];
}

function Changeover({ s, can, me, standards }: { s: ToolStudy; can: Can; me?: string; standards: Standard[] }) {
  const seq = useMemo(() => [...(s.facts.sequence ?? [])].sort((a, b) => a.order - b.order), [s.facts.sequence]);
  const f = useMemo(() => changeoverFigures(seq, s.facts.perWeek), [seq, s.facts.perWeek]);
  const std = standardFor(s, standards);
  const agreed = agreedFor(std, s.facts.fromProduct);
  const said = useMemo(() => changeoverSays(f, agreed), [f, agreed]);
  const iv = useMemo(() => intervalOf(f, s.facts.products, s.facts.availableMinPerDay), [f, s.facts.products, s.facts.availableMinPerDay]);
  const ivSaid = intervalSays(iv, f);
  const closed = !!s.closedAt;
  const editable = can.edit && !closed;
  const [lapping, setLapping] = useState(false);
  const [editing, setEditing] = useState<ChangeoverStep | 'new' | null>(null);
  const [products, setProducts] = useState(false);
  const [interval, setInterval_] = useState(false);
  const w = TOOL_WORDS[s.tool];
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  const setSeq = (fn: (cur: ChangeoverStep[]) => ChangeoverStep[]) => write(cur => ({ facts: { ...cur.facts, sequence: fn(cur.facts.sequence ?? []) } }));
  /* THE CHANGEOVER INSIDE A CHANGE: a step raises a fix (stage gate) or a
     countermeasure (6M) — the step then wears the branch. */
  const { board, byRef, better } = useBetter(s, me);
  const branches = useMemo(() => {
    const m = new Map<string, StudyUse[]>();
    for (const u of s.uses) if (u.step && u.role === 'evidence' && byRef.has(u.ref)) m.set(u.step, [...(m.get(u.step) ?? []), u]);
    return m;
  }, [s.uses, byRef]);
  /* Proving a fix: the steps carried from before, timed again one by one. */
  const carried = useMemo(() => seq.filter(x => x.source === 'carried'), [seq]);
  const from = s.facts.fromProduct?.trim(), to = (s.facts.toProduct ?? s.product)?.trim();

  /* A step lands: timed on the phone (Lap), the one up next when proving. */
  const onLap = (x: { name: string; side: ChangeoverSide; sec: number; again?: string }) => setSeq(cur => (x.again
    ? cur.map(st => (st.id === x.again ? { ...st, name: x.name || st.name, side: x.side, sec: x.sec, source: 'timed' as const, at: now(), ...(me ? { who: me } : {}) } : st))
    : [...cur, { id: uid(), order: cur.reduce((m, st) => Math.max(m, st.order), -1) + 1, name: x.name, side: x.side, sec: x.sec, source: 'timed' as const, at: now(), ...(me ? { who: me } : {}) }]));

  /* SET AS THE STANDARD (can.agree): the agreed sequence onto the product's
     line standard, one entry per product it is changed from; the study
     closed as a receipt. */
  const setStandard = async () => {
    if (!std || !can.agree) return;
    const t = now();
    const a = standardFrom(seq, { id: uid(), from, at: t, by: me, studyId: s.id });
    const key = (x?: string) => (x ?? '').trim().toLowerCase();
    const others = (std.capacity?.changeovers ?? []).filter(x => key(x.from) !== key(from));
    await putStandard({ ...std, capacity: { ...(std.capacity ?? { stations: [] }), changeovers: [...others, a] } });
    write(cur => ({ ...(cur.standardId ? {} : { standardId: std.id }), closedAt: t,
      receipt: { at: t, ...(me ? { by: me } : {}), text: said.text, tone: said.tone,
        figures: { minutes: +(f.nowSec / 60).toFixed(1), internal: +(f.internalSec / 60).toFixed(1), external: +(f.externalSec / 60).toFixed(1), steps: f.steps,
          perWeek: f.perWeek ?? null, everyDays: iv.daysNow !== undefined ? +iv.daysNow.toFixed(2) : null } } }));
  };
  const canSet = can.agree && !closed && f.enough && !f.untimed && !f.carried;

  return (
    <div className="wrap ie co">
      <header className="ie-head">
        <small className="ie-eyebrow">{w?.one ?? 'Changeover'}</small>
        <Name s={s} canEdit={editable} />
        <p className="sub ie-where co-products">
          {from || to ? <>From <b>{from || 'a product'}</b> to <b>{to || 'a product'}</b></> : 'Which two products?'}
          {s.machine ? <> · <b>{s.machine}</b></> : null}
          {' · started '}{day(s.startedAt)}
          {editable && <button type="button" className="linkish" onClick={() => setProducts(true)}>Change the products</button>}
        </p>
        <WhereItSits s={s} can={can} />
      </header>

      {/* THE STRIP — where it stands; only the abnormal carries colour. */}
      <div className="ie-strip" role="group" aria-label="Where it stands">
        <span className={'ie-fig ie-verdict is-' + said.tone}><b>{said.verdict}</b></span>
        <span className={'ie-fig' + (f.enough ? '' : ' is-zero')}><b>{f.enough ? mins(f.nowSec) : '—'}</b> now{f.untimed ? ' · at least' : ''}</span>
        {f.enough && <span className="ie-fig"><b>{mins(f.internalSec)}</b> internal</span>}
        {f.enough && <span className={'ie-fig' + (f.externalSec > 0 ? ' is-a' : ' is-zero')}><b>{mins(f.externalSec)}</b> external</span>}
        {f.enough && f.externalSec > 0 && <span className="ie-fig"><b>{mins(f.afterSec)}</b> with the external work out</span>}
        {f.weekSec !== undefined && f.weekSec > 0 && <span className="ie-fig"><b>{mins(f.weekSec)}</b> a week back · {f.perWeek} changeovers</span>}
        {iv.ready && iv.daysNow !== undefined && <span className="ie-fig">every product every <b>{iv.daysNow.toFixed(1)} days</b></span>}
        <span className="ie-fig is-n"><b>{f.steps}</b> step{f.steps === 1 ? '' : 's'} · {f.source === 'none' ? 'not timed' : f.source === 'carried' ? 'some carried from before' : f.source}</span>
      </div>
      <div className="ie-says">
        {said.lines.filter(l => l.tone === 'r').map(l => <p key={l.text} className="ie-say is-r">{l.text}</p>)}
        <p className={'ie-say' + (said.tone === 'r' ? ' is-r' : '')}>{said.text}</p>
        {said.lines.filter(l => l.tone !== 'r').map(l => <p key={l.text} className={'ie-say ie-cap is-' + l.tone}>{l.text}</p>)}
        <p className={'ie-say ie-cap co-interval is-' + ivSaid.tone}>{ivSaid.text}</p>
      </div>

      <div className="ie-body co-body">
        <div className="ie-pic co-pic"><SplitBars f={f} seq={seq} /></div>
        {editable && (
          <div className="ie-cap-box co-cap" aria-label="Time the changeover">
            {lapping
              ? <Lap again={carried} onStep={onLap} onDone={() => setLapping(false)} />
              : <>
                <button type="button" className="wb-lap" onClick={() => setLapping(true)}>{carried.length ? 'Lap — time it again' : 'Lap — time it as it happens'}</button>
                <button type="button" className="btn" onClick={() => setEditing('new')}>+ Type a step</button>
                <p className="sub">Say the step, tap Internal (the line stopped) or External (could be done while it runs), Start as it begins and Next step as it ends.</p>
              </>}
          </div>
        )}
      </div>

      {/* THE STEPS, in order — each with its side, its time and how it is
          known. The side is the one control in place (moving a step outside
          is the SMED act); everything else about a step — Make it better,
          changing it, its order — is in its sheet, one tap on the card. */}
      {seq.length > 0 ? (
        <ol className="co-steps" aria-label="The steps">
          {seq.map((st, i) => {
            const branch = branches.get(st.id) ?? [];
            const body = (
              <>
                <span className="ie-no">{i + 1}</span>
                <span className="co-step-main">
                  <b className="co-step-n">{st.name.trim() || 'A step'}</b>
                  <span className="co-step-f sub">{st.sec ? dur(st.sec) : 'no time yet'} · {st.source === 'carried' ? 'carried from before — not timed again yet' : st.source}{st.who ? ` · ${st.who}` : ''}{branch.length ? ' · being made better' : ''}</span>
                </span>
              </>
            );
            return (
              <li key={st.id} className={'co-step' + (st.source === 'carried' ? ' is-carried' : '') + (branch.length ? ' has-fix' : '')}>
                {editable || branch.length
                  ? <button type="button" className="co-step-b" aria-label={`Step ${i + 1}: ${st.name.trim() || 'a step'} — ${stepFigure(st)}`} onClick={() => setEditing(st)}>{body}</button>
                  : <span className="co-step-b">{body}</span>}
                <span className="chip-row co-side" role="radiogroup" aria-label={`Step ${i + 1} — internal or external`}>
                  {(['internal', 'external'] as ChangeoverSide[]).map(side => (
                    <button key={side} type="button" role="radio" aria-checked={st.side === side} disabled={!editable}
                      className={'chip co-chip is-' + side + (st.side === side ? ' on' : '')}
                      onClick={() => editable && st.side !== side && setSeq(cur => cur.map(x => (x.id === st.id ? { ...x, side } : x)))}>{side === 'internal' ? 'Internal' : 'External'}</button>
                  ))}
                </span>
              </li>
            );
          })}
        </ol>
      ) : <div className="qsl-empty"><p><b>No steps yet.</b> Lap the changeover on the phone as it happens — Start as the first step begins, Next step as each one ends — or type the steps with their minutes.</p></div>}
      <p className="sub co-key"><span className="co-key-i is-internal" aria-hidden /> internal — the line stopped <span className="co-key-i is-external" aria-hidden /> external — could be done while it runs</p>

      {/* THE INTERVAL — the products run on the line, their run times, the
          minutes a day and the changeovers a week: typed once, held on the study. */}
      <div className="co-fold">
        <div className="co-fold-h">
          <small className="ie-h">How often can each product run?</small>
          {editable && <button type="button" className="linkish" onClick={() => setInterval_(true)}>{iv.products ? 'Change the products and the day' : 'List the products and the day'}</button>}
        </div>
        {iv.products > 0 && (
          <p className="sub co-iv-facts">
            {(s.facts.products ?? []).map(p => { const r = runMinOf(p); return `${p.product}: ${r ? `${mins(r.min * 60)} a day${r.how === 'rate' ? ` (${p.demandPerDay} at ${p.ratePerMin} a minute)` : ', typed'}` : 'no run time yet'}`; }).join(' · ')}
            {s.facts.availableMinPerDay ? ` · the line runs ${mins(s.facts.availableMinPerDay * 60)} a day` : ''}
            {iv.freeMinPerDay !== undefined ? ` · ${mins(iv.freeMinPerDay * 60)} free for changeovers` : ''}
            {s.facts.perWeek ? ` · ${s.facts.perWeek} changeovers a week` : ''}
          </p>
        )}
      </div>

      {/* AGREED: the product's standard, and Set as the standard. */}
      <p className="ie-agreed sub">
        {agreed ? <>The standard for <b>{std?.product}</b>: <b>{standardLine(agreed, day)}</b></> : std ? <>No agreed changeover into <b>{std.product}</b> yet.</> : s.workspaceId ? 'No line standard for the product changed to on this line — make one to set this as its standard.' : 'Put it on a line to set it as a product’s standard.'}
      </p>
      <div className={'ie-act' + (closed ? ' is-closed' : '')}>
        {closed && s.receipt ? (
          <>
            <p className="ie-receipt"><b>Set as the standard {day(s.receipt.at)}{s.receipt.by ? ` by ${s.receipt.by}` : ''}</b> — a receipt: these figures stand as they were. {s.receipt.text}</p>
            {can.agree && <button type="button" className="btn" onClick={() => write({ closedAt: undefined })}>Reopen to time again</button>}
          </>
        ) : (
          <>
            {canSet && std && <button type="button" className="btn btn-primary" onClick={() => void setStandard()}>Set as the standard</button>}
            {can.agree && !closed && f.enough && (f.untimed > 0 || f.carried > 0) && <span className="sub">Every step needs a time of its own before it is set as the standard.</span>}
          </>
        )}
      </div>

      <UsedFor s={s} can={can} me={me} />

      {editing && (
        <StepSheet key={editing === 'new' ? 'new' : editing.id} step={editing === 'new' ? undefined : editing} list={seq} canRemove={can.remove || !s.projectId} editable={editable}
          branch={editing !== 'new' && s.projectId ? (branches.get(editing.id) ?? []).map(u => ({ title: byRef.get(u.ref)?.title ?? 'a record', href: recordHref(s.projectId ?? '', u) })) : []}
          better={editing !== 'new' && editable && !!s.projectId && !branches.has(editing.id) && !!editing.sec
            ? { label: board ? 'Make it better — a countermeasure' : 'Make it better — raise a fix', onClick: () => { const id = editing.id; setEditing(null); void better(id); } } : undefined}
          onClose={() => setEditing(null)}
          onSave={st => { setSeq(cur => (cur.some(x => x.id === st.id) ? cur.map(x => (x.id === st.id ? st : x)) : [...cur, st])); setEditing(null); }}
          onMove={(id, by) => setSeq(cur => move(cur, id, by))}
          onRemove={id => { setSeq(cur => cur.filter(x => x.id !== id)); setEditing(null); }} />
      )}
      {products && <ProductsSheet s={s} standards={standards} onClose={() => setProducts(false)} />}
      {interval && <IntervalSheet s={s} standards={standards} iv={iv} onClose={() => setInterval_(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ name */
function Name({ s, canEdit }: { s: ToolStudy; canEdit: boolean }) {
  const [v, setV] = useState<string | null>(null);
  if (v === null) return (
    <h1 className="ie-name">{s.name || 'Not named'}
      {canEdit && <button type="button" className="linkish ie-rename" onClick={() => setV(s.name)}>Rename</button>}
    </h1>
  );
  const save = () => { if (v.trim()) void patchStudy(s.id, { name: v.trim() }); setV(null); };
  return (
    <form className="ie-name-f" onSubmit={e => { e.preventDefault(); save(); }}>
      <input className="text-input" value={v} maxLength={120} autoFocus onChange={e => setV(e.target.value)} onBlur={save} aria-label="What it is of" />
    </form>
  );
}

/* ------------------------------------------------------- the split bar */
/** ONE BAR, NOW — the steps in order, internal solid ink, external hatched
 *  (value by fill, never a state colour, TOOLKIT 3.3) — and under it the bar
 *  with the external work moved out, shorter, the minutes saved beside it. */
function SplitBars({ f, seq }: { f: ChangeoverFigures; seq: ChangeoverStep[] }) {
  if (!f.enough) return <p className="sub ie-pic-empty">The changeover lands here as one bar — the line stopped in solid ink, work that could be done while it runs hatched — and under it the bar without that work.</p>;
  const timed = seq.filter(st => st.sec && st.sec > 0);
  const pct = (sec: number) => `${(sec / f.nowSec) * 100}%`;
  return (
    <div className="co-bars" role="img" aria-label={`Now ${mins(f.nowSec)}: ${mins(f.internalSec)} internal, ${mins(f.externalSec)} external. With the external work done while the line runs: ${mins(f.afterSec)}.`}>
      <div className="co-bar-row">
        <span className="co-bar-l">Now</span>
        <div className="co-bar">
          {timed.map(st => <span key={st.id} className={'co-seg is-' + st.side + (st.source === 'carried' ? ' is-carried' : '')} style={{ width: pct(st.sec ?? 0) }} title={`${st.name} — ${stepFigure(st)}`} />)}
        </div>
        <b className="co-bar-n">{mins(f.nowSec)}</b>
      </div>
      <div className="co-bar-row">
        <span className="co-bar-l">External work outside</span>
        <div className="co-bar" style={{ width: f.nowSec ? `${(f.afterSec / f.nowSec) * 100}%` : '100%' }}>
          {timed.filter(st => st.side === 'internal').map(st => <span key={st.id} className={'co-seg is-internal' + (st.source === 'carried' ? ' is-carried' : '')} style={{ width: f.afterSec ? `${((st.sec ?? 0) / f.afterSec) * 100}%` : '0%' }} title={`${st.name} — ${stepFigure(st)}`} />)}
        </div>
        <b className="co-bar-n">{mins(f.afterSec)}</b>
        {f.externalSec > 0 && <span className="co-saved is-a">−{mins(f.externalSec)}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Lap */
/** THE PHONE'S STOPWATCH for a changeover: name the step and its side, Start
 *  as it begins, Next step as it ends — its time the time between taps, the
 *  next already running. Proving a fix, the carried steps are up in turn. */
function Lap({ again, onStep, onDone }: {
  again?: ChangeoverStep[];
  onStep: (x: { name: string; side: ChangeoverSide; sec: number; again?: string }) => void;
  onDone: () => void;
}) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [side, setSide] = useState<ChangeoverSide>('internal');
  const [n, setN] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const up = again?.find(x => !done.includes(x.id));
  useEffect(() => { if (up) { setName(up.name); setSide(up.side); } }, [up?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick(x => x + 1), 200); return () => window.clearInterval(t); }, []);
  const split = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const close = () => {
    if (!startedAt) return;
    onStep({ name: name.trim() || `Step ${n + 1}`, side, sec: +((Date.now() - startedAt) / 1000).toFixed(1), ...(up ? { again: up.id } : {}) });
    if (up) setDone(d => [...d, up.id]);
    setN(x => x + 1); setName(''); setSide('internal');
  };
  return (
    <div className="wb-timer co-lap" aria-label="Timing the changeover">
      <div className="wb-t-h"><b>{again?.length ? 'Time it again' : 'Lap'}</b><span className="sub">{n} step{n === 1 ? '' : 's'} timed{up ? ` · up next: ${up.name.trim() || 'a step'}` : again?.length ? ' · every carried step timed — any more are added' : ''}</span></div>
      <output className="wb-split" aria-live="off">{startedAt ? dur(split) : '0.0 s'}</output>
      <label className="field"><span className="field-label">This step</span>
        <input className="text-input" value={name} placeholder={`Step ${n + 1} — e.g. Change the former tube`} onChange={e => setName(e.target.value)} /></label>
      <span className="chip-row" role="radiogroup" aria-label="Internal or external">
        {(['internal', 'external'] as ChangeoverSide[]).map(x => (
          <button key={x} type="button" role="radio" aria-checked={side === x} className={'chip co-chip is-' + x + (side === x ? ' on' : '')} onClick={() => setSide(x)}>{x === 'internal' ? 'Internal — the line stopped' : 'External — could be done while it runs'}</button>
        ))}
      </span>
      {!startedAt
        ? <button type="button" className="wb-lap" onClick={() => setStartedAt(Date.now())}>Start — as the first step begins</button>
        : <button type="button" className="wb-lap" onClick={() => { close(); setStartedAt(Date.now()); }}>Next step — this one is done</button>}
      <div className="wb-t-acts">
        {startedAt && <button type="button" className="btn" onClick={() => { close(); setStartedAt(null); onDone(); }}>Last step — finish</button>}
        <button type="button" className="btn" onClick={onDone}>{startedAt ? 'Stop — keep what is timed' : 'Back'}</button>
      </div>
      <p className="sub">Each tap ends the step on the screen and starts the next; its time is the time between taps. Internal is work the line stops for; external could be done while it still runs.</p>
    </div>
  );
}

/** Move a step one place earlier (−1) or later (+1). */
function move(list: ChangeoverStep[], id: string, by: -1 | 1): ChangeoverStep[] {
  const sorted = [...list].sort((x, y) => x.order - y.order);
  const i = sorted.findIndex(x => x.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= sorted.length) return list;
  const a = sorted[i].order, b = sorted[j].order;
  return list.map(x => (x.id === sorted[i].id ? { ...x, order: b } : x.id === sorted[j].id ? { ...x, order: a } : x));
}

/* ------------------------------------------------------------ one step */
function StepSheet({ step, list, canRemove, editable, branch, better, onClose, onSave, onMove, onRemove }: {
  step?: ChangeoverStep; list: ChangeoverStep[]; canRemove: boolean; editable: boolean;
  /** The fix or countermeasure raised from this step — the branch off it. */
  branch: { title: string; href: string }[];
  /** Make it better from this step, when it is worth it and allowed. */
  better?: { label: string; onClick: () => void };
  onClose: () => void; onSave: (st: ChangeoverStep) => void; onMove: (id: string, by: -1 | 1) => void; onRemove: (id: string) => void;
}) {
  const last = list.length ? list[list.length - 1] : undefined;
  const [name, setName] = useState(step?.name ?? '');
  const [side, setSide] = useState<ChangeoverSide>(step?.side ?? 'internal');
  const [time, setTime] = useState(step?.sec !== undefined ? dur(step.sec) : '');
  /* a bare number is minutes — the floor says "4" for four minutes */
  const sec = time.trim() ? parseDur(time, 'min') : undefined;
  const bad = !!time.trim() && sec === undefined;
  const ready = !!name.trim() && !bad;
  const save = () => {
    if (!ready) return;
    onSave({ id: step?.id ?? uid(), order: step?.order ?? (last ? last.order + 1 : 0), name: name.trim(), side,
      ...(sec !== undefined && sec > 0 ? { sec } : {}),
      /* timed stays timed when only its side or name changes; a carried step opened and saved is as typed */
      source: step?.source === 'timed' && sec === step.sec ? 'timed' : 'typed', ...(sec !== undefined && sec > 0 ? { at: now() } : {}) });
  };
  if (step && !editable) return (
    <Sheet open onClose={onClose} title="The step">
      <div className="vs-facts"><h3>{step.name.trim() || 'A step'}</h3><p className="sub">{stepFigure(step)} · {step.source}{step.who ? ` · ${step.who}` : ''}</p></div>
      {branch.length > 0 && <div className="vs-branch"><small className="ie-h">Being made better</small>{branch.map(b => <p key={b.href}><button type="button" className="linkish" onClick={() => nav(b.href)}>{b.title}</button></p>)}</div>}
      <div className="vs-step-acts"><button type="button" className="btn btn-ghost" onClick={onClose}>Close</button></div>
    </Sheet>
  );
  return (
    <Sheet open onClose={onClose} title={step ? 'The step' : 'Type a step'}>
      {step && <p className="sub co-sheet-f">{stepFigure(step)} · {step.source === 'carried' ? 'carried from before — not timed again yet' : step.source}{step.who ? ` · ${step.who}` : ''}</p>}
      {branch.length > 0 && <div className="vs-branch"><small className="ie-h">Being made better</small>{branch.map(b => <p key={b.href}><button type="button" className="linkish" onClick={() => nav(b.href)}>{b.title}</button></p>)}</div>}
      {better && <div className="vs-step-acts co-better"><button type="button" className="btn btn-primary" onClick={better.onClick}>{better.label}</button></div>}
      <form className="vs-step" onSubmit={e => { e.preventDefault(); save(); }}>
        <label className="field"><span className="field-label">What is done</span>
          <input className="text-input" value={name} autoFocus={!step} maxLength={120} placeholder="e.g. Change the former tube" onChange={e => setName(e.target.value)} /></label>
        <div className="field"><span className="field-label">Internal or external</span>
          <span className="chip-row" role="radiogroup" aria-label="Internal or external">
            {(['internal', 'external'] as ChangeoverSide[]).map(x => (
              <button key={x} type="button" role="radio" aria-checked={side === x} className={'chip co-chip is-' + x + (side === x ? ' on' : '')} onClick={() => setSide(x)}>{x === 'internal' ? 'Internal — the line stopped' : 'External — could be done while it runs'}</button>
            ))}
          </span></div>
        <label className="field"><span className="field-label">How long it takes</span>
          <input className="text-input" value={time} inputMode="text" placeholder="e.g. 4 min, 30 s" onChange={e => setTime(e.target.value)} />
          <span className={'sub' + (bad ? ' vs-bad' : '')}>{time.trim() ? (sec !== undefined ? `= ${dur(sec)}` : 'Not a time — try "4 min" or "30 s"') : 'a bare number is minutes'}</span></label>
        <div className="vs-step-acts">
          <button type="submit" className="btn btn-primary" disabled={!ready}>{step ? 'Save' : 'Add it'}</button>
          {step && <>
            <button type="button" className="btn" onClick={() => onMove(step.id, -1)}>Earlier</button>
            <button type="button" className="btn" onClick={() => onMove(step.id, 1)}>Later</button>
            {canRemove && <button type="button" className="btn btn-ghost" onClick={() => onRemove(step.id)}>Take it off</button>}
          </>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------ the two products */
function ProductsSheet({ s, standards, onClose }: { s: ToolStudy; standards: Standard[]; onClose: () => void }) {
  const [from, setFrom] = useState(s.facts.fromProduct ?? '');
  const [to, setTo] = useState(s.facts.toProduct ?? s.product ?? '');
  const save = () => {
    const f = from.trim(), t = to.trim();
    const std = standards.find(x => x.product.trim().toLowerCase() === t.toLowerCase());
    void patchStudy(s.id, cur => ({
      facts: { ...cur.facts, ...(f ? { fromProduct: f } : {}), ...(t ? { toProduct: t } : {}) },
      ...(t ? { product: t } : {}), ...(std ? { standardId: std.id } : {}),
      /* the name follows the products while it was never written by hand */
      ...(f && t && (!cur.name || /→/.test(cur.name)) ? { name: `${f} → ${t}` } : {}),
    }));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="The two products">
      <form className="vs-step" onSubmit={e => { e.preventDefault(); save(); }}>
        <label className="field"><span className="field-label">From — what the line ran</span>
          <input className="text-input" value={from} list="co-products" autoFocus placeholder="e.g. Finest Red 2kg" onChange={e => setFrom(e.target.value)} /></label>
        <label className="field"><span className="field-label">To — what it changed to</span>
          <input className="text-input" value={to} list="co-products" placeholder="e.g. Express 1.25 kg" onChange={e => setTo(e.target.value)} />
          <span className="sub">A product with a line standard on the line is where Set as the standard writes the agreed sequence.</span></label>
        <datalist id="co-products">{standards.map(x => <option key={x.id} value={x.product} />)}</datalist>
        <div className="vs-step-acts">
          <button type="submit" className="btn btn-primary">Save</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------- the interval's facts */
type Row = { id: string; product: string; standardId?: string; demand: string; rate: string; run: string; fromStandard?: number };

/** THE PRODUCTS RUN ON THE LINE, each with what the customer takes a day and
 *  the line's rate on it — offered from its line standard's balance (and
 *  said so) — or its minutes a day typed; the minutes the line runs a day,
 *  offered from the balance's planned hours; the changeovers a week. Written
 *  once, on Save — never on a keystroke. */
function IntervalSheet({ s, standards, iv, onClose }: { s: ToolStudy; standards: Standard[]; iv: IntervalFigures; onClose: () => void }) {
  const have = s.facts.products ?? [];
  const rowOf = (p: ChangeoverProduct): Row => {
    const std = standards.find(x => x.id === p.standardId) ?? standards.find(x => x.product.trim().toLowerCase() === p.product.trim().toLowerCase());
    return { id: p.id, product: p.product, ...(std ? { standardId: std.id } : {}), demand: p.demandPerDay ? String(p.demandPerDay) : '', rate: p.ratePerMin ? String(p.ratePerMin) : '',
      run: p.runMinPerDay ? String(p.runMinPerDay) : '', ...(std?.capacity?.targetPerMin ? { fromStandard: std.capacity.targetPerMin } : {}) };
  };
  /* the study's list, then every product on the line not yet in it, then the two products themselves */
  const seed = (): Row[] => {
    const rows = have.map(rowOf);
    const has = (name: string) => rows.some(r => r.product.trim().toLowerCase() === name.trim().toLowerCase());
    for (const std of standards) if (!has(std.product)) rows.push(rowOf({ id: uid(), product: std.product, standardId: std.id, ...(std.capacity?.targetPerMin ? { ratePerMin: std.capacity.targetPerMin } : {}) }));
    for (const name of [s.facts.fromProduct, s.facts.toProduct ?? s.product]) if (name?.trim() && !has(name)) rows.push(rowOf({ id: uid(), product: name.trim() }));
    return rows.map(r => (r.fromStandard && !r.rate ? { ...r, rate: String(r.fromStandard) } : r));
  };
  const [rows, setRows] = useState<Row[]>(seed);
  const planned = standards.map(x => x.capacity?.plannedHoursPerWeek).find((h): h is number => !!h && h > 0);
  const [available, setAvailable] = useState(s.facts.availableMinPerDay ? String(s.facts.availableMinPerDay) : planned ? String(Math.round((planned * 60) / 5)) : '');
  const [perWeek, setPerWeek] = useState(s.facts.perWeek ? String(s.facts.perWeek) : '');
  const [added, setAdded] = useState('');
  const set = (id: string, p: Partial<Row>) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)));
  const num = (t: string) => { const v = Number(t.replace(',', '.')); return t.trim() && Number.isFinite(v) && v > 0 ? v : undefined; };
  const save = () => {
    const products: ChangeoverProduct[] = rows.filter(r => r.product.trim()).map(r => ({
      id: r.id, product: r.product.trim(), ...(r.standardId ? { standardId: r.standardId } : {}),
      ...(num(r.demand) ? { demandPerDay: num(r.demand) } : {}), ...(num(r.rate) ? { ratePerMin: num(r.rate) } : {}), ...(num(r.run) ? { runMinPerDay: num(r.run) } : {}),
    }));
    const a = num(available), pw = num(perWeek);
    void patchStudy(s.id, cur => ({ facts: { ...cur.facts, products, ...(a ? { availableMinPerDay: a } : { availableMinPerDay: undefined }), ...(pw ? { perWeek: pw } : { perWeek: undefined }) } }));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="The products, and the day">
      <form className="vs-step co-iv" onSubmit={e => { e.preventDefault(); save(); }}>
        <p className="sub">Every product this line runs, with what the customer takes a day and the line's rate on it — or its minutes a day. The time left over is what the changeovers have.</p>
        {rows.map(r => {
          const run = runMinOf({ id: r.id, product: r.product, ...(num(r.demand) ? { demandPerDay: num(r.demand) } : {}), ...(num(r.rate) ? { ratePerMin: num(r.rate) } : {}), ...(num(r.run) ? { runMinPerDay: num(r.run) } : {}) });
          return (
            <fieldset key={r.id} className="co-iv-row">
              <legend className="co-iv-p">
                <input className="text-input" value={r.product} aria-label="Product" placeholder="Product" onChange={e => set(r.id, { product: e.target.value })} />
                <button type="button" className="linkish" onClick={() => setRows(rs => rs.filter(x => x.id !== r.id))}>Take it off</button>
              </legend>
              <div className="vs-step-times">
                <label className="field"><span className="field-label">Takes a day</span>
                  <input className="text-input" inputMode="decimal" value={r.demand} placeholder="e.g. 7200" aria-label={`${r.product || 'Product'} — demand a day`} onChange={e => set(r.id, { demand: e.target.value })} /></label>
                <label className="field"><span className="field-label">Rate, a minute</span>
                  <input className="text-input" inputMode="decimal" value={r.rate} placeholder="e.g. 60" aria-label={`${r.product || 'Product'} — rate a minute`} onChange={e => set(r.id, { rate: e.target.value })} />
                  <span className="sub">{r.fromStandard && num(r.rate) === r.fromStandard ? 'from its line balance' : r.fromStandard ? `its line balance says ${r.fromStandard}` : 'no line balance to read it from'}</span></label>
                <label className="field"><span className="field-label">Or: minutes a day</span>
                  <input className="text-input" inputMode="decimal" value={r.run} placeholder="e.g. 50" aria-label={`${r.product || 'Product'} — minutes a day`} onChange={e => set(r.id, { run: e.target.value })} /></label>
              </div>
              <span className="sub">{run ? `${mins(run.min * 60)} a day${run.how === 'rate' ? ' — from its demand and rate' : ', typed'}` : 'No run time yet.'}</span>
            </fieldset>
          );
        })}
        <div className="vs-other">
          <input className="text-input" value={added} aria-label="Another product" placeholder="Another product run on this line" onChange={e => setAdded(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (added.trim()) { setRows(rs => [...rs, rowOf({ id: uid(), product: added.trim() })]); setAdded(''); } } }} />
          <button type="button" className="btn" disabled={!added.trim()} onClick={() => { setRows(rs => [...rs, rowOf({ id: uid(), product: added.trim() })]); setAdded(''); }}>Add</button>
        </div>
        <div className="vs-step-times">
          <label className="field"><span className="field-label">The line runs, minutes a day</span>
            <input className="text-input" inputMode="decimal" value={available} placeholder="e.g. 450" onChange={e => setAvailable(e.target.value)} />
            <span className="sub">{planned ? `the line balance plans ${planned} hours a week — ${Math.round((planned * 60) / 5)} min a day over five days` : 'what is left after breaks and cleans'}</span></label>
          <label className="field"><span className="field-label">Changeovers a week</span>
            <input className="text-input" inputMode="numeric" value={perWeek} placeholder="e.g. 6" onChange={e => setPerWeek(e.target.value)} />
            <span className="sub">what the external work buys back, a week</span></label>
        </div>
        {iv.products > 0 && <p className="sub">Now: {intervalSays(iv, changeoverFigures(s.facts.sequence, s.facts.perWeek)).text}</p>}
        <div className="vs-step-acts">
          <button type="submit" className="btn btn-primary">Save</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}
