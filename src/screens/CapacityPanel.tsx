/* WHERE THIS LINE IS LIMITED — the line's stations, in order, and the one that
 * holds everything else back.
 *
 * Belongs to 3P, at the Size step beside the Pareto: the Pareto says where TIME
 * is lost, this says where the LINE is limited even when nothing breaks. It
 * reads the line's own timed stops (the log the Pareto is drawn from) and writes
 * one document on the line (`capacity`). What it says is the same sentence the
 * client report prints — see lib/capacity.
 *
 * Editing follows the rest of the app: every field keeps its own draft and
 * writes when you leave it, and removing a station can be undone. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { DraftNumber, DraftText } from '../ui/Draft';
import { Fold } from '../ui/Fold';
import { offerUndo } from '../ui/Undo';
import { putPaceTodo, type PaceLineRow } from '../db';
import { uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { PILLARS, type PillarKey } from '../lib/pillars';
import {
  EMPTY_CAPACITY, analyse, blankStation, crossCheck, fmtN, lineIfRaised, stopStats, suggestRunning,
  type Capacity, type RatePer, type Station, type StationResult,
} from '../lib/capacity';
import { useLineStops } from '../lib/useLineStops';

const PER_WORD: Record<RatePer, string> = { sec: 'a second', min: 'a minute', hour: 'an hour' };
const SOURCES: { id: NonNullable<Station['source']>; label: string }[] = [
  { id: 'plate', label: 'On the plate' }, { id: 'timed', label: 'I timed it' }, { id: 'estimate', label: 'A guess' },
];

/* ================================ the ladder ================================ */

function Ladder({ r }: { r: ReturnType<typeof analyse> }) {
  const top = Math.max(...r.ok.map(x => x.running), r.target ?? 0) * 1.06 || 1;
  const at = (v: number) => `${Math.min(100, (v / top) * 100)}%`;
  return (
    <ol className="cap-ladder" aria-label={`Each station’s capacity in ${r.unit} a minute`}>
      {r.ok.map(x => {
        const isLimit = r.limit?.index === x.index;
        return (
          <li key={x.station.id} className={'cap-row' + (isLimit ? ' is-limit' : '')}>
            <span className="cap-who">
              <span className="cap-ic" aria-hidden>{x.station.kind === 'people' ? '●' : '▣'}</span>
              <b>{x.station.name.trim() || `Station ${x.index + 1}`}</b>
              {isLimit && <span className="cap-flag">limits the line</span>}
              {x.chain && <span className="cap-chain">{x.chain}</span>}
            </span>
            <span className="cap-track">
              {/* what it does at running speed, behind what it does once its own
                  stops are counted — the gap between them IS the stops */}
              <span className="cap-bar is-run" style={{ width: at(x.running) }} />
              <span className="cap-bar is-eff" style={{ width: at(x.effective) }} />
              {r.target != null && <span className="cap-target" style={{ left: at(r.target) }} title={`Target ${fmtN(r.target)} ${r.unit}/min`} />}
              {r.line != null && <span className="cap-pace" style={{ left: at(r.line) }} aria-hidden />}
            </span>
            <span className="cap-val">
              {fmtN(x.effective)}
              {x.effective < x.running - 1e-9 && <span className="cap-val-s">{fmtN(x.running)} running</span>}
            </span>
          </li>
        );
      })}
      <li className="cap-key" aria-hidden>
        <span><i className="cap-sw is-eff" /> with its stops</span>
        <span><i className="cap-sw is-run" /> running speed</span>
        {r.target != null && <span><i className="cap-sw is-target" /> target</span>}
        <span className="cap-key-u">{r.unit} a minute</span>
      </li>
    </ol>
  );
}

/* =============================== one station ================================ */

