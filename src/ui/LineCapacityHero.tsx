/* WHAT A LINE CAN MAKE — the capacity reference (docs/upgrade-plan.md, C).
 * One answer at the top; under it the three numbers (theoretical ·
 * demonstrated · plannable), where the line is held and whether that moved,
 * what changed this week, and where the time went over the counted shifts —
 * every band saying whether it is on the constraint, and the mirage when it is
 * not. Every figure opens to the shifts and stops it is made of.
 *
 * Reads: the line's loss counts (studies, tool 'losses'), its stops
 * (observations), its products' Line capacity (standards). Writes nothing. */
import { useEffect, useMemo, useState } from 'react';
import type { Observation, Workspace } from '../types';
import type { Standard } from '../lib/standard';
import type { ToolStudy } from '../lib/study';
import { listAllStudies, listObservations, getWorkspace, onDataChange, putStandard } from '../db';
import { useAccess } from '../cloud/access';
import { can as canOf } from '../lib/access';
import { DraftNumber } from './Draft';
import { offerUndo } from './Undo';
import { stopsOfBar } from '../lib/ie/losses';
import {
  ASK_EXAMPLES, askLine, constraintShare, confidenceOf, figure, heatOf, leversOf, onConstraint, parseDemand, reasonOf, WEEK,
  type Answer,
  type Figure, type Source,
} from '../lib/intelligence';
import { Metric, WhyNumber } from './WhyNumber';
import { askNarrated } from '../lib/askAi';
import { PERIOD_WEEKS, readLine, unitOf } from '../lib/lineRead';

