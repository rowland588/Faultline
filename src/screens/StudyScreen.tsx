/* ONE CAPABILITY STUDY — readings in, Cpk out (docs/TOOLKIT.md, Part 4, tool
 * 1; docs/BUILD.md, 2d).
 *
 * The frame every tool shares (TOOLKIT 3.1), in the order of the three
 * questions: where are we (the strip), why are we not where we should be (the
 * sentence and the abnormal in the picture), what are we doing about it (the
 * act row). Agreed before measured: until the limits and the count are
 * agreed, that is the only thing on the page.
 *
 * On a phone at the machine: the number pad is the screen — big keys, ↵ — and
 * each reading lands as a dot as it is typed. "12 of 30 in" climbs. A mistype
 * is struck, never erased: it keeps its number and counts for nothing.
 *
 * Nothing worked out is stored. The figures and both sentences come from
 * lib/ie/sample on every render; only at close are they written down, as a
 * receipt, so next month's edits cannot rewrite this month's claim. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, onDataChange, patchStudy } from '../db';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt } from '../lib/access';
import { now, uid } from '../lib/ids';
import { niceDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { sample, sampleSays, tneFor, CPK_FROM, type SampleFigures, type SampleSays } from '../lib/ie/sample';
import type { AgreedReadings, StudyReading, ToolStudy } from '../lib/study';
import { TOOL_WORDS } from './StudiesScreen';

const OWNER = canAt('owner');

export function StudyScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  /* On a job, the job's rule; a quick session or a line's, its people may do
     all of it, as on a snag (TOOLKIT 3.6). */
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;

  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (s === null) return (
    <div className="wrap ie">
      <h1>This study isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/capability')}>Every capability study</button>
    </div>
  );
  return <Study s={s} can={can} me={me} />;
}

