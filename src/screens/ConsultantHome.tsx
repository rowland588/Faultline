/* THE CONSULTANT'S HOME (11 November, docs/CONSULTANT-WORKSPACE.md §3, C3 — Rowland: "Faultline needs to work for a consultant who visits
 * multiple businesses, not just somebody permanently working inside one factory").
 *
 * #/ when more than one customer is in use: the home is yours, not a factory's — Good morning and your name; your CUSTOMERS as rows (each its
 * engagement, last visit, open and late in words — a tap makes it the client you are in and opens its Story); WHAT IS OWED across them, late
 * first, the client named on each; your RECENT VISITS; and one primary, START A VISIT. Nothing of one client's factory is drawn here. With
 * one customer (or none) #/ stays the Story as it was. Calm (docs/DESIGN.md): rows and hairlines, the rest one fold away. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllSnags, listAllStudies, listWorkspaces, onDataChange } from '../db';
import type { Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { ToolStudy } from '../lib/study';
import { setActiveClient, useClientScope } from '../lib/activeClient';
import { customerRows, owedAcross, visitDay, visitsOf } from '../lib/visits';
import { useVisits } from '../lib/useVisits';
import { firstName } from '../lib/brand';
import { PageHeader } from '../ui/parts';
import { Fold } from '../ui/Fold';
import { openStartVisit } from '../ui/StartVisit';
import { nav } from '../state/useRoute';
import { StoryScreen } from './StoryScreen';

/** #/ — the consultant's home when more than one customer is in use, else the Story as before. */
export function HomeScreen() {
  const cs = useClientScope();
  if (!cs.ready) return <div className="wrap st"><p className="sub">Reading…</p></div>;
  return cs.customers.length > 1 ? <ConsultantHome /> : <StoryScreen />;
}

const hi = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const dayShort = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function ConsultantHome() {
  const cs = useClientScope();
  const { inHand } = useVisits();
  const [got, setGot] = useState<{ lines: Workspace[]; snags: Snag[]; studies: ToolStudy[] } | null>(null);
  const load = useCallback(async () => { const [lines, snags, studies] = await Promise.all([listWorkspaces(), listAllSnags(), listAllStudies()]); setGot({ lines, snags, studies: studies.filter(s => !s.deletedAt) }); }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const rows = useMemo(() => (got ? customerRows(cs.customers, got) : []), [got, cs.customers]);
  const owed = useMemo(() => (got ? owedAcross(cs.customers, got) : []), [got, cs.customers]);
  const visits = useMemo(() => {
    const live = new Set(cs.customers.map(c => c.name.toLowerCase()));
    return got ? visitsOf(got.studies).filter(v => live.has(v.client.toLowerCase())) : [];
  }, [got, cs.customers]);
  const name = firstName();
  const into = (client: string, to: string) => { setActiveClient(client); nav(to); };
  const late = owed.filter(o => o.late).length;

  return (
    <div className="wrap ch" data-consultant-home>
      <p className="st-intro-hi ch-hi">{hi()}{name ? `, ${name}` : ''}</p>
      <PageHeader eyebrow="YOUR WORK" title="Your customers"
        says={`${rows.length} customers · ${owed.length ? `${owed.length} ${owed.length === 1 ? "thing" : "things"} owed${late ? `, ${late} late` : ''}` : 'nothing owed'} · ${visits.length ? `last visit ${dayShort(visits[0].startedAt)} at ${visits[0].client}` : 'no visit yet'}`}
        primary={{ label: 'Start a visit', run: () => openStartVisit(), className: 'ch-start' }}
        more={[{ label: 'The lines of every customer', run: () => { setActiveClient(''); nav('/room'); } }, { label: 'Customers — add, archive, continue', run: () => nav('/factory') }]} />

      {inHand && (
        <p className="ch-inhand" data-home-inhand>
          <span className="nv-visit-dot" aria-hidden /> <b>Visit in hand</b> — {inHand.client}, since {new Date(inHand.startedAt).toTimeString().slice(0, 5)}{inHand.brief ? ` · ${inHand.brief}` : ''}{' '}
          <button type="button" className="linkish" onClick={() => nav(`/visit/${encodeURIComponent(inHand.id)}`)}>Open the visit ›</button>
        </p>
      )}

      <section aria-label="Your customers" className="ch-sec">
        <ul className="lt-rows" data-home-customers>
          {rows.map(r => (
            <li key={r.name} className="lt-li" data-home-customer={r.name}>
              <button type="button" className="lt-row" onClick={() => into(r.name, '/story')} aria-label={`${r.name} — open its story`}>
                <b className="lt-what">{r.name}</b>
                <span className="lt-says">{[r.site, r.says].filter(Boolean).join(' · ')}</span>
                {r.late > 0 && <span className="ch-late">{r.late} late</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="What is owed" className="ch-sec">
        <h2 className="ln-h">What is owed <span className="act-col-n">{owed.length}</span></h2>
        {owed.length === 0 ? <p className="sub">Nothing owed across your customers — no open problem has a person or a day on it.</p> : (
          <>
            <OwedRows rows={owed.slice(0, 5)} into={into} />
            {owed.length > 5 && <Fold id="ch-owed-more" title="The rest owed" start={false} says={`${owed.length - 5} more, by day`}><OwedRows rows={owed.slice(5)} into={into} /></Fold>}
          </>
        )}
      </section>

      <section aria-label="Recent visits" className="ch-sec">
        <h2 className="ln-h">Recent visits <span className="act-col-n">{visits.length}</span></h2>
        {visits.length === 0 ? <p className="sub">No visit yet — Start a visit when you arrive at a customer.</p> : (
          <ul className="lt-rows" data-home-visits>
            {visits.slice(0, 5).map(v => (
              <li key={v.id} className="lt-li" data-home-visit={v.id}>
                <button type="button" className="lt-row" onClick={() => into(v.client, `/visit/${encodeURIComponent(v.id)}`)}>
                  <b className="lt-what">{v.client} · {visitDay(v)}</b>
                  <span className="lt-says">{[v.site, v.endedAt == null ? 'in hand' : 'ended', v.brief].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function OwedRows({ rows, into }: { rows: ReturnType<typeof owedAcross>; into: (client: string, to: string) => void }) {
  return (
    <ul className="lt-rows" data-home-owed>
      {rows.map(o => (
        <li key={o.id} className={'lt-li' + (o.late ? ' is-late' : '')} data-home-owe={o.client}>
          <button type="button" className="lt-row" onClick={() => into(o.client, `/snags?open=${encodeURIComponent(o.id)}`)}>
            <b className="lt-what">{o.what}</b>
            <span className="lt-says">{o.client} · {o.line}{o.who ? ` · ${o.who}` : ' · nobody yet'}{o.due != null ? ` · ${o.late ? 'was due' : 'due'} ${dayShort(o.due)}` : ''}</span>
            {o.late && <span className="ch-late">late</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
