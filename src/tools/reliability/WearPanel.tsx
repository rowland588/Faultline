/* HOW A PART WEARS, ON THE RELIABILITY PAGE (knowledge/specs/FC-060-weibull.md)
 * — the lives of a part (typed, and the study's own gaps), the Weibull fitted
 * with the parts still running counted, the plot, the sentence, the chance a
 * part of a given age fails in the next stretch, and the age to change it at.
 * Every figure and sentence is the module's (weibull.ts, wear.ts), the same
 * one the paper reads. */
import { useState } from 'react';
import { patchStudy } from '../../db';
import { now, uid } from '../../lib/ids';
import { LeanInsights, LeanPanel, LeanTiles } from '../../ui/Lean';
import { niceDay, isoDay } from '../../lib/weeks';
import { conditionalSays, replaceSays, validAge, weibullInsights, weibullPlot, weibullRows, weibullSays, weibullTiles, type WeibullFit } from './weibull';
import type { WearView } from './wear';
import { gbp, num } from './words';
import type { RelCounter } from './reliability';

function WeibullFigure({ w, unit }: { w: WeibullFit; unit: string }) {
  const p = weibullPlot(w);
  if (!p || w.beta === undefined) return null;
  const W = 360, H = 230, L = 38, B = 30, T = 10, R = 10;
  const x = (v: number) => L + ((v - p.xMin) / (p.xMax - p.xMin)) * (W - L - R), y = (v: number) => T + (1 - (v - p.yMin) / (p.yMax - p.yMin)) * (H - T - B);
  /* a line, cut to the plot's top and foot */
  const line = (a: { x: number; y: number }, b: { x: number; y: number }): string => {
    let [x1, y1, x2, y2] = [a.x, a.y, b.x, b.y];
    const at = (yy: number): [number, number] => [x1 + ((yy - y1) / (y2 - y1)) * (x2 - x1), yy];
    if (y1 < p.yMin) [x1, y1] = at(p.yMin);
    if (y1 > p.yMax) [x1, y1] = at(p.yMax);
    if (y2 < p.yMin) [x2, y2] = at(p.yMin);
    if (y2 > p.yMax) [x2, y2] = at(p.yMax);
    return `M${x(x1)},${y(y1)} L${x(x2)},${y(y2)}`;
  };
  return (
    <figure className="rl-fig rl-weibullfig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weibull plot of ${w.failures} failures: ages in ${unit} on a log scale against the share failed`}>
        {p.yTicks.map(t => <g key={`y${t.y}`}><line className="ln-grid-l" x1={L} x2={W - R} y1={y(t.y)} y2={y(t.y)} /><text className="ln-ax" x={L - 5} y={y(t.y) + 3} textAnchor="end">{t.label}</text></g>)}
        {p.xTicks.map(t => <g key={`x${t.x}`}><line className="ln-grid-l" x1={x(t.x)} x2={x(t.x)} y1={T} y2={H - B} /><text className="ln-ax rl-axx" x={x(t.x)} y={H - B + 13}>{t.label}</text></g>)}
        {p.rr && <path className="rl-steady" d={line(p.rr[0], p.rr[1])} />}
        {p.mle && <path className="rl-step" d={line(p.mle[0], p.mle[1])} />}
        {p.points.map((q, i) => <circle key={i} className="rl-dot rl-dot-ink" cx={x(q.x)} cy={y(q.y)} r={3} />)}
        <text className="ln-ax rl-axx" x={(L + W - R) / 2} y={H - 4}>age ({unit}), log scale</text>
      </svg>
      <figcaption className="ln-legend"><span className="ln-key rl-key-pt" aria-hidden /> the failures · <span className="ln-key rl-key-step" aria-hidden /> maximum likelihood · <span className="ln-key rl-key-steady" aria-hidden /> the plot’s own line</figcaption>
    </figure>
  );
}

