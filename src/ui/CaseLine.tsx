/* THE CASE FOR THE CHANGE, UNDER THE BAND (docs/CASE.md) — what the job is
 * for, what it is worth in margin and, once it has started, what it is
 * measured at (lib/businessCase caseSays: the same words the one-page status
 * and the client report print). The owner writes it (can.agree — the
 * database keeps it for the owner, supabase/BUSINESS_CASE.sql); the team and
 * a client read it. Nothing written and not the owner: nothing shown. */
import { useMemo, useState } from 'react';
import { getProject, updateProject } from '../db';
import { useAccess } from '../cloud/access';
import { caseSays, rate, readCase, type BusinessCase, type CaseLineFacts } from '../lib/businessCase';
import { now } from '../lib/ids';
import { niceDay, todayISO } from '../lib/weeks';
import type { Project } from '../types';
import { DateInput } from './DateInput';
import { Sheet } from './Sheet';

const num = (s: string): number | undefined => {
  const t = s.trim().replace(/,/g, '');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const shown = (n?: number) => (n == null ? '' : String(n));

export function CaseLine({ project, lines }: { project: Project; lines?: CaseLineFacts[] }) {
  const can = useAccess(project.id);
  const [open, setOpen] = useState(false);
  const handoverOn = project.expectedAt ?? project.plannedAt;
  const said = useMemo(() => (lines ? caseSays(readCase(project.businessCase, lines, todayISO(), handoverOn)) : undefined), [project.businessCase, lines, handoverOn]);
  if (!lines) return null;
  if (!said && !can.agree) return null;
  return (
    <div className={`bz-line is-${said?.tone ?? 'n'}`} data-case>
      <span className="bz-k">The case</span>
      {said ? (
        <>
          {said.why && <span className="bz-why">{said.why}</span>}
          <span className="bz-worth">{said.worth}</span>
          {said.measured && <span className={`bz-m is-${said.tone}`}>{said.measured}</span>}
        </>
      ) : <span className="bz-worth is-none">What is this job for, in money? Write its case — each line’s rate before and the rate it is for.</span>}
      {can.agree && <button type="button" className="cw-link bz-edit" onClick={() => setOpen(true)}>{said ? 'Change the case' : 'Write the case'} ›</button>}
      {open && <CaseSheet project={project} lines={lines} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** The case, written: the sentence, each line's before and after (offered
 *  from the job, typed over), the days a week, the day it starts paying —
 *  and what it is worth, worked out as it is typed. */
function CaseSheet({ project, lines, onClose }: { project: Project; lines: CaseLineFacts[]; onClose: () => void }) {
  const c = project.businessCase;
  const [why, setWhy] = useState(c?.why ?? '');
  const [from, setFrom] = useState<Record<string, string>>(() => Object.fromEntries(lines.map(l => [l.id, shown(c?.lines?.find(x => x.lineId === l.id)?.from)])));
  const [to, setTo] = useState<Record<string, string>>(() => Object.fromEntries(lines.map(l => [l.id, shown(c?.lines?.find(x => x.lineId === l.id)?.to)])));
  const [days, setDays] = useState(shown(c?.daysAWeek));
  const [starts, setStarts] = useState(c?.startsOn ?? '');
  const [busy, setBusy] = useState(false);
  const handoverOn = project.expectedAt ?? project.plannedAt;
  const draft: BusinessCase = {
    ...(why.trim() ? { why: why.trim() } : {}),
    lines: lines.map(l => ({ lineId: l.id, ...(num(from[l.id] ?? '') != null ? { from: num(from[l.id] ?? '') } : {}), ...(num(to[l.id] ?? '') != null ? { to: num(to[l.id] ?? '') } : {}) }))
      .filter(x => x.from != null || x.to != null),
    ...(num(days) != null && (num(days) as number) > 0 ? { daysAWeek: Math.min(7, num(days) as number) } : {}),
    ...(starts ? { startsOn: starts } : {}),
  };
  const read = readCase(draft, lines, todayISO(), handoverOn);
  const said = caseSays({ ...read, written: true });
  const save = async () => {
    setBusy(true);
    try {
      const p = await getProject(project.id);
      if (!p) return;
      const empty = !draft.why && !draft.lines?.length && draft.daysAWeek == null && !draft.startsOn;
      await updateProject({ ...p, businessCase: empty ? undefined : { ...draft, agreedAt: now() }, updatedAt: now() });
      onClose();
    } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title="The case for the change">
      <div className="bz-sheet">
        <label className="field"><span className="label">What is it for?</span>
          <textarea className="text-area" rows={2} value={why} placeholder="e.g. the 4-pack contract from December" aria-label="What it is for" onChange={e => setWhy(e.target.value)} />
        </label>
        {lines.length ? lines.map(l => {
          const r = read.lines.find(x => x.id === l.id);
          const offerFrom = l.series?.points[0]?.value, offerTo = l.series?.target ?? l.facts.packsPerMin;
          return (
            <fieldset key={l.id} className="bz-row">
              <legend>{l.name} — a minute</legend>
              <label className="field"><span className="label">Before</span>
                <input className="text-input" inputMode="decimal" value={from[l.id] ?? ''} aria-label={`${l.name}: the rate before`}
                  placeholder={offerFrom != null ? `${rate(offerFrom)} — its first reading` : '0 for a new line'}
                  onChange={e => setFrom(x => ({ ...x, [l.id]: e.target.value }))} />
              </label>
              <label className="field"><span className="label">It is for</span>
                <input className="text-input" inputMode="decimal" value={to[l.id] ?? ''} aria-label={`${l.name}: the rate it is for`}
                  placeholder={offerTo != null ? `${rate(offerTo)} — ${l.series?.target != null ? 'its target' : 'its rated speed'}` : 'e.g. 120'}
                  onChange={e => setTo(x => ({ ...x, [l.id]: e.target.value }))} />
              </label>
              <span className="sub bz-row-says">{r?.day != null
                ? `${rate(r.from as number)} → ${rate(r.to as number)} a minute × ${r.minutes} running minutes a day × £${(r.perPack as number).toFixed(2)} a pack`
                : `Still to give: ${r?.missing.map(m => m.replace(' (in the case)', '')).join(', ')}${r?.missing.some(m => !m.includes('(in the case)')) ? ' — the shifts and margin in Your factory' : ''}`}</span>
            </fieldset>
          );
        }) : <p className="sub">The job has no line from Your factory yet — add one, and its case is priced from its shifts and its margin a pack.</p>}
        <label className="field"><span className="label">Days it runs a week</span>
          <input className="text-input bz-days" inputMode="decimal" value={days} placeholder="e.g. 5" aria-label="Days it runs a week" onChange={e => setDays(e.target.value)} />
        </label>
        <label className="field"><span className="label">Starts paying</span>
          <DateInput className="text-input" value={starts} aria-label="Starts paying" onCommit={setStarts} />
          {!starts && handoverOn && <span className="sub">From the handover, {niceDay(handoverOn)}, unless a day is given.</span>}
        </label>
        <p className={`bz-says is-${said?.tone ?? 'n'}`} role="status">{said?.worth}</p>
        <div className="bz-acts">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>Save the case</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Sheet>
  );
}
