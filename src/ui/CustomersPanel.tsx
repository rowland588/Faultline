/* CUSTOMERS — added by name, archived and continued (11 November, docs/CONSULTANT-WORKSPACE.md C2a; lib/customers). On the Factory's Set
 * up tab, the calm place for what is set once: a row a customer in use (its lines and site, Archive), ＋ Add a customer (a name, a site if
 * known), and the archived behind one fold, each with Continue. Only someone who may change the factory sees the controls. */
import { useEffect, useState } from 'react';
import { addCustomer, archiveCustomer, continueCustomer } from '../lib/customers';
import { setActiveClient, useClientScope } from '../lib/activeClient';
import { asked } from '../lib/lines';
import { Fold } from './Fold';
import { offerUndo } from './Undo';

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

export function CustomersPanel({ may }: { may: boolean }) {
  const cs = useClientScope();
  /* ＋ A new customer… in the client menu lands here with the form open (?customer=new) */
  const [adding, setAdding] = useState(() => asked('customer') === 'new');
  useEffect(() => {
    const on = () => { if (asked('customer') === 'new') setAdding(true); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [why, setWhy] = useState('');
  const [said, setSaid] = useState('');
  if (!cs.ready) return null;

  const add = async () => {
    const r = await addCustomer(name, site);
    if (!r.ok) { setWhy(r.why); return; }
    setName(''); setSite(''); setWhy(''); setAdding(false);
    setSaid(r.continued ? `${r.name} continued — it is the client you are in.` : `${r.name} added — it is the client you are in. Add its first line or area next.`);
  };
  const archive = async (n: string) => {
    if (!window.confirm(`Archive ${n}?\n\n${n} leaves the client menu and every list — its lines, problems, projects, studies and reports are kept exactly as they are, nothing is deleted. Continue brings it all back.`)) return;
    const r = await archiveCustomer(n);
    if (!r.ok) { setWhy(r.why); return; }
    setSaid('');
    offerUndo(`${n} archived`, r.undo);
  };
  const resume = async (n: string) => {
    const r = await continueCustomer(n);
    if (!r.ok) setWhy(r.why); else setSaid(`${n} continued — back as it was, and the client you are in.`);
  };

  const live = cs.customers;
  return (
    <section className="fac-customers" aria-label="Customers" data-customers>
      <div className="fac-customers-h">
        <h2>Customers</h2>
        {may && !adding && <button type="button" className="cw-link" onClick={() => setAdding(true)} data-customer-add>＋ Add a customer</button>}
      </div>
      <p className="sub">Each business you work for. Everything under a customer — its lines, areas, problems, projects and papers — is its own; the bar at the top says which one you are in.</p>
      {adding && may && (
        <form className="fac-customer-form" onSubmit={e => { e.preventDefault(); void add(); }}>
          <input className="text-input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Its name — such as Branston" aria-label="The customer’s name" maxLength={80} />
          <input className="text-input" value={site} onChange={e => setSite(e.target.value)} placeholder="Its site (optional)" aria-label="The customer’s site" maxLength={80} />
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Add the customer</button>
          <button type="button" className="btn" onClick={() => { setAdding(false); setWhy(''); }}>Cancel</button>
        </form>
      )}
      {why && <p className="ie-problem" role="status">{why}</p>}
      {said && <p className="fac-saved" role="status">{said}</p>}
      {live.length === 0 ? <p className="sub">None named yet — add one, or name the client on a line below.</p> : (
        <ul className="lt-rows" aria-label="Customers in use">
          {live.map(c => (
            <li key={c.name} className="lt-li fac-customer" data-customer={c.name}>
              <button type="button" className="lt-row" onClick={() => setActiveClient(c.name)} aria-label={`${c.name} — make it the client you are in`}>
                <b className="lt-what">{c.name}</b>
                <span className="lt-says">{[c.site, c.lines ? plural(c.lines, 'line') : 'no lines yet', cs.client === c.name ? 'the client you are in' : ''].filter(Boolean).join(' · ')}</span>
              </button>
              {may && <button type="button" className="btn btn-sm" onClick={() => void archive(c.name)} data-customer-archive={c.name}>Archive</button>}
            </li>
          ))}
        </ul>
      )}
      {cs.archived.length > 0 && (
        <Fold id="fac-customers-archived" title="Archived" start={false} says={`${plural(cs.archived.length, 'customer')} put away — everything kept, Continue brings one back`}>
          <ul className="lt-rows" aria-label="Archived customers">
            {cs.archived.map(c => (
              <li key={c.name} className="lt-li fac-customer is-archived" data-customer-archived={c.name}>
                <span className="lt-row">
                  <b className="lt-what">{c.name}</b>
                  <span className="lt-says">{[c.site, c.lines ? plural(c.lines, 'line') : 'no lines', c.archivedAt ? `archived ${new Date(c.archivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''].filter(Boolean).join(' · ')}</span>
                </span>
                {may && <button type="button" className="btn btn-sm" onClick={() => void resume(c.name)} data-customer-continue={c.name}>Continue</button>}
              </li>
            ))}
          </ul>
        </Fold>
      )}
    </section>
  );
}