export function WearPanel({ sid, c, v, line, canEdit }: { sid: string; c: RelCounter; v: WearView; line?: { dayHours?: number }; canEdit: boolean }) {
  const [age, setAge] = useState('');
  const [state, setState] = useState<'failed' | 'running'>('failed');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  const [nowAge, setNowAge] = useState<string | undefined>(undefined);
  const [ahead, setAhead] = useState<string | undefined>(undefined);
  const [showOff, setShowOff] = useState(false);
  const w = v.fit, unit = v.unit;
  const add = () => {
    const a = Number(age.replace(',', '.'));
    if (!validAge(a)) { setProblem(`An age is a number above 0 — ${unit}, cycles or packs, whichever wears the part`); return; }
    setProblem('');
    void patchStudy(sid, cur => ({ facts: { ...cur.facts, lives: [...(cur.facts.lives ?? []), { id: uid(), count: c.id, age: a, failed: state === 'failed', at: now(), ...(note.trim() ? { note: note.trim() } : {}) }] } }));
    setAge(''); setNote('');
  };
  const strike = (id: string, on: boolean) => void patchStudy(sid, cur => ({ facts: { ...cur.facts, lives: (cur.facts.lives ?? []).map(l => (l.id === id ? { ...l, struck: on || undefined } : l)) } }));
  const tiles = weibullTiles(unit, w, v.rep);
  const said = weibullSays(unit, w);
  const ins = weibullInsights(unit, w, v.hasRunning);
  const ageNum = Number((nowAge ?? (v.age !== undefined ? String(v.age) : '')).replace(',', '.')), aheadNum = Number((ahead ?? (v.ahead !== undefined ? String(v.ahead) : '')).replace(',', '.'));
  const cond = w.beta !== undefined ? conditionalSays(unit, w, ageNum, aheadNum) : '';
  const rep = replaceSays(unit, w, v.cp, v.cf, gbp, unit === 'hours' ? line?.dayHours : undefined);
  const rows = weibullRows(unit, w);
  return (
    <LeanPanel title="How the part wears" className="ln-solo rl-wear-p">
      <p className="sub rl-wear-what">One count is one failure mode. Ages are in <b>{unit}</b>{c.wear?.fromWatch ? ' of running — the study’s own gaps between one event and the next, the part replaced at each' : ''}.</p>
      <LeanTiles tiles={tiles} className="ie-strip" />
      <p className={'rl-say2 is-' + said.tone} data-wear>{said.text}</p>
      <LeanInsights insights={ins} />
      <WeibullFigure w={w} unit={unit} />
      {rows.length > 0 && <table className="rl-days rl-wear-t"><tbody>{rows.map(([k, val]) => <tr key={k}><td>{k}</td><td>{val}</td></tr>)}</tbody></table>}
      {w.beta !== undefined && (
        <div className="rl-cond">
          <span className="sub">A part that has run</span>
          <input className="text-input" inputMode="decimal" aria-label={`Age now, ${unit}`} value={nowAge ?? (v.age !== undefined ? String(v.age) : '')} onChange={e => setNowAge(e.target.value)} />
          <span className="sub">{unit} — its chance of failing in the next</span>
          <input className="text-input" inputMode="decimal" aria-label={`The stretch ahead, ${unit}`} value={ahead ?? (v.ahead !== undefined ? String(v.ahead) : '')} onChange={e => setAhead(e.target.value)} />
        </div>
      )}
      {cond && <p className="rl-cond-say" data-cond>{cond}</p>}
      {rep.text && <p className={'rl-say2' + (rep.missing.length ? ' is-n' : ' is-g')} data-replace>{rep.text}</p>}
      <h3 className="rl-sub-h">Lives — {v.typed.length} typed{v.fromWatchN ? `, ${v.fromWatchN} from the watch` : ''}</h3>
      {canEdit && (
        <form className="rl-life-form" onSubmit={e => { e.preventDefault(); add(); }}>
          <label className="field"><span className="field-label">Age, {unit}</span>
            <input className="text-input" inputMode="decimal" value={age} aria-label={`Age of the part, ${unit}`} onChange={e => { setAge(e.target.value); setProblem(''); }} /></label>
          <span className="chip-row" role="group" aria-label="It failed, or is still running">
            <button type="button" className={'chip' + (state === 'failed' ? ' on' : '')} aria-pressed={state === 'failed'} onClick={() => setState('failed')}>Failed</button>
            <button type="button" className={'chip' + (state === 'running' ? ' on' : '')} aria-pressed={state === 'running'} onClick={() => setState('running')}>Still running</button>
          </span>
          <label className="field"><span className="field-label">A note</span>
            <input className="text-input" value={note} maxLength={80} aria-label="A note on the part" onChange={e => setNote(e.target.value)} /></label>
          <button type="submit" className="btn btn-primary" disabled={!age.trim()}>Add the life</button>
          {problem && <p className="ie-problem" role="alert">{problem}</p>}
        </form>
      )}
      {v.typed.length > 0 && (
        <ol className="ie-rows rl-lives">
          {v.typed.map(l => (
            <li key={l.id} data-life={l.id}><span className="ie-no">{l.at ? niceDay(isoDay(l.at)) : ''}</span><b>{num(l.age)} {unit}</b>
              <span className="sub">{l.failed ? 'failed' : 'still running'}{l.note ? ` · ${l.note}` : ''}</span>
              {canEdit && <button type="button" className="linkish" onClick={() => strike(l.id, true)}>Strike</button>}
            </li>
          ))}
        </ol>
      )}
      {v.struck.length > 0 && canEdit && (
        <div className="ie-all">
          <button type="button" className="linkish" aria-expanded={showOff} onClick={() => setShowOff(o => !o)}>{showOff ? 'Hide' : 'Show'} the {v.struck.length} struck</button>
          {showOff && <ol className="ie-rows">{v.struck.map(l => <li key={l.id} className="is-struck"><b>{num(l.age)} {unit}</b><span className="sub">{l.failed ? 'failed' : 'still running'}</span><button type="button" className="linkish" onClick={() => strike(l.id, false)}>Restore</button></li>)}</ol>}
        </div>
      )}
    </LeanPanel>
  );
}
