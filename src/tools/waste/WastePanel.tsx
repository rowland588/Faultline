/* THE WASTE WALK, DRAWN (FC-005; tools/waste/waste) — on the Problems page under "By waste": what the eight wastes add up to, the biggest first, where
   they are and where each points. And on a problem, the eight chips that say which waste it is. Every sentence is the module's. */
import { entryById } from '../../catalogue';
import { WASTES, WASTE_KINDS, placesSays, pointsSays, type WasteKind, type WasteWalk } from './waste';
import './waste.css';

/** The walk: the sentence, a row for each kind seen (money in its own parts, never one blended figure), where, the last four weeks, where the biggest points. */
export function WastePanel({ walk }: { walk: WasteWalk }) {
  const places = placesSays(walk);
  return (
    <section className="ws" aria-label="The eight wastes seen" data-waste-walk>
      <p className="ws-says">{walk.says}</p>
      {walk.lines.length > 0 && (
        <ul className="ws-rows">
          {walk.lines.map(l => (
            <li key={l.kind} className="ws-row" data-waste={l.kind}>
              <b className="ws-name">{l.name}</b>
              <span className="ws-words">{l.words.slice(l.name.length + 3)}</span>
              {l.open > 0 && <span className="ws-where">{l.machines.slice(0, 3).join(', ')}{l.machines.length > 3 ? ` and ${l.machines.length - 3} more` : ''}</span>}
            </li>
          ))}
        </ul>
      )}
      {places && <p className="ws-more ws-places">{places}</p>}
      {walk.lines.length > 0 && <p className="ws-more ws-found">{walk.foundSays}</p>}
      {walk.next && <p className="ws-more ws-next">{walk.next}</p>}
      {walk.lines.length > 0 && <p className="ws-foot">{walk.caveats.join(' ')} Ranked by what is lost a day; product held is money tied up, not lost, so it follows.</p>}
    </section>
  );
}

/** On a problem: which of the eight it is — or that it is not a waste. The kind picked says what it means and how to size it. */
export function WasteChips({ value, onPick, canEdit = true }: { value?: WasteKind | 'none'; onPick: (v: WasteKind | 'none') => void; canEdit?: boolean }) {
  const info = value && value !== 'none' ? WASTES[value] : undefined;
  return (
    <div className="pe-f pe-wide ws-pick">
      <span className="pe-k">WHICH WASTE IS IT? <i className="cw-f-opt">one of the eight — or not a waste</i></span>
      <div className="chip-row ws-chips" role="group" aria-label="Which waste is it">
        {WASTE_KINDS.map(k => (
          <button key={k} type="button" className={'chip' + (value === k ? ' on' : '')} aria-pressed={value === k} disabled={!canEdit} onClick={() => onPick(k)}>{WASTES[k].name}</button>
        ))}
        <button type="button" className={'chip' + (value === 'none' ? ' on' : '')} aria-pressed={value === 'none'} disabled={!canEdit} onClick={() => onPick('none')}>Not a waste</button>
      </div>
      {info
        ? <p className="ws-means" data-waste-means={info.key}>{info.means} {info.food} Size it in {info.sizedIn} below. Points to {pointsSays(info.key, id => entryById(id)?.status)}.</p>
        : value === 'none'
          ? <p className="ws-means">Said not to be a waste — a hazard, a breakdown. It stays on the register as it was.</p>
          : <p className="ws-means">Not classed yet. Pick the one that fits best; a waste that could be two goes under the one whose tool fits.</p>}
    </div>
  );
}
