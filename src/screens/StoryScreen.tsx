/* THE STORY — the client's continuous journey, the page opened in front of them (8 November, docs/STORY.md §3; lib/clientStory).
 *
 * Rowland, 8 November: "the story so far is a continuous journey … I run an update and it pulls it all into a beautiful report."
 * One story a client (the client the lines name — the one picked on the Factory page when there are two): its brief, the four figures
 * as they stand today, what has changed since the last chapter, and the chapters, newest first. RUN AN UPDATE drafts the next chapter
 * — the snapshot frozen, the words assembled from the modules' own sentences (the assistant's draft, S3) — for the consultant to edit
 * and APPROVE; approving keeps it and makes its report (lib/report/storyPaper), kept under Saved copies. A figure in the words that the
 * snapshot does not hold is marked "check this" beside it; nothing is printed unmarked. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllStudies, listWorkspaces, onDataChange, putStudy } from '../db';
import type { Workspace } from '../types';
import type { StoryChapter, ToolStudy } from '../lib/study';
import { useProjects } from '../lib/useProjects';
import { productionLines, clientsOf } from '../lib/lines';
import { useFactoryRead } from '../lib/useFactoryRead';
import { assembledNarrative, dayWord, dayWordYear, draftChapter, linesOfClient, sinceOf, sinceSentence, snapshotOf, storySays, storyTiles, unsureIn } from '../lib/clientStory';
import { uid } from '../lib/ids';
import { PageHeader } from '../ui/parts';
import { LeanTiles } from '../ui/Lean';
import { DraftArea, DraftText } from '../ui/Draft';
import { useSaveOnArrival } from '../lib/useSaveOnArrival';
import { fmtGBP } from '../lib/cost';
import { nav } from '../state/useRoute';
import { askStory, storyAskOf } from '../tools/story/storyAsk';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const CLIENT_KEY = 'faultline.client';

/** The client the Story is of: the one picked on the Factory page when the lines name more than one, else the one they name. */
function clientShown(lines: readonly Workspace[]): string {
  const clients = clientsOf(lines);
  if (clients.length <= 1) return clients[0] ?? '';
  try { const c = localStorage.getItem(CLIENT_KEY) ?? ''; return clients.includes(c) ? c : clients[0]; } catch { return clients[0]; }
}

