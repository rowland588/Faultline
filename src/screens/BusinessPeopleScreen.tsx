/* PEOPLE — the business's people, their roles and where each may look (11 November, docs/ORGANISATION.md O2; src/org;
 * supabase/ORGANISATIONS.sql, ORG_PEOPLE.sql).
 *
 * Rowland, 11 November: "Each should be able to interact with Luna according to their role, responsibilities and permissions … A team
 * leader must not automatically have access to everything a managing director can see."
 *
 * The Factory's scope, #/business, Factory › People; reached from Set up's Your business. The page answers: who is here, as what, seeing which part
 * of the business — and, for its administrator only, invite somebody (an email, a role, the sites and areas if not all), change a role
 * or a scope where it sits, remove somebody with Undo. Everybody else reads the list. The invite is the row (synced); on the cloud it
 * also lets the person make an account (ORG_PEOPLE.sql). Calm: the header, the list, one fold saying what each role can do. */
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../ui/parts';
import { Fold } from '../ui/Fold';
import { offerUndo } from '../ui/Undo';
import { useBusiness, inviteToBusiness, changeMember, removeFromBusiness } from '../org/orgStore';
import { ORG_ROLES, peopleSays, roleName, scopeSays, normEmail, type OrgMember, type OrgRole } from '../org/organisation';
import { listWorkspaces, onDataChange } from '../db';
import { placeWordsOffered } from '../lib/lines';
import type { Workspace } from '../types';

function useLines(): Workspace[] {
  const [lines, setLines] = useState<Workspace[]>([]);
  useEffect(() => {
    const load = () => { void listWorkspaces().then(setLines); };
    load();
    return onDataChange(load);
  }, []);
  return lines;
}

/** Sites and areas as chips — none picked is the whole business. */
function ScopePick({ sites, areas, pickedSites, pickedAreas, onChange, label }: {
  sites: string[]; areas: string[]; pickedSites: string[]; pickedAreas: string[]; label: string;
  onChange: (next: { sites: string[]; areas: string[] }) => void;
}) {
  const flip = (xs: string[], x: string) => (xs.includes(x) ? xs.filter(y => y !== x) : [...xs, x]);
  if (!sites.length && !areas.length) return <p className="sub">No sites or areas named on the lines yet — they will see the whole business.</p>;
  return (
    <div className="ppl-scope" role="group" aria-label={label}>
      {sites.length > 0 && (
        <div className="ppl-chips"><span className="ppl-chips-l">Sites</span>
          {sites.map(s => (
            <button key={s} type="button" className={'chip' + (pickedSites.includes(s) ? ' on' : '')} aria-pressed={pickedSites.includes(s)}
              data-scope-site={s} onClick={() => onChange({ sites: flip(pickedSites, s), areas: pickedAreas })}>{s}</button>
          ))}
        </div>
      )}
      {areas.length > 0 && (
        <div className="ppl-chips"><span className="ppl-chips-l">Areas</span>
          {areas.map(a => (
            <button key={a} type="button" className={'chip' + (pickedAreas.includes(a) ? ' on' : '')} aria-pressed={pickedAreas.includes(a)}
              data-scope-area={a} onClick={() => onChange({ sites: pickedSites, areas: flip(pickedAreas, a) })}>{a}</button>
          ))}
        </div>
      )}
      <p className="sub ppl-scope-says">{scopeSays({ sites: pickedSites, areas: pickedAreas })}{!pickedSites.length && !pickedAreas.length ? ' — none picked' : ''}</p>
    </div>
  );
}

