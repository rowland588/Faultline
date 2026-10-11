/* THE WORK BALANCE — the Line balance page's second view, People (docs/TOOLKIT.md,
 * tools 3 and 4; lib/ie/balance).
 *
 * Rowland, 10 October, of the line balance: "thought it would be more Lean
 * 4.0". The Machines view (lib/capacity) is speeds typed in, and stays. This
 * is the work as people do it:
 *   - the elements, each with whose it is — started from the map's people
 *     and what they do, so nothing is typed twice;
 *   - timed on the phone: one big Lap button, the element it closes named on
 *     it, the split running above; an interruption tapped Foreign and kept
 *     out; the pace seen rated 75 · 90 · 100 · 110 · 125;
 *   - stacked person by person against the takt agreed (the Yamazumi), the
 *     part over takt red, the constraint named under its stack;
 *   - a suggested balance drawn as a ghost beside the real one, used only
 *     when a person says so;
 *   - Set as the standard: closed as a receipt, and the line standard's map
 *     and its card read it — each person's work against takt.
 *
 * One record: a study of tool 'balance' on this product's line standard
 * (standardId). Its laps merge entry by entry between two phones (2b). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listAllStudies, onDataChange, patchStudy, putStudy } from '../db';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { now, uid } from '../lib/ids';
import { niceDay } from '../lib/weeks';
import { peopleOf, type Standard } from '../lib/standard';
import { balance, balanceSays, elementSays, secs, suggest, type BalanceFigures } from '../lib/ie/balance';
import type { AgreedBalance, BalanceStep, ToolStudy } from '../lib/study';
import type { Can } from '../lib/access';

const RATINGS = [75, 90, 100, 110, 125];

/** The latest work balance on a line standard, kept current; null when none. */
export function useBalanceFor(standardId: string): ToolStudy | null | undefined {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => {
    const all = (await listAllStudies()).filter(x => x.tool === 'balance' && x.standardId === standardId);
    setS(all[0] ?? null);
  }, [standardId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return s;
}

/** The work as the map and the card read it: each person's work against takt. */
export function workOf(study: ToolStudy | null | undefined, onMap?: number):
  { taktSec: number; people: { who: string; work: number; over: boolean; source: string }[]; text: string; short: string; set?: number } | undefined {
  const a = study?.agreed?.balance;
  if (!study || !a) return undefined;
  const f = balance(study.facts.steps, a);
  if (!f.people.length) return undefined;
  /* The card's one line leads with what matters: the constraint and how far over. */
  const c = f.constraint;
  const short = `${secs(f.total)} of work at a ${secs(a.taktSec)} takt${c ? `: ${c.who} the constraint at ${secs(c.work)}${c.overBy ? `, over by ${secs(c.overBy)}` : ''}` : ''}.`;
  return { taktSec: a.taktSec, people: f.people.map(p => ({ who: p.who, work: p.work, over: p.overBy > 0, source: p.source })),
    text: balanceSays(f, onMap).text, short, ...(study.closedAt ? { set: study.closedAt } : {}) };
}

/** Each product's work, for the card on paper (lib/standardCard): the latest
 *  work balance on each line standard. */
export async function worksFor(list: Standard[]): Promise<Record<string, ReturnType<typeof workOf>>> {
  const all = (await listAllStudies()).filter(x => x.tool === 'balance');
  return Object.fromEntries(list.map(st => [st.id, workOf(all.find(x => x.standardId === st.id), peopleOf(st).length || undefined)]));
}

export function WorkView({ s, can }: { s: Standard; can: Can }) {
  const study = useBalanceFor(s.id);
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  if (study === undefined) return <p className="sub">Opening…</p>;
  if (study === null) return <Start s={s} can={can} />;
  return <Work study={study} s={s} can={can} me={me} />;
}

/* ------------------------------------------------------------ the first time */
function Start({ s, can }: { s: Standard; can: Can }) {
  const people = peopleOf(s);
  const start = () => {
    const t = now();
    /* The map's people and what they do become the elements — nothing typed twice. */
    const steps: BalanceStep[] = people.map((p, i) => ({ id: uid(), order: i, name: p.task?.trim() || 'Their work', who: p.label?.trim() || `Op ${i + 1}` }));
    void putStudy({ id: uid(), tool: 'balance', name: s.product, standardId: s.id,
      ...(s.workspaceId ? { workspaceId: s.workspaceId } : {}), ...(s.projectId ? { projectId: s.projectId } : {}),
      facts: { steps }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  };
  return (
    <div className="wb-start">
      <p><b>Time the work, person by person, against the pace the line must keep.</b></p>
      <p className="sub">Each element and whose it is — {people.length ? `started from the map’s ${people.length} ${people.length === 1 ? 'person' : 'people'} and what they do` : 'add them as you go'} — timed on the phone with one button, then stacked against takt so the constraint is a person and a number.</p>
      {can.edit ? <button type="button" className="btn btn-primary" onClick={start}>Start the work balance</button>
        : <p className="sub">Nobody has timed the work on this product yet.</p>}
    </div>
  );
}

/* ------------------------------------------------------------ the balance */
function Work({ study, s, can, me }: { study: ToolStudy; s: Standard; can: Can; me?: string }) {
  const a = study.agreed?.balance;
  const steps = useMemo(() => study.facts.steps ?? [], [study.facts.steps]);
  const f = useMemo(() => balance(steps, a), [steps, a]);
  const onMap = peopleOf(s).length || undefined;
  const said = balanceSays(f, onMap);
  const ghost = useMemo(() => suggest(f), [f]);
  const [showGhost, setShowGhost] = useState(false);
  const [timing, setTiming] = useState<string | null>(null);
  const [agreeing, setAgreeing] = useState(false);
  const closed = !!study.closedAt;
  const editable = can.edit && !closed;
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(study.id, p);
  const setSteps = (fn: (cur: BalanceStep[]) => BalanceStep[]) => write(cur => ({ facts: { ...cur.facts, steps: fn(cur.facts.steps ?? []) } }));
  const who = [...new Set([...f.people.map(p => p.who), ...peopleOf(s).map((p, i) => p.label?.trim() || `Op ${i + 1}`)])];

  if (!a || agreeing) return <Agree study={study} can={can} onDone={() => setAgreeing(false)} cancel={a ? () => setAgreeing(false) : undefined} />;

  if (timing) {
    const mine = steps.filter(x => x.who === timing).sort((x, y) => x.order - y.order);
    return <Timer who={timing} steps={mine} me={me} onLap={(id, lap) => setSteps(cur => cur.map(x => (x.id === id ? { ...x, laps: [...(x.laps ?? []), lap] } : x)))} onDone={() => setTiming(null)} />;
  }

  return (
    <div className="wb">
      <div className="wb-strip ie-strip" role="group" aria-label="Where the work stands">
        <span className="ie-fig">takt <b>{secs(a.taktSec)}</b></span>
        <span className="ie-fig"><b>{secs(f.total)}</b> of work</span>
        <span className={'ie-fig' + (onMap !== undefined && f.fewest !== undefined && onMap !== f.fewest ? ' is-a' : '')}><b>{f.fewest ?? '—'}</b> needed · {f.people.length} working</span>
        {f.efficiency !== undefined && <span className="ie-fig"><b>{Math.round(f.efficiency * 100)}%</b> balanced</span>}
        {f.constraint && <span className={'ie-fig' + (f.constraint.overBy ? ' is-r' : '')}>constraint <b>{f.constraint.who}</b></span>}
        {a.allowance ? <span className="ie-fig is-n">+{Math.round(a.allowance * 100)}% allowance</span> : null}
      </div>
      <div className="ie-says">
        {said.lines.filter(l => l.tone === 'r').map(l => <p key={l.text} className="ie-say is-r">{l.text}</p>)}
        <p className="ie-say">{said.text}</p>
        {said.lines.filter(l => l.tone !== 'r').map(l => <p key={l.text} className={'ie-say ie-cap is-' + l.tone}>{l.text}</p>)}
      </div>

      <div className="ie-pic"><Stacks f={f} ghost={showGhost ? ghost : undefined} /></div>
      <div className="wb-acts">
        {ghost && <button type="button" className="btn" aria-pressed={showGhost} onClick={() => setShowGhost(g => !g)}>{showGhost ? 'Hide the suggestion' : 'Suggest a balance'}</button>}
        {showGhost && ghost && editable && (
          <button type="button" className="btn btn-primary" onClick={() => {
            const to = new Map(ghost.flatMap(g => g.ids.map(id => [id, g.who] as const)));
            setSteps(cur => cur.map(x => ({ ...x, who: to.get(x.id) ?? x.who })));
            setShowGhost(false);
          }}>Use it</button>
        )}
      </div>

      {f.people.map(p => (
        <section key={p.who} className="wb-person">
          <div className="wb-ph">
            <h3>{p.who}</h3>
            <span className={'wb-pw' + (p.overBy ? ' is-r' : '')}>{secs(p.work)} of {secs(a.taktSec)}{p.overBy ? ` — over by ${secs(p.overBy)}` : p.spare ? ` — ${secs(p.spare)} to spare` : ''}{p.source !== 'timed' ? ` · ${p.source === 'typed' ? 'some typed' : 'some not timed'}` : ''}</span>
            {editable && <button type="button" className="btn btn-primary wb-time" onClick={() => setTiming(p.who)}>Time {p.who}</button>}
          </div>
          <ul className="wb-els">
            {steps.filter(x => x.who === p.who).sort((x, y) => x.order - y.order).map(st => (
              <Element key={st.id} st={st} e={p.elements.find(e => e.id === st.id)} allowance={a.allowance ?? 0} who={who} editable={editable} canRemove={can.remove || !study.projectId}
                onChange={patch => setSteps(cur => cur.map(x => (x.id === st.id ? { ...x, ...patch } : x)))}
                onRemove={() => setSteps(cur => cur.filter(x => x.id !== st.id))} />
            ))}
          </ul>
        </section>
      ))}
      {editable && <AddElement who={who} onAdd={(name, w) => setSteps(cur => [...cur, { id: uid(), order: Math.max(-1, ...cur.map(x => x.order)) + 1, name, who: w }])} />}

      <p className="ie-agreed sub">Agreed: <b>takt {secs(a.taktSec)}{a.allowance ? `, +${Math.round(a.allowance * 100)}% allowance` : ', no allowance'}</b>
        {can.agree && !closed && <button type="button" className="linkish" onClick={() => setAgreeing(true)}>Change what was agreed</button>}</p>
      <div className="ie-act">
        {closed ? (
          <>
            <p className="ie-receipt"><b>Set as the standard {niceDay(new Date(study.closedAt ?? 0).toISOString().slice(0, 10))}</b> — the map and its card read it. {study.receipt?.text}</p>
            {can.agree && <button type="button" className="btn" onClick={() => write({ closedAt: undefined })}>Reopen to time again</button>}
          </>
        ) : can.agree && f.people.length > 0 && !f.untimed && (
          <button type="button" className="btn btn-primary" onClick={() => write({ closedAt: now(),
            receipt: { at: now(), ...(me ? { by: me } : {}), text: said.text, tone: said.tone,
              figures: { taktSec: a.taktSec, total: +f.total.toFixed(2), fewest: f.fewest ?? null, people: f.people.length, efficiency: f.efficiency !== undefined ? +f.efficiency.toFixed(3) : null } } })}>
            Set as the standard
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ agree the takt */
function Agree({ study, can, onDone, cancel }: { study: ToolStudy; can: Can; onDone: () => void; cancel?: () => void }) {
  const a = study.agreed?.balance;
  const [takt, setTakt] = useState(a?.taktSec?.toString() ?? '');
  const [demand, setDemand] = useState('');
  const [mins, setMins] = useState('');
  const [allow, setAllow] = useState(a?.allowance ? String(Math.round(a.allowance * 100)) : '');
  const fromDemand = Number(demand) > 0 && Number(mins) > 0 ? (Number(mins) * 60) / Number(demand) : undefined;
  const t = takt.trim() ? Number(takt) : fromDemand;
  const al = allow.trim() ? Number(allow) / 100 : 0;
  const problem = !(t && t > 0) ? 'The takt — seconds a piece, or what is needed in the time there is.' : !(al >= 0 && al < 1) ? 'The allowance as a percentage, under 100.' : '';
  if (!can.agree) return <div className="ie-agree is-wait"><p><b>The takt isn’t agreed yet.</b> The job’s owner agrees the pace the line must keep before the work is balanced against it.</p></div>;
  return (
    <form className="ie-agree" onSubmit={e => { e.preventDefault(); if (problem || !t) return;
      const agreed: AgreedBalance = { taktSec: +t.toFixed(2), ...(al ? { allowance: al } : {}) };
      void patchStudy(study.id, cur => ({ agreed: { ...cur.agreed, balance: agreed } })); onDone(); }}>
      <h2>Agree the takt</h2>
      <p className="sub">The pace the line must keep — agreed before the work is timed, so a lap never moves it.</p>
      <div className="ie-agree-grid">
        <label className="field"><span className="field-label">Takt, seconds a piece</span>
          <input className="text-input" inputMode="decimal" value={takt} onChange={e => setTakt(e.target.value)} placeholder={fromDemand ? fromDemand.toFixed(1) : '12'} /></label>
        <label className="field"><span className="field-label">Or: needed a shift</span>
          <input className="text-input" inputMode="numeric" value={demand} onChange={e => setDemand(e.target.value)} placeholder="2,000" /></label>
        <label className="field"><span className="field-label">in minutes available</span>
          <input className="text-input" inputMode="numeric" value={mins} onChange={e => setMins(e.target.value)} placeholder="420" /></label>
        <label className="field"><span className="field-label">Allowance, % <i className="sub">rest and contingency</i></span>
          <input className="text-input" inputMode="decimal" value={allow} onChange={e => setAllow(e.target.value)} placeholder="0" /></label>
      </div>
      {fromDemand && !takt.trim() && <p className="ie-note">{demand} a shift in {mins} minutes is a takt of {fromDemand.toFixed(1)} s.</p>}
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>Agree it</button>
        {cancel && <button type="button" className="btn" onClick={cancel}>Keep what was agreed</button>}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------ the Yamazumi */
const SW = 640, SH = 270, SP = { l: 10, r: 86, t: 14, b: 44 };

function Stacks({ f, ghost }: { f: BalanceFigures; ghost?: { who: string; ids: string[]; work: number }[] }) {
  const takt = f.taktSec ?? 0;
  const cols = f.people.length + (ghost ? ghost.length + 1 : 0);
  if (!f.people.length || !takt) return <p className="sub ie-pic-empty">Each person’s work stacks here against the takt.</p>;
  const top = Math.max(takt * 1.2, ...f.people.map(p => p.work * 1.08), ...(ghost ?? []).map(g => g.work * 1.08));
  const y = (v: number) => SP.t + (1 - v / top) * (SH - SP.t - SP.b);
  const colW = (SW - SP.l - SP.r) / Math.max(cols, 1), bw = Math.min(64, colW * 0.6);
  const x = (i: number) => SP.l + i * colW + (colW - bw) / 2;
  const byId = new Map(f.elements.map(e => [e.id, e]));
  return (
    <svg className="wb-svg" viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label={`Each person’s work against a ${secs(takt)} takt`}>
      <line className="wb-takt" x1={SP.l} x2={SW - SP.r} y1={y(takt)} y2={y(takt)} />
      <text className="wb-lw" x={SW - SP.r + 6} y={y(takt) + 5}>takt {secs(takt)}</text>
      {f.people.map((p, i) => {
        let acc = 0;
        return (
          <g key={p.who}>
            {p.elements.map(e => {
              const t = e.standard ?? 0; if (t <= 0) return null;
              const y0 = y(acc), y1 = y(acc + t); acc += t;
              const h = y0 - y1;
              return (
                <g key={e.id}>
                  <rect className={'wb-seg' + (e.source === 'typed' ? ' is-typed' : '')} x={x(i)} y={y1} width={bw} height={h} />
                  {h > 16 && <text className={'wb-st' + (e.source === 'typed' ? ' is-typed' : '')} x={x(i) + bw / 2} y={y1 + h / 2 + 4}>{e.name.length > 9 ? `${e.name.slice(0, 8)}…` : e.name}</text>}
                </g>
              );
            })}
            {p.overBy > 0 && <rect className="wb-over" x={x(i)} y={y(p.work)} width={bw} height={y(takt) - y(p.work)} />}
            <text className="wb-who" x={x(i) + bw / 2} y={SH - SP.b + 16}>{p.who}</text>
            <text className={'wb-w' + (p.overBy ? ' is-r' : '')} x={x(i) + bw / 2} y={SH - SP.b + 30}>{secs(p.work)}{f.constraint === p ? ' · constraint' : ''}</text>
          </g>
        );
      })}
      {ghost && (
        <g>
          <text className="wb-lw" x={x(f.people.length) + bw / 2} y={SH - SP.b + 16} textAnchor="middle">suggested →</text>
          {ghost.map((g, j) => {
            let acc = 0; const i = f.people.length + 1 + j;
            return (
              <g key={g.who}>
                {g.ids.map(id => { const t = byId.get(id)?.standard ?? 0; const y0 = y(acc), y1 = y(acc + t); acc += t; return <rect key={id} className="wb-ghost" x={x(i)} y={y1} width={bw} height={y0 - y1} />; })}
                <text className="wb-who" x={x(i) + bw / 2} y={SH - SP.b + 16}>{g.who}</text>
                <text className="wb-w" x={x(i) + bw / 2} y={SH - SP.b + 30}>{secs(g.work)}</text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------ one element */
function Element({ st, e, allowance, who, editable, canRemove, onChange, onRemove }: {
  st: BalanceStep; e?: ReturnType<typeof balance>['elements'][number]; allowance: number; who: string[]; editable: boolean; canRemove: boolean;
  onChange: (p: Partial<BalanceStep>) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const said = e ? elementSays(e, allowance) : { text: '', tone: 'n' as const };
  const far = new Set(e?.far ?? []);
  return (
    <li className="wb-el">
      <div className="wb-el-h">
        {editable ? <input className="text-input wb-name" value={st.name} aria-label="The element" onChange={ev => onChange({ name: ev.target.value })} />
          : <b>{st.name}</b>}
        {editable && (
          <select className="text-input wb-who-s" value={st.who} aria-label="Whose it is" onChange={ev => {
            const v = ev.target.value === '__new' ? (window.prompt('Who? (as on the map — e.g. Op 4)') ?? '').trim() : ev.target.value;
            if (v) onChange({ who: v });
          }}>
            {who.map(w => <option key={w} value={w}>{w}</option>)}
            <option value="__new">Someone else…</option>
          </select>
        )}
      </div>
      <p className={'wb-said is-' + said.tone}>{said.text}</p>
      <div className="wb-el-acts">
        {editable && (st.laps ?? []).length > 0 && (
          <span className="chip-row" role="radiogroup" aria-label="The pace seen">
            {RATINGS.map(r => <button key={r} type="button" role="radio" aria-checked={(st.rating ?? 100) === r} className={'chip' + ((st.rating ?? 100) === r ? ' on' : '')} onClick={() => onChange({ rating: r })}>{r}</button>)}
          </span>
        )}
        {editable && !(st.laps ?? []).length && (
          <label className="wb-typed">or type it: <input className="text-input" inputMode="decimal" defaultValue={st.typedSec ?? ''} aria-label="Typed seconds" placeholder="s"
            onBlur={ev => { const v = Number(ev.target.value); onChange({ typedSec: v > 0 ? v : undefined }); }} /> s</label>
        )}
        {(st.laps ?? []).length > 0 && <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Laps'} — {(st.laps ?? []).length}</button>}
        {editable && canRemove && <button type="button" className="linkish wb-rm" onClick={onRemove}>Take it off</button>}
      </div>
      {open && (
        <ol className="wb-laps">
          {(st.laps ?? []).map(l => (
            <li key={l.id} className={(l.struck ? 'is-struck' : '') + (l.foreign ? ' is-foreign' : '') + (far.has(l.id) ? ' is-far' : '')}>
              {editable && !l.foreign ? <button type="button" className="linkish" onClick={() => onChange({ laps: (st.laps ?? []).map(x => (x.id === l.id ? { ...x, struck: !x.struck || undefined } : x)) })}>{l.sec.toFixed(1)} s</button>
                : <span>{l.sec.toFixed(1)} s</span>}
              {l.foreign ? ' foreign' : far.has(l.id) ? ' far from the rest' : ''}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

function AddElement({ who, onAdd }: { who: string[]; onAdd: (name: string, who: string) => void }) {
  const [name, setName] = useState(''), [w, setW] = useState(who[0] ?? 'Op 1');
  return (
    <form className="wb-add" onSubmit={ev => { ev.preventDefault(); if (name.trim()) { onAdd(name.trim(), w.trim() || 'Op 1'); setName(''); } }}>
      <input className="text-input" value={name} placeholder="Another element — e.g. Tape and stack the case" aria-label="Another element" onChange={ev => setName(ev.target.value)} />
      <input className="text-input wb-who-i" value={w} list="wb-who" aria-label="Who does it" onChange={ev => setW(ev.target.value)} />
      <datalist id="wb-who">{who.map(x => <option key={x} value={x} />)}</datalist>
      <button type="submit" className="btn" disabled={!name.trim()}>Add</button>
    </form>
  );
}

/* ------------------------------------------------------------ the stopwatch */
function Timer({ who, steps, me, onLap, onDone }: {
  who: string; steps: BalanceStep[]; me?: string;
  onLap: (stepId: string, lap: NonNullable<BalanceStep['laps']>[number]) => void; onDone: () => void;
}) {
  /* The timestamp is the truth: each tap's lap is now − the last tap. */
  const [last, setLast] = useState<number | null>(null);
  const [i, setI] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [tick, setTick] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => { timer.current = window.setInterval(() => setTick(x => x + 1), 100); return () => window.clearInterval(timer.current); }, []);
  void tick;
  if (!steps.length) return <div className="wb-timer"><p>No elements for {who} yet.</p><button type="button" className="btn" onClick={onDone}>Back</button></div>;
  const cur = steps[i % steps.length];
  const split = last ? (now() - last) / 1000 : 0;
  const lap = (foreign: boolean) => {
    const t = now();
    if (last) onLap(cur.id, { id: uid(), sec: +((t - last) / 1000).toFixed(1), at: t, ...(me ? { who: me } : {}), ...(foreign ? { foreign: true } : {}) });
    setLast(t);
    if (!foreign && last) {
      if ((i + 1) % steps.length === 0) setCycle(c => c + 1);
      setI(x => x + 1);
    }
  };
  return (
    <div className="wb-timer" aria-label={`Timing ${who}`}>
      <div className="wb-t-h"><b>Timing {who}</b><span className="sub">cycle {cycle} · element {(i % steps.length) + 1} of {steps.length}</span></div>
      <output className="wb-split" aria-live="off">{last ? split.toFixed(1) : '0.0'}<small> s</small></output>
      {!last ? (
        <button type="button" className="wb-lap" onClick={() => lap(false)}>Start — as {steps[0].name} begins</button>
      ) : (
        <button type="button" className="wb-lap" onClick={() => lap(false)}>Lap — {cur.name} done</button>
      )}
      <div className="wb-t-acts">
        {last && <button type="button" className="btn" onClick={() => lap(true)}>Foreign — leave this out</button>}
        <button type="button" className="btn" onClick={onDone}>Stop</button>
      </div>
      <p className="sub">Tap Lap as each element ends; the next one lights. An interruption: Foreign, and it is kept out.</p>
    </div>
  );
}
