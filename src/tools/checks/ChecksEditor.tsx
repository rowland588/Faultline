/* THE CHECKS AS AGREED (knowledge/specs/FC-236-check-logs.md §4) — the list a log is judged against: what is
 * checked, where, by whom, how often, what passes, the limits, what to do if it fails. Agreed before it is done:
 * changed by whoever may change what was agreed (can.agree). A check taken off keeps its results; a result is never
 * erased. The standard the definition rests on, and what of it is still TO CONFIRM, are said beside the list. */
import { useState } from 'react';
import { readNumber } from '../../lib/format';
import { uid, now as clock } from '../../lib/ids';
import type { Can } from '../../lib/access';
import type { LogCheck, LogFreq, LogItem, ToolStudy } from '../../lib/study';
import { LeanPanel } from '../../ui/Lean';
import { Sheet } from '../../ui/Sheet';
import { offerUndo } from '../../ui/Undo';
import type { LogDef } from './def';
import { checkProblem, logOf, freqWords, FREQ_UNITS, DEFAULT_SHIFT_HOURS } from './checks';
import { judgedBy } from './RoundParts';
import { setChecks } from './store';
import { starterLog } from './start';

const KIND_WORD = { passfail: 'Pass or fail', value: 'A number against a limit', scored: 'A scored checklist', count: 'A count in a slot' } as const;

/** "Sort | Nothing in the area that is not used here" — one question a line, the heading before the bar (kept from the line above when absent). */
export function parseItems(text: string, was: readonly LogItem[] = []): LogItem[] {
  const out: LogItem[] = [];
  let group = '';
  const counts = new Map<string, number>();
  const gi: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bar = line.indexOf('|');
    const name = (bar >= 0 ? line.slice(bar + 1) : line).trim();
    if (bar >= 0) group = line.slice(0, bar).trim();
    if (!name) continue;
    if (!gi.includes(group)) gi.push(group);
    const n = (counts.get(group) ?? 0) + 1;
    counts.set(group, n);
    const id = `${gi.indexOf(group) + 1}.${n}`;
    out.push({ id: was.find(w => w.id === id)?.id ?? id, name, ...(group ? { group } : {}) });
  }
  return out;
}
export const itemsText = (items: readonly LogItem[] = []): string => {
  let last: string | undefined;
  return items.map(i => { const g = i.group ?? ''; const t = g !== last ? `${g ? `${g} | ` : ''}${i.name}` : i.name; last = g; return t; }).join('\n');
};

