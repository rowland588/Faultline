/* BETTER WORDING — beside a box somebody types into.
 *
 * Rowland, 6 October: "I want AI to improve my wording for any section that
 * the user will be typing in." One link under the box; the suggestion comes
 * back beside what was typed, and the person uses it or keeps their own.
 * Nothing is changed without that tap (lib/wording, api/wording). */
import { useState } from 'react';
import { betterWording, WordingError, type WordingField } from '../lib/wording';

export function BetterWords({ text, field, names, onUse }: {
  text: string; field: WordingField;
  /** Machine and stage names, kept exactly as spelled. */
  names?: string[];
  onUse: (better: string) => void;
}) {
  const [state, setState] = useState<{ busy?: boolean; offer?: string; by?: string; error?: string }>({});
  const clean = text.trim();
  if (clean.length < 3 && !state.offer) return null;
  const ask = async () => {
    setState({ busy: true });
    try {
      const r = await betterWording(clean, field, names);
      setState(r.text.trim() === clean ? { error: 'It reads well already.' } : { offer: r.text, by: r.by });
    } catch (e) {
      setState({ error: e instanceof WordingError ? e.message : 'That could not be reworded. Try again.' });
    }
  };
  if (state.offer) {
    return (
      <div className="bw-offer" role="status">
        <span className="bw-h">Better wording{state.by ? <span className="sub"> · {state.by === 'claude' ? 'Claude' : 'Gemini'}</span> : null}</span>
        <p className="bw-text">{state.offer}</p>
        <span className="bw-acts">
          <button type="button" className="btn btn-sm btn-primary" onClick={() => { onUse(state.offer as string); setState({}); }}>Use it</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setState({})}>Keep mine</button>
        </span>
      </div>
    );
  }
  return (
    <span className="bw-row">
      <button type="button" className="cw-link bw-ask" disabled={state.busy} onClick={() => void ask()}>
        {state.busy ? 'Rewording…' : '✎ Better wording'}
      </button>
      {state.error && <span className="sub bw-err">{state.error}</span>}
    </span>
  );
}
