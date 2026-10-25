/* ONE RELIABILITY STUDY — a machine's MTBF and failure rate, from a person
 * stood at it (docs/TOOLKIT.md, tool 13; lib/ie/reliability).
 *
 * Rowland, 21 October: "a person stood at a machine, tapping a button every
 * time an event happened ... I press the button every time I see an event,
 * also I start a clock watch I can stop and start".
 *
 * Big controls, as a person at a machine uses them: the WATCH — Start when
 * watching it run, Stop while it is down, at a break or when leaving — and a
 * BUTTON FOR EACH THING COUNTED, a tap each time one is seen. Rowland, 22
 * October: "I could have a failure, but I also might want to do stops. I
 * might want to count something else ... three buttons ... three data sets
 * going on." So one study counts one thing or several at once, the floor's
 * own words among them, all on the one watch — and each has every figure of
 * its own: counted side by side, and each one's page a chip away. The last
 * tap can be undone at once; every tap and every stretch can be struck later
 * and is kept. Coming back another day carries on the same study: the
 * watched time and the taps add up, and the figures firm up as they do.
 *
 * The lean page around it (docs/LEAN-PAGE.md): the band, the tiles (MTBF and
 * its 90% bounds, the failure rate, watched time, events, what it costs),
 * the graphs — events against watched hours, the gaps between them, the MTBF
 * day by day — what it means, the days, the commentary, the action plan and
 * the closing line. Nothing worked out is stored; the module makes every
 * figure, the same one its paper (lib/studiesPdf) reads. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, listAllStandards, listAllStudies, onDataChange, patchStudy } from '../../db';
import { neckOf } from '../../lib/lineLoss';
import type { Standard } from '../linestandard/standard';
import { useAccess } from '../../cloud/access';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { can as canAt } from '../../lib/access';
import { now, uid } from '../../lib/ids';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import type { AgreedReliability, RelCount, RelEvent, Remark, ToolStudy, WatchRun } from '../../lib/study';
import {
  costWords, countersOf, countTitle, FIRST_COUNT, LEFT_ON_H, perHour, plural, relAll, relCost, reliabilityInsights, reliabilitySays, relRows, runningRun, span,
  studyReliabilitySays, watchedSpans, type RelCounter, type RelFigures, type RelItem,
} from './reliability';
import { relClosings, relTiles, relTrend } from './reliabilityLean';
import { CallsPanel, OpenStops, RepairPanel, TapTimes } from './RepairPanel';
import { GrowthPanel } from './GrowthPanel';
import { WearPanel } from './WearPanel';
import { wearOf } from './wear';
import { MAX_REASONS } from './repair';
import { lineDay } from '../../lib/lineLoss';
import { WhereItSits, UsedFor, useBetter } from '../../ui/StudyPlace';
import { LeanActions, LeanClosing, LeanInsights, LeanPanel, LeanTiles, LeanTrend } from '../../ui/Lean';
import { bandPage } from '../../lib/lean';
import { raisedFrom } from '../losses/lossLean';
import { useFactoryLines } from '../../lib/useFactoryLines';
import { StudyBand } from '../../ui/StudyActs';
import { studyHref } from '../../lib/studyLinks';
import { groupOf, lineRows, lineWords, started, stopped } from './lineWatch';

const OWNER = canAt('owner');
const hms = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const hm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
};
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
/** The words a set-up offers for what is counted — the floor's own added beside them. */
const OFFERED = ['stop', 'failure', 'jam', 'pick', 'reject', 'alarm', 'short stop', 'call'];

export function ReliabilityScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;

  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (s === null) return (
    <div className="wrap ie">
      <h1>This study isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/reliability')}>Every reliability study</button>
    </div>
  );
  return <Reliability s={s} can={can} me={me} />;
}

function Reliability({ s, can, me }: { s: ToolStudy; can: ReturnType<typeof canAt>; me?: string }) {
  const a = s.agreed?.reliability;
  const runs = useMemo(() => s.facts.watch ?? [], [s.facts.watch]);
  const events = useMemo(() => s.facts.events ?? [], [s.facts.events]);
  const closed = !!s.closedAt;
  const [setting, setSetting] = useState(false);
  const run = runningRun(runs);
  /* the clock — every second while the watch runs, else every half minute */
  const [tick, setT] = useState(() => Date.now());
  useEffect(() => { const i = window.setInterval(() => setT(Date.now()), run ? 1000 : 30_000); return () => window.clearInterval(i); }, [run]);
  /* never behind the newest tap or press: a stop tapped this instant counts this instant */
  const t = Math.max(tick, ...events.map(e => e.at), ...runs.map(r => r.to ?? r.from));
  useWakeLock(!!run && !closed);
  /* EVERY THING COUNTED, each from its own taps on the one watch; the one seen chosen by its chip */
  const items = useMemo(() => relAll(a, runs, events, t), [a, runs, events, t]);
  const [seen, setSeen] = useState<string | undefined>(undefined);
  const item = items.find(i => i.c.id === seen) ?? items[0];
  const said = studyReliabilitySays(a, runs, events, t);
  const line = useFactoryLines(s.workspaceId).find(x => x.id === s.workspaceId);
  /* where the study stands for its money (FC-058): its machine, and the line's bottleneck from Line capacity (lib/lineLoss neckOf) */
  const [standards, setStandards] = useState<Standard[]>([]);
  useEffect(() => { const load = () => { void listAllStandards().then(setStandards); }; load(); return onDataChange(load); }, []);
  const where = useMemo(() => ({ machine: s.machine, neck: neckOf(standards, s.workspaceId) }), [standards, s.machine, s.workspaceId]);
  const { steps, tests } = useBetter(s, me);
  /* A LINE WATCH: the machines watched on this one's clock (agreed.reliability.group) */
  const grouped = !!a?.group;
  const [everyStudy, setEveryStudy] = useState<ToolStudy[]>([]);
  useEffect(() => { if (!grouped) return; const load = () => { void listAllStudies().then(setEveryStudy); }; load(); return onDataChange(load); }, [grouped]);
  const sibs = useMemo(() => (grouped ? groupOf(everyStudy, s) : []), [grouped, everyStudy, s]);

  return (
    <div className="wrap ie rl">
      <StudyBand page={bandPage('Reliability study', s, said.verdict, said.tone)} s={s} what="Reliability study" canEdit={can.edit && !closed} canRemove={can.remove} />
      <div className="ln-under">
        <p className="sub ie-where">
          {s.machine ? <><b>{s.machine}</b> · </> : null}
          started {niceDay(isoDay(s.startedAt))}
        </p>
        <WhereItSits s={s} can={can} />
      </div>

      {!a || !items.length || setting ? (
        <SetUp s={s} canAgree={can.agree && !closed} events={events} onDone={() => setSetting(false)} cancel={a && items.length ? () => setSetting(false) : undefined} />
      ) : (
        <>
          {sibs.length > 1 && <LineWatch sibs={sibs} here={s.id} t={t} line={line?.name} />}
          {!closed && can.edit && <Watch s={s} counters={items.map(i => i.c)} runs={runs} events={events} t={t} me={me} together={sibs.length > 1 ? sibs.length : 0} />}
          {!closed && can.edit && <OpenStops sid={s.id} items={items} t={t} />}
          {items.length > 1 && <Together items={items} line={line} where={where} seen={item.c.id} onSeen={setSeen} />}
          {item && <Counted item={item} items={items} line={line} where={where} one={items.length === 1} study={s} canEdit={can.edit && !closed} />}
          <EveryEvent counters={countersOf(a, true)} events={events} canStrike={can.edit && !closed} sid={s.id} />
          <EveryStretch runs={runs} canStrike={can.edit && !closed} sid={s.id} t={t} />
          <p className="ie-agreed sub">
            Agreed: <b>{agreedWords(a)}</b>
            {can.agree && !closed && <button type="button" className="linkish" onClick={() => setSetting(true)}>Change what was agreed</button>}
          </p>
          <Commentary s={s} canEdit={can.edit} me={me} />
          <UsedFor s={s} can={can} me={me} />
          <Act s={s} items={items} text={said.text} tone={said.tone} can={can} me={me} />
          <LeanPanel title="Action plan" className="ln-solo ln-plan-p">
            <LeanActions actions={raisedFrom(s, steps, tests)} empty="Nothing raised from it yet — Make it better raises a fix or a countermeasure from its figures." />
          </LeanPanel>
          <LeanClosing closing={relClosings(items, line)} />
        </>
      )}
    </div>
  );
}

