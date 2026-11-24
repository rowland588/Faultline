/* Weekly briefing when a standing job has run — said above Luna's conversation (G7). */
import { useEffect, useState } from 'react';
import { useClientScope } from '../lib/activeClient';
import { useRoute } from '../state/useRoute';
import { onDataChange } from '../db';
import { ackDigest, digestAcked, runDueStandingJobs, type PendingDigest } from '../lib/standingJob/run';

export function StandingDigestNews({ onShow }: { onShow: (text: string) => void }) {
  const cs = useClientScope();
  const client = cs.filtering || cs.clients.length === 1 ? cs.client : '';
  const route = useRoute();
  const here = route.name === 'ai' || route.name === 'home';
  const [pending, setPending] = useState<PendingDigest[]>([]);

  useEffect(() => {
    if (!cs.ready || !here) return;
    const run = async () => {
      const got = await runDueStandingJobs(client);
      const show = got.filter(p => !digestAcked(p.job.id, p.run.periodKey));
      setPending(show);
    };
    void run();
    return onDataChange(() => void run());
  }, [cs.ready, client, here]);

  if (!pending.length) return null;

  return (
    <div className="keep-up-news standing-digest-news" data-standing-digest role="note">
      {pending.map(p => (
        <section key={p.run.id} className="keep-up-card">
          <h3 className="keep-up-h">{p.job.schedule === 'daily' ? 'Daily' : 'Weekly'} briefing · {p.job.client}</h3>
          <p className="sub">{p.run.title}</p>
          <p>{p.run.sections[0]?.lines[0]?.slice(0, 220) ?? 'Ready.'}</p>
          <div className="row-inline">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { onShow(p.run.digest); ackDigest(p.job.id, p.run.periodKey); setPending(x => x.filter(q => q.run.id !== p.run.id)); }}>Show me</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { ackDigest(p.job.id, p.run.periodKey); setPending(x => x.filter(q => q.run.id !== p.run.id)); }}>OK</button>
          </div>
        </section>
      ))}
    </div>
  );
}
