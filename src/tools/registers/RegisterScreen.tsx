/* THE REGISTER TOOLS' ONE DOOR (m6-registers) — the router sends /holds, /deploy, /daily and /fault-tree here; each is its own page. */
import type { ReactElement } from 'react';
import type { RegisterKey } from './kinds';
import { HoldScreen } from '../hold/HoldScreen';

export function RegisterScreen({ view, id }: { view: RegisterKey; id?: string }): ReactElement {
  switch (view) {
    case 'holds': return <HoldScreen {...(id ? { id } : {})} />;
    default: return <div className="wrap ie"><p className="sub">This tool is not in this version yet.</p></div>;
  }
}
