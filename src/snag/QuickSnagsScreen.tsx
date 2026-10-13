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
import { addLineToFactory, asked, byFloor, liveProductionLines } from '../lib/lines';
import { addSnag, deleteSnag, inArchivedProject, listAllSnags, projectWalkIds, listArchivedWorkspaces, listWorkspaces, putTest, putTestItem, listAssets, listSnagAssets, listTests, listTestItems, listPaceTodos, onDataChange, updateSnag, updateWorkspace, setSnagsStatus, type PaceTodoRow } from '../db';
import { useProjects } from '../lib/useProjects';
import { planModel } from '../lib/planModel';
import { uid } from '../lib/ids';
import type { SnagCardRow } from '../lib/buildSnagCards';
import { jobGroup, PRIORITY_RANK, PRIORITY_WORD, type JobGroup, type JobRow, type Priority, type SnagRow, type SnagTone, snagsReading } from '../lib/snagsReport';
import { openRecord } from '../ui/RecordDrawer';
import { useAccessByJob } from '../ui/JobsBoard';
import { useSyncStatus } from '../cloud/session';
import { fixFlag } from '../lib/critical';
import { todayISO } from '../lib/weeks';
import { openIn, saveProblemCardsFor, saveProblemsReportFor } from '../lib/problemsPdf';
import { nav } from '../state/useRoute';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { Evidence } from '../ui/EvidenceDoors';
import { Sheet } from '../ui/Sheet';
import { offerUndo } from '../ui/Undo';
import { Icon } from '../ui/Icon';
import { DateInput } from '../ui/DateInput';
import { DraftArea, DraftText } from '../ui/Draft';
import type { MediaRef, Project, Workspace } from '../types';
import type { Asset, Test, TestItem } from '../lib/testing';
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
const NEW_LINE = '__new_line__';
/** The group of problems whose line is gone with an archived project, or archived itself. */
const NO_LINE = '__no_line__';
/** A job's records the page reads its problems and fixes from. */
interface JobData { tests: Test[]; items: TestItem[]; assets: Asset[]; todos: PaceTodoRow[] }
const todayInput = () => dueToInput(new Date().setHours(0, 0, 0, 0));
const dedupe = (xs: string[]) => { const seen = new Set<string>(); return xs.filter(x => { const k = x.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };

export function QuickSnagsScreen() {
  const { projects, archived: archivedJobs } = useProjects();
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [lines, setLines] = useState<Workspace[]>([]);
  const [frames, setFrames] = useState<Map<string, SnagAsset>>(new Map());
  const [jobMachines, setJobMachines] = useState<string[]>([]);
  const [jobData, setJobData] = useState<Map<string, JobData>>(new Map());
  /* AN ARCHIVED JOB'S OWN WALK — its problems are "Not on a line", never under the
     archived name (Rowland, 12-13 October: "the bloody title 2A2B ... doesn't exist
     because it's an archive project"). A LINE of the factory is never away: Line 2B
     stays Line 2B, its problems on it, whatever became of the job that first named
     it (13 October: "archive is causing issues ... once and for all"). */
  const [awayLines, setAwayLines] = useState<Set<string>>(new Set());
  /* the lines of Your factory, in floor order — what every line box offers */
  const [factory, setFactory] = useState<Workspace[]>([]);
  /* lines archived themselves — their names kept, so a problem left on one says where it is */
  const [shelved, setShelved] = useState<Workspace[]>([]);
  /* the order the rows stood in when a problem was opened — kept while any is open, so a changed priority never moves the row from under the finger */
  const [frozen, setFrozen] = useState<Map<string, number> | null>(null);
  /* the last problem saved, for the word "Saved" on it */
  const [savedOn, setSavedOn] = useState<{ id: string; at: number } | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [group, setGroup] = useState<Group>('line');
  /* opened from a line's own page: on that line, the problem tapped there open */
  const [lineF, setLineF] = useState(() => asked('line') ?? 'all');
  const [jobF, setJobF] = useState('all');
  const [whoF, setWhoF] = useState('all');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(() => new Set(asked('open') ? [asked('open') as string] : []));
  const [setting, setSetting] = useState(false);
  const [showAway, setShowAway] = useState(false);
  const [busy, setBusy] = useState<'' | 'report' | 'cards'>('');
  const [viewing, setViewing] = useState<{ snagId?: string; media: MediaRef } | null>(null);
  const liveJobs = useMemo(() => projects.filter(p => !p.archivedAt), [projects]);
  /* who may change a project's own problems — a client of it reads them (lib/access) */
  const accessOn = useAccessByJob(projects);
  /* a change the cloud refused is said here, never left to look saved (13 October) */
  const sync = useSyncStatus();
  const refusedHere = (sync.refused ?? []).filter(r => r.kind === 'snags' || r.kind === 'test_items' || r.kind === 'tests');
  const jobKey = liveJobs.map(p => p.id).join(',');

  const load = useCallback(async () => {
    const [every, ws] = await Promise.all([listAllSnags(), listWorkspaces()]);
    /* the demo line's made-up problems are never here */
    const all = withoutDemo(every, ws).filter(s => !s.deletedAt);
    setSnags(all.sort((a, b) => b.raisedAt - a.raisedAt)); setLines(withoutDemo(ws.map(w => ({ ...w, workspaceId: w.id })), ws).sort(byFloor));   /* offered in floor order (Your factory) */
    setShelved(await listArchivedWorkspaces());
    const [walks, floor] = await Promise.all([projectWalkIds(), liveProductionLines(ws)]);
    setFactory(floor);
    const away = await Promise.all(ws.filter(w => walks.has(w.id)).map(async w => [w.id, await inArchivedProject(w.id)] as const));
    setAwayLines(new Set(away.filter(([, a]) => a).map(([id]) => id)));
    const wsIds = [...new Set(all.filter(s => s.assetId).map(s => s.workspaceId))];
    const fr = new Map<string, SnagAsset>();
    for (const a of (await Promise.all(wsIds.map(id => listSnagAssets(id)))).flat()) fr.set(a.id, a);
    setFrames(fr);
    /* EVERY PROJECT'S PROBLEMS AND FIXES — this page holds everything
       (Rowland, 12 October: "everything should still stay in the control
       problem page, because that's the page that has everything. That's the
       page I do the report on"); and the machines on the jobs, offered when
       a problem is given its machine. */
    const ids = jobKey.split(',').filter(Boolean);
    const jd = new Map<string, JobData>();
    await Promise.all(ids.map(async pid => {
      const [tests, items, assets, todos] = await Promise.all([listTests(pid), listTestItems(pid), listAssets(pid), listPaceTodos(pid)]);
      jd.set(pid, { tests, items, assets, todos });
    }));
    setJobData(jd);
    setJobMachines(dedupe([...jd.values()].flatMap(d => d.assets).filter(a => !a.deletedAt).map(a => a.name.trim())));
  }, [jobKey]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  /* an archived job's walk, or a line archived itself: "Not on a line"; a line of the factory: its name */
  const lineName = useCallback((id: string) => (id === NO_LINE || awayLines.has(id) || shelved.some(w => w.id === id)
    ? 'Not on a line' : lines.find(w => w.id === id)?.name ?? 'Not on a line'), [lines, awayLines, shelved]);
  /* the rows name a project in use only — an archived project's name never heads or tags a row (13 October) */
  const liveJobName = useCallback((id?: string) => (id ? projects.find(p => p.id === id)?.name : undefined), [projects]);
  /* the problem's own project box names it, archived or not, so it can be seen and changed (13 October audit) */
  const jobName = useCallback((id?: string) => {
    if (!id) return undefined;
    const live = projects.find(p => p.id === id);
    if (live) return live.name;
    const gone = archivedJobs.find(p => p.id === id);
    return gone ? `${gone.name} — archived project` : undefined;
  }, [projects, archivedJobs]);
  const byId = useMemo(() => new Map((snags ?? []).map(s => [s.id, s])), [snags]);
  /* NOT ON A LINE (Rowland, 13 October: "the problems that are under it right now are needed. Don't
     delete them. I've used them. The thing that needs removing is just the bloody title 2A2B. That
     doesn't exist because it's an archive project"): a problem on a line of an archived project, or on a
     line archived itself, stays on the page — worked, counted, on the report — under "Not on a line",
     never under the archived name; each put on a line in use when wanted. */
  const goneLines = useMemo(() => new Set([...awayLines, ...shelved.map(w => w.id)]), [awayLines, shelved]);
  const here = useMemo(() => (snags ?? []).filter(s => !s.archivedAt), [snags]);
  const away = useMemo(() => (snags ?? []).filter(s => !!s.archivedAt).sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)), [snags]);
  const frameName = (s: Snag) => (s.assetId ? frames.get(s.assetId)?.name : undefined);

  /* Narrowed by line, job, person and words first — the counts then count what is left. */
  const words = search.trim().toLowerCase();
  const narrowed = useMemo(() => here.filter(s =>
    (lineF === 'all' || (lineF === NO_LINE ? goneLines.has(s.workspaceId) : s.workspaceId === lineF)) && (jobF === 'all' || s.projectId === jobF)
    && (whoF === 'all' || (whoF === '' ? !s.owner?.trim() : s.owner?.trim() === whoF))
    && (!words || `${s.problem} ${s.latestUpdate ?? ''} ${s.targetAsset ?? ''} ${s.owner ?? ''} ${s.proposedSolution ?? ''} ${(s.journey ?? []).map(j => `${j.did} ${j.result ?? ''}`).join(' ')}`.toLowerCase().includes(words))), [here, lineF, jobF, whoF, words, goneLines]);
  /* Each project's own problems (with no fix yet) and its fixes — a
     stage-gate job's — or a 6M job's actions that came from a problem
     (lib/snagsReport jobGroup), narrowed as the problems are: a line chosen
     shows that line's only. */
  const jobGroups = useMemo(() => (lineF !== 'all' ? [] : [...jobData.entries()].flatMap(([pid, d]) => {
    const p = liveJobs.find(x => x.id === pid);
    if (!p || (jobF !== 'all' && jobF !== pid)) return [];
    const gated = planModel(p) === 'commissioning';
    const g = jobGroup({ projectId: pid, job: p.name, tests: gated ? d.tests : [], items: gated ? d.items : [], assets: d.assets, todos: gated ? [] : d.todos, snags: snags ?? [], lineName });
    const rows = g.rows.filter(r => (whoF === 'all' || (whoF === '' ? !r.who : r.who === whoF))
      && (!words || `${r.what} ${r.where} ${r.fixWhat ?? ''} ${r.who ?? ''}`.toLowerCase().includes(words)));
    return rows.length ? [{ ...g, rows }] : [];
  })), [jobData, liveJobs, lineF, jobF, whoF, words, snags, lineName]);
  const reading = useMemo(() => snagsReading({
    snags: narrowed.map(s => (goneLines.has(s.workspaceId) ? { ...s, workspaceId: NO_LINE } : s)), lineName, jobName: liveJobName, became: new Map(), register: true, jobs: jobGroups,
    assetName: s => (s.assetId ? frames.get(s.assetId)?.name : undefined),
    stillOf: s => (s.assetId ? frames.get(s.assetId)?.stillKey : undefined),
  }), [narrowed, lineName, liveJobName, frames, jobGroups, goneLines]);
  const c = reading.counts;

  /* What the chosen count shows. */
  const shownLines = useMemo(() => {
    const keep = (r: SnagRow) => (filter === 'open' ? r.status !== 'closed' : filter === 'late' ? r.late : filter === 'done' ? r.status === 'closed' : r.status !== 'closed' && r.priority === filter);
    /* a problem being worked stays in view until it is closed up — closing it, or changing its priority, never takes it from under the finger (13 October audit) */
    const at = (id: string) => frozen?.get(id) ?? Number.MAX_SAFE_INTEGER;
    return reading.lines.map(g => ({ ...g, rows: g.rows.filter(r => keep(r) || opened.has(r.id)) }))
      .map(g => (frozen ? { ...g, rows: [...g.rows].sort((a, b) => at(a.id) - at(b.id)) } : g))
      .filter(g => g.rows.length);
  }, [filter, reading, opened, frozen]);
  const groups = useMemo(() => {
    if (group === 'line') return shownLines.map(g => ({ key: g.id, name: g.name, rows: g.rows }));
    const by = new Map<string, SnagRow[]>();
    for (const r of shownLines.flatMap(g => g.rows)) by.set(r.owner ?? '', [...(by.get(r.owner ?? '') ?? []), r]);
    return [...by.entries()].map(([who, rows]) => ({ key: `who:${who}`, name: who || 'Nobody yet', rows: rows.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || Number(b.late) - Number(a.late) || b.raisedAt - a.raisedAt) }))
      .sort((a, b) => (a.name === 'Nobody yet' ? 1 : 0) - (b.name === 'Nobody yet' ? 1 : 0) || b.rows.filter(x => x.late).length - a.rows.filter(x => x.late).length || a.name.localeCompare(b.name));
  }, [group, shownLines]);
  const shownJobs = useMemo(() => {
    const keep = (r: JobRow) => (filter === 'open' ? r.open : filter === 'late' ? r.late : filter === 'done' ? !r.open : r.open && r.priority === filter);
    return reading.jobs.map(g => ({ ...g, rows: g.rows.filter(keep) })).filter(g => g.rows.length);
  }, [filter, reading]);
  const shownCount = shownLines.reduce((n, g) => n + g.rows.length, 0) + shownJobs.reduce((n, g) => n + g.rows.length, 0);
  const anyJobRows = [...jobData.keys()].length > 0 && reading.jobs.length > 0;

  const onLines = [...new Set(here.map(s => (goneLines.has(s.workspaceId) ? NO_LINE : s.workspaceId)))];
  const onJobs = liveJobs.filter(p => here.some(s => s.projectId === p.id) || reading.jobs.some(g => g.projectId === p.id));
  const owners = [...new Set(here.map(s => s.owner?.trim()).filter((o): o is string => !!o))].sort();
  const toggle = (ids: string[], on: boolean) => setPicked(p => { const n = new Set(p); for (const id of ids) { if (on) n.add(id); else n.delete(id); } return n; });
  const flip = (id: string) => {
    const opening = !opened.has(id);
    if (opening && !opened.size) setFrozen(new Map(shownLines.flatMap(g => g.rows.map(r => r.id)).map((rid, i) => [rid, i])));
    if (!opening && opened.size === 1) setFrozen(null);
    setOpened(o => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  /* a new view closes up what was open in the last */
  const view = (f: Filter) => { setFilter(f); setOpened(new Set()); setFrozen(null); };
  const chosen = here.filter(s => picked.has(s.id));

  /* WORKING A PROBLEM WHERE IT SITS — every box saves as it is left. */
  useEffect(() => { if (!savedOn) return; const t = window.setTimeout(() => setSavedOn(null), 4000); return () => window.clearTimeout(t); }, [savedOn]);
  const put = async (id: string, p: Partial<Snag>) => { const s = byId.get(id); if (!s) return; await updateSnag({ ...s, ...p }); setSavedOn({ id, at: Date.now() }); };
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
      await saveSnagsReport({ ...reading, lines: shownLines, jobs: shownJobs, moved: [] }, title);
    } catch (e) {
      console.error('problems report failed', e);
      window.alert('Sorry — the report could not be made. Please try again.');
    } finally { setBusy(''); }
  };
  /* PUT ON A LINE — a project's own problem taken into the room as a problem on a line (any line, a new one), its words,
     pictures, priority, whose and day carried; it stays for its project until another is chosen; the project's record is
     marked sorted, saying where it went (13 October: "put the stuff on 2A and assign it to 2B") */
  const toLine = async (pid: string, item: TestItem, to: string) => {
    let wsId = to, name = lines.find(w => w.id === to)?.name ?? 'the line';
    if (to === NEW_LINE) { const typed = window.prompt('The new line’s name')?.trim(); if (!typed) return; wsId = (await addLineToFactory(typed)).id; name = typed; }
    const t = Date.now();
    const made: Snag = {
      id: uid(), workspaceId: wsId, problem: item.what, status: 'open', raisedAt: item.createdAt ?? t, updatedAt: t, projectId: pid,
      media: item.media ?? [], priority: item.critical ? 'critical' : item.risk ? 'high' : 'low',
      ...(item.owner?.trim() ? { owner: item.owner.trim() } : {}), ...(item.due ? { dueAt: dueFromInput(item.due) } : {}),
    };
    await addSnag(made);
    await putTestItem({ ...item, doneAt: t, note: `${item.note ? `${item.note}\n` : ''}Taken to Control room problems — on ${name}`, updatedAt: t });
    setOpened(new Set([made.id])); setFrozen(null);
    offerUndo(`Saved — now a problem on ${name}`, async () => { await deleteSnag(made.id); await putTestItem({ ...item, updatedAt: Date.now() }); });
  };
  const jobCard = async (row: JobRow, job: string) => {
    if (busy) return;
    setBusy('cards');
    try {
      const { saveProblemCards } = await import('../lib/buildSnagCards');
      await saveProblemCards([{ job: { row, job } }], job);
    } catch (e) {
      console.error('problem card failed', e);
      window.alert('Sorry — the report card could not be made. Please try again.');
    } finally { setBusy(''); }
  };
  /* A GROUP ON PAPER — a line's, a person's or a project's: its report or
     its cards, whatever is still open in it (lib/problemsPdf). */
  const pdfGroup = async (kind: 'report' | 'cards', name: string, list: Snag[], jobs: JobGroup[]) => {
    if (busy) return;
    setBusy(kind === 'report' ? 'report' : 'cards');
    try {
      if (kind === 'report') {
        await saveProblemsReportFor({ title: `${name} — problems`, snags: list, jobs, lineName, jobName,
          assetName: s => frameName(s), stillOf: s => (s.assetId ? frames.get(s.assetId)?.stillKey : undefined) });
      } else {
        await saveProblemCardsFor({ name, lineRows: list.map(lineCard), jobRows: jobs.flatMap(g => g.rows.map(row => ({ row, job: g.job }))) });
      }
    } catch (e) {
      console.error('problems pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
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

  /* EVERY PROBLEM AS A CARD (Rowland, 13 October: "the cards are great but i
     dont have ability to make a card for all of the problems") — a card each
     for every problem the page shows, the lines' and the projects' own, in
     the order shown; what is shown said on them, as the report says it. */
  const allCards = async () => {
    if (busy || !shownCount) return;
    setBusy('cards');
    try {
      const { saveProblemCards } = await import('../lib/buildSnagCards');
      const lineItems = shownLines.flatMap(g => g.rows).map(r => byId.get(r.id)).filter((x): x is Snag => !!x).map(x => ({ line: lineCard(x) }));
      const jobItems = shownJobs.flatMap(g => g.rows.map(row => ({ job: { row, job: g.job } })));
      await saveProblemCards([...lineItems, ...jobItems], lineF !== 'all' ? lineName(lineF) : 'problems', title);
    } catch (e) {
      console.error('problem cards failed', e);
      window.alert('Sorry — the cards could not be made. Please try again.');
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
    <button key={f} type="button" className={'chip' + (filter === f ? ' on' : '') + (tone && n ? ` qsl-chip-${tone}` : '')} aria-pressed={filter === f} onClick={() => view(f)}>
      {word} · {n}
    </button>
  );

  return (
    <div className={'wrap qsl' + (chosen.length ? ' has-bar' : '')}>
      <header className="pace-head qsl-head">
        <div>
          {/* WHERE YOU ARE, said (Rowland, 13 October: "sometimes I don't know when I'm in the control room problem and when I'm
              in the actual line problem ... change the name to control room problem, so when I look at the title, I know where I am") */}
          <h1>Control room problems</h1>
          <p className="qsl-path">Write any problem, give it a priority and say where it belongs. Tap one to work it: what we will do, and its journey — on a day, what we did and what came of it.</p>
          <p className="qsl-says">{snags ? reading.says : 'Opening…'}</p>
          {refusedHere.length > 0 && <p className="qsl-refused" role="alert">The cloud did not accept {refusedHere.reduce((n, r) => n + r.rows, 0)} change{refusedHere.reduce((n, r) => n + r.rows, 0) === 1 ? '' : 's'} to problems — kept on this device, not on your others: {refusedHere[0].message}</p>}
        </div>
        <div className="qsl-top">
          <button type="button" className="btn btn-primary" onClick={() => openQuickSnag()}><Icon name="camera" size="1.05em" />Problem</button>
          <button type="button" className="btn" disabled={!!busy || !shownCount} onClick={() => void report()}>
            <Icon name="document" size="1.05em" />{busy === 'report' ? 'Making…' : 'Problems report'}</button>
          <button type="button" className="btn" disabled={!!busy || !shownCount} onClick={() => void allCards()} aria-label="Problems cards — a card for every problem shown (PDF)">
            <Icon name="document" size="1.05em" />{busy === 'cards' ? 'Making…' : 'Problems cards'}</button>
          {here.length > 0 && <button type="button" className="btn btn-ghost preg-fresh" onClick={freshStart}>Start fresh</button>}
        </div>
      </header>

      {(here.length > 0 || anyJobRows) && <>
        <div className="chip-row qsl-f" role="group" aria-label="Which">
          {chip('open', c.critical + c.high + c.low, 'Open')}
          {chip('critical', c.critical, 'Critical', 'r')}
          {chip('high', c.high, 'High', 'a')}
          {chip('low', c.low, 'Low', 'g')}
          {chip('late', c.late + c.jobLate, 'Late', 'r')}
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
              <button key={g} type="button" className={'chip' + (group === g ? ' on' : '')} aria-pressed={group === g} onClick={() => { setGroup(g); setOpened(new Set()); setFrozen(null); }}>{g === 'line' ? 'By line' : 'By who'}</button>
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
      {snags && (here.length > 0 || anyJobRows) && !groups.length && !shownJobs.length && <p className="sub">None here — try Open, or every line and job.</p>}

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
              {/* the group on paper — its report, or a card each */}
              {(() => {
                const list = g.rows.map(r => byId.get(r.id)).filter((x): x is Snag => !!x);
                const n = openIn(list, []);
                return (
                  <span className="qsl-gh-pdf">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy || !n} aria-label={`Report for ${g.name} (PDF)`} onClick={() => void pdfGroup('report', g.name, list, [])}><Icon name="document" size="1em" />Report</button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy || !n} aria-label={`Report cards for ${g.name} (PDF)`} onClick={() => void pdfGroup('cards', g.name, list, [])}>Cards</button>
                  </span>
                );
              })()}
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
                        {savedOn?.id === r.id && <span className="preg-saved" role="status">Saved</span>}
                        <span className={'qsl-state ' + TONE_CLASS[r.tone]}>{r.word}</span>
                        {r.due && <span className={'qsl-dueword ' + TONE_CLASS[r.dueTone ?? 'n']}>{r.due}</span>}
                      </span>
                    </button>
                    {isOpen && <ProblemEditor s={s} lines={factory} projects={liveJobs}
                      saved={savedOn?.id === s.id && Date.now() - savedOn.at < 4000} lineName={lineName} jobName={jobName}
                      onSave={() => { flip(s.id); setSavedOn({ id: s.id, at: Date.now() }); }} machines={machinesFor(s.workspaceId)} frame={s.assetId ? frames.get(s.assetId) : undefined}
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

      {/* ON THE PROJECTS — each project's own problems and fixes, here with
          everything else and on the report (12 October); each opens out,
          and is worked on its project. */}
      {shownJobs.length > 0 && <h2 className="qsl-kind-h">On the projects <span className="sub">— raised on a project's own stages, with the fix that puts each right</span></h2>}
      {shownJobs.map(g => <JobProblems key={`job:${g.projectId}`} g={g} all={reading.jobs.find(x => x.projectId === g.projectId) ?? g}
        data={jobData.get(g.projectId)} canEdit={accessOn(g.projectId).edit} lines={factory}
        onToLine={(item, to) => void toLine(g.projectId, item, to)}
        opened={opened} flip={flip} busy={!!busy} onView={m => setViewing({ media: m })}
        onCard={r => void jobCard(r, g.job)}
        onPdf={kind => { const full = jobGroups.find(x => x.projectId === g.projectId) ?? g; void pdfGroup(kind, g.job, here.filter(s => s.projectId === g.projectId), [full]); }}
        onOpen={r => (r.kind === 'action' ? nav(`/project/${r.projectId}/board?a=${encodeURIComponent(r.id)}`) : openRecord(r.projectId, r.id))}
        onList={() => { const p = liveJobs.find(x => x.id === g.projectId); nav(p && planModel(p) === 'commissioning' ? `/project/${g.projectId}/fixes` : `/project/${g.projectId}/board`); }} />)}

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
            void (async () => { for (const x of chosen) await updateSnag({ ...x, priority: v }); setPicked(new Set()); setOpened(new Set()); setFrozen(null); offerUndo(`Saved — ${before.length} made ${PRIORITY_WORD[v].toLowerCase()}`, async () => { for (const x of before) await updateSnag(x); }); })();
          }}>
            <option value="">Priority…</option>
            {PRIOS.map(k => <option key={k} value={k}>{PRIORITY_WORD[k]}</option>)}
          </select>
          {/* ASSIGN — where it belongs; it stays here, and shows on the job too */}
          <select className="text-input qsl-sel qsl-bar-job" value="" aria-label="Assign every ticked problem to a job" onChange={e => {
            const v = e.target.value; if (!v) return;
            const before = chosen.map(x => ({ ...x })), pid = v === '-' ? undefined : v;
            void (async () => { for (const x of chosen) await updateSnag({ ...x, projectId: pid }); setPicked(new Set()); setOpened(new Set()); setFrozen(null); offerUndo(`Saved — ${before.length} ${pid ? `assigned to ${jobName(pid)}` : 'on no project'}`, async () => { for (const x of before) await updateSnag(x); }); })();
          }}>
            <option value="">Assign to a project…</option>
            {liveJobs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="-">No project</option>
          </select>
          {/* LINE — put the ticked on another line, or a new one (12 October: a
              project archived, its problems still to be put somewhere) */}
          <select className="text-input qsl-sel qsl-bar-line" value="" aria-label="Put every ticked problem on a line" onChange={e => {
            const v = e.target.value; if (!v) return;
            const before = chosen.map(x => ({ ...x }));
            void (async () => {
              let to = v, name = lines.find(w => w.id === v)?.name ?? 'the line';
              if (v === NEW_LINE) {
                const typed = window.prompt('The new line’s name')?.trim();
                if (!typed) return;
                to = (await addLineToFactory(typed)).id; name = typed;
              }
              /* one pinned on a walk stays on its line — it is on that line's walk picture */
              const move = before.filter(x => !x.assetId), stay = before.length - move.length;
              for (const x of move) await updateSnag({ ...x, workspaceId: to });
              setPicked(new Set()); setOpened(new Set()); setFrozen(null);
              offerUndo(`Saved — ${move.length} now on ${name}${stay ? `; ${stay} pinned on a walk stay on their line` : ''}`, async () => { for (const x of move) await updateSnag(x); });
            })();
          }}>
            <option value="">Put on a line…</option>
            {factory.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            <option value={NEW_LINE}>A new line…</option>
          </select>
          <button type="button" className="btn" onClick={() => setSetting(true)}>Whose · due</button>
          <button type="button" className="btn" onClick={() => {
            const before = chosen.map(s => ({ ...s }));
            void setSnagsStatus(chosen.map(s => s.id), 'closed').then(() => { setPicked(new Set()); setOpened(new Set()); setFrozen(null); offerUndo(`Saved — ${before.length} closed`, async () => { for (const s of before) await updateSnag(s); }); });
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
const KIND_ICON: Record<JobRow['kind'], 'warning' | 'check'> = { problem: 'warning', fix: 'check', action: 'check' };
const dayOf = (at: number) => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** A PROJECT'S OWN PROBLEMS AND FIXES on the Problems page — each opened out
 *  where it sits, its report card, and worked on its project. */
function JobProblems({ g, all, opened, flip, busy, onView, onCard, onOpen, onList, onPdf, data, canEdit, lines, onToLine }: {
  g: JobGroup; all: JobGroup; opened: Set<string>; flip: (id: string) => void; busy: boolean;
  data?: JobData; canEdit: boolean; lines: Workspace[]; onToLine: (item: TestItem, to: string) => void;
  onView: (m: MediaRef) => void; onCard: (r: JobRow) => void; onOpen: (r: JobRow) => void; onList: () => void;
  /** The project on paper — its own problems and fixes, and the line problems assigned to it. */
  onPdf: (kind: 'report' | 'cards') => void;
}) {
  return (
    <section className="qsl-g qsl-job">
      <div className="qsl-gh">
        <h2>{g.job}</h2>
        <span className="sub">
          {[all.problemsOpen ? `${all.problemsOpen} with no fix yet` : '', all.fixesToDo ? `${all.fixesToDo} being fixed` : '', all.done ? `${all.done} done` : ''].filter(Boolean).join(' · ') || 'nothing open'}
          {all.late ? <> · <b className="qsl-late">{all.late} late</b></> : null}
        </span>
        <span className="qsl-gh-pdf">
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} aria-label={`Report for ${g.job} (PDF)`} onClick={() => onPdf('report')}><Icon name="document" size="1em" />Report</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} aria-label={`Report cards for ${g.job} (PDF)`} onClick={() => onPdf('cards')}>Cards</button>
        </span>
        <button type="button" className="linkish qsl-jobgo" onClick={onList}>Open {g.job}’s list ›</button>
      </div>
      <ul className="qsl-rows">
        {g.rows.map(r => (
          <li key={r.id} className={'qsl-row qsl-jrow preg-row' + (r.late ? ' is-late' : '')}>
            {r.photo && <EvidenceThumb media={photoRef(r.photo)} size={52} onClick={() => onView(photoRef(r.photo as string))} />}
            <button type="button" className="qsl-open" aria-expanded={opened.has(r.id)} onClick={() => flip(r.id)}>
              {!r.photo && <span className="qsl-nopic" aria-hidden><Icon name={KIND_ICON[r.kind]} size={18} /></span>}
              <span className="qsl-body">
                <span className="qsl-what"><PrioTag p={r.priority} />{r.what}</span>
                {r.fixWhat && <span className="qsl-meta qsl-fixline">Fix: {r.fixWhat}</span>}
                <span className="qsl-meta">{r.where}{r.who ? ` · ${r.who}` : ' · nobody yet'}{r.fromSnag ? ` · seen first on ${r.fromSnag.replace(/^a (?:snag|problem) on /, '')}` : ''}</span>
              </span>
              <span className="preg-right"><span className={'qsl-state ' + TONE_CLASS[r.tone]}>{r.word}</span></span>
            </button>
            {opened.has(r.id) && canEdit && data && r.kind !== 'action' && (
              <JobEditor r={r} data={data} job={g.job} lines={lines} busy={busy} onCard={() => onCard(r)} onOpen={() => onOpen(r)} onToLine={onToLine} onDone={() => flip(r.id)} />
            )}
            {opened.has(r.id) && !(canEdit && data && r.kind !== 'action') && (
              <div className="qsl-x" role="region" aria-label={`More about ${r.what}`}>
                {r.photo && <div className="qsl-x-pics"><EvidenceThumb media={photoRef(r.photo)} size={96} onClick={() => onView(photoRef(r.photo as string))} /></div>}
                <dl className="qsl-x-facts">
                  <div><dt>Where</dt><dd>{r.where}</dd></div>
                  <div><dt>Whose</dt><dd>{r.who ?? 'nobody yet'}</dd></div>
                  <div><dt>Now</dt><dd>{r.word}</dd></div>
                  {r.fixWhat && <div><dt>Fix</dt><dd>{r.fixWhat}</dd></div>}
                  <div><dt>Raised</dt><dd>{dayOf(r.at)}</dd></div>
                </dl>
                <div className="qsl-x-acts">
                  <button type="button" className="btn" disabled={busy} onClick={() => onCard(r)}><Icon name="document" size="1.05em" />Report card (PDF)</button>
                  <button type="button" className="btn btn-ghost" onClick={() => onOpen(r)}>Work it on {g.job}</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A PROJECT'S OWN PROBLEM OR FIX, WORKED IN THE ROOM (13 October: "full edit, full changes, it doesn't matter what it
 *  is, this is the power room") — its words, priority, whose, day and where it stands, each kept as it is left; a problem
 *  put on a line becomes one of the room's own. The record is still its project's: what is changed here is changed there. */
function JobEditor({ r, data, job, lines, busy, onCard, onOpen, onToLine, onDone }: {
  r: JobRow; data: JobData; job: string; lines: Workspace[]; busy: boolean;
  onCard: () => void; onOpen: () => void; onToLine: (item: TestItem, to: string) => void; onDone: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const fix = r.kind === 'fix' ? data.tests.find(t => t.id === r.id) : undefined;
  const item = r.kind === 'problem' ? data.items.find(i => i.id === r.id) : fix ? fixFlag(fix.id, data.items).problem : undefined;
  const said = () => { setSaved(true); window.setTimeout(() => setSaved(false), 3000); };
  const putItem = (p: Partial<TestItem>) => { if (item) void putTestItem({ ...item, ...p, updatedAt: Date.now() }).then(said); };
  const putFix = (p: Partial<Test>) => { if (fix) void putTest({ ...fix, ...p, updatedAt: Date.now() }).then(said); };
  const prio: Priority = item?.critical ? 'critical' : item?.risk ? 'high' : 'low';
  const done = fix ? fix.outcome === 'passed' : item?.doneAt != null;
  if (!fix && !item) return null;
  return (
    <div className="pe" role="region" aria-label={`Work ${r.what}`}>
      <label className="pe-f"><span className="pe-k">{fix ? 'THE FIX' : 'WHAT IS THE PROBLEM'}</span>
        <DraftArea value={fix ? fix.title : item?.what ?? ''} rows={2} className="text-input pe-what" ariaLabel={fix ? 'The fix' : 'What is the problem'}
          onSave={v => (fix ? putFix({ title: v.trim() || fix.title }) : putItem({ what: v.trim() || item?.what }))} /></label>
      {item && <div className="pe-f"><span className="pe-k">PRIORITY</span>
        <div className="chip-row" role="group" aria-label="Priority">
          {PRIOS.map(k => <button key={k} type="button" className={'chip qs-prio is-' + k + (prio === k ? ' on' : '')} aria-pressed={prio === k}
            onClick={() => putItem({ critical: k === 'critical', risk: k === 'high' })}>{PRIORITY_WORD[k]}</button>)}
        </div></div>}
      <div className="pe-f"><span className="pe-k">WHERE IT STANDS</span>
        <div className="chip-row" role="group" aria-label="Where it stands">
          <button type="button" className={'chip' + (!done ? ' on' : '')} aria-pressed={!done}
            onClick={() => (fix ? putFix({ outcome: 'planned' }) : putItem({ doneAt: undefined }))}>{fix ? 'To do' : 'Open'}</button>
          <button type="button" className={'chip' + (done ? ' on' : '')} aria-pressed={done}
            onClick={() => (fix ? putFix({ outcome: 'passed', ranOn: fix.ranOn ?? todayISO() }) : putItem({ doneAt: Date.now() }))}>{fix ? 'Done' : 'Sorted'}</button>
        </div></div>
      <div className="pe-row">
        <label className="pe-f"><span className="pe-k">WHOSE</span>
          <DraftText value={(fix ? fix.withWhom : item?.owner) ?? ''} placeholder="Who has it" className="text-input" max={60} ariaLabel="Whose is it"
            onSave={v => (fix ? putFix({ withWhom: v.trim() || undefined }) : putItem({ owner: v.trim() || undefined }))} /></label>
        <label className="pe-f"><span className="pe-k">DUE</span>
          <DateInput className="text-input" value={(fix ? fix.plannedFor : item?.due) ?? ''} aria-label="Due date"
            onCommit={v => (fix ? putFix({ plannedFor: v || undefined }) : putItem({ due: v || undefined }))} /></label>
      </div>
      {r.kind === 'problem' && item && (
        <label className="pe-f"><span className="pe-k">PUT ON A LINE <i className="cw-f-opt">it becomes one of the room's own, for any project</i></span>
          <select className="text-input" value="" aria-label="Put this problem on a line" onChange={e => { if (e.target.value) onToLine(item, e.target.value); }}>
            <option value="">Put on a line…</option>
            {lines.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            <option value={NEW_LINE}>A new line…</option>
          </select></label>
      )}
      <div className="qsl-x-acts">
        <button type="button" className="btn btn-primary pe-save" onClick={() => { (document.activeElement as HTMLElement | null)?.blur(); window.setTimeout(onDone, 60); }}>Save</button>
        {saved && <span className="pe-saved" role="status">Saved</span>}
        <button type="button" className="btn" disabled={busy} onClick={onCard}><Icon name="document" size="1.05em" />Report card (PDF)</button>
        <button type="button" className="btn btn-ghost" onClick={onOpen}>Open on {job}</button>
      </div>
    </div>
  );
}

function ProblemEditor({ s, lines, projects, machines, frame, put, onView, onCard, onWalk, onDelete, busy, saved, onSave, lineName, jobName }: {
  s: Snag; lines: Workspace[]; projects: Project[]; machines: string[]; frame?: SnagAsset;
  put: (p: Partial<Snag>) => void; onView: (m: MediaRef) => void; onCard: () => void; onWalk: () => void; onDelete: () => void; busy: string;
  /** "Saved" — said as each box is kept; Save keeps the box being typed in and closes it (12 October: "there's never any saves") */
  saved: boolean; onSave: () => void;
  lineName: (id: string) => string; jobName: (id?: string) => string | undefined;
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
        {/* PROJECT first — where it is going (Rowland, 12 October: "assign the
            problems to where they're going to be"): every project open. */}
        <label className="pe-f"><span className="pe-k">PROJECT <i className="cw-f-opt">if it is for one</i></span>
          <select className="text-input" value={s.projectId ?? ''} aria-label="Which project" onChange={e => put({ projectId: e.target.value || undefined })}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            {/* the project it is for, archived since — named, so the box never says No project when it is for one */}
            {s.projectId && !projects.some(p => p.id === s.projectId) && <option value={s.projectId}>{jobName(s.projectId) ?? 'A project no longer here'}</option>}
          </select></label>
        {/* LINE — any line, a new one typed, and the line renamed when its
            name is wrong (the old "2A", "2B" could not be changed here). */}
        <div className="pe-f"><span className="pe-k">LINE</span>
          {/* PINNED ON A WALK, it is on that line's walk picture — it stays on its line (13 October audit: moved, it kept the old line's pin) */}
          {s.assetId ? <p className="pe-said">{lineName(s.workspaceId) === 'Not on a line' ? 'Pinned on the walk of a line no longer in use' : `${lineName(s.workspaceId)} — pinned on its walk`}</p> : <>
          <select className="text-input" value={s.workspaceId} aria-label="Which line" onChange={e => {
            const v = e.target.value;
            if (v !== NEW_LINE) { put({ workspaceId: v }); return; }
            const name = window.prompt('The new line’s name')?.trim();
            if (name) void addLineToFactory(name).then(w => put({ workspaceId: w.id }));   /* a new line goes into Your factory */
          }}>
            {lines.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            {/* the line it is on, archived since — named, never shown as another line */}
            {!lines.some(w => w.id === s.workspaceId) && <option value={s.workspaceId}>{lineName(s.workspaceId)}</option>}
            <option value={NEW_LINE}>A new line…</option>
          </select>
          <button type="button" className="btn btn-ghost btn-sm pe-rename" onClick={() => {
            const w = lines.find(x => x.id === s.workspaceId);
            const name = w ? window.prompt('Rename the line', w.name)?.trim() : undefined;
            if (w && name && name !== w.name) void updateWorkspace({ ...w, name });
          }}>Rename this line</button></>}</div>
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
        {/* SAVE — every box is kept as it is left; this keeps the one being typed in and closes the problem, saying so */}
        <button type="button" className="btn btn-primary pe-save" onClick={() => { (document.activeElement as HTMLElement | null)?.blur(); window.setTimeout(onSave, 60); }}>Save</button>
        {saved && <span className="pe-saved" role="status">Saved</span>}
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
    offerUndo(`${n} problem${n === 1 ? '' : 's'} changed`, async () => { for (const s of before) await updateSnag(s); });
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
