/* CHOOSING WHAT TO VERIFY, one cause's fields (knowledge/specs/FC-148-why-tree.md, part A): how likely, how much of the
 * problem it could explain, ticked to check, the check (what, who, by when) and what it found. The rating is the team's
 * own judgement — said so on the screen — and is never multiplied. Used by the What to check step and by the cause sheet,
 * so the two can never disagree. Pure of the database: the parent saves (and keeps the check's board action). */
import type { Cause } from '../lib/sixm';
import { EXPLAINS_LEVELS, LIKELY_LEVELS } from '../lib/causeCheck';
import './whyTree.css';

export function CauseCheckFields({ c, edit, set, idKey }: { c: Cause; edit: boolean; set: (patch: Partial<Cause>) => void; idKey: string }) {
  const check = c.check ?? {};
  const setCheck = (p: Partial<NonNullable<Cause['check']>>) => set({ check: { ...check, ...p } });
  const showCheck = !!c.tick || !!c.found || c.status !== 'suspected';
  if (!edit) {
    const said = [c.likely && LIKELY_LEVELS.find(x => x.key === c.likely)?.label, c.explains && EXPLAINS_LEVELS.find(x => x.key === c.explains)?.label].filter(Boolean);
    if (!said.length && !c.tick && !c.found && !check.what) return null;
    return (
      <p className="cs-ro-meta">
        {said.length > 0 && <>Rated <b>{said.join(' · ')}</b>. </>}
        {c.tick && <>Ticked to check{check.what ? <>: <b>{check.what}</b></> : ''}{check.who ? ` — ${check.who}` : ''}{check.by ? `, by ${check.by}` : ''}. </>}
        {c.found && <>It found: {c.found}</>}
      </p>
    );
  }
  return (
    <div className="cf">
      <div className="cf-row" role="radiogroup" aria-label="How likely">
        <span className="cf-lab">How likely</span>
        <span className="cs-chips">
          {LIKELY_LEVELS.map(x => (
            <button key={x.key} type="button" role="radio" aria-checked={c.likely === x.key} className={'cs-chip' + (c.likely === x.key ? ' on' : '')}
              onClick={() => set({ likely: c.likely === x.key ? undefined : x.key })}>{x.label}</button>
          ))}
        </span>
      </div>
      <div className="cf-row" role="radiogroup" aria-label="How much of the problem">
        <span className="cf-lab">How much of the problem</span>
        <span className="cs-chips">
          {EXPLAINS_LEVELS.map(x => (
            <button key={x.key} type="button" role="radio" aria-checked={c.explains === x.key} className={'cs-chip' + (c.explains === x.key ? ' on' : '')}
              onClick={() => set({ explains: c.explains === x.key ? undefined : x.key })}>{x.label}</button>
          ))}
        </span>
      </div>
      <p className="cf-judge">Your judgement, not a measurement — it only puts the list in order. The check is what decides.</p>
      <label className="cf-tick">
        <input type="checkbox" checked={!!c.tick} onChange={e => set({ tick: e.target.checked || undefined })} />
        <span><b>Worth checking</b> — find out whether it is real before asking why</span>
      </label>
      {showCheck && (
        <>
          {c.tick && (
            <div className="cf-boxes">
              <label className="cf-box"><span>What would show it</span>
                <input value={check.what ?? ''} aria-label={`What would show it (${idKey})`} placeholder="e.g. pull the splice log for 4 weeks" onChange={e => setCheck({ what: e.target.value })} /></label>
              <label className="cf-box"><span>Who</span>
                <input value={check.who ?? ''} aria-label={`Who checks it (${idKey})`} onChange={e => setCheck({ who: e.target.value })} /></label>
              <label className="cf-box"><span>By when</span>
                <input type="date" value={check.by ?? ''} aria-label={`Check it by (${idKey})`} onChange={e => setCheck({ by: e.target.value || undefined })} /></label>
            </div>
          )}
          <label className="cf-box"><span>What the check found</span>
            <input value={c.found ?? ''} aria-label={`What the check found (${idKey})`} placeholder="e.g. 14 of 19 breaks were at a splice" onChange={e => set({ found: e.target.value || undefined })} /></label>
        </>
      )}
    </div>
  );
}
