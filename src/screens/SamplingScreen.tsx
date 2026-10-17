/* ONE WORK SAMPLING STUDY — what people are doing, at random moments of a
 * shift (docs/TOOLKIT.md, Part 4, tool 9; docs/BUILD.md, H1).
 *
 * Nobody follows a person with a stopwatch all day. The shift's moments are
 * drawn at random once, when it is set up, and kept on the study, so every
 * phone asks at the same instants. When a moment comes, the phone (while the
 * app is open — there is no push for it yet) asks; one tap per person says
 * what each was doing then, and the tap carries the moment's own time, not
 * the time it was answered — the shares are of the random moments.
 *
 * The frame every tool shares (TOOLKIT 3.1), in the order of the three
 * questions: where are we (the strip), why (each person's shares with the
 * margin they carry — never one score), what are we doing about it (Make it
 * better raises the fix or the countermeasure with the figure in its words).
 * Agreed before measured: who is watched, the activities and the shift come
 * first. Nothing worked out is stored; lib/ie/sampling makes every figure. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStandard, getStudy, onDataChange, patchStudy } from '../db';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt } from '../lib/access';
import { now, uid } from '../lib/ids';
import { niceDay, isoDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { peopleOf } from '../lib/standard';
import {
  DEFAULT_ACTIVITIES, TOO_FEW_TAPS, dueRound, nextPrompt, samplingEnough, samplingReading, samplingSays,
  schedulePrompts, shares, tapsNeeded, tapsOf,
} from '../lib/ie/sampling';
import type { AgreedSampling, Tap, ToolStudy } from '../lib/study';
import { TOOL_WORDS } from './StudiesScreen';
import { walkVerdict } from '../lib/ie/walk';
import { analyse } from '../lib/capacity';
import { WhereItSits, UsedFor, useBetter } from '../ui/StudyPlace';
import { LeanActions, LeanBand, LeanClosing, LeanPanel, LeanTiles } from '../ui/Lean';
import { bandPage } from '../lib/lean';
import { momentsAt, personRate, samplingClosing, samplingTiles } from '../lib/ie/samplingLean';
import { raisedFrom } from '../lib/ie/lossLean';
import { useFactoryLines } from '../lib/useFactoryLines';
import { StudyName } from '../ui/StudyActs';

const OWNER = canAt('owner');
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function SamplingScreen({ id }: { id: string }) {
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
      <button type="button" className="btn" onClick={() => nav('/sampling')}>Every work sampling study</button>
    </div>
  );
  return <Sampling s={s} can={can} me={me} />;
}

function Sampling({ s, can, me }: { s: ToolStudy; can: ReturnType<typeof canAt>; me?: string }) {
  const a = s.agreed?.sampling;
  const taps = useMemo(() => s.facts.taps ?? [], [s.facts.taps]);
  const closed = !!s.closedAt;
  const [setting, setSetting] = useState(false);
  const w = TOOL_WORDS[s.tool];
  /* The clock the moments are read against — ticking while the page is open. */
  const [t, setT] = useState(() => Date.now());
  useEffect(() => { const i = window.setInterval(() => setT(Date.now()), 5000); return () => window.clearInterval(i); }, []);
  const round = a && !closed ? dueRound(a.prompts, taps, a.who, t) : undefined;
  useNudge(round?.at, round ? `Moment ${round.no} — tap what each person is doing` : undefined);
  const said = useMemo(() => samplingSays(a, taps), [a, taps]);
  /* the line's own rate for one person — what the biggest share costs (lib/cost, the one cost model) */
  const line = useFactoryLines(s.workspaceId).find(x => x.id === s.workspaceId);
  const rate = personRate(line);
  /* what was raised from it — the action plan (ui/StudyPlace useBetter) */
  const { steps, tests } = useBetter(s, me);

  const tap = (who: string, activity: string, at: number) => void patchStudy(s.id, cur => ({
    facts: { ...cur.facts, taps: [...(cur.facts.taps ?? []), { id: uid(), at, who, activity, ...(me ? { by: me } : {}) }] },
  }));
  const strike = (tid: string, struck: boolean) => void patchStudy(s.id, cur => ({
    facts: { ...cur.facts, taps: (cur.facts.taps ?? []).map(x => (x.id === tid ? { ...x, struck: struck || undefined } : x)) },
  }));

  return (
    <div className="wrap ie ws">
      {/* THE LEAN PAGE (docs/LEAN-PAGE.md, slice 6; lib/ie/samplingLean): the
          band, the tiles in the strip's place — the biggest share not the
          work in money too — the action plan and the closing line */}
      <LeanBand page={bandPage(a?.walk ? 'Bottleneck walk' : w?.one ?? 'Work sampling', s, said.verdict, said.tone)} title={<StudyName s={s} canEdit={can.edit && !s.closedAt} canRemove={can.remove} />} />
      <div className="ln-under">
        <p className="sub ie-where">
          {s.product ? <><b>{s.product}</b> · </> : null}
          started {niceDay(isoDay(s.startedAt))}
        </p>
        <WhereItSits s={s} can={can} />
      </div>

      {!a || setting ? (
        <SetUp s={s} canAgree={can.agree && !closed} hasTaps={taps.length > 0} onDone={() => setSetting(false)} cancel={a ? () => setSetting(false) : undefined} />
      ) : (
        <>
          <LeanTiles tiles={samplingTiles(a, taps, momentsAt(a, taps, t), rate)} className="ie-strip" />
          {!closed && can.edit && <Round a={a} taps={taps} t={t} round={round} onTap={tap} onStrike={id => strike(id, true)} />}
          <div className="ie-says">
            {a.walk && <WalkSays s={s} a={a} taps={taps} />}
            {a.who.map(p => <p key={p} className="ie-say is-n">{samplingReading({ activities: a.activities, marginPts: a.marginPts, taps }, p)}</p>)}
          </div>
          <Shares a={a} taps={taps} />
          <EveryTap taps={taps} canStrike={can.edit && !closed} onStrike={strike} />
          <p className="ie-agreed sub">
            Agreed: <b>{agreedWords(a)}</b>
            {can.agree && !closed && <button type="button" className="linkish" onClick={() => setSetting(true)}>Change what was agreed</button>}
          </p>
          <UsedFor s={s} can={can} me={me} />
          <Act s={s} a={a} taps={taps} text={said.text} can={can} me={me} />
          <LeanPanel title="Action plan" className="ln-solo ln-plan-p">
            <LeanActions actions={raisedFrom(s, steps, tests)} empty="Nothing raised from it yet — Make it better raises a fix or a countermeasure from its biggest share." />
          </LeanPanel>
          <LeanClosing closing={samplingClosing(a, taps, said, rate)} />
        </>
      )}
    </div>
  );
}