/** The screen kept awake while the watch runs — a person stood at a machine
 *  is not touching the phone between events. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let lock: { release: () => Promise<void> } | undefined;
    const wl = (navigator as Navigator & { wakeLock?: { request: (k: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wl?.request('screen').then(l => { lock = l; }).catch(() => undefined);
    return () => { void lock?.release().catch(() => undefined); };
  }, [on]);
}

export function agreedWords(a: AgreedReliability): string {
  return countersOf(a).map(c => [c.event, c.targetMin ? `MTBF wanted ${span(c.targetMin / 60)}` : 'no target', c.downMin ? `${c.downMin} min stood each` : '',
    c.timed === 'stop' ? 'each timed' : c.timed === 'call' ? `a call for help${c.respondMin ? `, help within ${c.respondMin} min` : ''}` : '', c.reasons?.length ? `reasons: ${c.reasons.join(', ')}` : '',
    c.fitterRate ? `a fitter £${c.fitterRate} an hour` : '', c.growth ? 'growth tracked' : '', c.wear ? 'a part that wears' : ''].filter(Boolean).join(', ')).join(' · ');
}

/* ------------------------------------------------------------------ set up: what is counted */
interface Row {
  id: string; name: string; target: string; down: string; removed?: boolean;
  /** FC-059 / FC-015: counted only, timed as a stop, or a call for help. */
  timed: '' | 'stop' | 'call'; reasons: string; respond: string; fitter: string;
  /** FC-061 */
  growth: boolean;
  /** FC-060 */
  wear: boolean; wearUnit: string; wearGaps: boolean; wearNew: boolean; swap: string; fail: string;
}
const rowOf = (c: RelCounter): Row => ({ id: c.id, name: c.event, target: c.targetMin ? String(c.targetMin) : '', down: c.downMin ? String(c.downMin) : '', ...(c.removed ? { removed: true } : {}),
  timed: c.timed ?? '', reasons: (c.reasons ?? []).join(', '), respond: c.respondMin ? String(c.respondMin) : '', fitter: c.fitterRate ? String(c.fitterRate) : '', growth: !!c.growth,
  wear: !!c.wear, wearUnit: c.wear?.unit ?? '', wearGaps: !!c.wear?.fromWatch, wearNew: !!c.wear?.newAtStart, swap: c.wear?.swapCost !== undefined ? String(c.wear.swapCost) : '', fail: c.wear?.failCost !== undefined ? String(c.wear.failCost) : '' });
const newRow = (name: string): Row => ({ id: uid(), name, target: '', down: '', timed: '', reasons: '', respond: '', fitter: '', growth: false, wear: false, wearUnit: '', wearGaps: false, wearNew: false, swap: '', fail: '' });
/** The reasons typed, as a list: split on commas and new lines, trimmed, none twice. */
export const reasonsOf = (text: string): string[] => {
  const seen = new Set<string>();
  return text.split(/[,\n]/).map(x => x.trim()).filter(x => { const k = x.toLowerCase(); if (!x || seen.has(k)) return false; seen.add(k); return true; });
};

