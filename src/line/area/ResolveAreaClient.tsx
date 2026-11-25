import { useEffect, useState } from 'react';
import { listWorkspaces } from '../../db';
import { listDepartments } from '../../db/departments';
import { areaFromQuery, inArea } from '../../lib/areas';
import { chosenClient } from '../../lib/activeClient';
import { navReplace, type Route } from '../../state/useRoute';

/** Older area addresses only stored site and area. Resolve their customer before opening records or exporting a PDF. */
export function ResolveAreaClient({ route }: { route: Route }) {
  const query = route.query.toString();
  const path = route.name === 'areaReport' ? '/area/report' : '/area';
  const [choices, setChoices] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    const q = new URLSearchParams(query);
    const area = areaFromQuery(q);
    if (!area) return;
    setChoices([]); setFailed(false);
    void Promise.all([listWorkspaces(), listDepartments()]).then(([places, departments]) => {
      if (!current) return;
      const clients = new Map<string, string>();
      const add = (value?: string) => { const name = value?.trim() ?? ''; clients.set(name.toLowerCase(), name); };
      for (const w of places) if (!w.archived && inArea(w, area)) add(w.clientName);
      for (const d of departments) if (inArea({ siteName: d.facts.site, areaName: d.facts.area }, area)) add(d.facts.client);
      const chosen = chosenClient().trim();
      const active = chosen ? clients.get(chosen.toLowerCase()) : undefined;
      if (clients.size > 0 && active === undefined && (chosen || clients.size > 1)) {
        setChoices([...clients.values()].sort());
        return;
      }
      q.set('client', active ?? [...clients.values()][0] ?? chosen);
      navReplace(path + '?' + q.toString());
    }).catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [query, path]);
  return <div className="wrap ar-page">{choices.length ? <>
    <h1>Choose a customer for {route.query.get('area')}</h1>
    {choices.map(client => <button key={client} className="btn" onClick={() => {
      const q = new URLSearchParams(query); q.set('client', client); navReplace(path + '?' + q.toString());
    }}>{client || 'No customer assigned'}</button>)}
  </> : <p role="status">{failed ? 'Could not open this area. Return to Factory and try again.' : 'Opening area…'}</p>}</div>;
}