/** When a moment comes, say so beyond the page: the tab's title, and a buzz
 *  on a phone that can — once per moment. */
function useNudge(at: number | undefined, words: string | undefined) {
  const told = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (at === undefined || !words) return;
    const was = document.title;
    document.title = `● ${words}`;
    if (told.current !== at) { told.current = at; try { navigator.vibrate?.([180, 90, 180]); } catch { /* not every phone can */ } }
    return () => { document.title = was; };
  }, [at, words]);
}

export function agreedWords(a: AgreedSampling): string {
  return `watching ${a.who.join(', ')} · ${hhmm(a.from)}–${hhmm(a.to)} · ${a.prompts.length} moments · ±${a.marginPts} points wanted`;
}

/* ------------------------------------------------------------------ set up: who, what, when */
function SetUp({ s, canAgree, hasTaps, onDone, cancel }: { s: ToolStudy; canAgree: boolean; hasTaps: boolean; onDone: () => void; cancel?: () => void }) {
  const a = s.agreed?.sampling;
  /* The product's line standard brings its people, as the map's lanes do. */
  const [offered, setOffered] = useState<string[]>([]);
  useEffect(() => {
    if (!s.standardId) return;
    void getStandard(s.standardId).then(st => { if (st) setOffered(peopleOf(st).map((p, i) => p.label?.trim() || `Op ${i + 1}`)); });
  }, [s.standardId]);
  const [who, setWho] = useState<string[]>(a?.who ?? []);
  const [adding, setAdding] = useState('');
  const [acts, setActs] = useState((a?.activities ?? [...DEFAULT_ACTIVITIES]).join(', '));
  const [margin, setMargin] = useState(String(a?.marginPts ?? 5));
  const day = (ms: number) => new Date(ms).toTimeString().slice(0, 5);
  const start = a?.from ?? Math.ceil(Date.now() / 300_000) * 300_000;
  const [from, setFrom] = useState(day(start));
  const [to, setTo] = useState(day(a?.to ?? start + 8 * 3_600_000));
  const [count, setCount] = useState(String(a?.prompts.length ?? 40));

  const people = [...new Set([...offered, ...who])];
  const activities = acts.split(',').map(x => x.trim()).filter(Boolean);
  const m = Number(margin), n = Math.round(Number(count));
  /* The shift as instants: today, or tomorrow for an end past midnight. */
  const at = (hm: string, base = new Date()) => { const [h, mi] = hm.split(':').map(Number); const d = new Date(base); d.setHours(h ?? 0, mi ?? 0, 0, 0); return d.getTime(); };
  const fromMs = at(from), toRaw = at(to), toMs = toRaw <= fromMs ? toRaw + 86_400_000 : toRaw;
  const problem =
    !who.length ? 'Who is watched — at least one person.'
    : activities.length < 2 ? 'At least two activities a tap can be.'
    : !(m >= 1 && m <= 20) ? 'The margin wanted, between 1 and 20 points.'
    : !(n >= 5 && n <= 400) ? 'How many moments in the shift — between 5 and 400.'
    : '';
  const sameShift = !!a && a.from === fromMs && a.to === toMs && a.prompts.length === n;
  const save = () => {
    if (problem || !canAgree) return;
    const agreed: AgreedSampling = { who, activities, marginPts: m, from: fromMs, to: toMs, prompts: sameShift && a ? a.prompts : schedulePrompts(fromMs, toMs, n) };
    void patchStudy(s.id, cur => ({ agreed: { ...cur.agreed, sampling: agreed } }));
    onDone();
  };

  if (!canAgree) return (
    <div className="ie-agree is-wait"><p><b>It isn’t set up yet.</b> The job’s owner says who is watched and the shift, before the first tap.</p></div>
  );
  return (
    <form className="ie-agree" onSubmit={e => { e.preventDefault(); save(); }}>
      <h2>Who, what and when</h2>
      <p className="sub">Agreed before the first tap. The phone asks at {n || 'the'} random moments in the shift — the same moments on every phone — and one tap per person says what each was doing.</p>
      {hasTaps && <p className="ie-note">Taps are already in: they keep their moments{sameShift ? '' : ', and new moments are drawn for the rest of the shift'}.</p>}
      <div className="field"><span className="field-label">Who is watched</span>
        <div className="chip-row" role="group" aria-label="Who is watched">
          {people.map(p => (
            <button key={p} type="button" role="checkbox" aria-checked={who.includes(p)} className={'chip' + (who.includes(p) ? ' on' : '')}
              onClick={() => setWho(v => (v.includes(p) ? v.filter(x => x !== p) : [...v, p]))}>{p}</button>
          ))}
        </div>
        <span className="ws-add">
          <input className="text-input" value={adding} maxLength={40} placeholder={people.length ? 'Someone else — e.g. Team leader' : 'e.g. Op 1'} aria-label="Add a person or role"
            onChange={e => setAdding(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = adding.trim(); if (v && !who.includes(v)) setWho([...who, v]); setAdding(''); } }} />
          <button type="button" className="btn" disabled={!adding.trim()} onClick={() => { const v = adding.trim(); if (v && !who.includes(v)) setWho([...who, v]); setAdding(''); }}>Add</button>
        </span>
      </div>
      <label className="field"><span className="field-label">What a tap can be</span>
        <input className="text-input" value={acts} onChange={e => setActs(e.target.value)} aria-label="Activities, separated by commas" />
        <span className="sub">The first is the work itself; the rest are what it is measured against. Separate them with commas, in the floor’s words.</span>
      </label>
      <div className="ie-agree-grid">
        <label className="field"><span className="field-label">Shift from</span><input className="text-input" type="time" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="field"><span className="field-label">to</span><input className="text-input" type="time" value={to} onChange={e => setTo(e.target.value)} /></label>
        <label className="field"><span className="field-label">Moments in the shift</span><input className="text-input" inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} /></label>
        <label className="field"><span className="field-label">Margin wanted, ± points</span><input className="text-input" inputMode="numeric" value={margin} onChange={e => setMargin(e.target.value)} /></label>
      </div>
      {!problem && <p className="ie-note">A share near 30% known within ±{m} points needs {tapsNeeded(0.3, m / 100)} taps a person — {n} moments give {n}{n < tapsNeeded(0.3, m / 100) ? '; sample another shift for the rest' : ''}.</p>}
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>Start sampling</button>
        {cancel && <button type="button" className="btn" onClick={cancel}>Keep what was agreed</button>}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ strip */
