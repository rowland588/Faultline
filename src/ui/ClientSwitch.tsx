/* THE CLIENT YOU ARE IN — named in the top bar, and switched there (11 November, docs/CONSULTANT-WORKSPACE.md C1; lib/activeClient).
 *
 * Rowland: "I need to be able to move between these businesses without losing context or mixing their information." Drawn only when
 * the lines name more than one client — with one or none the bar is as it was. `Branston ▾` opens a small menu: each client, and All
 * clients (the consultant's own view, where every list says whose each row is). A choice changes every page at once, no reload, and is
 * kept on this device — the same choice as the Lines tab's chips. */
import { useId } from 'react';
import { setActiveClient, type ClientScope } from '../lib/activeClient';
import { useMenu } from './parts';
import { Icon } from './Icon';
import { nav } from '../state/useRoute';

export function ClientSwitch({ cs, here = [], onGoTo }: {
  cs: ClientScope;
  /** The clients of the line or project the page is of — another chosen there goes to that client's Lines tab, never left on a page
   *  the bar no longer says. */
  here?: readonly string[];
  /** On a phone this button stands where Go to ▾ stood (no room for both) — its menu offers Go to as well. */
  onGoTo?: () => void;
}) {
  const m = useMenu();
  const id = useId();
  if (!cs.several) return null;
  const pick = (c: string) => { m.setOpen(false); setActiveClient(c); if (c && here.length && !here.includes(c)) nav('/room'); };
  const now = cs.client || 'All clients';
  return (
    <div className="part-menu nv-client" ref={m.box} data-client-switch={cs.client}>
      <button ref={m.button} type="button" className="nv-client-b" aria-haspopup="menu" aria-expanded={m.open} aria-controls={id}
        onClick={() => m.setOpen(o => !o)} aria-label={`The client you are in: ${now} — change it`} title={`The client you are in: ${now}`}>
        <span className="nv-client-l">{now}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {m.open && (
        <div className="part-menu-list nv-client-list" role="menu" id={id} aria-label="Which client">
          {cs.clients.map(c => (
            <button key={c} type="button" role="menuitemradio" aria-checked={cs.client === c} className={'part-menu-i' + (cs.client === c ? ' is-on' : '')} onClick={() => pick(c)}>
              <b>{c}</b><span>Only {c}’s lines, problems, projects and papers</span>
            </button>
          ))}
          <button type="button" role="menuitemradio" aria-checked={!cs.client} className={'part-menu-i' + (!cs.client ? ' is-on' : '')} onClick={() => pick('')}>
            <b>All clients</b><span>Every business at once — each row says whose it is</span>
          </button>
          {onGoTo && (
            <button type="button" role="menuitem" className="part-menu-i nv-client-goto" onClick={() => { m.setOpen(false); onGoTo(); }}>
              <b>Go to a line or project…</b><span>Every line and project of {cs.client || 'every client'}, found by typing</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
