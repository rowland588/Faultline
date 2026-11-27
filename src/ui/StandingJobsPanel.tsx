/* Standing jobs — weekly briefing for a customer (G7, docs/LUNA-AGENT.md). */
import { useEffect, useState } from 'react';
import { listStandingJobs, onDataChange, putStandingJob, removeStandingJob } from '../db';
import { supabase } from '../cloud/client';
import { useProfile } from '../cloud/admin';
import { lunaMailStatus, saveMailSchedule } from '../lib/mail/luna';
import { EMAIL } from '../lib/mail/people';
import { useClientScope } from '../lib/activeClient';
import { customerKey } from '../lib/customers';
import { now, uid } from '../lib/ids';
import type { StandingJobRow, StandingJobRunRow } from '../lib/standingJob/types';
import { nextRunAt, saysLondon } from '../lib/standingJob/schedule';
import { runStandingJob } from '../lib/standingJob/run';

const DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function clockOf(j: StandingJobRow) {
  return String(j.hour ?? 7).padStart(2, '0') + ':' + String(j.minute ?? 0).padStart(2, '0');
}
function whatOf(j: StandingJobRow) {
  return j.name || j.scope.email?.subject || (j.scope.email?.message ? 'Scheduled message' : 'Line and problem briefing');
}
function whenOf(j: StandingJobRow) {
  return (j.schedule === 'weekly' ? `Every ${DAY[(j.weekday || 1) - 1]}` : 'Every day') + ' at ' + clockOf(j) + ' London';
}
function whoOf(j: StandingJobRow) {
  return j.scope.email?.to ? j.scope.email.to : 'Shown in Luna — not emailed';
}
function lastOf(j: StandingJobRow, delivery?: string) {
  const status = delivery && delivery !== 'queued' ? delivery : j.lastStatus;
  if (!j.lastRunAt && !j.lastPeriodKey) return 'Not run yet';
  const when = j.lastRunAt ? saysLondon(j.lastRunAt) : (j.lastPeriodKey ?? 'Not run yet');
  return status ? `${when} · ${status}` : when;
}
function nextOf(j: StandingJobRow, t = Date.now()) {
  if (!j.enabled) return 'Paused';
  const next = nextRunAt(j.schedule, j.weekday, j.hour ?? 7, j.minute ?? 0, j.lastPeriodKey, t);
  return next ? saysLondon(next) : 'Not due in the next week';
}