export function StoryScreen() {
  const { projects } = useProjects();
  const [all, setAll] = useState<Workspace[] | null>(null);
  const [studies, setStudies] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => { const [ws, st] = await Promise.all([listWorkspaces(), listAllStudies()]); setAll(ws); setStudies(st.filter(s => !s.deletedAt)); }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const prodLines = useMemo(() => productionLines(all ?? []), [all]);
  const client = clientShown(prodLines);
  const lines = useMemo(() => linesOfClient(prodLines, client), [prodLines, client]);
  const read = useFactoryRead(projects, lines);
  const story = useMemo(() => (studies ?? []).filter(s => s.tool === 'story' && s.agreed?.story && (s.agreed.story.client ?? '').trim().toLowerCase() === client.trim().toLowerCase()).sort((a, b) => (a.agreed?.story?.closedAt ? 1 : 0) - (b.agreed?.story?.closedAt ? 1 : 0) || b.startedAt - a.startedAt)[0], [studies, client]);
  const chapters = useMemo(() => (story?.facts.chapters ?? []).filter(c => c.approvedAt).sort((a, b) => a.at - b.at), [story]);
  const last = chapters[chapters.length - 1];
  const snapshot = useMemo(() => (read ? snapshotOf({ at: Date.now(), lines, wrong: read.wrong, actions: read.actions, proved: read.proved, studies: read.studies, today: read.today }) : null), [read, lines]);
  const since = useMemo(() => (snapshot ? sinceOf(snapshot, last?.snapshot) : null), [snapshot, last]);
  const [draft, setDraft] = useState<StoryChapter | null>(null);
  const [brief, setBrief] = useState('');
  const [said, setSaid] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  /* the assistant's draft (S3): asked after the assembled one is shown; its words replace the paragraphs when it answers, unless
     the consultant has already typed; what went wrong is said in a line and the assembled words stand */
  const [asking, setAsking] = useState<string>('');
  const [touched, setTouched] = useState(false);

  const save = async (s: ToolStudy) => { await putStudy({ ...s, updatedAt: Date.now() }); };
  const start = async () => {
    if (!brief.trim()) return;
    const t = Date.now();
    await putStudy({ id: uid(), tool: 'story', name: `${client || 'The factory'} — the story`, agreed: { story: { client, brief: brief.trim(), startedAt: t } }, facts: { chapters: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    setBrief('');
  };
  const run = () => {
    if (!story?.agreed?.story || !snapshot) return;
    const d = draftChapter(uid(), story.agreed.story, chapters, snapshot);
    setDraft(d); setTouched(false); setAsking('Asking the assistant for a draft — the records’ words stand meanwhile…');
    void askStory(storyAskOf(story.agreed.story, chapters, d)).then(r => {
      if (!r.ok) { setAsking(r.why); return; }
      setAsking('');
      setDraft(cur => (cur && cur.id === d.id && !touchedRef.current ? { ...cur, headline: r.answer.headline, narrative: r.answer.narrative, by: 'assistant' } : cur));
    });
  };
  const touchedRef = { current: touched };
  touchedRef.current = touched;
  const approve = async () => {
    if (!story || !draft) return;
    const done = { ...draft, approvedAt: Date.now(), narrative: draft.narrative.map(p => p.trim()).filter(Boolean) };
    await save({ ...story, facts: { ...story.facts, chapters: [...(story.facts.chapters ?? []).filter(c => c.id !== done.id), done] } });
    setDraft(null); setOpen(done.id);
    setSaid(`Chapter ${chapters.length + 1} approved — ${dayWordYear(done.at)}.`);
    await paperFor(done, [...chapters, done]);
  };
  const paperFor = async (c: StoryChapter, all: readonly StoryChapter[]) => {
    if (!story?.agreed?.story) return;
    const { makeStoryPaper } = await import('../lib/report/storyPaper');
    const { deliverPdf } = await import('../lib/savePdf');
    const doc = await makeStoryPaper({ story: story.agreed.story, chapters: all, chapter: c, printed: dayWordYear(Date.now()) });
    await deliverPdf(doc, `Story — ${story.agreed.story.client || 'the factory'} — ${dayWord(c.at).replace(/ /g, '-')}.pdf`);
  };
  /* THE SLIDES (S4): the same chapter as a 16:9 deck, kept under Saved copies and handed over */
  const deckFor = async (c: StoryChapter, all: readonly StoryChapter[]) => {
    if (!story?.agreed?.story) return;
    const { makeStoryDeck } = await import('../lib/report/storyDeck');
    const { deliverBlob } = await import('../lib/savePdf');
    const { keepPdf } = await import('../lib/keptPdfs');
    const blob = await makeStoryDeck({ story: story.agreed.story, chapters: all, chapter: c });
    const name = `Story — ${story.agreed.story.client || 'the factory'} — ${dayWord(c.at).replace(/ /g, '-')}.pptx`;
    await keepPdf(blob, name);
    await deliverBlob(blob, name, { keep: false });
  };
  useSaveOnArrival(!!last, () => { if (last) void paperFor(last, chapters); });

  if (all === null || studies === null) return <div className="wrap st"><p className="sub">Reading the story…</p></div>;
  const ag = story?.agreed?.story;

  return (
    <div className="wrap st" data-story={story?.id ?? ''}>
      <PageHeader eyebrow="THE STORY" title={client || 'The story'}
        says={ag ? <span>{ag.brief} <span className="sub">· {storySays(ag, chapters)}</span></span> : client ? `${client}’s story has not started yet.` : 'Name the client on the lines (Set up the lines) and the story is theirs.'}
        primary={ag && !ag.closedAt ? { label: 'Run an update', run, disabled: !snapshot || !!draft } : undefined}
        papers={last ? [{ label: 'Story report — the latest chapter', for: 'for the client: the story so far, this update, every finding in money, what is being done and what is proved', make: () => paperFor(last, chapters) }, { label: 'Story slides — the latest chapter', for: 'the same chapter as a 16:9 deck to open in PowerPoint and present: the cover, the four figures, this update, where the money is, what we have found, what is being done, what is proved, next', make: () => deckFor(last, chapters) }] : []}
        more={ag ? [
          ag.closedAt ? { label: 'Reopen the engagement', run: () => story && void save({ ...story, agreed: { story: { ...ag, closedAt: undefined } } }) } : { label: 'Close the engagement', run: () => story && void save({ ...story, agreed: { story: { ...ag, closedAt: Date.now() } } }) },
          { label: 'Lines and set up', run: () => nav('/room') },
        ] : []} />
      {said && <p className="sub st-said" role="status">{said}</p>}

      {!ag ? (
        <section className="ep-panel st-start" aria-label="Start the story">
          <h2 className="ln-h">Start the story{client ? ` of ${client}` : ''}</h2>
          <p className="sub">The brief, in the client’s words — what you were asked to find out. Every update from here continues from it.</p>
          <textarea className="text-input st-brief" rows={2} value={brief} onChange={e => setBrief(e.target.value)} placeholder="e.g. Why are we losing output in the packing hall?" aria-label="The brief" maxLength={300} />
          <div className="st-acts"><button type="button" className="btn btn-primary" disabled={!brief.trim()} onClick={() => void start()}>Start the story</button></div>
        </section>
      ) : (
        <>
          {snapshot && <LeanTiles tiles={storyTiles(snapshot)} className="ie-strip st-tiles" />}
          {since && !draft && <p className="st-since" data-story-since>{sinceSentence(since)}{!ag.closedAt ? ' Run an update to write the next chapter.' : ''}</p>}

          {/* THE DRAFT — the next chapter, his to edit before he approves it */}
          {draft && (
            <section className="ep-panel st-draft" aria-label="The next chapter" data-story-draft>
              <p className="pp-eyebrow">Chapter {chapters.length + 1} · {dayWordYear(draft.at)} · drafted from the records{draft.by === 'assistant' ? ' by the assistant' : ''} — yours to edit</p>
              {asking && <p className="sub st-asking" data-story-asking role="status">{asking}</p>}
              <DraftText value={draft.headline} className="text-input st-headline" max={160} ariaLabel="The chapter’s headline" onSave={v => { setTouched(true); setDraft(d => (d ? { ...d, headline: v.trim() || d.headline } : d)); }} />
              <ol className="st-paras">
                {draft.narrative.map((p, i) => (
                  <li key={i}>
                    <DraftArea value={p} rows={3} className="text-input" ariaLabel={`Paragraph ${i + 1}`} onSave={v => { setTouched(true); setDraft(d => (d ? { ...d, narrative: d.narrative.map((x, k) => (k === i ? v : x)) } : d)); }} />
                    <button type="button" className="linkish st-para-x" aria-label={`Take paragraph ${i + 1} out`} onClick={() => setDraft(d => (d ? { ...d, narrative: d.narrative.filter((_, k) => k !== i) } : d))}>Take out</button>
                  </li>
                ))}
              </ol>
              <div className="st-acts">
                <button type="button" className="btn btn-sm" onClick={() => setDraft(d => (d ? { ...d, narrative: [...d.narrative, ''] } : d))}>Add a paragraph</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setTouched(true); setAsking(''); setDraft(d => (d && ag ? { ...d, narrative: assembledNarrative(ag.brief, d.snapshot, d.since), by: 'assembled' } : d)); }}>Back to the records’ words</button>
              </div>
              {(() => { const u = unsureIn(draft.narrative, draft.snapshot); return u.length ? <p className="st-unsure" data-story-unsure>Check this: {u.join(', ')} — not among the figures the tools recorded.</p> : null; })()}
              <Snapshot c={draft} />
              <div className="st-acts st-approve">
                <button type="button" className="btn btn-primary" onClick={() => void approve()}>Approve and make the report</button>
                <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>Discard</button>
              </div>
            </section>
          )}

          {/* THE CHAPTERS, newest first */}
          <section className="st-chapters" aria-label="The chapters">
            <h2 className="ln-h">The chapters <span className="act-col-n">{chapters.length}</span></h2>
            {chapters.length === 0 && <p className="sub">No chapter yet — Run an update writes the first from what is recorded on {client || 'the'} lines.</p>}
            <ol className="st-list">
              {[...chapters].reverse().map((c, k) => {
                const n = chapters.length - k;
                const isOpen = open === c.id || (open === null && k === 0);
                return (
                  <li key={c.id} className={'ep-panel st-ch' + (isOpen ? ' is-open' : '')} data-chapter={n}>
                    <button type="button" className="st-ch-h" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : c.id)}>
                      <span className="st-ch-n">Chapter {n}</span>
                      <b className="st-ch-t">{c.headline}</b>
                      <span className="sub st-ch-d">{dayWordYear(c.at)}{c.since.from ? ` · since ${dayWord(c.since.from)}` : ''}</span>
                    </button>
                    {isOpen && (
                      <div className="st-ch-body">
                        {c.narrative.map((p, i) => <p key={i}>{p}</p>)}
                        <Snapshot c={c} folded />
                        <div className="st-acts"><button type="button" className="btn btn-sm" onClick={() => void paperFor(c, chapters)}>Report for this chapter</button><button type="button" className="btn btn-sm" data-story-slides onClick={() => void deckFor(c, chapters)}>Slides for this chapter</button></div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}

/** THE SNAPSHOT DRAWN — what the chapter froze: the findings with their money, what is being done, what is proved. */
function Snapshot({ c, folded }: { c: StoryChapter; folded?: boolean }) {
  const s = c.snapshot;
  const [show, setShow] = useState(!folded);
  if (!show) return <button type="button" className="linkish st-snap-b" onClick={() => setShow(true)}>What this chapter rests on — {plural(s.findings.length, 'finding')}, {plural(s.actions.length, 'action')}, {plural(s.provedFixes.length, 'fix', 'fixes')} proved ›</button>;
  return (
    <div className="st-snap" data-story-snapshot>
      <div className="st-snap-col">
        <h3>What we have found <span className="sub">{s.found.costDay != null ? `${fmtGBP(s.found.costDay)} a day` : ''}</span></h3>
        {s.findings.length === 0 ? <p className="sub">Nothing open.</p> : (
          <ul className="st-findings">
            {s.findings.map(f => <li key={f.id} className={f.late || f.priority === 'critical' ? 'is-r' : ''}><b>{f.what}</b><span className="sub"> · {f.line}{f.machine ? ` · ${f.machine}` : ''}</span><span className="st-money">{f.poundsDay != null ? `${fmtGBP(f.poundsDay)} a day` : 'not priced'}</span></li>)}
          </ul>
        )}
      </div>
      <div className="st-snap-col">
        <h3>What is being done <span className="sub">{s.fixing.late ? `${s.fixing.late} late` : ''}</span></h3>
        {s.actions.length === 0 ? <p className="sub">Nothing owed yet.</p> : (
          <ul className="st-actions">
            {s.actions.map((a, i) => <li key={i} className={a.late ? 'is-r' : ''}>{a.what}<span className="sub"> · {a.who || 'nobody yet'}{a.due ? ` · ${a.late ? 'was due' : 'due'} ${dayWord(Date.parse(a.due))}` : ''}</span></li>)}
          </ul>
        )}
        <h3>What is proved</h3>
        {s.provedFixes.length === 0 ? <p className="sub">No fix proved yet.</p> : <ul className="st-proved">{s.provedFixes.map(p => <li key={p.id} className="is-g"><b>{p.what}</b><span className="sub"> · {p.line} · {p.proof}</span></li>)}</ul>}
      </div>
    </div>
  );
}