function StationCard({ s, i, last, prevUnit, planned, why, wait, own, suggested, patch, move, remove, assets, open, onToggle }: {
  s: Station; i: number; last: boolean; prevUnit?: string; planned?: number;
  why?: string; wait: number; own: number; suggested?: number;
  patch: (p: Partial<Station>) => void; move: (by: -1 | 1) => void; remove: () => void; assets: string[];
  /** ONE STATION OPEN AT A TIME. Every station's eight boxes were open at once
   *  — 57 buttons on the page — when the work is on one of them. Shut, a
   *  station is its name and one line of its numbers; tap Edit to open it. */
  open: boolean; onToggle: () => void;
}) {
  const cyc = s.rate == null && (s.cycleSec != null || s.perCycle != null);
  const [mode, setMode] = useState<'rate' | 'cycle'>(cyc ? 'cycle' : 'rate');
  const key = (x: string) => x.trim().toLowerCase();
  const logged = key(s.asset?.trim() || s.name);
  const matched = !!logged && assets.some(a => key(a) === logged);
  return (
    <li className={'cap-st' + (why ? ' has-problem' : '')}>
      <div className="cap-st-h">
        <span className="cap-st-n">{i + 1}</span>
        <DraftText value={s.name} placeholder="Name it — Bagger, Basketer, Carrier…" className="text-input cap-name" max={60}
          ariaLabel={`Station ${i + 1} name`} onSave={v => patch({ name: v })} />
        <span className="cw-seg" role="group" aria-label="Machine or people">
          {(['machine', 'people'] as const).map(k => (
            <button key={k} type="button" className={'chip' + (s.kind === k ? ' on' : '')} aria-pressed={s.kind === k}
              onClick={() => patch({ kind: k })}>{k === 'machine' ? 'Machine' : 'People'}</button>
          ))}
        </span>
        <span className="cap-st-acts">
          <button className="btn btn-ghost in-usual-b" onClick={() => move(-1)} disabled={i === 0} aria-label="Move earlier in the line">↑</button>
          <button className="btn btn-ghost in-usual-b" onClick={() => move(1)} disabled={last} aria-label="Move later in the line">↓</button>
          <button className="btn btn-ghost in-usual-b" onClick={remove} aria-label={`Remove ${s.name || 'this station'}`}>✕</button>
          <button type="button" className={'btn btn-sm' + (open ? ' btn-primary' : ' btn-ghost')} onClick={onToggle} aria-expanded={open}>{open ? 'Done' : 'Edit'}</button>
        </span>
      </div>

      {why && <p className="cap-why" role="note">Not counted yet: {why}.</p>}

      {!open && (
        <p className="cap-sum">
          {s.rate != null ? `${fmtN(s.rate)} ${s.unit.trim() || 'units'} ${PER_WORD[s.ratePer ?? 'min']}`
            : s.perCycle != null || s.cycleSec != null ? `${fmtN(s.perCycle ?? 0)} ${s.unit.trim() || 'units'} every ${fmtN(s.cycleSec ?? 0)} s`
              : 'no speed yet'}
          {' · '}{s.crew ?? 1} {s.kind === 'people' ? (s.crew === 1 ? 'person' : 'people') : 'of it'}
          {' · '}{s.runningPct ?? 100}% running · {s.goodPct ?? 100}% good
        </p>
      )}

      {open && <>
      <div className="cap-grid">
        <label className="proj-field">
          <span className="field-label">It counts in</span>
          <DraftText value={s.unit} placeholder="bags, baskets, pallets…" className="text-input" max={30}
            ariaLabel="What it counts in" onSave={v => patch({ unit: v })} />
        </label>

        {i > 0 && (
          <label className="proj-field">
            <span className="field-label">{s.unit.trim() ? `Each ${s.unit.trim().replace(/s$/i, '')} holds` : 'Each one holds'}</span>
            <span className="cap-inline">
              <DraftNumber className="text-input cap-num" value={s.contains} placeholder="how many" label="How many of the one before make one of these"
                onSave={v => patch({ contains: v ?? 0 })} />
              <span className="cap-unit">{prevUnit?.trim() || 'of the one before'}</span>
            </span>
          </label>
        )}

        <div className="proj-field cap-speed">
          <span className="field-label">How fast it runs</span>
          <span className="cw-seg" role="group" aria-label="Rate or cycle">
            <button type="button" className={'chip' + (mode === 'rate' ? ' on' : '')} aria-pressed={mode === 'rate'} onClick={() => setMode('rate')}>A rate</button>
            <button type="button" className={'chip' + (mode === 'cycle' ? ' on' : '')} aria-pressed={mode === 'cycle'} onClick={() => setMode('cycle')}>A cycle</button>
          </span>
          {mode === 'rate' ? (
            <span className="cap-inline">
              <DraftNumber className="text-input cap-num" value={s.rate} placeholder="70" label="Speed" onSave={v => patch({ rate: v, cycleSec: undefined, perCycle: undefined })} />
              <span className="cap-unit">{s.unit.trim() || 'units'}</span>
              <select className="text-input cap-sel" value={s.ratePer ?? 'min'} aria-label="Per second, minute or hour"
                onChange={e => patch({ ratePer: e.target.value as RatePer })}>
                {(Object.keys(PER_WORD) as RatePer[]).map(k => <option key={k} value={k}>{PER_WORD[k]}</option>)}
              </select>
            </span>
          ) : (
            <span className="cap-inline">
              <DraftNumber className="text-input cap-num" value={s.perCycle} placeholder="2" label="How many each cycle" onSave={v => patch({ perCycle: v, rate: undefined })} />
              <span className="cap-unit">{s.unit.trim() || 'units'} every</span>
              <DraftNumber className="text-input cap-num" value={s.cycleSec} placeholder="20" label="Seconds a cycle" onSave={v => patch({ cycleSec: v, rate: undefined })} />
              <span className="cap-unit">seconds</span>
            </span>
          )}
          {s.kind === 'people' && <span className="cap-hint">Use the pace they can keep up all shift — not their best lap.</span>}
        </div>

        <label className="proj-field">
          <span className="field-label">{s.kind === 'people' ? 'How many people' : 'How many of it'}</span>
          <DraftNumber className="text-input cap-num" value={s.crew ?? 1} placeholder="1" label="Crew" onSave={v => patch({ crew: v })} />
        </label>

        <label className="proj-field">
          <span className="field-label">Running — % of the time</span>
          <DraftNumber className="text-input cap-num" value={s.runningPct} placeholder="100" label="Percent of the time it is running" onSave={v => patch({ runningPct: v })} />
          {suggested != null && suggested < 100 && suggested !== (s.runningPct ?? 100) && (
            <button className="cw-link cap-sug" onClick={() => patch({ runningPct: suggested })}>
              Your last 4 weeks of stops say {suggested}% — use it
            </button>
          )}
          {suggested == null && own > 0 && !planned && (
            <span className="cap-hint">{Math.round(own)} min of its own stops in 4 weeks — set planned hours above to turn that into a percentage.</span>
          )}
        </label>

        <label className="proj-field">
          <span className="field-label">Good — % passed on</span>
          <DraftNumber className="text-input cap-num" value={s.goodPct} placeholder="100" label="Percent it passes on as good" onSave={v => patch({ goodPct: v })} />
        </label>
      </div>

      <div className="cap-st-f">
        <span className="cw-seg" role="group" aria-label="How the speed is known">
          {SOURCES.map(o => (
            <button key={o.id} type="button" className={'chip' + ((s.source ?? 'estimate') === o.id ? ' on' : '')}
              aria-pressed={(s.source ?? 'estimate') === o.id} onClick={() => patch({ source: o.id })}>{o.label}</button>
          ))}
        </span>
        <DraftText value={s.note ?? ''} placeholder="Where that came from — the date, who timed it, how many laps…" className="text-input cap-note" max={160}
          ariaLabel="Where the speed came from" onSave={v => patch({ note: v || undefined })} />
        <span className="cap-asset">
          <DraftText value={s.asset ?? ''} placeholder={`Stops logged as: ${s.name || 'this name'}`} className="text-input" max={60}
            ariaLabel="The machine name its stops are logged under" onSave={v => patch({ asset: v || undefined })} />
          {!matched && assets.length > 0 && (
            <span className="cap-picks">
              <span className="cap-hint">Your stops log has:</span>
              {assets.slice(0, 6).map(a => (
                <button key={a} type="button" className="chip" onClick={() => patch({ asset: a })}>{a}</button>
              ))}
            </span>
          )}
        </span>
        {(wait > 0 || own > 0) && (
          <span className="cap-hint">Last 4 weeks: {Math.round(own)} min its own stops · {Math.round(wait)} min waiting on neighbours</span>
        )}
      </div>
      </>}
    </li>
  );
}