export function StandingJobsPanel({ home = false }: { home?: boolean } = {}) {
  const cs = useClientScope();
  const { profile } = useProfile();
  const [editing, setEditing] = useState('');
  const [address, setAddress] = useState('');
  const [time, setTime] = useState('07:00');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<StandingJobRunRow>();
  const [jobs, setJobs] = useState<StandingJobRow[] | null>(null);
  const [said, setSaid] = useState('');
  const [delivery, setDelivery] = useState<Record<string, string>>({});
  const client = cs.filtering ? cs.client : cs.clients.length === 1 ? cs.clients[0] : '';
  const load = () => void listStandingJobs().then(setJobs);
  useEffect(() => { load(); return onDataChange(load); }, []);
  const archived = new Set(cs.archived.map(c => customerKey(c.name)));
  const mine = (cs.ready ? jobs ?? [] : []).filter(j => {
    if (archived.has(customerKey(j.client))) return false;
    if (client && customerKey(j.client) !== customerKey(client)) return false;
    if (profile?.id && j.ownerId && j.ownerId !== profile.id) return false;
    return true;
  });

  // Delivery receipts belong to the sender. A sync from an offline device must never write one back.
  const mailChangedAt = mine.reduce((at, j) => j.scope.email ? Math.max(at, j.updatedAt) : at, 0);
  useEffect(() => {
    let active = true;
    if (!supabase || !profile?.id || !mailChangedAt) { setDelivery({}); return; }
    void supabase.from('standing_jobs').select('id,last_status').eq('owner_id', profile.id).is('deleted_at', null)
      .not('last_status', 'is', null).then(({ data }) => {
        if (active) setDelivery(Object.fromEntries((data ?? []).map(row => [row.id, row.last_status])));
      });
    return () => { active = false; };
  }, [profile?.id, mailChangedAt]);

  const add = async (schedule: 'weekly' | 'daily') => {
    if (!client) { setSaid('Choose a customer in the top bar first.'); return; }
    if (mine.some(j => j.kind === 'weekly_digest' && j.schedule === schedule)) { setSaid(`This customer already has a ${schedule} briefing.`); return; }
    const t = now();
    await putStandingJob({
      id: uid(), client, kind: 'weekly_digest', schedule, weekday: 1, enabled: true,
      name: 'Line and problem briefing',
      templatePrompt: `Tell me what moved — ${schedule} briefing.`,
      scope: { picture: true, files: true, problems: true, variance: true },
      ...(profile?.id ? { ownerId: profile.id } : {}),
      createdAt: t, updatedAt: t,
    });
    setSaid('Briefing added.');
    load();
  };

  const runNow = async (job: StandingJobRow) => {
    if (busy) return;
    setBusy(true);
    try {
      setPreview(await runStandingJob(job));
      setSaid('');
    } catch { setSaid('Could not open the briefing. Please try again.'); }
    finally { setBusy(false); }
  };

  const save = async (job: StandingJobRow, remove = false) => {
    if (busy) return;
    setBusy(true);
    try {
      if (job.scope.email || mine.find(j => j.id === job.id)?.scope.email) {
        await saveMailSchedule(job, profile?.id ?? '', remove);
      } else if (remove) await removeStandingJob(job.id);
      else await putStandingJob(job);
      setEditing('');
      setSaid(remove ? 'Schedule removed.' : 'Schedule saved.');
      load();
    } catch (e) { setSaid((e as Error).message); } finally { setBusy(false); }
  };
  const editEmail = async (job: StandingJobRow) => {
    const to = address.trim();
    if (to && !EMAIL.test(to)) { setSaid('Enter one email address.'); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setSaid('Choose a time.'); return; }
    if (to) {
      try { if (!(await lunaMailStatus(profile?.id)).ready) { setSaid('Finish Resend setup in Supabase to enable email.'); return; } }
      catch (e) { setSaid((e as Error).message); return; }
    }
    const [hour, minute] = time.split(':').map(Number);
    const scope = { ...job.scope };
    if (to) scope.email = { ...scope.email, to };
    else delete scope.email;
    await save({ ...job, scope, hour, minute, updatedAt: now() });
  };

  return (
    <div className="standing-jobs" data-standing-jobs>
      <p className="sub">{home
        ? 'A schedule lives here — not only in the chat that made it. Ask Luna in your own words to send a report on a rhythm. Times are London. Email while the app is shut uses Resend, not Outlook.'
        : 'Read the briefing in Luna. Add an email recipient to send a scheduled update while the app is closed. Times are in London.'}</p>
      {said && <p className="sub" role="status">{said}</p>}
      {mine.length === 0 && <p className="sub ai-list-none">None yet — ask Luna to send a report on a rhythm.</p>}
      <ul className="lt-li">
        {mine.map(j => (
          <li key={j.id} className="standing-job-row" data-schedule-job={j.id}>
            <b data-schedule-what>{whatOf(j)}</b>
            <p className="sub" data-schedule-when>{whenOf(j)} · {j.client}</p>
            <p className="sub" data-schedule-who>For {whoOf(j)}</p>
            <p className="sub" data-schedule-last>Last run {lastOf(j, delivery[j.id])}</p>
            <p className="sub" data-schedule-next>Next run {nextOf(j)}</p>
            {j.scope.conversationId && <p className="sub">Started in a chat</p>}
            {editing === j.id && <form onSubmit={e => { e.preventDefault(); void editEmail(j); }}>
              <label>Email recipient<input type="email" value={address} placeholder="name@company.com" onChange={e => setAddress(e.target.value)} /></label>
              <label>London time<input type="time" required value={time} onChange={e => setTime(e.target.value)} /></label>
              <p className="sub">{j.scope.email?.message || 'Sends this customer’s synced lines and open problems.'} Clear the address to turn email off.</p>
              <button className="btn btn-primary btn-sm" disabled={busy}>Save</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing('')}>Cancel</button>
            </form>}
            <div className="row-inline">
              {profile?.is_super && (!j.ownerId || j.ownerId === profile.id) && editing !== j.id && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddress(j.scope.email?.to ?? ''); setTime(String(j.hour ?? 7).padStart(2, '0') + ':' + String(j.minute ?? 0).padStart(2, '0')); setEditing(j.id); }}>{j.scope.email ? 'Edit email' : 'Add email'}</button>}
              {!j.scope.email?.message && <button type="button" disabled={busy} className="btn btn-ghost btn-sm" aria-expanded={preview?.jobId === j.id} onClick={() => preview?.jobId === j.id ? setPreview(undefined) : void runNow(j)}>{preview?.jobId === j.id ? 'Close briefing' : 'Read briefing'}</button>}
              <button type="button" disabled={busy} className="btn btn-ghost btn-sm" onClick={() => void save({ ...j, enabled: !j.enabled, updatedAt: now() })}>{j.enabled ? 'Pause' : 'Resume'}</button>
              <button type="button" disabled={busy} className="btn btn-ghost btn-sm" onClick={() => void save(j, true)}>Remove</button>
            </div>
            {preview?.jobId === j.id && <article aria-label="Briefing preview" data-briefing-preview>
              <h3>{preview.title}</h3>
              {j.scope.email && <p className="sub">In-app briefing. The scheduled email contains synced lines and open problems.</p>}
              {preview.sections.map(section => <section key={section.title}><h4>{section.title}</h4><ul>{section.lines.map((line, i) => <li key={i}>{line}</li>)}</ul></section>)}
            </article>}
          </li>
        ))}
      </ul>
      <div className="row-inline"><button type="button" className="btn btn-primary btn-sm" disabled={!client} onClick={() => void add('weekly')}>Weekly</button><button type="button" className="btn btn-sm" disabled={!client} onClick={() => void add('daily')}>Daily</button></div>
    </div>
  );
}
