/* HOW FRESH THE LOOKING IS, DRAWN (FC-199; tools/gemba/looking) — the line's sentence in the floor's words, the
   level in words beside its colour. On the line's page it is the whole strip (the machines, the rhythm, what the
   looking found, the way to go and see); in a project's Needs you it is a note for the lines that are fading or
   stale only — not an owed item, so no count moves. */
import { nav } from '../../state/useRoute';
import { Icon } from '../../ui/Icon';
import { useLooking, useProjectLooking, type LineLookingRow } from './useLooking';
import { NOT_RECORDED, foundSays, lookingSays, machinesSays, rhythmSays } from './looking';
import './looking.css';

/** One line's strip — the whole of it on the line's own page. */
export function LineLookingStrip({ row, wsId }: { row: LineLookingRow; wsId: string }) {
  const l = row.looking;
  const machines = machinesSays(l), rhythm = rhythmSays(l);
  return (
    <div className={'lk-row is-' + l.level} data-looking={l.level}>
      <p className="lk-says"><Icon name="eye" size="1.15em" /><span>{lookingSays(row.name, l)}</span></p>
      {machines && <p className="lk-more lk-machines">{machines}</p>}
      <p className="lk-more lk-found">{[rhythm, foundSays(l.found)].filter(Boolean).join(' ')}</p>
      <button type="button" className="lk-go" onClick={() => nav(`/w/${wsId}/snags?manage=1`)}>Film the line ›</button>
      <p className="lk-foot">{NOT_RECORDED} Fresh looking does not mean a healthy line.</p>
    </div>
  );
}

/** The line's page: its own strip, under the tiles. */
export function LineLooking({ wsId }: { wsId: string }) {
  const rows = useLooking([wsId]);
  const row = rows?.[0];
  if (!row) return null;
  return (
    <section className="pl-sec pl-looked" aria-label="How fresh the looking is">
      <div className="pl-sec-h"><h2>Eyes on the line</h2></div>
      <div className="lk"><LineLookingStrip row={row} wsId={wsId} /></div>
    </section>
  );
}

/** A project's Needs you: one note for each of its lines not looked at lately — and nothing when all are fresh. */
export function ProjectLookingNote({ projectId }: { projectId: string }) {
  const rows = useProjectLooking(projectId);
  const late = (rows ?? []).filter(r => r.looking.level !== 'fresh');
  if (!late.length) return null;
  return (
    <div className="lk-notes" aria-label="Lines not looked at lately">
      {late.map(r => (
        <button key={r.id} type="button" className={'lk-note is-' + r.looking.level} onClick={() => nav(`/lines/${r.id}`)}>
          <Icon name="eye" size="1.15em" /><span>{lookingSays(r.name, r.looking)}</span>
        </button>
      ))}
    </div>
  );
}
