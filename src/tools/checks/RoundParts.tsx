/* THE ROUND — what is due, one big tap each (knowledge/specs/FC-236-check-logs.md §8).
 *
 * A card a check: its name, where, who, when it is due in words and colour, and the way it is answered by its
 * kind — ✓ Pass and ✗ Fail for pass or fail; a number against its limits for a value; Start the audit for a scored
 * checklist; a number for a count. A pass is one tap with Undo. A failure asks one thing — a note, and the packs if
 * they were counted — and says what it holds BEFORE it is recorded; recording it raises the problem on the register.
 * A client is shown the cards and no control that writes (can.edit). */
import { useMemo, useState } from 'react';
import { patchSnag } from '../../db';
import { readNumber, plural } from '../../lib/format';
import { now as clock } from '../../lib/ids';
import type { Can } from '../../lib/access';
import type { LogAnswer, ToolStudy } from '../../lib/study';
import { Sheet } from '../../ui/Sheet';
import { offerUndo } from '../../ui/Undo';
import type { LogDef } from './def';
import { freqWords, logOf, verdictOf, valueTrend, valueSays, when, type CheckState } from './checks';
import { previewFailure, type LogCtx } from './hold';
import { blankAnswers, findingBelowOf, repeatsOf, shareOfMax } from './scoring';
import { scoredSeries } from './figures';
import { addResult, addResults, newResult, raiseFindings, raiseTag, recordFailure, strikeResult, strikeResults } from './store';
import { passAllResults, passAllWords, type PassAllPlan } from './passAll';

export interface RoundProps { s: ToolStudy; def: LogDef; can: Can; me?: string; ctx: LogCtx; now: number }

const TONE_WORD: Record<string, string> = { done: 'Done', soon: 'Due soon', due: 'Due now', overdue: 'Overdue', failed: 'Failed', event: 'When it happens', off: 'Off' };

/** How the check is judged, in a line: what passes, the limits, the score to reach, the target. */
export function judgedBy(c: CheckState['check']): string {
  if (c.kind === 'passfail') return c.criterion?.trim() ? `Passes if: ${c.criterion.trim()}` : 'Pass or fail';
  if (c.kind === 'value') {
    const u = c.unit ? ` ${c.unit}` : '';
    if (c.lo === undefined && c.hi === undefined) return `A reading in ${c.unit || 'its unit'} — no limit set, so it is recorded and not judged`;
    return `Limits: ${c.lo !== undefined ? `at least ${c.lo}${u}` : ''}${c.lo !== undefined && c.hi !== undefined ? ', ' : ''}${c.hi !== undefined ? `at most ${c.hi}${u}` : ''}`;
  }
  if (c.kind === 'scored') return `${(c.items ?? []).length} questions${c.passPct !== undefined ? ` · to reach ${c.passPct}%` : ' · no score to reach agreed'}`;
  return c.target !== undefined ? `A count each slot · target ${c.target}` : 'A count each slot';
}