/* ================================ the panel ================================= */

export function CapacityPanel({ projectId, line, onSave }: {
  projectId: string;
  line: PaceLineRow;
  onSave: (cap: Capacity) => Promise<void>;
}) {
  const stored = line.capacity ?? EMPTY_CAPACITY;
  const [cap, setCap] = useState<Capacity>(stored);
  const [editing, setEditing] = useState<string | null>(null);
  /* What this panel last wrote. A reload that has not caught up with it must
     not put the old document back over a field somebody has just left. */
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const j = JSON.stringify(stored);
    if (sent.current != null) { if (j === sent.current) sent.current = null; return; }
    setCap(stored);
  }, [stored]);

  const commit = (next: Capacity) => { setCap(next); sent.current = JSON.stringify(next); void onSave(next); };
  const patchStation = (id: string, p: Partial<Station>) =>
    commit({ ...cap, stations: cap.stations.map(s => (s.id === id ? { ...s, ...p } : s)) });

  const stops = useLineStops(line.workspaceId);
  const stats = useMemo(() => stopStats(stops.obs, cap.stations, stops.from, stops.to), [stops.obs, stops.from, stops.to, cap.stations]);
  const assets = useMemo(() => [...new Set(stops.obs.filter(o => !o.deletedAt && o.asset?.trim()).map(o => o.asset.trim()))].sort(), [stops.obs]);

  const r = useMemo(() => analyse(cap), [cap]);
  const check = useMemo(() => crossCheck(r, stats), [r, stats]);
  const why = (id: string) => r.skipped.find(x => x.station.id === id)?.why;

  const add = (kind: Station['kind'], name = '') => {
    const s = { ...blankStation(uid(), kind, cap.stations.length === 0), name };
    commit({ ...cap, stations: [...cap.stations, s] });
  };
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= cap.stations.length) return;
    const list = [...cap.stations];
    [list[i], list[j]] = [list[j], list[i]];
    commit({ ...cap, stations: list });
  };
  const remove = (s: Station) => {
    const before = cap;
    commit({ ...cap, stations: cap.stations.filter(x => x.id !== s.id) });
    offerUndo(`Removed ${s.name || 'the station'}`, async () => commit(before));
  };

  /* RAISING AN ACTION FROM THE FINDING. The sentence IS the why; the pillar is
     the limit's own — a machine is Plant, a crew is People — and can be changed. */
  const limit = r.limit;
  const [asking, setAsking] = useState(false);
  const [what, setWhat] = useState('');
  const [pillar, setPillar] = useState<PillarKey>('plant');
  const [owner, setOwner] = useState('');
  const [due, setDue] = useState('');
  const [raised, setRaised] = useState(false);
  const open = () => {
    if (!limit) return;
    setWhat(`Lift ${limit.station.name.trim() || 'the limiting station'} — it limits ${line.name}`);
    setPillar(limit.station.kind === 'people' ? 'people' : 'plant');
    setOwner(line.owner ?? '');
    setAsking(true); setRaised(false);
  };
  const raise = async () => {
    if (!limit || !what.trim()) return;
    const t = Date.now();
    await putPaceTodo({
      id: uid(), projectId, lineId: line.id, what: what.trim(), where: limit.station.name.trim(),
      why: r.sentence, who: owner.trim(), when: '', due: due || undefined, pillar,
      state: 'todo', createdAt: t, updatedAt: t,
    });
    setAsking(false); setRaised(true);
  };

  const worth = limit && r.next && r.line != null
    ? lineIfRaised(r, limit.index, limit.running) : undefined;

  return (
    <section className="pace-sec cap">
      <div className="pace-sec-head">
        <h2 className="pace-sec-title">Where {line.name} is limited</h2>
        <p className="pace-sec-sub">
          The stations in the order product goes through them, each at its own speed, put into one unit.
          The shortest bar is what holds everything else back — a screen to show where to look, not a simulation.
        </p>
      </div>

      <div className="cap-verdict">
        <span className="cap-eyebrow">What the sums say</span>
        <p className="cap-says">{r.sentence}</p>
        {worth != null && r.line != null && worth > r.line + 1e-9 && limit && (
          <p className="cap-sub">
            With none of {limit.station.name.trim() || 'its'}’s stops it would run {fmtN(limit.running)} {r.unit}/min — the line would then do {fmtN(worth)}
            {worth < limit.running - 1e-9 && r.next ? `, held by ${r.next.station.name.trim() || 'the next station'}` : ''}.
          </p>
        )}
      </div>

      {r.ok.length > 0 && <Ladder r={r} />}

      {(check || r.notes.length > 0) && (
        <ul className="cap-notes" role="note">
          {check && <li className="is-check"><b>Check this.</b> {check}</li>}
          {r.notes.map(n => <li key={n}>{n}</li>)}
        </ul>
      )}

      {limit && (
        raised ? (
          <p className="action-raised" role="status">
            ⚑ Action raised on <b>{limit.station.name.trim()}</b> — it is on the project’s board with this sentence as its why.
            <button className="linkish" onClick={() => nav(`/project/${projectId}/board`)}>See it on the board ›</button>
          </p>
        ) : !asking ? (
          <button className="board-cta" onClick={open}>
            <span className="board-cta-ic" aria-hidden>⚑</span>
            <span className="board-cta-main">Raise an action on {limit.station.name.trim() || 'the limit'}</span>
            <span className="board-cta-go" aria-hidden>›</span>
          </button>
        ) : (
          <div className="card action-form">
            <div className="field-label">⚑ Action on <b>{limit.station.name.trim()}</b></div>
            <textarea className="text-area" autoFocus rows={2} maxLength={300} value={what} onChange={e => setWhat(e.target.value)} />
            <div className="cw-seg" role="group" aria-label="People, Plant or Process" style={{ marginTop: 8 }}>
              {PILLARS.map(x => (
                <button key={x.key} type="button" className={'chip' + (pillar === x.key ? ' on' : '')}
                  aria-pressed={pillar === x.key} onClick={() => setPillar(x.key)}>{x.label}</button>
              ))}
            </div>
            <div className="row-inline" style={{ marginTop: 8 }}>
              <input className="text-input" value={owner} placeholder="Owner (who drives it)" maxLength={80} onChange={e => setOwner(e.target.value)} />
              <input className="text-input due-input" type="date" value={due} aria-label="Due date" onChange={e => setDue(e.target.value)} />
              <button className="btn btn-primary" onClick={() => void raise()} disabled={!what.trim()}>Raise</button>
              <button className="btn btn-ghost" onClick={() => setAsking(false)}>Cancel</button>
            </div>
          </div>
        )
      )}

      <div className="cap-settings">
        <label className="proj-field">
          <span className="field-label">What the line should do — {r.unit} a minute</span>
          <DraftNumber className="text-input cap-num" value={cap.targetPerMin} placeholder="e.g. 66" label="Target, line units a minute"
            onSave={v => commit({ ...cap, targetPerMin: v })} />
        </label>
        <label className="proj-field">
          <span className="field-label">Planned running hours a week</span>
          <DraftNumber className="text-input cap-num" value={cap.plannedHoursPerWeek} placeholder="e.g. 80" label="Planned hours a week"
            onSave={v => commit({ ...cap, plannedHoursPerWeek: v })} />
          <span className="cap-hint">Only used to suggest a running % from your stops. Nothing is changed for you.</span>
        </label>
      </div>

      <h3 className="cap-h">The stations, in order</h3>
      {cap.stations.length === 0 && (
        <div className="pace-empty">
          <p className="sub">
            Start at the front of the line. A bagger that does 70 a minute, then baskets that hold 12 bags and run 5½ a minute,
            then someone carrying them, then the palletiser. Each says what it counts in and how many of the one before make one of
            its own — and the app puts them all in the first one’s unit.
          </p>
          {assets.length > 0 && (
            <button className="btn btn-ghost" onClick={() => commit({ ...cap, stations: assets.map((a, i) => ({ ...blankStation(uid(), 'machine', i === 0), name: a })) })}>
              Start from the machines in your stops log ({assets.length})
            </button>
          )}
        </div>
      )}
      <ol className="cap-sts">
        {cap.stations.map((s, i) => (
          <StationCard key={s.id} s={s} i={i} last={i === cap.stations.length - 1}
            prevUnit={cap.stations[i - 1]?.unit} planned={cap.plannedHoursPerWeek} why={why(s.id)}
            wait={stats[s.id]?.waitMins ?? 0} own={stats[s.id]?.ownMins ?? 0}
            suggested={suggestRunning(stats[s.id]?.ownMins ?? 0, cap.plannedHoursPerWeek, stops.weeks)}
            patch={p => patchStation(s.id, p)} move={by => move(i, by)} remove={() => remove(s)} assets={assets}
            open={editing === s.id || !s.name.trim()} onToggle={() => setEditing(editing === s.id ? null : s.id)} />
        ))}
      </ol>
      <div className="row-inline">
        <button className="cw-add" onClick={() => add('machine')}><span className="cw-add-p" aria-hidden>+</span> Add a machine</button>
        <button className="cw-add" onClick={() => add('people')}><span className="cw-add-p" aria-hidden>+</span> Add a person or crew</button>
      </div>

      {r.ok.length > 0 && (
        <Fold id="cap-working" title="The working" says={`${r.ok.length} station${r.ok.length === 1 ? '' : 's'} counted, in ${r.unit} a minute`} start={false}>
          <Working r={r} />
        </Fold>
      )}
    </section>
  );
}