const fmt = (n: number, d = 1) => n.toLocaleString('en-GB', { maximumFractionDigits: d });
const when = (t: number) => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function LineCapacityHero({ wsId, products, lineName }: { wsId: string; products: Standard[]; lineName?: string }) {
  const [obs, setObs] = useState<Observation[] | null>(null);
  const [counts, setCounts] = useState<ToolStudy[]>([]);
  const [smeds, setSmeds] = useState<ToolStudy[]>([]);
  /* the levers' slider settings — a what-if on this screen, kept for nothing */
  const [pct, setPct] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<(Answer & { q: string; narrated?: boolean; thinking?: boolean }) | null>(null);
  const [ws, setWs] = useState<Workspace | undefined>();
  const [why, setWhy] = useState<{ fig: Figure; title: string } | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const load = async () => {
      const [o, ss, w] = await Promise.all([listObservations(wsId), listAllStudies(), getWorkspace(wsId)]);
      setObs(o); setWs(w);
      setCounts(ss.filter(s => s.tool === 'losses' && s.workspaceId === wsId && !s.deletedAt && s.facts.losses));
      setSmeds(ss.filter(s => s.tool === 'changeover' && s.workspaceId === wsId && !s.deletedAt && s.facts.running).sort((x, y) => (y.updatedAt ?? 0) - (x.updatedAt ?? 0)));
    };
    void load();
    return onDataChange(() => { void load(); });
  }, [wsId]);

  const now = Date.now();
  const from = now - PERIOD_WEEKS * WEEK;
  const unit = useMemo(() => unitOf(products), [products]);
  /* the panel's sums — the same function the paper reads (lib/lineRead) */
  const a = useMemo(() => (obs ? readLine({ obs, counts, smeds, ...(ws ? { ws } : {}), products, ...(lineName ? { lineName } : {}), now }) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` moves each render; the period is by the day
    [obs, counts, smeds, ws, products, lineName, Math.floor(now / 86_400_000)]);
  const heat = a?.heat ?? heatOf([], now);
  const levers = useMemo(() => (a ? leversOf(a.fall, a.rates.theoretical, pct, a.shiftsPerWeek, unit) : undefined), [a, pct, unit]);

  if (!obs || !a) return <div className="lch is-loading" aria-busy="true"><div className="sk sk-line" /><div className="sk sk-row" /></div>;

  const shiftSrc = (ids?: string[]): Source[] => a.rates.shifts.filter(s => !ids || ids.includes(s.id)).map(s => ({
    kind: 'count', id: s.id, href: `#/losses/${s.id}`,
    label: `${when(s.from)} — ${fmt(s.made, 0)} good in ${fmt(s.plannedMin, 0)} planned min = ${fmt(s.perMin)} ${unit}/min`,
  }));
  const stopSrc = (list: Observation[]): Source[] => list.map(o => ({
    kind: 'stop', id: o.id, href: `#/w/${wsId}/log`,
    label: `${when(o.startedAt)} — ${reasonOf(o)}${o.asset.trim() ? ` · ${o.asset.trim()}` : ''} · ${fmt(o.durationMs / 60_000, 0)} min`,
  }));
  const brief = a.brief;
  const per = `${unit}/min`;
  const r = a.rates;
  const theo = r.theoretical != null ? figure(`${fmt(r.theoretical)} ${per}`, 'The ideal speed each counted shift was judged against — the slowest station’s plate speed, or a person’s standard time (Line capacity).', shiftSrc(), { from, to: now, confidence: r.confidence }) : undefined;
  const dem = r.demonstrated != null ? figure(`${fmt(r.demonstrated)} ${per}`, `The typical counted shift (the median): good ${unit} ÷ its planned minutes, over ${r.shifts.length} shift${r.shifts.length === 1 ? '' : 's'} in the last ${PERIOD_WEEKS} weeks.`, shiftSrc(), { from, to: now, confidence: r.confidence }) : undefined;
  const plan = r.plannable != null
    ? figure(`${fmt(r.plannable)} ${per}`, `The 20th percentile of the counted shifts — four shifts in five made at least this. Plan on it, not on the average.`, shiftSrc(), { from, to: now, confidence: r.confidence })
    : r.plannableRange ? figure(`${fmt(r.plannableRange[0])}–${fmt(r.plannableRange[1])} ${per}`, `Too few shifts counted to plan on one figure (5 wanted) — the range from the slowest to the typical.`, shiftSrc(), { from, to: now, confidence: r.confidence }) : undefined;
  const hours = (m: number) => (m >= 120 ? `${fmt(m / 60)} h` : `${fmt(m, 0)} min`);
  const max = Math.max(1, a.fall.plannedMin);
  const constraintSays = a.constraint ? `Held at the ${a.constraint.name}${a.constraint.others.length ? ` (the ${a.constraint.others.map(o => o.name).join(', the ')} on ${a.constraint.others.flatMap(o => o.products).join(', ')})` : ''}.` : 'Where the line is held is not known yet — work out a product’s Line capacity below.';

  return (
    <section className="lch" aria-label="What this line can make">
      <p className="lch-hero">{r.says}</p>
      {/* ASK — answered from the same functions; anything else narrated from these figures when the AI is set up */}
      <form className="lch-ask" onSubmit={e => {
        e.preventDefault();
        const question = q.trim();
        if (!question) return;
        const own = askLine(question, a.facts);
        if (own.matched) { setAnswer({ ...own, q: question }); return; }
        setAnswer({ matched: false, text: '', used: [], q: question, thinking: true });
        void askNarrated(question, a.facts).then(t => setAnswer(t
          ? { matched: true, text: t, used: ['Narrated from this line’s figures — it computes nothing of its own.'], q: question, narrated: true }
          : { matched: false, text: `I can answer questions like “${ASK_EXAMPLES.join('”, “')}” about this line.`, used: [], q: question }));
      }}>
        <input className="text-input lch-ask-in" value={q} onChange={e => setQ(e.target.value)} placeholder={`Ask about ${lineName ?? 'this line'} — “${ASK_EXAMPLES[0]}”`} aria-label={`Ask about ${lineName ?? 'this line'}`} maxLength={300} />
        <button type="submit" className="btn btn-sm" disabled={!q.trim()}>Ask</button>
      </form>
      {answer && (
        <div className="lch-ans" role="status" aria-live="polite">
          <p className="lch-ans-q sub">{answer.q}</p>
          {answer.thinking ? <div className="sk sk-line" /> : <p className="lch-ans-t">{answer.text}</p>}
          {answer.used.length > 0 && <details className="lch-ans-used"><summary className="sub">The figures used</summary><ul>{answer.used.filter(Boolean).map(u => <li key={u}>{u}</li>)}</ul></details>}
        </div>
      )}
      <div className="lch-mx">
        <Metric label="Theoretical" fig={theo} sub="the ideal speed" onWhy={f => setWhy({ fig: f, title: 'Theoretical' })} />
        <Metric label="Demonstrated" fig={dem} sub="a typical shift proved" onWhy={f => setWhy({ fig: f, title: 'Demonstrated' })} />
        <Metric label="Plannable" fig={plan} sub="four shifts in five" tone="limit" onWhy={f => setWhy({ fig: f, title: 'Plannable' })} />
      </div>
      <p className={'lch-con' + (a.trend.moved ? ' is-moved' : '')}>
        <b>{constraintSays}</b> {a.trend.weeks.length > 0 && a.trend.says}
      </p>
      {a.changes.length > 0 && (
        <div className="lch-chg">
          <h3 className="lch-h">What changed this week</h3>
          <ul>
            {a.changes.map(c => (
              <li key={c.key} className={'is-' + c.kind}>
                <button type="button" className="lch-link" onClick={() => setWhy({ title: c.key, fig: figure(`${fmt(c.thisWeek, 0)} min`, c.says, stopSrc(obs.filter(o => c.ids.includes(o.id))), { confidence: confidenceOf(obs.filter(o => c.ids.includes(o.id)).map(o => o.startedAt), 'stop') }) })}>{c.says}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="lch-fall">
        <h3 className="lch-h">Where the time went <span className="sub">the last {PERIOD_WEEKS} weeks’ counted shifts</span></h3>
        <p className="lch-fall-says">{a.fall.says}</p>
        {a.fall.shifts > 0 && (
          <ol className="lch-bands" aria-label="Where the planned time went">
            <li className="lch-band is-plan"><span className="lch-bl">Planned</span><span className="lch-bar"><i style={{ width: '100%' }} /></span><span className="lch-bv">{hours(a.fall.plannedMin)}</span></li>
            {a.fall.bands.map(b => {
              const stops = b.kind === 'cause' || b.kind === 'changeover'
                ? a.figs.filter(f => b.countIds.includes(f.id)).flatMap(f => (f.study.facts.losses ? stopsOfBar(obs, f.study.facts.losses, b, wsId) : []))
                : [];
              /* a band made of several machines' stops: its own share on the constraint, from its stops */
              const sh = stops.length && a.constraint && b.kind === 'cause' ? constraintShare(stops, a.constraint) : undefined;
              const onC = sh ? (sh.share >= 0.5) : b.onConstraint;
              const said = sh?.says ?? b.says;
              return (
                <li key={b.key} className={'lch-band' + (onC === true ? ' is-on' : onC === false ? ' is-off' : '')}>
                  <button type="button" className="lch-bandb" onClick={() => setWhy({ title: b.label, fig: figure(`${fmt(b.min, 0)} min`, `${b.label}${b.asset ? `, mostly the ${b.asset}` : ''} — summed across ${b.countIds.length} counted shift${b.countIds.length === 1 ? '' : 's'}.${said ? ` ${said}` : ''}`, [...shiftSrc(b.countIds), ...stopSrc(stops)], { from, to: now }) })}>
                    <span className="lch-bl">{b.label}{onC === true && <em className="lch-tag">constraint</em>}</span>
                    <span className="lch-bar"><i style={{ width: `${Math.max(1, (b.min / max) * 100)}%` }} /></span>
                    <span className="lch-bv">{hours(b.min)}{b.contribution != null || b.labour != null ? <small> · £{fmt((b.labour ?? 0) + (b.contribution ?? 0), 0)}</small> : null}</span>
                  </button>
                  {said && onC !== true && <p className="lch-mirage">{said}</p>}
                </li>
              );
            })}
            <li className="lch-band is-good"><span className="lch-bl">Good {unit}</span><span className="lch-bar"><i style={{ width: `${Math.max(1, (a.fall.goodMin / max) * 100)}%` }} /></span><span className="lch-bv">{hours(a.fall.goodMin)}</span></li>
          </ol>
        )}
      </div>
      {/* WHERE AND WHEN IT STOPS — a machine × day grid, darker the more
          minutes; a band across is chronic, a dark cell one bad day
          (lib/intelligence heatOf). Neutral ink, never a state colour; the
          sentence says what the eye should find. */}
      {heat.rows.length > 0 && (
        <div className="lch-heat">
          <h3 className="lch-h">Where and when it stops <span className="sub">stop minutes a day, the last four weeks</span></h3>
          <p className="lch-fall-says">{heat.says}</p>
          <div className="lch-hm" role="table" aria-label="Stop minutes by machine and day" style={{ ['--hm-days' as string]: heat.days }}>
            {heat.rows.map(row => {
              const onC = onConstraint(row.asset, a.constraint).on === true;
              return (
                <div key={row.asset} className="lch-hm-row" role="row">
                  <span className="lch-hm-l" role="rowheader">{row.asset}{onC && <em className="lch-tag">constraint</em>}</span>
                  {row.min.map((m, i) => {
                    const d0 = heat.from + i * 86_400_000;
                    const day = new Date(d0).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                    const list = obs.filter(o => !o.deletedAt && o.asset.trim().toLowerCase() === row.asset.toLowerCase() && o.startedAt >= d0 && o.startedAt < d0 + 86_400_000);
                    return m < 1
                      ? <span key={i} className="lch-hm-c" role="cell" aria-label={`${row.asset}, ${day}: no stops`} />
                      : <button key={i} type="button" role="cell" className="lch-hm-c is-on" style={{ ['--hm' as string]: Math.max(0.12, m / heat.max) }}
                          aria-label={`${row.asset}, ${day}: ${fmt(m, 0)} min stopped`} title={`${day} — ${fmt(m, 0)} min`}
                          onClick={() => setWhy({ title: `${row.asset} — ${day}`, fig: figure(`${fmt(m, 0)} min`, `The ${row.asset}'s stops on ${day}, overlapping ones counted once.`, stopSrc(list), { from: d0, to: d0 + 86_400_000 }) })} />;
                  })}
                </div>
              );
            })}
            <div className="lch-hm-row lch-hm-ax" aria-hidden><span className="lch-hm-l" /><span className="lch-hm-a">4 weeks ago</span><span className="lch-hm-b">today</span></div>
          </div>
        </div>
      )}
      {/* NEXT WEEK'S ORDERS — will they fit? (lib/intelligence loadVsDemand) */}
      <details className="lch-lev lch-dem" open={a.load.rows.length > 0}>
        <summary className="lch-h">Will next week’s orders fit? <span className="sub">type or paste them — {a.weekFrom ? `the week from ${a.weekFrom}` : 'the line’s week is not known yet'}</span></summary>
        <p className={'lch-dem-says' + ((a.load.headroomH ?? 0) < 0 ? ' is-over' : '')} aria-live="polite"><b>{a.load.says}</b></p>
        <ul className="lch-dem-rows">
          {products.filter(p => p.capacity?.stations.length).map(p => <DemandRow key={p.id} s={p} unit={unit} hours={a.load.rows.find(r => r.product === p.product)?.hours} />)}
        </ul>
        <DemandPaste products={products} />
      </details>
      {/* RECOVERY LEVERS — slide a loss down, see what comes back; the mirage kept */}
      {levers && levers.rows.length > 0 && (
        <details className="lch-lev">
          <summary className="lch-h">What if we took some of it back? <span className="sub">slide a loss down — packs and £ come back only at the constraint</span></summary>
          <ul className="lch-lev-rows">
            {levers.rows.map(r => (
              <li key={r.key} className={r.onConstraint === false ? 'is-off' : r.onConstraint ? 'is-on' : ''}>
                <label className="lch-lev-l">
                  <span><b>{r.label}</b>{r.asset ? ` · ${r.asset}` : ''}{r.onConstraint && <em className="lch-tag">constraint</em>} <span className="sub">{fmt(r.perShift, 1)} min a shift</span></span>
                  <input type="range" min={0} max={100} step={10} value={r.pct} aria-label={`Take ${r.label} down by`}
                    onChange={e => setPct({ ...pct, [r.key]: Number(e.target.value) })} />
                  <span className="lch-lev-p">{fmt(r.pct, 0)}%</span>
                </label>
                {r.says && <p className={'lch-lev-says' + (r.onConstraint === false ? ' is-mirage' : '')}>{r.says}</p>}
              </li>
            ))}
          </ul>
          <p className="lch-lev-sum" aria-live="polite"><b>{levers.says}</b>{!a.shiftsPerWeek && <span className="sub"> The week needs the line’s running pattern — set it on the line’s SMED (how the line runs).</span>}</p>
        </details>
      )}
      {/* THE WEEK, TO SEND — the panel's own sentences as one paragraph to
          paste into a message (lib/intelligence weeklyBrief; no AI) */}
      <details className="lch-lev lch-brief">
        <summary className="lch-h">The week, to send <span className="sub">this panel in a paragraph — copy it into a message</span></summary>
        <p className="lch-brief-t">{brief.join(' ')}</p>
        <button type="button" className="btn" onClick={() => { void navigator.clipboard?.writeText(brief.join('\n')).then(() => setCopied(true), () => setCopied(false)); }}>
          {copied ? 'Copied' : 'Copy the week'}
        </button>
      </details>
      <WhyNumber fig={why?.fig ?? null} title={why?.title} onClose={() => setWhy(null)} />
    </section>
  );
}

/** One product's orders for next week, typed where it sits — the product's
 *  Line capacity holds it; on a job, the job's people may change it. */
function DemandRow({ s, unit, hours }: { s: Standard; unit: string; hours?: number }) {
  const jobCan = useAccess(s.projectId ?? '');
  const may = s.projectId ? jobCan : canOf('owner');
  const save = (v: number | undefined) => {
    if (!s.capacity) return;
    const before = s;
    void putStandard({ ...s, capacity: { ...s.capacity, demandPerWeek: v } });
    offerUndo(`Orders for ${s.product} ${v != null ? `set to ${v.toLocaleString('en-GB')}` : 'cleared'}`, async () => { await putStandard(before); });
  };
  return (
    <li className="lch-dem-row">
      <span className="lch-dem-p">{s.product}</span>
      {may.edit
        ? <DraftNumber className="text-input lch-dem-in" value={s.capacity?.demandPerWeek} placeholder="orders" label={`Orders next week for ${s.product}, ${unit}`} onSave={save} />
        : <b>{s.capacity?.demandPerWeek != null ? s.capacity.demandPerWeek.toLocaleString('en-GB') : '—'}</b>}
      <span className="sub lch-dem-h">{hours != null ? `${hours.toLocaleString('en-GB', { maximumFractionDigits: 1 })} h` : ''}</span>
    </li>
  );
}

/** Orders pasted from a sheet — "product, quantity" a line — matched by name. */
function DemandPaste({ products }: { products: Standard[] }) {
  const [text, setText] = useState('');
  const [said, setSaid] = useState('');
  const apply = async () => {
    const got = parseDemand(text, products.map(p => p.product));
    for (const g of got) {
      const p = products.find(x => x.product === g.product);
      if (p?.capacity) await putStandard({ ...p, capacity: { ...p.capacity, demandPerWeek: g.demand } });
    }
    setSaid(got.length ? `${got.length} product${got.length === 1 ? '' : 's'} set from the paste.` : 'Nothing matched a product on this line — one “product, quantity” a line.');
    if (got.length) setText('');
  };
  return (
    <details className="lch-paste">
      <summary className="sub">Paste from a sheet</summary>
      <textarea className="text-area" rows={3} value={text} placeholder={'Maris Piper 2kg, 12000\nTesco Express 1.25 kg, 4000'} aria-label="Orders pasted, a product and a quantity a line" onChange={e => setText(e.target.value)} />
      <button type="button" className="btn btn-sm" disabled={!text.trim()} onClick={() => void apply()}>Use these</button>
      {said && <span className="sub" role="status"> {said}</span>}
    </details>
  );
}