function SetUp({ s, canAgree, events, onDone, cancel }: { s: ToolStudy; canAgree: boolean; events: RelEvent[]; onDone: () => void; cancel?: () => void }) {
  const a = s.agreed?.reliability;
  /* what was agreed, a row each — a study set up before 22 October as its one count, keeping its id so its taps stay its own */
  const [rows, setRows] = useState<Row[]>(() => {
    const had = countersOf(a, true).map(rowOf);
    return had.length ? had : [newRow('stop')];
  });
  const [own, setOwn] = useState('');
  const live = rows.filter(r => !r.removed), off = rows.filter(r => r.removed);
  const first = rows[0]?.id;
  const taps = (id: string) => events.filter(e => !e.struck && (e.count === id || (!e.count && id === first))).length;
  const has = (name: string) => rows.find(r => r.name.trim().toLowerCase() === name.trim().toLowerCase());
  const set = (id: string, p: Partial<Row>) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)));
  /* a word offered or typed — brought back if it was taken off, never a second of one name */
  const add = (name: string) => {
    const v = name.trim().toLowerCase();
    if (!v) return;
    const was = has(v);
    if (was) { if (was.removed) set(was.id, { removed: undefined }); return; }
    setRows(rs => [...rs, newRow(v)]);
  };
  const num = (v: string) => (v.trim() ? Number(v) : undefined);
  const names = live.map(r => r.name.trim().toLowerCase());
  const problem = !live.length ? 'Count at least one thing — a stop, a failure, a pick, or your own word.'
    : live.some(r => !r.name.trim()) ? 'Every thing counted needs a name.'
    : new Set(names).size !== names.length ? 'Two things counted have the same name.'
    : live.some(r => { const x = num(r.target); return x !== undefined && !(x > 0 && x <= 100_000); }) ? 'An MTBF wanted is minutes, more than 0 — or leave it empty.'
    : live.some(r => { const x = num(r.down); return x !== undefined && !(x > 0 && x <= 1440); }) ? 'The minutes the line stands is more than 0 — or leave it empty.'
    : live.some(r => reasonsOf(r.reasons).length > MAX_REASONS) ? `A short list of reasons — ${MAX_REASONS} at most; five to eight is what works.`
    : live.some(r => { const x = num(r.respond); return x !== undefined && !(x > 0 && x <= 1440); }) ? 'Help should arrive within minutes — more than 0, or leave it empty.'
    : live.some(r => { const x = num(r.fitter); return x !== undefined && !(x > 0 && x <= 10_000); }) ? 'A fitter’s rate is pounds an hour, more than 0 — or leave it empty.'
    : live.some(r => r.wear && [r.swap, r.fail].some(v => { const x = num(v); return x !== undefined && !(x >= 0 && x <= 100_000_000); })) ? 'What a failure or a planned change costs is pounds, 0 or more — or leave it empty.' : '';
  const save = () => {
    if (problem || !canAgree) return;
    const counts: RelCount[] = rows.map(r => {
      const tg = num(r.target), dn = num(r.down), rs = reasonsOf(r.reasons), rp = num(r.respond), ft = num(r.fitter), sw = num(r.swap), fl = num(r.fail);
      return { id: r.id, name: r.name.trim().toLowerCase(), ...(tg !== undefined ? { targetMin: tg } : {}), ...(dn !== undefined ? { downMin: dn } : {}), ...(r.removed ? { removed: true } : {}),
        ...(r.timed ? { timed: r.timed } : {}), ...(r.timed && rs.length ? { reasons: rs } : {}), ...(r.timed === 'call' && rp !== undefined ? { respondMin: rp } : {}), ...(r.timed === 'stop' && ft !== undefined ? { fitterRate: ft } : {}),
        ...(r.growth ? { growth: true } : {}),
        ...(r.wear ? { wear: { ...(r.wearUnit.trim() && !r.wearGaps ? { unit: r.wearUnit.trim() } : {}), ...(r.wearGaps ? { fromWatch: true } : {}), ...(r.wearGaps && r.wearNew ? { newAtStart: true } : {}), ...(sw !== undefined ? { swapCost: sw } : {}), ...(fl !== undefined ? { failCost: fl } : {}) } } : {}) };
    });
    void patchStudy(s.id, cur => ({ agreed: { ...cur.agreed, reliability: { counts } } }));
    onDone();
  };
  if (!canAgree) return (
    <div className="ie-agree is-wait"><p><b>It isn’t set up yet.</b> The project’s owner says what is counted before the watch starts.</p></div>
  );
  return (
    <form className="ie-agree rl-setup" onSubmit={e => { e.preventDefault(); save(); }}>
      <h2>What are you counting?</h2>
      <p className="sub">Count one thing or several at once — a button each at the machine, all on the same watch. Each thing counted gets its own MTBF, failure rate, graphs and cost. Start the watch while the machine runs, stop it while it is down or nobody watches, and tap the button each time you see one.</p>
      {events.length > 0 && <p className="ie-note">Taps are already in: each keeps its time and the thing it was counted as.</p>}
      <ul className="rl-counts">
        {live.map((r, i) => (
          <li key={r.id} className="rl-count" data-count={r.id}>
            <label className="field rl-count-name"><span className="field-label">{i === 0 ? 'Counting' : 'And counting'}</span>
              <input className="text-input" value={r.name} maxLength={30} aria-label={`What is counted, ${i + 1}`} onChange={e => set(r.id, { name: e.target.value })} />
            </label>
            <label className="field"><span className="field-label">MTBF wanted, minutes</span>
              <input className="text-input" inputMode="decimal" value={r.target} placeholder="no target" aria-label={`MTBF wanted for ${r.name || 'it'}, minutes`} onChange={e => set(r.id, { target: e.target.value })} />
            </label>
            <label className="field"><span className="field-label">Minutes the line stands each time</span>
              <input className="text-input" inputMode="decimal" value={r.down} placeholder={r.timed ? 'timed instead' : 'not known'} aria-label={`Minutes the line stands for each ${r.name || 'one'}`} onChange={e => set(r.id, { down: e.target.value })} />
            </label>
            <button type="button" className="cw-link sp-rm rl-count-off" aria-label={`Take ${r.name || 'it'} off`} onClick={() => (taps(r.id) || a ? set(r.id, { removed: true }) : setRows(rs => rs.filter(x => x.id !== r.id)))}>Take off</button>
            <details className="rl-more" open={!!(r.timed || r.growth || r.wear)}>
              <summary>More about {r.name || 'it'} — time each one, calls for help, growth, a part that wears</summary>
              <div className="rl-more-in">
                <label className="field"><span className="field-label">Timing</span>
                  <select className="text-input" value={r.timed} aria-label={`Timing for ${r.name || 'it'}`} onChange={e => set(r.id, { timed: e.target.value as Row['timed'] })}>
                    <option value="">Count only</option>
                    <option value="stop">Time each one — a stop (help arrived, running again)</option>
                    <option value="call">A call for help — response and clearing (andon)</option>
                  </select>
                </label>
                {r.timed && (
                  <>
                    <p className="sub rl-more-help">A timed one takes the machine out of running: its minutes come off the watched time, so the MTBF is of running time. Do not time something that does not stop the machine.</p>
                    <label className="field"><span className="field-label">Reasons — a short list, commas between{r.timed === 'call' ? ' (five to eight)' : ''}</span>
                      <input className="text-input" value={r.reasons} aria-label={`Reasons for ${r.name || 'it'}`} placeholder={r.timed === 'call' ? 'film change, jam, QA check, label, material short' : 'jam, film break, sensor'} onChange={e => set(r.id, { reasons: e.target.value })} />
                    </label>
                    {r.timed === 'call' && (
                      <label className="field"><span className="field-label">Help should arrive within, minutes</span>
                        <input className="text-input" inputMode="decimal" value={r.respond} placeholder="no standard" aria-label={`Help should arrive within, minutes, for ${r.name || 'it'}`} onChange={e => set(r.id, { respond: e.target.value })} />
                      </label>
                    )}
                    {r.timed === 'stop' && (
                      <label className="field"><span className="field-label">A fitter costs, £ an hour</span>
                        <input className="text-input" inputMode="decimal" value={r.fitter} placeholder="to say the repairs in money" aria-label={`A fitter costs, pounds an hour, for ${r.name || 'it'}`} onChange={e => set(r.id, { fitter: e.target.value })} />
                      </label>
                    )}
                  </>
                )}
                <label className="rl-tick"><input type="checkbox" checked={r.growth} aria-label={`Track growth for ${r.name || 'it'}`} onChange={e => set(r.id, { growth: e.target.checked })} /> <span>Track growth — a new machine bedding in: is it getting better, and when will it reach its MTBF? (from 8 failures)</span></label>
                <label className="rl-tick"><input type="checkbox" checked={r.wear} aria-label={`A part that wears: ${r.name || 'it'}`} onChange={e => set(r.id, { wear: e.target.checked })} /> <span>A part that wears — replaced when it fails (a belt, a knife, a heater): does it wear out, and when to change it? (from 6 failures)</span></label>
                {r.wear && (
                  <>
                    <label className="field"><span className="field-label">Its age is counted in</span>
                      <input className="text-input" value={r.wearGaps ? 'hours' : r.wearUnit} disabled={r.wearGaps} placeholder="hours" aria-label={`The unit the part’s age is in, for ${r.name || 'it'}`} onChange={e => set(r.id, { wearUnit: e.target.value })} />
                    </label>
                    <label className="rl-tick"><input type="checkbox" checked={r.wearGaps} aria-label={`Use the gaps between ${r.name || 'its'} events as lives`} onChange={e => set(r.id, { wearGaps: e.target.checked })} /> <span>Use this study’s gaps between one {r.name || 'event'} and the next as the parts’ lives (the part is replaced at each; ages are hours of running)</span></label>
                    {r.wearGaps && <label className="rl-tick"><input type="checkbox" checked={r.wearNew} aria-label="The part was new when watching began" onChange={e => set(r.id, { wearNew: e.target.checked })} /> <span>The part was new when the watching began</span></label>}
                    <label className="field"><span className="field-label">A planned change costs, £</span>
                      <input className="text-input" inputMode="decimal" value={r.swap} placeholder="to say when to change it" aria-label={`What a planned change costs, pounds, for ${r.name || 'it'}`} onChange={e => set(r.id, { swap: e.target.value })} />
                    </label>
                    <label className="field"><span className="field-label">A failure costs, £ (the part, the labour, the line’s lost time)</span>
                      <input className="text-input" inputMode="decimal" value={r.fail} placeholder="to say what changing it saves" aria-label={`What a failure costs, pounds, for ${r.name || 'it'}`} onChange={e => set(r.id, { fail: e.target.value })} />
                    </label>
                  </>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
      <p className="sub rl-count-help"><b>MTBF wanted</b> — the running time you want between one and the next; leave it empty if you have no target. <b>Minutes the line stands each time</b> — how long the line is stopped when one happens; it prices them; leave it empty if it does not stop the line or you do not know — or time each one, and the timed minutes replace it.</p>
      <div className="field"><span className="field-label">Add something to count</span>
        <span className="chip-row" role="group" aria-label="Offered">
          {OFFERED.filter(x => !live.some(r => r.name.trim().toLowerCase() === x)).map(x => <button key={x} type="button" className="chip" onClick={() => add(x)}>+ {x}</button>)}
        </span>
        <span className="ws-add">
          <input className="text-input" value={own} maxLength={30} placeholder="Your own — e.g. bottle down" aria-label="Add your own thing to count"
            onChange={e => setOwn(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(own); setOwn(''); } }} />
          <button type="button" className="btn" disabled={!own.trim()} onClick={() => { add(own); setOwn(''); }}>Add</button>
        </span>
      </div>
      {off.length > 0 && (
        <p className="sub rl-count-gone">Taken off — its taps kept: {off.map(r => (
          <span key={r.id} className="rl-count-back">{r.name}{taps(r.id) ? ` (${taps(r.id)} tap${taps(r.id) === 1 ? '' : 's'})` : ''} <button type="button" className="linkish" onClick={() => set(r.id, { removed: undefined })}>Bring back</button></span>
        ))}</p>
      )}
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>{a ? 'Keep it' : 'Set it up'}</button>
        {cancel && <button type="button" className="btn" onClick={cancel}>Keep what was agreed</button>}
      </div>
    </form>
  );
}

/** THE LINE WATCH — every machine on the one clock, a row each with what it has counted and what it says;
 *  a tap on a row opens that machine's own page, its buttons and figures in full. The clock itself is the
 *  Watch below: one press starts or stops them all. */
function LineWatch({ sibs, here, t, line }: { sibs: ToolStudy[]; here: string; t: number; line?: string }) {
  const rows = lineRows(sibs, t);
  return (
    <section className="rl-line" aria-label="The machines on this line watch" data-line-watch>
      <h2>{line ? `${line} — every machine on one clock` : 'Every machine on one clock'}</h2>
      <p className="sub">{lineWords(rows)}. Open a machine to tap its buttons and see its own figures; the watch below starts and stops them all.</p>
      <ul className="rl-line-rows">
        {rows.map((r, i) => (
          <li key={r.id}>
            <button type="button" className={'rl-line-row is-' + r.tone + (r.id === here ? ' is-here' : '')} aria-current={r.id === here ? 'page' : undefined} data-machine={r.machine}
              onClick={() => { if (r.id !== here) nav(studyHref(sibs[i])); }}>
              <b>{r.machine}</b>
              <span className="rl-line-n">{r.taps} counted{r.counts.length > 1 ? ` — ${r.counts.map(c => c.words).join(' · ')}` : ''}</span>
              <span className="rl-line-v">{r.running ? 'watching · ' : ''}{r.verdict}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ the watch and a button for each thing counted */
function Watch({ s, counters, runs, events, t, me, together = 0 }: { s: ToolStudy; counters: RelCounter[]; runs: WatchRun[]; events: RelEvent[]; t: number; me?: string; /** machines on this one clock (0: this one alone) */ together?: number }) {
  const run = runningRun(runs);
  const spans = watchedSpans(runs, t);
  const watched = spans.reduce((n, [x, y]) => n + (y - x), 0);
  const by = me ? { by: me } : {};
  const [noting, setNoting] = useState('');
  const first = countersOf(s.agreed?.reliability, true)[0]?.id ?? FIRST_COUNT;
  /* one press starts or stops every machine of a line watch at the same moment; a study on its own, itself */
  const everyOne = async () => (s.agreed?.reliability?.group ? groupOf(await listAllStudies(), s) : []).map(x => x.id).concat(s.agreed?.reliability?.group ? [] : [s.id]);
  const start = () => { const at = now(); void everyOne().then(ids => Promise.all(ids.map(id => patchStudy(id, cur => ({ facts: { ...cur.facts, watch: started(cur.facts.watch, at, uid(), me) } }))))); };
  const stop = (when?: number) => { const at = when ?? now(); void everyOne().then(ids => Promise.all(ids.map(id => patchStudy(id, cur => ({ facts: { ...cur.facts, watch: stopped(cur.facts.watch, at) } }))))); };
  const tap = (count: string) => {
    if (!run) return;
    const e: RelEvent = { id: uid(), at: now(), ...by, count };
    try { navigator.vibrate?.(60); } catch { /* not every phone can */ }
    setNoting('');
    void patchStudy(s.id, cur => ({ facts: { ...cur.facts, events: [...(cur.facts.events ?? []), e] } }));
  };
  const edit = (id: string, p: Partial<RelEvent>) => void patchStudy(s.id, cur => ({ facts: { ...cur.facts, events: (cur.facts.events ?? []).map(x => (x.id === id ? { ...x, ...p } : x)) } }));
  const inWatch = (e: RelEvent) => !e.struck && spans.some(([x, y]) => e.at >= x && e.at <= y);
  const countOf = (e: RelEvent) => e.count ?? first;
  const counted = (id: string) => events.filter(e => countOf(e) === id && inWatch(e)).length;
  const last = [...events].sort((x, y) => y.at - x.at)[0];
  const fresh = last && !last.struck && t - last.at < 10 * 60_000 ? last : undefined;
  const freshC = fresh ? counters.find(c => c.id === countOf(fresh)) : undefined;
  /* LEFT ON? A stretch longer than a long shift is asked about, and stopped at
     the last tap in it (or where it started) in one press */
  const leftOn = run && t - run.from > LEFT_ON_H * 3_600_000;
  const lastIn = run ? events.filter(e => !e.struck && e.at >= run.from).sort((x, y) => y.at - x.at)[0] : undefined;

  return (
    <div className={'rl-watch' + (run ? ' is-on' : '')} role="group" aria-label="The watch and a button for each thing counted">
      <div className="rl-clock">
        <span className="rl-k">{together ? (run ? `Watching the line — ${together} machines` : 'The line’s watch is stopped') : run ? 'Watching' : 'The watch is stopped'}</span>
        <b className="rl-time" aria-live="off">{clock(watched)}</b>
        <span className="sub">{run ? `this stretch ${clock(t - run.from)} · since ${hm(run.from)}` : runs.length ? 'Start it when you are watching the machine run' : 'Start it when you begin watching the machine run'}</span>
        <button type="button" className={'btn rl-go' + (run ? '' : ' btn-primary')} onClick={run ? () => stop() : start}>{together ? (run ? 'Stop the line’s watch' : runs.length ? 'Start the line’s watch again' : 'Start the line’s watch') : run ? 'Stop the watch' : runs.length ? 'Start the watch again' : 'Start the watch'}</button>
        {leftOn && run && (
          <p className="rl-lefton" role="status">
            <b>Running {clock(t - run.from)} without a stop — left on?</b>{' '}
            <button type="button" className="linkish" onClick={() => stop(lastIn?.at ?? run.from)}>{lastIn ? `Stop it at the last tap, ${niceDay(isoDay(lastIn.at))} ${hm(lastIn.at)}` : `Stop it where it started, ${hm(run.from)}`}</button>
          </p>
        )}
      </div>
      <div className="rl-tap">
        <div className={'rl-buttons' + (counters.length > 1 ? ' is-many' : '')}>
          {counters.map(c => (
            <button key={c.id} type="button" className="rl-event" data-count={c.id} disabled={!run} onClick={() => tap(c.id)} aria-label={`Tap a ${c.event}`}>
              <b>{cap(c.event)}</b>
              <span>{run ? `${counted(c.id)} so far` : 'start the watch first'}</span>
            </button>
          ))}
        </div>
        {!run && <p className="sub rl-tap-why">A tap counts only while the watch runs — the MTBF is the watched running time over the taps.</p>}
        {fresh && freshC && (
          <div className="rl-last" aria-live="polite">
            <span><b>{cap(freshC.event)} {counted(freshC.id)} at {hms(fresh.at)}</b>{fresh.note ? ` · ${fresh.note}` : ''}</span>
            <button type="button" className="linkish" onClick={() => edit(fresh.id, { struck: true })} aria-label={`Undo the ${freshC.event} at ${hms(fresh.at)}`}>Undo</button>
            <form className="rl-note" onSubmit={e => { e.preventDefault(); if (noting.trim()) { edit(fresh.id, { note: noting.trim() }); setNoting(''); } }}>
              <input className="text-input" value={noting} maxLength={120} placeholder="What was seen — if you want to say" aria-label={`A note on the ${freshC.event}`} onChange={e => setNoting(e.target.value)} />
              <button type="submit" className="btn" disabled={!noting.trim()}>Add</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ counted side by side, and each one's own */
/** EVERY THING COUNTED SIDE BY SIDE — a row each, its MTBF, range, rate,
 *  against its target and what it costs; a chip each to see its own. */
function Together({ items, line, where, seen, onSeen }: { items: RelItem[]; line?: Parameters<typeof relRows>[1]; where?: Parameters<typeof relRows>[2]; seen: string; onSeen: (id: string) => void }) {
  const rows = relRows(items, line, where);
  return (
    <LeanPanel title="Counted side by side" className="ln-solo rl-together-p">
      <div className="rl-together-w">
        <table className="rl-together">
          <thead><tr><th>Counted</th><th>Taps</th><th>MTBF</th><th>90% sure</th><th>An hour</th><th>Against</th><th>£ an hour</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={(r.id === seen ? 'is-seen ' : '') + 'is-' + r.tone} data-count={r.id} onClick={() => onSeen(r.id)}>
                <td data-label="Counted"><b>{r.title}</b></td><td data-label="Taps">{r.n}</td><td data-label="MTBF"><b>{r.mtbf}</b></td><td data-label="90% sure">{r.range}</td><td data-label="An hour">{r.rate}</td>
                <td data-label="Against" className="rl-against">{r.against}</td><td data-label="£ an hour" className="rl-cost-cell">{r.cost ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chip-row rl-seen" role="group" aria-label="Seen for">
        {items.map(i => <button key={i.c.id} type="button" className={'chip' + (i.c.id === seen ? ' on' : '')} aria-pressed={i.c.id === seen} onClick={() => onSeen(i.c.id)}>{countTitle(i.c)}</button>)}
      </div>
    </LeanPanel>
  );
}

/** ONE THING COUNTED, IN FULL — its tiles, sentence, what it means, its
 *  graphs, what it costs and its days. */
function Counted({ item, items, line, where, one, study, canEdit }: { item: RelItem; items: RelItem[]; line?: Parameters<typeof relCost>[2]; where?: Parameters<typeof relCost>[3]; one: boolean; study: ToolStudy; canEdit: boolean }) {
  const { c, f } = item;
  const cost = relCost(f, c, line, where);
  const said = reliabilitySays(c, f);
  const trend = relTrend(c, f);
  const wear = wearOf(c, f, study.facts.lives);
  const dayMin = line ? lineDay({ name: line.name, packsPerMin: line.packsPerMin, marginPerPack: line.marginPerPack, shifts: line.shifts }).minutes : undefined;
  return (
    <section className="rl-counted" data-count={c.id} aria-label={countTitle(c)}>
      {!one && <h2 className="rl-counted-h">{countTitle(c)}</h2>}
      <LeanTiles tiles={relTiles(c, f, cost, { r: item.r, k: item.k, g: item.g })} className="ie-strip" />
      <div className="ie-says"><p className={'ie-say is-' + said.tone}>{said.text}</p></div>
      <LeanInsights insights={reliabilityInsights(c, f)} />
      {/* the graphs side by side on a desk, one under the other on a phone */}
      <div className="rl-graphs">
        {f.n > 0 && (
          <LeanPanel title={`${countTitle(c)} against watched hours`} className="ln-solo">
            <Cumulative f={f} event={c.event} others={one ? [] : items.filter(i => i.c.id !== c.id)} />
          </LeanPanel>
        )}
        {(f.gaps?.n ?? 0) >= 3 && (
          <LeanPanel title={`Running time between one ${c.event} and the next`} className="ln-solo">
            <Gaps f={f} />
          </LeanPanel>
        )}
        {trend && <LeanPanel title={trend.title} className="ln-solo"><LeanTrend trend={trend} /></LeanPanel>}
      </div>
      {f.kinds.length > 0 && <Kinds f={f} event={c.event} />}
      {item.r && <RepairPanel item={item} f={f} />}
      {item.k && <CallsPanel item={item} f={f} line={line} where={where} shifts={line?.shifts} />}
      {item.g && <GrowthPanel g={item.g} points={f.points} event={c.event} />}
      {wear && <WearPanel sid={study.id} c={c} v={wear} canEdit={canEdit} line={dayMin ? { dayHours: dayMin / 60 } : undefined} />}
      {cost.downMinPerH !== undefined && <p className="sub rl-cost">What it costs: {costWords(cost)}.</p>}
      {f.days.length > 0 && <Days f={f} title={countTitle(c)} />}
    </section>
  );
}

/* ------------------------------------------------------------------ the graphs */
const niceStep = (max: number, parts = 4): number => {
  const raw = max / parts, p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9))), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

/** Events against watched hours — a straight line is a steady rate; bending
 *  up, they come faster; flattening, slower. The dashed line is the rate
 *  overall. The other things counted on the same watch drawn thin beside it,
 *  each named at its end. */
function Cumulative({ f, event, others = [] }: { f: RelFigures; event: string; others?: RelItem[] }) {
  const W = 360, H = 190, L = 34, B = 28, T = 10, R = others.length ? 64 : 10;
  const xMax = Math.max(f.hours, 1e-6), yMax = Math.max(f.n, ...others.map(o => o.f.n), 1);
  const x = (h: number) => L + (h / xMax) * (W - L - R), y = (n: number) => T + (1 - n / yMax) * (H - T - B);
  const stepPath = (g: RelFigures) => {
    let p = `M${x(0)},${y(0)}`;
    for (const q of g.points) p += ` H${x(q.h)} V${y(q.n)}`;
    return `${p} H${x(g.hours)}`;
  };
  const d = stepPath(f);
  const xs = niceStep(xMax), ys = Math.max(1, Math.round(niceStep(yMax)));
  return (
    <figure className="rl-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${f.n} ${plural(event, f.n)} over ${span(f.hours)} of watched running`}>
        {Array.from({ length: Math.floor(yMax / ys) + 1 }, (_, i) => i * ys).map(v => (
          <g key={`y${v}`}><line className="ln-grid-l" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text className="ln-ax" x={L - 5} y={y(v) + 3}>{v}</text></g>
        ))}
        {Array.from({ length: Math.floor(xMax / xs) + 1 }, (_, i) => i * xs).map(v => (
          <text key={`x${v}`} className="ln-ax rl-axx" x={x(v)} y={H - B + 13}>{+v.toFixed(2)}</text>
        ))}
        <line className="rl-steady" x1={x(0)} y1={y(0)} x2={x(f.hours)} y2={y(f.n)} />
        {others.map(o => (
          <g key={o.c.id} className="rl-other-g">
            <path className="rl-other" d={stepPath(o.f)} />
            <text className="ln-ax rl-other-l" x={x(o.f.hours) + 4} y={y(o.f.n) + 3}>{plural(o.c.event)} {o.f.n}</text>
          </g>
        ))}
        <path className="rl-step" d={d} />
        {others.length > 0 && <text className="ln-ax rl-other-l is-this" x={x(f.hours) + 4} y={y(f.n) + 3}>{plural(event)} {f.n}</text>}
        {f.points.map(p => <circle key={p.n} className="rl-dot" cx={x(p.h)} cy={y(p.n)} r={2.4}><title>{`${p.n} at ${span(p.h)} watched`}</title></circle>)}
        <text className="ln-ax rl-axx" x={(L + W - R) / 2} y={H - 4}>hours watched</text>
      </svg>
      <figcaption className="ln-legend"><span className="ln-key rl-key-step" aria-hidden /> {plural(event)} as they came · <span className="ln-key rl-key-steady" aria-hidden /> the rate overall, {perHour(f.rate ?? 0)}{others.length ? <> · <span className="ln-key rl-key-other" aria-hidden /> the others counted on the same watch</> : null}</figcaption>
    </figure>
  );
}

/** The gaps, grouped — how long it runs between one and the next. */
function Gaps({ f }: { f: RelFigures }) {
  const g = f.gaps;
  const gaps = useMemo(() => f.points.slice(1).map((p, i) => (p.h - f.points[i].h) * 60), [f.points]);
  if (!g) return null;
  const maxMin = Math.max(...gaps, 1);
  const step = niceStep(maxMin, 6);
  const bins = Array.from({ length: Math.ceil(maxMin / step) || 1 }, (_, i) => ({ from: i * step, to: (i + 1) * step, n: 0 }));
  for (const v of gaps) bins[Math.min(bins.length - 1, Math.floor(v / step))].n++;
  const top = Math.max(...bins.map(b => b.n), 1);
  const W = 360, H = 170, L = 28, B = 28, T = 10, R = 6;
  const bw = (W - L - R) / bins.length;
  const y = (n: number) => T + (1 - n / top) * (H - T - B);
  const med = g.medianH * 60;
  const xm = L + (med / (bins.length * step)) * (W - L - R);
  return (
    <figure className="rl-fig">
      <svg className="rl-gaps" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Gaps between events: typically ${span(g.medianH)}, from ${span(g.minH)} to ${span(g.maxH)}`}>
        {bins.map((b, i) => (
          <g key={b.from}>
            <rect className="ln-bar" x={L + i * bw + 1.5} y={y(b.n)} width={Math.max(1, bw - 3)} height={Math.max(0, y(0) - y(b.n))}><title>{`${+b.from.toFixed(1)}–${+b.to.toFixed(1)} min: ${b.n}`}</title></rect>
            {b.n > 0 && <text className="ln-bv" x={L + i * bw + bw / 2} y={y(b.n) - 3}>{b.n}</text>}
            <text className="ln-ax rl-axx" x={L + i * bw} y={H - B + 13}>{+b.from.toFixed(1)}</text>
          </g>
        ))}
        <line className="rl-med" x1={xm} x2={xm} y1={T} y2={H - B} />
        <text className="ln-ax rl-axx" x={(L + W - R) / 2} y={H - 4}>minutes of running between one and the next</text>
      </svg>
      <figcaption className="ln-legend"><span className="ln-key rl-key-med" aria-hidden /> typical (the median), {span(g.medianH)} · from {span(g.minH)} to {span(g.maxH)}</figcaption>
    </figure>
  );
}

function Kinds({ f, event }: { f: RelFigures; event: string }) {
  return (
    <LeanPanel title={`What the ${plural(event)} were`} className="ln-solo">
      <ul className="ws-bars rl-kindbars">
        {f.kinds.map(k => (
          <li key={k.kind} className="ws-bar">
            <span className="ws-bar-w">{k.kind}</span>
            <span className="ws-bar-t" aria-hidden="true"><i className="ws-bar-f" style={{ width: `${k.share * 100}%` }} /></span>
            <span className="ws-bar-n"><b>{k.n}</b> · {Math.round(k.share * 100)}% · one every {span(k.mtbfH)}</span>
          </li>
        ))}
      </ul>
    </LeanPanel>
  );
}

function Days({ f, title }: { f: RelFigures; title: string }) {
  return (
    <LeanPanel title="Day by day" className="ln-solo">
      <table className="rl-days">
        <thead><tr><th>Day</th><th>Watched</th><th>{title}</th><th>MTBF</th></tr></thead>
        <tbody>
          {f.days.map(d => (
            <tr key={d.day}><td>{niceDay(d.day, { weekday: 'short' })}</td><td>{span(d.hours)}</td><td>{d.n}</td><td>{d.mtbfH !== undefined ? span(d.mtbfH) : `none in ${span(d.hours)}`}</td></tr>
          ))}
          <tr className="is-all"><td>All</td><td>{span(f.hours)}</td><td>{f.n}</td><td>{f.mtbfH !== undefined ? span(f.mtbfH) : '—'}</td></tr>
        </tbody>
      </table>
    </LeanPanel>
  );
}

/* ------------------------------------------------------------------ every event, every stretch */
function EveryEvent({ counters, events, canStrike, sid }: { counters: RelCounter[]; events: RelEvent[]; canStrike: boolean; sid: string }) {
  const name = (e: RelEvent) => counters.find(c => c.id === (e.count ?? counters[0]?.id))?.event ?? 'tap';
  /* a tap of a timed count carries its times (FC-059); a call is never listed by who made it (FC-015) */
  const timedOf = (e: RelEvent) => counters.find(c => c.id === (e.count ?? counters[0]?.id))?.timed;
  const [open, setOpen] = useState(false);
  if (!events.length) return null;
  const struck = events.filter(x => x.struck).length;
  const sorted = [...events].sort((x, y) => x.at - y.at);
  const set = (id: string, struckNow: boolean) => void patchStudy(sid, cur => ({ facts: { ...cur.facts, events: (cur.facts.events ?? []).map(x => (x.id === id ? { ...x, struck: struckNow || undefined } : x)) } }));
  return (
    <div className="ie-all">
      <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Every'} tap — {events.length}{struck ? `, ${struck} struck` : ''}
      </button>
      {open && (
        <ol className="ie-rows">
          {sorted.map(x => (
            <li key={x.id} className={x.struck ? 'is-struck' : ''}>
              <span className="ie-no">{niceDay(isoDay(x.at))} {hms(x.at)}</span>
              <b>{cap(name(x))}{x.kind ? ` — ${x.kind}` : ''}</b>
              <span className="sub">{[x.note, x.by && timedOf(x) !== 'call' ? `by ${x.by}` : ''].filter(Boolean).join(' · ')}</span>
              {timedOf(x) && <TapTimes sid={sid} e={x} call={timedOf(x) === 'call'} canEdit={canStrike} />}
              {canStrike && <button type="button" className="linkish" onClick={() => set(x.id, !x.struck)}>{x.struck ? 'Restore' : 'Strike'}</button>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EveryStretch({ runs, canStrike, sid, t }: { runs: WatchRun[]; canStrike: boolean; sid: string; t: number }) {
  const [open, setOpen] = useState(false);
  if (!runs.length) return null;
  const sorted = [...runs].sort((x, y) => x.from - y.from);
  const set = (id: string, struckNow: boolean) => void patchStudy(sid, cur => ({ facts: { ...cur.facts, watch: (cur.facts.watch ?? []).map(x => (x.id === id ? { ...x, struck: struckNow || undefined } : x)) } }));
  return (
    <div className="ie-all">
      <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Every'} stretch of the watch — {runs.length}
      </button>
      {open && (
        <ol className="ie-rows">
          {sorted.map(x => (
            <li key={x.id} className={x.struck ? 'is-struck' : ''}>
              <span className="ie-no">{niceDay(isoDay(x.from))} {hm(x.from)}–{x.to ? hm(x.to) : 'now'}</span>
              <b>{clock((x.to ?? t) - x.from)}</b>
              <span className="sub">{x.by ? `by ${x.by}` : ''}</span>
              {canStrike && x.to !== undefined && <button type="button" className="linkish" onClick={() => set(x.id, !x.struck)}>{x.struck ? 'Restore' : 'Strike'}</button>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ commentary */
/** COMMENTARY — what the person at the machine saw and thinks, kept with when
 *  and who; edited where it sits, taken off with Undo, and on the paper. */
export function Commentary({ s, canEdit, me }: { s: ToolStudy; canEdit: boolean; me?: string }) {
  const remarks = useMemo(() => [...(s.facts.remarks ?? [])].sort((x, y) => x.at - y.at), [s.facts.remarks]);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [showOff, setShowOff] = useState(false);
  const put = (fn: (rs: Remark[]) => Remark[]) => void patchStudy(s.id, cur => ({ facts: { ...cur.facts, remarks: fn(cur.facts.remarks ?? []) } }));
  const add = () => { const v = text.trim(); if (!v) return; put(rs => [...rs, { id: uid(), at: now(), text: v, ...(me ? { by: me } : {}) }]); setText(''); };
  const live = remarks.filter(r => !r.struck), off = remarks.filter(r => r.struck);
  return (
    <LeanPanel title="Commentary" className="ln-solo rl-remarks">
      {!live.length && <p className="sub">{canEdit ? 'Nothing written yet — what was seen at the machine, what was tried, what to look at next.' : 'Nothing written yet.'}</p>}
      <ul className="rl-rem">
        {live.map(r => (
          <li key={r.id} data-remark={r.id}>
            {editing?.id === r.id ? (
              <form className="rl-note" onSubmit={e => { e.preventDefault(); const v = editing.text.trim(); if (v) put(rs => rs.map(x => (x.id === r.id ? { ...x, text: v, editedAt: now() } : x))); setEditing(null); }}>
                <textarea className="text-input" autoFocus rows={2} value={editing.text} aria-label="The remark" onChange={e => setEditing({ id: r.id, text: e.target.value })} />
                <button type="submit" className="btn btn-primary">Keep</button>
                <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <p className="rl-rem-t">{r.text}</p>
                <span className="sub">{niceDay(isoDay(r.at))} {hm(r.at)}{r.by ? ` · ${r.by}` : ''}{r.editedAt ? ' · edited' : ''}</span>
                {canEdit && (
                  <span className="lt-acts">
                    <button type="button" className="cw-link" onClick={() => setEditing({ id: r.id, text: r.text })}>Edit</button>
                    <button type="button" className="cw-link sp-rm" onClick={() => put(rs => rs.map(x => (x.id === r.id ? { ...x, struck: true } : x)))}>Delete</button>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {off.length > 0 && canEdit && (
        <div className="ie-all">
          <button type="button" className="linkish" aria-expanded={showOff} onClick={() => setShowOff(o => !o)}>{showOff ? 'Hide' : 'Show'} the {off.length} taken off</button>
          {showOff && (
            <ul className="rl-rem is-off">
              {off.map(r => (
                <li key={r.id}><p className="rl-rem-t">{r.text}</p><button type="button" className="linkish" onClick={() => put(rs => rs.map(x => (x.id === r.id ? { ...x, struck: undefined } : x)))}>Undo — bring it back</button></li>
              ))}
            </ul>
          )}
        </div>
      )}
      {canEdit && (
        <form className="rl-note" onSubmit={e => { e.preventDefault(); add(); }}>
          <textarea className="text-input" rows={2} value={text} maxLength={2000} placeholder="Write what was seen, tried, or needs looking at" aria-label="Add to the commentary" onChange={e => setText(e.target.value)} />
          <button type="submit" className="btn" disabled={!text.trim()}>Add</button>
        </form>
      )}
    </LeanPanel>
  );
}

/* ------------------------------------------------------------------ close: a receipt */
function Act({ s, items, text, tone, can, me }: { s: ToolStudy; items: RelItem[]; text: string; tone: 'r' | 'a' | 'g' | 'n'; can: ReturnType<typeof canAt>; me?: string }) {
  const f = items[0]?.f;
  const [reopen, setReopen] = useState<string | null>(null);
  const by = me ? { by: me } : {};
  if (s.closedAt && s.receipt) {
    return (
      <div className="ie-act is-closed">
        <p className="ie-receipt"><b>Closed {niceDay(isoDay(s.receipt.at))}{s.receipt.by ? ` by ${s.receipt.by}` : ''}</b> — a receipt: these figures stand as they were. {s.receipt.text}</p>
        {can.agree && (reopen === null
          ? <button type="button" className="btn" onClick={() => setReopen('')}>Reopen</button>
          : (
            <form className="ie-why" onSubmit={e => { e.preventDefault(); if (!reopen.trim()) return;
              void patchStudy(s.id, cur => ({ closedAt: undefined, receipt: cur.receipt && { ...cur.receipt, reopened: [...(cur.receipt.reopened ?? []), { at: now(), ...by, why: reopen.trim() }] } }));
              setReopen(null); }}>
              <input className="text-input" autoFocus value={reopen} placeholder="Why it is reopened — kept with it" onChange={e => setReopen(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={!reopen.trim()}>Reopen it</button>
            </form>
          ))}
      </div>
    );
  }
  if (!can.edit || !f || !items.some(i => i.f.n > 0) || f.runningSince) return null;
  /* the receipt: every thing counted, its taps, MTBF, rate and range as they stand */
  const close = () => void patchStudy(s.id, cur => ({
    closedAt: now(),
    receipt: { at: now(), ...by, text, tone,
      figures: { hours: +f.hours.toFixed(3), ...Object.fromEntries(items.flatMap(({ c, f: g }) => [
        [`${c.event} · taps`, g.n],
        [`${c.event} · MTBF min`, g.mtbfH !== undefined ? +(g.mtbfH * 60).toFixed(1) : null],
        [`${c.event} · an hour`, g.rate !== undefined ? +g.rate.toFixed(3) : null],
        [`${c.event} · 90% low min`, g.lo !== undefined ? +(g.lo * 60).toFixed(1) : null],
        [`${c.event} · 90% high min`, g.hi !== undefined ? +(g.hi * 60).toFixed(1) : null],
      ])) },
      ...(cur.receipt?.reopened ? { reopened: cur.receipt.reopened } : {}) },
  }));
  return <div className="ie-act"><button type="button" className="btn btn-primary" onClick={close}>Close — keep these figures</button></div>;
}