export function BusinessPeopleScreen() {
  const b = useBusiness({ makeOnSignIn: true });
  const lines = useLines();
  const ours = useMemo(() => (b.org ? lines.filter(w => w.orgId === b.org?.id) : lines), [lines, b.org]);
  const sites = placeWordsOffered(ours, 'siteName');
  const areas = placeWordsOffered(ours, 'areaName');

  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('team');
  const [scope, setScope] = useState<{ sites: string[]; areas: string[] }>({ sites: [], areas: [] });
  const [why, setWhy] = useState('');
  const [said, setSaid] = useState('');
  const [scoping, setScoping] = useState<string | null>(null);

  if (!b.ready) return <div className="wrap ppl"><p className="sub">Opening…</p></div>;
  const name = b.org?.name ?? b.offeredName;
  const may = b.can.people;
  const myEmail = b.me.email ? normEmail(b.me.email) : '';

  const invite = async () => {
    const org = b.org ?? await b.make();
    const r = await inviteToBusiness(org, email, role, scope, b.me);
    if (!r.ok) { setWhy(r.why); return; }
    setWhy(''); setEmail(''); setScope({ sites: [], areas: [] }); setInviting(false);
    setSaid(`${r.member.email} invited as ${roleName(r.member.role).toLowerCase()} — ${scopeSays(r.member).toLowerCase()}. They sign in with this address.`);
  };
  const setRoleOf = async (m: OrgMember, next: OrgRole) => {
    const r = await changeMember(m, { role: next });
    if (!r.ok) { setWhy(r.why); return; }
    setWhy(''); setSaid(`${m.email} is now ${roleName(next).toLowerCase()}`);
  };
  const remove = async (m: OrgMember) => {
    const r = await removeFromBusiness(m);
    if (!r.ok) { setWhy(r.why); return; }
    setWhy(''); setSaid('');
    offerUndo(`${m.email} removed from ${name}`, r.undo);
  };

  return (
    <div className="wrap ppl" data-people>
      <PageHeader
        eyebrow={<span className="pl-eyebrow">YOUR BUSINESS · {name}</span>}
        title="People"
        says={<span className="pl-says" data-people-says>{peopleSays(b.members)}</span>}
        primary={may && !inviting ? { label: 'Invite someone', run: () => { setInviting(true); setSaid(''); } } : undefined}
      />
      {!may && <p className="sub" data-people-readonly>Only the business’s administrator invites people and changes their roles.</p>}

      {inviting && may && (
        <form className="ppl-invite" aria-label="Invite someone" onSubmit={e => { e.preventDefault(); void invite(); }}>
          <h2>Invite someone</h2>
          <input className="text-input" type="text" inputMode="email" autoComplete="email" autoFocus value={email} maxLength={160} placeholder="Their work email"
            aria-label="Their email" onChange={e => setEmail(e.target.value)} />
          <div className="ppl-roles" role="radiogroup" aria-label="Their role">
            {ORG_ROLES.map(r => (
              <button key={r.role} type="button" role="radio" aria-checked={role === r.role} className={'ppl-role' + (role === r.role ? ' on' : '')}
                data-role={r.role} onClick={() => setRole(r.role)}>
                <b>{r.name}</b><span>{r.can}</span>
              </button>
            ))}
          </div>
          <h3 className="ppl-h3">Where they may look</h3>
          <ScopePick sites={sites} areas={areas} pickedSites={scope.sites} pickedAreas={scope.areas} onChange={setScope} label="Where they may look" />
          <div className="ppl-invite-go">
            <button className="btn btn-primary" type="submit" disabled={!email.trim()}>Send the invite</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setInviting(false); setWhy(''); }}>Cancel</button>
          </div>
        </form>
      )}
      {why && <p className="ie-problem" role="status" data-people-why>{why}</p>}
      {said && <p className="fac-saved" role="status" data-people-said>{said}</p>}

      {b.members.length === 0 ? (
        <p className="sub">Nobody invited yet{may ? ' — Invite someone with their email, a role and where they may look.' : '.'}</p>
      ) : (
        <ul className="lt-rows ppl-list" aria-label="The people">
          {b.members.map(m => {
            const me = m.email === myEmail;
            return (
              <li key={m.id} className="lt-li ppl-row" data-person={m.email}>
                <span className="lt-row ppl-who">
                  <b className="lt-what">{m.email}{me ? ' · you' : ''}</b>
                  <span className="lt-says"><span data-person-role>{roleName(m.role)}</span> · <span data-person-scope>{scopeSays(m)}</span></span>
                </span>
                {may && !me && (
                  <span className="ppl-acts">
                    <select className="text-input ppl-role-pick" value={m.role} aria-label={`${m.email}'s role`} data-person-role-pick
                      onChange={e => void setRoleOf(m, e.target.value as OrgRole)}>
                      {ORG_ROLES.map(r => <option key={r.role} value={r.role}>{r.name}</option>)}
                    </select>
                    <button type="button" className="btn btn-ghost btn-sm" data-person-scope-edit onClick={() => setScoping(scoping === m.id ? null : m.id)}
                      aria-expanded={scoping === m.id}>Where</button>
                    <button type="button" className="btn btn-ghost btn-sm" data-person-remove onClick={() => void remove(m)}>Remove</button>
                  </span>
                )}
                {may && scoping === m.id && (
                  <ScopePick sites={sites} areas={areas} pickedSites={m.sites} pickedAreas={m.areas} label={`Where ${m.email} may look`}
                    onChange={next => void changeMember(m, next)} />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Fold id="people-roles" title="What each role can do" start={false} says="Administrator · Leader · Manager · Team · Viewer — and how far each sees">
        <ul className="lt-rows ppl-role-list" aria-label="The roles">
          {ORG_ROLES.map(r => (
            <li key={r.role} className="lt-li"><span className="lt-row"><b className="lt-what">{r.name}</b><span className="lt-says">{r.who} — {r.can}</span></span></li>
          ))}
        </ul>
        <p className="sub">Each person sees the lines in the sites and areas they were given — none given is the whole business — and everything on those lines: problems, studies, programs, papers. A project’s own people list still decides who works in a project.</p>
      </Fold>
    </div>
  );
}
