/* PROBLEMS — THE REGISTER. Rowland, 12 October: "Every single problem allows
 * me to put in what the problem is. And we also want them to be able to track
 * a journey of improvement with it ... so when people go into the meetings ...
 * they can see the journey: this is what it is, it's low risk, this is what
 * we're going to do, this is when we did it, this was what the result was ...
 * I should be able to write any problem ... and assign the problems to where
 * they're going ... I want a fresh start. Don't erase anything."
 *
 * So every problem is worked WHERE IT SITS: tap it and it opens as its own
 * editor — what it is, its priority (Critical · High · Low, RAG with its word),
 * its state, where it belongs (line, machine, job — assigned, never moved
 * away), whose and by when, its pictures (marked by tapping one), what we are
 * going to do, and its JOURNEY: on a day, what was done and what came of it.
 * The journey is on its report card and on the Problems report, for the
 * meeting. A problem assigned to a job stays here and shows on the job too.
 *
 * A FRESH START puts away every problem on the page — kept, never deleted,
 * listed under "Put away" and brought back with a tap (Snag.archivedAt).
 *
 * The counts are the filters (one thing, one place); a line, a job, a person,
 * a word narrow it. The report prints what the page shows (lib/snagsReportPdf). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { withoutDemo } from '../lib/demo';
import { deleteSnag, listAllSnags, listWorkspaces, listAssets, listSnagAssets, onDataChange, updateSnag, setSnagsStatus } from '../db';
import { useProjects } from '../lib/useProjects';
import { planModel } from '../lib/planModel';
import { uid } from '../lib/ids';
import type { SnagCardRow } from '../lib/buildSnagCards';
import { PRIORITY_RANK, PRIORITY_WORD, type Priority, type SnagRow, type SnagTone, snagsReading } from '../lib/snagsReport';
import { nav } from '../state/useRoute';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { Evidence } from '../ui/EvidenceDoors';
import { Sheet } from '../ui/Sheet';
import { offerUndo } from '../ui/Undo';
import { Icon } from '../ui/Icon';
import { DateInput } from '../ui/DateInput';
import { DraftArea, DraftText } from '../ui/Draft';
import type { MediaRef, Project, Workspace } from '../types';
import { SNAG_STATUS_META, dueFromInput, dueToInput, type Snag, type SnagAsset, type SnagStatus } from './types';
import { pinSnag } from './quick';
import { openQuickSnag } from './QuickSnag';

/** The counts are the filters: everything open, each priority open, the late, the done. */
type Filter = 'open' | Priority | 'late' | 'done';
type Group = 'line' | 'who';

const TONE_CLASS: Record<SnagTone, string> = { g: 'is-g', r: 'is-r', w: 'is-w', a: 'is-a', n: 'is-n' };
/* PRIORITY, RAG (Rowland, 12 October): Critical red, High amber, Low green —
   always with its word beside the colour. */
const PRIO_CLASS: Record<Priority, string> = { critical: 'is-r', high: 'is-a', low: 'is-g' };
const PRIOS: Priority[] = ['critical', 'high', 'low'];
const PrioTag = ({ p }: { p: Priority }) => <span className={'qsl-prio ' + PRIO_CLASS[p]}>{PRIORITY_WORD[p]}</span>;
const photoRef = (key: string, s?: { media?: MediaRef[] }): MediaRef =>
  s?.media?.find(m => m.blobKey === key) ?? { id: key, kind: 'photo', blobKey: key, mime: 'image/jpeg', capturedAt: 0 };