export function RoundCard({ s, st, p }: { s: ToolStudy; st: CheckState; p: RoundProps }) {
  const { def, can, me, now } = p;
  const c = st.check;
  const [failing, setFailing] = useState<{ value?: number; count?: number } | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [typed, setTyped] = useState('');
  const n = readNumber(typed);
  const bad = typed.trim() !== '' && n === undefined;
  const would = n !== undefined && c.kind !== 'passfail' && c.kind !== 'scored' ? verdictOf(c, newResult(c, me, { outcome: c.kind === 'count' ? 'count' : 'value', ...(c.kind === 'count' ? { count: n } : { value: n }) }), def) : undefined;
  const mayDo = can.edit;

  const pass = async () => {
    const r = newResult(c, me, { outcome: 'pass' });
    await addResult(s.id, r);
    offerUndo(`${c.name} — passed`, async () => { await strikeResult(s.id, r.id, true); });
  };
  const record = async () => {
    if (n === undefined) return;
    if (would === 'bad') { setFailing(c.kind === 'count' ? { count: n } : { value: n }); return; }
    const r = newResult(c, me, c.kind === 'count' ? { outcome: 'count', count: n, slot: when(now).slice(0, 2) + ':00' } : { outcome: 'value', value: n });
    await addResult(s.id, r);
    setTyped('');
    offerUndo(`${c.name} — ${n}${c.unit ? ` ${c.unit}` : ''} recorded`, async () => { await strikeResult(s.id, r.id, true); });
  };

  const trend = c.kind === 'value' ? valueTrend(c, s.facts.results) : undefined;
  const says = trend ? valueSays(c, trend) : undefined;
  return (
    <li className={'lg-card tool-sig-check is-' + st.tone} data-check={c.id} data-state={st.key}>
      <div className="lg-card-h">
        <b className="lg-name">{c.name}</b>
        <span className={'lg-state is-' + st.tone}>{TONE_WORD[st.key]}</span>
      </div>
      <p className="lg-meta sub">{[c.where, c.who, freqWords(c.when)].filter(Boolean).join(' · ')}</p>
      <p className={'lg-words ie-tone is-' + st.tone}>{st.words}</p>
      <p className="lg-judged sub">{judgedBy(c)}</p>
      {says && <p className={'lg-says ie-tone is-' + (trend?.nearing ? 'a' : 'n')}>{says}</p>}
      {st.key === 'failed' && (c.reaction?.trim() || def.reactionWords) && <p className="lg-react"><b>If it fails:</b> {c.reaction?.trim() || def.reactionWords}</p>}
      {mayDo && c.kind === 'passfail' && (
        <div className="lg-act">
          <button type="button" className="btn lg-pass" aria-label={`Pass — ${c.name}`} onClick={() => void pass()}>✓ Pass</button>
          <button type="button" className="btn lg-fail" aria-label={`Fail — ${c.name}`} onClick={() => setFailing({})}>✗ Fail</button>
        </div>
      )}
      {mayDo && (c.kind === 'value' || c.kind === 'count') && (
        <div className="lg-num">
          <label className="lg-num-l"><span className="field-label">{c.kind === 'count' ? 'Counted this slot' : `Reading${c.unit ? ` (${c.unit})` : ''}`}</span>
            <input className="text-input lg-num-i" inputMode="decimal" value={typed} aria-label={`${c.kind === 'count' ? 'Count' : 'Reading'} — ${c.name}`} onChange={e => setTyped(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void record(); }} />
          </label>
          <button type="button" className="btn btn-primary lg-rec" aria-label={`Record — ${c.name}`} disabled={n === undefined} onClick={() => void record()}>Record</button>
          {bad && <p className="lg-bad ie-tone is-r" role="alert">Numbers only.</p>}
          {would === 'bad' && n !== undefined && <p className="lg-bad ie-tone is-r" role="status">{c.kind === 'count' ? `Under the target of ${c.target}` : (c.hi !== undefined && n > c.hi ? `Above the upper limit ${c.hi}` : `Below the lower limit ${c.lo}`)}${c.unit && c.kind === 'value' ? ` ${c.unit}` : ''} — this will be a failure.</p>}
        </div>
      )}
      {mayDo && c.kind === 'scored' && (
        <div className="lg-act"><button type="button" className="btn btn-primary lg-audit" aria-label={`Start the audit — ${c.name}`} onClick={() => setAuditing(true)}>Start the audit</button></div>
      )}
      {mayDo && def.tags && (
        <div className="lg-tagrow"><button type="button" className="btn btn-ghost btn-sm lg-tag" aria-label={`Tag it — ${c.name}`} onClick={() => setTagging(true)}>Tag an abnormality</button></div>
      )}
      {!mayDo && <p className="sub lg-ro">You can read this log; its checks are done by its team.</p>}
      {failing && <FailSheet s={s} st={st} p={p} value={failing.value} count={failing.count} onClose={() => { setFailing(null); setTyped(''); }} />}
      {auditing && <AuditSheet s={s} st={st} p={p} onClose={() => setAuditing(false)} />}
      {tagging && <TagSheet s={s} st={st} me={me} onClose={() => setTagging(false)} />}
    </li>
  );
}

/* ------------------------------------------------------------------ a failure, before it is recorded */

