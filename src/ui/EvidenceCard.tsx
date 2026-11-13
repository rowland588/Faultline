/* AN EVIDENCE CARD — one tool record on a line's page, already showing its own result (13 November, the line-page brief — Rowland:
 * "each card already showing its tool's own result, the headline figure and the graph the tool produced, so the page reads as evidence.
 * Tapping a card expands it in place, and a button then takes me to the full tool").
 *
 * Shut: the tool, the record's name, its headline figure and two more, its finding, and the tool's own picture small beside them.
 * Open (in place): every figure the tool's page shows, the finding whole, the picture at full size, and Open the full tool ›.
 * It draws what line/glance read from the tool's own functions and the tool's own chart components — it works nothing out. */
import { useState, type ReactNode } from 'react';
import type { LeanTile } from '../lib/lean';
import type { Glance, GlancePic } from '../line/glance/glance';
import { CalcBarsView, CalcPictureView } from '../tools/calc/CalcPicture';
import { CapacityBars } from '../tools/linebalance/CapacityBars';
import { Icon } from './Icon';

function Pic({ pic }: { pic: GlancePic }) {
  if (pic.t === 'bars') return <CalcBarsView bars={pic.bars} />;
  if (pic.t === 'plot') return <CalcPictureView pic={pic.pic} />;
  return <CapacityBars m={pic.model} />;
}
const Tile = ({ t, head }: { t: LeanTile; head?: boolean }) => (
  <div className={'ev-tile' + (head ? ' is-head' : '') + (t.tone ? ` is-${t.tone}` : '')} data-ev-tile={t.k}>
    <span className="ev-tile-k">{t.k}</span>
    <b className="ev-tile-v">{t.v}</b>
    {t.of && <span className="ev-tile-of">{t.of}</span>}
  </div>
);

export function EvidenceCard({ id, tool, name, says, tone, glance, onOpen, openLabel, extra }: {
  id: string; tool: string; name?: string; says?: string; tone?: string; glance: Glance;
  onOpen: () => void; openLabel: string; extra?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const tiles = glance.tiles;
  const said = glance.sentence ?? says;
  const body = `ev-${id.replace(/[^a-z0-9]/gi, '-')}`;
  return (
    <article className={'ev-card is-' + (tone ?? 'n') + (open ? ' is-open' : '') + (glance.pic ? ' has-pic' : '')} data-ev={id} data-ev-open={open ? '1' : '0'}>
      <button type="button" className="ev-head" data-carry={id} aria-expanded={open} aria-controls={body}
        aria-label={`${tool}${name ? ` — ${name}` : ''}${said ? `: ${said}` : ''}. ${open ? 'Shut' : 'Show more'}`} onClick={() => setOpen(o => !o)}>
        <span className="ev-main">
          <span className="ev-tool">{tool}</span>
          {name && <b className="ev-name">{name}</b>}
          {tiles.length > 0 && <span className="ev-tiles">{tiles.slice(0, 3).map((t, i) => <Tile key={t.k} t={t} head={i === 0} />)}</span>}
          {said && <span className={'ev-says ie-tone is-' + (tone ?? 'n')}>{glance.note && <span className="ev-note">{glance.note} — </span>}{said}</span>}
        </span>
        {glance.pic && !open && <span className="ev-pic is-small" aria-hidden><Pic pic={glance.pic} /></span>}
        <span className="ev-chev" aria-hidden><Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} /></span>
      </button>
      {open && (
        <div className="ev-more" id={body}>
          {tiles.length > 3 && <div className="ev-tiles is-all">{tiles.slice(3).map(t => <Tile key={t.k} t={t} />)}</div>}
          {glance.pic && <div className="ev-pic is-full"><Pic pic={glance.pic} /></div>}
          {!tiles.length && !glance.pic && <p className="sub">Its figures and picture are on its own page.</p>}
          {extra}
          <div className="ev-acts"><button type="button" className="btn btn-primary" data-ev-go onClick={onOpen}>{openLabel} ›</button></div>
        </div>
      )}
    </article>
  );
}