const todayInput = () => dueToInput(new Date().setHours(0, 0, 0, 0));
const dedupe = (xs: string[]) => { const seen = new Set<string>(); return xs.filter(x => { const k = x.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };

export function QuickSnagsScreen() {
  const { projects } = useProjects();
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [frames, setFrames] = useState<Map<string, SnagAsset>>(new Map());
  const [jobMachines, setJobMachines] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [group, setGroup] = useState<Group>('line');
  const [lineF, setLineF] = useState('all');
  const [jobF, setJobF] = useState('all');
  const [whoF, setWhoF] = useState('all');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [setting, setSetting] = useState(false);
  const [showAway, setShowAway] = useState(false);
  const [busy, setBusy] = useState<'' | 'report' | 'cards'>('');
  const [viewing, setViewing] = useState<{ snagId?: string; media: MediaRef } | null>(null);
  const liveJobs = useMemo(() => projects.filter(p => !p.archivedAt), [projects]);
  const jobKey = liveJobs.map(p => p.id).join(',');

  const load = useCallback(async () => {
    const [every, ws] = await Promise.all([listAllSnags(), listWorkspaces()]);
    /* the demo line's made-up problems are never here */
    const all = withoutDemo(every, ws).filter(s => !s.deletedAt);
    setSnags(all.sort((a, b) => b.raisedAt - a.raisedAt)); setLines(withoutDemo(ws.map(w => ({ ...w, workspaceId: w.id })), ws));
    const wsIds = [...new Set(all.filter(s => s.assetId).map(s => s.workspaceId))];
    const fr = new Map<string, SnagAsset>();
    for (const a of (await Promise.all(wsIds.map(id => listSnagAssets(id)))).flat()) fr.set(a.id, a);
    setFrames(fr);
    /* the machines on the jobs — offered when a problem is given its machine */
    const ids = jobKey.split(',').filter(Boolean);
    setJobMachines(dedupe((await Promise.all(ids.map(id => listAssets(id)))).flat().filter(a => !a.deletedAt).map(a => a.name.trim())));
  }, [jobKey]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const lineName = useCallback((id: string) => lines.find(w => w.id === id)?.name ?? 'A line', [lines]);
  const jobName = useCallback((id?: string) => (id ? projects.find(p => p.id === id)?.name : undefined), [projects]);
  const byId = useMemo(() => new Map((snags ?? []).map(s => [s.id, s])), [snags]);
  const here = useMemo(() => (snags ?? []).filter(s => !s.archivedAt), [snags]);
  const away = useMemo(() => (snags ?? []).filter(s => !!s.archivedAt).sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)), [snags]);
  const frameName = (s: Snag) => (s.assetId ? frames.get(s.assetId)?.name : undefined);

  /* Narrowed by line, job, person and words first — the counts then count what is left. */
  const words = search.trim().toLowerCase();
  const narrowed = useMemo(() => here.filter(s =>
    (lineF === 'all' || s.workspaceId === lineF) && (jobF === 'all' || s.projectId === jobF)
    && (whoF === 'all' || (whoF === '' ? !s.owner?.trim() : s.owner?.trim() === whoF))
    && (!words || `${s.problem} ${s.latestUpdate ?? ''} ${s.targetAsset ?? ''} ${s.owner ?? ''} ${s.proposedSolution ?? ''} ${(s.journey ?? []).map(j => `${j.did} ${j.result ?? ''}`).join(' ')}`.toLowerCase().includes(words))), [here, lineF, jobF, whoF, words]);
  const reading = useMemo(() => snagsReading({
    snags: narrowed, lineName, jobName, became: new Map(), register: true,
    assetName: s => (s.assetId ? frames.get(s.assetId)?.name : undefined),
    stillOf: s => (s.assetId ? frames.get(s.assetId)?.stillKey : undefined),
  }), [narrowed, lineName, jobName, frames]);
  const c = reading.counts;

  /* What the chosen count shows. */
  const shownLines = useMemo(() => {
    const keep = (r: SnagRow) => (filter === 'open' ? r.status !== 'closed' : filter === 'late' ? r.late : filter === 'done' ? r.status === 'closed' : r.status !== 'closed' && r.priority === filter);
    return reading.lines.map(g => ({ ...g, rows: g.rows.filter(keep) })).filter(g => g.rows.length);
  }, [filter, reading]);
  const groups = useMemo(() => {
    if (group === 'line') return shownLines.map(g => ({ key: g.id, name: g.name, rows: g.rows }));
    const by = new Map<string, SnagRow[]>();
    for (const r of shownLines.flatMap(g => g.rows)) by.set(r.owner ?? '', [...(by.get(r.owner ?? '') ?? []), r]);
    return [...by.entries()].map(([who, rows]) => ({ key: `who:${who}`, name: who || 'Nobody yet', rows: rows.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || Number(b.late) - Number(a.late) || b.raisedAt - a.raisedAt) }))
      .sort((a, b) => (a.name === 'Nobody yet' ? 1 : 0) - (b.name === 'Nobody yet' ? 1 : 0) || b.rows.filter(x => x.late).length - a.rows.filter(x => x.late).length || a.name.localeCompare(b.name));
  }, [group, shownLines]);
  const shownCount = shownLines.reduce((n, g) => n + g.rows.length, 0);

  const onLines = [...new Set(here.map(s => s.workspaceId))];
  const onJobs = liveJobs.filter(p => here.some(s => s.projectId === p.id));
  const owners = [...new Set(here.map(s => s.owner?.trim()).filter((o): o is string => !!o))].sort();
  const toggle = (ids: string[], on: boolean) => setPicked(p => { const n = new Set(p); for (const id of ids) { if (on) n.add(id); else n.delete(id); } return n; });
  const flip = (id: string) => setOpened(o => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = here.filter(s => picked.has(s.id));

  /* WORKING A PROBLEM WHERE IT SITS — every box saves as it is left. */
  const put = async (id: string, p: Partial<Snag>) => { const s = byId.get(id); if (s) await updateSnag({ ...s, ...p }); };
  const machinesFor = (lineId: string) => dedupe([...(lines.find(w => w.id === lineId)?.assets ?? []), ...jobMachines]);

  /* WHAT IS SHOWN, IN WORDS — the report's title and the cards' note. */
  const FILTER_TITLE: Record<Filter, string> = { open: 'Every problem open', critical: 'Critical problems', high: 'High-priority problems', low: 'Low-priority problems', late: 'Every problem late', done: 'Done' };
  const title = [FILTER_TITLE[filter], lineF !== 'all' ? `on ${lineName(lineF)}` : '', jobF !== 'all' ? `for ${jobName(jobF) ?? 'a job'}` : '',
    whoF !== 'all' ? (whoF ? `— ${whoF}'s` : '— nobody’s yet') : '', search.trim() ? `— “${search.trim()}”` : ''].filter(Boolean).join(' ');
  const report = async () => {
    if (busy) return;
    setBusy('report');
    try {
      const { saveSnagsReport } = await import('../lib/buildSnagsReport');
      await saveSnagsReport({ ...reading, lines: shownLines, jobs: [], moved: [] }, title);
    } catch (e) {
      console.error('problems report failed', e);
      window.alert('Sorry — the report could not be made. Please try again.');
    } finally { setBusy(''); }
  };
  const lineCard = (s: Snag): SnagCardRow => ({ snag: s, asset: s.assetId ? frames.get(s.assetId) : undefined, assetName: frameName(s) ?? s.targetAsset ?? 'No machine named' });
  const cards = async (list: Snag[]) => {
    if (busy || !list.length) return;
    setBusy('cards');
    try {
      const { saveProblemCards } = await import('../lib/buildSnagCards');
      const one = new Set(list.map(s => s.workspaceId)).size === 1 ? lineName(list[0].workspaceId) : 'problems';
      await saveProblemCards(list.map(s => ({ line: lineCard(s) })), one, list.length > 1 ? title : undefined);
    } catch (e) {
      console.error('problem card failed', e);
      window.alert('Sorry — the report card could not be made. Please try again.');
    } finally { setBusy(''); }
  };

  /* A FRESH START — every problem on the page put away, kept, never deleted. */
  const freshStart = () => {
    const list = here;
    if (!list.length) return;
    if (!window.confirm(`Start fresh? All ${list.length} problem${list.length === 1 ? '' : 's'} on this page will be put away — nothing is deleted. They stay under "Put away" at the foot of the page, and any can be brought back.`)) return;
    const at = Date.now();
    void (async () => {
      for (const s of list) await updateSnag({ ...s, archivedAt: at });
      setPicked(new Set()); setOpened(new Set());
      offerUndo(`${list.length} put away — a fresh start`, async () => { for (const s of list) await updateSnag({ ...s, archivedAt: undefined }); });
    })();
  };
  const bringBack = (list: Snag[]) => void (async () => { for (const s of list) await updateSnag({ ...s, archivedAt: undefined }); })();

  const chip = (f: Filter, n: number, word: string, tone?: 'r' | 'a' | 'g') => (
    <button key={f} type="button" className={'chip' + (filter === f ? ' on' : '') + (tone && n ? ` qsl-chip-${tone}` : '')} aria-pressed={filter === f} onClick={() => setFilter(f)}>
      {word} · {n}
    </button>
  );
  const gatedJobs = liveJobs.filter(p => planModel(p) === 'commissioning');

  return (
    <div className="wrap qsl">
      <header className="pace-head qsl-head">
        <div>
          <h1>Problems</h1>
          <p className="qsl-path">Write any problem, give it a priority and say where it belongs. Tap one to work it: what we will do, and its journey — on a day, what we did and what came of it.</p>
          <p className="qsl-says">{snags ? reading.says : 'Opening…'}</p>
        </div>
        <div className="qsl-top">
          <button type="button" className="btn btn-primary" onClick={() => openQuickSnag()}><Icon name="camera" size="1.05em" />Problem</button>
          <button type="button" className="btn" disabled={!!busy || !shownCount} onClick={() => void report()}>
            <Icon name="document" size="1.05em" />{busy === 'report' ? 'Making…' : 'Problems report'}</button>
          {here.length > 0 && <button type="button" className="btn btn-ghost preg-fresh" onClick={freshStart}>Start fresh</button>}
        </div>
      </header>

      {here.length > 0 && <>
        <div className="chip-row qsl-f" role="group" aria-label="Which">
          {chip('open', c.critical + c.high + c.low, 'Open')}
          {chip('critical', c.critical, 'Critical', 'r')}
          {chip('high', c.high, 'High', 'a')}
          {chip('low', c.low, 'Low', 'g')}
          {chip('late', c.late, 'Late', 'r')}
          {chip('done', c.closed, 'Done')}
        </div>
        <div className="qsl-tools">
          {onLines.length > 1 && (
            <select className="text-input qsl-sel" value={lineF} onChange={e => setLineF(e.target.value)} aria-label="Which line">
              <option value="all">Every line</option>
              {onLines.map(id => <option key={id} value={id}>{lineName(id)}</option>)}
            </select>
          )}
          {onJobs.length > 0 && (
            <select className="text-input qsl-sel" value={jobF} onChange={e => setJobF(e.target.value)} aria-label="Which job">
              <option value="all">Every job</option>
              {onJobs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <select className="text-input qsl-sel" value={whoF} onChange={e => setWhoF(e.target.value)} aria-label="Whose">
            <option value="all">Everybody</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
            <option value="">Nobody yet</option>
          </select>
          <input className="text-input qsl-search" type="search" placeholder="Find a word" value={search} onChange={e => setSearch(e.target.value)} aria-label="Find a problem" />
          <span className="cw-seg" role="group" aria-label="Problems by">
            {(['line', 'who'] as Group[]).map(g => (
              <button key={g} type="button" className={'chip' + (group === g ? ' on' : '')} aria-pressed={group === g} onClick={() => setGroup(g)}>{g === 'line' ? 'By line' : 'By who'}</button>
            ))}
          </span>
        </div>
      </>}

      {snags && here.length === 0 && (
        <div className="qsl-empty">
          <p><b>{away.length ? 'A fresh start.' : 'No problems yet.'}</b> Write the first — press <b>Problem</b>, say what is wrong, take a picture if it helps.</p>
          <button type="button" className="btn btn-primary" onClick={() => openQuickSnag()}><Icon name="camera" size="1.05em" />Problem</button>
        </div>
      )}
      {snags && here.length > 0 && !groups.length && <p className="sub">None here — try Open, or every line and job.</p>}

      {groups.map(g => {
        const all = g.rows.every(r => picked.has(r.id));
        const late = g.rows.filter(r => r.late).length;
        return (
          <section key={g.key} className="qsl-g">
            <div className="qsl-gh">
              <label className="qsl-tick">
                <input type="checkbox" checked={all} onChange={e => toggle(g.rows.map(r => r.id), e.target.checked)} aria-label={`Tick every problem in ${g.name}`} />
              </label>
              <h2>{g.name}</h2>
              <span className="sub">{g.rows.length} problem{g.rows.length === 1 ? '' : 's'}{late ? <> · <b className="qsl-late">{late} late</b></> : null}</span>
            </div>
            <ul className="qsl-rows">
              {g.rows.map(r => {
                const s = byId.get(r.id);
                if (!s) return null;
                const last = r.journey[r.journey.length - 1];
                const isOpen = opened.has(r.id);
                return (
                  <li key={r.id} className={'qsl-row qsl-work preg-row' + (picked.has(r.id) ? ' is-picked' : '') + (r.late ? ' is-late' : '') + (isOpen ? ' is-open' : '')}>
                    <label className="qsl-tick">
                      <input type="checkbox" checked={picked.has(r.id)} onChange={e => toggle([r.id], e.target.checked)} aria-label={`Tick: ${r.what}`} />
                    </label>
                    {r.photo && <EvidenceThumb media={photoRef(r.photo, s)} size={52} onClick={() => setViewing({ snagId: s.media?.some(m => m.blobKey === r.photo) ? s.id : undefined, media: photoRef(r.photo as string, s) })} />}
                    <button type="button" className="qsl-open" aria-expanded={isOpen} onClick={() => flip(r.id)}>
                      {!r.photo && <span className="qsl-nopic" aria-hidden><Icon name="camera" size={18} /></span>}
                      <span className="qsl-body">
                        <span className="qsl-what"><PrioTag p={r.priority} />{r.what}</span>
                        <span className="qsl-meta">{[group === 'who' ? r.line : '', r.machine ?? '', r.forJob ? `for ${r.forJob}` : '', r.owner ?? 'nobody yet'].filter(Boolean).join(' · ')}</span>
                        {last
                          ? <span className="qsl-meta preg-last">{r.journey.length} step{r.journey.length === 1 ? '' : 's'} — {last.day}: {last.did}{last.result ? ` → ${last.result}` : ''}</span>
                          : r.plan ? <span className="qsl-meta preg-last">Plan: {r.plan}</span> : null}
                      </span>
                      <span className="preg-right">
                        <span className={'qsl-state ' + TONE_CLASS[r.tone]}>{r.word}</span>
                        {r.due && <span className={'qsl-dueword ' + TONE_CLASS[r.dueTone ?? 'n']}>{r.due}</span>}
                      </span>
                    </button>
                    {isOpen && <ProblemEditor s={s} lines={lines} projects={liveJobs} machines={machinesFor(s.workspaceId)} frame={s.assetId ? frames.get(s.assetId) : undefined}
                      put={p => void put(s.id, p)} onView={m => setViewing({ snagId: s.id, media: m })} busy={busy}
                      onCard={() => void cards([s])} onWalk={() => nav(`/w/${s.workspaceId}/asset/${s.assetId}`)}
                      onDelete={() => { if (window.confirm('Delete this problem? Its photos and everything written about it go with it.')) void deleteSnag(s.id); }} />}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* Problems found on a stage-gate job's own stages stay on that job's page. */}
      {gatedJobs.length > 0 && (
        <p className="sub preg-jobs">Problems found on a job's own stages are on that job's Problems page: {gatedJobs.map((p, i) => (
          <span key={p.id}>{i ? ' · ' : ''}<button type="button" className="linkish" onClick={() => nav(`/project/${p.id}/fixes`)}>{p.name}</button></span>
        ))}</p>
      )}

      {/* PUT AWAY BY A FRESH START — kept, never deleted, brought back with a tap. */}
      {away.length > 0 && (
        <section className="qsl-g preg-away">
          <button type="button" className="linkish" aria-expanded={showAway} onClick={() => setShowAway(v => !v)}>{showAway ? '▾' : '▸'} Put away by a fresh start — {away.length}</button>
          {showAway && <>
            <ul className="qsl-rows">
              {away.map(s => (
                <li key={s.id} className="qsl-row preg-away-row">
                  <span className="qsl-body">
                    <span className="qsl-what"><PrioTag p={s.priority ?? 'low'} />{s.problem?.trim() || 'A picture, no words yet'}</span>
                    <span className="qsl-meta">{lineName(s.workspaceId)}{s.projectId && jobName(s.projectId) ? ` · ${jobName(s.projectId)}` : ''} · put away {new Date(s.archivedAt as number).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => bringBack([s])}>Bring back</button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn" onClick={() => bringBack(away)}>Bring them all back</button>
          </>}
        </section>
      )}

      {chosen.length > 0 && (
        <div className="qsl-bar" role="region" aria-label="Ticked problems">
          <span><b>{chosen.length}</b> ticked</span>
          <select className="text-input qsl-sel qsl-bar-prio" value="" aria-label="Priority of every ticked problem" onChange={e => {
            const v = e.target.value as Priority; if (!v) return;
            const before = chosen.map(x => ({ ...x }));
            void (async () => { for (const x of chosen) await updateSnag({ ...x, priority: v }); offerUndo(`${before.length} made ${PRIORITY_WORD[v].toLowerCase()}`, async () => { for (const x of before) await updateSnag(x); }); })();
          }}>
            <option value="">Priority…</option>
            {PRIOS.map(k => <option key={k} value={k}>{PRIORITY_WORD[k]}</option>)}
          </select>
          {/* ASSIGN — where it belongs; it stays here, and shows on the job too */}
          <select className="text-input qsl-sel qsl-bar-job" value="" aria-label="Assign every ticked problem to a job" onChange={e => {
            const v = e.target.value; if (!v) return;
            const before = chosen.map(x => ({ ...x })), pid = v === '-' ? undefined : v;
            void (async () => { for (const x of chosen) await updateSnag({ ...x, projectId: pid }); offerUndo(`${before.length} ${pid ? `assigned to ${jobName(pid)}` : 'taken off their job'}`, async () => { for (const x of before) await updateSnag(x); }); })();
          }}>
            <option value="">Assign to a job…</option>
            {liveJobs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="-">No job</option>
          </select>
          <button type="button" className="btn" onClick={() => setSetting(true)}>Whose · due</button>
          <button type="button" className="btn" onClick={() => {
            const before = chosen.map(s => ({ ...s }));
            void setSnagsStatus(chosen.map(s => s.id), 'closed').then(() => offerUndo(`${before.length} closed`, async () => { for (const s of before) await updateSnag(s); }));
          }}>Close</button>
          <button type="button" className="btn" disabled={!!busy} onClick={() => void cards(chosen)}>{busy === 'cards' ? 'Making…' : 'Report cards'}</button>
          <button type="button" className="btn qsl-del" onClick={() => {
            const n = chosen.length, them = n === 1 ? 'it' : 'them';
            if (!window.confirm(`Delete ${n} problem${n === 1 ? '' : 's'}? The photos and everything written about ${them} go with ${them}.`)) return;
            void (async () => { for (const x of chosen) await deleteSnag(x.id); setPicked(new Set()); })();
          }}>Delete</button>
          <button type="button" className="btn btn-ghost" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}
      {viewing && <EvidenceViewer media={viewing.media} onClose={() => setViewing(null)}
        {...(viewing.snagId ? { onPins: (pins: NonNullable<MediaRef['pins']>) => void pinSnag(viewing.snagId as string, viewing.media.id, pins) } : {})} />}
      {setting && <SetSheet snags={chosen} onClose={() => setSetting(false)} onDone={() => { setSetting(false); setPicked(new Set()); }} />}
    </div>
  );
}

/** ONE PROBLEM, WORKED WHERE IT SITS — every box saves as it is left. */
function ProblemEditor({ s, lines, projects, machines, frame, put, onView, onCard, onWalk, onDelete, busy }: {
  s: Snag; lines: Workspace[]; projects: Project[]; machines: string[]; frame?: SnagAsset;
  put: (p: Partial<Snag>) => void; onView: (m: MediaRef) => void; onCard: () => void; onWalk: () => void; onDelete: () => void; busy: string;
}) {
  const machine = frame?.name ?? s.targetAsset ?? '';
  const typed = !frame && !!s.targetAsset && !machines.some(m => m.toLowerCase() === s.targetAsset?.trim().toLowerCase());
  const setStatus = (status: SnagStatus) => put({ status, closedAt: status === 'closed' ? (s.closedAt ?? Date.now()) : undefined });
  return (
    <div className="qsl-x pe" role="region" aria-label={`Work on: ${s.problem || 'this problem'}`}>
      <label className="pe-f pe-wide"><span className="pe-k">WHAT IS THE PROBLEM</span>
        <DraftArea value={s.problem ?? ''} rows={2} className="text-input pe-what" ariaLabel="What is the problem" onSave={v => put({ problem: v })} /></label>

      <div className="pe-f"><span className="pe-k">PRIORITY</span>
        <div className="chip-row" role="group" aria-label="Priority">
          {PRIOS.map(k => <button key={k} type="button" className={'chip qs-prio is-' + k + ((s.priority ?? 'low') === k ? ' on' : '')} aria-pressed={(s.priority ?? 'low') === k} onClick={() => put({ priority: k })}>{PRIORITY_WORD[k]}</button>)}
        </div></div>
      <div className="pe-f"><span className="pe-k">WHERE IT STANDS</span>
        <div className="chip-row" role="group" aria-label="Where it stands">
          {(['open', 'in_progress', 'closed'] as SnagStatus[]).map(k => <button key={k} type="button" className={'chip' + (s.status === k ? ' on' : '')} aria-pressed={s.status === k} onClick={() => setStatus(k)}>{SNAG_STATUS_META[k].label}</button>)}
        </div></div>

      <div className="pe-row">
        <label className="pe-f"><span className="pe-k">LINE</span>
          <select className="text-input" value={s.workspaceId} aria-label="Which line" onChange={e => put({ workspaceId: e.target.value })}>
            {lines.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select></label>
        <label className="pe-f"><span className="pe-k">JOB <i className="cw-f-opt">if it is for one</i></span>
          <select className="text-input" value={s.projectId ?? ''} aria-label="Which job" onChange={e => put({ projectId: e.target.value || undefined })}>
            <option value="">No job</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></label>
      </div>
      <div className="pe-f pe-wide"><span className="pe-k">MACHINE</span>
        {frame
          ? <p className="pe-said">{frame.name} — pinned on the walk <button type="button" className="linkish" onClick={onWalk}>See it on the walk ›</button></p>
          : <>
            {machines.length > 0 && <div className="chip-row" role="group" aria-label="Which machine">
              {machines.map(m => <button key={m} type="button" className={'chip' + (machine.trim().toLowerCase() === m.toLowerCase() ? ' on' : '')} aria-pressed={machine.trim().toLowerCase() === m.toLowerCase()}
                onClick={() => put({ targetAsset: machine.trim().toLowerCase() === m.toLowerCase() ? undefined : m })}>{m}</button>)}
            </div>}
            <DraftText value={typed ? s.targetAsset ?? '' : ''} placeholder={machines.length ? 'Another machine…' : 'Which machine?'} className="text-input pe-mach" max={80} ariaLabel="Another machine"
              onSave={v => put({ targetAsset: v.trim() || undefined })} />
          </>}
      </div>
      <div className="pe-row">
        <label className="pe-f"><span className="pe-k">WHOSE</span>
          <DraftText value={s.owner ?? ''} placeholder="Whose is it?" className="text-input" max={60} ariaLabel="Whose is it" onSave={v => put({ owner: v.trim() || undefined })} /></label>
        <label className="pe-f"><span className="pe-k">DUE</span>
          <DateInput className="text-input" value={dueToInput(s.dueAt)} aria-label="Due date" onCommit={v => put({ dueAt: dueFromInput(v) })} /></label>
      </div>

      <div className="pe-f pe-wide"><span className="pe-k">PHOTOS <i className="cw-f-opt">tap one to mark it</i></span>
        <Evidence media={s.media ?? []} kind="found" onView={onView} onAdd={async refs => put({ media: [...(s.media ?? []), ...refs] })} />
      </div>

      <label className="pe-f pe-wide"><span className="pe-k">WHAT WE WILL DO</span>
        <DraftArea value={s.proposedSolution ?? ''} rows={2} placeholder="The plan — what will put it right" className="text-input" ariaLabel="What we will do" onSave={v => put({ proposedSolution: v || undefined })} /></label>

      <Journey s={s} put={put} />

      <div className="qsl-x-acts">
        <button type="button" className="btn" disabled={!!busy} onClick={onCard}><Icon name="document" size="1.05em" />{busy === 'cards' ? 'Making…' : 'Report card (PDF)'}</button>
        <button type="button" className="btn btn-ghost qsl-del" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

/** ITS JOURNEY — on a day, what we did and what came of it; oldest first. */
function Journey({ s, put }: { s: Snag; put: (p: Partial<Snag>) => void }) {
  const steps = [...(s.journey ?? [])].sort((a, b) => a.at - b.at);
  const [day, setDay] = useState(todayInput());
  const [did, setDid] = useState('');
  const [result, setResult] = useState('');
  const add = () => {
    if (!did.trim()) return;
    put({ journey: [...(s.journey ?? []), { id: uid(), at: dueFromInput(day) ?? Date.now(), did: did.trim(), ...(result.trim() ? { result: result.trim() } : {}) }] });
    setDid(''); setResult(''); setDay(todayInput());
  };
  const change = (id: string, p: Partial<NonNullable<Snag['journey']>[number]>) => put({ journey: (s.journey ?? []).map(j => (j.id === id ? { ...j, ...p } : j)) });
  return (
    <div className="pe-f pe-wide pj">
      <span className="pe-k">THE JOURNEY <i className="cw-f-opt">on a day, what we did and what came of it</i></span>
      {steps.length > 0
        ? <ol className="pj-steps">{steps.map(j => (
          <li key={j.id} className="pj-step">
            <DateInput className="text-input pj-day" value={dueToInput(j.at)} aria-label="The day it was done" onCommit={v => change(j.id, { at: dueFromInput(v) ?? j.at })} />
            <DraftText value={j.did} className="text-input pj-did" max={240} ariaLabel="What we did" onSave={v => { if (v.trim()) change(j.id, { did: v.trim() }); }} />
            <DraftText value={j.result ?? ''} placeholder="What came of it" className="text-input pj-res" max={240} ariaLabel="What came of it" onSave={v => change(j.id, { result: v.trim() || undefined })} />
            <button type="button" className="pj-x" aria-label={`Take off the step: ${j.did}`} onClick={() => put({ journey: (s.journey ?? []).filter(x => x.id !== j.id) })}><Icon name="close" size="1em" /></button>
          </li>
        ))}</ol>
        : <p className="sub pj-none">Nothing done yet — add the first step when something is done.</p>}
      <form className="pj-step pj-add" onSubmit={e => { e.preventDefault(); add(); }}>
        <DateInput className="text-input pj-day" value={day} aria-label="The day of the new step" onCommit={v => setDay(v || todayInput())} />
        <input className="text-input pj-did" value={did} placeholder="What we did" maxLength={240} onChange={e => setDid(e.target.value)} aria-label="What we did — the new step" />
        <input className="text-input pj-res" value={result} placeholder="What came of it (if known)" maxLength={240} onChange={e => setResult(e.target.value)} aria-label="What came of it — the new step" />
        <button type="submit" className="btn" disabled={!did.trim()}>Add the step</button>
      </form>
    </div>
  );
}

/** WHOSE AND BY WHEN, FOR EVERY TICKED PROBLEM — a box left empty changes nothing. */
function SetSheet({ snags, onClose, onDone }: { snags: Snag[]; onClose: () => void; onDone: () => void }) {
  const [who, setWho] = useState('');
  const [due, setDue] = useState('');
  const n = snags.length;
  const save = async () => {
    const before = snags.map(s => ({ ...s }));
    for (const s of snags) await updateSnag({ ...s, ...(who.trim() ? { owner: who.trim() } : {}), ...(due ? { dueAt: dueFromInput(due) } : {}) });
    offerUndo(`${n} snag${n === 1 ? '' : 's'} changed`, async () => { for (const s of before) await updateSnag(s); });
    onDone();
  };
  return (
    <Sheet open onClose={onClose} title={`Whose and by when — ${n} problem${n === 1 ? '' : 's'}`}>
      <div className="qs">
        <label className="cw-f cw-f-wide"><span>WHOSE</span>
          <input className="text-input" value={who} placeholder="Leave empty to keep each one's" onChange={e => setWho(e.target.value)} /></label>
        <label className="cw-f cw-f-wide"><span>DUE</span>
          <input className="text-input" type="date" value={due} onChange={e => setDue(e.target.value)} /></label>
        <div className="ax-foot">
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!who.trim() && !due} onClick={() => void save()}>Change {n}</button>
        </div>
      </div>
    </Sheet>
  );
}