/* The arithmetic, shown. Anybody who doubts a bar can follow it with a calculator. */
function Working({ r }: { r: ReturnType<typeof analyse> }) {
  const row = (x: StationResult) => {
    const s = x.station;
    const speed = s.rate != null ? `${fmtN(s.rate)} ${s.unit} ${PER_WORD[s.ratePer ?? 'min']}` : `${fmtN(s.perCycle ?? 0)} every ${fmtN(s.cycleSec ?? 0)} s`;
    return (
      <tr key={s.id}>
        <th scope="row">{s.name.trim() || `Station ${x.index + 1}`}</th>
        <td>{speed}</td>
        <td>× {fmtN(s.crew ?? 1)}</td>
        <td>× {fmtN(x.factor)} {r.unit} each</td>
        <td className="is-num">{fmtN(x.running)}</td>
        <td>{s.runningPct != null && s.runningPct < 100 ? `× ${fmtN(s.runningPct)}%` : '—'}</td>
        <td className="is-num"><b>{fmtN(x.effective)}</b></td>
      </tr>
    );
  };
  return (
    <div className="cap-working">
      <table>
        <thead><tr><th /><th>speed</th><th>crew</th><th>to the line’s unit</th><th>running</th><th>stops</th><th>with stops</th></tr></thead>
        <tbody>{r.ok.map(row)}</tbody>
      </table>
      <p className="sub">
        Each figure is in {r.unit} a minute at the start of the line. Where a station before it rejects some, everything after sees less,
        and its figure is put back to match. Buffers between stations hide short stops, so the line can do slightly better than the smallest
        number here — which is why it is a screen and not a promise.
      </p>
      {r.skipped.length > 0 && (
        <ul className="cap-notes">
          {r.skipped.map(x => <li key={x.station.id}>{x.station.name.trim() || `Station ${x.index + 1}`} is not counted: {x.why}.</li>)}
        </ul>
      )}
    </div>
  );
}