export function ChecksPanel({ s, def, can }: { s: ToolStudy; def: LogDef; can: Can }) {
  const log = logOf(s);
  const [editing, setEditing] = useState<LogCheck | 'new' | null>(null);
  const live = log.checks.filter(c => !c.removed), off = log.checks.filter(c => c.removed);
  const takeOff = async (c: LogCheck) => {
    if (!window.confirm(`Take “${c.name}” off the list?\n\nIts results stay. It is no longer due. Undo puts it back.`)) return;
    await setChecks(s.id, cs => cs.map(x => (x.id === c.id ? { ...x, removed: true } : x)));
    offerUndo(`${c.name} taken off the list`, async () => { await setChecks(s.id, cs => cs.map(x => (x.id === c.id ? { ...x, removed: undefined } : x))); });
  };
  const putBack = (c: LogCheck) => void setChecks(s.id, cs => cs.map(x => (x.id === c.id ? { ...x, removed: undefined, addedAt: clock() } : x)));
  const addStarters = () => {
    const have = new Set(log.checks.map(c => c.name.trim().toLowerCase()));
    const more = starterLog(def, { since: log.since, where: s.machine ?? undefined }).checks.filter(c => !have.has(c.name.trim().toLowerCase())).map(c => ({ ...c, addedAt: clock() }));
    if (more.length) void setChecks(s.id, cs => [...cs, ...more]);
  };
  return (
    <div className="lg-checks" data-tab="checks">
      <LeanPanel title="The checks as agreed" className="lg-panel" aside={can.agree ? <span className="lg-aside"> <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>Add a check</button></span> : undefined}>
        {!can.agree && <p className="sub">What is checked and how it is judged is agreed by the project’s owner; you can read it here.</p>}
        {live.length === 0 && <p className="sub" data-none-checks>Nothing is on the list to check yet.{can.agree ? ' Add a check, or start from the starter list.' : ''}</p>}
        <ul className="lg-list" aria-label="The checks">
          {live.map(c => (
            <li key={c.id} className="lg-li" data-check-def={c.id}>
              <div>
                <b>{c.name}</b>
                <p className="sub">{[c.where, c.who ? `by ${c.who}` : '', freqWords(c.when), KIND_WORD[c.kind]].filter(Boolean).join(' · ')}</p>
                <p className="sub">{judgedBy(c)}</p>
                {c.reaction?.trim() && <p className="sub">If it fails: {c.reaction.trim()}</p>}
              </div>
              {can.agree && <div className="lg-li-act"><button type="button" className="linkish" aria-label={`Edit — ${c.name}`} onClick={() => setEditing(c)}>Edit</button><button type="button" className="linkish is-danger" aria-label={`Take off — ${c.name}`} onClick={() => void takeOff(c)}>Take off</button></div>}
            </li>
          ))}
        </ul>
        {off.length > 0 && (
          <details className="lg-off"><summary>{off.length} taken off the list</summary>
            <ul className="lg-list">{off.map(c => <li key={c.id} className="lg-li"><span className="sub">{c.name}</span>{can.agree && <button type="button" className="linkish" onClick={() => putBack(c)}>Put back</button>}</li>)}</ul>
          </details>
        )}
        {can.agree && live.length > 0 && def.starterChecks.some(c => !log.checks.some(x => x.name.trim().toLowerCase() === c.name.trim().toLowerCase())) && (
          <p className="sub"><button type="button" className="linkish" onClick={addStarters}>Add the rest of the starter list</button></p>
        )}
        <p className="sub lg-rule">Hours in a shift, for a check “every shift”: {log.shiftHours ?? DEFAULT_SHIFT_HOURS}.</p>
      </LeanPanel>
      <LeanPanel title="What this list rests on" className="lg-panel">
        <p data-standard>{def.standard.rests}</p>
        <p className="lg-confirm-h"><b>To confirm</b></p>
        <ul className="lg-confirm" aria-label="To confirm">{def.standard.confirm.map(x => <li key={x}>{x}</li>)}</ul>
        <p className="lg-confirm-h"><b>What this log does not do</b></p>
        <ul className="lg-confirm" aria-label="Limits">{def.limits.map(x => <li key={x}>{x}</li>)}</ul>
      </LeanPanel>
      {editing && <CheckForm s={s} def={def} was={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CheckForm({ s, def, was, onClose }: { s: ToolStudy; def: LogDef; was?: LogCheck; onClose: () => void }) {
  const [name, setName] = useState(was?.name ?? '');
  const [where, setWhere] = useState(was?.where ?? s.machine ?? '');
  const [who, setWho] = useState(was?.who ?? '');
  const f0: LogFreq = was?.when ?? { every: 1, unit: 'hour' };
  const [fk, setFk] = useState<'every' | 'startup' | 'changeover' | 'trigger'>('every' in f0 ? 'every' : f0.when);
  const [every, setEvery] = useState('every' in f0 ? String(f0.every) : '1');
  const [unit, setUnit] = useState<'min' | 'hour' | 'shift' | 'day' | 'week'>('every' in f0 ? f0.unit : 'hour');
  const [note, setNote] = useState('when' in f0 ? f0.note ?? '' : '');
  const [kind, setKind] = useState(was?.kind ?? def.kinds[0]);
  const [criterion, setCriterion] = useState(was?.criterion ?? '');
  const [lo, setLo] = useState(was?.lo?.toString() ?? '');
  const [hi, setHi] = useState(was?.hi?.toString() ?? '');
  const [unitW, setUnitW] = useState(was?.unit ?? '');
  const [items, setItems] = useState(itemsText(was?.items));
  const [passPct, setPassPct] = useState(was?.passPct?.toString() ?? '');
  const [target, setTarget] = useState(was?.target?.toString() ?? '');
  const [stdHours, setStdHours] = useState(was?.stdHours?.toString() ?? '');
  const [reaction, setReaction] = useState(was?.reaction ?? '');
  const [priority, setPriority] = useState(was?.priority ?? def.priority);
  const [holds, setHolds] = useState(was?.holds ?? def.holds);
  const num = (t: string) => readNumber(t);
  const when: LogFreq = fk === 'every' ? { every: num(every) ?? 0, unit } : fk === 'trigger' ? { when: 'trigger', ...(note.trim() ? { note: note.trim() } : {}) } : { when: fk };
  const bad = [lo, hi, passPct, target].some(t => t.trim() !== '' && num(t) === undefined);
  const draft: LogCheck = {
    id: was?.id ?? uid(), name: name.trim(), ...(where.trim() ? { where: where.trim() } : {}), ...(who.trim() ? { who: who.trim() } : {}), when, kind,
    ...(kind === 'passfail' && criterion.trim() ? { criterion: criterion.trim() } : {}),
    ...(kind === 'value' ? { ...(num(lo) !== undefined ? { lo: num(lo) } : {}), ...(num(hi) !== undefined ? { hi: num(hi) } : {}), ...(unitW.trim() ? { unit: unitW.trim() } : {}) } : {}),
    ...(kind === 'scored' ? { items: parseItems(items, was?.items), ...(num(passPct) !== undefined ? { passPct: num(passPct) } : {}), ...(was?.findingBelow !== undefined ? { findingBelow: was.findingBelow } : {}) } : {}),
    ...(kind === 'count' && num(target) !== undefined ? { target: num(target) } : {}),
    ...(num(stdHours) !== undefined ? { stdHours: num(stdHours) } : {}),
    ...(reaction.trim() ? { reaction: reaction.trim() } : {}), priority, holds, ...(was?.addedAt ? { addedAt: was.addedAt } : was ? {} : { addedAt: clock() }),
  };
  const problem = bad ? 'Numbers only in the number boxes.' : checkProblem(draft);
  const save = () => {
    if (problem) return;
    void setChecks(s.id, cs => (was ? cs.map(x => (x.id === was.id ? { ...x, ...draft, ...(kind !== 'scored' ? { items: undefined, passPct: undefined } : {}) } : x)) : [...cs, draft]));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={was ? `Edit — ${was.name}` : 'Add a check'}>
      <form className="lg-sheet lg-form" data-sheet="check" onSubmit={e => { e.preventDefault(); save(); }}>
        <label className="field"><span className="field-label">What is checked</span>
          <input className="text-input" value={name} maxLength={120} autoFocus aria-label="What is checked" onChange={e => setName(e.target.value)} /></label>
        <div className="ie-agree-grid">
          <label className="field"><span className="field-label">{def.whereLabel}</span><input className="text-input" value={where} maxLength={80} aria-label={def.whereLabel} onChange={e => setWhere(e.target.value)} /></label>
          <label className="field"><span className="field-label">Who does it <i className="sub">optional</i></span><input className="text-input" value={who} maxLength={60} aria-label="Who does it" onChange={e => setWho(e.target.value)} /></label>
        </div>
        <fieldset className="lg-fs"><legend className="field-label">How often</legend>
          <div className="chip-row" role="radiogroup" aria-label="How often">
            {([['every', 'Every …'], ['startup', 'At start-up'], ['changeover', 'After a changeover'], ['trigger', 'When something happens']] as const).map(([k, w]) => (
              <button key={k} type="button" role="radio" aria-checked={fk === k} className={'chip' + (fk === k ? ' on' : '')} onClick={() => setFk(k)}>{w}</button>
            ))}
          </div>
          {fk === 'every' && (
            <div className="lg-every">
              <input className="text-input lg-every-n" inputMode="decimal" value={every} aria-label="Every how many" onChange={e => setEvery(e.target.value)} />
              <select className="text-input" value={unit} aria-label="Minutes, hours, shifts, days or weeks" onChange={e => setUnit(e.target.value as typeof unit)}>
                {FREQ_UNITS.map(u => <option key={u.unit} value={u.unit}>{num(every) === 1 ? u.one : u.many}</option>)}
              </select>
            </div>
          )}
          {fk === 'trigger' && <input className="text-input" value={note} maxLength={80} aria-label="What triggers it" placeholder="e.g. the run ends" onChange={e => setNote(e.target.value)} />}
        </fieldset>
        {def.kinds.length > 1 && (
          <div className="chip-row" role="radiogroup" aria-label="What kind of check">
            {def.kinds.map(k => <button key={k} type="button" role="radio" aria-checked={kind === k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{KIND_WORD[k]}</button>)}
          </div>
        )}
        {kind === 'passfail' && <label className="field"><span className="field-label">What passes <i className="sub">in words</i></span><input className="text-input" value={criterion} maxLength={160} aria-label="What passes" onChange={e => setCriterion(e.target.value)} /></label>}
        {kind === 'passfail' && def.key === 'planned-maintenance' && (
          <label className="field"><span className="field-label">Standard hours <i className="sub">for backlog</i></span><input className="text-input" inputMode="decimal" value={stdHours} aria-label="Standard hours" onChange={e => setStdHours(e.target.value)} /></label>
        )}
        {kind === 'value' && (
          <div className="ie-agree-grid">
            <label className="field"><span className="field-label">Lowest allowed <i className="sub">optional</i></span><input className="text-input" inputMode="decimal" value={lo} aria-label="Lowest allowed" onChange={e => setLo(e.target.value)} /></label>
            <label className="field"><span className="field-label">Highest allowed <i className="sub">optional</i></span><input className="text-input" inputMode="decimal" value={hi} aria-label="Highest allowed" onChange={e => setHi(e.target.value)} /></label>
            <label className="field"><span className="field-label">Unit</span><input className="text-input" value={unitW} maxLength={16} aria-label="Unit" onChange={e => setUnitW(e.target.value)} /></label>
          </div>
        )}
        {kind === 'scored' && (
          <>
            <label className="field"><span className="field-label">The questions <i className="sub">one a line; a heading, a bar, then the question — “Sort | Nothing here that is not used”</i></span>
              <textarea className="text-input lg-ta" rows={8} value={items} aria-label="The questions" onChange={e => setItems(e.target.value)} /></label>
            <label className="field"><span className="field-label">Score to reach, % <i className="sub">optional — with none, the score is shown and not judged</i></span><input className="text-input" inputMode="decimal" value={passPct} aria-label="Score to reach" onChange={e => setPassPct(e.target.value)} /></label>
          </>
        )}
        {kind === 'count' && <label className="field"><span className="field-label">Target each slot <i className="sub">optional</i></span><input className="text-input" inputMode="decimal" value={target} aria-label="Target each slot" onChange={e => setTarget(e.target.value)} /></label>}
        <label className="field"><span className="field-label">What to do if it fails <i className="sub">optional — the log’s words if empty</i></span><input className="text-input" value={reaction} maxLength={300} aria-label="What to do if it fails" onChange={e => setReaction(e.target.value)} /></label>
        <div className="ie-agree-grid">
          <label className="field"><span className="field-label">Priority of the problem it raises</span>
            <select className="text-input" value={priority} aria-label="Priority" onChange={e => setPriority(e.target.value as typeof priority)}><option value="critical">Critical</option><option value="high">High</option><option value="low">Low</option></select></label>
          {kind !== 'scored' && <label className="lg-hold-l"><input type="checkbox" checked={holds} onChange={e => setHolds(e.target.checked)} /> <span>A failure holds the product made since the last good check</span></label>}
        </div>
        {problem && <p className="ie-problem" role="alert">{problem}</p>}
        <div className="lg-sheet-act">
          <button type="submit" className="btn btn-primary" disabled={!!problem}>{was ? 'Save the check' : 'Add the check'}</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}