/* ------------------------------------------------------------------ the moment: one tap per person */
function Round({ a, taps, t, round, onTap, onStrike }: {
  a: AgreedSampling; taps: Tap[]; t: number; round?: { at: number; no: number; left: string[] };
  onTap: (who: string, activity: string, at: number) => void; onStrike: (id: string) => void;
}) {
  const next = nextPrompt(a.prompts, t);
  if (!round) {
    /* the moment just answered, so a mistap can be struck while it is fresh */
    const last = [...a.prompts].reverse().find(p => p <= t);
    const answered = last !== undefined ? tapsOf(taps).filter(x => x.at === last) : [];
    return (
      <div className="ws-wait" aria-live="polite">
        {answered.length > 0 && last !== undefined && <p className="ws-done"><b>{hhmm(last)} answered</b> — {answered.map(x => (
          <span key={x.id} className="ws-done-i">{x.who} {x.activity} <button type="button" className="linkish" onClick={() => onStrike(x.id)} aria-label={`Strike ${x.who} ${x.activity}`}>Strike</button></span>
        ))}</p>}
        <p className="sub">{next ? <>The next moment is at <b>{hhmm(next)}</b>. Keep Faultline open on this phone — it asks then{('vibrate' in navigator) ? ', and buzzes' : ''}.</> : 'Every moment of the shift has come.'}</p>
      </div>
    );
  }
  return (
    <div className="ws-round" role="group" aria-label={`Moment ${round.no}`} aria-live="assertive">
      <p className="ws-round-h"><b>{a.walk ? 'Walk' : 'Moment'} {round.no} of {a.prompts.length} — {hhmm(round.at)}</b> · {a.walk ? 'walk the line and tap each station: working, starved (waiting for its input), blocked (cannot pass on) or down' : 'tap what each person is doing right now'}</p>
      {a.who.map(p => {
        const got = tapsOf(taps, p).find(x => x.at === round.at);
        return (
          <div key={p} className={'ws-person' + (got ? ' is-done' : '')}>
            <b className="ws-who">{p}</b>
            {got ? (
              <span className="ws-got">{got.activity} <button type="button" className="linkish" onClick={() => onStrike(got.id)}>Strike</button></span>
            ) : (
              <span className="ws-acts">
                {a.activities.map(act => <button key={act} type="button" className="btn ws-act" onClick={() => onTap(p, act, round.at)}>{act}</button>)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ the shares, with the margin they carry */
function Shares({ a, taps }: { a: AgreedSampling; taps: Tap[] }) {
  if (!tapsOf(taps).length) return <p className="sub ie-pic-empty">Each person’s shares build here as the taps come in — every share with the margin it carries.</p>;
  return (
    <div className="ws-shares">
      {a.who.map(p => {
        const n = tapsOf(taps, p).length;
        const enough = samplingEnough(n) === 'enough';
        const list = shares(taps, a.activities, p).filter(x => x.taps > 0).sort((x, y) => y.share - x.share);
        return (
          <section key={p} className="ws-p">
            <h3 className="ws-p-h">{p} <span className="sub">{n} tap{n === 1 ? '' : 's'}{enough ? '' : ` — too early: ${TOO_FEW_TAPS} before the shares are said`}</span></h3>
            {enough && (
              <ul className="ws-bars">
                {list.map(x => (
                  <li key={x.activity} className="ws-bar">
                    <span className="ws-bar-w">{x.activity}</span>
                    <span className="ws-bar-t" aria-hidden="true">
                      <i className="ws-bar-f" style={{ width: `${x.share * 100}%` }} />
                      <i className="ws-bar-m" style={{ left: `${Math.max(0, x.share - x.margin) * 100}%`, width: `${(Math.min(1, x.share + x.margin) - Math.max(0, x.share - x.margin)) * 100}%` }} />
                    </span>
                    <span className="ws-bar-n"><b>{Math.round(x.share * 100)}%</b> ±{Math.round(x.margin * 100)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ every tap */
function EveryTap({ taps, canStrike, onStrike }: { taps: Tap[]; canStrike: boolean; onStrike: (id: string, struck: boolean) => void }) {
  const [open, setOpen] = useState(false);
  if (!taps.length) return null;
  const struck = taps.filter(x => x.struck).length;
  const sorted = [...taps].sort((x, y) => x.at - y.at || x.who.localeCompare(y.who));
  return (
    <div className="ie-all">
      <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Every'} tap — {taps.length}{struck ? `, ${struck} struck` : ''}
      </button>
      {open && (
        <ol className="ie-rows">
          {sorted.map(x => (
            <li key={x.id} className={x.struck ? 'is-struck' : ''}>
              <span className="ie-no">{hhmm(x.at)}</span>
              <b>{x.who}</b>
              <span className="sub">{x.activity}{x.by ? ` · by ${x.by}` : ''}</span>
              {canStrike && <button type="button" className="linkish" onClick={() => onStrike(x.id, !x.struck)}>{x.struck ? 'Restore' : 'Strike'}</button>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ close: a receipt */
function Act({ s, a, taps, text, can, me }: { s: ToolStudy; a: AgreedSampling; taps: Tap[]; text: string; can: ReturnType<typeof canAt>; me?: string }) {
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
  const enough = a.who.some(p => samplingEnough(tapsOf(taps, p).length) === 'enough');
  if (!can.edit || !enough) return null;
  const close = () => void patchStudy(s.id, cur => ({
    closedAt: now(),
    receipt: { at: now(), ...by, text, tone: 'n',
      figures: Object.fromEntries(a.who.flatMap(p => shares(taps, a.activities, p).map(x => [`${p} · ${x.activity}`, +(x.share * 100).toFixed(1)]))),
      ...(cur.receipt?.reopened ? { reopened: cur.receipt.reopened } : {}) },
  }));
  return <div className="ie-act"><button type="button" className="btn btn-primary" onClick={close}>Close — keep these figures</button></div>;
}

/** A bottleneck walk's verdict, against the bottleneck the standard's sums
 *  give (lib/ie/walk; docs/CAPACITY.md §3). */
function WalkSays({ s, a, taps }: { s: ToolStudy; a: AgreedSampling; taps: Tap[] }) {
  const [calc, setCalc] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!s.standardId) return;
    void getStandard(s.standardId).then(st => { const r = st?.capacity ? analyse(st.capacity) : undefined; setCalc(r?.limit ? (r.limit.station.name.trim() || `Station ${r.limit.index + 1}`) : undefined); });
  }, [s.standardId]);
  const v = walkVerdict(a.who, taps, calc);
  return <p className={'ie-say' + (v.against === 'disagrees' ? ' is-a' : ' is-n')}><b>{v.sentence}</b></p>;
}
