/* START A VISIT — the consultant's one primary (11 November, docs/CONSULTANT-WORKSPACE.md C3; lib/visits). Rowland: "I receive a phone
 * call: 'Can you come to our factory tomorrow …' … I need to be able to start working immediately."
 *
 * One short sheet, reached from the home, the client menu in the top bar and the customer's Story page: which customer (one of yours, or ＋ a
 * new one by its name — nothing else asked), its site if you know it, what you were asked to look at (said at the door), Start. It makes the
 * customer the client you are in and the visit the one in hand; the top bar says so. Mounted once in the frame. */
import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { useClientScope } from '../lib/activeClient';
import { startVisit } from '../lib/visits';
import { readBrand } from '../lib/brand';
import { nav } from '../state/useRoute';

type Opener = (client?: string) => void;
let opener: Opener | null = null;
/** Open the Start a visit sheet — on a customer already picked, when given. */
export const openStartVisit: Opener = client => opener?.(client);

export function StartVisitHost() {
  const [open, setOpen] = useState<{ client?: string; n: number } | null>(null);
  useEffect(() => {
    opener = client => setOpen(o => ({ ...(client ? { client } : {}), n: (o?.n ?? 0) + 1 }));
    return () => { opener = null; };
  }, []);
  return open ? <StartVisitSheet key={open.n} client={open.client} onClose={() => setOpen(null)} /> : null;
}

const NEW = '__new__';

function StartVisitSheet({ client, onClose }: { client?: string; onClose: () => void }) {
  const cs = useClientScope();
  const customers = cs.customers;
  const [pick, setPick] = useState<string>(client ?? '');
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [brief, setBrief] = useState('');
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  /* with no customer yet, the new one is the only way */
  useEffect(() => { if (cs.ready && !pick) setPick(customers.length ? (cs.client || customers[0].name) : NEW); }, [cs.ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const c = customers.find(x => x.name === pick); setSite(c?.site ?? ''); }, [pick]); // eslint-disable-line react-hooks/exhaustive-deps
  const who = pick === NEW ? name.trim() : pick;
  const go = async () => {
    if (!who || busy) return;
    setBusy(true);
    const r = await startVisit({ client: who, site, brief, by: readBrand()?.name });
    setBusy(false);
    if (!r.ok) { setWhy(r.why); return; }
    onClose();
    nav(`/visit/${encodeURIComponent(r.visit.id)}`);
  };
  return (
    <Sheet open onClose={onClose} title="Start a visit">
      <form className="vs-start" data-start-visit onSubmit={e => { e.preventDefault(); void go(); }}>
        <p className="sub">A day at a customer. Everything you capture from here — problems, photos, measurements, talks — is theirs and is read onto the visit; no line is needed to start.</p>
        <div className="qs-mach" role="group" aria-label="Which customer">
          <span className="qs-l">WHICH CUSTOMER</span>
          <div className="chip-row">
            {customers.map(c => <button key={c.name} type="button" className={'chip' + (pick === c.name ? ' on' : '')} aria-pressed={pick === c.name} onClick={() => setPick(c.name)}>{c.name}</button>)}
            <button type="button" className={'chip' + (pick === NEW ? ' on' : '')} aria-pressed={pick === NEW} onClick={() => setPick(NEW)} data-visit-new-customer>＋ A new customer</button>
          </div>
        </div>
        {pick === NEW && (
          <label className="cw-f cw-f-wide"><span>ITS NAME</span>
            <input className="text-input" autoFocus value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="e.g. Business B" aria-label="The new customer’s name" /></label>
        )}
        <label className="cw-f cw-f-wide"><span>SITE <i className="cw-f-opt">if you know it</i></span>
          <input className="text-input" value={site} maxLength={80} onChange={e => setSite(e.target.value)} placeholder="e.g. Leeds" aria-label="The site" /></label>
        <label className="cw-f cw-f-wide"><span>WHAT YOU WERE ASKED <i className="cw-f-opt">optional</i></span>
          <textarea className="text-input" rows={2} value={brief} maxLength={600} onChange={e => setBrief(e.target.value)} placeholder="e.g. Look at packing performance — nights are worst" aria-label="What you were asked at the door" /></label>
        {why && <p className="ie-problem" role="status">{why}</p>}
        <div className="ax-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <span className="vs-gap" aria-hidden />
          <button type="submit" className="btn btn-primary" disabled={!who || busy} data-visit-start>Start the visit</button>
        </div>
      </form>
    </Sheet>
  );
}
