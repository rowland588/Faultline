/* HORIZONTAL DEPLOYMENT, DRAWN (FC-155; tools/yokoten) — on a line's page: the fixes proved on this line with the lines
   that have the same machine (offer them in one tap), and the fixes offered to this line (take, prove or decline them).
   The sentences are the module's; nothing is drawn when there is nothing to say. */
import { useState } from 'react';
import { nav } from '../../state/useRoute';
import { Icon } from '../../ui/Icon';
import { useYokoten, useYokotenActs, type FixRow, type OfferRow } from './useYokoten';
import { MONEY_SAYS, NOT_CHECKED, RATE_SAYS, STATE_WORD, fixSays, offerSays, stateOf, tallyOf, tallySays, wordsNeeded } from './yokoten';
import './spread.css';

function Proved({ row }: { row: FixRow }) {
  const acts = useYokotenActs();
  const t = tallyOf(row.cands);
  return (
    <li className="yk-fix" data-fix={row.fix.id}>
      <p className="yk-says">{fixSays(row.fix, row.cands)}</p>
      <p className="yk-more">{tallySays(t)}</p>
      <ul className="yk-lines">
        {row.cands.map(c => (
          <li key={c.line.id} className={'yk-line is-' + c.state} data-offer={c.state}>
            <button type="button" className="yk-name" onClick={() => nav(`/lines/${c.line.id}`)}>{c.line.name}</button>
            <span className="yk-rate">{RATE_SAYS(c.rate)}</span>
            <span className="yk-state">{STATE_WORD[c.state]}</span>
          </li>
        ))}
      </ul>
      {t.notOffered > 0 && <button type="button" className="btn btn-sm yk-offer" onClick={() => void acts.offer(row.fix, row.cands)}>Offer it to {t.notOffered === 1 ? 'the other line' : `the ${t.notOffered} lines`} ›</button>}
    </li>
  );
}

function Received({ row }: { row: OfferRow }) {
  const acts = useYokotenActs();
  const [ask, setAsk] = useState<'prove' | 'decline' | null>(null);
  const [words, setWords] = useState('');
  const st = stateOf(row.snag);
  const done = st === 'proved' || st === 'declined';
  return (
    <li className={'yk-fix is-' + st} data-received={st}>
      <p className="yk-says">{offerSays(row.fixWhat, row.snag)} <span className="yk-from">Proved on {row.sourceLine}.</span></p>
      <p className="yk-more">{row.snag.proposedSolution}</p>
      {!done && !ask && (
        <div className="yk-acts">
          {st === 'offered' && <button type="button" className="btn btn-sm" onClick={() => void acts.take(row.snag.id)}>Take it</button>}
          <button type="button" className="btn btn-sm" onClick={() => setAsk('prove')}>It worked here…</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsk('decline')}>Not for this line…</button>
        </div>
      )}
      {!done && ask && (
        <form className="yk-ask" onSubmit={e => { e.preventDefault(); if (!words.trim()) return; void (ask === 'prove' ? acts.prove(row.snag.id, words) : acts.decline(row.snag.id, words)).then(() => { setAsk(null); setWords(''); }); }}>
          <label className="yk-q">{wordsNeeded(ask)}<input className="input" value={words} onChange={e => setWords(e.target.value)} autoFocus /></label>
          <div className="yk-acts">
            <button type="submit" className="btn btn-primary btn-sm" disabled={!words.trim()}>{ask === 'prove' ? 'Proved here' : 'Decline'}</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setAsk(null); setWords(''); }}>Cancel</button>
          </div>
        </form>
      )}
    </li>
  );
}

/** The line's page: nothing when this line has proved nothing to spread and been offered nothing. */
export function SpreadFixes({ wsId }: { wsId: string }) {
  const read = useYokoten(wsId);
  if (!read) return null;
  /* NOTHING PROVED YET — said, never a hole (docs/LOOK.md §0: no improvement claimed without evidence, no dead end): what proves one, and where */
  if (!read.proved.length && !read.received.length) return (
    <section className="pl-sec pl-spread is-none" aria-label="Fixes spread across the lines">
      <div className="pl-sec-h"><h2>Spread what works</h2></div>
      <p className="sub yk-none">No fix proved on this line yet. A countermeasure done, then the same number counted again — a shift counted, a changeover timed, a capability measured — is what proves one; it then shows here with its before → after, and is offered to every line with the same machine.</p>
    </section>
  );
  return (
    <section className="pl-sec pl-spread" aria-label="Fixes spread across the lines">
      <div className="pl-sec-h"><h2>Spread what works</h2></div>
      {read.proved.length > 0 && (
        <>
          <h3 className="yk-h"><Icon name="check" size="1.1em" />Proved here — to offer to the other lines</h3>
          <ul className="yk-list">{read.proved.map(r => <Proved key={r.fix.id} row={r} />)}</ul>
        </>
      )}
      {read.received.length > 0 && (
        <>
          <h3 className="yk-h"><Icon name="check" size="1.1em" />Offered to this line</h3>
          <ul className="yk-list">{read.received.map(r => <Received key={r.snag.id} row={r} />)}</ul>
        </>
      )}
      <p className="yk-foot">{NOT_CHECKED} {MONEY_SAYS}</p>
    </section>
  );
}