function Study({ s, can, me }: { s: ToolStudy; can: ReturnType<typeof canAt>; me?: string }) {
  const a = s.agreed?.readings;
  const readings = useMemo(() => s.facts.readings ?? [], [s.facts.readings]);
  const f = useMemo(() => sample(a, readings), [a, readings]);
  const said = useMemo(() => sampleSays(f, a), [f, a]);
  const closed = !!s.closedAt;
  const [agreeing, setAgreeing] = useState(false);
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  const w = TOOL_WORDS[s.tool];

  const add = (r: Omit<StudyReading, 'id' | 'at'>) =>
    write(cur => ({ facts: { ...cur.facts, readings: [...(cur.facts.readings ?? []), { id: uid(), at: now(), ...(me ? { who: me } : {}), ...r }] } }));
  const strike = (rid: string, struck: boolean) =>
    write(cur => ({ facts: { ...cur.facts, readings: (cur.facts.readings ?? []).map(r => (r.id === rid ? { ...r, struck: struck || undefined } : r)) } }));

  return (
    <div className="wrap ie">
      <header className="ie-head">
        <small className="ie-eyebrow">{w?.one ?? 'Study'}</small>
        <Name s={s} canEdit={can.edit && !closed} />
        <p className="sub ie-where">
          {s.machine ? <><b>{s.machine}</b> · </> : null}
          {s.workspaceId || s.projectId ? 'On a line or a job' : 'Not filed — yours alone'} · started {niceDay(new Date(s.startedAt).toISOString().slice(0, 10))}
        </p>
      </header>

      {!a || agreeing ? (
        <Agree s={s} canAgree={can.agree && !closed} hasReadings={f.n > 0} onDone={() => setAgreeing(false)} cancel={a ? () => setAgreeing(false) : undefined} />
      ) : (
        <>
          <Strip f={f} a={a} said={said} />
          <Says said={said} s={s} />
          <div className="ie-body">
            <div className="ie-pic">{a.kind === 'ticks' ? <Ticks readings={readings} /> : <Dots f={f} a={a} readings={readings} said={said} />}</div>
            {!closed && can.edit && <Capture a={a} f={f} readings={readings} onAdd={add} onStrike={id => strike(id, true)} />}
          </div>
          <Readings readings={readings} f={f} a={a} canStrike={can.edit && !closed} onStrike={strike} />
          <p className="ie-agreed sub">
            Agreed: <b>{agreedWords(a)}</b>
            {can.agree && !closed && <button type="button" className="linkish" onClick={() => setAgreeing(true)}>Change what was agreed</button>}
          </p>
          <Act s={s} f={f} said={said} can={can} me={me} write={write} />
        </>
      )}
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

/* ------------------------------------------------------------------ agree */
const KINDS: { k: AgreedReadings['kind']; word: string; hint: string }[] = [
  { k: 'limits', word: 'Limits', hint: 'a lower and an upper limit — either can be left blank' },
  { k: 'packers', word: 'Sold by weight (℮)', hint: 'the nominal alone: the packers’ three rules follow from it' },
  { k: 'ticks', word: 'Ticks', hint: 'pass or fail each one — a reject test, say' },
];
const numOr = (t: string) => (t.trim() === '' ? undefined : Number(t));

function Agree({ s, canAgree, hasReadings, onDone, cancel }: { s: ToolStudy; canAgree: boolean; hasReadings: boolean; onDone: () => void; cancel?: () => void }) {
  const a = s.agreed?.readings;
  const [kind, setKind] = useState<AgreedReadings['kind']>(a?.kind ?? 'limits');
  const [unit, setUnit] = useState(a?.unit ?? 'g');
  const [nominal, setNominal] = useState(a?.nominal?.toString() ?? '');
  const [lower, setLower] = useState(a?.lower?.toString() ?? '');
  const [upper, setUpper] = useState(a?.upper?.toString() ?? '');
  const [count, setCount] = useState((a?.count ?? 30).toString());
  const nom = numOr(nominal), lo = numOr(lower), hi = numOr(upper), n = Math.round(Number(count));
  const tne = kind === 'packers' && nom !== undefined ? tneFor(nom, unit) : undefined;
  const problem =
    !(n >= 1) ? 'How many readings — at least 1.'
    : [nom, lo, hi].some(x => x !== undefined && !Number.isFinite(x)) ? 'Numbers only in the limits.'
    : kind === 'limits' && lo === undefined && hi === undefined ? 'At least one limit.'
    : kind === 'limits' && lo !== undefined && hi !== undefined && lo >= hi ? 'The lower limit has to be below the upper.'
    : kind === 'packers' && nom === undefined ? 'The nominal — what the pack says.'
    : kind === 'packers' && tne === undefined ? 'The packers’ rules cover 5 g to 10 kg (or ml to l).'
    : '';

  const save = () => {
    if (problem || !canAgree) return;
    const agreed: AgreedReadings = { kind, count: n,
      ...(kind !== 'ticks' && unit.trim() ? { unit: unit.trim() } : {}),
      ...(kind !== 'ticks' && nom !== undefined ? { nominal: nom } : {}),
      ...(kind === 'limits' && lo !== undefined ? { lower: lo } : {}),
      ...(kind === 'limits' && hi !== undefined ? { upper: hi } : {}) };
    void patchStudy(s.id, cur => ({ agreed: { ...cur.agreed, readings: agreed } }));
    onDone();
  };

  if (!canAgree) return (
    <div className="ie-agree is-wait">
      <p><b>The limits aren’t agreed yet.</b> The job’s owner agrees what it is judged against, before the readings go in.</p>
    </div>
  );
  return (
    <form className="ie-agree" onSubmit={e => { e.preventDefault(); save(); }}>
      <h2>Agree the limits</h2>
      <p className="sub">What it is judged against, and how many readings — agreed before they go in, so a reading never moves them.</p>
      {hasReadings && <p className="ie-note">Readings are already in: they will be judged against what you agree now.</p>}
      <div className="chip-row" role="radiogroup" aria-label="How it is judged">
        {KINDS.map(x => (
          <button key={x.k} type="button" role="radio" aria-checked={kind === x.k} className={'chip' + (kind === x.k ? ' on' : '')} onClick={() => setKind(x.k)}>{x.word}</button>
        ))}
      </div>
      <p className="sub ie-kind-hint">{KINDS.find(x => x.k === kind)?.hint}</p>
      <div className="ie-agree-grid">
        {kind !== 'ticks' && <label className="field"><span className="field-label">Unit</span>
          <input className="text-input" value={unit} maxLength={8} onChange={e => setUnit(e.target.value)} placeholder="g" /></label>}
        {kind !== 'ticks' && <label className="field"><span className="field-label">{kind === 'packers' ? 'Nominal (on the pack)' : 'Nominal'} {kind === 'limits' && <i className="sub">optional</i>}</span>
          <input className="text-input" inputMode="decimal" value={nominal} onChange={e => setNominal(e.target.value)} placeholder="400" /></label>}
        {kind === 'limits' && <label className="field"><span className="field-label">Lower limit</span>
          <input className="text-input" inputMode="decimal" value={lower} onChange={e => setLower(e.target.value)} placeholder="400" /></label>}
        {kind === 'limits' && <label className="field"><span className="field-label">Upper limit</span>
          <input className="text-input" inputMode="decimal" value={upper} onChange={e => setUpper(e.target.value)} placeholder="404" /></label>}
        <label className="field"><span className="field-label">How many readings</span>
          <input className="text-input" inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} /></label>
      </div>
      {tne !== undefined && nom !== undefined && (
        <p className="ie-note">℮ {nom} {unit}: the tolerable negative error is {+tne.toFixed(3)} {unit}. The average at least {nom}; fewer than 1 in 40 more than {+tne.toFixed(3)} {unit} short; none more than {+(2 * tne).toFixed(3)} {unit} short.</p>
      )}
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>Agree these</button>
        {cancel && <button type="button" className="btn" onClick={cancel}>Keep what was agreed</button>}
      </div>
    </form>
  );
}

export function agreedWords(a: AgreedReadings): string {
  const u = a.unit ? ` ${a.unit}` : '';
  const what = a.kind === 'ticks' ? 'pass or fail each'
    : a.kind === 'packers' ? `sold by weight, ℮ ${a.nominal}${u}`
    : a.lower !== undefined && a.upper !== undefined ? `${a.lower}–${a.upper}${u}`
    : a.lower !== undefined ? `at least ${a.lower}${u}` : `at most ${a.upper}${u}`;
  return `${what}, ${a.count} reading${a.count === 1 ? '' : 's'}`;
}

/* ------------------------------------------------------------------ strip and says */
function Strip({ f, a, said }: { f: SampleFigures; a: AgreedReadings; said: SampleSays }) {
  const unit = a.unit ? ` ${a.unit}` : '';
  const fx = (v?: number) => (v === undefined ? '—' : v.toFixed(f.dp));
  const cap = said.capability;
  return (
    <div className="ie-strip" role="group" aria-label="Where it stands">
      <span className={'ie-fig ie-verdict is-' + said.tone}><b>{said.verdict}</b></span>
      <span className={'ie-fig' + (f.n ? '' : ' is-zero')}><b>{f.n}</b> of {f.count} in</span>
      {a.kind !== 'ticks' && f.n > 0 && <>
        <span className="ie-fig">mean <b>{fx(f.mean)}{unit}</b></span>
        <span className="ie-fig">{fx(f.min)}–{fx(f.max)}</span>
        <span className={'ie-fig' + (f.outside.length ? ' is-r' : ' is-zero')}><b>{f.outside.length}</b> outside</span>
        {f.cpk !== undefined && Number.isFinite(f.cpk) && (
          <span className={'ie-fig is-' + (cap?.tone ?? 'n')}>
            Cpk <b>{f.n >= CPK_FROM ? f.cpk.toFixed(2) : '—'}</b> · from {f.n}{f.n < CPK_FROM ? ' · too few' : ''}
          </span>
        )}
      </>}
    </div>
  );
}

function Says({ said, s }: { said: SampleSays; s: ToolStudy }) {
  return (
    <div className="ie-says">
      <p className={'ie-say is-' + said.tone}>{said.text}</p>
      {said.capability && <p className={'ie-say ie-cap is-' + said.capability.tone}>{said.capability.text}</p>}
      {s.overrule && (
        <p className="ie-say ie-over"><b>{s.overrule.verdict}</b> · overruled{s.overrule.by ? ` by ${s.overrule.by}` : ''} — {s.overrule.why}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ the dots between the limits */
const DW = 600, DH = 230, PAD = { l: 10, r: 118, t: 16, b: 16 };

function Dots({ f, a, readings, said }: { f: SampleFigures; a: AgreedReadings; readings: StudyReading[]; said: SampleSays }) {
  const kept = readings.filter(r => !r.struck && typeof r.value === 'number');
  const tne = f.packers?.tne;
  const lines: { v: number; label: string; cls: string }[] = [];
  if (a.kind === 'packers' && f.packers && tne !== undefined) {
    lines.push({ v: f.packers.nominal, label: `nominal ${f.packers.nominal}`, cls: 'ie-nom' });
    lines.push({ v: f.packers.nominal - tne, label: `${+tne.toFixed(3)} short`, cls: 'ie-lim' });
    lines.push({ v: f.packers.nominal - 2 * tne, label: `${+(2 * tne).toFixed(3)} short`, cls: 'ie-lim2' });
  } else {
    if (a.upper !== undefined) lines.push({ v: a.upper, label: `upper ${a.upper}`, cls: 'ie-lim' });
    if (a.lower !== undefined) lines.push({ v: a.lower, label: `lower ${a.lower}`, cls: 'ie-lim' });
    if (a.nominal !== undefined && a.nominal !== a.lower && a.nominal !== a.upper) lines.push({ v: a.nominal, label: `nominal ${a.nominal}`, cls: 'ie-nom' });
  }
  const vs = [...kept.map(r => r.value as number), ...lines.map(l => l.v), ...(f.mean !== undefined ? [f.mean] : [])];
  if (!vs.length) return <p className="sub ie-pic-empty">Each reading lands here as a dot, between the limits.</p>;
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const span = Math.max(hi - lo, Math.abs(hi) * 0.002, 1e-6);
  lo -= span * 0.12; hi += span * 0.12;
  const slots = Math.max(f.count, kept.length, 2);
  const x = (i: number) => PAD.l + (i / (slots - 1)) * (DW - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (DH - PAD.t - PAD.b);
  const outside = new Set(f.outside.map(o => o.id)), flagged = new Set(f.flagged);
  return (
    <svg className="ie-dots" viewBox={`0 0 ${DW} ${DH}`} role="img" aria-label={said.text}>
      {lines.map(l => (
        <g key={l.cls + l.v}>
          <line className={l.cls} x1={PAD.l} x2={DW - PAD.r} y1={y(l.v)} y2={y(l.v)} />
          <text className="ie-lw" x={DW - PAD.r + 8} y={y(l.v) + 5}>{l.label}</text>
        </g>
      ))}
      {f.mean !== undefined && kept.length > 1 && (
        <g>
          <line className="ie-mean" x1={PAD.l} x2={DW - PAD.r} y1={y(f.mean)} y2={y(f.mean)} />
          <text className="ie-lw ie-mw" x={DW - PAD.r + 8} y={y(f.mean) + 5}>mean {f.mean.toFixed(f.dp)}</text>
        </g>
      )}
      {kept.map((r, i) => (
        <g key={r.id}>
          {flagged.has(r.id) && <circle className="ie-flag" cx={x(i)} cy={y(r.value as number)} r={10} />}
          <circle className={'ie-dot' + (outside.has(r.id) ? ' is-out' : '')} cx={x(i)} cy={y(r.value as number)} r={6} />
        </g>
      ))}
    </svg>
  );
}

function Ticks({ readings }: { readings: StudyReading[] }) {
  const kept = readings.filter(r => !r.struck && typeof r.ok === 'boolean');
  if (!kept.length) return <p className="sub ie-pic-empty">Each one lands here as ✓ or ✗.</p>;
  return (
    <ol className="ie-ticks">
      {readings.map((r, i) => (r.struck || typeof r.ok !== 'boolean' ? null : (
        <li key={r.id} className={r.ok ? 'is-ok' : 'is-bad'} title={`No. ${i + 1}`}>{r.ok ? '✓' : '✗'}<small>{i + 1}</small></li>
      )))}
    </ol>
  );
}

/* ------------------------------------------------------------------ capture: the number pad */
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

function Capture({ a, f, readings, onAdd, onStrike }: {
  a: AgreedReadings; f: SampleFigures; readings: StudyReading[];
  onAdd: (r: Omit<StudyReading, 'id' | 'at'>) => void; onStrike: (id: string) => void;
}) {
  const [typed, setTyped] = useState('');
  const press = useCallback((k: string) => {
    setTyped(t => (k === '⌫' ? t.slice(0, -1) : k === '.' ? (t.includes('.') ? t : (t || '0') + '.') : k === '-' ? (t.startsWith('-') ? t.slice(1) : '-' + t) : (t + k).slice(0, 12)));
  }, []);
  /* The reading is put in HERE, once — never inside a state updater, which
     React may run twice (it did: every reading landed twice). */
  const enter = useCallback(() => {
    const v = Number(typed);
    if (typed.trim() === '' || typed === '-' || !Number.isFinite(v)) return;
    onAdd({ value: v });
    setTyped('');
  }, [typed, onAdd]);
  /* A keyboard types into the pad too, unless a box has the focus. */
  useEffect(() => {
    if (a.kind === 'ticks') return;
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (/^[0-9]$/.test(e.key) || e.key === '.') { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('⌫'); e.preventDefault(); }
      else if (e.key === 'Enter') { enter(); e.preventDefault(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [a.kind, press, enter]);

  const last = readings.map((r, i) => ({ ...r, no: i + 1 })).filter(r => !r.struck).slice(-3).reverse();
  return (
    <div className="ie-cap-box" aria-label="Take the readings">
      <div className="ie-count"><b>{f.n}</b> of {f.count} in{f.enough ? ' — all in' : ''}</div>
      {a.kind === 'ticks' ? (
        <div className="ie-tick-keys">
          <button type="button" className="btn ie-key ie-ok" onClick={() => onAdd({ ok: true })} aria-label="Pass">✓</button>
          <button type="button" className="btn ie-key ie-bad" onClick={() => onAdd({ ok: false })} aria-label="Fail">✗</button>
        </div>
      ) : (
        <>
          <output className={'ie-typed' + (typed ? '' : ' is-empty')} aria-live="polite">{typed || '0'}{a.unit ? <small> {a.unit}</small> : null}</output>
          <div className="ie-pad" role="group" aria-label="Number pad">
            {KEYS.map(k => <button key={k} type="button" className="ie-key" onClick={() => press(k)} aria-label={k === '⌫' ? 'Delete' : k}>{k}</button>)}
            <button type="button" className="ie-key ie-enter" onClick={enter} aria-label="Enter the reading" disabled={!typed || !Number.isFinite(Number(typed))}>↵</button>
          </div>
        </>
      )}
      {last.length > 0 && (
        <ul className="ie-last" aria-label="The last readings">
          {last.map(r => (
            <li key={r.id}>
              <span className="ie-no">{r.no}</span>
              <b>{typeof r.value === 'number' ? r.value : r.ok ? '✓' : '✗'}</b>
              <button type="button" className="linkish" onClick={() => onStrike(r.id)} aria-label={`Strike reading ${r.no}`}>Strike</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ every reading */
function Readings({ readings, f, a, canStrike, onStrike }: { readings: StudyReading[]; f: SampleFigures; a: AgreedReadings; canStrike: boolean; onStrike: (id: string, struck: boolean) => void }) {
  const [open, setOpen] = useState(false);
  if (!readings.length) return null;
  const out = new Set(f.outside.map(o => o.id)), flagged = new Set(f.flagged);
  const struck = readings.filter(r => r.struck).length;
  return (
    <div className="ie-all">
      <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Every'} reading — {readings.length}{struck ? `, ${struck} struck` : ''}
      </button>
      {open && (
        <ol className="ie-rows">
          {readings.map((r, i) => (
            <li key={r.id} className={r.struck ? 'is-struck' : out.has(r.id) ? 'is-out' : ''}>
              <span className="ie-no">{i + 1}</span>
              <b>{typeof r.value === 'number' ? r.value.toFixed(Math.max(f.dp, 0)) + (a.unit ? ` ${a.unit}` : '') : r.ok ? '✓' : '✗'}</b>
              <span className="sub">{out.has(r.id) && !r.struck ? 'outside · ' : ''}{flagged.has(r.id) && !r.struck ? 'far from the rest · ' : ''}{r.who ? `${r.who} · ` : ''}{new Date(r.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              {canStrike && <button type="button" className="linkish" onClick={() => onStrike(r.id, !r.struck)}>{r.struck ? 'Restore' : 'Strike'}</button>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ the act row: close, overrule */
function Act({ s, f, said, can, me, write }: {
  s: ToolStudy; f: SampleFigures; said: SampleSays; can: ReturnType<typeof canAt>; me?: string;
  write: (p: Parameters<typeof patchStudy>[1]) => void;
}) {
  const [over, setOver] = useState<null | { verdict: string; why: string }>(null);
  const [reopen, setReopen] = useState<string | null>(null);
  const closed = !!s.closedAt;
  const by = me ? { by: me } : {};

  if (closed && s.receipt) {
    return (
      <div className="ie-act is-closed">
        <p className="ie-receipt"><b>Closed {niceDay(new Date(s.receipt.at).toISOString().slice(0, 10))}{s.receipt.by ? ` by ${s.receipt.by}` : ''}</b> — a receipt: these figures stand as they were. {s.receipt.text}</p>
        {can.agree && (reopen === null
          ? <button type="button" className="btn" onClick={() => setReopen('')}>Reopen</button>
          : (
            <form className="ie-why" onSubmit={e => { e.preventDefault(); if (!reopen.trim()) return;
              write(cur => ({ closedAt: undefined, receipt: cur.receipt && { ...cur.receipt, reopened: [...(cur.receipt.reopened ?? []), { at: now(), ...by, why: reopen.trim() }] } }));
              setReopen(null); }}>
              <input className="text-input" autoFocus value={reopen} placeholder="Why it is reopened — kept with it" onChange={e => setReopen(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={!reopen.trim()}>Reopen it</button>
            </form>
          ))}
      </div>
    );
  }
  const close = () => write(cur => ({
    closedAt: now(),
    receipt: { at: now(), ...by, text: [said.text, said.capability?.text].filter(Boolean).join(' '), tone: said.tone,
      figures: { n: f.n, count: f.count, mean: f.mean ?? null, sd: f.sd ?? null, min: f.min ?? null, max: f.max ?? null,
        outside: f.outside.length, cpk: f.n >= CPK_FROM && f.cpk !== undefined && Number.isFinite(f.cpk) ? +f.cpk.toFixed(2) : null },
      ...(cur.receipt?.reopened ? { reopened: cur.receipt.reopened } : {}) },
  }));
  const reopened = s.receipt?.reopened ?? [];
  const lastReopen = reopened[reopened.length - 1];
  return (
    <div className="ie-act">
      {lastReopen && <p className="sub">Reopened {niceDay(new Date(lastReopen.at).toISOString().slice(0, 10))}{lastReopen.by ? ` by ${lastReopen.by}` : ''} — {lastReopen.why}</p>}
      {can.edit && f.enough && <button type="button" className="btn btn-primary" onClick={close}>Close — keep these figures</button>}
      {can.agree && f.n > 0 && !s.overrule && over === null && (
        <button type="button" className="btn" onClick={() => setOver({ verdict: said.verdict === 'Passed' ? 'Didn’t pass' : 'Passed', why: '' })}>Overrule the verdict</button>
      )}
      {can.agree && s.overrule && <button type="button" className="btn" onClick={() => write({ overrule: undefined })}>Take back the overrule</button>}
      {over && (
        <form className="ie-why" onSubmit={e => { e.preventDefault(); if (!over.why.trim()) return;
          write({ overrule: { verdict: over.verdict, why: over.why.trim(), at: now(), ...by } }); setOver(null); }}>
          <div className="chip-row" role="radiogroup" aria-label="The verdict instead">
            {['Passed', 'Didn’t pass'].map(v => (
              <button key={v} type="button" role="radio" aria-checked={over.verdict === v} className={'chip' + (over.verdict === v ? ' on' : '')} onClick={() => setOver({ ...over, verdict: v })}>{v}</button>
            ))}
          </div>
          <input className="text-input" autoFocus value={over.why} placeholder="Why — kept beside the app’s verdict" onChange={e => setOver({ ...over, why: e.target.value })} />
          <button type="submit" className="btn btn-primary" disabled={!over.why.trim()}>Overrule</button>
          <button type="button" className="btn" onClick={() => setOver(null)}>Leave it</button>
        </form>
      )}
    </div>
  );
}
