/* SNAGS & FIXES — one place for every snag, problem and fix. Rowland, 12
 * October: "Ensure no confusion between snags, fixes, problems — I think one
 * location for all, and we manage it through its own page." (The name and
 * the job's own view, asked and chosen: "Snags & fixes"; a job's Fixes is
 * this page, that job only — screens/FixesScreen.) Before that, the same day:
 * "the Snags page needs to be a working page, not just a home for snags and
 * transfers"; 6 October: "transfer these multiple snags over to a project,
 * transfer them as problems, same sort of multi-status".
 *
 * ONE PATH, SAID ONCE. A SNAG is spotted on a line — on the move (the Snag
 * button), pinned on a frame of the walk, or raised from the Pareto board.
 * Once it is on a job it is a PROBLEM; a FIX is what puts it right (on a 6M
 * job, an ACTION on its board). Every row says which it is in words, beside
 * its state in its colour; the kind is never a colour (CLAUDE.md).
 *
 * WORKED WHERE THEY SIT. A snag's state, whose it is and its day change on
 * its row; tick several to change them together, move them to a job, or print
 * their cards. A problem or fix opens in its job's drawer, where it is worked
 * as on its job; each job's group opens its own list — planning a fix,
 * signing one off — in one tap. The counts are the filters (one thing, one
 * place); a line, a job, a person, a word narrow it.
 *
 * MOVED, AND SHOWN ONCE. A snag moved to a job (snag/quick) is shown as the
 * problem, fix or action it became, under that job, saying "from a snag on
 * Line 7" — Rowland, 12 October: "I have moved some snags ... I don't know
 * where they are." Only one whose record is gone is listed on its own.
 *
 * ITS OWN REPORT. The Snags & fixes report prints what the page is showing,
 * as it shows it (lib/snagsReportPdf), from the same reading. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { withoutDemo } from '../lib/demo';
import { listAllSnags, listWorkspaces, listTests, listTestItems, listAssets, listSnagAssets, onDataChange, updateSnag, setSnagsStatus, listPaceTodos, type PaceTodoRow } from '../db';
import { useProjects } from '../lib/useProjects';
import { planModel } from '../lib/planModel';
import { live, type Asset, type Test, type TestItem } from '../lib/testing';
import { becameOn, jobGroup, type Became, type JobGroup, type JobRow, type MovedRow, type SnagRow, type SnagTone, snagsReading } from '../lib/snagsReport';
import { nav } from '../state/useRoute';
import { openRecord } from '../ui/RecordDrawer';
import { useAccessByJob } from '../ui/JobsBoard';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { Sheet } from '../ui/Sheet';
import { offerUndo } from '../ui/Undo';
import { Icon, type IconName } from '../ui/Icon';
import { DateInput } from '../ui/DateInput';
import { DraftText } from '../ui/Draft';
import type { MediaRef, Project, Workspace } from '../types';
import { SNAG_STATUS_META, dueFromInput, dueToInput, type Snag, type SnagAsset, type SnagStatus } from './types';
import { moveSnagsToActions, pinSnag, sendSnags } from './quick';
import { openQuickSnag } from './QuickSnag';

/** The counts are the filters: everything open, each kind open, the late, the done. */
type Filter = 'open' | 'snags' | 'problems' | 'fixes' | 'late' | 'done';
type Group = 'line' | 'who';
type JobData = { tests: Test[]; items: TestItem[]; assets: Asset[]; todos: PaceTodoRow[] };

const TONE_CLASS: Record<SnagTone, string> = { g: 'is-g', r: 'is-r', w: 'is-w', a: 'is-a', n: 'is-n' };
const KIND_WORD: Record<JobRow['kind'], string> = { problem: 'Problem', fix: 'Fix', action: 'Action' };
const KIND_ICON: Record<JobRow['kind'], IconName> = { problem: 'warning', fix: 'check', action: 'check' };

/** "Machine — Stage", the words a stage-gate job's stage goes by. */
const stageLabel = (t: Test, assets: Asset[]) => `${assets.find(a => a.id === t.assetId)?.name ?? 'The line'} — ${t.title}`;