export function FailSheet({ s, st, p, value, count, onClose }: { s: ToolStudy; st: CheckState; p: RoundProps; value?: number; count?: number; onClose: () => void }) {
  const { def, me, ctx } = p;
  const c = st.check;
  const [note, setNote] = useState('');
  const [made, setMade] = useState('');
  const [busy, setBusy] = useState(false);
  const log = logOf(s);
  const typedMade = readNumber(made);
  const madeBad = made.trim() !== '' && (typedMade === undefined || typedMade < 0);
  const at = useMemo(() => clock(), []);
  const pre = previewFailure(c, log, s.facts.results, at, def, ctx, madeBad ? undefined : typedMade);
  const u = c.unit ? ` ${c.unit}` : '';
  const prio = c.priority ?? def.priority;
  const what = value !== undefined ? `${value}${u}` : count !== undefined ? String(count) : undefined;
  const save = async () => {
    if (busy || madeBad) return;
    setBusy(true);
    try {
      const { result, problemId } = await recordFailure(s, c, def, me, { note, ...(typedMade !== undefined && !madeBad ? { made: typedMade } : {}), ...(value !== undefined ? { value } : {}), ...(count !== undefined ? { count } : {}) }, ctx);
      offerUndo(`${c.name} — failed${problemId && !pre.again ? ' · problem raised' : ''}`, async () => {
        await strikeResult(s.id, result.id, true);
        if (problemId && !pre.again) await patchSnag(problemId, { deletedAt: clock() });
      });
      onClose();
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={`${c.name} — failed`}>
      <div className="lg-sheet" data-sheet="fail">
        <p className="lg-fail-what ie-tone is-r"><b>{c.name}</b>{c.where ? ` at ${c.where}` : ''}{what ? ` — ${what}` : ''}{c.kind === 'value' && value !== undefined ? (c.hi !== undefined && value > c.hi ? `, above the upper limit ${c.hi}${u}` : c.lo !== undefined && value < c.lo ? `, below the lower limit ${c.lo}${u}` : '') : ''}</p>
        <p className="lg-hold" data-hold>{pre.hold.words}</p>
        {pre.again && <p className="sub">This is the check done again after a failure, and it failed again: no second problem is raised — a step is added to the first one.</p>}
        <p className="lg-react"><b>What to do:</b> {c.reaction?.trim() || def.reactionWords}</p>
        {s.workspaceId
          ? !pre.again && <p className="sub">A problem is raised on the register: {prio === 'critical' ? 'Critical' : prio === 'high' ? 'High' : 'Low'} priority{c.where ? `, on ${c.where}` : ''}.</p>
          : <p className="sub ie-tone is-a">Put the log on a line to raise problems.</p>}
        <label className="field"><span className="field-label">What happened <i className="sub">optional</i></span>
          <input className="text-input" value={note} maxLength={200} aria-label="What happened" onChange={e => setNote(e.target.value)} placeholder="e.g. reject arm air line" /></label>
        {pre.hold.holds && !pre.again && (
          <label className="field"><span className="field-label">Packs made since the last good check <i className="sub">only if you counted them</i></span>
            <input className="text-input" inputMode="numeric" value={made} aria-label="Packs made since the last good check" onChange={e => setMade(e.target.value)} placeholder={pre.hold.packs !== undefined ? `${pre.hold.packs.toLocaleString('en-GB')} worked out` : 'type the count'} />
            {madeBad && <span className="ie-tone is-r" role="alert">A number, 0 or more.</span>}
          </label>
        )}
        <div className="lg-sheet-act">
          <button type="button" className="btn btn-primary lg-confirm" disabled={busy || madeBad} onClick={() => void save()}>Record the failure</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ an audit, answered on the phone */

export function AuditSheet({ s, st, p, onClose }: { s: ToolStudy; st: CheckState; p: RoundProps; onClose: () => void }) {
  const { def, me } = p;
  const c = st.check;
  /* an audit sheet is opened only for a scored check, whose log has a scale; the empty one is never drawn */
  const scale = def.scale ?? { levels: [], findingBelow: 0 };
  const below = findingBelowOf(c, scale);
  const [answers, setAnswers] = useState<LogAnswer[]>(() => blankAnswers(c));
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'ask' | 'findings'>('ask');
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const series = useMemo(() => scoredSeries(c, s, def), [c, s, def]);
  const before = series?.audits[series.audits.length - 1];
  const set = (id: string, level: number | null) => { setAnswers(a => a.map(x => (x.id === id ? { ...x, level } : x))); setTouched(t => new Set(t).add(id)); };
  const figures = shareOfMax(answers.filter(a => touched.has(a.id)).map(a => ({ id: a.id, ...(a.group ? { group: a.group } : {}), level: a.level })), scale, below);
  const total = answers.length, done = touched.size;
  const unanswered = answers.filter(a => !touched.has(a.id));
  const groups = [...new Set(answers.map(a => a.group ?? ''))];
  const findings = answers.filter(a => a.level !== null && a.level < below);
  const repeats = repeatsOf(answers, before?.result.answers, scale, below);
  const finish = () => {
    if (unanswered.length) return;
    if (findings.length) { setTicked(new Set(findings.map(f => f.id))); setStep('findings'); } else void save(new Set());
  };
  const save = async (raise: Set<string>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = newResult(c, me, { outcome: 'score', answers, ...(note.trim() ? { note: note.trim() } : {}) });
      await addResult(s.id, r);
      const ids = raise.size ? await raiseFindings({ ...s, facts: { ...s.facts, results: [...(s.facts.results ?? []), r] } }, c, def, r.id, [...raise], repeats) : [];
      offerUndo(`${c.name} — ${figures.pct !== undefined ? `${Math.round(figures.pct)}%` : 'saved'}${ids.length ? ` · ${plural(ids.length, 'problem')} raised` : ''}`, async () => {
        await strikeResult(s.id, r.id, true);
        for (const id of ids) await patchSnag(id, { deletedAt: clock() });
      });
      onClose();
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={c.name}>
      <div className="lg-sheet lg-audit-sheet" data-sheet="audit">
        {step === 'ask' ? (
          <>
            <p className="lg-prog" role="status" aria-live="polite" data-progress>{done} of {total} answered{figures.pct !== undefined ? ` · ${Math.round(figures.pct)}% so far` : ''}</p>
            <div className="lg-levels-key sub">{scale.levels.map(l => `${l.v} ${l.word}`).join(' · ')}</div>
            {groups.map(g => (
              <section key={g || 'none'} className="lg-grp">
                {g && <h3 className="lg-grp-h">{g}</h3>}
                {answers.filter(a => (a.group ?? '') === g).map(a => (
                  <div key={a.id} className="lg-q" data-q={a.id}>
                    <p className="lg-q-t">{a.name}</p>
                    <div className="lg-lv" role="group" aria-label={a.name}>
                      {scale.levels.map(l => (
                        <button key={l.v} type="button" className={'lg-lvb' + (touched.has(a.id) && a.level === l.v ? ' on' : '')} aria-pressed={touched.has(a.id) && a.level === l.v}
                          aria-label={`${a.name} — ${l.v}, ${l.word}`} onClick={() => set(a.id, l.v)}>{l.v}</button>
                      ))}
                      <button type="button" className={'lg-lvb lg-na' + (touched.has(a.id) && a.level === null ? ' on' : '')} aria-pressed={touched.has(a.id) && a.level === null}
                        aria-label={`${a.name} — not applicable`} onClick={() => set(a.id, null)}>N/A</button>
                    </div>
                  </div>
                ))}
              </section>
            ))}
            <label className="field"><span className="field-label">A note on the audit <i className="sub">optional</i></span>
              <input className="text-input" value={note} maxLength={200} onChange={e => setNote(e.target.value)} aria-label="A note on the audit" /></label>
            {unanswered.length > 0 && <p className="sub" data-unanswered>Still to answer: {unanswered.slice(0, 3).map(a => a.name).join(' · ')}{unanswered.length > 3 ? ` and ${unanswered.length - 3} more` : ''}.</p>}
            <div className="lg-sheet-act">
              <button type="button" className="btn btn-primary lg-finish" disabled={unanswered.length > 0 || busy} onClick={finish}>Finish</button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p className="lg-prog" data-final>{figures.pct !== undefined ? `${Math.round(figures.pct)}%` : 'Scored'} — {figures.points} of {figures.max}. {plural(findings.length, 'finding')}{repeats.length ? `, ${repeats.length} came back from the audit before` : ''}.</p>
            <p className="sub">Tick the findings to raise as problems on the register; one that came back is raised High.</p>
            <ul className="lg-find">
              {findings.map(a => (
                <li key={a.id}>
                  <label className="lg-find-l"><input type="checkbox" checked={ticked.has(a.id)} aria-label={`Raise — ${a.name}`} onChange={() => setTicked(t => { const n = new Set(t); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })} />
                    <span><b>{a.group ? `${a.group} — ` : ''}{a.name}</b> <i className="sub">scored {a.level} of {Math.max(...scale.levels.map(l => l.v))}</i>{repeats.includes(a.id) && <em className="lg-again"> came back</em>}</span></label>
                </li>
              ))}
            </ul>
            <div className="lg-sheet-act">
              <button type="button" className="btn btn-primary lg-save" disabled={busy} onClick={() => void save(ticked)}>{ticked.size ? `Save the audit and raise ${plural(ticked.size, 'problem')}` : 'Save the audit'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep('ask')}>Back</button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ an abnormality tag */

export function TagSheet({ s, st, me, onClose }: { s: ToolStudy; st: CheckState; me?: string; onClose: () => void }) {
  const c = st.check;
  const [colour, setColour] = useState<'red' | 'white'>('white');
  const [what, setWhat] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!what.trim() || busy) return;
    setBusy(true);
    try {
      const tag = await raiseTag(s, c, colour, what, me);
      if (tag) offerUndo(`${colour === 'red' ? 'Red' : 'White'} tag raised — ${c.name}`, async () => {
        const { strikeTag } = await import('./store');
        await strikeTag(s.id, tag.id, true);
        if (tag.problemId) await patchSnag(tag.problemId, { deletedAt: clock() });
      });
      onClose();
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={`Tag an abnormality — ${c.name}`}>
      <div className="lg-sheet" data-sheet="tag">
        <p className="sub">A tag is a problem on the register against {c.where || s.machine || 'the machine'}. Red: it needs the fitter. White: you fix it.</p>
        <div className="chip-row" role="group" aria-label="Which tag">
          <button type="button" className={'chip' + (colour === 'red' ? ' on' : '')} aria-pressed={colour === 'red'} onClick={() => setColour('red')}>Red — needs the fitter</button>
          <button type="button" className={'chip' + (colour === 'white' ? ' on' : '')} aria-pressed={colour === 'white'} onClick={() => setColour('white')}>White — I fix it</button>
        </div>
        <label className="field"><span className="field-label">What did you see?</span>
          <input className="text-input" value={what} maxLength={200} autoFocus aria-label="What did you see" onChange={e => setWhat(e.target.value)} placeholder="e.g. jaw guard bracket loose" />
          {!what.trim() && <span className="sub">Say what you saw.</span>}</label>
        {!s.workspaceId && <p className="sub ie-tone is-a">Put the log on a line to raise tags.</p>}
        <div className="lg-sheet-act">
          <button type="button" className="btn btn-primary lg-confirm" disabled={!what.trim() || busy || !s.workspaceId} onClick={() => void save()}>Raise the tag</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Sheet>
  );
}


/* ------------------------------------------------------------------ pass all due, said before it is done */

/** The confirmation: how many are passed and which, what is NOT passed by it and why, then one write and one Undo.
 *  Nothing is recorded until "Pass N checks" is pressed. */
export function PassAllSheet({ s, plan, me, onClose }: { s: ToolStudy; plan: PassAllPlan; me?: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const words = passAllWords(plan);
  const go = async () => {
    if (busy || !plan.pass.length) return;
    setBusy(true);
    try {
      const rs = passAllResults(plan, me, clock());
      await addResults(s.id, rs);
      offerUndo(`${plural(rs.length, 'check')} passed`, async () => { await strikeResults(s.id, rs.map(r => r.id), true); });
      onClose();
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title="Pass all due">
      <div className="lg-sheet" data-sheet="pass-all">
        <p className="lg-fail-what"><b>{words.head}</b></p>
        <ul className="lg-confirm" data-pass-list>{plan.pass.map(st => <li key={st.check.id}>{st.check.name}{st.check.where ? <span className="sub"> — {st.check.where}</span> : null}</li>)}</ul>
        {words.asks && <p className="sub ie-tone is-a" data-pass-asks>{words.asks}</p>}
        {words.failed && <p className="sub ie-tone is-r" data-pass-failed>{words.failed}</p>}
        <div className="lg-sheet-act">
          <button type="button" className="btn btn-primary lg-confirm" disabled={busy} onClick={() => void go()}>Pass {plural(plan.pass.length, 'check')}</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Sheet>
  );
}
