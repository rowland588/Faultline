/* YOUR BUSINESS — on the Factory's Set up tab, first (11 November, docs/ORGANISATION.md O1; src/org). The business that subscribes:
 * its name (its administrator types over it; everyone else reads it), who you are in it, and its people one tap away (#/business, O2).
 * Calm: one line of words and one box; the people are a page of their own. */
import { useEffect, useState } from 'react';
import { useBusiness } from '../org/orgStore';
import { renameBusiness } from '../org/orgStore';
import { roleName } from '../org/organisation';
import { nav } from '../state/useRoute';

export function BusinessPanel() {
  const b = useBusiness({ makeOnSignIn: true });
  const name = b.org?.name ?? b.offeredName;
  const [draft, setDraft] = useState(name);
  const [said, setSaid] = useState('');
  useEffect(() => { setDraft(name); }, [name]);
  if (!b.ready) return null;

  const commit = async () => {
    const v = draft.trim();
    if (!v || v === name.trim()) { setDraft(name); return; }
    const org = b.org ?? await b.make(v);
    const r = await renameBusiness(org, v);
    setSaid(r.ok ? `Saved — the business is ${v}` : r.why);
  };
  const people = b.members.length;
  return (
    <section className="fac-business" aria-label="Your business" data-business>
      <div className="fac-business-h">
        <h2>Your business</h2>
        <button type="button" className="cw-link" onClick={() => nav('/business')} data-business-people>
          {people ? `${people} ${people === 1 ? 'person' : 'people'}` : 'People'} ›
        </button>
      </div>
      {b.can.people ? (
        <input className="text-input fac-business-name" value={draft} maxLength={120} aria-label="The business’s name" data-business-name
          onChange={e => setDraft(e.target.value)} onBlur={() => void commit()}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
            if (e.key === 'Escape') setDraft(name);
          }} />
      ) : <p className="fac-business-name is-read" data-business-name>{name}</p>}
      <p className="sub">
        {b.role ? `You are its ${roleName(b.role).toLowerCase()}. ` : ''}
        {b.can.people ? 'Its people see its lines as far as their role and their sites and areas allow.' : 'Its administrator names it and invites its people.'}
      </p>
      {said && <p className="fac-saved" role="status">{said}</p>}
    </section>
  );
}