const photoRef = (key: string, s?: { media?: MediaRef[] }): MediaRef =>
  s?.media?.find(m => m.blobKey === key) ?? { id: key, kind: 'photo', blobKey: key, mime: 'image/jpeg', capturedAt: 0 };

export function QuickSnagsScreen() {
  const { projects } = useProjects();
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [frames, setFrames] = useState<Map<string, SnagAsset>>(new Map());
  const [became, setBecame] = useState<Map<string, Became>>(new Map());
  const [jobData, setJobData] = useState<Map<string, JobData>>(new Map());
  const [filter, setFilter] = useState<Filter>('open');
  const [lineF, setLineF] = useState('all');
  const [jobF, setJobF] = useState('all');
  const [whoF, setWhoF] = useState('all');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<Group>('line');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [setting, setSetting] = useState(false);
  const [busy, setBusy] = useState<'' | 'report' | 'cards'>('');
  const [viewing, setViewing] = useState<{ snagId?: string; media: MediaRef } | null>(null);
  const liveJobs = useMemo(() => projects.filter(p => !p.archivedAt), [projects]);
  const jobKey = liveJobs.map(p => p.id).join(',');

  const load = useCallback(async () => {
    const [every, ws] = await Promise.all([listAllSnags(), listWorkspaces()]);
    /* the demo line's made-up snags are never on this page or its report */
    const all = withoutDemo(every, ws);
    setSnags(all.sort((a, b) => b.raisedAt - a.raisedAt)); setLines(ws);
    /* The frames the walk's snags are pinned on — their machine's name and picture. */
    const wsIds = [...new Set(all.filter(s => s.assetId).map(s => s.workspaceId))];
    const fr = new Map<string, SnagAsset>();
    for (const a of (await Promise.all(wsIds.map(id => listSnagAssets(id)))).flat()) fr.set(a.id, a);
    setFrames(fr);
    /* Every job's problems and fixes (and what each moved snag became there). */
    const pids = [...new Set([...jobKey.split(',').filter(Boolean), ...all.flatMap(s => (s.sent ?? []).map(x => x.projectId))])];
    const m = new Map<string, Became>(), jd = new Map<string, JobData>();
    await Promise.all(pids.map(async pid => {
      const [tests, items, assets, todos] = await Promise.all([listTests(pid), listTestItems(pid), listAssets(pid), listPaceTodos(pid)]);
      jd.set(pid, { tests, items, assets, todos });
      for (const [k, v] of becameOn(pid, tests, items, assets, todos)) m.set(k, v);
    }));
    setBecame(m); setJobData(jd);
  }, [jobKey]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const lineName = useCallback((id: string) => lines.find(w => w.id === id)?.name ?? 'A line', [lines]);
  const jobName = useCallback((id?: string) => (id ? projects.find(p => p.id === id)?.name : undefined), [projects]);
  const byId = useMemo(() => new Map((snags ?? []).map(s => [s.id, s])), [snags]);

  /* Each job's group — its problems with no fix and its fixes, or a 6M job's
     actions that came from snags (lib/snagsReport jobGroup). */
  const groupsOfJobs = useMemo(() => [...jobData.entries()].flatMap(([pid, d]) => {
    const p = projects.find(x => x.id === pid);
    if (!p || p.archivedAt) return [];
    const gated = planModel(p) === 'commissioning';
    return [jobGroup({ projectId: pid, job: p.name, tests: gated ? d.tests : [], items: gated ? d.items : [], assets: d.assets, todos: gated ? [] : d.todos, snags: snags ?? [], lineName })];
  }), [jobData, projects, snags, lineName]);

  /* Narrowed by line, job, person and words first — the counts then count what is left. */
  const words = search.trim().toLowerCase();
  const narrowed = useMemo(() => (snags ?? []).filter(s =>
    (lineF === 'all' || s.workspaceId === lineF) && (jobF === 'all' || s.projectId === jobF)
    && (whoF === 'all' || (whoF === '' ? !s.owner?.trim() : s.owner?.trim() === whoF))
    && (!words || `${s.problem} ${s.latestUpdate ?? ''} ${s.targetAsset ?? ''} ${s.owner ?? ''}`.toLowerCase().includes(words))), [snags, lineF, jobF, whoF, words]);
  const narrowedJobs = useMemo(() => groupsOfJobs.filter(g => jobF === 'all' || g.projectId === jobF).map(g => {
    const rows = g.rows.filter(r => (whoF === 'all' || (whoF === '' ? !r.who : r.who === whoF)) && (!words || `${r.what} ${r.where} ${r.who ?? ''}`.toLowerCase().includes(words)));
    return { ...g, rows, problemsOpen: rows.filter(r => r.kind === 'problem' && r.open).length, fixesToDo: rows.filter(r => r.kind !== 'problem' && r.open).length,
      late: rows.filter(r => r.late).length, done: rows.filter(r => !r.open).length };
  }), [groupsOfJobs, jobF, whoF, words]);
  const reading = useMemo(() => snagsReading({
    snags: narrowed, lineName, jobName, became, jobs: lineF === 'all' ? narrowedJobs : [],
    assetName: s => (s.assetId ? frames.get(s.assetId)?.name : undefined),
    stillOf: s => (s.assetId ? frames.get(s.assetId)?.stillKey : undefined),
  }), [narrowed, lineName, jobName, became, narrowedJobs, lineF, frames]);
  const c = reading.counts;

  /* What the chosen count shows. */
  const shownLines = useMemo(() => {
    const keep = (r: SnagRow) => (filter === 'open' || filter === 'snags' ? r.status !== 'closed' : filter === 'late' ? r.late : filter === 'done' ? r.status === 'closed' : false);
    return reading.lines.map(g => ({ ...g, rows: g.rows.filter(keep) })).filter(g => g.rows.length);
  }, [filter, reading]);
  const shownJobs = useMemo(() => {
    const keep = (r: JobRow) => (filter === 'open' ? r.open : filter === 'problems' ? r.kind === 'problem' && r.open : filter === 'fixes' ? r.kind !== 'problem' && r.open
      : filter === 'late' ? r.late : filter === 'done' ? !r.open : false);
    return reading.jobs.map(g => ({ ...g, rows: g.rows.filter(keep) })).filter(g => g.rows.length);
  }, [filter, reading]);
  const shownMoved = filter === 'open' || filter === 'done' ? reading.moved : [];
  const groups = useMemo(() => {
    if (group === 'line') return shownLines.map(g => ({ key: g.id, name: g.name, rows: g.rows }));
    const by = new Map<string, SnagRow[]>();
    for (const r of shownLines.flatMap(g => g.rows)) by.set(r.owner ?? '', [...(by.get(r.owner ?? '') ?? []), r]);
    return [...by.entries()].map(([who, rows]) => ({ key: `who:${who}`, name: who || 'Nobody yet', rows: rows.sort((a, b) => Number(b.late) - Number(a.late) || b.raisedAt - a.raisedAt) }))
      .sort((a, b) => (a.name === 'Nobody yet' ? 1 : 0) - (b.name === 'Nobody yet' ? 1 : 0) || b.rows.filter(x => x.late).length - a.rows.filter(x => x.late).length || a.name.localeCompare(b.name));
  }, [group, shownLines]);

  const onLines = [...new Set((snags ?? []).map(s => s.workspaceId))];
  const onJobs = groupsOfJobs.filter(g => g.rows.length || (snags ?? []).some(s => s.projectId === g.projectId));
  const owners = [...new Set([...(snags ?? []).map(s => s.owner?.trim()), ...groupsOfJobs.flatMap(g => g.rows.map(r => r.who))].filter((o): o is string => !!o))].sort();
  const toggle = (ids: string[], on: boolean) => setPicked(p => {
    const n = new Set(p);
    for (const id of ids) { if (on) n.add(id); else n.delete(id); }
    return n;
  });
  const chosen = (snags ?? []).filter(s => picked.has(s.id) && !(s.sent ?? []).length);

  /* WORKING A SNAG WHERE IT SITS — its state, whose it is, the day it is due. */
  const put = async (id: string, p: Partial<Snag>) => { const s = byId.get(id); if (s) await updateSnag({ ...s, ...p }); };
  const setStatus = (id: string, status: SnagStatus) => void put(id, { status, closedAt: status === 'closed' ? Date.now() : undefined });
  const open = (s: Snag) => {
    if (s.assetId && frames.get(s.assetId)) nav(`/w/${s.workspaceId}/asset/${s.assetId}`);
    else if (s.assetId || s.targetCategory || s.caseId) nav(`/w/${s.workspaceId}/snaglist`);
    else openQuickSnag(s);
  };
  const openJobRow = (r: JobRow) => (r.kind === 'action' ? nav(`/project/${r.projectId}/board?a=${encodeURIComponent(r.id)}`) : openRecord(r.projectId, r.id));
  const jobList = (g: JobGroup) => {
    const p = projects.find(x => x.id === g.projectId);
    nav(p && planModel(p) === 'commissioning' ? `/project/${g.projectId}/fixes` : `/project/${g.projectId}/board`);
  };

  /* WHAT IS SHOWN, IN WORDS — the report's title and the cards' note. */
  const FILTER_TITLE: Record<Filter, string> = { open: 'Everything open', snags: 'Snags open', problems: 'Problems with no fix', fixes: 'Fixes to do', late: 'Everything late', done: 'Done' };
  const title = [FILTER_TITLE[filter], lineF !== 'all' ? `on ${lineName(lineF)}` : '', jobF !== 'all' ? `for ${jobName(jobF) ?? 'a job'}` : '',
    whoF !== 'all' ? (whoF ? `— ${whoF}'s` : '— nobody’s yet') : '', search.trim() ? `— “${search.trim()}”` : ''].filter(Boolean).join(' ');
  const report = async () => {
    if (busy) return;
    setBusy('report');
    try {
      const { saveSnagsReport } = await import('../lib/buildSnagsReport');
      await saveSnagsReport({ ...reading, lines: shownLines, jobs: shownJobs, moved: shownMoved }, title);
    } catch (e) {
      console.error('snags & fixes report failed', e);
      window.alert('Sorry — the report could not be made. Please try again.');
    } finally { setBusy(''); }
  };
  const cards = async (list: Snag[]) => {
    if (busy || !list.length) return;
    setBusy('cards');
    try {
      const { saveSnagCards } = await import('../lib/buildSnagCards');
      const one = new Set(list.map(s => s.workspaceId)).size === 1 ? lineName(list[0].workspaceId) : 'snags';
      await saveSnagCards(list.map(s => ({ snag: s, asset: s.assetId ? frames.get(s.assetId) : undefined, assetName: (s.assetId ? frames.get(s.assetId)?.name : undefined) ?? s.targetAsset ?? 'Taken on the move' })), one, title);
    } catch (e) {
      console.error('snag cards failed', e);
      window.alert('Sorry — the cards could not be made. Please try again.');
    } finally { setBusy(''); }
  };

  const openSnags = c.open + c.in_progress;
  const chip = (f: Filter, n: number, word: string, abnormal = false) => (
    <button key={f} type="button" className={'chip' + (filter === f ? ' on' : '') + (abnormal && n ? ' qsl-chip-r' : '')} aria-pressed={filter === f} onClick={() => setFilter(f)}>
      {word} · {n}
    </button>
  );
  const shownCount = shownLines.reduce((n, g) => n + g.rows.length, 0) + shownJobs.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="wrap qsl">
      <header className="pace-head qsl-head">
        <div>
          <h1>Snags &amp; fixes</h1>
          <p className="qsl-path">A <b>snag</b> is spotted on a line. Once it is on a job it is a <b>problem</b>; a <b>fix</b> is what puts it right.</p>
          <p className="qsl-says">{snags ? reading.says : 'Opening…'}</p>
        </div>
        <div className="qsl-top">
          <button type="button" className="btn btn-primary" onClick={() => openQuickSnag()}><Icon name="camera" size="1.05em" />Snag</button>
          <button type="button" className="btn" disabled={!!busy || (!shownCount && !shownMoved.length)} onClick={() => void report()}>
            <Icon name="document" size="1.05em" />{busy === 'report' ? 'Making…' : 'Snags & fixes report'}</button>
        </div>
      </header>

      <div className="chip-row qsl-f" role="group" aria-label="Which">
        {chip('open', openSnags + c.problems + c.fixes, 'Everything open')}
        {chip('snags', openSnags, 'Snags')}
        {chip('problems', c.problems, 'Problems')}
        {chip('fixes', c.fixes, 'Fixes')}
        {chip('late', c.late + c.jobLate, 'Late', true)}
        {chip('done', c.closed + c.jobDone, 'Done')}
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
            {onJobs.map(g => <option key={g.projectId} value={g.projectId}>{g.job}</option>)}
          </select>
        )}
        <select className="text-input qsl-sel" value={whoF} onChange={e => setWhoF(e.target.value)} aria-label="Whose">
          <option value="all">Everybody</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
          <option value="">Nobody yet</option>
        </select>
        <input className="text-input qsl-search" type="search" placeholder="Find a word" value={search} onChange={e => setSearch(e.target.value)} aria-label="Find a snag, problem or fix" />
        <span className="cw-seg" role="group" aria-label="Snags by">
          {(['line', 'who'] as Group[]).map(g => (
            <button key={g} type="button" className={'chip' + (group === g ? ' on' : '')} aria-pressed={group === g} onClick={() => setGroup(g)}>{g === 'line' ? 'By line' : 'By who'}</button>
          ))}
        </span>
      </div>

      {snags && snags.length === 0 && !groupsOfJobs.some(g => g.rows.length) && (
        <div className="qsl-empty">
          <p><b>No snags, problems or fixes yet.</b> Spot something on a line — press <b>Snag</b>, take a picture, say what is wrong.</p>
          <button type="button" className="btn btn-primary" onClick={() => openQuickSnag()}><Icon name="camera" size="1.05em" />Snag</button>
        </div>
      )}
      {snags && (snags.length > 0 || groupsOfJobs.some(g => g.rows.length)) && !groups.length && !shownJobs.length && !shownMoved.length && <p className="sub">None here — try Everything open, or every line and job.</p>}

      {groups.length > 0 && <h2 className="qsl-kind-h">Snags <span className="sub">— spotted on a line, not on a job yet</span></h2>}
      {groups.map(g => {
        const all = g.rows.every(r => picked.has(r.id));
        const late = g.rows.filter(r => r.late).length;
        return (
          <section key={g.key} className="qsl-g">
            <div className="qsl-gh">
              <label className="qsl-tick">
                <input type="checkbox" checked={all} onChange={e => toggle(g.rows.map(r => r.id), e.target.checked)} aria-label={`Tick every snag in ${g.name}`} />
              </label>
              <h2>{g.name}</h2>
              <span className="sub">{g.rows.length} snag{g.rows.length === 1 ? '' : 's'}{late ? <> · <b className="qsl-late">{late} late</b></> : null}</span>
            </div>
            <ul className="qsl-rows">
              {g.rows.map(r => {
                const s = byId.get(r.id);
                if (!s) return null;
                return (
                  <li key={r.id} className={'qsl-row qsl-work' + (picked.has(r.id) ? ' is-picked' : '') + (r.late ? ' is-late' : '')}>
                    <label className="qsl-tick">
                      <input type="checkbox" checked={picked.has(r.id)} onChange={e => toggle([r.id], e.target.checked)} aria-label={`Tick: ${r.what}`} />
                    </label>
                    {/* THE PICTURE OPENS LARGE, to be pointed at (ui/Evidence). */}
                    {r.photo && <EvidenceThumb media={photoRef(r.photo, s)} size={52} onClick={() => setViewing({ snagId: s.media?.some(m => m.blobKey === r.photo) ? s.id : undefined, media: photoRef(r.photo as string, s) })} />}
                    <button type="button" className="qsl-open" onClick={() => open(s)}>
                      {!r.photo && <span className="qsl-nopic" aria-hidden><Icon name="camera" size={18} /></span>}
                      <span className="qsl-body">
                        <span className="qsl-what"><span className="qsl-kind">Snag</span>{r.what}</span>
                        <span className="qsl-meta">
                          {group === 'who' && <>{r.line} · </>}{r.from}
                          {/* Named for a job and not on it yet: said, so it is not
                              taken for being on the job's reports. */}
                          {r.forJob && <> · for {r.forJob} — not moved yet</>}
                        </span>
                        {r.update && <span className="qsl-meta qsl-upd">Latest: {r.update}</span>}
                      </span>
                    </button>
                    <div className="qsl-ctl">
                      <select className={'text-input qsl-st ' + TONE_CLASS[r.tone]} value={r.status} onChange={e => setStatus(r.id, e.target.value as SnagStatus)} aria-label={`State of ${r.what}`}>
                        {(['open', 'in_progress', 'closed'] as SnagStatus[]).map(k => <option key={k} value={k}>{SNAG_STATUS_META[k].label}</option>)}
                      </select>
                      <DraftText value={s.owner ?? ''} placeholder="Whose?" className="text-input qsl-who" max={60} ariaLabel={`Whose is ${r.what}`}
                        onSave={v => void put(r.id, { owner: v.trim() || undefined })} />
                      {r.status !== 'closed' && (
                        <span className="qsl-due">
                          <DateInput className="text-input qsl-date" value={dueToInput(s.dueAt)} aria-label={`Due date of ${r.what}`} onCommit={v => void put(r.id, { dueAt: dueFromInput(v) })} />
                          {r.due && <span className={'qsl-dueword ' + TONE_CLASS[r.dueTone ?? 'n']}>{r.due}</span>}
                        </span>
                      )}
                      {/* closed: the day it was — the select already says Closed */}
                      {r.status === 'closed' && s.closedAt != null && <span className="qsl-dueword">on {new Date(s.closedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* ON THE JOBS — each job's problems and fixes, a moved snag among them as what it became. */}
      {shownJobs.length > 0 && <h2 className="qsl-kind-h">On the jobs <span className="sub">— problems and their fixes</span></h2>}
      {shownJobs.map(g => {
        const all = reading.jobs.find(x => x.projectId === g.projectId) ?? g;
        return (
          <section key={`job:${g.projectId}`} className="qsl-g qsl-job">
            <div className="qsl-gh">
              <h2>{g.job}</h2>
              <span className="sub">
                {[all.problemsOpen ? `${all.problemsOpen} problem${all.problemsOpen === 1 ? '' : 's'} with no fix` : '', all.fixesToDo ? `${all.fixesToDo} to do` : '', all.done ? `${all.done} done` : ''].filter(Boolean).join(' · ') || 'nothing open'}
                {all.late ? <> · <b className="qsl-late">{all.late} late</b></> : null}
              </span>
              <button type="button" className="linkish qsl-jobgo" onClick={() => jobList(g)}>Open {g.job}’s list ›</button>
            </div>
            <ul className="qsl-rows">
              {g.rows.map(r => (
                <li key={r.id} className={'qsl-row' + (r.late ? ' is-late' : '')}>
                  {r.photo && <EvidenceThumb media={photoRef(r.photo)} size={52} onClick={() => setViewing({ media: photoRef(r.photo as string) })} />}
                  <button type="button" className="qsl-open" onClick={() => openJobRow(r)}>
                    {!r.photo && <span className="qsl-nopic" aria-hidden><Icon name={KIND_ICON[r.kind]} size={18} /></span>}
                    <span className="qsl-body">
                      <span className="qsl-what"><span className="qsl-kind">{KIND_WORD[r.kind]}</span>{r.flag && <span className={'qsl-flag' + (r.flag === 'critical' ? ' is-r' : ' is-a')}>{r.flag === 'critical' ? 'Critical' : 'High risk'}</span>}{r.what}</span>
                      <span className="qsl-meta">{r.where}{r.who ? ` · ${r.who}` : ' · nobody yet'}{r.fromSnag ? ` · from ${r.fromSnag}` : ''}</span>
                    </span>
                    <span className={'qsl-state ' + TONE_CLASS[r.tone]}>{r.word}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* A MOVED SNAG WHOSE RECORD IS GONE — said so, never silently lost. */}
      {shownMoved.map(g => (
        <section key={`moved:${g.projectId ?? ''}`} className="qsl-g qsl-moved">
          <div className="qsl-gh"><h2>Moved to {g.job}</h2><span className="sub">{g.rows.length} no longer there</span></div>
          <ul className="qsl-rows">
            {g.rows.map((r: MovedRow) => (
              <li key={r.id} className="qsl-row">
                {r.photo && <EvidenceThumb media={photoRef(r.photo, byId.get(r.id))} size={52} onClick={() => setViewing({ media: photoRef(r.photo as string, byId.get(r.id)) })} />}
                <span className="qsl-open">
                  <span className="qsl-body">
                    <span className="qsl-what"><span className="qsl-kind">Snag</span>{r.what}</span>
                    <span className="qsl-meta">{r.line} · {r.from}</span>
                    <span className="qsl-meta qsl-became is-n">Moved — {r.says}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {chosen.length > 0 && (
        <div className="qsl-bar" role="region" aria-label="Ticked snags">
          <span><b>{chosen.length}</b> ticked</span>
          <button type="button" className="btn" onClick={() => void setSnagsStatus(chosen.map(s => s.id), 'in_progress')}>In progress</button>
          <button type="button" className="btn" onClick={() => {
            const before = chosen.map(s => ({ ...s }));
            void setSnagsStatus(chosen.map(s => s.id), 'closed').then(() => offerUndo(`${before.length} closed`, async () => { for (const s of before) await updateSnag(s); }));
          }}>Close</button>
          <button type="button" className="btn" onClick={() => setSetting(true)}>Whose · due</button>
          <button type="button" className="btn" disabled={!!busy} onClick={() => void cards(chosen)}>{busy === 'cards' ? 'Making…' : 'Cards'}</button>
          <button type="button" className="btn btn-primary" onClick={() => setSending(true)}>Move to a job</button>
          <button type="button" className="btn btn-ghost" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}
      {viewing && <EvidenceViewer media={viewing.media} onClose={() => setViewing(null)}
        {...(viewing.snagId ? { onPins: (pins: NonNullable<MediaRef['pins']>) => void pinSnag(viewing.snagId as string, viewing.media.id, pins) } : {})} />}
      {sending && <SendSheet snags={chosen} projects={projects}
        onClose={() => setSending(false)} onSent={() => { setSending(false); setPicked(new Set()); }} />}
      {setting && <SetSheet snags={chosen} onClose={() => setSetting(false)} onDone={() => { setSetting(false); setPicked(new Set()); }} />}
    </div>
  );
}

/** WHOSE AND BY WHEN, FOR EVERY TICKED SNAG — a box left empty changes nothing. */
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
    <Sheet open onClose={onClose} title={`Whose and by when — ${n} snag${n === 1 ? '' : 's'}`}>
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

/** MOVE THEM TO A JOB — which job; for a stage-gate job, the stage they were
 *  found on (none is an answer), the flag, and fix or problem; for a 6M or
 *  lever-tree job, actions on its board (snag/quick). */
function SendSheet({ snags, projects, onClose, onSent }: {
  snags: Snag[]; projects: Project[]; onClose: () => void; onSent: () => void;
}) {
  const accessOn = useAccessByJob(projects);
  /* A job you cannot change is not offered: the database would refuse it. */
  const mine = projects.filter(p => accessOn(p.id).edit);
  const gated = (p: Project) => planModel(p) === 'commissioning';
  const first = mine.find(p => snags.some(s => s.projectId === p.id)) ?? mine.find(gated) ?? mine[0];
  const [pid, setPid] = useState(first?.id ?? '');
  const [steps, setSteps] = useState<{ t: Test; label: string; machine?: string }[] | null>(null);
  const [step, setStep] = useState('');
  const [busy, setBusy] = useState(false);
  const [flag, setFlag] = useState<'none' | 'risk' | 'critical'>('none');
  const [asFix, setAsFix] = useState(true);
  const machineOf = snags.find(s => s.targetAsset)?.targetAsset?.toLowerCase();
  const p = projects.find(x => x.id === pid);
  const isGated = !!p && gated(p);

  useEffect(() => {
    let alive = true;
    setSteps(null); setStep('');
    if (!pid || !isGated) return;
    void Promise.all([listTests(pid), listAssets(pid)]).then(([tests, assets]) => {
      if (!alive) return;
      const rows = live(tests).filter(t => t.kind === 'install')
        .map(t => ({ t, label: stageLabel(t, assets), machine: assets.find(a => a.id === t.assetId)?.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setSteps(rows);
      /* The snags' machine's stage, when the job has one of that name — else none. */
      setStep((machineOf && rows.find(r => r.machine?.toLowerCase() === machineOf)?.t.id) || '');
    });
    return () => { alive = false; };
  }, [pid, isGated, machineOf]);

  const n = snags.length;
  const send = async () => {
    if (!p || busy) return;
    setBusy(true);
    try {
      if (isGated) {
        const fix = asFix || !step;
        const undo = await sendSnags(snags, p.id, step || undefined, { ...(flag !== 'none' ? { flag } : {}), fix }, p.name);
        offerUndo(`${n} moved to ${p.name} — ${fix ? `${n === 1 ? 'a fix' : 'fixes'} on its Snags & fixes` : `${n === 1 ? 'a problem' : 'problems'} on its stage`}`, undo);
      } else {
        const undo = await moveSnagsToActions(snags, p.id, p.name);
        offerUndo(`${n} moved to ${p.name} — ${n === 1 ? 'an action' : 'actions'} on its board`, undo);
      }
      onSent();
    } finally { setBusy(false); }
  };

  return (
    <Sheet open onClose={onClose} title={`Move ${n} snag${n === 1 ? '' : 's'} to a job`}>
      <div className="qs">
        <label className="cw-f cw-f-wide"><span>WHICH JOB</span>
          <select value={pid} onChange={e => setPid(e.target.value)}>
            <option value="" disabled>Pick a job</option>
            {mine.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select></label>
        {isGated && <>
          {steps && steps.length > 0 && (
            <label className="cw-f cw-f-wide"><span>FOUND ON <i className="cw-f-opt">if it was a stage</i></span>
              <select value={step} onChange={e => setStep(e.target.value)}>
                <option value="">Not on a stage</option>
                {steps.map(r => <option key={r.t.id} value={r.t.id}>{r.label}</option>)}
              </select></label>
          )}
          <div className="qs-mach">
            <span className="qs-l">FLAG {n === 1 ? 'IT' : 'THEM'}</span>
            <div className="chip-row" role="group" aria-label="How serious is it?">
              {([['none', 'Not flagged'], ['risk', 'High risk'], ['critical', 'Critical']] as const).map(([k, w]) => (
                <button key={k} type="button" className={'chip' + (flag === k ? ' on' : '')} aria-pressed={flag === k} onClick={() => setFlag(k)}>{w}</button>
              ))}
            </div>
          </div>
          <label className="why-check"><input type="checkbox" checked={asFix || !step} disabled={!step} onChange={e => setAsFix(e.target.checked)} />
            <span>Make {n === 1 ? 'it a fix' : 'each a fix'}</span></label>
        </>}
        {p && !isGated && <p className="sub">{n === 1 ? 'It goes' : 'They go'} on {p.name}’s board as {n === 1 ? 'an action' : 'actions'}, with {n === 1 ? 'its' : 'their'} pictures.</p>}
        {mine.length === 0 && <p className="sub">There is no job you can change.</p>}
        <div className="ax-foot">
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!p || busy} onClick={() => void send()}>Move {n}</button>
        </div>
      </div>
    </Sheet>
  );
}
