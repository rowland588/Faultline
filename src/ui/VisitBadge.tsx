/* THE VISIT IN HAND — said in the top bar beside the client (11 November, docs/CONSULTANT-WORKSPACE.md C3; lib/visits): *Business B · Visit
 * 11 Nov ▾*, its menu opening the visit's page and ending it. The customer's name is said here when the client menu does not say it already
 * (one customer only, or another client chosen since). Drawn only while a visit is in hand on this device. */
import { useId } from 'react';
import { useMenu } from './parts';
import { Icon } from './Icon';
import { nav } from '../state/useRoute';
import { useVisits } from '../lib/useVisits';
import { endVisit, visitDay } from '../lib/visits';
import type { ClientScope } from '../lib/activeClient';
import { customerKey } from '../lib/customers';

export function VisitBadge({ cs }: { cs: ClientScope }) {
  const { inHand: v } = useVisits();
  const m = useMenu();
  const id = useId();
  if (!v) return null;
  const sayClient = !cs.several || customerKey(cs.client) !== customerKey(v.client);
  const label = `${sayClient ? `${v.client} · ` : ''}Visit ${visitDay(v)}`;
  return (
    <div className="part-menu nv-visit" ref={m.box} data-visit-badge={v.id}>
      <button ref={m.button} type="button" className="nv-client-b nv-visit-b" aria-haspopup="menu" aria-expanded={m.open} aria-controls={id}
        onClick={() => m.setOpen(o => !o)} aria-label={`The visit in hand: ${v.client}, ${visitDay(v)} — open or end it`} title={`The visit in hand: ${v.client}, ${visitDay(v)}`}>
        <span className="nv-visit-dot" aria-hidden />
        <span className="nv-visit-l">{label}</span>
        <span className="nv-visit-s" aria-hidden>Visit</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {m.open && (
        <div className="part-menu-list nv-client-list" role="menu" id={id} aria-label="The visit">
          <button type="button" role="menuitem" className="part-menu-i" onClick={() => { m.setOpen(false); nav(`/visit/${encodeURIComponent(v.id)}`); }}>
            <b>Open the visit</b><span>What has been captured at {v.client} today{v.brief ? ` — ${v.brief}` : ''}</span>
          </button>
          <button type="button" role="menuitem" className="part-menu-i" data-visit-end onClick={() => { m.setOpen(false); void endVisit(v).then(() => nav(`/visit/${encodeURIComponent(v.id)}`)); }}>
            <b>End the visit</b><span>See what was found on it and make the visit report</span>
          </button>
        </div>
      )}
    </div>
  );
}
